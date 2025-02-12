import { seedAndLogger } from "../utils/seedAndLogger.js";
import { MsgType } from "../utils/Global.js";
import { Tracker } from "../core/Tracker.js";

let frameCnt = 0;
let lastFrameTime = performance.now();
let track = new Tracker(0);
/**
 * @brief 注入帧钩子函数
 * @description 分割每一帧，计算 FPS 并发送到后台
 */
function installFrameHooks() {
  const originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function (callback) {
    return originalRAF(timestamp => {
      // 计算 FPS
      {
        const currentFrameTime = performance.now();
        if (frameCnt > 0) {
          const deltaTime = currentFrameTime - lastFrameTime;
          const fps = Math.round(1000 / deltaTime);
          seedAndLogger.sendMessage(MsgType.Window, "time: ", {frameCnt, deltaTime, fps});
        }
  
        frameCnt += 1;
        lastFrameTime = currentFrameTime;
      }

      // 截帧结束
      if (Tracker.captureState.active) {
        seedAndLogger.sendMessage( MsgType.Captures_end, "Capture frame finish!", {signal: false} );
        Tracker.captureState.msg = false;
        Tracker.captureState.active = false;
        track.setTimeEnd(performance.now);
        // console.log("[main] Tracker ----------------------------");
        // console.log(track);
        // console.log(Tracker.metedata);    
        console.log("[main] Tracker ----------------------------");
        console.log(JSON.stringify(track.outputFrame(), (key, value) => {
          if (key === 'data' && Array.isArray(value)) {
            return JSON.stringify(value); // 将数组压缩为一行
          }
          return value;
        }, 2));
        seedAndLogger.sendMessage(MsgType.Frame, "[frame]", JSON.stringify(track.outputFrame()));
        console.log("[main] FRAME ----------------------------");
        Tracker.reset();
      }

      // 开始截帧
      if (Tracker.captureState.msg) {
        Tracker.captureState.active = true;
        console.log("[main] Capture next frame: ", frameCnt);
        track = new Tracker(frameCnt);
        track.setTimeStart(performance.now);
      }
      
      const result = callback(timestamp);
      return result;
    });
  };
}

function hookCanvasContext(){
  const originalCanvasConf = GPUCanvasContext.prototype.configure;
  GPUCanvasContext.prototype.configure = function (configuration) {
    // fixme device is a reference
    Tracker.trackCanvasConfiguration(configuration);
    return originalCanvasConf.call(this, configuration);
  };

  const originalGetCurrentTexture = GPUCanvasContext.prototype.getCurrentTexture;
  
  GPUCanvasContext.prototype.getCurrentTexture = function() {
    const texture = originalGetCurrentTexture.call(this);
    
    // 标记为 Canvas 交换链纹理
    if(Tracker.captureState.active) {
      track.setCanvasSize(this.canvas.width, this.canvas.height);
      Tracker.trackResources(texture, 'canvasTexture', {
        canvas: this.canvas,
        format: this.canvasFormat,
        timestamp: performance.now()
      });
    }
    
    return texture;
  };
}

function hookAdapter() {
  // hook requestAdapter()
  const originalRequestAdapter = navigator.gpu.requestAdapter;
  navigator.gpu.requestAdapter = async function(options) {
    const adapter = await originalRequestAdapter.call(navigator.gpu, options);
    // 记录 AdapterOptions
    Tracker.trackAdapterOptions({options});
    if (adapter) {
      // hook requestDevice()
      const originalRequestDevice = adapter.requestDevice;
      adapter.requestDevice = async function(descriptor) {
        const device = await originalRequestDevice.call(adapter, descriptor);
        // 记录 deviceDescriptor
        Tracker.trackDeviceDescriptor({descriptor});  
        return device;
      };
    }
    return adapter;
  };
}

export function hookBuffers() {
  // hook createBuffer()
  const originalCreateBuffer = GPUDevice.prototype.createBuffer;
  
  GPUDevice.prototype.createBuffer = function(descriptor) {
    const buffer = originalCreateBuffer.call(this, descriptor);
    const id = Tracker.trackResources(buffer, 'buffer', descriptor);

    // 
    if (descriptor.mappedAtCreation) {
      const originalGetMappedRange = buffer.getMappedRange;
      let mappedRange = null;
      
      buffer.getMappedRange = function(...args) {
        mappedRange = originalGetMappedRange.apply(this, args);
        console.log("[mappedRange] = ", mappedRange);
        Tracker.trackResources(buffer, 'bufferDataMap', { buffer: buffer, arrayBuffer: mappedRange });
        return mappedRange;
      };

      // 劫持 unmap 捕获初始数据
      const originalUnmap = buffer.unmap;
      buffer.unmap = function() {
        if (mappedRange) {
          const data = new Float32Array(mappedRange);
          console.log('arrayBuffer', mappedRange);
          console.log('data', data);
          Tracker.trackResources(mappedRange, 'bufferData', {
            arrayBuffer: mappedRange,
            data: data
          });
        }
        return originalUnmap.call(this);
      };
    } 
    
    
    return buffer;
  };

}

export function hookShaders() {
  // hook createShaderModule()
  const originalCreateShaderModule = GPUDevice.prototype.createShaderModule;

  GPUDevice.prototype.createShaderModule = function(descriptor) {
    const shaderModule = originalCreateShaderModule.call(this, descriptor);
    Tracker.trackResources(shaderModule, 'shaderModule', descriptor);
    return shaderModule;
  };
}

export function hookTextures() {
  const originalCreateTexture = GPUDevice.prototype.createTexture;
  
  GPUDevice.prototype.createTexture = function(descriptor) {
    const texture = originalCreateTexture.call(this, descriptor);
    Tracker.trackResources(texture, 'texture', descriptor);

    return texture;
  };
}

export function hookTextureViews() {
  const originalCreateView = GPUTexture.prototype.createView;
  
  GPUTexture.prototype.createView = function(descriptor = {}) {
    const view = originalCreateView.call(this, descriptor);
    
    // 关联父纹理信息
    if(Tracker.captureState.active) {
      const parentTextureInfo = Tracker.getResourceInfo(this);
      Tracker.trackResources(view, 'textureView', {
        parentTextureId: parentTextureInfo?.id,
        descriptor,
        width: this.width,
        height: this.height,
        dimensions: `${this.width}x${this.height}`,
        format: this.format
      });
    }
    
    return view;
  };
}

function hookBindGroups() {
  const originalCreateBindGroup = GPUDevice.prototype.createBindGroup;

  GPUDevice.prototype.createBindGroup = function(descriptor) {
    const bindGroup = originalCreateBindGroup.call(this, descriptor);
    Tracker.trackResources(bindGroup, 'bindGroup', descriptor);
    
    return bindGroup;
  };
}

export function hookPipelines() {
  const originalCreatePipeline = GPUDevice.prototype.createRenderPipeline;
  
  GPUDevice.prototype.createRenderPipeline = function(descriptor) {
    const pipeline = originalCreatePipeline.call(this, descriptor);
    Tracker.trackResources(pipeline, 'pipeline', descriptor);
    if(pipeline) {
      const originalGetBindGroupLayout = pipeline.getBindGroupLayout;
      pipeline.getBindGroupLayout = function(index) {
        const bindGroupLayout = originalGetBindGroupLayout.call(this, index);
        const pipelineID = Tracker.getResourceInfo(pipeline)?.id;

        Tracker.trackResources(bindGroupLayout, 'bindGroupLayout', {
          index,
          pipelineID
        });
        return bindGroupLayout;
      };
    }
    return pipeline;
  };


  const originalCreateComputePipeline = GPUDevice.prototype.createComputePipeline;
  
  GPUDevice.prototype.createComputePipeline = function(descriptor) {
    const pipeline = originalCreateComputePipeline.call(this, descriptor);
    Tracker.trackResources(pipeline, 'computePipeline', descriptor);
    if(pipeline) {
      const originalGetBindGroupLayout = pipeline.getBindGroupLayout;
      pipeline.getBindGroupLayout = function(index) {
        const bindGroupLayout = originalGetBindGroupLayout.call(this, index);
        const pipelineID = Tracker.getResourceInfo(pipeline)?.id;

        Tracker.trackResources(bindGroupLayout, 'bindGroupLayout', {
          index,
          pipelineID
        });
        return bindGroupLayout;
      };
    }
    return pipeline;
  };

}

export function hookRenderPass() {
  const originalBegin = GPUCommandEncoder.prototype.beginRenderPass;
  
  GPUCommandEncoder.prototype.beginRenderPass = function(descriptor) {
    const pass = originalBegin.call(this, descriptor);
    
    if(Tracker.captureState.active) {
      // 处理 colorAttachments
      if (descriptor.colorAttachments && Array.isArray(descriptor.colorAttachments)) {
        descriptor.colorAttachments.forEach(attachment => {
          if (attachment.view) {
            attachment.view = Tracker.getResourceInfo(attachment.view)?.id;
          }
        });
      }

      // 处理 depthStencilAttachment
      if (descriptor.depthStencilAttachment && descriptor.depthStencilAttachment.view) {
        descriptor.depthStencilAttachment.view = Tracker.getResourceInfo(descriptor.depthStencilAttachment.view)?.id;
      }

      Tracker.trackCommandBuffer('beginRenderPass', descriptor);

      // 需要追踪资源的 command
      ['setPipeline'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            const id = Tracker.getResourceInfo(args[0])?.id;
            Tracker.trackCommandBuffer(method, id);
            return Reflect.apply(target, thisArg, args);
          }
        });
      });

      ['setBindGroup', 'setVertexBuffer'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            const res = Reflect.apply(target, thisArg, args)
            const id = Tracker.getResourceInfo(args[1])?.id;
            args[1] = id;
            Tracker.trackCommandBuffer(method, args);
            return res;
          }
        });
      });

      // 直接使用参数的 command
      ['draw', 'drawIndexed', 'end'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            Tracker.trackCommandBuffer(method, args);
            return Reflect.apply(target, thisArg, args);
          }
        });
      });

    }
    
    return pass;
  };

  const originalFinish = GPUCommandEncoder.prototype.finish;

  GPUCommandEncoder.prototype.finish = function (descriptor) {
    const commandBuffer = originalFinish.call(this, descriptor);
    if(Tracker.captureState.active) {
      Tracker.trackCommandBuffer('finish', {args: descriptor});
      Tracker.recordBindCommandBuffer(commandBuffer);
      Tracker.recordCommandBufferID(commandBuffer);
    }
    return commandBuffer;
  };


}

export function hookQueueCommands() {

  const originalSubmit = GPUQueue.prototype.submit;

  GPUQueue.prototype.submit = function(commandBuffers) {

    if(Tracker.captureState.active) {
      let commandBufferArray = [];
      for (let i = 0; i < commandBuffers.length; i++) {
        commandBufferArray.push(Tracker.getCommandBufferID(commandBuffers[i]))
      }
      Tracker.trackCommand('submit', {commandBuffers: commandBufferArray});
    }
    // 调用原始方法
    return originalSubmit.call(this, commandBuffers);
  };

  const originalWriteBuffer = GPUQueue.prototype.writeBuffer;

  GPUQueue.prototype.writeBuffer = function(buffer, offset, data, dataOffset, size) {
    if(Tracker.captureState.active) {
      console.log('writeBuffer', buffer, offset, data, dataOffset, size);
      // fixme data maybe is GPUBuffer
      Tracker.trackCommand('writeBuffer', {
        buffer: Tracker.getResourceInfo(buffer)?.id, 
        offset, 
        data: [...new Float32Array(data)], 
        dataOffset, 
        size});
    }

    return originalWriteBuffer.call(this, buffer, offset, data, dataOffset, size);
  };

}

export function hookInit() {
  // 检查是否支持 WebGPU
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in your browser.');
  }

  installFrameHooks();
  hookCanvasContext();
  hookAdapter();

  //
  hookBuffers();
  hookShaders();
  hookTextures();
  hookTextureViews();
  hookBindGroups();
  hookPipelines();
  hookRenderPass();

  // 
  hookQueueCommands();
  // hookComputePipelines();
  // hookCopyCommands();
  // hookSamplers();
  // hookQueueCommands();
}