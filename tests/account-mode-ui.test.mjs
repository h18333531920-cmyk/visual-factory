import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/account-access.js',import.meta.url),'utf8');
test('user/developer display can switch repeatedly while retaining one verified maintenance session',async()=>{
 const elements=new Map(),calls=[],listeners=new Map();let verified=false;
 const document={documentElement:{dataset:{vfMode:'user'}},body:{append(node){elements.set(node.id,node);}},getElementById:id=>elements.get(id),addEventListener(){},createElement(){
  const form={},button={},input={focus(){},value:''},message={};
  return {querySelector(selector){return selector==='form'?form:selector==='[type="submit"]'?button:selector==='[data-message]'?message:input;},querySelectorAll(){return [];},addEventListener(){},remove(){elements.delete(this.id);}};
 }};
 const storage={getItem:key=>key==='vf_access_token'?'SITE_TOKEN':null,setItem(){},removeItem(){}};
 const window={addEventListener:(name,fn)=>listeners.set(name,fn),fetch:async(path,options)=>{
  const body=options.body?JSON.parse(options.body):null;calls.push(body?.action||'read');
  if(body?.action==='unlock'){verified=true;return {ok:true,json:async()=>({token:'a'.repeat(64),expiresAt:Date.now()+60000})};}
  if(body?.action==='lock')verified=false;
  return {ok:true,json:async()=>({product:'diy',features:['library','static'],status:'active',maintenance:verified,permissions:{diy:true,icons:verified,manage:verified}})};
 }};
 vm.runInNewContext(source,{window,document,location:{hostname:'asset-gallery-test.visual-factory.pages.dev',origin:'https://asset-gallery-test.visual-factory.pages.dev'},localStorage:storage,sessionStorage:storage,URL,Headers,Request,AbortSignal,setInterval(){},setTimeout(){},clearTimeout(){},clearInterval(){},FormData:class{entries(){return [['password','test-password']];}[Symbol.iterator](){return this.entries()[Symbol.iterator]();}}});
 const api=window.VFAccountAccess;
 await api.refresh();assert.equal(api.can('icons'),false);
 api.promptUnlock();await elements.get('account-access-dialog').querySelector('form').onsubmit({preventDefault(){},currentTarget:{}});
 assert.equal(api.maintenance(),true,JSON.stringify({calls,snapshot:api.snapshot(),error:elements.get('account-access-dialog')?.querySelector('[data-message]').textContent}));
 for(let i=0;i<3;i++){
  document.documentElement.dataset.vfMode='developer';assert.equal(api.can('icons'),true);assert.equal(api.can('home'),false);
  document.documentElement.dataset.vfMode='user';assert.equal(api.can('icons'),false);assert.equal(api.can('static'),true);assert.equal(api.maintenance(),true);
 }
 api.promptUnlock();assert.ok(elements.has('account-access-dialog'));listeners.get('vf:interface-mode-change')();assert.equal(elements.has('account-access-dialog'),false);assert.equal(api.maintenance(),true);
 assert.equal(calls.filter(action=>action==='unlock').length,1);assert.equal(calls.includes('lock'),false);
 await api.lock();assert.equal(api.maintenance(),false);
});
test('admin-role account renders the panel without a password and keeps mode switching',async()=>{
 const stub=()=>({onclick:null,disabled:false});
 const elements=new Map();
 const document={documentElement:{dataset:{vfMode:'user'}},body:{append(){}},getElementById:id=>{if(id==='maintenance-change-password')return null;if(!elements.has(id))elements.set(id,stub());return elements.get(id);},addEventListener(){},createElement(){const form={},button={},input={focus(){},value:''},message={};return {querySelector(s){return s==='form'?form:s==='[type="submit"]'?button:s==='[data-message]'?message:input;},querySelectorAll(){return [];},addEventListener(){},remove(){}};}};
 const storage={getItem:()=>'SITE_TOKEN',setItem(){},removeItem(){}};
 const window={addEventListener(){},fetch:async path=>({ok:true,json:async()=>String(path).startsWith('/api/admin/accounts')?{accounts:[],page:1,hasMore:false,environment:'test'}:{userId:'u1',email:'a@b.c',displayName:'开发者账号',product:'all',features:['library','static'],status:'active',environment:'test',maintenance:true,maintenanceExpiresAt:0,setupRequired:false,role:'admin',permissions:{diy:true,icons:true,manage:true}}})};
 vm.runInNewContext(source,{window,document,location:{hostname:'asset-gallery-test.visual-factory.pages.dev',origin:'https://asset-gallery-test.visual-factory.pages.dev'},localStorage:storage,sessionStorage:storage,URL,Headers,Request,AbortSignal,setInterval(){},setTimeout(){},clearTimeout(){},clearInterval(){},FormData:class{entries(){return [][Symbol.iterator]();}}});
 const api=window.VFAccountAccess;
 await api.refresh();
 assert.equal(api.maintenance(),true);
 const userView={innerHTML:''};
 await api.renderPanel(userView);
 assert.match(userView.innerHTML,/管理员/);
 assert.match(userView.innerHTML,/切回开发者模式/);
 assert.doesNotMatch(userView.innerHTML,/正在读取/);
 assert.doesNotMatch(userView.innerHTML,/验证开发者密码/);
 document.documentElement.dataset.vfMode='developer';
 const devView={innerHTML:''};
 await api.renderPanel(devView);
 assert.match(devView.innerHTML,/账号管理/);
 assert.match(devView.innerHTML,/切换到用户模式/);
 assert.doesNotMatch(devView.innerHTML,/退出维护/);
 assert.match(devView.innerHTML,/常驻/);
 // 账号列表渲染后必须立刻自动读取：此前因 maintenance-change-password 按钮不在面板里抛
 // TypeError，renderPanel 在 loadAccounts 之前中断，列表停在「正在读取…」直到手动刷新。
 assert.equal(elements.get('accounts-list').innerHTML.includes('没有账号'),true,'账号列表应自动加载（空列表显示「没有账号」）');
});
