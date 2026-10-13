// v906 组识别的**行为**验证：把真实代码切进 vm 跑一遍识别循环，
// 看它是不是真的「一组一次多图请求 + 组内每张都写同一套标签 + 失败组内各成员都记失败」。
// 纯源码断言的版本在同目录 case-preview-ai-groups-v906.test.mjs 里。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const groupStart = source.indexOf('  // 检索词本身就是一个物料类型时');
const groupEnd = source.indexOf('  function recentCaseOwnerNames()');
const runStart = source.indexOf('  // v906：按组识别。一个「组」= 1 张');
const runEnd = source.indexOf('  // 上传时请求 AI 元素建议');
assert.ok(groupStart > 0 && groupEnd > groupStart, '配对 + 铺开代码块必须存在');
assert.ok(runStart > 0 && runEnd > runStart, '组识别代码块必须存在');

function loadRun(options = {}) {
  const events = [];
  const previews = options.previews || [];
  const state = {
    lang: 'zh',
    session: {access_token: 'token'},
    libraryPreviewUrls: {},
    libraryPreviews: previews,
    libraryFilters: {query: '', tag2: 'all'},
    previewAiTagsByPreviewId: new Map(),
  };
  const context = vm.createContext({
    state,
    previewAiTagsTableReady: true,
    casePreviewAiRuns: new Map(),
    FILTER_SECTIONS_CONFIG: {activity: {values: ['聚餐']}},
    caseElementVocabulary: () => ['牛排'],
    caseMaterialLanguage: (preview) => String((preview && preview.language) || ''),
    casePreviewAiEnabledFor: () => true,
    casePreviewAiContentKey: (preview) => String(preview.preview_path || '') + '|key',
    loadPreviewAiTagsForSource: async () => [],
    // 服务端动作：记下每一次 save 的入参（真实实现见下面的台账测试）
    postCasePreviewAiTagAction: async (payload) => { events.push(payload); return payload; },
    signVisibleLibraryUrls: async (items) => {
      items.forEach((item) => { state.libraryPreviewUrls[item.preview.preview_path] = 'https://img.invalid/' + item.preview.preview_path; });
    },
    // canvas 缩略图造不出来：按文件名回一个稳定的假 dataURL
    caseElementThumbnailDataUrl: async (file) => 'data:image/jpeg;base64,THUMB-' + file.name,
    translateServerError: (message) => message || '',
    escapeHtml: (value) => String(value == null ? '' : value),
    escapeAttr: (value) => String(value == null ? '' : value),
    libraryDisplayLabel: (value) => value,
    document: {getElementById: () => null},
    crypto: {randomUUID: () => 'run-1'},
    // vm 上下文里没有宿主全局：fetch / File / Blob / Response 显式注入
    // （fetch 走一层转发，测试里换 globalThis.fetch 就能改行为）
    fetch: (...args) => globalThis.fetch(...args),
    File,
    Blob,
    Response,
    showCaseToast: (text) => { events.push({toast: text}); },
    renderLibraryGrid: () => {},
    updateCasePreviewAiRunUi: () => {},
    libraryThumbnailPathForPreview: () => '',
  });
  vm.runInContext(source.slice(groupStart, groupEnd)
    + source.slice(runStart, runEnd)
    + '\n;({ startCasePreviewAiRun, casePreviewAiGroupsOf })', context);
  return {context, events, state};
}

const sourceProject = {id: 'p1', title: 'Ramadan', tags: []};
const materials = [
  {id: '11111111-1111-4111-8111-111111111111', preview_path: 'steak_en.jpg', preview_filename: 'steak_en.jpg', material_type: '弹窗', width: 1080, height: 1920, language: 'en'},
  {id: '22222222-2222-4222-8222-222222222222', preview_path: 'steak_ar.jpg', preview_filename: 'steak_ar.jpg', material_type: '弹窗', width: 1080, height: 1920, language: 'ar'},
];

test('v906 组识别行为：两张同款一次多图请求，组内每张都写同一套标签', async () => {
  const {context, events} = loadRun({previews: materials});
  const analyzeCalls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.startsWith('https://img.invalid/')) return new Response(new Blob(['x'], {type: 'image/jpeg'}), {status: 200});
    if (value === '/api/analyze-elements') {
      analyzeCalls.push(JSON.parse(init.body));
      return Response.json({success: true, provider: 'glm-4v-flash', elements: ['牛排', '餐桌'], activity: '聚餐', sameDesign: true});
    }
    throw new Error('Unexpected request: ' + value);
  };
  try {
    const run = await context.startCasePreviewAiRun(sourceProject, materials);
    assert.equal(run.groupsTotal, 1, 'EN + AR 配成一组成员');
    assert.equal(run.total, 2, '总数仍按图片张数算');
    assert.equal(run.success, 2);
    assert.equal(run.failed, 0);
    assert.equal(analyzeCalls.length, 1, '一组只调一次模型');
    assert.deepEqual(analyzeCalls[0].images.length, 2, '两张缩略图一起发');
    assert.equal(analyzeCalls[0].image, undefined, '多成员组走 images 字段');
    assert.deepEqual(analyzeCalls[0].vocabulary, ['牛排']);
    assert.deepEqual(
      events.filter((event) => event.action === 'save').map((event) => event.previewId),
      [materials[0].id, materials[1].id],
      '组内每一张都保存'
    );
    assert.ok(events.filter((event) => event.action === 'save').every((event) => event.tags.join() === '牛排,餐桌'), '同一套标签');
    assert.ok(events.filter((event) => event.action === 'save').every((event) => event.model === 'glm-4v-flash-group'), '组写标签标 -group');
    assert.ok(events.some((event) => typeof event.toast === 'string' && event.toast.includes('共 1 组')));
  } finally {
    globalThis.fetch = original;
  }
});

test('v906 组识别行为：一组失败 → 组内各成员都记失败、都不写标签', async () => {
  const {context, events} = loadRun({previews: materials});
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.startsWith('https://img.invalid/')) return new Response(new Blob(['x'], {type: 'image/jpeg'}), {status: 200});
    if (value === '/api/analyze-elements') return Response.json({success: false, message: '元素识别服务暂时不可用'}, 500);
    throw new Error('Unexpected request: ' + value);
  };
  try {
    const run = await context.startCasePreviewAiRun(sourceProject, materials);
    assert.equal(run.success, 0);
    assert.equal(run.failed, 2, '组内两张都记失败');
    assert.deepEqual(Array.from(run.failedIds).sort(), [materials[0].id, materials[1].id].sort(), '失败清单要知道是哪两张');
    assert.equal(events.filter((event) => event.action === 'save').length, 0, '失败不写标签，原有标签保持');
    assert.deepEqual(
      events.filter((event) => event.action === 'status' && event.status === 'failed').map((event) => event.previewId),
      [materials[0].id, materials[1].id],
      '组内每张都留下失败状态'
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('v906 组识别行为：模型判「不是同一设计」照样写标签，只在结果里提醒复核', async () => {
  const {context, events} = loadRun({previews: materials});
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.startsWith('https://img.invalid/')) return new Response(new Blob(['x'], {type: 'image/jpeg'}), {status: 200});
    if (value === '/api/analyze-elements') {
      return Response.json({success: true, provider: 'glm-4v-flash', elements: ['牛排'], activity: '', sameDesign: false});
    }
    throw new Error('Unexpected request: ' + value);
  };
  try {
    const run = await context.startCasePreviewAiRun(sourceProject, materials);
    assert.equal(run.sameDesignMismatch, 1);
    assert.equal(events.filter((event) => event.action === 'save').length, 2, '标签照写（模型毕竟看过了全部图）');
    const toast = events.filter((event) => typeof event.toast === 'string').map((event) => event.toast).join('');
    assert.match(toast, /有 1 组被判为不同设计，建议复核/);
  } finally {
    globalThis.fetch = original;
  }
});

test('v906 组识别行为：onlyIds（只补没认出的）不配对，逐张单图请求', async () => {
  const {context} = loadRun({previews: materials});
  const analyzeCalls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.startsWith('https://img.invalid/')) return new Response(new Blob(['x'], {type: 'image/jpeg'}), {status: 200});
    if (value === '/api/analyze-elements') {
      analyzeCalls.push(JSON.parse(init.body));
      return Response.json({success: true, provider: 'glm-4v-flash', elements: ['牛排'], activity: ''});
    }
    throw new Error('Unexpected request: ' + value);
  };
  try {
    const run = await context.startCasePreviewAiRun(sourceProject, materials, [materials[1].id]);
    assert.equal(run.total, 1, '只跑指定的那张');
    assert.equal(run.groupsTotal, 1);
    assert.equal(analyzeCalls.length, 1);
    assert.equal(analyzeCalls[0].images, undefined, 'onlyIds 不走组识别');
    assert.equal(typeof analyzeCalls[0].image, 'string', '仍走单图字段（与原来一字不差）');
  } finally {
    globalThis.fetch = original;
  }
});

// 写入端（服务端 save）确实不会覆盖人工补充/排除 —— 组识别也吃这条保护。
test('v906 服务端 save：组识别写进来的同一套标签不会覆盖人工补充与排除', async (t) => {
  const previewId = '11111111-1111-4111-8111-111111111111';
  const writes = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id: '22222222-2222-4222-8222-222222222222', app_metadata: {}, user_metadata: {}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role: 'admin'}]);
    if (value.includes('/rest/v1/vf_asset_previews')) {
      return Response.json([{id: previewId, source_file_id: 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5', preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-10T00:00:00Z'}]);
    }
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') {
      return Response.json([{preview_id: previewId, ai_tags: ['旧标签'], manual_tags: ['kiki'], excluded_tags: ['烤肉'], status: 'success'}]);
    }
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body);
      writes.push(row);
      return Response.json([row]);
    }
    throw new Error('Unexpected request: ' + value);
  };
  t.after(() => { globalThis.fetch = original; });
  const request = new Request('https://local.invalid/api/case-preview-ai-tags', {
    method: 'POST',
    headers: {Authorization: 'Bearer user-token', 'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'save', previewId, tags: ['牛排', '烤肉'], model: 'glm-4v-flash-group', contentKey: 'p.png|12|2026-10-10T00:00:00Z'})
  });
  const response = await handleCasePreviewAiTags(request, {SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service'});
  assert.equal(response.status, 200);
  assert.deepEqual(writes.at(-1).ai_tags, ['牛排'], '组标签写入，人工排除的「烤肉」不加回');
  assert.deepEqual(writes.at(-1).manual_tags, ['kiki'], '人工补充原样保留');
  assert.deepEqual(writes.at(-1).excluded_tags, ['烤肉']);
  assert.equal(writes.at(-1).model, 'glm-4v-flash-group');
});
