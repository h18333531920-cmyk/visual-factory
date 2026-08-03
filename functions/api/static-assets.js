import { getSupabaseConfig, json, requireAdmin } from '../_shared.js';

const DEFAULT_BUCKET = 'vf-library';
const DEFAULT_PATH = 'static/shared-assets.json';

function getStorageTarget(env) {
  return {
    bucket: env?.SHARED_ASSETS_BUCKET || DEFAULT_BUCKET,
    path: env?.SHARED_ASSETS_PATH || DEFAULT_PATH
  };
}

function encodeStoragePath(path) {
  return String(path || '')
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

function emptyAssets() {
  return {
    tagColorPresets: null,
    arcColorPresets: null,
    keywordTags: null,
    presetLibrary: [],
    tagPresetLibrary: [],
    referenceElements: []
  };
}

function normalizeAssetPayload(payload = {}) {
  const data = payload.data || payload;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    data: {
      ...emptyAssets(),
      tagColorPresets: Array.isArray(data.tagColorPresets) ? data.tagColorPresets : null,
      arcColorPresets: Array.isArray(data.arcColorPresets) ? data.arcColorPresets : null,
      keywordTags: Array.isArray(data.keywordTags) ? data.keywordTags : null,
      presetLibrary: Array.isArray(data.presetLibrary) ? data.presetLibrary : [],
      tagPresetLibrary: Array.isArray(data.tagPresetLibrary) ? data.tagPresetLibrary : [],
      referenceElements: Array.isArray(data.referenceElements) ? data.referenceElements : []
    },
    fonts: Array.isArray(payload.fonts) ? payload.fonts : [],
    logos: Array.isArray(payload.logos) ? payload.logos : []
  };
}

function mergeById(existingItems = [], incomingItems = []) {
  const map = new Map();
  [...existingItems, ...incomingItems].forEach((item, index) => {
    if (!item) return;
    const id = item.id || item.name || `item_${index}`;
    map.set(id, item);
  });
  return [...map.values()];
}

async function readExistingPayload(env, target) {
  try {
    const response = await storageFetch(env, target, { method: 'GET' });
    if (!response.ok) return normalizeAssetPayload({});
    return normalizeAssetPayload(await response.json());
  } catch {
    return normalizeAssetPayload({});
  }
}

function mergeAssetPayload(existingPayload, incomingPayload) {
  const existing = normalizeAssetPayload(existingPayload);
  const incoming = normalizeAssetPayload(incomingPayload);
  const incomingData = incoming.data || {};
  const existingData = existing.data || {};

  return {
    ...incoming,
    data: {
      ...incomingData,
      presetLibrary: incomingData.presetLibrary.length
        ? mergeById(existingData.presetLibrary, incomingData.presetLibrary)
        : existingData.presetLibrary,
      tagPresetLibrary: incomingData.tagPresetLibrary.length
        ? mergeById(existingData.tagPresetLibrary, incomingData.tagPresetLibrary)
        : existingData.tagPresetLibrary,
      referenceElements: incomingData.referenceElements.length
        ? mergeById(existingData.referenceElements, incomingData.referenceElements)
        : existingData.referenceElements
    },
    fonts: incoming.fonts.length ? mergeById(existing.fonts, incoming.fonts) : existing.fonts,
    logos: incoming.logos.length ? mergeById(existing.logos, incoming.logos) : existing.logos
  };
}

async function storageFetch(env, target, options = {}) {
  const config = getSupabaseConfig(env);
  if (!config.serviceRoleKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
  const url = `${String(config.url).replace(/\/+$/, '')}/storage/v1/object/${encodeURIComponent(target.bucket)}/${encodeStoragePath(target.path)}`;
  return fetch(url, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      ...(options.headers || {})
    }
  });
}

function assetRevision(response) {
  return response.headers.get('etag') || response.headers.get('last-modified') || '';
}

export async function onRequestGet({ request, env }) {
  try {
    const target = getStorageTarget(env);
    const metadataOnly = new URL(request.url).searchParams.get('meta') === '1';
    const response = await storageFetch(env, target, { method: metadataOnly ? 'HEAD' : 'GET' });
    if (response.status === 404 || response.status === 400) {
      return json(metadataOnly
        ? { success: true, exists: false, revision: '' }
        : { success: true, exists: false, ...normalizeAssetPayload({}) });
    }
    if (!response.ok) {
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      return json({ success: false, message: data?.message || data?.error || data?.raw || `Storage ${response.status}` }, 500);
    }
    if (metadataOnly) {
      return json({ success: true, exists: true, revision: assetRevision(response) });
    }
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return json({ success: false, message: '公共资产包 JSON 解析失败。' }, 500);
    }
    return json({ success: true, exists: true, ...normalizeAssetPayload(payload) });
  } catch (error) {
    return json({ success: false, message: error.message || '公共资产读取失败。' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    await requireAdmin(request, env);
    const target = getStorageTarget(env);
    const existingPayload = await readExistingPayload(env, target);
    const payload = mergeAssetPayload(existingPayload, await request.json());
    payload.updatedAt = new Date().toISOString();
    const response = await storageFetch(env, target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-upsert': 'true'
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    if (!response.ok) {
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      return json({ success: false, message: data?.message || data?.error || data?.raw || `Storage ${response.status}` }, 500);
    }
    return json({ success: true, updatedAt: payload.updatedAt });
  } catch (error) {
    const message = error.message || '公共资产保存失败。';
    const status = /permission|admin|missing bearer|invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
