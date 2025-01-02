// 捕获信号
let captureFrameStrat = false;
/**
 * @brief 信息类型
 */
const MsgType = {
  WebGPU: "WEBGPU_API",
  Window: "WINDOW_API",
  Captures_begin: "CAPTURES_BEGIN",
  Captures_end: "CAPTURES_END",
};

/**
 * @brief 向 Content Script 发送消息
 * @param {string} type 消息类型
 * @param {string} label 消息标签
 * @param {any} args 消息内容
 */
function sendMessage(type, label, args) {
  window.postMessage(JSON.stringify({ 
    type: type, 
    message: label,
    data: args
  }), "*");
}


function checkAndLog(...args){
  if(captureFrameStrat === true) {
    console.log(...args);
  }
}

/**
 * @brief WebGPU API Hooks
 */
// function hookWebGPUAPI() {

//   console.log("[cs-m]Hooking WebGPU API start ----------");
 
//   // 保存原始的 requestAdapter 方法
//   const originalRequestAdapter = navigator.gpu.requestAdapter;
//   // 覆盖 requestAdapter 方法
//   navigator.gpu.requestAdapter = async function(...args) {
//     // 向 Content Script 发送消息
//     sendMessage(MsgType.WebGPU, "Call \'navigator.gpu.requestAdapter\' API", args);

//     const adapter = await originalRequestAdapter.apply(this, args);
//     // console.log("[cs-m]adapter:", adapter);
//     if (adapter) {
//       // 保存原始的 requestDevice 方法
//       const originalRequestDevice = adapter.requestDevice;
//       // 覆盖 requestDevice 方法
//       adapter.requestDevice = async function(...deviceArgs) {
//         //// console.log('[cs-m]requestDevice called with arguments:', deviceArgs);
//         // 向 Content Script 发送消息
//         sendMessage(MsgType.WebGPU, "Call \'adapter.requestDevice\' API", deviceArgs);

//         const device = await originalRequestDevice.apply(this, deviceArgs);
//         // console.log("[cs-m]device:", device);

//         if(device){
//           // const originalCreateBuffer = device.createBuffer;
//           const originalCreateShaderModule =  device.createShaderModule;

//           device.createShaderModule = function(...args){
//             // console.log("[cs-m]createShaderModule called with arguments:", args);
//             // 向 Content Script 发送消息
//             sendMessage(MsgType.WebGPU, "Call \'device.createShaderModule\' API", args);

//             const shaderModule = originalCreateShaderModule.apply(this, args);

//             // console.log("[cs-m]shaderModule:", shaderModule);
//             return shaderModule;
//           }

//           const originalCreateRenderPipeline = device.createRenderPipeline;

//           device.createRenderPipeline = function(...args){
//             // console.log("[cs-m]createRenderPipeline called with arguments:", args);
//             // 向 Content Script 发送消息
//             sendMessage(MsgType.WebGPU, "Call \'device.createRenderPipeline\' API", args);

//             const renderPipeline = originalCreateRenderPipeline.apply(this, args);

//             console.log("[cs-m]renderPipeline:",renderPipeline);
//             return renderPipeline;
//           }

//           const originalCreateCommandEncoder = device.createCommandEncoder;

//           device.createCommandEncoder = function(...args){
//             // console.log("[cs-m]createCommandEncoder called with arguments:", args);
//             // 向 Content Script 发送消息
//             sendMessage(MsgType.WebGPU, "Call \'device.createCommandEncoder\' API", args);

//             const commandEncoder = originalCreateCommandEncoder.apply(this, args);

//             console.log("[cs-m]commandEncoder:",commandEncoder);

//             if(commandEncoder) {

//               const originalBeginRenderPass = commandEncoder.beginRenderPass

//               commandEncoder.beginRenderPass = function(...args){
//                 // console.log("[cs-m]beginRenderPass called with arguments:", args);
//                 // 向 Content Script 发送消息
//                 sendMessage(MsgType.WebGPU, "Call \'commandEncoder.beginRenderPass\' API", args);

//                 const beginRenderPass = originalBeginRenderPass.apply(this, args);

//                 console.log("[cs-m]beginRenderPass:", beginRenderPass);

//                 if(beginRenderPass) {

//                   const originalSetPipeline = beginRenderPass.setPipeline;
    
//                   beginRenderPass.setPipeline = function(...args){
//                     // console.log("[cs-m]setPipeline called with arguments:", args);
//                     // 向 Content Script 发送消息
//                     sendMessage(MsgType.WebGPU, "Call \'beginRenderPass.setPipeline\' API", args);
    
//                     const setPipeline = originalSetPipeline.apply(this, args);
    
//                     console.log("[cs-m]setPipeline:",setPipeline);
//                     return setPipeline;
//                   }
    
//                   const originalDraw = beginRenderPass.draw;
//                   beginRenderPass.draw = function(...args){
//                     // console.log("[cs-m]draw called with arguments:", args);
//                     // 向 Content Script 发送消息
//                     sendMessage(MsgType.WebGPU, "Call \'beginRenderPass.draw\' API", args);
    
//                     const draw = originalDraw.apply(this, args);
    
//                     console.log("[cs-m]draw:",draw);
//                     return draw;
//                   }
    
//                   const originalEnd = beginRenderPass.end;
//                   beginRenderPass.end = function(...args){
//                     // console.log("[cs-m]end called with arguments:", args);
//                     // 向 Content Script 发送消息
//                     sendMessage(MsgType.WebGPU, "Call \'beginRenderPass.end\' API", args);
    
//                     const end = originalEnd.apply(this, args);
    
//                     console.log("[cs-m]end:",end);
//                     return end;
//                   }
    
//                 }

//                 return beginRenderPass;
//               }

//               const originalFinish = commandEncoder.finish;

//               commandEncoder.finish = function(...args){
//                 // console.log("[cs-m]finish called with arguments:", args);
//                 // 向 Content Script 发送消息
//                 sendMessage(MsgType.WebGPU, "Call \'commandEncoder.finish\' API", args);

//                 const commandBuffer = originalFinish.apply(this, args);

//                 console.log("[cs-m]commandBuffer:",commandBuffer);

//                 return commandBuffer;
//               }

//             }

//             return commandEncoder;
//           }

//           const originalQueueSubmite = device.queue.submit;

//           device.queue.submit = function(...args){
//             // console.log("[cs-m]submit called with arguments:", args);
//             // 向 Content Script 发送消息
//             sendMessage(MsgType.WebGPU, "Call \'device.queue.submit\' API", args);

//             const submit = originalQueueSubmite.apply(this, args);

//             console.log("[cs-m]submit:",submit);
//             return submit;
//           }
//         }

//         return device;
//       };
//     }

//     return adapter;
//   };
// }


// 帧计数 & 时间戳

function hookWebGPUAPI() {
  console.log("[cs-m]Hook WebGPU API");

  const originalRequestAdapter = navigator.gpu.requestAdapter;
  navigator.gpu.requestAdapter = async function(...args) {

    checkAndLog("navigator.gpu.requestAdapter", args);

    const adapter = await originalRequestAdapter.apply(this, args);

    if (adapter) {
      const originalRequestDevice = adapter.requestDevice;
      adapter.requestDevice = async function(...args) {

        checkAndLog("adapter.requestDevice", args);

        const device = await originalRequestDevice.apply(this, args);

        if (device) {
          // device.createCommandEncoder
          {
            const originalCreateCommandEncoder = device.createCommandEncoder;
            device.createCommandEncoder = function(...args) {
              
              checkAndLog("device.createCommandEncoder", args);
  
              const commandEncoder = originalCreateCommandEncoder.apply(this, args);

              if (commandEncoder) {
                const originalBeginRenderPass = commandEncoder.beginRenderPass;
                commandEncoder.beginRenderPass = function(...args) {
                  checkAndLog("commandEncoder.beginRenderPass", args);
                  const RenderPass = originalBeginRenderPass.apply(this, args);

                  if (RenderPass) {
                    // RenderPass.setPipeline
                    {
                      const originalSetPipeline = RenderPass.setPipeline;
                      RenderPass.setPipeline = function(...args) {
                        checkAndLog("RenderPass.setPipeline", args);
                        const setPipeline = originalSetPipeline.apply(this, args);
                        return setPipeline;
                      }
                    }
                    // RenderPass.setBindGroup
                    {
                      const originalSetBindGroup = RenderPass.setBindGroup;
                      RenderPass.setBindGroup = function(...args) {
                        checkAndLog("RenderPass.setBindGroup", args);
                        const setBindGroup = originalSetBindGroup.apply(this, args);
                        return setBindGroup;
                      }
                    }
                    // RenderPass.setVertexBuffer
                    {
                      const originalSetVertexBuffer = RenderPass.setVertexBuffer;
                      RenderPass.setVertexBuffer = function(...args) {
                        checkAndLog("RenderPass.setVertexBuffer", args);
                        const setVertexBuffer = originalSetVertexBuffer.apply(this, args);
                        return setVertexBuffer;
                      }
                    }
                    // RenderPass.setIndexBuffer
                    {
                      const originalSetIndexBuffer = RenderPass.setIndexBuffer;
                      RenderPass.setIndexBuffer = function(...args) {
                        checkAndLog("RenderPass.setIndexBuffer", args);
                        const setIndexBuffer = originalSetIndexBuffer.apply(this, args);
                        return setIndexBuffer;
                      }
                    }
                    // RenderPass.draw
                    {
                      const originalDraw = RenderPass.draw;
                      RenderPass.draw = function(...args) {
                        checkAndLog("RenderPass.draw", args);
                        const draw = originalDraw.apply(this, args);
                        return draw;
                      }
                    }
                    // RenderPass.drawIndexed
                    {
                      const originalDrawIndexed = RenderPass.drawIndexed;
                      RenderPass.drawIndexed = function(...args) {
                        checkAndLog("RenderPass.drawIndexed", args);
                        const drawIndexed = originalDrawIndexed.apply(this, args);
                        return drawIndexed;
                      }
                    }
                    // RenderPass.dispatchWorkgroups
                    {
                      const originalDispatchWorkgroups = RenderPass.dispatchWorkgroups;
                      RenderPass.dispatchWorkgroups = function(...args) {
                        checkAndLog("RenderPass.dispatchWorkgroups", args);
                        const dispatchWorkgroups = originalDispatchWorkgroups.apply(this, args);
                        return dispatchWorkgroups;
                      }
                    }

                    return RenderPass;
                  }
                }

              }
  
              return commandEncoder;
            }

          }
          // device.queue.submit
          {
            const originalQueueSubmite = device.queue.submit;
            device.queue.submit = function(...args) {
              
              checkAndLog("device.queue.submit", args);
  
              const submit = originalQueueSubmite.apply(this, args);
  
              return submit;
            }
          }
          
        }

        return device;
      }
    }

    return adapter;
  }
}


let frameCnt = 0;
let lastFrameTime = Date.now();
let captureSignal = false;

/**
 * @brief 下次重绘 hook
 */
function hookRequestAnimationFrame() {
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  window.requestAnimationFrame = function(callback) {

    // 计算 FPS
    const currentFrameTime = Date.now();
    if (frameCnt > 0) {
      const deltaTime = currentFrameTime - lastFrameTime;
      const fps = Math.round(1000 / deltaTime);
      sendMessage(MsgType.Window, "time: ", {frameCnt, deltaTime, fps});
    }

    frameCnt += 1;
    lastFrameTime = currentFrameTime;

    // 结束截帧
    if (captureFrameStrat === true) {
      console.log("[main] Capture next frame Finish!");
      // sendMessage(MsgType.Captures, "Capture next frame finish!", "finish");
      sendMessage( MsgType.Captures_end, "Capture next frame finish!", {signal: false} );
      captureFrameStrat = false;
      captureSignal = false;
    }

    // 判断下一帧开始是否需要截帧
    if (captureSignal === true) {
      captureFrameStrat = true;
      console.log("[main] Capture next frame: ", frameCnt);
    }

    const res = originalRequestAnimationFrame.apply(this, arguments);


    return res;
  };
}

/**
 * @brief 接收来自 content script 的消息
 */
function messageHandler(message) {
  let receivedData;
  try {
    receivedData = JSON.parse(message.data);
  } catch (error) {
    console.error("[main] Error parsing message:", error);
    console.log("[main] Error parsing message Origin:", message);
    return;
  }

  if (receivedData && receivedData.type === MsgType.Captures_begin) {
      captureSignal = true;
  } else {
    return;
  }

}

(function() {
  window.addEventListener("message", messageHandler);
  hookWebGPUAPI();
  hookRequestAnimationFrame();
})();

