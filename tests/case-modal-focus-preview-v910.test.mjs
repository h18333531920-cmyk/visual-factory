import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const helperStart = source.indexOf('  function caseModalInitialPreviewId(');
const modalStart = source.indexOf('  function openCaseProjectModal(');
assert.ok(helperStart > 0, 'caseModalInitialPreviewId 必须存在');
assert.ok(modalStart > helperStart, 'caseModalInitialPreviewId 必须在 openCaseProjectModal 之前（同作用域可调用）');

function loadHelper() {
  const context = vm.createContext({});
  vm.runInContext(source.slice(helperStart, modalStart)
    + '\n;({ caseModalInitialPreviewId })', context);
  return context.caseModalInitialPreviewId;
}

const materials = [
  {id: 'm1', material_type: '开机海报'},
  {id: 'm2', material_type: '弹窗'},
  {id: 'm3', material_type: '头图'},
];

test('v910 点了第 3 张铺开卡：浮窗大图落在点的那一张，而不是类型组封面', () => {
  const fn = loadHelper();
  assert.equal(fn(materials, 'm1', 'm3'), 'm3', 'focus 命中项目内物料 ⇒ 用它，忽略 fallback（封面）');
});

test('v910 没有点具体某张（focus 为空）：退回类型组封面', () => {
  const fn = loadHelper();
  assert.equal(fn(materials, 'm2', ''), 'm2', '空串 focus 退回 fallback');
  assert.equal(fn(materials, 'm2', undefined), 'm2', 'undefined focus 退回 fallback');
  assert.equal(fn(materials, 'm2', null), 'm2', 'null focus 退回 fallback');
});

test('v910 focus 那张不属于本项目：退回类型组封面（不显示别人的图）', () => {
  const fn = loadHelper();
  assert.equal(fn(materials, 'm1', 'other-project-preview'), 'm1', '项目外的 id 一律不认');
});

test('v910 空物料数组不抛错', () => {
  const fn = loadHelper();
  assert.equal(fn([], '', 'm1'), '', '空数组 + 空 fallback ⇒ 原样返回 fallback');
  assert.doesNotThrow(() => fn([], 'fallback', 'm1'));
  assert.equal(fn([], 'fallback', 'm1'), 'fallback', '空数组里什么都找不到 ⇒ 退回 fallback，且不抛');
});

test('v910 源码：openCaseProjectModal 有三个参数，初始大图走 helper', () => {
  assert.match(source, /function openCaseProjectModal\(sourceId, focusType, focusPreviewId\) \{/, '签名要有第三个参数 focusPreviewId');
  assert.match(
    source,
    /let currentId = caseModalInitialPreviewId\(materials, pick\.cover\.id, focusPreviewId\);/,
    '初始大图必须由 caseModalInitialPreviewId 决定（materials + 组封面 + 点的那张）'
  );
  assert.doesNotMatch(source, /let currentId = pick\.cover\.id;/, '旧的「一律用组封面」写法不许留着');
});

test('v910 源码：两处点击入口都传 preview.id', () => {
  const clickCalls = source.match(/isCaseProjectCard\) \{ openCaseProjectModal\(/g) || [];
  assert.equal(clickCalls.length, 2, '网格点击 + 键盘 Enter 两处都要传');
  const withPreviewId = source.match(
    /openCaseProjectModal\((\w+)\.source\.id, \1\.preview && \1\.preview\.material_type, \1\.preview && \1\.preview\.id\)/g
  ) || [];
  assert.equal(withPreviewId.length, 2, '两处都必须把 preview.id 传成第三个参数');
});

test('v910 源码：换 tab 重开浮窗那两处不带 preview id（没有点某一张）', () => {
  const tabCalls = source.match(/openCaseProjectModal\(sourceId, tabValue\)/g) || [];
  assert.equal(tabCalls.length, 2, '切类型 tab 的两处重开调用保持原样');
  assert.doesNotMatch(source, /openCaseProjectModal\(sourceId, tabValue, /, '切 tab 时不该传 focusPreviewId');
});
