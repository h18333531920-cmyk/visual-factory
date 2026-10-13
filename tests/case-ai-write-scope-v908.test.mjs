import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../functions/api/case-preview-ai-tags.js', import.meta.url), 'utf8');

const EXPERIMENT_SOURCE_ID = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5';
const OTHER_SOURCE_ID = '33333333-3333-4333-8333-333333333333';
const previewId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const contentKey = 'p.png|12|2026-10-10T00:00:00Z';
const env = {SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'};

function request(body) {
  return new Request('https://local.invalid/api/case-preview-ai-tags', {
    method:'POST', headers:{Authorization:'Bearer user-token','Content-Type':'application/json'}, body:JSON.stringify(body)
  });
}

// 假的 Supabase：记录每次请求的 URL，previewsRows 由用例决定（用来验"只认请求里那一张"）
function mockFetch({previewRows}={}) {
  const urls = [];
  const writes = [];
  const fetcher = async (url, init = {}) => {
    const value = String(url);
    urls.push(value);
    if (value.includes('/auth/v1/user')) return Response.json({id:userId,app_metadata:{},user_metadata:{}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role:'admin'}]);
    if (value.includes('/rest/v1/vf_asset_previews')) return Response.json(previewRows || []);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') return Response.json([]);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body); writes.push(row); return Response.json([row]);
    }
    throw new Error('Unexpected request: ' + value);
  };
  return {fetcher, urls, writes};
}

function withFetch(mock, t) {
  const old = globalThis.fetch;
  globalThis.fetch = mock.fetcher;
  t.after(() => { globalThis.fetch = old; });
}

const previewRow = (sourceFileId) => [{
  id: previewId, source_file_id: sourceFileId, preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-10T00:00:00Z'
}];

// ── 前端门禁：谁从"只认实验项目"变成"认所有案例项目" ──────────────────────
const gateStart = appSource.indexOf('  function isCasePreviewAiExperimentSource(');
const gateEnd = appSource.indexOf('  function casePreviewAiRow(');
assert.ok(gateStart > 0 && gateEnd > gateStart, '逐图 AI 门禁代码块（isCasePreviewAiExperimentSource + casePreviewAiEnabledFor）必须存在');

function loadGate(projectIds) {
  const context = vm.createContext({
    CASE_PREVIEW_AI_EXPERIMENT_SOURCE_ID: EXPERIMENT_SOURCE_ID,
    isCaseProject: (source) => !!source && projectIds.includes(source.id)
  });
  vm.runInContext(appSource.slice(gateStart, gateEnd) + ';({ isCasePreviewAiExperimentSource, casePreviewAiEnabledFor })', context);
  return context;
}

test('v908 前端门禁：非实验项目的案例项目也启用（不再只看那一个项目）', () => {
  const context = loadGate([EXPERIMENT_SOURCE_ID, OTHER_SOURCE_ID]);

  assert.equal(context.isCasePreviewAiExperimentSource({id: OTHER_SOURCE_ID}), false, '实验来源判定本身不变（仍只认那一个 id）');
  assert.equal(context.casePreviewAiEnabledFor({id: EXPERIMENT_SOURCE_ID}), true);
  assert.equal(context.casePreviewAiEnabledFor({id: OTHER_SOURCE_ID}), true, '步 2：其它案例项目也要能一键识别 / 打开逐图面板');

  // 非案例项目（模板 / 图库单图素材）照旧不显示识别入口
  const single = loadGate([]);
  assert.equal(single.casePreviewAiEnabledFor({id: OTHER_SOURCE_ID}), false, '非案例项目不放开');
  assert.equal(single.casePreviewAiEnabledFor(null), false);
  assert.equal(single.casePreviewAiEnabledFor(undefined), false);
});

test('v908 前端门禁：门禁函数改判 isCaseProject，且面板/一键识别都用它', () => {
  assert.match(appSource, /function casePreviewAiEnabledFor\(source\) \{\s*\n\s*return isCaseProject\(source\);/);
  assert.match(appSource, /if \(!casePreviewAiEnabledFor\(source\)\) return;/, '一键识别的入口仍受门禁保护');
  assert.match(appSource, /const previewAiEnabled = casePreviewAiEnabledFor\(source\);/);
  assert.match(appSource, /if \(previewAiEnabled\) renderCasePreviewAiPanel\(backdrop, p, canManage\);/);
  assert.match(appSource, /if \(previewAiEnabled\) \{[\s\S]{0,120}loadPreviewAiTagsForSource\(source\.id\)/, '浮窗只在门禁通过时才拉这个项目的逐图标签');
  assert.match(appSource, /previewAiEnabled && canManage \? `<button type="button" class="case-ai-scan-btn" id="case-ai-recognize-all">/);
});

// ── 服务端：去掉来源锁，但仍只认请求里的那一张 ────────────────────────────
test('v908 服务端：来源不再锁实验项目，别的案例项目也能写', async (t) => {
  const mock = mockFetch({previewRows: previewRow(OTHER_SOURCE_ID)});
  withFetch(mock, t);
  const response = await handleCasePreviewAiTags(request({action:'save',previewId,tags:['牛排'],model:'glm-4v-flash',contentKey}), env);
  assert.equal(response.status, 200);
  assert.equal(mock.writes.length, 1);
  assert.equal(mock.writes[0].source_file_id, OTHER_SOURCE_ID, 'source_file_id 取库里这一行自己的值');
  assert.equal(mock.writes[0].preview_id, previewId);

  const previewQuery = mock.urls.filter((u) => u.includes('vf_asset_previews'));
  assert.equal(previewQuery.length, 1);
  assert.match(previewQuery[0], new RegExp('id=eq\\.' + previewId), '仍然按请求里带的 preview id 精确查');
  assert.doesNotMatch(previewQuery[0], /source_file_id=eq\./, 'v908 去掉了来源锁');
  assert.doesNotMatch(serverSource, new RegExp(EXPERIMENT_SOURCE_ID), '服务端不该再出现实验项目的 id');
});

test('v908 服务端：只操作请求里那一张——查不到 / 查出多条都拒绝写库', async (t) => {
  const missing = mockFetch({previewRows: []});
  withFetch(missing, t);
  let response = await handleCasePreviewAiTags(request({action:'save',previewId,tags:['牛排'],contentKey}), env);
  assert.equal(response.status, 404);
  assert.equal(missing.writes.length, 0);

  const many = mockFetch({previewRows: previewRow(OTHER_SOURCE_ID).concat(previewRow(OTHER_SOURCE_ID))});
  withFetch(many, t);
  response = await handleCasePreviewAiTags(request({action:'save',previewId,tags:['牛排'],contentKey}), env);
  assert.equal(response.status, 404, 'preview id 必须唯一命中一条');
  assert.equal(many.writes.length, 0);
});

test('v908 服务端：请求体不能指定 source_file_id / experiment_key（写库字段服务端自己定）', async (t) => {
  const mock = mockFetch({previewRows: previewRow(OTHER_SOURCE_ID)});
  withFetch(mock, t);
  const response = await handleCasePreviewAiTags(request({
    action:'save',previewId,tags:['牛排'],contentKey,
    source_file_id: EXPERIMENT_SOURCE_ID, sourceFileId: EXPERIMENT_SOURCE_ID, experiment_key: 'hack-v1'
  }), env);
  assert.equal(response.status, 200);
  assert.equal(mock.writes[0].source_file_id, OTHER_SOURCE_ID, '不认请求体里的 source_file_id');
  assert.equal(mock.writes[0].experiment_key, 'augpicks-v1', '不认请求体里的 experiment_key');
});

test('v908 服务端：experiment_key 仍是 augpicks-v1（改名 = 现有 28 行读不到）', () => {
  assert.match(serverSource, /const EXPERIMENT_KEY = 'augpicks-v1';/);
  assert.match(serverSource, /const EXPERIMENT_KEY = 'augpicks-v1';\nconst UUID/, '分区键常量没被改名（旧行为：改名 = 现有行读不到）');
  assert.match(serverSource, /experiment_key: EXPERIMENT_KEY,/, '写入仍挂同一个分区键');
  assert.match(serverSource, /on_conflict=experiment_key,preview_id/, '仍按 (experiment_key, preview_id) 合并写');
  assert.match(serverSource, /experiment_key=eq\.\$\{EXPERIMENT_KEY\}&preview_id=eq\./, '读当前行也仍按同一个分区键');
  assert.match(serverSource, /value\.length > 12/, '标签长度上限不变');
});

test('v908 服务端：analyze-elements 从来没有来源锁（不用改，但锁住这个事实）', () => {
  const analyzeSource = readFileSync(new URL('../functions/api/analyze-elements.js', import.meta.url), 'utf8');
  assert.doesNotMatch(analyzeSource, new RegExp(EXPERIMENT_SOURCE_ID), 'analyze-elements 里没有实验项目 id');
  assert.doesNotMatch(analyzeSource, /experiment_key|source_file_id/, '它只吃请求里带的图片，不查库里的物料');
});
