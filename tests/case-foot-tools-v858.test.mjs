import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

// 从 IIFE 里切出纯函数块单独执行（与 case-tag-system-v750 同一套切块手法）
function extractFn(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  assert.ok(start >= 0, '找不到起始标记：' + startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, '找不到结束标记：' + endMarker);
  return appSource.slice(start, end);
}

test('v858 素材缩略图聚拢排序：名字贴近的物料聚成一簇，簇按最先出现位置排', () => {
  const block = extractFn('function caseMaterialNameStem', '// 浮窗缩略图按记录的宽高先占位');
  const mod = new Function(block + '\nreturn { stem: caseMaterialNameStem, sort: caseSortedMaterialDefs };')();

  // 名字主干：去扩展名、尾部序号（可叠加）、语言词，统一小写去分隔符
  assert.equal(mod.stem('开屏-世界杯-1.png'), '开屏世界杯');
  assert.equal(mod.stem('开屏-世界杯-2.png'), '开屏世界杯');
  assert.equal(mod.stem('openingscreen en (1).jpg'), 'openingscreen');
  assert.equal(mod.stem('openingscreen AR 01.png'), 'openingscreen');
  assert.equal(mod.stem('会场tab-3KD-v2.png'), '会场tab3kdv', 'v1/v2 版本尾缀去数字后同主干，仍聚成一簇');

  // 两个系列交错存储 → 同名聚簇，各归各的
  const defs = [
    { filename: '开屏-世界杯-1.png', material: { width: 1080, height: 1920 } },
    { filename: '开屏-超级碗-1.png', material: { width: 1080, height: 1920 } },
    { filename: '开屏-世界杯-2.png', material: { width: 1080, height: 1920 } },
    { filename: '开屏-超级碗-2.png', material: { width: 1080, height: 1920 } },
    { filename: '会场tab 3.png', material: { width: 720, height: 720 } }
  ];
  const sorted = mod.sort(defs).map(d => d.filename);
  assert.deepEqual(sorted, [
    '会场tab 3.png',           // 尺寸不同，同尺寸组排最前（宽 720 < 1080）
    '开屏-世界杯-1.png',        // 同尺寸里世界杯簇（最先出现）在前
    '开屏-世界杯-2.png',
    '开屏-超级碗-1.png',        // 超级碗簇在后
    '开屏-超级碗-2.png'
  ]);

  // 语言词不去散同一系列：en/ar 版聚到一起
  const langPairs = mod.sort([
    { filename: 'poster en 2.png', material: { width: 800, height: 1000 } },
    { filename: 'poster ar 1.png', material: { width: 800, height: 1000 } },
    { filename: 'poster en 1.png', material: { width: 800, height: 1000 } }
  ]).map(d => d.filename);
  assert.deepEqual(langPairs, ['poster en 2.png', 'poster ar 1.png', 'poster en 1.png'], '同一主干聚成一簇，簇内保持原相对顺序');

  // 无尺寸/无名字不炸
  assert.deepEqual(mod.sort([{ filename: '', material: {} }]).length, 1);
});

test('v858 详情弹窗左下角：＋标签快捷编辑（点一下即存云）与浮窗工具行', () => {
  // footer 结构：标签行 + 工具按钮（仅管理员可见）
  assert.match(appSource, /id="case-foot-add-tag"/);
  assert.match(appSource, /id="case-foot-ai-tag"/);
  assert.match(appSource, /class="case-foot-line"/);
  assert.match(appSource, /class="case-foot-tools"/);
  // 编辑浮窗：同套词表渲染 + 即时保存提示
  assert.match(appSource, /function wireCaseFootTagTools/);
  assert.match(appSource, /renderCaseTagChipGroups\(footSel\)/);
  assert.match(appSource, /点一下即保存到云端，再点一下取消/);
  // 持久化：读库最新 tags 再按选择态重填（与 mergeSourceTagsMarker 同一路数，防并发互覆盖）
  assert.match(appSource, /select\('tags,country_id,activity_id'\)\.eq\('id', source\.id\)\.maybeSingle\(\)/);
  assert.match(appSource, /const payload = caseTagSelectionUpdatePayload\(baseline, footSel\);/);
  assert.match(appSource, /update\(\{ tags: payload\.tags, country_id: payload\.country_id, activity_id: payload\.activity_id \}\)\.eq\('id', source\.id\)/);
  // 保存成功后底部 chips 即时刷新
  assert.match(appSource, /const refreshFootChips = function\(\) \{ box\.innerHTML = caseFootTagsHtml\(source\); \};/);
  // 自定义元素/主题沿用加权长度限制（中文 6 字 / 英文 12 字符）+ 超限气泡
  assert.match(appSource, /caseTagCustomWeightedLength\(value\) > CASE_TAG_CUSTOM_MAX_UNITS/);
  assert.match(appSource, /showCaseTagLimitTip\(input\);/);
  // 悬停浮窗（标签溢出时）也带上这两个按钮，点了关浮窗并触发对应编辑器
  assert.match(appSource, /case-foot-tags-pop-tools/);
  assert.match(appSource, /clone\.addEventListener\('click', function\(\) \{ removePop\(\); btn\.click\(\); \}\);/);
  // 弹窗关闭时清理浮窗与 document 级监听
  assert.match(appSource, /if \(caseFootToolsCleanup\) \{ caseFootToolsCleanup\(\); caseFootToolsCleanup = null; \}/);
});

test('v858 AI 识别按钮：封面图走 analyze-elements，建议词点一下采纳', () => {
  // 识别用图：封面优先（视频跳过），否则第一张图片物料
  assert.match(appSource, /const coverPick = caseCoverFor\(source, 'all'\);/);
  assert.match(appSource, /\.find\(function\(p\) \{ return !isVideo\(p\); \}\) \|\| null;/);
  // 与上传表单同端点同参数（元素词表 + 活动词表）
  assert.match(appSource, /body: JSON\.stringify\(\{ image: image, vocabulary: caseElementVocabulary\(\), activities: FILTER_SECTIONS_CONFIG\.activity\.values \}\)/, 'v902 起词表带库内正在用的标签');
  // 建议浮窗：活动主题（蓝）在前、元素在后，点一下采纳（即时保存），可重新识别只补新
  assert.match(appSource, /data-foot-ai-activity=/);
  assert.match(appSource, /data-foot-ai-value=/);
  assert.match(appSource, /↻ ' \+ \(zh\(\) \? '重新识别' : 'Re-detect'\)/);
  assert.match(appSource, /suggestSeen\.indexOf\(v\) < 0/);
  // 识别中按钮禁用防重复点，失败有报错提示
  assert.match(appSource, /aiBtn\.disabled = true;/);
  assert.match(appSource, /AI 识别失败：/);
});

test('v858 标签序列化抽成公共函数：编辑弹窗与快捷编辑共用，逻辑不漂移', () => {
  assert.match(appSource, /function caseTagSelectionUpdatePayload\(source, chipSel\)/);
  // 编辑项目弹窗改用公共函数（旧的内联 country/activity 计算已删除）
  // v868：编辑弹窗保存先读库拿最新 tags 作基底（base）再序列化，成功后回写内存 source
  assert.match(appSource, /let base = source;\n[\s\S]{0,600}maybeSingle\(\);\n[\s\S]{0,900}const payload = caseTagSelectionUpdatePayload\(base, chipSel\);\n      state\.supabase\.from\('vf_source_files'\)\.update\(\{\n        title: title,/, 'v868 读库基底后序列化');
  assert.match(appSource, /source\.tags = payload\.tags;\n        source\.country_id = payload\.country_id \|\| null;\n        source\.activity_id = payload\.activity_id \|\| null;/, 'v868 保存成功后回写内存');
  assert.doesNotMatch(appSource, /const country = chipSel\.country \? libraryOptionIdByZhName\('country', chipSel\.country\) : null;/, '旧内联 country/activity 计算应已抽走');
  // 公共函数保留关键行为：vf: 标记不剥、自定义元素/主题走标记、country/activity 写独立列
  const fn = extractFn('function caseTagSelectionUpdatePayload', '\n  // v826 元素和活动主题都支持');
  assert.match(fn, /!String\(t\)\.startsWith\(CASE_ELEMENT_MARKER_PREFIX\)/);
  assert.match(fn, /!String\(t\)\.startsWith\(CASE_ACTIVITY_MARKER_PREFIX\)/);
  assert.match(fn, /caseActivityMarker\(v\)/);
  assert.match(fn, /caseElementMarker\(v\)/);
  assert.match(fn, /libraryOptionIdByZhName\('country'/);
});
