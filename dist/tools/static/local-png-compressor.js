(function(global) {
  'use strict';

  function workerProgram() {
    const CRC_TABLE = (() => {
      const table = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let value = n;
        for (let k = 0; k < 8; k += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        table[n] = value >>> 0;
      }
      return table;
    })();

    function crc32(type, data) {
      let crc = 0xffffffff;
      for (let index = 0; index < type.length; index += 1) crc = CRC_TABLE[(crc ^ type.charCodeAt(index)) & 255] ^ (crc >>> 8);
      for (let index = 0; index < data.length; index += 1) crc = CRC_TABLE[(crc ^ data[index]) & 255] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    }

    function uint32(value) {
      return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
    }

    function chunk(type, data) {
      const payload = data || new Uint8Array(0);
      const output = new Uint8Array(12 + payload.length);
      output.set(uint32(payload.length), 0);
      for (let index = 0; index < 4; index += 1) output[4 + index] = type.charCodeAt(index);
      output.set(payload, 8);
      output.set(uint32(crc32(type, payload)), 8 + payload.length);
      return output;
    }

    function concat(parts) {
      const length = parts.reduce((sum, part) => sum + part.length, 0);
      const output = new Uint8Array(length);
      let offset = 0;
      parts.forEach(part => { output.set(part, offset); offset += part.length; });
      return output;
    }

    function histogram(pixels) {
      const total = pixels.length >>> 2;
      const step = Math.max(1, Math.floor(total / 220000));
      const bins = new Map();
      for (let pixel = 0; pixel < total; pixel += step) {
        const offset = pixel << 2;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];
        const a = pixels[offset + 3];
        const key = ((a >>> 5) << 15) | ((r >>> 3) << 10) | ((g >>> 3) << 5) | (b >>> 3);
        let item = bins.get(key);
        if (!item) {
          item = { count:0, r:0, g:0, b:0, a:0 };
          bins.set(key, item);
        }
        item.count += 1;
        item.r += r;
        item.g += g;
        item.b += b;
        item.a += a;
      }
      return Array.from(bins.values(), item => ({
        count:item.count,
        r:item.r / item.count,
        g:item.g / item.count,
        b:item.b / item.count,
        a:item.a / item.count
      }));
    }

    function boxStats(points) {
      const min = [255, 255, 255, 255];
      const max = [0, 0, 0, 0];
      let weight = 0;
      for (const point of points) {
        const channels = [point.r, point.g, point.b, point.a];
        for (let axis = 0; axis < 4; axis += 1) {
          min[axis] = Math.min(min[axis], channels[axis]);
          max[axis] = Math.max(max[axis], channels[axis]);
        }
        weight += point.count;
      }
      const ranges = max.map((value, axis) => value - min[axis]);
      ranges[3] *= 0.75;
      const axis = ranges.indexOf(Math.max.apply(null, ranges));
      return { points, weight, axis, score:Math.max.apply(null, ranges) * Math.sqrt(Math.max(1, weight)) };
    }

    function splitBox(box) {
      if (box.points.length < 2) return null;
      const channel = ['r', 'g', 'b', 'a'][box.axis];
      const sorted = box.points.slice().sort((left, right) => left[channel] - right[channel]);
      const halfway = box.weight / 2;
      let weight = 0;
      let split = 1;
      for (; split < sorted.length; split += 1) {
        weight += sorted[split - 1].count;
        if (weight >= halfway) break;
      }
      split = Math.max(1, Math.min(sorted.length - 1, split));
      return [boxStats(sorted.slice(0, split)), boxStats(sorted.slice(split))];
    }

    function makePalette(points, maximum) {
      const boxes = [boxStats(points)];
      while (boxes.length < maximum) {
        boxes.sort((left, right) => right.score - left.score);
        const index = boxes.findIndex(box => box.points.length > 1 && box.score > 0);
        if (index < 0) break;
        const current = boxes.splice(index, 1)[0];
        const split = splitBox(current);
        if (!split) { boxes.push(current); break; }
        boxes.push(split[0], split[1]);
      }
      return boxes.map(box => {
        let weight = 0;
        let r = 0, g = 0, b = 0, a = 0;
        box.points.forEach(point => {
          weight += point.count;
          r += point.r * point.count;
          g += point.g * point.count;
          b += point.b * point.count;
          a += point.a * point.count;
        });
        const divisor = Math.max(1, weight);
        return [Math.round(r / divisor), Math.round(g / divisor), Math.round(b / divisor), Math.round(a / divisor)];
      });
    }

    function mapPixels(pixels, palette, width, height) {
        const count = pixels.length >>> 2;
        const indices = new Uint8Array(count);
        const cache = new Int16Array(8 * 32768);
        cache.fill(-1);
      const errorStride = (width + 2) * 3;
      let currentError = new Float32Array(errorStride);
      let nextError = new Float32Array(errorStride);
      const clamp = value => Math.max(0, Math.min(255, value));
      const diffuse = (buffer, x, channel, value, weight) => {
        buffer[(x + 1) * 3 + channel] += value * weight * 0.72;
      };
      for (let y = 0; y < height; y += 1) {
        const direction = y % 2 === 0 ? 1 : -1;
        let x = direction > 0 ? 0 : width - 1;
        const end = direction > 0 ? width : -1;
        for (; x !== end; x += direction) {
          const pixel = y * width + x;
          const offset = pixel << 2;
          const errorOffset = (x + 1) * 3;
          const r = clamp(pixels[offset] + currentError[errorOffset]);
          const g = clamp(pixels[offset + 1] + currentError[errorOffset + 1]);
          const b = clamp(pixels[offset + 2] + currentError[errorOffset + 2]);
          const a = pixels[offset + 3];
          const key = ((a >>> 5) << 15) | ((Math.round(r) >>> 3) << 10) | ((Math.round(g) >>> 3) << 5) | (Math.round(b) >>> 3);
          let best = cache[key];
          if (best < 0) {
            let distance = Infinity;
            best = 0;
            for (let index = 0; index < palette.length; index += 1) {
              const color = palette[index];
              const dr = r - color[0];
              const dg = g - color[1];
              const db = b - color[2];
              const da = a - color[3];
              const next = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11 + da * da * 0.70;
              if (next < distance) { distance = next; best = index; }
            }
            cache[key] = best;
          }
          indices[pixel] = best;
          const selected = palette[best];
          const errors = [r - selected[0], g - selected[1], b - selected[2]];
          for (let channel = 0; channel < 3; channel += 1) {
            if (direction > 0) {
              diffuse(currentError, x + 1, channel, errors[channel], 7 / 16);
              diffuse(nextError, x - 1, channel, errors[channel], 3 / 16);
              diffuse(nextError, x, channel, errors[channel], 5 / 16);
              diffuse(nextError, x + 1, channel, errors[channel], 1 / 16);
            } else {
              diffuse(currentError, x - 1, channel, errors[channel], 7 / 16);
              diffuse(nextError, x + 1, channel, errors[channel], 3 / 16);
              diffuse(nextError, x, channel, errors[channel], 5 / 16);
              diffuse(nextError, x - 1, channel, errors[channel], 1 / 16);
            }
          }
        }
        currentError = nextError;
        nextError = new Float32Array(errorStride);
      }
      return indices;
    }

    function scanlines(indices, width, height, bitDepth) {
      const rowBytes = bitDepth === 4 ? Math.ceil(width / 2) : width;
      const output = new Uint8Array((rowBytes + 1) * height);
      for (let y = 0; y < height; y += 1) {
        const target = y * (rowBytes + 1);
        output[target] = 0;
        if (bitDepth === 8) {
          output.set(indices.subarray(y * width, (y + 1) * width), target + 1);
        } else {
          for (let x = 0; x < width; x += 2) {
            const high = indices[y * width + x] & 15;
            const low = x + 1 < width ? indices[y * width + x + 1] & 15 : 0;
            output[target + 1 + (x >>> 1)] = (high << 4) | low;
          }
        }
      }
      return output;
    }

    async function deflate(data) {
      if (typeof CompressionStream !== 'function') throw new Error('This browser does not support local PNG encoding.');
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function encodeIndexedPng(indices, palette, width, height) {
      const bitDepth = palette.length <= 16 ? 4 : 8;
      const ihdr = new Uint8Array(13);
      ihdr.set(uint32(width), 0);
      ihdr.set(uint32(height), 4);
      ihdr[8] = bitDepth;
      ihdr[9] = 3;
      const plte = new Uint8Array(palette.length * 3);
      const trns = new Uint8Array(palette.length);
      palette.forEach((color, index) => {
        plte[index * 3] = color[0];
        plte[index * 3 + 1] = color[1];
        plte[index * 3 + 2] = color[2];
        trns[index] = color[3];
      });
      const compressed = await deflate(scanlines(indices, width, height, bitDepth));
      return concat([
        new Uint8Array([137,80,78,71,13,10,26,10]),
        chunk('IHDR', ihdr),
        chunk('PLTE', plte),
        chunk('tRNS', trns),
        chunk('IDAT', compressed),
        chunk('IEND', new Uint8Array(0))
      ]);
    }

    self.onmessage = async event => {
      try {
        const { pixelsBuffer, width, height, targetBytes } = event.data;
        const pixels = new Uint8ClampedArray(pixelsBuffer);
        self.postMessage({ type:'progress', progress:8, stage:'分析颜色' });
        const points = histogram(pixels);
        if (!points.length) throw new Error('No image pixels were found.');
        // 低于 256 色会在照片和大面积渐变中产生明显断层。只尝试一次
        // 256 色高质量量化；无法达到目标时由调用方丢弃结果并使用原图走云端压缩。
        const candidates = [256];
        let best = null;
        let bestColors = 0;
        for (let index = 0; index < candidates.length; index += 1) {
          const colorCount = Math.min(candidates[index], points.length);
          const palette = makePalette(points, colorCount);
          self.postMessage({ type:'progress', progress:15 + Math.round(index / candidates.length * 72), stage:String(colorCount) + ' 色压缩' });
          const indices = mapPixels(pixels, palette, width, height);
          const encoded = await encodeIndexedPng(indices, palette, width, height);
          if (!best || encoded.length < best.length) { best = encoded; bestColors = palette.length; }
          if (encoded.length <= targetBytes) break;
        }
        self.postMessage({ type:'result', buffer:best.buffer, colors:bestColors, bytes:best.length }, [best.buffer]);
      } catch (error) {
        self.postMessage({ type:'error', message:error && error.message ? error.message : String(error) });
      }
    };
  }

  let workerUrl = '';
  function getWorkerUrl() {
    if (!workerUrl) workerUrl = URL.createObjectURL(new Blob(['(', workerProgram.toString(), ')()'], { type:'text/javascript' }));
    return workerUrl;
  }

  async function extractPixels(blob) {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently:true });
      if (!context) throw new Error('Unable to create the local compression canvas.');
      context.drawImage(bitmap, 0, 0);
      const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
      return { width:bitmap.width, height:bitmap.height, pixels:imageData.data };
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  }

  async function compress(blob, options) {
    const settings = options || {};
    if (!(blob instanceof Blob) || blob.type !== 'image/png') throw new Error('Local compression currently supports PNG files only.');
    const source = await extractPixels(blob);
    if (settings.signal && settings.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return new Promise((resolve, reject) => {
      const worker = new Worker(getWorkerUrl());
      let settled = false;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        worker.terminate();
        if (settings.signal) settings.signal.removeEventListener('abort', onAbort);
        callback(value);
      };
      const succeed = finish(resolve);
      const fail = finish(reject);
      const onAbort = () => fail(new DOMException('Aborted', 'AbortError'));
      if (settings.signal) settings.signal.addEventListener('abort', onAbort, { once:true });
      worker.onmessage = event => {
        const data = event.data || {};
        if (data.type === 'progress') {
          if (typeof settings.onProgress === 'function') settings.onProgress(data.progress, data.stage);
          return;
        }
        if (data.type === 'error') return fail(new Error(data.message || 'Local PNG compression failed.'));
        if (data.type === 'result') {
          const output = new Blob([data.buffer], { type:'image/png' });
          return succeed({ blob:output, colors:data.colors, bytes:output.size, width:source.width, height:source.height });
        }
      };
      worker.onerror = event => fail(new Error(event.message || 'Local PNG compression worker failed.'));
      worker.postMessage({
        pixelsBuffer:source.pixels.buffer,
        width:source.width,
        height:source.height,
        targetBytes:Math.max(64 * 1024, Number(settings.targetBytes) || 1024 * 1024)
      }, [source.pixels.buffer]);
    });
  }

  global.VFLocalPngCompressor = Object.freeze({ compress });
})(window);
