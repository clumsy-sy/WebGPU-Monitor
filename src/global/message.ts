/**
 * @brief 信息类型
 */
export const MsgType = {
  WebGPU: "WEBGPU_API",
  Window: "WINDOW_API",
  Captures_begin: "CAPTURES_BEGIN",
  Captures_end: "CAPTURES_END",
  Frame: "FRAME_JSON",
};

export enum MsgLevel {
  level_1 = 1,  // important
  level_2 = 2,  // normal 
  level_3 = 3   // unimportant
}

/**
 * @brief 信息发送

 */
export class Msg{
  private static MsgCtrl : Msg;
  private static Loglevel = MsgLevel.level_2;

  private constructor(){}

  public static getInstance(){
    if(!Msg.MsgCtrl){
      Msg.MsgCtrl = new Msg();
    }
    return Msg.MsgCtrl;
  }

  sendMessage(type: string, label : string, args : any) {
    window.postMessage(JSON.stringify({ 
      type: type, 
      message: label,
      data: args
    }), "*");
  }

  setLogLevel(level: MsgLevel){
    Msg.Loglevel = level;
  }

  log(level: MsgLevel, ...data: any[]){
    // 获取调用栈信息，并且输出
    const error = new Error();
    const stackLines = error.stack?.split('\n') || [];
    const callerLine = stackLines[2]?.trim(); // Skip first 2 entries

    const match = callerLine?.match(/at (.+) \((.*):(\d+):(\d+)\)/);

    if(level <= Msg.Loglevel){
      if (match) {
        const [_, callerMethod, file, line, column] = match;
        const position = `${file}:${line}`;
        
        console.log(`[${position}]`, ...data);
      } else {
        console.log(...data);
      }
    } 
  }

  error(message: string, ...data: any[]) {
    console.log(...data);
    throw new Error(message);
  }

};
