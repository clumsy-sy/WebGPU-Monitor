import { ResInfo, ResourceType } from "../../global/utils"
import { TextureViewInfo } from "./webgpu-texture-viewer";


export class WebGPUResourcePool {

  /**
   * @brief 单例模式，用于创建资源池。
   */
  private static instance: WebGPUResourcePool;
  private constructor() { }
  public static getInstance() {
    if (!WebGPUResourcePool.instance) {
      WebGPUResourcePool.instance = new WebGPUResourcePool();
    }
    return WebGPUResourcePool.instance;
  }

  // WebGPU device
  private device: GPUDevice | null = null;
  // 存储资源的映射表
  private resourceMap = new Map<number, any>();
  // 资源单
  private AllResources = new Map<number, ResInfo>();

  // commandBuffer
  private cmdBuffer: Array<GPUCommandBuffer> = [];

  // textureView
  private textureViews: Array<TextureViewInfo> = [];

  setDevice(device: GPUDevice) {
      this.device = device;
  }

  checkDevice() {
    if (!this.device) {
      throw new Error('[res]device is null');
    }
  }

  set(id: number, resource: ResourceType) {
    this.resourceMap.set(id, resource);
  }

  get(id: number) {
    if(this.resourceMap.has(id)){
      return this.resourceMap.get(id);
    } else {
      console.error('[res]get : resource not found', id);
    }
  }

  getAll() {
    return Array.from(this.resourceMap.values());
  }

  storeResource(id: number, info: ResInfo) {
    this.AllResources.set(id, info);
  }

  // 创建资源
  createResource(id: number, type: string, info: ResInfo) : any{
    this.checkDevice();
    try {
      const args = info.desc;
      const datas = info.data;

      let resource: any;
      switch (type) {
        case 'getCurrentTexture':
          console.warn('[res]getCurrentTexture : not support compatibility');
          const parent = args.parent;
          const descriptor = args.descriptor;

          resource = this.device?.createTexture(descriptor as GPUTextureDescriptor);

          break;
        case 'createBuffer':
          const bufferDescriptor: GPUBufferDescriptor = {
            size: args.size,
            usage: args.usage,
            mappedAtCreation: args.mappedAtCreation
          };
          const buffer = this.device!.createBuffer(bufferDescriptor);
          if (bufferDescriptor.mappedAtCreation) {
            let data = new Uint8Array(buffer.getMappedRange());
            data.set(datas); // 使用 set 方法赋值更安全
            buffer.unmap();
          }
          resource = buffer;
          break;
        case 'writeBufferData':
          resource = new Uint8Array(args.data);
          break;
        case 'createTexture':
          const TextureDescriptor: GPUTextureDescriptor = this.resolveRes(args) as GPUTextureDescriptor;
          // todo!  兼容
          TextureDescriptor.usage = TextureDescriptor.usage | GPUTextureUsage.COPY_SRC;
          resource = this.device!.createTexture(TextureDescriptor);
          break;
        case 'createView':
          const texture:GPUTexture = this.checkAndCreateResource(args.parent);
          const ViewDescriptor = args.descriptor;
          this.textureViews.push({
            view: resource,
            texture: texture,
            format: texture.format,
            width: texture.width || 0,
            height: texture.height || 0,
            label: texture.label
          });
          resource = texture.createView(ViewDescriptor as GPUTextureViewDescriptor);
          break;
        case 'getBindGroupLayout':
          const pipeline:  GPURenderPipeline | GPUComputePipeline = this.checkAndCreateResource(args.parent);
          resource = pipeline.getBindGroupLayout(args.descriptor);
          break;
        case 'createSampler':
          resource = this.device!.createSampler(this.resolveRes(args) as GPUSamplerDescriptor);
          break;
        case 'createBindGroup':
          resource = this.device!.createBindGroup(this.resolveRes(args) as GPUBindGroupDescriptor);
          break;
        case 'createBindGroupLayout':
          resource = this.device!.createBindGroupLayout(this.resolveRes(args) as GPUBindGroupLayoutDescriptor);
          break;
        case 'createPipelineLayout':
          resource = this.device!.createPipelineLayout(this.resolveRes(args) as GPUPipelineLayoutDescriptor);
          break;
        case 'createShaderModule':
          resource = this.device!.createShaderModule(args as GPUShaderModuleDescriptor);
          break;
        case 'createComputePipeline':
          resource = this.device!.createComputePipeline(this.resolveRes(args) as GPUComputePipelineDescriptor);
          break;
        case 'createRenderPipeline':
          resource = this.device!.createRenderPipeline(this.resolveRes(args) as GPURenderPipelineDescriptor);
          break;
        case 'createCommandEncoder':
          resource = this.device!.createCommandEncoder(this.resolveRes(args) as GPUCommandEncoderDescriptor);
          break;
        case 'createRenderBundleEncoder':
          resource = this.device!.createRenderBundleEncoder(this.resolveRes(args) as GPURenderBundleEncoderDescriptor);
          break;
        default:
          console.warn(`[res]createResource : unsupported resource type "${type}"`);
          resource = null;
          break;
      }

      if (resource) {
        this.resourceMap.set(id, resource);
      }

      return resource;
    } catch (error) {
      console.error('[res]createResource : ', error);
    }
  } 

  // 添加 cmd 资源
  addCmdBuffer(commandBuffer: GPUCommandBuffer) {
    this.cmdBuffer.push(commandBuffer);
  }

  getAllCmdBuffer() {
    return this.cmdBuffer;
  }


  private checkAndCreateResource(value: number) : any{
    if(this.resourceMap.has(value)) {
      return this.resourceMap.get(value);
    }
    // 如果是 number 类型且在 AllResources 中存在，则替换为真实资源
    if(this.AllResources.has(value)) {
      let resource: any;
      if(this.resourceMap.has(value)) {
        resource = this.resourceMap.get(value);
      } else {
        const resInfo = this.AllResources.get(value);
        if(resInfo) {
          resource = this.createResource(value, resInfo.type, resInfo);
        } else {
          throw new Error(`[res]resolveResourceFromID : no resource found for id ${value}`);
        }
      }
      return resource;
    } else {
      throw new Error(`[res]resolveResourceFromID : no resource found for id ${value}`);
    }
  }

  /**
   * @brief 将对象中表示资源 ID 的字段替换为实际的 WebGPU 资源。
   * @param obj 需要遍历并解析资源的对象
   * @returns 解析后的对象，包含真实的 WebGPU 资源引用
   */
  private resolveResourceFromID(obj: any): any {
    if (typeof obj === 'number' && obj >= 998244353) {
      return this.checkAndCreateResource(obj);
    }
    // 基本类型直接返回
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveResourceFromID(item));
    }

    const result: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'number' && value >= 998244353){
          result[key] = this.checkAndCreateResource(value);
        } else {
          // 否则继续递归处理
          result[key] = this.resolveResourceFromID(value);
        }
      }
    }

    return result;
  }

  resolveRes(obj: any) : any {
    return this.resolveResourceFromID(obj);
  }

  resolveResArr(arr: any[]): any[] {
    return this.resolveResourceFromID(arr);
  }

  getTextureViews() {
    return this.textureViews;
  }

};

