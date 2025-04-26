import { EncoderCmd, EncoderBaseCmd, RenderPassRecord, ComputePassRecord , cmdInfo } from "../../global/utils";
import { Msg } from "../../global/message";
import { ResourceTracker } from "./resource-tracker"
// 资源库实例
const res = ResourceTracker.getInstance();
// 消息实例
const msg = Msg.getInstance();

enum PassCmdType {
  RenderPass = "RenderPass",
  ComputePass = "ComputePass",
};

/**
 * @class RenderPassTracker
 * @brief 封装renderpass相关命令
 */
export class RenderPassTracker {

  // renderpass id
  PassID: number = 0;
  // renderpass 类型
  descriptor: GPURenderPassDescriptor | undefined;
  // 命令队列
  CmdQueue: { eid: number, type: string, args: any[] }[] = [];
  // 是否结束
  IsEnd: boolean = false;
  startEid: number = 0;

  /**
   * @param eid event id
   * @param desc type GPURenderPassDescriptor
   */
  constructor(eid: number, desc?: GPURenderPassDescriptor) {
    this.startEid = eid;
    const descCopy = res.replaceResourcesInDesc(desc);
    this.descriptor = descCopy;
  }

  /**
   * @brief 命令记录
   * @param eid event id
   * @param type 命令类型
   * @param args 命令参数[]
   */
  recordPassCmd(eid: number, type: string, args: any[]) {
    if (this.IsEnd === true) {
      msg.error('[cmd]recordCmd : render pass already end', type);
    }
    if (type === 'end') this.setEnd();
    const resArrCopy = res.replaceResourcesInArray(args);
    this.CmdQueue.push({ eid, type, args: resArrCopy });
  }

  /**
   * @returns renderpass记录
   */
  outputRecord(): RenderPassRecord {
    const pass: RenderPassRecord = {
      id: this.PassID,
      eid: this.startEid,
      basetype: 'GPURenderPass',
      cmds: this.CmdQueue,
      descriptor: this.descriptor
    }
    return pass;
  }

  setPassID(id: number) {
    this.PassID = id;
  }
  getPassID() {
    return this.PassID;
  }
  setEnd() {
    this.IsEnd = true;
  }
  checkEnd() {
    return this.IsEnd;
  }
  getAllCmds() {
    return this.CmdQueue;
  }
  destory() {
    this.IsEnd = false;
    this.CmdQueue = [];
  }

}

/**
 * @class ComputePassTracker
 * @brief 封装computePass相关命令
 */
export class ComputePassTracker {
  // Computepass id
  PassID: number = 0;
  // Computepass 类型
  descriptor: GPUComputePassDescriptor | undefined;
  // 命令队列
  CmdQueue: { eid: number, type: string, args: any[] }[] = [];
  // 是否结束
  IsEnd: boolean = false;
  startEid: number = 0;

  /**
   * @param eid event id
   * @param desc type GPUComputePassDescriptor
   */
  constructor(eid: number, desc?: GPUComputePassDescriptor) {
    this.startEid = eid;
    const descCopy = res.replaceResourcesInDesc(desc);
    this.descriptor = descCopy;
  }

  /**
   * @brief 命令记录
   * @param eid event id
   * @param type 命令类型
   * @param args 命令参数[]
   */
  recordPassCmd(eid: number, type: string, args: any[]) {
    if (this.IsEnd === true) {
      msg.error('[cmd]recordCmd : render pass already end', type);
    }
    if (type === 'end') this.setEnd();
    const resArrCopy = res.replaceResourcesInArray(args);
    this.CmdQueue.push({ eid, type, args: resArrCopy });
  }

  /**
   * @returns computePass记录
   */
  outputRecord(): ComputePassRecord {
    const pass: ComputePassRecord = {
      id: this.PassID,
      eid: this.startEid,
      basetype: 'GPUComputePass',
      cmds: this.CmdQueue,
      descriptor: this.descriptor
    }
    return pass;
  }

  setPassID(id: number) {
    this.PassID = id;
  }
  getPassID() {
    return this.PassID;
  }
  setEnd() {
    this.IsEnd = true;
  }
  checkEnd() {
    return this.IsEnd;
  }
  getAllCmds() {
    return this.CmdQueue;
  }
  destory() {
    this.IsEnd = false;
    this.CmdQueue = [];
  }

}

/**
 * @class EncoderTracker
 * @brief 封装 Enocder
 */
export class EncoderTracker {
  // 命令队列 id
  EncoderID: number = 0;
  // pass number
  PassCnt: number = 0;
  // pass []
  cmdQueue: (RenderPassTracker | ComputePassTracker | { eid: number, type: string, args: any[] })[] = [];
  // 是否提交
  IsSubmit: boolean = false;
  // 时间
  timeStamp: number = 0;
  // Encoder 描述符
  descriptor: GPUCommandEncoderDescriptor | undefined;
  // pass map
  passMap: Map<number, (RenderPassTracker | ComputePassTracker)> = new Map();

  /**
   * @param id encoder id
   * @param desc type GPUCommandEncoderDescriptor
   */
  constructor(id: number, desc?: GPUCommandEncoderDescriptor) {
    this.EncoderID = id;
    this.timeStamp = performance.now();
    const descCopy = res.replaceResourcesInDesc(desc);
    this.descriptor = descCopy;
  }

  /**
   * @brief 创建pass
   * @param eid event id
   * @param id pass id
   * @param type pass 类型
   * @param desc 描述 GPUComputePassDescriptor | GPUComputePassDescriptor
   */
  createPass(eid: number, id: number, type: string, desc: GPUComputePassDescriptor | GPUComputePassDescriptor | undefined) {
    if (type === 'beginRenderPass') {
      const pass = new RenderPassTracker(eid, desc as GPURenderPassDescriptor);
      this.cmdQueue.push(pass);
      this.passMap.set(id, pass);
      this.PassCnt++;
      return pass;
    } else if (type === 'beginComputePass') {
      const pass = new ComputePassTracker(eid, desc as GPUComputePassDescriptor);
      this.cmdQueue.push(pass);
      this.passMap.set(id, pass);
      this.PassCnt++;
      return pass;
    } else {
      msg.error('[cmd]recordPasscmd : pass type error', type);
    }
  }

  /**
   * @brief 记录 pass 的命令
   * @param passID pass id
   * @param eid event id
   * @param type 命令类型
   * @param args 命令参数 any[]
   */

  recordPassCmd(passID: number, eid: number, type: string, args: any[]) {
    if (!this.passMap.has(passID)) {
      msg.error('[cmd]recordPasscmd : pass not found', passID);
    }
    console.log(`passid = ${passID} ${type}`);
    this.passMap.get(passID)?.recordPassCmd(eid, type, args);
  }

  /**
   * @brief 记录 encoder 的命令
   * @param eid event id
   * @param type 命令类型
   * @param args 命令参数 any[]
   */
  recordEncoderCmd(eid: number, type: string, args: any[]) {
    const resArrCopy = res.replaceResourcesInArray(args);
    this.cmdQueue.push({ eid, type, args: resArrCopy });
  }

  /**
   * @returns All Encoder command 
   */
  outputRecord(): EncoderCmd {
    const records: (EncoderBaseCmd | RenderPassRecord | ComputePassRecord)[] = [];

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

  getPass(id: number) {
    return this.passMap.get(id);
  }
  setEncoderID(id: number) {
    this.EncoderID = id;
  }
  getEncoderID() {
    return this.EncoderID;
  }
  getAllPasses() {
    return this.passMap.values();
  }
  setSubmit() {
    this.IsSubmit = true;
  }
  checkSubmit() {
    return this.IsSubmit;
  }
  destory() {
    for (const item of this.cmdQueue) {
      if (item instanceof RenderPassTracker || item instanceof ComputePassTracker) {
        item.destory();
      }
    }
    this.cmdQueue = [];
  }

}

/**
 * @class CommandTracker
 * @brief 封装 所有 CommandBuffer 内部的命令
 */
export class CommandTracker {
  /**
   * @brief CommandTracker 单例
   */
  private static instance: CommandTracker;
  private constructor() { }
  public static getInstance() {
    if (!CommandTracker.instance) {
      CommandTracker.instance = new CommandTracker();
    }
    return CommandTracker.instance;
  }

  // 分发 event id
  Eid: number = 0;
  // 命令队列 EncoderTracker | cmdInfo
  CmdQueue: (EncoderTracker | cmdInfo)[] = [];
  // 资源管理
  CmdMap: Map<number, EncoderTracker> = new Map();

  // todo sort cmd
  recordCmd(type: string, args: any[]) {
    let eid: number = this.Eid++;
    let time: number = performance.now();
    const resArrCopy = res.replaceResourcesInArray(args);
    const cmd: cmdInfo = { eid, type, args: resArrCopy, time }
    this.CmdQueue.push(cmd);
  }

  /**
   * @brief 记录 encoder 创建
   * @param encoderID encoder id
   * @param desc type GPUCommandEncoderDescriptor
   */
  recordEncoderCreate(encoderID: number, desc?: GPUCommandEncoderDescriptor) {
    const encoder: EncoderTracker = new EncoderTracker(encoderID, desc);
    this.CmdMap.set(encoderID, encoder);
    this.CmdQueue.push(encoder);
  }

  /**
   * @brief 记录 encoder 命令
   * @param encoderID encoder id
   * @param type 命令类型
   * @param args 命令参数 any[]
   */
  recordEncodercmd(encoderID: number, type: string, args: any[]) {
    if (!this.CmdMap.has(encoderID)) {
      msg.error('[cmd]recordEncodercmd : encoder not found', encoderID);
    }
    const encoder = this.CmdMap.get(encoderID) as EncoderTracker;
    encoder.recordEncoderCmd(this.Eid++, type, args);
  }

  /**
   * @brief 记录 pass 创建
   * @param encoderID encoder id
   * @param passID pass id
   * @param type pass 类型
   * @param desc 描述 GPUComputePassDescriptor | GPUComputePassDescriptor
   */

  recoderPassCreate(encoderID: number, passID: number, type: string, desc: any) {
    if (!this.CmdMap.has(encoderID)) {
     msg.error('[cmd]recoderPassCreate : encoder not found', encoderID);
    }
    const encoder = this.CmdMap.get(encoderID) as EncoderTracker;
    encoder.createPass(this.Eid++, passID, type, desc);
  }

  /**
   * @brief 记录 pass 命令
   * @param encoderID encoder id
   * @param passID pass id
   * @param type pass 类型
   * @param args 命令参数 any[]
   */
  recordPassCmd(encoderID: number, passID: number, type: string, args: any[]) {
    if (!this.CmdMap.has(encoderID)) {
      msg.error('[cmd]recordPasscmd : encoder not found', encoderID);
    }
    const encoder = this.CmdMap.get(encoderID) as EncoderTracker;
    if (!encoder.passMap.has(passID)) {
      msg.error('[cmd]recordPasscmd : pass not found', 'passID = ', passID);
    }
    const pass = encoder.passMap.get(passID);
    if (pass instanceof RenderPassTracker) {
      pass.recordPassCmd(this.Eid++, type, args);
    } else if (pass instanceof ComputePassTracker) {
      pass.recordPassCmd(this.Eid++, type, args);
    }
  }

  // 获取所有命令
  getAllCmds() {
    const recoders: (EncoderCmd | cmdInfo)[] = [];
    this.CmdQueue.forEach(cmd => {
      if (cmd instanceof EncoderTracker) {
        recoders.push(cmd.outputRecord());
      } else {
        recoders.push(cmd);
      }
    });
    return recoders;
  }

  destory() {
    this.CmdQueue.forEach(cmd => {
      if (cmd instanceof EncoderTracker) {
        cmd.destory();
      }
    });
  }

}