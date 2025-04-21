import { hookInit } from './core/hook';
import { MsgType } from '../global/message';
import { FrameRecorder } from './core/frame-recorder';

(function () {
  // 检测是否已经安装过
  if (window.__WEBGPU_CAPTURE_INSTALLED__) return;
  window.__WEBGPU_CAPTURE_INSTALLED__ = true;

  // 消息监听
  const frame = FrameRecorder.getInstance();
  window.addEventListener('message', (event) => {
    if (event.data?.type === MsgType.Captures_begin) {
      console.log("[cs-si]Capture begin.");
      frame.captureState.msg = true;
    }
    return true;
  });

  // 注入拦截初始化
  hookInit();

})();
