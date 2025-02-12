/**
 * @brief 信息类型
 */
export const MsgType = {
  WebGPU: "WEBGPU_API",
  Window: "WINDOW_API",
  Captures_begin: "CAPTURES_BEGIN",
  Captures_end: "CAPTURES_END",
  Frame: "FRAME_JSON",
};

export const Utils = {
  generateUniqueNumber: () =>  {
    const timestamp = Date.now(); // 获取当前时间戳
    const random = Math.floor(Math.random() * 1000000); // 生成随机数
    return parseInt(`${timestamp}${random}`, 10); // 拼接并转换为数字
  },
  getResourceType: (obj) => {
    switch (true) {
      case obj instanceof GPUAdapter: return 'adapters';
      case obj instanceof GPUDevice: return 'devices';
      case obj instanceof GPUBuffer: return 'buffers';
      case obj instanceof GPUTexture: return 'textures';
      case obj instanceof GPURenderPipeline: return 'pipelines';
      case obj instanceof GPUShaderModule: return 'shaders';
      case obj instanceof GPUCommandEncoder: return 'commandEncoders';
      case obj instanceof GPUBindGroup: return 'bindGroups';
      default:
        const typeName = obj?.constructor?.name || 'unknown';
        console.warn('Unknown resource type:', typeName);
        return 'others'; // 统一归到others
    }
  },
  generateId: (type) => `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  serializeArgs: (args) => {
    const seen = new WeakSet();
    try {
      return JSON.stringify(args, (_, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        if (value instanceof ArrayBuffer) {
          return { __type: 'ArrayBuffer', byteLength: value.byteLength };
        }
        return value;
      });
    } catch (e) {
      console.error('Serialization failed:', e);
      return '[]';
    }
  },
};