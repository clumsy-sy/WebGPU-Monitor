function sendMessage(label, args) {
  const message = { 
    type: "FROM_HOOKED_API", 
    message: label,
    data: args
  };
  const jsonString = JSON.stringify(message);
  window.postMessage(jsonString, "*");
}


(function() {
  console.log("[cs-m]Hooking WebGPU API start ----------");
 

  // 保存原始的 requestAdapter 方法
  const originalRequestAdapter = navigator.gpu.requestAdapter;
  // 覆盖 requestAdapter 方法
  navigator.gpu.requestAdapter = async function(...args) {
    // 向 Content Script 发送消息
    sendMessage("Call \'navigator.gpu.requestAdapter\' API", args);

    const adapter = await originalRequestAdapter.apply(this, args);
    // console.log("[cs-m]adapter:", adapter);
    if (adapter) {
      // 保存原始的 requestDevice 方法
      const originalRequestDevice = adapter.requestDevice;
      // 覆盖 requestDevice 方法
      adapter.requestDevice = async function(...deviceArgs) {
        //// console.log('[cs-m]requestDevice called with arguments:', deviceArgs);
        // 向 Content Script 发送消息
        sendMessage("Call \'adapter.requestDevice\' API", deviceArgs);

        const device = await originalRequestDevice.apply(this, deviceArgs);
        // console.log("[cs-m]device:", device);

        if(device){
          // const originalCreateBuffer = device.createBuffer;
          const originalCreateShaderModule =  device.createShaderModule;

          device.createShaderModule = function(...args){
            // console.log("[cs-m]createShaderModule called with arguments:", args);
            // 向 Content Script 发送消息
            sendMessage("Call \'device.createShaderModule\' API", args);

            const shaderModule = originalCreateShaderModule.apply(this, args);

            // console.log("[cs-m]shaderModule:", shaderModule);
            return shaderModule;
          }

          const originalCreateRenderPipeline = device.createRenderPipeline;

          device.createRenderPipeline = function(...args){
            // console.log("[cs-m]createRenderPipeline called with arguments:", args);
            // 向 Content Script 发送消息
            sendMessage("Call \'device.createRenderPipeline\' API", args);

            const renderPipeline = originalCreateRenderPipeline.apply(this, args);

            console.log("[cs-m]renderPipeline:",renderPipeline);
            return renderPipeline;
          }

          const originalCreateCommandEncoder = device.createCommandEncoder;

          device.createCommandEncoder = function(...args){
            // console.log("[cs-m]createCommandEncoder called with arguments:", args);
            // 向 Content Script 发送消息
            sendMessage("Call \'device.createCommandEncoder\' API", args);

            const commandEncoder = originalCreateCommandEncoder.apply(this, args);

            console.log("[cs-m]commandEncoder:",commandEncoder);

            if(commandEncoder) {

              const originalBeginRenderPass = commandEncoder.beginRenderPass

              commandEncoder.beginRenderPass = function(...args){
                // console.log("[cs-m]beginRenderPass called with arguments:", args);
                // 向 Content Script 发送消息
                sendMessage("Call \'commandEncoder.beginRenderPass\' API", args);

                const beginRenderPass = originalBeginRenderPass.apply(this, args);

                console.log("[cs-m]beginRenderPass:", beginRenderPass);

                if(beginRenderPass) {

                  const originalSetPipeline = beginRenderPass.setPipeline;
    
                  beginRenderPass.setPipeline = function(...args){
                    // console.log("[cs-m]setPipeline called with arguments:", args);
                    // 向 Content Script 发送消息
                    sendMessage("Call \'beginRenderPass.setPipeline\' API", args);
    
                    const setPipeline = originalSetPipeline.apply(this, args);
    
                    console.log("[cs-m]setPipeline:",setPipeline);
                    return setPipeline;
                  }
    
                  const originalDraw = beginRenderPass.draw;
                  beginRenderPass.draw = function(...args){
                    // console.log("[cs-m]draw called with arguments:", args);
                    // 向 Content Script 发送消息
                    sendMessage("Call \'beginRenderPass.draw\' API", args);
    
                    const draw = originalDraw.apply(this, args);
    
                    console.log("[cs-m]draw:",draw);
                    return draw;
                  }
    
                  const originalEnd = beginRenderPass.end;
                  beginRenderPass.end = function(...args){
                    // console.log("[cs-m]end called with arguments:", args);
                    // 向 Content Script 发送消息
                    sendMessage("Call \'beginRenderPass.end\' API", args);
    
                    const end = originalEnd.apply(this, args);
    
                    console.log("[cs-m]end:",end);
                    return end;
                  }
    
                }

                return beginRenderPass;
              }

              const originalFinish = commandEncoder.finish;

              commandEncoder.finish = function(...args){
                // console.log("[cs-m]finish called with arguments:", args);
                // 向 Content Script 发送消息
                sendMessage("Call \'commandEncoder.finish\' API", args);

                const commandBuffer = originalFinish.apply(this, args);

                console.log("[cs-m]commandBuffer:",commandBuffer);

                return commandBuffer;
              }

            }

            return commandEncoder;
          }

          const originalQueueSubmite = device.queue.submit;

          device.queue.submit = function(...args){
            // console.log("[cs-m]submit called with arguments:", args);
            // 向 Content Script 发送消息
            sendMessage("Call \'device.queue.submit\' API", args);

            const submit = originalQueueSubmite.apply(this, args);

            console.log("[cs-m]submit:",submit);
            return submit;
          }
        }

        return device;
      };
    }

    return adapter;
  };
})();

