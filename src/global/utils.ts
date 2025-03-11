/// <reference types="@webgpu/types" />
export type WebGPUAllType = 
  | GPUBuffer 
  | GPUTexture 
  | GPUTextureView
  | GPUShaderModule 
  | GPURenderPipeline
  | GPUComputePipeline
  | GPUBindGroup
  | GPUBindGroupLayout
  | GPUCommandBuffer
  | GPUPipelineLayout;

export const ResourceTypeEnum = {
  GPUBuffer: "GPUBuffer",
  GPUTexture: "GPUTexture",
  GPUTextureView: "GPUTextureView",
  GPUShaderModule: "GPUShaderModule",
  GPURenderPipeline: "GPURenderPipeline",
  GPUComputePipeline: "GPUComputePipeline",
  GPUBindGroup: "GPUBindGroup",
  GPUBindGroupLayout: "GPUBindGroupLayout",
  GPUCommandBuffer: "GPUCommandBuffer",
  GPUPipelineLayout: "GPUPipelineLayout",
} as const;
  
export type ResourceType = typeof ResourceTypeEnum[keyof typeof ResourceTypeEnum];

/*
 * @description: 命令信息
 * @param {number} eid 命令id
 * @param {string} type 命令类型
 * @param {any} args 命令参数
 * @param {number} time 命令时间
 */
export interface cmdInfo {
  eid: number;
  type: string;
  args: any;
  time: number;
}

/**
 * @description: 资源信息
 * @param {number} id 资源id
 * @param {string} type 资源类型
 * @param {any} desc 资源描述
 */
export interface ResInfo {
  id: number;
  type: string;
  desc: any;
  data?: any;
};


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