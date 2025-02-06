export class seedAndLogger {
  static log(commandType, args) {
    console.log(`[WebGPU] ${commandType}`, args);
  }

  static error(message, error) {
    console.error(`[WebGPU Error] ${message}`, error);
  }
  static sendMessage(type, label, args) {
    window.postMessage(JSON.stringify({ 
      type: type, 
      message: label,
      data: args
    }), "*");
  }
}
