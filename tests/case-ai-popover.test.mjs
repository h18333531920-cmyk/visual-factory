import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('AI suggestions toggle without closing the open popover; outside clicks still close it',()=>{
  const handlers={};let active=false,positions=0;
  const node=(name)=>({addEventListener:(event,fn)=>{handlers[name]=fn;},contains:()=>false});
  const add=node('add'),bubbles=node('bubbles');
  const chip={dataset:{caseTagKey:'element',caseTagValue:'手机'},classList:{toggle:(_name,value)=>{active=value;}}};
  const suggestion={dataset:{caseTagAiValue:'手机'},classList:{toggle:()=>{}}};
  const pop={querySelectorAll:()=>[chip],contains:()=>false};
  const root={...node('root'),dataset:{},isConnected:true,_caseTagSel:{},_caseTagPop:pop,
    querySelector:q=>q==='[data-case-tag-add]'?add:bubbles,querySelectorAll:()=>[suggestion]};
  const context={document:{addEventListener:(_event,fn)=>{handlers.outside=fn;},contains:()=>true},
    caseTagBubblesHtml:()=>'',caseTagSelToggle:(sel,key,value)=>{sel[key]=sel[key]===value?null:value;},caseTagSelHas:(sel,key,value)=>sel[key]===value,
    positionCaseTagPop:()=>positions++,closeCaseTagPop:r=>{r._caseTagPop=null;}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function syncCaseTagBubbles('),source.indexOf('  // 浮窗挂到 body 上'))+
    source.slice(source.indexOf('  function wireCaseTagBar('),source.indexOf('  function applyCaseTagBarSelections(')),context);
  context.wireCaseTagBar(root);
  const event={target:{closest:selector=>selector==='[data-case-tag-ai-value]'?suggestion:null}};
  handlers.root(event);handlers.outside(event);assert.equal(root._caseTagPop,pop);assert.equal(active,true);
  handlers.root(event);handlers.outside(event);assert.equal(root._caseTagPop,pop);assert.equal(active,false);assert.equal(positions,2);
  handlers.outside({target:{}});assert.equal(root._caseTagPop,null);
  handlers.root(event);handlers.outside(event);assert.equal(root._caseTagPop,null);
});

test('removing an accepted bubble restores the matching AI suggestion without closing the popover',()=>{
  const handlers={};let suggestionAdded=true,positions=0;
  const add={addEventListener:()=>{},contains:()=>false};
  const bubbles={addEventListener:(event,fn)=>{handlers.bubbles=fn;},contains:()=>false,innerHTML:''};
  const popChip={dataset:{caseTagKey:'element',caseTagValue:'饮料杯'},classList:{toggle:()=>{}}};
  const pop={querySelectorAll:()=>[popChip],contains:()=>false};
  const suggestion={dataset:{caseTagAiValue:'饮料杯'},classList:{toggle:(_name,value)=>{suggestionAdded=value;}}};
  const root={dataset:{},isConnected:true,_caseTagSel:{element:'饮料杯'},_caseTagPop:pop,
    querySelector:q=>q==='[data-case-tag-add]'?add:q==='[data-case-tag-bubbles]'?bubbles:null,
    querySelectorAll:q=>q==='[data-case-tag-ai-value]'?[suggestion]:[] ,addEventListener:()=>{}};
  const context={document:{addEventListener:()=>{},contains:()=>true},caseTagBubblesHtml:()=>'',
    caseTagSelToggle:(sel,key,value)=>{sel[key]=sel[key]===value?null:value;},caseTagSelHas:(sel,key,value)=>sel[key]===value,
    positionCaseTagPop:()=>positions++,closeCaseTagPop:r=>{r._caseTagPop=null;}};
  vm.createContext(context);
  const helpers=source.slice(source.indexOf('  function syncCaseTagBubbles('),source.indexOf('  // 浮窗挂到 body 上'));
  const wire=source.slice(source.indexOf('  function wireCaseTagBar('),source.indexOf('  function applyCaseTagBarSelections('));
  vm.runInContext(helpers+wire,context);context.wireCaseTagBar(root);
  const bubble={dataset:{caseBubbleKey:'element',caseBubbleValue:'饮料杯'}};
  handlers.bubbles({target:{closest:()=>bubble}});
  assert.equal(suggestionAdded,false);assert.equal(root._caseTagPop,pop);assert.equal(root._caseTagPopKeepOpen,true);assert.equal(positions,1);
});

test('accept all and clear accepted update every AI suggestion while keeping the popover open',()=>{
  const handlers={};let positions=0;
  const add={addEventListener:()=>{},contains:()=>false};
  const bubbles={addEventListener:()=>{},contains:()=>false,innerHTML:''};
  const values=['薯条','饮料杯','kiki'];
  const suggestions=values.map(value=>({dataset:{caseTagAiValue:value},classList:{toggle:(_name,active)=>{suggestions.find(item=>item.dataset.caseTagAiValue===value).active=active;}}}));
  const accept={dataset:{caseTagAiBulk:'accept'},disabled:false},clear={dataset:{caseTagAiBulk:'clear'},disabled:false};
  const pop={querySelectorAll:()=>[],contains:()=>false};
  const root={dataset:{},isConnected:true,_caseTagSel:{element:['薯条']},_caseTagPop:pop,
    querySelector:q=>q==='[data-case-tag-add]'?add:q==='[data-case-tag-bubbles]'?bubbles:q.includes('accept')?accept:q.includes('clear')?clear:null,
    querySelectorAll:q=>q==='[data-case-tag-ai-value]'?suggestions:[],addEventListener:(event,fn)=>{handlers[event]=fn;}};
  const has=(sel,key,value)=>(Array.isArray(sel[key])?sel[key]:sel[key]?[sel[key]]:[]).includes(value);
  const toggle=(sel,key,value)=>{const next=(Array.isArray(sel[key])?sel[key]:sel[key]?[sel[key]]:[]).filter(item=>item!==value);if(!has(sel,key,value))next.push(value);sel[key]=next;};
  const context={document:{addEventListener:()=>{},contains:()=>true},caseTagBubblesHtml:()=>'',caseTagSelToggle:toggle,caseTagSelHas:has,
    positionCaseTagPop:()=>positions++,closeCaseTagPop:r=>{r._caseTagPop=null;}};
  vm.createContext(context);
  const helpers=source.slice(source.indexOf('  function syncCaseTagBubbles('),source.indexOf('  // 浮窗挂到 body 上'));
  const wire=source.slice(source.indexOf('  function wireCaseTagBar('),source.indexOf('  function applyCaseTagBarSelections('));
  vm.runInContext(helpers+wire,context);context.wireCaseTagBar(root);
  const eventFor=target=>({target:{closest:selector=>selector==='[data-case-tag-ai-bulk]'?target:null}});
  handlers.click(eventFor(accept));
  assert.deepEqual(root._caseTagSel.element,values);assert.ok(suggestions.every(item=>item.active));assert.equal(accept.disabled,true);assert.equal(clear.disabled,false);
  handlers.click(eventFor(clear));
  assert.deepEqual(root._caseTagSel.element,[]);assert.ok(suggestions.every(item=>!item.active));assert.equal(accept.disabled,false);assert.equal(clear.disabled,true);
  assert.equal(root._caseTagPop,pop);assert.equal(root._caseTagPopKeepOpen,true);assert.equal(positions,2);
});
