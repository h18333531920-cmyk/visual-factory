/** Capture the app screenshot and its visible category row at the original resolution. */
export async function exportMockup(shot:HTMLElement):Promise<Blob>{
  const background=shot.querySelector<HTMLImageElement>('.phone-background');
  if(!background)throw new Error('Missing mockup background');
  await background.decode();
  await document.fonts.ready;
  const bounds=shot.getBoundingClientRect();
  if(!shot.isConnected||!bounds.width)throw new Error('Mockup closed');
  const canvas=document.createElement('canvas');
  canvas.width=background.naturalWidth;canvas.height=background.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas unavailable');
  const scale=canvas.width/bounds.width;
  const box=(element:Element)=>{const r=element.getBoundingClientRect();return {x:(r.left-bounds.left)*scale,y:(r.top-bounds.top)*scale,w:r.width*scale,h:r.height*scale};};
  ctx.drawImage(background,0,0,canvas.width,canvas.height);
  const row=shot.querySelector<HTMLElement>('.mockup-category-scroll');
  if(!row)throw new Error('Select icons before saving');
  const rowBox=box(row);
  ctx.save();ctx.beginPath();ctx.rect(rowBox.x,rowBox.y,rowBox.w,rowBox.h);ctx.clip();
  ctx.fillStyle='#fff';ctx.fillRect(rowBox.x,rowBox.y,rowBox.w,rowBox.h);
  for(const cell of row.querySelectorAll<HTMLElement>('.mockup-scroll-item')){
    const frame=cell.querySelector<HTMLElement>('.mockup-scroll-image');
    const image=frame?.querySelector('canvas');
    if(!frame||!image)continue;
    const rect=box(frame),style=getComputedStyle(frame);
    if(rect.x+rect.w<rowBox.x||rect.x>rowBox.x+rowBox.w)continue;
    const border=parseFloat(style.borderLeftWidth)*scale,radius=parseFloat(style.borderTopLeftRadius)*scale;
    ctx.beginPath();ctx.roundRect(rect.x+border/2,rect.y+border/2,rect.w-border,rect.h-border,Math.max(0,radius-border/2));
    ctx.fillStyle=style.backgroundColor;ctx.fill();
    if(border){ctx.lineWidth=border;ctx.strokeStyle=style.borderLeftColor;ctx.stroke();}
    const imageBox=box(image);
    ctx.save();ctx.beginPath();
    ctx.roundRect(rect.x+border,rect.y+border,rect.w-border*2,rect.h-border*2,Math.max(0,radius-border));
    ctx.clip();
    ctx.drawImage(image,imageBox.x,imageBox.y,imageBox.w,imageBox.h);
    ctx.restore();
    const label=cell.querySelector<HTMLElement>('.mockup-scroll-label');
    if(!label?.firstChild)continue;
    const text=label.textContent??'',labelStyle=getComputedStyle(label),labelBox=box(label);
    // Use the browser's actual line breaks (including Chinese and mixed names).
    const lines:{text:string;left:number;top:number}[]=[];
    const range=document.createRange();let offset=0;
    for(const character of text){
      range.setStart(label.firstChild,offset);offset+=character.length;range.setEnd(label.firstChild,offset);
      const rect=range.getBoundingClientRect();
      if(!rect.width&&!rect.height)continue;
      let line=lines.find(line=>Math.abs(line.top-rect.top)<.5);
      if(!line){line={text:'',left:rect.left,top:rect.top};lines.push(line);}
      line.text+=character;
    }
    ctx.save();ctx.beginPath();ctx.rect(labelBox.x,labelBox.y,labelBox.w,labelBox.h);ctx.clip();
    ctx.font=`${labelStyle.fontWeight} ${parseFloat(labelStyle.fontSize)*scale}px ${labelStyle.fontFamily}`;
    ctx.fillStyle=labelStyle.color;ctx.textBaseline='alphabetic';
    const ascent=ctx.measureText('Mg').fontBoundingBoxAscent;
    for(const [index,line] of lines.slice(0,2).entries()){
      let value=line.text.trimEnd();
      if(index===1&&lines.length>2){
        const maxWidth=labelBox.w-(parseFloat(labelStyle.paddingLeft)+parseFloat(labelStyle.paddingRight))*scale;
        while(value&&ctx.measureText(value+'…').width>maxWidth)value=value.slice(0,-1);
        value+='…';
      }
      ctx.fillText(value,(line.left-bounds.left)*scale,(line.top-bounds.top)*scale+ascent);
    }
    ctx.restore();
  }
  ctx.restore();
  const framed=document.createElement('canvas'),padding=48;
  framed.width=canvas.width+padding*2;framed.height=canvas.height+padding*2;
  const frame=framed.getContext('2d');
  if(!frame)throw new Error('Canvas unavailable');
  // Keep the surrounding margin and rounded corners transparent in the PNG.
  frame.beginPath();frame.roundRect(padding,padding,canvas.width,canvas.height,64);frame.clip();
  frame.drawImage(canvas,padding,padding);
  return new Promise((resolve,reject)=>framed.toBlob(blob=>blob?resolve(blob):reject(new Error('Image encoding failed')),'image/png'));
}
