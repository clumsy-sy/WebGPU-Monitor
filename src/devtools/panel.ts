import { WebGPUReproducer } from "./core/Replayer";
import { TextureViewer } from "./core/TextureViewer";

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

let port: chrome.runtime.Port = chrome.tabs.connect(tabId, { name: "panel" });
portListener(port);

// 创建带自动重连的连接
const createPersistentConnection = (tabId: number) => {

  // 建立新连接
  port = chrome.tabs.connect(tabId, {
    name: "panel"
  });

  // 配置自动重连
  port.onDisconnect.addListener(() => {
    console.log(`Connection lost for tab ${tabId}, attempting reconnect...`);
    setTimeout(() => createPersistentConnection(tabId), 2000); // 2秒重试
  });

  portListener(port);

};

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    console.log("[panel] Tab updated:", tabId, changeInfo);
    console.log(`Tab ${tabId} reloaded, reconnecting...`);
    port.disconnect();
    createPersistentConnection(tabId)
  }
});

// 创建一个端口，用于与 content_script 进行通信
interface fpsType {
  frameCnt: number;
  deltaTime: number;
  fps: number;
}

// 定义接收消息的数据结构
interface ReceivedMessage {
  type: string;
  data: fpsType | string;
}

// 接收来自 content_script 的消息
function portListener(port: chrome.runtime.Port) {

  port.onMessage.addListener((message: string) => {
    const receivedData: ReceivedMessage = JSON.parse(message);
    const fps = document.getElementById("fpsPrint");
  
    if (receivedData.type === MsgType.Window) {
      if (receivedData.data !== undefined && receivedData.data !== null && typeof receivedData.data === "object") {
        if (fps) {
          // fixme 输出长度不固定
          const fpsValue = receivedData.data.fps.toString().padEnd(5, ' ');
          const deltaTimeValue = receivedData.data.deltaTime.toFixed(4).toString().padEnd(8, ' ');
          fps.textContent = `当前帧率: ${fpsValue} FPS (${deltaTimeValue} ms / frame) `;
        }
      }
    } else if (receivedData.type === MsgType.Captures_end) {
      console.log("[panel] Message received in panel.js:", receivedData);
    } else if (receivedData.type === MsgType.Frame) {
      console.log("[panel] Frame json:", receivedData.data);
      const replayCanvas = document.getElementById('replay') as HTMLCanvasElement | null;
      if(replayCanvas && typeof receivedData.data === "string") {
        const replayer = new WebGPUReproducer(replayCanvas);
        replayer.initialize()
        .then(() => { replayer.replayFrame(receivedData.data as string); })
        .then(() => { 
          const texViewer = new TextureViewer('texture-viewer', 'texture-select', replayer.getDevice());
          texViewer.addTextureViews(replayer.getTextureViews());
        });
      }
  
    } else {
      console.log("[panel] Message received in panel.js:", receivedData);
    }
  });
}

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
