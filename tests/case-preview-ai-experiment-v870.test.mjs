import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../functions/api/case-preview-ai-tags.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../sql/021_preview_ai_tags_experiment.sql', import.meta.url), 'utf8');
const sourceId = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5';
const previewId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const contentKey = 'p.png|12|2026-10-10T00:00:00Z';

function request(body) {
  return new Request('https://local.invalid/api/case-preview-ai-tags', {
    method:'POST', headers:{Authorization:'Bearer user-token','Content-Type':'application/json'}, body:JSON.stringify(body)
  });
}

function mockFetch({role='admin', preview=true, current=null}={}) {
  const writes=[];
  const fetcher=async (url, init={})=>{
    const value=String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id:userId,app_metadata:{},user_metadata:{}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role}]);
    if (value.includes('/rest/v1/vf_asset_previews')) return Response.json(preview ? [{id:previewId,source_file_id:sourceId,preview_path:'p.png',preview_size_bytes:12,updated_at:'2026-10-10T00:00:00Z'}] : []);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method||'GET')==='GET') return Response.json(current ? [current] : []);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method==='POST') {
      const row=JSON.parse(init.body); writes.push(row); return Response.json([row]);
    }
    throw new Error('Unexpected request: '+value);
  };
  return {fetcher,writes};
}

const env={SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'};

test('数据库：逐图标签独立存储、级联删除、实验键和人工排除',()=>{
  assert.match(sql,/experiment_key text not null/);
  assert.match(sql,/primary key \(experiment_key, preview_id\)/);
  assert.match(sql,/preview_id uuid not null references public\.vf_asset_previews\(id\) on delete cascade/);
  assert.match(sql,/ai_tags text\[\] not null default '\{\}'/);
  assert.match(sql,/manual_tags text\[\] not null default '\{\}'/);
  assert.match(sql,/excluded_tags text\[\] not null default '\{\}'/);
  assert.match(sql,/vf_preview_ai_tags_admin_write/);
});

test('服务端：手动标签独立保存，AI重识别不会覆盖',async t=>{
  const mock=mockFetch({current:{preview_id:previewId,source_file_id:sourceId,ai_tags:['摩托车'],manual_tags:['kiki'],excluded_tags:[],status:'success'}});
  const old=globalThis.fetch;globalThis.fetch=mock.fetcher;t.after(()=>{globalThis.fetch=old;});
  const response=await handleCasePreviewAiTags(request({action:'save',previewId,tags:['汉堡'],model:'glm-4v-flash',contentKey}),env);
  assert.equal(response.status,200);
  assert.deepEqual(mock.writes.at(-1).ai_tags,['汉堡']);
  assert.deepEqual(mock.writes.at(-1).manual_tags,['kiki']);
});

test('服务端：人工新增不走AI整组覆盖，并可单独删除',async t=>{
  const current={preview_id:previewId,source_file_id:sourceId,ai_tags:['摩托车'],manual_tags:[],excluded_tags:['kiki'],status:'success'};
  const add=mockFetch({current});let old=globalThis.fetch;globalThis.fetch=add.fetcher;t.after(()=>{globalThis.fetch=old;});
  let response=await handleCasePreviewAiTags(request({action:'manual-add',previewId,tag:'kiki'}),env);
  assert.equal(response.status,200);
  assert.deepEqual(add.writes.at(-1).ai_tags,['摩托车']);
  assert.deepEqual(add.writes.at(-1).manual_tags,['kiki']);
  assert.deepEqual(add.writes.at(-1).excluded_tags,[]);
});

test('服务端：图片变化后人工新增会清理旧内容证据并绑定当前版本',async t=>{
  const current={preview_id:previewId,source_file_id:sourceId,ai_tags:['旧AI'],manual_tags:['旧人工'],excluded_tags:['旧排除'],status:'success',content_key:'old'};
  const mock=mockFetch({current});const old=globalThis.fetch;globalThis.fetch=mock.fetcher;t.after(()=>{globalThis.fetch=old;});
  const response=await handleCasePreviewAiTags(request({action:'manual-add',previewId,tag:'新标签'}),env);
  assert.equal(response.status,200);
  assert.deepEqual(mock.writes.at(-1).ai_tags,[]);
  assert.deepEqual(mock.writes.at(-1).manual_tags,['新标签']);
  assert.deepEqual(mock.writes.at(-1).excluded_tags,[]);
  assert.equal(mock.writes.at(-1).content_key,contentKey);
});

test('服务端：重新识别直接应用，但人工排除词不会被加回',async t=>{
  const mock=mockFetch({current:{preview_id:previewId,source_file_id:sourceId,ai_tags:['旧标签'],excluded_tags:['kiki'],status:'success'}});
  const old=globalThis.fetch;globalThis.fetch=mock.fetcher;t.after(()=>{globalThis.fetch=old;});
  const response=await handleCasePreviewAiTags(request({action:'save',previewId,tags:['kiki','摩托车'],model:'glm-4v-flash',contentKey}),env);
  assert.equal(response.status,200);
  assert.deepEqual(mock.writes.at(-1).ai_tags,['摩托车']);
  assert.deepEqual(mock.writes.at(-1).excluded_tags,['kiki']);
  assert.equal(mock.writes.at(-1).source_file_id,sourceId);
  assert.equal(mock.writes.at(-1).experiment_key,'augpicks-v1');
});

test('服务端：旧图片任务不能把标签写到已变化的内容版本',async t=>{
  const mock=mockFetch();const old=globalThis.fetch;globalThis.fetch=mock.fetcher;t.after(()=>{globalThis.fetch=old;});
  const response=await handleCasePreviewAiTags(request({action:'save',previewId,tags:['kiki'],contentKey:'stale'}),env);
  assert.equal(response.status,409);assert.equal(mock.writes.length,0);
});

test('服务端：人工排除可显式撤销',async t=>{
  const mock=mockFetch({current:{preview_id:previewId,source_file_id:sourceId,ai_tags:[],excluded_tags:['kiki'],status:'success'}});
  const old=globalThis.fetch;globalThis.fetch=mock.fetcher;t.after(()=>{globalThis.fetch=old;});
  const response=await handleCasePreviewAiTags(request({action:'restore',previewId,tag:'kiki'}),env);
  assert.equal(response.status,200);
  assert.deepEqual(mock.writes.at(-1).excluded_tags,[]);
  assert.deepEqual(mock.writes.at(-1).ai_tags,['kiki']);
});

test('服务端：不能给实验项目以外的物料写标签',async t=>{
  const mock=mockFetch({preview:false});const old=globalThis.fetch;globalThis.fetch=mock.fetcher;t.after(()=>{globalThis.fetch=old;});
  const response=await handleCasePreviewAiTags(request({action:'save',previewId,tags:['kiki']}),env);
  assert.equal(response.status,404);assert.equal(mock.writes.length,0);
});

test('服务端：写入分区键锁死 augpicks-v1（改名 = 现有 28 行读不到）',()=>{
  assert.match(serverSource,/const EXPERIMENT_KEY = 'augpicks-v1';/);
  assert.match(serverSource,/EXPERIMENT_KEY 现在只是分区名/,'要留注释说明它只是分区名，新项目的行也写这里');
  assert.match(serverSource,/新项目的行也写这里/);
});

// 注意（v903 步1）：**读**已经对全部案例项目开放（`loadAllPreviewAiTags()` + `caseProjectElementTags()`），
// 但**写**（一键识别、逐图标签面板里的采纳/排除）仍只放开实验项目——服务端 `previewFor()` 锁着实验来源，
// 放开属于步 2（写共享库，需用户当次授权）。所以面板仍按"可写"开关，避免点了逐张 404。
test('前端：读全部项目、写仍只放开实验项目（v903 步1）',()=>{
  assert.match(appSource,/CASE_PREVIEW_AI_EXPERIMENT_SOURCE_ID = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5'/);
  // 门禁函数：现在明确分成「读写是否放开」，写这一侧仍是实验项目
  assert.match(appSource,/function isCasePreviewAiExperimentSource\(source\) \{/);
  assert.match(appSource,/function casePreviewAiEnabledFor\(source\) \{\s*\n\s*return isCasePreviewAiExperimentSource\(source\);/);
  assert.match(appSource,/if \(!casePreviewAiEnabledFor\(source\)\) return;/,'一键识别的门禁仍按可写范围');
  assert.match(appSource,/const previewAiEnabled = casePreviewAiEnabledFor\(source\);/);
  // 读数据不再认实验项目：启动读全表、单项目读只按 source_file_id、全库不按 experiment_key 过滤
  assert.match(appSource,/loadAllPreviewAiTags\(\)/);
  assert.match(appSource,/async function loadAllPreviewAiTags\(\) \{/);
  assert.match(appSource,/async function loadPreviewAiTagsForSource\(sourceId\) \{\s*\n\s*if \(!state\.supabase \|\| !sourceId\) return \[\];/);
  assert.doesNotMatch(appSource,/\.eq\('experiment_key'/,'前端读库不再按 experiment_key 过滤');
  assert.match(appSource,/state\.previewAiTagsByPreviewId\.set\(row\.preview_id, row\)/);
  assert.match(appSource,/id="case-ai-recognize-all"/);
  assert.match(appSource,/case-project-fixed-tags/);
  assert.match(appSource,/id="case-preview-ai-panel"/);
  assert.match(appSource,/renderCasePreviewAiPanel\(backdrop, p, canManage\)/);
  assert.match(appSource,/data-preview-ai-restore/);
  assert.match(appSource,/action: 'manual-add'/);
  assert.match(appSource,/action: 'manual-remove'/);
  assert.match(appSource,/isMissingPreviewManualTagsColumn/);
  assert.match(appSource,/previewAiTagsTableReady = 'needs-manual-tags-column'/);
  assert.match(appSource,/需补执行 sql\/021/);
  assert.match(appSource,/action: 'save', previewId: preview\.id, tags:/);
  assert.match(appSource,/casePreviewAiMatchesQuery/);
  assert.match(appSource,/previewAiMatch\.preview/);
});

test('前端：逐图执行、失败保留并可只重试失败项',()=>{
  assert.match(appSource,/Promise\.all\(\[worker\(\), worker\(\)\]\)/);
  assert.match(appSource,/run\.failedIds\.push\(preview\.id\)/);
  assert.match(appSource,/id="case-ai-retry-failed"/);
  assert.match(appSource,/startCasePreviewAiRun\(source, materials, failedIds\)/);
  assert.match(appSource,/action: 'status', status: 'failed'/);
});
