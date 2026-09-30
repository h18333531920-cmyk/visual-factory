(function(){
 const owner=window.opener,origin=location.origin,status=document.getElementById('entry-status'),title=document.getElementById('entry-title'),retry=document.getElementById('entry-retry');
 const STAGE_KEY='vf_account_entry_ticket';
 let started=false,finished=false,waitingTimer,slowTimer,pulse;
 function stop(){clearTimeout(waitingTimer);clearTimeout(slowTimer);clearInterval(pulse);}
 function failed(message){stop();started=false;finished=false;title.textContent='账号尚未打开';status.textContent=message;retry.hidden=!owner||owner.closed;}
 // 无 opener 的环境（弹出窗口被拦截或 opener 被剥离）从面板预存的暂存票据换取登录，
 // 票据仍由服务端一次性校验，不经过 URL。
 function takeStagedTicket(){
  for(const store of [window.sessionStorage,window.localStorage]){
   if(!store)continue;
   let raw=null;try{raw=store.getItem(STAGE_KEY);}catch{}
   if(raw==null)continue;
   let ticket='';try{store.removeItem(STAGE_KEY);const data=JSON.parse(raw);if(data&&typeof data.ticket==='string'&&/^[a-f\d]{64}$/.test(data.ticket)&&typeof data.expiresAt==='number'&&data.expiresAt>Date.now())ticket=data.ticket;}catch{}
   if(ticket)return ticket;
  }
  return '';
 }
 function notify(message){if(owner&&!owner.closed)try{owner.postMessage(message,origin);}catch{}}
 async function exchange(ticket){
  started=true;stop();status.textContent='正在登录所选账号…';
  slowTimer=setTimeout(()=>{status.textContent='登录响应较慢，正在等待。超过等待时间后可重试。';},10000);
  try{
   const response=await fetch('/api/account-entry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket}),cache:'no-store',signal:AbortSignal.timeout(35000)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'无法打开账号');
   stop();finished=true;status.textContent='登录成功，正在进入工作台…';
   const key='vf-isolated-auth-'+crypto.randomUUID();
   sessionStorage.setItem('vf_account_isolated','1');sessionStorage.setItem('vf_isolated_storage_key',key);
   sessionStorage.setItem('vf_isolated_access_token',result.session.access_token);sessionStorage.setItem('vf_isolated_user',result.session.user.id);
   sessionStorage.setItem(key,JSON.stringify(result.session));
   notify({type:'vf:account-entry-complete'});window.opener=null;
   const route=['library','static','icons','dynamic','analytics','home','admin'].includes(result.route)?result.route:'admin';
   location.replace('/?v=20260915-mode-session-v549#'+route);
  }catch(error){failed(error.name==='TimeoutError'?'登录接口响应超时，请重试打开。':error.message||'打开账号失败，请重试。');}
 }
 function begin(isRetry=false){
  stop();started=false;title.textContent='正在打开账号';status.textContent='正在验证账号访问权限…';retry.hidden=true;
  if(owner&&!owner.closed){
   notify({type:isRetry?'vf:account-entry-retry':'vf:account-entry-ready'});
   waitingTimer=setTimeout(()=>failed('等待管理页面响应超时。请重试，或回到团队管理重新点击账号。'),30000);
   return;
  }
  const ticket=takeStagedTicket();
  if(!ticket){failed('请从团队管理面板点击账号打开此页面。');return;}
  exchange(ticket);
 }
 window.addEventListener('message',async event=>{
  if(event.origin!==origin||event.source!==owner||finished)return;
  if(event.data?.type==='vf:account-entry-error'){if(!started)failed(event.data.message||'无法打开账号');return;}
  if(event.data?.type!=='vf:account-entry-ticket'||typeof event.data.ticket!=='string'||started)return;
  await exchange(event.data.ticket);
 });
 retry.onclick=()=>begin(true);
 begin();
})();
