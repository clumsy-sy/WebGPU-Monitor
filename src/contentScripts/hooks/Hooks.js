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
        console.log(JSON.stringify(track.outputFrame(), null, 2));
        seedAndLogger.sendMessage(MsgType.Frame, "[frame]", JSON.stringify(track.outputFrame(track.outputFrame())));
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
  const originalCanvasConf = GPUCanvasContext.configure;
  GPUCanvasContext.configure = function (configuration) {
    console.log("[hookCanvas] GPUCanvasContext.configure: ", configuration)
    Tracker.trackCanvasConfiguration({configuration});
    return originalCanvasConf.call(this, configuration);
  };

  const originalGetCurrentTexture = GPUCanvasContext.prototype.getCurrentTexture;
  
  GPUCanvasContext.prototype.getCurrentTexture = function() {
    const texture = originalGetCurrentTexture.call(this);
    
    // 标记为 Canvas 交换链纹理
    if(Tracker.captureState.active) {
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
    console.log('createBuffer', id, descriptor);

    // 
    // if (descriptor.mappedAtCreation) {
    //   const originalGetMappedRange = buffer.getMappedRange;
    //   let mappedRange = null;
      
    //   buffer.getMappedRange = function(...args) {
    //     mappedRange = originalGetMappedRange.apply(this, args);
    //     mappedBufferData.set(buffer, {
    //       arrayBuffer: mappedRange,
    //       byteLength: descriptor.size
    //     });
    //     return mappedRange;
    //   };

    //   // 劫持 unmap 捕获初始数据
    //   const originalUnmap = buffer.unmap;
    //   buffer.unmap = function() {
    //     if (mappedRange) {
    //       const data = new Uint8Array(mappedRange);
    //       Tracker.updateBufferData(buffer, data);
    //     }
    //     mappedBufferData.delete(buffer);
    //     return originalUnmap.call(this);
    //   };
    // } else {

    // }
    
    // 劫持写入操作
    const originalWrite = buffer.write;
    buffer.write = function(data, offset = 0) {
      Tracker.trackCommand('writeBuffer', { id, data, offset });
      return originalWrite.call(this, data, offset);
    };
    
    return buffer;
  };
}

export function hookShaders() {
  // hook createShaderModule()
  const originalCreateShaderModule = GPUDevice.prototype.createShaderModule;

  GPUDevice.prototype.createShaderModule = function(descriptor) {
    console.log(descriptor);
    const shaderModule = originalCreateShaderModule.call(this, descriptor);
    Tracker.trackResources(shaderModule, 'shaderModule', descriptor);
    return shaderModule;
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

export function hookPipelines() {
  const originalCreatePipeline = GPUDevice.prototype.createRenderPipeline;
  
  GPUDevice.prototype.createRenderPipeline = function(descriptor) {
    const pipeline = originalCreatePipeline.call(this, descriptor);
    Tracker.trackResources(pipeline, 'pipeline', descriptor);
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
      Tracker.trackCommandBuffer('finish', descriptor);
      Tracker.recordBindCommandBuffer(commandBuffer);
      Tracker.recordCommandBufferID(commandBuffer);
    }
    return commandBuffer;
  };


}

export function hookQueueSubmits() {

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
  hookTextureViews();
  hookPipelines();
  hookRenderPass();

  // 
  hookQueueSubmits();
  // hookComputePipelines();
  // hookTextures();
  // hookCopyCommands();
  // hookBindGroups();
  // hookSamplers();
  // hookQueueSubmits();
}