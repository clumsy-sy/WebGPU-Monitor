import { MsgType } from './utils/Global';

// 与 devtools 通信端口
let devToolPanelPort = null;
// 如果有链接未建立，先存入队列中
let messageQueue = [];
// 捕获信号
let captureSignal = false;

/**
 * @brief 发送消息到 devtool 否则进入缓存队列
 * @param data 消息
 */
function sendMessageToDevTools(data) {
  if (devToolPanelPort) {
    devToolPanelPort.postMessage(data);
  } else {
    messageQueue.push(data);
  }
}

/**
 * @brief 接收消息
 * @param message 消息
 */
function messageHandler(message) {
  if(!message.data) {
    return;
  }
  // 解析消息

  let receivedData = null;
  if (typeof message.data === 'string') {
    receivedData = JSON.parse(message.data);
  } else {
    receivedData = message.data;
  }
  // 检查消息是否来自注入脚本
  if (message.source !== window || !receivedData.type) {
    console.log("[cs-si]Message from unknown source");
    return;
  }

  if (receivedData.type === MsgType.WebGPU) {
    sendMessageToDevTools(message.data);
  } else if (receivedData.type === MsgType.Window) {
    sendMessageToDevTools(message.data);
  } else if (receivedData.type === MsgType.Captures_end) {
    console.log("[cs-si]Capture finish.");
    captureSignal = false;
    sendMessageToDevTools(message.data);
  } else if (receivedData.type === MsgType.Frame){
    sendMessageToDevTools(message.data);
  } else {
    return;
  }
}

(function() {
  // 监听从注入脚本发送的消息
  window.addEventListener("message", messageHandler);
  console.log("[cs-si] Add Inject listener ----------")

  // 链接 devtools
  chrome.runtime.onConnect.addListener((port) => {
    if(port.name === "panel" ) {
      console.log("[cs-si]Connected to panel.");
      devToolPanelPort = port;
      if(devToolPanelPort) {
        // 将缓存的消息发送给 devtools
        for(let i = 0; i < messageQueue.length; i++) {
          devToolPanelPort.postMessage(messageQueue[i]);
        }
        messageQueue = [];
      }
    } else {
      console.log("[cs-si]Unknown port:", port.name);
    }

    // 接收消息
    port.onMessage.addListener((message) => {
      const receivedData = JSON.parse(message);
      if (receivedData.type === MsgType.Captures_begin) {
        captureSignal = true;
        
        window.postMessage({ type: MsgType.Captures_begin, message: "capture signal", data: {signal: captureSignal} }, "*");

      } else {
        console.log("[cs-si]Message from unknown source:", receivedData);
      }
    });
  });

})();