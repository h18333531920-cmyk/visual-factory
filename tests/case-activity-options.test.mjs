// 案例库「活动类型」选项必须与标签面板同源，且种子逻辑只补缺、不删改（v736）。
// 背景：编辑/上传案例项目时，活动类型是先把中文值解析成 vf_library_options 里的 id
// 再存 activity_id；选项表里没有对应行时静默落成 null——用户加了「足球」却不显示、
// 搜不到。旧的 seedActivityTypes 还会在每次加载时删除非三个通用的活动选项并把引用
// 置空，即使手动插了行也会被清掉。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function fnBody(name, marker) {
  const start = appSource.indexOf('function ' + name + '(');
  assert.ok(start > 0, name + ' 必须存在');
  const end = appSource.indexOf(marker, start);
  assert.ok(end > start, name + ' 的结束位置找不到');
  return appSource.slice(start, end);
}

test('种子逻辑只补缺：不再删除选项、不再清空 activity_id', () => {
  const body = fnBody('ensureCaseActivityOptions', '\n  async function loadLibraryOptions()');
  assert.doesNotMatch(body, /\.delete\(/, '不得删除已有选项');
  assert.doesNotMatch(body, /activity_id: null/, '不得把已有引用的 activity_id 置空');
  assert.doesNotMatch(appSource, /seedActivityTypes/, '旧的破坏性种子必须移除');
  assert.match(appSource, /await ensureCaseActivityOptions\(\);\s*\n\s*\/\/ 分类、收藏和素材清单/,
    '必须在 loadLibraryOptions 之前补选项，否则首屏 state.libraryOptions 仍缺行');
});

test('补的正是标签面板那套取值，name_en 走白名单映射', () => {
  const body = fnBody('ensureCaseActivityOptions', '\n  async function loadLibraryOptions()');
  assert.match(body, /FILTER_SECTIONS_CONFIG\.activity\.values/, '取值必须取自标签面板同一份配置');
  assert.match(body, /existingNames\.has\(item\.name\)/, '已存在的名字要跳过，保证幂等');
  assert.match(body, /LIBRARY_LABELS_EN\[item\.name\] \|\| item\.name/, 'name_en 用现有英文映射兜底');
  assert.match(body, /insert\(toInsert\.map\(/);
});

test('解析 id 的入口仍然按 name_zh 精确匹配，面板值与插入值同源', () => {
  const body = fnBody('libraryOptionIdByZhName', '\n  function caseProjectTagsForChips');
  assert.match(body, /item\.name_zh === name \|\| item\.name_en === name/);
  const configStart = appSource.indexOf('var FILTER_SECTIONS_CONFIG = {');
  const config = appSource.slice(configStart, appSource.indexOf('var FILTER_STATE_KEYS', configStart));
  assert.match(config, /activity: \{ values: \[[^\]]*'足球'/);
});

// v737：正式站 v561 每次打开素材库都会删掉 activity 类型里非通用三项的选项并清空
// activity_id（两站共用一张表）。案例库词表迁到 case_activity 类型躲开旧版清理。
test('案例库活动词表用 case_activity 类型，历史行改型但三项通用值留在原类型', () => {
  const body = fnBody('ensureCaseActivityOptions', '\n  async function loadLibraryOptions()');
  assert.match(body, /CASE_ACTIVITY_LEGACY_NAMES/, '通用三项必须有名单，才不会被改型');
  assert.match(body, /item\.option_type === 'activity' && !legacyNames\.has\(String\(item\.name_zh\)\)/, '只改型非通用三项的历史行');
  assert.match(body, /writeCaseActivityOptions\(/, '改型与插入都走带兜底的写入');
  assert.match(appSource, /const CASE_ACTIVITY_OPTION_TYPE = 'case_activity'/, '常量必须存在');
});

test('数据库约束未放宽时退回 activity 存放，行为与 v736 一致', () => {
  const body = fnBody('writeCaseActivityOptions', '\n  // 活动类型的选项必须');
  assert.match(body, /runWrite\(CASE_ACTIVITY_OPTION_TYPE\)/, '先试新类型');
  assert.match(body, /caseActivityTypeReady = false/, '失败后整页记住不可用');
  assert.match(body, /runWrite\('activity'\)/, '兜底用旧类型，保证选项仍能补上');
});

test('读取活动选项时两类合并，调用方拿到的仍是完整清单', () => {
  const body = fnBody('libraryOptions', '\n  function libraryKindOfSource');
  assert.match(body, /item\.option_type === 'activity' \|\| item\.option_type === CASE_ACTIVITY_OPTION_TYPE/);
  assert.match(body, /sort_order/);
});
