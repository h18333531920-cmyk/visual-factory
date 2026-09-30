import { accessContext, authFetch, bodyJson, fail, randomToken, reply, requireMaintenance, validatePassword, accountFor, digest, rateLimit } from '../../_account-access.js';
import {accountFeatures,inputFeatures,productForFeatures} from '../../_account-features.js';
import {openPassword,savePassword,sealPassword} from '../../_account-vault.js';
const validId=id=>typeof id==='string'&&/^[a-f\d-]{36}$/i.test(id);
const label=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw fail('账号名称须为 1–80 个字符');return value.trim();};
const selection=input=>{if(!Object.hasOwn(input,'features')&&!['diy','icons','all'].includes(input.product))throw fail('请选择可用功能');return inputFeatures(input);};
export async function handleAccounts(request,env,fetcher=fetch){
 try{
  const ctx=await accessContext(request,env,fetcher);requireMaintenance(ctx);
  const audit=(target,action)=>ctx.db.prepare('INSERT INTO vf_account_audit(id,actor_id,target_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),ctx.user.id,target,action,Date.now()).run();
  if(request.method==='GET'){
   const page=Math.max(1,Math.min(10000,Number(new URL(request.url).searchParams.get('page'))||1));
   const result=await authFetch(env,`admin/users?page=${page}&per_page=50`,{},fetcher);
   const saved=await ctx.db.prepare('SELECT a.*,f.features_json FROM vf_accounts a LEFT JOIN vf_account_features f ON f.user_id=a.user_id').all();
   const passwords=await ctx.db.prepare('SELECT * FROM vf_account_passwords').all();
   const byId=new Map(saved.results.map(row=>[row.user_id,row])),byPassword=new Map(passwords.results.map(row=>[row.user_id,row]));
   const accounts=await Promise.all((result.users||[]).filter(user=>!user.deleted_at).map(async user=>{
    const row=byId.get(user.id),stored=byPassword.get(user.id);
    return {id:user.id,email:user.email||'',displayName:row?.display_name||user.user_metadata?.display_name||'',product:row?.product||'diy',features:accountFeatures(row||{product:'diy'}),status:row?.status||'active',role:row?.role==='admin'?'admin':'user',revision:row?.revision||'legacy',current:user.id===ctx.user.id,legacy:!row,password:await openPassword(env,ctx.environment,stored,user.email),passwordRecordedAt:stored?.recorded_at||null};
   }));
   return reply({accounts,page,hasMore:(result.users||[]).length===50,environment:ctx.environment});
  }
  if(request.method!=='POST')throw fail('请求方法不支持',405);
  if(request.headers.get('origin')!==new URL(request.url).origin)throw fail('不允许跨站操作',403);
  const input=await bodyJson(request);
  if(input.action==='create'){
   const name=label(input.displayName),features=selection(input),product=productForFeatures(features);
   const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('请输入邮箱格式的登录名');
   validatePassword(input.password);await sealPassword(env,ctx.environment,'key-check',email,input.password);
   const result=await authFetch(env,'admin/users',{method:'POST',body:JSON.stringify({email,password:input.password,email_confirm:true,ban_duration:'876000h',user_metadata:{display_name:name,role:'operator'},app_metadata:{vf_managed_account:true,vf_access_scope:ctx.environment,vf_product:product}})},fetcher);
   const user=result.user||result;if(!validId(user.id))throw fail('创建账号返回异常',502);
   try{
    const time=Date.now();
    await ctx.db.batch([
     ctx.db.prepare('INSERT INTO vf_accounts(user_id,email,display_name,product,status,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(user.id,email,name,product,'active',randomToken(),time,time),
     ctx.db.prepare('INSERT INTO vf_account_features(user_id,features_json) VALUES(?,?)').bind(user.id,JSON.stringify(features))
    ]);
    await savePassword(ctx,env,{id:user.id,email},input.password);
    await authFetch(env,`admin/users/${user.id}`,{method:'PUT',body:JSON.stringify({ban_duration:'none'})},fetcher);await audit(user.id,'create');
   }catch{throw fail('账号创建未完全完成，请刷新列表核对，勿重复创建',502);}
   return reply({success:true,id:user.id},201);
  }
  if(!validId(input.id))throw fail('账号标识无效');
  const result=await authFetch(env,`admin/users/${input.id}`,{},fetcher),target=result.user||result;
  if(target.id!==input.id||target.deleted_at)throw fail('账号不存在',404);
  if(input.action==='update'){
   const features=selection(input),product=productForFeatures(features),name=label(input.displayName);
   if(!['active','disabled'].includes(input.status))throw fail('账号状态无效');
   if(input.role!=null&&!['user','admin'].includes(input.role))throw fail('账号角色无效');
   if(input.id===ctx.user.id&&input.status==='disabled')throw fail('不能停用当前正在维护的账号');
   const previous=await ctx.db.prepare('SELECT revision,role FROM vf_accounts WHERE user_id=?').bind(input.id).first();
   if(input.revision!==(previous?.revision||'legacy'))throw fail('账号配置已变化，请刷新后再修改',409);
   // 未显式提供 role 时保留原值，避免旧客户端把管理员账号静默降级。
   const role=['user','admin'].includes(input.role)?input.role:(previous?.role||'user');
   const time=Date.now(),revision=randomToken();
   const change=previous?ctx.db.prepare('UPDATE vf_accounts SET display_name=?,product=?,status=?,role=?,revision=?,updated_at=? WHERE user_id=? AND revision=?').bind(name,product,input.status,role,revision,time,input.id,previous.revision):ctx.db.prepare('INSERT OR IGNORE INTO vf_accounts(user_id,email,display_name,product,status,role,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(input.id,target.email,name,product,input.status,['user','admin'].includes(input.role)?input.role:'user',revision,time,time);
   const saved=await ctx.db.batch([change,ctx.db.prepare('INSERT INTO vf_account_features(user_id,features_json) SELECT user_id,? FROM vf_accounts WHERE user_id=? AND revision=? ON CONFLICT(user_id) DO UPDATE SET features_json=excluded.features_json').bind(JSON.stringify(features),input.id,revision)]);
   if(!saved[0].meta.changes)throw fail('账号配置已变化，请刷新后再修改',409);
   if(input.status==='disabled')await ctx.db.prepare('DELETE FROM vf_maintenance_sessions WHERE user_id=?').bind(input.id).run();
   await audit(input.id,'update-access');return reply({success:true,revision});
  }
  if(input.action==='remember-password'){
   validatePassword(input.password);await rateLimit(ctx,request);
   let session;
   try{session=await authFetch(env,'token?grant_type=password',{method:'POST',body:JSON.stringify({email:target.email,password:input.password})},fetcher);}catch{throw fail('密码验证未通过，未修改或记录密码',400);}
   if(session.user?.id!==target.id)throw fail('密码验证未通过',400);
   try{await savePassword(ctx,env,target,input.password);await audit(target.id,'remember-password');}
   finally{if(session.access_token)await authFetch(env,'logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}},fetcher).catch(()=>{});}
   return reply({success:true});
  }
  if(input.action==='reset-password'){
   validatePassword(input.password);
   if(input.confirmEmail!==target.email||input.acknowledgeGlobalPasswordChange!==true)throw fail('请确认登录名以及密码同时影响测试版和正式版');
   await sealPassword(env,ctx.environment,target.id,target.email,input.password);
   await ctx.db.prepare('DELETE FROM vf_account_passwords WHERE user_id=?').bind(target.id).run();
   await authFetch(env,`admin/users/${input.id}`,{method:'PUT',body:JSON.stringify({password:input.password})},fetcher);
   await ctx.db.prepare('DELETE FROM vf_maintenance_sessions WHERE user_id=?').bind(input.id).run();
   let passwordRecorded=true;try{await savePassword(ctx,env,target,input.password);}catch{passwordRecorded=false;}
   await audit(input.id,'reset-password');return reply({success:true,passwordRecorded});
  }
  if(input.action==='open-account'){
   const account=await accountFor(ctx.db,target);if(account.status!=='active')throw fail('此账号已停用',403);
   const ticket=randomToken(),expires=Date.now()+60000;
   await ctx.db.batch([
    ctx.db.prepare('DELETE FROM vf_account_handoffs WHERE expires_at < ?').bind(Date.now()),
    ctx.db.prepare('INSERT INTO vf_account_handoffs(token_hash,actor_id,target_id,maintenance_hash,expires_at) VALUES(?,?,?,?,?)').bind(await digest(ticket),ctx.user.id,target.id,await digest(request.headers.get('x-vf-maintenance')||''),expires)
   ]);await audit(target.id,'open-account');return reply({ticket,expiresAt:expires});
  }
  if(input.action==='delete'){
   if(target.id===ctx.user.id)throw fail('不能删除当前正在使用的账号',400);
   if(input.confirmEmail!==target.email||input.acknowledgeGlobalDeletion!==true)throw fail('请确认登录邮箱及删除影响',400);
   // Soft deletion preserves identifiers used by existing work. Never delete
   // owned storage objects as a workaround for a provider deletion failure.
   try{await authFetch(env,`admin/users/${target.id}`,{method:'DELETE',body:JSON.stringify({should_soft_delete:true})},fetcher);}catch{throw fail('删除未完成，账号可能关联素材或服务暂时不可用；请刷新核对，可先停用账号',409);}
   await ctx.db.batch(['vf_maintenance_sessions','vf_accounts','vf_account_features','vf_account_passwords'].map(table=>ctx.db.prepare(`DELETE FROM ${table} WHERE user_id=?`).bind(target.id)).concat(ctx.db.prepare('DELETE FROM vf_account_handoffs WHERE target_id=? OR actor_id=?').bind(target.id,target.id)));
   await audit(target.id,'delete-account');return reply({success:true});
  }
  throw fail('操作不支持');
 }catch(error){return reply({error:error.status?error.message:'服务暂时不可用，请稍后重试'},error.status||503);}
}
export const onRequest=({request,env})=>handleAccounts(request,env);
