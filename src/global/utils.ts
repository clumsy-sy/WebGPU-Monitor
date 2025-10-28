import { WebGPUAllType } from "./webgpu-types";

let IDstart = 998244353;

export const Utils = {
  genUniqueNumber: () =>  {
    IDstart ++;
    return IDstart;
  },
  getWebGPUType: (obj: WebGPUAllType) => {
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

};
