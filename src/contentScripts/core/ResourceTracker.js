import { Utils } from "../utils/Global";

/**
 * 资源跟踪器
 * @brief 用于跟踪和标识资源，并管理资源生命周期。
 */
export class ResourceTracker {

  resourceMap = new Map();
  resourceId = 0;

  /**
   * @brief 生成唯一 ID，跟踪资源。
   * @returns 
   */
  track(resource, descriptor, type = 'res') {
    // 使用传入的 prefix 生成资源唯一标识
    const id = Utils.generateUniqueNumber();
    // const id = `${type}_${crypto.randomUUID()}`;
    switch (type) {
      case 'pipeline':
        if(descriptor.layout != 'auto') {
          const layoutID = this.getResourceInfo(descriptor.layout)?.id;
          descriptor.layout = layoutID;
        }
        descriptor.vertex.module = this.getResourceInfo(descriptor.vertex.module)?.id;
        descriptor.fragment.module = this.getResourceInfo(descriptor.fragment.module)?.id;
        break;
      case 'computePipeline':
        descriptor.compute.module = this.getResourceInfo(descriptor.compute.module)?.id;
        break;
      case 'bufferDataMap':
        const bufferMap = this.getResourceInfo(resource)?.descriptor;
        if(bufferMap) {
          const type = descriptor.type;
          descriptor = {
            bufferid: bufferMap.bufferid,
            type: type,
          }
          this.untrack(resource);
        } else {
          let bufferid = this.getResourceInfo(descriptor.buffer)?.id;
          if(bufferid) {
            descriptor = { bufferid: bufferid}
          } else {
            throw new Error(`bufferMap not found`);
          }
        }
        break;
      case 'bufferData':
        const buffermap = this.getResourceInfo(descriptor.arrayBuffer).descriptor;
        console.log('[buffermap]', buffermap);
        if(buffermap) {
          const data = descriptor.data;
          const type = buffermap.type;
          descriptor = {
            id: buffermap.bufferid, 
            type: type,
            data: [...new globalThis[type](data)]
          };
          this.untrack(descriptor.arrayBuffer);
        }
        break;
      case 'bindGroup':
        const bindID = this.getResourceInfo(descriptor.layout)?.id;
        if ( bindID ) {
          descriptor.layout = bindID;
        }
        if(descriptor.entries){
          descriptor.entries.forEach(entry => {
            if (entry.resource.buffer){
              const bufferid = this.getResourceInfo(entry.resource.buffer)?.id;
              if(bufferid) {
                entry.resource = bufferid;
              }
            } else if(entry.resource) {
              const resourceid = this.getResourceInfo(entry.resource)?.id;
              if(resourceid) {
                entry.resource = resourceid;
              }
            }
          });
        }
        break;
      case 'pipelineLayout':
        if(descriptor.bindGroupLayouts) {
          let layoutArray = [];
          descriptor.bindGroupLayouts.forEach(layout => {
            const bindID = this.getResourceInfo(layout)?.id;
            if ( bindID ) {
              layoutArray.push(bindID);
            } else {
              throw new Error(`bindGroupLayouts not found`);
            }
          });
          descriptor.bindGroupLayouts = layoutArray;
          console.log('[res]pipelineLayoutdescriptor', descriptor);
        }
        break;
    }

    this.resourceMap.set(resource, { id, type, descriptor });
    return id;
  }

  getResourceInfo(resource) {
    return this.resourceMap.get(resource);
  }

  getAllResources() {
    return Array.from(this.resourceMap.entries());
  }
  getAllResourcesValues() {
    return Array.from(this.resourceMap.values());
  }
  untrack(resource) {
    this.resourceMap.delete(resource);
  }

  destory() {
    this.resourceMap.clear();
    this.resourceMap = null;
  }

}