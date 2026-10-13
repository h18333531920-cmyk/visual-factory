import test from 'node:test';
import assert from 'node:assert/strict';
import {dataPlan,restrictDataBody,dataResponseHeaders} from '../functions/_account-data-policy.js';
const uid='11111111-1111-4111-8111-111111111111';
const diy={user:{id:uid},account:{product:'diy',status:'active'},maintenance:null};
const icons={...diy,account:{product:'icons',status:'active'}};
const plan=(ctx,path,method='GET',headers={})=>dataPlan(ctx,path,method,'https://owned.supabase.co',new Headers(headers));
const libraryOnly=()=>({...diy,account:{features:['library'],product:'diy',status:'active'}});
test('icons cannot access asset records or mint signed asset URLs',()=>{
 assert.throws(()=>plan(icons,'/rest/v1/vf_source_files'),{status:403});
 assert.throws(()=>plan(icons,'/storage/v1/object/sign/vf-library','POST'),{status:403});
 assert.equal(plan(icons,'/rest/v1/vf_profiles?id=neq.any').target.searchParams.get('id'),'eq.'+uid);
 assert.equal(plan(icons,'/rest/v1/vf_profiles?select=*,vf_source_files(*)').target.searchParams.get('select'),'id,email,display_name,role,status');
});
test('v901：词表同步 RPC 只放行一个名字、只允许 POST、且要维护权限',()=>{
 const admin={...diy,maintenance:{}};
 const p=plan(admin,'/rest/v1/rpc/vf_sync_tag_vocabulary','POST');
 assert.equal(p.syncRpc,true);
 assert.equal(p.jsonBody,false,'RPC 无参数，body 原样透传');
 assert.equal(p.read,false);
 assert.throws(()=>plan(diy,'/rest/v1/rpc/vf_sync_tag_vocabulary','POST'),{status:403},'普通账号不给同步');
 assert.throws(()=>plan(admin,'/rest/v1/rpc/vf_sync_tag_vocabulary','GET'),{status:405});
 assert.throws(()=>plan(admin,'/rest/v1/rpc/vf_sync_tag_vocabulary_extra','POST'),{status:403});
 assert.throws(()=>plan(admin,'/rest/v1/rpc/vf_sync_tag_vocabulary/extra','POST'),{status:403});
 assert.throws(()=>plan(admin,'/rest/v1/rpc/vf_some_other_fn','POST'),{status:403});
});

test('unknown tables, RPC, cross-origin and traversal are not proxied',()=>{
 for(const path of ['//untrusted.invalid/a','/rest/v1/rpc/vf_is_admin','/rest/v1/unknown','/storage/v1/object/vf-projects/another/file'])assert.throws(()=>plan(diy,path),{status:403});
 assert.throws(()=>plan(diy,'/rest/v1/vf_projects?select=*,vf_profiles(*)'),{status:403});
});
test('ordinary DIY can read material but cannot change shared material',()=>{
 assert.equal(plan(diy,'/rest/v1/vf_source_files').read,true);
 for(const method of ['POST','PATCH','DELETE'])assert.throws(()=>plan(diy,'/rest/v1/vf_source_files',method),{status:403});
 assert.equal(plan({...diy,maintenance:{}},'/rest/v1/vf_source_files','PATCH').read,false);
});
test('project filters and body ownership cannot be redirected to another account',()=>{
 const p=plan(diy,'/rest/v1/vf_projects?owner_id=eq.someone&owner_id=neq.self','PATCH');
 assert.deepEqual(p.target.searchParams.getAll('owner_id'),['eq.'+uid]);
 assert.equal(restrictDataBody(diy,p,{owner_id:'someone',title:'test'}).owner_id,uid);
 assert.throws(()=>plan(diy,'/rest/v1/vf_projects','POST',{prefer:'resolution=merge-duplicates'}),{status:403});
 assert.equal(plan(diy,'/rest/v1/vf_projects?id=eq.abc','DELETE').jsonBody,false);
});
test('favorite upsert uses own composite key; activity cannot impersonate admin',()=>{
 const favorite=plan(diy,'/rest/v1/vf_asset_favorites?on_conflict=preview_id','POST',{prefer:'resolution=merge-duplicates'});
 assert.equal(favorite.target.searchParams.get('on_conflict'),'user_id,preview_id');assert.equal(restrictDataBody(diy,favorite,{user_id:'someone',preview_id:'a'}).user_id,uid);
 const events=plan(diy,'/rest/v1/vf_asset_events','POST');const body=restrictDataBody(diy,events,{actor_id:'someone',actor_role:'admin'});assert.equal(body.actor_id,uid);assert.equal(body.actor_role,'operator');
});
test('team member roster is readable by every active account but writable only in maintenance',()=>{
 assert.equal(plan(diy,'/rest/v1/vf_team_members').read,true);
 assert.equal(plan(libraryOnly(),'/rest/v1/vf_team_members').read,true);
 for(const method of ['POST','PATCH','DELETE'])assert.throws(()=>plan(diy,'/rest/v1/vf_team_members',method),{status:403});
 assert.equal(plan({...diy,maintenance:{}},'/rest/v1/vf_team_members','POST').read,false);
});

test('preview AI experiment rows are readable to active library users and writable only in maintenance',()=>{
 assert.equal(plan(libraryOnly(),'/rest/v1/vf_preview_ai_tags').read,true);
 for(const method of ['POST','PATCH','DELETE'])assert.throws(()=>plan(libraryOnly(),'/rest/v1/vf_preview_ai_tags',method),{status:403});
 assert.equal(plan({...libraryOnly(),maintenance:{}},'/rest/v1/vf_preview_ai_tags','POST').read,false);
});

test('project storage list, batch sign and delete remain inside own folder',()=>{
 const list=plan(diy,'/storage/v1/object/list/vf-projects','POST');assert.equal(restrictDataBody(diy,list,{prefix:''}).prefix,uid+'/');
 assert.throws(()=>restrictDataBody(diy,list,{prefix:'someone/'}),{status:403});
 const sign=plan(diy,'/storage/v1/object/sign/vf-projects','POST');assert.throws(()=>restrictDataBody(diy,sign,{paths:['someone/project.json']}),{status:403});
 assert.equal(restrictDataBody(diy,sign,{paths:[uid+'/project.json']}).paths.length,1);
 const lib=plan(diy,'/storage/v1/object/sign/vf-library','POST');assert.throws(()=>restrictDataBody(diy,lib,{paths:['../vf-projects/private.json']}),{status:403});
});

test('library and static permissions are independent while the editor retains its assets',()=>{
 const library={...diy,account:{features:['library'],product:'diy',status:'active'}};
 assert.equal(plan(library,'/rest/v1/vf_source_files').read,true);assert.throws(()=>plan(library,'/rest/v1/vf_projects'),{status:403});
 const editor={...diy,account:{features:['static'],product:'diy',status:'active'}};assert.equal(plan(editor,'/rest/v1/vf_source_files').read,true);
 const none={...diy,account:{features:[],product:'diy',status:'active'}};assert.throws(()=>plan(none,'/rest/v1/vf_source_files'),{status:403});
});

test('upload permission allows new material and own tags but keeps shared edits maintenance-only',()=>{
 const uploader={...diy,account:{features:['library','upload'],product:'diy',status:'active'}};
 const insert=plan(uploader,'/rest/v1/vf_source_files','POST');assert.equal(insert.read,false);
 assert.equal(restrictDataBody(uploader,insert,{title:'新素材',uploaded_by:'someone'}).uploaded_by,uid);
 assert.throws(()=>plan(uploader,'/rest/v1/vf_source_files','POST',{prefer:'resolution=merge-duplicates'}),{status:403});
 const previews=plan(uploader,'/rest/v1/vf_asset_previews','POST');
 assert.equal(restrictDataBody(uploader,previews,{source_file_id:'s1'}).uploaded_by,undefined);
 const patch=plan(uploader,'/rest/v1/vf_source_files?id=eq.s1','PATCH');
 assert.equal(patch.target.searchParams.get('uploaded_by'),'eq.'+uid);
 assert.deepEqual(restrictDataBody(uploader,patch,{tags:['a']}),{tags:['a']});
 assert.throws(()=>restrictDataBody(uploader,patch,{title:'改名'}),{status:403});
 assert.equal(plan(uploader,'/storage/v1/object/vf-library/'+uid+'/previews/s1/a.png','POST').read,false);
 assert.throws(()=>plan(uploader,'/storage/v1/object/vf-library/someone/previews/s1/a.png','POST'),{status:403});
 assert.throws(()=>plan(uploader,'/storage/v1/object/vf-library/'+uid+'/previews/s1/a.png','DELETE'),{status:403});
 assert.throws(()=>plan(uploader,'/rest/v1/vf_categories','POST'),{status:403});
 const plain={...diy,account:{features:['library'],product:'diy',status:'active'}};
 assert.throws(()=>plan(plain,'/rest/v1/vf_source_files','POST'),{status:403});
 assert.throws(()=>plan(plain,'/storage/v1/object/vf-library/'+uid+'/previews/s1/a.png','POST'),{status:403});
});

test('material bytes revalidate privately per login while other data remains uncached',()=>{
 const request=new Request('https://owned.test/api/account-data');
 const asset=plan(diy,'/storage/v1/object/authenticated/vf-library/template.json');
 const response=new Response('json',{headers:{ETag:'version1'}});
 const headers=dataResponseHeaders(asset,request,response);assert.equal(headers.get('Cache-Control'),'private, no-cache');assert.ok(headers.get('Vary').includes('Authorization'));assert.ok(headers.get('Vary').includes('X-VF-Maintenance'));assert.equal(headers.get('ETag'),'version1');
 assert.equal(dataResponseHeaders(plan(diy,'/rest/v1/vf_source_files'),request,response).get('Cache-Control'),'no-store');
 assert.equal(dataResponseHeaders(asset,new Request(request,{headers:{Range:'bytes=0-10'}}),response).get('Cache-Control'),'no-store');
 assert.equal(dataResponseHeaders(asset,request,new Response(null,{status:403})).get('Cache-Control'),'no-store');
});
