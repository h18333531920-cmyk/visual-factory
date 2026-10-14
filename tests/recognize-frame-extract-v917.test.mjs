// v917：动态物料（gif/mp4/mov/webm）改用 ffmpeg 抽「中间帧 + 最后一帧」再送模型。
//
// 本机（Mac）**没有 ffmpeg**，所以这里不跑真命令：把「执行 ffmpeg/ffprobe」抽成可注入的执行器
// （defaultCommandRunner 是默认实现），测试注入一个假的 —— 假执行器只记录调用、按 args 里的输出路径
// 写一张真的 PNG 字节流。于是可以验到：抽帧参数对不对、超时给没给、2 张/1 张/0 张各走哪条路、
// 临时文件删没删干净、以及「真 GIF 字节 → 两帧 → data URL → 多图接口 → 写库行」这条链。
//
// 为什么值得这么测：这条链路直接决定库里那 93 张 gif / 若干 mp4 能不能被搜到；参数写错（比如漏了 -an、
// 或者把 -ss 放到 -i 后面）在 Mac 上看不出来，只有单测和服务器上的第一跑能暴露。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  NON_IMAGE_EXTENSIONS,
  DYNAMIC_EXTENSIONS,
  KIND_NONE,
  KIND_DIRECT,
  KIND_DYNAMIC,
  KIND_NON_IMAGE,
  SKIP_NO_PATH,
  SKIP_NON_IMAGE,
  SKIP_DYNAMIC,
  SKIP_NO_FFMPEG,
  RETRYABLE_KINDS,
  MODEL,
  FRAMES_MODEL,
  FRAME_LABEL_MIDDLE,
  FRAME_LABEL_LAST,
  FRAME_TAIL_SEC,
  FRAMES_MAX_INPUT_BYTES,
  FFMPEG_TIMEOUT_MS,
  FFPROBE_TIMEOUT_MS,
  previewKind,
  previewSkipReason,
  selectRecognizablePreviews,
  skipSummary,
  formatQueueComposition,
  pendingKindCounts,
  previewContentKey,
  buildSuccessRow,
  classifyError,
  ffprobeArgs,
  parseProbeNumber,
  ffmpegSeekArgs,
  ffmpegSelectArgs,
  frameExtractionPlan,
  probeMedia,
  probeMediaTools,
  resolveMediaTools,
  createTempWorkDir,
  cleanupTempDir,
  writeDynamicSource,
  extractDynamicFrames,
  framesToImagePayloads,
  analyzeFrameImages,
  prepareDynamicImages
} from '../scripts/recognize-case-tags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const scriptSource = readFileSync(join(here, '..', 'scripts', 'recognize-case-tags.mjs'), 'utf8');

// 真的 GIF89a 字节流（2 帧、8×8、每帧 100ms、loop=0、129 字节；PIL 生成，本测试只写不解码）。
const GIF_BYTES = Buffer.from(
  'R0lGODlhCAAIAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAACAAIAAAIDwABCBxIsKDBgwgTKkwYEAAh+QQBCgABACwAAAAACAAIAIEAAP8AAAAAAAAAAAAIDwABCBxIsKDBgwgTKkwYEAA7',
  'base64'
);
// 两张**不同**的真 PNG 字节流（4×4），拿来当假执行器的"产出"。
const PNG_MID = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGM8ISfHAANMcBZeDgA0dgEMydTl/QAAAABJRU5ErkJggg==', 'base64');
const PNG_LAST = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGOUkzvBAANMcBZeDgAzIgEMwWPAiQAAAABJRU5ErkJggg==', 'base64');

const previewOf = (id, path) => ({
  id,
  source_file_id: 'src-1',
  preview_path: path,
  preview_filename: path.split('/').pop(),
  preview_size_bytes: 129,
  updated_at: '2026-10-13T00:00:00Z'
});

// ── 假执行器 ────────────────────────────────────────────────────────────────
// 行为：ffprobe 按时长/帧数吐数字（可设成吐不出来）；ffmpeg 只要 failOn 不命中就往 args 的最后一个参数
// （输出路径）写一张真 PNG —— 文件名带 mid 就写 PNG_MID，否则写 PNG_LAST。
function fakeRunnerOf({duration = 4, frameCount = 10, unknownProbe = false, sameFrame = false, failOn = () => false} = {}) {
  const calls = [];
  const runner = async (command, args, options = {}) => {
    calls.push({command, args: args.slice(), timeoutMs: options && options.timeoutMs});
    if (String(command).includes('ffprobe')) {
      if (String(args[0]) === '-version') return {stdout: 'ffprobe version 6.1.1', stderr: ''};
      if (args.includes('-count_frames')) {
        if (unknownProbe) throw new Error('ffprobe 执行失败：读不出 nb_read_frames（N/A）');
        return {stdout: String(frameCount) + '\n', stderr: ''};
      }
      if (unknownProbe) throw new Error('ffprobe 执行失败：读不出时长（N/A）');
      return {stdout: String(duration) + '\n', stderr: ''};
    }
    if (String(args[0]) === '-version') return {stdout: 'ffmpeg version 6.1.1', stderr: ''};
    if (failOn(args)) throw Object.assign(new Error('ffmpeg 执行失败：Invalid data found when processing input'), {code: 1});
    const output = args[args.length - 1];
    writeFileSync(output, sameFrame || !/middle\.png$/.test(output) ? PNG_LAST : PNG_MID);
    return {stdout: '', stderr: ''};
  };
  return {runner, calls};
}

function withTempDir(fn) {
  const dir = createTempWorkDir('vf-v917-test-');
  try { return fn(dir); } finally { cleanupTempDir(dir); }
}

/* ── 1) 三分类与跳过原因 ──────────────────────────────────────────────────── */

test('v917 三分类：静态图直接送 / gif·mp4·mov·webm 抽帧送 / 其余跳过', () => {
  assert.deepEqual([...DYNAMIC_EXTENSIONS].sort(), ['gif', 'mov', 'mp4', 'webm'], '抽帧名单就是任务书这四种');
  ['mp4', 'webm', 'mov'].forEach((ext) => {
    assert.equal(NON_IMAGE_EXTENSIONS.has(ext), false, '视频容器归"抽帧"那组，不许留在"非图片"里：' + ext);
  });
  assert.equal(NON_IMAGE_EXTENSIONS.has('m4v'), true, '其它视频容器本轮不抽帧，仍然跳过');
  assert.equal(NON_IMAGE_EXTENSIONS.has('gif'), false, 'gif 属于抽帧那组');

  assert.equal(previewKind({preview_path: 'u1/s1/a.png'}), KIND_DIRECT);
  assert.equal(previewKind({preview_path: 'u1/s1/a.JPG'}), KIND_DIRECT);
  assert.equal(previewKind({preview_path: 'u1/s1/a.jpeg'}), KIND_DIRECT);
  assert.equal(previewKind({preview_path: 'u1/s1/a.webp'}), KIND_DIRECT);
  // 不在两个名单里的（bmp / avif / 没有后缀的老数据）仍旧直接送 —— v916 之前的行为逐字不变
  assert.equal(previewKind({preview_path: 'u1/s1/a.bmp'}), KIND_DIRECT);
  assert.equal(previewKind({preview_path: 'u1/s1/a'}), KIND_DIRECT);
  assert.equal(previewKind({preview_path: 'u1/s1/目录.中文.gif'}), KIND_DYNAMIC);
  assert.equal(previewKind({preview_path: 'u1/s1/a.GIF'}), KIND_DYNAMIC, '大小写都要认');
  assert.equal(previewKind({preview_path: 'u1/s1/a.MP4'}), KIND_DYNAMIC);
  assert.equal(previewKind({preview_path: 'u1/s1/a.psd'}), KIND_NON_IMAGE);
  assert.equal(previewKind({preview_path: 'u1/s1/a.json'}), KIND_NON_IMAGE);
  assert.equal(previewKind({preview_path: ''}), KIND_NONE);
  assert.equal(previewKind(null), KIND_NONE);
});

test('v917 跳过原因：默认都送，--skip-dynamic / 没有 ffmpeg 才退回跳过', () => {
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.gif'}), '', '默认送（抽帧后送）');
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.mp4'}), '');
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.gif'}, {skipDynamic: true}), SKIP_DYNAMIC);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.webm'}, {skipDynamic: true}), SKIP_DYNAMIC);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.gif'}, {ffmpegAvailable: false}), SKIP_NO_FFMPEG);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.gif'}, {skipDynamic: true, ffmpegAvailable: false}), SKIP_DYNAMIC,
    '两个原因同时成立时报 --skip-dynamic（那是人显式要的）');
  // 静态图与源文件这两条路完全不受开关影响
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.png'}, {skipDynamic: true, ffmpegAvailable: false}), '');
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.psd'}, {skipDynamic: true}), SKIP_NON_IMAGE);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.psd'}, {ffmpegAvailable: false}), SKIP_NON_IMAGE);
  assert.equal(previewSkipReason({preview_path: ''}), SKIP_NO_PATH);
});

/* ── 2) 队列构成：三类都报，且"抽帧"这一类必须显眼 ─────────────────────────── */

const QUEUE_MIX = [
  previewOf('p-jpg', 'u1/s1/a.jpg'),
  previewOf('p-gif1', 'u1/s1/弹窗.gif'),
  previewOf('p-gif2', 'u1/s1/弹窗2.gif'),
  previewOf('p-mp4', 'u1/s1/video.mp4'),
  previewOf('p-psd', 'u1/s1/design.psd'),
  {id: 'font-preview-src-1', source_file_id: 'src-1', preview_path: ''}
];

test('v917 dry-run 队列构成：直接送 / 抽帧送 / 跳过（各按原因）', () => {
  const summary = skipSummary(QUEUE_MIX);
  assert.deepEqual(summary, {total: 6, direct: 1, dynamic: 3, noPath: 1, nonImage: 1, dynamicSkipped: 0});
  assert.deepEqual(selectRecognizablePreviews(QUEUE_MIX).map(item => item.id), ['p-jpg', 'p-gif1', 'p-gif2', 'p-mp4'],
    'gif/mp4 现在真的进队列（v916 是把它们筛掉的）');

  const text = formatQueueComposition(summary);
  assert.match(text, /^队列构成：直接送图 1 张 · 抽帧送 3 张/, '抽帧那一类必须一眼看得见（用户拿它判断 ffmpeg 有没有生效）');
  assert.match(text, /ffmpeg 抽「中间帧 \+ 最后一帧」/);
  assert.match(text, /跳过 2 张（非图片 1 · 无预览路径 1）$/);
  assert.doesNotMatch(text, /动态 0/, '一切正常时不提动态，免得让人以为有问题');

  // --skip-dynamic：退回 v916 行为，动态物料进"跳过"
  const skippedDynamic = skipSummary(QUEUE_MIX, {skipDynamic: true});
  assert.deepEqual(skippedDynamic, {total: 6, direct: 1, dynamic: 0, noPath: 1, nonImage: 1, dynamicSkipped: 3});
  const skipText = formatQueueComposition(skippedDynamic, {skipDynamic: true});
  assert.match(skipText, /抽帧送 0 张（--skip-dynamic：gif\/mp4\/mov\/webm 一律跳过，不抽帧）/);
  assert.match(skipText, /跳过 5 张（非图片 1 · 无预览路径 1 · 动态 3（--skip-dynamic））/);
  assert.deepEqual(selectRecognizablePreviews(QUEUE_MIX, {skipDynamic: true}).map(item => item.id), ['p-jpg']);

  // 机器上没有 ffmpeg：动态物料退回跳过，原因写得明明白白
  const noTools = skipSummary(QUEUE_MIX, {ffmpegAvailable: false});
  assert.deepEqual(noTools, {total: 6, direct: 1, dynamic: 0, noPath: 1, nonImage: 1, dynamicSkipped: 3});
  const noToolsText = formatQueueComposition(noTools, {ffmpegAvailable: false});
  assert.match(noToolsText, /没有可用的 ffmpeg\/ffprobe ⇒ 动态物料退回跳过/);
  assert.match(noToolsText, /动态 3（没有可用的 ffmpeg\/ffprobe）/);

  // 待处理里两类各多少
  const planItems = selectRecognizablePreviews(QUEUE_MIX).map(preview => ({preview}));
  assert.deepEqual(pendingKindCounts(planItems), {direct: 1, dynamic: 3});
  assert.deepEqual(pendingKindCounts(null), {direct: 0, dynamic: 0});
  assert.match(formatQueueComposition(skipSummary([])), /直接送图 0 张 · 抽帧送 0 张.*跳过 0 张（非图片 0 · 无预览路径 0）$/);
});

/* ── 3) 命令长什么样（参数级断言）────────────────────────────────────────── */

test('v917 ffprobe：时长与帧数两条命令、读不出来一律当 0', () => {
  assert.deepEqual(ffprobeArgs('/tmp/in.gif'),
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', '/tmp/in.gif']);
  assert.deepEqual(ffprobeArgs('/tmp/in.gif', {frames: true}),
    ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'default=nw=1:nk=1', '/tmp/in.gif']);
  assert.equal(parseProbeNumber('4.967000\n'), 4.967);
  assert.equal(parseProbeNumber('12'), 12);
  ['N/A', '', null, undefined, 'n/a', '0', '-1'].forEach((value) => {
    assert.equal(parseProbeNumber(value), 0, '读不出来一律当 0 = 不知道，好去走不依赖探测的兜底：' + String(value));
  });
});

test('v917 ffmpeg 主路径：-ss/-sseof 在 -i 之前、只要一帧、不带音轨', () => {
  assert.deepEqual(
    ffmpegSeekArgs({input: '/tmp/in.gif', output: '/tmp/mid.png', time: 2}),
    ['-nostdin', '-loglevel', 'error', '-y', '-ss', '2', '-i', '/tmp/in.gif', '-frames:v', '1', '-an', '/tmp/mid.png']
  );
  // -sseof 是**输入选项**，放 -i 后面 ffmpeg 会当输出选项、静默不生效 ⇒ 必须在前
  const sseof = ffmpegSeekArgs({input: '/tmp/in.mp4', output: '/tmp/last.png', sseof: -FRAME_TAIL_SEC});
  assert.deepEqual(sseof,
    ['-nostdin', '-loglevel', 'error', '-y', '-sseof', '-0.15', '-i', '/tmp/in.mp4', '-frames:v', '1', '-an', '/tmp/last.png']);
  assert.ok(sseof.indexOf('-sseof') < sseof.indexOf('-i'), '-sseof 必须在 -i 之前');
  // -an 不能少：不带它的话从 mp4 抽帧会试着把音轨塞进 image2，ffmpeg 直接报错
  assert.ok(sseof.includes('-an'), '必须 -an（只要画面）');
  assert.equal(ffmpegSeekArgs({input: 'a', output: 'b'}).includes('-ss'), false, '没给时间就不加 -ss');

  // 按帧号 / 过滤器（兜底路径）：逗号要按 ffmpeg filtergraph 的规矩转义（execFile 直传 argv、不过 shell）
  assert.deepEqual(
    ffmpegSelectArgs({input: '/tmp/in.gif', output: '/tmp/mid.png', index: 4}),
    ['-nostdin', '-loglevel', 'error', '-y', '-i', '/tmp/in.gif', '-vf', 'select=eq(n\\,4)', '-frames:v', '1', '-an', '/tmp/mid.png']
  );
  assert.deepEqual(
    ffmpegSelectArgs({input: '/tmp/in.gif', output: '/tmp/mid.png', filter: 'thumbnail=100'}),
    ['-nostdin', '-loglevel', 'error', '-y', '-i', '/tmp/in.gif', '-vf', 'thumbnail=100', '-frames:v', '1', '-an', '/tmp/mid.png']
  );
});

test('v917 抽帧计划：主路径按时长，兜底 -sseof / 帧号 / thumbnail 一条都不许少', () => {
  const plan = frameExtractionPlan({input: '/tmp/in.gif', outputDir: '/tmp/dir', durationSec: 4.2, frameCount: 9});
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map(frame => frame.name), ['middle', 'last']);
  assert.deepEqual(plan.map(frame => frame.label), [FRAME_LABEL_MIDDLE, FRAME_LABEL_LAST]);
  assert.deepEqual(plan[0].attempts.map(item => item.id), ['time-mid', 'index-mid', 'thumbnail-mid']);
  assert.deepEqual(plan[1].attempts.map(item => item.id), ['time-last', 'index-last', 'sseof-last']);
  // 中间帧 = 时长一半；最后一帧 = 结尾前 0.15 秒
  assert.deepEqual(plan[0].attempts[0].args.slice(4, 6), ['-ss', '2.1']);
  assert.deepEqual(plan[1].attempts[0].args.slice(4, 6), ['-ss', '4.05']);
  // 帧号：中间帧取 (帧数-1)/2 向下取整 = 4；最后一帧取第 8 帧
  assert.match(plan[0].attempts[1].args.join(' '), /select=eq\(n\\,4\)/);
  assert.match(plan[1].attempts[1].args.join(' '), /select=eq\(n\\,8\)/);
  assert.match(plan[1].attempts[2].args.join(' '), /-sseof -0\.15/);
  // 输出路径就两个（同一帧的多个候选互相覆盖，不留垃圾）
  assert.deepEqual([...new Set(plan.map(frame => frame.output))], ['/tmp/dir/middle.png', '/tmp/dir/last.png']);
  assert.deepEqual(plan.map(frame => frame.attempts.map(item => item.args[item.args.length - 1]).every(p => p === frame.output)), [true, true]);

  // 探测全废（ffprobe 吐 N/A）：仍有两条不依赖探测的兜底，保证"至少能拿到 1 张"
  const bare = frameExtractionPlan({input: '/tmp/in.gif', outputDir: '/tmp/dir', durationSec: 0, frameCount: 0});
  assert.deepEqual(bare[0].attempts.map(item => item.id), ['thumbnail-mid']);
  assert.deepEqual(bare[1].attempts.map(item => item.id), ['sseof-last']);
});

/* ── 4) 探测：工具在不在、读不出东西也不许炸 ───────────────────────────────── */

test('v917 工具解析与探测：默认 PATH、可用环境变量覆盖、缺了不抛异常只降级', async () => {
  assert.deepEqual(resolveMediaTools({}), {ffmpeg: {command: 'ffmpeg', from: 'PATH'}, ffprobe: {command: 'ffprobe', from: 'PATH'}});
  assert.deepEqual(resolveMediaTools({FFMPEG_PATH: '/usr/bin/ffmpeg', FFPROBE_PATH: '/usr/bin/ffprobe'}),
    {ffmpeg: {command: '/usr/bin/ffmpeg', from: '环境变量 FFMPEG_PATH'}, ffprobe: {command: '/usr/bin/ffprobe', from: '环境变量 FFPROBE_PATH'}});
  assert.equal(resolveMediaTools({FFMPEG_PATH: '   '}).ffmpeg.command, 'ffmpeg', '空串等于没设');

  const ok = fakeRunnerOf();
  const tools = await probeMediaTools({env: {}, runner: ok.runner});
  assert.deepEqual([tools.ffmpegOk, tools.ffprobeOk, tools.available], [true, true, true]);
  assert.equal(tools.ffmpegPath, 'ffmpeg');
  assert.ok(ok.calls.every(call => call.args.join(' ') === '-version'), '探测只允许跑 -version（只读、无副作用）');
  assert.ok(ok.calls.every(call => call.timeoutMs === FFPROBE_TIMEOUT_MS));

  const broken = await probeMediaTools({env: {}, runner: async () => { throw new Error('spawn ffmpeg ENOENT'); }});
  assert.deepEqual([broken.ffmpegOk, broken.ffprobeOk, broken.available], [false, false, false]);
  assert.equal(broken.errors.length, 2, '缺了哪个要能说出来（日志里给人看）');
  assert.match(broken.errors[0], /ENOENT/);

  // ffprobe 完全不在：probeMedia 不许抛，返回 0 + 记两条原因 ⇒ 后面走 sseof/thumbnail 兜底
  const probe = await probeMedia({file: '/tmp/in.gif', runner: async () => { throw new Error('spawn ffprobe ENOENT'); }});
  assert.deepEqual([probe.durationSec, probe.frameCount], [0, 0]);
  assert.equal(probe.errors.length, 2);
});

test('v917 探测省时间：探出时长就不解全片数帧（除非调用方明确要）', async () => {
  const {runner, calls} = fakeRunnerOf({duration: 8, frameCount: 30});
  const framesCalls = () => calls.filter(call => call.args.includes('-count_frames')).length;
  const byDuration = await probeMedia({file: '/tmp/in.mp4', runner});
  assert.deepEqual([byDuration.durationSec, byDuration.frameCount], [8, 0]);
  assert.equal(framesCalls(), 0, '有时长就够了：-count_frames 要把整片解一遍，大 mp4 白等几十秒');

  calls.length = 0;
  const explicit = await probeMedia({file: '/tmp/in.gif', runner, wantFrameCount: true});
  assert.deepEqual([explicit.durationSec, explicit.frameCount], [8, 30]);
  assert.equal(framesCalls(), 1, 'gif 明确要帧数（小、按帧号取中间/末帧更靠谱）');

  calls.length = 0;
  const noDuration = await probeMedia({file: '/tmp/in.gif', runner: fakeRunnerOf({duration: 0, frameCount: 12}).runner});
  assert.deepEqual([noDuration.durationSec, noDuration.frameCount], [0, 12], '时长读不出来时必须去数帧，否则只剩两条兜底');
});

/* ── 5) 抽到几张 → 走哪条路 ───────────────────────────────────────────────── */

test('v917 抽到 2 张：走多图接口（一条消息看两张），写库行带 -frames 模型名', async () => {
  const {runner, calls} = fakeRunnerOf({duration: 4, frameCount: 10});
  const dir = createTempWorkDir('vf-v917-two-');
  try {
    const preview = previewOf('p-gif', 'u1/s1/弹窗.gif');
    const prepared = await prepareDynamicImages({preview, buffer: GIF_BYTES, dir, runner});
    assert.equal(prepared.model, FRAMES_MODEL);
    assert.equal(FRAMES_MODEL, 'glm-4v-flash-frames');
    assert.equal(prepared.images.length, 2);
    assert.deepEqual(prepared.frames.map(frame => frame.command), ['time-mid', 'time-last'], '主路径：按时长抽');
    assert.deepEqual(prepared.frames.map(frame => frame.label), [FRAME_LABEL_MIDDLE, FRAME_LABEL_LAST]);
    // 原片真的落盘了（后缀跟 preview_path 走，ffmpeg 靠后缀认容器）
    assert.equal(existsSync(join(dir, 'source.gif')), true);
    assert.equal(readFileSync(join(dir, 'source.gif')).equals(GIF_BYTES), true);
    // 两张帧就是那两张真 PNG 字节（data URL 可直接送模型）
    assert.equal(prepared.frames[0].buffer.equals(PNG_MID), true);
    assert.equal(prepared.frames[1].buffer.equals(PNG_LAST), true);
    assert.equal(prepared.images[0].url.startsWith('data:image/png;base64,'), true);
    assert.equal(Buffer.from(prepared.images[0].url.split(',')[1], 'base64').equals(PNG_MID), true);
    assert.deepEqual(prepared.images.map(item => item.label), [FRAME_LABEL_MIDDLE, FRAME_LABEL_LAST]);
    // 每条 ffmpeg 命令都带超时，别让坏文件把 worker 卡死
    assert.ok(calls.filter(call => call.command === 'ffmpeg').every(call => call.timeoutMs === FFMPEG_TIMEOUT_MS));

    // 多图接口：收到 2 张 + 标签；返回的 elements/activity 就是写库用的那套
    const seen = [];
    const analyzed = await analyzeFrameImages({
      images: prepared.images,
      env: {GLM_API_KEY: 'x'},
      vocabulary: ['汉堡'],
      activities: ['聚餐'],
      analyzeGroup: async (env, images, vocabulary, activities) => {
        seen.push({api: 'group', images, vocabulary, activities});
        return {elements: ['汉堡', '餐桌'], activity: '聚餐', sameDesign: true};
      },
      analyzeSingle: async () => { throw new Error('两张帧不该走单图接口'); }
    });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].api, 'group');
    assert.equal(seen[0].images.length, 2, '两张帧必须在**一条**消息里送（拿一套统一标签）');
    assert.deepEqual(seen[0].vocabulary, ['汉堡']);
    assert.deepEqual(seen[0].activities, ['聚餐']);
    assert.equal(seen[0].images[0].url, prepared.images[0].url);
    assert.equal(analyzed.api, 'group');
    assert.deepEqual(analyzed.elements, ['汉堡', '餐桌']);
    assert.equal(analyzed.activity, '聚餐');

    // 写库语义（v914 口径）一个字没变，只有 model 换成 -frames
    const row = buildSuccessRow({
      preview,
      tags: analyzed.elements,
      model: prepared.model,
      runId: 'run-1',
      current: {manual_tags: ['人工补的'], excluded_tags: ['餐桌'], status: 'failed'}
    });
    assert.deepEqual(row.ai_tags, ['汉堡'], 'ai_tags 要同时刨掉 excluded 与 manual');
    assert.deepEqual(row.manual_tags, ['人工补的']);
    assert.deepEqual(row.excluded_tags, ['餐桌']);
    assert.equal(row.model, FRAMES_MODEL);
    assert.equal(row.status, 'success');
    assert.equal(row.error_message, '');
    assert.equal(row.content_key, previewContentKey(preview));
    assert.notEqual(row.model, MODEL, '别把抽帧识别记成逐图那条路');
    assert.doesNotMatch(row.model, /-group/, '`-group` 是浏览器按组那条路的标记');
  } finally {
    cleanupTempDir(dir);
  }
});

test('v917 只抽到 1 张（中间帧失败）：退回单图接口，不留半成品', async () => {
  // 让"中间帧"那条路全失败：只要输出路径是 middle.png 就报错
  const {runner} = fakeRunnerOf({failOn: args => /middle\.png$/.test(args[args.length - 1])});
  const dir = createTempWorkDir('vf-v917-one-');
  try {
    const prepared = await prepareDynamicImages({preview: previewOf('p-gif', 'u1/s1/弹窗.gif'), buffer: GIF_BYTES, dir, runner});
    assert.equal(prepared.images.length, 1);
    assert.equal(prepared.frames[0].label, FRAME_LABEL_LAST);
    assert.equal(prepared.errors.length, 1);
    assert.match(prepared.errors[0], /中间帧抽帧失败/);
    assert.equal(prepared.model, FRAMES_MODEL, '只抽到 1 张也是"抽帧那条路"，模型名不变');

    const seen = [];
    const analyzed = await analyzeFrameImages({
      images: prepared.images,
      env: {},
      vocabulary: [],
      activities: [],
      analyzeSingle: async (env, url) => { seen.push({api: 'single', url}); return {elements: ['汉堡'], activity: ''}; },
      analyzeGroup: async () => { throw new Error('只有 1 张不该走多图接口'); }
    });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].api, 'single');
    assert.equal(seen[0].url, prepared.images[0].url);
    assert.deepEqual(analyzed.elements, ['汉堡']);
  } finally {
    cleanupTempDir(dir);
  }
});

test('v917 抽到 0 张：按失败处理、原因写清、临时目录照样删干净', async () => {
  const {runner, calls} = fakeRunnerOf({failOn: () => true});
  const dir = createTempWorkDir('vf-v917-zero-');
  const error = await prepareDynamicImages({
    preview: previewOf('p-gif', 'u1/s1/坏文件.gif'),
    buffer: GIF_BYTES,
    dir,
    runner
  }).then(() => null, caught => caught);
  assert.ok(error, '一张都没抽到必须抛错（调用方按失败处理）');
  assert.equal(error.kind, 'frame-extract');
  assert.match(error.message, /抽帧失败/);
  assert.match(error.message, /中间帧抽帧失败/, '要能看出是哪一张帧没拿到');
  assert.match(error.message, /最后一帧抽帧失败/);
  assert.match(error.message, /Invalid data found/, 'ffmpeg 的 stderr 摘要要带出来（否则没法排查）');
  // 失败也要把"试过哪些命令"记下来（失败清单 JSON 里会落这个字段）
  assert.deepEqual(error.commands.map(item => item.id), ['time-mid', 'index-mid', 'thumbnail-mid', 'time-last', 'index-last', 'sseof-last']);
  assert.equal(calls.filter(call => call.command === 'ffmpeg').length, 6, '每条兜底都要真的试过');
  // 抽帧失败归"frame-extract"这一类：不是限流、不是网络，重试同一份文件也是白搭 ⇒ 不进可重试集合
  assert.equal(classifyError(error), 'frame-extract');
  assert.equal(RETRYABLE_KINDS.has('frame-extract'), false);
  // 源片已落盘但一张帧都没有：目录里不该留 PNG
  assert.deepEqual(readPngsIn(dir), []);
  cleanupTempDir(dir);
  assert.equal(existsSync(dir), false);
});

function readPngsIn(dir) {
  try { return readdirSync(dir).filter(name => name.endsWith('.png')); } catch { return []; }
}

test('v917 ffprobe 读不出任何东西：靠 -sseof + thumbnail 兜底，仍能拿到 2 张', async () => {
  const {runner, calls} = fakeRunnerOf({unknownProbe: true});
  const dir = createTempWorkDir('vf-v917-noprobe-');
  try {
    const prepared = await prepareDynamicImages({preview: previewOf('p-mp4', 'u1/s1/v.mp4'), buffer: GIF_BYTES, dir, runner});
    assert.deepEqual(prepared.frames.map(frame => frame.command), ['thumbnail-mid', 'sseof-last'],
      '探测全废时走不依赖探测的两条兜底');
    assert.equal(prepared.probe.errors.length, 2);
    assert.equal(prepared.images.length, 2);
    const sseofCall = calls.find(call => call.command === 'ffmpeg' && call.args.includes('-sseof'));
    assert.ok(sseofCall, '-sseof 那条必须真的跑过');
    const thumbCall = calls.find(call => call.command === 'ffmpeg' && call.args.includes('thumbnail=100'));
    assert.ok(thumbCall, 'thumbnail 那条必须真的跑过');
  } finally {
    cleanupTempDir(dir);
  }
});

test('v917 静态 gif（两张帧字节一样）：只留 1 张，别拿同一张图当"一组"', async () => {
  const {runner} = fakeRunnerOf({sameFrame: true});
  const dir = createTempWorkDir('vf-v917-staticgif-');
  try {
    const prepared = await prepareDynamicImages({preview: previewOf('p-static', 'u1/s1/静图.gif'), buffer: GIF_BYTES, dir, runner});
    assert.equal(prepared.images.length, 1, '两张一样的帧去重成一张 ⇒ 走单图接口');
    assert.equal(prepared.frames[0].label, FRAME_LABEL_MIDDLE, '留中间帧（末帧与它逐字节相同）');
  } finally {
    cleanupTempDir(dir);
  }
});

/* ── 6) 临时文件与边界 ────────────────────────────────────────────────────── */

test('v917 临时文件：落在系统临时目录、用完删干净、超大文件先拦下来', async () => {
  const dir = createTempWorkDir();
  assert.equal(dir.startsWith(process.env.TMPDIR || '/tmp') || dir.includes('vf-recognize-'), true, '必须在系统临时目录里建');
  writeDynamicSource(dir, {preview_path: 'u1/s1/a.GIF'}, GIF_BYTES);
  assert.equal(existsSync(join(dir, 'source.GIF')), true, '后缀跟着 preview_path 走（大小写照抄）');
  writeDynamicSource(dir, {preview_path: 'u1/s1/b'}, GIF_BYTES);
  assert.equal(existsSync(join(dir, 'source.bin')), true, '没有后缀就给 .bin，别让 ffmpeg 猜不出来');
  cleanupTempDir(dir);
  assert.equal(existsSync(dir), false);
  assert.doesNotThrow(() => cleanupTempDir(''), '空目录名不许炸（静态图那条路就是空）');
  assert.doesNotThrow(() => cleanupTempDir('/tmp/不存在-vf-v917'), '已经没了也不许炸');

  // 超大动态物料：有 preview_size_bytes 的行在**下载前**就拦（processOne 里），
  // 元数据缺失/撒谎时这里再按真实字节数兜底拦一次。
  const huge = Buffer.alloc(FRAMES_MAX_INPUT_BYTES + 1);
  const {runner} = fakeRunnerOf();
  const bigDir = createTempWorkDir('vf-v917-huge-');
  const error = await prepareDynamicImages({preview: previewOf('p-big', 'u1/s1/big.mp4'), buffer: huge, dir: bigDir, runner})
    .then(() => null, caught => caught);
  assert.ok(error);
  assert.equal(error.kind, 'frame-extract');
  assert.match(error.message, /超过抽帧上限/);
  assert.equal(classifyError(error), 'frame-extract');
  cleanupTempDir(bigDir);
});

/* ── 7) 源码接线：main / runBatch 真的用了这些函数 ─────────────────────────── */

test('v917 接线：筛选、队列构成、抽帧、多图接口、模型名、清理都接上了', () => {
  assert.match(scriptSource, /const previews = selectRecognizablePreviews\(casePreviews, queueOptions\)/);
  assert.match(scriptSource, /const skipped = skipSummary\(casePreviews, queueOptions\)/);
  assert.match(scriptSource, /const queueOptions = \{skipDynamic: options\.skipDynamic, ffmpegAvailable: mediaTools\.available\}/);
  assert.match(scriptSource, /console\.log\(formatQueueComposition\(skipped, queueOptions\)\)/);
  assert.match(scriptSource, /pendingKindCounts\(plan\.pending\)/);
  assert.match(scriptSource, /const mediaTools = options\.skipDynamic[\s\S]{0,120}probeMediaTools\(\)/);
  assert.match(scriptSource, /import \{analyzeCaseTagsWithGlm, analyzeCaseTagGroupsWithGlm\} from '\.\.\/functions\/_ai\.js'/, '多图接口用的是现成的那个');
  assert.match(scriptSource, /if \(dynamic\) \{\s*\n\s*workDir = createTempWorkDir\(\);/);
  assert.match(scriptSource, /const prepared = await prepareDynamicImages\(\{/);
  assert.match(scriptSource, /runner: options\.runner/, '执行器可注入（默认在 prepareDynamicImages 里取 defaultCommandRunner）');
  assert.match(scriptSource, /declaredBytes > FRAMES_MAX_INPUT_BYTES/, '能用 preview_size_bytes 提前拦的就不下载');
  // v918 起这个调用多了 effectVocabulary 一行（只有动态物料才传效果词表），前几项一字未动
  assert.match(scriptSource, /analyzeFrameImages\(\{\s*\n\s*images,\s*\n\s*env: \{GLM_API_KEY: creds\.glmKey\},\s*\n\s*vocabulary,\s*\n\s*activities: CASE_ACTIVITY_VALUES,/);
  assert.match(scriptSource, /buildSuccessRow\(\{preview: item\.preview, tags, effects, model, runId, current: fresh\}\)/, 'model 跟着走：抽帧那批写成 -frames');
  assert.match(scriptSource, /\} finally \{[\s\S]{0,120}cleanupTempDir\(workDir\);/, '不管成功失败都要删临时文件');
  // 逃生开关改名 + 老开关给一句明确的话（别让人以为是打错了）
  assert.match(scriptSource, /if \(arg === '--skip-dynamic'\) \{ options\.skipDynamic = true; continue; \}/);
  assert.doesNotMatch(scriptSource, /includeGif/, '--include-gif 必须彻底退场');
  // 路径可用环境变量覆盖
  assert.match(scriptSource, /pick\('FFMPEG_PATH', 'ffmpeg'\)/);
  assert.match(scriptSource, /pick\('FFPROBE_PATH', 'ffprobe'\)/);
  // 临时目录只在 os.tmpdir() 下建（别污染 /opt/case-tags 或仓库目录）
  assert.match(scriptSource, /mkdtempSync\(join\(tmpdir\(\), prefix\)\)/);
  // 写库口径没被动过（与 v914 一致）：仍然只 POST 一次、ai_tags 同时刨掉 excluded 与 manual
  assert.match(scriptSource, /\.filter\(tag => !excludedSet\.has\(tag\) && !manualSet\.has\(tag\)\)/);
  assert.equal(scriptSource.split("method: 'POST'").length - 1, 1);
});
