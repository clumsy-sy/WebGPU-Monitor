import { res, msg, cmd, APIrecorder, recoder, MsgLevel } from "./gpu-global"

type GPUXXX = any;
/**
 * @class GPUXXXHook 模板
 * @description 钩子模板，用于拦截和记录 WebGPU 的 XXX API 的调用和销毁。
 */
export class GPUXXXHook {

  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  // 钩子入口方法
  static hookGPUXXX<T extends GPUXXX>(xxx: T, methodsList: string[] = []): T {

    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(xxx, methodName);
    });

    return xxx;
  }

  // 钩子入口原型方法
  static hookGPUXXXPrototype(methodsList: string[] = []) {
    // const proto = GPUXXX.prototype;

    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    // methodsToHook.forEach(methodName => {
    //   this.hookMethod(proto, methodName);
    // });
  }

  // 方法劫持核心逻辑
  private static hookMethod(instance: any, methodName: string) {
    // 获取原始方法
    const originalMethod = instance[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUxxx`);
    }

    // 创建包装器并替换方法
    instance[methodName] = function wrappedMethod(...args: any[]) {
      msg.log(MsgLevel.level_3, `[GPUxxx] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录资源
        res.track(result, args, methodName);
        // 记录 API 调用
        APIrecorder.recordMethodCall(methodName, args);
        // 返回结果
        return result;
      } catch (error) {
        msg.error(`[GPUxxx] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };
    if (!this.hookedMethods.has(instance)) {
      this.hookedMethods.set(instance, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(instance)?.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  static unhookGPUXXX<T extends GPUXXX>(xxx: T): T {
    // const protoMethods = this.hookedMethods.get(xxx);
    // if (protoMethods) {
    //   protoMethods.forEach((original, methodName) => {
    //     xxx[methodName] = original;
    //   });
    //   this.hookedMethods.delete(xxx);
    // }
    return xxx;
  }

  // todo: maybe bindDestroyHook

}