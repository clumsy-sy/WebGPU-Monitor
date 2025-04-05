import { Msg } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { CommandTracker } from "../command-tracker";
import { FrameRecorder } from "../frame-recorder";
import { ResourceTracker } from "../resource-tracker";
import { GPUCommandEncoderHook } from "./gpu-command-encoder";

/**
 * @class GPUDeviceHook
 * @description 拦截GPUDevice相关方法，并记录调用信息
 */
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
      // 'createTexture',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    methodsToHook.forEach(methodName => {
      this.hookMethod(proto, methodName);
    });

    // 特殊处理
    // 'createBuffer'
    this.hookBuffer(proto);
    // 'createTexture'
    this.hookTexture(proto);
    // 'createCommandEncoder'
    this.hookCommandEncoder(proto);

    // queue
    this.hookGPUQueue(device.queue, []);

    return device;
  }

  // 方法劫持核心逻辑
  private static hookMethod(proto: any, methodName: string) {
    const originalMethod = proto[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUDevice`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      // GPUDeviceHook.msg.log(`[GPUDevice] ${methodName}`);
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
    proto['createBuffer'] = function wrappedMethod(descriptor: any) {
      try {
        const buffer = originalMethod.apply(this, [descriptor]);
        GPUDeviceHook.res.track(buffer, descriptor, 'createBuffer');
        GPUDeviceHook.APIrecorder.recordMethodCall('createBuffer', [descriptor]);

        if (descriptor.mappedAtCreation) {
          const originalGetMappedRange = buffer.getMappedRange;
          let mappedRange: ArrayBufferView | null = null;

          buffer.getMappedRange = function (...args: any[]): ArrayBufferView {
            const result = originalGetMappedRange.apply(this, args);
            mappedRange = result;
            GPUDeviceHook.APIrecorder.recordMethodCall('getMappedRange', args);
            return result;
          };

          // 劫持 unmap 捕获初始数据
          const originalUnmap = buffer.unmap;
          buffer.unmap = function () {
            if (mappedRange) {
              let uint8Data = new Uint8Array(mappedRange as any);
              GPUDeviceHook.res.track(mappedRange, {
                buffer: buffer,
                data: [...uint8Data]
              }, 'bufferData');
              GPUDeviceHook.APIrecorder.recordMethodCall('unmap', []);
            }
            const result = originalUnmap.call(this);
            return result;
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

  private static hookTexture(proto: any) {
    const originalMethod = proto['createTexture'];
    proto['createTexture'] = function wrappedMethod(descriptor: any) {
      try {
        const texture = originalMethod.apply(this, [descriptor]);
        GPUDeviceHook.res.track(texture, descriptor, 'createTexture');
        GPUDeviceHook.APIrecorder.recordMethodCall('createTexture', [descriptor]);

        if (texture) {
          // 劫持 texture.createView
          const originalCreateView = texture.createView;
          texture.createView = function wrappedMethod(descriptor: any) {
            try {
              const view = originalCreateView.apply(this, [descriptor]);
              GPUDeviceHook.res.track(view, { parent: texture, descriptor }, 'createTextureView');
              GPUDeviceHook.APIrecorder.recordMethodCall('createTextureView', [descriptor]);
              return view;
            } catch (error) {
              GPUDeviceHook.msg.error(`[GPUDevice] createTextureView error: `, error);
              throw error;
            }
          }
          // 劫持 texture.destroy
          const originalDestroy = texture.destroy;
          texture.destroy = function wrappedMethod() {
            try {
              originalDestroy.apply(this, []);
              GPUDeviceHook.res.untrack(texture);
              // todo: 删除纹理对应的视图
              GPUDeviceHook.APIrecorder.recordMethodCall('destroy', []);
            } catch (error) {
              GPUDeviceHook.msg.error(`[GPUDevice] destroy error: `, error);
            }
          }
        }

        return texture;
      } catch (error) {
        GPUDeviceHook.msg.error(`[GPUDevice] createTexture error: `, error);
      }
    }
    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }
    this.hookedMethods.get(proto)?.set('createTexture', originalMethod);
  }

  private static hookCommandEncoder(proto: any) {
    const originalMethod = proto['createCommandEncoder'];
    proto['createCommandEncoder'] = function wrappedMethod(descriptor: any) {
      try {
        const encoder = originalMethod.apply(this, [descriptor]);
        if (GPUDeviceHook.recoder.captureState.active) {
          // 记录 cmd
          GPUDeviceHook.cmd.recordEncoderCreate(GPUDeviceHook.hookedEncoder, descriptor);
          // 记录 api
          GPUDeviceHook.APIrecorder.recordMethodCall('createCommandEncoder', [descriptor]);
          // 创建hookEncoder, 并hook
          const hook = new GPUCommandEncoderHook(GPUDeviceHook.hookedEncoder);
          hook.hookGPUCommandEncoder(encoder);
          this.hookedEncoder++;
          GPUDeviceHook.hookedEncoderMap.push({ encoder, hook });

          GPUDeviceHook.activeFlag = true;
        } else if (GPUDeviceHook.activeFlag) {
          // 遍历所有 encoder，unhook
          for (let { encoder, hook } of GPUDeviceHook.hookedEncoderMap) {
            hook.unhookGPUCommandEncoder(encoder);
          }

          GPUDeviceHook.activeFlag = false;
        }
        return encoder;
      } catch (error) {
        if (GPUDeviceHook.recoder.captureState.active) {
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

  static hookGPUQueue<T extends GPUQueue>(queue: T, methodsList: string[] = []): T {
    const proto = Object.getPrototypeOf(queue);

    const methodsToHook: string[] = [
      'copyExternalImageToTexture',
      'onSubmittedWorkDone',
      'submit',
      // 'writeBuffer',
      'writeTexture',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    methodsToHook.forEach(methodName => {
      this.hookQueueMethod(proto, methodName);
    });

    // 特殊处理
    this.hookQueueWriteBuffer(proto);

    return queue
  }

  private static hookQueueMethod(proto: any, methodName: string) {
    const originalMethod = proto[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUDevice`);
    }

    // 创建包装器并替换方法
    proto[methodName] = function wrappedMethod(...args: any[]) {
      // GPUDeviceHook.msg.log(`[GPUDevice] ${methodName}`);
      try {
        const result = originalMethod.apply(this, args);
        // todo: writebuffer ... don't need active
        if (GPUDeviceHook.recoder.captureState.active) {
          GPUDeviceHook.cmd.recordCmd(methodName, args);
          GPUDeviceHook.APIrecorder.recordMethodCall(methodName, args);
        }
        return result;
      } catch (error) {
        GPUDeviceHook.msg.error(`[GPUDevice] ${methodName} error: `, error);
        throw error;
      }
    };

    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(proto)?.set(methodName, originalMethod);
  }

  private static hookQueueWriteBuffer(proto: any) {
    const originalMethod = proto['writeBuffer'];
    proto['writeBuffer'] = function wrappedMethod(...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        if (GPUDeviceHook.recoder.captureState.active) {
          const [buffer, bufferOffset, data, dataOffset, size] = args;
          // 1. 创建数据副本（避免直接引用可能被修改的原始数据）
          let dataCopy: ArrayBuffer;
          if (data instanceof ArrayBuffer) {
            dataCopy = data.slice(0); // 直接复制ArrayBuffer
          } else if (ArrayBuffer.isView(data)) { // 处理ArrayBufferView（如Uint8Array）
            // 复制底层的ArrayBuffer
            dataCopy = data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength
            );
          } else if (data instanceof SharedArrayBuffer) {
            dataCopy = data.slice(0); // 处理SharedArrayBuffer
          } else {
            throw new Error("Unsupported data type for writeBuffer");
          }
          // 将ArrayBuffer转换为Uint8Array以便存储

          // 2. 生成唯一标识并存储到资源跟踪器
          const dataId = GPUDeviceHook.res.track(data, {
            data: [...new Uint8Array(dataCopy)]
          }, 'writeBufferData');

          // 3. 构建元数据（包含数据 ID 和参数）
          const callMeta = [
            buffer,
            bufferOffset,
            dataId, // 关键：通过 ID 关联数据
            dataOffset || 0,
            size || dataCopy.byteLength,
          ];
          GPUDeviceHook.cmd.recordCmd('writeBuffer', callMeta);
          GPUDeviceHook.APIrecorder.recordMethodCall('writeBuffer', args);
        }
        return result;
      } catch (error) {
        GPUDeviceHook.msg.error(`[GPUDevice] writeBuffer error: `, error);
        throw error;
      }
    }
    if (!this.hookedMethods.has(proto)) {
      this.hookedMethods.set(proto, new Map());
    }
    this.hookedMethods.get(proto)?.set('writeBuffer', originalMethod);
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

  static unhookGPUQueue<T extends GPUQueue>(queue: T): T {
    const proto = Object.getPrototypeOf(queue);

    // 遍历所有被劫持的方法并恢复
    const protoMethods = this.hookedMethods.get(proto);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        proto[methodName] = original;
      });
      this.hookedMethods.delete(proto);
    }
    return queue;
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