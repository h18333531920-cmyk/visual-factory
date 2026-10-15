import {handleAnalyticsAccounts} from '../functions/api/analytics-accounts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {handleAccess,digest,passwordHash,randomToken,validatePassword} from '../functions/_account-access.js';
import {handleAccounts} from '../functions/api/admin/accounts.js';
import {handleEntry} from '../functions/api/account-entry.js';
import {sealPassword,openPassword} from '../functions/_account-vault.js';
import {createAccountAuth} from '../services/secure-image/server/account-auth.mjs';
globalThis.crypto ||= webcrypto;
const origin='https://asset-gallery-test.visual-factory.pages.dev';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
class D1 {
 constructor(file){this.file=file;}
 query(sql,params=[],script=false){return JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
x=json.loads(sys.stdin.read());c=sqlite3.connect(x['file']);c.row_factory=sqlite3.Row
if x['script']: c.executescript(x['sql']);r=[]
else: cur=c.execute(x['sql'],x['params']);r=[dict(a) for a in cur.fetchall()] if cur.description else []
n=c.total_changes;c.commit();print(json.dumps({'results':r,'meta':{'changes':n}}))`],{input:JSON.stringify({file:this.file,sql,params,script}),encoding:'utf8'}));}
 prepare(sql){const self=this;return {bind(...params){return {first:async()=>self.query(sql,params).results[0]||null,all:async()=>self.query(sql,params),run:async()=>self.query(sql,params)};},first:async()=>self.query(sql).results[0]||null,all:async()=>self.query(sql),run:async()=>self.query(sql)};}
 async batch(statements){return Promise.all(statements.map(s=>s.run()));}
}
async function fixture(t,{configured=true}={}){
 const dir=mkdtempSync(join(tmpdir(),'vf-access-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=new D1(join(dir,'db.sqlite'));db.query(readFileSync(new URL('../sql/account-access-d1.sql',import.meta.url),'utf8'),[],true);
 const password='private-test-password-01234',salt=randomToken(),bootstrap=randomToken();
 await db.prepare('INSERT INTO vf_access_config(id,password_hash,salt,revision,bootstrap_hash,bootstrap_expires) VALUES(1,?,?,?,?,?)').bind(configured?await passwordHash(password,salt):null,salt,'rev1',configured?null:await digest(bootstrap),Date.now()+60000).run();
 const users=ids.map((id,i)=>({id,email:i?'icons@example.invalid':'diy@example.invalid',user_metadata:{role:'admin',display_name:'Test'},app_metadata:{}}));
 const calls=[];let entryTarget=users[1];
 const fetcher=async(url,init={})=>{
  calls.push({url,method:init.method||'GET',body:init.body});
  if(url.endsWith('/user')){const token=new Headers(init.headers).get('Authorization');const user=users[token==='Bearer icons'?1:0];return token==='Bearer bad'?Response.json({}, {status:401}):Response.json(user);}
  if(url.endsWith('/admin/generate_link')){entryTarget=users.find(user=>user.email===JSON.parse(init.body).email);return Response.json({hashed_token:'TEST_ONE_TIME_HASH'});}
  if(url.endsWith('/verify'))return Response.json({access_token:'TEST_ENTRY_ACCESS',refresh_token:'TEST_ENTRY_REFRESH',expires_in:3600,user:entryTarget});
  if(url.endsWith('/token?grant_type=password'))return JSON.parse(init.body).password==='remember-me-six'?Response.json({access_token:'VERIFY_ONLY',user:users.find(user=>user.email===JSON.parse(init.body).email)}):Response.json({}, {status:400});
  if(url.endsWith('/logout?scope=local'))return new Response(null,{status:204});
  if(url.includes('/admin/users?'))return Response.json({users});
  const matched=users.find(u=>url.endsWith('/admin/users/'+u.id));if(matched){if(init.method==='DELETE')matched.deleted_at=new Date().toISOString();return Response.json(matched);}
  if(url.endsWith('/admin/users')&&init.method==='POST')return Response.json({id:'33333333-3333-4333-8333-333333333333',email:'new@example.invalid'});
  if(url.endsWith('/33333333-3333-4333-8333-333333333333'))return Response.json({id:'33333333-3333-4333-8333-333333333333'});
  throw Error('Unexpected URL');
 };
 const env={VF_ACCOUNT_VAULT_KEY:'a'.repeat(64),VF_ACCESS_DB:db,SUPABASE_SERVICE_ROLE_KEY:'FAKE_TEST_SERVICE_KEY',SUPABASE_URL:'https://owned-test.supabase.co'};
 const req=(body,{user='diy',maintenance='',host=origin,requestOrigin=host,path='/api/account-access'}={})=>new Request(host+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+user,Origin:requestOrigin,'Content-Type':'application/json',...(maintenance?{'X-VF-Maintenance':maintenance}:{})},body:body?JSON.stringify(body):undefined});
 const access=(body,opts)=>handleAccess(req(body,opts),env,fetcher);
 const admin=(body,opts)=>handleAccounts(req(body,{...opts,path:'/api/admin/accounts'}),env,fetcher);
 const unlock=async()=>{const response=await access({action:'unlock',password});assert.equal(response.status,200);return (await response.json()).token;};
 return {db,env,fetcher,req,access,admin,unlock,password,bootstrap,calls,dir};
}
test('existing shared admin gets DIY product and no maintenance; production is not enabled',async t=>{
 const f=await fixture(t);const result=await(await f.access()).json();assert.deepEqual(result.permissions,{diy:true,icons:false,manage:false});assert.equal(result.product,'diy');
 assert.equal((await f.access(null,{host:'https://gccdesign.app'})).status,503);
 assert.equal((await f.admin()).status,403);assert.equal((await f.access(null,{user:'bad'})).status,401);
 assert.ok(!JSON.stringify(result).includes('FAKE_TEST_SERVICE_KEY'));
});
test('correct password grants temporary maintenance bound to one account; lock revokes it',async t=>{
 const f=await fixture(t);assert.equal((await f.access({action:'unlock',password:'incorrect'})).status,403);
 const token=await f.unlock();assert.equal((await(await f.access(null,{maintenance:token})).json()).permissions.manage,true);
 assert.equal((await(await f.access(null,{maintenance:token,user:'icons'})).json()).maintenance,false);
 assert.equal((await f.admin(null,{maintenance:token})).status,200);
 await f.access({action:'lock'},{maintenance:token});assert.equal((await f.admin(null,{maintenance:token})).status,403);
});
test('expired session cannot maintain; changing developer password revokes other sessions',async t=>{
 const f=await fixture(t);const token=await f.unlock(),other=await f.unlock();
 await f.db.prepare('UPDATE vf_maintenance_sessions SET expires_at=1 WHERE token_hash=?').bind(await digest(token)).run();assert.equal((await f.admin(null,{maintenance:token})).status,403);
 const response=await f.access({action:'change-password',password:'another-private-test-password'},{maintenance:other});assert.equal(response.status,200);
 assert.equal((await f.admin(null,{maintenance:other})).status,403);
});
test('private bootstrap can only initialize once and requires proof, a new password and same origin',async t=>{
 const f=await fixture(t,{configured:false});assert.equal((await f.access({action:'setup',password:f.password,bootstrap:'wrong'})).status,403);
 assert.equal((await f.access({action:'setup',password:f.password,bootstrap:f.bootstrap},{requestOrigin:'https://untrusted.invalid'})).status,403);
 assert.equal((await f.access({action:'setup',password:f.password,bootstrap:f.bootstrap})).status,200);
 assert.equal((await f.access({action:'setup',password:f.password,bootstrap:f.bootstrap})).status,403);
 const row=await f.db.prepare('SELECT * FROM vf_access_config WHERE id=1').first();assert.equal(row.bootstrap_hash,null);assert.notEqual(row.password_hash,f.password);
});
test('permission editing is versioned, never changes Supabase identity, and cannot disable self',async t=>{
 const f=await fixture(t);const token=await f.unlock();
 const input={action:'update',id:ids[1],displayName:'Icons',product:'icons',status:'active',revision:'legacy'};
 assert.equal((await f.admin(input,{maintenance:token})).status,200);
 assert.equal((await f.admin(input,{maintenance:token})).status,409);
 const result=await(await f.access(null,{user:'icons'})).json();assert.deepEqual(result.permissions,{diy:false,icons:true,manage:false});
 assert.equal((await f.admin({...input,id:ids[0],status:'disabled'},{maintenance:token})).status,400);
 assert.equal(f.calls.filter(call=>call.method==='PUT').length,0);
});
test('disabled account cannot generate or unlock; no credential fields appear in account listing',async t=>{
 const f=await fixture(t),token=await f.unlock();await f.admin({action:'update',id:ids[1],displayName:'Icons',product:'icons',status:'disabled',revision:'legacy'},{maintenance:token});
 const data=await(await f.access(null,{user:'icons'})).json();assert.equal(data.permissions.icons,false);
 assert.equal((await f.access({action:'unlock',password:f.password},{user:'icons'})).status,403);
 const listing=await(await f.admin(null,{maintenance:token})).json();assert.ok(!JSON.stringify(listing).includes('user_metadata'));assert.ok(listing.accounts.every(account=>account.password===null));
});
test('password resets require explicit confirmation of their shared production impact',async t=>{
 const f=await fixture(t),token=await f.unlock();const input={action:'reset-password',id:ids[1],password:'changed-account-password-123'};
 assert.equal((await f.admin(input,{maintenance:token})).status,400);assert.equal(f.calls.filter(call=>call.method==='PUT').length,0);
 assert.equal((await f.admin({...input,confirmEmail:'icons@example.invalid',acknowledgeGlobalPasswordChange:true},{maintenance:token})).status,200);
});
test('new account is operator, starts banned until permission record is saved, and is not auto-admin',async t=>{
 const f=await fixture(t),token=await f.unlock();const response=await f.admin({action:'create',email:'new@example.invalid',password:'new-private-password-123',displayName:'Icons',product:'icons'},{maintenance:token});assert.equal(response.status,201);
 const call=f.calls.find(call=>call.method==='POST'&&call.url.endsWith('/admin/users'));const body=JSON.parse(call.body);assert.equal(body.user_metadata.role,'operator');assert.notEqual(body.ban_duration,'none');
 assert.equal((await f.db.prepare('SELECT product FROM vf_accounts WHERE email=?').bind('new@example.invalid').first()).product,'icons');
});
test('developer login is rate limited',async t=>{
 const f=await fixture(t);for(let i=0;i<6;i++)await f.access({action:'unlock',password:'bad'});
 assert.equal((await f.access({action:'unlock',password:f.password})).status,429);
});
test('generation service trusts only owned access endpoint; denied accounts stay denied',async()=>{
 assert.throws(()=>createAccountAuth({accessUrl:'https://untrusted.invalid/api/account-access'}));
 let headers;
 const authorize=createAccountAuth({accessUrl:origin+'/api/account-access',fetcher:async(_url,init)=>{headers=init.headers;return Response.json({userId:ids[1],status:'active',permissions:{icons:true,diy:false},maintenance:false});}});
 const result=await authorize(new Request('https://jimeng.gccdesign.app/api/image-service/v1/config',{headers:{Authorization:'Bearer SITE_TOKEN','X-VF-Maintenance':'a'.repeat(64)}}));assert.deepEqual(result.permissions,{icons:true,diy:false});assert.equal(headers['X-VF-Maintenance'],'a'.repeat(64));
});

// Keep the user-chosen length policy aligned across account and maintenance changes.
test('six- and nine-character passwords are accepted without removing length bounds',()=>{
 assert.equal(validatePassword('short6'),'short6');
 assert.equal(validatePassword('length9ok'),'length9ok');
 assert.throws(()=>validatePassword('tiny'),{status:400});
 assert.throws(()=>validatePassword('x'.repeat(129)),{status:400});
});

test('independent feature choices preserve static asset dependency and exclude home by default',async t=>{
 const f=await fixture(t),token=await f.unlock();
 const update=await f.admin({action:'update',id:ids[1],displayName:'Assets only',features:['library'],status:'active',revision:'legacy'},{maintenance:token});assert.equal(update.status,200);
 const access=await(await f.access(null,{user:'icons'})).json();assert.deepEqual(access.features,['library']);assert.equal(access.permissions.diy,false);assert.equal(access.permissions.icons,false);
 const original=await(await f.access()).json();assert.deepEqual(original.features,['library','static']);assert.ok(!original.features.includes('home'));
 const revision=(await update.json()).revision;
 await f.admin({action:'update',id:ids[1],displayName:'Team only',features:[],status:'active',revision},{maintenance:token});
 assert.deepEqual((await(await f.access(null,{user:'icons'})).json()).features,[]);
});
test('upload permission round-trips as an add-on and never leaks into legacy defaults',async t=>{
 const f=await fixture(t),token=await f.unlock();
 const update=await f.admin({action:'update',id:ids[1],displayName:'Uploader',features:['library','upload'],status:'active',revision:'legacy'},{maintenance:token});assert.equal(update.status,200);
 const access=await(await f.access(null,{user:'icons'})).json();assert.deepEqual(access.features,['library','upload']);assert.equal(access.permissions.diy,false);
 const legacy=await(await f.access()).json();assert.ok(!legacy.features.includes('upload'));assert.ok(!legacy.features.includes('home'));
 const listed=await(await f.admin(null,{maintenance:token})).json();assert.deepEqual(listed.accounts.find(account=>account.id===ids[1]).features,['library','upload']);
});
test('stored passwords are encrypted, scoped to environment and account, and only returned after maintenance',async t=>{
 const f=await fixture(t),token=await f.unlock();
 assert.equal((await f.admin({action:'remember-password',id:ids[1],password:'remember-me-six'},{maintenance:token})).status,200);
 const row=await f.db.prepare('SELECT * FROM vf_account_passwords WHERE user_id=?').bind(ids[1]).first();assert.ok(!row.encrypted.includes('remember-me-six'));
 assert.equal(await openPassword(f.env,'test',row,'icons@example.invalid'),'remember-me-six');
 assert.equal(await openPassword(f.env,'production',row,'icons@example.invalid'),null);assert.equal(await openPassword(f.env,'test',{...row,user_id:ids[0]},'icons@example.invalid'),null);
 const data=await(await f.admin(null,{maintenance:token})).json();assert.equal(data.accounts.find(a=>a.id===ids[1]).password,'remember-me-six');assert.equal((await f.admin()).status,403);
 assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);
});
test('account opening uses a one-time handoff and does not return a session to the parent',async t=>{
 const f=await fixture(t),token=await f.unlock();
 await f.admin({action:'update',id:ids[1],displayName:'Icons',features:['icons'],status:'active',revision:'legacy'},{maintenance:token});
 const response=await f.admin({action:'open-account',id:ids[1]},{maintenance:token});assert.equal(response.status,200);
 const ticket=await response.json();assert.ok(!ticket.session);assert.ok(!ticket.access_token);
 const consume=()=>handleEntry(f.req({ticket:ticket.ticket},{path:'/api/account-entry'}),f.env,f.fetcher);
 const entry=await consume();assert.equal(entry.status,200);const result=await entry.json();assert.equal(result.session.user.id,ids[1]);assert.equal(result.route,'icons');
 assert.equal((await consume()).status,403);assert.equal(f.calls.filter(c=>c.url.endsWith('/admin/generate_link')).length,1);assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);
});
test('closing maintenance invalidates unused account-opening tickets',async t=>{
 const f=await fixture(t),token=await f.unlock();const {ticket}=await(await f.admin({action:'open-account',id:ids[1]},{maintenance:token})).json();
 await f.access({action:'lock'},{maintenance:token});
 const result=await handleEntry(f.req({ticket},{path:'/api/account-entry'}),f.env,f.fetcher);assert.equal(result.status,403);assert.equal(f.calls.filter(c=>c.url.endsWith('/admin/generate_link')).length,0);
});
test('admin role opens accounts without a maintenance token header',async t=>{
 const f=await fixture(t);
 await f.db.prepare('INSERT INTO vf_accounts(user_id,email,display_name,product,status,role,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(ids[0],'diy@example.invalid','Admin','diy','active','admin','rev-admin',Date.now(),Date.now()).run();
 const opened=await f.admin({action:'open-account',id:ids[1]});assert.equal(opened.status,200);
 const {ticket}=await opened.json();
 const entry=await handleEntry(f.req({ticket},{path:'/api/account-entry'}),f.env,f.fetcher);
 assert.equal(entry.status,200);assert.equal((await entry.json()).session.user.id,ids[1]);
});
test('deletion needs exact confirmation, cannot target self, and does not issue material deletion requests',async t=>{
 const f=await fixture(t),token=await f.unlock();
 assert.equal((await f.admin({action:'delete',id:ids[0],confirmEmail:'diy@example.invalid',acknowledgeGlobalDeletion:true},{maintenance:token})).status,400);
 assert.equal((await f.admin({action:'delete',id:ids[1]},{maintenance:token})).status,400);
 assert.equal((await f.admin({action:'delete',id:ids[1],confirmEmail:'icons@example.invalid',acknowledgeGlobalDeletion:true},{maintenance:token})).status,200);
 const deletes=f.calls.filter(c=>c.method==='DELETE');assert.equal(deletes.length,1);assert.ok(deletes[0].url.endsWith('/auth/v1/admin/users/'+ids[1]));assert.equal(JSON.parse(deletes[0].body).should_soft_delete,true);
});

// The shared relay keeps the test-site accounts usable without touching production:
// the test origin is verified against the test registry, every other caller (production
// origins and server-to-server requests without an Origin) against the production one.
test('relay verifies test-site origins against the test registry and caches per registry',async()=>{
 const seen=[];
 const authorize=createAccountAuth({accessUrl:'https://gccdesign.app/api/account-access',testAccessUrl:origin+'/api/account-access',fetcher:async url=>{seen.push(url);return Response.json({userId:ids[1],status:'active',permissions:{icons:true,diy:false},maintenance:false});}});
 const call=siteOrigin=>authorize(new Request('https://jimeng.gccdesign.app/api/image-service/v1/config',{headers:{Authorization:'Bearer site-token',...(siteOrigin?{Origin:siteOrigin}:{})}}));
 const fromTest=await call(origin),fromProd=await call('https://gccdesign.app'),fromServer=await call(),fromPreview=await call('https://abc123.visual-factory.pages.dev');
 assert.deepEqual([fromTest.id,fromProd.id,fromServer.id,fromPreview.id],[ids[1],ids[1],ids[1],ids[1]]);
 assert.deepEqual(seen,[origin+'/api/account-access','https://gccdesign.app/api/account-access']);
});
test('relay rejects an unowned test registry',()=>{
 assert.throws(()=>createAccountAuth({accessUrl:'https://gccdesign.app/api/account-access',testAccessUrl:'https://untrusted.invalid/api/account-access'}));
 assert.throws(()=>createAccountAuth({accessUrl:'https://gccdesign.app/api/account-access',testAccessUrl:'https://asset-gallery-test.visual-factory.pages.dev/api/other'}));
});
test('relay accepts admin maintenance that never expires and still rejects expired sessions',async()=>{
 const request=()=>new Request('https://jimeng.gccdesign.app/api/image-service/v1/config',{headers:{Authorization:'Bearer dev-token'}});
 const permanent=createAccountAuth({accessUrl:origin+'/api/account-access',fetcher:async()=>Response.json({userId:ids[0],status:'active',permissions:{icons:true,diy:true},maintenance:true,maintenanceExpiresAt:0})});
 assert.deepEqual((await permanent(request())).permissions,{diy:true,icons:true});
 const expired=createAccountAuth({accessUrl:origin+'/api/account-access',now:()=>2000000,fetcher:async()=>Response.json({userId:ids[1],status:'active',permissions:{icons:true,diy:false},maintenance:true,maintenanceExpiresAt:1000000})});
 await assert.rejects(()=>expired(request()),error=>error.status===403);
});
test('relay end-to-end: the test-site registry serves test accounts while production keeps its own',async t=>{
 const f=await fixture(t);
 await f.db.prepare('INSERT INTO vf_accounts(user_id,email,display_name,product,status,role,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(ids[0],'diy@example.invalid','Developer','all','active','admin','rev-dev',Date.now(),Date.now()).run();
 const prodDb=new D1(join(f.dir,'prod.sqlite'));prodDb.query(readFileSync(new URL('../sql/account-access-d1.sql',import.meta.url),'utf8'),[],true);
 await prodDb.prepare('INSERT INTO vf_accounts(user_id,email,display_name,product,status,role,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(ids[1],'icons@example.invalid','Icons','icons','active','user','rev-prod',Date.now(),Date.now()).run();
 const registry=async(url,init)=>handleAccess(new Request(url,init),{...f.env,VF_ACCESS_DB:url.startsWith('https://gccdesign.app')?prodDb:f.db,VF_ACCESS_PRODUCTION:'1'},f.fetcher);
 const authorize=createAccountAuth({accessUrl:'https://gccdesign.app/api/account-access',testAccessUrl:origin+'/api/account-access',fetcher:registry});
 const call=(user,site)=>{const headers={Authorization:'Bearer '+user};if(site)headers.Origin=site;return authorize(new Request('https://jimeng.gccdesign.app/api/image-service/v1/config',{headers}));};
 assert.deepEqual((await call('diy',origin)).permissions,{diy:true,icons:true});
 assert.deepEqual((await call('diy','https://gccdesign.app')).permissions,{diy:true,icons:false});
 assert.deepEqual((await call('icons','https://gccdesign.app')).permissions,{diy:false,icons:true});
 assert.deepEqual((await call('icons')).permissions,{diy:false,icons:true});
});


test('analytics identity directory excludes passwords and respects existing account boundaries', async t => {
 const f = await fixture(t);
 const own = await (await handleAnalyticsAccounts(f.req(), f.env, f.fetcher)).json();
 assert.deepEqual(own.accounts.map(a => a.id), [ids[0]]);
 const token = await f.unlock();
 await f.admin({action:'update',id:ids[1],displayName:'Renamed colleague',product:'icons',status:'active',revision:'legacy'}, {maintenance:token});
 const response = await handleAnalyticsAccounts(f.req(null,{maintenance:token}), f.env, f.fetcher);
 const data = await response.json();
 assert.equal(response.status, 200);
 assert.equal(data.accounts.find(a => a.id === ids[1]).displayName, 'Renamed colleague');
 for (const account of data.accounts) assert.deepEqual(Object.keys(account).sort(), ['displayName','id','role']);
 assert.equal((await handleAnalyticsAccounts(f.req(null,{user:'bad'}), f.env, f.fetcher)).status, 401);
 assert.equal((await handleAnalyticsAccounts(f.req({action:'anything'}), f.env, f.fetcher)).status, 405);
});
