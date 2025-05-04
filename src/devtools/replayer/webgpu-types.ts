import { ResInfo, cmdInfo, EncoderCmd, EncoderBaseCmd, RenderPassRecord, ComputePassRecord } from "../../global/utils";

interface QueueCommandType {
  type: string;
  args: object;
  timestamp: number;
}

interface EncoderCommandType {
  commandBufferID: string;
  commands: Array<{
    type: string;
    args: object;
    timestamp: number;
  }>;
}

interface FrameDataType {
  frameID: number;
  frameStartTime: number;
  frameEndTime: number;
  frameWidth: number;
  frameHeight: number;
  CanvasConfiguration: GPUCanvasConfiguration | {};
  AdapterOptions: GPURequestAdapterOptions;
  deviceDescriptor: GPUDeviceDescriptor;
  resources: Array<ResInfo>;
  command: Array<(EncoderCmd | cmdInfo)>;
}

export { QueueCommandType, EncoderCommandType, FrameDataType };