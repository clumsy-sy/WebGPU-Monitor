import { Utils, cmdInfo } from "../../global/utils";
import { Msg } from "../../global/message";
import { ResourceTracker } from "./resource-tracker"

enum PassCmdType{
  RenderPass = "RenderPass",
  ComputePass = "ComputePass",
};

interface EncoderCmd {
  id: number,
  type: 'GPUCommandEncoder',
  descriptor: GPUCommandEncoderDescriptor | undefined;
  cmds: (RenderPassRecord|ComputePassRecord|EncoderBaseCmd)[],
  timeStamp: number
}


interface EncoderBaseCmd {
  eid: number,
  basetype: 'baseCmd';
  type: string;
  args: any[];
}

interface RenderPassRecord {
  id: number;
  eid: number;
  basetype: 'GPURenderPass';
  cmds: { type: string; args: any[] }[];
  descriptor: GPURenderPassDescriptor | undefined;
}

interface ComputePassRecord {
  id: number;
  eid: number;
  basetype: 'GPUComputePass';
  cmds: { type: string; args: any[] }[];
  descriptor: GPUComputePassDescriptor | undefined;
}

export class RenderPassTracker{
  // 资源库实例
  static res: ResourceTracker = ResourceTracker.getInstance();
  // 消息实例
  static msg = Msg.getInstance();
  // renderpass id
  PassID: number = 0;
  // renderpass 类型
  descriptor: GPURenderPassDescriptor | undefined;
  // 命令队列
  CmdQueue: {eid: number, type: string, args: any[]}[] = [];
  // 是否结束
  IsEnd: boolean = false;
  startEid: number = 0;

  constructor(eid:number, desc?: GPURenderPassDescriptor){
    this.startEid = eid;
    this.descriptor = desc;
  }

  /**
   * @brief 命令记录
   * @param type 类型
   * @param args 参数
   */
  recordCmd(eid: number, type: string, args: any[]){
    if(this.IsEnd === true) {
      RenderPassTracker.msg.error('[cmd]recordCmd : render pass already end', type);
    }
    if(type === 'end') this.setEnd();
    RenderPassTracker.msg.log('[cmd]recordCmd : ', type, args);
    RenderPassTracker.res.replaceResourcesInArray(args);
    RenderPassTracker.msg.log('[cmd]recordCmd : ', args);
    this.CmdQueue.push({eid, type, args});
  }

  outputRecord(): RenderPassRecord{
    const pass: RenderPassRecord = {
      id: this.PassID,
      eid: this.startEid,
      basetype: 'GPURenderPass',
      cmds: this.CmdQueue,
      descriptor: this.descriptor
    }
    return pass;
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
    this.IsEnd = false;
    this.CmdQueue = [];
  }

}

export class ComputePassTracker{
  // 资源库实例
  static res: ResourceTracker = ResourceTracker.getInstance();
  // 消息实例
  static msg = Msg.getInstance();
  // Computepass id
  PassID: number = 0;
  // Computepass 类型
  descriptor: GPUComputePassDescriptor| undefined;
  // 命令队列
  CmdQueue: {eid: number, type: string, args: any[]}[] = [];
  // 是否结束
  IsEnd: boolean = false;
  startEid: number = 0;

  constructor(eid: number, desc?: GPUComputePassDescriptor){
    this.startEid = eid;
    this.descriptor = desc;
  }

  /**
   * @brief 命令记录
   * @param type 类型
   * @param args 参数
   */
  recordCmd(eid: number, type: string, args: any[]){
    if(this.IsEnd === true) {
      ComputePassTracker.msg.error('[cmd]recordCmd : render pass already end', type);
    }
    if(type === 'end') this.setEnd();
    ComputePassTracker.res.replaceResourcesInArray(args);
    this.CmdQueue.push({eid, type, args});
  }

  outputRecord(): ComputePassRecord{
    const pass: ComputePassRecord = {
      id: this.PassID,
      eid: this.startEid,
      basetype: 'GPUComputePass',
      cmds: this.CmdQueue,
      descriptor: this.descriptor
    }
    return pass;
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
    this.IsEnd = false;
    this.CmdQueue = [];
  }

}


export class EncoderTracker{
  private static msg = Msg.getInstance();
  private static res = ResourceTracker.getInstance();

  EncoderID: number = 0;
  PassCnt: number = 0;
  cmdQueue: (RenderPassTracker|ComputePassTracker|{eid:number, type: string, args: any[]})[] = [];
  IsSubmit: boolean = false;
  timeStamp: number = 0;
  descriptor: GPUCommandEncoderDescriptor | undefined;

  passMap: Map<number, (RenderPassTracker|ComputePassTracker)> = new Map();

  constructor(id: number, desc?: GPUCommandEncoderDescriptor){
    this.EncoderID = id;
    this.timeStamp = performance.now();
    this.descriptor = desc;
  }

  createPass(eid: number, id: number, type: string, desc: GPUComputePassDescriptor | GPUComputePassDescriptor | undefined){
    if(type === 'beginRenderPass') {
      const pass = new RenderPassTracker(eid, desc as GPURenderPassDescriptor);
      this.cmdQueue.push(pass);
      this.passMap.set(id, pass);
      this.PassCnt ++;
      return pass;
    } else if ( type === 'beginComputePass'  ){
      const pass = new ComputePassTracker(eid, desc as GPUComputePassDescriptor);
      this.cmdQueue.push(pass);
      this.passMap.set(id, pass);
      this.PassCnt ++;
      return pass;
    } else {
      EncoderTracker.msg.error('[cmd]recordPasscmd : pass type error', type);
    }
  }

  recordPassCmd(passID: number, eid: number, type: string, args: any[]) {
    if(!this.passMap.has(passID)) {
      EncoderTracker.msg.error('[cmd]recordPasscmd : pass not found', passID);
    }
    this.passMap.get(passID)?.recordCmd(eid, type, args);
  }

  recordCmd(eid:number, type: string, args: any[]){
    EncoderTracker.res.replaceResourcesInArray(args);
    this.cmdQueue.push({eid, type, args});
  }

  outputRecord(): EncoderCmd{
    const records: (EncoderBaseCmd| RenderPassRecord | ComputePassRecord)[] = [];

    for (const item of this.cmdQueue) {
      if (item instanceof RenderPassTracker) {
        // 处理 RenderPass 对象
        records.push(item.outputRecord());
      } else if (item instanceof ComputePassTracker) {
        // 处理 ComputePass 对象
        records.push(item.outputRecord());
      } else {
        // 处理普通命令
        records.push({
          eid: item.eid,
          basetype: 'baseCmd', // 标记普通命令类型
          type: item.type,
          args: item.args
        });
      }
    }
    const encoder: EncoderCmd = {
      id: this.EncoderID,
      type: 'GPUCommandEncoder',
      descriptor: this.descriptor,
      cmds: records,
      timeStamp: this.timeStamp
    }
    return encoder;
  }

  getPass(id: number){
    return this.passMap.get(id);
  }

  setEncoderID(id: number){
    this.EncoderID = id;
  }

  getEncoderID(){
    return this.EncoderID;
  }

  getAllPasses(){
    return this.passMap.values();
  }

  setSubmit(){
    this.IsSubmit = true;
  }

  checkSubmit(){
    return this.IsSubmit;
  }


  destory(){
    for (const item of this.cmdQueue) {
      if (item instanceof RenderPassTracker || item instanceof ComputePassTracker) {
        item.destory();
      }
    }
    this.cmdQueue = [];
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

  private static res = ResourceTracker.getInstance();
  private static msg = Msg.getInstance();

  // command event id
  Eid: number = 0;
  CmdQueue: (EncoderTracker|cmdInfo)[] = [];
  CmdMap: Map<number, EncoderTracker> = new Map();

  recordCmd(type: string, args: any[]){
    let eid: number = this.Eid++;
    let time: number = performance.now();
    const cmd: cmdInfo = { eid, type, args, time }
    this.CmdQueue.push(cmd);
  }

  recordEncoderCreate(encoderID: number, desc?: GPUCommandEncoderDescriptor){
    const encoder: EncoderTracker = new EncoderTracker(encoderID, desc);
    this.CmdMap.set(encoderID, encoder);
    this.CmdQueue.push(encoder);
  }

  recordEncodercmd(encoderID: number, type: string, args: any[]){
    if(!this.CmdMap.has(encoderID)) {
      CommandTracker.msg.error('[cmd]recordEncodercmd : encoder not found', encoderID);
    }
    const encoder = this.CmdMap.get(encoderID) as EncoderTracker;
    encoder.recordCmd(this.Eid++, type, args);
  }

  recoderPassCreate(encoderID: number, passID: number, type: string, desc: any) {
    if(!this.CmdMap.has(encoderID)) {
      CommandTracker.msg.error('[cmd]recoderPassCreate : encoder not found', encoderID);
    }
    const encoder = this.CmdMap.get(encoderID) as EncoderTracker;
    encoder.createPass(this.Eid++, passID, type, desc);
    CommandTracker.msg.log('[cmd]recoderPassCreate : pass created', encoderID, passID, type, desc)
  }

  recordPassCmd(encoderID: number, passID: number, type: string, args: any[]) {
    if(!this.CmdMap.has(encoderID)) {
      CommandTracker.msg.error('[cmd]recordPasscmd : encoder not found', encoderID);
    }
    const encoder = this.CmdMap.get(encoderID) as EncoderTracker;
    if(!encoder.passMap.has(passID)) {
      CommandTracker.msg.error('[cmd]recordPasscmd : pass not found', 'passID = ' ,passID);
    }
    const pass = encoder.passMap.get(passID);
    if( pass instanceof RenderPassTracker) {
      pass.recordCmd(this.Eid++, type, args);
    } else if( pass instanceof ComputePassTracker){
      pass.recordCmd(this.Eid++, type, args);
    }
  }

  getAllCmds(){
    const recoders: (EncoderCmd|cmdInfo)[] = [];
    this.CmdQueue.forEach(cmd => {
      if(cmd instanceof EncoderTracker){
        recoders.push(cmd.outputRecord());
      } else {
        recoders.push(cmd);
      }
    });
    return recoders;
  }

  destory(){
    this.CmdQueue.forEach(cmd => {
      if(cmd instanceof EncoderTracker){
        cmd.destory();
      }
    });
  }

}