/**
 * @brief CommandBuffer 命令记录器
 */
class CommandBufferRecorder {
  commandBufferID = 0;
  commands = [];
  constructor() {
    this.commands = [];
  }
  recordCommand(type, args) {
    this.commands.push({
      type,
      args,
      timestamp: performance.now()
    });
  }

  setCommandBufferID(id) {
    this.commandBufferID = id;
  }

  getCommandBufferID() {
    return this.commandBufferID;
  }

  getAllCommands() {
    return this.commands;
  }

  destory() {
    this.commands = [];
    this.commands = null;
  }
}

/**
 * @brief 命令记录器
 */
export class CommandRecorder {

  commandQueue = [];
  currentCommandBuffer = 0;
  commandBuffer = new Map();

  constructor() {
    this.startCommandBuffer();
  }

  /**
   * @brief 开始记录一帧
   */
  startCommandBuffer() {
    this.commandQueue = [];
  }

  /**
   * @brief 记录一帧的命令
   */
  recordCommand(type, args) {
    this.commandQueue.push({
      type,
      args,
      timestamp: performance.now()
    });
  }

  recordCommandBuffer(type, args) {
    if(this.currentCommandBuffer == 0 && (type == "beginRenderPass" || type == "beginComputePass")) {
      this.currentCommandBuffer = this.commandQueue.length;
      let commandbuffer = new CommandBufferRecorder();
      commandbuffer.recordCommand(type, args);
      this.commandQueue.push(commandbuffer);

    } else{
      this.commandQueue[this.currentCommandBuffer].recordCommand(type, args);
    }
  }
  recordCommandBufferID(id) {
    this.commandQueue[this.currentCommandBuffer].setCommandBufferID(id);
    this.currentCommandBuffer = 0;
  }

  bindCommandBuffer(cb) {
    this.commandBuffer.set(cb, {id : this.currentCommandBuffer});
  }

  getCommandBufferID(id) {
    return this.commandBuffer.get(id).id;
  }

  getAllCommands() {
    return this.commandQueue;
  }

  destory() {
    this.commandQueue = [];
    this.commandBuffer.clear();
    this.commandBuffer = null;
    this.commandQueue = null;
  }
}