/// <reference types="@webgpu/types" />

/**
 * 所有 WebGPU 核心类型联合
 */
export type WebGPUCoreType = 
  | GPUAdapter
  | GPUDevice
  | GPUBuffer 
  | GPUTexture 
  | GPUTextureView
  | GPUShaderModule 
  | GPURenderPipeline
  | GPUComputePipeline
  | GPUBindGroup
  | GPUBindGroupLayout
  | GPUCommandEncoder
  | GPUCommandBuffer
  | GPURenderPassEncoder
  | GPUComputePassEncoder
  | GPURenderBundleEncoder
  | GPURenderBundle
  | GPUSampler
  | GPUPipelineLayout;

/**
 * WebGPU 资源种类枚举
 * 使用更简洁的命名，便于在ID中使用
 */
export const ResourceKind = {
  Adapter: "adapter",
  Device: "device",
  Buffer: "buffer",
  Texture: "texture",
  TextureView: "textureView",
  ShaderModule: "shaderModule",
  RenderPipeline: "renderPipeline",
  ComputePipeline: "computePipeline",
  BindGroup: "bindGroup",
  BindGroupLayout: "bindGroupLayout",
  CommandEncoder: "commandEncoder",
  CommandBuffer: "commandBuffer",
  RenderPass: "renderPass",
  ComputePass: "computePass",
  RenderBundleEncoder: "renderBundleEncoder",
  RenderBundle: "renderBundle",
  Sampler: "sampler",
  PipelineLayout: "pipelineLayout",
} as const;

export type ResourceKind = typeof ResourceKind[keyof typeof ResourceKind];


/**
 * WebGPU 命令类型
 */
export const CommandType = {
  // 设备操作
  RequestAdapter: "requestAdapter",
  RequestDevice: "requestDevice",
  
  // Buffer操作
  CreateBuffer: "createBuffer",
  MapBuffer: "mapBuffer",
  UnmapBuffer: "unmapBuffer",
  WriteBuffer: "writeBuffer",
  
  // Texture操作
  CreateTexture: "createTexture",
  CreateTextureView: "createView",
  WriteTexture: "writeTexture",
  CopyTextureToBuffer: "copyTextureToBuffer",
  CopyTextureToTexture: "copyTextureToTexture",
  
  // Pipeline操作
  CreateRenderPipeline: "createRenderPipeline",
  CreateComputePipeline: "createComputePipeline",
  CreatePipelineLayout: "createPipelineLayout",
  
  // Bind操作
  CreateBindGroupLayout: "createBindGroupLayout",
  CreateBindGroup: "createBindGroup",
  
  // CommandEncoder操作
  CreateCommandEncoder: "createCommandEncoder",
  FinishCommandEncoder: "finish",
  
  // RenderPass操作
  BeginRenderPass: "beginRenderPass",
  SetPipeline: "setPipeline",
  SetBindGroup: "setBindGroup",
  SetVertexBuffer: "setVertexBuffer",
  SetIndexBuffer: "setIndexBuffer",
  Draw: "draw",
  DrawIndexed: "drawIndexed",
  DrawIndirect: "drawIndirect",
  DrawIndexedIndirect: "drawIndexedIndirect",
  EndPass: "end",
  
  // ComputePass操作
  BeginComputePass: "beginComputePass",
  DispatchWorkgroups: "dispatchWorkgroups",
  DispatchWorkgroupsIndirect: "dispatchWorkgroupsIndirect",
} as const;

export type CommandType = typeof CommandType[keyof typeof CommandType];

/**
 * 资源描述信息 - 根据资源类型有不同结构
 */
export type ResourceDescriptor = 
  | BufferDescriptor
  | TextureDescriptor
  | ShaderModuleDescriptor
  | PipelineDescriptor
  | BindGroupDescriptor
  | CommandEncoderDescriptor
  | SamplerDescriptor
  | PipelineLayoutDescriptor;

/** 缓冲区描述 */
export interface BufferDescriptor {
  size: number;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

/** 纹理描述 */
export interface TextureDescriptor {
  size: GPUExtent3D;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
  dimension?: GPUTextureDimension;
  mipLevelCount?: number;
  sampleCount?: number;
}

/** 着色器模块描述 */
export interface ShaderModuleDescriptor {
  code: string;
  compilationHints?: { [key: string]: GPUBindGroupLayout };
}

/** 管线描述 */
export interface PipelineDescriptor {
  layout: GPUPipelineLayout;
  vertex: {
    module: GPUShaderModule;
    entryPoint: string;
    buffers?: GPUVertexBufferLayout[];
  };
  fragment?: {
    module: GPUShaderModule;
    entryPoint: string;
    targets: GPUColorTargetState[];
  };
  primitive: GPUPrimitiveState;
  depthStencil?: GPUDepthStencilState;
  multisample?: GPUMultisampleState;
  // ComputePipeline特有
  compute?: {
    module: GPUShaderModule;
    entryPoint: string;
  };
}

/** 绑定组描述 */
export interface BindGroupDescriptor {
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
}

/** 命令编码器描述 */
export interface CommandEncoderDescriptor {
  label?: string;
}

/** 采样器描述 */
export interface SamplerDescriptor {
  addressModeU?: GPUAddressMode;
  addressModeV?: GPUAddressMode;
  addressModeW?: GPUAddressMode;
  magFilter?: GPUFilterMode;
  minFilter?: GPUFilterMode;
  mipmapFilter?: GPUFilterMode;
  lodMinClamp?: number;
  lodMaxClamp?: number;
  compare?: GPUCompareFunction;
  maxAnisotropy?: number;
}

/** 管线布局描述 */
export interface PipelineLayoutDescriptor {
  bindGroupLayouts: GPUBindGroupLayout[];
}

/**
 * 资源信息 - 与JSON序列化兼容
 *    id: number;
 *    type: string;
 *    desc: any;
 *    data?: any;
 */
export interface ResourceInfo {
  /** 资源唯一ID (格式: kind-timestamp-random) */
  id: string;
  /** 资源种类 */
  // kind: ResourceKind;
  type: string;
  /** 资源描述（根据kind不同结构不同） */
  descriptor: any;
  /** 资源数据（仅适用于Buffer/Texture） */
  data?: any;
  /** 资源创建时间 */
  // createdAt: number;
  /** 资源大小（字节） */
  size?: number;
  /** 资源标签（如果有） */
  label?: string;
  /** 父资源ID（如TextureView的Texture） */
  parentId?: string;
  /** 设备ID（用于多设备场景） */
  deviceId?: string;
}

/**
 * 命令执行信息
 */
export interface CommandExecution {
  /** 命令唯一ID (格式: cmd-type-timestamp-random) */
  id: string;
  /** 命令顺序 ID */
  eid: number;
  /** 命令类型 */
  // type: CommandType;
  type: string;
  /** 命令参数（已处理为可序列化格式） */
  args: any[];
  /** 命令执行时间 */
  time: number;
  /** 关联的资源ID列表 */
  resourceIds?: string[];
  /** 命令所属的编码器ID（如果有） */
  encoderId?: string;
}

interface EncoderCmd {
  id: number,
  type: 'GPUCommandEncoder',
  descriptor: GPUCommandEncoderDescriptor | undefined;
  cmds: (RenderPassRecord | ComputePassRecord | EncoderBaseCmd)[],
  timeStamp: number
}

interface EncoderBaseCmd {
  eid: number,
  basetype: 'baseCmd';
  type: string;
  args: any[];
}

interface RenderPassRecord {
  id: string;
  eid: number;
  basetype: 'GPURenderPass';
  cmds: { type: string; args: any[] }[];
  descriptor: GPURenderPassDescriptor | undefined;
}

interface ComputePassRecord {
  id: string;
  eid: number;
  basetype: 'GPUComputePass';
  cmds: { type: string; args: any[] }[];
  descriptor: GPUComputePassDescriptor | undefined;
}

interface QueueCommandType {
  type: string;
  args: object;
  timestamp: number;
}

interface EncoderCommandType {
  commandBufferID: string;
  commands: Array<{
    type: string;
    args: object;
    timestamp: number;
  }>;
}


/**
 * 帧数据结构
 */
interface FrameDataType {
  frameID: number;
  frameStartTime: number;
  frameEndTime: number;
  frameWidth: number;
  frameHeight: number;
  CanvasConfiguration: GPUCanvasConfiguration | {};
  AdapterOptions: GPURequestAdapterOptions;
  deviceDescriptor: GPUDeviceDescriptor;
  resources: Array<ResInfo>;
  command: Array<(EncoderCmd | cmdInfo)>;
}

// export interface FrameData {
//   /** 帧ID */
//   frameId: number;
//   /** 帧开始时间 */
//   startTime: number;
//   /** 帧结束时间 */
//   endTime: number;
//   /** 帧持续时间（微秒） */
//   duration: number;
//   /** 画布尺寸 */
//   frameWidth: number;
//   frameHeight: number;
//   CanvasConfiguration: GPUCanvasConfiguration | {};
//   /** 适配器选项 */
//   adapterOptions: GPURequestAdapterOptions;
//   /** 设备描述 */
//   deviceDescriptor: GPUDeviceDescriptor;
//   /** 所有资源 */
//   resources: ResourceInfo[];
//   /** 所有命令 */
//   commands: CommandExecution[];
//   /** 资源依赖关系图 */
//   dependencies: ResourceDependency[];
// }

/**
 * 资源依赖关系
 */
export interface ResourceDependency {
  /** 消费者资源ID */
  consumer: string;
  /** 提供者资源ID */
  provider: string;
  /** 依赖类型 */
  type: 'buffer' | 'texture' | 'pipeline' | 'bindGroup' | 'sampler';
  /** 使用点（如顶点缓冲索引） */
  usagePoint?: number | string;
}

/**
 * WebGPU工具类
 */
export class WebGPUUtils {
  /**
   * 生成唯一资源ID
   * 格式: kind-timestamp-random
   */
  // static generateResourceId(kind: ResourceKind): string {
  //   const timestamp = Date.now();
  //   const random = Math.random().toString(36).substr(2, 5);
  //   return `${kind}-${timestamp}-${random}`;
  // }

  static generateResourceId(str: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${str}-${timestamp}-${random}`;
  }

  static generateCommandId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `cmd-${timestamp}-${random}`;
  }

  /**
   * 从WebGPU对象获取资源种类
   */
  // static getResourceKind(obj: WebGPUCoreType): ResourceKind {
  //   if (obj instanceof GPUAdapter) return ResourceKind.Adapter;
  //   if (obj instanceof GPUDevice) return ResourceKind.Device;
  //   if (obj instanceof GPUBuffer) return ResourceKind.Buffer;
  //   if (obj instanceof GPUTexture) return ResourceKind.Texture;
  //   if (obj instanceof GPUTextureView) return ResourceKind.TextureView;
  //   if (obj instanceof GPUShaderModule) return ResourceKind.ShaderModule;
  //   if (obj instanceof GPURenderPipeline) return ResourceKind.RenderPipeline;
  //   if (obj instanceof GPUComputePipeline) return ResourceKind.ComputePipeline;
  //   if (obj instanceof GPUBindGroup) return ResourceKind.BindGroup;
  //   if (obj instanceof GPUBindGroupLayout) return ResourceKind.BindGroupLayout;
  //   if (obj instanceof GPUCommandEncoder) return ResourceKind.CommandEncoder;
  //   if (obj instanceof GPUCommandBuffer) return ResourceKind.CommandBuffer;
  //   if ((obj as any).beginRenderPass) return ResourceKind.RenderPass;
  //   if ((obj as any).dispatchWorkgroups) return ResourceKind.ComputePass;
  //   if ((obj as any).finish) return ResourceKind.RenderBundleEncoder;
  //   if ((obj as any).components) return ResourceKind.RenderBundle;
  //   if (obj instanceof GPUSampler) return ResourceKind.Sampler;
  //   if ((obj as any).bindGroupLayouts) return ResourceKind.PipelineLayout;
    
  //   const typeName = obj?.constructor?.name || 'unknown';
  //   console.warn(`[utils] Unknown WebGPU object type: ${typeName}`);
  //   return 'others' as ResourceKind;
  // }

  /**
   * 计算资源大小（字节）
   */
  // static calculateResourceSize(resource: ResourceInfo): number {
  //   switch (resource.kind) {
  //     case ResourceKind.Buffer:
  //       return (resource.descriptor as BufferDescriptor).size;
      
  //     case ResourceKind.Texture:
  //       const desc = resource.descriptor as TextureDescriptor;
  //       const formatInfo = WebGPUUtils.getTextureFormatInfo(desc.format);
  //       return desc.size.width * desc.size.height * 
  //              (desc.size.depthOrArrayLayers || 1) *
  //              formatInfo.bytesPerPixel;
      
  //     default:
  //       return 0; // 其他资源类型通常不占用大量内存
  //   }
  // }

  /**
   * 获取纹理格式信息
   */
  static getTextureFormatInfo(format: GPUTextureFormat) {
    const formatMap: Record<GPUTextureFormat, { bytesPerPixel: number }> = {
      'rgba8unorm': { bytesPerPixel: 4 },
      'bgra8unorm': { bytesPerPixel: 4 },
      'rgba16float': { bytesPerPixel: 8 },
      'r32float': { bytesPerPixel: 4 },
      'depth24plus': { bytesPerPixel: 4 },
      'depth24plus-stencil8': { bytesPerPixel: 5 },
      'depth32float': { bytesPerPixel: 4 },
      'stencil8': { bytesPerPixel: 1 },
      'rg32float': { bytesPerPixel: 8 },
      'rgba32float': { bytesPerPixel: 16 },
      'r8unorm': { bytesPerPixel: 1 },
      'r16float': { bytesPerPixel: 2 },
      'rg8unorm': { bytesPerPixel: 2 },
      'rg16float': { bytesPerPixel: 4 },
      'rgba8snorm': { bytesPerPixel: 4 },
      'rgba8uint': { bytesPerPixel: 4 },
      'rgba8sint': { bytesPerPixel: 4 },
      'rgba16uint': { bytesPerPixel: 8 },
      'rgba16sint': { bytesPerPixel: 8 },
      'rgba32uint': { bytesPerPixel: 16 },
      'rgba32sint': { bytesPerPixel: 16 },
      'rgb10a2unorm': { bytesPerPixel: 4 },
      'rg11b10ufloat': { bytesPerPixel: 4 },
      'rg32uint': { bytesPerPixel: 8 },
      'rg32sint': { bytesPerPixel: 8 },
      'r16uint': { bytesPerPixel: 2 },
      'r16sint': { bytesPerPixel: 2 },
      'r32uint': { bytesPerPixel: 4 },
      'r32sint': { bytesPerPixel: 4 },
      'depth16unorm': { bytesPerPixel: 2 },
      r8snorm: {
        bytesPerPixel: 0
      },
      r8uint: {
        bytesPerPixel: 0
      },
      r8sint: {
        bytesPerPixel: 0
      },
      rg8snorm: {
        bytesPerPixel: 0
      },
      rg8uint: {
        bytesPerPixel: 0
      },
      rg8sint: {
        bytesPerPixel: 0
      },
      rg16uint: {
        bytesPerPixel: 0
      },
      rg16sint: {
        bytesPerPixel: 0
      },
      "rgba8unorm-srgb": {
        bytesPerPixel: 0
      },
      "bgra8unorm-srgb": {
        bytesPerPixel: 0
      },
      rgb9e5ufloat: {
        bytesPerPixel: 0
      },
      rgb10a2uint: {
        bytesPerPixel: 0
      },
      "depth32float-stencil8": {
        bytesPerPixel: 0
      },
      "bc1-rgba-unorm": {
        bytesPerPixel: 0
      },
      "bc1-rgba-unorm-srgb": {
        bytesPerPixel: 0
      },
      "bc2-rgba-unorm": {
        bytesPerPixel: 0
      },
      "bc2-rgba-unorm-srgb": {
        bytesPerPixel: 0
      },
      "bc3-rgba-unorm": {
        bytesPerPixel: 0
      },
      "bc3-rgba-unorm-srgb": {
        bytesPerPixel: 0
      },
      "bc4-r-unorm": {
        bytesPerPixel: 0
      },
      "bc4-r-snorm": {
        bytesPerPixel: 0
      },
      "bc5-rg-unorm": {
        bytesPerPixel: 0
      },
      "bc5-rg-snorm": {
        bytesPerPixel: 0
      },
      "bc6h-rgb-ufloat": {
        bytesPerPixel: 0
      },
      "bc6h-rgb-float": {
        bytesPerPixel: 0
      },
      "bc7-rgba-unorm": {
        bytesPerPixel: 0
      },
      "bc7-rgba-unorm-srgb": {
        bytesPerPixel: 0
      },
      "etc2-rgb8unorm": {
        bytesPerPixel: 0
      },
      "etc2-rgb8unorm-srgb": {
        bytesPerPixel: 0
      },
      "etc2-rgb8a1unorm": {
        bytesPerPixel: 0
      },
      "etc2-rgb8a1unorm-srgb": {
        bytesPerPixel: 0
      },
      "etc2-rgba8unorm": {
        bytesPerPixel: 0
      },
      "etc2-rgba8unorm-srgb": {
        bytesPerPixel: 0
      },
      "eac-r11unorm": {
        bytesPerPixel: 0
      },
      "eac-r11snorm": {
        bytesPerPixel: 0
      },
      "eac-rg11unorm": {
        bytesPerPixel: 0
      },
      "eac-rg11snorm": {
        bytesPerPixel: 0
      },
      "astc-4x4-unorm": {
        bytesPerPixel: 0
      },
      "astc-4x4-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-5x4-unorm": {
        bytesPerPixel: 0
      },
      "astc-5x4-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-5x5-unorm": {
        bytesPerPixel: 0
      },
      "astc-5x5-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-6x5-unorm": {
        bytesPerPixel: 0
      },
      "astc-6x5-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-6x6-unorm": {
        bytesPerPixel: 0
      },
      "astc-6x6-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-8x5-unorm": {
        bytesPerPixel: 0
      },
      "astc-8x5-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-8x6-unorm": {
        bytesPerPixel: 0
      },
      "astc-8x6-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-8x8-unorm": {
        bytesPerPixel: 0
      },
      "astc-8x8-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-10x5-unorm": {
        bytesPerPixel: 0
      },
      "astc-10x5-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-10x6-unorm": {
        bytesPerPixel: 0
      },
      "astc-10x6-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-10x8-unorm": {
        bytesPerPixel: 0
      },
      "astc-10x8-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-10x10-unorm": {
        bytesPerPixel: 0
      },
      "astc-10x10-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-12x10-unorm": {
        bytesPerPixel: 0
      },
      "astc-12x10-unorm-srgb": {
        bytesPerPixel: 0
      },
      "astc-12x12-unorm": {
        bytesPerPixel: 0
      },
      "astc-12x12-unorm-srgb": {
        bytesPerPixel: 0
      }
    };
    
    return formatMap[format] || { bytesPerPixel: 4 };
  }
}

// 为旧版兼容保留的类型别名
export type WebGPUAllType = WebGPUCoreType;
export type ResourceType = ResourceKind;
export type ResInfo = ResourceInfo;
// export type FrameDataType = FrameData;
export type cmdInfo = CommandExecution;


// ---------- OLD --------------
/*
 * @description: 命令信息
 * @param {number} eid 命令id
 * @param {string} type 命令类型
 * @param {any} args 命令参数
 * @param {number} time 命令时间
 */
// export interface cmdInfo {
//   id: any;
//   eid: number;
//   type: string;
//   args: any[];
//   time: number;
// }

// /**
//  * @description: 资源信息
//  * @param {number} id 资源id
//  * @param {string} type 资源类型
//  * @param {any} desc 资源描述
//  */
// export interface ResInfo {
//   id: number;
//   type: string;
//   desc: any;
//   data?: any;
// };



export { QueueCommandType, EncoderCommandType, FrameDataType };

export { EncoderCmd, EncoderBaseCmd, RenderPassRecord, ComputePassRecord };
