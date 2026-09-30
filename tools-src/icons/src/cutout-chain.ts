export type RemoteCutoutProvider='imagex'|'koukoutu';
export type RemoteCutoutResult={source:string;processing:'veimagex-product-v1'|'koukoutu-background-v1';cached:boolean};

export async function runRemoteCutout(
 source:string,
 provider:RemoteCutoutProvider,
 fallbackProvider:RemoteCutoutProvider|undefined,
 services:Record<RemoteCutoutProvider,(source:string)=>Promise<RemoteCutoutResult>>,
 validate:(source:string)=>Promise<void>,
):Promise<RemoteCutoutResult>{
 const execute=async(selected:RemoteCutoutProvider)=>{const result=await services[selected](source);await validate(result.source);return result;};
 try{return await execute(provider);}catch(error){// A transport failure may conceal a completed, billable job. Recover it first.
 if((error as {uncertain?:boolean}).uncertain||!fallbackProvider||fallbackProvider===provider)throw error;return execute(fallbackProvider);}
}
