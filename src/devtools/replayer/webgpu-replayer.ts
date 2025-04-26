import { WebGPUResourcePool} from "./webgpu-resource-pool"
import { FrameDataType } from "./webgpu-types";
import { Msg, MsgLevel } from "../../global/message";

const pool = WebGPUResourcePool.getInstance();
const msg = Msg.getInstance();

export class WebGPUReplayer{
  private device!: GPUDevice;
  private FrameJSONRawData: string;
  private FrameData: FrameDataType;

  constructor(data: string) { 
    this.FrameJSONRawData = data;
    this.FrameData = JSON.parse(this.FrameJSONRawData) as FrameDataType;
    if(this.FrameData) {
      console.log("[panel] frameData:", this.FrameData);
      console.log("[panel] canvasWidth:", this.FrameData.frameWidth);
      console.log("[panel] canvasHeight:", this.FrameData.frameHeight);
    } else {
      throw new Error('[replayer] frameData is null');
    }
    msg.log(MsgLevel.level_1, "[panel] frameData init");
    console.log("[panel] frameData : ", this.FrameData);
  }

  /**
   * 初始化 WebGPU 设备
   */
  async initialize() {
    // 检查是否支持 WebGPU
    if (!navigator.gpu) {
      throw new Error('[hook] WebGPU is not supported in your browser.');
    } 

    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter!.requestDevice();
    if(!this.device) {
      console.error('WebGPU device not Initialized');
    }
  }

  replayFrame() {
    // replay start ----------
    msg.log(MsgLevel.level_1, "[replayer] replay start")
    // ---------------------



    // ---------------------
    msg.log(MsgLevel.level_1, "[replayer] replay end")
    // replay end ----------
  }

};
