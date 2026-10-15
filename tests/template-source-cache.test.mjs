import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/template-source-cache.js',import.meta.url),'utf8');
const c={AbortController,queueMicrotask,setTimeout};vm.createContext(c);vm.runInContext(code,c);
const create=c.VFTemplateSourceCache.create;
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const source=(id,version='v1')=>({source_path:id+'.json',updated_at:version,source_size_bytes:100});
const blob=id=>new Blob([JSON.stringify({id})]);
function disk(){const rows=new Map();return {rows,get:async key=>rows.get(key),put:async row=>{rows.set(row.key,row);return true;},removePath:async path=>{for(const [key,row] of rows)if(row.scopePath===path)rows.delete(key);}};}
test('full preload is serialized, persistent across reload, and version/account specific',async()=>{
 const store=disk();let user='diy',calls=0,active=0,max=0;const progress=[];
 const download=async s=>{calls++;active++;max=Math.max(max,active);await turn();active--;return blob(s.source_path);};
 const first=create({scope:()=>user,store,download,onProgress:p=>progress.push(p)});
 first.preload([source('a'),source('b'),source('c')]);
 for(let i=0;i<15&&progress.at(-1)?.ready!==3;i++)await turn();
 assert.equal(progress.at(-1).ready,3);assert.equal(calls,3);assert.equal(max,1);
 const reloaded=create({scope:()=>user,store,download});
 assert.equal(await (await reloaded.get(source('a'))).text(),await blob('a.json').text());assert.equal(calls,3);
 await reloaded.get(source('a','v2'));assert.equal(calls,4);
 user='icons';await reloaded.get(source('a','v2'));assert.equal(calls,5);
});
test('explicit click aborts unrelated preload, reuses the same request, and resumes remaining full downloads',async()=>{
 const requests=[],done=[];const cache=create({scope:()=> 'diy',store:disk(),download:(s,{signal})=>new Promise((resolve,reject)=>{
   const req={id:s.source_path,signal,resolve:()=>{done.push(s.source_path);resolve(blob(s.source_path));}};
   requests.push(req);signal.addEventListener('abort',()=>reject(Object.assign(Error('abort'),{name:'AbortError'})),{once:true});
 })});
 cache.preload([source('a'),source('b')]);await turn();assert.equal(requests[0].id,'a.json');
 const clicked=cache.get(source('b'));await turn();assert.equal(requests[0].signal.aborted,true);assert.equal(requests[1].id,'b.json');
 const same=cache.get(source('b'));assert.equal(requests.length,2);requests[1].resolve();await Promise.all([clicked,same]);await turn();
 assert.equal(requests[2].id,'a.json');requests[2].resolve();await turn();assert.deepEqual(done,['b.json','a.json']);
});
test('scope change cannot save/requeue stale completed requests or return old account data',async()=>{
 let user='old';const store=disk(),requests=[];
 const cache=create({scope:()=>user,store,download:s=>new Promise(resolve=>requests.push({s,resolve}))});
 cache.preload([source('a')]);await turn();user='new';const newRequest=cache.get(source('a'));await turn();
 requests[0].resolve(blob('old'));requests[1].resolve(blob('new'));assert.equal(await (await newRequest).text(),await blob('new').text());await turn();
 assert.equal(store.rows.size,1);assert.ok([...store.rows.keys()][0].includes('new'));assert.equal(requests.length,2);
});
test('storage/quota failure preserves opening, and network failure remains retryable',async()=>{
 let calls=0;const cache=create({scope:()=> 'diy',store:{get:async()=>{throw Error('unavailable')},put:async()=>{throw Error('quota')}},download:async()=>{if(++calls===1)throw Error('network');return blob('okay');}});
 await assert.rejects(cache.get(source('a')),/network/);await cache.get(source('a'));await cache.get(source('a'));assert.equal(calls,2);
});
test('saving invalidates stored content without changing source files',async()=>{
 let calls=0;const store=disk(),cache=create({scope:()=> 'diy',store,download:async()=>blob(++calls)});
 await cache.get(source('a'));await cache.invalidate(source('a'));await cache.get(source('a'));assert.equal(calls,2);
});
test('a requested logo/font is not cancelled by another required asset or a template click',async()=>{
 const requests=[];const cache=create({scope:()=> 'diy',store:disk(),download:(s,{signal})=>new Promise(resolve=>requests.push({signal,resolve:()=>resolve(blob(s.source_path))}))});
 const logo=cache.get(source('logo')),font=cache.get(source('font'));await turn();
 const template=cache.get(source('template'));await turn();assert.ok(requests.every(r=>!r.signal.aborted));
 requests.forEach(r=>r.resolve());await Promise.all([logo,font,template]);
});
