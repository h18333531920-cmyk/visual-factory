import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function fixture(extra={}) {
 const state={route:'analytics',libraryFilters:{kind:'gallery',query:'no match',tag1:'x',favorites:true,selectedCountries:['x'],searchHistory:['keep'],uploadTag1:'keep'},librarySelectedIds:new Set(['x']),libraryMultiSelect:true,libraryItems:[],libraryBookmarkGroups:[]};
 const context=vm.createContext({state,console,Set,CSS:{escape:x=>x},setTimeout,clearTimeout,LIBRARY_RENDER_STEP:48,libraryKindOfSource:s=>s.kind,libraryThumbnailPathForPreview:(p,s)=>s.thumbnail||'',...extra});
 vm.runInContext(source.slice(source.indexOf('  let analyticsPreviewTimer'),source.indexOf('  // Analytics uses stable account IDs')), context);
 return {state,context};
}
test('locating clears restrictive filters but preserves upload defaults and search history',()=>{
 const {state,context}=fixture();context.prepareLibrarySourceLocation({id:'target',kind:'template'});
 assert.equal(state.libraryFilters.kind,'template');assert.equal(state.libraryFilters.query,'');assert.equal(state.libraryFilters.favorites,false);assert.equal(state.libraryFilters.selectedCountries.length,0);
 assert.equal(state.libraryFilters.uploadTag1,'keep');assert.equal(state.libraryFilters.searchHistory[0],'keep');assert.equal(state.librarySelectedIds.size,0);assert.equal(state.libraryScrollToSource,'target');
});
test('location resolves exact item beyond initial batch and grouped bookmark or font member',()=>{
 const {state,context}=fixture();state.libraryItems=Array.from({length:120},(_,i)=>({source:{id:'s'+i},preview:{id:'p'+i}}));
 assert.equal(context.findLibrarySourceLocation('s119').index,119);
 state.libraryBookmarkGroups=[{source:{id:'s20'},refs:[{templateId:'child'}]}];
 assert.equal(context.findLibrarySourceLocation('child').item.source.id,'s20');
 state.libraryItems[35].fontVariants=[{source:{id:'font-child'}}];
 assert.equal(context.findLibrarySourceLocation('font-child').index,35);
 assert.equal(context.findLibrarySourceLocation('missing').index,-1);
});
test('full preview uses matching material path, never template JSON or a different source',()=>{
 const {context}=fixture();
 const previews=[{source_file_id:'other',preview_path:'other.png'},{source_file_id:'target',preview_path:'full.png'}];
 const result=context.analyticsMediaPaths({id:'target',source_path:'template.json',thumbnail:'small.jpg'},previews);
 assert.equal(result.path,'full.png');assert.equal(result.thumbnail,'small.jpg');assert.equal(result.video,false);
 assert.equal(context.analyticsMediaPaths({id:'target',source_path:'template.json'},[]).path,'');
 assert.equal(context.analyticsMediaPaths({id:'target',source_path:'clip.mp4'},[]).video,true);
});
test('popover flips and clamps to viewport without cropping the preview media',()=>{
 const {context}=fixture();
 const normal=context.analyticsPopoverPosition({left:100,right:136,top:150},360,450,1280,900);
 assert.equal(normal.left,148);assert.equal(normal.top,150);
 const edge=context.analyticsPopoverPosition({left:1150,right:1186,top:800},360,450,1280,900);
 assert.equal(edge.left,778);assert.equal(edge.top,438);
 const narrow=context.analyticsPopoverPosition({left:10,right:46,top:0},296,450,320,600);
 assert.equal(narrow.left,12);assert.equal(narrow.top,12);
});
test('hover delay is cancelled on pointer leave, avoiding a late popup on another route',()=>{
 const scheduled=new Map();let serial=0;
 const button={dataset:{sourceId:'target'},listeners:{},addEventListener(k,f){this.listeners[k]=f;},querySelector(){return null;}};
 const {context}=fixture({document:{getElementById:()=>({remove(){}})},setTimeout:fn=>{scheduled.set(++serial,fn);return serial;},clearTimeout:id=>scheduled.delete(id)});
 context.wireAnalyticsPreviews({querySelectorAll:()=>[button]}, {}, {target:{title:'Target'}});
 button.listeners.mouseenter();assert.equal(scheduled.size,1);
 button.listeners.mouseleave();assert.equal(scheduled.size,0);
});
