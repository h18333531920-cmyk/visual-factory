// v867：批量改类型成功后自动清空选择（多选模式保持开启），不用再退出重进
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('静态：全量成功分支里有 caseSelected.clear()（在 markCaseManualTypes 之后、showCaseToast 之前）', () => {
  const start = appSource.indexOf('const applyCaseBatchType = function(nextType) {');
  const end = appSource.indexOf('const openCaseBatchTypeMenu = function() {', start);
  const block = appSource.slice(start, end);
  const okBranch = block.slice(block.indexOf('if (written >= ids.length)'), block.indexOf('// 有没写进去的'));
  assert.match(okBranch, /markCaseManualTypes\(source, ids\);\s*\n\s*\/\/ v867[^\n]*\n\s*caseSelected\.clear\(\);\s*\n\s*renderSideGrid\(\);\s*\n\s*updateCaseSelectBar\(\);\s*\n\s*showCaseToast/);
});

test('静态：部分成功分支里写库成功的取消选中、失败保持选中', () => {
  const start = appSource.indexOf('const applyCaseBatchType = function(nextType) {');
  const end = appSource.indexOf('const openCaseBatchTypeMenu = function() {', start);
  const block = appSource.slice(start, end);
  const partial = block.slice(block.indexOf('// v867：写库成功的那部分自动取消选中'), block.indexOf('.catch(function(error)'));
  assert.match(partial, /writtenIds\.forEach\(function\(id\) \{ caseSelected\.delete\(id\); \}\);/);
});

function loadApplyCaseBatchType() {
  const start = appSource.indexOf('const applyCaseBatchType = function(nextType) {');
  const end = appSource.indexOf('const openCaseBatchTypeMenu = function() {', start);
  const block = appSource.slice(start, end);
  return new Function(
    'state', 'caseSelected', 'materials', 'sideCardDefs', 'source',
    'setMaterialTypeOf', 'renderSideGrid', 'updateCaseSelectBar',
    'queuePreviewWrite', 'clearPreviewWrite', 'markCaseManualTypes', 'showCaseToast',
    block + '\nreturn applyCaseBatchType;'
  );
}

function makeDbHarness(writtenIds) {
  const calls = { render: 0, bar: 0 };
  const state = {
    lang: 'zh',
    supabase: {
      from: () => ({
        update() { return this; },
        in() { return this; },
        select() {
          return {
            then(resolve) {
              resolve({ data: writtenIds.map(id => ({ id: id })) });
              return Promise.resolve();
            },
            catch() { return Promise.resolve(); },
          };
        },
      }),
    },
  };
  const sideCardDefs = [];
  const materials = [];
  const deps = [
    state,
    null, // caseSelected 由用例传入
    materials, sideCardDefs, { id: 'src-1', platform: 'C端' },
    () => {}, () => { calls.render += 1; }, () => { calls.bar += 1; },
    () => {}, () => {}, () => {},
    (msg) => { calls.toast = msg; },
  ];
  return { state, sideCardDefs, calls, deps };
}

test('行为：3 张全部写库成功 → 选择自动清空（多选模式仍在），不用退出重进', async () => {
  const caseSelected = new Set(['a', 'b', 'c']);
  const { deps } = makeDbHarness(['a', 'b', 'c']);
  deps[1] = caseSelected;
  const apply = loadApplyCaseBatchType()(...deps);
  apply('会场tab');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(caseSelected.size, 0, '成功后选择要清空');
});

test('行为：3 张只写进去 2 张 → 成功的取消选中，失败的保持选中可重试', async () => {
  const caseSelected = new Set(['a', 'b', 'c']);
  const { deps } = makeDbHarness(['a', 'b']);
  deps[1] = caseSelected;
  const apply = loadApplyCaseBatchType()(...deps);
  apply('会场tab');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(caseSelected.size, 1);
  assert.ok(caseSelected.has('c'), '没写进去的要保持选中');
});
