import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../tools/static/frontend.html',import.meta.url),'utf8');
const part=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function renderer(){
 let ready=false,paint=[],previews=0,contrast=0,enforced=0;const waits=[];const statuses=[];
 const container={set innerHTML(_){paint=[];},appendChild(node){paint.push(node);}};
 const context={layers:[{id:'background',type:'image'},{id:'title',type:'text',font:'CF_Test'}],activeLayerIds:[],nativeCaptureDomFreezeDepth:0,templateCanvasRenderBlock:null,templateFontRenderGeneration:0,templateImportStatusEpoch:0,_autoTextContrastTimer:0,_autoTextContrastRun:0,
 document:{getElementById:id=>id==='dynamic-layers'?container:{style:{},dataset:{}}},getActiveEditorGroup:()=>null,isLayerVisibleInCanvasLanguage:()=>true,isLayerTemplateFontReady:layer=>!layer.font||ready,createLayerElement:layer=>layer.id,renderArtboardPreviews:()=>previews++,isUserInterfaceMode:()=>true,scheduleAutomaticTextContrast:()=>contrast++,forceHideCanvasFontLoadingOverlay(){},areTemplateFontsLoaded:()=>ready,setTemplateImportStatus:(phase,message,epoch)=>{if(epoch===context.templateImportStatusEpoch)statuses.push(phase);},ensureTemplateFontsLoaded:()=>{const wait=deferred();waits.push(wait);return wait.promise;},enforceTextTwoLineLimit:()=>enforced++,showToast(){},clearTimeout};
 vm.createContext(context);
 vm.runInContext(part(html,'    function renderCanvas(options','    function renderArtboardPreviews()')+part(html,'    async function renderTemplateCanvasAfterFonts(','    // ===== 模板应用后强制两行'),context);
 return {context,waits,statuses,get paint(){return paint;},get counters(){return {previews,contrast,enforced};},ready:()=>{ready=true;}};
}
test('cold fonts do not leave the entire board blank or draw fallback text',async()=>{
 const r=renderer(),pending=r.context.renderTemplateCanvasAfterFonts(r.context.layers,r.context.layers);
 assert.deepEqual(r.paint,['background']);assert.deepEqual(r.counters,{previews:0,contrast:0,enforced:0});assert.equal(r.statuses.at(-1),'fonts');
 r.ready();r.waits[0].resolve(true);assert.equal(await pending,true);
 assert.deepEqual(r.paint,['background','title']);assert.deepEqual(r.counters,{previews:1,contrast:1,enforced:1});assert.equal(r.statuses.at(-1),'ready');
});
test('font failure keeps ready graphics visible and reports the missing font',async()=>{
 const r=renderer(),pending=r.context.renderTemplateCanvasAfterFonts(r.context.layers,r.context.layers);
 r.waits[0].reject(Error('font timeout'));assert.equal(await pending,false);assert.deepEqual(r.paint,['background']);assert.equal(r.statuses.at(-1),'font-error');
});
test('late font completion cannot repaint an older template',async()=>{
 const r=renderer(),first=r.context.renderTemplateCanvasAfterFonts(r.context.layers,r.context.layers);
 r.context.layers=[{id:'new-background',type:'image'}];const second=r.context.renderTemplateCanvasAfterFonts(r.context.layers,r.context.layers);
 r.ready();r.waits[1].resolve(true);await second;r.waits[0].resolve(true);assert.equal(await first,false);assert.deepEqual(r.paint,['new-background']);
});
test('decoded snapshots share a request, use versioned keys, and remain bounded',async()=>{
 let calls=0;const first=deferred();const snapshot={schema:'vf-layout-preset/v1',size:'9:16',canvasW:1080,canvasH:1920,elements:[{id:'image'}]};
 const sourceCache={key:s=>JSON.stringify(['diy',s.source_path,s.updated_at]),get:s=>{calls++;return first.promise;}};
 const context={window:{VFTemplateSourceCache:{create:()=>sourceCache}},state:{session:{user:{id:'diy'}},librarySources:[]}};
 vm.createContext(context);vm.runInContext(part(app,'  var _templateSnapshotCache','  async function logAssetEvent('),context);
 const source={id:'one',source_path:'shared/one.json',updated_at:'v1'};
 const a=context.loadLibraryTemplateSnapshot({source}),b=context.loadLibraryTemplateSnapshot({source});
 first.resolve(new Blob([JSON.stringify(snapshot)]));assert.equal((await a).elements.length,1);await b;
 const before=calls;await context.loadLibraryTemplateSnapshot({source});assert.equal(calls,before);
 for(let i=0;i<12;i++)await context.loadLibraryTemplateSnapshot({source:{source_path:'shared/'+i+'.json',updated_at:'v1'}});
 assert.ok(Object.keys(context._templateSnapshotCache).length<=8);
 await context.loadLibraryTemplateSnapshot({source:{...source,updated_at:'v2'}});assert.ok(calls>before);
});
test('the last clicked template wins even when an earlier download completes later',async()=>{
 const pending=new Map(),applied=[];const frame={contentWindow:{VF_TEMPLATE_IMPORT_STATUS(){}}};
 const context={state:{localPreview:false,supabase:{},route:'static',activeFrame:frame,toolFrames:{static:frame},lang:'zh'},loadLibraryTemplateSnapshot:item=>{const d=deferred();pending.set(item.source.id,d);return d.promise;},waitForToolImporter:async()=>{},notifyStaticIframe:msg=>applied.push(msg.sourceId),logAssetEvent:async()=>{},alert:()=>assert.fail('unexpected alert')};
 vm.createContext(context);vm.runInContext(part(app,'  var templateOpenGeneration','  var _templateSnapshotCache'),context);
 const a=context.openLibraryTemplate({source:{id:'first'}}),b=context.openLibraryTemplate({source:{id:'second'}});
 pending.get('second').resolve({schema:'vf-layout-preset/v1',elements:[]});await b;pending.get('first').resolve({schema:'vf-layout-preset/v1',elements:[]});await a;
 assert.deepEqual(applied,['second']);
});

test('large-template metadata reads a bounded Range and ignores incomplete image payloads',async()=>{
 const prefix='{\"schema\":\"vf-layout-preset/v1\",\"name\":\"Test \\\"canvasW\\\"\",\"canvasW\":1080,\"canvasH\":1920,\"size\":\"9:16\",\"elements\":[{\"src\":\"'+ 'x'.repeat(50000);
 let request;const context={getTemplateSourceCache:()=>({cached:async()=>null}),templateSourceUrl:()=> 'https://owned.test/source',config:{supabaseUrl:'https://owned.test',supabaseAnonKey:'ANON'},LIBRARY_BUCKET:'vf-library',state:{session:{access_token:'TEST'}},fetch:async(url,options)=>{request={url,options};return new Response(prefix,{status:206});},AbortSignal,TextDecoder};
 vm.createContext(context);vm.runInContext(part(app,'  // Read complete top-level fields','  async function loadTemplateMetadata('),context);
 const meta=await context.loadTemplateMetadataHeader({source_path:'templates/one.json'});
 assert.equal(request.options.headers.Range,'bytes=0-16383');assert.equal(meta.canvasW,1080);assert.equal(meta.canvasH,1920);assert.equal(meta.elements,undefined);assert.equal(Object.getPrototypeOf(meta),null);
});

test('preview downloads start lazily and never exceed the configured batch size',async()=>{
 const context={_templateSourceCache:null};vm.createContext(context);vm.runInContext(part(app,'  async function runTemplatePreviewTasks(','  async function handleFetchTemplates('),context);
 let active=0,maxActive=0,started=0;const waits=[];
 const tasks=Array.from({length:5},()=>()=>{active++;started++;maxActive=Math.max(maxActive,active);const d=deferred();waits.push(d);return d.promise.finally(()=>active--);});
 assert.equal(started,0);const done=context.runTemplatePreviewTasks(tasks,2);assert.equal(started,2);
 waits[0].resolve();waits[1].resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(started,4);assert.equal(maxActive,2);
 waits[2].resolve();waits[3].resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(started,5);
 waits[4].resolve();await done;assert.equal(active,0);assert.equal(maxActive,2);
});
