import {SITE_PROFILES,getSiteConnection,checkSiteConnection,submitSiteJob,querySiteJob} from './jimeng-site.mjs';
import {compileJimengPrompt,JIMENG_PROMPT_VERSION} from './icon-prompt.mjs';

const fail=(code,uncertain=false)=>Object.assign(new Error(code),{code,uncertain});
const publicJob=record=>{const {id,input,status,error,source,model,provider,promptVersion}=record;return {id,input,status,error,source,model,provider,promptVersion};};
function inputValue(body){
 if(!body||typeof body.name!=='string'||!body.name.trim()||body.name.length>200||typeof(body.description??'')!=='string'||(body.description?.length??0)>2000||!['auto','one','two'].includes(body.composition))throw fail('invalidRequest');
 if(body.combineForms!==undefined&&typeof body.combineForms!=='boolean')throw fail('invalidRequest');
 const references=body.references??(body.reference?[body.reference]:[]);
 if(!Array.isArray(references)||references.length>2||references.some(value=>typeof value!=='string'||value.length>14000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)))throw fail('invalidUpload');
 return {name:body.name.trim(),description:(body.description??'').trim(),combineForms:!!body.combineForms,composition:body.composition,model:body.model,references};
}
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');

// A transport adapter for the existing main-site Jimeng service. Receipts hold
// correlation IDs and results only; live session/cookies stay in request memory.
export function createDirectSiteClient({read,write,claim,scope,lock=async(_key,work)=>work(),fetcher=fetch}){
 const localRuns=new Map();
 let checkedConnection,checkedAt=0;
 async function connection(fresh=false){
  if(!fresh&&checkedConnection&&Date.now()-checkedAt<15000)return checkedConnection;
  const current={...await getSiteConnection(fetcher),preferFixed:true};
  checkedConnection=await checkSiteConnection(current,fetcher);checkedAt=Date.now();return checkedConnection;
 }
 async function key(id){if(!/^[a-f0-9-]{36}$/.test(id))throw fail('invalidRequest');return `jimeng-direct/v1/${await scope()}/${id}`;}
 async function submit(id,body){
  const receiptKey=await key(id),input=inputValue(body),profile=SITE_PROFILES.find(p=>p.id===input.model);
  if(!profile)throw fail('profileMissing');
  const fingerprint=await digest(JSON.stringify(input));
  return lock(receiptKey,async()=>{
   const previous=await read(receiptKey);
   if(previous){if(previous.fingerprint!==fingerprint)throw fail('requestConflict');return publicJob(previous);}
   const record={version:1,id,fingerprint,status:'generating',stage:'reserved',createdAt:Date.now(),input:{name:input.name,description:input.description,combineForms:input.combineForms},model:profile.model,provider:'jimeng.gccdesign.app',promptVersion:JIMENG_PROMPT_VERSION};
   if(!await claim(receiptKey,record)){const existing=await read(receiptKey);if(!existing)throw fail('saveError');if(existing.fingerprint!==fingerprint)throw fail('requestConflict');return publicJob(existing);}
   const work=(async()=>{
    try{
     // submitSiteJob performs the route check itself; do not check twice.
     const current=checkedConnection&&Date.now()-checkedAt<15000?checkedConnection:{...await getSiteConnection(fetcher),preferFixed:true};
     Object.assign(record,await submitSiteJob(input,profile,compileJimengPrompt(input),fetcher,{...current,source:'manual'},async stage=>{
      if(stage.phase==='submitting'){
       record.stage='submitting';record.upstreamBase=stage.upstreamBase;record.upstreamKind=stage.upstreamKind;
       // If this durable write fails, the adapter has not issued the POST yet.
       await write(receiptKey,record);
      }
     }));
     record.stage='accepted';
     if(record.upstreamBase)record.provider=new URL(record.upstreamBase).hostname;
    }catch(error){
     record.error=error.code||'saveError';
     record.status=record.stage==='submitting'&&['unknownError','invalidResult'].includes(record.error)?'unresolved':'failed';
    }
    try{await write(receiptKey,record);}catch{throw fail('saveError',record.stage!=='reserved');}
    return publicJob(record);
   })();
   localRuns.set(receiptKey,work);try{return await work;}finally{localRuns.delete(receiptKey);}
  });
 }
 async function query(id){
  const receiptKey=await key(id);if(localRuns.has(receiptKey))return localRuns.get(receiptKey);
  return lock(receiptKey,async()=>{
   const record=await read(receiptKey);if(!record)throw fail('jobNotFound');
   if(['ready','failed'].includes(record.status))return publicJob(record);
   if(!record.upstreamTaskId){
    // Refresh can only report a lost/ambiguous submission; it never retries POST.
    record.status=record.stage==='reserved'?'failed':'unresolved';record.error=record.stage==='reserved'?'unsubmittedError':'unknownError';
    await write(receiptKey,record);return publicJob(record);
   }
   try{Object.assign(record,await querySiteJob(record,fetcher));delete record.error;}
   catch(error){record.error=error.code||'siteResultDelayed';record.status=['siteGenerationFailed','siteInvalidParameter','siteQuotaExceeded','siteSessionExpired'].includes(record.error)?'failed':['siteTaskExpired','siteEndpointChanged','invalidResult'].includes(record.error)?'unresolved':'generating';}
   try{await write(receiptKey,record);}catch{throw fail('saveError',true);}return publicJob(record);
  });
 }
 return {
  async request(path,options={}){
   await scope();
   const method=options.method||'GET';
   if(path==='config'&&method==='GET'){
    const current=await connection();
    const profiles=SITE_PROFILES.map(({id,label,model})=>({id,label,model,baseUrl:current.base,managed:true,configured:current.models.includes(model)}));
    return {configured:true,available:true,baseUrl:current.base,model:profiles[0].model,defaultProfileId:profiles[0].id,promptVersion:JIMENG_PROMPT_VERSION,profiles};
   }
   if(path==='site-connection'){
    const body=method==='POST'?JSON.parse(options.body||'{}'):{};
    if(body.action==='save')throw fail('cloudManagedSettings');
    const current=await connection(method==='POST');
    return {saved:true,baseUrl:current.base,models:current.models,checkedAt};
   }
   const match=path.match(/^jobs\/([a-f0-9-]{36})$/);
   if(match&&method==='POST')return submit(match[1],JSON.parse(options.body||'{}'));
   if(match&&method==='GET')return query(match[1]);
   throw fail('cloudManagedSettings');
  },
 };
}
