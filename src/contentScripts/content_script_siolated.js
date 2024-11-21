(function() {
  console.log("[cs-si] Add listener ----------")
  // 监听从注入脚本发送的消息
  window.addEventListener("message", (event) => {
    // 解析消息
    console.log("[cs-si]Message received from content script:", event.data);
    const receivedData = JSON.parse(event.data);
    console.log("[cs-si]JSON Message:", receivedData);
    // 检查消息是否来自注入脚本
    if (event.source !== window || !receivedData.type) {
      console.log("[cs-si]Message from unknown source");
      return;
    }

    if (receivedData.type === "FROM_HOOKED_API") {
      console.log("[cs-si]Message from injected script:", receivedData.data);

      // 将消息发送到后台脚本
      chrome.runtime.sendMessage(event.data);
    }
    else{
      console.log("[cs-si]Message from background script:", receivedData.data);
    }
  });
})();