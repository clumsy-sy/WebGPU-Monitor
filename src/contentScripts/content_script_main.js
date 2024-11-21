(function() {
  console.log("[cs-m]Hooking WebGPU API start ----------");

  // 保存原始的 requestAdapter 方法
  const originalRequestAdapter = navigator.gpu.requestAdapter;
  // 覆盖 requestAdapter 方法
  navigator.gpu.requestAdapter = async function(...args) {
    console.log('[cs-m]requestAdapter called with arguments:', args);
    // 向 Content Script 发送消息
    const message = { 
      type: "FROM_HOOKED_API", 
      message: "Hello from Injected Script",
      data: args
    };
    // 将 JSON 对象序列化为字符串
    const jsonString = JSON.stringify(message);
    window.postMessage(jsonString, "*");

    const adapter = await originalRequestAdapter.apply(this, args);
    console.log("[cs-m]adapter:", adapter);
    if (adapter) {
      // 保存原始的 requestDevice 方法
      const originalRequestDevice = adapter.requestDevice;
      // 覆盖 requestDevice 方法
      adapter.requestDevice = async function(...deviceArgs) {
        console.log('[cs-m]requestDevice called with arguments:', deviceArgs);

        const device = await originalRequestDevice.apply(this, deviceArgs);
        console.log("[cs-m]device:", device);
        return device;
      };
    }

    return adapter;
  };
})();

