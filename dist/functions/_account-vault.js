import {fail} from './_account-access.js';
const enc=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function keyFor(env) {
  const value=env.VF_ACCOUNT_VAULT_KEY;
  if(typeof value!=='string'||!/^[a-f\d]{64}$/i.test(value))throw fail('密码记录服务尚未配置',503);
  const bytes=Uint8Array.from(value.match(/../g),n=>parseInt(n,16));
  return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
export async function sealPassword(env,environment,id,email,password){
  const key=await keyFor(env),iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(environment+'|'+id+'|'+email)},key,enc.encode(password));
  return JSON.stringify({version:1,iv:encode(iv),data:encode(encrypted)});
}
export async function openPassword(env,environment,row,email){
  if(!row||row.email!==email)return null;
  try {const payload=JSON.parse(row.encrypted);if(payload.version!==1)return null;
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(payload.iv),additionalData:enc.encode(environment+'|'+row.user_id+'|'+email)},await keyFor(env),decode(payload.data));
    return new TextDecoder().decode(plain);
  }catch{return null;}
}
export async function savePassword(ctx,env,target,password){
  const value=await sealPassword(env,ctx.environment,target.id,target.email,password);
  await ctx.db.prepare('INSERT INTO vf_account_passwords(user_id,email,encrypted,recorded_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,encrypted=excluded.encrypted,recorded_at=excluded.recorded_at').bind(target.id,target.email,value,Date.now()).run();
}
