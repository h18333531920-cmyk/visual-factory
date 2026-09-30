export function createHostedCutoutClient(options:{baseUrl:string;token:()=>Promise<string>|string;prepareSource?:(source:string)=>Promise<string>;fetcher?:typeof fetch;delay?:(ms:number)=>Promise<void>;now?:()=>number}):{
 config:()=>Promise<any>;
 check:(provider:'imagex'|'koukoutu')=>Promise<any>;
 process:(provider:'imagex'|'koukoutu',source:string)=>Promise<any>;
};
