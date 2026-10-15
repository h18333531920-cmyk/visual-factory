import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');

function reader(){
  const context={CASE_ELEMENT_MARKER_PREFIX:'vf:case-element:v1:',FILTER_SECTIONS_CONFIG:{element:{values:['kiki','手机']}},
    LIBRARY_TAGS:{source:{tag1:['C端','B端'],tag2ByTag1:{'C端':['开机海报']}}},
    sourceTag2Values:()=>['开机海报'],
    caseTagChipRows:()=>[
      {key:'tag1',values:['C端','B端']},{key:'activity',values:['聚餐','足球']},{key:'strategy',values:['picks']},
      {key:'element',values:['kiki','手机']},{key:'format',values:['仅jpg/png/pdf']},{key:'quantity',values:['单素材','成套素材']}
    ]};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function caseElementMarker('),source.indexOf('  function renderCaseTagChipGroups(')),context);
  return context;
}

test('旧项目的 AI 自定义元素从普通 tags 读回，新项目优先使用明确元素标记',()=>{
  const c=reader();
  const legacy={tags:['vf:kind:source','C端','聚餐','picks','kiki','炸鸡','汉堡','薯条','单素材']};
  assert.deepEqual(Array.from(c.caseElementValuesOf(legacy)),['kiki','炸鸡','汉堡','薯条']);
  const marked={tags:['vf:kind:source','C端','聚餐','汉堡','其它旧词',c.caseElementMarker('汉堡'),c.caseElementMarker('餐桌')]};
  assert.deepEqual(Array.from(c.caseElementValuesOf(marked)),['汉堡','餐桌']);
});

test('上传保存普通搜索词和元素类别标记，并放宽项目标签容量',()=>{
  const body=source.slice(source.indexOf('  function caseProjectTagsForChips('),source.indexOf('  // 从项目记录读回标签选择'));
  assert.match(body,/normalizeLibraryTags\('source', tags, 40\)/);
  assert.match(body,/caseElementMarker\(value\)/);
  assert.match(body,/return normalized\.slice\(0, 64\)/);
});

test('元素为橙色，其它标签为绿色，并在项目 hover 浮窗保留元素颜色',()=>{
  assert.match(source,/case-tag-bubble\[data-case-tag-kind="element"\][^{]*\{[^}]*#ffedd5/);
  assert.match(source,/case-tag-pop \.case-tag-chip\[data-case-tag-key="element"\][^{]*\{[^}]*#fff7ed/);
  assert.match(source,/case-tag-pop \.case-tag-chip\.active[^}]*#15803d/);
  assert.match(source,/case-tag-pop \.case-tag-chip\[data-case-tag-key="element"\]\.active[^}]*#c2410c/);
  assert.match(source,/case-foot-tag\.is-element[^}]*#ffedd5/);
  assert.match(source,/item\.element \? ' is-element' : ''/);
  assert.match(source,/\.case-foot-tags\.is-muted \.case-foot-tag[^}]*#94a3b8/, 'hover浮窗出现时底部原标签统一变灰');
});
