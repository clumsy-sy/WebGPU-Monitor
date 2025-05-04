import { cmdInfo, ComputePassRecord, EncoderBaseCmd, EncoderCmd, RenderPassRecord, ResInfo, ResourceType } from "../../global/utils"
import { WebGPUResourcePool } from "./webgpu-resource-pool";

const resPool = WebGPUResourcePool.getInstance();

export class WebGPUCmdPool {
  /**
   * @brief 单例模式，用于创建命令池。
   */
  private static instance: WebGPUCmdPool;
  private constructor() { }
  public static getInstance() {
    if (!WebGPUCmdPool.instance) {
      WebGPUCmdPool.instance = new WebGPUCmdPool();
    }
    return WebGPUCmdPool.instance;
  }

  // WebGPU device
  private device: GPUDevice | null = null;
  private queue: GPUQueue | null = null;

  private cmdArr:Array<(EncoderCmd | cmdInfo)> = [];


  setDevice(device: GPUDevice) {
    this.device = device;
    this.queue = device.queue;
  }

  checkDevice() {
    if (!this.device || !this.queue) {
      throw new Error('[res]device or queue is null');
    }
  }

  public addCmdArr(arr: Array<(EncoderCmd | cmdInfo)>) {
    this.cmdArr = arr;
  }

  public executeCommands() {
    this.checkDevice();
    for (let i = 0; i < this.cmdArr.length; i++) {
      const cmd = this.cmdArr[i];
      switch (cmd.type) {
        case 'GPUCommandEncoder':
          this.executeCommandEncoder(cmd as EncoderCmd);
          break;
        case 'writeBuffer':
          const arrArg = resPool.resolveResArr(cmd.args);
          this.queue?.writeBuffer(arrArg[0], arrArg[1], arrArg[2], arrArg[3], arrArg[4]);
          break;
        case 'submit':
          console.log("[cmd]submit commandBuffer: ", resPool.getAllCmdBuffer());
          this.queue?.submit(resPool.getAllCmdBuffer());
          break;
      }
    }
  }

  public executeCommandEncoder(commandEncoder: EncoderCmd) {
    this.checkDevice();
    const encoder = this.device?.createCommandEncoder(resPool.resolveRes(commandEncoder.descriptor));
    
    if(encoder == null) {
      throw new Error('[res]encoder is null');
    }
    
    const cmds = commandEncoder.cmds;
    cmds.forEach((cmd) => {
      switch (cmd.basetype) {
        case 'GPURenderPass':
          this.executeRenderPass(encoder, cmd as RenderPassRecord);
          break;
        case 'GPUComputePass':
          this.executeComputePass(encoder, cmd as ComputePassRecord);
          break;
        case 'baseCmd':
          this.executeBaseCmd(encoder, cmd as EncoderBaseCmd);
          break;
        default:
          throw new Error('[res]command type is not supported');
      }
    })
  }

  private executeRenderPass(encoder: GPUCommandEncoder, pass: RenderPassRecord) { 
    const descriptor: GPURenderPassDescriptor = resPool.resolveRes(pass.descriptor);
    console.log("[cmd]RenderPass descriptor:", descriptor);
    const RenderPass = encoder.beginRenderPass(descriptor);
    const cmds = pass.cmds;
    cmds.forEach((cmd) => {
      (RenderPass as any)[cmd.type](...resPool.resolveRes(cmd.args));
    })
  }

  private executeComputePass(encoder: GPUCommandEncoder, pass: ComputePassRecord) { 
    const descriptor: GPUComputePassDescriptor = resPool.resolveRes(pass.descriptor);
    console.log("[cmd]ComputePass descriptor:", descriptor);
    const ComputePass = encoder.beginComputePass(descriptor);
    const cmds = pass.cmds;
    cmds.forEach((cmd) => {
      (ComputePass as any)[cmd.type](...resPool.resolveRes(cmd.args));
    })
  }

  private executeBaseCmd(encoder: GPUCommandEncoder, cmd: EncoderBaseCmd) { 
    switch (cmd.type) {
      case 'finish':
        const commandbuffer = encoder.finish(resPool.resolveRes(cmd.args));
        resPool.addCmdBuffer(commandbuffer);
        break;
      default:
        (encoder as any)[cmd.type](resPool.resolveRes(cmd.args));
        break;
    }
  }

}