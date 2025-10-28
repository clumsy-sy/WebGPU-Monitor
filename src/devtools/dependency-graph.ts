// // src/devtools/dependency-graph.ts
// import * as d3 from 'd3';
// import { FrameDataType } from './replayer/webgpu-types';
// import { ResInfo } from '../global/webgpu-types';

// // 定义节点类型
// export interface DependencyNode {
//   id: string | number;
//   type: string;
//   label: string;
//   frameID: number;
//   details?: string;
//   x?: number;
//   y?: number;
//   vx?: number;
//   vy?: number;
// }

// // 定义边类型
// export interface DependencyEdge {
//   source: string | number;
//   target: string | number;
//   type: string;
//   weight: number;
// }

// // 为 D3 模拟节点添加类型
// interface SimulationNode extends d3.SimulationNodeDatum, DependencyNode {}
// interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
//   type: string;
//   weight: number;
// }

// export class WebGPUDependencyGraph {
//   // private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
//   private svg: d3.Selection<SVGGElement, unknown, null, undefined>; // 关键修复：SVGGElement 替代 SVGSVGElement

//   private simulation: d3.Simulation<SimulationNode, undefined>;
//   private container: HTMLElement;
//   private width: number;
//   private height: number;
  
//   constructor(containerId: string) {
//     this.container = document.getElementById(containerId)!;
//     this.width = this.container.clientWidth;
//     this.height = this.container.clientHeight;
    
//     // 创建SVG容器
//     this.svg = d3.select(this.container)
//       .append('svg')
//       .attr('width', this.width)
//       .attr('height', this.height)
//       .append('g')
//       .attr('transform', `translate(${this.width/2},${this.height/2})`);
      
//     // 初始化力导向图
//     this.simulation = d3.forceSimulation<SimulationNode>()
//       .force('link', d3.forceLink<SimulationNode, SimulationLink>()
//         .id((d: SimulationNode) => String(d.id))
//         .distance(120))
//       .force('charge', d3.forceManyBody<SimulationNode>().strength(-400))
//       .force('center', d3.forceCenter<SimulationNode>(0, 0))
//       .force('collision', d3.forceCollide<SimulationNode>().radius(40))
//       // .on('tick', () => this.ticked());
      
//     // 添加缩放功能
//     const zoom = d3.zoom<SVGSVGElement, unknown>()
//       .scaleExtent([0.1, 4])
//       .on('zoom', (event) => {
//         this.svg.attr('transform', event.transform);
//       });
      
//     // d3.select(this.container).select('svg').call(zoom);
//     d3.select(this.container).select<SVGSVGElement>('svg').call(zoom);
//   }

//   update(frameData: FrameDataType) {
//     // 构建依赖关系图数据
//     const { nodes, edges } = this.buildDependencyGraph(frameData);
    
//     // 清空之前的图形
//     this.svg.selectAll('*').remove();
    
//     // 创建连线
//     const link = this.svg.append('g')
//       .attr('class', 'links')
//       .selectAll('line')
//       .data(edges as SimulationLink[])
//       .enter().append('line')
//       .attr('stroke', '#888')
//       .attr('stroke-opacity', 0.6)
//       .attr('stroke-width', d => Math.sqrt(d.weight));
      
//     // 创建节点
//     const node = this.svg.append('g')
//       .attr('class', 'nodes')
//       .selectAll('circle')
//       .data(nodes as SimulationNode[])
//       .enter().append('circle')
//       .attr('r', d => d.type === 'drawcall' ? 18 : 12)
//       .attr('fill', d => this.getNodeColor(d.type))
//       .on('click', (event, d) => this.showNodeDetails(d))
//       .call(d3.drag<SVGCircleElement, SimulationNode>()
//         .on('start', (event, d) => this.dragstarted(event, d))
//         .on('drag', (event, d) => this.dragged(event, d))
//         .on('end', (event, d) => this.dragended(event, d)));
      
//     // 添加节点标签
//     const labels = this.svg.append('g')
//       .attr('class', 'labels')
//       .selectAll('text')
//       .data(nodes as SimulationNode[])
//       .enter().append('text')
//       .text(d => d.label)
//       .attr('font-size', d => d.type === 'drawcall' ? 14 : 12)
//       .attr('dx', 0)
//       .attr('dy', d => d.type === 'drawcall' ? 25 : 15)
//       .attr('text-anchor', 'middle')
//       .attr('fill', '#333');
      
//     // 添加详细信息提示
//     node.append('title')
//       .text(d => d.details || d.label);
      
//     // 启动力模拟
//     this.simulation
//       .nodes(nodes as SimulationNode[])
//       .on('tick', () => this.ticked(link, node, labels));
      
//     (this.simulation.force('link') as d3.ForceLink<SimulationNode, SimulationLink>)
//       .links(edges as SimulationLink[]);
//   }

//   private ticked(
//     link: d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>,
//     node: d3.Selection<SVGCircleElement, SimulationNode, SVGGElement, unknown>,
//     labels: d3.Selection<SVGTextElement, SimulationNode, SVGGElement, unknown>
//   ) {
//     link
//       .attr('x1', d => (d.source as SimulationNode).x!) // 添加类型断言
//       .attr('y1', d => (d.source as SimulationNode).y!)
//       .attr('x2', d => (d.target as SimulationNode).x!) // 添加类型断言
//       .attr('y2', d => (d.target as SimulationNode).y!);
      
//     node
//       .attr('cx', d => d.x!)
//       .attr('cy', d => d.y!);
      
//     labels
//       .attr('x', d => d.x!)
//       .attr('y', d => d.y!);
//   }

//   private dragstarted(event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode) {
//     if (!event.active) this.simulation.alphaTarget(0.3).restart();
//     d.fx = d.x;
//     d.fy = d.y;
//   }

//   private dragged(event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode) {
//     d.fx = event.x;
//     d.fy = event.y;
//   }

//   private dragended(event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode) {
//     if (!event.active) this.simulation.alphaTarget(0);
//     d.fx = undefined;
//     d.fy = undefined;
//   }

//   private showNodeDetails(d: SimulationNode) {
//     const detailsPanel = document.getElementById('dependency-details');
//     if (detailsPanel) {
//       detailsPanel.innerHTML = `
//         <h4>节点详情</h4>
//         <div class="info-item">
//           <span class="info-label">类型:</span>
//           <span class="info-value">${d.type}</span>
//         </div>
//         <div class="info-item">
//           <span class="info-label">ID:</span>
//           <span class="info-value">${d.id}</span>
//         </div>
//         <div class="info-item">
//           <span class="info-label">标签:</span>
//           <span class="info-value">${d.label}</span>
//         </div>
//         ${d.details ? `<div class="info-item">
//           <span class="info-label">详情:</span>
//           <span class="info-value">${d.details}</span>
//         </div>` : ''}
//       `;
//     }
//   }

//   private isEncoderCmd(cmd: unknown): cmd is { type: 'GPUCommandEncoder', cmds: Array<unknown> } {
//     return typeof cmd === 'object' && cmd !== null && 
//           'type' in cmd && cmd.type === 'GPUCommandEncoder' &&
//           'cmds' in cmd && Array.isArray((cmd as any).cmds);
//   }

//   private buildDependencyGraph(frameData: FrameDataType) {
//     const nodes: DependencyNode[] = [];
//     const edges: DependencyEdge[] = [];
    
//     // 添加所有资源作为节点
//     frameData.resources.forEach(res => {
//       nodes.push({
//         id: res.id,
//         type: res.type.split('.')[0],
//         // label: res.label || `Res ${res.id}`,
//         label: `Res ${res.id}`,
//         frameID: frameData.frameID,
//         details: this.getResourceDetails(res)
//       });
//     });
    
//     // 用于跟踪当前渲染通道中的状态
//     let currentPipeline: number | null = null;
//     let currentBindGroups: (number | null)[] = [];
//     let currentVertexBuffers: (number | null)[] = [];
//     let currentIndexBuffer: number | null = null;
    
//     // 分析命令，构建依赖关系
//     frameData.command.forEach(cmd => {
//       if (cmd.type === 'GPUCommandEncoder') {
//         // 处理命令编码器中的命令
//         if (this.isEncoderCmd(cmd)) {
//           cmd.cmds.forEach(passCmd => {
//             if (passCmd.basetype === 'GPURenderPass') {
//               // 重置当前状态
//               currentPipeline = null;
//               currentBindGroups = [];
//               currentVertexBuffers = [];
//               currentIndexBuffer = null;
              
//               // 处理渲染通道中的命令
//               passCmd.cmds.forEach(renderCmd => {
//                 switch (renderCmd.type) {
//                   case 'setPipeline':
//                     currentPipeline = renderCmd.args[0];
//                     break;
                    
//                   case 'setBindGroup':
//                     const groupIndex = Number(renderCmd.args[0]);
//                     const bindGroup = renderCmd.args[1];
//                     if (!isNaN(groupIndex)) {
//                       currentBindGroups[groupIndex] = bindGroup;
//                     }
//                     break;
                    
//                   case 'setVertexBuffer':
//                     const slot = Number(renderCmd.args[0]);
//                     const buffer = renderCmd.args[1];
//                     if (!isNaN(slot)) {
//                       currentVertexBuffers[slot] = buffer;
//                     }
//                     break;
                    
//                   case 'setIndexBuffer':
//                     currentIndexBuffer = renderCmd.args[0];
//                     break;
                    
//                   case 'draw':
//                   case 'drawIndexed':
//                     // 创建drawcall节点
//                     const drawcallId = `drawcall-${cmd.id}-${renderCmd.type}-${Date.now()}`;
//                     const vertexCount = renderCmd.args[0] || 0;
//                     const instanceCount = renderCmd.args[1] || 1;
                    
//                     nodes.push({
//                       id: drawcallId,
//                       type: 'drawcall',
//                       label: renderCmd.type === 'draw' ? 
//                         `Draw(${vertexCount})` : 
//                         `DrawIndexed(${vertexCount})`,
//                       frameID: frameData.frameID,
//                       details: `顶点数: ${vertexCount}, 实例数: ${instanceCount}`
//                     });
                    
//                     // 创建依赖边
//                     if (currentPipeline) {
//                       edges.push({
//                         source: drawcallId,
//                         target: currentPipeline,
//                         type: 'uses-pipeline',
//                         weight: 4
//                       });
//                     }
                    
//                     currentBindGroups.forEach((bindGroup, i) => {
//                       if (bindGroup !== null && bindGroup !== undefined) {
//                         edges.push({
//                           source: drawcallId,
//                           target: bindGroup,
//                           type: `bindGroup[${i}]`,
//                           weight: 2
//                         });
//                       }
//                     });
                    
//                     currentVertexBuffers.forEach((buffer, i) => {
//                       if (buffer !== null && buffer !== undefined) {
//                         edges.push({
//                           source: drawcallId,
//                           target: buffer,
//                           type: `vertexBuffer[${i}]`,
//                           weight: 2
//                         });
//                       }
//                     });
                    
//                     if (renderCmd.type === 'drawIndexed' && currentIndexBuffer) {
//                       edges.push({
//                         source: drawcallId,
//                         target: currentIndexBuffer,
//                         type: 'indexBuffer',
//                         weight: 3
//                       });
//                     }
//                     break;
//                 }
//               });
//             }
//           });
//         }
//       }
//     });
    
//     return { nodes, edges };
//   }
  
//   private getResourceDetails(res: ResInfo): string {
//     switch (res.type) {
//       case 'createBuffer':
//         return `大小: ${res.desc.size}字节, 用途: ${res.desc.usage}`;
//       case 'createTexture':
//         return `尺寸: ${res.desc.size[0]}x${res.desc.size[1]}, 格式: ${res.desc.format}`;
//       case 'createRenderPipeline':
//         return `顶点着色器: ${res.desc.vertex?.module?.id}, 片段着色器: ${res.desc.fragment?.module?.id}`;
//       default:
//         return JSON.stringify(res.desc).substring(0, 100);
//     }
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
//       'commandEncoder': '#9c755f',
//       'drawcall': '#8b5cf6',
//       'default': '#9c755f'
//     };
//     return colors[type] || colors['default'];
//   }
// }