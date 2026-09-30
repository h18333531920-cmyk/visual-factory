import {usesDirectSiteApi,directSiteRequest} from './direct-site-api.js';
import {hostedCutoutRequest} from './hosted-cutout-api.js';
export interface ImageXSettings {configured:boolean;serviceId:string;region:string;domain:string;model:string;automatic:boolean;domains?:string[];}
export interface ServiceProfile {managed?:boolean;id:string;label:string;configured:boolean;baseUrl:string;model:string;}
export interface SiteConnection {saved:boolean;baseUrl?:string;source?:string;checkedAt?:number;models:string[];relayChanged?:boolean;}
export interface ServiceConfig {available?:boolean;siteConnection?:SiteConnection;configured:boolean;baseUrl:string;model:string;promptVersion:string;profiles:ServiceProfile[];defaultProfileId:string;lastDeletedProfileId?:string;savedProfileId?:string;}
export interface RemoteJob {id:string;status:'generating'|'ready'|'failed'|'unresolved';source?:string;error?:string;model:string;provider:string;promptVersion:string;providerRequestId?:string;input:import('./types').GenerationInput;}
export class GenerationError extends Error {constructor(public code:string,public uncertain=false){super(code);}}
async function request<T>(path:string,options:RequestInit={},retry=0):Promise<T>{
  if(usesDirectSiteApi()&&(path==='config'||path==='site-connection'||path.startsWith('jobs/'))){
    try{return await directSiteRequest(path,options) as T;}catch(error){const e=error as {code?:string;uncertain?:boolean};throw new GenerationError(e.code??'serviceError',!!e.uncertain);}
  }
  if(usesDirectSiteApi()&&/^(imagex|koukoutu|cutout)\//.test(path)){
    try{return await hostedCutoutRequest(path,options) as T;}catch(error){const e=error as {code?:string;uncertain?:boolean};throw new GenerationError(e.code??'cutoutServiceError',!!e.uncertain);}
  }
  const uncertain=options.method==='POST'||path.startsWith('jobs/');
  const headers=new Headers(options.headers);
  try{if(typeof window!=='undefined'&&window.location.protocol==='https:'){const token=localStorage.getItem('vf_access_token');if(token)headers.set('Authorization',`Bearer ${token}`);}}catch{/* Server will report missing authentication. */}
  let response:Response;try{response=await fetch(`/api/icon/v1/${path}`,{...options,headers,signal:AbortSignal.timeout((path.startsWith('imagex/')||path.startsWith('koukoutu/'))?240_000:path.startsWith('jobs/')&&(!options.method||options.method==='GET')?150_000:path==='site-connection'?90_000:20_000)});}catch{throw new GenerationError(options.method==='POST'?'unknownError':'localServiceOffline',uncertain);}
  const body=await response.json().catch(()=>{throw new GenerationError('iconServiceUnavailable',uncertain);});
  if(!body||typeof body!=='object'||Array.isArray(body))throw new GenerationError('iconServiceUnavailable',uncertain);
  if(body.error==='cutoutBusy'&&/^((imagex)|(koukoutu))\/cutout$/.test(path)&&retry<55){await new Promise(resolve=>setTimeout(resolve,2000));return request<T>(path,options,retry+1);}
  if(!response.ok)throw new GenerationError(body.error || 'serviceError',body.error==='unknownError'||response.status>=500&&body.error!=='notConfigured');
  return body as T;
}
export const serviceConfig=async()=>{const config=await request<ServiceConfig>('config');if(!Array.isArray(config.profiles)||typeof config.configured!=='boolean')throw new GenerationError('iconServiceUnavailable');if(config.available===false)throw new GenerationError('iconServiceUnavailable');return config;};
export const saveServiceConfig=(settings:{key:string;baseUrl:string;model:string;id?:string;create?:boolean;label?:string})=>request<ServiceConfig>('config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});
export const changeServiceProfile=(id:string,action:'delete'|'restore')=>request<ServiceConfig>('config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});
export const configureSiteConnection=(action:'fetch'|'save'|'check',session?:string)=>request<SiteConnection>('site-connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,session})});
export const getImageXSettings=()=>request<ImageXSettings>('imagex/config');
export const saveImageXSettings=(settings:ImageXSettings & {ak:string;sk:string})=>request<ImageXSettings>('imagex/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});
export const checkImageX=()=>request<ImageXSettings>('imagex/check',{method:'POST'});
export const imageXCutout=(source:string)=>request<{source:string;processing:'veimagex-product-v1';cached:boolean}>('imagex/cutout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source})});
export const submitJob=(id:string,input:unknown)=>request<RemoteJob>(`jobs/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
export const getJob=(id:string)=>request<RemoteJob>(`jobs/${id}`);
export async function validateGeneratedImage(source:string):Promise<void>{
  const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new GenerationError('invalidResult'));img.src=source;});
  if(img.width<512||img.height<512||img.width*img.height>16_000_000)throw new GenerationError('invalidResult');
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,img.width,img.height).data;
  let clear=0,solid=0;
  for(let i=3;i<pixels.length;i+=4){if(pixels[i]<16)clear++;if(pixels[i]>32)solid++;}
  if(clear< img.width*img.height*.01||solid<100)throw new GenerationError('invalidTransparency');
}

export type CutoutProvider='local'|'imagex'|'koukoutu';
export interface KoukoutuSettings {configured:boolean;credits?:number;vipCredits?:number;}
export interface CutoutConfig {available?:boolean;provider:CutoutProvider;fallbackProvider?:Exclude<CutoutProvider,'local'>;koukoutu:KoukoutuSettings;}
export const getCutoutConfig=()=>request<CutoutConfig>('cutout/config');
export const selectCutoutProvider=(provider:CutoutProvider)=>request<CutoutConfig>('cutout/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})});
export const saveKoukoutuConfig=(key:string)=>request<KoukoutuSettings>('koukoutu/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
export const checkKoukoutu=()=>request<KoukoutuSettings>('koukoutu/check',{method:'POST'});
export const koukoutuCutout=(source:string)=>request<{source:string;processing:'koukoutu-background-v1';cached:boolean}>('koukoutu/cutout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source})});
