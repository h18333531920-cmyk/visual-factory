/** Local uniform-light-background extraction. No network, no model, no input mutation. */
export function cutoutPixels(input:Uint8ClampedArray,width:number,height:number){
 if(width<8||height<8||input.length!==width*height*4)throw Error('localCutoutUnsupported');
 const n=width*height,output=new Uint8ClampedArray(input),samples:number[][]=[[],[],[]];
 const step=Math.max(1,Math.floor(Math.min(width,height)/100));
 for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){
  if(x>width*.04&&x<width*.96&&y>height*.04&&y<height*.96)continue;
  const i=(y*width+x)*4;if(input[i+3]<250)continue;
  for(let c=0;c<3;c++)samples[c].push(input[i+c]);
 }
 if(!samples[0].length)throw Error('localCutoutUnsupported');
 const bg=samples.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)]);
 if(Math.min(...bg)<215||Math.max(...bg)-Math.min(...bg)>25)throw Error('localCutoutUnsupported');
 const difference=(p:number)=>Math.hypot(input[p*4]-bg[0],input[p*4+1]-bg[1],input[p*4+2]-bg[2]);
 const removable=(p:number)=>{const i=p*4,r=input[i],g=input[i+1],b=input[i+2];return input[i+3]<16||difference(p)<48||(Math.max(r,g,b)-Math.min(r,g,b)<15&&Math.min(r,g,b)>208);};
 const background=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const add=(p:number)=>{if(!background[p]&&removable(p)){background[p]=1;queue[tail++]=p;}};
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
 for(let y=1;y<height-1;y++){add(y*width);add(y*width+width-1);}
 while(head<tail){const p=queue[head++],x=p%width;if(x)add(p-1);if(x<width-1)add(p+1);if(p>=width)add(p-width);if(p<n-width)add(p+width);}
 const retained=n-tail;if(retained<n*.005||tail<n*.05)throw Error('localCutoutUnsupported');
 // Only soften the narrow silhouette edge, leaving interior highlights untouched.
 for(let p=0;p<n;p++){
  const i=p*4;if(background[p]){output[i+3]=0;continue;}
  const x=p%width,y=Math.floor(p/width);
  if(x<3||y<3||x>=width-3||y>=height-3)continue;
  let edge=false;
  for(let dy=-2;dy<=2&&!edge;dy++)for(let dx=-2;dx<=2;dx++)if(background[p+dy*width+dx]){edge=true;break;}
  if(!edge)continue;
  let foreground=p,best=difference(p);
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;
   const q=yy*width+xx;if(background[q])continue;const d=difference(q);if(d>best){best=d;foreground=q;}
  }
  let numerator=0,denominator=0;for(let c=0;c<3;c++){const f=input[foreground*4+c]-bg[c];numerator+=(input[i+c]-bg[c])*f;denominator+=f*f;}
  const alpha=Math.min(1,Math.max(0,denominator?numerator/denominator:1));
  if(alpha<.98&&alpha>.05){output[i+3]=Math.round(input[i+3]*alpha);for(let c=0;c<3;c++)output[i+c]=Math.round(Math.min(255,Math.max(0,(input[i+c]-(1-alpha)*bg[c])/alpha)));}
 }
 return {pixels:output,background:bg,removedFraction:tail/n};
}
export async function localCutout(source:string):Promise<string>{
 const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('imageError'));image.src=source;});
 if(image.width*image.height>16_000_000)throw Error('localCutoutUnsupported');
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);
 const result=cutoutPixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
 ctx.putImageData(new ImageData(result.pixels,canvas.width,canvas.height),0,0);
 return canvas.toDataURL('image/png');
}
