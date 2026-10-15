// v917：进度条的「还剩 N 张」与识别脚本共用同一条"能不能识别"判据 —— 这次口径是
// **除了"非图片"和"没有 preview_path"，其余都算**（gif/mp4/mov/webm 现在会被抽帧识别，所以必须算上）。
//
// 与 v916 的关系（别搞混）：
//   v916：gif 两边都不算（模型吃不下动图，脚本默认跳过）—— 那时把 gif 排除在外是对的，否则条子永远显示"还剩 87 张"。
//   v917：脚本会先用 ffmpeg 抽「中间帧 + 最后一帧」再送模型 ⇒ 动态物料真的能被识别，必须算进剩余，
//         否则进度条会**低估**剩余；v916 那个 RECOGNIZE_PROGRESS_ANIMATED_EXT 因此删掉。
//
// 两边是两个文件（app.js 是浏览器 IIFE、脚本是 Node ESM），没法 import 同一份常量，
// 所以这里用**跨文件一致性锁**：直接 import 脚本的扩展名集合，跟 app.js 里的数组逐字比。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {
  NON_IMAGE_EXTENSIONS,
  DYNAMIC_EXTENSIONS,
  previewSkipReason,
  previewKind,
  selectRecognizablePreviews,
  KIND_DYNAMIC,
  SKIP_NON_IMAGE,
  SKIP_NO_PATH
} from '../scripts/recognize-case-tags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');
const scriptSource = readFileSync(join(here, '..', 'scripts', 'recognize-case-tags.mjs'), 'utf8');

const PURE_START = '  const RECOGNIZE_PROGRESS_POLL_MS =';
const PURE_END = '  function recognizeProgressInfo() {';

function loadPure() {
  const start = source.indexOf(PURE_START);
  const end = source.indexOf(PURE_END, start);
  assert.ok(start > 0 && end > start, '纯逻辑片段必须切得出来');
  const context = vm.createContext({});
  return vm.runInContext(source.slice(start, end)
    + '\n;({recognizeProgressState, recognizeProgressSkipExtension, RECOGNIZE_PROGRESS_SKIP_EXT})',
  context, {filename: 'app-v917-dynamic.js'});
}

// app.js 里那个数组（写死的字面量，模块里取不到，只能读源码）
function appExtensionList(name) {
  const match = source.match(new RegExp('const ' + name + ' = \\[([^\\]]*)\\]'));
  assert.ok(match, 'app.js 里必须有 ' + name);
  return match[1].split(',').map(item => item.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

const SOURCES = [
  {id: 'src-a', title: '夏日足球', source_path: ''},
  {id: 'src-b', title: '开斋节大促', source_path: ''}
];
const preview = (id, sourceId, path) => ({id, source_file_id: sourceId, preview_path: path || (id + '.png')});
const row = (previewId, sourceId, status) => ({preview_id: previewId, source_file_id: sourceId, status});
const plain = (value) => JSON.parse(JSON.stringify(value));

/* ── 1) 跨文件一致性：同一条判据，两边必须逐字一样 ───────────────────────── */

test('v917 一致性：app.js 的 RECOGNIZE_PROGRESS_SKIP_EXT 与脚本的 NON_IMAGE_EXTENSIONS 逐字相同', () => {
  assert.deepEqual([...NON_IMAGE_EXTENSIONS].sort(), appExtensionList('RECOGNIZE_PROGRESS_SKIP_EXT').sort(),
    '非图片那组必须和脚本的 NON_IMAGE_EXTENSIONS 一样（改一边要改另一边）');
  // 抽帧名单不许出现在"跳过"名单里：它们现在算"待识别"，跳过了就会低估剩余
  ['gif', 'mp4', 'mov', 'webm'].forEach((ext) => {
    assert.equal(NON_IMAGE_EXTENSIONS.has(ext), false, '抽帧那组不该留在跳过名单：' + ext);
  });
  assert.equal(DYNAMIC_EXTENSIONS.has('gif'), true);
  // v916 那个"单独排除动态图"的名单已经删掉了：现在只有一张跳过名单，不存在两套口径
  // （注释里提到它的历史可以留，但代码里不许再声明或使用它）
  assert.doesNotMatch(source, /const RECOGNIZE_PROGRESS_ANIMATED_EXT/, 'RECOGNIZE_PROGRESS_ANIMATED_EXT 必须删掉（v917 起动态物料算剩余）');
  assert.doesNotMatch(source, /RECOGNIZE_PROGRESS_ANIMATED_EXT\.includes/, '不许再拿它判跳过');
  // 「改一边要改另一边」这句提醒必须留在两边代码里（下次有人只改一边时至少看得见）
  assert.match(source, /scripts\/recognize-case-tags\.mjs 的 NON_IMAGE_EXTENSIONS 同口径/);
  assert.match(source, /改一边要改另一边/);
  assert.match(scriptSource, /改一边必须改另一边/);
});

test('v917 一致性：同一批物料，脚本的筛选与 app.js 的判定结果完全一致', () => {
  const {recognizeProgressSkipExtension} = loadPure();
  const paths = [
    'u1/s1/a.jpg', 'u1/s1/a.PNG', 'u1/s1/a.webp', 'u1/s1/a.gif', 'u1/s1/a.GIF', 'u1/s1/a.mp4',
    'u1/s1/a.MP4', 'u1/s1/a.mov', 'u1/s1/a.webm', 'u1/s1/a.m4v', 'u1/s1/a.psd', 'u1/s1/a.svg',
    'u1/s1/a', 'u1/s1/目录.中文.gif', 'u1/s1/弹窗.mp4'
  ];
  paths.forEach((path) => {
    const item = {id: 'p', source_file_id: 'src-a', preview_path: path};
    const scriptSaysSkip = previewSkipReason(item) !== '';
    assert.equal(recognizeProgressSkipExtension(item), scriptSaysSkip,
      '两边对这张图的判定必须一致：' + path);
  });
  // 空 preview_path 不归这个函数管：脚本把它归到 no-path，app 在 recognizeProgressState 里
  // 用单独一行的 `if (!String(preview.preview_path || '')) return;` 判掉（字体卡之类的虚拟预览）。
  // 两边都是"不算物料"，只是判据写在不同地方 —— 各自锁住。
  assert.equal(previewSkipReason({preview_path: ''}), SKIP_NO_PATH);
  assert.equal(recognizeProgressSkipExtension({id: 'p', preview_path: ''}), false);
  assert.match(source, /if \(!String\(preview\.preview_path \|\| ''\)\) return;\s*\/\/ 字体卡/);
});

/* ── 2) 进度条的「还剩 N 张」必须把动态物料算上 ──────────────────────────── */

test('v917 剩余张数：gif / mp4（会被抽帧识别）算剩余，源文件仍不算', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [
    preview('p-jpg', 'src-a'),
    preview('p-gif', 'src-a', 'u1/s1/animated.gif'),
    preview('p-gif-failed', 'src-b', 'u1/s1/broken.gif'),
    preview('p-mp4', 'src-b', 'u1/s1/promo.mp4'),
    preview('p-psd', 'src-b', 'u1/s1/design.psd'),
    {id: 'font-preview-src-a', source_file_id: 'src-a', preview_path: '', preview_filename: '字体卡'}
  ];
  const info = plain(recognizeProgressState({
    previews,
    tagRows: [row('p-gif-failed', 'src-b', 'failed')],
    sources: SOURCES
  }));
  assert.equal(info.kind, 'queued');
  assert.equal(info.remaining, 4, 'jpg + 两张 gif + mp4 都算剩余（v917 起它们真的会被识别）；psd 与字体卡不算');
});

test('v917 剩余张数：只剩动态物料没识别 ⇒ 照样显示（v916 是隐藏，那会让剩余被低估）', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [preview('p-jpg', 'src-a'), preview('p-gif', 'src-a', 'u1/s1/a.gif'), preview('p-mp4', 'src-a', 'u1/s1/b.mp4')],
    tagRows: [row('p-jpg', 'src-a', 'success')],
    sources: SOURCES
  }));
  assert.equal(info.visible, true);
  assert.equal(info.kind, 'queued');
  assert.equal(info.remaining, 2, '这两张正是后台识别要去抽帧的活，条子必须亮着');
});

test('v917 剩余张数：只剩真·非图片 ⇒ 隐藏（口径与脚本一致，条子才能清到零）', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [preview('p-psd', 'src-a', 'u1/s1/a.psd'), preview('p-m4v', 'src-a', 'u1/s1/a.m4v')],
    tagRows: [],
    sources: SOURCES
  }));
  assert.equal(info.visible, false, '源文件/矢量图/本轮不抽帧的容器都不该让条子亮着');
  assert.equal(info.kind, 'idle');
});

/* ── 3) 和脚本的默认行为对齐（--skip-dynamic 是脚本的逃生开关，网站不跟）─── */

test('v917 口径：网站按脚本的**默认**行为算（不带 --skip-dynamic）', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [preview('p-gif', 'src-a', 'u1/s1/a.gif'), preview('p-mp4', 'src-a', 'u1/s1/b.mp4')];
  // 脚本默认会把这两张放进队列（selectRecognizablePreviews 两张都在），网站也必须把它们算成"待识别"
  assert.equal(selectRecognizablePreviews(previews).length, 2);
  assert.equal(previewKind(previews[0]), KIND_DYNAMIC);
  const info = plain(recognizeProgressState({previews, tagRows: [], sources: SOURCES}));
  assert.equal(info.visible, true);
  assert.equal(info.remaining, 2);
  // 脚本的 --skip-dynamic（网站没人传）会让它们不算：这正是"网站按默认算"的另一面
  assert.deepEqual(selectRecognizablePreviews(previews, {skipDynamic: true}), []);
});

test('v917 脚本侧注释与实测依据留着（别把这条当成随手加的过滤）', () => {
  assert.match(scriptSource, /GLM 视觉通道吃不下动图/);
  assert.match(scriptSource, /2026-10-13 全量识别实测/);
  assert.match(scriptSource, /93 张 gif 只成功 6 张/);
  assert.match(scriptSource, /中间帧 \+ 最后一帧/);
  assert.match(source, /抽帧后送/);
  assert.match(source, /中间帧 \+ 最后一帧/);
  assert.match(source, /failed 仍计入剩余/, '抽帧失败会写字 failed，而 failed 仍算剩余 —— 这个副作用要留话在代码里');
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.psd'}), SKIP_NON_IMAGE);
});

test('v917 版本号（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(/\?v=20261015-canonical-query-v952/g) || []).length, 5);
  assert.match(source, /const TOOL_UI_VERSION = '20261015-canonical-query-v952'/);
});
