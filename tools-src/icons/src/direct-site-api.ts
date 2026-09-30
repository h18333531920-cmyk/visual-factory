import {siteAccessToken} from './site-session.js';
import {createSecureImageClient} from '../shared/secure-image-client.mjs';
import {readReceipt} from './store.js';

export function usesDirectSiteApi():boolean {
 return typeof window!=='undefined'&&window.location.protocol==='https:'&&['gccdesign.app','visual-factory.pages.dev','asset-gallery-test.visual-factory.pages.dev'].includes(window.location.hostname);
}
async function accountScope():Promise<string>{
 let sub='';
 try{
  const token=siteAccessToken();
  const encoded=token.split('.')[1];
  const payload=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
  if(typeof payload.sub==='string')sub=payload.sub;
 }catch{/* A missing main-site login must not start a shared-session generation. */}
 if(!sub)throw Object.assign(new Error('signInRequired'),{code:'signInRequired'});
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub));
 return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
const client=createSecureImageClient({
 baseUrl:'https://jimeng.gccdesign.app/api/image-service/v1/',
 token:()=>{try{return siteAccessToken();}catch{return '';}},
 readLegacy:async id=>readReceipt(`jimeng-direct/v1/${await accountScope()}/${id}`),
});
export const directSiteRequest=(path:string,options:RequestInit={})=>client.request(path,options);
