/**
 * 资源跟踪器
 * @brief 用于跟踪和标识资源，并管理资源生命周期。
 */
export class ResourceTracker {

  resourceMap = new WeakMap();
  resourceId = 0;

  /**
   * @brief 生成唯一 ID，跟踪资源。
   * @returns 
   */
  track(resource, type, descriptor, prefix = 'res') {
    // 使用传入的 prefix 生成资源唯一标识
    const id = `${prefix}_${crypto.randomUUID()}`;
    this.resourceMap.set(resource, { id, type, descriptor });
    return id;
  }

  getResourceInfo(resource) {
    return this.resourceMap.get(resource);
  }

  getAllResources() {
    return Array.from(this.resourceMap.entries());
  }
  untrack(resource) {
    this.resourceMap.delete(resource);
  }
}