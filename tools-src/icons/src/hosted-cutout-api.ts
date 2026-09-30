import {siteAccessToken} from './site-session.js';
import {createHostedCutoutClient} from '../shared/hosted-cutout-client.mjs';
import {resizeCutoutInput} from './cutout-input.js';
const client=createHostedCutoutClient({baseUrl:'https://jimeng.gccdesign.app/api/icon-cutout/v1/',prepareSource:resizeCutoutInput,token:()=>{try{return siteAccessToken();}catch{return '';}}});
export async function hostedCutoutRequest(path:string,options:RequestInit={}){
 if(!options.method||options.method==='GET'){
  const config=await client.config();
  if(path==='cutout/config')return config;
  if(path==='imagex/config')return config.imagex;
  if(path==='koukoutu/config')return config.koukoutu;
 }
 if(options.method==='POST'){
  if(path==='imagex/check'||path==='koukoutu/check')return client.check(path.startsWith('imagex')?'imagex':'koukoutu');
  if(path==='imagex/cutout'||path==='koukoutu/cutout')return client.process(path.startsWith('imagex')?'imagex':'koukoutu',JSON.parse(String(options.body)).source);
 }
 throw Object.assign(Error('cloudManagedSettings'),{code:'cloudManagedSettings'});
}
