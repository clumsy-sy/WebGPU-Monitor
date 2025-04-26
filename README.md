# WebGPU Monitor

## 介绍

WebGPU Monitor 的目标一个用于 WebGPU 性能分析工具（类似于 Renderdoc 但是完全基于浏览器）。它可以帮助开发者了解 WebGPU 的性能瓶颈，并提供优化建议。

## 运行


目前还只有本地版本

```sh
npm install
npm run build
```

然后当作 chrome 插件即可

## 开发计划

### 思路

1. 如何拦截WebGPU的API调用
2. 如何记录WebGPU的调用栈，哪个部分的代码发起了特定的WebGPU操作（可能需要处理异步情况）
3. 资源追踪，跟踪这些资源的创建、修改和销毁，记录它们的状态变化，这样在分析时可以查看资源的使用情况，比如是否有未释放的资源导致内存泄漏。
4. 时间戳和性能数据的收集
5. 将API调用与实际的GPU操作对应起来，比如渲染通道、着色器执行
6. 数据存储和回放功能
7. 分析部分需要提供性能瓶颈的检测，比如检测频繁的API调用、资源泄露、渲染效率低的命令等。自动化分析可以通过预设规则，比如检测过多的纹理切换，或者过大的数据传输
8. 跨浏览器兼容性方面（优先考虑 chrome）


### WebGPU 分析插件的核心功能规划

**基础功能**

|功能|实现难度|必要性|技术方案|
|----|----|----|----|
|API 调用记录|★★☆|高|劫持 navigator.gpu 及所有子对象方法|
|资源生命周期追踪|★★★|高|WeakRef + FinalizationRegistry 跟踪资源销毁|
|帧边界标记|★★☆|高|劫持 queue.submit() 自动划分帧边界|
|基本性能统计|★☆☆|中|统计调用次数、耗时分布、数据传输量|
|JSON 数据导出|★☆☆|中|结构化日志 + 资源快照|

**进阶功能**

|功能|实现难度|必要性|技术方案|
|----|----|----|----|
|着色器热替换|★★★★|高|拦截 createShaderModule + 动态重编译|
|资源内容查看器|★★★★|中|通过 copyBufferToBuffer 窃取数据 + Canvas 可视化|
|依赖关系图谱|★★★☆|中|构建资源引用图 + D3.js 可视化|
|GPU 时间戳查询|★★★☆|高|注入时间戳指令 + 异步解析结果|
|自动化瓶颈检测|★★☆☆|中|基于规则的异常模式识别（如高频小 Buffer 上传）|

**高级功能**

|功能|实现难度|必要性|技术方案|
|----|----|----|----|
|跨帧状态比对|★★★★☆|低|差分算法对比资源状态变化|
|多线程支持|★★★★★|高|Worker 数据同步 + SharedArrayBuffer|
|实时回放引擎|★★★★★|中|虚拟 GPU 环境模拟 + 调用序列重演|
|浏览器集成调试|★★★☆|高|Chrome DevTools Protocol 深度整合|


### API Hook

通信主流程

```
["world": "MAIN"]
  ├── 劫持后的 navigator.gpu (main_world.js)
  └── 通过 postMessage 发送日志
          ↓
["world": "ISOLATED"] 
  ├── 接收消息 (isolated_world.js)
  └── 通过 chrome.runtime 转发到后台
          ↓
[扩展后台] 
  ├── 处理数据存储
  └── 推送至 DevTools 面板

```


### 插件通信流程

```mermaid
graph TD
    A[网页加载 ] --> B[Chrome扩展注入脚本]
    B --> C[运行脚本]
    C --> |劫持WebGPU API|D[持续监控WebGPU活动捕获]
    C --> |捕获帧| E[记录 Command]
    
    D --> |保持|F[记录 resource ]
    E -->|帧完成| G[缓存绘制命令和资源]
    F --> G

    
    H[点击 Capture 按钮] --> I[发送捕获信号] --> C
    
    subgraph 网页上下文
        G --> J[序列化为JSON数据]
        J --> M[通过Chrome Messaging传递]
    end
    
    subgraph DevTools上下文
        M --> N[接收序列化数据]
        N --> O[解析并可视化]
        O --> P[显示 Texture]
    end
    
    C -->|监听URL变化| Q{检测到页面跳转}
    Q -->|是| R[销毁旧页面监控]
    R --> S[重新初始化注入]
```

```mermaid
sequenceDiagram
  participant Browser
  participant ContentScript
  participant ResourceTracker
  participant CommandRecorder
  participant FrameManager
  
  Browser->>ContentScript: WebGPU API Call
  ContentScript->>ResourceTracker: Track Resource
  ContentScript->>CommandRecorder: Record Command
  ContentScript->>FrameManager: Update Frame Data
  FrameManager->>chrome.runtime: Send Frame Data
  chrome.runtime->>DevTools: Process & Display
```

### 核心功能

检测render pipeline分界，分析调用栈，相同代码多次绘制的对比
实时热重载调试，可以修改任意资源，直接应用到页面中（类似修改，拖动，连接蓝图结点）
展示各类型数据（模型、贴图输入、buffer、texture 输出）
WebAssembly

### 细分

-[ ] 改用 typescript 重写 拦劫函数
-[ ] 更加完善的信息传递（json 压缩）
-[ ] 更加详细的渲染统计，仿照 RenderDoc
-[ ] 一帧信息，应当由子树你推形成，而非全部记录
-[ ] devtools 展示部分需要各种资源之间的相互链接
-[ ] buffer viewer / Mesh Viewer
-[ ] texture viewer
-[ ] shader viewer + editor
-[ ] TimeLine / event Browser / API inspector / Resource Browser

###

1. 检测render pipeline分界，分析调用栈，Bson
2. 完善捕获 API，展示界面
3. 相同代码多次绘制的对比
4. 实时热重载调试，可以修改任意资源，直接应用到页面中（类似修改，拖动，连接蓝图结点）
5. 