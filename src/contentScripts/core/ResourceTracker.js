import { Utils } from "../utils/Global";

class BufferData {
  byteLength = 0;
  arrayBuffer
}

/**
 * 资源跟踪器
 * @brief 用于跟踪和标识资源，并管理资源生命周期。
 */
export class ResourceTracker {

  resourceMap = new Map();
  bufferDataMap = new Map();
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
        descriptor.vertex.module = this.getResourceInfo(descriptor.vertex.module)?.id;
        descriptor.fragment.module = this.getResourceInfo(descriptor.fragment.module)?.id;
        break;
      case 'computePipeline':
        descriptor.compute.module = this.getResourceInfo(descriptor.compute.module)?.id;
        break;
      case 'bufferDataMap':
        this.bufferDataMap.set(descriptor.arrayBuffer, this.getResourceInfo(descriptor.buffer)?.id);
        return id;
      case 'bufferData':
        const bufferid = this.bufferDataMap.get(descriptor.arrayBuffer);
        if(bufferid) {
          this.bufferDataMap.delete(descriptor.arrayBuffer);
          const data = descriptor.data;
          descriptor = {
            id: bufferid, 
            data: [...new Float32Array(data)]
          };
        }
        break;
      case 'bindGroup':
        const bindID = this.getResourceInfo(descriptor.layout)?.id;
        if ( bindID ) {
          descriptor.layout = bindID;
        }
        if(descriptor.entries){
          descriptor.entries.forEach(entry => {
            if (entry?.resource?.buffer) {
              const bufferid = this.getResourceInfo(entry?.resource?.buffer)?.id;
              if(bufferid) {
                entry.resource.buffer = bufferid;
              }
            }
          });
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
    this.bufferDataMap.clear();
    this.resourceMap = null;
  }

}