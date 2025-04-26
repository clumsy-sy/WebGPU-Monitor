import { Msg, MsgLevel } from "../../../global/message";
import { APIRecorder } from "../api-recorder";
import { CommandTracker } from "../command-tracker";
import { FrameRecorder } from "../frame-recorder";
import { ResourceTracker } from "../resource-tracker";

const res = ResourceTracker.getInstance();
const msg = Msg.getInstance();
const cmd = CommandTracker.getInstance();
const APIrecorder = APIRecorder.getInstance();
const recoder = FrameRecorder.getInstance();

export { res, msg, cmd, APIrecorder, recoder, MsgLevel };