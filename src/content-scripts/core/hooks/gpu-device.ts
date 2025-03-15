import { Msg } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { CommandTracker } from "../command-tracker";
import { FrameRecorder } from "../frame-recorder";
import { ResourceTracker } from "../resource-tracker";
import { GPUCommandEncoderHook } from "./gpu-command-encoder";

export class GPUDeviceHook {
  private static res = ResourceTracker.getInstance();
  private static msg = Msg.getInstance();
  private static cmd = CommandTracker.getInstance();
  private static APIrecorder = APIRecorder.getInstance();
  private static recoder = FrameRecorder.getInstance();
  
  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private static activeFlag: boolean = false;
  private static hookedEncoder: number = 0;
  private static hookedEncoderMap: {
    encoder: GPUCommandEncoder, 
    hook: GPUCommandEncoderHook
  }[] = [];
  // 钩子入口方法
  static hookDevice<T extends GPUDevice>(device: T, methodsList: string[] = []): T {
    const proto = Object.getPrototypeOf(device);
    
    // 需要拦截的WebGPU Device API列表
    const methodsToHook: string[] = [
      'createBindGroup',
      'createBindGroupLayout',
      // 'createBuffer',
      // 'createCommandEncoder',
      'createComputePipeline',
      'createComputePipelineAsync',
      'createPipelineLayout',
      'createQuerySet',
      'createRenderBundleEncoder',
      'createRenderPipeline',
      'createRenderPipelineAsync',
      'createSampler',
      'createShaderModule',
      'createTexture',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });

    // 特殊处理
    // 'createBuffer'
    this.hookBuffer(proto);

    // 'createCommandEncoder'
    this.hookCommandEncoder(proto);

    return device;
  }

  // 方法劫持核心逻辑
  private static hookMethod( proto: any, methodName: string ) {
    const originalMethod = proto[methodName];
    
    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUDevice`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      GPUDeviceHook.msg.log(`[GPUDevice] ${methodName}`);
      try {
        const result = originalMethod.apply(this, args);
        GPUDeviceHook.res.track(result, args, methodName);
        GPUDeviceHook.APIrecorder.recordMethodCall(methodName, args);
        return result;
      } catch (error) {
        GPUDeviceHook.msg.error(`[GPUDevice] ${methodName} error: `, error);
        throw error;
      } finally {
        
      }
    };

    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(proto)?.set(methodName, originalMethod);
  }

  private static hookBuffer(proto: any) { 
    const originalMethod = proto['createBuffer'];
    proto['createBuffer'] = function wrappedMethod(descriptor:any) {
      try {
        const buffer = originalMethod.apply(this, [descriptor]);
        GPUDeviceHook.res.track(buffer, descriptor, 'createBuffer');
        GPUDeviceHook.APIrecorder.recordMethodCall('createBuffer', [descriptor]);
        
        if (descriptor.mappedAtCreation) {
          const originalGetMappedRange = buffer.getMappedRange;
          let mappedRange:any = null;
          
          buffer.getMappedRange = function(...args: any[]) {
            mappedRange = originalGetMappedRange.apply(this, args);
            GPUDeviceHook.res.track(mappedRange, { buffer: buffer }, 'bufferDataMap', );
            GPUDeviceHook.APIrecorder.recordMethodCall('getMappedRange', args);
            return mappedRange;
          };
    
          // 劫持 unmap 捕获初始数据
          const originalUnmap = buffer.unmap;
          buffer.unmap = function() {
            if (mappedRange) {
              GPUDeviceHook.res.track(mappedRange, {
                arrayBuffer: mappedRange,
                data: mappedRange
              }, 'bufferData');
              GPUDeviceHook.APIrecorder.recordMethodCall('unmap', []);
            }
            return originalUnmap.call(this);
          };
        } 
        
        return buffer;
      } catch (error) {
        GPUDeviceHook.msg.error(`[GPUDevice] createBuffer error: `, error);
        throw error;
      }
    };

    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }
    this.hookedMethods.get(proto)?.set('createBuffer', originalMethod);
  }

  private static hookCommandEncoder(proto: any) {
    const originalMethod = proto['createCommandEncoder'];
    proto['createCommandEncoder'] = function wrappedMethod(descriptor:any) {
      try {
        const encoder = originalMethod.apply(this, [descriptor]);
        if (GPUDeviceHook.recoder.captureState.active){
          // 记录 cmd
          GPUDeviceHook.cmd.recordEncoderCreate(GPUDeviceHook.hookedEncoder, descriptor);
          // 记录 api
          GPUDeviceHook.APIrecorder.recordMethodCall('createCommandEncoder', [descriptor]);
          // 创建hookEncoder, 并hook
          const hook = new GPUCommandEncoderHook(GPUDeviceHook.hookedEncoder);
          hook.hookGPUCommandEncoder(encoder);
          this.hookedEncoder++;
          GPUDeviceHook.hookedEncoderMap.push({encoder, hook});

          GPUDeviceHook.activeFlag = true;
        } else if (GPUDeviceHook.activeFlag) {
          // 遍历所有 encoder，unhook
          for (let {encoder, hook} of GPUDeviceHook.hookedEncoderMap) {
            hook.unhookGPUCommandEncoder(encoder);
          }
          
          GPUDeviceHook.activeFlag = false;
        }
        return encoder;
      } catch (error) {
        if (GPUDeviceHook.recoder.captureState.active){
          GPUDeviceHook.msg.error(`[GPUDevice] createCommandEncoder error: `, error);
        }
        throw error;
      }
    }
    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }
    this.hookedMethods.get(proto)?.set('createCommandEncoder', originalMethod);
  }

  static unhookGPUDevice<T extends GPUDevice>(device: T): T {
    const proto = Object.getPrototypeOf(device);

    // 遍历所有被劫持的方法并恢复
    const protoMethods = this.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
      });
      this.hookedMethods.delete(proto);
    }

    return device;
  }

  // 绑定资源销毁监听
  // private static bindDestroyHook(
  //   resource: GPUObjectBase,
  //   methodName: string
  // ) {
  //   const originalDestroy = resource.destroy.bind(resource);
    
  //   resource.destroy = function wrappedDestroy() {
  //     GPUDeviceHook.res.logRelease({
  //       type: methodName,
  //       id: resource.toString(),
  //       timestamp: performance.now()
  //     });
  //     return originalDestroy();
  //   };
  // }
}