import { res, msg, cmd, APIrecorder, recoder, MsgLevel } from "./gpu-global"

/**
 * @class GPUComputePassEncoderHook
 * @description 
 */
export class GPUComputePassEncoderHook {
  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private curPassID = 0;
  private curEncoderID = 0;

  constructor(encoderID: number, passID: number) {
    this.curEncoderID = encoderID;
    this.curPassID = passID;
  }
  // 钩子入口方法
  hookGPUComputePassEncoder<T extends GPUComputePassEncoder>
    (pass: T, methodsList: string[] = []): T {

    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      'dispatchWorkgroups',
      'dispatchWorkgroupsIndirect',
      'end',
      'insertDebugMarker',
      'popDebugGroup',
      'pushDebugGroup',
      'setBindGroup',
      'setPipeline',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(pass, methodName);
    });

    return pass;
  }

  // 方法劫持核心逻辑
  private hookMethod(instance: any, methodName: string) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = instance[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUComputePassEncoder`);
    }

    // 创建包装器并替换方法
    instance[methodName] = function wrappedMethod(...args: any[]) {
      msg.log(MsgLevel.level_3, `[GPUComputePassEncoder] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录 Cmd
        cmd.recordPassCmd(self_this.curEncoderID, self_this.curPassID, methodName, args);
        // 记录 API 调用
        APIrecorder.recordMethodCall(methodName, args);
        // 返回结果
        return result;
      } catch (error) {
        msg.error(`[GPUComputePassEncoder] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };

    if (!GPUComputePassEncoderHook.hookedMethods.has(instance)) {
      GPUComputePassEncoderHook.hookedMethods.set(instance, new Map());
    }

    // 保存原始方法引用
    GPUComputePassEncoderHook.hookedMethods.get(instance)?.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  unhookGPUComputePassEncoder<T extends GPUComputePassEncoder>(pass: T): T {
    const protoMethods = GPUComputePassEncoderHook.hookedMethods.get(pass);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        (pass as { [key: string]: any })[methodName] = original;
        // msg.log(MsgLevel.level_3, `[GPUComputePassEncoder] ${methodName} unhooked`);
      });
      GPUComputePassEncoderHook.hookedMethods.delete(pass);
    }
    return pass;
  }

  // todo: maybe bindDestroyHook
}


/**
 * @class GPURenderPassEncoderHook
 * @description 
 */
export class GPURenderPassEncoderHook {
  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private curPassID = 0;
  private curEncoderID = 0;

  constructor(encoderID: number, passID: number) {
    this.curPassID = passID;
    this.curEncoderID = encoderID;
  }
  // 钩子入口方法
  hookGPURenderPassEncoder<T extends GPURenderPassEncoder>
    (pass: T, methodsList: string[] = []): T {

    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      'beginOcclusionQuery',
      'draw',
      'drawIndexed',
      'drawIndexedIndirect',
      'drawIndirect',
      'end',
      'endOcclusionQuery',
      'executeBundles',
      'insertDebugMarker',
      'popDebugGroup',
      'pushDebugGroup',
      'setBindGroup',
      'setBlendConstant',
      'setIndexBuffer',
      'setPipeline',
      'setScissorRect',
      'setStencilReference',
      'setVertexBuffer',
      'setViewport',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(pass, methodName);
    });

    return pass;
  }

  // 方法劫持核心逻辑
  private hookMethod(instance: any, methodName: string) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = instance[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPURenderPassEncoder`);
    }

    // 创建包装器并替换方法
    instance[methodName] = function wrappedMethod(...args: any[]) {
      // GPURenderPassEncoderHook.msg.log(`[GPURenderPassEncoder] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录 Cmd
        cmd.recordPassCmd(self_this.curEncoderID, self_this.curPassID, methodName, args);
        // 记录 API 调用
        APIrecorder.recordMethodCall(methodName, args);
        // 返回结果
        return result;
      } catch (error) {
        msg.error(`[GPURenderPassEncoder] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };

    if (!GPURenderPassEncoderHook.hookedMethods.has(instance)) {
      GPURenderPassEncoderHook.hookedMethods.set(instance, new Map());
    }

    // 保存原始方法引用
    GPURenderPassEncoderHook.hookedMethods.get(instance)?.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  unhookGPURenderPassEncoder<T extends GPURenderPassEncoder>(pass: T): T {
    const protoMethods = GPURenderPassEncoderHook.hookedMethods.get(pass);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        (pass as { [key: string]: any })[methodName] = original;
      });
      GPURenderPassEncoderHook.hookedMethods.delete(pass);
    }
    return pass;
  }

  // todo: maybe bindDestroyHook

}