import { Msg } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { CommandTracker } from "../command-tracker";
import { ResourceTracker } from "../resource-tracker";
import { GPUComputePassEncoderHook, GPURenderPassEncoderHook } from "./gpu-pass-encoder";

/**
 * @class GPUCommandEncoderHook
 * @description 
 */
export class GPUCommandEncoderHook {
  private static cmd = CommandTracker.getInstance();
  private static msg = Msg.getInstance();
  private static res = ResourceTracker.getInstance();
  private static APIrecorder = APIRecorder.getInstance();
  
  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private curPassNum = 0;
  private curEncoderID = 0;
  private static hookPassMap: {
    pass: GPUComputePassEncoder|GPURenderPassEncoder,
    hook: GPUComputePassEncoderHook|GPURenderPassEncoderHook
  }[] = [];

  constructor(encoderID: number) {
    this.curEncoderID = encoderID;
  }
  // 钩子入口方法
  hookGPUCommandEncoder<T extends GPUCommandEncoder>
  (cmdencoder: T, methodsList: string[] = []): T {
    const proto = Object.getPrototypeOf(cmdencoder);
    
    // 需要拦截的 WebGPU XXX API列表
    const methodsToHook: string[] = [
      // 'beginComputePass',
      // 'beginRenderPass',
      'clearBuffer',
      'copyBufferToBuffer',
      'copyBufferToTexture',
      'copyTextureToBuffer',
      'copyTextureToTexture',
      // 'finish',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    // 遍历并劫持方法
    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });

    // 特殊处理
    this.hookBeginRenderPass(proto);
    this.hookBeginComputePass(proto);
    this.hookFinish(proto);

    return cmdencoder;
  }
  // 方法劫持核心逻辑
  private hookMethod( proto: any, methodName: string) {
    const self_this = this;
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
        GPUCommandEncoderHook.cmd.recordEncodercmd(self_this.curEncoderID, methodName, args);
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

    if (!GPUCommandEncoderHook.hookedMethods.has(proto)) {
      GPUCommandEncoderHook.hookedMethods.set(proto, new Map());
    }

    // 保存原始方法引用
    GPUCommandEncoderHook.hookedMethods.get(proto)?.set(methodName, originalMethod);
  }

  private hookBeginRenderPass(proto: any) {
    const self_this = this;
    const originalMethod = proto['beginRenderPass'];
    proto['beginRenderPass'] = function wrappedMethod(descriptor:any) {
      try {
        const pass = originalMethod.apply(this, [descriptor]);
        // 记录 Cmd
        GPUCommandEncoderHook.cmd.recoderPassCreate(
          self_this.curEncoderID,
          self_this.curPassNum,
          'beginRenderPass',
           descriptor);

        // 记录 API 调用
        GPUCommandEncoderHook.APIrecorder.recordMethodCall('beginRenderPass',[descriptor]);
        // 劫持 pass, 并记录
        const hook = new GPURenderPassEncoderHook(
           self_this.curEncoderID,
           self_this.curPassNum);
           self_this.curPassNum += 1;
        hook.hookGPURenderPassEncoder(pass);
        GPUCommandEncoderHook.hookPassMap.push({pass,hook});
        
        return pass;
      } catch (error) {
        GPUCommandEncoderHook.msg.error(`[GPUCommandEncoder] beginRenderPass error: `, error);
        throw error;
      }
    }
    if (!GPUCommandEncoderHook.hookedMethods.has(proto)) {
      GPUCommandEncoderHook.hookedMethods.set(proto, new Map());
    }
    GPUCommandEncoderHook.hookedMethods.get(proto)?.set('beginRenderPass', originalMethod);
  }

  private hookBeginComputePass(proto: any) {
    const self_this = this;
    const originalMethod = proto['beginComputePass'];
    proto['beginComputePass'] = function wrappedMethod(descriptor:any) {
      try {
        const pass = originalMethod.apply(this, [descriptor]);
        // 记录 Cmd
        GPUCommandEncoderHook.cmd.recoderPassCreate(
          self_this.curEncoderID,
          self_this.curPassNum,
          'beginComputePass',
           descriptor);
        // 记录 API 调用
        GPUCommandEncoderHook.APIrecorder.recordMethodCall('beginComputePass',[descriptor]);
        // 劫持 pass, 并记录
        const hook = new GPUComputePassEncoderHook(
           self_this.curEncoderID,
           self_this.curPassNum);
           self_this.curPassNum += 1;
        hook.hookGPUComputePassEncoder(pass);
        GPUCommandEncoderHook.hookPassMap.push({pass,hook});

        return pass;
     } catch (error) {
        GPUCommandEncoderHook.msg.error(`[GPUCommandEncoder] beginComputePass error: `, error);
        throw error;
     }
    }
    if (!GPUCommandEncoderHook.hookedMethods.has(proto)) {
      GPUCommandEncoderHook.hookedMethods.set(proto, new Map());
    }
    GPUCommandEncoderHook.hookedMethods.get(proto)?.set('beginComputePass', originalMethod);
  }

  private hookFinish(proto: any) {
    const self_this = this;
    const originalMethod = proto['finish'];
    proto['finish'] = function wrappedMethod(descriptor:any) {
      try {
        const commandbuffer = originalMethod.apply(this, [descriptor]);
        GPUCommandEncoderHook.cmd.recordEncodercmd(self_this.curEncoderID, 'finish', [descriptor]);
        GPUCommandEncoderHook.APIrecorder.recordMethodCall('finish', [descriptor]);
        GPUCommandEncoderHook.res.track(commandbuffer, descriptor, 'GPUCommandBuffer');
        return commandbuffer;
      } catch (error) {
        GPUCommandEncoderHook.msg.error(`[GPUCommandEncoder] finish error: `, error);
        throw error;
      }
    }

    if (!GPUCommandEncoderHook.hookedMethods.has(proto)) {
      GPUCommandEncoderHook.hookedMethods.set(proto, new Map());
    }
    GPUCommandEncoderHook.hookedMethods.get(proto)?.set('finish', originalMethod);
  }

  // 复原函数入口方法
  unhookGPUCommandEncoder<T extends GPUCommandEncoder>(cmdencoder: T): T {
    const proto = Object.getPrototypeOf(cmdencoder);
    const protoMethods = GPUCommandEncoderHook.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
        // GPUCommandEncoderHook.msg.log(`[GPUCommandEncoder] ${methodName} unhooked`);
      });
      GPUCommandEncoderHook.hookedMethods.delete(proto);
    }

    // 全部 unhook 
    for (let { pass, hook } of GPUCommandEncoderHook.hookPassMap) {
      if(hook instanceof GPUComputePassEncoderHook) {
        hook.unhookGPUComputePassEncoder(pass as GPUComputePassEncoder);
      }
      if(hook instanceof GPURenderPassEncoderHook) {
        hook.unhookGPURenderPassEncoder(pass as GPURenderPassEncoder);
      }
    }
    return cmdencoder;
  }

  // todo: maybe bindDestroyHook

}