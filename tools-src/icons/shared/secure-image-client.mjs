const fail=(code,uncertain=false)=>Object.assign(Error(code),{code,uncertain});
const validId=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
/** Shared by icon and DIY clients. Only the site's own login token leaves the
 * browser. No provider session, cookie, credential endpoint or relay fallback. */
export function createSecureImageClient({baseUrl,token,fetcher=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms)),readLegacy=async()=>null}){
 const base=new URL(baseUrl);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Invalid managed endpoint');
 const endpoint=base.href.endsWith('/')?base.href:base.href+'/';
 async function call(path,body){
  const auth=await token();if(!auth)throw fail('signInRequired');let response,data;
  try{response=await fetcher(endpoint+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${auth}`,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(path.startsWith('jobs/')?180000:30000)});data=await response.json();}catch{throw fail('managedImageConnectionLost',true);}
  if(!response.ok)throw fail(typeof data?.error==='string'?data.error:'serviceError',response.status>=500);
  return data;
 }
 async function get(id){
  if(!validId(id))throw fail('invalidRequest');
  try{return await call(`jobs/${id}`);}catch(error){
   if(error.code!=='jobNotFound')throw error;
   const legacy=await readLegacy(id);
   if(legacy?.status==='ready'&&typeof legacy.source==='string'){
    const {input,status,source,model,provider,promptVersion}=legacy;return {id,input,status,source,model,provider,promptVersion};
   }
   // Old pending browser receipts lack a server-bound owner proof. Never turn
   // a client-supplied upstream task id into an arbitrary result-query proxy.
   return {id,status:'unresolved',error:legacy?'legacyTaskNeedsReview':'unknownError'};
  }
 }
 async function submit(id,body){
  if(!validId(id))throw fail('invalidRequest');
  try{
   for(let attempt=0;;attempt++)try{return await call(`jobs/${id}`,body);}catch(error){
    if(error.code!=='generationBusy'||attempt>=19)throw error;
    await delay(Math.min(3000,1000+attempt*250));
   }
  }catch(error){
   if(error.code!=='managedImageConnectionLost')throw error;
   for(let attempt=0;attempt<3;attempt++){
    await delay(2000);
    try{const result=await call(`jobs/${id}`);return result;}catch(next){if(!['managedImageConnectionLost','jobNotFound'].includes(next.code))throw next;}
   }
   throw error;
  }
 }
 return {
  config:()=>call('config'),get,submit,
  async request(path,options={}){
   const method=options.method||'GET';
   if(path==='config'&&method==='GET')return call('config');
   if(path==='site-connection'){
    const body=options.body?JSON.parse(String(options.body)):{};if(body.action==='save')throw fail('cloudManagedSettings');
    const config=await call('config');return {saved:config.configured,baseUrl:endpoint,models:config.models,checkedAt:Date.now()};
   }
   const match=path.match(/^jobs\/([a-f0-9-]{36})$/);
   if(match&&method==='POST')return submit(match[1],{kind:'icons',input:JSON.parse(String(options.body))});
   if(match&&method==='GET')return get(match[1]);
   throw fail('cloudManagedSettings');
  },
 };
}
