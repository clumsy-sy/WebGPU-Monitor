// (function() {
//   console.log("Hooking navigator start ...")
//   const originalRequestAdapter = navigator.gpu.requestAdapter;

//   navigator.gpu.requestAdapter = async function(...args) {
//     console.log('requestAdapter called with arguments:', args);

//     const adapter = await originalRequestAdapter.apply(this, args);

//     if (adapter) {
//       const originalRequestDevice = adapter.requestDevice;
//       adapter.requestDevice = async function(...deviceArgs) {
//         console.log('requestDevice called with arguments:', deviceArgs);

//         const device = await originalRequestDevice.apply(this, deviceArgs);

//         return device;
//       };
//     }

//     return adapter;
//   };
// })();

(function() {
  console.log("Hooking navigator start ...")
  const originalRequestAdapter = navigator.gpu.requestAdapter;

  navigator.gpu.requestAdapter = async function(...args) {
    console.log('requestAdapter called with arguments:', args);

    const adapter = await originalRequestAdapter.apply(this, args);
    console.log("adapter:", adapter);
    if (adapter) {
      const originalRequestDevice = adapter.requestDevice;
      adapter.requestDevice = async function(...deviceArgs) {
        console.log('requestDevice called with arguments:', deviceArgs);

        const device = await originalRequestDevice.apply(this, deviceArgs);
        console.log("device:", device);
        return device;
      };
    }

    return adapter;
  };
})();

// async function getCurrentTab() {
//   let queryOptions = { active: true, lastFocusedWindow: true };
//   // `tab` will either be a `tabs.Tab` instance or `undefined`.
//   let [tab] = await chrome.tabs.query(queryOptions);
//   return tab;
// }

// (function() {
//   console.log("Hooking start ...");
  
//   const message = {
//     adapter: null, // 用于存储 navigator.gpu.requestAdapter 的返回值
//     device: null    // 用于存储 adapter.requestDevice 的返回值
//   };
  
//   // hook navig
//   const originalRequestAdapter = navigator.gpu.requestAdapter;
  
//   navigator.gpu.requestAdapter = async function(...args) {
//     console.log('requestAdapter called with arguments:', args);

//     originalRequestAdapter.apply(this, args).then(adapter => {
//       message.adapter = adapter;
//     });

//     // if (message.adapter) {
//     //   const originalRequestDevice = adapter.requestDevice;
//     //   adapter.requestDevice = async function(...deviceArgs) {
//     //     console.log('requestDevice called with arguments:', deviceArgs);

//     //     originalRequestDevice.apply(this, deviceArgs).then(device => {
//     //       message.device = device;
//     //     });
//     //     return message.device;
//     //   };
//     // }

//     return message.adapter;
//   };

  
  // const originalCreateShaderModule = message.adapter.prototype.createShaderModule;

  // GPUDevice.prototype.createShaderModule = async function(...args) {
  //   console.log('createShaderModule called with shader:', args);
    
  //   const shaderModule = originalCreateShaderModule.call(this, ...args);

  //   return shaderModule;
  // };
  
// })();