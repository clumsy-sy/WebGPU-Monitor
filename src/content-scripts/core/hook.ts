import { FrameRecorder } from "./frame-recorder";
import { MsgType, Msg } from "../../global/message";
import { GPUDeviceHook } from "./hooks/gpu-device";

let frameCnt = 0;
let lastFrameTime = performance.now();
let Recoder = FrameRecorder.getInstance();
let lastUrl = location.href;
const msg = Msg.getInstance();

/**
 * @brief 注入帧钩子函数
 * @description 分割每一帧，计算 FPS 并发送到后台
 */
function installFrameHooks() {
  // 获取原始的 requestAnimationFrame 函数
  const originalRAF = window.requestAnimationFrame;

  window.requestAnimationFrame = function (callback) {
    return originalRAF(timestamp => {

      // 检测 URL 变化
      if (lastUrl !== location.href) {
        lastUrl = location.href;
        frameCnt = 0;
        Recoder.reset();
      }
      // fixme callback 可能发生变化

      let result: void;
      try {
        result = callback(timestamp);
      } catch (error) {
        console.error('Error in requestAnimationFrame callback:', error);
        throw error;
      }

      // 计算 FPS
      {
        const currentFrameTime = performance.now();
        if (frameCnt > 0) {
          const deltaTime = currentFrameTime - lastFrameTime;
          const fps = Math.round(1000 / deltaTime);
          // 向 dev 页面发生信息
          msg.sendMessage(MsgType.Window, "time: ", {frameCnt, deltaTime, fps});
        }
  
        frameCnt += 1;
        lastFrameTime = currentFrameTime;
      }

      // 截帧结束
      if (Recoder.captureState.active) {
        msg.sendMessage( MsgType.Captures_end, "Capture frame finish!", {signal: false} );
        
        Recoder.captureState.msg = false;
        Recoder.captureState.active = false;
        Recoder.setFrameEndTime(performance.now());
        // 输出数据
        msg.sendMessage(MsgType.Frame, "[frame]", JSON.stringify(Recoder.outputFrame()));
        Recoder.jsonLog();
        Recoder.clear();
      }

      // 开始截帧
      if (Recoder.captureState.msg) {
        console.log(`[main] Capture frame [id=${frameCnt}] `);
        Recoder.captureState.active = true;
        Recoder.setFrameStartTime(performance.now());
      }
      
      return result;
    });
  };
}

/**
 * @description 捕获 TypedArray 的构造函数，并记录缓冲区类型
 * ***可能还缺少类型，需要补
 */
function hookType() {
  // 保存原始构造函数
  const originalTypedArrayConstructors = {
    Float32Array: window.Float32Array,
    Uint32Array: window.Uint32Array,
    Uint16Array: window.Uint16Array,
    Uint8Array: window.Uint8Array,
    BigInt64Array: window.BigInt64Array,
  };

  Object.keys(originalTypedArrayConstructors).forEach(type => {
    const OriginalConstructor = originalTypedArrayConstructors[type as keyof typeof originalTypedArrayConstructors];
    
    // 1. 创建 Proxy 代理
    const ProxyConstructor = new Proxy(OriginalConstructor, {
      construct(target, args) {
        // 自定义逻辑：记录缓冲区类型
        if (args[0] instanceof ArrayBuffer && args.length === 1) {
          const mappedRangeID = Recoder.getResInfo(args[0])?.id;
          if (mappedRangeID) {
            Recoder.trackRes(args[0], 'bufferDataMap', { type: type });
          }
        }
        
        // 调用原始构造函数
        return new OriginalConstructor(...args);
      }
    });
  
    // 2. 复制静态属性 (BYTES_PER_ELEMENT 等)
    Object.keys(OriginalConstructor).forEach(staticProp => {
      const key = staticProp as keyof typeof OriginalConstructor;
      if (OriginalConstructor.hasOwnProperty(key)) {
        // 跳过只读属性或特殊属性
        if (key === 'prototype') return;
        // 获取原始属性的描述符
        const descriptor = Object.getOwnPropertyDescriptor(OriginalConstructor, key);
        if (descriptor) {
          Object.defineProperty(ProxyConstructor, key, descriptor);
        }
      }
    });
  
    // 3. 覆盖全局构造函数
    // window[type] = ProxyConstructor;
  });
}

/**
 * @brief 钩子函数，用于捕获 GPUCanvasContext 相关方法
 */
function hookGPUCanvasContext(){
  // 获取 GPUCanvasConfiguration
  const originalCanvasConf = GPUCanvasContext.prototype.configure;
  GPUCanvasContext.prototype.configure = function (configuration) {
    const ret = originalCanvasConf.call(this, configuration);
    Recoder.trackCanvasConf(configuration);
    return ret;
  };

  // 获取当前 canvas纹理
  const originalGetCurrentTexture = GPUCanvasContext.prototype.getCurrentTexture;
  GPUCanvasContext.prototype.getCurrentTexture = function() {
    const texture = originalGetCurrentTexture.call(this);
    
    // 标记为 Canvas 交换链纹理
    Recoder.setFrameSize(this.canvas.width, this.canvas.height);
    // Recoder.trackRes(texture, 'canvasTexture', {
    //   canvas: this.canvas,
    //   format: this.canvasFormat
    // });
    
    return texture;
  };

  // fixme: getConfiguration(), unconfigure()

}

function hookGPUAdapter() {
   // hook requestAdapter()
    const originalRequestAdapter = navigator.gpu.requestAdapter;
    navigator.gpu.requestAdapter = async function(options) {
      try {
        const adapter = await originalRequestAdapter.call(navigator.gpu, options);
        Recoder.trackAdapterOptions(options as GPURequestAdapterOptions);
        
        if (adapter) {
          // hook requestDevice()
          const originalRequestDevice = adapter.requestDevice;
          adapter.requestDevice = async function(descriptor?: GPUDeviceDescriptor) {
            try {
              const device = await originalRequestDevice.call(adapter, descriptor);
              GPUDeviceHook.hookDevice(device);
              Recoder.trackDeviceDesc(descriptor as GPUDeviceDescriptor);  
              return device;
            } catch (error) {
              console.error('Error in requestDevice:', error);
              throw error;
            }
          };
        }
        return adapter;

      } catch (error) {
        console.error('Error in requestAdapter:', error);
        throw error;
      }
    };
}

function hookGPUDevice() {

}


/**
 * @description 钩子函数，注意顺序
 */
export function hookInit() {
  // 检查是否支持 WebGPU
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in your browser.');
  } else {
    msg.setLog(true, true, true);
    msg.log('[hook] WebGPU is supported and injecting started.');
  }

  
  // hookType();

  // hookGPUCanvasContext();
  hookGPUAdapter();
  // hookGPUDevice();

  // hookDeviceFunc();
  // hookTextureFunc();
  // hookCommandEncoderFunc();
  // hookQueueCommands();

  installFrameHooks();

  msg.log('[hook] injected.');
}