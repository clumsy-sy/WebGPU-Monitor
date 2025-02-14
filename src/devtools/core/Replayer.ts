/// <reference types="@webgpu/types" />

import { TextureViewInfo } from "./TextureViewer";

type GPUResource = 
  | GPUBuffer 
  | GPUTexture 
  | GPUTextureView
  | GPUShaderModule 
  | GPURenderPipeline
  | GPUComputePipeline
  | GPUBindGroup
  | GPUBindGroupLayout
  | GPUCommandBuffer
  | GPUPipelineLayout;

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

interface ReplayFrameData {
  id: number;
  canvasWidth: number;
  canvasHeight: number;
  CanvasConfiguration: GPUCanvasConfiguration;
  AdapterOptions: GPURequestAdapterOptions;
  deviceDescriptor: GPUDeviceDescriptor;
  resources: Array<{
    id: string; // JSON 中 id 是数字字符串，需要改为 string
    type: string;
    descriptor: object;
  }>;
  commands: Array<
  | QueueCommandType
  | EncoderCommandType
  >;
}

export class WebGPUReproducer {
  private device!: GPUDevice;
  private canvasContext !: GPUCanvasContext;
  private resourceMap = new Map<string, GPUResource>();
  private FrameData: ReplayFrameData | null = null;
  private MainCanvas: HTMLCanvasElement | null = null;
  textureViews: TextureViewInfo[] = [];


  constructor(canvas: HTMLCanvasElement) {
    this.MainCanvas = canvas;

  }

  async initialize() {
    if(!this.MainCanvas){
      throw new Error('[replayer] canvas is null');
    }
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter!.requestDevice();
    this.canvasContext = this.MainCanvas.getContext('webgpu') as GPUCanvasContext ;
    if(!this.canvasContext) {
      console.error('WebGPU context not supported');
    }
  }

  async replayFrame(jsonData: string) {
    this.FrameData = JSON.parse(jsonData) as ReplayFrameData;
    if(this.FrameData) {
      console.log("[panel] frameData:", this.FrameData);
      console.log("[panel] canvasWidth:", this.FrameData.canvasWidth);
      console.log("[panel] canvasHeight:", this.FrameData.canvasHeight);
    } else {
      throw new Error('[replayer] frameData is null');
    }
    if(this.MainCanvas) {
      this.MainCanvas.width = this.FrameData!.canvasWidth;
      this.MainCanvas.height = this.FrameData!.canvasHeight;
      console.log(`[panel] canvas: [${this.MainCanvas?.width}, ${this.MainCanvas?.height}]`);
    } else {
      throw new Error('[replayer] canvas is null');
    }

    this.configureCanvas(this.FrameData);
    await this.recreateResources(this.FrameData);
    this.executeCommands(this.FrameData);
  }

  private configureCanvas(frameData: ReplayFrameData) {
    console.log('[replay] configureCanvas : ', frameData.CanvasConfiguration);
    this.canvasContext.configure({
      device: this.device,
      format: frameData.CanvasConfiguration.format,
      alphaMode: frameData.CanvasConfiguration.alphaMode,
    });
  }

  private async recreateResources(frameData: ReplayFrameData) {
    // 按资源类型顺序创建
    const resources = frameData.resources;
    resources.forEach(res => {
      switch (res.type) {
        case 'buffer':
          this.createBuffer(res);
          break;
        case 'bufferData':
          this.createBufferData(res);
          break;
        case 'shaderModule':
          this.createShaderModule(res);
          break;
        case 'pipelineLayout':
          this.createPipelineLayout(res);
          break;
        case 'pipeline':
          this.createPipeline(res);
          break;
        case 'computePipeline':
          this.createComputePipeline(res);
          break;
        case 'texture':
          this.createTexture(res);
          break;
        case 'canvasTexture':
          this.createCanvasTexture(res);
          break;
        case 'textureView':
          this.createTextureView(res);
          break;
        case 'bindGroup':
          this.createBindGroup(res);
          break;
        case 'bindGroupLayout':
          this.createBindGroupLayout(res);
          break;
        default:
          console.error()
      }
    });
  }

  private createBuffer(res: any) {
    const buffer = this.device.createBuffer({
      size: res.descriptor.size,
      usage: res.descriptor.usage,
      mappedAtCreation: res.descriptor.mappedAtCreation
    });
    console.log("[replayer] createBuffer : ", res.id);
    this.resourceMap.set(res.id, buffer);
  }

  private createBufferData(res: any) {
    const buffer = this.resourceMap.get(res.descriptor.id);
    if(buffer && buffer instanceof GPUBuffer) {
      console.log('[BufferDatares]  ', res);
      const constructorName = res.descriptor.type as keyof typeof globalThis;
      if(constructorName in globalThis) {
        const constructor = globalThis[constructorName];
        new constructor(buffer.getMappedRange()).set(res.descriptor.data);
        buffer.unmap();
      } else {
        console.error(`[replayer] createBufferData : constructor ${constructorName} not found`);
      }
    } else {
      throw new Error(`[replayer] createBufferData : buffer ${res.descriptor.id} not found`);
    }
    console.log("[replayer] createBufferData : ", res.id, ", data: ", res.descriptor.data);
  }

  private createShaderModule(res: any) {
    const shaderModule = this.device.createShaderModule({
      code: res.descriptor.code
    });
    console.log("[replayer] createShaderModule id : ", res.id);
    console.log("[replayer] createShaderModule code: ", res.descriptor.code);
    this.resourceMap.set(res.id, shaderModule);
  }

  private createPipelineLayout(res: any) {
    const descriptor = res.descriptor;
    const bindGroupLayouts = descriptor.bindGroupLayouts.map((id: string) => this.resourceMap.get(id));
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts
    });
    console.log("[replayer] PipelineLayout : ", res.id);
    console.log("[replayer] PipelineLayout bindGroupLayouts: ", bindGroupLayouts);
    this.resourceMap.set(res.id, pipelineLayout);
    console.log("[replayer] createPipelineLayout : ", pipelineLayout)
  }

  private createPipeline(res: any) {
    const descriptor = this.normalizePipelineDescriptor(res.descriptor);
    const pipeline = this.device.createRenderPipeline(descriptor);
    console.log("[replayer] createPipeline : ", res.id);
    console.log("[replayer] PipelineDescriptor : ", descriptor);
    this.resourceMap.set(res.id, pipeline);
  }

  private normalizePipelineDescriptor(desc: any): GPURenderPipelineDescriptor {
    return {
      layout: desc.layout !== "auto" ? this.resourceMap.get(desc.layout) as GPUPipelineLayout : "auto",
      vertex: {
        module: this.resourceMap.get(desc.vertex.module),
        ...(desc.vertex.entryPoint && { entryPoint: desc.vertex.entryPoint }), // 条件添加 entryPoint
        buffers: desc.vertex.buffers?.map((b: any) => ({
          arrayStride: b.arrayStride,
          attributes: b.attributes?.map((a: any) => ({
            shaderLocation: a.shaderLocation,
            offset: a.offset,
            format: a.format
          }))
        }))
      },
      fragment: {
        module: this.resourceMap.get(desc.fragment.module),
        ...(desc.fragment.entryPoint && { entryPoint: desc.fragment.entryPoint }),
        targets: desc.fragment.targets,
        ...(desc.fragment.constants && { constants: desc.fragment.constants })
      },
      primitive: desc.primitive,
      depthStencil: desc.depthStencil
    };
  }

  private createComputePipeline(res: any) {
    const descriptor = this.normalizeComputePipelineDescriptor(res.descriptor);
    const pipeline = this.device.createComputePipeline(descriptor);
    console.log("[replayer] createComputePipeline : ", res.id);
    console.log("[replayer] ComputePipelineDescriptor : ", descriptor);
    console.log("[replayer] ComputePipeline : ", pipeline);
    this.resourceMap.set(res.id, pipeline);
  }

  private normalizeComputePipelineDescriptor(desc: any): GPUComputePipelineDescriptor {
    return {
      layout: desc.layout,
      compute: {
        module: this.resourceMap.get(desc.compute.module),
        ...(desc.compute.entryPoint && { entryPoint: desc.compute.entryPoint })
      }
    };
  }

  private createTexture(res: any) {
    console.log("[replayer] createTexture");
    const textureDescriptor : GPUTextureDescriptor = {
      size: res.descriptor.size,
      format: res.descriptor.format || 'rgba8unorm',
      // !!! GPUTextureUsage.COPY_SRC
      ...(res.descriptor.usage && { usage: res.descriptor.usage | GPUTextureUsage.COPY_SRC}),
      ...(res.descriptor.mipLevelCount && { mipLevelCount: res.descriptor.mipLevelCount }),
      ...(res.descriptor.sampleCount && { sampleCount: res.descriptor.sampleCount }),
      ...(res.descriptor.viewFormats && { viewFormats: res.descriptor.viewFormats }),
      ...(res.descriptor.label && { label: res.descriptor.label }),
      ...(res.descriptor.dimension && { dimension: res.descriptor.dimension })
    };
    const texture = this.device.createTexture(textureDescriptor);
    console.log("[replayer] createTexture : ", res.id);
    console.log("[replayer] TextureDescriptor : ", textureDescriptor);
    this.resourceMap.set(res.id, texture);
  }

  private createCanvasTexture(res: any) {
    const texture = this.canvasContext.getCurrentTexture();
    console.log("[replayer] createCanvasTexture : ", res.id);
    this.resourceMap.set(res.id, texture);
  }

  private createTextureView(res: any) {
    const parentTexture = this.resourceMap.get(res.descriptor.parentTextureId);
    if(parentTexture && parentTexture instanceof GPUTexture) {
      const textureView = parentTexture.createView(res.descriptor.descriptor);
      console.log("[replayer] createTextureView : ", res.id);
      this.resourceMap.set(res.id, textureView);

      let testTextureinfo = {
        view: textureView,
        texture: parentTexture,
        format: parentTexture.format,
        width: parentTexture.width,
        height: parentTexture.height,
        label: parentTexture.label
      }
      this.textureViews.push(testTextureinfo);

    } else {
      throw new Error(`[replayer] createTextureView : texture ${res.descriptor.parentTextureId} not found`);
    }
  }

  private createBindGroup(res: any) {
    const bindGroupLayout = this.resourceMap.get(res.descriptor.layout);
    if(bindGroupLayout && bindGroupLayout instanceof GPUBindGroupLayout) {
      const bindGroup = this.device.createBindGroup({
        layout: bindGroupLayout,
        entries: res.descriptor.entries.map((entry: any) => ({
          binding: entry.binding,
          resource: this.resourceMap.get(entry.resource) instanceof GPUBuffer ?
            { buffer: this.resourceMap.get(entry.resource) } :
            this.resourceMap.get(entry.resource) 
        }))
      });
      console.log("[replayer] BindGroup : ", res);
      this.resourceMap.set(res.id, bindGroup);
      console.log("[replayer] createBindGroup : ", bindGroup);
    } else {
      throw new Error(`[replayer] createBindGroup : bindGroupLayout ${res.descriptor.layout} not found`);
    }
  }

  private createBindGroupLayout(res: any) {
    if(res.descriptor.type == 'pipeline.getBindGroupLayout') {
      const pipeline = this.resourceMap.get(res.descriptor.pipelineID);
      if(pipeline && pipeline instanceof GPURenderPipeline) {
        const bindGroupLayout = pipeline.getBindGroupLayout(res.descriptor.index);
        console.log("[replayer] getBindGroupLayout : ", res.id);
        this.resourceMap.set(res.id, bindGroupLayout);
      } else  if (pipeline && pipeline instanceof GPUComputePipeline){
        const bindGroupLayout = pipeline.getBindGroupLayout(res.descriptor.index);
        console.log("[replayer] getBindGroupLayout : ", res.id);
        this.resourceMap.set(res.id, bindGroupLayout);
      } else {
        console.error(`pipeline ${pipeline} not found, descriptor : ${res.descriptor}`)
        throw new Error(`[replayer] getBindGroupLayout : pipeline ${res.descriptor.pipelineID} not found`);
      }
    } else if(res.descriptor.type == 'device.bindGroupLayout') {
      const bindGroupLayout = this.device.createBindGroupLayout(res.descriptor.args);
      console.log("[replayer] createBindGroupLayout : ", res.id);
      this.resourceMap.set(res.id, bindGroupLayout);
    } else {
      throw new Error(`[replayer] createBindGroupLayout : unknown type ${res.descriptor.type}`);
    }
  }

  private executeCommands(frameData: ReplayFrameData) {
    frameData.commands.forEach(cmdGroup => {
      if ('commandBufferID' in cmdGroup) {
        console.log("[replayer] executeCommands ID: ", cmdGroup.commandBufferID);
        console.log("[replayer] Commands : ", cmdGroup);
        const commandEncoder = this.device.createCommandEncoder();
        let renderPassEncoder: GPURenderPassEncoder | null = null;
        let computePassEncoder: GPUComputePassEncoder | null = null;
        cmdGroup.commands.map(cmd => {
          switch (cmd.type) {
            case 'beginRenderPass':
              renderPassEncoder = this.encoderBeginRenderPass(commandEncoder, cmd.args);
              break;
            case 'beginComputePass':
              computePassEncoder = this.encoderBeginComputePass(commandEncoder, cmd.args);
              break;
            case 'setPipeline':
              if(renderPassEncoder != null) {
                this.encoderSetPipeline(renderPassEncoder, cmd.args);
              } else {
                this.encoderSetPipeline(computePassEncoder, cmd.args);
              }
              break;
            case 'setBindGroup':
              if(renderPassEncoder != null) {
                this.encoderSetBindGroup(renderPassEncoder, cmd.args);
              } else {
                this.encoderSetBindGroup(computePassEncoder, cmd.args);
              }
              break;
            case 'setVertexBuffer':
              this.encoderSetVertexBuffer(renderPassEncoder, cmd.args);
              break;
            case 'setIndexBuffer':
              this.encoderSetIndexBuffer(renderPassEncoder, cmd.args);
              break;
            case 'draw':
              this.encoderDraw(renderPassEncoder, cmd.args);
              break;
            case 'drawIndexed':
              this.encoderDrawIndexed(renderPassEncoder, cmd.args);
              break;
            case 'dispatchWorkgroups':
              this.encoderDispatchWorkgroups(computePassEncoder, cmd.args);
              break;
            case 'end':
              if(renderPassEncoder != null) {
                this.encoderEnd(renderPassEncoder);
                // need!!!
                renderPassEncoder = null;
              } else {
                this.encoderEnd(computePassEncoder);
                renderPassEncoder = null;
              }
              break;
            case 'finish':
              this.encoderFinish(commandEncoder, cmdGroup.commandBufferID, cmd.args);
              break;
          }
        });
      } else {
        console.log("[replayer] executeCommands : ", cmdGroup.type);
        switch(cmdGroup.type) {
          case 'writeBuffer':
            this.queueWriteBuffer(cmdGroup.args);
            break;
          case 'submit':
            this.queueSubmit(cmdGroup.args);
            break;
        }
      }

    });
  }

  private encoderBeginRenderPass(commandEncoder: GPUCommandEncoder, args: any) : GPURenderPassEncoder {
    const renderPassDescriptor = {
      colorAttachments: args.colorAttachments.map((attachment: any) => ({
        view: this.resourceMap.get(attachment.view),
        ...(attachment.clearValue && { clearValue: attachment.clearValue }),
        ...(attachment.loadOp && { loadOp: attachment.loadOp }),
        ...(attachment.storeOp && { storeOp: attachment.storeOp }),
      })),
      ...(args.depthStencilAttachment && {depthStencilAttachment: {
        view: this.resourceMap.get(args.depthStencilAttachment.view),
        ...(args.depthStencilAttachment.depthClearValue && { depthClearValue: args.depthStencilAttachment.depthClearValue }),
        ...(args.depthStencilAttachment.depthLoadOp && { depthLoadOp: args.depthStencilAttachment.depthLoadOp }),
        ...(args.depthStencilAttachment.depthStoreOp && {depthStoreOp: args.depthStencilAttachment.depthStoreOp })
      }})
    };
    console.log("[replayer] renderPassDescriptor args: ", args)
    console.log("[replayer] renderPassDescriptor : ", renderPassDescriptor)
    return commandEncoder.beginRenderPass(renderPassDescriptor);
  }

  private encoderBeginComputePass(commandEncoder: GPUCommandEncoder, args: any) : GPUComputePassEncoder {
    console.log("[replayer] encoderBeginComputePass : ", args);
    const ret = commandEncoder.beginComputePass(args);
    console.log("[replayer] encoderBeginComputePass ret: ", ret);
    return ret;
  }

  private encoderSetPipeline(passEncoder: GPURenderPassEncoder | GPUComputePassEncoder | null, args: any) {
    console.log("[replayer] encoderSetPipeline : ", passEncoder, args);
    if(passEncoder) {
      const pipeline = this.resourceMap.get(args[0]);
      if(pipeline && passEncoder instanceof GPURenderPassEncoder &&
            pipeline instanceof GPURenderPipeline) {
        passEncoder.setPipeline(pipeline);
      } else if( pipeline && passEncoder instanceof GPUComputePassEncoder &&
              pipeline instanceof GPUComputePipeline
          ) {
        passEncoder.setPipeline(pipeline);
      } else {
        console.error(`pipeline ${pipeline} , args: ${args}`);
        throw new Error(`[replayer] encoderSetPipeline : pipeline ${args[0]} not found`);
      }
    } else {
      throw new Error(`[replayer] encoderSetPipeline : passEncoder is null`);
    }
  }

  private encoderSetBindGroup(passEncoder: GPURenderPassEncoder |  GPUComputePassEncoder | null, args: any) {
    if(passEncoder) {
      const bindGroup = this.resourceMap.get(args[1]);
      if(bindGroup && bindGroup instanceof GPUBindGroup) {
        // fixme
        passEncoder.setBindGroup(args[0], bindGroup);
        console.log("[replayer] encoderSetBindGroup: bindGroup: ", bindGroup)
      } else {
        throw new Error(`[replayer] encoderSetBindGroup : bindGroup ${args.bindGroup} not found`);
      }
    } else {
     throw new Error(`[replayer] encoderSetBindGroup : passEnc`)
    }
  }

  private encoderSetVertexBuffer(passEncoder: GPURenderPassEncoder | null, args: any) {
    if(passEncoder) {
      const buffer = this.resourceMap.get(args[1]);
      if(buffer && buffer instanceof GPUBuffer) {
        // fixme
        passEncoder.setVertexBuffer(args[0], buffer);
        console.log("[replayer] encoderSetVertexBuffer: buffer: ", buffer)
      } else {
        throw new Error(`[replayer] encoderSetVertexBuffer: buffer ${args.buffer} not found`);
      }
    }
  }

  private encoderSetIndexBuffer(passEncoder: GPURenderPassEncoder | null, args: any) {
    if(passEncoder) {
      const indexbuffer = this.resourceMap.get(args[0]);
      if(indexbuffer && indexbuffer instanceof GPUBuffer) {
        // fixme
        passEncoder.setIndexBuffer(indexbuffer, args[1]);
        console.log("[replayer] encoderSetIndexBuffer: buffer: ", indexbuffer)
      } else {
        throw new Error(`[replayer] encoderSetIndexBuffer: buffer ${args[0]} not found`);
      }
    }
  }

  private encoderDraw(passEncoder: GPURenderPassEncoder | null, args: any) {
    if(passEncoder) {
      const drawArgs: [number, number, number, number] = [
        args[0] ?? 0, // vertexCount
        args[1] ?? 1, // instanceCount
        args[2] ?? 0, // firstVertex
        args[3] ?? 0  // firstInstance
      ]
      console.log("[replayer] encoderDraw args: ", drawArgs)
      passEncoder.draw(...drawArgs);
    } else {
      throw new Error(`[replayer] encoderDraw : passEncoder is null`);
    }
  }

  private encoderDrawIndexed(passEncoder: GPURenderPassEncoder | null, args: any) {
    if(passEncoder) {
      const drawIndexedArgs: [number, number, number, number, number] = [
        args[0] ?? 0, // indexCount
        args[1] ?? 1, // instanceCount
        args[2] ?? 0, // firstIndex
        args[3] ?? 0, // baseVertex
        args[4] ?? 0, //firstInstance
      ]
      console.log("[replayer] encoderDrawIndexed args: ", drawIndexedArgs)
      passEncoder.drawIndexed(...drawIndexedArgs);
    }
  }

  private encoderDispatchWorkgroups(passEncoder: GPUComputePassEncoder | null, args: any) {
    if(passEncoder) {
      const dispatchWorkgroupsArgs: [number, number, number] = [
        args[0] ?? 1, // workgroupCountX
        args[1] ?? 1, // workgroupCountY
        args[2] ?? 1, // workgroupCountZ
      ]
      console.log("[replayer] encoderDispatchWorkgroups args: ", dispatchWorkgroupsArgs)
     passEncoder.dispatchWorkgroups(...dispatchWorkgroupsArgs)
    }
  }

  private encoderEnd(passEncoder: GPURenderPassEncoder | GPUComputePassEncoder | null) {
    if(passEncoder) {
      console.log("[replayer] encoder passEncoder", passEncoder);
      passEncoder.end();
      passEncoder = null;
      console.log("[replayer] encoderEnd passEncoder", passEncoder);
    } else {
      throw new Error(`[replayer] encoderEnd : passEncoder is null`);
    }
  }

  private encoderFinish(commandEncoder: GPUCommandEncoder | null, commandBufferID: string, args: any) {
    if(commandEncoder) {
      const commandBuffer = commandEncoder.finish(args);
      console.log("[replayer] encoderFinish", commandBuffer);
      this.resourceMap.set(commandBufferID, commandBuffer);
    } else {
      throw new Error(`[replayer] encoderFinish : passEncoder is null`);
    }
  }

  private queueWriteBuffer(args: any) {
    const buffer = this.resourceMap.get(args.buffer);
    if(buffer && buffer instanceof GPUBuffer) {
      const data = new Float32Array(args.data);
      console.log("[replayer] queueWriteBuffer data:", data);
      this.device.queue.writeBuffer(
        buffer,
        args.offset,
        data.buffer,
        args.dataOffset,
        args.size
      );
    } else {
      throw new Error(`[replayer] queueWriteBuffer : buffer ${args[0]} not found`);
    }
  }

  private queueSubmit(args: any) {

    const commandBuffers : GPUCommandBuffer[] = args.commandBuffers.map((commandBufferID: string) => {
      console.log(this.resourceMap.get(commandBufferID));
      return this.resourceMap.get(commandBufferID);
    });
    this.device.queue.submit(commandBuffers);
    console.log("[replayer] queueSubmit");
  }

  getTextureViews() {
    return this.textureViews;
  }

  getDevice() {
    return this.device;
  }
}


// 使用示例
// const canvas = document.createElement('canvas');
// document.body.appendChild(canvas);

// const reproducer = new WebGPUReproducer();
// reproducer.initialize(canvas).then(() => {
//   // 加载 Frame 1
//   fetch('frame1.json')
//     .then(res => res.text())
//     .then(json => reproducer.replayFrame(json));

//   // 加载 Frame 2
//   fetch('frame2.json')
//     .then(res => res.text())
//     .then(json => reproducer.replayFrame(json));
// });
