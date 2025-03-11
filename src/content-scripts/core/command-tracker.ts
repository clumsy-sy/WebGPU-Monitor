import { Utils, cmdInfo } from "../../global/utils";
import { Msg } from "../../global/message";
import { ResourceTracker } from "./resource-tracker"

enum PassCmdType{
  RenderPass = "RenderPass",
  ComputePass = "ComputePass",
};

export class PassTracker{
  // 资源库实例
  static ResTracker: ResourceTracker = ResourceTracker.getInstance();
  // renderpass id
  PassID: number = 0;
  // renderpass 类型
  type: GPURenderPassEncoder | GPUComputePassEncoder | undefined;
  // 命令队列
  CmdQueue: {type: string, args: any}[] = [];
  // 是否结束
  IsEnd: boolean = false;

  constructor(type: GPURenderPassEncoder | GPUComputePassEncoder | undefined){
    this.type = type;
  }

  /**
   * @brief 命令记录
   * @param type 类型
   * @param args 参数
   */
  recordCmd(type: string, args: any){
    this.CmdQueue.push({type, args});
  }

  setPassID(id: number){
    this.PassID = id;
  }
  getPassID(){
    return this.PassID;
  }

  setEnd(){
    this.IsEnd = true;
  }
  checkEnd(){
    return this.IsEnd;
  }

  getAllCmds(){
    return this.CmdQueue;
  }

  destory(){
    this.CmdQueue = [];
    this.IsEnd = false;
  }

}

export class EncoderTracker{
  EncoderID: number = 0;
  PassCnt: number = 0;
  PassQueue: PassTracker[] = [];
  IsSubmit: boolean = false;

  constructor(id: number){
    this.EncoderID = id;
  }

  setEncoderID(id: number){
    this.EncoderID = id;
  }

  getEncoderID(){
    return this.EncoderID;
  }

  getAllPasses(){
    return this.PassQueue;
  }

  setSubmit(){
    this.IsSubmit = true;
  }

  checkSubmit(){
    return this.IsSubmit;
  }

  addPass(pass: PassTracker){
    pass.setPassID(this.PassCnt++);
    this.PassQueue.push(pass);
  }

  getPass(id: number){
    return this.PassQueue.find(pass => pass.getPassID() === id);
  }

  destory(){
    for(let i = 0; i < this.PassQueue.length; i++){
      this.PassQueue[i].destory();
    }
    this.PassQueue = [];
  }
}

// export class WriteTracker{
//   // 资源库实例
//   static ResTracker: ResourceTracker = ResourceTracker.getInstance();
//   WriteQueue: any[] = [];

//   constructor(){
//   }

//   getAllWrites(){
//     return this.WriteQueue;
//   }

//   addWrite(write: any){
//     this.WriteQueue.push(write);
//   }

//   destory(){
//     this.WriteQueue = [];
//   }

// }

export class CommandTracker{
  /**
   * @brief CommandTracker 单例
   */
  private static instance: CommandTracker;
  private constructor() {}
  public static getInstance() {
    if (!CommandTracker.instance) {
      CommandTracker.instance = new CommandTracker();
    }
    return CommandTracker.instance;
  }

  // command event id
  Eid: number = 0;
  CmdQueue: (EncoderTracker|cmdInfo)[] = [];

  // 临时变量
  tempEncoder: EncoderTracker | null = null;
  tempPass: PassTracker | null = null;

  recordCmd(type: string, args: any){
    let eid: number = this.Eid++;
    let time: number = performance.now();
    const cmd: cmdInfo = { eid, type, args , time }
    this.CmdQueue.push(cmd);
  }

  getAllCmds(){
    this.CmdQueue.forEach(cmd => {
      if(cmd instanceof EncoderTracker){
        
      }
    });
    return this.CmdQueue;
  }

  destory(){
    this.CmdQueue.forEach(cmd => {
      if(cmd instanceof EncoderTracker){
        cmd.destory();
      }
    });
  }

}