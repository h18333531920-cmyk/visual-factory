(function () {
  'use strict';
  const nativeFetch = window.fetch.bind(window);
  const enabled = ['asset-gallery-test.visual-factory.pages.dev','gccdesign.app','visual-factory.pages.dev'].includes(location.hostname) || window.VF_ACCESS_LOCAL === true;
  let access = null, maintenanceToken = '', maintenanceUntil = 0, refreshPromise = null, hooks = {}, page = 1, accounts = [];
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const featureNames={library:'素材库',static:'DIY 静态',icons:'制作金刚',dynamic:'DIY 动态',analytics:'数据看板',home:'创作首页',upload:'允许上传'};
  const featureIds=Object.keys(featureNames);
  // 允许上传是附加权限位：旧 product 回退里不含它，默认关闭。
  const accountFeatures=account=>Array.isArray(account.features)?account.features:(account.product==='icons'?['icons']:account.product==='all'?featureIds.filter(id=>id!=='home'&&id!=='upload'):['library','static']);
  const featuresMarkup=features=>features.map(id=>`<span class="badge">${escape(featureNames[id])}</span>`).join('')+'<span class="badge">团队管理</span>';
  const featurePicker=features=>`<fieldset class="account-feature-field"><legend>可用功能</legend><div class="account-feature-options">${featureIds.map(id=>`<label><input type="checkbox" name="features" value="${id}" ${features.includes(id)?'checked':''}><span>${featureNames[id]}</span></label>`).join('')}<label class="account-feature-fixed"><input type="checkbox" checked disabled><span>团队管理 · 始终保留</span></label></div><p class="muted">勾选「允许上传」后，该账号在素材库默认显示上传按钮，无需开发者模式。</p></fieldset>`;
  const readFeatures=node=>[...node.querySelectorAll('input[name="features"]:checked')].map(input=>input.value);
  const isolated=()=>sessionStorage.getItem('vf_account_isolated')==='1';
  const isAdminRole=()=>access?.role==='admin';
  const maintenanceActive=()=>!!access?.maintenance&&(isAdminRole()||maintenanceUntil>Date.now());
  const tokenStorage=()=>isolated()?sessionStorage:localStorage;
  const tokenKey=()=>isolated()?'vf_isolated_access_token':'vf_access_token';
  const getToken=()=>tokenStorage().getItem(tokenKey())||'';
  const saveToken=value=>value?tokenStorage().setItem(tokenKey(),value):tokenStorage().removeItem(tokenKey());
  const authOptions=()=>isolated()?{storage:sessionStorage,storageKey:sessionStorage.getItem('vf_isolated_storage_key'),persistSession:true,detectSessionInUrl:false}:{};
  const label = product => ({diy:'DIY 静态',icons:'制作金刚',all:'全部功能'}[product] || '未开通');
  const options = selected => ['diy','icons','all'].map(p=>`<option value="${p}" ${p===selected?'selected':''}>${label(p)}</option>`).join('');
  const authHeaders = () => ({Authorization:'Bearer '+getToken(), ...(maintenanceToken && maintenanceUntil>Date.now()?{'X-VF-Maintenance':maintenanceToken}:{})});
  async function call(path, body) {
    const response = await nativeFetch(path,{method:body===undefined?'GET':'POST',headers:{...authHeaders(),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(30000)});
    const data=await response.json(); if(!response.ok)throw Object.assign(new Error(data.error||data.message||'请求失败'),{status:response.status}); return data;
  }
  async function refresh() {
    if(!enabled)return null;
    if(refreshPromise)return refreshPromise;
    refreshPromise=call('/api/account-access').then(data=>{const old=access;access=data;if(!data.maintenance){maintenanceToken='';maintenanceUntil=0;}if(old&&(JSON.stringify(old.features)!==JSON.stringify(data.features)||old.product!==data.product||old.status!==data.status||old.maintenance!==data.maintenance))hooks.changed?.(data);return data;}).finally(()=>{refreshPromise=null;});
    return refreshPromise;
  }
  const developerView=()=>document.documentElement.dataset.vfMode==='developer';
  function can(route) {
    if(!enabled)return true;
    if(route==='admin')return true;
    if(!access||access.status!=='active')return false;
    const features=accountFeatures(access);
    if(route==='home')return features.includes('home');
    if(access.maintenance&&maintenanceUntil>Date.now()&&developerView())return true;
    return features.includes(route);
  }
  function firstRoute(){return access&&access.status==='active'?(['static','library','icons','dynamic','analytics','home'].find(id=>accountFeatures(access).includes(id))||'admin'):'admin';}
  async function lock(){try{await call('/api/account-access',{action:'lock'});}finally{maintenanceToken='';maintenanceUntil=0;if(access)access.maintenance=false;await refresh().catch(()=>{});hooks.locked?.();}}
  async function unlock(password, bootstrap) {
    const result=await call('/api/account-access',{action:bootstrap?'setup':'unlock',password,...(bootstrap?{bootstrap}:{})});
    maintenanceToken=result.token;maintenanceUntil=result.expiresAt;await refresh();hooks.unlocked?.();
  }
  function status(message, bad=false){const node=document.getElementById('account-panel-message');if(node){node.textContent=message;node.className='message '+(bad?'error':'success');}}
  function closeDialog(){const node=document.getElementById('account-access-dialog');if(node){node.querySelectorAll('input[type="password"]').forEach(input=>input.value='');node.remove();}}
  function dialog(title, content, submit) {
    closeDialog();const node=document.createElement('div');node.id='account-access-dialog';node.className='modal-backdrop';
    node.innerHTML=`<section class="modal account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title"><div class="modal-head"><h3 id="account-dialog-title">${escape(title)}</h3><button type="button" class="icon-btn" data-close aria-label="关闭">×</button></div><form class="stack-form">${content}<div class="message" data-message role="status"></div><div class="modal-actions"><button type="button" class="ghost-btn" data-close>取消</button><button type="submit" class="primary-btn">确认</button></div></form></section>`;
    document.body.append(node);node.querySelectorAll('[data-close]').forEach(button=>button.onclick=closeDialog);node.onclick=event=>{if(event.target===node)closeDialog();};
    node.addEventListener('keydown',event=>{if(event.key==='Escape')closeDialog();if(event.key==='Tab'){const focus=[...node.querySelectorAll('button,input,select')].filter(el=>!el.disabled);if(event.shiftKey&&document.activeElement===focus[0]){event.preventDefault();focus.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===focus.at(-1)){event.preventDefault();focus[0].focus();}}});
    node.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=node.querySelector('[type="submit"]');button.disabled=true;try{await submit(Object.fromEntries(new FormData(event.currentTarget)),node);closeDialog();}catch(error){node.querySelector('[data-message]').textContent=error.message;}finally{button.disabled=false;}};
    node.querySelector('input')?.focus();
  }
  function promptUnlock(bootstrap='') {
    dialog(bootstrap?'设置开发者密码':'验证开发者密码',`<p class="muted">${bootstrap?'设置一个仅维护者知晓的新密码。':'验证后可维护全部功能和管理账号，有效期一小时。'}</p><label>开发者密码<input type="password" name="password" autocomplete="${bootstrap?'new-password':'current-password'}" minlength="6" maxlength="128" required></label>${bootstrap?'<label>再次输入密码<input type="password" name="confirm" autocomplete="new-password" required></label>':''}`,async data=>{if(bootstrap&&data.password!==data.confirm)throw Error('两次密码不一致');await unlock(data.password,bootstrap);});
  }
  function promptSetup() {
    dialog('初始化开发者维护', '<p class="muted">导入维护者持有的私有初始化文件。文件不会公开，也不会显示其中的密码。完成后可在面板更换开发者密码。</p><label>私有初始化文件<input type="file" id="maintenance-setup-file" accept="application/json,.json" required></label>', async (_data,node)=>{
      const file=node.querySelector('input[type="file"]').files[0];if(!file||file.size>8192)throw Error('请选择有效的初始化文件');
      let profile;try{profile=JSON.parse(await file.text());}catch{throw Error('初始化文件格式不正确');}
      if(profile.version!==1||typeof profile.bootstrap!=='string'||typeof profile.password!=='string')throw Error('初始化文件格式不正确');
      await unlock(profile.password,profile.bootstrap);
      if(profile.initialAccount){
        try{await call('/api/admin/accounts',{action:'create',...profile.initialAccount});status('维护已启用，金刚账号已创建');}
        catch(error){status('维护已启用；'+error.message,true);}
      }
      await hooks.panelRefresh?.();
    });
  }
  const copyIcon='<span aria-hidden="true">⧉</span>';
  async function copyAccount(account,button){
    try{await navigator.clipboard.writeText(account.email);}catch{
      const input=document.createElement('textarea');input.value=account.email;input.style.cssText='position:fixed;left:-9999px';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok){status('复制失败，请手动复制账号',true);return;}
    }
    button.innerHTML='<span aria-hidden="true">✓</span>';button.setAttribute('aria-label','账号已复制');setTimeout(()=>{if(button.isConnected){button.innerHTML=copyIcon;button.setAttribute('aria-label','复制账号 '+account.email);}},1800);status('账号已复制');
  }
  const STAGE_KEY='vf_account_entry_ticket';
  function stageTicket(store,ticket){try{store.setItem(STAGE_KEY,JSON.stringify({ticket,expiresAt:Date.now()+55000}));return true;}catch{return false;}}
  function clearStagedTicket(){try{localStorage.removeItem(STAGE_KEY);}catch{}try{sessionStorage.removeItem(STAGE_KEY);}catch{}}
  async function openAccount(account){
    clearStagedTicket();
    let staged='';
    try{const data=await call('/api/admin/accounts',{action:'open-account',id:account.id});staged=data.ticket;}catch(error){status(error.message,true);return;}
    if(!staged){status('未取得打开凭证，请重试',true);return;}
    const stagedOk=stageTicket(localStorage,staged);
    const child=window.open('/account-entry.html','_blank');
    if(!child){
      // 弹出被拦截：不切换本页，改为提供真实链接，由用户点击在新增标签页打开。
      // 管理页与登录态保持不变；暂存票据对任何新加载的 /account-entry.html 生效。
      dialog('新标签页被浏览器拦截',`<p class="muted">当前浏览器拦截了自动打开的新标签页。点击下面的按钮，会在<b>新增标签页</b>打开「${escape(account.displayName||account.email)}」的工作台，本管理页面保持不变。打开凭证约 1 分钟内有效，过期重新点击账号即可。</p><p><a class="primary-btn" href="/account-entry.html" target="_blank" rel="noopener">在新增标签页打开</a></p>`,async()=>{});
      const link=document.querySelector('#account-access-dialog a[target="_blank"]');
      if(link)link.addEventListener('click',()=>setTimeout(closeDialog,0));
      if(!stagedOk)status('本地暂存不可用，若新标签页打开失败请重试',true);
      return;
    }
    let busy=false,consumed=null;
    const cleanup=()=>{clearTimeout(timer);clearInterval(closed);clearInterval(consumed);window.removeEventListener('message',ready);clearStagedTicket();};
    const timer=setTimeout(cleanup,180000);
    const closed=setInterval(()=>{if(child.closed)cleanup();},1000);
    if(stagedOk)consumed=setInterval(()=>{try{if(!localStorage.getItem(STAGE_KEY)){cleanup();status('账号已在新标签页打开');}}catch{}},2000);
    async function ready(event){
      if(event.origin!==location.origin||event.source!==child)return;
      if(event.data?.type==='vf:account-entry-complete'){cleanup();return;}
      if(!['vf:account-entry-ready','vf:account-entry-retry'].includes(event.data?.type)||busy)return;
      busy=true;
      try{const data=await call('/api/admin/accounts',{action:'open-account',id:account.id});if(!child.closed)child.postMessage({type:'vf:account-entry-ticket',ticket:data.ticket},location.origin);}
      catch(error){const message=error.name==='TimeoutError'?'打开账号超时，请重试':error.message;if(!child.closed)child.postMessage({type:'vf:account-entry-error',message},location.origin);status(message,true);}
      finally{busy=false;}
    }
    window.addEventListener('message',ready);
  }
  async function loadAccounts(){const data=await call('/api/admin/accounts?page='+page);accounts=data.accounts;const body=document.getElementById('accounts-list');if(!body)return;
    body.innerHTML=accounts.map(account=>`<tr><td><div class="account-identity"><a class="account-open-link" href="/account-entry.html" target="_blank" data-open="${escape(account.id)}" title="打开此账号的网页"><strong>${escape(account.displayName||account.email)}</strong><span>${escape(account.email)} ↗</span></a><button type="button" class="icon-btn account-copy" data-copy="${escape(account.id)}" aria-label="复制账号 ${escape(account.email)}" title="复制账号">${copyIcon}</button></div>${account.current?'<span class="badge">当前账号</span>':''}${account.role==='admin'?'<span class="badge">管理员</span>':''}</td><td class="account-password">${account.password==null?`<span class="muted">未记录</span><button class="account-text-button" data-remember="${escape(account.id)}">补录密码</button>`:`<code>${escape(account.password)}</code>`}</td><td class="account-features">${featuresMarkup(accountFeatures(account))}</td><td><span class="badge ${account.status==='active'?'ok':'warn'}">${account.status==='active'?'启用':'停用'}</span></td><td><div class="account-row-actions"><button class="ghost-btn" data-edit="${escape(account.id)}">编辑权限</button><button class="ghost-btn" data-password="${escape(account.id)}">重设密码</button><button class="ghost-btn account-delete" data-delete="${escape(account.id)}" ${account.current?'disabled title="不能删除当前账号"':''}>删除</button></div></td></tr>`).join('')||'<tr><td colspan="5">没有账号</td></tr>';
    const find=id=>accounts.find(account=>account.id===id);
    body.querySelectorAll('[data-open]').forEach(link=>link.onclick=event=>{event.preventDefault();openAccount(find(link.dataset.open));});
    body.querySelectorAll('[data-copy]').forEach(button=>button.onclick=event=>{event.stopPropagation();copyAccount(find(button.dataset.copy),button);});
    body.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>editAccount(find(button.dataset.edit)));
    body.querySelectorAll('[data-password]').forEach(button=>button.onclick=()=>resetPassword(find(button.dataset.password)));
    body.querySelectorAll('[data-remember]').forEach(button=>button.onclick=()=>rememberPassword(find(button.dataset.remember)));
    body.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>deleteAccount(find(button.dataset.delete)));
    const previous=document.getElementById('accounts-previous'),next=document.getElementById('accounts-next');if(previous)previous.disabled=page<=1;if(next)next.disabled=!data.hasMore;
  }
  function editAccount(account){dialog('编辑账号权限',`<p class="muted">${escape(account.email)}</p><label>账号名称<input name="displayName" value="${escape(account.displayName)}" maxlength="80" required></label>${featurePicker(accountFeatures(account))}<label class="account-confirm"><input type="checkbox" name="roleAdmin" ${account.role==='admin'?'checked':''}><span>管理员 · 常驻开发者权限，免开发者密码维护</span></label><label>状态<select name="status"><option value="active" ${account.status==='active'?'selected':''}>启用</option><option value="disabled" ${account.status==='disabled'?'selected':''} ${account.current?'disabled':''}>停用</option></select></label><p class="muted">${access.environment==='test'?'本次仅修改测试版功能权限。':'修改后将影响此账号的可用功能。'}</p>`,async(data,node)=>{await call('/api/admin/accounts',{action:'update',id:account.id,revision:account.revision,displayName:data.displayName,status:data.status,role:data.roleAdmin==='on'?'admin':'user',features:readFeatures(node)});await refresh();await loadAccounts();status('账号权限已保存');});}
  function createAccount(){dialog('创建账号',`<label>账号名称<input name="displayName" maxlength="80" required></label><label>登录邮箱<input name="email" type="email" autocomplete="off" required></label>${featurePicker(['icons'])}<label>初始密码<input name="password" type="password" minlength="6" maxlength="128" autocomplete="new-password" required></label><p class="muted">密码会加密记录，验证开发者身份后可在面板查看。</p>`,async(data,node)=>{await call('/api/admin/accounts',{action:'create',displayName:data.displayName,email:data.email,password:data.password,features:readFeatures(node)});await loadAccounts();status('账号已创建');});}
  function rememberPassword(account){dialog('补录当前密码',`<p class="muted">${escape(account.email)}。验证密码正确后记录到面板，不会重设账号密码。</p><label>当前登录密码<input name="password" type="password" minlength="6" maxlength="128" autocomplete="off" required></label>`,async data=>{await call('/api/admin/accounts',{action:'remember-password',id:account.id,password:data.password});await loadAccounts();status('当前密码已验证并记录');});}
  function resetPassword(account){dialog('重设登录密码',`<p class="muted">${escape(account.email)}。登录密码由测试版与正式版共用；修改后，此账号下次登录需要新密码。</p><label>新密码<input name="password" type="password" minlength="6" maxlength="128" autocomplete="new-password" required></label><label>再次输入新密码<input name="confirm" type="password" autocomplete="new-password" required></label><label class="account-confirm"><input name="ack" type="checkbox" required>我确认修改此账号在测试版与正式版使用的登录密码</label>`,async data=>{if(data.password!==data.confirm)throw Error('两次密码不一致');const result=await call('/api/admin/accounts',{action:'reset-password',id:account.id,password:data.password,confirmEmail:account.email,acknowledgeGlobalPasswordChange:data.ack==='on'});if(account.current)await lock();else await loadAccounts();status(result.passwordRecorded===false?'密码已更新，记录暂未保存，可稍后补录':'登录密码已更新并记录');});}
  function deleteAccount(account){dialog('删除账号',`<p class="account-delete-warning">删除后，${escape(account.email)} 将无法登录测试版或正式版，此操作不能撤销。不会主动删除账号名下的素材。</p><label>输入要删除的登录邮箱<input name="confirmEmail" type="email" autocomplete="off" required></label><label class="account-confirm"><input name="ack" type="checkbox" required>我确认删除这个账号，包含测试版与正式版的登录资格</label>`,async data=>{if(data.confirmEmail!==account.email)throw Error('登录邮箱不一致');await call('/api/admin/accounts',{action:'delete',id:account.id,confirmEmail:data.confirmEmail,acknowledgeGlobalDeletion:data.ack==='on'});await loadAccounts();status('账号已删除');});}
  async function renderPanel(container) {
    container.innerHTML='<div class="panel-page"><section class="panel"><p>正在读取账号信息…</p></section></div>';
    try{await refresh();}catch(error){container.innerHTML=`<div class="panel-page"><section class="panel"><h3>账号信息暂时不可用</h3><p>${escape(error.message)}</p><button class="primary-btn" id="account-retry">重试</button></section></div>`;document.getElementById('account-retry').onclick=()=>renderPanel(container);return;}
    const verified=maintenanceActive();
    const managing=verified&&developerView();
    const adminRole=isAdminRole();
    container.innerHTML=`<div class="panel-page account-management"><section class="admin-section"><div><div class="kicker">${access.environment==='test'?'测试版 · 团队管理':'团队管理'}</div><h3>${escape(access.displayName||access.email)}</h3><p class="muted">${escape(access.email)}</p></div><div class="account-summary">${featuresMarkup(accountFeatures(access))}<span class="badge ${access.status==='active'?'ok':'warn'}">${access.status==='active'?'启用':'停用'}</span>${adminRole?'<span class="badge">管理员</span>':''}</div></section><section class="admin-section"><div><h3>开发者维护</h3><p class="muted">${adminRole?'管理员账号：开发者权限常驻，无需密码，刷新后仍可用悬浮球切换模式。':managing?'已验证。悬浮球可随时切换显示模式；点击退出维护后才会锁定。':verified?'开发者验证仍有效，可用悬浮球切回开发者模式，无需再次输入密码。':access.setupRequired?'开发者密码尚未设置，请由维护者通过私有设置入口完成配置。':'输入开发者密码后，可维护全部功能和管理账号。'}</p></div><button class="${managing?'ghost-btn':'primary-btn'}" id="account-unlock" >${managing?(adminRole?'切换到用户模式':'退出维护'):verified?'切回开发者模式':access.setupRequired?'设置开发者密码':'验证开发者密码'}</button></section><div class="message" id="account-panel-message" role="status"></div>${managing?`<section class="panel"><div class="account-panel-head"><div><h3>账号管理</h3><p class="muted">${access.environment==='test'?'点击账号可打开对应页面；功能勾选和停用仅影响测试版。登录密码与账号删除同时影响正式版。':'同一网站按账号显示已开通功能。'}</p></div><div class="account-row-actions"><button class="ghost-btn" id="accounts-refresh">刷新</button><button class="primary-btn" id="accounts-create">创建账号</button></div></div><p class="account-password-note muted">显示通过本面板记录的密码。旧账号未记录的密码无法读取，可补录；外部改密后需同步记录。</p><div class="account-table-wrap"><table class="table"><thead><tr><th>账号</th><th>密码</th><th>可用功能</th><th>状态</th><th>操作</th></tr></thead><tbody id="accounts-list"><tr><td colspan="5">正在读取…</td></tr></tbody></table></div><div class="account-pagination"><button class="ghost-btn" id="accounts-previous">上一页</button><button class="ghost-btn" id="accounts-next">下一页</button></div></section>`:''}</div>`;
    document.getElementById('account-unlock').onclick=()=>managing?(adminRole?hooks.modeSwitch?.('user'):lock().then(()=>renderPanel(container)).catch(e=>status(e.message,true))):verified?hooks.unlocked?.():access.setupRequired?promptSetup():promptUnlock();
    if(managing){document.getElementById('accounts-create').onclick=createAccount;document.getElementById('accounts-refresh').onclick=()=>loadAccounts().catch(e=>status(e.message,true));document.getElementById('accounts-previous').onclick=()=>{page--;loadAccounts().catch(e=>status(e.message,true));};document.getElementById('accounts-next').onclick=()=>{page++;loadAccounts().catch(e=>status(e.message,true));};const changePasswordButton=document.getElementById('maintenance-change-password');if(changePasswordButton)changePasswordButton.onclick=()=>dialog('更换开发者密码','<label>新密码<input name="password" type="password" minlength="6" maxlength="128" autocomplete="new-password" required></label><label>再次输入<input name="confirm" type="password" autocomplete="new-password" required></label>',async data=>{if(data.password!==data.confirm)throw Error('两次密码不一致');const result=await call('/api/account-access',{action:'change-password',password:data.password});maintenanceToken=result.token;maintenanceUntil=result.expiresAt;await refresh();status('开发者密码已更新');});await loadAccounts().catch(e=>status(e.message,true));}
  }
  function wrappedFetch(input, init) {
    if(!enabled)return nativeFetch(input,init);
    let url;try{url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);}catch{return nativeFetch(input,init);}
    const headers=new Headers(init?.headers||input?.headers||{});let destination=url.href;
    const config=window.VF_CONFIG||{};
    if(config.supabaseUrl&&url.origin===new URL(config.supabaseUrl).origin&&(/^\/rest\/v1\//.test(url.pathname)||/^\/storage\/v1\//.test(url.pathname))){destination='/api/account-data?path='+encodeURIComponent(url.pathname+url.search);Object.entries(authHeaders()).forEach(([key,value])=>headers.set(key,value));headers.delete('apikey');}
    else if(url.origin===location.origin&&url.pathname.startsWith('/api/'))Object.entries(authHeaders()).forEach(([key,value])=>{headers.set(key,value);});
    else if(url.origin==='https://jimeng.gccdesign.app'&&/^\/api\/(image-service|icon-cutout)\/v1\//.test(url.pathname))Object.entries(authHeaders()).forEach(([key,value])=>headers.set(key,value));
    if(typeof input==='object'&&!(input instanceof URL)&&input instanceof Request)return nativeFetch(new Request(destination,input),{...init,headers});
    return nativeFetch(destination,{...init,headers});
  }
  window.VFAccountAccess={enabled,getToken,saveToken,authOptions,isolated,refresh,can,firstRoute,lock,promptUnlock,renderPanel,fetch:wrappedFetch,headers:authHeaders,maintenance:maintenanceActive,snapshot:()=>access,configure:value=>{hooks=value;},clear:()=>{access=null;maintenanceToken='';maintenanceUntil=0;closeDialog();}};
  if(enabled){window.addEventListener('vf:interface-mode-change',()=>{if(!developerView())closeDialog();});window.fetch=wrappedFetch;setInterval(()=>{if(maintenanceToken&&maintenanceUntil<=Date.now())lock().catch(()=>{});},10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&access)refresh().catch(()=>{});});}
})();
