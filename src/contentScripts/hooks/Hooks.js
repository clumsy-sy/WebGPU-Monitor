import { seedAndLogger } from "../utils/seedAndLogger.js";
import { MsgType } from "../utils/Global.js";
import { Tracker } from "../core/Tracker.js";

let frameCnt = 0;
let lastFrameTime = performance.now();
let track = new Tracker(0);

function isCapture(){
  if(Tracker.captureState.active || frameCnt == 0) {
    return true;
  } 
  return false;
}
/**
 * @brief 注入帧钩子函数
 * @description 分割每一帧，计算 FPS 并发送到后台
 */
function installFrameHooks() {
  const originalRAF = window.requestAnimationFrame;

  let lastCallbackTag = null;

  window.requestAnimationFrame = function (callback) {
    return originalRAF(timestamp => {

      const CallbackTag = Symbol.for(callback.toString());
      
      if (CallbackTag !== lastCallbackTag) {
        frameCnt = 0;
        // Tracker.reset();
        lastCallbackTag = CallbackTag;
      }
      
      const result = callback(timestamp);
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
        console.log("[main] Tracker ----------------------------");
        console.log(JSON.stringify(track.outputFrame(), (key, value) => {
          if (key === 'data' && Array.isArray(value)) {
            return JSON.stringify(value); // 将数组压缩为一行
          }
          return value;
        }, 2));
        console.log("[main] Tracker ----------------------------");
        seedAndLogger.sendMessage(MsgType.Frame, "[frame]", JSON.stringify(track.outputFrame()));
        Tracker.clear();
      }

      // 开始截帧
      if (Tracker.captureState.msg) {
        Tracker.captureState.active = true;
        console.log(`[main] Capture frame [id=${frameCnt}] `);
        track = new Tracker(frameCnt);
        track.setTimeStart(performance.now);
      }
      
      
      return result;
    });
  };
}
function hookCanvasContextFunc(){
  /*
  */
  const originalCanvasConf = GPUCanvasContext.prototype.configure;
  GPUCanvasContext.prototype.configure = function (configuration) {
    const ret = originalCanvasConf.call(this, configuration);
    // fixme device is a reference
    Tracker.trackCanvasConfiguration(configuration);
    return ret;
  };

  /*
  */
  const originalGetCurrentTexture = GPUCanvasContext.prototype.getCurrentTexture;
  GPUCanvasContext.prototype.getCurrentTexture = function() {
    const texture = originalGetCurrentTexture.call(this);
    
    // 标记为 Canvas 交换链纹理
    if(isCapture()) {
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
export function hookDeviceFunc() {
  /** */
  const originalCreateBuffer = GPUDevice.prototype.createBuffer;
  
  GPUDevice.prototype.createBuffer = function(descriptor) {
    const buffer = originalCreateBuffer.call(this, descriptor);
    Tracker.trackResources(buffer, 'buffer', descriptor);

    if (descriptor.mappedAtCreation) {
      const originalGetMappedRange = buffer.getMappedRange;
      let mappedRange = null;
      
      buffer.getMappedRange = function(...args) {
        mappedRange = originalGetMappedRange.apply(this, args);
        Tracker.trackResources(mappedRange, 'bufferDataMap', { buffer: buffer });
        return mappedRange;
      };

      // 劫持 unmap 捕获初始数据
      const originalUnmap = buffer.unmap;
      buffer.unmap = function() {
        if (mappedRange) {
          // const data = new Float32Array(mappedRange);
          // console.log('data', data);
          Tracker.trackResources(mappedRange, 'bufferData', {
            arrayBuffer: mappedRange,
            data: mappedRange
          });
        }
        return originalUnmap.call(this);
      };
    } 
    return buffer;
  };

  /** */
  const originalCreatePipelineLayout = GPUDevice.prototype.createPipelineLayout;
  
  GPUDevice.prototype.createPipelineLayout = function(descriptor) {
    const pipelineLayout = originalCreatePipelineLayout.call(this, descriptor);
    Tracker.trackResources(pipelineLayout, 'pipelineLayout', descriptor);
    return pipelineLayout;
  };

  /** */
  const originalCreateShaderModule = GPUDevice.prototype.createShaderModule;

  GPUDevice.prototype.createShaderModule = function(descriptor) {
    const shaderModule = originalCreateShaderModule.call(this, descriptor);
    Tracker.trackResources(shaderModule, 'shaderModule', descriptor);
    return shaderModule;
  };

  /** */
  const originalCreateTexture = GPUDevice.prototype.createTexture;
  
  GPUDevice.prototype.createTexture = function(descriptor) {
    const texture = originalCreateTexture.call(this, descriptor);
    Tracker.trackResources(texture, 'texture', descriptor);

    return texture;
  };

  /** */
  const originalCreateBindGroup = GPUDevice.prototype.createBindGroup;

  GPUDevice.prototype.createBindGroup = function(descriptor) {
    const bindGroup = originalCreateBindGroup.call(this, descriptor);
    Tracker.trackResources(bindGroup, 'bindGroup', descriptor);
    
    return bindGroup;
  };

  /** */
  const originalCreateBindGroupLayout = GPUDevice.prototype.createBindGroupLayout;
  
  GPUDevice.prototype.createBindGroupLayout = function(descriptor) {
    const bindGroupLayout = originalCreateBindGroupLayout.call(this, descriptor);
    Tracker.trackResources(bindGroupLayout, 'bindGroupLayout', {
      type: 'device.bindGroupLayout',
      args: descriptor});
    
    return bindGroupLayout;
  };

  /** */
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
          type: 'pipeline.getBindGroupLayout',
          index,
          pipelineID
        });
        return bindGroupLayout;
      };
    }
    return pipeline;
  };

  /** */
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
          type: 'pipeline.getBindGroupLayout',
          index,
          pipelineID
        });
        return bindGroupLayout;
      };
    }
    return pipeline;
  };
}

export function hookTextureFunc() {
  const originalCreateView = GPUTexture.prototype.createView;
  
  GPUTexture.prototype.createView = function(descriptor) {
    const view = originalCreateView.call(this, descriptor);
      // console.log("createView",this);
    // 关联父纹理信息
    // if(isCapture()) {
      const parentTextureInfo = Tracker.getResourceInfo(this);
      if(parentTextureInfo) {
        Tracker.trackResources(view, 'textureView', {
          parentTextureId: parentTextureInfo?.id,
          descriptor,
        });
      }
    // }
    
    return view;
  };
}

export function hookCommandEncoderFunc() {
  const originalBegin = GPUCommandEncoder.prototype.beginRenderPass;
  
  GPUCommandEncoder.prototype.beginRenderPass = function(descriptor) {
    const pass = originalBegin.call(this, descriptor);
    
    if(isCapture()) {
      const descriptorCopy = JSON.parse(JSON.stringify(descriptor));
      // 处理 colorAttachments
      if (descriptor.colorAttachments && Array.isArray(descriptor.colorAttachments)) {
        for(let i = 0; i < descriptor.colorAttachments.length; i++) {
          if(descriptor.colorAttachments[i].view) {
            descriptorCopy.colorAttachments[i].view = Tracker.getResourceInfo(descriptor.colorAttachments[i].view)?.id;
          }
        }

      }

      // 处理 depthStencilAttachment
      if (descriptor.depthStencilAttachment && descriptor.depthStencilAttachment.view) {
        if(descriptor.depthStencilAttachment.view){
          descriptorCopy.depthStencilAttachment.view = Tracker.getResourceInfo(descriptor.depthStencilAttachment.view)?.id;
        }
      }

      Tracker.trackCommandBuffer('beginRenderPass', descriptorCopy);

      // 需要追踪资源的 command
      ['setPipeline', 'setIndexBuffer'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            let ret = Reflect.apply(target, thisArg, args)
            const id = Tracker.getResourceInfo(args[0])?.id;
            args[0] = id;
            Tracker.trackCommandBuffer(method, args);
            return ret;
          }
        });
      });

      ['setBindGroup', 'setVertexBuffer'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            let ret = Reflect.apply(target, thisArg, args)
            let id = Tracker.getResourceInfo(args[1])?.id;
            args[1] = id;
            Tracker.trackCommandBuffer(method, args);
            return ret;
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

  const originalBeginComputePass = GPUCommandEncoder.prototype.beginComputePass;
  
  GPUCommandEncoder.prototype.beginComputePass = function(descriptor) {
    const pass = originalBeginComputePass.call(this, descriptor);
    
    if(isCapture()) {
      Tracker.trackCommandBuffer('beginComputePass', descriptor);

      ['setPipeline'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            let ret = Reflect.apply(target, thisArg, args)
            const id = Tracker.getResourceInfo(args[0])?.id;
            args[0] = id;
            Tracker.trackCommandBuffer(method, args);
            return ret;
          }
        });
      });

      ['setBindGroup'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            const ret = Reflect.apply(target, thisArg, args)
            const id = Tracker.getResourceInfo(args[1])?.id;
            args[1] = id;
            Tracker.trackCommandBuffer(method, args);
            return ret;
          }
        });
      });

      ['dispatchWorkgroups', 'end'].forEach(method => {
        pass[method] = new Proxy(pass[method], {
          apply(target, thisArg, args) {
            Tracker.trackCommandBuffer(method, args);
            return Reflect.apply(target, thisArg, args);
          }
        });
      });

    }
    return pass;
  }

  const originalFinish = GPUCommandEncoder.prototype.finish;

  GPUCommandEncoder.prototype.finish = function (descriptor) {
    const commandBuffer = originalFinish.call(this, descriptor);
    if(isCapture()) {
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

    if(isCapture()) {
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
    if(isCapture()) {
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


function hookType() {
  // 保存原始构造函数
  const originalTypedArrayConstructors = {
    Float32Array: window.Float32Array,
    Uint32Array: window.Uint32Array,
    Uint16Array: window.Uint16Array,
    Uint8Array: window.Uint8Array,
    BigInt64Array: window.BigInt64Array,
    // 其他
  };

  Object.keys(originalTypedArrayConstructors).forEach(type => {
    const OriginalConstructor = originalTypedArrayConstructors[type];
    
    // 1. 创建 Proxy 代理
    const ProxyConstructor = new Proxy(OriginalConstructor, {
      construct(target, args) {
        // 自定义逻辑：记录缓冲区类型
        if (args[0] instanceof ArrayBuffer && args.length === 1) {
          const mappedRangeID = Tracker.getResourceInfo(args[0])?.id;
          if (mappedRangeID) {
            Tracker.trackResources(args[0], 'bufferDataMap', { type: type });
          }
        }
        
        // 调用原始构造函数
        return new OriginalConstructor(...args);
      }
    });
  
    // 2. 复制静态属性 (BYTES_PER_ELEMENT 等)
    Object.keys(OriginalConstructor).forEach(staticProp => {
      if (OriginalConstructor.hasOwnProperty(staticProp)) {
        ProxyConstructor[staticProp] = OriginalConstructor[staticProp];
      }
    });
  
    // 3. 覆盖全局构造函数
    window[type] = ProxyConstructor;
  });

  // 验证原型链和静态属性
  console.log(Float32Array.BYTES_PER_ELEMENT); // 4
  console.log(Uint16Array.BYTES_PER_ELEMENT);  // 2

  // 覆盖构造函数以捕获数据类型
  // Object.keys(originalTypedArrayConstructors).forEach(type => {
  //   const OriginalConstructor = originalTypedArrayConstructors[type];
    
  //   originalTypedArrayConstructors[type] = function(buffer, ...args) {
  //     if (buffer instanceof ArrayBuffer && args.length === 0) {
  //       const mappedRangeID = Tracker.getResourceInfo(buffer)?.id;

  //       if (mappedRangeID) {
  //         Tracker.trackResources(buffer, 'bufferDataMap', { type: type });
  //       }
  //     }
  //     return new OriginalConstructor(buffer, ...args);
  //   };
  // });

}

export function hookInit() {
  // 检查是否支持 WebGPU
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in your browser.');
  }
  // need?
  hookType();

  hookCanvasContextFunc();
  hookAdapter();
  hookDeviceFunc();
  hookTextureFunc();
  hookCommandEncoderFunc();
  hookQueueCommands();

  installFrameHooks();
}