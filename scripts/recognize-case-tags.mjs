#!/usr/bin/env node
// 案例库逐图 AI 标签的**本机批量识别脚本**（2026-10-13）。
//
// 起因：浏览器里的「一键识别」是 2 并发 + 手点 + 关页面就停，1953 张要跑 1.5–3 小时。
// 这个脚本直连 Supabase（service role）+ 直连智谱视觉模型，一次把案例库 99 个项目的逐图元素标签补齐，
// 带限流 / 重试 / 断点续跑 / 进度，跑完不用人守着。
//
// 三条口径必须与线上一致，改这里等于改线上行为：
//   ① 写库语义照抄 functions/api/case-preview-ai-tags.js 的 save 动作 ——
//      ai_tags = 模型新标签 去掉 excluded_tags 里已有的；manual_tags / excluded_tags 原样保留不许覆盖；
//      status='success' + model + content_key + error_message=''。
//   ② content_key 照抄端点 previewContentKey()（preview_path | preview_size_bytes | updated_at）——
//      对不上就说明画面变过，那张得重跑，这也是断点续跑判断「已完成」的唯一依据。
//   ③ 识别口径复用 functions/_ai.js 的 analyzeCaseTagsWithGlm()（提示词、≤5 字 / ≤12 条、词表归一、
//      KIKI 别名都在那边），这里绝不重写提示词。
// 本轮只做**逐图**识别；按组（多图）识别那条路先不碰 —— 分组口径还 park 着（见 HANDOVER §11）。
//
// 安全：只写 vf_preview_ai_tags，不碰 vf_source_files / vf_asset_previews；
// 凭证只从环境变量或 .local/recognize.env 读，源码里绝不落任何密钥，日志里也不打印完整 key。

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';
import {analyzeCaseTagsWithGlm} from '../functions/_ai.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ENV_FILE = join(ROOT, '.local', 'recognize.env');
const OUTPUT_DIR = join(ROOT, 'outputs');
const BUCKET = 'vf-library';

// 分区名而已，别改：库里已有的行都挂在 'augpicks-v1' 下，改名 = 现有数据全部读不到。
export const EXPERIMENT_KEY = 'augpicks-v1';
export const MODEL = 'glm-4v-flash';
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

// 与 app.js 的 FILTER_SECTIONS_CONFIG.element.values 保持一致（静态元素词，排在库内标签之后兜底）
export const CASE_ELEMENT_STATIC_VALUES = ['银行卡', '券', 'kiki', '骑手', '国旗', '手机', '耳机', 'PS5'];
// 与 app.js 的 FILTER_SECTIONS_CONFIG.activity.values 保持一致（活动词表只进提示词，不入库）
export const CASE_ACTIVITY_VALUES = ['聚餐', '足球', '夏日', '新年', '世界杯', '游戏', '开学', '开斋节', '宰牲节', '国庆节'];

// 这些后缀喂给视觉模型没有意义（视频 / 源文件 / 矢量图），直接跳过并记数，
// 不然每跑一次就白攒一堆失败记录。
export const NON_IMAGE_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv',
  'pdf', 'psd', 'psb', 'ai', 'eps', 'svg', 'json', 'zip', 'rar',
  'ttf', 'otf', 'woff', 'woff2'
]);

const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif'
};

const runState = {aborted: false};

/* ───────────────────────── 纯逻辑（单测覆盖，别把可测的东西塞进 main） ───────────────────────── */

// 与端点 previewContentKey() 逐字一致。任何一个字段对不上，这张图的标签就算过期。
export function previewContentKey(preview) {
  return [preview?.preview_path || '', preview?.preview_size_bytes || 0, preview?.updated_at || ''].join('|');
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

export function isRecognizablePreview(preview) {
  if (!String(preview?.preview_path || '')) return false;
  const ext = previewExtension(preview);
  return !ext || !NON_IMAGE_EXTENSIONS.has(ext);
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

// 成功行：ai_tags 里刨掉 excluded_tags（端点的 save 就是这个顺序），人工两列原样带回。
// `current` 必须是**写之前刚读到的**那一行，绝不拿空数组起底（v864 那次的教训）。
export function buildSuccessRow({preview, tags, model = MODEL, runId = null, current = null, experimentKey = EXPERIMENT_KEY}) {
  const excluded = cleanTags(current?.excluded_tags);
  const excludedSet = new Set(excluded);
  return {
    experiment_key: experimentKey,
    preview_id: preview.id,
    source_file_id: preview.source_file_id,
    ai_tags: cleanTags(tags).filter(tag => !excludedSet.has(tag)),
    manual_tags: cleanTags(current?.manual_tags),
    excluded_tags: excluded,
    status: 'success',
    model: String(model || MODEL).slice(0, 80),
    content_key: previewContentKey(preview),
    run_id: runId,
    error_message: ''
  };
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
// content_key 一致 = 画面没变过，标签直接可用（--force 才重跑）。
export function planWorkItems({previews = [], existingRows = [], force = false, limit = 0} = {}) {
  const existing = new Map();
  for (const row of existingRows) {
    if (row?.preview_id) existing.set(row.preview_id, row);
  }
  const pending = [];
  const skipped = [];
  const reasons = {noRow: 0, notSuccess: 0, contentChanged: 0, force: 0};
  for (const preview of previews) {
    const current = existing.get(preview.id) || null;
    const contentKey = previewContentKey(preview);
    let reason = '';
    if (!current) { reason = 'no-row'; reasons.noRow += 1; }
    else if (force) { reason = 'force'; reasons.force += 1; }
    else if (String(current.status || '') !== 'success') { reason = 'not-success'; reasons.notSuccess += 1; }
    else if (String(current.content_key || '') !== contentKey) { reason = 'content-changed'; reasons.contentChanged += 1; }
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
    dryRun: false,
    yes: false,
    markFailed: true,
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
    if (arg === '--dry-run') { options.dryRun = true; continue; }
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
  --force                     连「已成功且内容没变」的行也重跑（默认跳过它们）
  --dry-run                   只列将处理多少张、分布在哪些项目，不调模型、不写库
  --yes                       跳过开始前的确认（非 dry-run 且无 TTY 时必须加）
  --no-fail-mark              失败时不在库里写 status='failed'（默认写，便于 app 里看到失败标记）
  --help                      看这段

凭证（缺了会提示；二选一，别写进代码）：
  环境变量：SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GLM_API_KEY（ZHIPU_API_KEY 也认）
  或文件：  .local/recognize.env（KEY=VALUE 行式，该目录不进 git）

写库说明：只写 vf_preview_ai_tags（experiment_key=${EXPERIMENT_KEY}，分区名而已，别改），
不碰 vf_source_files / vf_asset_previews；manual_tags / excluded_tags 原样保留。

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

async function fetchVocabularyRows(creds) {
  const {rows} = await fetchRows(creds, 'vf_tag_vocabulary', 'select=name_zh,name_en,source&order=name_zh.asc');
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
async function upsertTagRow(creds, row) {
  const {data} = await supabaseRequest(creds, '/rest/v1/vf_preview_ai_tags?on_conflict=experiment_key,preview_id', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify(row)
  });
  return data;
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

// 优先缩略图（几 KB，省流量也省模型时间）；缩略图 404 就退原图，并记一行日志说明用了哪个。
async function loadPreviewImage(creds, preview) {
  const candidates = thumbnailCandidatesForPreview(preview);
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
    return {
      dataUrl: 'data:' + mimeForImagePath(path) + ';base64,' + buffer.toString('base64'),
      path,
      bytes: buffer.length,
      usedFallback: path !== candidates[0],
      tried
    };
  }
  const error = new Error('缩略图和原图都取不到：' + tried.join(' → '));
  error.status = 404;
  error.kind = 'missing-image';
  throw error;
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
  console.log('  模型       : ' + MODEL + '（免费视觉通道）');
  console.log('  并发/限流  : ' + options.concurrency + ' 张同时 · 每秒最多 ' + options.rate + ' 次模型调用');
  console.log('  experiment_key : ' + EXPERIMENT_KEY + '（只是分区名，别改）');
  if (extra.vocabularySize) console.log('  元素词表   : ' + extra.vocabularySize + ' 个词（库内标签 + 静态元素词）');
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

async function runBatch(creds, plan, options, vocabulary, log) {
  const total = plan.pending.length;
  const limiter = createRateLimiter(options.rate);
  const runId = (globalThis.crypto?.randomUUID?.() || '') || null;
  const startedAt = Date.now();
  const stats = {ok: 0, fail: 0, done: 0, fallbackImages: 0};
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
    const image = await withRetry(
      () => loadPreviewImage(creds, item.preview),
      {attempts: RETRY_ATTEMPTS, baseDelayMs: RETRY_BASE_MS, onRetry: ({delay}) => log.line('· 取图重试，等 ' + delay + 'ms')}
    );
    if (image.value.usedFallback) {
      stats.fallbackImages += 1;
      log.line('· 缩略图缺失，改用原图：' + item.preview.preview_path);
    }
    await limiter();
    const analyzed = await withRetry(
      () => withTimeout(
        analyzeCaseTagsWithGlm({GLM_API_KEY: creds.glmKey}, image.value.dataUrl, vocabulary, CASE_ACTIVITY_VALUES),
        MODEL_TIMEOUT_MS,
        '模型超过 ' + MODEL_TIMEOUT_MS + 'ms 未返回'
      ),
      {attempts: RETRY_ATTEMPTS, baseDelayMs: RETRY_BASE_MS, onRetry: ({attempt, kind, delay}) => log.line('· 第 ' + attempt + ' 次失败（' + kind + '），等 ' + delay + 'ms 重试')}
    );
    const tags = Array.isArray(analyzed.value?.elements) ? analyzed.value.elements : [];
    // 写之前重读一次：人工可能刚在 app 里给这张补过标签 / 排除过词，拿计划阶段的旧快照去写会覆盖掉它。
    const fresh = await fetchCurrentTagRow(creds, item.preview.id);
    await upsertTagRow(creds, buildSuccessRow({preview: item.preview, tags, runId, current: fresh}));
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
  const previews = casePreviews.filter(isRecognizablePreview);
  const skippedFiles = casePreviews.length - previews.length;

  const existingRows = await fetchExistingTagRows(creds);
  const vocabulary = elementVocabularyFromRows(await fetchVocabularyRows(creds));
  const plan = planWorkItems({previews, existingRows, force: options.force, limit: options.limit});

  printConfig(creds, options, {vocabularySize: vocabulary.length});
  console.log('范围：' + (options.project ? '项目「' + options.project + '」→ ' + sources.length + ' 个' : '全部案例项目 ' + sources.length + ' 个')
    + '；物料 ' + casePreviews.length + ' 张（跳过非图片 ' + skippedFiles + ' 张），预览表共 ' + previewTotal + ' 行');
  console.log('待处理：' + plan.stats.pending + ' 张'
    + '（新增 ' + plan.stats.reasons.noRow
    + ' / 未成功 ' + plan.stats.reasons.notSuccess
    + ' / 内容变了 ' + plan.stats.reasons.contentChanged
    + (options.force ? ' / --force 重跑 ' + plan.stats.reasons.force : '')
    + '），跳过 ' + plan.stats.skipped + ' 张（已成功且内容没变）'
    + (plan.stats.pendingTotal > plan.stats.pending ? '，另有 ' + (plan.stats.pendingTotal - plan.stats.pending) + ' 张被 --limit 留到下一轮' : ''));

  if (options.dryRun) {
    printProjectDistribution(plan.pending, id => projectTitles.get(id) || '');
    console.log('--dry-run：没有调模型、没有写库。');
    return 0;
  }
  if (!plan.pending.length) {
    console.log('没有需要处理的图片（都是最新的）。要强制重跑就加 --force。');
    return 0;
  }

  if (!options.yes) {
    printProjectDistribution(plan.pending, id => projectTitles.get(id) || '');
    const answer = await confirm('将对 ' + plan.pending.length + ' 张图调用模型（' + MODEL + '）并写库 vf_preview_ai_tags（experiment_key=' + EXPERIMENT_KEY + '）。确认继续？(y/N) ');
    if (!answer) { console.log('已取消。'); return 0; }
  }

  installSigintHandler(log);
  const result = await runBatch(creds, plan, {...options, projectTitles}, vocabulary, log);
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
