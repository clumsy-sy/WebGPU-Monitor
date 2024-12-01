// 与 devtools 通信端口
let devToolPanelPort = null;
// 如果有链接未建立，先存入队列中
let messageQueue = [];

function messageHandler(event) {
  // 解析消息
  const receivedData = JSON.parse(event.data);
  // console.log("[cs-si]Message received:{", receivedData, "}");
  // 检查消息是否来自注入脚本
  if (event.source !== window || !receivedData.type) {
    console.log("[cs-si]Message from unknown source");
    return;
  }

  if (receivedData.type === "FROM_HOOKED_API") {
    console.log("[cs-si]Message from injected script:", receivedData.data);

    // 向 DevTools 发送消息
    if (devToolPanelPort) {
      devToolPanelPort.postMessage(event.data);
    } else {
      messageQueue.push(event.data);
    }
  } else{
    console.log("[cs-si]unknow source message: {", receivedData.data, "}");
  }
}

(function() {
  console.log("[cs-si] Add listener ----------")

  chrome.runtime.onConnect.addListener((port) => {
    if(port.name === "panel" ) {
      console.log("[cs-si]Connected to panel.");
      devToolPanelPort = port;
      if(devToolPanelPort) {
        for(let i = 0; i < messageQueue.length; i++) {
          devToolPanelPort.postMessage(messageQueue[i]);
        }
        messageQueue = [];
      }
    } else {
      console.log("[cs-si]Unknown port:", port.name);
    }

    port.onMessage.addListener((message) => {
        console.log("Message received from devtools:", message);
        // 回复消息
        port.postMessage({ message: "Hello from tab!" });
    });
  });

  console.log("[cs-si] send message to background ----------")

  // 监听从注入脚本发送的消息
  window.addEventListener("message", messageHandler);
})();