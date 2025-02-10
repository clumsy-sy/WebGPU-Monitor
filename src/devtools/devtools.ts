chrome.devtools.panels.create(
  "WebGPU DevTools",
  "../icons/icon-48.png",
  "src/devtools/panel.html",
  (panel: chrome.devtools.panels.ExtensionPanel) => {
    console.log("WebGPU Monitor panel created: ", panel);
  }
);