export function createDirectSiteClient(options:{
 read:(key:string)=>Promise<any>;
 write:(key:string,value:unknown)=>Promise<void>;
 claim:(key:string,value:unknown)=>Promise<boolean>;
 scope:()=>Promise<string>;
 lock?:(key:string,work:()=>Promise<any>)=>Promise<any>;
 fetcher?:typeof fetch;
}):{request:(path:string,options?:RequestInit)=>Promise<any>};
