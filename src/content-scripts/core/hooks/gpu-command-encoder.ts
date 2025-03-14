import { Msg } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { ResourceTracker } from "../resource-tracker";

/**
 * @class GPUCommandEncoderHook
 * @description 
 */
export class GPUCommandEncoderHook {
  // private static tracker = CommandTracker.getInstance();
  private static msg = Msg.getInstance();
  private static APIrecorder = APIRecorder.getInstance();
  
  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  // 钩子入口方法
  static hookGPUCommandEncoder<T extends GPUCommandEncoder>(cmdencoder: T, methodsList: string[] = []): T {
    const proto = Object.getPrototypeOf(cmdencoder);
    
    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      'beginComputePass',
      'beginRenderPass',
      'clearBuffer',
      'copyBufferToBuffer',
      'copyBufferToTexture',
      'copyTextureToBuffer',
      'copyTextureToTexture',
      'finish',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });

    return cmdencoder;
  }

  // 钩子入口原型方法
  static hookGPUCommandEncoderPrototype(methodsList: string[] = []){
    const proto = GPUCommandEncoder.prototype;
    
    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });
  }

  // 方法劫持核心逻辑
  private static hookMethod( proto: any, methodName: string) {
    // 获取原始方法
    const originalMethod = proto[methodName];
    
    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUCommandEncoder`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      GPUCommandEncoderHook.msg.log(`[GPUCommandEncoder] ${methodName} hooked`);
      try {
        // 执行原始方法并记录结果
        const result = originalMethod.apply(this, args);
        // 记录资源
        // GPUCommandEncoderHook.tracker.track(result, args, methodName);
        // 记录 API 调用
        GPUCommandEncoderHook.APIrecorder.recordMethodCall(methodName, args);
        // 返回结果
        return result;
      } catch (error) {
        GPUCommandEncoderHook.msg.error(`[GPUCommandEncoder] ${methodName} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };

    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(proto)?.set(methodName, originalMethod);
  }

  // 复原函数入口方法
  static unhookGPUCommandEncoder<T extends GPUCommandEncoder>(cmdencoder: T): T {
    const proto = Object.getPrototypeOf(cmdencoder);
    const protoMethods = this.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
        GPUCommandEncoderHook.msg.log(`[GPUCommandEncoder] ${methodName} unhooked`);
      });
      this.hookedMethods.delete(proto);
    }
    return cmdencoder;
  }

  // todo: maybe bindDestroyHook

}