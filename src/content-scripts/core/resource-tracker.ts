import { ResInfo, Utils } from "../../global/utils";
import { Msg } from "../../global/message";

/**
 * 资源跟踪器
 * @brief 用于跟踪和标识资源，并管理资源生命周期。
 */
export class ResourceTracker {
  // 消息实例
  msg = Msg.getInstance();

  /**
   * @brief 单例模式，用于创建资源跟踪器。
   */
  private static instance: ResourceTracker;
  private constructor() { }
  public static getInstance() {
    if (!ResourceTracker.instance) {
      ResourceTracker.instance = new ResourceTracker();
    }
    return ResourceTracker.instance;
  }


  // 资源 MAP
  resourceMap = new Map<any, ResInfo>();
  resourceIDMap = new Map<number, any>();

  /**
   * @brief 生成唯一 ID，跟踪资源。
   * @returns 
   */
  track(resource: any, desc: any, type = 'res') {
    let id: number = 0;
    switch (type) {
      case 'pipeline':
        id = Utils.genUniqueNumber();
        if (desc.layout != 'auto') {
          this.replaceResourcesInDesc(desc);
        }
        desc.vertex.module = this.getResInfo(desc.vertex.module)?.id;
        desc.fragment.module = this.getResInfo(desc.fragment.module)?.id;
        break;
      case 'bufferData':
        if (this.resourceMap.has(desc.buffer)) {
          id = this.getResID(desc.buffer) as number;
          const bufferResInfo = this.getResInfo(desc.buffer);
          if (bufferResInfo) {
            bufferResInfo.data = desc.data;
          }
          // 修改后直接返回
          return id;
        } else {
          this.msg.error(`[bufferData] bufferDataMap not found`);
        }
        break;
      default:
        id = Utils.genUniqueNumber();
        this.replaceResourcesInDesc(desc);
        break;
    }
    if(this.resourceMap.has(resource)) {
      console.warn(`[res]track : resource already exists`, resource);
    }
    // 跟踪资源
    if (id !== 0) {
      this.resourceIDMap.set(id, resource);
      this.resourceMap.set(resource, { id, type, desc });
    } else {
      this.msg.error(`[res]track : resource no id`);
    }
    return id;
  }

  /**
   * @brief 替换描述中的资源引用为 ID
   * @param obj 需要遍历的对象
   * @todo 优化，WeakSet 记录被替换的资源，避免重复替换
   */
  replaceResourcesInDesc(obj: any): void {
    const traverse = (currentItem: any, parent: any, key: number | string | null) => {
      // 首先检查当前项是否是资源实例
      if (this.resourceMap.has(currentItem)) {
        if (parent && key !== null) {
          parent[key] = this.getResID(currentItem); // 直接替换为ID
        }
        return;
      }
      // 非对象或null则跳过
      if (typeof currentItem !== 'object' || currentItem === null) return;
      // 处理数组
      if (Array.isArray(currentItem)) {
        currentItem.forEach((child, idx) => traverse(child, currentItem, idx));
      } else {
        Object.entries(currentItem).forEach(([k, v]) => {
          traverse(v, currentItem, k);
        });
      }
    };
    traverse(obj, null, null);
  }

  // 在 ResourceTracker 类中添加以下方法
  replaceResourcesInArray(arr: any[]): void {
    const traverse = (currentItem: any, parent: any, key: number | string | null) => {
      // 首先检查当前项是否是资源实例
      if (this.resourceMap.has(currentItem)) {
        if (parent && key !== null) {
          parent[key] = this.getResID(currentItem); // 直接替换为ID
        }
        return;
      }
      // 非对象或null则跳过
      if (typeof currentItem !== 'object' || currentItem === null) return;
      // 处理数组
      if (Array.isArray(currentItem)) {
        currentItem.forEach((child, idx) => traverse(child, currentItem, idx));
      } else {
        Object.entries(currentItem).forEach(([k, v]) => {
          traverse(v, currentItem, k);
        });
      }
    };
    arr.forEach((item, index) => {
      traverse(item, arr, index);
    });
  }

  /**
   * @brief 获取资源信息
   * @param resource  
   * @returns ResourceInfo
   */
  getResInfo(resource: any) {
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
  getResID(resource: any) {
    if (this.resourceMap.has(resource)) {
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
  getResFromID(id: number) {
    if (this.resourceIDMap.has(id)) {
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
    const id = this.getResID(resource);
    if (id) {
      this.resourceIDMap.delete(id);
      this.resourceMap.delete(resource);
    } else {
      this.msg.error('[res]untrack : resource not found', resource);
    }
  }

  destory() {
    this.resourceMap.clear();
  }

}