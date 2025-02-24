import { ResourceTracker } from "./ResourceTracker";
import { CommandRecorder } from "./CommandRecorder";
/**
 * @class Tracker
 */
export class Tracker{
  static captureState = {
    msg: false,
    active: false,
  }
  /*
    fixme
    1. adapter & device 目前只支持 1 个
  */
  static metedata = {
    CanvasConfiguration: {},
    AdapterOptions: {},
    deviceDescriptor: {},
    resource: new ResourceTracker(),
    command: new CommandRecorder(),
  }

  currentFrame = 0;
  timeStart = 0.0;
  timeEnd = 0.0;
  CanvasWidth = 0;
  CanvasHeight = 0;

  constructor(frameid) { 
    this.currentFrame = frameid;
    this.timeStart = performance.now();
    this.timeEnd = 0;
  }

  setTimeStart(time) {
    this.timeStart = time;
  }

  setTimeEnd(time) {
    this.timeEnd = time;
  }

  setCanvasSize(width, height) {
    this.CanvasWidth = width;
    this.CanvasHeight = height;
  }


  static reset() {
    // 重置 metadata
    this.metedata.resource.destory();
    this.metedata.command.destory();

    this.metedata = {
      CanvasConfiguration: {},
      AdapterOptions: {},
      deviceDescriptor: {},
      resource: new ResourceTracker(),
      command: new CommandRecorder(),
    }
    this.currentFrame = 0;
    this.timeStart = 0.0;
    this.timeEnd = 0.0;
    this.CanvasWidth = 0;
    this.CanvasHeight = 0;
  }

  static clear() {
    this.metedata.command.destory();
    this.metedata.command = new CommandRecorder();
    this.currentFrame = 0;
    this.timeStart = 0.0;
    this.timeEnd = 0.0;
  }

  static trackCanvasConfiguration(configuration) {
    this.metedata.CanvasConfiguration = configuration;
  }
  static trackAdapterOptions(options) {
    this.metedata.AdapterOptions = options;
  }

  static trackDeviceDescriptor(GPUDeviceDescriptor) {
    this.metedata.deviceDescriptor = GPUDeviceDescriptor;
  }

  static trackResources(resource, type, descriptor) {
    return this.metedata.resource.track(resource, descriptor, type);
  }

  static trackFrameResources(resource, type, descriptor) {
    if(this.captureState.active) {
      return this.metedata.resource.track(resource, descriptor, type);
    }
  }
  static getResourceInfo(resource) {
    return this.metedata.resource.getResourceInfo(resource);
  }

  static untrackResources(resource) {
    this.metedata.resource.untrack(resource);
  }

  static getAllResources() {
    return this.metedata.resource.getAllResources();
  }

  static getAllResourcesValues() {
    return this.metedata.resource.getAllResourcesValues();
  }

  static trackCommand(type, args) {
    this.metedata.command.recordCommand(type, args);
  }

  static trackCommandBuffer(type, args){
    this.metedata.command.recordCommandBuffer(type, args);
  }

  static recordCommandBufferID(cb) {
    const id = this.metedata.command.getCommandBufferID(cb)
    this.metedata.command.recordCommandBufferID(id);
  }

  static recordBindCommandBuffer(cb) {
    this.metedata.command.bindCommandBuffer(cb);
  }

  static getCommandBufferID(cb) {
    return this.metedata.command.getCommandBufferID(cb);
  }

  static trackFrameCommand(type, args) {
    if(this.captureState.active) {
      this.metedata.command.recordCommand(type, args);
    }
  }

  static getAllCommands() {
    return this.metedata.command.getAllCommands();
  }


  outputFrame() {
    let frame = {
      id: this.currentFrame,
      canvasWidth: this.CanvasWidth,
      canvasHeight: this.CanvasHeight,
      timeStart: this.timeStart,
      timeEnd: this.timeStart,
      CanvasConfiguration: Tracker.metedata.CanvasConfiguration,
      AdapterOptions: Tracker.metedata.AdapterOptions,
      deviceDescriptor: Tracker.metedata.deviceDescriptor,
      resources: Tracker.getAllResourcesValues(),
      commands: Tracker.getAllCommands(),
    }
    return frame;
  }

}
