export function createSecureImageClient(options:{baseUrl:string;token:()=>string|Promise<string>;fetcher?:typeof fetch;delay?:(ms:number)=>Promise<void>;readLegacy?:(id:string)=>Promise<any>}):{
 config:()=>Promise<any>;
 get:(id:string)=>Promise<any>;
 submit:(id:string,body:any)=>Promise<any>;
 request:(path:string,options?:RequestInit)=>Promise<any>;
};
