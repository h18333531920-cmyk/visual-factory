#!/usr/bin/env node
// 案例库逐图 AI 标签的**本机批量识别脚本**（2026-10-13）。
//
// 起因：浏览器里的「一键识别」是 2 并发 + 手点 + 关页面就停，1953 张要跑 1.5–3 小时。
// 这个脚本直连 Supabase（service role）+ 直连智谱视觉模型，一次把案例库 99 个项目的逐图元素标签补齐，
// 带限流 / 重试 / 断点续跑 / 进度，跑完不用人守着。
//
// 三条口径必须与线上一致，改这里等于改线上行为：
//   ① 写库语义照抄 functions/api/case-preview-ai-tags.js 的 save 动作 ——
//      ai_tags = 模型新标签 去掉 excluded_tags 与 manual_tags 里已有的（v914 起同口径：同一个词不存两份）；
//      manual_tags / excluded_tags 原样保留不许覆盖；
//      status='success' + model + content_key + error_message=''。
//   ② content_key 照抄端点 previewContentKey()（**v924 起 = preview_path | preview_size_bytes**，
//      不再含 updated_at —— 原因见下面的 previewContentKey() 注释）——
//      对不上就说明画面变过，那张得重跑，这也是断点续跑判断「已完成」的唯一依据。
//      比对一律走 contentKeyUnchanged()（只比前两段），历史 3 段老 key 才算得上"没变"。
//   ③ 识别口径复用 functions/_ai.js 的 analyzeCaseTagsWithGlm()（提示词、≤5 字 / ≤12 条、词表归一、
//      KIKI 别名都在那边），这里绝不重写提示词；动态物料的一两组帧走同一个文件里的
//      analyzeCaseTagGroupsWithGlm()（一条消息看多张），提示词同样在那边、这里也不改。
//   ④ 哪些物料"能识别"只有一处判据：previewSkipReason()（见下），物料分三类 ——
//      ① 直接送（静态图，行为不变）② 抽帧后送（gif/mp4/mov/webm，v917）③ 跳过（源文件/无预览路径）。
//   ⑤ v918 效果标签：**只有动态物料（抽帧那一类）**才额外请求「效果类型」标签，静态图一律写空数组
//      （用户口径：「动态弹窗跟静态物料的标签识别要有区别」）。候选词来自 vf_tag_vocabulary 里
//      kind='effect' 的行（受控词表，见 sql/028），与元素词表**分开传**（两个数组，不混一个）；
//      模型只许从这份词表里挑，写进 vf_preview_ai_tags.effect_tags。
//      ⚠️ 断点续跑只认 content_key + status（见 planWorkItems），**不认 effect_tags 是不是空的** ——
//      所以库里 v918 之前识别过的动态物料（status=success、内容没变）不会被自动补上效果标签。
//      v919 `--force-dynamic` 就是为补这一批加的：**只**把「已成功且内容没变」的**动态物料**放进计划，
//      静态图照旧跳过（不然一千多张静态图会被白跑一遍 —— 用户明确不想要那个）。`--force` 仍是"所有都强制"，
//      且**优先于 --force-dynamic**（两个一起传 = 全都强制）。
//      **抽帧**是 v917 的核心：GLM 视觉通道吃不下动图（2026-10-13 全量实测：93 张 gif 只成功 6 张），
//      所以先用 ffmpeg 把动态物料抽成「中间帧 + 最后一帧」两张静态 PNG 再送模型。
//      取自中间帧和末帧而不是首帧，是因为**用户实测反馈**：动态弹窗的第一帧往往还没弹出来（空状态）。
//      两张当"一组"送给 analyzeCaseTagGroupsWithGlm()，拿回**一套统一标签**（实测：两张
//      1000×2168 竖版图一起送，4.9 秒返回 {"elements":[...],"activity":"..."}）—— 不用调两次、不用自己合并。
//      要退回老行为（动态物料一律跳过、连抽帧都不试）加 --skip-dynamic。
// 本轮仍只做**逐图**识别（一张静态图 = 一次调用；一个动态物料的 1–2 张帧 = 一次多图调用）；
// 按组（多张不同物料共用一个标签集）那条路先不碰 —— 分组口径还 park 着（见 HANDOVER §11）。
//
// 安全：只写 vf_preview_ai_tags，不碰 vf_source_files / vf_asset_previews；
// 凭证只从环境变量或 .local/recognize.env 读，源码里绝不落任何密钥，日志里也不打印完整 key。

import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';
import {analyzeCaseTagsWithGlm, analyzeCaseTagGroupsWithGlm} from '../functions/_ai.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ENV_FILE = join(ROOT, '.local', 'recognize.env');
const OUTPUT_DIR = join(ROOT, 'outputs');
const BUCKET = 'vf-library';

// 分区名而已，别改：库里已有的行都挂在 'augpicks-v1' 下，改名 = 现有数据全部读不到。
export const EXPERIMENT_KEY = 'augpicks-v1';
export const MODEL = 'glm-4v-flash';
// 抽帧识别（gif/mp4/mov/webm）的行写这个模型名 —— 好把三条路子区分开：
// 逐图 = 纯模型名 · 抽帧 = `-frames` · 浏览器里的按组识别 = `-group` / `-group-fallback`（见 v906）。
export const FRAMES_MODEL = 'glm-4v-flash-frames';
export const DEFAULT_CONCURRENCY = 4;
export const CONCURRENCY_MAX = 8;          // 免费档限流未知（HANDOVER 没实测过），并发不许再往上加
export const DEFAULT_RATE = 2;             // 每秒最多发起几次模型调用；模型本身几秒一张，这个默认基本不会卡住谁
export const RETRY_ATTEMPTS = 3;
export const RETRY_BASE_MS = 1500;
export const MODEL_TIMEOUT_MS = 60000;
export const STORAGE_TIMEOUT_MS = 30000;
export const PAGE_SIZE = 1000;
export const MAX_PAGES = 50;               // 5 万行的保险丝，防查询写错时无限翻页
export const VOCABULARY_MAX = 160;         // 与 app.js caseElementVocabulary() / _ai.js 的截断一致
export const EFFECT_VOCABULARY_MAX = 60;   // v918 效果词表（kind='effect'）的截断，与 _ai.js 的 slice(0,60) 一致

// ── 抽帧（ffmpeg）参数（v917）──────────────────────────────────────────────
// 服务器上实测已装好 `/usr/bin/ffmpeg` + `/usr/bin/ffprobe`（ffmpeg 6.1.1）；本机 Mac 上没有，
// 所以**抽帧能力先探测、再决定动态物料怎么处理**：探测/抽帧失败一律退回"跳过/记原因"，绝不让整轮跑挂掉。
// 路径可用环境变量 FFMPEG_PATH / FFPROBE_PATH 覆盖；默认就调 PATH 里的 ffmpeg / ffprobe
// （worker 的 cron PATH 是 /usr/bin:/bin，够用）。
export const FFMPEG_TIMEOUT_MS = 30000;    // 单条 ffmpeg 命令上限：从 mp4 抽一帧正常是亚秒级，30s 就是"卡住了"
export const FFPROBE_TIMEOUT_MS = 15000;   // gif 的 -count_frames 要解全片，给宽一点
export const FRAME_TAIL_SEC = 0.15;        // "最后一帧" = 结尾前 0.15 秒（-sseof 兜底用同一个数）
export const FFMPEG_MAX_BUFFER = 8 * 1024 * 1024;
export const FRAMES_MAX_INPUT_BYTES = 300 * 1024 * 1024;   // 下载原片的上限：抽帧只出两张 PNG，别把 GB 级视频拖下来
                                                          // （processOne 先用 preview_size_bytes 提前拦，这里再按真实字节数兜底）
export const FRAME_LABEL_MIDDLE = '中间帧';
export const FRAME_LABEL_LAST = '最后一帧';
export const FRAME_MIDDLE = 'middle';
export const FRAME_LAST = 'last';

// 与 app.js 的 FILTER_SECTIONS_CONFIG.element.values 保持一致（静态元素词，排在库内标签之后兜底）
export const CASE_ELEMENT_STATIC_VALUES = ['银行卡', '券', 'kiki', '骑手', '国旗', '手机', '耳机', 'PS5'];
// 与 app.js 的 FILTER_SECTIONS_CONFIG.activity.values 保持一致（活动词表只进提示词，不入库）
export const CASE_ACTIVITY_VALUES = ['聚餐', '足球', '夏日', '新年', '世界杯', '游戏', '开学', '开斋节', '宰牲节', '国庆节'];

// 物料后缀三分类（v917），**唯一判据是 previewKind()**（在下面）：
//   ① 直接送（静态图）：不在下面两个名单里的都算，v916 之前的行为逐字不变（含 bmp/avif/没后缀的老数据）。
//   ② 抽帧后送（gif/mp4/mov/webm）：用 ffmpeg 抽「中间帧 + 最后一帧」两张静态 PNG 再送模型。
//      为什么必须抽帧（2026-10-13 全量识别实测）：失败 87 张**全是 .gif**（全库 93 张 gif 只成功 6 张），
//      因为旧脚本把**整个 GIF 字节**当一张图（data:image/gif;base64,…）塞给 GLM，而模型只吃静态图格式；
//      mp4 之类更惨，被当"非图片"直接跳过、一张都没识别过。
//      为什么是「中间帧 + 最后一帧」而不是首帧（用户实测反馈）：动态弹窗的**第一帧往往还没弹出来**，
//      是空状态 —— 只取首帧等于没识别。
//   ③ 跳过（记原因，不占队列）：其它视频容器（本轮只做 gif/mp4/mov/webm）+ 源文件 / 矢量图 / 压缩包 / 字体。
//      注意这组**和 v916 那组不是一回事**：那时 gif 是"模型吃不下"、现在归②真的去抽帧了。
export const NON_IMAGE_EXTENSIONS = new Set([
  'm4v', 'avi', 'mkv',
  'pdf', 'psd', 'psb', 'ai', 'eps', 'svg', 'json', 'zip', 'rar',
  'ttf', 'otf', 'woff', 'woff2'
]);

// 抽帧名单：与 app.js 的进度条口径必须同一条（那边是"除了 NON_IMAGE + 无预览路径，其余都算"）。
// ffmpeg 其实还能吃 m4v/avi/mkv，本轮按任务书只做这四种，其余保持"非图片"不动。
export const DYNAMIC_EXTENSIONS = new Set(['gif', 'mp4', 'mov', 'webm']);

// 跳过原因（给计数与文案用，别在打印的地方硬编码字符串）
export const SKIP_NO_PATH = 'no-path';       // 没有 preview_path（字体卡之类的虚拟预览）
export const SKIP_NON_IMAGE = 'non-image';   // 其它视频容器 / 源文件 / 矢量图 / 字体
export const SKIP_DYNAMIC = 'dynamic';       // --skip-dynamic：动态物料一律跳过（连抽帧都不试）
export const SKIP_NO_FFMPEG = 'no-ffmpeg';   // 机器上没有可用的 ffmpeg/ffprobe ⇒ 动态物料退回跳过

// 物料种类（previewKind 的返回值；筛选、计数、文案都走它，别在各处自己判后缀）
export const KIND_NONE = 'none';             // 没有 preview_path
export const KIND_DIRECT = 'direct';         // 静态图，直接送
export const KIND_DYNAMIC = 'dynamic';       // gif/mp4/mov/webm，抽帧后送
export const KIND_NON_IMAGE = 'non-image';   // 跳过

const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif'
};

const runState = {aborted: false};

/* ───────────────────────── 纯逻辑（单测覆盖，别把可测的东西塞进 main） ───────────────────────── */

// 与端点 previewContentKey() 逐字一致。任何一个字段对不上，这张图的标签就算过期。
// v924：**去掉 updated_at** —— 内容指纹只看图片本身（路径 + 字节数）。
// 起因（2026-10-14 实测事故）：updated_at 是数据库触发器（vf_touch_updated_at）在**任何** UPDATE 时都会
// 刷新的字段，所以给 525 张补 language、给 78 张补 material_type 这种**跟图片内容无关的编辑**也把它刷了，
// 于是这 ~600 张的指纹全变 ⇒ 腾讯云上的 cron 把它们全部重跑了一遍（约 20 张/5 分钟），图根本没换、
// 白烧 600 次模型调用。代价：**同路径 + 同字节数、但内容真的换过**的图检测不出来（见 contentKeyUnchanged）。
export function previewContentKey(preview) {
  return [preview?.preview_path || '', preview?.preview_size_bytes || 0].join('|');
}

// 「这张图的内容变没变」的**唯一比对入口** —— 所有比较点都必须走这里，别再在别处直接 !== 比字符串。
//
// 为什么不能直接比：库里**已经存着的** content_key 是 v923 及以前的 **3 段格式**
// （`path|size|updated_at`，全库 1941 张都是），v924 起新写进去的才是 2 段（`path|size`）。
// 拿新值跟老值直接 `!==` 比永远不相等 ⇒ **整库会被判成"内容变了"、全部重跑一遍**，正是这次要避免的浪费。
// 所以这里只比**前两段**：把库里那个字符串按 '|' 切开取前两段，与新的 previewContentKey() 比 ——
// 3 段老格式与 2 段新格式因此等价，老行自然"内容没变"（它们下次被写入时自动升级成 2 段）。
// 没存过 key（空串）⇒ 没得比，当"变了"（与 v923 之前的老行为一致）。
export function contentKeyUnchanged(storedKey, preview) {
  const stored = String(storedKey || '');
  if (!stored) return false;
  return stored.split('|').slice(0, 2).join('|') === previewContentKey(preview);
}

// 缩略图约定：静态缩略图与预览图同目录，所以只换文件名（同 app.js 里那套 replace）。
// 没有目录（路径里没有斜杠）时推不出来，原样返回 —— 取图那一步会跳过重复项、直接试原图。
export function thumbPathForPreview(preview) {
  const path = String(preview?.preview_path || '');
  if (!path) return '';
  return path.replace(/\/[^/]+$/, '/_thumb.jpg');
}

// 实际取图顺序：① 约定的 _thumb.jpg ② app.js 给预览图实际用的 _thumb-<preview_id>.jpg
// ③ 原图（缩略图 404 时兜底，记进日志）。老数据没生成过缩略图是常态，不能当失败。
export function thumbnailCandidatesForPreview(preview) {
  const path = String(preview?.preview_path || '');
  if (!path) return [];
  const out = [];
  const push = (value) => { if (value && !out.includes(value)) out.push(value); };
  push(thumbPathForPreview(preview));
  if (preview?.id) push(path.replace(/\/[^/]+$/, '/_thumb-' + preview.id + '.jpg'));
  push(path);
  return out;
}

export function previewExtension(preview) {
  const match = String(preview?.preview_path || '').match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

// 物料种类：'none' | 'direct' | 'dynamic' | 'non-image'。**全脚本只有这一处判后缀**
// （main 的筛选、dry-run 的计数、抽帧分流都走它）。
// 网站那条进度条的「还剩 N 张」是同一条口径（app.js 的 recognizeProgressSkipExtension /
// RECOGNIZE_PROGRESS_SKIP_EXT，判据 = "除了非图片 + 无预览路径，其余都算"，
// 改一边必须改另一边 —— tests/recognize-dynamic-frames-v917.test.mjs 锁两边逐字一致）。
export function previewKind(preview) {
  if (!String(preview?.preview_path || '')) return KIND_NONE;
  const ext = previewExtension(preview);
  if (!ext) return KIND_DIRECT;                              // 没有后缀的老数据当图片试一把
  if (NON_IMAGE_EXTENSIONS.has(ext)) return KIND_NON_IMAGE;
  if (DYNAMIC_EXTENSIONS.has(ext)) return KIND_DYNAMIC;
  return KIND_DIRECT;
}

// 「这张能不能送模型」的**唯一判据**：返回 '' = 送（静态图直接送 / 动态物料抽帧后送），否则返回跳过原因。
// options.skipDynamic = --skip-dynamic（动态物料退回 v916 行为：一律跳过，不抽帧）；
// options.ffmpegAvailable = 抽帧能力探测结果（false ⇒ 动态物料退回跳过并记原因，静态图照常跑）。
export function previewSkipReason(preview, {skipDynamic = false, ffmpegAvailable = true} = {}) {
  const kind = previewKind(preview);
  if (kind === KIND_NONE) return SKIP_NO_PATH;
  if (kind === KIND_NON_IMAGE) return SKIP_NON_IMAGE;
  if (kind === KIND_DYNAMIC) {
    if (skipDynamic) return SKIP_DYNAMIC;
    if (!ffmpegAvailable) return SKIP_NO_FFMPEG;
  }
  return '';
}

export function isRecognizablePreview(preview, options = {}) {
  return previewSkipReason(preview, options) === '';
}

export function selectRecognizablePreviews(previews, options = {}) {
  return (Array.isArray(previews) ? previews : []).filter(preview => isRecognizablePreview(preview, options));
}

// 「队列构成」：dry-run 与正式跑共用这一份计数，别在两处各算一遍。
export function skipSummary(previews, options = {}) {
  const summary = {total: 0, direct: 0, dynamic: 0, noPath: 0, nonImage: 0, dynamicSkipped: 0};
  for (const preview of Array.isArray(previews) ? previews : []) {
    summary.total += 1;
    const reason = previewSkipReason(preview, options);
    if (reason === SKIP_NO_PATH) summary.noPath += 1;
    else if (reason === SKIP_NON_IMAGE) summary.nonImage += 1;
    else if (reason === SKIP_DYNAMIC || reason === SKIP_NO_FFMPEG) summary.dynamicSkipped += 1;
    else if (previewKind(preview) === KIND_DYNAMIC) summary.dynamic += 1;
    else summary.direct += 1;
  }
  return summary;
}

// 三行合一，一眼看懂队列怎么构成的（用户要拿「抽帧送 N 张」判断 ffmpeg 到底有没有生效）。
// 计数为 0 的也照打：这段的意义就是让人看懂"哪些被跳过、凭什么"。
export function formatQueueComposition(summary, {skipDynamic = false, ffmpegAvailable = true} = {}) {
  const counts = summary || {};
  const dynamicSkipped = counts.dynamicSkipped || 0;
  const skipped = (counts.noPath || 0) + (counts.nonImage || 0) + dynamicSkipped;
  const skipDetail = [
    '非图片 ' + (counts.nonImage || 0),
    '无预览路径 ' + (counts.noPath || 0)
  ];
  // 动态物料被跳过时才列出来（正常跑它是 0，列了反而让人以为有问题）
  if (dynamicSkipped > 0) {
    const why = skipDynamic ? '（--skip-dynamic）' : (!ffmpegAvailable ? '（没有可用的 ffmpeg/ffprobe）' : '');
    skipDetail.push('动态 ' + dynamicSkipped + why);
  }
  const dynamicNote = skipDynamic
    ? '（--skip-dynamic：gif/mp4/mov/webm 一律跳过，不抽帧）'
    : ffmpegAvailable
      ? '（gif/mp4/mov/webm：ffmpeg 抽「中间帧 + 最后一帧」再送）'
      : '（没有可用的 ffmpeg/ffprobe ⇒ 动态物料退回跳过）';
  return '队列构成：直接送图 ' + (counts.direct || 0) + ' 张 · 抽帧送 ' + (counts.dynamic || 0) + ' 张'
    + dynamicNote + ' · 跳过 ' + skipped + ' 张（' + skipDetail.join(' · ') + '）';
}

// 待处理清单里两类各多少（dry-run 也要能一眼看出"抽帧"这一类有多少）。
export function pendingKindCounts(items) {
  const out = {direct: 0, dynamic: 0};
  for (const item of Array.isArray(items) ? items : []) {
    if (previewKind(item?.preview) === KIND_DYNAMIC) out.dynamic += 1;
    else out.direct += 1;
  }
  return out;
}

// 「待处理：N 张」那一行（dry-run 与正式跑都打，这就是用户判断"这次跑什么、为什么"的入口）。
// 抽成纯函数才好锁文案：**加了 --force-dynamic 时要把"其中有几张是被这个开关强行拎出来的"写清楚**，
// 不加时这一行与 v918 逐字一致（forceDynamic 计入 0、多出来的那段不出现）。
// 两个开关一起传时 --force 优先：那时动态那几张已经算在 "--force 重跑" 里，这里不再重复报账。
export function formatPendingSummary(plan, pendingKinds, {force = false, forceDynamic = false} = {}) {
  const stats = plan?.stats || {};
  const reasons = stats.reasons || {};
  const kinds = pendingKinds || {direct: 0, dynamic: 0};
  return '待处理：' + (stats.pending || 0) + ' 张'
    + '（其中直接送图 ' + (kinds.direct || 0) + ' 张 · 抽帧送 ' + (kinds.dynamic || 0) + ' 张）'
    + (forceDynamic && !force
      ? '（其中 --force-dynamic 强制重跑动态物料 ' + (reasons.forceDynamic || 0) + ' 张）'
      : '')
    + '（新增 ' + (reasons.noRow || 0)
    + ' / 未成功 ' + (reasons.notSuccess || 0)
    + ' / 内容变了 ' + (reasons.contentChanged || 0)
    + (force ? ' / --force 重跑 ' + (reasons.force || 0) : '')
    + '），跳过 ' + (stats.skipped || 0) + ' 张（已成功且内容没变）'
    + ((stats.pendingTotal || 0) > (stats.pending || 0)
      ? '，另有 ' + ((stats.pendingTotal || 0) - (stats.pending || 0)) + ' 张被 --limit 留到下一轮'
      : '');
}

export function mimeForImagePath(path) {
  const match = String(path || '').match(/\.([a-z0-9]+)$/i);
  return (match && MIME_BY_EXT[match[1].toLowerCase()]) || 'image/jpeg';
}

// 照端点 cleanTags()：去空、单条 ≤12 字、去重、最多 12 条。
// 注意这跟识别结果的 ≤5 字不是一回事：≤5 字由 _ai.js 的 parseElementSuggestions 收口，
// 这里是写库前的最后一道，口径必须和端点一模一样，否则同一张图在脚本与 app 里结果不同。
export function cleanTags(values) {
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const value = String(raw == null ? '' : raw).trim();
    if (!value || value.length > 12 || out.includes(value)) continue;
    out.push(value);
    if (out.length >= 12) break;
  }
  return out;
}

// 成功行：ai_tags 里刨掉 excluded_tags **和 manual_tags**（端点的 save 就是这个顺序，v914 起两边同口径），
// 人工两列原样带回。同一个词不再 AI 一份、人工一份。
// v918：effect_tags 用**同一条去重口径**（excluded_tags / manual_tags 里已有的词不再重复进效果标签），
// 人工两列照旧原样保留、绝不覆盖；静态物料 effects 传空数组 ⇒ effect_tags 写 '{}'。
// `current` 必须是**写之前刚读到的**那一行，绝不拿空数组起底（v864 那次的教训）。
export function buildSuccessRow({preview, tags, effects = [], model = MODEL, runId = null, current = null, experimentKey = EXPERIMENT_KEY}) {
  const excluded = cleanTags(current?.excluded_tags);
  const excludedSet = new Set(excluded);
  const manualTags = cleanTags(current?.manual_tags);
  const manualSet = new Set(manualTags);
  return {
    experiment_key: experimentKey,
    preview_id: preview.id,
    source_file_id: preview.source_file_id,
    ai_tags: cleanTags(tags).filter(tag => !excludedSet.has(tag) && !manualSet.has(tag)),
    effect_tags: cleanTags(effects).filter(tag => !excludedSet.has(tag) && !manualSet.has(tag)),
    manual_tags: manualTags,
    excluded_tags: excluded,
    status: 'success',
    model: String(model || MODEL).slice(0, 80),
    content_key: previewContentKey(preview),
    run_id: runId,
    error_message: ''
  };
}

// sql/028 没执行时（vf_preview_ai_tags 里还没有 effect_tags 列）PostgREST 会拒整条写入
// （PGRST204 / 42703，报文里带列名）。这时**降级**：去掉这一列重写一次，别的照常写 ——
// 与端点 functions/api/case-preview-ai-tags.js 的降级同口径。
export function isMissingEffectTagsColumnError(error) {
  const message = String(error?.message || error || '');
  return /effect_tags/i.test(message) && /column|does not exist|schema cache|Could not find/i.test(message);
}

export function withoutEffectTags(row) {
  if (!row || typeof row !== 'object') return row;
  const {effect_tags, ...rest} = row;   // eslint-disable-line no-unused-vars
  return rest;
}

// 失败行**只带状态列**：不带 ai_tags / manual_tags / excluded_tags，
// 这样 merge-duplicates 不会碰到它们 —— 识别失败不该抹掉这张图已有的标签和人工标注。
export function buildFailureRow({preview, error, current = null, experimentKey = EXPERIMENT_KEY}) {
  return {
    experiment_key: experimentKey,
    preview_id: preview.id,
    source_file_id: preview.source_file_id,
    status: 'failed',
    content_key: previewContentKey(preview),
    model: String(current?.model || ''),
    error_message: String(error || '').trim().slice(0, 500) || '识别失败'
  };
}

// 断点续跑的核心：只有「没有行 / 状态不是 success / content_key 变了」才重跑。
// content_key 一致 = 画面没变过，标签直接可用（--force / --force-dynamic 才重跑）。
// v919 --force-dynamic：**只**把「已成功且内容没变」的**动态物料**（gif/mp4/mov/webm，抽帧那一类）
// 也放进计划 —— 那些行是 v918 之前生成的，effect_tags 是空的，得重跑一次才补得上效果标签。
// 静态图**不受这个开关影响**：已成功且内容没变的照旧跳过（这就是这个开关存在的唯一理由 ——
// 只重跑动态物料，不把一千多张静态图再跑一遍）。
// force（--force）是"所有都强制"，且**优先级高于 forceDynamic**：两个一起传 = 只按 force 算。
export function planWorkItems({previews = [], existingRows = [], force = false, forceDynamic = false, limit = 0} = {}) {
  const existing = new Map();
  for (const row of existingRows) {
    if (row?.preview_id) existing.set(row.preview_id, row);
  }
  const pending = [];
  const skipped = [];
  const reasons = {noRow: 0, notSuccess: 0, contentChanged: 0, force: 0, forceDynamic: 0};
  for (const preview of previews) {
    const current = existing.get(preview.id) || null;
    const contentKey = previewContentKey(preview);
    let reason = '';
    if (!current) { reason = 'no-row'; reasons.noRow += 1; }
    else if (force) { reason = 'force'; reasons.force += 1; }
    else if (String(current.status || '') !== 'success') { reason = 'not-success'; reasons.notSuccess += 1; }
    else if (!contentKeyUnchanged(current.content_key, preview)) { reason = 'content-changed'; reasons.contentChanged += 1; }
    // 走到这里 = 已成功 + 内容没变：只有「动态物料 + 开了 --force-dynamic」才重跑，其余照旧跳过。
    else if (forceDynamic && previewKind(preview) === KIND_DYNAMIC) { reason = 'force-dynamic'; reasons.forceDynamic += 1; }
    if (reason) pending.push({preview, current, reason, contentKey});
    else skipped.push({preview, current});
  }
  const limited = limit > 0 ? pending.slice(0, limit) : pending;
  return {
    pending: limited,
    skipped,
    stats: {
      materials: previews.length,
      pendingTotal: pending.length,
      pending: limited.length,
      skipped: skipped.length,
      reasons
    }
  };
}

// 元素词表顺序与 app.js caseElementVocabulary() 一致：人工维护的排前面（模型优先采用它的写法），
// 再是其余词表词，最后补静态元素词；大小写/空格不同但同一个词的只留一个（免得 AI 在 kiki / KIKI 里乱挑）。
export function elementVocabularyFromRows(rows, staticValues = CASE_ELEMENT_STATIC_VALUES) {
  const manual = [];
  const others = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = String(row?.name_zh || '').trim();
    if (!name) continue;
    // v918：效果词（kind='effect'）**不进元素词表** —— 两维分开，否则提示词会把「爆炸/缩放」
    // 当元素词推荐给模型，识别结果里就会冒出"效果当元素"的脏标签。
    if (String(row?.kind || '') === 'effect') continue;
    (String(row?.source || '') === 'manual' ? manual : others).push(name);
  }
  const out = [];
  const seen = new Set();
  for (const word of manual.concat(others, staticValues)) {
    const key = String(word).replace(/\s+/g, '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(word).trim());
    if (out.length >= VOCABULARY_MAX) break;
  }
  return out;
}

// v918 效果词表（与元素词表**并列、分开**的一份）：只取 vf_tag_vocabulary 里 kind='effect' 的 name_zh。
// 人工维护的排前面，再去重（大小写/空格不同但同一个词的只留一个）；空 = 本轮不请求效果标签。
export function effectVocabularyFromRows(rows, max = EFFECT_VOCABULARY_MAX) {
  const manual = [];
  const others = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (String(row?.kind || '') !== 'effect') continue;
    const name = String(row?.name_zh || '').trim();
    if (!name) continue;
    (String(row?.source || '') === 'manual' ? manual : others).push(name);
  }
  const out = [];
  const seen = new Set();
  for (const word of manual.concat(others)) {
    const key = String(word).replace(/\s+/g, '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(word).trim());
    if (out.length >= max) break;
  }
  return out;
}

// --project 认 uuid，也认标题片段（片段可能命中多个项目，所以调用方要把命中的清单打出来给人看）
export function matchProjectSources(sources, query) {
  const text = String(query || '').trim().toLowerCase();
  const list = Array.isArray(sources) ? sources : [];
  if (!text) return list.slice();
  const byId = list.filter(source => String(source?.id || '').toLowerCase() === text);
  if (byId.length) return byId;
  return list.filter(source => String(source?.title || '').toLowerCase().includes(text));
}

/* ───────────────────────── 凭证 ───────────────────────── */

// .local/recognize.env 是 KEY=VALUE 行式（该目录已在 .gitignore，不进 git）。
// 认 `#` 注释、空行、值外层引号；不认的行（没有等号）直接丢，避免别的文件内容被误当凭证。
export function parseEnvText(text) {
  const out = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

// 打印配置时只给前 4 位 + 长度：终端滚动历史、截图、贴给别人的日志都可能带着它出去。
export function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '(缺失)';
  return text.slice(0, 4) + '…(长度 ' + text.length + ')';
}

export function resolveCredentials(env = {}, fileEnv = {}) {
  const pick = (...names) => {
    for (const name of names) {
      const fromEnv = env?.[name];
      if (fromEnv) return {value: String(fromEnv).trim(), from: '环境变量', name};
      const fromFile = fileEnv?.[name];
      if (fromFile) return {value: String(fromFile).trim(), from: '文件 ' + ENV_FILE.replace(ROOT + '/', ''), name};
    }
    return {value: '', from: '', name: names[0]};
  };
  const url = pick('SUPABASE_URL');
  const serviceKey = pick('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');
  const glmKey = pick('GLM_API_KEY', 'ZHIPU_API_KEY');
  const missing = [];
  if (!url.value) missing.push('SUPABASE_URL');
  if (!serviceKey.value) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!glmKey.value) missing.push('GLM_API_KEY（或 ZHIPU_API_KEY）');
  return {
    url: url.value.replace(/\/+$/, ''),
    serviceKey: serviceKey.value,
    glmKey: glmKey.value,
    sources: {
      url: url.from, urlName: url.name,
      serviceKey: serviceKey.from, serviceKeyName: serviceKey.name,
      glmKey: glmKey.from, glmKeyName: glmKey.name
    },
    missing
  };
}

// 只列变量名与放哪，**不带任何 key 内容**（这段会出现在终端和用户贴回来的日志里）。
export function credentialsHelpMessage(missing = []) {
  return [
    '缺少凭证：' + missing.join('、'),
    '',
    '二选一：',
    '  1) 直接设环境变量（只对当前这个 shell 有效）：',
    '       export SUPABASE_URL="https://<项目 ref>.supabase.co"',
    '       export SUPABASE_SERVICE_ROLE_KEY="<service role key>"',
    '       export GLM_API_KEY="<智谱开放平台的 key>"',
    '  2) 或者写进本机文件 .local/recognize.env（该目录已在 .gitignore，不进 git）：',
    '       SUPABASE_URL=https://<项目 ref>.supabase.co',
    '       SUPABASE_SERVICE_ROLE_KEY=<service role key>',
    '       GLM_API_KEY=<智谱 key>',
    '',
    'service role key 在 Supabase 后台 Project Settings → API 里（service_role 那条，不是 anon）。',
    '它的权限约等于整个数据库，别贴进聊天、别写进文档、别提交。'
  ].join('\n');
}

/* ───────────────────────── 重试 / 退避 / 限流 ───────────────────────── */

// _ai.js 的 postJson 只把 message 抛出来（没有 status 字段），所以限流/5xx 只能按文案归类：
// 值得退避重试的（429 / 5xx / 网络抖动 / 超时）重试，参数或图片本身的问题重试也是白花时间。
export function classifyError(error) {
  const status = Number(error?.status) || 0;
  const message = String(error?.message || error || '');
  // 抽帧失败（ffmpeg 解不开这个文件 / 探测和兜底全试过都没拿到帧）：单独一类，
  // 既不是限流也不是网络问题，重试同一份文件也是白搭 ⇒ 不进 RETRYABLE_KINDS。
  if (error?.kind === 'frame-extract' || /^抽帧失败|动态物料超过抽帧上限/.test(message)) return 'frame-extract';
  if (error?.kind === 'timeout' || status === 408 || /超时|timed?\s?out|timeout/i.test(message)) return 'timeout';
  if (status === 429 || /(^|\D)429(\D|$)|rate.?limit|too many requests|限流|速率|频率|过于频繁|访问频繁|quota|余额不足/i.test(message)) return 'rate-limit';
  if (status >= 500 || (status === 0 && /\b5\d\d\b|服务(器)?(错误|繁忙|不可用)|bad gateway|service unavailable|gateway time-?out/i.test(message))) return 'server';
  if (status >= 400 || /图片过大|缺少待识别|invalid|unsupported|not supported|无法解析/i.test(message)) return 'client';
  if (/fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|network|terminated|aborted/i.test(message)) return 'network';
  return 'unknown';
}

export const RETRYABLE_KINDS = new Set(['timeout', 'rate-limit', 'server', 'network', 'unknown']);

export function isRetryable(error) {
  return RETRYABLE_KINDS.has(classifyError(error));
}

// 指数退避 + 抖动：失败十有八九是限流，几个 worker 同时按同一个节奏重试会再撞一次，抖开一点。
export function backoffDelayMs(attempt, baseDelayMs = RETRY_BASE_MS) {
  const base = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  return Math.round(base * (0.75 + Math.random() * 0.5));
}

export async function withRetry(task, {
  attempts = RETRY_ATTEMPTS,
  baseDelayMs = RETRY_BASE_MS,
  onRetry = () => {},
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
  let lastError = null;
  let made = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    made = attempt;
    try {
      return {value: await task(attempt), attempts: attempt};
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const kind = classifyError(lastError);
      if (attempt >= attempts || !isRetryable(lastError)) break;
      const delay = backoffDelayMs(attempt, baseDelayMs);
      onRetry({attempt, kind, delay, error: lastError});
      await sleep(delay);
    }
  }
  throw Object.assign(lastError instanceof Error ? lastError : new Error(String(lastError)), {
    // 记「真的试了几次」而不是配置的上限：失败清单要能区分"重试 3 次都失败"和"一次就是硬的 400"
    attempts: made,
    kind: classifyError(lastError)
  });
}

// _ai.js 的 postJson 不吃 AbortSignal，所以超时用 Promise.race 做闸门：
// 超时后底层请求可能还在后台跑（不阻塞我们继续），但这一张算失败。
export function withTimeout(promise, ms, message) {
  if (!ms || ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(message || ('请求超过 ' + ms + 'ms 未返回')), {kind: 'timeout'}));
    }, ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}

// 主动限流：免费档限流未知（没实测过），429 之后即便重试成功也把整批拖慢，不如一开始就压着跑。
export function createRateLimiter(ratePerSecond, {now = () => Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms))} = {}) {
  const interval = 1000 / Math.max(0.1, Number(ratePerSecond) || DEFAULT_RATE);
  let nextAt = 0;
  return async function take() {
    const current = now();
    const wait = Math.max(0, nextAt - current);
    nextAt = Math.max(current, nextAt) + interval;
    if (wait > 0) await sleep(wait);
  };
}

/* ───────────────────────── CLI / 输出格式 ───────────────────────── */

export function createOptions() {
  return {
    project: '',
    limit: 0,
    concurrency: DEFAULT_CONCURRENCY,
    rate: DEFAULT_RATE,
    force: false,
    forceDynamic: false,
    dryRun: false,
    yes: false,
    markFailed: true,
    skipDynamic: false,
    help: false
  };
}

function takeOptionValue(argv, index, name) {
  const arg = argv[index];
  const eq = arg.indexOf('=');
  if (eq >= 0) return {value: arg.slice(eq + 1), next: index};
  const value = argv[index + 1];
  if (value == null || value.startsWith('--')) throw new Error('缺少 ' + name + ' 的参数值');
  return {value, next: index + 1};
}

function positiveInt(value, name, {max = 0, allowZero = false} = {}) {
  const text = String(value == null ? '' : value).trim();
  if (!/^\d+$/.test(text)) throw new Error(name + ' 需要是正整数，收到：' + text);
  let number = Number(text);
  if (!allowZero) number = Math.max(1, number);
  if (max > 0 && number > max) number = max;
  return number;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = createOptions();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (arg.startsWith('--project')) {
      const taken = takeOptionValue(argv, i, '--project'); options.project = taken.value.trim(); i = taken.next; continue;
    }
    if (arg.startsWith('--limit')) {
      const taken = takeOptionValue(argv, i, '--limit'); options.limit = positiveInt(taken.value, '--limit', {allowZero: true}); i = taken.next; continue;
    }
    if (arg.startsWith('--concurrency')) {
      const taken = takeOptionValue(argv, i, '--concurrency');
      options.concurrency = positiveInt(taken.value, '--concurrency（并发上限 ' + CONCURRENCY_MAX + '）', {max: CONCURRENCY_MAX});
      i = taken.next; continue;
    }
    if (arg.startsWith('--rate')) {
      const taken = takeOptionValue(argv, i, '--rate');
      options.rate = positiveInt(taken.value, '--rate（每秒最多几次模型调用）');
      i = taken.next; continue;
    }
    if (arg === '--force') { options.force = true; continue; }
    if (arg === '--force-dynamic') { options.forceDynamic = true; continue; }
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    if (arg === '--skip-dynamic') { options.skipDynamic = true; continue; }
    if (arg === '--include-gif') {
      throw new Error('--include-gif 已废弃（v917：gif/mp4/mov/webm 默认走抽帧识别）。'
        + '要退回老行为（动态物料一律跳过、连抽帧都不试）请改用 --skip-dynamic。');
    }
    if (arg === '--yes' || arg === '-y') { options.yes = true; continue; }
    if (arg === '--no-fail-mark') { options.markFailed = false; continue; }
    throw new Error('未知参数：' + arg + '（--help 看用法）');
  }
  return options;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0) / 1000);
  if (total < 60) return total.toFixed(0) + 's';
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  if (minutes < 60) return minutes + 'm' + String(seconds).padStart(2, '0') + 's';
  const hours = Math.floor(minutes / 60);
  return hours + 'h' + String(minutes % 60).padStart(2, '0') + 'm';
}

export function progressLine({done = 0, total = 0, ok = 0, fail = 0, elapsedMs = 0} = {}) {
  const percent = total > 0 ? Math.floor((done / total) * 100) : 0;
  const seconds = Math.max(0.001, Number(elapsedMs) / 1000);
  return '[' + done + '/' + total + '] ' + percent + '% ok=' + ok + ' fail=' + fail
    + ' 用时 ' + formatDuration(elapsedMs) + ' 速度 ' + (done / seconds).toFixed(1) + '/s';
}

export function failuresFilePath(outputDir = OUTPUT_DIR, date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
  return join(outputDir, 'recognize-failures-' + stamp + '.json');
}

function createConsole() {
  const isTty = Boolean(process.stdout.isTTY);
  let lastProgressAt = Date.now();   // 非 TTY 下从"现在"起算：短任务只留最后那行进度，不刷两遍
  return {
    // 进度行只在终端里原地覆盖；输出被重定向到文件时（没有 TTY）没有覆盖的余地，
    // 就每 15 秒打一行，否则日志里会攒下几千行没人看的进度。
    progress(text, {force = false} = {}) {
      if (isTty) { process.stdout.write('\r\x1b[K' + text); return; }
      const now = Date.now();
      if (!force && now - lastProgressAt < 15000) return;
      lastProgressAt = now;
      process.stdout.write(text + '\n');
    },
    line(text = '') { if (isTty) process.stdout.write('\r\x1b[K'); process.stdout.write(text + '\n'); }
  };
}

const USAGE = `案例库逐图 AI 标签 · 本机批量识别

  node scripts/recognize-case-tags.mjs [选项]

选项：
  --project <uuid 或标题片段>  只跑这个项目的物料（标题片段命中多个项目时会列出来）
  --limit <N>                 本轮最多处理 N 张（断点续跑友好：跑一批看一批）
  --concurrency <N>           同时几张，默认 ${DEFAULT_CONCURRENCY}，上限 ${CONCURRENCY_MAX}
  --rate <N>                  每秒最多发起几次模型调用，默认 ${DEFAULT_RATE}（免费档限流未知，先保守）
  --force                     连「已成功且内容没变」的行也重跑（默认跳过它们；所有物料一律重跑）
  --force-dynamic             只强制重跑动态物料（gif/mp4/mov/webm，抽帧那一类）：它们即便已成功、
                              内容没变也重跑一遍（补 v918 的效果标签）；静态图**不受影响**，
                              已成功且内容没变的照旧跳过。与 --force 一起传时 **--force 优先**（= 全都强制）
  --dry-run                   只列队列构成（直接送 / 抽帧送 / 跳过各多少张）与待处理分布，不调模型、不写库
  --skip-dynamic              动态物料（gif/mp4/mov/webm）一律跳过，不抽帧（退回 v916 的老行为）
  --yes                       跳过开始前的确认（非 dry-run 且无 TTY 时必须加）
  --no-fail-mark              失败时不在库里写 status='failed'（默认写，便于 app 里看到失败标记）
  --help                      看这段

动态物料（gif/mp4/mov/webm）的识别方式：
  用 ffmpeg 抽「中间帧 + 最后一帧」两张静态 PNG，再当一组送视觉模型（一条消息看两张，拿回一套统一标签）。
  取中间帧和末帧而不是首帧：动态弹窗的第一帧往往还没弹出来（空状态），只取首帧等于没识别。
  为什么不能直接送动图：GLM 视觉通道吃不下 —— 2026-10-13 全量实测，93 张 gif 只成功 6 张。
  ffmpeg / ffprobe 默认取 PATH 里的；可用环境变量 FFMPEG_PATH / FFPROBE_PATH 覆盖。
  **机器上没有可用的 ffmpeg/ffprobe、或某个文件抽帧失败时，只影响这些动态物料**（跳过并记原因 / 记失败），
  静态图照常跑，脚本不会整轮挂掉。抽帧的临时 PNG 放在系统临时目录，用完即删。

效果标签（v918，只有动态物料才有）：
  动态物料除了元素标签，还会请模型判断「这段动效/弹窗是什么**效果类型**」（爆炸 / 缩放 / 利益点凸显…），
  写进 vf_preview_ai_tags.effect_tags —— 与元素标签**分开一维**，静态图一律写空数组。
  候选词只从 vf_tag_vocabulary 里 kind='effect' 的受控词表挑（见 sql/028_effect_tags.sql），
  模型挑了词表外的词一律丢掉（效果这一维要能稳定筛，不许在词表里裂出近义词）。
  ⚠️ 断点续跑只认「内容没变 + 已成功」，**不看 effect_tags 空不空** ——
     v918 之前识别过的动态物料不会被自动补上效果标签。
     补齐就用 **--force-dynamic**（只重跑动态物料，静态图一张都不动；建议配合 --project 小批跑）——
     正是为了不把一千多张静态图再白跑一遍才加的它；真要全量重跑才用 --force。

凭证（缺了会提示；二选一，别写进代码）：
  环境变量：SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GLM_API_KEY（ZHIPU_API_KEY 也认）
  或文件：  .local/recognize.env（KEY=VALUE 行式，该目录不进 git）

写库说明：只写 vf_preview_ai_tags（experiment_key=${EXPERIMENT_KEY}，分区名而已，别改），
不碰 vf_source_files / vf_asset_previews；manual_tags / excluded_tags 原样保留。
effect_tags 与 ai_tags 同一条去重口径（excluded_tags / manual_tags 里已有的词不再重复进效果标签）。
sql/028 没执行（表里没有 effect_tags 列）时自动降级为「不写效果标签」，其余照常，不报错。

退出码：0 = 全部成功（或没有要跑的） 1 = 有失败 2 = 脚本自身出错 3 = 缺凭证
        4 = 项目没匹配上 130 = 被 Ctrl-C 中断（已完成的不会白跑）

跑起来 Node 会打一条 MODULE_TYPELESS_PACKAGE_JSON 警告（functions/_ai.js 是 ESM 但仓库根
package.json 没写 type）—— 无害，忽略即可。`;

/* ───────────────────────── Supabase 访问（只读业务表 + 只写标签表） ───────────────────────── */

function supabaseHeaders(creds, extra = {}) {
  return {
    apikey: creds.serviceKey,
    Authorization: 'Bearer ' + creds.serviceKey,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function supabaseRequest(creds, path, {method = 'GET', headers = {}, body} = {}) {
  const response = await fetch(creds.url + path, {method, headers: supabaseHeaders(creds, headers), body});
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.hint || text || ('HTTP ' + response.status);
    const error = new Error(String(message).slice(0, 300));
    error.status = response.status;
    throw error;
  }
  return {data, response};
}

// 分页拉全量：每页 1000，用 Range 头翻页；Prefer: count=exact 拿总数（第一页的 Content-Range 里有）。
async function fetchRows(creds, table, query) {
  const rows = [];
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const {data, response} = await supabaseRequest(creds, '/rest/v1/' + table + '?' + query, {
      headers: {
        Range: from + '-' + (from + PAGE_SIZE - 1),
        ...(page === 0 ? {Prefer: 'count=exact'} : {})
      }
    });
    const list = Array.isArray(data) ? data : [];
    if (page === 0) {
      const parsed = Number(String(response.headers.get('content-range') || '').split('/')[1]);
      total = Number.isFinite(parsed) ? parsed : list.length;
    }
    rows.push(...list);
    if (list.length < PAGE_SIZE) break;
  }
  return {rows, total};
}

// 案例项目的判定（与 app.js isCaseProject 同口径）：source_path 为空。
// 库里实测是**空字符串**而不是 NULL（用 is null 查出来 0 行），所以服务端粗筛把两种都带上，
// 客户端再用这个纯函数收口。
export function isCaseLibrarySource(source) {
  return String(source?.source_path || '') === '';
}

// 案例库物料 = source_path 为空的项目，其物料在 vf_asset_previews 里按 source_file_id 关联。
// 服务端的 `or=(source_path.is.null,source_path.eq.)` 只是省流量；要是这个写法不被认（或返回空），
// 就退回「拉全表 + 同一个纯函数本地筛」—— 这是跑真实库前的唯一没法离线验证的地方，必须有退路。
async function fetchCaseSources(creds) {
  const select = 'select=id,title,source_path&order=id.asc';
  const filtered = await fetchRows(creds, 'vf_source_files', select + '&or=(source_path.is.null,source_path.eq.)')
    .catch(error => {
      console.warn('服务端按「source_path 为空」筛项目失败（' + String(error?.message || error).slice(0, 120) + '），改拉全表再本地筛。');
      return {rows: []};
    });
  const rows = filtered.rows.filter(isCaseLibrarySource);
  if (rows.length) return rows;
  const all = await fetchRows(creds, 'vf_source_files', select);
  return all.rows.filter(isCaseLibrarySource);
}

async function fetchAllPreviews(creds) {
  const {rows, total} = await fetchRows(creds, 'vf_asset_previews',
    'select=id,source_file_id,preview_path,preview_filename,preview_size_bytes,width,height,material_type,language,updated_at&order=id.asc');
  return {rows, total};
}

async function fetchExistingTagRows(creds) {
  const {rows} = await fetchRows(creds, 'vf_preview_ai_tags',
    'experiment_key=eq.' + encodeURIComponent(EXPERIMENT_KEY)
    + '&select=preview_id,source_file_id,ai_tags,manual_tags,excluded_tags,status,model,content_key,error_message&order=preview_id.asc');
  return rows;
}

// v918：多读一个 kind —— 效果词表就是靠它（kind='effect'）与元素词表分开的，别删。
async function fetchVocabularyRows(creds) {
  const {rows} = await fetchRows(creds, 'vf_tag_vocabulary', 'select=name_zh,name_en,source,kind&order=name_zh.asc');
  return rows;
}

async function fetchCurrentTagRow(creds, previewId) {
  const {data} = await supabaseRequest(creds,
    '/rest/v1/vf_preview_ai_tags?experiment_key=eq.' + encodeURIComponent(EXPERIMENT_KEY)
    + '&preview_id=eq.' + encodeURIComponent(previewId)
    + '&select=ai_tags,manual_tags,excluded_tags,status,model');
  return Array.isArray(data) && data[0] ? data[0] : null;
}

// 唯一的写入口。on_conflict + merge-duplicates 与端点 saveRow() 完全一致；
// 只送 buildSuccessRow / buildFailureRow 产出的列，其它列（updated_by / created_at）保持原样。
// v918 降级：sql/028 还没跑时表里没有 effect_tags 列，带这一列会被整条拒掉（PGRST204）——
// 那时去掉这一列重写一次（只等于"这轮不写效果标签"，识别结果本身照常入库）。
let effectTagsColumnMissing = false;
async function upsertTagRow(creds, row) {
  const post = async (payload) => {
    const {data} = await supabaseRequest(creds, '/rest/v1/vf_preview_ai_tags?on_conflict=experiment_key,preview_id', {
      method: 'POST',
      headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
      body: JSON.stringify(payload)
    });
    return data;
  };
  const payload = effectTagsColumnMissing ? withoutEffectTags(row) : row;
  try {
    return await post(payload);
  } catch (error) {
    if (effectTagsColumnMissing || !isMissingEffectTagsColumnError(error)) throw error;
    effectTagsColumnMissing = true;
    console.warn('⚠ vf_preview_ai_tags 里没有 effect_tags 列（sql/028 还没执行）⇒ 本轮降级为「不写效果标签」，元素标签照常写。');
    return post(withoutEffectTags(row));
  }
}

/* ───────────────────────── 取图 + 识别 ───────────────────────── */

// 路径里有中文/空格，必须**逐段**编码：整体 encodeURIComponent 会把分隔用的斜杠也编码掉，对象就找不到了。
function encodeStoragePath(path) {
  return String(path).split('/').map(encodeURIComponent).join('/');
}

function storageObjectUrl(creds, path) {
  return creds.url + '/storage/v1/object/' + BUCKET + '/' + encodeStoragePath(path);
}

function looksLikeMissingObject(status, text) {
  if (status === 404) return true;
  const body = String(text || '');
  if (status === 400 || status === 404) return /not_found|not found|Object not found/i.test(body);
  return false;
}

// 取哪几个对象：静态图优先缩略图（几 KB，省流量也省模型时间），动态物料**只能取原片**
// —— 缩略图是 `_thumb.jpg`（静态首帧），拿它去抽帧等于又回到"只认首帧"，白费这一轮。
export function sourceCandidatesForPreview(preview, {preferThumbnail = true} = {}) {
  if (preferThumbnail) return thumbnailCandidatesForPreview(preview);
  const path = String(preview?.preview_path || '');
  return path ? [path] : [];
}

// 按候选顺序取第一个拿得到的对象（404 就试下一个），返回原始字节。
// usedFallback 表示"没用第一个候选"（静态图那条路等于"缩略图缺失、退回原图"）。
async function loadPreviewObject(creds, preview, {preferThumbnail = true} = {}) {
  const candidates = sourceCandidatesForPreview(preview, {preferThumbnail});
  const tried = [];
  for (const path of candidates) {
    const response = await withTimeout(
      fetch(storageObjectUrl(creds, path), {headers: supabaseHeaders(creds)}),
      STORAGE_TIMEOUT_MS,
      '取图超过 ' + STORAGE_TIMEOUT_MS + 'ms 未返回'
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (looksLikeMissingObject(response.status, text)) {
        tried.push(path + ' (404)');
        continue;
      }
      const error = new Error('取图失败 HTTP ' + response.status + ' ' + String(text).slice(0, 120));
      error.status = response.status;
      throw error;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error('图片内容为空：' + path);
    tried.push(path + ' (' + buffer.length + 'B)');
    return {buffer, path, bytes: buffer.length, usedFallback: path !== candidates[0], tried};
  }
  const error = new Error((candidates.length > 1 ? '缩略图和原图都取不到：' : '取不到物料文件：') + tried.join(' → '));
  error.status = 404;
  error.kind = 'missing-image';
  throw error;
}

function dataUrlForImage(buffer, path, fallbackMime = 'image/png') {
  return 'data:' + (mimeForImagePath(path) || fallbackMime) + ';base64,' + buffer.toString('base64');
}

/* ───────────────────────── 抽帧（ffmpeg）───────────────────────── */
//
// 目标：把动态物料（gif/mp4/mov/webm）变成「中间帧 + 最后一帧」两张静态 PNG。
// 三条硬要求：① 命令能**注入**（本机没有 ffmpeg，测试用假执行器把参数与降级逻辑测穿）；
// ② 探测/抽帧失败一律**降级**，不许把整轮跑挂掉；③ 临时文件必须删干净（放 os.tmpdir()，不污染 /opt/case-tags）。

const execFileAsync = promisify(execFileCallback);

// 默认执行器：真的 spawn 子进程。exit≠0 抛错（带 code/stderr），找不到命令（ENOENT）也抛错。
// 测试里换成假的：只记录 command/args，需要"真的产出帧"时自己按 args 里的输出路径写一个 PNG。
export async function defaultCommandRunner(command, args, {timeoutMs = FFMPEG_TIMEOUT_MS} = {}) {
  try {
    const {stdout, stderr} = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: FFMPEG_MAX_BUFFER,
      encoding: 'utf8',
      windowsHide: true
    });
    return {stdout: String(stdout || ''), stderr: String(stderr || ''), code: 0};
  } catch (error) {
    const exitCode = typeof error?.code === 'number' ? error.code : null;
    const stderr = String(error?.stderr || '').trim();
    const detail = error?.killed || error?.signal
      ? ('超过 ' + timeoutMs + 'ms 未返回')
      : String(error?.message || error);
    throw Object.assign(new Error(command + ' 执行失败：' + detail.slice(0, 200)
      + (stderr ? '｜' + stderr.slice(0, 200) : '')), {
      command, args, code: exitCode, stderr
    });
  }
}

// ffmpeg / ffprobe 从哪来：环境变量优先，默认 PATH 里的同名命令。
export function resolveMediaTools(env = process.env) {
  const pick = (name, fallback) => {
    const value = String((env || {})[name] || '').trim();
    return {command: value || fallback, from: value ? '环境变量 ' + name : 'PATH'};
  };
  return {ffmpeg: pick('FFMPEG_PATH', 'ffmpeg'), ffprobe: pick('FFPROBE_PATH', 'ffprobe')};
}

// 开机探测一次：`ffmpeg -version` / `ffprobe -version`（只读、无副作用、毫秒级）。
// 两个都可用才认为"能抽帧"；否则动态物料退回"跳过并记原因"，静态图照跑。
export async function probeMediaTools({env = process.env, runner = defaultCommandRunner, timeoutMs = FFPROBE_TIMEOUT_MS} = {}) {
  const tools = resolveMediaTools(env);
  const check = async (command) => {
    try { await runner(command, ['-version'], {timeoutMs}); return {ok: true, error: ''}; }
    catch (error) { return {ok: false, error: String(error?.message || error).slice(0, 200)}; }
  };
  const ffmpeg = await check(tools.ffmpeg.command);
  const ffprobe = await check(tools.ffprobe.command);
  return {
    ffmpegPath: tools.ffmpeg.command,
    ffprobePath: tools.ffprobe.command,
    ffmpegFrom: tools.ffmpeg.from,
    ffprobeFrom: tools.ffprobe.from,
    ffmpegOk: ffmpeg.ok,
    ffprobeOk: ffprobe.ok,
    available: ffmpeg.ok && ffprobe.ok,
    errors: [ffmpeg, ffprobe].filter(item => !item.ok).map(item => item.error).filter(Boolean)
  };
}

export function ffprobeArgs(file, {frames = false} = {}) {
  return frames
    ? ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'default=nw=1:nk=1', file]
    : ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file];
}

// ffprobe 对有些文件会吐 "N/A"（或干脆不吐），一律当 0 = 不知道 ⇒ 走不依赖探测的兜底命令。
export function parseProbeNumber(text) {
  const match = String(text == null ? '' : text).match(/-?\d+(?:\.\d+)?/);
  const value = match ? Number(match[0]) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function probeMedia({file, runner = defaultCommandRunner, ffprobePath = 'ffprobe', timeoutMs = FFPROBE_TIMEOUT_MS, wantFrameCount = false}) {
  const out = {durationSec: 0, frameCount: 0, errors: []};
  try {
    const result = await runner(ffprobePath, ffprobeArgs(file), {timeoutMs});
    out.durationSec = parseProbeNumber(result?.stdout);
  } catch (error) { out.errors.push('时长探测失败：' + String(error?.message || error).slice(0, 120)); }
  // `-count_frames` 要把整片解一遍（大 mp4 就是几秒到几十秒），所以只在真的用得上时才跑：
  // ① 调用方明确要（gif 小、按帧号那条兜底更靠谱）② 时长没探出来（那就只剩帧号这条路能用）。
  if (wantFrameCount || out.durationSec === 0) {
    try {
      const result = await runner(ffprobePath, ffprobeArgs(file, {frames: true}), {timeoutMs});
      const frames = parseProbeNumber(result?.stdout);
      out.frameCount = frames > 0 ? Math.round(frames) : 0;
    } catch (error) { out.errors.push('帧数探测失败：' + String(error?.message || error).slice(0, 120)); }
  }
  return out;
}

function roundSeconds(value) {
  return Number(Math.max(0, Number(value) || 0).toFixed(3));
}

// 时间法（主路径）：`-ss <t>` 放在 `-i` 前面 = input seek，快；`-frames:v 1 -an` 只要一帧、不要音轨
// （不写 -an 的话，从 mp4 抽帧时 ffmpeg 会试着把音轨也塞进 image2，直接报错）。
export function ffmpegSeekArgs({input, output, time = null, sseof = null}) {
  const args = ['-nostdin', '-loglevel', 'error', '-y'];
  if (sseof != null) args.push('-sseof', String(sseof));
  else if (time != null) args.push('-ss', String(time));
  args.push('-i', input, '-frames:v', '1', '-an', output);
  return args;
}

// 按帧号 / 过滤器取帧（兜底路径）。`select=eq(n\,M)` 里的反斜杠是 ffmpeg filtergraph 的转义
// （逗号分隔多个 filter，必须转义），我们是 execFile 直传 argv、不过 shell，所以反斜杠原样到达 ffmpeg。
export function ffmpegSelectArgs({input, output, index = 0, filter = ''}) {
  return ['-nostdin', '-loglevel', 'error', '-y', '-i', input,
    '-vf', filter || ('select=eq(n\\,' + index + ')'), '-frames:v', '1', '-an', output];
}

// 两张帧各自的候选命令，**按顺序试，第一个真的产出非空文件就赢**。
// middle（中间帧）：① 按时长 dur/2 ② 按帧号 (帧数-1)/2 ③ `thumbnail` 过滤器自选代表帧（不依赖探测）
// last（最后一帧）：  ① 按时长 dur-0.15 ② `-sseof -0.15`（不依赖探测，直接从结尾回退）③ 按帧号 帧数-1
// 兜底全保留的意义：ffprobe 对某些 gif/mp4 会返回 N/A，主路径就废了 —— 那时全靠 ②③ 兜住。
export function frameExtractionPlan({input, outputDir, durationSec = 0, frameCount = 0, tailSec = FRAME_TAIL_SEC}) {
  const outputFor = (name) => join(outputDir, name + '.png');
  const middleOutput = outputFor(FRAME_MIDDLE);
  const lastOutput = outputFor(FRAME_LAST);
  const middle = [];
  const last = [];
  if (durationSec > 0) {
    middle.push({id: 'time-mid', args: ffmpegSeekArgs({input, output: middleOutput, time: roundSeconds(durationSec / 2)})});
    last.push({id: 'time-last', args: ffmpegSeekArgs({input, output: lastOutput, time: roundSeconds(Math.max(0, durationSec - tailSec))})});
  }
  if (frameCount > 0) {
    middle.push({id: 'index-mid', args: ffmpegSelectArgs({input, output: middleOutput, index: Math.floor((frameCount - 1) / 2)})});
    last.push({id: 'index-last', args: ffmpegSelectArgs({input, output: lastOutput, index: frameCount - 1})});
  }
  // 不依赖 ffprobe 的两条兜底放在最后：thumbnail 要解全片（慢），-sseof 靠谱但拿到的未必是"最后一帧"
  last.push({id: 'sseof-last', args: ffmpegSeekArgs({input, output: lastOutput, sseof: -roundSeconds(tailSec)})});
  middle.push({id: 'thumbnail-mid', args: ffmpegSelectArgs({input, output: middleOutput, filter: 'thumbnail=100'})});
  return [
    {name: FRAME_MIDDLE, label: FRAME_LABEL_MIDDLE, output: middleOutput, attempts: middle},
    {name: FRAME_LAST, label: FRAME_LABEL_LAST, output: lastOutput, attempts: last}
  ];
}

// 临时工作目录：一律放系统临时目录（worker 上是 /tmp），不污染 /opt/case-tags。
export function createTempWorkDir(prefix = 'vf-recognize-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function cleanupTempDir(dir) {
  if (!dir) return;
  try { rmSync(dir, {recursive: true, force: true}); } catch { /* 删不掉就算了，别让它把整轮弄挂 */ }
}

// 把下载到的原片落盘：ffmpeg 靠**后缀**猜容器（gif/mp4 都是），所以后缀必须跟着 preview_path 走。
export function writeDynamicSource(dir, preview, buffer) {
  const ext = previewExtension(preview) || 'bin';
  const file = join(dir, 'source.' + ext);
  writeFileSync(file, buffer);
  return file;
}

// 跑一帧的所有候选命令。返回 {ok, buffer, command} 或 {ok:false, error, tried:[命令 id]}。
async function extractOneFrame(frame, {runner, ffmpegPath, timeoutMs, commands}) {
  const failures = [];
  for (const attempt of frame.attempts) {
    commands.push({frame: frame.name, id: attempt.id, args: attempt.args});
    try {
      await runner(ffmpegPath, attempt.args, {timeoutMs});
    } catch (error) {
      failures.push(attempt.id + '：' + String(error?.message || error).slice(0, 160));
      continue;
    }
    // ffmpeg 偶尔 exit 0 却没写文件（或写了 0 字节）—— 必须真的读回来看，不能信退出码。
    let buffer = null;
    try { buffer = readFileSync(frame.output); } catch { buffer = null; }
    if (buffer && buffer.length) return {ok: true, buffer, command: attempt.id, failures};
    failures.push(attempt.id + '：ffmpeg 没有写出帧');
  }
  return {ok: false, error: failures.join(' → ') || '没有可用的抽帧命令', failures, tried: frame.attempts.map(item => item.id)};
}

// 抽帧总入口：返回 {frames:[{name,label,buffer,dataUrl,command}], probe, commands, errors}。
// frames.length === 0 ⇒ 抽帧失败（调用方按失败处理，写清原因）；1 张 ⇒ 走单图接口；2 张 ⇒ 走多图接口。
export async function extractDynamicFrames({
  input, outputDir, runner = defaultCommandRunner, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe',
  ffmpegTimeoutMs = FFMPEG_TIMEOUT_MS, ffprobeTimeoutMs = FFPROBE_TIMEOUT_MS, wantFrameCount = false, onLog = () => {}
}) {
  const probe = await probeMedia({file: input, runner, ffprobePath, timeoutMs: ffprobeTimeoutMs, wantFrameCount});
  probe.errors.forEach(message => onLog('· 探测降级：' + message));
  const plan = frameExtractionPlan({input, outputDir, durationSec: probe.durationSec, frameCount: probe.frameCount});
  const commands = [];
  const frames = [];
  const errors = [];
  for (const frame of plan) {
    const result = await extractOneFrame(frame, {runner, ffmpegPath, timeoutMs: ffmpegTimeoutMs, commands});
    if (!result.ok) { errors.push(frame.label + '抽帧失败：' + result.error); continue; }
    frames.push({
      name: frame.name,
      label: frame.label,
      buffer: result.buffer,
      dataUrl: dataUrlForImage(result.buffer, frame.output),
      command: result.command
    });
  }
  // 静态 gif（只有一帧）两张候选会抽出同一张图：字节相同就只留中间帧，别拿同一张图当"一组"送两次
  if (frames.length === 2 && frames[0].buffer.equals(frames[1].buffer)) frames.pop();
  return {frames, probe, commands, errors};
}

// 帧 → 多图接口要的 {url, label}（url 是 data URL，同 _ai.js 的约定）。
export function framesToImagePayloads(frames) {
  return (Array.isArray(frames) ? frames : [])
    .filter(frame => frame && frame.dataUrl)
    .map(frame => ({url: frame.dataUrl, label: String(frame.label || '')}));
}

// 「1 张走单图接口、2 张走多图接口」这一步抽成可注入的函数：测试里把两个真实调用的包装换成假的，
// 就能验"2 张 → analyzeCaseTagGroupsWithGlm、1 张 → analyzeCaseTagsWithGlm"，不需要联网。
// 只看 elements / effects（activity 库里没有这列，与逐图那条路一致）；sameDesign 忽略 —— 那是浏览器按组那条路的信号。
// v918 的 effectVocabulary 是**第 5 个参数**，不传（或传空数组）就走 v917 的老行为（不请求效果标签）。
export async function analyzeFrameImages({
  images, env, vocabulary, activities, effectVocabulary = [],
  analyzeSingle = analyzeCaseTagsWithGlm, analyzeGroup = analyzeCaseTagGroupsWithGlm
}) {
  const list = Array.isArray(images) ? images.filter(item => item && item.url) : [];
  if (!list.length) throw new Error('没有可识别的帧');
  const effects = (Array.isArray(effectVocabulary) ? effectVocabulary : []).filter(Boolean);
  const result = list.length >= 2
    ? await analyzeGroup(env, list, vocabulary, activities, effects)
    : await analyzeSingle(env, list[0].url, vocabulary, activities, effects);
  return {
    api: list.length >= 2 ? 'group' : 'single',
    elements: Array.isArray(result?.elements) ? result.elements : [],
    activity: String(result?.activity || ''),
    effects: Array.isArray(result?.effects) ? result.effects : [],
    sameDesign: result?.sameDesign === true
  };
}

// 动态物料的完整链路（除"下载原片"之外的每一步都在这里，好整段注入测试）：
// 落盘原片 → ffprobe 探测 → 按计划抽帧 → 组 data URL。临时目录由调用方在 finally 里删（见 runBatch）。
export async function prepareDynamicImages({
  preview, buffer, dir, runner = defaultCommandRunner, ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe',
  ffmpegTimeoutMs = FFMPEG_TIMEOUT_MS, ffprobeTimeoutMs = FFPROBE_TIMEOUT_MS, onLog = () => {}
}) {
  if (buffer && buffer.length > FRAMES_MAX_INPUT_BYTES) {
    throw Object.assign(new Error('动态物料超过抽帧上限（' + Math.round(FRAMES_MAX_INPUT_BYTES / 1024 / 1024) + 'MB）：'
      + preview?.preview_path), {kind: 'frame-extract'});
  }
  const input = writeDynamicSource(dir, preview, buffer);
  const extracted = await extractDynamicFrames({
    input, outputDir: dir, runner, ffmpegPath, ffprobePath, ffmpegTimeoutMs, ffprobeTimeoutMs, onLog,
    // gif 小、解全片量帧也快，而且按帧号取"中间/最后"对 gif 比按时长更靠谱 ⇒ 明确要帧数
    wantFrameCount: previewExtension(preview) === 'gif'
  });
  if (!extracted.frames.length) {
    throw Object.assign(new Error('抽帧失败（' + (extracted.errors.join('；') || '没拿到任何一帧') + '）'),
      {kind: 'frame-extract', commands: extracted.commands});
  }
  return {
    images: framesToImagePayloads(extracted.frames),
    model: FRAMES_MODEL,
    frames: extracted.frames,
    probe: extracted.probe,
    commands: extracted.commands,
    errors: extracted.errors
  };
}

/* ───────────────────────── 主流程 ───────────────────────── */

function loadEnvFile(path = ENV_FILE) {
  try {
    return parseEnvText(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

function printConfig(creds, options, extra = {}) {
  console.log('配置：');
  console.log('  Supabase   : ' + creds.url + '（来自' + creds.sources.url + ' ' + creds.sources.urlName + '）');
  console.log('  service key: ' + maskSecret(creds.serviceKey) + '（来自' + creds.sources.serviceKey + ' ' + creds.sources.serviceKeyName + '）');
  console.log('  GLM key    : ' + maskSecret(creds.glmKey) + '（来自' + creds.sources.glmKey + ' ' + creds.sources.glmKeyName + '）');
  console.log('  模型       : ' + MODEL + '（免费视觉通道）；动态物料抽帧后记 ' + FRAMES_MODEL);
  console.log('  并发/限流  : ' + options.concurrency + ' 张同时 · 每秒最多 ' + options.rate + ' 次模型调用');
  console.log('  experiment_key : ' + EXPERIMENT_KEY + '（只是分区名，别改）');
  console.log('  动态物料   : ' + formatDynamicMode(options, extra.mediaTools));
  for (const message of (extra.mediaTools?.errors || [])) console.log('    ⚠ ' + message);
  if (extra.vocabularySize) console.log('  元素词表   : ' + extra.vocabularySize + ' 个词（库内标签 + 静态元素词）');
  // v918：效果词表为空 = 本轮不会请求效果标签（多半是 sql/028 还没执行），这句要让人看见
  console.log('  效果词表   : ' + (extra.effectVocabularySize
    ? extra.effectVocabularySize + ' 个词（vf_tag_vocabulary 里 kind=effect）'
    : '空 —— 本轮不请求效果标签（在 Supabase 执行 sql/028_effect_tags.sql 后重跑）'));
}

// v918：本轮**会请求效果标签**的物料数 = 待处理里的动态物料数（静态图一律不请求）。
// 效果词表为空时恒为 0：没词表就没法"只从词表里挑"，这一维干脆不请求。
export function effectRequestCount({dynamicPending = 0, effectVocabularySize = 0} = {}) {
  return effectVocabularySize > 0 ? Math.max(0, Number(dynamicPending) || 0) : 0;
}

// 动态物料这一行要能一眼看出"到底会不会抽帧"（用户要靠它判断 ffmpeg 有没有生效）。
export function formatDynamicMode(options = {}, mediaTools = null) {
  if (options.skipDynamic) return '(--skip-dynamic) gif/mp4/mov/webm 一律跳过，不抽帧';
  if (mediaTools && !mediaTools.available) {
    return '抽帧不可用 ⇒ gif/mp4/mov/webm 退回跳过（缺 ffmpeg/ffprobe，见下面 ⚠）';
  }
  const ffmpeg = mediaTools ? ' · ffmpeg ' + mediaTools.ffmpegPath + '（' + mediaTools.ffmpegFrom + '）' : '';
  const ffprobe = mediaTools ? ' · ffprobe ' + mediaTools.ffprobePath + '（' + mediaTools.ffprobeFrom + '）' : '';
  return 'gif/mp4/mov/webm 抽「中间帧 + 最后一帧」两张 PNG 再送模型' + ffmpeg + ffprobe;
}


function printProjectDistribution(items, titleOf) {
  const counts = new Map();
  for (const item of items) {
    const key = item.preview.source_file_id;
    const entry = counts.get(key) || {title: titleOf(key), count: 0};
    entry.count += 1;
    counts.set(key, entry);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
  console.log('  项目分布（' + sorted.length + ' 个）:');
  for (const [id, entry] of sorted) {
    console.log('    ' + String(entry.count).padStart(4) + '  ' + entry.title + '  ' + id);
  }
}

// Ctrl-C：第一次 = 不再派新任务、等在跑的几张写完就退（刚出的结果不白花钱），第二次 = 立刻退。
function installSigintHandler(log) {
  process.on('SIGINT', () => {
    if (runState.aborted) {
      log.line('\n再次 Ctrl-C：立即退出（在跑的几张结果可能还没写库）。');
      process.exit(130);
    }
    runState.aborted = true;
    log.line('\n收到 Ctrl-C：不再派新任务，等在跑的几张写完就退出。已完成的不会白跑（重跑会自动跳过）。');
  });
}

async function confirm(question) {
  if (!process.stdin.isTTY) {
    console.error('当前不是交互终端，问不了确认。要真跑就加 --yes（或先在终端里跑一次）；只想看看要跑多少张就加 --dry-run。');
    return false;
  }
  const rl = createInterface({input: process.stdin, output: process.stdout});
  try {
    const answer = await rl.question(question);
    return /^(y|yes)$/i.test(answer.trim()) || answer.trim() === '是';
  } finally {
    rl.close();
  }
}

async function runBatch(creds, plan, options, vocabulary, effectVocabulary, log) {
  const total = plan.pending.length;
  const limiter = createRateLimiter(options.rate);
  const runId = (globalThis.crypto?.randomUUID?.() || '') || null;
  const startedAt = Date.now();
  const stats = {ok: 0, fail: 0, done: 0, fallbackImages: 0, dynamicItems: 0, frames: 0, effectRequests: 0, effectItems: 0};
  const failureKinds = new Map();
  const failures = [];
  let cursor = 0;

  const projectTitles = options.projectTitles || new Map();
  const titleOf = (id) => projectTitles.get(id) || '';

  const report = () => log.progress(progressLine({
    done: stats.done, total, ok: stats.ok, fail: stats.fail, elapsedMs: Date.now() - startedAt
  }));

  const handleFailure = async (item, error, attempts) => {
    const kind = classifyError(error);
    stats.fail += 1;
    failureKinds.set(kind, (failureKinds.get(kind) || 0) + 1);
    failures.push({
      preview_id: item.preview.id,
      source_file_id: item.preview.source_file_id,
      project_title: titleOf(item.preview.source_file_id),
      preview_filename: item.preview.preview_filename || '',
      preview_path: item.preview.preview_path || '',
      content_key: item.contentKey,
      reason: item.reason,
      kind,
      attempts,
      commands: Array.isArray(error?.commands) ? error.commands.map(entry => entry.id) : undefined,
      error: String(error?.message || error || '').slice(0, 300)
    });
    let mark = '';
    if (options.markFailed) {
      try {
        const fresh = await fetchCurrentTagRow(creds, item.preview.id);
        await upsertTagRow(creds, buildFailureRow({preview: item.preview, error: error?.message, current: fresh}));
        mark = '（已在库里标记 failed）';
      } catch (writeError) {
        mark = '（失败标记也没写进去：' + String(writeError?.message || writeError).slice(0, 80) + '）';
      }
    }
    log.line('✗ ' + (item.preview.preview_filename || item.preview.id) + ' [' + kind + '] '
      + String(error?.message || error || '').slice(0, 160) + mark);
  };

  const processOne = async (item) => {
    const dynamic = previewKind(item.preview) === KIND_DYNAMIC;
    // 明显超大的动态物料先按 preview_size_bytes 拦下来：抽帧只出两张 PNG，没必要把 GB 级原片拖进临时目录。
    // （这个列如果是 0/缺，就靠 prepareDynamicImages 里的字节数二次兜底。）
    if (dynamic) {
      const declaredBytes = Number(item.preview.preview_size_bytes) || 0;
      if (declaredBytes > FRAMES_MAX_INPUT_BYTES) {
        throw Object.assign(new Error('动态物料超过抽帧上限（声明 '
          + Math.round(declaredBytes / 1024 / 1024) + 'MB）：' + item.preview.preview_path), {kind: 'frame-extract'});
      }
    }
    // 动态物料只能取**原片**（缩略图是静态首帧，拿它抽帧等于又回到"只认首帧"）
    const loaded = await withRetry(
      () => loadPreviewObject(creds, item.preview, {preferThumbnail: !dynamic}),
      {attempts: RETRY_ATTEMPTS, baseDelayMs: RETRY_BASE_MS, onRetry: ({delay}) => log.line('· 取图重试，等 ' + delay + 'ms')}
    );
    if (loaded.value.usedFallback) {
      stats.fallbackImages += 1;
      log.line('· 缩略图缺失，改用原图：' + item.preview.preview_path);
    }
    let workDir = '';
    try {
      let images = [{
        url: dataUrlForImage(loaded.value.buffer, loaded.value.path, mimeForImagePath(item.preview.preview_path)),
        label: ''
      }];
      let model = MODEL;
      if (dynamic) {
        workDir = createTempWorkDir();
        const prepared = await prepareDynamicImages({
          preview: item.preview,
          buffer: loaded.value.buffer,
          dir: workDir,
          runner: options.runner,
          ffmpegPath: options.ffmpegPath,
          ffprobePath: options.ffprobePath,
          onLog: (message) => log.line(message)
        });
        images = prepared.images;
        model = prepared.model;
        stats.dynamicItems += 1;
        stats.frames += images.length;
        log.line('· 抽帧：' + (item.preview.preview_filename || item.preview.id) + ' → ' + images.length + ' 帧（'
          + prepared.frames.map(frame => frame.label + '/' + frame.command).join('、') + '）');
      }
      await limiter();
      // 2 张帧 → 一条消息看多张（拿一套统一标签）；1 张 → 单图接口。两者都不改提示词（在 _ai.js 里）。
      // v918：**只有动态物料**才把效果词表传下去（静态图传空数组 ⇒ 提示词里没有那一段、effect_tags 写 {}）。
      const analyzed = await withRetry(
        () => withTimeout(
          analyzeFrameImages({
            images,
            env: {GLM_API_KEY: creds.glmKey},
            vocabulary,
            activities: CASE_ACTIVITY_VALUES,
            effectVocabulary: dynamic ? effectVocabulary : []
          }),
          MODEL_TIMEOUT_MS,
          '模型超过 ' + MODEL_TIMEOUT_MS + 'ms 未返回'
        ),
        {attempts: RETRY_ATTEMPTS, baseDelayMs: RETRY_BASE_MS, onRetry: ({attempt, kind: errorKind, delay}) => log.line('· 第 ' + attempt + ' 次失败（' + errorKind + '），等 ' + delay + 'ms 重试')}
      );
      const tags = analyzed.value.elements;
      const effects = analyzed.value.effects;
      if (dynamic && effectVocabulary.length) stats.effectRequests += 1;
      if (effects.length) stats.effectItems += 1;
      // 写之前重读一次：人工可能刚在 app 里给这张补过标签 / 排除过词，拿计划阶段的旧快照去写会覆盖掉它。
      const fresh = await fetchCurrentTagRow(creds, item.preview.id);
      await upsertTagRow(creds, buildSuccessRow({preview: item.preview, tags, effects, model, runId, current: fresh}));
    } finally {
      // 抽出来的临时 PNG 一律删干净：成功 / 抽帧失败 / 模型失败 / 中断都走这里。
      cleanupTempDir(workDir);
    }
  };

  const workerCount = Math.max(1, Math.min(options.concurrency, total));
  await Promise.all(Array.from({length: workerCount}, async () => {
    while (!runState.aborted) {
      const index = cursor;
      cursor += 1;
      if (index >= total) return;
      const item = plan.pending[index];
      try {
        await processOne(item);
        stats.ok += 1;
      } catch (error) {
        await handleFailure(item, error, Number(error?.attempts) || 1);
      }
      stats.done += 1;
      report();
    }
  }));

  const elapsedMs = Date.now() - startedAt;
  log.progress(progressLine({done: stats.done, total, ok: stats.ok, fail: stats.fail, elapsedMs}), {force: true});
  log.line('');
  log.line('完成：成功 ' + stats.ok + ' 失败 ' + stats.fail
    + (runState.aborted ? '（中断：本轮只跑了 ' + stats.done + '/' + total + '）' : '')
    + '，跳过 ' + plan.stats.skipped + '（内容没变）'
    + '，用时 ' + formatDuration(elapsedMs)
    + '，平均 ' + (stats.done / Math.max(0.001, elapsedMs / 1000)).toFixed(1) + '/s');
  if (stats.fallbackImages) log.line('缩略图缺失、退回原图：' + stats.fallbackImages + ' 张（见上面的逐条日志）');
  if (stats.dynamicItems) log.line('抽帧识别：' + stats.dynamicItems + ' 张动态物料（gif/mp4/mov/webm），共送出 ' + stats.frames + ' 帧');
  if (stats.effectRequests) {
    log.line('效果标签：向模型请求了 ' + stats.effectRequests + ' 张（动态物料），其中 ' + stats.effectItems
      + ' 张挑到了词表内的效果词；静态图一律不请求（写空数组）。');
  }
  if (failureKinds.get('frame-extract')) {
    log.line('其中抽帧失败 ' + failureKinds.get('frame-extract') + ' 张（没送模型：ffmpeg 探测/抽帧全试过都没拿到帧，原因见失败清单）');
  }
  if (failureKinds.size) {
    log.line('失败分类：' + [...failureKinds.entries()].map(([kind, count]) => kind + ' ' + count).join(' / '));
  }
  if (failures.length) {
    mkdirSync(OUTPUT_DIR, {recursive: true});
    const file = failuresFilePath(OUTPUT_DIR);
    writeFileSync(file, JSON.stringify({
      generatedAt: new Date().toISOString(),
      experimentKey: EXPERIMENT_KEY,
      model: MODEL,
      aborted: runState.aborted,
      stats,
      failures
    }, null, 2) + '\n');
    log.line('失败清单：' + file.replace(ROOT + '/', ''));
    log.line('重跑：先 --project/--limit 小批试，再整批跑；失败行 status≠success，重跑会自动带上它们。');
  }
  return {stats, failures, elapsedMs, aborted: runState.aborted};
}

async function main() {
  const options = parseArgs();
  const log = createConsole();
  if (options.help) { console.log(USAGE); return 0; }

  const creds = resolveCredentials(process.env, loadEnvFile());
  if (creds.missing.length) {
    console.error(credentialsHelpMessage(creds.missing));
    return 3;
  }

  console.log('读取案例库清单…');
  const allSources = await fetchCaseSources(creds);
  const sources = matchProjectSources(allSources, options.project);
  if (!sources.length) {
    console.error('没找到匹配的项目：' + options.project);
    console.error('现有案例项目（' + allSources.length + ' 个）：' + allSources.slice(0, 20).map(s => s.title).join(' / '));
    return 4;
  }
  const projectIds = new Set(sources.map(source => source.id));
  const projectTitles = new Map(sources.map(source => [source.id, String(source.title || '')]));

  const {rows: allPreviews, total: previewTotal} = await fetchAllPreviews(creds);
  const casePreviews = allPreviews.filter(preview => projectIds.has(preview.source_file_id));

  // 抽帧能力先探测（只跑 `ffmpeg -version` / `ffprobe -version`，只读、无副作用）：
  // 缺了就只把动态物料退回"跳过并记原因"，静态图照旧跑 —— 绝不让整轮挂掉。
  // --skip-dynamic 时不探测（反正不用）。
  const mediaTools = options.skipDynamic
    ? {available: false, ffmpegPath: '', ffprobePath: '', ffmpegFrom: '', ffprobeFrom: '', errors: []}
    : await probeMediaTools().catch(error => ({
      available: false, ffmpegPath: '', ffprobePath: '', ffmpegFrom: '', ffprobeFrom: '',
      errors: ['抽帧能力探测失败：' + String(error?.message || error).slice(0, 160)]
    }));
  const queueOptions = {skipDynamic: options.skipDynamic, ffmpegAvailable: mediaTools.available};
  if (!options.skipDynamic && !mediaTools.available) {
    console.warn('⚠ 没有可用的 ffmpeg/ffprobe ⇒ 动态物料（gif/mp4/mov/webm）本轮按"跳过"处理，静态图照常跑。');
    console.warn('  要装/指定：cf. USAGE（可用 FFMPEG_PATH / FFPROBE_PATH 覆盖路径）。');
  }

  const previews = selectRecognizablePreviews(casePreviews, queueOptions);
  const skipped = skipSummary(casePreviews, queueOptions);

  const existingRows = await fetchExistingTagRows(creds);
  const vocabularyRows = await fetchVocabularyRows(creds);
  const vocabulary = elementVocabularyFromRows(vocabularyRows);
  // v918：效果词表与元素词表**分开读、分开传**（同一份表按 kind 分流，别合成一个数组）
  const effectVocabulary = effectVocabularyFromRows(vocabularyRows);
  const plan = planWorkItems({previews, existingRows, force: options.force, forceDynamic: options.forceDynamic, limit: options.limit});
  const pendingKinds = pendingKindCounts(plan.pending);
  const effectRequested = effectRequestCount({dynamicPending: pendingKinds.dynamic, effectVocabularySize: effectVocabulary.length});

  printConfig(creds, options, {vocabularySize: vocabulary.length, effectVocabularySize: effectVocabulary.length, mediaTools});
  console.log('范围：' + (options.project ? '项目「' + options.project + '」→ ' + sources.length + ' 个' : '全部案例项目 ' + sources.length + ' 个')
    + '；物料 ' + casePreviews.length + ' 张，预览表共 ' + previewTotal + ' 行');
  console.log(formatQueueComposition(skipped, queueOptions));
  console.log(formatPendingSummary(plan, pendingKinds, options));
  if (pendingKinds.dynamic) {
    console.log('  抽帧那 ' + pendingKinds.dynamic + ' 张：每张用 ffmpeg 抽「中间帧 + 最后一帧」两张 PNG，'
      + '当一组送 ' + FRAMES_MODEL + '（一条消息看两张，拿回一套统一标签）。');
  }
  // v918：dry-run 也要能一眼看出「这次会请求效果标签的有 N 张」及其依据
  console.log('  效果标签：这次会请求效果标签的 ' + effectRequested + ' 张（= 待处理里的动态物料 '
    + pendingKinds.dynamic + ' 张；静态图 ' + pendingKinds.direct + ' 张一律不请求）'
    + (effectVocabulary.length
      ? '；候选词表 ' + effectVocabulary.length + ' 个（kind=effect）'
      : '；⚠ 效果词表为空 ⇒ 一张都不会请求，请先在 Supabase 执行 sql/028_effect_tags.sql'));
  if (effectRequested < pendingKinds.dynamic && effectVocabulary.length === 0 && pendingKinds.dynamic > 0) {
    console.warn('⚠ 效果词表读不到（vf_tag_vocabulary 里没有 kind=effect 的行）⇒ 本轮动态物料只写元素标签，'
      + 'effect_tags 写空数组。执行 sql/028_effect_tags.sql 后再跑一次（这些行已经 success，'
      + '加 --force-dynamic 才能重跑它们，静态图不受影响）。');
  }

  if (options.dryRun) {
    if (plan.pending.length) printProjectDistribution(plan.pending, id => projectTitles.get(id) || '');
    else console.log('没有需要处理的图片（该跳过的都在上面按原因列了）。要强制重跑动态物料（补效果标签）加 --force-dynamic。');
    console.log('--dry-run：没有调模型、没有写库、也没有真的抽帧（只探测了 ffmpeg/ffprobe 在不在、会不会用）。');
    return 0;
  }
  if (!plan.pending.length) {
    console.log('没有需要处理的图片（都是最新的）。要强制重跑就加 --force；只补动态物料的效果标签用 --force-dynamic。');
    return 0;
  }

  if (!options.yes) {
    printProjectDistribution(plan.pending, id => projectTitles.get(id) || '');
    const answer = await confirm('将对 ' + plan.pending.length + ' 张图调用模型（静态图 ' + MODEL
      + '；动态物料抽帧后走 ' + FRAMES_MODEL + '）并写库 vf_preview_ai_tags（experiment_key=' + EXPERIMENT_KEY + '）。确认继续？(y/N) ');
    if (!answer) { console.log('已取消。'); return 0; }
  }

  installSigintHandler(log);
  const result = await runBatch(creds, plan, {
    ...options,
    projectTitles,
    ffmpegPath: mediaTools.ffmpegPath,
    ffprobePath: mediaTools.ffprobePath
  }, vocabulary, effectVocabulary, log);
  if (result.failures.length) return 1;
  return result.aborted ? 130 : 0;   // 130 = 被 Ctrl-C 中断（跟 shell 惯例一致，便于外面写重跑循环）
}

// 只在真正被当命令跑时执行 main：单测会 import 这个文件拿纯函数，不能顺手把批处理跑起来。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error('脚本出错：' + String(error?.message || error));
    if (Number(error?.status)) console.error('（HTTP ' + error.status + '）');
    process.exitCode = 2;
  });
}
