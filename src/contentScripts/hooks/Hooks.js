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
      const currentFrameTime = performance.now();
      if (frameCnt > 0) {
        const deltaTime = currentFrameTime - lastFrameTime;
        const fps = Math.round(1000 / deltaTime);
        seedAndLogger.sendMessage(MsgType.Window, "time: ", {frameCnt, deltaTime, fps});
      }

      frameCnt += 1;
      lastFrameTime = currentFrameTime;

      if (Tracker.captureState.active) {
        console.log("[main] Capture next frame Finish!");
        // sendMessage(MsgType.Captures, "Capture next frame finish!", "finish");
        seedAndLogger.sendMessage( MsgType.Captures_end, "Capture next frame finish!", {signal: false} );
        Tracker.captureState.msg = false;
        Tracker.captureState.active = false;
        track.setTimeEnd(performance.now);
        console.log("[main] Tracker ----------------------------");
        console.log(track);
        console.log(Tracker.metedata);
        console.log("[main] Tracker ----------------------------");
        console.log(track.outputFrame());
        console.log("[main] FRAME ----------------------------");
      }

      
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

function hookCanvas(){
  const originalCanvasConf = GPUCanvasContext.configure;
  GPUCanvasContext.configure = function (configuration) {
    console.log("[hookCanvas] GPUCanvasContext.configure: ", configuration)
    Tracker.trackCanvasConfiguration(configuration);
    return originalCanvasConf.call(this, configuration);
  };
}

function hookAdapter() {
  // hook requestAdapter()
  const originalRequestAdapter = navigator.gpu.requestAdapter;
  navigator.gpu.requestAdapter = async function(options) {
    const adapter = await originalRequestAdapter.call(navigator.gpu, options);
    // 记录 AdapterOptions
    Tracker.trackAdapterOptions(options);
    if (adapter) {
      // hook requestDevice()
      const originalRequestDevice = adapter.requestDevice;
      adapter.requestDevice = async function(descriptor) {
        const device = await originalRequestDevice.call(adapter, descriptor);
        // 记录 deviceDescriptor
        Tracker.trackDeviceDescriptor(descriptor);  
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
    console.log('createBuffer', id, descriptor);
    const buffer = originalCreateBuffer.call(this, descriptor);
    const id = Tracker.trackResources(buffer, 'buffer', descriptor);
    
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
    
    // 劫持绘制命令
    ['draw', 'drawIndexed'].forEach(method => {
      pass[method] = new Proxy(pass[method], {
        apply(target, thisArg, args) {
          Tracker.trackCommand(method, args);
          return Reflect.apply(target, thisArg, args);
        }
      });
    });
    
    return pass;
  };
}

export function hookInit() {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in your browser.');
  }

  installFrameHooks();
  hookCanvas();
  hookAdapter();
  hookBuffers();
  hookShaders();
  hookPipelines();
  hookRenderPass();
  // hookComputePipelines();
  // hookTextures();
  // hookCopyCommands();
  // hookBindGroups();
  // hookSamplers();
  // hookQueueSubmits();
}