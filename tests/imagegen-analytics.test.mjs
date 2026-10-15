// 生图埋点（v742）：secure-image 网关在任务成功落账（status→ready）时，
// 用 env 里的 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 向主站 Supabase 的
// vf_asset_events 追加一条 event_type='imagegen' 的事件，meta 记录
// model/model_label/kind/origin/job_id/account_label。
// 红线：埋点失败绝不影响生图主链路；未配置凭据时完全静默；同一任务只记一次。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSecureImageApi,IMAGE_MODELS} from '../services/secure-image/server/secure-image-api.mjs';
import {createAccountAuth} from '../services/secure-image/server/account-auth.mjs';

const origin='https://asset-gallery-test.visual-factory.pages.dev';
const supabaseBase='https://supabase.test';
const userUuid='9f1c3b2a-1111-4222-8333-cccccccccccc';
const PNG='iVBORw0KGgoAAAANSUhEUg==';
const jobId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const job2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const iconPro={kind:'icons',input:{name:'orange',model:'site-jimeng-pro',composition:'auto',references:[]}};
const diyPro={kind:'diy',input:{prompt:'orange',model:'jimeng-image-5.0-pro',resolution:'2k',ratio:'1:1',images:[]}};

async function until(fn,ms=3000){
 const start=Date.now();
 while(Date.now()-start<ms){
  if(fn())return;
  await new Promise(r=>setTimeout(r,20));
 }
 if(!fn())throw Error('condition not met');
}

function makeApi(directory,{analyticsOk=true,calls=[],env}={}){
 return createSecureImageApi({
  directory,origins:[origin],
  authorize:async()=>({id:userUuid,name:'测试账号',permissions:{diy:true,icons:true}}),
  loadCredentials:async()=>({sessionid:'TEST_ONLY'}),
  delay:async()=>{},
  env:env===undefined?{SUPABASE_URL:supabaseBase,SUPABASE_SERVICE_ROLE_KEY:'service-test-key'}:env,
  fetcher:async(url,init)=>{
   const u=new URL(url);
   if(u.origin===supabaseBase){
    calls.push({url:url,method:init&&init.method,headers:init&&init.headers,body:init&&init.body});
    if(!analyticsOk)return new Response('upstream-error',{status:500});
    return new Response('{}',{status:201});
   }
   if(u.pathname==='/v1/images/generations/async'&&!u.search)return Response.json({task_id:'task-1'});
   if(u.pathname==='/v1/images/generations/async')return Response.json({status:'done',data:[{b64_json:PNG}]});
   return Response.json({});
  },
 });
}
const postJob=(api,id,body)=>api.handle(new Request('https://jimeng.gccdesign.app/api/image-service/v1/jobs/'+id,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
const getJob=(api,id)=>api.handle(new Request('https://jimeng.gccdesign.app/api/image-service/v1/jobs/'+id,{method:'GET',headers:{Origin:origin}}));

test('成功生图后向 Supabase 追加 imagegen 事件（icons 入口，字段完整）',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-imagegen-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const calls=[];
 const api=makeApi(directory,{calls});
 const post=await postJob(api,jobId,iconPro);
 assert.equal(post.status,202);
 await api.idle();
 const get=await getJob(api,jobId);
 assert.equal((await get.json()).status,'ready');
 await until(()=>calls.length===1);
 const call=calls[0],sent=JSON.parse(call.body);
 assert.equal(call.url,supabaseBase+'/rest/v1/vf_asset_events');
 assert.equal(call.method,'POST');
 assert.equal(call.headers.apikey,'service-test-key');
 assert.equal(call.headers.Authorization,'Bearer service-test-key');
 assert.equal(call.headers.Prefer,'return=minimal');
 assert.equal(sent.event_type,'imagegen');
 assert.equal(sent.actor_id,userUuid);
 assert.equal(sent.meta.model,'site-jimeng-pro');
 assert.equal(sent.meta.model_label,'即梦 Pro');
 assert.equal(sent.meta.kind,'icons');
 assert.equal(sent.meta.origin,origin);
 assert.equal(sent.meta.job_id,jobId);
 assert.equal(sent.meta.account_label,'测试账号');
});

test('diy 入口的底层模型名归一到档案 id',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-imagegen-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const calls=[];
 const api=makeApi(directory,{calls});
 const post=await postJob(api,job2,diyPro);
 assert.equal(post.status,202);
 await api.idle();
 await until(()=>calls.length===1);
 const sent=JSON.parse(calls[0].body);
 assert.equal(sent.meta.model,'site-jimeng-pro');
 assert.equal(sent.meta.kind,'diy');
 assert.ok(IMAGE_MODELS.some(p=>p.id===sent.meta.model));
});

test('埋点写失败只告警，任务照样 ready',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-imagegen-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const calls=[];
 const api=makeApi(directory,{calls,analyticsOk:false});
 const post=await postJob(api,jobId,iconPro);
 assert.equal(post.status,202);
 await api.idle();
 const get=await getJob(api,jobId);
 assert.equal((await get.json()).status,'ready');
 await until(()=>calls.length===1);
});

test('未配置 SUPABASE 凭据时完全静默，不发埋点',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-imagegen-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const calls=[];
 const api=makeApi(directory,{calls,env:{}});
 const post=await postJob(api,jobId,iconPro);
 assert.equal(post.status,202);
 await api.idle();
 const get=await getJob(api,jobId);
 assert.equal((await get.json()).status,'ready');
 await new Promise(r=>setTimeout(r,50));
 assert.equal(calls.length,0);
});

test('account-auth 透传 displayName（两份副本逐字节一致）',async t=>{
 const secure=readFileSync(join(fileURLToPath(new URL('.',import.meta.url)),'..','services/secure-image/server/account-auth.mjs'),'utf8');
 const cutout=readFileSync(join(fileURLToPath(new URL('.',import.meta.url)),'..','services/icon-cutout/server/account-auth.mjs'),'utf8');
 assert.equal(secure,cutout,'两份 account-auth.mjs 必须逐字节一致');
 const {createAccountAuth:authFromCutout}=await import('../services/icon-cutout/server/account-auth.mjs');
 for(const factory of [createAccountAuth,authFromCutout]){
  const authorize=factory({accessUrl:origin+'/api/account-access',fetcher:async()=>Response.json({userId:userUuid,displayName:'小明',status:'active',permissions:{icons:true,diy:false},maintenance:false})});
  const user=await authorize(new Request('https://jimeng.gccdesign.app/api/image-service/v1/config',{headers:{Authorization:'Bearer SITE_TOKEN'}}));
  assert.equal(user.id,userUuid);
  assert.equal(user.name,'小明');
  assert.deepEqual(user.permissions,{icons:true,diy:false});
 }
});
