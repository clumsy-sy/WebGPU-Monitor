import { ResourceTracker } from "./resource-tracker";
import { CommandTracker } from "./command-tracker";
import { Msg, MsgLevel } from "../../global/message";
import { APIRecorder } from "./api-recorder";


export class FrameRecorder {
  res = ResourceTracker.getInstance();
  cmd = CommandTracker.getInstance();
  api = APIRecorder.getInstance();

  private msg = Msg.getInstance();
  /**
   * 帧记录器
   */
  private static instance: FrameRecorder;
  private constructor() { }

  public static getInstance() {
    if (!FrameRecorder.instance) {
      FrameRecorder.instance = new FrameRecorder();
    }
    return FrameRecorder.instance;
  }
  // 状态
  captureState = {
    msg: false,
    active: false,
  }

  curFrame: number = 0;
  frameStartTime: number = 0;
  frameEndTime: number = 0;
  frameWidth: number = 0;
  frameHeight: number = 0;


  CanvasConf: GPUCanvasConfiguration | {} = {};
  AdapterOptions: GPURequestAdapterOptions | {} = {};
  deviceDesc: GPUDeviceDescriptor | {} = {};

  setFrameStartTime(time: number) {
    this.frameStartTime = time;
  }

  setFrameEndTime(time: number) {
    this.frameEndTime = time;
  }

  setFrameSize(width: number, height: number) {
    this.frameWidth = width;
    this.frameHeight = height;
  }

  reset() {
    this.res.destory();
    this.cmd.destory();
    this.res = ResourceTracker.getInstance();
    this.cmd = CommandTracker.getInstance();
    this.curFrame = 0;
    this.frameStartTime = 0;
    this.frameEndTime = 0;
    this.frameWidth = 0;
    this.frameHeight = 0;
    this.msg.log(MsgLevel.level_1, "FrameRecorder reset ------------------");
  }

  clear() {
    this.curFrame = 0;
    this.frameStartTime = 0;
    this.frameEndTime = 0;
    this.frameWidth = 0;
    this.frameHeight = 0;
    this.cmd.destory();
    this.cmd = CommandTracker.getInstance();
    this.msg.log(MsgLevel.level_1, "FrameRecorder clear -----------------");
  }

  trackCanvasConf(conf: GPUCanvasConfiguration) {
    this.CanvasConf = conf;
  }

  trackAdapterOptions(options: GPURequestAdapterOptions) {
    this.AdapterOptions = { options };
  }

  trackDeviceDesc(desc: GPUDeviceDescriptor) {
    this.deviceDesc = { desc };
  }

  outputFrame() {
    let frame = {
      frameID: this.curFrame,
      frameStartTime: this.frameStartTime,
      frameEndTime: this.frameEndTime,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      CanvasConfiguration: this.CanvasConf,
      AdapterOptions: this.AdapterOptions,
      deviceDescriptor: this.deviceDesc,
      // resource: this.res.getAllResources(),
      resource: this.res.getAllResourcesValues(),
      command: this.cmd.getAllCmds(),
      // api: this.api.getAllRecords(),
    };
    return frame;
  }

  jsonLog() {
    this.msg.log(MsgLevel.level_2, "[Frame]-------------------------------");
    this.msg.log(MsgLevel.level_2, JSON.stringify(this.outputFrame(), (key, value) => {
      if (key === 'data' && Array.isArray(value)) {
        return JSON.stringify(value); // 将数组压缩为一行
      }
      return value;
    }, 2));
    this.msg.log(MsgLevel.level_2, "[Frame]-------------------------------");
  }

  APILog() {
    this.msg.log(MsgLevel.level_3, "[API]-------------------------------");
    this.msg.log(MsgLevel.level_3, this.api.getAllRecords());
    this.msg.log(MsgLevel.level_3, "[API]-------------------------------");
  }

}