import { ResInfo, Utils } from "../../global/utils";
import { Msg } from "../../global/message";

/**
 * 资源跟踪器
 * @brief 用于跟踪和标识资源，并管理资源生命周期。
 */
export class ResourceTracker {

  /**
   * @brief 单例模式，用于创建资源跟踪器。
   */
  private static instance: ResourceTracker;
  private constructor() {}
  public static getInstance() {
    if (!ResourceTracker.instance) {
      ResourceTracker.instance = new ResourceTracker();
    }
    return ResourceTracker.instance;
  }


  // 资源 MAP
  resourceMap = new Map<any, ResInfo>();
  resourceIDMap = new Map<number, any>();
  msg = Msg.getInstance();

  /**
   * @brief 生成唯一 ID，跟踪资源。
   * @returns 
   */
  track(resource: any, desc: any, type = 'res') {
    const id = Utils.genUniqueNumber();
    switch (type) {
      case 'pipeline':
        if(desc.layout != 'auto') {
          this.replaceResourcesInDesc(desc);
        }
        desc.vertex.module = this.getResInfo(desc.vertex.module)?.id;
        desc.fragment.module = this.getResInfo(desc.fragment.module)?.id;
        break;
      case 'bufferDataMap':
        const bufferMap = this.getResInfo(resource)?.desc;
        if(bufferMap) {
          const type = desc.type;
          desc = {
            bufferid: bufferMap.bufferid,
            type: type,
          }
          this.untrack(resource);
        } else {
          let bufferid = this.getResInfo(desc.buffer)?.id;
          if(bufferid) {
            desc = { bufferid: bufferid}
          } else {
            throw new Error(`bufferMap not found`);
          }
        }
        break;
      case 'bufferData':
        const buffermap = this.getResInfo(desc.arrayBuffer)?.desc;
        console.log('[buffermap]', buffermap);
        if(buffermap) {
          const data = desc.data;
          const type = buffermap.type;
          desc = {
            id: buffermap.bufferid, 
            type: type,
            data: [...new (globalThis as any)[type](data)]
          };
          this.untrack(desc.arrayBuffer);
        }
        break;
      default:
        this.replaceResourcesInDesc(desc);
        break;
    }
    // 跟踪资源
    this.resourceIDMap.set(id, resource);
    this.resourceMap.set(resource, { id, type, desc });
    return id;
  }

  /**
   * @brief 替换描述中的资源引用为 ID
   * @param obj 需要遍历的对象
   * @todo 优化，WeakSet 记录被替换的资源，避免重复替换
   */
  private replaceResourcesInDesc(obj: any): void {
    const traverse = (currentObj: any) => {
      if (typeof currentObj !== 'object' || currentObj === null) return;
      if (Array.isArray(currentObj)) {
        currentObj.forEach(item => traverse(item));
      } else {
        Object.entries(currentObj).forEach(([key, value]) => {
          if (this.resourceMap.has(value)) {
            currentObj[key] = this.getResID(value);
          } else if (typeof value === 'object') {
            traverse(value);
          }
        });
      }
    };
    traverse(obj);
  }

  /**
   * @brief 获取资源信息
   * @param resource  
   * @returns ResourceInfo
   */
  getResInfo(resource : any) {
    if(this.resourceMap.has(resource)){
      return this.resourceMap.get(resource);
    } else {
      this.msg.error('[res]getResInfo : resource not found', resource);
    }
  }

  /**
   * @brief 获取资源 ID
   * @param resource 
   * @returns resourceID or undefined
   */
  getResID(resource : any) {
    if(this.resourceMap.has(resource)){
      return this.resourceMap.get(resource)?.id;
    } else {
      this.msg.error('[res]getResID : resource not found', resource);
    }
  }
  
  /**
   * @brief 根据 ID 获取资源
   * @param id 
   * @returns resource or undefined
   */
  getResFromID(id : number) {
    if(this.resourceIDMap.has(id)){
      return this.resourceIDMap.get(id);
    } else {
      this.msg.error('[res]getResFromID : resource not found', id);
    }
  }

  getAllResources() {
    return Array.from(this.resourceMap.entries());
  }
  getAllResourcesValues() {
    return Array.from(this.resourceMap.values());
  }
  untrack(resource: any) {
    this.resourceMap.delete(resource);
  }

  destory() {
    this.resourceMap.clear();
  }

}