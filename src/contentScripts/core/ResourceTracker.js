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
  track(resource, descriptor, type = 'res', subtype = 'default') {
    // 使用传入的 prefix 生成资源唯一标识
    const id = `${type}_${crypto.randomUUID()}`;
    const timestamp = performance.now();
    switch (type) {
      case 'pipeline':
        descriptor.vertex.module = this.getResourceInfo(descriptor.vertex.module)?.id;
        descriptor.fragment.module = this.getResourceInfo(descriptor.fragment.module)?.id;
        break;
    }

    this.resourceMap.set(resource, { id:id, time:timestamp, descriptor });
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