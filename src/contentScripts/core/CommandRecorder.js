import { Serializer } from "../utils/Serializer";


export class CommandRecorder {
  
  commandQueue = [];
  currentCommandBuffer = [];

  constructor() {
    this.startCommandBuffer();
  }

  /**
   * @brief 开始记录一帧
   */
  startCommandBuffer() {
    this.currentCommandBuffer = [];
  }

  /**
   * @brief 记录一帧的命令
   */
  recordCommand(type, args) {
    this.currentCommandBuffer.push({
      type,
      args: {args},
      timestamp: performance.now()
    });
  }

  getAllCommands() {
    return this.currentCommandBuffer;
  }

  // commitCommandBuffer() {
  //   commandQueue.push(currentCommandBuffer);
  //   currentCommandBuffer = [];
  // }
}