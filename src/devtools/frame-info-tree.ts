import { cmdInfo, EncoderCmd, FrameDataType, ResInfo } from "../global/webgpu-types";
// import { FrameDataType } from "./replayer/webgpu-types";

  // 树状结构渲染函数
//   function renderTreeView(data: any, parentElement: HTMLElement, depth = 0) {
//     const listItem = document.createElement('li');
    
//     // 处理对象类型
//     if (typeof data === 'object' && data !== null) {
//       const isArray = Array.isArray(data);
      
//       const summary = document.createElement('div');
//       summary.classList.add('tree-node-summary');
//       summary.style.setProperty('--depth', depth.toString());
      
//       const arrow = document.createElement('span');
//       arrow.classList.add('tree-arrow');
//       arrow.innerHTML = '▶';
//       summary.appendChild(arrow);
      
//       const typeLabel = document.createElement('span');
//       typeLabel.classList.add('tree-type');
//       typeLabel.textContent = isArray ? `Array (${data.length})` : 'Object';
//       summary.appendChild(typeLabel);
      
//       const preview = document.createElement('span');
//       preview.classList.add('tree-preview');
      
//       if (!isArray && data.type) {
//         preview.textContent = data.type;
//         preview.classList.add('tree-type-value');
//       } else if (!isArray && Object.keys(data).length > 0) {
//         preview.textContent = Object.keys(data).join(', ');
//       }
//       summary.appendChild(preview);
      
//       listItem.appendChild(summary);
      
//       const children = document.createElement('ul');
//       children.classList.add('tree-children');
//       children.style.display = 'none';
      
//       for (const [key, value] of Object.entries(data)) {
//         const childItem = document.createElement('li');
//         childItem.classList.add('tree-child-item');
        
//         const keyElement = document.createElement('span');
//         keyElement.classList.add('tree-key');
//         keyElement.textContent = `${key}: `;
//         childItem.appendChild(keyElement);
        
//         renderTreeView(value, childItem, depth + 1);
//         children.appendChild(childItem);
//       }
      
//       listItem.appendChild(children);
      
//       // 添加展开/折叠事件
//       summary.addEventListener('click', (e) => {
//         e.stopPropagation();
//         const isOpen = arrow.classList.toggle('open');
//         children.style.display = isOpen ? 'block' : 'none';
//         arrow.innerHTML = isOpen ? '▼' : '▶';
//       });
//     } 
//     // 处理原始值类型
//     else {
//       const valueContainer = document.createElement('span');
//       valueContainer.classList.add('tree-value');
      
//       if (typeof data === 'string') {
//         valueContainer.classList.add('string');
//         valueContainer.textContent = `"${data}"`;
//       } else if (typeof data === 'number') {
//         valueContainer.classList.add('number');
//         valueContainer.textContent = data.toString();
//       } else {
//         valueContainer.textContent = String(data);
//       }
      
//       listItem.appendChild(valueContainer);
//     }
    
//     parentElement.appendChild(listItem);
//   }
  
  // 资源类型图表生成函数
  function generateResourceChart(resources: ResInfo[]) {
    // 统计不同类型资源的数量
    const resourceCounts: Record<string, number> = {};
    
    resources.forEach(resource => {
      const type = resource.type.split('_').pop() || resource.type;
      resourceCounts[type] = (resourceCounts[type] || 0) + 1;
    });
    
    const container = document.createElement('div');
    container.classList.add('chart-container');
    
    // 创建图表标题
    const title = document.createElement('h4');
    title.textContent = '资源类型分布';
    container.appendChild(title);
    
    // 创建图表容器
    const chart = document.createElement('div');
    chart.classList.add('resource-chart');
    
    // 添加资源柱状图
    Object.entries(resourceCounts).forEach(([type, count]) => {
      const bar = document.createElement('div');
      bar.classList.add('chart-bar');
      
      const label = document.createElement('div');
      label.classList.add('chart-label');
      label.textContent = type;
      
      const barInner = document.createElement('div');
      barInner.classList.add('chart-bar-inner');
      barInner.style.width = `${Math.min(count * 20, 100)}%`;
      
      const countLabel = document.createElement('div');
      countLabel.classList.add('chart-count');
      countLabel.textContent = count.toString();
      
      bar.appendChild(label);
      bar.appendChild(barInner);
      bar.appendChild(countLabel);
      chart.appendChild(bar);
    });
    
    container.appendChild(chart);
    return container;
  }
  
  // 帧信息面板组件
  function createFrameInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'frame-info-panel';
    panel.classList.add('frame-info-panel');
    
    // 标题栏
    const header = document.createElement('div');
    header.classList.add('panel-header');
    
    const title = document.createElement('h3');
    title.textContent = '帧信息分析';
    header.appendChild(title);
    
    // 模式切换按钮
    const modeToggle = document.createElement('button');
    modeToggle.id = 'view-mode-toggle';
    modeToggle.classList.add('mode-toggle');
    modeToggle.textContent = '切换到树状视图';
    header.appendChild(modeToggle);
    
    panel.appendChild(header);
    
    // 内容区 - 默认显示概览面板
    const content = document.createElement('div');
    content.classList.add('panel-content');
    
    const overview = document.createElement('div');
    overview.id = 'frame-overview';
    overview.classList.add('frame-overview', 'active-view');
    
    const treeView = document.createElement('div');
    treeView.id = 'frame-tree';
    treeView.classList.add('frame-tree', 'hidden-view');
    
    content.appendChild(overview);
    content.appendChild(treeView);
    panel.appendChild(content);
    
    return panel;
  }
  
  // 显示帧信息
 // 添加帧信息显示函数
function displayFrameInfo(frameInfo: FrameDataType) {
    // 确保面板存在
    const framePanel = document.getElementById('frame-info-panel');
    if (!framePanel) return;
    
    // 确保视图切换按钮存在
    const modeToggle = document.getElementById('view-mode-toggle') as HTMLButtonElement;
    const overview = document.getElementById('frame-overview');
    const treeView = document.getElementById('frame-tree');
    
    if (!modeToggle || !overview || !treeView) return;
    
    // 清空现有内容
    overview.innerHTML = '';
    treeView.innerHTML = '';
    
    // 1. 构建概览视图内容
    const overviewContent = `
      <div class="info-card">
        <h4>帧基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">帧 ID:</span>
            <span class="info-value">${frameInfo.frameID}</span>
          </div>
          <div class="info-item">
            <span class="info-label">尺寸:</span>
            <span class="info-value">${frameInfo.frameWidth} x ${frameInfo.frameHeight}</span>
          </div>
          <div class="info-item">
            <span class="info-label">起始时间:</span>
            <span class="info-value">${frameInfo.frameStartTime.toFixed(2)} ms</span>
          </div>
          <div class="info-item">
            <span class="info-label">结束时间:</span>
            <span class="info-value">${frameInfo.frameEndTime.toFixed(2)} ms</span>
          </div>
          <div class="info-item">
            <span class="info-label">时长:</span>
            <span class="info-value">${(frameInfo.frameEndTime - frameInfo.frameStartTime).toFixed(2)} ms</span>
          </div>
          <div class="info-item">
            <span class="info-label">命令数量:</span>
            <span class="info-value">${frameInfo.command.length}</span>
          </div>
          <div class="info-item">
            <span class="info-label">资源数量:</span>
            <span class="info-value">${frameInfo.resources.length}</span>
          </div>
        </div>
      </div>
      
      <!-- 资源类型分布图表 -->
      <div class="chart-container">
        <h4>资源类型分布</h4>
        <div class="resource-chart">
          ${generateResourceChartHTML(frameInfo.resources)}
        </div>
      </div>
      
      <!-- 命令时间线 -->
      <div class="command-analysis">
        <h4>命令执行时间线</h4>
        <div class="timeline-container">
          ${generateTimelineHTML(frameInfo.command)}
        </div>
      </div>
    `;
    
    overview.innerHTML = overviewContent;
    
    // 2. 构建树状视图
    const treeContainer = document.createElement('div');
    treeContainer.classList.add('frame-tree-container');
    
    const overviewTree = document.createElement('ul');
    overviewTree.classList.add('frame-tree-root');
    renderTreeView({
      frameID: frameInfo.frameID,
      resources: frameInfo.resources,
      commands: frameInfo.command
    }, overviewTree);
    
    treeContainer.appendChild(overviewTree);
    treeView.appendChild(treeContainer);
  }
  
  // 生成资源图表 HTML
  function generateResourceChartHTML(resources: ResInfo[]) {
    const resourceCounts: Record<string, number> = {};
    
    resources.forEach(resource => {
      const type = resource.type.split('_').pop() || resource.type;
      resourceCounts[type] = (resourceCounts[type] || 0) + 1;
    });
    
    let html = '';
    Object.entries(resourceCounts).forEach(([type, count]) => {
      const percentage = Math.min(count * 20, 100);
      html += `
        <div class="chart-bar">
          <div class="chart-label">${type}</div>
          <div class="chart-bar-inner" style="width: ${percentage}%;"></div>
          <div class="chart-count">${count}</div>
        </div>
      `;
    });
    
    return html;
  }
  
  // 生成命令时间线 HTML
  function generateTimelineHTML(commands: Array<EncoderCmd | cmdInfo>) {
    if (commands.length === 0) return '<div class="no-timeline">无有效命令数据</div>';
    
    const minTime = Math.min(...commands.map(cmd => {
      if ('timeStamp' in cmd) return cmd.timeStamp;
      return cmd.time;
    }));
    
    const maxTime = Math.max(...commands.map(cmd => {
      if ('timeStamp' in cmd) return cmd.timeStamp;
      return cmd.time;
    }));
    
    const timeRange = maxTime - minTime;
    
    let html = '';
    commands.forEach(cmd => {
      const time = 'timeStamp' in cmd ? cmd.timeStamp : cmd.time;
      const position = ((time - minTime) / timeRange) * 95;
      
      html += `
        <div class="command-timeline" style="left: ${position}%">
          <div class="timeline-tooltip">
            <strong>${cmd.type}</strong><br>
            时间: ${time.toFixed(2)} ms
          </div>
        </div>
      `;
    });
    
    return html;
  }
  
  // 树状视图渲染函数
  function renderTreeView(data: any, parentElement: HTMLElement, depth = 0) {
    // ...（保持不变）
  }
  
  // DOMContentLoaded 事件中的新增内容
  document.addEventListener("DOMContentLoaded", () => {
    // ...原有代码（按钮事件等）
    
    // 确保面板默认隐藏（直到有数据）
    const framePanel = document.getElementById('frame-info-panel');
    if (framePanel) {
      framePanel.style.display = 'none';
    }
    
    // 添加视图切换功能
    const modeToggle = document.getElementById('view-mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', function(this: HTMLElement) {
        const overview = document.getElementById('frame-overview');
        const tree = document.getElementById('frame-tree');
        
        if (overview && tree) {
          if (overview.classList.contains('active-view')) {
            overview.classList.remove('active-view');
            overview.classList.add('hidden-view');
            tree.classList.remove('hidden-view');
            tree.classList.add('active-view');
            this.textContent = '切换到概览视图';
          } else {
            tree.classList.remove('active-view');
            tree.classList.add('hidden-view');
            overview.classList.remove('hidden-view');
            overview.classList.add('active-view');
            this.textContent = '切换到树状视图';
          }
        }
      });
    }
  });
  

export {displayFrameInfo, createFrameInfoPanel}