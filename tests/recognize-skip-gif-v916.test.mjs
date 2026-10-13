// v916：进度的「还剩 N 张」与识别脚本共用同一条"能不能识别"判据 —— .gif 两边都不算。
//
// 背景（实测）：2026-10-13 全量识别 1897 张，失败 87 张**全是 .gif**（全库 93 张只成功 6 张），
// 原因是 GLM 视觉通道吃不下动图。脚本 v916 起默认跳过 .gif（--include-gif 才照旧送）；
// 网站没人传那个参数，所以进度条也必须按"默认跳过"算，否则库里那 87 张会让条子永远显示"还剩 87 张"。
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
  ANIMATED_EXTENSIONS,
  previewSkipReason,
  selectRecognizablePreviews,
  SKIP_ANIMATED,
  SKIP_NO_PATH
} from '../scripts/recognize-case-tags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

const PURE_START = '  const RECOGNIZE_PROGRESS_POLL_MS =';
const PURE_END = '  function recognizeProgressInfo() {';

function loadPure() {
  const start = source.indexOf(PURE_START);
  const end = source.indexOf(PURE_END, start);
  assert.ok(start > 0 && end > start, '纯逻辑片段必须切得出来');
  const context = vm.createContext({});
  return vm.runInContext(source.slice(start, end)
    + '\n;({recognizeProgressState, recognizeProgressSkipExtension, RECOGNIZE_PROGRESS_SKIP_EXT, RECOGNIZE_PROGRESS_ANIMATED_EXT})',
  context, {filename: 'app-v916-skip-gif.js'});
}

// app.js 里那两个数组（写死的字面量，模块里取不到，只能读源码）
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

test('v916 一致性：app.js 的两个扩展名数组与识别脚本的集合逐字相同', () => {
  assert.deepEqual([...NON_IMAGE_EXTENSIONS].sort(), appExtensionList('RECOGNIZE_PROGRESS_SKIP_EXT').sort(),
    '非图片那组必须和脚本的 NON_IMAGE_EXTENSIONS 一样（改一边要改另一边）');
  assert.deepEqual([...ANIMATED_EXTENSIONS].sort(), appExtensionList('RECOGNIZE_PROGRESS_ANIMATED_EXT').sort(),
    '动态图那组必须和脚本的 ANIMATED_EXTENSIONS 一样（改一边要改另一边）');
  assert.deepEqual([...ANIMATED_EXTENSIONS], ['gif'], 'v916 的判据就是 .gif 一个');
  assert.equal(NON_IMAGE_EXTENSIONS.has('gif'), false, 'gif 不属于"非图片"那组，别混进去');
  // 「改一边要改另一边」这句提醒必须留在代码里（下次有人只改一边时至少看得见）
  assert.match(source, /scripts\/recognize-case-tags\.mjs 的 ANIMATED_EXTENSIONS 同口径/);
  assert.match(source, /改一边要改另一边/);
});

test('v916 一致性：同一批物料，脚本的筛选与 app.js 的判定结果完全一致', () => {
  const {recognizeProgressSkipExtension} = loadPure();
  const paths = [
    'u1/s1/a.jpg', 'u1/s1/a.PNG', 'u1/s1/a.webp', 'u1/s1/a.gif', 'u1/s1/a.GIF', 'u1/s1/a.mp4',
    'u1/s1/a.psd', 'u1/s1/a.svg', 'u1/s1/a', 'u1/s1/目录.中文.gif'
  ];
  paths.forEach((path) => {
    const preview = {id: 'p', source_file_id: 'src-a', preview_path: path};
    const scriptSaysSkip = previewSkipReason(preview) !== '';
    assert.equal(recognizeProgressSkipExtension(preview), scriptSaysSkip,
      '两边对这张图的判定必须一致：' + path);
  });
  // 空 preview_path 不归这个函数管：脚本把它归到 no-path，app 在 recognizeProgressState 里
  // 用单独一行的 `if (!String(preview.preview_path || '')) return;` 判掉（字体卡之类的虚拟预览）。
  // 两边都是"不算物料"，只是判据写在不同地方 —— 各自锁住。
  assert.equal(previewSkipReason({preview_path: ''}), SKIP_NO_PATH);
  assert.equal(recognizeProgressSkipExtension({id: 'p', preview_path: ''}), false);
  assert.match(source, /if \(!String\(preview\.preview_path \|\| ''\)\) return;\s*\/\/ 字体卡/);
});

/* ── 2) 进度条的「还剩 N 张」不许再算 .gif ───────────────────────────────── */

test('v916 剩余张数：没有 success 行的 .gif 不算（否则永远显示"还剩 87 张"）', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [
    preview('p-jpg', 'src-a'),
    preview('p-gif', 'src-a', 'u1/s1/animated.gif'),
    preview('p-gif-failed', 'src-b', 'u1/s1/broken.gif')
  ];
  const info = plain(recognizeProgressState({
    previews,
    tagRows: [row('p-gif-failed', 'src-b', 'failed')],
    sources: SOURCES
  }));
  assert.equal(info.kind, 'queued');
  assert.equal(info.remaining, 1, '只有 p-jpg 算剩余；两张 gif 脚本根本不会送');
});

test('v916 剩余张数：只剩 .gif 没识别 ⇒ 当成没事，整条隐藏', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [preview('p-jpg', 'src-a'), preview('p-gif', 'src-a', 'u1/s1/a.gif')],
    tagRows: [row('p-jpg', 'src-a', 'success')],
    sources: SOURCES
  }));
  assert.equal(info.visible, false, '库里那 87 张 gif 不许让进度条永远亮着');
  assert.equal(info.kind, 'idle');
});

test('v916 剩余张数：别的不可识别物料口径不变（视频 / 源文件 / 无预览路径仍不算）', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [
    preview('p-ok', 'src-a'),
    preview('p-mp4', 'src-a', 'video/demo.mp4'),
    preview('p-psd', 'src-a', 'design/a.psd'),
    preview('p-gif', 'src-a', 'u1/s1/a.gif'),
    {id: 'font-preview-src-a', source_file_id: 'src-a', preview_path: '', preview_filename: '字体卡'}
  ];
  const info = plain(recognizeProgressState({previews, tagRows: [], sources: SOURCES}));
  assert.equal(info.remaining, 1, '只有真会送模型的图片算数');
});

/* ── 3) 和脚本的默认行为对齐（--include-gif 是脚本的逃生开关，网站不跟）───── */

test('v916 口径：网站按脚本的**默认**行为算（不带 --include-gif）', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [preview('p-gif', 'src-a', 'u1/s1/a.gif')];
  // 脚本默认会把这张筛掉（selectRecognizablePreviews 空），网站也必须把它算成"不在队列里"
  assert.deepEqual(selectRecognizablePreviews(previews), []);
  assert.equal(previewSkipReason(previews[0]), SKIP_ANIMATED);
  const info = plain(recognizeProgressState({previews, tagRows: [], sources: SOURCES}));
  assert.equal(info.visible, false);
  assert.equal(info.remaining, 0);
});

test('v916 脚本侧注释留着实测依据（别把这条当成随手加的过滤）', () => {
  const scriptSource = readFileSync(join(here, '..', 'scripts', 'recognize-case-tags.mjs'), 'utf8');
  assert.match(scriptSource, /GLM 视觉通道吃不下动图/);
  assert.match(scriptSource, /2026-10-13 全量识别实测/);
  assert.match(source, /GLM 视觉通道吃不下动图/);
  assert.match(source, /93 张 gif 只成功 6 张/);
});

test('v916 版本号（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(/\?v=20261013-skip-gif-v916/g) || []).length, 5);
  assert.match(source, /const TOOL_UI_VERSION = '20261013-skip-gif-v916'/);
});
