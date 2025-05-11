import { FrameRecorder } from "./frame-recorder";
import { MsgType, Msg, MsgLevel } from "../../global/message";
import { GPUDeviceHook } from "./hooks/gpu-device";
import { ResourceTracker } from "./resource-tracker";
import { CommandTracker } from "./command-tracker";
import { APIRecorder } from "./api-recorder";
import { GPUTextureHook } from "./hooks/gpu-texture";

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
    // reset
    frameCnt = 0;
    recoder.reset();
    msg.log(MsgLevel.level_1, "[main] URL changed, reset frame counter.");
  }

  // 计算 FPS
  {
    const currentFrameTime = performance.now();
    if (frameCnt > 0) {
      const deltaTime = currentFrameTime - lastFrameTime;
      const fps = Math.round(1000 / deltaTime);
      // 向 dev 页面发信息
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
    // 提前获取 Buffer / Texture 信息

    recoder.captureState.active = true;
    recoder.setFrameStartTime(performance.now());
  }
  // 递归
  requestAnimationFrame(frameRegistered);
}

/**
 * @brief 钩子函数，用于捕获 GPUAdapter 相关方法，递归调用内部 device 等等
 */
function hookGPUAdapter() {
  // hook requestAdapter
  const originalRequestAdapter = navigator.gpu.requestAdapter;
  navigator.gpu.requestAdapter = async function (options) {
    try {
      const adapter = await originalRequestAdapter.call(navigator.gpu, options);
      recoder.trackAdapterOptions(options as GPURequestAdapterOptions);

      if (adapter) {
        // hook requestDevice
        const originalRequestDevice = adapter.requestDevice;
        adapter.requestDevice = async function (descriptor?: GPUDeviceDescriptor) {
          try {
            const device = await originalRequestDevice.call(adapter, descriptor);
            recoder.trackDeviceDesc(descriptor as GPUDeviceDescriptor);
            // [hook device] !!!
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
 * @brief 钩子函数，用于捕获 GPUCanvasContext 相关方法
 */
function hookGPUCanvasContext() {
  // 获取 GPUCanvasConfiguration
  const originalCanvasConf = GPUCanvasContext.prototype.configure;
  GPUCanvasContext.prototype.configure = function (configuration) {
    const result = originalCanvasConf.call(this, configuration);
    recoder.trackCanvasConf(configuration);
    res.track(this, {}, 'GPUCanvasContext');

    if(this) {
      // 获取当前 canvas纹理
      // ！！！ getCurrentTexture 获取的 GPUYTexture 永远是同一个
      const originalGetCurrentTexture = this.getCurrentTexture;
      this.getCurrentTexture = function () {
        const texture: GPUTexture = originalGetCurrentTexture.call(this);
        if (recoder.captureState.active) {
          recoder.frameWidth = texture.width;
          recoder.frameHeight = texture.height;
          const descriptor: GPUTextureDescriptor = 
          {
            size: [texture.width, texture.height],
            mipLevelCount: texture.mipLevelCount,
            sampleCount: texture.sampleCount,
            dimension: texture.dimension,
            format: texture.format,
            usage: texture.usage,
            label: texture.label
          };
          res.track(texture, {parent: this, descriptor}, 'getCurrentTexture');
          api.recordMethodCall('getCurrentTexture', []);
          if (texture) {
            const hook = new GPUTextureHook(texture);
            hook.hookGPUTexture(texture);
          }
        }
        return texture;
      };
    } else{
      throw new Error('[hook] GPUCanvasContext is null.');
    }

    return result;
  };

  // fixme: getConfiguration(), unconfigure()
}

/**
 * @description 钩子函数，注意顺序
 */
export function hookInit() {
  // 检查是否支持 WebGPU
  if (!navigator.gpu) {
    throw new Error('[hook] WebGPU is not supported in your browser.');
  } else {
    msg.log(MsgLevel.level_1, '[hook] WebGPU is supported and injecting started.');
  }

  // 对 WebGPU 的关键 API 函数进行拦截
  hookGPUAdapter();
  hookGPUCanvasContext();

  // 主动的分割浏览器的帧
  requestAnimationFrame(frameRegistered);

  msg.log(MsgLevel.level_1, '[hook] injected.');
}