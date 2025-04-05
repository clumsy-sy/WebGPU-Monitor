import { FrameRecorder } from "./frame-recorder";
import { MsgType, Msg, MsgLevel } from "../../global/message";
import { GPUDeviceHook } from "./hooks/gpu-device";
import { ResourceTracker } from "./resource-tracker";
import { CommandTracker } from "./command-tracker";
import { APIRecorder } from "./api-recorder";

let frameCnt = 0;
let lastFrameTime = performance.now();
let lastUrl = location.href;
const msg = Msg.getInstance();
let recoder = FrameRecorder.getInstance();
const res = ResourceTracker.getInstance();
const cmd = CommandTracker.getInstance();
const api = APIRecorder.getInstance();

/**
 * @brief 主动 requestAnimationFrame 调用，来分割每一帧
 */
function frameRegistered() {
  // 检测 URL 变化
  if (lastUrl !== location.href) {
    lastUrl = location.href;
    frameCnt = 0;
    recoder.reset();
    msg.log(MsgLevel.level_1, "[main] URL changed, reset frame counter.");
  }
  // fixme callback 可能发生变化

  // 计算 FPS
  {
    const currentFrameTime = performance.now();
    if (frameCnt > 0) {
      const deltaTime = currentFrameTime - lastFrameTime;
      const fps = Math.round(1000 / deltaTime);
      // 向 dev 页面发生信息
      msg.sendMessage(MsgType.Window, "time: ", { frameCnt, deltaTime, fps });
    }

    frameCnt += 1;
    lastFrameTime = currentFrameTime;
  }

  // 截帧结束
  if (recoder.captureState.active) {
    msg.sendMessage(MsgType.Captures_end, "Capture frame finish!", { signal: false });

    recoder.captureState.msg = false;
    recoder.captureState.active = false;
    recoder.setFrameEndTime(performance.now());
    // 输出数据
    msg.sendMessage(MsgType.Frame, "[frame]", JSON.stringify(recoder.outputFrame()));
    recoder.jsonLog();
    recoder.clear();
  }

  // 开始截帧
  if (recoder.captureState.msg) {
    console.log(`[main] Capture frame [id=${frameCnt}] `);
    recoder.captureState.active = true;
    recoder.setFrameStartTime(performance.now());
  }
  // 递归
  requestAnimationFrame(frameRegistered);
}


/**
 * @brief 注入帧钩子函数
 * @description 分割每一帧，计算 FPS 并发送到后台
 */
// function installFrameHooks() {
//   // 获取原始的 requestAnimationFrame 函数
//   const originalRAF = window.requestAnimationFrame;

//   window.requestAnimationFrame = function (callback) {
//     return originalRAF(timestamp => {

//       // 检测 URL 变化
//       if (lastUrl !== location.href) {
//         lastUrl = location.href;
//         frameCnt = 0;
//         recoder.reset();
//       }
//       // fixme callback 可能发生变化

//       let result: void;
//       try {
//         result = callback(timestamp);
//       } catch (error) {
//         console.error('Error in requestAnimationFrame callback:', error);
//         throw error;
//       }

//       // 计算 FPS
//       {
//         const currentFrameTime = performance.now();
//         if (frameCnt > 0) {
//           const deltaTime = currentFrameTime - lastFrameTime;
//           const fps = Math.round(1000 / deltaTime);
//           // 向 dev 页面发生信息
//           msg.sendMessage(MsgType.Window, "time: ", {frameCnt, deltaTime, fps});
//         }

//         frameCnt += 1;
//         lastFrameTime = currentFrameTime;
//       }

//       // 截帧结束
//       if (recoder.captureState.active) {
//         msg.sendMessage( MsgType.Captures_end, "Capture frame finish!", {signal: false} );

//         recoder.captureState.msg = false;
//         recoder.captureState.active = false;
//         recoder.setFrameEndTime(performance.now());
//         // 输出数据
//         msg.sendMessage(MsgType.Frame, "[frame]", JSON.stringify(recoder.outputFrame()));
//         recoder.jsonLog();
//         recoder.clear();
//       }

//       // 开始截帧
//       if (recoder.captureState.msg) {
//         console.log(`[main] Capture frame [id=${frameCnt}] `);
//         recoder.captureState.active = true;
//         recoder.setFrameStartTime(performance.now());
//       }

//       return result;
//     });
//   };
// }


/**
 * @brief 钩子函数，用于捕获 GPUCanvasContext 相关方法
 */
function hookGPUCanvasContext() {
  // 获取 GPUCanvasConfiguration
  const originalCanvasConf = GPUCanvasContext.prototype.configure;
  GPUCanvasContext.prototype.configure = function (configuration) {
    const ret = originalCanvasConf.call(this, configuration);
    recoder.trackCanvasConf(configuration);
    return ret;
  };

  // 获取当前 canvas纹理
  const originalGetCurrentTexture = GPUCanvasContext.prototype.getCurrentTexture;
  GPUCanvasContext.prototype.getCurrentTexture = function () {
    const texture = originalGetCurrentTexture.call(this);
    res.track(texture, {}, 'getCurrentTexture');
    api.recordMethodCall('getCurrentTexture', []);
    if (texture) {
      // 劫持 texture.createView
      const originalCreateView = texture.createView;
      texture.createView = function wrappedMethod(descriptor: any) {
        try {
          const view = originalCreateView.apply(this, [descriptor]);
          res.track(view, { parent: texture, descriptor }, 'createTextureView');
          api.recordMethodCall('createTextureView', [descriptor]);
          return view;
        } catch (error) {
          msg.error(`[GPUDevice] createTextureView error: `, error);
          throw error;
        }
      }
      // 劫持 texture.destroy
      const originalDestroy = texture.destroy;
      texture.destroy = function wrappedMethod() {
        try {
          originalDestroy.apply(this, []);
          res.untrack(texture);
          // todo: 删除纹理对应的视图
          api.recordMethodCall('destroy', []);
        } catch (error) {
          msg.error(`[GPUDevice] destroy error: `, error);
        }
      }
    }
    return texture;
  };

  // fixme: getConfiguration(), unconfigure()
}
/**
 * @brief 钩子函数，用于捕获 GPUAdapter 相关方法，递归调用内部 device 等等
 */
function hookGPUAdapter() {
  // hook requestAdapter()
  const originalRequestAdapter = navigator.gpu.requestAdapter;
  navigator.gpu.requestAdapter = async function (options) {
    try {
      const adapter = await originalRequestAdapter.call(navigator.gpu, options);
      recoder.trackAdapterOptions(options as GPURequestAdapterOptions);

      if (adapter) {
        // hook requestDevice()
        const originalRequestDevice = adapter.requestDevice;
        adapter.requestDevice = async function (descriptor?: GPUDeviceDescriptor) {
          try {
            const device = await originalRequestDevice.call(adapter, descriptor);
            recoder.trackDeviceDesc(descriptor as GPUDeviceDescriptor);
            // [hook device]
            GPUDeviceHook.hookDevice(device);
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



/**
 * @description 钩子函数，注意顺序
 */
export function hookInit() {
  // 检查是否支持 WebGPU
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in your browser.');
  } else {
    msg.log(MsgLevel.level_1, '[hook] WebGPU is supported and injecting started.');
  }


  // 对 WebGPU 的关键 API 函数进行拦截
  hookGPUCanvasContext();
  hookGPUAdapter();

  // 主动的分割浏览器的帧
  requestAnimationFrame(frameRegistered);

  msg.log(MsgLevel.level_1, '[hook] injected.');
}