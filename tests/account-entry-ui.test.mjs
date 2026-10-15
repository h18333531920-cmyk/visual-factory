import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../public/account-entry.js',import.meta.url),'utf8');
const TICKET='a'.repeat(64);
function memoryStore(seed){
 const map=new Map(Object.entries(seed||{}));
 return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),_map:map};
}
function create(fetcher,{openerPresent=true,sessionStaged,localStaged}={}){
 const nodes=new Map(['entry-status','entry-title','entry-retry'].map(id=>[id,{textContent:'',hidden:true}]));const timers=[],messages=[];let listener,destination;
 const owner=openerPresent?{closed:false,postMessage(message){messages.push(message);}}:null;
 const sessionStore=memoryStore(sessionStaged&&{'vf_account_entry_ticket':sessionStaged});
 const localStore=memoryStore(localStaged&&{'vf_account_entry_ticket':localStaged});
 const window={opener:owner,addEventListener(_event,fn){listener=fn;},sessionStorage:sessionStore,localStorage:localStore};
 const context={window,document:{getElementById:id=>nodes.get(id)},location:{origin:'https://example.test',replace:value=>{destination=value;}},sessionStorage:sessionStore,localStorage:localStore,crypto:{randomUUID:()=> 'unique-tab'},fetch:fetcher,AbortSignal:{timeout:ms=>({timeout:ms})},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},setInterval(){},clearInterval(){}};
 vm.runInNewContext(script,context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 return {nodes,timers,messages,sessionStore,localStore,window,owner,get destination(){return destination;},ticket:()=>listener({origin:context.location.origin,source:owner,data:{type:'vf:account-entry-ticket',ticket:'valid-ticket'}}),settle};
}
const staged=ticket=>JSON.stringify({ticket,expiresAt:Date.now()+30000});
test('slow login has a bounded timeout and exposes retry instead of an endless spinner',async()=>{
 let request;
 const env=create(async(_url,options)=>{request=options;throw Object.assign(Error('timeout'),{name:'TimeoutError'});});
 await env.ticket();assert.equal(request.signal.timeout,35000);assert.equal(env.nodes.get('entry-retry').hidden,false);assert.match(env.nodes.get('entry-status').textContent,/超时/);
 env.nodes.get('entry-retry').onclick();assert.equal(env.messages.at(-1).type,'vf:account-entry-retry');
});
test('waiting for the parent also ends with an actionable message',()=>{
 const env=create(()=>{});env.timers.find(timer=>timer.ms===30000).fn();assert.match(env.nodes.get('entry-status').textContent,/超时/);assert.equal(env.nodes.get('entry-retry').hidden,false);
});
test('successful account opening saves only a unique tab session and clears the opener',async()=>{
 const env=create(async()=>({ok:true,json:async()=>({route:'icons',session:{access_token:'TEST_ACCESS',refresh_token:'TEST_REFRESH',user:{id:'target-user'}}})}));
 await env.ticket();assert.equal(env.sessionStore._map.get('vf_isolated_storage_key'),'vf-isolated-auth-unique-tab');assert.equal(env.sessionStore._map.get('vf_isolated_user'),'target-user');assert.equal(env.window.opener,null);
 assert.ok(env.destination.endsWith('#icons'));assert.ok(!env.destination.includes('TEST_ACCESS'));assert.equal(env.messages.at(-1).type,'vf:account-entry-complete');
});
test('without an opener a staged session ticket is exchanged instead',async()=>{
 const env=create(async()=>({ok:true,json:async()=>({route:'library',session:{access_token:'STAGED_ACCESS',refresh_token:'STAGED_REFRESH',user:{id:'staged-user'}}})}),{openerPresent:false,sessionStaged:staged(TICKET)});
 await env.settle();
 assert.equal(env.sessionStore._map.get('vf_isolated_user'),'staged-user');assert.equal(env.sessionStore._map.get('vf_isolated_access_token'),'STAGED_ACCESS');
 assert.equal(env.sessionStore._map.has('vf_account_entry_ticket'),false);
 assert.ok(env.destination.endsWith('#library'));assert.ok(!env.destination.includes('STAGED_ACCESS'));assert.equal(env.messages.length,0);
});
test('a staged ticket in localStorage is used when sessionStorage has none',async()=>{
 const env=create(async()=>({ok:true,json:async()=>({route:'static',session:{access_token:'LOCAL_ACCESS',refresh_token:'LOCAL_REFRESH',user:{id:'local-user'}}})}),{openerPresent:false,localStaged:staged(TICKET)});
 await env.settle();
 assert.equal(env.sessionStore._map.get('vf_isolated_user'),'local-user');assert.equal(env.localStore._map.has('vf_account_entry_ticket'),false);assert.ok(env.destination.endsWith('#static'));
});
test('without an opener or a staged ticket the entry explains how to open the account',()=>{
 const env=create(()=>{},{openerPresent:false});
 assert.equal(env.nodes.get('entry-title').textContent,'账号尚未打开');assert.match(env.nodes.get('entry-status').textContent,/团队管理面板/);assert.equal(env.nodes.get('entry-retry').hidden,true);
});
test('expired or malformed staged tickets are rejected instead of exchanged',async()=>{
 const expired=create(()=>{throw Error('must not fetch');},{openerPresent:false,sessionStaged:JSON.stringify({ticket:TICKET,expiresAt:Date.now()-1000})});
 await expired.settle();assert.match(expired.nodes.get('entry-status').textContent,/团队管理面板/);
 const malformed=create(()=>{throw Error('must not fetch');},{openerPresent:false,sessionStaged:JSON.stringify({ticket:'short',expiresAt:Date.now()+30000})});
 await malformed.settle();assert.match(malformed.nodes.get('entry-status').textContent,/团队管理面板/);
});
test('a failed staged exchange surfaces the server error with retry hidden',async()=>{
 const env=create(async()=>({ok:false,json:async()=>({error:'账号打开链接已失效，请重新点击账号'})}),{openerPresent:false,sessionStaged:staged(TICKET)});
 await env.settle();
 assert.equal(env.nodes.get('entry-title').textContent,'账号尚未打开');assert.match(env.nodes.get('entry-status').textContent,/重新点击账号/);
});
