export function siteAccessToken():string {
 try {const bridge=window as unknown as {VF_GET_ACCESS_TOKEN?:()=>string};return bridge.VF_GET_ACCESS_TOKEN?.() || (sessionStorage.getItem('vf_account_isolated')==='1'?sessionStorage.getItem('vf_isolated_access_token'):localStorage.getItem('vf_access_token')) || '';}catch{return '';}
}
export function isolatedAccountId():string {
 try{return sessionStorage.getItem('vf_account_isolated')==='1'?(sessionStorage.getItem('vf_isolated_user')||'').replace(/[^a-z0-9-]/gi,''):'';}catch{return '';}
}
