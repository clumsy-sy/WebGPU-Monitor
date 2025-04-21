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
    let descCopy: any = {};
    switch (type) {
      case 'pipeline':
        id = Utils.genUniqueNumber();
        if (desc.layout != 'auto') {
          descCopy = this.replaceResourcesInDesc(desc);
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
      case 'createView':
        id = Utils.genUniqueNumber();
        descCopy = {
          parent: this.getResID(desc.parent),
          desc: desc.desc
        }
        break;
      default:
        id = Utils.genUniqueNumber();
        descCopy = this.replaceResourcesInDesc(desc);
        break;
    }
    if(this.resourceMap.has(resource)) {
      console.warn(`[res]track : resource already exists`, resource);
    }
    // 跟踪资源
    if (id !== 0) {
      this.resourceIDMap.set(id, resource);
      this.resourceMap.set(resource, { id, type, desc:descCopy });
    } else {
      this.msg.error(`[res]track : resource no id`);
    }
    return id;
  }

  private deepCloneWithReplacement(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCloneWithReplacement(item));
    } else if (typeof obj === "object" && obj !== null) {
      const clone: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.resourceMap.has(value)) {
          clone[key] = this.getResID(value);
        } else {
          clone[key] = this.deepCloneWithReplacement(value);
        }
      }
      return clone;
    }
    return obj;
  }

  private deepCopy<T>(source: T): T {
    // 基本类型直接返回
    if (typeof source !== 'object' || source === null) {
      return source;
    }

    if(this.resourceMap.has(source)) {
      return this.getResID(source) as any ;
    }
  
    // 处理数组
    if (Array.isArray(source)) {
      return source.map((item, index) => 
        this.deepCopy(item)
      ) as any;
    }
    // 处理对象
    const copy: any = {};
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        copy[key] = this.deepCopy((source as any)[key]);
      }
    }
    return copy;
  }

  private replaceResources(obj: any, clone: boolean = true): any {
    let cloneObj: any;
  
    if (clone) {
      // 使用深度克隆并替换资源
      // cloneObj = this.deepCloneWithReplacement(obj);
      cloneObj = this.deepCopy(obj);
      obj = cloneObj;
    }
  
    // 递归遍历替换资源引用
    // const traverse = (currentItem: any, parent: any, key: string | number | null) => {
    //   if (this.resourceMap.has(currentItem)) {
    //     if (parent && key !== null) {
    //       parent[key] = this.getResID(currentItem);
    //     }
    //     return;
    //   }
  
    //   if (typeof currentItem === "object" && currentItem !== null) {
    //     if (Array.isArray(currentItem)) {
    //       currentItem.forEach((child, idx) => traverse(child, currentItem, idx));
    //     } else {
    //       Object.entries(currentItem).forEach(([k, v]) => traverse(v, currentItem, k));
    //     }
    //   }
    // };
    // traverse(obj, null, null);
    return clone ? cloneObj : obj;
  }

  /**
   * @brief 替换描述中的资源引用为 ID
   * @param obj 需要遍历的对象
   * @todo 优化，WeakSet 记录被替换的资源，避免重复替换
   */
  // replaceResourcesInDesc(obj: any): void {
  //   const traverse = (currentItem: any, parent: any, key: number | string | null) => {
  //     // 首先检查当前项是否是资源实例
  //     if (this.resourceMap.has(currentItem)) {
  //       if (parent && key !== null) {
  //         parent[key] = this.getResID(currentItem); // 直接替换为ID
  //       }
  //       return;
  //     }
  //     // 非对象或null则跳过
  //     if (typeof currentItem !== 'object' || currentItem === null) return;
  //     // 处理数组
  //     if (Array.isArray(currentItem)) {
  //       currentItem.forEach((child, idx) => traverse(child, currentItem, idx));
  //     } else {
  //       Object.entries(currentItem).forEach(([k, v]) => {
  //         traverse(v, currentItem, k);
  //       });
  //     }
  //   };
  //   traverse(obj, null, null);
  // }



  // 在 ResourceTracker 类中添加以下方法
  
  replaceResourcesInDesc(obj: any): any {
    // this.msg.trace();
    // console.log(`[res] compare obj, \n ${obj}, \n ${this.replaceResources(obj, true)}`);
    return this.replaceResources(obj, true); // 克隆并返回新对象
  }

  replaceResourcesInArray(arr: any[]): any[] {
    // this.msg.trace();
    // console.log(`[resarr] compare obj, \n ${arr}, \n ${this.replaceResources(arr, true)}`);
    return this.replaceResources(arr, true); // 直接修改原数组
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

  checkResource(resource: any) {
    if (this.resourceMap.has(resource)) {
      return true;
    } else {
      this.msg.error('[res]checkResource : resource not found', resource);
      return false;
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