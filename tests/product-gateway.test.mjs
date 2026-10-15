import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSecureImageApi} from '../services/secure-image/server/secure-image-api.mjs';
import {createHostedCutout} from '../services/icon-cutout/server/hosted-cutout.mjs';
const origin='https://asset-gallery-test.visual-factory.pages.dev';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const icon={kind:'icons',input:{name:'orange',model:'site-jimeng-lite',composition:'auto',references:[]}};
const diy={kind:'diy',input:{prompt:'orange',model:'jimeng-image-5.0-lite',resolution:'2k',ratio:'1:1',images:[]}};
test('generation rejects the other product before submitting upstream',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-product-gateway-'));t.after(()=>rm(directory,{recursive:true,force:true}));let upstream=0;
 const api=createSecureImageApi({directory,origins:[origin],authorize:async()=>({id:'user',permissions:{diy:true,icons:false}}),loadCredentials:async()=>({sessionid:'TEST_ONLY'}),fetcher:async()=>{upstream++;return Response.json({});},enforceProductAccess:true});
 const response=await api.handle(new Request('https://jimeng.gccdesign.app/api/image-service/v1/jobs/'+id,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(icon)}));
 assert.equal(response.status,403);assert.equal((await response.json()).error,'featureNotAllowed');assert.equal(upstream,0);
});
test('icon account cannot submit DIY generation',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-product-gateway-'));t.after(()=>rm(directory,{recursive:true,force:true}));let upstream=0;
 const api=createSecureImageApi({directory,origins:[origin],authorize:async()=>({id:'user',permissions:{diy:false,icons:true}}),loadCredentials:async()=>({sessionid:'TEST_ONLY'}),fetcher:async()=>{upstream++;return Response.json({});},enforceProductAccess:true});
 const response=await api.handle(new Request('https://jimeng.gccdesign.app/api/image-service/v1/jobs/'+id,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(diy)}));
 assert.equal(response.status,403);assert.equal(upstream,0);
});
test('cutout rejects DIY-only account before reading source or contacting provider',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'vf-product-cutout-'));t.after(()=>rm(directory,{recursive:true,force:true}));let provider=0;
 const api=createHostedCutout({directory,settings:{},origins:[origin],authorize:async()=>({id:'user',permissions:{icons:false,diy:true}}),processorFactory:()=>{provider++;return {};},enforceProductAccess:true});
 const response=await api.handle(new Request('https://jimeng.gccdesign.app/api/icon-cutout/v1/jobs',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}));assert.equal(response.status,403);assert.equal(provider,0);
});
