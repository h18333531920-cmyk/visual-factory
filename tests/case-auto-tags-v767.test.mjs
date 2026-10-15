import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('平台跟随当前标签一，国家按账号保存到本机且只在上传成功后记录',()=>{
  const open=source.slice(source.indexOf('  function openLibraryUploadModal('),source.indexOf('  function prefillUploadMetaSelections('));
  assert.match(open,/pageTag1 = state\.libraryFilters\.tag1/);
  assert.match(open,/prefillKindTag1Values\.includes\(prefillTag1\)/);
  assert.match(open,/opts\.country \|\| lastCaseUploadCountry\(\) \|\|/);
  const save=source.slice(source.indexOf('  async function uploadLibraryAsset('),source.indexOf('  // 限制并发的工作队列'));
  assert.ok(save.indexOf('await reloadLibraryData();')<save.indexOf('rememberLastCaseUploadCountry(chipSel.country)'), '只有完整上传并刷新成功后才记住国家');
  const storage=new Map(),context={state:{session:{user:{id:'user-a'}}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    FILTER_SECTIONS_CONFIG:{country:{values:['沙特阿拉伯','科威特']}},CASE_TAG_MULTI_KEYS:['activity','strategy','element','format'],LAST_CASE_UPLOAD_COUNTRY_PREFIX:'vf_last_case_upload_country_v1:'};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function caseTagSelHas('),source.indexOf('  function isCaseTagChipValue(')),context);
  context.rememberLastCaseUploadCountry('科威特');assert.equal(context.lastCaseUploadCountry(),'科威特');
  context.state.session.user.id='user-b';assert.equal(context.lastCaseUploadCountry(),'');
  context.rememberLastCaseUploadCountry('无效国家');assert.equal(context.lastCaseUploadCountry(),'');
});

test('v828 AI 主题改为建议 chip：不再自动写入，自由识别不限词表，点采纳才写入',()=>{
  assert.doesNotMatch(source,/applyCaseAiActivitySuggestion/, '旧的自动写入函数应已移除');
  // 识别成功后：主题存入 _caseTagAiThemes 待采纳，渲染为 data-case-tag-ai-activity chip
  assert.match(source,/root\._caseTagAiThemes = themes/);
  assert.match(source,/data-case-tag-ai-activity=/);
  // 点主题 chip 才写入活动主题
  assert.match(source,/themeChip\.dataset\.caseTagAiActivity/);
  assert.match(source,/caseTagSelToggle\(root\._caseTagSel, 'activity', themeValue\)/);
  // 换图重置主题建议
  assert.match(source,/root\._caseTagAiThemes = \[\];/);
  const context={FILTER_SECTIONS_CONFIG:{activity:{values:['足球','夏日']}},caseTagSelSet:(sel,key,value)=>{if(value)sel[key]=['activity','strategy','element','format'].includes(key)?[value]:value;else delete sel[key];},syncCaseTagSelectionUi:()=>{}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function applyCaseAutoQuantity('),source.indexOf('  // 平台（标签一）和国家是上传必填')),context);
  const same={_caseTagSel:{}};context.applyCaseAutoQuantity(same,[{width:1000,height:2168},{width:1000,height:2168}]);assert.equal(same._caseTagSel.quantity,'单素材');
  const mixed={_caseTagSel:{}};context.applyCaseAutoQuantity(mixed,[{width:1000,height:2168},{width:654,height:941}]);assert.equal(mixed._caseTagSel.quantity,'成套素材');
  mixed._caseTagQuantityManual=true;context.applyCaseAutoQuantity(mixed,[{width:1000,height:2168}]);assert.equal(mixed._caseTagSel.quantity,'成套素材');
});

test('服务端接口把活动候选传给同一次识图并返回活动',()=>{
  const route=readFileSync(new URL('../functions/api/analyze-elements.js',import.meta.url),'utf8');
  assert.match(route,/analyzeCaseTagsWithGlm\(env, body\.image, body\.vocabulary, body\.activities\)/);
  assert.match(route,/activity: result\.activity/);
  const ai=readFileSync(new URL('../functions/_ai.js',import.meta.url),'utf8');
  assert.match(ai,/画面和文字都推不出主题时才返回空字符串/);
  assert.match(ai,/自由归纳一个词/);
  // v918：多了一个效果词表参数（第 4 个），前三个参数与语义不变
  assert.match(ai,/parseCaseTagSuggestions\(text, words, activities, effectWords\)/);
});

test('上传平台按账号记忆，当前分类优先，其他库标签及无效值不会污染平台',()=>{
  const storage=new Map();
  const context=vm.createContext({state:{session:{user:{id:'a'}}},LIBRARY_TAGS:{source:{tag1:['C端','B端','D端','M端']}},localStorage:{getItem:key=>storage.get(key)||'',setItem:(key,value)=>storage.set(key,value)}});
  vm.runInContext(source.slice(source.indexOf('  function lastCaseUploadPlatform('),source.indexOf('  function lastCaseUploadCountry(')),context);
  assert.equal(context.defaultCaseUploadPlatform('', 'all'),'C端');
  context.rememberLastCaseUploadPlatform('B端');
  assert.equal(context.defaultCaseUploadPlatform('', 'all'),'B端');
  assert.equal(context.defaultCaseUploadPlatform('', 'D端'),'D端');
  assert.equal(context.defaultCaseUploadPlatform('M端', 'D端'),'M端');
  assert.equal(context.defaultCaseUploadPlatform('', '模版'),'B端');
  context.rememberLastCaseUploadPlatform('模版');
  assert.equal(context.lastCaseUploadPlatform(),'B端');
  context.state.session.user.id='b';assert.equal(context.lastCaseUploadPlatform(),'');
  context.state.session.user.id='a';assert.equal(context.lastCaseUploadPlatform(),'B端');
});
