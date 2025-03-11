import { Msg } from "../../../global/message";
import { ResourceTracker } from "../resource-tracker"; // 需确保该模块已导入

export class GPUDeviceHook {
  private static hookedMethods: Map<string, Function> = new Map();
  private static tracker = ResourceTracker.getInstance();
  private static msg = Msg.getInstance();

  // 钩子入口方法
  static hookDevice<T extends GPUDevice>(device: T): T {
    const proto = Object.getPrototypeOf(device);
    
    // 需要拦截的WebGPU Device API列表
    const methodsToHook: string[] = [
      'createBuffer',
      'createTexture',
      'createSampler',
      'createBindGroup',
      'createPipelineLayout',
      'createRenderPipeline',
      // 添加其他需要拦截的方法...
    ];

    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });

    return device;
  }

  // 方法劫持核心逻辑
  private static hookMethod(
    proto: any,
    methodName: string
  ) {
    const originalMethod = proto[methodName];
    
    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUDevice`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      GPUDeviceHook.msg.log(`[GPUDevice] ${methodName}`);
      const start = performance.now();
      let result: any;
      try {
        result = originalMethod.apply(this, args);
        GPUDeviceHook.tracker.track(result, args, methodName);
        return result;
      } catch (error) {
        // this.trackError(methodName, error);
        throw error;
      } finally {
        // const duration = performance.now() - start;
        // GPUDeviceHook.tracker.logPerformance(methodName, duration);
      }
    };

    // 保存原始方法引用
    this.hookedMethods.set(methodName, originalMethod);
  }

  // 错误追踪逻辑
  private static trackError(method: string, error: Error) {
    // GPUDeviceHook.msg.error("[GPUDevice]", method{
    //   method,
    //   message: error.message,
    //   stack: error.stack,
    //   timestamp: performance.now()
    // });
  }

  // 绑定资源销毁监听
  // private static bindDestroyHook(
  //   resource: GPUObjectBase,
  //   methodName: string
  // ) {
  //   const originalDestroy = resource.destroy.bind(resource);
    
  //   resource.destroy = function wrappedDestroy() {
  //     GPUDeviceHook.tracker.logRelease({
  //       type: methodName,
  //       id: resource.toString(),
  //       timestamp: performance.now()
  //     });
  //     return originalDestroy();
  //   };
  // }
}