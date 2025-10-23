export interface TextureViewInfo {
  view: GPUTextureView;
  texture: GPUTexture;
  format: GPUTextureFormat;
  width: number;
  height: number;
  label?: string;
}

const FORMAT_BYTES_PER_PIXEL: Partial<Record<GPUTextureFormat, number>> = {
  'rgba8unorm': 4,
  'rgba16float': 8,
  'depth32float': 4,
  'depth24plus': 4,
  // 添加其他支持的格式...
};


export class TextureViewer {
  private canvas: HTMLCanvasElement;
  private select: HTMLSelectElement;
  private device: GPUDevice;
  private textureInfos: Array<TextureViewInfo> = [];

  constructor(
    canvasId: string,
    selectId: string,
    device: GPUDevice
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.select = document.getElementById(selectId) as HTMLSelectElement;
    this.device = device;

    if(this.canvas && this.select && device) {
      console.log("[panel] init texture viewer");
    } else {
      throw new Error("[panel] init texture viewer error");
    }
    
    this.select.addEventListener('change', () => this.onSelectChange());
  }

  addTextureView(view: TextureViewInfo) {
    this.textureInfos.push(view);
  }
  // 添加捕获的纹理信息
  addTextureViews(views: TextureViewInfo[]) {
    this.textureInfos.push(...views);
    console.log(this.textureInfos);
    this.populateSelectOptions();
  }

  // 填充下拉选项
  private populateSelectOptions() {
    this.select.innerHTML = this.textureInfos
      .map((info, i) => `
        <option value="${i}">
          ${info.label || `Texture ${i}`} (${info.format}, ${info.width}x${info.height})
        </option>
      `).join('');
    
    if (this.textureInfos.length > 0) {
      this.select.value = '0';
      this.onSelectChange();
    }
  }

  // 选择变化时的处理
  private async onSelectChange() {
    const selectedIndex = parseInt(this.select.value);
    const textureInfo = this.textureInfos[selectedIndex];
    
    if (!textureInfo) {
      console.error(`Invalid texture info for index ${selectedIndex}`);
      return;
    }
    // 获取纹理数据
    const imageData = await this.getTextureData(textureInfo);
    this.renderToCanvas(imageData);
  }

  // 获取纹理数据的核心逻辑
  private async getTextureData(info: TextureViewInfo): Promise<ImageData> {
    const { texture, width, height, format } = info;
    if(info.label) {
      console.log(`[panel] getTextureData: ${info.label}`);
    }
    
    console.log(`[panel] getTextureData: ${width}x${height}, format: ${format}, Texture: ${texture}`);

    // 深度纹理特殊处理
    if (this.isDepthFormat(format)) {
      console.warn(`[panel] getTextureData: ${info.label} is a depth texture, not supported`);
      // return this.handleDepthTexture(info);
    }

    // 计算对齐参数
    const bytesPerPixel = FORMAT_BYTES_PER_PIXEL[format] || 4;
    const minBytesPerRow = width * bytesPerPixel;
    const alignedBytesPerRow = Math.ceil(minBytesPerRow / 256) * 256;
    const bufferSize = alignedBytesPerRow * height;

    console.log(`[panel] bytesPerPixel ${bytesPerPixel}, minBytesPerRow ${minBytesPerRow}, alignedBytesPerRow ${alignedBytesPerRow}, bufferSize ${bufferSize}`);

    // 创建临时Buffer
    const buffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // 执行拷贝命令
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture },
      { 
        buffer,
        bytesPerRow: alignedBytesPerRow,
        rowsPerImage: height  // 显式指定行数
      },
      [width, height]
    );
    this.device.queue.submit([encoder.finish()]);

    // 映射并读取数据
    await buffer.mapAsync(GPUMapMode.READ);
    const rawData = new Uint8Array(buffer.getMappedRange());
    console.log("[panel] getTextureData: ", rawData);
    const dataCopy = new Uint8Array(rawData); // 在unmap前复制数据
    console.log("[panel] getTextureData Copy: ", dataCopy);
    dataCopy.set(rawData);
    buffer.unmap();

    // 提取有效数据（去除对齐填充）
    const actualBytesPerRow = width * bytesPerPixel;
    const alignedData = this.removeAlignmentPadding(
      dataCopy,
      width,
      height,
      actualBytesPerRow,
      alignedBytesPerRow
    );

    console.log("[panel] getTextureData aligned: ", alignedData);

    return this.convertToImageData(format, alignedData, width, height);
  }

  // 移除对齐填充的辅助方法
  private removeAlignmentPadding(
    dataCopy: Uint8Array,
    width: number,
    height: number,
    actualBytesPerRow: number,
    alignedBytesPerRow: number
  ): Uint8Array {
    // 在修改前复制数据以避免ArrayBuffer分离
    // const dataCopy = new Uint8Array(rawData.buffer.slice(0)); 
    
    console.log(`[panel] removeAlignmentPadding: ${width}x${height}, actualBytesPerRow ${actualBytesPerRow}, alignedBytesPerRow ${alignedBytesPerRow}`);

    if (actualBytesPerRow === alignedBytesPerRow) {
      return dataCopy;
    }
  
    // 计算每像素字节数
    const bytesPerPixel = actualBytesPerRow / width;
    
    // 创建目标数组（避免内存溢出）
    const result = new Uint8Array(width * height * bytesPerPixel);
  
    for (let y = 0; y < height; y++) {
      const srcStart = y * alignedBytesPerRow;
      const srcEnd = srcStart + actualBytesPerRow; // 修正这里
      const dstStart = y * actualBytesPerRow;
  
      // 确保不越界
      if (srcEnd > dataCopy.length) break;
  
      const rowData = dataCopy.subarray(srcStart, srcEnd);
      result.set(rowData, dstStart);
    }
  
    return result;
  }
  
  // 格式转换处理器
  private convertToImageData(
    format: GPUTextureFormat,
    data: Uint8Array,
    width: number,
    height: number
  ): ImageData {
    switch (format) {
      case 'rgba8unorm':
        return new ImageData(new Uint8ClampedArray(data), width, height);
  
      case 'bgra8unorm': {
        // 交换红蓝通道
        const pixels = new Uint8ClampedArray(data.byteLength);
        for (let i = 0; i < data.length; i += 4) {
          pixels[i] = data[i + 2];     // R
          pixels[i + 1] = data[i + 1]; // G
          pixels[i + 2] = data[i];     // B
          pixels[i + 3] = data[i + 3]; // A
        }
        return new ImageData(pixels, width, height);
      }
  
      case 'rgba16float': {
        const pixels = new Uint8ClampedArray(width * height * 4);
        const view = new DataView(data.buffer);
        for (let i = 0; i < width * height; i++) {
          const offset = i * 8;
          for (let c = 0; c < 4; c++) {
            const halfFloat = view.getUint16(offset + c * 2, true);
            pixels[i * 4 + c] = this.halfFloatToRGBA8(halfFloat);
          }
        }
        return new ImageData(pixels, width, height);
      }
  
      case 'depth24plus': {
        const pixels = new Uint8ClampedArray(width * height * 4);
        const view = new DataView(data.buffer);
        
        for (let i = 0; i < width * height; i++) {
          // 读取32位数据（D24 in high bits + 8 stencil）
          const depthValue = view.getUint32(i * 4, true) >>> 8;
          const normalized = depthValue / 0xFFFFFF;
          
          // 非线性增强显示
          const intensity = Math.round(255 * (1 - 1/(1 + 10 * normalized)));
          
          pixels.set([intensity, intensity, intensity, 255], i * 4);
        }
        return new ImageData(pixels, width, height);
      }
  
      case 'depth32float': {
        const depthData = new Float32Array(data.buffer);
        const pixels = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < depthData.length; i++) {
          const value = Math.round(depthData[i] * 255);
          pixels.set([value, value, value, 255], i * 4);
        }
        return new ImageData(pixels, width, height);
      }
  
      default:
        throw new Error(`Unsupported texture format: ${format}`);
    }
  }
  

  // 16位浮点到8位RGB的转换方法
  private halfFloatToRGBA8(half: number): number {
    // 方法1：简单归一化（适合0-1范围）
    const float = this.convertHalfToFloat(half);
    return Math.min(255, Math.max(0, Math.round(float * 255)));

  }

  // Half float转换器（来自IEEE 754-2008标准）
  private convertHalfToFloat(half: number): number {
    const s = (half & 0x8000) >> 15;
    const e = (half & 0x7C00) >> 10;
    const f = half & 0x03FF;

    if (e === 0) {
      return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10));
    } else if (e === 0x1F) {
      return f ? NaN : (s ? -Infinity : Infinity);
    }

    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / Math.pow(2, 10));
  }

  // 渲染到Canvas
  private renderToCanvas(imageData: ImageData) {
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    
    const ctx = this.canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // 添加缩放显示（可选）
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.width = `${imageData.width}px`;
    this.canvas.style.height = `${imageData.height}px`;
  }
  // 辅助方法：判断是否深度格式
  private isDepthFormat(format: GPUTextureFormat): boolean {
    return [
      'depth24plus',
      'depth24plus-stencil8',
      'depth32float'
    ].includes(format);
  }

}
