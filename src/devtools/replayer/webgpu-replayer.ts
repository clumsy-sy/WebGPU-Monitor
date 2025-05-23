import { WebGPUResourcePool} from "./webgpu-resource-pool"
import { FrameDataType } from "./webgpu-types";
import { Msg, MsgLevel } from "../../global/message";
import { WebGPUCmdPool } from "./webgpu-cmd-pool";
import { ResInfo } from "../../global/utils";
import { TextureViewer } from "./webgpu-texture-viewer";
// import { TextureViewer } from "../core/TextureViewer";

const ResPool = WebGPUResourcePool.getInstance();
const CmdPool = WebGPUCmdPool.getInstance();
const msg = Msg.getInstance();

export class WebGPUReplayer{
  private device!: GPUDevice;
  private canvas!: HTMLCanvasElement;
  private FrameJSONRawData: string;
  private FrameData: FrameDataType;

  private textureViewer!: TextureViewer;

  constructor(data: string) { 
    this.FrameJSONRawData = data;
    this.FrameData = JSON.parse(this.FrameJSONRawData) as FrameDataType;
    if(this.FrameData) {
      msg.log(MsgLevel.level_1, "[panel] frameData init");
      console.log("[panel] frameData:", this.FrameData);
    } else {
      throw new Error('[replayer] frameData is null');
    }
  }

  /**
   * 初始化 WebGPU 设备
   */
  async initialize() {
    // 检查是否支持 WebGPU
    if (!navigator.gpu) {
      throw new Error('[hook] WebGPU is not supported in your browser.');
    } 
    let adapter;
    adapter = await navigator.gpu.requestAdapter(this.FrameData.AdapterOptions);
    this.device = await adapter!.requestDevice(this.FrameData.deviceDescriptor);
    if(!this.device) {
      console.error('WebGPU device not Initialized');
    }
    // 设置 WebGPU 设备
    ResPool.setDevice(this.device);
    if (this.canvas) {
      const context = this.canvas.getContext('webgpu') as GPUCanvasContext;
      context.configure({
        device: this.device,
        format: (this.FrameData.CanvasConfiguration  as GPUCanvasConfiguration).format,
        alphaMode: (this.FrameData.CanvasConfiguration  as GPUCanvasConfiguration).alphaMode,
      });
      ResPool.setGPUContext(context);
    }
    CmdPool.setDevice(this.device);
  }

  async replayFrame(mainCanvasId?: string, canvasId?: string, selectId?: string) {
    // replay start ----------
    msg.log(MsgLevel.level_1, "[replayer] replay start")
    // ---------------------
    if(mainCanvasId) {
      this.canvas = document.getElementById(mainCanvasId) as HTMLCanvasElement;
      this.canvas.width = this.FrameData.frameWidth;
      this.canvas.height = this.FrameData.frameHeight;
    }
    // 初始化 WebGPU 设备
    await this.initialize();

    // 初始化 TextureViewer
    if (canvasId && selectId) {
      this.textureViewer = new TextureViewer(canvasId, selectId, this.device);
    }

    // 重建 resource
    this.storeAllResources();
    // 执行 WebGPU command
    this.storeAllCmd();
    this.executeCommand();
    // ---------------------

    if (this.textureViewer) {
      this.textureViewer.addTextureViews(ResPool.getTextureViews());
    }
    // Test
    console.log("[replayer] resources: ", ResPool.getAll());
    msg.log(MsgLevel.level_1, "[replayer] replay end")
    // replay end ----------
  }

  storeAllResources() {
    const resources: Array<ResInfo> = this.FrameData.resources;
    resources.forEach(res => {
      ResPool.storeResource(res.id, res);
    });
  }


  createResource() {
  }


  storeAllCmd() {
    CmdPool.addCmdArr(this.FrameData.command);
  }

  executeCommand() {
    CmdPool.executeCommands();
  }

};
