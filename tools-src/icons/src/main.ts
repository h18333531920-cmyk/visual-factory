import {usesDirectSiteApi} from './direct-site-api.js';
import {referencesFor,setReferences,REFERENCE_LIMIT} from './references';
import {prepareSubject} from './prepare-subject';
import {getCutoutConfig,selectCutoutProvider,saveKoukoutuConfig,checkKoukoutu,koukoutuCutout,type CutoutConfig,type CutoutProvider,getImageXSettings,saveImageXSettings,checkImageX,imageXCutout,type ImageXSettings,serviceConfig,configureSiteConnection,saveServiceConfig,changeServiceProfile,submitJob,getJob,validateGeneratedImage,GenerationError,type ServiceConfig} from './api';
import './styles.css';
import './embedded.css';
import {createIcons, Sparkles, Plus, ArrowDownToLine, ImagePlus, SlidersHorizontal, Smartphone, History, ChevronDown, ChevronLeft, ChevronRight, Check, X, ArrowLeft, ArrowRight, RefreshCw, Move, Eraser, Undo2, RotateCcw, Layers, Upload, CheckCircle2, AlertCircle, ArrowUpRight, CircleHelp, Image as ImageIcon, UserRound, Copy, Clock3, LoaderCircle, Trash2, Send, ScanLine, Settings2, ShieldCheck} from 'lucide';
import {translate, type Locale} from './i18n';
import {samples, getSample, DEFAULT_SAMPLE_ID, mockupTemplates} from './samples';
import {renderIcon, exportIcon, createZip, downloadBlob, type ImageSettings, type MaskStroke, type ExportAsset} from './image-engine';
import {readState, writeState} from './store';
import {setupHostBridge} from './bridge';
import type {AppState, Item, Candidate, BatchDraft, GenerationInput} from './types';
import {batchProgressKey, generationAction, generationInput, sameGenerationInput, restoreGenerationInput, planBatchGeneration, isBatchDraftModified, repairUnsubmittedFailure} from './generation';
import {removeBatchDrafts} from './batch-selection';
import {exportMockup} from './mockup-export';
import {getCandidates, cloneCandidateMetadata, selectCandidate, removeCandidate, renameCandidate, addCandidate, queueCandidateLimitNotice, consumeCandidateLimitNotice} from './candidates';

const BATCH_LIMIT = 12;
const BATCH_MODEL_ID = 'site-jimeng-lite';
const app = document.querySelector<HTMLDivElement>('#app')!;
const icons = {Sparkles, Plus, ArrowDownToLine, ImagePlus, SlidersHorizontal, Smartphone, History, ChevronDown, ChevronLeft, ChevronRight, Check, X, ArrowLeft, ArrowRight, RefreshCw, Move, Eraser, Undo2, RotateCcw, Layers, Upload, CheckCircle2, AlertCircle, ArrowUpRight, CircleHelp, Image:ImageIcon, UserRound, Copy, Clock3, LoaderCircle, Trash2, Send, ScanLine, Settings2, ShieldCheck};
const icon = (name:string, cls='') => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const esc = (value:unknown) => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const clone = <T>(v:T):T => structuredClone(v);
const uid = () => crypto.randomUUID();
const defaults = ():ImageSettings => ({size:120,bgColor:'#FFFFFF',format:'jpeg',transparent:false,scale:1,offsetX:0,offsetY:0,shadow:false});
function fresh(name=''):Item {return {id:uid(),name,description:'',model:'gpt',composition:'auto',status:'idle',candidates:[],selected:true,review:'draft',createdAt:Date.now(),attempt:0,demo:'normal',settings:defaults()};}
function freshBatchDraft(name='',description='',expanded=true):BatchDraft{return {id:uid(),name,description,expanded,combineForms:false};}
let locale:Locale = (()=>{try {const l=localStorage.getItem('icon-studio-locale'); return l==='zh'||l==='en'?l:navigator.language.startsWith('zh')?'zh':'en';}catch{return 'en';}})();
const t = (key:string) => translate(locale,key);
let state:AppState = {version:1,mode:'batch',single:fresh(),batchNames:'',batchDrafts:[freshBatchDraft()],batch:[],batchSettings:defaults(),history:[],globalBackground:{bgColor:'#FFFFFF',transparent:false}};
let modal:''|'export'|'mockup'|'account'|'candidate-limit'|'settings'|'confirm-batch-delete'|'confirm-candidate-delete'|'confirm-batch-generate' = '';
let pendingBatchDeleteIds:string[]=[];
let pendingCandidateDeleteId='';
let pendingBatchGenerationMode:'changes'|'all'='changes';
let activeBatchDraftId='';
let editingBatchDescriptionId='';
let batchGridScrollTop=0;
let editingId:string|null = null;
let batchReturnPosition:{scrollY:number,itemId:string}|undefined;
let advanced = false;
let showSafety = false;
let service:ServiceConfig|undefined;
let settingsProfileId='__list__';
let settingsRemovedId='';
let imagexSettings:ImageXSettings={configured:false,serviceId:'4tdjhp7s4i',region:'cn-north-1',domain:'',model:'productv2',automatic:false};
let cutoutConfig:CutoutConfig={provider:'local',koukoutu:{configured:false}};
let koukoutuExpanded=false;
let imagexBusy=false;
let imagexExpanded=false;
let sampleSources = new Map<string,string>();
let saveTimer:ReturnType<typeof setTimeout>;
let saveStatus:'idle'|'saving'|'saved'|'error' = 'idle';
let saveRevision=0;
let renderVersion=0;
let activeJobs=new Set<string>();
let exportSizes:(120|400)[]=[120];
let exportKinds:('jpeg'|'png'|'transparent')[]=['jpeg'];
let mockupResizeObserver:ResizeObserver|undefined;
let mockupPainting:Promise<void>=Promise.resolve();
let mockupSaveRevision=0;
let mockupPrepareTimer:ReturnType<typeof setTimeout>|undefined;
let mockupDownloadUrl='';
let mockupDownloadBlob:Blob|undefined;
let mockupSaveInProgress=false;
const expandedCandidateHistory = new Set<string>();
let exporting=false;
let readyExport:{url:string;filename:string;bytes:number;zip:boolean}|undefined;
function downloadReady(){return readyExport?`<div class="export-ready" role="status"><div><strong>${t('exportReadyTitle')}</strong><span>${esc(readyExport.filename)} · ${Math.ceil(readyExport.bytes/1024)} KB</span><p>${t('exportReadyHint')}</p></div><a class="button secondary small" href="${esc(readyExport.url)}" download="${esc(readyExport.filename)}">${icon('arrow-down-to-line')}${t(readyExport.zip?'saveZip':'saveExport')}</a></div>`:'';}

const referenceUploads=new Set<string>();

const bridge = setupHostBridge(l=>{if(locale!==l){locale=l;render();}},()=>({schema:'vf-icon-project/v1',prototype:true,state:clone(state)}),mode=>{
  document.documentElement.dataset.vfMode=mode;
  document.body.dataset.vfMode=mode;
  if(mode==='user'&&modal==='settings'){modal='';renderModal();}
});

function current():Item {return editingId?state.batch.find(i=>i.id===editingId)??state.single:state.single;}
function batchDrafts():BatchDraft[]{
 if(state.batchDrafts?.length)return state.batchDrafts;
 const names=state.batchNames.split('\n').map(name=>name.trim()).filter(Boolean).slice(0,BATCH_LIMIT);
 state.batchDrafts=(names.length?names:['']).map((name,index)=>freshBatchDraft(name,state.batch[index]?.description??'',index===0));
 state.batch.forEach((item,index)=>item.batchDraftId??=state.batchDrafts?.[index]?.id);
 return state.batchDrafts;
}
function syncBatchNames(){state.batchNames=batchDrafts().map(draft=>draft.name.trim()).filter(Boolean).join('\n');}
function syncLinkedBatchData(){for(const draft of batchDrafts()){const item=state.batch.find(item=>item.batchDraftId===draft.id);if(!item||isWorking(item))continue;item.name=draft.name;item.description=draft.description;item.combineForms=!!draft.combineForms;if(item.candidate&&draft.name.trim())renameCandidate(item,item.candidate.id,draft.name);}}
function globalBackground(){return state.globalBackground??={bgColor:state.single.settings.bgColor,transparent:state.single.settings.transparent};}
function setItemBackground(item:Item,background:{bgColor:string;transparent:boolean}){item.settings.bgColor=background.bgColor;item.settings.transparent=background.transparent;for(const candidate of getCandidates(item)){candidate.settings.bgColor=background.bgColor;candidate.settings.transparent=background.transparent;}}
function applyGlobalBackground(key:'bgColor'|'transparent',value:string|number|boolean){const background={...globalBackground()};if(key==='bgColor'){background.bgColor=String(value).toUpperCase();background.transparent=false;}else background.transparent=Boolean(value);state.globalBackground=background;state.batchSettings.bgColor=background.bgColor;state.batchSettings.transparent=background.transparent;for(const item of [state.single,...state.batch,...state.history])setItemBackground(item,background);persist();}
function removeConfirmedBatchDrafts(){
 const removed=removeBatchDrafts(state,pendingBatchDeleteIds,freshBatchDraft);
 if(!removed.length)return false;
 if(removed.includes(activeBatchDraftId))activeBatchDraftId='';
 if(removed.includes(editingBatchDescriptionId))editingBatchDescriptionId='';
 persist();return true;
}
function openBatchItem(id:string){
  if(!state.batch.some(item=>item.id===id))return;
  batchReturnPosition={scrollY:window.scrollY,itemId:id};
  editingId=id;
  render();
}
function returnToBatch(){
  const position=batchReturnPosition;
  document.getElementById('batch-editor')?.remove();
  editingId=null;state.mode='batch';
  persist();render();
  const card=position?document.querySelector<HTMLElement>(`[data-item="${position.itemId}"]`):null;
  card?.querySelector<HTMLButtonElement>('.card-actions [data-action="edit-item"]')?.focus({preventScroll:true});
  window.scrollTo(0,position?.scrollY??0);
}
function renderBatchEditor(){
  const root=document.getElementById('batch-editor-root');if(!root)return;
  if(!editingId){root.innerHTML='';return;}
  let dialog=root.querySelector<HTMLDialogElement>('#batch-editor');
  const isNew=!dialog;
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='batch-editor';dialog.className='batch-editor-dialog';
    dialog.setAttribute('aria-labelledby','batch-editor-title');dialog.setAttribute('aria-describedby','batch-editor-note');
    dialog.addEventListener('cancel',event=>{event.preventDefault();returnToBatch();});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog!.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)returnToBatch();});
    root.append(dialog);
  }
  const scrollTop=dialog.querySelector('.batch-editor-body')?.scrollTop??0;
  const item=current(),index=state.batch.findIndex(i=>i.id===item.id);
  dialog.innerHTML=`<header class="batch-editor-header"><div><span class="eyebrow">${t('editingItem')} · ${index+1} / ${state.batch.length}</span><h2 id="batch-editor-title">${esc(item.candidate?.name??item.name)}</h2><p id="batch-editor-note">${t('batchEditorNote')}</p></div><div class="batch-editor-actions"><button id="finish-batch-edit" class="button primary" data-action="back-to-batch">${icon('check')}${t('finishEditing')}</button><button id="close-batch-edit" class="icon-button" data-action="back-to-batch" aria-label="${t('close')}">${icon('x')}</button></div></header><div class="batch-editor-body"><div class="workspace editor-workspace">${form('editor')}${resultPanel(item)}</div></div>`;
  if(isNew){dialog.showModal();document.getElementById('finish-batch-edit')?.focus({preventScroll:true});}
  dialog.querySelector('.batch-editor-body')!.scrollTop=scrollTop;
}
function chosen():Item[] {return state.mode==='single'?[state.single].filter(i=>!!i.candidate):batchDrafts().map(draft=>state.batch.find(item=>item.batchDraftId===draft.id)).filter((item):item is Item=>!!item?.selected&&!!item.candidate);}
function isWorking(i:Item){return ['queued','generating','cutting'].includes(i.status);}
function updateSaveStatus(){const el=document.getElementById('save-status');if(el){el.textContent=t(saveStatus==='error'?'saveError':saveStatus==='saved'?'saved':saveStatus==='saving'?'saving':'localDraft');el.classList.toggle('save-error',saveStatus==='error');}}
function persist(){clearTimeout(saveTimer);const revision=++saveRevision;saveStatus='saving';updateSaveStatus();saveTimer=setTimeout(()=>writeState(clone(state)).then(()=>{if(revision===saveRevision){saveStatus='saved';updateSaveStatus();}}).catch(()=>{if(revision===saveRevision){saveStatus='error';updateSaveStatus();toast('saveError',true);}}),180);}
function exportItems():Item[]{return state.mode==='batch'&&!editingId?chosen():[current()].filter(i=>i.candidate);}
function singleContext(){return state.mode==='single'||!!editingId;}
function itemSnapshot(i:Item):Item{const candidates=i.candidates.map(cloneCandidateMetadata),candidate=i.candidate?(candidates.find(value=>value.id===i.candidate!.id)??cloneCandidateMetadata(i.candidate)):undefined;return {...i,settings:clone(i.settings),candidates,candidate,references:i.references?.slice(),lastGeneratedInput:i.lastGeneratedInput?{...i.lastGeneratedInput}:undefined,rawGenerationInput:i.rawGenerationInput?{...i.rawGenerationInput}:undefined,generationJob:i.generationJob?{...i.generationJob,input:{...i.generationJob.input}}:undefined};}
function archive(i:Item){if(!i.candidate)return;const snapshot=itemSnapshot(i),index=state.history.findIndex(h=>h.id===i.id);if(index>=0)state.history[index]=snapshot;else state.history.unshift(snapshot);state.history=state.history.slice(0,30);}
function sync(i:Item){if(i.candidate)i.candidate.settings=clone(i.settings);archive(i);persist();}
function toast(key:string,error=false){document.getElementById('toast')?.remove();const el=document.createElement('div');el.id='toast';el.className=`toast ${error?'error':''}`;el.setAttribute('role','status');el.textContent=t(key);document.body.append(el);setTimeout(()=>el.remove(),4200);}
function stateLabel(i:Item){if(i.rawGeneratedSource&&i.status==='failed'&&['invalidTransparency','onlineCutoutUnavailable'].includes(i.error??''))return t('needsCutout');return i.status==='idle'?'':t(({queued:'queue',generating:'generating',cutting:'cutting',ready:'ready',failed:'failed',unresolved:'unresolved',cancelled:'cancelled'} as const)[i.status]);}
function generationButtonContent(item:Item){const action=item.rawGeneratedSource&&item.status==='failed'?'retryCutout':item.status==='unresolved'?'recover':generationAction(item);return `${icon(action==='regenerating'?'loader-circle':action==='regenerate'?'refresh-cw':'sparkles',action==='regenerating'?'spin':'')}${t(action)}`;}
function buildBatchGenerationPlan(includeUnchanged=false){return planBatchGeneration(batchDrafts(),state.batch,BATCH_LIMIT,includeUnchanged);}
function batchGenerateButtonContent(){
  const hasResults=state.batch.some(item=>item.candidate),changes=buildBatchGenerationPlan(),all=hasResults&&!changes.length;
  const plan=all?buildBatchGenerationPlan(true):changes;
  return `<span class="batch-generate-title">${icon(all?'refresh-cw':'sparkles')}${t(!hasResults?'generateBatch':all?'regenerateBatch':'generateBatchChanges')}${plan.length?`<span class="count-pill">${plan.length}</span>`:''}</span>`;
}
function updateGenerationButtons(){
  if(!singleContext())return;
  const item=current();
  for(const button of document.querySelectorAll<HTMLButtonElement>('#generate-button')){
    button.disabled=!item.name.trim()||isWorking(item);button.innerHTML=generationButtonContent(item);
  }
  createIcons({icons,attrs:{'stroke-width':1.7}});
}
function field(label:string,body:string,optional=false){return `<div class="field"><label ${body.match(/id="([^"]+)"/) ? `for="${body.match(/id="([^"]+)"/)![1]}"` : ''}>${t(label)}${optional?`<span>${t('optional')}</span>`:''}</label>${body}</div>`;}
function profileTitle(p:{label:string;model:string;managed?:boolean}){return p.managed||p.label===p.model?p.label:`${p.label} · ${p.model}`;}
function selectedProfile(value:string){return service?.profiles.find(p=>p.id===value)??service?.profiles.find(p=>p.model===value)??(['gpt','jimeng-lite','jimeng-pro','volc'].includes(value)?service?.profiles.find(p=>p.id===service?.defaultProfileId):undefined);}
function modelOptions(value:string){const selected=selectedProfile(value);return `${!selected?`<option value="${esc(value)}" selected disabled>${t('chooseModel')}</option>`:''}${service?.profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?.id?'selected':''}>${esc(profileTitle(p))}${p.managed?` (${t('siteService')})`:p.configured?'':` (${t('keyNotConfigured')})`}</option>`).join('')??''}`;}
function chipSamples(){return ['oranges','bananas','apples-pears','berries'].map(id=>{const s=samples.find(s=>s.id===id)!;return `<button type="button" class="sample-chip" data-action="sample" data-id="${id}" ${isWorking(current())?'disabled':''}>${esc(s.name[locale])}${icon('arrow-up-right')}</button>`;}).join('');}
function refControl(item:Item){const refs=referencesFor(item),busy=isWorking(item)||referenceUploads.has(item.id);return `<div class="reference-label">${t('reference')}<span>${refs.length} / ${REFERENCE_LIMIT} · ${t('optional')}</span></div><div class="reference-deck ${refs.length?'has-references':'is-empty'}" id="dropzone" tabindex="0" role="group" aria-label="${t('reference')} · ${t('referenceDeckHint')}" aria-disabled="${busy}" data-count="${refs.length}">${refs.map((source,index)=>`<div class="reference-photo" style="--slot:${index}"><img src="${esc(source)}" alt="${t('reference')} ${index+1}"/><button class="icon-button reference-remove" type="button" data-action="remove-ref" data-index="${index}" ${busy?'disabled':''} aria-label="${t('remove')} ${t('reference')} ${index+1}">${icon('x')}</button></div>`).join('')}${refs.length<REFERENCE_LIMIT?`<label class="reference-add" style="--slot:${refs.length}" tabindex="${busy?-1:0}" role="button" aria-disabled="${busy}" aria-label="${t(refs.length?'addReference':'upload')}" title="${t('uploadTwoHint')}">${icon('plus')}<input class="reference-file" type="file" id="reference-input" multiple ${busy?'disabled':''} accept="image/png,image/jpeg,image/webp" aria-label="${t('reference')}" tabindex="-1"/></label>`:''}<span class="reference-deck-caption">${t(refs.length?'referenceDeckHint':'uploadReferenceShort')}</span></div>`;}

function modeTabs(){return `<nav class="mode-tabs" aria-label="${t('creationMode')}"><button class="${state.mode==='single'?'active':''}" id="mode-single" data-action="mode" data-mode="single" aria-pressed="${state.mode==='single'}">${icon('image')}${t('single')}</button><button class="${state.mode==='batch'?'active':''}" id="mode-batch" data-action="mode" data-mode="batch" aria-pressed="${state.mode==='batch'}">${icon('layers')}${t('batch')}</button></nav>`;}
function batchDraftList(){
  const drafts=batchDrafts();
  return `<nav class="batch-name-list" aria-label="${t('batchNames')}">${drafts.map((draft,index)=>`<button type="button" class="batch-item-module batch-nav-item" data-batch-draft="${draft.id}" data-action="batch-locate" data-id="${draft.id}"><span class="batch-item-index">${String(index+1).padStart(2,'0')}</span><span class="batch-item-summary"><strong id="batch-summary-${draft.id}">${esc(draft.name.trim()||t('unnamedCategory'))}</strong></span><span id="batch-modified-${draft.id}" class="badge batch-modified-badge" title="${t('batchModifiedHint')}" ${isBatchDraftModified(draft,state.batch.find(item=>item.batchDraftId===draft.id))?'':'hidden'}>${t('batchModified')}</span></button>`).join('')}</nav><div class="batch-list-count">${drafts.length} / ${BATCH_LIMIT}</div>`;
}
function form(context:'workspace'|'editor'='workspace'){const item=context==='editor'?current():state.single;const batch=context==='workspace'&&state.mode==='batch';return `<aside class="input-panel">${context==='workspace'?modeTabs():''}<div class="panel-heading"><h1>${t(batch?'batchTitle':context==='editor'?'batchEditTitle':'singleTitle')}</h1>${context==='editor'?`<p>${t('batchEditSub')}</p>`:''}</div>
${batch?batchDraftList():
`${field('category',`<input id="category-name" ${isWorking(item)?'disabled':''} maxlength="120" value="${esc(item.name)}" placeholder="${t('placeholder')}" autocomplete="off"/>`)}<div class="sample-chips">${chipSamples()}</div><details class="details-field" ${item.description?'open':''}><summary>${icon('plus')}${t('description')}<span>${t('optional')}</span></summary><textarea id="description" aria-label="${t('description')}" ${isWorking(item)?'disabled':''} rows="3" maxlength="1000" placeholder="${t('detailsPlaceholder')}">${esc(item.description)}</textarea></details>${refControl(item)}`}
${batch?'':`<details class="generation-details" ${advanced?'open':''}><summary>${icon('settings-2')}${t('generateSettings')}<span class="model-summary">${esc(selectedProfile(item.model)?.label??t('chooseModel'))}</span>${icon('chevron-down')}</summary><div class="detail-content">${field('model',`<select id="model" ${isWorking(item)?'disabled':''}>${modelOptions(item.model)}</select>`)}</div></details>`}
<div class="generate-footer"><button id="${batch?'batch-generate-button':'generate-button'}" class="button primary wide" data-action="generate" ${batch?!batchDrafts().some(draft=>draft.name.trim())||state.batch.some(isWorking)?'disabled':'':!item.name.trim()||isWorking(item)?'disabled':''}>${batch?batchGenerateButtonContent():generationButtonContent(item)}</button></div></aside>`;}
function backgroundControls(settings:ImageSettings,scope:string){return `<div class="background-controls"><span class="control-label">${t('background')}</span><div class="swatches">${['#FFFFFF','#EDF2FF'].map(c=>`<button class="swatch ${!settings.transparent&&settings.bgColor.toUpperCase()===c?'selected':''}" style="--swatch:${c}" data-action="bg" data-scope="${scope}" data-color="${c}" aria-label="${c}" title="${c}">${!settings.transparent&&settings.bgColor.toUpperCase()===c?icon('check'):''}</button>`).join('')}<button class="swatch checker ${settings.transparent?'selected':''}" data-action="transparent" data-scope="${scope}" aria-label="${t('transparent')}" title="${t('transparent')}">${settings.transparent?icon('check'):''}</button><label class="swatch custom-color" title="${t('background')}">${icon('plus')}<input type="color" data-field="bgColor" data-scope="${scope}" value="${settings.bgColor}" aria-label="${t('background')}"/></label></div><input class="hex-input" data-field="hex" data-scope="${scope}" value="${settings.bgColor}" maxlength="7" aria-label="HEX"/></div>`;}
function downloadSizes(scope:'single'|'batch'){return `<div class="size-controls"><span class="control-label">${t('chooseSizeDownload')}</span><div class="segmented compact">${[120,400].map(size=>`<button data-action="download-size" data-scope="${scope}" data-size="${size}">${size} × ${size}</button>`).join('')}</div></div>`;}
function candidateHistory(item:Item){
  const candidates=getCandidates(item);
  if(!item.candidate||candidates.length<2)return '';
  return `<details class="candidate-history" data-history-item="${item.id}" ${expandedCandidateHistory.has(item.id)?'open':''}><summary><span class="candidate-summary-title">${icon('history')}${t('candidates')}<b>${candidates.length}</b></span><span class="candidate-summary-hint">${t('candidateRetention')}</span><span class="candidate-summary-action">${t(expandedCandidateHistory.has(item.id)?'collapse':'expand')}</span>${icon('chevron-down')}</summary><div class="candidate-strip" role="group" aria-label="${t('candidates')}"><div class="candidate-carousel"><button class="candidate-scroll-button previous" data-action="candidate-scroll" data-direction="-1" aria-label="${t('previousPage')}">${icon('chevron-left')}</button><div class="candidate-list">${candidates.map((candidate,index)=>{const version=index+1;return `<div class="candidate-tile"><button class="candidate-thumbnail ${candidate.id===item.candidate!.id?'is-selected':''}" data-action="candidate" data-id="${candidate.id}" title="${esc(candidate.name)} · ${t('version')} ${version}" aria-label="${t('version')} ${version} · ${esc(candidate.name)}" aria-pressed="${candidate.id===item.candidate!.id}"><span class="candidate-image ${candidate.settings.transparent?'checker':''}"><canvas data-candidate-canvas="${candidate.id}" width="120" height="120" aria-hidden="true"></canvas></span><span class="candidate-state">${candidate.id===item.candidate!.id?t('currentCandidate'):`${t('version')} ${version}`}</span></button><input class="candidate-name-input" data-rename-owner="${item.id}" data-rename-candidate="${candidate.id}" type="text" value="${esc(candidate.name)}" maxlength="120" aria-label="${t('renameIcon')} ${esc(candidate.name)}" title="${t('renameHint')}"/><button class="candidate-delete" data-action="candidate-delete" data-id="${candidate.id}" aria-label="${t('deleteCandidate')} · ${t('version')} ${version} · ${esc(candidate.name)}" title="${t('deleteCandidate')}">${icon('x')}</button></div>`;}).join('')}</div><button class="candidate-scroll-button next" data-action="candidate-scroll" data-direction="1" aria-label="${t('nextPage')}">${icon('chevron-right')}</button></div></div></details>`;
}
function exportControls(item?:Item){const scope=item?'single':'batch',s=item?.settings??state.batchSettings,count=item?(item.candidate?1:0):chosen().length;return `<div class="download-control" data-scope="${scope}"><button id="download-options-${scope}" class="button primary download-toggle" data-action="download-options" ${!count||exporting?'disabled':''} aria-expanded="false" aria-controls="download-menu-${scope}">${icon(exporting?'loader-circle':'arrow-down-to-line',exporting?'spin':'')}${t(exporting?'exporting':scope==='batch'?'exportSelected':s.transparent||s.format==='png'?'downloadImage':'download')}${scope==='batch'?`<span class="count-pill">${count}</span>`:''}${icon('chevron-down','download-chevron')}</button><div id="download-menu-${scope}" class="download-menu" role="group" aria-label="${t('exportOptions')}" hidden>${downloadSizes(scope)}<button class="download-more" data-action="export">${t('moreExportOptions')}${icon('arrow-right')}</button></div></div>`;}
function activeDownloadControl(){return document.querySelector<HTMLElement>(editingId?'#batch-editor .download-control':'main .download-control');}
function closeDownloadMenu(restoreFocus=false){const control=activeDownloadControl(),menu=control?.querySelector<HTMLElement>('.download-menu'),toggle=control?.querySelector<HTMLElement>('.download-toggle');if(!menu||menu.hidden)return;menu.hidden=true;toggle?.setAttribute('aria-expanded','false');if(restoreFocus)toggle?.focus({preventScroll:true});}
function setupCandidateCarousels(){for(const carousel of document.querySelectorAll<HTMLElement>('.candidate-carousel')){
 const list=carousel.querySelector<HTMLElement>('.candidate-list'),previous=carousel.querySelector<HTMLButtonElement>('.candidate-scroll-button.previous'),next=carousel.querySelector<HTMLButtonElement>('.candidate-scroll-button.next');if(!list||!previous||!next)continue;
 const update=()=>{const max=Math.max(0,list.scrollWidth-list.clientWidth);previous.disabled=list.scrollLeft<=2;next.disabled=list.scrollLeft>=max-2;};
 let pointerId=-1,startX=0,startScroll=0,dragged=false,suppressClick=false;
 list.addEventListener('scroll',update,{passive:true});
 list.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0)return;pointerId=event.pointerId;startX=event.clientX;startScroll=list.scrollLeft;dragged=false;});
 list.addEventListener('pointermove',event=>{if(event.pointerId!==pointerId)return;const distance=event.clientX-startX;if(Math.abs(distance)>6&&!dragged){dragged=true;list.setPointerCapture(pointerId);list.classList.add('is-dragging');}if(dragged){event.preventDefault();list.scrollLeft=startScroll-distance;}});
 const finish=(event:PointerEvent)=>{if(event.pointerId!==pointerId)return;if(list.hasPointerCapture(pointerId))list.releasePointerCapture(pointerId);pointerId=-1;list.classList.remove('is-dragging');if(dragged){suppressClick=true;setTimeout(()=>suppressClick=false,0);}};
 list.addEventListener('pointerup',finish);list.addEventListener('pointercancel',finish);
 list.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
 const selected=list.querySelector<HTMLElement>('.candidate-thumbnail.is-selected')?.closest<HTMLElement>('.candidate-tile');if(selected)requestAnimationFrame(()=>{const left=selected.offsetLeft,right=left+selected.offsetWidth;if(left<list.scrollLeft||right>list.scrollLeft+list.clientWidth)list.scrollLeft=Math.max(0,left-(list.clientWidth-selected.offsetWidth)/2);update();});else update();
}}
function positionDownloadMenu(){const control=activeDownloadControl(),menu=control?.querySelector<HTMLElement>('.download-menu');if(!menu||menu.hidden||!control)return;control.classList.remove('menu-above');if(control.dataset.scope==='batch'){const r=control.getBoundingClientRect(),needed=menu.offsetHeight+22;control.classList.toggle('menu-above',window.innerHeight-r.bottom<needed&&r.top>=needed);}}
function modeControlsServiceHelp(){return bridge.embedded||usesDirectSiteApi();}
function canOpenServiceHelp(){return !modeControlsServiceHelp()||document.documentElement.dataset.vfMode==='developer';}
function moreSettings(){return `<button class="button secondary more-settings-button" ${modeControlsServiceHelp()?'data-developer-only':''} data-action="more-settings">${icon('settings-2')}${t(usesDirectSiteApi()?'serviceHelp':'moreSettings')}</button>`;}
function resultPanel(item:Item){const c=item.candidate,s=item.settings;return `<section class="result-panel compact-result"><div class="result-top"><div class="result-primary-actions">${exportControls(item)}</div><div class="result-tools">${moreSettings()}<button class="button mockup-button" data-action="mockup">${icon('smartphone')}${t('mockup')}</button></div></div>
${downloadReady()}<div class="preview-stage"><div class="canvas-surround"><div class="canvas-surface ${s.transparent?'checker':''}"><canvas id="main-canvas" width="400" height="400" aria-label="${t('canvas')}"></canvas><div class="safe-area ${showSafety?'visible':''}" aria-hidden="true"><span>${t('safety')}</span></div></div><div class="corner-label">${!item.candidate&&item.rawGeneratedSource?t('generatedOriginal'):`${s.size} × ${s.size} PX`}</div></div>${!c&&!item.rawGeneratedSource&&!isWorking(item)?`<div class="example-caption"><span>${t('example')} · ${esc(samples.find(s=>s.id===DEFAULT_SAMPLE_ID)!.name[locale])}</span><p>${t('previewHint')}</p></div>`:''}
${isWorking(item)?`<div class="processing-overlay stage-${item.status}" role="status"><div class="processing-status-card"><div class="processing-icon">${icon('loader-circle','spin')}</div><strong>${stateLabel(item)}</strong><span>${t(item.error==='connectionRecovering'?'connectionRecovering':'processingHint')}</span><div class="stage-steps">${['queued','generating','cutting'].map((stage,index)=>`<span class="${['queued','generating','cutting'].indexOf(item.status)>=index?'active':''}"></span>`).join('')}</div></div></div>`:''}
</div>
${item.status==='failed'||item.status==='unresolved'?`<div class="inline-error" role="alert">${icon('alert-circle')}<div><strong>${stateLabel(item)}</strong><p>${t(item.error??'imageError')}</p></div><button class="button secondary small" data-action="retry-single">${t(item.rawGeneratedSource?'retryCutout':item.status==='unresolved'?'recover':'retry')}</button>${item.rawGeneratedSource?`<button class="button secondary small" data-action="download-original" data-id="${item.id}">${t('downloadOriginal')}</button>`:''}${item.status==='unresolved'&&!item.rawGeneratedSource?`<button class="text-button" data-action="new-attempt" data-id="${item.id}">${t('newAttempt')}</button>`:''}</div>`:''}

<div class="result-settings preview-options"><label class="check-label safety-toggle"><input type="checkbox" id="show-safety" ${showSafety?'checked':''}/>${t('showSafety')}</label>${backgroundControls(s,'single')}</div>
${candidateHistory(item)}
</section>`;}
function batchProgressLabel(item:Item){const key=batchProgressKey(item);if(key)return t(key);if(item.status==='failed'||item.status==='unresolved')return stateLabel(item);return item.description.trim()?esc(item.description.trim()):t('noBatchDescription');}
function batchThumbContent(item:Item){
  const progress=batchProgressKey(item),working=!!progress;
  if(!item.candidate&&!item.rawGeneratedSource)return `<div class="empty-thumb">${icon(working?'loader-circle':item.status==='failed'||item.status==='unresolved'?'alert-circle':'image',working?'spin':'')}<span>${batchProgressLabel(item)}</span></div>`;
  return `<canvas data-item-canvas="${item.id}" width="200" height="200"></canvas>${working?`<div class="batch-thumb-progress" role="status">${icon('loader-circle','spin')}<strong>${batchProgressLabel(item)}</strong></div>`:''}`;
}
function batchCard(draft:BatchDraft,index:number){
  const item=state.batch.find(item=>item.batchDraftId===draft.id),busy=!!item&&isWorking(item),name=draft.name.trim()||t('unnamedCategory');
  const actionLabel=item?.candidate?'regenerate':item?.status==='unresolved'?'recover':item?.status==='failed'?'retry':'generate';
  return `<article class="batch-card ${item?.selected&&item.candidate?'selected':''}" data-batch-card="${draft.id}" ${item?`data-item="${item.id}"`:''} aria-label="${esc(name)}">
    ${item?.candidate?`<label class="card-select"><input id="select-check-${item.id}" type="checkbox" data-select="${item.id}" ${item.selected?'checked':''} aria-label="${esc(name)}"/><span class="card-export-label" aria-hidden="true">${t('batchPendingExport')}</span></label>`:''}
    <button type="button" class="icon-button batch-card-delete" data-action="batch-remove" data-id="${draft.id}" aria-label="${t('removeBatchItem')} · ${esc(name)}" title="${t('removeBatchItem')}" ${busy?'disabled':''}>${icon('x')}</button>
    <button type="button" class="batch-thumb ${item?.settings.transparent?'checker':''} ${busy?`is-working intent-${item!.generationIntent??'initial'}`:''}" data-action="batch-focus" data-id="${draft.id}" ${item?`id="select-image-${item.id}"`:''} aria-pressed="${activeBatchDraftId===draft.id}" aria-label="${t('selectImage')} ${esc(name)}">${item&&(item.candidate||item.status!=='idle')?batchThumbContent(item):`<span class="batch-draft-preview">${icon('image')}<span>${t('batchAwaitingGeneration')}</span></span>`}</button>
    <div class="batch-card-fields">
      <input id="batch-name-${draft.id}" data-batch-name="${draft.id}" value="${esc(draft.name)}" maxlength="120" placeholder="${t('category')}" aria-label="${t('category')} · ${index+1}" autocomplete="off" ${busy?'disabled':''}/>
      <div class="batch-description-box ${editingBatchDescriptionId===draft.id&&!busy?'is-editing':''}"><button type="button" id="batch-description-summary-${draft.id}" class="batch-description-summary ${draft.description.trim()?'':'is-placeholder'}" data-action="batch-edit-description" data-id="${draft.id}" aria-label="${t('description')} · ${index+1}" aria-expanded="${editingBatchDescriptionId===draft.id&&!busy}" aria-controls="batch-description-${draft.id}" title="${esc(draft.description.trim()||t('description'))}" ${editingBatchDescriptionId===draft.id&&!busy?'hidden':''} ${busy?'disabled':''}>${esc(draft.description.trim()||t('description'))}</button><textarea id="batch-description-${draft.id}" data-batch-description="${draft.id}" rows="3" maxlength="1000" placeholder="${t('description')}" aria-label="${t('description')} · ${index+1}" ${editingBatchDescriptionId===draft.id&&!busy?'':'hidden'} ${busy?'disabled':''}>${esc(draft.description)}</textarea></div>
    </div>
    ${item?.error?`<p class="card-error" role="alert">${t(item.error)}</p>${item.rawGeneratedSource?`<button class="button secondary small" data-action="download-original" data-id="${item.id}">${t('downloadOriginal')}</button>`:''}${item.status==='unresolved'&&!item.rawGeneratedSource?`<button class="text-button" data-action="new-attempt" data-id="${item.id}">${t('newAttempt')}</button>`:''}`:''}
    <div class="card-actions"><button type="button" class="button regenerate-button" data-action="batch-generate-item" data-id="${draft.id}" ${busy||!draft.name.trim()?'disabled':''}>${icon(busy?'loader-circle':item?.candidate?'refresh-cw':'sparkles',busy?'spin':'')}${t(busy?'regenerating':item?.rawGeneratedSource?'retryCutout':actionLabel)}</button></div>
  </article>`;
}
function batchPanel(){
  const drafts=batchDrafts(),done=state.batch.filter(item=>item.candidate),selected=chosen();
  return `<section class="batch-panel" aria-label="${t('batchResults')}"><div class="batch-heading"><div class="batch-primary-actions">${exportControls()}</div><div class="batch-service-tools">${moreSettings()}<button class="button mockup-button" data-action="mockup">${icon('smartphone')}${t('mockup')}</button></div></div>
  ${downloadReady()}<div class="batch-select"><label class="check-label"><input type="checkbox" id="select-all" ${done.length&&done.every(item=>item.selected)?'checked':''} ${!done.length?'disabled':''}/>${t('selectAll')}</label><span>${t('selected')} ${selected.length} / ${done.length}</span><button type="button" id="batch-delete-selected" class="text-button batch-delete-selected" data-action="batch-remove-selected" ${!selected.length||selected.some(isWorking)?'disabled':''}>${icon('trash-2')}${t('deleteBatchSelected')}</button><span class="batch-progress">${t('completed')} ${done.length} / ${drafts.length}</span></div>
  <div class="batch-grid">${drafts.map(batchCard).join('')}${drafts.length<BATCH_LIMIT?`<button type="button" class="batch-add-card" data-action="batch-add" aria-label="${t('addBatchItem')}"><span class="batch-add-icon">${icon('plus')}</span><span>${t('addBatchItem')}</span></button>`:''}</div></section>`;
}
function syncBatchActiveUI(scrollTo?:'draft'|'result'){
  document.querySelectorAll<HTMLElement>('.batch-nav-item').forEach(row=>{const active=row.dataset.batchDraft===activeBatchDraftId;row.classList.toggle('is-linked-active',active);row.setAttribute('aria-current',String(active));});
  document.querySelectorAll<HTMLElement>('[data-batch-card]').forEach(card=>{const active=card.dataset.batchCard===activeBatchDraftId;card.classList.toggle('is-linked-active',active);card.querySelector('.batch-thumb')?.setAttribute('aria-pressed',String(active));});
  if(!activeBatchDraftId)return;
  const target=scrollTo==='draft'?document.querySelector<HTMLElement>(`.batch-nav-item[data-batch-draft="${activeBatchDraftId}"]`):scrollTo==='result'?document.querySelector<HTMLElement>(`[data-batch-card="${activeBatchDraftId}"]`):null;
  target?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
}
function activateBatchDraft(id:string,focusCard=false){
  if(!batchDrafts().some(draft=>draft.id===id))return;
  activeBatchDraftId=id;syncBatchActiveUI(focusCard?'result':'draft');
  const row=document.querySelector<HTMLElement>(`.batch-nav-item[data-batch-draft="${id}"]`),list=row?.parentElement;
  if(row&&list){const r=row.getBoundingClientRect(),l=list.getBoundingClientRect();if(r.top<l.top)list.scrollTop-=l.top-r.top+3;else if(r.bottom>l.bottom)list.scrollTop+=r.bottom-l.bottom+3;}
  if(focusCard)document.getElementById(`batch-name-${id}`)?.focus({preventScroll:true});
}
function updateBatchSelectionUI(){const done=state.batch.filter(item=>item.candidate),selected=done.filter(item=>item.selected),selectAll=document.getElementById('select-all') as HTMLInputElement|null;if(selectAll){selectAll.checked=done.length>0&&done.every(item=>item.selected);selectAll.indeterminate=done.some(item=>item.selected)&&!done.every(item=>item.selected);selectAll.disabled=!done.length;}document.querySelectorAll<HTMLInputElement>('[data-select]').forEach(input=>{const item=state.batch.find(item=>item.id===input.dataset.select);if(!item)return;input.checked=item.selected;input.closest('.batch-card')?.classList.toggle('selected',item.selected);});const count=document.querySelector<HTMLElement>('.batch-select>span:not(.batch-progress)');if(count)count.textContent=`${t('selected')} ${selected.length} / ${done.length}`;const exportButton=document.getElementById('download-options-batch') as HTMLButtonElement|null;if(exportButton){exportButton.disabled=!selected.length||exporting;const pill=exportButton.querySelector('.count-pill');if(pill)pill.textContent=String(selected.length);}const deleteButton=document.getElementById('batch-delete-selected') as HTMLButtonElement|null;if(deleteButton){const busy=selected.some(isWorking);deleteButton.disabled=!selected.length||busy;deleteButton.title=t(busy?'deleteBatchBusy':'deleteBatchSelected');}syncBatchActiveUI();}
function sizeBatchGrid(restoreScrollTop?:number){
  const grid=document.querySelector<HTMLElement>('.batch-grid');if(!grid)return;
  const cards=[...grid.children] as HTMLElement[],saved=restoreScrollTop??batchGridScrollTop;
  grid.style.maxHeight='';grid.classList.toggle('is-scrollable',cards.length>6);
  if(cards.length<=6){batchGridScrollTop=0;return;}
  const rect=grid.getBoundingClientRect(),last=cards[5].getBoundingClientRect();
  grid.style.maxHeight=`${Math.ceil(last.bottom-rect.top+grid.scrollTop+3)}px`;
  grid.scrollTop=saved;
}
function render(){const focus=document.activeElement as HTMLInputElement|null;const focusId=focus?.id;const selection=focus?.tagName==='INPUT'||focus?.tagName==='TEXTAREA'?focus.selectionStart:null;const scrollY=window.scrollY,batchScrollTop=batchGridScrollTop;
document.documentElement.lang=locale==='zh'?'zh-CN':'en';document.body.classList.toggle('embedded',bridge.embedded);document.body.classList.toggle('batch-editor-open',!!editingId);
if(!editingId||!document.querySelector('main .batch-panel'))app.innerHTML=`<header class="app-header"><a href="#" class="brand" data-action="work"><span class="brand-mark"><b></b><b></b><b></b><b></b></span><span>${t('title')}<small>CATEGORY ICON STUDIO</small></span></a><div class="header-actions">${!bridge.embedded?`<button class="language-button" data-action="language" aria-label="${locale==='zh'?'Switch to English':'切换为中文'}">${locale==='zh'?'EN':'中文'}</button>`:''}<button class="avatar" data-action="account" aria-label="${t('account')}">Z</button></div></header>
<main><div class="prototype-notice"><button class="icon-button" data-action="account" aria-label="${t('account')}">${icon('circle-help')}</button></div><div class="workspace ${state.mode==='batch'?'batch-workspace':''}">${state.mode==='batch'?`<div class="batch-input-column">${form()}<section class="batch-background-panel" aria-label="${t('background')}">${backgroundControls(state.batchSettings,'batch')}</section></div>`:form()}${state.mode==='single'?resultPanel(state.single):batchPanel()}</div></main><div id="batch-editor-root"></div><div id="modal-root"></div>`;
renderBatchEditor();createIcons({icons,attrs:{'stroke-width':1.7}});renderModal();setupCandidateCarousels();void drawAll(++renderVersion);
updateBatchSelectionUI();
if(focusId){const next=document.getElementById(focusId) as HTMLInputElement|null;if(next&&(!editingId||next.closest('dialog'))){next.focus({preventScroll:true});try{if(selection!==null)next.setSelectionRange(selection,selection);}catch{}}}window.scrollTo(0,scrollY);requestAnimationFrame(()=>{sizeBatchGrid(batchScrollTop);syncBatchActiveUI();});
}

function settingsCards(){
  const profiles=service?.profiles??[];
  const site=profiles.find(profile=>profile.managed);
  return [...profiles.filter(profile=>!profile.managed),...(site?[{...site,id:'site-jimeng',label:t('siteConnectionTitle')}]:[])];
}
function hostedServiceHelp(){
 const status=(configured:boolean|undefined)=>t(configured?'managedConfigured':'managedUnchecked');
 const guide=`${import.meta.env.BASE_URL}api-maintenance.html`;
 return `<section class="model-settings-group"><h3>${t('generationModelsGroup')}</h3><div class="model-config-card"><div class="model-card-header"><div class="model-card-name"><strong>${t('siteConnectionTitle')} · Lite / Pro</strong></div><button class="button secondary model-edit-button" data-action="site-connection" data-operation="check">${t('checkConnection')}</button></div><div class="site-profile-info"><p id="site-connection-status" role="status">${status(service?.configured)}</p><p>${t('hostedGenerationHint')}</p></div></div></section>
 <section class="model-settings-group"><h3>${t('cutoutModelsGroup')}</h3><div class="model-card-list"><section class="model-config-card"><div class="model-card-header"><div class="model-card-name"><strong>${t('imagexTitle')} · ${t('primaryService')}</strong></div><button class="button secondary model-edit-button" data-action="imagex-check">${t('imagexCheck')}</button></div><div class="site-profile-info"><p id="imagex-status" role="status">${status(imagexSettings.configured)}</p></div></section><section class="model-config-card"><div class="model-card-header"><div class="model-card-name"><strong>${t('koukoutuTitle')} · ${t('backupService')}</strong></div><button class="button secondary model-edit-button" data-action="koukoutu-check">${t('koukoutuCheck')}</button></div><div class="site-profile-info"><p id="koukoutu-status" role="status">${status(cutoutConfig.koukoutu.configured)}</p></div></section></div><p class="helper">${t('hostedCutoutHint')}</p></section>
 <section class="model-settings-group"><h3>${t('apiHandoffTitle')}</h3><div class="info-box"><p>${t('apiHandoffHint')}</p></div><a class="button secondary" href="${esc(guide)}" target="_blank" rel="noopener noreferrer">${icon('arrow-up-right')}${t('openApiGuide')}</a><p class="helper">${t('hostedReadOnlyHint')}</p></section>`;
}
function modelProfileEditor(profile?:NonNullable<ServiceConfig['profiles']>[number]){return `<form id="service-settings-form"><div class="profile-editor-heading"><strong>${esc(profile?.label??t('addModel'))}</strong>${profile?.model!==profile?.label?`<span>${esc(profile?.model??'')}</span>`:''}</div><div class="field"><label for="service-key">API Key</label><input id="service-key" type="password" autocomplete="off" spellcheck="false" maxlength="1024" placeholder="${t(profile?.configured?'keepKey':'enterKey')}"/><p class="helper">${t('keyStorageHint')}</p></div><details class="service-advanced" ${!profile?'open':''}><summary>${t('customSettings')}</summary><div class="field"><label for="service-label">${t('profileLabel')}</label><input id="service-label" required maxlength="80" value="${esc(profile?.label??'')}" placeholder="${t('profileLabelPlaceholder')}"/></div><div class="field"><label for="service-base">${t('apiBase')}</label><input id="service-base" type="url" required value="${esc(profile?.baseUrl??'https://api.openai.com/v1')}" maxlength="500"/><p class="helper">${t('apiCompatibility')}</p></div><div class="field"><label for="service-model">${t('model')}</label><input id="service-model" required value="${esc(profile?.model??'gpt-image-2.5-sunburst')}" maxlength="120" spellcheck="false"/></div></details><div class="profile-protocol"><span>${t('imageProtocol')}</span><span>OpenAI Images</span></div><p id="settings-error" class="settings-error" role="alert"></p><div class="profile-save-actions"><button type="button" class="button secondary" data-action="collapse-model">${t('cancelEdit')}</button><button id="save-service-settings" type="submit" class="button primary wide">${t('saveModelConfig')}</button></div></form>`;}
function cutoutProviderPanel(){return `<div class="field"><label for="cutout-provider">${t('autoCutoutProvider')}</label><select id="cutout-provider"><option value="koukoutu" ${cutoutConfig.provider==='koukoutu'?'selected':''}>${t('koukoutuTitle')}</option><option value="imagex" ${cutoutConfig.provider==='imagex'?'selected':''}>veImageX</option><option value="local" ${cutoutConfig.provider==='local'?'selected':''}>${t('localCutoutProvider')}</option></select><button class="button secondary" data-action="cutout-select">${t('saveSession')}</button><p class="helper" id="cutout-provider-status" role="status">${t(cutoutConfig.provider==='imagex'&&cutoutConfig.fallbackProvider==='koukoutu'?'cutoutFallbackActive':'cutoutProviderHint')}</p></div>`;}
function koukoutuPanel(){return `<section class="model-config-card imagex-settings"><div class="model-card-header"><div class="model-card-name"><strong>${t('koukoutuTitle')}</strong><span class="model-status-dot ${cutoutConfig.koukoutu.configured?'configured':''}" role="img" aria-label="${t(cutoutConfig.koukoutu.configured?'keyConfigured':'keyNotConfigured')}"></span></div><button class="button secondary model-edit-button" data-action="koukoutu-toggle" aria-expanded="${koukoutuExpanded}" aria-controls="koukoutu-settings-body">${t('edit')}</button></div><div id="koukoutu-settings-body" ${koukoutuExpanded?'':'hidden'}><p class="helper">${t('koukoutuHint')}</p><div class="field"><label for="koukoutu-key">API Key</label><input type="password" id="koukoutu-key" autocomplete="off" placeholder="${t(cutoutConfig.koukoutu.configured?'keepKey':'enterKey')}"/></div><p class="helper" id="koukoutu-status" role="status">${t(cutoutConfig.koukoutu.configured?'keyConfigured':'keyNotConfigured')}</p><div class="site-connection-actions"><button class="button secondary" data-action="koukoutu-save">${t('saveSession')}</button><button class="button secondary" data-action="koukoutu-check">${t('koukoutuCheck')}</button><button class="button primary" data-action="koukoutu-test">${t('imagexTest')}</button></div><p class="helper">${t('koukoutuTestHint')}</p></div></section>`;}
function imagexPanel(){return `<section class="model-config-card imagex-settings"><div class="model-card-header"><div class="model-card-name"><strong>${t('imagexTitle')}</strong><span class="model-status-dot ${imagexSettings.configured?'configured':''}" role="img" aria-label="${t(imagexSettings.configured?'keyConfigured':'keyNotConfigured')}"></span></div><button class="button secondary model-edit-button" data-action="imagex-toggle" aria-expanded="${imagexExpanded}" aria-controls="imagex-settings-body">${t('edit')}</button></div><div id="imagex-settings-body" ${imagexExpanded?'':'hidden'}><p class="helper">${t('imagexHint')}</p><div class="field"><label for="imagex-service">Service ID</label><input id="imagex-service" value="${esc(imagexSettings.serviceId)}"/></div><div class="field"><label for="imagex-ak">Access Key ID (AK)</label><input type="password" id="imagex-ak" autocomplete="off" placeholder="${t(imagexSettings.configured?'keepKey':'enterImagexAK')}"/></div><div class="field"><label for="imagex-sk">Secret Access Key (SK)</label><input type="password" id="imagex-sk" autocomplete="off" placeholder="${t(imagexSettings.configured?'keepKey':'enterImagexSK')}"/></div><div class="field"><label for="imagex-domain">${t('imagexDomain')}</label><input id="imagex-domain" value="${esc(imagexSettings.domain)}" placeholder="${t('imagexDomainAuto')}"/></div><div class="field"><label for="imagex-model">${t('cutoutModel')}</label><select id="imagex-model"><option value="productv2" ${imagexSettings.model==='productv2'?'selected':''}>${t('imagexProduct2')}</option><option value="product" ${imagexSettings.model==='product'?'selected':''}>${t('imagexProduct1')}</option></select></div><label class="check-label"><input type="checkbox" id="imagex-auto" ${imagexSettings.automatic?'checked':''}/>${t('imagexAuto')}</label><p id="imagex-status" role="status" class="helper">${t(imagexSettings.configured?'keyConfigured':'keyNotConfigured')}</p><div class="site-connection-actions"><button class="button secondary" data-action="imagex-save">${t('saveSession')}</button><button class="button secondary" data-action="imagex-check">${t('imagexCheck')}</button><button class="button primary" data-action="imagex-test">${t('imagexTest')}</button></div><p class="helper">${t('imagexTestHint')}</p></div></section>`;}
function mockupCanvas(item:Item|undefined,sampleId:string,index:number){return `<canvas data-mockup-canvas="${index}" ${item?`data-mockup-item="${item.id}"`:`data-mockup-sample="${sampleId}"`} width="120" height="120"></canvas>`;}
function mockupPreview(){
  const template=mockupTemplates[0],single=singleContext(),selected=single?current().candidate?[current()]:[]:chosen();
  const cells=single?template.slots.map((slot,index)=>({item:index===0?selected[0]:undefined,sampleId:slot.sampleId})):selected.map(item=>({item,sampleId:''}));
  const row=template.row,position=`left:${row.x*100}%;top:${row.y*100}%;width:${row.width*100}%;height:${row.height*100}%`;
  const content=cells.length?`<div class="mockup-category-scroll" style="${position}" tabindex="0" role="region" aria-label="${t('mockupBatchScroll')}"><div class="mockup-category-track">${cells.map(({item,sampleId},index)=>`<div class="mockup-scroll-item"><span class="mockup-scroll-image">${mockupCanvas(item,sampleId,index)}</span><span class="mockup-scroll-label">${esc(item?.candidate?.name??getSampleLabel(sampleId))}</span></div>`).join('')}</div></div>`:`<div class="mockup-category-empty" style="${position}">${icon('check')}${t('mockupSelectPrompt')}</div>`;
  return `<div class="mockup-viewer"><button class="icon-button mockup-close" data-action="close-modal" aria-label="${t('close')}">${icon('x')}</button><div class="mockup-display"><div class="phone-window full-page"><div class="phone-shot" style="aspect-ratio:${template.naturalWidth}/${template.naturalHeight}"><img class="phone-background" src="${template.sourceUrl}" alt="${t('mockup')}"/>${content}</div></div></div><div class="mockup-save-actions"><a id="mockup-download" class="button secondary" role="button" tabindex="0" aria-disabled="true">${t('saveMockup')}</a></div></div>`;
}
function getSampleLabel(id:string){return samples.find(sample=>sample.id===id)?.name.en??'';}
async function prepareMockupDownload(){
  const revision=++mockupSaveRevision;
  const shot=document.querySelector<HTMLElement>('.phone-shot');
  const link=document.querySelector<HTMLAnchorElement>('#mockup-download');
  if(!shot||!link||!shot.querySelector('.mockup-category-scroll'))return;
  link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.textContent=t('preparingMockup');
  try{
    await mockupPainting;
    if(revision!==mockupSaveRevision||!shot.isConnected)return;
    const blob=await exportMockup(shot);
    if(revision!==mockupSaveRevision||!shot.isConnected||!link.isConnected)return;
    const filename=`icon-mockup_${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
    if(mockupDownloadUrl)URL.revokeObjectURL(mockupDownloadUrl);
    mockupDownloadUrl=URL.createObjectURL(blob);
    mockupDownloadBlob=blob;
    link.href=mockupDownloadUrl;link.download=filename;link.setAttribute('aria-disabled','false');link.textContent=t('saveMockup');
  }catch{if(revision===mockupSaveRevision&&link.isConnected){link.textContent=t('retryMockup');link.setAttribute('aria-disabled','false');}}
}
function scheduleMockupDownload(){
  mockupSaveRevision++;clearTimeout(mockupPrepareTimer);
  const link=document.querySelector<HTMLAnchorElement>('#mockup-download');
  if(!link)return;
  link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.textContent=t('preparingMockup');
  mockupPrepareTimer=setTimeout(()=>{void prepareMockupDownload();},160);
}
async function savePreparedMockup(event:MouseEvent,link:HTMLAnchorElement){
  if(mockupSaveInProgress){event.preventDefault();return;}
  if(!link.hasAttribute('href')||!mockupDownloadBlob){
    event.preventDefault();
    if(link.getAttribute('aria-disabled')!=='true')void prepareMockupDownload();
    return;
  }
  type SaveHandle={createWritable():Promise<{write(blob:Blob):Promise<void>;close():Promise<void>}>};
  const picker=(window as Window&{showSaveFilePicker?:(options:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[]})=>Promise<SaveHandle>}).showSaveFilePicker;
  // Browsers without the file picker retain the prepared native download link.
  if(!picker)return;
  event.preventDefault();
  const blob=mockupDownloadBlob,filename=link.download;
  mockupSaveInProgress=true;
  try{
    // Invoke during the user's click, before awaiting anything, to preserve activation.
    const handle=await picker.call(window,{suggestedName:filename,types:[{description:'PNG image',accept:{'image/png':['.png']}}]});
    const writable=await handle.createWritable();await writable.write(blob);await writable.close();
    toast('mockupSaved');
  }catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))toast('mockupSaveFailed',true);}
  finally{mockupSaveInProgress=false;}
}
function setupMockupScroller(){const scroller=document.querySelector<HTMLElement>('.mockup-category-scroll');if(!scroller)return;scroller.addEventListener('scroll',scheduleMockupDownload,{passive:true});let pointer=-1,startX=0,startScroll=0,dragging=false;scroller.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0)return;pointer=event.pointerId;startX=event.clientX;startScroll=scroller.scrollLeft;dragging=false;});scroller.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;const distance=event.clientX-startX;if(Math.abs(distance)>4&&!dragging){dragging=true;scroller.setPointerCapture(pointer);scroller.classList.add('is-dragging');}if(dragging){event.preventDefault();scroller.scrollLeft=startScroll-distance;}});const finish=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;if(scroller.hasPointerCapture(pointer))scroller.releasePointerCapture(pointer);pointer=-1;scroller.classList.remove('is-dragging');};scroller.addEventListener('pointerup',finish);scroller.addEventListener('pointercancel',finish);scroller.addEventListener('wheel',event=>{if(scroller.scrollWidth<=scroller.clientWidth||Math.abs(event.deltaX)>=Math.abs(event.deltaY))return;event.preventDefault();scroller.scrollLeft+=event.deltaY;},{passive:false});}
function renderModal(){
if(modal==='settings'&&!canOpenServiceHelp())modal='';
// This preference is separate from drafts so another open tab cannot reset it.
try{if(localStorage.getItem('icon-studio-candidate-limit-seen')==='1'){state.candidateLimitNoticeShown=true;state.candidateLimitNoticePending=false;}}catch{}
if(!modal&&consumeCandidateLimitNotice(state)){modal='candidate-limit';try{localStorage.setItem('icon-studio-candidate-limit-seen','1');}catch{}persist();}mockupResizeObserver?.disconnect();mockupResizeObserver=undefined;const mount=document.getElementById('modal-root')!;if(!modal){mount.innerHTML='';return;}
let body='',title='',sub='';
if(modal==='export'){title=t('exportTitle');sub=!singleContext()?`${t('selected')} ${exportItems().length} ${t('count')}`:current().candidate?.name??'';body=`${singleContext()?field('fileName',`<input id="export-name" value="${esc(current().candidate?.name??current().name)}" maxlength="120"/><p class="helper">${t('exportNameHint')}</p>`):''}<div class="field"><label>${t('exportSize')}</label><div class="export-choices">${[120,400].map(size=>`<label class="choice-card ${exportSizes.includes(size as 120|400)?'selected':''}"><input type="checkbox" data-export-size="${size}" ${exportSizes.includes(size as 120|400)?'checked':''}/><strong>${size} × ${size}</strong><span>PX</span></label>`).join('')}</div></div><div class="field"><label>${t('exportFormat')}</label><div class="format-choices">${(['jpeg','png','transparent'] as const).map(kind=>`<label class="format-choice ${exportKinds.includes(kind)?'selected':''}"><input type="checkbox" data-export-kind="${kind}" ${exportKinds.includes(kind)?'checked':''}/><span>${t(kind==='jpeg'?'jpg':kind==='png'?'png':'alpha')}</span>${icon('check')}</label>`).join('')}</div></div><p class="helper">${t('exportHint')}</p><button class="button primary wide" data-action="confirm-export" ${!exportSizes.length||!exportKinds.length||exporting?'disabled':''}>${icon(exporting?'loader-circle':'arrow-down-to-line',exporting?'spin':'')}${t(exporting?'exporting':'exportNow')}<span class="count-pill">${exportSizes.length*exportKinds.length*exportItems().length} ${t('fileCount')}</span></button>`;}
if(modal==='mockup')body=mockupPreview();
if(modal==='candidate-limit'){title=t('candidateLimitTitle');sub='';body=`<div class="info-box">${icon('history')}<p>${t('candidateLimitBody')}</p></div><p class="helper candidate-limit-note">${t('candidateLimitOnce')}</p><button class="button primary wide" data-action="close-modal">${t('gotIt')}</button>`;}
if(modal==='confirm-batch-delete'){
 const drafts=batchDrafts().filter(draft=>pendingBatchDeleteIds.includes(draft.id));
 if(!drafts.length){modal='';mount.innerHTML='';return;}
 const multiple=drafts.length>1,hasResult=state.batch.some(item=>item.batchDraftId&&pendingBatchDeleteIds.includes(item.batchDraftId)&&item.candidate);
 title=multiple?t('deleteBatchSelectedTitle').replace('{count}',String(drafts.length)):t('deleteBatchTitle');sub='';
 body=`<div class="delete-confirm"><div class="delete-confirm-icon">${icon('trash-2')}</div><p>${t('deleteBatchPrompt')}</p>${multiple?`<ul class="batch-delete-names">${drafts.map(draft=>`<li title="${esc(draft.name.trim()||t('unnamedCategory'))}">${esc(draft.name.trim()||t('unnamedCategory'))}</li>`).join('')}</ul>`:`<strong>“${esc(drafts[0].name.trim()||t('unnamedCategory'))}”</strong>`}<small>${t(multiple?'deleteBatchSelectedNote':hasResult?'deleteBatchResultNote':'deleteBatchDraftNote')}</small></div><div class="delete-confirm-actions"><button class="button secondary" data-action="close-modal" autofocus>${t('keepBatchItem')}</button><button class="button danger" data-action="confirm-batch-remove">${icon('trash-2')}${t('confirmDeleteBatchItem')}</button></div>`;
}
if(modal==='confirm-candidate-delete'){const candidates=getCandidates(current()),candidate=candidates.find(candidate=>candidate.id===pendingCandidateDeleteId),version=candidates.findIndex(candidate=>candidate.id===pendingCandidateDeleteId)+1;if(!candidate||candidates.length<=1){modal='';mount.innerHTML='';return;}title=t('deleteCandidateTitle');sub='';body=`<div class="delete-confirm"><div class="delete-confirm-icon">${icon('x')}</div><p>${t('deleteCandidatePrompt')}</p><strong>“${esc(candidate.name)} · ${t('version')} ${version}”</strong><small>${t('deleteCandidateNote')}</small></div><div class="delete-confirm-actions"><button class="button secondary" data-action="close-modal" autofocus>${t('keepBatchItem')}</button><button class="button danger" data-action="confirm-candidate-delete">${icon('trash-2')}${t('confirmDeleteBatchItem')}</button></div>`;}
if(modal==='confirm-batch-generate'){
 const changes=buildBatchGenerationPlan(),allPlan=buildBatchGenerationPlan(true),all=pendingBatchGenerationMode==='all',plan=all?allPlan:changes,unchanged=Math.max(0,allPlan.length-plan.length);
 title=t(all?'confirmBatchAllTitle':'confirmBatchChangesTitle');sub='';
 body=`<div class="batch-generation-confirm">
   <p>${t(all?'confirmBatchAllBody':'confirmBatchChangesBody')}</p>
   <div class="batch-generation-counts"><span><strong>${plan.length}</strong>${t('batchChangedCount')}</span><span><strong>${unchanged}</strong>${t('batchUnchangedCount')}</span></div>
   <section class="batch-generation-list" aria-labelledby="batch-generation-list-title"><h3 id="batch-generation-list-title">${t('batchGenerationNames')}</h3><ul class="batch-generation-names">${plan.map(entry=>`<li title="${esc(entry.draft.name.trim())}">${esc(entry.draft.name.trim())}</li>`).join('')}</ul></section>
 </div><div class="delete-confirm-actions batch-generation-actions ${all&&!changes.length?'single-action':''}">${!all?`<button type="button" class="button danger" data-action="batch-generation-scope" data-scope="all">${icon('refresh-cw')}${t('confirmRegenerateAll')}</button>`:changes.length?`<button type="button" class="button secondary" data-action="batch-generation-scope" data-scope="changes">${t('batchReturnToChanges')}</button>`:''}<button type="button" class="button ${all?'danger':'primary'}" data-action="confirm-batch-generate" ${!plan.length?'disabled':''}>${icon(all?'refresh-cw':'sparkles')}${t(all?'batchConfirmAll':'confirmGenerateChanges')}</button></div>`;
}
if(modal==='settings'&&usesDirectSiteApi()){title=t('serviceHelp');sub=t('hostedHelpSubtitle');body=hostedServiceHelp();}
else if(modal==='settings'){title=t('modelsTitle');sub=t('modelGroupsHint');body=`<section class="model-settings-group" aria-labelledby="generation-models-heading"><h3 id="generation-models-heading">${t('generationModelsGroup')}</h3><div class="model-card-list">${settingsCards().map(profile=>`<section class="model-config-card ${settingsProfileId===profile.id?'is-expanded':''}"><div class="model-card-header"><div class="model-card-name"><strong>${esc(profile.label)}</strong>${!profile.managed&&profile.id!==service?.defaultProfileId?`<span class="custom-badge">${t('customConfig')}</span>`:''}<span class="model-status-dot ${profile.managed?'managed':profile.configured?'configured':''}" role="img" aria-label="${t(profile.managed?'siteService':profile.configured?'keyConfigured':'keyNotConfigured')}" title="${t(profile.managed?'siteService':profile.configured?'keyConfigured':'keyNotConfigured')}"></span></div><div class="model-card-actions"><button class="button secondary model-edit-button" data-action="edit-model" data-id="${esc(profile.id)}" aria-expanded="${settingsProfileId===profile.id}">${t('edit')}</button>${!profile.managed&&profile.id!==service?.defaultProfileId?`<button class="text-button model-delete-button" data-action="delete-model" data-id="${esc(profile.id)}">${t('deleteConfig')}</button>`:''}</div></div>${settingsProfileId===profile.id?(profile.managed?`<div class="site-profile-info"><strong>${t('jimengConnection')}</strong><p id="site-connection-status" role="status">${t(service?.siteConnection?.checkedAt?'siteChecked':service?.siteConnection?.saved?'siteSaved':'siteNotSaved')}</p><input id="site-session" aria-label="Jimeng sessionid" type="password" autocomplete="off" placeholder="${t(service?.siteConnection?.saved?'keepKey':'siteSessionPlaceholder')}"/><div class="site-connection-actions"><button class="button secondary" data-action="site-connection" data-operation="save">${t('saveSession')}</button><button class="button secondary" data-action="site-connection" data-operation="fetch">${t('fetchSession')}</button><button class="button primary" data-action="site-connection" data-operation="check">${t('checkConnection')}</button></div><p>${t('siteConnectionInstructions')}</p><p>${t('siteServiceHint')}</p><p>${t('siteCutoutHint')}</p><button class="button primary" data-action="select-site-model" data-id="${profile.id}">${t('useSiteConnection')}</button><p class="site-model-note">${t('siteSharedModels')}</p></div>`:modelProfileEditor(profile)):''}</section>`).join('')??''}${settingsProfileId===''?`<section class="model-config-card is-expanded"><div class="model-card-header"><strong>${t('addModel')}</strong></div>${modelProfileEditor()}</section>`:''}</div><div class="model-list-footer"><button class="button secondary" data-action="add-model">${icon('plus')}${t('addModel')}</button>${settingsRemovedId?`<button class="text-button" data-action="restore-model">${t('undoDelete')}</button>`:''}<span>${t('statusDotHint')}</span></div></section><section class="model-settings-group" aria-labelledby="cutout-models-heading"><h3 id="cutout-models-heading">${t('cutoutModelsGroup')}</h3>${cutoutProviderPanel()}<div class="model-card-list">${koukoutuPanel()}${imagexPanel()}</div></section>`;}

if(modal==='account'){title=t('account');sub=t('prototype');body=`<div class="account-art">${icon('user-round')}</div><p>${t('accountHint')}</p><div class="info-box">${icon('clock-3')}<p>${t('limitHint')}</p></div>`;}
mount.innerHTML=`<dialog class="modal ${modal==='settings'?'model-settings-modal':''} ${modal==='mockup'?'mockup-modal is-full-page':''}" ${modal==='mockup'?`aria-label="${t('mockup')}"`:'aria-labelledby="modal-title"'}>${modal==='mockup'?'':`<div class="modal-header"><div><h2 id="modal-title">${title}</h2><p>${esc(sub)}</p></div><button class="icon-button" data-action="close-modal" aria-label="${t('close')}">${icon('x')}</button></div>`}<div class="modal-body">${body}</div></dialog>`;
const dialog=mount.querySelector('dialog')!;dialog.addEventListener('cancel',()=>{modal='';queueMicrotask(()=>renderModal());});dialog.addEventListener('click',e=>{if(e.target===dialog){modal='';dialog.close();renderModal();}});dialog.showModal();createIcons({icons,attrs:{'stroke-width':1.7}});mockupPainting=drawModal();if(modal==='mockup'){fitFullMockup();setupMockupScroller();const link=mount.querySelector<HTMLAnchorElement>('#mockup-download');if(link)link.onclick=event=>{void savePreparedMockup(event,link);};scheduleMockupDownload();const display=mount.querySelector('.mockup-display');if(display){mockupResizeObserver=new ResizeObserver(()=>{fitFullMockup();scheduleMockupDownload();});mockupResizeObserver.observe(display);}}}

/** Fit the complete screenshot, including overlays, inside the available preview area. */
function fitFullMockup(){
  const display=document.querySelector<HTMLElement>('.is-full-page .mockup-display');
  const phone=display?.querySelector<HTMLElement>('.phone-window.full-page');
  if(!display||!phone)return;
  const template=mockupTemplates[0];
  const style=getComputedStyle(display),frame=getComputedStyle(phone);
  const paddingX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
  const paddingY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
  const borderX=parseFloat(frame.borderLeftWidth)+parseFloat(frame.borderRightWidth);
  const borderY=parseFloat(frame.borderTopWidth)+parseFloat(frame.borderBottomWidth);
  const width=Math.max(1,Math.floor(Math.min(390-borderX,
    display.clientWidth-paddingX-borderX,
    (display.clientHeight-paddingY-borderY)*template.naturalWidth/template.naturalHeight)));
  phone.style.width=`${width+borderX}px`;
  phone.style.borderRadius=`${width/template.naturalWidth*64}px`;
  phone.style.setProperty('--mockup-label-size',`${width/318*10}px`);
  phone.style.setProperty('--mockup-unit',`${width/template.naturalWidth}px`);
}

const paintVersions = new WeakMap<HTMLCanvasElement, number>();
async function paint(target:HTMLCanvasElement|null,source:string,s:ImageSettings,strokes:MaskStroke[]=[]){
  if(!target)return;
  const version=(paintVersions.get(target)??0)+1;
  paintVersions.set(target,version);
  const isLatest=()=>target.isConnected&&paintVersions.get(target)===version;
  try{
    const rendered=await renderIcon(source,clone(s),clone(strokes));
    if(!isLatest())return;
    target.width=rendered.width;target.height=rendered.height;
    target.getContext('2d')!.drawImage(rendered,0,0);
  }catch{if(isLatest())target.getContext('2d')?.clearRect(0,0,target.width,target.height);}
}
async function drawAll(version:number){
  const item=current();
  const candidate=item.candidate?clone(item.candidate):undefined;
  const settings=clone(item.settings);
  const source=candidate?.source??item.rawGeneratedSource??sampleSources.get(DEFAULT_SAMPLE_ID);
  if(source){
    await paint(document.querySelector('#main-canvas'),source,{...settings,size:400},candidate?.strokes??[]);
    if(version!==renderVersion)return;
  }
  const candidates=getCandidates(item);
  await Promise.all([
    ...[...document.querySelectorAll<HTMLCanvasElement>('[data-candidate-canvas]')].map(async canvas=>{
      const c=candidates.find(c=>c.id===canvas.dataset.candidateCanvas);
      if(c)await paint(canvas,c.source,{...c.settings,size:120},c.strokes);
    }),
    ...[...document.querySelectorAll<HTMLCanvasElement>('[data-item-canvas]')].map(async canvas=>{
      const i=state.batch.find(i=>i.id===canvas.dataset.itemCanvas);
      if(i?.candidate||i?.rawGeneratedSource)await paint(canvas,i.candidate?.source??i.rawGeneratedSource!,{...i.settings,size:400},i.candidate?.strokes??[]);
    }),
    ...[...document.querySelectorAll<HTMLCanvasElement>('[data-history-canvas]')].map(async canvas=>{
      const i=state.history.find(i=>i.id===canvas.dataset.historyCanvas);
      if(i?.candidate||i?.rawGeneratedSource)await paint(canvas,i.candidate?.source??i.rawGeneratedSource!,{...i.settings,size:400},i.candidate?.strokes??[]);
    })
  ]);

}
async function drawModal(){if(modal==='mockup'){await Promise.all([...document.querySelectorAll<HTMLCanvasElement>('[data-mockup-canvas]')].map(async canvas=>{const itemId=canvas.dataset.mockupItem,item=[state.single,...state.batch].find(item=>item.id===itemId),sampleId=canvas.dataset.mockupSample;const source=item?.candidate?.source??(sampleId?await getSample(sampleId):undefined);if(source)await paint(canvas,source,item?{...item.settings,size:120}:{...defaults(),transparent:true,size:120},item?.candidate?.strokes??[]);}));}}

function applySetting(key:keyof ImageSettings,value:string|number|boolean,scope='single'){if(key==='bgColor'||key==='transparent'){applyGlobalBackground(key,value);return;}const items=scope==='batch'?state.batch.filter(i=>i.selected):[current()];if(scope==='batch')(state.batchSettings as unknown as Record<string,unknown>)[key]=value;for(const item of items){(item.settings as unknown as Record<string,unknown>)[key]=value;sync(item);}}
async function readUpload(files:File[]){const item=current();if(isWorking(item)||referenceUploads.has(item.id)){toast('refreshWarn');return;}const existing=referencesFor(item);if(!files.length)return;if(existing.length+files.length>REFERENCE_LIMIT){toast('referenceLimit',true);return;}if(files.some(file=>!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)){toast('invalidUpload',true);return;}
referenceUploads.add(item.id);render();try{const sources=await Promise.all(files.map(async file=>{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});await new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth*image.naturalHeight>25_000_000?reject(Error()):resolve();image.onerror=reject;image.src=data;});return data;}));setReferences(item,[...existing,...sources]);persist();toast('referenceLoaded');}catch{toast('imageError',true);}finally{referenceUploads.delete(item.id);render();}}

function setQueued(item:Item,intent:NonNullable<Item['generationIntent']> = item.candidate?'regenerate':'initial'){if(referenceUploads.has(item.id)){toast('refreshWarn');return;}if(isWorking(item))return;delete item.rawGeneratedSource;delete item.rawGenerationInput;delete item.rawGenerationJobId;item.generationIntent=intent;item.composition='auto';item.status='queued';item.error=undefined;item.attempt++;item.review='draft';item.model=state.batch.includes(item)?BATCH_MODEL_ID:selectedProfile(item.model)?.id??item.model;item.generationJob={id:crypto.randomUUID(),input:generationInput(item),submitted:false};persist();}
function startBatchGeneration(includeUnchanged=false){
  for(const entry of buildBatchGenerationPlan(includeUnchanged)){
    let item=entry.item;
    if(!item){item=fresh();item.model=BATCH_MODEL_ID;item.settings=clone(state.batchSettings);state.batch.push(item);}
    item.batchDraftId=entry.draft.id;item.name=entry.draft.name.trim();item.description=entry.draft.description.trim();item.combineForms=!!entry.draft.combineForms;
    setQueued(item,entry.intent);
  }
  syncBatchNames();pump();render();
}
function pump(){const pending=[state.single,...state.batch].filter(i=>i.status==='queued'&&!activeJobs.has(i.id));while(activeJobs.size<2&&pending.length){const item=pending.shift()!;activeJobs.add(item.id);void runJob(item).finally(()=>{activeJobs.delete(item.id);pump();});}}
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function applyGeneratedResult(item:Item,original:string,input:GenerationInput,jobId:string,generation?:NonNullable<Item['candidate']>['generation']){
 const attempt=item.attempt;
 item.rawGeneratedSource=original;item.rawGenerationInput=input;item.rawGenerationJobId=jobId;item.localProcessing=true;item.status='cutting';delete item.error;persist();render();await delay(30);
 try{
 const result=await prepareSubject(original);if(item.attempt!==attempt||(item.status as string)==='cancelled')return;
 const removed=addCandidate(item,{id:jobId,name:input.name,source:result.source,originalSource:result.processed?original:undefined,processing:result.processed?result.processing:undefined,sourceGenerationJobId:jobId,createdAt:Date.now(),settings:clone(item.settings),strokes:[],provenance:'ai',generation});
 item.lastGeneratedInput=input;queueCandidateLimitNotice(state,removed.length);item.status='ready';item.error=undefined;delete item.generationIntent;
 delete item.rawGeneratedSource;delete item.localCutoutPreview;delete item.rawGenerationInput;delete item.rawGenerationJobId;delete item.localProcessing;
 archive(item);persist();render();
 }catch(error){if(item.attempt===attempt){delete item.localProcessing;item.status='failed';item.error=error instanceof GenerationError?error.code:'localCutoutUnsupported';persist();render();}throw error;}
}
async function resumeLocalProcessing(item:Item){
 if(!item.rawGeneratedSource||isWorking(item))return;
 try{await applyGeneratedResult(item,item.rawGeneratedSource,item.rawGenerationInput??item.generationJob?.input??generationInput(item),item.rawGenerationJobId??item.generationJob?.id??uid());}catch{/* Original and prior candidate remain available for retry. */}
}
async function refreshFailedJob(item:Item){
 const job=item.generationJob;
 if(!job?.submitted||item.rawGeneratedSource||!['failed','unresolved','ready'].includes(item.status))return;
 // A legacy ready status may describe generation only, before cutout was applied.
 const applied=[...item.candidates,...(item.candidate?[item.candidate]:[])].some(candidate=>candidate.id===job.id||candidate.sourceGenerationJobId===job.id);
 if(applied)return;
 try{
  const remote=await getJob(job.id);
  if(remote.status==='ready'&&remote.source){
   item.rawGeneratedSource=remote.source;item.rawGenerationInput=remote.input;item.rawGenerationJobId=job.id;item.status='failed';item.error='generatedNeedsCutout';persist();render();
  }else if(remote.status!==item.status||remote.error!==item.error){item.status=remote.status;item.error=remote.error;persist();render();}
 }catch{/* Read-only recovery never submits another generation. */}
}
async function runJob(item:Item){const attempt=item.attempt,job=item.generationJob;if(!job)return;try{
item.status='generating';persist();render();
let result;
if(job.submitted){result=await getJob(job.id);}else{
  // Persist the receipt ID before POST; refresh must never submit again.
  await serviceConfig(); // Fail before marking submitted if the local service is offline.
  job.submitted=true;await writeState(state);
  result=await submitJob(job.id,{...job.input,model:item.model,composition:item.composition,references:referencesFor(item)});
}
const deadline=Date.now()+20*60_000;
while(result.status==='generating'){
  if(item.attempt!==attempt||(item.status as string)==='cancelled')return;
  if(Date.now()>deadline)throw new GenerationError('resultStillPending',true);
  await delay(2000);try{result=await getJob(job.id);item.error=undefined;}catch(error){if(error instanceof GenerationError&&['localServiceOffline','unknownError','managedImageConnectionLost'].includes(error.code)){item.error='connectionRecovering';persist();render();await delay(3000);continue;}throw error;}
}
if(item.attempt!==attempt||(item.status as string)==='cancelled')return;
if(result.status!=='ready'||!result.source)throw new GenerationError(result.error??'serviceError',result.status==='unresolved');
await applyGeneratedResult(item,result.source,{...result.input,...(job.input.combineForms!==undefined?{combineForms:job.input.combineForms}:{})},job.id,{jobId:job.id,model:result.model,provider:result.provider,promptVersion:result.promptVersion,providerRequestId:result.providerRequestId});
}catch(error){if(item.attempt===attempt){item.status=!item.rawGeneratedSource&&error instanceof GenerationError&&error.uncertain?'unresolved':'failed';item.error=error instanceof GenerationError?error.code:'localJobError';persist();render();}}}
function retryItem(item:Item){if(isWorking(item)||!item.name.trim())return;
if(item.rawGeneratedSource){void resumeLocalProcessing(item);return;}
if(item.status==='unresolved'&&item.generationJob){item.status='queued';pump();render();return;}
setQueued(item);pump();render();}
async function doExport(direct=false){if(exporting)return;const items=clone(exportItems());if(!items.length){toast('noSelection',true);return;}exporting=true;render();try{const assets:ExportAsset[]=[];for(const item of items){const c=item.candidate!;const sizes=direct?[item.settings.size]:exportSizes;const kinds=direct?[item.settings.transparent?'transparent':item.settings.format]:exportKinds;for(const size of sizes)for(const kind of kinds){const s:ImageSettings={...item.settings,size,format:kind==='jpeg'?'jpeg':'png',transparent:kind==='transparent'};const asset=await exportIcon(c.source,s,c.name,c.strokes);if(items.length>1||sizes.length*kinds.length>1)asset.filename=`${size}/${kind==='transparent'?'transparent':kind}/${asset.filename}`;assets.push(asset);}}
const zip=assets.length!==1,blob=zip?await createZip(assets):assets[0].blob,filename=zip?`category-icons_${new Date().toISOString().slice(0,19).replace('T','_').replaceAll(':','-')}.zip`:assets[0].filename;
if(readyExport)URL.revokeObjectURL(readyExport.url);
readyExport={url:URL.createObjectURL(blob),filename,bytes:blob.size,zip};
downloadBlob(blob,filename);modal='';toast('exportSuccess');}catch(error){console.error('Icon export failed',error);toast('exportError',true);}finally{exporting=false;render();}}

document.addEventListener('submit',async event=>{
  const form=event.target as HTMLFormElement;if(form.id!=='service-settings-form')return;event.preventDefault();
  const button=form.querySelector<HTMLButtonElement>('#save-service-settings')!;
  if(button.disabled)return;
  const key=form.querySelector<HTMLInputElement>('#service-key')!,base=form.querySelector<HTMLInputElement>('#service-base')!,model=form.querySelector<HTMLInputElement>('#service-model')!;
  const error=form.querySelector<HTMLElement>('#settings-error')!;
  if([state.single,...state.batch].some(isWorking)){error.textContent=t('settingsBusy');return;}
  button.disabled=true;button.textContent=t('saving');error.textContent='';
  try{service=await saveServiceConfig({id:settingsProfileId||undefined,create:!settingsProfileId,label:form.querySelector<HTMLInputElement>('#service-label')!.value.trim(),key:key.value.trim(),baseUrl:base.value.trim(),model:model.value.trim()});key.value='';if(service.savedProfileId){current().model=service.savedProfileId;persist();}if(modal==='settings'){settingsProfileId='__list__';render();}toast('settingsSaved');}
  catch(e){error.textContent=t(e instanceof GenerationError?e.code:'settingsSaveFailed');button.disabled=false;button.textContent=t('saveModelConfig');}
});

document.addEventListener('click',async event=>{const clicked=event.target as HTMLElement;if(editingBatchDescriptionId&&!clicked.closest('.batch-description-box.is-editing'))finishBatchDescription(editingBatchDescriptionId);if(!clicked.closest('.download-control'))closeDownloadMenu();const target=(event.target as HTMLElement).closest<HTMLElement>('[data-action]');if(!target||target.hasAttribute('disabled'))return;const action=target.dataset.action;event.preventDefault();
switch(action){
case 'mode':if(target.dataset.mode==='batch'&&editingId){returnToBatch();break;}state.mode=target.dataset.mode as 'single'|'batch';editingId=null;persist();render();break;
case 'work':render();break;
case 'language':locale=locale==='zh'?'en':'zh';try{localStorage.setItem('icon-studio-locale',locale);}catch{}render();break;
case 'new':if(isWorking(state.single)){toast('refreshWarn');break;}state.mode='single';editingId=null;state.single=fresh();setItemBackground(state.single,globalBackground());persist();render();break;
case 'sample':{if(isWorking(current())||referenceUploads.has(current().id))break;const sample=samples.find(s=>s.id===target.dataset.id)!;current().name=sample.name[locale];setReferences(current(),[]);persist();render();document.getElementById('category-name')?.focus();break;}
case 'batch-examples':state.batchDrafts=['oranges','bananas','apples-pears','berries','grapes','lemons'].map((id,index)=>freshBatchDraft(samples.find(s=>s.id===id)!.name[locale],'',index===0));syncBatchNames();persist();render();break;
case 'batch-add':{const drafts=batchDrafts();if(drafts.length>=BATCH_LIMIT){toast('overLimit',true);break;}const draft=freshBatchDraft();drafts.push(draft);activeBatchDraftId=draft.id;syncBatchNames();persist();render();requestAnimationFrame(()=>activateBatchDraft(draft.id,true));break;}
case 'batch-remove':{const linked=state.batch.find(item=>item.batchDraftId===target.dataset.id);if(linked&&isWorking(linked)){toast('refreshWarn');break;}pendingBatchDeleteIds=[target.dataset.id!];modal='confirm-batch-delete';renderModal();break;}
case 'batch-remove-selected':{const selected=chosen();if(!selected.length)break;if(selected.some(isWorking)){toast('deleteBatchBusy');break;}pendingBatchDeleteIds=selected.map(item=>item.batchDraftId!).filter(Boolean);modal='confirm-batch-delete';renderModal();break;}
case 'confirm-batch-remove':if(removeConfirmedBatchDrafts()){pendingBatchDeleteIds=[];modal='';render();}else toast('deleteBatchBusy');break;
case 'generate':if(state.mode==='batch'&&!editingId){if(!batchDrafts().some(draft=>draft.name.trim())||state.batch.some(isWorking))break;const changed=buildBatchGenerationPlan();if(state.batch.some(item=>item.candidate)){pendingBatchGenerationMode=changed.length?'changes':'all';modal='confirm-batch-generate';renderModal();}else startBatchGeneration();}else if(current().name.trim()){current().name=current().name.trim();retryItem(current());}break;
case 'batch-generation-scope':{if(modal!=='confirm-batch-generate')break;const scope=target.dataset.scope;if(scope!=='changes'&&scope!=='all')break;if(scope==='changes'&&!buildBatchGenerationPlan().length)break;pendingBatchGenerationMode=scope;renderModal();document.querySelector<HTMLButtonElement>('[data-action="confirm-batch-generate"]')?.focus({preventScroll:true});break;}
case 'confirm-batch-generate':{if(state.batch.some(isWorking)){toast('refreshWarn');break;}const includeUnchanged=pendingBatchGenerationMode==='all';modal='';startBatchGeneration(includeUnchanged);break;}
case 'regenerate':case 'retry-single':retryItem(current());break;
case 'new-attempt':{const item=[state.single,...state.batch].find(i=>i.id===target.dataset.id);if(item&&!isWorking(item)&&item.name.trim()&&confirm(t('confirmRetry'))){setQueued(item);pump();render();}break;}
case 'retry-item':{const i=state.batch.find(i=>i.id===target.dataset.id);if(i){if(i.rawGeneratedSource||i.status==='unresolved')retryItem(i);else if(!isWorking(i)&&i.name.trim()){setQueued(i,i.candidate?'regenerate':'initial');pump();render();}}break;}
case 'cancel-item':{const i=state.batch.find(i=>i.id===target.dataset.id);if(i){i.status='cancelled';i.attempt++;delete i.generationIntent;persist();render();}break;}
case 'remove-ref':if(isWorking(current())||referenceUploads.has(current().id)){toast('refreshWarn');break;}setReferences(current(),referencesFor(current()).filter((_,index)=>index!==Number(target.dataset.index)));persist();render();break;
case 'bg':applySetting('bgColor',target.dataset.color!,target.dataset.scope);render();break;
case 'transparent':{const scope=target.dataset.scope??'single';const value=scope==='batch'?!state.batchSettings.transparent:!current().settings.transparent;applySetting('transparent',value,scope);render();break;}
case 'download-size':{const size=Number(target.dataset.size);if(exporting||![120,400].includes(size))break;closeDownloadMenu(true);applySetting('size',size,target.dataset.scope);void doExport(true);break;}
case 'download-options':{const menu=activeDownloadControl()?.querySelector<HTMLElement>('.download-menu');if(!menu)break;if(!menu.hidden){closeDownloadMenu(true);break;}menu.hidden=false;target.setAttribute('aria-expanded','true');positionDownloadMenu();menu.querySelector<HTMLButtonElement>('[data-action="download-size"]')?.focus({preventScroll:true});break;}
case 'export':{closeDownloadMenu(true);if(!chosen().length&&!editingId){toast('noSelection',true);break;}exportSizes=[editingId||state.mode==='single'?current().settings.size:state.batchSettings.size];const s=editingId||state.mode==='single'?current().settings:state.batchSettings;exportKinds=[s.transparent?'transparent':s.format];modal='export';renderModal();break;}
case 'download-original':{const item=[state.single,...state.batch].find(i=>i.id===target.dataset.id);if(!item?.rawGeneratedSource)break;const source=item.rawGeneratedSource,mime=source.slice(5,source.indexOf(';')),bytes=Uint8Array.from(atob(source.split(',')[1]),c=>c.charCodeAt(0));downloadBlob(new Blob([bytes],{type:mime}),`${item.name.replace(/[\\/:*?"<>|]/g,'_')||'icon'}-original.${mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png'}`);break;}
case 'confirm-export':void doExport();break;
case 'mockup':modal='mockup';renderModal();break;
case 'cutout-select':{
 const status=document.getElementById('cutout-provider-status');target.setAttribute('disabled','');
 try{cutoutConfig=await selectCutoutProvider((document.getElementById('cutout-provider') as HTMLSelectElement).value as CutoutProvider);imagexSettings.automatic=cutoutConfig.provider==='imagex';renderModal();toast('cutoutProviderSaved');}
 catch(error){if(status)status.textContent=t(error instanceof GenerationError?error.code:'koukoutuSettingsFailed');}finally{target.removeAttribute('disabled');}break;}
case 'koukoutu-toggle':koukoutuExpanded=!koukoutuExpanded;document.getElementById('koukoutu-settings-body')!.hidden=!koukoutuExpanded;target.setAttribute('aria-expanded',String(koukoutuExpanded));break;
case 'imagex-toggle':imagexExpanded=!imagexExpanded;document.getElementById('imagex-settings-body')!.hidden=!imagexExpanded;target.setAttribute('aria-expanded',String(imagexExpanded));break;
case 'koukoutu-save':case 'koukoutu-check':case 'koukoutu-test':case 'imagex-save':case 'imagex-check':case 'imagex-test':{
 if(imagexBusy)break;
 const isKoukoutu=action.startsWith('koukoutu-');
 const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-action^="imagex-"],[data-action^="koukoutu-"],[data-action="cutout-select"]')],status=document.getElementById(isKoukoutu?'koukoutu-status':'imagex-status');
 imagexBusy=true;buttons.forEach(b=>b.disabled=true);if(status)status.textContent=t('working');
 try{
 if(action==='koukoutu-save'){
  const input=document.getElementById('koukoutu-key') as HTMLInputElement;cutoutConfig.koukoutu=await saveKoukoutuConfig(input.value.trim());input.value='';if(status)status.textContent=t('koukoutuSaved');
 }else if(action==='koukoutu-check'){
  cutoutConfig.koukoutu=await checkKoukoutu();if(status)status.textContent=`${t('koukoutuChecked')} ${cutoutConfig.koukoutu.credits??0} + ${cutoutConfig.koukoutu.vipCredits??0}`;
 }else if(action==='imagex-save'){
  imagexSettings=await saveImageXSettings({...imagexSettings,serviceId:(document.getElementById('imagex-service') as HTMLInputElement).value.trim(),ak:(document.getElementById('imagex-ak') as HTMLInputElement).value.trim(),sk:(document.getElementById('imagex-sk') as HTMLInputElement).value.trim(),domain:(document.getElementById('imagex-domain') as HTMLInputElement).value.trim(),model:(document.getElementById('imagex-model') as HTMLSelectElement).value,automatic:(document.getElementById('imagex-auto') as HTMLInputElement).checked});
  cutoutConfig=await getCutoutConfig();(document.getElementById('cutout-provider') as HTMLSelectElement).value=cutoutConfig.provider;
  (document.getElementById('imagex-ak') as HTMLInputElement).value='';(document.getElementById('imagex-sk') as HTMLInputElement).value='';if(status)status.textContent=t('imagexSaved');
 }else if(action==='imagex-check'){imagexSettings=await checkImageX();if(status)status.textContent=t('imagexChecked');}
 else{
  const item=singleContext()?current():chosen()[0];if(!item||isWorking(item))throw new GenerationError('noSelection');
  const candidate=item.candidate,original=item.rawGeneratedSource??candidate?.originalSource??candidate?.source;if(!original)throw new GenerationError('noSelection');
  const result=await (isKoukoutu?koukoutuCutout(original):imageXCutout(original));await validateGeneratedImage(result.source);if(item.candidate!==candidate||isWorking(item)||(item.rawGeneratedSource&&item.rawGeneratedSource!==original))throw new GenerationError('imagexSelectionChanged');
  if(item.rawGeneratedSource){await applyGeneratedResult(item,result.source,item.rawGenerationInput??item.generationJob?.input??generationInput(item),item.rawGenerationJobId??item.generationJob?.id??uid());if(item.candidate){item.candidate.originalSource=original;item.candidate.processing=result.processing;sync(item);}}
  else if(item.candidate===candidate&&candidate){candidate.originalSource=original;candidate.source=result.source;candidate.processing=result.processing;candidate.strokes=[];sync(item);}
  modal='';render();toast('imagexSuccess');
 }
 }catch(error){if(status)status.textContent=t(error instanceof GenerationError?error.code:isKoukoutu?'koukoutuRequestFailed':'imagexRequestFailed');}
 finally{imagexBusy=false;buttons.forEach(b=>b.disabled=false);}break;}
case 'more-settings':if(!canOpenServiceHelp())break;imagexExpanded=false;koukoutuExpanded=false;settingsRemovedId=service?.lastDeletedProfileId??'';settingsProfileId='__list__';modal='settings';renderModal();break;
case 'site-connection':{
 const status=document.getElementById('site-connection-status'),input=document.getElementById('site-session') as HTMLInputElement|null;
 const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-action="site-connection"]')];
 if(buttons.some(b=>b.disabled))break;
 const operation=target.dataset.operation as 'save'|'fetch'|'check';buttons.forEach(b=>b.disabled=true);if(status)status.textContent=t('checkingConnection');
 try{const connection=await configureSiteConnection(operation,operation==='save'?input?.value.trim():undefined);if(service)service.siteConnection=connection;if(input)input.value='';if(status)status.textContent=t(operation==='check'?'siteChecked':operation==='fetch'?'siteFetched':'siteSaved');}
 catch(e){if(status)status.textContent=t(e instanceof GenerationError?e.code:'siteUnavailable');}
 finally{buttons.forEach(b=>b.disabled=false);}break;}
case 'select-site-model':if([state.single,...state.batch].some(isWorking)){toast('settingsBusy',true);break;}if(!selectedProfile(current().model)?.managed)current().model=service?.profiles.find(profile=>profile.managed)?.id??current().model;persist();modal='';render();break;
case 'edit-model':settingsProfileId=settingsProfileId===target.dataset.id?'__list__':target.dataset.id!;renderModal();break;
case 'collapse-model':settingsProfileId='__list__';renderModal();break;
case 'delete-model':case 'restore-model':{
  if([state.single,...state.batch].some(isWorking)){toast('settingsBusy',true);break;}
  const id=action==='delete-model'?target.dataset.id!:settingsRemovedId;
  target.setAttribute('disabled','');
  try{service=await changeServiceProfile(id,action==='delete-model'?'delete':'restore');settingsRemovedId=service.lastDeletedProfileId??'';settingsProfileId='__list__';render();}
  catch(e){toast(e instanceof GenerationError?e.code:'settingsSaveFailed',true);target.removeAttribute('disabled');}break;}
case 'add-model':settingsProfileId='';renderModal();break;
case 'account':modal='account';renderModal();break;
case 'close-modal':if(modal==='confirm-batch-delete')pendingBatchDeleteIds=[];if(modal==='confirm-candidate-delete')pendingCandidateDeleteId='';modal='';document.querySelector<HTMLDialogElement>('#modal-root dialog')?.close();renderModal();break;
case 'batch-locate':activateBatchDraft(target.dataset.id!,true);break;
case 'batch-focus':activateBatchDraft(target.dataset.id!);break;
case 'batch-edit-description':openBatchDescription(target.dataset.id!);break;
case 'batch-generate-item':{const draft=batchDrafts().find(draft=>draft.id===target.dataset.id);if(!draft?.name.trim())break;let item=state.batch.find(item=>item.batchDraftId===draft.id);if(item&&isWorking(item))break;if(!item){item=fresh();item.batchDraftId=draft.id;item.model=BATCH_MODEL_ID;item.settings=clone(state.batchSettings);state.batch.push(item);}item.name=draft.name.trim();item.description=draft.description.trim();item.combineForms=!!draft.combineForms;activeBatchDraftId=draft.id;const previous=item.rawGenerationInput??item.generationJob?.input;if(previous&&sameGenerationInput(generationInput(item),previous)&&(item.rawGeneratedSource||item.status==='unresolved'))retryItem(item);else{setQueued(item,item.candidate?'regenerate':'initial');pump();render();}break;}
case 'select-item':{const item=state.batch.find(i=>i.id===target.dataset.id);if(item?.batchDraftId)activateBatchDraft(item.batchDraftId,true);break;}
case 'edit-item':openBatchItem(target.dataset.id!);break;
case 'back-to-batch':returnToBatch();break;
case 'candidate-scroll':{const list=target.closest('.candidate-carousel')?.querySelector<HTMLElement>('.candidate-list');if(list)list.scrollBy({left:Number(target.dataset.direction)*list.clientWidth*.82,behavior:'smooth'});break;}
case 'candidate-delete':pendingCandidateDeleteId=target.dataset.id!;modal='confirm-candidate-delete';renderModal();break;
case 'confirm-candidate-delete':if(removeCandidate(current(),pendingCandidateDeleteId)){pendingCandidateDeleteId='';modal='';sync(current());render();}break;
case 'candidate':{const item=current();if(selectCandidate(item,target.dataset.id!)){sync(item);render();}break;}
}
});

function updateBatchDraftUI(draft:BatchDraft){
  const name=draft.name.trim()||t('unnamedCategory'),summary=document.getElementById(`batch-summary-${draft.id}`),card=document.querySelector<HTMLElement>(`[data-batch-card="${draft.id}"]`);
  if(summary)summary.textContent=name;
  card?.setAttribute('aria-label',name);card?.querySelector('.batch-thumb')?.setAttribute('aria-label',`${t('selectImage')} ${name}`);
  card?.querySelector('.batch-card-delete')?.setAttribute('aria-label',`${t('removeBatchItem')} · ${name}`);
  const item=state.batch.find(item=>item.batchDraftId===draft.id),button=card?.querySelector<HTMLButtonElement>('[data-action="batch-generate-item"]');
  const modified=document.getElementById(`batch-modified-${draft.id}`);if(modified)modified.hidden=!isBatchDraftModified(draft,item);
  if(button)button.disabled=!draft.name.trim()||!!item&&isWorking(item);
  const generate=document.getElementById('batch-generate-button') as HTMLButtonElement|null;
  if(generate){generate.disabled=!batchDrafts().some(draft=>draft.name.trim())||state.batch.some(isWorking);generate.innerHTML=batchGenerateButtonContent();createIcons({icons,attrs:{'stroke-width':1.7}});}
}

function openBatchDescription(id:string){
  const draft=batchDrafts().find(draft=>draft.id===id),item=state.batch.find(item=>item.batchDraftId===id);
  if(!draft||item&&isWorking(item))return;
  if(editingBatchDescriptionId&&editingBatchDescriptionId!==id)finishBatchDescription(editingBatchDescriptionId);
  const textarea=document.getElementById(`batch-description-${id}`) as HTMLTextAreaElement|null;
  const summary=document.getElementById(`batch-description-summary-${id}`);
  if(!textarea||!summary)return;
  editingBatchDescriptionId=id;summary.hidden=true;summary.setAttribute('aria-expanded','true');
  textarea.hidden=false;textarea.parentElement?.classList.add('is-editing');
  sizeBatchGrid();textarea.focus({preventScroll:true});
}
function finishBatchDescription(id:string){
  if(editingBatchDescriptionId!==id)return;
  const textarea=document.getElementById(`batch-description-${id}`) as HTMLTextAreaElement|null;
  const summary=document.getElementById(`batch-description-summary-${id}`),draft=batchDrafts().find(draft=>draft.id===id);
  editingBatchDescriptionId='';if(!textarea||!summary||!draft)return;
  const value=textarea.value.trim(),item=state.batch.find(item=>item.batchDraftId===id);
  draft.description=value;if(item&&!isWorking(item))item.description=value;
  textarea.value=value;textarea.hidden=true;textarea.parentElement?.classList.remove('is-editing');
  summary.textContent=value||t('description');summary.title=value||t('description');summary.hidden=false;
  summary.classList.toggle('is-placeholder',!value);summary.setAttribute('aria-expanded','false');
  updateBatchDraftUI(draft);persist();sizeBatchGrid();
}
function commitCardName(el:HTMLInputElement){
 const batchItem=state.batch.find(i=>i.id===el.dataset.renameItem),ownerItem=el.dataset.renameOwner?[state.single,...state.batch].find(i=>i.id===el.dataset.renameOwner):undefined,id=el.dataset.renameCandidate;
 if(batchItem&&id){if(renameCandidate(batchItem,id,el.value)){const name=el.value.trim(),draft=batchDrafts().find(draft=>draft.id===batchItem.batchDraftId);batchItem.name=name;if(draft)draft.name=name;syncBatchNames();el.value=name;el.setAttribute('aria-label',`${t('renameIcon')} ${name}`);document.getElementById(`select-image-${batchItem.id}`)?.setAttribute('aria-label',`${t('selectImage')} ${name}`);document.getElementById(`select-check-${batchItem.id}`)?.setAttribute('aria-label',name);if(draft){const input=document.getElementById(`batch-name-${draft.id}`) as HTMLInputElement|null,summary=document.getElementById(`batch-summary-${draft.id}`);if(input)input.value=name;if(summary)summary.textContent=name;}sync(batchItem);render();}else{el.value=batchItem.candidate?.name??batchItem.name;toast('invalidIconName',true);}}
 else if(ownerItem&&id){const candidate=ownerItem.candidates.find(candidate=>candidate.id===id);if(!candidate)return;
  if(renameCandidate(ownerItem,id,el.value)){const name=el.value.trim();el.value=name;el.setAttribute('aria-label',`${t('renameIcon')} ${name}`);sync(ownerItem);}else{el.value=candidate.name;toast('invalidIconName',true);}}
}
document.addEventListener('input',event=>{const el=event.target as HTMLInputElement|HTMLTextAreaElement;const id=el.id;const field=el.dataset.field;
if(id==='category-name'){current().name=el.value;updateGenerationButtons();persist();}
if(id==='description'){current().description=el.value;updateGenerationButtons();persist();}
if(el.dataset.batchName||el.dataset.batchDescription){
  const draft=batchDrafts().find(draft=>draft.id===(el.dataset.batchName??el.dataset.batchDescription));
  const linked=state.batch.find(item=>item.batchDraftId===draft?.id);
  if(draft&&!(linked&&isWorking(linked))){
    if(el.dataset.batchName){draft.name=el.value;if(linked){linked.name=el.value;if(linked.candidate&&el.value.trim())renameCandidate(linked,linked.candidate.id,el.value);}}
    else{draft.description=el.value;if(linked)linked.description=el.value;}
    syncBatchNames();updateBatchDraftUI(draft);persist();
  }
}
if(id==='export-name'&&current().candidate&&renameCandidate(current(),current().candidate!.id,el.value))sync(current());
if(field==='bgColor'){applySetting('bgColor',el.value,el.dataset.scope);void drawAll(++renderVersion);}
});
document.addEventListener('change',event=>{const el=event.target as HTMLInputElement|HTMLSelectElement;
if(el.dataset.renameItem||el.classList.contains('candidate-name-input'))commitCardName(el as HTMLInputElement);
if(el.id==='reference-input'){const files=[...(el as HTMLInputElement).files??[]];void readUpload(files);}
if(el.id==='model'){current().model=el.value;persist();render();}
if(el.id==='settings-profile'){settingsProfileId=el.value;renderModal();}

if(el.id==='show-safety'){showSafety=(el as HTMLInputElement).checked;document.querySelectorAll('.safe-area').forEach(area=>area.classList.toggle('visible',showSafety));}
if(el.id==='select-all'){state.batch.filter(i=>i.candidate).forEach(i=>i.selected=(el as HTMLInputElement).checked);persist();updateBatchSelectionUI();}
if(el.dataset.select){const item=state.batch.find(i=>i.id===el.dataset.select);if(item){item.selected=(el as HTMLInputElement).checked;persist();updateBatchSelectionUI();}}
if(el.dataset.field==='hex'){if(/^#[\da-f]{6}$/i.test(el.value)){applySetting('bgColor',el.value.toUpperCase(),el.dataset.scope);render();}else el.value=el.dataset.scope==='batch'?state.batchSettings.bgColor:current().settings.bgColor;}
if(el.dataset.field==='bgColor')render();
if(el.dataset.exportSize){const size=Number(el.dataset.exportSize) as 120|400;exportSizes=(el as HTMLInputElement).checked?[...exportSizes,size]:exportSizes.filter(s=>s!==size);renderModal();}
if(el.dataset.exportKind){const kind=el.dataset.exportKind as typeof exportKinds[number];exportKinds=(el as HTMLInputElement).checked?[...exportKinds,kind]:exportKinds.filter(k=>k!==kind);renderModal();}
});
document.addEventListener('focusout',event=>{const renamed=event.target as HTMLInputElement;if(renamed.dataset.renameItem)commitCardName(renamed);if((event.target as HTMLElement).closest('.download-control')&&!(event.relatedTarget as HTMLElement|null)?.closest('.download-control'))closeDownloadMenu();});
document.addEventListener('keydown',event=>{const el=event.target as HTMLElement;if(el.matches('[data-batch-description]')&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();const id=el.dataset.batchDescription!;finishBatchDescription(id);document.getElementById(`batch-description-summary-${id}`)?.focus({preventScroll:true});return;}if(event.key==='Enter'&&el.matches('[data-rename-item],[data-rename-candidate]')){event.preventDefault();commitCardName(el as HTMLInputElement);el.blur();return;}const downloadMenu=activeDownloadControl()?.querySelector<HTMLElement>('.download-menu');if(event.key==='Escape'&&downloadMenu&&!downloadMenu.hidden){event.preventDefault();closeDownloadMenu(true);return;}if((event.key==='Enter'||event.key===' ')&&el.matches('.reference-add')){event.preventDefault();document.getElementById('reference-input')?.click();}if(event.key==='Escape'&&el.closest('.reference-deck')){el.blur();}});
document.addEventListener('dragover',event=>{if((event.target as HTMLElement).closest('#dropzone')){event.preventDefault();document.getElementById('dropzone')?.classList.add('drag-over');}});
document.addEventListener('dragleave',event=>{if((event.target as HTMLElement).closest('#dropzone'))document.getElementById('dropzone')?.classList.remove('drag-over');});
document.addEventListener('drop',event=>{if((event.target as HTMLElement).closest('#dropzone')){event.preventDefault();void readUpload([...event.dataTransfer?.files??[]]);}});
document.addEventListener('toggle',event=>{const el=event.target as HTMLDetailsElement;if(el.classList?.contains('generation-details'))advanced=el.open;if(el.classList?.contains('candidate-history')&&el.dataset.historyItem){if(el.open)expandedCandidateHistory.add(el.dataset.historyItem);else expandedCandidateHistory.delete(el.dataset.historyItem);const label=el.querySelector('.candidate-summary-action');if(label)label.textContent=t(el.open?'collapse':'expand');}},true);
document.addEventListener('focusin',event=>{const target=event.target as HTMLElement;if(target.closest('.card-select'))return;const card=target.closest<HTMLElement>('[data-batch-card]');if(card?.dataset.batchCard){activeBatchDraftId=card.dataset.batchCard;syncBatchActiveUI();}});
document.addEventListener('scroll',event=>{const target=event.target as HTMLElement;if(target?.classList?.contains('batch-grid'))batchGridScrollTop=target.scrollTop;},true);
window.addEventListener('resize',()=>{positionDownloadMenu();sizeBatchGrid();});
window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);void writeState(state).catch(()=>{});});

// Local receipt links recover original pixels without ever submitting a generation.
async function recoverReceiptLink(){
 const url=new URL(location.href),id=url.searchParams.get('job');if(!id)return;
 try{
  if(!/^[a-f0-9-]{36}$/.test(id))throw new GenerationError('jobNotFound');
  const remote=await getJob(id);if(remote.status!=='ready'||!remote.source)throw new GenerationError(remote.error??'resultStillPending');
  const item=current();if(isWorking(item))throw new GenerationError('settingsBusy');
  item.rawGeneratedSource=remote.source;item.rawGenerationInput=remote.input;item.rawGenerationJobId=remote.id;
  item.status='failed';item.error='generatedNeedsCutout';persist();render();
 }catch(error){toast(error instanceof GenerationError?error.code:'localServiceOffline',true);}
 url.searchParams.delete('job');history.replaceState(null,'',url);
}
async function initialize(){try{const saved=await readState<AppState>();if(saved?.version===1&&saved.single&&Array.isArray(saved.batch)&&Array.isArray(saved.history)){state=saved;batchDrafts();syncBatchNames();const background=globalBackground();state.batchSettings.bgColor=background.bgColor;state.batchSettings.transparent=background.transparent;for(const item of [state.single,...state.batch,...state.history])setItemBackground(item,background);saveStatus='saved';for(const item of [state.single,...state.batch,...state.history]){restoreGenerationInput(item);repairUnsubmittedFailure(item);}syncLinkedBatchData();for(const item of [state.single,...state.batch]){item.settings??=defaults();if(item.localProcessing&&item.rawGeneratedSource){item.status='failed';item.error='invalidTransparency';delete item.localProcessing;}if(['generating','cutting','queued'].includes(item.status)){item.status=item.generationJob?'queued':'unresolved';item.error='unknownError';}}}}catch{toast('loadFailed',true);}render();
try{service=await serviceConfig();}catch{service=undefined;}
try{imagexSettings=await getImageXSettings();}catch{/* Keep setup available if service is offline. */}
try{cutoutConfig=await getCutoutConfig();imagexSettings.automatic=cutoutConfig.provider==='imagex';}catch{/* Keep setup available. */}
await recoverReceiptLink();
await Promise.all([state.single,...state.batch].map(refreshFailedJob));
await Promise.all(['oranges','bananas','grapes'].map(async id=>{try{sampleSources.set(id,await getSample(id));}catch{}}));render();for(const item of [state.single,...state.batch]){if(item.rawGeneratedSource&&['invalidTransparency','needsCutout'].includes(item.error??''))await resumeLocalProcessing(item);}pump();}
void initialize();
