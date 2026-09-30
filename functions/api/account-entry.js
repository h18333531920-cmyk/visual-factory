import {accessEnvironment,dbFor,bodyJson,fail,reply,digest,authFetch,accountFor} from '../_account-access.js';
import {accountFeatures,firstFeatureRoute} from '../_account-features.js';
export async function handleEntry(request,env,fetcher=fetch){
 try{
  accessEnvironment(request,env);
  if(request.method!=='POST'||request.headers.get('origin')!==new URL(request.url).origin)throw fail('不允许此操作',403);
  const {ticket}=await bodyJson(request);if(typeof ticket!=='string'||!/^[a-f\d]{64}$/.test(ticket))throw fail('账号打开链接已失效',403);
  const db=dbFor(env),hash=await digest(ticket);
  const handoff=await db.prepare('DELETE FROM vf_account_handoffs WHERE token_hash=? AND expires_at>? RETURNING *').bind(hash,Date.now()).first();
  if(!handoff)throw fail('账号打开链接已失效，请重新点击账号',403);
  const actor=await db.prepare('SELECT s.user_id FROM vf_maintenance_sessions s JOIN vf_access_config c ON c.id=1 AND c.revision=s.revision LEFT JOIN vf_accounts a ON a.user_id=s.user_id WHERE s.token_hash=? AND s.user_id=? AND s.expires_at>? AND COALESCE(a.status,\'active\')=\'active\'').bind(handoff.maintenance_hash,handoff.actor_id,Date.now()).first();
  if(!actor){
   // 管理员角色账号没有维护会话令牌：open-account 时以空令牌摘要签发，
   // 这里凭账号角色补验；票据本身仍是一次性且 60 秒有效。
   const admin=await db.prepare('SELECT user_id FROM vf_accounts WHERE user_id=? AND role=\'admin\' AND status=\'active\'').bind(handoff.actor_id).first();
   if(!(admin&&handoff.maintenance_hash===await digest('')))throw fail('开发者维护已结束，请重新验证',403);
  }
  const targetResult=await authFetch(env,`admin/users/${handoff.target_id}`,{},fetcher),target=targetResult.user||targetResult;
  if(target.id!==handoff.target_id||target.deleted_at)throw fail('账号不可用',403);
  const account=await accountFor(db,target);if(account.status!=='active')throw fail('此账号已停用',403);
  // Generates and verifies a one-time login internally. No email is sent and
  // no account password is reset or required by the opening tab.
  const link=await authFetch(env,'admin/generate_link',{method:'POST',body:JSON.stringify({type:'magiclink',email:target.email})},fetcher);
  const tokenHash=link.hashed_token||link.properties?.hashed_token;
  if(typeof tokenHash!=='string'||!tokenHash)throw fail('无法打开账号，请重试',502);
  const session=await authFetch(env,'verify',{method:'POST',body:JSON.stringify({type:'magiclink',token_hash:tokenHash})},fetcher);
  if(session.user?.id!==target.id||typeof session.access_token!=='string'||typeof session.refresh_token!=='string')throw fail('账号验证未完成',502);
  return reply({session:{access_token:session.access_token,refresh_token:session.refresh_token,token_type:'bearer',expires_in:session.expires_in,expires_at:session.expires_at||Math.floor(Date.now()/1000)+session.expires_in,user:{id:target.id,email:target.email,user_metadata:{display_name:account.display_name}}},route:firstFeatureRoute(accountFeatures(account))});
 }catch(error){return reply({error:error.status?error.message:'打开账号暂时失败，请重试'},error.status||503);}
}
export const onRequest=({request,env})=>handleEntry(request,env);
