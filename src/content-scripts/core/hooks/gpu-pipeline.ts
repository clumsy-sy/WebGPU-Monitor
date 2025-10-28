import { res, msg, cmd, APIrecorder, recoder, MsgLevel } from "./gpu-global"

/**
 * @class GPUComputePipelineHook 模板
 * @description 钩子模板，用于拦截和记录 WebGPU 的 XXX API 的调用和销毁。
 */
export class GPUComputePipelineHook {

  private hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private id = "";
  constructor(pipeline: GPUComputePipeline){
    this.id = res.getResID(pipeline) as string;
  }
  // 钩子入口方法
  hookGPUComputePipeline<T extends GPUComputePipeline>(pipe: T, methodsList: string[] = []): T {

    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      'getBindGroupLayout',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(pipe, methodName);
    });

    return pipe;
  }

  // 方法劫持核心逻辑
  private hookMethod(instance: any, methodName: string) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = instance[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUComputePipeline`);
    }

    // 创建包装器并替换方法
    instance[methodName] = function wrappedMethod(descriptor: any) {
      msg.log(MsgLevel.level_3, `[GPUComputePipeline] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, [descriptor]);
        // 记录资源
        res.track(result, { parent: self_this.id, descriptor }, methodName);
        // 记录 API 调用
        APIrecorder.recordMethodCall(methodName, [descriptor]);
        // 返回结果
        return result;
      } catch (error) {
        msg.error(`[GPUComputePipeline] ${methodName} error: `, error);
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
  unhookGPUComputePipeline<T extends GPUComputePipeline>(pipe: T): T {
    if (typeof pipe !== "object" || pipe === null) {
      throw new TypeError("pipe must be a non-null object.");
    }

    const protoMethods = this.hookedMethods.get(pipe);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        (pipe as { [key: string]: any })[methodName] = original;
      });
      this.hookedMethods.delete(pipe);
    }
    return pipe;
  }
}

/**
 * @class GPURenderPipelineHook 模板
 * @description 钩子模板，用于拦截和记录 WebGPU 的 XXX API 的调用和销毁。
 */
export class GPURenderPipelineHook {

  private hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private id = "";
  constructor(pipeline: GPURenderPipeline){
    this.id = res.getResID(pipeline) as string;
  }
  // 钩子入口方法
  hookGPURenderPipeline<T extends GPURenderPipeline>(pipe: T, methodsList: string[] = []): T {

    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      'getBindGroupLayout',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(pipe, methodName);
    });

    return pipe;
  }

  // 方法劫持核心逻辑
  private hookMethod(instance: any, methodName: string) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = instance[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPURenderPipeline`);
    }

    // 创建包装器并替换方法
    instance[methodName] = function wrappedMethod(descriptor: any) {
      msg.log(MsgLevel.level_3, `[GPURenderPipeline] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, [descriptor]);
        // 记录资源
        res.track(result, { parent: self_this.id, descriptor }, methodName);
        // 记录 API 调用
        APIrecorder.recordMethodCall(methodName, [descriptor]);
        // 返回结果
        return result;
      } catch (error) {
        msg.error(`[GPURenderPipeline] ${methodName} error: `, error);
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
  unhookGPURenderPipeline<T extends GPURenderPipeline>(pipe: T): T {
    if (typeof pipe !== "object" || pipe === null) {
      throw new TypeError("pipe must be a non-null object.");
    }

    const protoMethods = this.hookedMethods.get(pipe);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        (pipe as { [key: string]: any })[methodName] = original;
      });
      this.hookedMethods.delete(pipe);
    }
    return pipe;
  }
}

