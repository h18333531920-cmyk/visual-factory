const fail=(code,uncertain=false)=>Object.assign(Error(code),{code,uncertain});
async function sourceDigest(source){
 const encoded=source.split(',')[1];if(!encoded)throw fail('invalidUpload');
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
// Recover by source hash before uploading. GET never enqueues a paid operation.
export function createHostedCutoutClient({baseUrl,token,prepareSource=async source=>source,fetcher=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}){
 const base=new URL(baseUrl);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Invalid cutout endpoint');
 const endpoint=base.href.endsWith('/')?base.href:base.href+'/';
 async function call(path,body){
  const auth=await token();if(!auth)throw fail('signInRequired');
  const transfer=path==='jobs'||path.startsWith('jobs/');
  let response;try{response=await fetcher(endpoint+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${auth}`,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(transfer?180000:30000)});}catch{throw fail('cutoutConnectionLost',true);}
  const data=await response.json().catch(()=>{throw fail('cutoutConnectionLost',true);});
  if(!response.ok)throw fail(typeof data?.error==='string'?data.error:'cutoutServiceError',response.status>=500);
  return data;
 }
 async function lookup(path){
  for(let attempt=0;;attempt++)try{return await call(path);}catch(error){
   if(error.code==='jobNotFound')return null;
   if(error.code!=='cutoutConnectionLost'||attempt>=2)throw error;
   await delay(2200);
  }
 }
 return {
  config:()=>call('config'),
  check:provider=>call(`providers/${provider}/check`,{}),
  async process(provider,source){
   if(!['imagex','koukoutu'].includes(provider))throw fail('invalidRequest');
   let path=`jobs/by-source/${provider}/${await sourceDigest(source)}`;
   let job=await lookup(path);
   // Old full-size receipts take priority: an upgrade must not charge again
   // just because new work now uses a resized copy.
   if(!job){
    const prepared=await prepareSource(source);
    if(prepared!==source){source=prepared;path=`jobs/by-source/${provider}/${await sourceDigest(source)}`;job=await lookup(path);}
   }
   if(!job||['failed','interrupted','unresolved'].includes(job.status)){
    try{job=await call('jobs',{provider,source});}catch(error){
     if(error.code!=='cutoutConnectionLost')throw error;
     job=null;
     for(let attempt=0;attempt<3;attempt++){
      await delay(2200);
      try{job=await lookup(path);}catch(recoveryError){if(recoveryError.code!=='cutoutConnectionLost')throw recoveryError;}
      if(job)break;
     }
     if(!job)throw error;
    }
   }
   if(!/^[a-f0-9]{64}$/.test(job.id))throw fail('cutoutConnectionLost',true);
   const deadline=now()+20*60*1000;
   while(['queued','running'].includes(job.status)){
    if(now()>deadline)throw fail('cutoutStillPending',true);
    await delay(1800);
    try{job=await call(`jobs/${job.id}`);}catch(error){if(error.code==='cutoutConnectionLost'){await delay(2200);continue;}throw error;}
   }
   if(job.status!=='ready'||!job.result?.source)throw fail(job.error||'cutoutServiceError',['unresolved','interrupted'].includes(job.status));
   return job.result;
  },
 };
}
