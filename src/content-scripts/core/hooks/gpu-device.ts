import { res, msg, cmd, APIrecorder, recoder } from "./gpu-global"
import { GPUCommandEncoderHook } from "./gpu-command-encoder";
import { GPUTextureHook } from "./gpu-texture";
import { GPUComputePipelineHook, GPURenderPipelineHook } from "./gpu-pipeline";

/**
 * @class GPUDeviceHook
 * @description 拦截GPUDevice相关方法，并记录调用信息
 */
export class GPUDeviceHook {

  private static hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private static activeFlag: boolean = false;
  private static hookedEncoder: number = 0;
  private static hookedEncoderMap: {
    encoder: GPUCommandEncoder,
    hook: GPUCommandEncoderHook
  }[] = [];
  // 钩子入口方法
  static hookDevice<T extends GPUDevice>(device: T, methodsList: string[] = []): T {

    // 需要拦截的WebGPU Device API列表
    const methodsToHook: string[] = [
      'createBindGroup',
      'createBindGroupLayout',
      // 'createBuffer',
      // 'createCommandEncoder',
      // 'createComputePipeline',
      'createComputePipelineAsync',
      'createPipelineLayout',
      'createQuerySet',
      'createRenderBundleEncoder',
      // 'createRenderPipeline',
      'createRenderPipelineAsync',
      'createSampler',
      'createShaderModule',
      // 'createTexture',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    methodsToHook.forEach(methodName => {
      this.hookMethod(device, methodName);
    });

    // 特殊处理
    // 'createBuffer'
    this.hookBuffer(device);
    // 'createTexture'
    this.hookTexture(device);
    // 'createCommandEncoder'
    this.hookCommandEncoder(device);
    // pipeline
    this.hookComputePipeline(device);
    this.hookRenderPipeline(device);

    // queue
    this.hookGPUQueue(device.queue, []);


    return device;
  }

  // 方法劫持核心逻辑
  private static hookMethod(device: any, methodName: string) {
    const originalMethod = device[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUDevice`);
    }

    // 创建包装器并替换方法
    device[methodName] = function wrappedMethod(descriptor: any) {
      // GPUDeviceHook.msg.log(`[GPUDevice] ${methodName}`);
      try {
        const result = originalMethod.apply(this, [descriptor]);
        res.track(result, descriptor, methodName);
        APIrecorder.recordMethodCall(methodName, [descriptor]);
        return result;
      } catch (error) {
        msg.error(`[GPUDevice] ${methodName} error: `, error);
        throw error;
      } finally {

      }
    };

    if (!this.hookedMethods.has(device)) {
      this.hookedMethods.set(device, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(device)?.set(methodName, originalMethod);
  }

  private static hookBuffer(device: any) {
    const originalMethod = device['createBuffer'];
    device['createBuffer'] = function wrappedMethod(descriptor: any) {
      try {
        const buffer = originalMethod.apply(this, [descriptor]);
        res.track(buffer, descriptor, 'createBuffer');
        APIrecorder.recordMethodCall('createBuffer', [descriptor]);

        if (descriptor.mappedAtCreation) {
          const originalGetMappedRange = buffer.getMappedRange;
          let mappedRange: ArrayBufferView | null = null;

          buffer.getMappedRange = function (descriptor: any): ArrayBufferView {
            const result = originalGetMappedRange.apply(this, [descriptor]);
            mappedRange = result;
            APIrecorder.recordMethodCall('getMappedRange', [descriptor]);
            return result;
          };

          // 劫持 unmap 捕获初始数据
          const originalUnmap = buffer.unmap;
          buffer.unmap = function () {
            if (mappedRange) {
              let uint8Data = new Uint8Array(mappedRange as any);
              res.track(mappedRange, {
                buffer: buffer,
                data: [...uint8Data]
              }, 'bufferData');
              APIrecorder.recordMethodCall('unmap', []);
            }
            const result = originalUnmap.call(this);
            return result;
          };
        }

        return buffer;
      } catch (error) {
        msg.error(`[GPUDevice] createBuffer error: `, error);
        throw error;
      }
    };

    if (!this.hookedMethods.has(device)) {
      this.hookedMethods.set(device, new Map());
    }
    this.hookedMethods.get(device)?.set('createBuffer', originalMethod);
  }

  private static hookTexture(device: any) {
    const originalMethod = device['createTexture'];
    device['createTexture'] = function wrappedMethod(descriptor: any) {
      try {
        // 调用原始方法创建纹理
        const texture = originalMethod.apply(this, [descriptor]);
  
        // 验证 texture 是否为有效对象
        if (!texture || !(texture instanceof GPUTexture)) {
          throw new Error("Invalid GPUTexture object created.");
        }
  
        // 跟踪纹理资源
        res.track(texture, descriptor, 'createTexture');
        APIrecorder.recordMethodCall('createTexture', [descriptor]);
  
        const hook = new GPUTextureHook(texture);
        hook.hookGPUTexture(texture);
  
        return texture;
      } catch (error) {
        msg.error(`[GPUDevice] createTexture error (descriptor: ${JSON.stringify(descriptor)})`, error);
        throw error;
      }
    };
  
    // 保存原始方法引用
    if (!this.hookedMethods.has(device)) {
      this.hookedMethods.set(device, new Map());
    }
    this.hookedMethods.get(device)?.set('createTexture', originalMethod);
  }

  private static hookCommandEncoder(device: any) {
    const originalMethod = device['createCommandEncoder'];
    device['createCommandEncoder'] = function wrappedMethod(descriptor: any) {
      try {
        const encoder = originalMethod.apply(this, [descriptor]);
        if (recoder.captureState.active) {
          // 记录 cmd
          cmd.recordEncoderCreate(GPUDeviceHook.hookedEncoder, descriptor);
          // 记录 api
          APIrecorder.recordMethodCall('createCommandEncoder', [descriptor]);
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
        if (recoder.captureState.active) {
          msg.error(`[GPUDevice] createCommandEncoder error: `, error);
        }
        throw error;
      }
    }
    if (!this.hookedMethods.has(device)) {
      this.hookedMethods.set(device, new Map());
    }
    this.hookedMethods.get(device)?.set('createCommandEncoder', originalMethod);
  }

  private static hookComputePipeline(device: any) {
    const originalMethod = device['createComputePipeline'];
    device['createComputePipeline'] = function wrappedMethod(descriptor: any) {
      try {
        const result = originalMethod.apply(this, [descriptor]);
        res.track(result, descriptor, 'createComputePipeline');
        APIrecorder.recordMethodCall('createComputePipeline', [descriptor]);

  
        const hook = new GPUComputePipelineHook(result);
        hook.hookGPUComputePipeline(result);
        return result;
      } catch (error) {
        msg.error(`[GPUDevice] createComputePipeline error (descriptor: ${JSON.stringify(descriptor)})`, error);
        throw error;
      }
    }

    // 保存原始方法引用
    if (!this.hookedMethods.has(device)) {
      this.hookedMethods.set(device, new Map());
    }
    this.hookedMethods.get(device)?.set('createComputePipeline', originalMethod);
  }

  private static hookRenderPipeline(device: any) {
    const originalMethod = device['createRenderPipeline'];
    device['createRenderPipeline'] = function wrappedMethod(descriptor: any) {
      try {
        const result = originalMethod.apply(this, [descriptor]);
        res.track(result, descriptor, 'createRenderPipeline');
        APIrecorder.recordMethodCall('createRenderPipeline', [descriptor]);

  
        const hook = new GPURenderPipelineHook(result);
        hook.hookGPURenderPipeline(result);
        return result;
      } catch (error) {
        msg.error(`[GPUDevice] createRenderPipeline error (descriptor: ${JSON.stringify(descriptor)})`, error);
        throw error;
      }
    }

    // 保存原始方法引用
    if (!this.hookedMethods.has(device)) {
      this.hookedMethods.set(device, new Map());
    }
    this.hookedMethods.get(device)?.set('createRenderPipeline', originalMethod);
  }

  static hookGPUQueue<T extends GPUQueue>(queue: T, methodsList: string[] = []): T {
    const methodsToHook: string[] = [
      'copyExternalImageToTexture', // 需要当前帧结束后
      'onSubmittedWorkDone',
      'submit',
      // 'writeBuffer',
      'writeTexture',
      // 添加其他需要拦截的方法...
      ...methodsList
    ];

    methodsToHook.forEach(methodName => {
      this.hookQueueMethod(queue, methodName);
    });

    // 特殊处理
    this.hookQueueWriteBuffer(queue);

    return queue
  }

  private static hookQueueMethod(queue: any, methodName: string) {
    const originalMethod = queue[methodName];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${methodName} not found on GPUDeviceQueue`);
    }

    // 创建包装器并替换方法
    queue[methodName] = function wrappedMethod(...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        if (recoder.captureState.active) {
          cmd.recordCmd(methodName, args);
          APIrecorder.recordMethodCall(methodName, args);
        }
        return result;
      } catch (error) {
        msg.error(`[GPUDeviceQueue] ${methodName} error: `, error);
        throw error;
      }
    };

    if (!this.hookedMethods.has(queue)) {
      this.hookedMethods.set(queue, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(queue)?.set(methodName, originalMethod);
  }

  // private static hookCopyExternalImageToTexture(device: any) {
  //   const originalMethod = device['copyExternalImageToTexture'];
  //   if (!originalMethod) {
  //     throw new Error("Method copyExternalImageToTexture not found on GPUDevice");
  //   }
  
  //   device['copyExternalImageToTexture'] = function wrappedMethod(
  //     source: GPUCopyExternalImageSourceInfo,
  //     destination: GPUCopyExternalImageDestInfo,
  //     options: GPUExtent3DStrict
  //   ) {
  //     try {
  //       // 调用原始方法执行图像复制
  //       const result = originalMethod.apply(this, arguments);
  
  //       // 获取设备和队列
  //       const device = this;
  //       const queue = device.queue;
  
  //       // 创建缓冲区来读取纹理数据
  //       const width = options?.width;
  //       const height = options?.height;
  //       const bufferSize = options[0] * options[1] * 4; // RGBA
  //       const bufferDescriptor: GPUBufferDescriptor = {
  //         size: bufferSize,
  //         usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  //         mappedAtCreation: false,
  //       };
  //       const readbackBuffer = device.createBuffer(bufferDescriptor);
  
  //       // 创建命令编码器并复制纹理到缓冲区
  //       const commandEncoder = device.createCommandEncoder();
  //       commandEncoder.copyTextureToBuffer(
  //         {
  //           texture: destination.texture,
  //           origin: destination.origin || { x: 0, y: 0, z: 0 },
  //           aspect: destination.aspect || 'all',
  //         },
  //         {
  //           buffer: readbackBuffer,
  //           offset: 0,
  //           bytesPerRow: options[0] * 4,
  //         },
  //         options
  //       );
  
  //       // 提交命令并等待完成
  //       const commands = commandEncoder.finish();
  //       queue.submit([commands]);
  
  //       // 等待映射缓冲区并读取数据
  //       (async () => {
  //         await readbackBuffer.mapAsync(GPUMapMode.READ);
  //         const arrayBuffer = readbackBuffer.getMappedRange(0, bufferSize);
  //         const pixelData = new Uint8Array(arrayBuffer);
  
  //         // 存储数据副本到资源跟踪器
  //         const dataId = res.track(pixelData.buffer, {
  //           width: options,
  //           height: options.height,
  //           format: 'rgba8unorm',
  //           data: [...pixelData],
  //         }, 'textureData');
  
  //         // 记录 API 调用与数据 ID
  //         APIrecorder.recordMethodCall('copyExternalImageToTexture', [
  //           {
  //             sourceWidth: source.width,
  //             sourceHeight: source.height,
  //             destinationTexture: destination.texture,
  //             options,
  //             dataId,
  //           },
  //         ]);
  
  //         readbackBuffer.unmap();
  //       })();
  
  //       return result;
  //     } catch (error) {
  //       msg.error(`[GPUDevice] copyExternalImageToTexture error: `, error);
  //       throw error;
  //     }
  //   };
  
  //   if (!this.hookedMethods.has(device)) {
  //     this.hookedMethods.set(device, new Map());
  //   }
  //   this.hookedMethods.get(device)?.set('copyExternalImageToTexture', originalMethod);
  // }
  private static hookQueueWriteBuffer(queue: any) {
    const originalMethod = queue['writeBuffer'];
    queue['writeBuffer'] = function wrappedMethod(...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);
        // if (recoder.captureState.active) {
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
          const dataId = res.track(data, {
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
          cmd.recordCmd('writeBuffer', callMeta);
          APIrecorder.recordMethodCall('writeBuffer', args);
        // }
        return result;
      } catch (error) {
        msg.error(`[GPUDeviceQueue] writeBuffer error: `, error);
        throw error;
      }
    }
    if (!this.hookedMethods.has(queue)) {
      this.hookedMethods.set(queue, new Map());
    }
    this.hookedMethods.get(queue)?.set('writeBuffer', originalMethod);
  }

  static unhookGPUDevice<T extends GPUDevice>(device: T): T {
    // 遍历所有被劫持的方法并恢复
    const deviceMethods = this.hookedMethods.get(device);
    if (deviceMethods) {
      deviceMethods.forEach((original, methodName) => {
        (device as { [key: string]: any})[methodName] = original;
      });
      this.hookedMethods.delete(device);
    }

    return device;
  }

  static unhookGPUQueue<T extends GPUQueue>(queue: T): T {

    // 遍历所有被劫持的方法并恢复
    const deviceMethods = this.hookedMethods.get(queue);
    if (deviceMethods) {
      deviceMethods.forEach((original, methodName) => {
        (queue as { [key: string]: any})[methodName] = original;
      });
      this.hookedMethods.delete(queue);
    }
    return queue;
  }

  // 绑定资源销毁监听

}