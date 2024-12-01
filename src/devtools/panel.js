/**
 * 
 */
(function() {

  // 获取当前标签页的 ID
  let tabId = chrome.devtools.inspectedWindow.tabId;
  console.log("[panel] get current TabId:", tabId);

  let port = chrome.tabs.connect(tabId, { name: "panel" });

  port.onMessage.addListener((message) => {
    // 将消息解析
    const receivedData = JSON.parse(message);
    const output = document.getElementById("output");
    output.textContent = `Received message: ${receivedData.message}`;
    console.log("Message received in panel.js:", receivedData);
  });

})();