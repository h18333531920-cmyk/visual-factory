/**
 * Prototype-only catalogue. Every image is cropped from the user's supplied
 * reference screenshots. Nothing here is AI generated or a production cutout.
 * sourceRect and all mockup rectangles use normalized natural-image coordinates.
 */
export type SampleLocale = 'zh' | 'en';
export type NormalizedRect = { x: number; y: number; width: number; height: number };
export type Sample = {
  id: string;
  name: Record<SampleLocale, string>;
  keywords: string[];
  sourceUrl: string;
  sourceRect: NormalizedRect;
  provenance: 'reference-demo';
};

const assetBase = import.meta.env.BASE_URL;
const keeta = `${assetBase}references/keeta.png`;
const talabat = `${assetBase}references/talabat.png`;
export const DEFAULT_SAMPLE_ID = 'oranges';
const rect = (x: number, y: number, width: number, height: number, iw: number, ih: number): NormalizedRect => ({ x: x / iw, y: y / ih, width: width / iw, height: height / ih });
const k = (x: number, y: number, w: number, h: number) => rect(x, y, w, h, 750, 1620);
// Talabat coordinates below are measured against the 945×2048 reference display,
// and normalized to correctly crop its 1179×2556 original without resampling it.
const t = (x: number, y: number, w: number, h: number) => rect(x, y, w, h, 945, 2048);
const item = (id: string, zh: string, en: string, keywords: string[], sourceUrl: string, sourceRect: NormalizedRect): Sample => ({ id, name: { zh, en }, keywords, sourceUrl, sourceRect, provenance: 'reference-demo' });

export const samples: Sample[] = [
  item('bananas', '香蕉', 'Bananas', ['香蕉', 'banana', 'bananas'], keeta, k(32, 550, 320, 237)),
  item('grapes', '青提', 'Green grapes', ['葡萄', '青提', 'grapes', 'grape'], keeta, k(49, 1050, 284, 247)),
  item('oranges', '橙子', 'Oranges', ['橙子', '橘子', '柑橘', 'orange', 'oranges', 'citrus'], keeta, k(414, 1077, 287, 201)),
  item('lemons', '柠檬', 'Lemons', ['柠檬', 'lemon', 'lemons'], talabat, t(108, 944, 288, 249)),
  item('apples-pears', '苹果与梨', 'Apples & pears', ['苹果', '梨', 'apples', 'apple', 'pears', 'pear'], talabat, t(601, 465, 144, 105)),
  item('berries', '混合莓果', 'Berries', ['莓果', '草莓', '蓝莓', '黑莓', 'berries', 'berry', 'strawberry', 'strawberries'], talabat, t(805, 445, 117, 134)),
  item('organic-fruit', '有机水果', 'Organic fruit', ['有机水果', 'organic fruit', 'fruit mix'], talabat, t(214, 459, 145, 112)),
  item('melon', '蜜瓜', 'Melon', ['蜜瓜', '香瓜', '哈密瓜', 'melon', 'cantaloupe'], keeta, k(465, 206, 94, 84)),
  item('papaya', '木瓜', 'Papaya', ['木瓜', 'papaya'], keeta, k(608, 211, 105, 78)),
];

export function matchSample(text: string): Sample | undefined {
  const value = text.toLowerCase().trim();
  if (!value) return undefined;
  return samples.find(sample => sample.id === value || Object.values(sample.name).some(name => name.toLowerCase() === value))
    ?? samples.find(sample => sample.keywords.some(keyword => value.includes(keyword)));
}

export function getSampleId(text: string): string | undefined {
  return matchSample(text)?.id;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const sampleCache = new Map<string, Promise<string>>();

function loadReference(url: string): Promise<HTMLImageElement> {
  let promise = imageCache.get(url);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { imageCache.delete(url); reject(new Error('REFERENCE_IMAGE_UNAVAILABLE')); };
      image.src = url;
    });
    imageCache.set(url, promise);
  }
  return promise;
}

/**
 * Edge-connected light-backdrop removal for THESE reference fruit samples only.
 * Interior light regions are not globally keyed out; no semantic understanding or
 * guarantee is implied for white packaging, glass, new uploads, or production use.
 */
function removeReferenceBackdrop(image: ImageData): ImageData {
  const { width, height, data } = image;
  const pixels = width * height;
  const background = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  const isBackdrop = (pixel: number) => {
    const offset = pixel * 4;
    const r = data[offset]; const g = data[offset + 1]; const b = data[offset + 2];
    return Math.min(r, g, b) >= 222 && Math.max(r, g, b) - Math.min(r, g, b) <= 25;
  };
  const add = (pixel: number) => {
    if (background[pixel] || !isBackdrop(pixel)) return;
    background[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width; const y = Math.floor(pixel / width);
    if (x > 0) add(pixel - 1);
    if (x + 1 < width) add(pixel + 1);
    if (y > 0) add(pixel - width);
    if (y + 1 < height) add(pixel + width);
  }
  // Discard tiny detached screenshot artefacts, e.g. a badge corner touching a
  // reference crop. Keep all substantial components in simple fruit groupings.
  const visited = new Uint8Array(pixels);
  const component = new Int32Array(pixels);
  const minimumComponent = Math.max(12, Math.round(pixels * 0.0015));
  for (let start = 0; start < pixels; start++) {
    if (background[start] || visited[start]) continue;
    let read = 0; let count = 1;
    component[0] = start; visited[start] = 1;
    const visit = (pixel: number) => {
      if (background[pixel] || visited[pixel]) return;
      visited[pixel] = 1; component[count++] = pixel;
    };
    while (read < count) {
      const pixel = component[read++]; const x = pixel % width; const y = Math.floor(pixel / width);
      if (x > 0) visit(pixel - 1);
      if (x + 1 < width) visit(pixel + 1);
      if (y > 0) visit(pixel - width);
      if (y + 1 < height) visit(pixel + width);
    }
    if (count < minimumComponent) for (let i = 0; i < count; i++) background[component[i]] = 1;
  }
  for (let pixel = 0; pixel < pixels; pixel++) {
    const offset = pixel * 4;
    if (background[pixel]) { data[offset + 3] = 0; continue; }
    const x = pixel % width; const y = Math.floor(pixel / width);
    const touchesBackdrop = (x > 0 && background[pixel - 1]) || (x + 1 < width && background[pixel + 1]) || (y > 0 && background[pixel - width]) || (y + 1 < height && background[pixel + width]);
    if (touchesBackdrop) {
      // A fractional boundary softens the one-pixel edge without shrinking the
      // whole image or applying destructive white removal inside the fruit.
      const lightness = Math.min(data[offset], data[offset + 1], data[offset + 2]);
      data[offset + 3] = lightness > 180 ? 150 : 225;
    }
  }
  return image;
}

/**
 * Optional upload DEMONSTRATION, not AI segmentation. The UI must identify this
 * limitation. Edge-connected light regions can include real white objects; glass
 * and complex backgrounds need a real segmentation service in production.
 * This only demonstrates the editing flow and must not claim compliant cutouts.
 */
export async function removeDemoBackground(source: string): Promise<string> {
  const image = await loadReference(source);
  const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('CANVAS_UNAVAILABLE');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.putImageData(removeReferenceBackdrop(context.getImageData(0, 0, canvas.width, canvas.height)), 0, 0);
  return canvas.toDataURL('image/png');
}

/** Returns a tightly bounded transparent PNG data URL from a supplied screenshot. */
export async function getSample(id: string): Promise<string> {
  const sample = samples.find(value => value.id === id);
  if (!sample) throw new Error('UNKNOWN_DEMO_SAMPLE');
  const existing = sampleCache.get(id);
  if (existing) return existing;
  const promise = (async () => {
    const reference = await loadReference(sample.sourceUrl);
    const source = sample.sourceRect;
    const sx = Math.round(source.x * reference.naturalWidth);
    const sy = Math.round(source.y * reference.naturalHeight);
    const sw = Math.round(source.width * reference.naturalWidth);
    const sh = Math.round(source.height * reference.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('CANVAS_UNAVAILABLE');
    context.drawImage(reference, sx, sy, sw, sh, 0, 0, sw, sh);
    const pixels = removeReferenceBackdrop(context.getImageData(0, 0, sw, sh));
    context.putImageData(pixels, 0, 0);
    let left = sw; let top = sh; let right = -1; let bottom = -1;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (pixels.data[(y * sw + x) * 4 + 3] > 32) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw new Error('EMPTY_DEMO_CROP');
    const pad = 2;
    const output = document.createElement('canvas');
    output.width = right - left + 1 + pad * 2;
    output.height = bottom - top + 1 + pad * 2;
    output.getContext('2d')!.drawImage(canvas, left, top, right - left + 1, bottom - top + 1, pad, pad, right - left + 1, bottom - top + 1);
    return output.toDataURL('image/png');
  })();
  sampleCache.set(id, promise);
  promise.catch(() => sampleCache.delete(id));
  return promise;
}

export type MockupSlot = { imageRect: NormalizedRect; labelRect: NormalizedRect; sampleId: string };
export type MockupTemplate = {
  id: 'grocery'; name: string; sourceUrl: string;
  naturalWidth: number; naturalHeight: number;
  row: NormalizedRect; slots: MockupSlot[];
  provenance: 'user-reference';
};

/**
 * Render source image at width:100%, height:auto, position:relative. Only `row`
 * receives an opaque white overlay, then the five image/name slots. No cropping
 * or stretching the entire screenshot. All rectangles are relative to full image.
 * Keeta intentionally replaces All/Deals too: those are sample category slots in
 * this prototype, not actual working shopping navigation.
 */
export const mockupTemplates: MockupTemplate[] = [
  {
    id: 'grocery', name: 'APP', sourceUrl: `${assetBase}references/grocery-preview.png`,
    naturalWidth: 850, naturalHeight: 1850,
    row: rect(0, 330, 850, 209, 850, 1850), provenance: 'user-reference',
    slots: ['berries', 'bananas', 'apples-pears', 'grapes', 'oranges', 'lemons', 'melon'].map((sampleId, index) => ({
      imageRect: rect(28 + index * 156, 343, 105, 105, 850, 1850),
      labelRect: rect(2 + index * 156, 466, 156, 68, 850, 1850), sampleId,
    })),
  },
];
