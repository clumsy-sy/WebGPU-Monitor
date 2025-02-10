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

/*
{
  "frame": {
    "id": "frame_1717041600123",
    "timestamp": 1717041600123,
    "duration": 12.5,
    "resources": {
      "adapter_0": {
        "type": "GPUAdapter",
        "features": ["texture-compression-bc"],
        "createdAt": 1717041600000
      },
      "device_0": {
        "type": "GPUDevice",
        "adapter": "adapter_0",
        "createdAt": 1717041600005
      },
      "shader_vertex_0": {
        "type": "GPUShaderModule",
        "device": "device_0",
        "code": "@vertex fn main(...) { ... }",
        "hash": "a1b2c3d4"
      },
      "shader_fragment_0": {
        "type": "GPUShaderModule",
        "device": "device_0",
        "code": "@fragment fn main() { ... }",
        "hash": "e5f6g7h8"
      },
      "pipeline_0": {
        "type": "GPURenderPipeline",
        "device": "device_0",
        "layout": "auto",
        "vertex": {
          "module": "shader_vertex_0",
          "entryPoint": "main"
        },
        "fragment": {
          "module": "shader_fragment_0",
          "entryPoint": "main",
          "targets": [
            {
              "format": "bgra8unorm"
            }
          ]
        },
        "primitive": {
          "topology": "triangle-list"
        }
      },
      "command_buffer_0": {
        "type": "GPUCommandBuffer",
        "device": "device_0",
        "commandCount": 3
      }
    },
    "operations": [
      {
        "type": "createShaderModule",
        "timestamp": 1717041600010,
        "resourceId": "shader_vertex_0",
        "descriptor": {
          "codeLength": 256,
          "hash": "a1b2c3d4"
        }
      },
      {
        "type": "createShaderModule",
        "timestamp": 1717041600012,
        "resourceId": "shader_fragment_0",
        "descriptor": {
          "codeLength": 128,
          "hash": "e5f6g7h8"
        }
      },
      {
        "type": "createRenderPipeline",
        "timestamp": 1717041600015,
        "resourceId": "pipeline_0",
        "descriptor": {
          "layout": "auto",
          "vertexModule": "shader_vertex_0",
          "fragmentModule": "shader_fragment_0"
        }
      },
      {
        "type": "beginRenderPass",
        "timestamp": 1717041600020,
        "descriptor": {
          "colorAttachments": [
            {
              "view": {
                "__type": "GPUTextureView",
                "textureId": "canvas_texture_0"
              },
              "clearValue": { "r": 0.1, "g": 0.1, "b": 0.1, "a": 1.0 },
              "loadOp": "clear",
              "storeOp": "store"
            }
          ]
        }
      },
      {
        "type": "setPipeline",
        "timestamp": 1717041600022,
        "pipelineId": "pipeline_0"
      },
      {
        "type": "draw",
        "timestamp": 1717041600023,
        "parameters": {
          "vertexCount": 3,
          "instanceCount": 1
        }
      },
      {
        "type": "endRenderPass",
        "timestamp": 1717041600025
      }
    ],
    "submits": [
      {
        "type": "queueSubmit",
        "timestamp": 1717041600030,
        "commandBuffers": ["command_buffer_0"],
        "executionTime": {
          "cpu": 2.4,
          "gpu": 1.8
        }
      }
    ],
    "dependencies": {
      "device_0": ["adapter_0"],
      "pipeline_0": ["shader_vertex_0", "shader_fragment_0"],
      "command_buffer_0": ["pipeline_0"]
    }
  },
  "resourcePool": {
    "canvas_texture_0": {
      "type": "GPUTexture",
      "format": "bgra8unorm",
      "dimensions": [800, 600],
      "usage": ["render-attachment"]
    }
  }
}

*/