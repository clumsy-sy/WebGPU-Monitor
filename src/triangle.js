// console.log("WEB GPU begin -----------\n");
async function main() {
  // choose device
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
      fail('need a browser that supports WebGPU');
      return;
  }

  // swapchain ?
  const canvas = document.querySelector('canvas');
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
      device,
      format: presentationFormat,
  });

  // console.log("[DBG texture] --")
  // console.log(context);

  // shader
  const module = device.createShaderModule({
      label: 'our hardcoded red triangle shaders',
      code: `
        @vertex fn vs(
          @builtin(vertex_index) vertexIndex : u32
        ) -> @builtin(position) vec4f {
          let pos = array(
            vec2f( 0.0,  0.5),  // top center
            vec2f(-0.5, -0.5),  // bottom left
            vec2f( 0.5, -0.5)   // bottom right
          );
  
          return vec4f(pos[vertexIndex], 0.0, 1.0);
        }
  
        @fragment fn fs() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `,
  });

  // pipeline
  const pipeline = device.createRenderPipeline({
      label: 'our hardcoded red triangle pipeline',
      layout: 'auto',
      vertex: {
          module,
          entryPoint: 'vs',
      },
      fragment: {
          module,
          entryPoint: 'fs',
          targets: [{ format: presentationFormat }],
      },
  });

  // render pass
  const renderPassDescriptor = {
      label: 'our basic canvas renderPass',
      colorAttachments: [
          {
              // view: <- to be filled out when we render
              clearValue: [0.3, 0.3, 0.3, 1],
              loadOp: 'clear',
              storeOp: 'store',
          },
      ],
  };

  function render() {
      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      renderPassDescriptor.colorAttachments[0].view = context
          .getCurrentTexture()
          .createView();
  
      // make a command encoder to start encoding commands
      const encoder = device.createCommandEncoder({ label: 'our encoder' });
  
      // make a render pass encoder to encode render specific commands
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3); // call our vertex shader 3 times
      pass.end();
  
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
  }

  render();

}
main();

console.log("WEB GPU end   -----------\n");