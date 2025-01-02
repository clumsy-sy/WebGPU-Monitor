/**
 * @brief 信息类型
 */
const MsgType = {
  WebGPU: "WEBGPU_API",
  Window: "WINDOW_API",
  Captures_begin: "CAPTURES_BEGIN",
  Captures_end: "CAPTURES_END",
};


// 获取当前标签页的 ID
let tabId = chrome.devtools.inspectedWindow.tabId;
console.log("[panel] get current TabId:", tabId);
// 创建一个端口，用于与 content_script 进行通信
let port = chrome.tabs.connect(tabId, { name: "panel" });

// 接收来自 content_script 的消息
port.onMessage.addListener((message) => {
  //   console.log("[panel] Message received in panel.js:", message);
  const receivedData = JSON.parse(message);
  const fps = document.getElementById("fpsPrint");

  if (receivedData.type === MsgType.Window) {
      if (receivedData.data !== undefined && receivedData.data !== null) {
          console.log("[panel] frame", receivedData.data.frameCnt, "deltaTime:", receivedData.data.deltaTime, "ms, FPS:", receivedData.data.fps);
          fps.textContent = `当前帧率: ${receivedData.data.fps} FPS (${receivedData.data.deltaTime} ms / frame) `;
      }
  } else if (receivedData.type === MsgType.Captures_end) {
      console.log("[panel] Message received in panel.js:", receivedData);
  } else {
      console.log("[panel] Message received in panel.js:", receivedData);
  }
});

// 确保页面加载完成后再执行相关操作
document.addEventListener("DOMContentLoaded", function() {
  const captureButton = document.getElementById("getFrame");
  
  if (captureButton) {
      captureButton.addEventListener("click", function() {
          console.log("[panel] send message to content script");
          port.postMessage(JSON.stringify({ type: MsgType.Captures_begin, message: "get current frame", data: "strat" }));
      });
  } else {
      console.error("Element with id 'getFrame' not found.");
  }
});
