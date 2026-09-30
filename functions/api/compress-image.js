import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { getTinifyKeyCandidates, setTinifyCursor } from '../_tinify.js';

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg']);

function binaryResponse(body, contentType, compressionCount) {
  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  if (compressionCount) headers.set('X-Tinify-Compression-Count', compressionCount);
  return new Response(body, { status: 200, headers });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));

    const candidates = await getTinifyKeyCandidates(env);
    if (!candidates.length) return json({ success: false, message: 'TinyPNG compression is not configured.' }, 503);

    const contentType = String(request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (!SUPPORTED_TYPES.has(contentType)) {
      return json({ success: false, message: 'Only PNG and JPG images can be compressed.' }, 415);
    }

    const declaredLength = Number(request.headers.get('Content-Length')) || 0;
    if (declaredLength > MAX_INPUT_BYTES) {
      return json({ success: false, message: 'The image is too large to compress.' }, 413);
    }
    const source = await request.arrayBuffer();
    if (!source.byteLength) return json({ success: false, message: 'The image is empty.' }, 400);
    if (source.byteLength > MAX_INPUT_BYTES) {
      return json({ success: false, message: 'The image is too large to compress.' }, 413);
    }

    let lastError = null;
    for (const candidate of candidates) {
      const authorization = `Basic ${btoa(`api:${candidate.key}`)}`;
      const shrinkResponse = await fetch('https://api.tinify.com/shrink', {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': contentType },
        body: source
      });
      if (!shrinkResponse.ok) {
        const detail = await shrinkResponse.json().catch(() => ({}));
        lastError = new Error(detail.message || `TinyPNG request failed (${shrinkResponse.status})`);
        // Invalid, exhausted, or rate-limited keys rotate without exposing them to the client.
        if ([401, 429].includes(shrinkResponse.status)) continue;
        throw lastError;
      }

      const resultUrl = shrinkResponse.headers.get('Location');
      if (!resultUrl) throw new Error('TinyPNG did not return a result URL.');
      const resultResponse = await fetch(resultUrl, { headers: { Authorization: authorization } });
      if (!resultResponse.ok) {
        lastError = new Error(`TinyPNG result download failed (${resultResponse.status})`);
        if ([401, 429].includes(resultResponse.status)) continue;
        throw lastError;
      }

      const result = await resultResponse.arrayBuffer();
      if (!result.byteLength) throw new Error('TinyPNG returned an empty image.');
      await setTinifyCursor(env, candidate.index);
      return binaryResponse(
        result,
        resultResponse.headers.get('Content-Type') || contentType,
        shrinkResponse.headers.get('Compression-Count')
      );
    }
    throw lastError || new Error('No TinyPNG API key is currently available.');
  } catch (error) {
    const message = error?.message || 'Image compression failed.';
    const status = /Unauthorized|Invalid session|Missing bearer/i.test(message) ? 401 : 502;
    return json({ success: false, message }, status);
  }
}
