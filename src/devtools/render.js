  // 检查浏览器是否支持 WebGPU
  if (!navigator.gpu) {
    alert("WebGPU is not supported in this browser.");
    throw new Error("WebGPU not supported");
  }

  // 获取 <canvas> 元素
  const canvas = document.getElementById('webgpuCanvas');

  async function initWebGPU() {
    // 请求 GPU 设备和上下文
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("Failed to get GPU adapter");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');

    // 配置 WebGPU 上下文
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: device,
      format: format,
      alphaMode: 'opaque'
    });

    // 创建渲染管线
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({
          code: `
            @vertex
            fn main(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4<f32> {
              var positions = array<vec2<f32>, 3>(
                vec2<f32>(0.0, 0.5),    // 顶点 1
                vec2<f32>(-0.5, -0.5), // 顶点 2
                vec2<f32>(0.5, -0.5)   // 顶点 3
              );
              let position = positions[vertexIndex];
              return vec4<f32>(position, 0.0, 1.0);
            }
          `
        }),
        entryPoint: "main"
      },
      fragment: {
        module: device.createShaderModule({
          code: `
            @fragment
            fn main() -> @location(0) vec4<f32> {
              return vec4<f32>(0.3, 0.6, 0.9, 1.0); // 蓝色
            }
          `
        }),
        entryPoint: "main",
        targets: [
          {
            format: format
          }
        ]
      },
      primitive: {
        topology: "triangle-list"
      }
    });

    // 创建命令编码器和渲染通道
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // 背景色
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    });

    renderPass.setPipeline(pipeline);
    renderPass.draw(3); // 绘制 3 个顶点（三角形）
    renderPass.end();

    // 提交命令
    device.queue.submit([commandEncoder.finish()]);
  }

  // 初始化 WebGPU
  initWebGPU().catch((err) => {
    console.error("An error occurred while initializing WebGPU:", err);
  });