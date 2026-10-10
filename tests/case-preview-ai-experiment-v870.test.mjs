import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
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
  assert.match(sql,/excluded_tags text\[\] not null default '\{\}'/);
  assert.match(sql,/vf_preview_ai_tags_admin_write/);
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

test('前端：仅实验项目显示一键识别、固定标签顶部、当前图片标签底部',()=>{
  assert.match(appSource,/CASE_PREVIEW_AI_EXPERIMENT_SOURCE_ID = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5'/);
  assert.match(appSource,/id="case-ai-recognize-all"/);
  assert.match(appSource,/case-project-fixed-tags/);
  assert.match(appSource,/id="case-preview-ai-panel"/);
  assert.match(appSource,/renderCasePreviewAiPanel\(backdrop, p, canManage\)/);
  assert.match(appSource,/data-preview-ai-restore/);
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
