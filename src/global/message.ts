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

/**
 * @brief 信息发送

 */
export class Msg{
  private static MsgCtrl : Msg;

  private log_1 : boolean = false;
  private log_2 : boolean = false;
  private log_3 : boolean = false;

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

  setLog(log_1 : boolean, log_2 : boolean, log_3 : boolean){
    this.log_1 = log_1;
    this.log_2 = log_2;
    this.log_3 = log_3;
  }

  log(...data: any[]){
    if(this.log_1){
      console.log(...data);
    }
  }

  error(message: string, ...data: any[]) {
    console.log(...data);
    throw new Error(message);
  }

};
