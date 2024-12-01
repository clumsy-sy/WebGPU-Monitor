
// 创建一个面板
chrome.devtools.panels.create(
  "WebGPU DevTools",
  "../icons/icon-48.png",
  "src/devtools/panel.html",
  (panel) => {
    console.log("User switched to panel");
  }
);

// 连接到后台脚本(invalid)
// const port = chrome.runtime.connect({ name: "devtools" });

// 监听从后台脚本转发的消息(invalid)
// port.onMessage.addListener((message) => {
//   if (message.type === "TO_DEVTOOLS") {
//     console.log("[devtool]Message from Injected Script (via Background):", message.data);
//   }
//   else
//   {
//     console.log("[devtool]Unknown message:", message);
//   }
// });


