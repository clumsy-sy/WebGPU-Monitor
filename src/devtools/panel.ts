import { WebGPUReproducer } from "./core/Replayer";
import { TextureViewer } from "./core/TextureViewer";
import { createFrameInfoPanel, displayFrameInfo } from "./frame-info-tree";
import { WebGPUReplayer } from "./replayer/webgpu-replayer";
import { FrameDataType } from "./replayer/webgpu-types";
import { WebGPUDependencyGraph } from "./dependency-graph";


/**
 * @brief 信息类型
 */
const MsgType = {
  WebGPU: "WEBGPU_API",
  Window: "WINDOW_API",
  Captures_begin: "CAPTURES_BEGIN",
  Captures_end: "CAPTURES_END",
  Frame: "FRAME_JSON",
} as const; // 使用 as const 确保类型为字面量类型


// 获取当前标签页的 ID
const tabId: number = chrome.devtools.inspectedWindow.tabId;
console.log("[panel] get current TabId:", tabId);

let port: chrome.runtime.Port = chrome.tabs.connect(tabId, { name: "panel" });
portListener(port);

// 创建带自动重连的连接
const createPersistentConnection = (tabId: number) => {

  // 建立新连接
  port = chrome.tabs.connect(tabId, {
    name: "panel"
  });

  // 配置自动重连
  port.onDisconnect.addListener(() => {
    console.log(`Connection lost for tab ${tabId}, attempting reconnect...`);
    setTimeout(() => createPersistentConnection(tabId), 2000); // 2秒重试
  });

  portListener(port);

};

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    console.log("[panel] Tab updated:", tabId, changeInfo);
    console.log(`Tab ${tabId} reloaded, reconnecting...`);
    port.disconnect();
    createPersistentConnection(tabId)
  }
});

// 创建一个端口，用于与 content_script 进行通信
interface fpsType {
  frameCnt: number;
  deltaTime: number;
  fps: number;
}

// 定义接收消息的数据结构
interface ReceivedMessage {
  type: string;
  message: string;
  data: fpsType | string;
}

var replayer: WebGPUReplayer|null = null;

function ReplayWithFrameData(data: string){
  if(replayer == null) {
    replayer = new WebGPUReplayer(data as string);
    replayer.replayFrame('replay', 'texture-viewer', 'texture-select').then(() => { 
      const framePanel = document.getElementById('frame-info-panel');
      if (framePanel) {
        framePanel.style.display = 'block';
      }
      displayFrameInfo(JSON.parse(data) as FrameDataType)
      console.log("[panel] replayer finish");
    });
  } else {
    replayer.Dispose();
    replayer = new WebGPUReplayer(data as string);
    replayer.replayFrame('replay', 'texture-viewer', 'texture-select').then(() => { 
      const framePanel = document.getElementById('frame-info-panel');
      if (framePanel) {
        framePanel.style.display = 'block';
      }
      displayFrameInfo(JSON.parse(data) as FrameDataType)
      console.log("[panel] replayer finish");
    });
  }
}


// 接收来自 content_script 的消息
function portListener(port: chrome.runtime.Port) {

  port.onMessage.addListener((message: string) => {
    const receivedData: ReceivedMessage = JSON.parse(message);
    const fps = document.getElementById("fpsPrint");
  
    if (receivedData.type === MsgType.Window) {
      if (receivedData.data !== undefined && receivedData.data !== null && typeof receivedData.data === "object") {
        if (fps) {
          // fixme 输出长度不固定
          const fpsValue = receivedData.data.fps.toString().padEnd(5, ' ');
          const deltaTimeValue = receivedData.data.deltaTime.toFixed(4).toString().padEnd(8, ' ');
          fps.textContent = `当前帧率: ${fpsValue} FPS (${deltaTimeValue} ms / frame) `;
        }
      }
      if (receivedData.message == "Reset")
      {
        console.log("[panel] reset");
        if(replayer) {
          replayer.Dispose();
          replayer = null;
        }
      } 
    } else if (receivedData.type === MsgType.Captures_end) {
      console.log("[panel] Message received in panel.js:", receivedData);
    } else if (receivedData.type === MsgType.Frame) {
      // console.log("[panel] Frame json:", receivedData.data);
      const replayCanvas = document.getElementById('replay') as HTMLCanvasElement | null;
      if(replayCanvas && typeof receivedData.data === "string") {
        // const replayer = new WebGPUReproducer(replayCanvas);
        // replayer.initialize()
        // .then(() => { replayer.replayFrame(receivedData.data as string); })
        // .then(() => { 
        //   const texViewer = new TextureViewer('texture-viewer', 'texture-select', replayer.getDevice());
        //   texViewer.addTextureViews(replayer.getTextureViews());
        // });

        // new 
        
        ReplayWithFrameData(receivedData.data);
        // const replayer = new WebGPUReplayer(receivedData.data as string);
        // replayer.replayFrame('replay', 'texture-viewer', 'texture-select').then(() => { 
        //   console.log("[panel] replayer finish");
        // });

      }
  
    } else {
      console.log("[panel] Message received in panel.js:", receivedData);
    }
    return true;
  });
}


// 确保页面加载完成后再执行相关操作
document.addEventListener("DOMContentLoaded", () => {
  const captureButton = document.getElementById("getFrame");

  if (captureButton) {
    captureButton.addEventListener("click", () => {
      console.log("[panel] send message to content script");
      port.postMessage(
        JSON.stringify({
          type: MsgType.Captures_begin,
          message: "get current frame",
          data: "start",
        })
      );
    });
  } else {
    console.error("Element with id 'getFrame' not found.");
  }

  // 创建依赖关系图容器
  const dependencyContainer = document.createElement('div');
  dependencyContainer.id = 'dependency-graph-container';
  dependencyContainer.style.height = '500px';
  dependencyContainer.style.border = '1px solid #ddd';
  dependencyContainer.style.marginTop = '20px';

  // 添加详情面板
  const detailsPanel = document.createElement('div');
  detailsPanel.id = 'dependency-details';
  detailsPanel.className = 'info-card';
  detailsPanel.style.marginTop = '1rem';
  detailsPanel.style.display = 'none';

  // 将容器添加到帧信息面板
  const framePanel = document.getElementById('frame-info-panel');
  if (framePanel) {
    const content = framePanel.querySelector('.panel-content');
    if (content) {
      content.appendChild(dependencyContainer);
      content.appendChild(detailsPanel);
    }
  }

  // 初始化依赖关系图
  let dependencyGraph: WebGPUDependencyGraph | null = null;
  if (dependencyContainer) {
    dependencyGraph = new WebGPUDependencyGraph('dependency-graph-container');
  }

  // 当收到帧数据时更新图表
  port.onMessage.addListener((message: string) => {
    const receivedData: ReceivedMessage = JSON.parse(message);
    if (receivedData.type === MsgType.Frame) {
      const frameData = JSON.parse(receivedData.data as string) as FrameDataType;
      
      // 显示详情面板
      const detailsPanel = document.getElementById('dependency-details');
      if (detailsPanel) {
        detailsPanel.style.display = 'block';
      }
      
      // 更新依赖图
      dependencyGraph?.update(frameData);
    }
  });


});

// 计划使用 d3.js / vis-network / gojs 绘制依赖图

// // 在 panel.ts 中添加
// import * as d3 from 'd3';

// interface DependencyNode {
//   id: number;
//   type: string;
//   label: string;
//   frameID: number;
// }

// interface DependencyEdge {
//   source: number | DependencyNode;
//   target: number | DependencyNode;
//   type: string;
//   weight: number;
// }

// class WebGPUDependencyGraph {
//   private svg: any;
//   private simulation: any;
//   private container: HTMLElement;
  
//   constructor(containerId: string) {
//     this.container = document.getElementById(containerId)!;
//     const width = this.container.clientWidth;
//     const height = this.container.clientHeight;
    
//     this.svg = d3.select(this.container)
//       .append('svg')
//       .attr('width', width)
//       .attr('height', height);
      
//     this.simulation = d3.forceSimulation()
//       .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
//       .force('charge', d3.forceManyBody().strength(-300))
//       .force('center', d3.forceCenter(width / 2, height / 2))
//       .force('collision', d3.forceCollide().radius(40));
//   }
  
//   update(frameData: FrameDataType) {
//     // 1. 构建依赖关系图数据
//     const { nodes, edges } = this.buildDependencyGraph(frameData);
    
//     // 2. 创建连线
//     const link = this.svg.append('g')
//       .attr('class', 'links')
//       .selectAll('line')
//       .data(edges)
//       .enter().append('line')
//       .attr('stroke', '#888')
//       .attr('stroke-opacity', 0.6)
//       .attr('stroke-width', (d: { weight: number; }) => Math.sqrt(d.weight));
      
//     // 3. 创建节点
//     const node = this.svg.append('g')
//       .attr('class', 'nodes')
//       .selectAll('circle')
//       .data(nodes)
//       .enter().append('circle')
//       .attr('r', 15)
//       .attr('fill', (d: { type: string; }) => this.getNodeColor(d.type))
//       .on('click', (event: any, d: any) => this.showNodeDetails(d))
//       .call(d3.drag()
//         .on('start', (event: any, d: any) => this.dragstarted(event, d))
//         .on('drag', (event: any, d: any) => this.dragged(event, d))
//         .on('end', (event: any, d: any) => this.dragended(event, d)));
      
//     // 4. 添加节点标签
//     const labels = this.svg.append('g')
//       .attr('class', 'labels')
//       .selectAll('text')
//       .data(nodes)
//       .enter().append('text')
//       .text((d: { label: any; }) => d.label)
//       .attr('font-size', 12)
//       .attr('dx', 15)
//       .attr('dy', 5);
      
//     // 5. 启动力模拟
//     this.simulation
//       .nodes(nodes)
//       .on('tick', () => this.ticked(link, node, labels));
      
//     this.simulation.force('link' as any)
//       .links(edges);
//   }
//   showNodeDetails(d: any) {
//     throw new Error("Method not implemented.");
//   }
//   dragstarted(event: any, d: any) {
//     throw new Error("Method not implemented.");
//   }
//   dragged(event: any, d: any) {
//     throw new Error("Method not implemented.");
//   }
//   dragended(event: any, d: any) {
//     throw new Error("Method not implemented.");
//   }
//   ticked(link: any, node: any, labels: any) {
//     throw new Error("Method not implemented.");
//   }
  
//   private buildDependencyGraph(frameData: FrameDataType) {
//     const nodes: DependencyNode[] = [];
//     const edges: DependencyEdge[] = [];
    
//     // 添加所有资源作为节点
//     frameData.resources.forEach(res => {
//       nodes.push({
//         id: res.id,
//         type: res.type,
//         label: res.type.split('.')[0],
//         frameID: frameData.frameID
//       });
//     });
    
//     // 分析命令，构建依赖关系
//     frameData.command.forEach(cmd => {
//       // 1. 管线依赖
//       if (cmd.type === 'createRenderPipeline' || cmd.type === 'createComputePipeline') {
//         const pipelineId = cmd.id;
        
//         // 管线依赖着色器模块
//         if (cmd.args.shaderModule) {
//           edges.push({
//             source: pipelineId,
//             target: cmd.args.shaderModule,
//             type: 'uses',
//             weight: 3
//           });
//         }
        
//         // 管线依赖绑定组布局
//         if (cmd.args.bindGroupLayouts) {
//           cmd.args.bindGroupLayouts.forEach((layoutId: any) => {
//             edges.push({
//               source: pipelineId,
//               target: layoutId,
//               type: 'uses',
//               weight: 2
//             });
//           });
//         }
//       }
      
//       // 2. 渲染通道依赖
//       if (cmd.basetype === 'GPURenderPass') {
//         cmd.cmds.forEach((passCmd: { type: string; args: any[]; }) => {
//           if (passCmd.type === 'setPipeline' && passCmd.args[0]) {
//             edges.push({
//               source: cmd.id,
//               target: passCmd.args[0],
//               type: 'uses',
//               weight: 4
//             });
//           }
          
//           if (passCmd.type === 'setBindGroup' && passCmd.args[1]) {
//             edges.push({
//               source: cmd.id,
//               target: passCmd.args[1],
//               type: 'uses',
//               weight: 2
//             });
//           }
//         });
//       }
      
//       // 3. 资源创建依赖（例如纹理创建依赖于设备）
//       if (cmd.type === 'createTexture' && cmd.args.device) {
//         edges.push({
//           source: cmd.id,
//           target: cmd.args.device,
//           type: 'created-by',
//           weight: 1
//         });
//       }
//     });
    
//     return { nodes, edges };
//   }
  
//   private getNodeColor(type: string): string {
//     const colors: Record<string, string> = {
//       'texture': '#4e79a7',
//       'buffer': '#f28e2c',
//       'pipeline': '#e15759',
//       'shader': '#76b7b2',
//       'sampler': '#59a14f',
//       'bindGroup': '#edc949',
//       'bindGroupLayout': '#af7aa1',
//       'commandEncoder': '#9c755f'
//     };
//     return colors[type.split('.')[0]] || '#9c755f';
//   }
  
//   // ... 其他力导向图辅助方法
// }

// // 在 panel.ts 中集成
// let dependencyGraph: WebGPUDependencyGraph | null = null;

// document.addEventListener("DOMContentLoaded", () => {
//   // 创建依赖关系图容器
//   const dependencyContainer = document.createElement('div');
//   dependencyContainer.id = 'dependency-graph-container';
//   dependencyContainer.style.height = '500px';
//   dependencyContainer.style.border = '1px solid #ddd';
//   dependencyContainer.style.marginTop = '20px';
  
//   const framePanel = document.getElementById('frame-info-panel');
//   framePanel?.appendChild(dependencyContainer);
  
//   // 初始化依赖关系图
//   dependencyGraph = new WebGPUDependencyGraph('dependency-graph-container');
  
//   // 当收到帧数据时更新图表
//   port.onMessage.addListener((message: string) => {
//     const receivedData: ReceivedMessage = JSON.parse(message);
//     if (receivedData.type === MsgType.Frame) {
//       const frameData = JSON.parse(receivedData.data as string) as FrameDataType;
//       dependencyGraph?.update(frameData);
//     }
//   });
// });
