import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('  function caseProjectIdentity(');
const end = source.indexOf('  // v858 素材缩略图聚拢排序', start);
assert.ok(start > 0 && end > start, 'canonical project helper block must exist');

function load(sources, previews) {
  const context = vm.createContext({
    state: {librarySources: sources, libraryPreviews: previews},
    isCaseProject: () => true,
  });
  vm.runInContext(`
    function caseMaterialsOf(source) {
      return state.libraryPreviews.filter(p => p.source_file_id === source.id);
    }
    ${source.slice(start, end)}
  `, context);
  return context;
}

test('同名小项目的全部文件都在完整项目中时，打开完整项目', () => {
  const small = {id:'small', title:'World Cup - Period 2& 4'};
  const full = {id:'full', title:'World Cup - Period 2 & 4'};
  const context = load([small, full], [
    {source_file_id:'small', preview_filename:'Header - EN.png'},
    {source_file_id:'small', preview_filename:'开屏02 换品AR.png'},
    {source_file_id:'full', preview_filename:'Header - EN.png'},
    {source_file_id:'full', preview_filename:'开屏02 换品AR.png'},
    {source_file_id:'full', preview_filename:'新增物料.png'},
  ]);
  assert.equal(context.canonicalCaseProjectSource(small).id, 'full');
  assert.equal(context.canonicalCaseProjectSource(full).id, 'full');
});

test('标题相似但文件不是全集时保持独立项目', () => {
  const a = {id:'a', title:'Campaign 1'};
  const b = {id:'b', title:'Campaign-1'};
  const context = load([a, b], [
    {source_file_id:'a', preview_filename:'a.png'},
    {source_file_id:'a', preview_filename:'only-a.png'},
    {source_file_id:'b', preview_filename:'a.png'},
    {source_file_id:'b', preview_filename:'b.png'},
    {source_file_id:'b', preview_filename:'extra.png'},
  ]);
  assert.equal(context.canonicalCaseProjectSource(a).id, 'a');
});

test('文件名归一化兼容空格和扩展名差异', () => {
  const context = load([], []);
  assert.equal(context.caseMaterialIdentity({preview_filename:' Header - AR .PNG'}), 'headerar');
  assert.equal(context.caseProjectIdentity('World Cup - Period 2 & 4'), context.caseProjectIdentity('World Cup - Period 2& 4'));
});
