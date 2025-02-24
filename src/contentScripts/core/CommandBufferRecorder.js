/**
 * @brief CommandBuffer 命令记录器
 */
export class CommandBufferRecorder {
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
