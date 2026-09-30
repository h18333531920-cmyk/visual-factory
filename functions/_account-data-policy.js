import {accountFeatures} from './_account-features.js';
import { fail } from './_account-access.js';
const tables = new Set(['vf_profiles','vf_projects','vf_categories','vf_library_options','vf_source_files','vf_asset_previews','vf_asset_favorites','vf_asset_events','vf_team_members','vf_material_catalog']);
const ownsPath = (path,id) => typeof path === 'string' && path.startsWith(id + '/') && !path.split('/').some(p=>p==='.'||p==='..');
const safePath = path => typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(p=>p==='.'||p==='..');
export function dataPlan(ctx, path, method, base, headers) {
  if (ctx.account.status !== 'active') throw fail('此账号已停用',403);
  if (!path.startsWith('/')||path.startsWith('//')||path.includes('\\')||path.includes('#')) throw fail('请求路径无效',403);
  const target=new URL(path,base);if(target.origin!==new URL(base).origin||target.username||target.password)throw fail('请求路径无效',403);
  const parts=target.pathname.split('/').filter(Boolean);
  const rest=parts[0]==='rest'&&parts[1]==='v1'&&parts.length===3&&tables.has(parts[2]);
  const special=['sign','list','authenticated','public'].includes(parts[3]);
  const bucketIndex=special?4:3,bucket=parts[bucketIndex];
  const storage=parts[0]==='storage'&&parts[1]==='v1'&&parts[2]==='object'&&['vf-library','vf-projects'].includes(bucket);
  if(!rest&&!storage)throw fail('请求路径无效',403);
  if(!['GET','HEAD','POST','PATCH','PUT','DELETE'].includes(method))throw fail('请求方法不支持',405);
  const profile=rest&&parts[2]==='vf_profiles';
  if(profile&&method!=='GET')throw fail('请使用账号管理面板',403);
  const features=accountFeatures(ctx.account);
  if(!ctx.maintenance&&!features.some(id=>['library','static','dynamic','home','analytics'].includes(id))&&!profile)throw fail('此账号未开通素材库或 DIY 静态',403);
  if(!ctx.maintenance&&((rest&&parts[2]==='vf_projects')||(storage&&bucket==='vf-projects'))&&!features.some(id=>['static','dynamic','home'].includes(id))&&!(features.includes('analytics')&&['GET','HEAD'].includes(method)))throw fail('此账号未开通项目编辑功能',403);
  const read=['GET','HEAD'].includes(method)||storage&&method==='POST'&&['sign','list'].includes(parts[3]);
  const ownerColumn=rest?({vf_projects:'owner_id',vf_asset_favorites:'user_id',vf_asset_events:'actor_id'}[parts[2]]):null;
  const personal=!!ownerColumn||storage&&bucket==='vf-projects';
  // 「允许上传」权限位：只放行新增素材（自己的存储目录 + 新记录），
  // 自己上传素材的标签可以被上传流程回写，其余改删仍需维护权限。
  const uploader=!ctx.maintenance&&features.includes('upload');
  const uploadInsert=uploader&&rest&&method==='POST'&&['vf_source_files','vf_asset_previews'].includes(parts[2])&&!(headers.get('prefer')||'').includes('resolution=');
  const uploadTagPatch=uploader&&rest&&method==='PATCH'&&parts[2]==='vf_source_files';
  const uploadObject=uploader&&storage&&bucket==='vf-library'&&method==='POST'&&!special&&parts.length>bucketIndex+1;
  if(!ctx.maintenance&&!read&&!personal&&!uploadInsert&&!uploadTagPatch&&!uploadObject)throw fail('此操作需要开发者维护权限',403);
  if(profile){target.searchParams.set('id','eq.'+ctx.user.id);target.searchParams.set('select','id,email,display_name,role,status');}
  if(!ctx.maintenance&&rest&&(target.searchParams.get('select')||'').includes('('))throw fail('此查询不支持关联其他表',403);
  if(!ctx.maintenance&&ownerColumn){
    target.searchParams.set(ownerColumn,'eq.'+ctx.user.id);
    if(method==='POST'&&parts[2]!=='vf_asset_favorites'&&(headers.get('prefer')||'').includes('resolution='))throw fail('此操作不支持覆盖已有记录',403);
    if(method==='POST'&&parts[2]==='vf_asset_favorites')target.searchParams.set('on_conflict','user_id,preview_id');
    if(parts[2]==='vf_asset_events'&&['PATCH','PUT'].includes(method))throw fail('操作记录不能修改',403);
  }
  // 上传者改标签只允许命中自己上传的记录，命中不到时静默更新 0 行。
  if(uploadTagPatch)target.searchParams.set('uploaded_by','eq.'+ctx.user.id);
  if(storage){
    let object;try{object=decodeURIComponent(parts.slice(bucketIndex+1).join('/'));}catch{throw fail('文件路径无效');}
    if(object&&!safePath(object))throw fail('文件路径无效',403);
    if(!ctx.maintenance&&bucket==='vf-projects'&&object&&!ownsPath(object,ctx.user.id))throw fail('不能访问其他账号的项目',403);
    if(uploadObject&&object&&!ownsPath(object,ctx.user.id))throw fail('只能上传到本账号的素材目录',403);
  }
  const jsonBody=rest&&!ctx.maintenance&&['POST','PATCH','PUT'].includes(method)||storage&&['POST','DELETE'].includes(method)&&(['sign','list'].includes(parts[3])||parts.length===bucketIndex+1);
  return {target,rest,storage,parts,bucket,ownerColumn,jsonBody,read,uploadInsert,uploadTagPatch};
}
export function restrictDataBody(ctx,plan,value){
  if(!value||typeof value!=='object')throw fail('请求格式错误');
  if(plan.rest&&!ctx.maintenance&&plan.ownerColumn){
    const rows=Array.isArray(value)?value:[value];if(rows.length>100)throw fail('一次最多操作100条记录');
    const next=rows.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw fail('请求格式错误');return {...row,[plan.ownerColumn]:ctx.user.id,...(plan.parts[2]==='vf_asset_events'?{actor_role:'operator'}:{})};});
    return Array.isArray(value)?next:next[0];
  }
  if(plan.uploadInsert){
    const rows=Array.isArray(value)?value:[value];if(rows.length>100)throw fail('一次最多操作100条记录');
    const owned=plan.parts[2]==='vf_source_files';// vf_asset_previews 没有 uploaded_by 列，只能校验不能改字段
    const next=rows.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw fail('请求格式错误');return owned?{...row,uploaded_by:ctx.user.id}:{...row};});
    return Array.isArray(value)?next:next[0];
  }
  if(plan.uploadTagPatch){
    if(Array.isArray(value)||Object.keys(value).some(key=>key!=='tags'))throw fail('此操作需要开发者维护权限',403);
    return value;
  }
  if(plan.storage){
    if(Array.isArray(value))throw fail('请求格式错误');
    for(const key of ['paths','prefixes'])if(value[key]!==undefined){
      if(!Array.isArray(value[key])||value[key].length>1000||value[key].some(path=>!safePath(path)||!ctx.maintenance&&plan.bucket==='vf-projects'&&!ownsPath(path,ctx.user.id)))throw fail('文件路径无效',403);
    }
    if(plan.parts[3]==='list'){
      if(!ctx.maintenance&&plan.bucket==='vf-projects'){
        if(value.prefix&&!ownsPath(value.prefix.replace(/\/$/,'')+'/',ctx.user.id))throw fail('不能列出其他账号的项目',403);
        value={...value,prefix:value.prefix||ctx.user.id+'/'};
      }
      if(value.prefix&&!safePath(value.prefix))throw fail('文件路径无效',403);
    }
  }
  return value;
}

export function dataResponseHeaders(plan,request,response) {
  const headers=new Headers(response.headers);
  headers.delete('set-cookie');headers.delete('access-control-allow-origin');
  const cacheable=plan.storage&&plan.bucket==='vf-library'&&request.method==='GET'&&!request.headers.has('range')&&[200,304].includes(response.status);
  headers.set('Cache-Control',cacheable?'private, no-cache':'no-store');
  if(cacheable){const vary=new Set((headers.get('Vary')||'').split(',').map(value=>value.trim()).filter(Boolean));vary.add('Authorization');vary.add('X-VF-Maintenance');headers.set('Vary',[...vary].join(', '));}
  return headers;
}
