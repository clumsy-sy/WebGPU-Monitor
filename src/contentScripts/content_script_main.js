import { hookInit } from './hooks/Hooks';
import { MsgType } from './utils/Global';
import { Tracker } from './core/Tracker';

// from deepseek
(function () {
  // 检测是否已经安装过
  if (window.__WEBGPU_CAPTURE_INSTALLED__) return;
  window.__WEBGPU_CAPTURE_INSTALLED__ = true;

  

  // 消息监听
  
  
  window.addEventListener('message', (event) => {
    if (event.data?.type === MsgType.Captures_begin) {
      console.log("[cs-si]Capture begin.");
      Tracker.captureState.msg = true;
    }
  });

  // 初始化
  hookInit();

})();
