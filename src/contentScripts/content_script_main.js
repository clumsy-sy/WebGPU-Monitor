import { hookInit, captureState } from './hooks/Hooks';
import { MsgType } from './utils/Global';

// from deepseek
(function () {
  // 检测是否已经安装过
  if (window.__WEBGPU_CAPTURE_INSTALLED__) return;
  window.__WEBGPU_CAPTURE_INSTALLED__ = true;

  // 捕获上下文
  // const CaptureContext = {
  //   metadata: {
  //     startTime: performance.now(),
  //     pageUrl: location.href,
  //     userAgent: navigator.userAgent,
  //     gpuAdapter: null,
  //   },
  //   resources: {
  //     adapters: new Map(),
  //     devices: new Map(),
  //     buffers: new Map(),
  //     textures: new Map(),
  //     pipelines: new Map(),
  //     shaders: new Map(),
  //     commandEncoders: new Map(),
  //     bindGroups: new Map(),
  //     others: new Map() // 兜底类型
  //   },
  //   calls: [],
  //   currentFrame: {
  //     frameId: 0,
  //     commands: [],
  //     submits: [],
  //   },
  //   resourceRegistry: new Map(), // id -> { type, descriptor, refCount }
  //   deviceInstances: new WeakMap(),
  //   adapterInstances: new WeakMap()
  // };



  // 消息监听
  
  
  window.addEventListener('message', (event) => {
    if (event.data?.type === MsgType.Captures_begin) {
      console.log("[cs-si]Capture begin.");
      captureState.msg = true;
    }
  });

  // 初始化
  hookInit();

})();
