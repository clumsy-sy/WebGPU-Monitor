// ==================== 类型定义 ====================
export interface TextureViewInfo {
  view: GPUTextureView;
  texture: GPUTexture;
  format: GPUTextureFormat;
  width: number;
  height: number;
  label?: string;
}

// ==================== 工具函数 / 常量 ====================

const FORMAT_BYTES_PER_PIXEL: Partial<Record<GPUTextureFormat, number>> = {
  'rgba8unorm': 4,
  'bgra8unorm': 4,
  'rgba16float': 8,
  'depth32float': 4,
  'depth24plus': 4,
  'depth24plus-stencil8': 4,
};

function isDepthFormat(format: GPUTextureFormat): boolean {
  return ['depth24plus', 'depth24plus-stencil8', 'depth32float'].includes(format);
}

function convertHalfToFloat(half: number): number {
  const s = (half & 0x8000) ? -1 : 1;
  const e = (half & 0x7C00) >> 10;
  const f = half & 0x03FF;

  if (e === 0) {
    return s * Math.pow(2, -14) * (f / Math.pow(2, 10));
  } else if (e === 0x1F) {
    return f ? NaN : (s * Infinity);
  }

  return s * Math.pow(2, e - 15) * (1 + f / Math.pow(2, 10));
}

// ==================== Buffer Pool（GPUBuffer复用） ====================

class BufferPool {
  private buffers: GPUBuffer[] = [];

  constructor(private device: GPUDevice) {}

  getBuffer(size: number): GPUBuffer {
    const buffer = this.buffers.find(b => b.size >= size);
    if (buffer) return buffer;

    const newBuffer = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    this.buffers.push(newBuffer);
    return newBuffer;
  }

  releaseBuffer(buffer: GPUBuffer) {
    // 可选逻辑：根据策略决定是否释放
  }
}

// ==================== 格式转换器注册中心 ====================

type FormatConverter = (
  data: Uint8Array,
  width: number,
  height: number
) => ImageData;

const converters: Partial<Record<GPUTextureFormat, FormatConverter>> = {
  rgba8unorm(data, w, h) {
    return new ImageData(new Uint8ClampedArray(data), w, h);
  },
  bgra8unorm(data, w, h) {
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      pixels[i] = data[i + 2];     // R
      pixels[i + 1] = data[i + 1]; // G
      pixels[i + 2] = data[i];     // B
      pixels[i + 3] = data[i + 3]; // A
    }
    return new ImageData(pixels, w, h);
  },
  rgba16float(data, w, h) {
    const pixels = new Uint8ClampedArray(w * h * 4);
    const view = new DataView(data.buffer);
    for (let i = 0; i < w * h; i++) {
      const offset = i * 8;
      for (let c = 0; c < 4; c++) {
        const half = view.getUint16(offset + c * 2, true);
        const float = convertHalfToFloat(half);
        pixels[i * 4 + c] = Math.min(255, Math.max(0, Math.round(float * 255)));
      }
    }
    return new ImageData(pixels, w, h);
  },
  depth32float(data, w, h) {
    const depthData = new Float32Array(data.buffer);
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < depthData.length; i++) {
      const value = Math.round(depthData[i] * 255);
      pixels.set([value, value, value, 255], i * 4);
    }
    return new ImageData(pixels, w, h);
  },
  depth24plus(data, w, h) {
    const pixels = new Uint8ClampedArray(w * h * 4);
    const view = new DataView(data.buffer);
    for (let i = 0; i < w * h; i++) {
      const depthValue = view.getUint32(i * 4, true) >>> 8;
      const normalized = depthValue / 0xFFFFFF;
      const intensity = Math.round(255 * (1 - 1 / (1 + 10 * normalized)));
      pixels.set([intensity, intensity, intensity, 255], i * 4);
    }
    return new ImageData(pixels, w, h);
  },
  'depth24plus-stencil8'(data, w, h) {
    return converters['depth24plus']!(data, w, h);
  }
};

function convertToImageData(
  format: GPUTextureFormat,
  data: Uint8Array,
  width: number,
  height: number
): ImageData {
  const converter = converters[format];
  if (!converter) {
    throw new Error(`Unsupported texture format: ${format}`);
  }
  return converter(data, width, height);
}

// ==================== Texture Viewer 主类 ====================

export class TextureViewer {
  private canvas: HTMLCanvasElement;
  private select: HTMLSelectElement;
  private device: GPUDevice;
  private textureInfos: TextureViewInfo[] = [];
  private bufferPool: BufferPool;
  private textureCache = new WeakMap<GPUTexture, ImageData>();

  constructor(canvasId: string, selectId: string, device: GPUDevice) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.select = document.getElementById(selectId) as HTMLSelectElement;
    this.device = device;

    if (!this.canvas || !this.select || !device) {
      throw new Error("[panel] init texture viewer error");
    }

    this.bufferPool = new BufferPool(device);

    console.log("[panel] init texture viewer");

    this.select.addEventListener("change", () => this.onSelectChange());
  }

  addTextureViews(views: TextureViewInfo[]) {
    this.textureInfos.push(...views);
    this.populateSelectOptions();
  }

  private populateSelectOptions() {
    this.select.innerHTML = this.textureInfos
      .map((info, i) => `
        <option value="${i}">
          ${info.label || `Texture ${i}`} (${info.format}, ${info.width}x${info.height})
        </option>
      `)
      .join("");

    if (this.textureInfos.length > 0) {
      this.select.value = "0";
      this.onSelectChange();
    }
  }

  private async onSelectChange() {
    const selectedIndex = parseInt(this.select.value);
    const textureInfo = this.textureInfos[selectedIndex];

    if (!textureInfo) {
      console.error(`Invalid texture info for index ${selectedIndex}`);
      return;
    }

    try {
      let imageData: ImageData;

      if (this.textureCache.has(textureInfo.texture)) {
        imageData = this.textureCache.get(textureInfo.texture)!;
      } else {
        imageData = await this.getTextureData(textureInfo);
        this.textureCache.set(textureInfo.texture, imageData);
      }

      this.renderToCanvas(imageData);
    } catch (error) {
      console.error(`Failed to load texture data:`, error);
      alert("无法加载纹理，请检查设备兼容性或纹理状态。");
    }
  }

  private async getTextureData(info: TextureViewInfo): Promise<ImageData> {
    const { texture, width, height, format } = info;

    if (isDepthFormat(format)) {
      console.warn(`[panel] Depth texture not supported yet.`);
    }

    const bytesPerPixel = FORMAT_BYTES_PER_PIXEL[format] || 4;
    const minBytesPerRow = width * bytesPerPixel;
    const alignedBytesPerRow = Math.ceil(minBytesPerRow / 256) * 256;
    const bufferSize = alignedBytesPerRow * height;

    const buffer = this.bufferPool.getBuffer(bufferSize);

    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture },
      {
        buffer,
        bytesPerRow: alignedBytesPerRow,
        rowsPerImage: height,
      },
      [width, height]
    );
    this.device.queue.submit([encoder.finish()]);

    await buffer.mapAsync(GPUMapMode.READ);
    const rawData = new Uint8Array(buffer.getMappedRange()).slice(); // 拷贝数据
    buffer.unmap();

    const actualBytesPerRow = width * bytesPerPixel;
    const alignedData = this.removePadding(rawData, width, height, actualBytesPerRow, alignedBytesPerRow);

    return convertToImageData(format, alignedData, width, height);
  }

  private removePadding(
    data: Uint8Array,
    width: number,
    height: number,
    actualBytesPerRow: number,
    alignedBytesPerRow: number
  ): Uint8Array {
    if (actualBytesPerRow === alignedBytesPerRow) return data;

    const result = new Uint8Array(width * height * (actualBytesPerRow / width));
    for (let y = 0; y < height; y++) {
      const srcStart = y * alignedBytesPerRow;
      const srcEnd = srcStart + actualBytesPerRow;
      const dstStart = y * actualBytesPerRow;

      if (srcEnd > data.length) break;
      result.set(data.subarray(srcStart, srcEnd), dstStart);
    }

    return result;
  }

  private renderToCanvas(imageData: ImageData) {
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;

    const ctx = this.canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);

    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.width = `${imageData.width}px`;
    this.canvas.style.height = `${imageData.height}px`;
  }
}