
// let devToolPort = null; // invalid
// let devToolPanelPort = null;

// let messageQueue = [];

// // 监听 DevTools 和 DevTools Panel 页面连接
// chrome.runtime.onConnect.addListener((port) => {
//   if (port.name === "devtools") { // invalid
//     devToolPort = port;
//     console.log("[bg]Connected to DevTools Page.");
//     // 从 DevTools 页面接收消息
//     port.onMessage.addListener((msg) => {
//       console.log("[bg]Message from DevTools Page:", msg);
//     });
//   }
//   else if(port.name === "devtools-panel")
//   {
//     devToolPanelPort = port;
//     console.log("[bg]Connected to DevTools Panel.");
//     if(devToolPanelPort) {
//       for(let i = 0; i < messageQueue.length; i++) {
//         devToolPanelPort.postMessage(messageQueue[i]);
//       }
//       messageQueue = [];
//     }
//   }
//   else 
//   {
//     console.log("[bg]Unknown connection:", port.name);
//   }
// });

// // 从 Content Script 接收消息，转发到 DevTools Panel 页面
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   try {
//     const receivedData = JSON.parse(message);
//     console.log("[bg]Received data:", receivedData);
//     if (receivedData.type === "FROM_HOOKED_API") {
//       // console.log("[bg]Message from Content Script:", receivedData);
  
//       if (devToolPanelPort) {
//         devToolPanelPort.postMessage(message);
//       } else {
//         messageQueue.push(message);
//       }

//     } else {
//       console.log("[bg]Unknown message:", message);
//     }
//   } catch (error) {
//     console.error("[bg]Failed to parse JSON data:", error);
//   }
// });


