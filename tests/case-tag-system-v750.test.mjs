// 标签体系 v750：活动类型→活动主题改名、premium/picks/一人食/品牌合作 移入业务策略、
// 元素拆分（商家赠品→手机/耳机/PS5）、内容标签多选（活动/策略/元素/格式）、
// 活动第一个选择兼容写 activity_id（正式站 v561 依赖）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function fnBody(name) {
  const start = appSource.indexOf('function ' + name + '(');
  assert.ok(start > 0, name + ' 必须存在');
  const next = appSource.indexOf('\n  function ', start + 10);
  return appSource.slice(start, next > start ? next : start + 3000);
}

test('词表调整：活动主题瘦身，premium/picks/一人食/品牌合作 移入业务策略，元素拆分', () => {
  const start = appSource.indexOf('var FILTER_SECTIONS_CONFIG = {');
  const end = appSource.indexOf('};', start);
  const cfg = appSource.slice(start, end);
  const activity = cfg.slice(cfg.indexOf('activity: {'), cfg.indexOf('strategy: {'));
  const strategy = cfg.slice(cfg.indexOf('strategy: {'), cfg.indexOf('element: {'));
  const element = cfg.slice(cfg.indexOf('element: {'), cfg.indexOf('format: {'));
  for (const word of ['聚餐', '足球', '夏日', '新年', '开斋节', '宰牲节', '国庆节']) {
    assert.match(activity, new RegExp("'" + word + "'"), '活动主题缺少 ' + word);
  }
  for (const word of ['premium', 'picks', '一人食', '品牌合作']) {
    assert.doesNotMatch(activity, new RegExp("'" + word + "'"), '活动主题不得再含 ' + word);
    assert.match(strategy, new RegExp("'" + word + "'"), '业务策略缺少 ' + word);
  }
  assert.doesNotMatch(strategy, new RegExp("'聚餐'"), '业务策略不得含 聚餐');
  assert.doesNotMatch(strategy, new RegExp("'足球'"), '业务策略不得含 足球');
  for (const word of ['premium', 'picks', '一人食', '品牌合作', '新人专属', '裂变', '大促', '闪购', '买一送一', '抽奖', '免运']) {
    assert.match(strategy, new RegExp("'" + word + "'"), '业务策略缺少 ' + word);
  }
  assert.doesNotMatch(element, /商家赠品（手机、耳机、PS5）/, '复合词条必须拆分');
  for (const word of ['手机', '耳机', 'PS5']) {
    assert.match(element, new RegExp("'" + word + "'"), '元素缺少 ' + word);
  }
});

test('改名：活动类型 → 活动主题（含筛选面板/上传/编辑/标签条）', () => {
  assert.equal(appSource.includes("'活动类型'"), false, '旧称「活动类型」不得再出现');
  assert.ok(appSource.includes("'活动主题'"), '新称「活动主题」必须存在');
  assert.match(appSource, /activity: 'Theme'/, '英文标签同步为 Theme');
});

test('多选：内容标签四组选择值为数组，平台/国家/数量仍单选', () => {
  assert.match(appSource, /var CASE_TAG_MULTI_KEYS = \['activity', 'strategy', 'element', 'format'\];/);
  const chipRows = appSource.slice(appSource.indexOf('function caseTagChipRows()'), appSource.indexOf('function isCaseTagChipValue'));
  assert.ok(chipRows.includes("label: '数量'"), '数量组仍在');
  const toggle = fnBody('caseTagSelToggle');
  assert.match(toggle, /CASE_TAG_MULTI_KEYS\.includes\(key\)/, 'toggle 必须按组区分单/多选');
});

test('保存：多选值全部进 tags，activity_id 只兼容写第一个', () => {
  const save = appSource.slice(appSource.indexOf('const activityId = isCaseProject ? libraryOptionIdByZhName'), appSource.indexOf('const sourceInsert = await state.supabase'));
  assert.match(save, /caseTagSelFirst\(chipSel, 'activity'\)/, 'activity_id 必须取第一个所选（注意 caseTagSelFirst 需要 (sel, key) 两个参数）');
  const assemble = fnBody('caseProjectTagsForChips');
  assert.match(assemble, /caseTagSelValues\(chipSel, 'activity'\)/, '活动主题多选值必须写入 tags');
  const editStart = appSource.indexOf('const nextTags = currentTags.filter');
  const editEnd = appSource.indexOf("state.supabase.from('vf_source_files').update({", editStart);
  const edit = appSource.slice(editStart, editEnd);
  assert.match(edit, /caseTagSelValues\(chipSel, 'activity'\)/, '编辑保存也要把活动主题多选值写入 tags');
  assert.match(edit, /caseTagSelFirst\(chipSel, 'activity'\)/, '编辑保存的 activity_id 同样只写第一个（两个参数）');
  // 防回归：助手签名是 (sel, key)，任何调用点只传一个参数都会静默返回 ''
  assert.equal(appSource.includes('caseTagSelFirst(chipSel.activity)'), false, 'caseTagSelFirst 不得只传一个参数');
  assert.match(appSource, /function caseTagSelFirst\(sel, key\)/, '助手签名必须保持 (sel, key)');
});

test('筛选：活动主题按 activity_id 名称 OR tags 命中（兼容存量数据）', () => {
  // v843：六维筛选统一走 librarySourceMatchesFilterValue，activity 分支内保留原精确语义（名称相等 OR 标签包含）
  const fn = fnBody('librarySourceMatchesFilterValue');
  assert.match(fn, /String\(libActivityLabel\(source\) \|\| ''\) === target \|\| tags\.indexOf\(target\) >= 0/, '活动主题精确语义：activity_id 名称相等 OR tags 包含');
  assert.match(appSource, /librarySourceMatchesFilterValue\('activity', item\.source, v\)/, '筛选链 activity 维度走统一匹配助手');
});

test('v850 自定义标签统一加权长度上限：CJK 算 2 单位、其余 1，上限 12＝中文 6 字 / 英文 12 字符', () => {
  assert.match(appSource, /CASE_TAG_CUSTOM_MAX_UNITS = 12;/, '统一上限常量 12（＝中文 6 字 / 英文 12 字符）');
  assert.doesNotMatch(appSource, /const maxLen = isActivity \? 8 : 5;/, '旧的 5/8 字上限已废弃');
  const markup = fnBody('caseTagCustomRowMarkup');
  assert.doesNotMatch(markup, /maxlength=/, 'v854：HTML maxlength 已移除，统一由 JS 加权截断管理');
  assert.match(markup, /自定义标签，中文 6 字 \/ 英文 12 字符以内/, '中文 placeholder 说明新上限');
  assert.match(markup, /Custom tag, max 6 CJK chars or 12 characters/, '英文 placeholder 说明新上限');
  const popBody = appSource.slice(appSource.indexOf('function openCaseTagPop('), appSource.indexOf('function addCaseTagCustomValue('));
  assert.match(popBody, /compositionstart/, 'v854：组词开始事件');
  assert.match(popBody, /compositionend/, 'v854：组词结束事件（上屏后才截断，不打断拼音）');
  assert.match(popBody, /applyCaseTagInputLimit\(focusInput\)/, '输入时统一走加权截断 helper');
  const addBody = fnBody('addCaseTagCustomValue');
  assert.match(addBody, /caseTagCustomWeightedLength\(value\) > CASE_TAG_CUSTOM_MAX_UNITS/, '保存二次校验加权长度');
  assert.match(addBody, /case-tag-custom-too-long/, '超限红框提示');
});

test('v850 加权长度与截断行为：中文 6 字 / 英文 12 字符内通过，超出截断', () => {
  const start = appSource.indexOf('const CASE_TAG_CUSTOM_MAX_UNITS = 12');
  const end = appSource.indexOf('function caseTagCustomRowMarkup', start);
  const block = appSource.slice(start, end);
  const mod = { exports: {} };
  new Function('exports', block + '\nexports.MAX = CASE_TAG_CUSTOM_MAX_UNITS; exports.weighted = caseTagCustomWeightedLength; exports.clip = caseTagCustomClipToLimit;')(mod.exports);
  // 加权长度：CJK 算 2、其余算 1
  assert.equal(mod.exports.weighted('宰牲节促销'), 10, '5 个汉字 = 10 单位');
  assert.equal(mod.exports.weighted('促销活动'), 8, '4 个汉字 = 8 单位');
  assert.equal(mod.exports.weighted('促销活动吗'), 10, '5 个汉字 = 10 单位');
  assert.equal(mod.exports.weighted('12345678'), 8, '8 个数字边界');
  assert.equal(mod.exports.weighted('123456789'), 9, '9 个数字超限');
  assert.equal(mod.exports.weighted('Abcdef'), 6, '6 个英文字符');
  assert.equal(mod.exports.weighted(''), 0, '空串 0 单位');
  // 截断：中文超出 6 字截到 6 字，英文超出 12 字符截到 12 字符
  assert.equal(mod.exports.clip('一二三四五六'), '一二三四五六', '6 字边界内不截');
  assert.equal(mod.exports.clip('一二三四五六七'), '一二三四五六', '7 字截到 6 字');
  assert.equal(mod.exports.weighted(mod.exports.clip('一二三四五六七')), 12, '截断后正好 12 单位');
  assert.equal(mod.exports.clip('abcdefghijklmnopqrstuvwxyz'), 'abcdefghijkl', '26 英文字符截到 12');
  assert.equal(mod.exports.clip('abcd efgh ij'), 'abcd efgh ij', '12 字符内不截');
});

test('项目弹窗标签统一在底部：绿色分类在前，橙色元素在后', () => {
  const foot = fnBody('caseFootTagsHtml');
  assert.match(foot, /\['tag1', 'country', 'activity', 'strategy', 'format', 'quantity', 'element'\]/, '全部标签统一放底部，元素最后');
  assert.match(foot, /item\.key === 'element' \? ' is-element' : ''/, '元素保留橙色语义类');
  const modal = appSource.slice(appSource.indexOf('function openCaseProjectModal('), appSource.indexOf('function closeCaseProjectModal('));
  assert.doesNotMatch(modal, /caseHeadTagsHtml|headTags/, '标题区域不再渲染标签');
});

test('项目弹窗底部标签：一行裁切 + hover 浮窗展示全部', () => {
  const body = fnBody('wireCaseFootTagsHover');
  assert.match(body, /scrollWidth <= box\.clientWidth \+ 1/, '未裁切时不弹浮窗');
  assert.match(body, /closeCaseFootTagsPop|case-foot-tags-pop/, '浮窗沿用底部标签样式并挂到 body');
  assert.match(appSource, /\.case-foot-tags \{ display: flex; flex-wrap: nowrap;[\s\S]{0,80}overflow: hidden; \}/, '底部标签必须单行裁切');
  assert.match(appSource, /wireCaseFootTagsHover\(backdrop\);/, '项目弹窗打开时必须挂 hover');
  assert.match(appSource, /function closeCaseProjectModal\(\) \{[\s\S]{0,120}closeCaseFootTagsPop\(\);/, '关闭弹窗时必须清掉浮窗');
  assert.match(appSource, /box\.classList\.add\('is-muted'\)/, '浮窗出现时原标签行要变灰');
  assert.match(appSource, /box\.classList\.remove\('is-muted'\)/, '浮窗关闭时恢复原标签颜色');
});

test('v752 交互修正：加号气泡展开输入、浮窗不被误关、标签一预填过滤', () => {
  // 加号小气泡 + 默认隐藏的小输入框（点一下才出现）；v826 元素/活动主题两行各一个，按行键定位
  assert.match(appSource, /data-case-tag-custom-toggle/, '元素组要有加号气泡');
  assert.match(appSource, /data-case-tag-custom-row data-case-tag-custom-key="\$\{key\}" hidden/, '小输入框默认隐藏，点加号才出现');
  assert.match(appSource, /rowEl\.hidden = false;/, '点加号展开输入框');
  // 添加时不得整块重绘浮窗（重绘会让被点按钮脱离 DOM，触发误关）
  const addBody = fnBody('addCaseTagCustomValue');
  assert.doesNotMatch(addBody, /pop\.innerHTML = renderCaseTagChipGroups/, '添加自定义标签不得整块重绘浮窗');
  assert.match(addBody, /opts\.insertBefore\(chip, rowEl\)/, '新标签以 chip 形式补进元素组');
  // 点浮窗外关闭：被点元素已脱离 DOM 时跳过，避免误关
  assert.match(appSource, /if \(!document\.contains\(event\.target\)\) return;/, '点外关闭要忽略已脱离 DOM 的目标');
  // 标签一只预填属于当前入库位置的值（页面筛选停在「模版」时不带进案例库）
  assert.match(appSource, /prefillKindTag1Values\.includes\(prefillTag1\)/, '标签一预填必须按当前入库位置过滤');
});

test('v826 活动主题：加号手动添加 + 自定义主题标记持久化 + 蓝色配色', () => {
  assert.match(appSource, /var CASE_TAG_CUSTOM_KEYS = \['element', 'activity', 'strategy'\];/, '元素/活动主题/业务策略都支持自定义（v862 加入 strategy）');
  assert.match(appSource, /function caseTagCustomRowMarkup\(key\)/, '自定义行渲染抽成带行键的函数');
  assert.match(appSource, /\[data-case-tag-custom-row\]\[data-case-tag-custom-key="' \+ customKey \+ '"\]/, '展开/添加按行键定位，两行互不干扰');
  const addBody = fnBody('addCaseTagCustomValue');
  assert.match(addBody, /const key = CASE_TAG_CUSTOM_KEYS\.includes\(tagKey\) \? tagKey : 'element';/, '添加函数按行键分派（v862 起按白名单）');
  assert.match(addBody, /root\._caseTagActivityManual = true;/, '手动加主题视为人工指定，AI 不再自动覆盖');
  // 自定义主题标记：存进 tags、读回时还原（同元素标记机制）
  assert.match(appSource, /const CASE_ACTIVITY_MARKER_PREFIX = 'vf:case-activity:v1:';/);
  const read = fnBody('caseChipSelectionOf');
  assert.match(read, /tags\.map\(caseActivityMarkerValue\)\.filter\(Boolean\)/, '读回时还原自定义主题');
  // 蓝色配色：弹窗 chip / 已选气泡 / 底部标签
  assert.match(appSource, /\.case-tag-pop \.case-tag-chip\[data-case-tag-key="activity"\]/);
  assert.match(appSource, /\.case-tag-bubble\[data-case-tag-kind="activity"\]/);
  assert.match(appSource, /\.case-foot-tag\[data-case-tag-kind="activity"\]/);
  // AI 主题识别：前端把完整活动词表传给识别接口（词表含世界杯/游戏后自动生效）
  assert.match(appSource, /activities: FILTER_SECTIONS_CONFIG\.activity\.values/);
});
