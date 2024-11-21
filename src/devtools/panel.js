// 连接到 background script
const port = chrome.runtime.connect({ name: "devtools-panel" });
// 监听来自 background script 的消息
port.onMessage.addListener((message) => {
  // 将消息转换为 JSON 字符串
  const receivedData = JSON.parse(message);
  const output = document.getElementById("output");
  output.textContent = `Received message: ${receivedData.message}`;
  console.log("Message received in panel.js:", receivedData);
});