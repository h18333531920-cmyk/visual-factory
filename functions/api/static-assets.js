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

export async function onRequestGet({ env }) {
  try {
    const target = getStorageTarget(env);
    const response = await storageFetch(env, target, { method: 'GET' });
    const text = await response.text();
    if (response.status === 404 || response.status === 400) {
      return json({ success: true, exists: false, ...normalizeAssetPayload({}) });
    }
    if (!response.ok) {
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      return json({ success: false, message: data?.message || data?.error || data?.raw || `Storage ${response.status}` }, 500);
    }
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
    const payload = normalizeAssetPayload(await request.json());
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
