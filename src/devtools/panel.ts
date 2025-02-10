/**
 * @brief 信息类型
 */
const MsgType = {
  WebGPU: "WEBGPU_API",
  Window: "WINDOW_API",
  Captures_begin: "CAPTURES_BEGIN",
  Captures_end: "CAPTURES_END",
  Frame: "FRAME_JSON",
} as const; // 使用 as const 确保类型为字面量类型


// 获取当前标签页的 ID
const tabId: number = chrome.devtools.inspectedWindow.tabId;
console.log("[panel] get current TabId:", tabId);

// 创建一个端口，用于与 content_script 进行通信
const port: chrome.runtime.Port = chrome.tabs.connect(tabId, { name: "panel" });

// 定义接收消息的数据结构
interface ReceivedMessage {
  type: string;
  data?: {
    frameCnt?: number;
    deltaTime?: number;
    fps?: number;
  };
}

// 接收来自 content_script 的消息
port.onMessage.addListener((message: string) => {
  const receivedData: ReceivedMessage = JSON.parse(message);
  const fps = document.getElementById("fpsPrint");

  if (receivedData.type === MsgType.Window) {
    if (receivedData.data !== undefined && receivedData.data !== null) {
      // console.log(
      //   "[panel] frame",
      //   receivedData.data.frameCnt,
      //   "deltaTime:",
      //   receivedData.data.deltaTime,
      //   "ms, FPS:",
      //   receivedData.data.fps
      // );
      if (fps) {
        fps.textContent = `当前帧率: ${receivedData.data.fps} FPS (${receivedData.data.deltaTime} ms / frame) `;
      }
    }
  } else if (receivedData.type === MsgType.Captures_end) {
    console.log("[panel] Message received in panel.js:", receivedData);
  } else if (receivedData.type === MsgType.Frame) {
    console.log("[panel] Frame json:", receivedData.data);
  } else {
    console.log("[panel] Message received in panel.js:", receivedData);
  }
});

// 确保页面加载完成后再执行相关操作
document.addEventListener("DOMContentLoaded", () => {
  const captureButton = document.getElementById("getFrame");

  if (captureButton) {
    captureButton.addEventListener("click", () => {
      console.log("[panel] send message to content script");
      port.postMessage(
        JSON.stringify({
          type: MsgType.Captures_begin,
          message: "get current frame",
          data: "start",
        })
      );
    });
  } else {
    console.error("Element with id 'getFrame' not found.");
  }
});
