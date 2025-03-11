import { Msg } from "../../../global/message";
import { ResourceTracker } from "../resource-tracker";

type GPUXXX = any;
/**
 * @class GPUXXXHook 模板
 * @description 钩子模板，用于拦截和记录 WebGPU 的 XXX API 的调用和销毁。
 */
export class GPUXXXHook {
  private static hookedMethods: WeakMap<any, Map<string, Function>> = new WeakMap();
  private static tracker = ResourceTracker.getInstance();
  private static msg = Msg.getInstance();

  // 钩子入口方法
  static hookGPUXXX<T extends GPUXXX>(xxx: T, methodsList: string[] = []): T {
    const proto = Object.getPrototypeOf(xxx);
    
    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });

    return xxx;
  }

  // 方法劫持核心逻辑
  private static hookMethod( proto: any, methodName: string) {
    // 获取原始方法
    const originalMethod = proto[methodName];
    
    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUxxx`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      GPUXXXHook.msg.log(`[GPUxxx] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录资源
        GPUXXXHook.tracker.track(result, args, methodName);
        // 返回结果
        return result;
      } catch (error) {
        GPUXXXHook.msg.error(`[GPUxxx] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };

    // 保存原始方法引用
    this.hookedMethods.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  static unhookGPUXXX<T extends GPUXXX>(xxx: T): T {
    const proto = Object.getPrototypeOf(xxx);

    // 遍历所有被劫持的方法并恢复
    const protoMethods = this.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
      });
      this.hookedMethods.delete(proto);
    }

    return xxx;
  }

  // todo: maybe bindDestroyHook

}