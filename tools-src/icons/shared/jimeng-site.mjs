// Protocol verified against visual-factory and the user's patched jimeng-api-v2.
// Never expose or log the session. Explicit settings saves use a private backend file.
// Relay fallback happens only during read-only preflight, never after a generation POST.
export const SITE_PROFILES=[
 {id:'site-jimeng-lite',label:'即梦 Lite',model:'jimeng-image-5.0-lite',base:'https://jimeng.gccdesign.app',managed:true},
 {id:'site-jimeng-pro',label:'即梦 Pro',model:'jimeng-image-5.0-pro',base:'https://jimeng.gccdesign.app',managed:true}
];
const CLOUD_FALLBACK='https://gccdesign.app/api/jimeng';
const fail=code=>Object.assign(new Error(code),{code});
async function jsonRequest(url,options,fetcher,timeout=20_000){
 const response=await fetcher(url,{...options,signal:AbortSignal.timeout(timeout),redirect:'error'});
 if(!response.ok)throw fail(response.status===401||response.status===403?'siteSessionExpired':'siteUnavailable');
 return response.json();
}
export function allowedRelay(base){
 try{const u=new URL(base);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&(u.hostname==='jimeng.gccdesign.app'||/^[a-z0-9-]+\.trycloudflare\.com$/.test(u.hostname))&&!u.port;}catch{return false;}
}
export async function getSiteConnection(fetcher=fetch){
 let foundMissing=false;
 for(const endpoint of ['https://gccdesign.app/api/jimeng-session','https://visual-factory.pages.dev/api/jimeng-session']){
  let data;try{data=await jsonRequest(endpoint,{},fetcher);}catch{continue;}
  if(!data.found||typeof data.sessionid!=='string'||!data.sessionid.trim()||/[\r\n]/.test(data.sessionid)){foundMissing=true;continue;}
  const base=(data.tunnelUrl||'https://jimeng.gccdesign.app').replace(/\/+$/,'');
  if(!allowedRelay(base))throw fail('siteEndpointChanged');
  const cookies=data.cookies&&typeof data.cookies==='object'&&!Array.isArray(data.cookies)?data.cookies:{};
  return {base,session:data.sessionid.trim(),cookies,source:'cloud',updatedAt:typeof data.updatedAt==='string'?data.updatedAt:undefined};
 }
 throw fail(foundMissing?'siteSessionMissing':'siteCloudUnavailable');
}
export async function checkSiteConnection(connection,fetcher=fetch){
 for(const base of connection.preferFixed?['https://jimeng.gccdesign.app']:[...new Set([connection.base,'https://jimeng.gccdesign.app'])]){
  if(!allowedRelay(base))continue;
  try{const data=await jsonRequest(`${base}/v1/models`,{},fetcher);
   if(Array.isArray(data.data)&&data.data.some(m=>String(m.id).startsWith('jimeng-image-')))
     return {...connection,base,models:data.data.map(m=>m.id).filter(id=>typeof id==='string'&&id.startsWith('jimeng-image-')),relayChanged:base!==connection.base};
  }catch{}
 }
 // A configured cloud route is not proof of a working route. Its account-info
 // check must succeed before allowing it to receive a generation request.
 let health;
 try{health=await cloudRequest(connection,{},fetcher,20_000);}catch{throw fail('siteRelayUnavailable');}
 if(health.status!=='ok')throw fail(health.status==='invalid'?'siteSessionExpired':'siteCloudProtocol');
 if(!Array.isArray(health.models)||!health.models.length)throw fail('siteCloudProtocol');
 return {...connection,base:CLOUD_FALLBACK,models:health.models,cloudFallback:true,relayChanged:true};
}
function failureCode(message=''){
 if(/invalid parameter|错误码\s*[:：]?\s*1000/i.test(message))return 'siteInvalidParameter';
 if(/credit|quota|积分|额度|次数不足/i.test(message))return 'siteQuotaExceeded';
 if(/session|login|登录|未授权|unauthorized/i.test(message))return 'siteSessionExpired';
 return 'siteGenerationFailed';
}
async function cloudRequest(connection,{method='GET',body,taskId},fetcher,timeout){
 const url=taskId?`${CLOUD_FALLBACK}?task_id=${encodeURIComponent(taskId)}`:CLOUD_FALLBACK;
 const headers={Authorization:`Bearer ${connection.session}`,'X-Jimeng-Cookies':JSON.stringify(connection.cookies||{})};
 if(body!==undefined)headers['Content-Type']='application/json';
 let response;
 try{response=await fetcher(url,{method,headers,body:body===undefined?undefined:JSON.stringify({...body,cookies:connection.cookies||{}}),signal:AbortSignal.timeout(timeout),redirect:'error'});}catch{throw fail('unknownError');}
 let data;try{data=await response.json();}catch{throw fail('unknownError');}
 if(!response.ok)throw fail(response.status===401||response.status===403?'siteSessionExpired':failureCode(data?.message));
 return data;
}
export async function submitSiteJob(input,profile,prompt,fetcher=fetch,savedConnection,onStage=async()=>{}){
 await onStage({phase:'loading-session'});
 let baseConnection=savedConnection;
 if(!baseConnection)baseConnection=await getSiteConnection(fetcher);
 else if(baseConnection.source==='cloud'){
  try{baseConnection={...await getSiteConnection(fetcher),preferFixed:baseConnection.preferFixed};}catch{/* Use the last saved session for relay preflight. */}
 }
 await onStage({phase:'checking-route'});
 const connection=await checkSiteConnection(baseConnection,fetcher);
 if(!connection.models.includes(profile.model))throw fail('siteModelUnavailable');
 // The 5.0 models advertise 2K/4K; avoid relying on relay-side normalization.
 const body={model:profile.model,prompt,n:1,ratio:'1:1',resolution:'2k',response_format:'b64_json',...((input.references??(input.reference?[input.reference]:[])).length?{images:input.references??[input.reference]}:{})};
 await onStage({phase:'submitting',upstreamBase:connection.base,upstreamKind:connection.cloudFallback?'cloud':'relay',resolution:body.resolution,referenceCount:body.images?.length??0,promptCharacters:prompt.length});
 let data;
 if(connection.cloudFallback)data=await cloudRequest(connection,{method:'POST',body},fetcher,120_000);
 else try{data=await jsonRequest(`${connection.base}/v1/images/generations/async`,{
  method:'POST',headers:{Authorization:`Bearer ${connection.session}`,'Content-Type':'application/json'},body:JSON.stringify(body)
 },fetcher);}catch(e){if(e.code==='siteSessionExpired')throw e;throw fail('unknownError');}
 const immediate=data.imageBase64||data.data?.[0]?.b64_json;
 if(typeof immediate==='string')return {...decodeImage(immediate),upstreamBase:connection.base,upstreamKind:connection.cloudFallback?'cloud':'relay'};
 const taskId=data.task_id||data.taskId;
 if(typeof taskId!=='string'||!taskId||taskId.length>200)throw fail('unknownError');
 return {upstreamTaskId:taskId,upstreamBase:connection.base,upstreamKind:connection.cloudFallback?'cloud':'relay'};
}
function decodeImage(value){
 if(typeof value!=='string'||value.length>30_000_000)throw fail('invalidResult');
 value=value.replace(/^data:image\/(png|jpeg|webp);base64,/,'');
 let head;try{head=atob(value.slice(0,16));}catch{throw fail('invalidResult');}
 const mime=head.startsWith('\x89PNG\r\n\x1a\n')?'image/png':head.charCodeAt(0)===255&&head.charCodeAt(1)===216?'image/jpeg':head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'?'image/webp':null;
 if(!mime)throw fail('invalidResult');
 return {status:'ready',source:`data:${mime};base64,${value}`};
}
async function downloadCloudImage(value,fetcher){
 let url;try{url=new URL(value);}catch{throw fail('invalidResult');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['byteimg.com','ibytedtos.com','volces.com'].some(suffix=>url.hostname===suffix||url.hostname.endsWith('.'+suffix)))throw fail('invalidResult');
 let response;try{response=await fetcher(url.href,{signal:AbortSignal.timeout(120_000),redirect:'error'});}catch{throw fail('siteResultDelayed');}
 if(!response.ok)throw fail('siteResultDelayed');
 const chunks=[];let length=0;
 for await(const chunk of response.body){length+=chunk.length;if(length>22_500_000)throw fail('invalidResult');chunks.push(chunk);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return decodeImage(btoa(binary));
}
export async function querySiteJob(job,fetcher=fetch,savedConnection){
 if(!job.upstreamTaskId)throw fail('siteEndpointChanged');
 // The patched server's GET route retrieves an existing task; it requires no session cookie.
 let data;
 if(job.upstreamKind==='cloud'||job.upstreamBase===CLOUD_FALLBACK){
  const connection=savedConnection?.source==='manual'?savedConnection:await getSiteConnection(fetcher);
  data=await cloudRequest(connection,{taskId:job.upstreamTaskId},fetcher,120_000);
  if(data.pending===true)return {status:'generating'};
  if(data.pending===false&&Array.isArray(data.data))data={status:'done',data:data.data};
  else if(data.pending===false)throw fail(failureCode(data.message));
 }else{
  if(!allowedRelay(job.upstreamBase))throw fail('siteEndpointChanged');
  data=await jsonRequest(`${job.upstreamBase}/v1/images/generations/async?task_id=${encodeURIComponent(job.upstreamTaskId)}`,{},fetcher,120_000);
 }
 if(data.status==='not_found')throw fail('siteTaskExpired');
 if(data.status==='failed')throw fail(failureCode(data.message));
 if(data.status!=='done')return {status:'generating'};
 if(data.data?.[0]?.url)return downloadCloudImage(data.data[0].url,fetcher);
 return decodeImage(data.data?.[0]?.b64_json);
}
