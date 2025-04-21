import { Msg, MsgLevel } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { ResourceTracker } from "../resource-tracker";

/**
 * @class GPUTextureHook 模板
 * @description 钩子模板，用于拦截和记录 WebGPU 的 Texture API 的调用和销毁。
 */
export class GPUTextureHook {
  private static tracker = ResourceTracker.getInstance();
  private static msg = Msg.getInstance();
  private static APIrecorder = APIRecorder.getInstance();

  private hookedMethods: WeakMap<object, Map<string, Function>> = new WeakMap();
  private id = 0;

  constructor(texture: GPUTexture) {
    this.id = GPUTextureHook.tracker.getResID(texture) as number;
  }
  // 钩子入口方法
  hookGPUTexture<T extends GPUTexture>(texture: T, methodsList: string[] = []){

    this.hookCreateView(texture);

    this.hookDestory(texture);
  }

  private hookCreateView(texture: any) {
    const self_this = this;
    // 获取原始方法
    const originalMethod = texture['createView'];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${'createView'} not found on GPUTexture`);
    }

    // 创建包装器并替换方法
    texture['createView'] = function wrappedMethod(descriptor: any) {
      GPUTextureHook.msg.log(MsgLevel.level_3, `[GPUTexture] ${'createView'} hooked`);
      try {
        // 执行原始方法并记录结果
        const view = originalMethod.apply(this, descriptor);
        // 验证 view 是否为有效对象
        // if (!view || !(view instanceof GPUTextureView)) {
        //   throw new Error("Invalid GPUTextureView object created.");
        // }
        // console.log(`[GPUTexture]${self_this.id} GPUTexture hooked`);
        // // 记录资源
        GPUTextureHook.tracker.track(view, { parent: texture, descriptor }, 'createView');
        // // 记录 API 调用
        GPUTextureHook.APIrecorder.recordMethodCall('createView', [descriptor]);
        // 返回结果
        return view;
      } catch (error) {
        GPUTextureHook.msg.error(`[GPUTexture] ${'createView'} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };
    if (!this.hookedMethods.has(texture)) {
      this.hookedMethods.set(texture, new Map());
    }

    // 保存原始方法引用
    this.hookedMethods.get(texture)?.set('createView', originalMethod);
  }


  private hookDestory(texture: any) {
    // 获取原始方法
    const originalMethod = texture['destroy'];

    // 验证方法存在
    if (!originalMethod) {
      throw new Error(`Method ${'destroy'} not found on GPUTexture`);
    }

    // 创建包装器并替换方法
    texture['destroy'] = function wrappedMethod() {
      GPUTextureHook.msg.log(MsgLevel.level_3, `[GPUTexture] ${'destroy'} hooked`);
      try {
        GPUTextureHook.tracker.untrack(texture);
        GPUTextureHook.APIrecorder.recordMethodCall('textureview.destroy', []);
        originalMethod.apply(this, []);
      } catch (error) {
        GPUTextureHook.msg.error(`[GPUTexture] ${'destroy'} error: `, error);
        throw error;
      } finally {
        // todo: 添加性能追踪逻辑
      }
    };
  }

  // 复原函数入口方法
  unhookGPUTexture<T extends object>(texture: T): T {
    if (typeof texture !== "object" || texture === null) {
      throw new TypeError("Texture must be a non-null object.");
    }

    const protoMethods = this.hookedMethods.get(texture);
    if (protoMethods) {
      protoMethods.forEach((original, methodName) => {
        (texture as { [key: string]: any })[methodName] = original;
      });
      this.hookedMethods.delete(texture);
    }
    return texture;
  }

  // todo: maybe bindDestroyHook

}