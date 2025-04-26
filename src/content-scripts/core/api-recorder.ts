import { ResourceTracker } from './resource-tracker';


interface APIRecord {
  id: number;
  method: string;
  args: any[];
  timestamp: number;
}

/**
 * @class APIRecorder
 * @description 用于记录API调用的类，包括方法调用、参数、返回值等信息
 */
export class APIRecorder {
  // 单例模式
  private static instance: APIRecorder;
  private constructor() { }

  public static getInstance() {
    if (!APIRecorder.instance) {
      APIRecorder.instance = new APIRecorder();
    }
    return APIRecorder.instance;
  }

  // 记录的API调用信息
  private records: APIRecord[] = [];
  private curID: number = 0;
  private resTracker: ResourceTracker = ResourceTracker.getInstance();

  recordMethodCall(methodName: string, args: any[]) {
    const startTime = performance.now();

    // 处理资源参数转换
    const processedArgs = args.map(arg => {
      if (this.resTracker.resourceMap.has(arg)) {
        return this.resTracker.getResID(arg);
      }
      return arg;
    });

    const record: APIRecord = {
      id: this.curID++,
      timestamp: startTime,
      method: methodName,
      args: processedArgs
    };

    this.records.push(record);
    return record;
  }

  getAllRecords() {
    return this.records;
  }

}
