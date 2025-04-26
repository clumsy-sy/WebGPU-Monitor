import { ResourceType } from "../../global/utils"


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

  // 存储资源的映射表
  private resourceMap = new Map<number, ResourceType>();

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

};

