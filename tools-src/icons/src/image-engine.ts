/** Browser-only icon compositor. It changes pixels and export metadata, never the source. */
export interface ImageSettings {
  size: 120 | 400;
  bgColor: string;
  transparent: boolean;
  format: 'jpeg' | 'png';
  scale: number;
  /** Translation in a 400 × 400 logical canvas; clamped to the safe area. */
  offsetX: number;
  offsetY: number;
  shadow: boolean;
}

export interface MaskStroke {
  /** Coordinates normalized to the original source image, before alpha cropping. */
  points: { x: number; y: number }[];
  /** Brush radius as a fraction of the original image's shorter side. */
  radius: number;
  mode: 'erase' | 'restore';
}

export interface ExportAsset {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  bytes: number;
}

export class IconImageError extends Error {
  constructor(public readonly code: 'IMAGE_LOAD_FAILED' | 'IMAGE_READ_FAILED' | 'EMPTY_SUBJECT' | 'ENCODE_FAILED' | 'FILE_TOO_LARGE' | 'INVALID_SETTINGS', cause?: unknown) {
    super(code, { cause });
    this.name = 'IconImageError';
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const finite = (v: number, fallback: number) => Number.isFinite(v) ? v : fallback;

function validate(settings: ImageSettings): void {
  if (![120, 400].includes(settings.size) || !['jpeg', 'png'].includes(settings.format)
    || !/^#[0-9a-f]{6}$/i.test(settings.bgColor)) {
    throw new IconImageError('INVALID_SETTINGS');
  }
}

/** Visible subject and optional shadow reserve always remain inside the safe area. */
export function calculateLayout(sourceWidth: number, sourceHeight: number, settings: ImageSettings) {
  validate(settings);
  if (sourceWidth <= 0 || sourceHeight <= 0 || !Number.isFinite(sourceWidth + sourceHeight)) {
    throw new IconImageError('EMPTY_SUBJECT');
  }
  const size = settings.size;
  const margin = size === 120 ? 15 : 48;
  const safeSize = size - margin * 2;
  const shadowReserve = settings.shadow ? size * 0.025 : 0;
  const available = safeSize - shadowReserve * 2;
  const factor = Math.min(available / sourceWidth, available / sourceHeight)
    * clamp(finite(settings.scale, 1), 0.1, 1);
  const width = sourceWidth * factor;
  const height = sourceHeight * factor;
  const min = margin + shadowReserve;
  const x = clamp((size - width) / 2 + finite(settings.offsetX, 0) * size / 400, min, size - min - width);
  const y = clamp((size - height) / 2 + finite(settings.offsetY, 0) * size / 400, min, size - min - height);
  return { x, y, width, height, margin, safeSize, shadowReserve };
}

/** Pass the fixed cropBounds width/height from getSourceGeometry for pointer mapping. */
export const getPlacement = calculateLayout;

export interface SourceGeometry {
  width: number;
  height: number;
  cropBounds: { x: number; y: number; width: number; height: number };
}

function canvas(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = Math.max(1, Math.round(width));
  result.height = Math.max(1, Math.round(height));
  return result;
}

function context(surface: HTMLCanvasElement): CanvasRenderingContext2D {
  const result = surface.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  if (!result) throw new IconImageError('IMAGE_READ_FAILED');
  return result;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(source: string): Promise<HTMLImageElement> {
  if (!source) return Promise.reject(new IconImageError('IMAGE_LOAD_FAILED'));
  const existing = imageCache.get(source);
  if (existing) return existing;
  const result = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    if (!source.startsWith('data:') && !source.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => img.naturalWidth ? resolve(img) : reject(new IconImageError('IMAGE_LOAD_FAILED'));
    img.onerror = event => reject(new IconImageError('IMAGE_LOAD_FAILED', event));
    img.src = source;
  });
  imageCache.set(source, result);
  if (imageCache.size > 12) imageCache.delete(imageCache.keys().next().value!);
  result.catch(() => imageCache.delete(source));
  return result;
}

const sourceCache = new Map<string, Promise<{ image: HTMLCanvasElement; geometry: SourceGeometry }>>();

async function prepareSource(source: string): Promise<{ image: HTMLCanvasElement; geometry: SourceGeometry }> {
  const existing = sourceCache.get(source);
  if (existing) return existing;
  const promise = buildSource(source);
  sourceCache.set(source, promise);
  if (sourceCache.size > 8) sourceCache.delete(sourceCache.keys().next().value!);
  promise.catch(() => sourceCache.delete(source));
  return promise;
}

async function buildSource(source: string): Promise<{ image: HTMLCanvasElement; geometry: SourceGeometry }> {
  const img = await loadImage(source);
  // Protect the prototype from enormous decoded sources without changing the input file.
  const downscale = Math.min(1, 4096 / Math.max(img.naturalWidth, img.naturalHeight),
    Math.sqrt(12_000_000 / (img.naturalWidth * img.naturalHeight)));
  const subject = canvas(img.naturalWidth * downscale, img.naturalHeight * downscale);
  const ctx = context(subject);
  ctx.drawImage(img, 0, 0, subject.width, subject.height);
  let pixels: Uint8ClampedArray;
  try { pixels = ctx.getImageData(0, 0, subject.width, subject.height).data; }
  catch (cause) { throw new IconImageError('IMAGE_READ_FAILED', cause); }
  let left = subject.width, top = subject.height, right = -1, bottom = -1;
  for (let y = 0; y < subject.height; y++) {
    for (let x = 0; x < subject.width; x++) {
      if (pixels[(y * subject.width + x) * 4 + 3] > 0) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) throw new IconImageError('EMPTY_SUBJECT');
  return { image: subject, geometry: { width: subject.width, height: subject.height,
    cropBounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } } };
}

/** Geometry is frozen from the unedited source. Erasing/restoring never moves the image. */
export async function getSourceGeometry(source: string): Promise<SourceGeometry> {
  const { geometry } = await prepareSource(source);
  return { ...geometry, cropBounds: { ...geometry.cropBounds } };
}

async function makeSubject(source: string, strokes: MaskStroke[]): Promise<HTMLCanvasElement> {
  const { image, geometry } = await prepareSource(source);
  const subject = canvas(image.width, image.height);
  const ctx = context(subject);
  ctx.drawImage(image, 0, 0);
  if (strokes.length) {
    const mask = canvas(subject.width, subject.height);
    const mc = context(mask);
    mc.fillStyle = '#fff';
    mc.fillRect(0, 0, mask.width, mask.height);
    mc.lineCap = 'round';
    mc.lineJoin = 'round';
    mc.strokeStyle = '#fff';
    for (const stroke of strokes) {
      const points = stroke.points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (!points.length) continue;
      const radius = clamp(finite(stroke.radius, 0.02), 0.0005, 0.5) * Math.min(mask.width, mask.height);
      mc.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
      mc.lineWidth = radius * 2;
      mc.beginPath();
      mc.moveTo(clamp(points[0].x, 0, 1) * mask.width, clamp(points[0].y, 0, 1) * mask.height);
      if (points.length === 1) {
        mc.arc(clamp(points[0].x, 0, 1) * mask.width, clamp(points[0].y, 0, 1) * mask.height, radius, 0, Math.PI * 2);
        mc.fill();
      } else {
        for (const p of points.slice(1)) mc.lineTo(clamp(p.x, 0, 1) * mask.width, clamp(p.y, 0, 1) * mask.height);
        mc.stroke();
      }
    }
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  const bounds = geometry.cropBounds;
  const trimmed = canvas(bounds.width, bounds.height);
  context(trimmed).drawImage(subject, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  return trimmed;
}

/** Render only. No metadata, downloads, source writes, or generation calls happen here. */
export async function renderIcon(source: string, settings: ImageSettings, maskStrokes: MaskStroke[] = []): Promise<HTMLCanvasElement> {
  validate(settings);
  const subject = await makeSubject(source, maskStrokes);
  const output = canvas(settings.size, settings.size);
  const ctx = context(output);
  const box = calculateLayout(subject.width, subject.height, settings);
  if (!settings.transparent) {
    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, settings.size, settings.size);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.margin, box.margin, box.safeSize, box.safeSize);
  ctx.clip();
  if (settings.shadow) {
    ctx.save();
    ctx.filter = `blur(${settings.size * 0.009}px)`;
    ctx.fillStyle = 'rgba(29, 33, 30, 0.15)';
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height - settings.size * 0.005,
      Math.max(settings.size * 0.012, box.width * 0.39), settings.size * 0.009, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(subject, box.x, box.y, box.width, box.height);
  ctx.restore();
  return output;
}

function encode(surface: HTMLCanvasElement, format: 'jpeg' | 'png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    surface.toBlob(blob => blob ? resolve(blob) : reject(new IconImageError('ENCODE_FAILED')), `image/${format}`, quality);
  });
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let n = index;
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function pngChunk(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(payload.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, payload.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);
  view.setUint32(bytes.length - 4, crc32(bytes.subarray(4, bytes.length - 4)));
  return bytes;
}

/** PNG pHYs stores pixels/metre. 3780 ppm is the nearest integer to 96 DPI. */
export function addPngDpi(input: Uint8Array): Uint8Array {
  if (input.length < 33 || input[0] !== 137 || input[1] !== 80 || input[2] !== 78 || input[3] !== 71) {
    throw new IconImageError('ENCODE_FAILED');
  }
  const payload = new Uint8Array(9);
  const view = new DataView(payload.buffer);
  view.setUint32(0, 3780); view.setUint32(4, 3780); payload[8] = 1;
  const physical = pngChunk('pHYs', payload);
  const chunks: Uint8Array[] = [input.subarray(0, 8)];
  const original = new DataView(input.buffer, input.byteOffset, input.byteLength);
  let offset = 8, inserted = false;
  while (offset + 12 <= input.length) {
    const length = original.getUint32(offset);
    if (length > input.length - offset - 12) throw new IconImageError('ENCODE_FAILED');
    const type = String.fromCharCode(...input.subarray(offset + 4, offset + 8));
    if (type !== 'pHYs') chunks.push(input.subarray(offset, offset + length + 12));
    if (type === 'IHDR') { chunks.push(physical); inserted = true; }
    offset += length + 12;
    if (type === 'IEND') break;
  }
  if (!inserted) throw new IconImageError('ENCODE_FAILED');
  return concat(chunks);
}

/** Set JFIF's density fields; add APP0 if the browser encoder omitted it. */
export function addJpegDpi(input: Uint8Array): Uint8Array {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) throw new IconImageError('ENCODE_FAILED');
  const result = input.slice();
  let offset = 2;
  while (offset + 4 <= result.length && result[offset] === 0xff) {
    const marker = result[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (result[offset + 2] << 8) | result[offset + 3];
    if (length < 2 || offset + 2 + length > result.length) break;
    if (marker === 0xe0 && length >= 16
      && String.fromCharCode(...result.subarray(offset + 4, offset + 9)) === 'JFIF\0') {
      result[offset + 11] = 1;
      result[offset + 12] = 0; result[offset + 13] = 96;
      result[offset + 14] = 0; result[offset + 15] = 96;
      return result;
    }
    offset += length + 2;
  }
  const app0 = new Uint8Array([255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 96, 0, 96, 0, 0]);
  return concat([result.subarray(0, 2), app0, result.subarray(2)]);
}

/** Preserve Chinese and other Unicode names, strip path/control characters and extensions. */
export function sanitizeFilename(value: string, fallback = 'icon'): string {
  let name = value.normalize('NFC').trim().replace(/\.(?:jpe?g|png|zip)$/i, '')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '');
  name = [...name].slice(0, 96).join('').replace(/[. ]+$/g, '');
  if (!name || /^\.+$/.test(name)) name = fallback;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`;
  return name;
}

/** Case-insensitive collisions are avoided for common macOS/Windows extraction tools. */
export function uniqueFilename(filename: string, used: Set<string>): string {
  const dot = filename.lastIndexOf('.');
  const base = dot > filename.lastIndexOf('/') + 1 ? filename.slice(0, dot) : filename;
  const extension = base === filename ? '' : filename.slice(dot);
  let result = filename;
  let suffix = 2;
  while (used.has(result.normalize('NFC').toLocaleLowerCase('en'))) result = `${base}_${suffix++}${extension}`;
  used.add(result.normalize('NFC').toLocaleLowerCase('en'));
  return result;
}

export async function exportIcon(source: string, settings: ImageSettings, name = 'icon', maskStrokes: MaskStroke[] = []): Promise<ExportAsset> {
  const output = await renderIcon(source, settings, maskStrokes);
  const format = settings.transparent ? 'png' : settings.format;
  let bytes: Uint8Array | undefined;
  if (format === 'jpeg') {
    for (const quality of [0.94, 0.87, 0.79, 0.69, 0.58, 0.45, 0.3, 0.15]) {
      const encoded = await encode(output, format, quality);
      bytes = addJpegDpi(new Uint8Array(await encoded.arrayBuffer()));
      if (bytes.byteLength < 200_000) break;
    }
    if (!bytes || bytes.byteLength >= 200_000) throw new IconImageError('FILE_TOO_LARGE');
  } else {
    bytes = addPngDpi(new Uint8Array(await (await encode(output, format)).arrayBuffer()));
  }
  // Own the buffer so this works with TypeScript's strict BlobPart ArrayBuffer types.
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: `image/${format}` });
  const filename = `${sanitizeFilename(name)}_${settings.size}${settings.transparent ? '_transparent' : ''}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  return { blob, filename, width: settings.size, height: settings.size, bytes: blob.size };
}

function zipPath(input: string): string {
  return input.replace(/\\/g, '/').split('/').filter(piece => piece && piece !== '.' && piece !== '..')
    .map(piece => {
      const extension = /\.[a-z0-9]{1,8}$/i.exec(piece)?.[0] ?? '';
      return sanitizeFilename(extension ? piece.slice(0, -extension.length) : piece) + extension;
    }).join('/') || 'icon.png';
}

/** Dependency-free ZIP (STORE), UTF-8 filenames, CRC32, deterministic entry order. */
export async function createZip(assets: Pick<ExportAsset, 'blob' | 'filename'>[]): Promise<Blob> {
  if (assets.length > 65535) throw new IconImageError('FILE_TOO_LARGE');
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  const used = new Set<string>();
  let offset = 0;
  for (const asset of assets) {
    const name = new TextEncoder().encode(uniqueFilename(zipPath(asset.filename), used));
    const data = new Uint8Array(await asset.blob.arrayBuffer());
    if (data.length >= 0xffffffff || name.length > 65535) throw new IconImageError('FILE_TOO_LARGE');
    const crc = crc32(data);
    const header = new Uint8Array(30 + name.length);
    const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(12, 33, true); // 1980-01-01: fixed valid DOS date.
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); header.set(name, 30);
    const directory = new Uint8Array(46 + name.length);
    const d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true);
    d.setUint16(8, 0x0800, true); d.setUint16(14, 33, true); d.setUint32(16, crc, true);
    d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, name.length, true);
    d.setUint32(42, offset, true); directory.set(name, 46);
    local.push(header, data); central.push(directory); offset += header.length + data.length;
    if (offset >= 0xffffffff) throw new IconImageError('FILE_TOO_LARGE');
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  if (offset + centralSize >= 0xffffffff) throw new IconImageError('FILE_TOO_LARGE');
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, assets.length, true); e.setUint16(10, assets.length, true);
  e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return new Blob([...local, ...central, end].map(part => part.slice().buffer as ArrayBuffer), { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
