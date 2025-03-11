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
          const layoutID = this.getResInfo(desc.layout)?.id;
          desc.layout = layoutID;
        }
        desc.vertex.module = this.getResInfo(desc.vertex.module)?.id;
        desc.fragment.module = this.getResInfo(desc.fragment.module)?.id;
        break;
      case 'computePipeline':
        desc.compute.module = this.getResInfo(desc.compute.module)?.id;
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
      case 'bindGroup':
        const bindID = this.getResInfo(desc.layout)?.id;
        if ( bindID ) {
          desc.layout = bindID;
        }
        // if(desc.entries){
        //   desc.entries.forEach(entry: any => {
        //     if (entry.resource.buffer){
        //       const bufferid = this.getResInfo(entry.resource.buffer)?.id;
        //       if(bufferid) {
        //         entry.resource = bufferid;
        //       }
        //     } else if(entry.resource) {
        //       const resourceid = this.getResInfo(entry.resource)?.id;
        //       if(resourceid) {
        //         entry.resource = resourceid;
        //       }
        //     }
        //   });
        // }
        break;
      case 'pipelineLayout':
        if(desc.bindGroupLayouts) {
          let layoutArray:number[] = [];
          desc.bindGroupLayouts.forEach((layout: any) => {
            const bindID = this.getResInfo(layout)?.id;
            if ( bindID ) {
              layoutArray.push(bindID);
            } else {
              throw new Error(`bindGroupLayouts not found`);
            }
          });
          desc.bindGroupLayouts = layoutArray;
          console.log('[res]pipelineLayoutdesc', desc);
        }
        break;
    }

    this.resourceMap.set(resource, { id, type, desc });
    return id;
  }

  getResInfo(resource : any) {
    if(this.resourceMap.has(resource)){
      return this.resourceMap.get(resource);
    } else {
      this.msg.error('[res]getResInfo : resource not found', resource);
    }
  }

  
  getResID(resource : any) {
    if(this.resourceMap.has(resource)){
      return this.resourceMap.get(resource)?.id;
    } else {
      this.msg.error('[res]getResID : resource not found', resource);
    }
  }
  
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