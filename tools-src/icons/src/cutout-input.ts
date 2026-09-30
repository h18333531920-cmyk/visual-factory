/** Only the upload copy changes; the full generated original stays in history. */
export async function resizeCutoutInput(source:string):Promise<string>{
 const image=new Image();image.decoding='async';
 await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('imageError'));image.src=source;});
 const {naturalWidth:width,naturalHeight:height}=image;
 if(!width||!height)throw Error('imageError');
 const ratio=Math.min(1,1024/Math.max(width,height));
 if(ratio===1)return source;
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('imageError');
 // The caller has already established that the generated image is opaque.
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const result=canvas.toDataURL('image/jpeg',.92);
 if(!result.startsWith('data:image/jpeg;base64,'))throw Error('imageError');
 return result;
}
