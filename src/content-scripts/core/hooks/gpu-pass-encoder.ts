import { Msg, MsgLevel } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { CommandTracker } from "../command-tracker";
import { ResourceTracker } from "../resource-tracker";

/**
 * @class GPUComputePassEncoderHook
 * @description 
 */
export class GPUComputePassEncoderHook {
  private static cmd = CommandTracker.getInstance();
  private static msg = Msg.getInstance();
  private static APIrecorder = APIRecorder.getInstance();

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
    const proto = Object.getPrototypeOf(pass);

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
      this.hookMethod(proto, methodName);
    });

    return pass;
  }

  // 方法劫持核心逻辑
  private hookMethod(proto: any, methodName: string) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = proto[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUComputePassEncoder`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      GPUComputePassEncoderHook.msg.log(MsgLevel.level_3, `[GPUComputePassEncoder] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录 Cmd
        GPUComputePassEncoderHook.cmd.recordPassCmd(self_this.curEncoderID, self_this.curPassID, methodName, args);
        // 记录 API 调用
        GPUComputePassEncoderHook.APIrecorder.recordMethodCall(methodName, args);
        // 返回结果
        return result;
      } catch (error) {
        GPUComputePassEncoderHook.msg.error(`[GPUComputePassEncoder] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };

    if (!GPUComputePassEncoderHook.hookedMethods.has(proto)) {
      GPUComputePassEncoderHook.hookedMethods.set(proto, new Map());
    }

    // 保存原始方法引用
    GPUComputePassEncoderHook.hookedMethods.get(proto)?.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  unhookGPUComputePassEncoder<T extends GPUComputePassEncoder>(cmdencoder: T): T {
    const proto = Object.getPrototypeOf(cmdencoder);
    const protoMethods = GPUComputePassEncoderHook.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
        GPUComputePassEncoderHook.msg.log(MsgLevel.level_3, `[GPUComputePassEncoder] ${methodName} unhooked`);
      });
      GPUComputePassEncoderHook.hookedMethods.delete(proto);
    }
    return cmdencoder;
  }

  // todo: maybe bindDestroyHook

}


/**
 * @class GPURenderPassEncoderHook
 * @description 
 */
export class GPURenderPassEncoderHook {
  private static cmd = CommandTracker.getInstance();
  private static msg = Msg.getInstance();
  private static APIrecorder = APIRecorder.getInstance();

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
    const proto = Object.getPrototypeOf(pass);

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
      this.hookMethod(proto, methodName);
    });

    return pass;
  }

  // 方法劫持核心逻辑
  private hookMethod(proto: any, methodName: string) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = proto[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPURenderPassEncoder`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      // GPURenderPassEncoderHook.msg.log(`[GPURenderPassEncoder] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录 Cmd
        console.log(`[GPURenderPassEncoder] ${methodName} ${self_this.curPassID} `);
        GPURenderPassEncoderHook.cmd.recordPassCmd(self_this.curEncoderID, self_this.curPassID, methodName, args);
        // 记录 API 调用
        GPURenderPassEncoderHook.APIrecorder.recordMethodCall(methodName, args);
        // 返回结果
        return result;
      } catch (error) {
        GPURenderPassEncoderHook.msg.error(`[GPURenderPassEncoder] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };

    if (!GPURenderPassEncoderHook.hookedMethods.has(proto)) {
      GPURenderPassEncoderHook.hookedMethods.set(proto, new Map());
    }

    // 保存原始方法引用
    GPURenderPassEncoderHook.hookedMethods.get(proto)?.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  unhookGPURenderPassEncoder<T extends GPURenderPassEncoder>(cmdencoder: T): T {
    const proto = Object.getPrototypeOf(cmdencoder);
    const protoMethods = GPURenderPassEncoderHook.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
        // GPURenderPassEncoderHook.msg.log(`[GPURenderPassEncoder] ${methodName} unhooked`);
      });
      GPURenderPassEncoderHook.hookedMethods.delete(proto);
    }
    return cmdencoder;
  }

  // todo: maybe bindDestroyHook

}