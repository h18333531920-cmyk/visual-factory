import {getCutoutConfig,koukoutuCutout,imageXCutout,validateGeneratedImage,GenerationError} from './api';
import {localCutout} from './local-cutout';
import {runRemoteCutout} from './cutout-chain';
/** Transparent results pass through; opaque originals use the selected cutout service. */
export async function prepareSubject(original:string,options:{cloudEnabled?:boolean}={}){
 try{await validateGeneratedImage(original);return {source:original,processed:false};}
 catch(error){if(!(error instanceof GenerationError)||error.code!=='invalidTransparency')throw error;}
 const config=options.cloudEnabled===undefined?await getCutoutConfig():undefined;
 if(config?.available===false)throw new GenerationError('onlineCutoutUnavailable');
 const provider=options.cloudEnabled===false?'local':options.cloudEnabled===true?'imagex':config!.provider;
 if(provider!=='local'){const result=await runRemoteCutout(original,provider,options.cloudEnabled===undefined?config?.fallbackProvider:undefined,{imagex:imageXCutout,koukoutu:koukoutuCutout},validateGeneratedImage);return {source:result.source,processed:true,processing:result.processing};}
 let source:string;
 try{source=await localCutout(original);}catch{throw new GenerationError('localCutoutUnsupported');}
 await validateGeneratedImage(source);
 return {source,processed:true,processing:'local-light-background-v1' as const};
}
