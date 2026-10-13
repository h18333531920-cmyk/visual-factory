// 本机批量识别脚本（scripts/recognize-case-tags.mjs）的单测。
// 只测**不联网**的纯逻辑：内容键口径、缩略图路径、待处理清单、写库合并、env 解析、CLI 解析。
// 为什么值得锁这些：脚本直连真实库写 vf_preview_ai_tags，一旦合并口径写歪（覆盖人工标签 / 排除词复活）
// 就是真实数据事故，靠单测挡住比靠人肉看代码可靠。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EXPERIMENT_KEY,
  CONCURRENCY_MAX,
  DEFAULT_CONCURRENCY,
  NON_IMAGE_EXTENSIONS,
  ANIMATED_EXTENSIONS,
  SKIP_ANIMATED,
  SKIP_NON_IMAGE,
  SKIP_NO_PATH,
  previewContentKey,
  thumbPathForPreview,
  thumbnailCandidatesForPreview,
  isRecognizablePreview,
  previewSkipReason,
  selectRecognizablePreviews,
  skipSummary,
  formatSkipSummary,
  mimeForImagePath,
  cleanTags,
  buildSuccessRow,
  buildFailureRow,
  planWorkItems,
  elementVocabularyFromRows,
  matchProjectSources,
  parseEnvText,
  resolveCredentials,
  credentialsHelpMessage,
  maskSecret,
  isCaseLibrarySource,
  classifyError,
  backoffDelayMs,
  withRetry,
  progressLine,
  failuresFilePath,
  parseArgs
} from '../scripts/recognize-case-tags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const scriptSource = readFileSync(join(here, '..', 'scripts', 'recognize-case-tags.mjs'), 'utf8');
const endpointSource = readFileSync(join(here, '..', 'functions', 'api', 'case-preview-ai-tags.js'), 'utf8');

function previewOf(id, {source = 'src-1', path = 'u1/s1/' + id + '.png', size = 100, updatedAt = '2026-10-13T00:00:00Z'} = {}) {
  return {id, source_file_id: source, preview_path: path, preview_size_bytes: size, updated_at: updatedAt, preview_filename: id + '.png'};
}

function tagRow(preview, {status = 'success', contentKey = previewContentKey(preview), manual = [], excluded = []} = {}) {
  return {preview_id: preview.id, source_file_id: preview.source_file_id, status, content_key: contentKey, manual_tags: manual, excluded_tags: excluded};
}

test('content_key 与端点 previewContentKey 逐字段同口径', () => {
  const preview = {preview_path: 'u1/s1/preview-1.png', preview_size_bytes: 12345, updated_at: '2026-10-13T01:02:03.123Z'};
  assert.equal(previewContentKey(preview), 'u1/s1/preview-1.png|12345|2026-10-13T01:02:03.123Z');
  // 缺字段时的兜底（空串 / 0 / 空串）也必须跟端点一致，否则同一张图在脚本与 app 里判断结果相反
  assert.equal(previewContentKey({id: 'x'}), '|0|');
  assert.equal(previewContentKey(null), '|0|');
  // 锁住端点那一行：脚本抄的就是它，端点改了这里必须跟着响
  assert.match(endpointSource, /\[preview\.preview_path \|\| '', preview\.preview_size_bytes \|\| 0, preview\.updated_at \|\| ''\]\.join\('\|'\)/);
  assert.match(scriptSource, /preview_size_bytes \|\| 0[\s\S]{0,80}\.join\('\|'\)/);
});

test('缩略图路径推导：同级 _thumb.jpg，无目录/无路径都不炸', () => {
  assert.equal(thumbPathForPreview({preview_path: 'u1/s1/preview-1/a.png'}), 'u1/s1/preview-1/_thumb.jpg');
  assert.equal(thumbPathForPreview({preview_path: '/a.png'}), '/_thumb.jpg');
  // 没有目录就推不出来：原样返回（取图那一步会跳过重复项，直接试原图）
  assert.equal(thumbPathForPreview({preview_path: 'a.png'}), 'a.png');
  assert.equal(thumbPathForPreview({preview_path: ''}), '');
  assert.equal(thumbPathForPreview({}), '');
  assert.equal(thumbPathForPreview(null), '');
  // 取图顺序：约定的缩略图 → app.js 给预览图实际用的 _thumb-<id>.jpg → 原图（兜底）
  assert.deepEqual(thumbnailCandidatesForPreview({id: 'p1', preview_path: 'u1/s1/a.png'}),
    ['u1/s1/_thumb.jpg', 'u1/s1/_thumb-p1.jpg', 'u1/s1/a.png']);
  assert.deepEqual(thumbnailCandidatesForPreview({preview_path: 'u1/s1/a.png'}), ['u1/s1/_thumb.jpg', 'u1/s1/a.png']);
  assert.deepEqual(thumbnailCandidatesForPreview({id: 'p1', preview_path: 'a.png'}), ['a.png']);
  assert.deepEqual(thumbnailCandidatesForPreview({}), []);
});

test('非图片物料先跳过（视频/源文件/矢量图喂模型没意义）', () => {
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.jpg'}), true);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.PNG'}), true);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.webp'}), true);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.mp4'}), false);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.psd'}), false);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.svg'}), false);
  assert.equal(isRecognizablePreview({preview_path: ''}), false);
  // 非图片那组不受 --include-gif 影响（逃生开关只针对动态图）
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.mp4'}, {includeGif: true}), false);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.psd'}, {includeGif: true}), false);
  assert.equal(mimeForImagePath('u1/s1/a.png'), 'image/png');
  assert.equal(mimeForImagePath('u1/s1/a.webp'), 'image/webp');
  assert.equal(mimeForImagePath('u1/s1/a'), 'image/jpeg');
});

test('v916 动态图（.gif）默认不进队列：GLM 视觉通道吃不下动图', () => {
  // 2026-10-13 全量实测：93 张 gif 只成功 6 张（失败的 87 张全是 gif），原因是
  // `图片输入格式/解析错误` 与 `图片过大` ⇒ 重试多少次都是白烧额度，还会把队首堵死。
  assert.equal(ANIMATED_EXTENSIONS.has('gif'), true);
  assert.equal(NON_IMAGE_EXTENSIONS.has('gif'), false, 'gif 是"模型吃不下"，不是"喂了没意义"，两组别混');
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.gif'}), false);
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.GIF'}), false, '大小写都要挡住');
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.gif'}), SKIP_ANIMATED);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.mp4'}), SKIP_NON_IMAGE);
  assert.equal(previewSkipReason({preview_path: ''}), SKIP_NO_PATH);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.png'}), '');

  // --include-gif：照旧送（等"抽静态帧"落地后重新启用）
  assert.equal(isRecognizablePreview({preview_path: 'u1/s1/a.gif'}, {includeGif: true}), true);
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.gif'}, {includeGif: true}), '');
  assert.equal(previewSkipReason({preview_path: 'u1/s1/a.GIF'}, {includeGif: true}), '');

  // 筛选入口（main 用的就是这个）与 planWorkItems 串起来跑一遍：gif 不进待处理清单
  const previews = [
    previewOf('p-jpg', {path: 'u1/s1/a.jpg'}),
    previewOf('p-gif', {path: 'u1/s1/a.gif'}),
    previewOf('p-mp4', {path: 'u1/s1/a.mp4'})
  ];
  const selected = selectRecognizablePreviews(previews);
  assert.deepEqual(selected.map(item => item.id), ['p-jpg']);
  const plan = planWorkItems({previews: selected, existingRows: []});
  assert.deepEqual(plan.pending.map(item => item.preview.id), ['p-jpg'], '库里的 87 张 gif 不许再占队首（--limit 会把新图全挤到队尾）');
  assert.equal(selectRecognizablePreviews(previews, {includeGif: true}).map(item => item.id).join(','), 'p-jpg,p-gif');
});

test('v916 dry-run 的跳过计数：多少张、为什么，一眼看懂', () => {
  const previews = [
    previewOf('p-jpg', {path: 'u1/s1/a.jpg'}),
    previewOf('p-gif1', {path: 'u1/s1/a.gif'}),
    previewOf('p-gif2', {path: 'u1/s1/b.gif'}),
    previewOf('p-mp4', {path: 'u1/s1/v.mp4'}),
    {id: 'font-preview-src-1', source_file_id: 'src-1', preview_path: ''}
  ];
  const summary = skipSummary(previews);
  assert.deepEqual(summary, {total: 5, recognized: 1, noPath: 1, nonImage: 1, animated: 2});

  const text = formatSkipSummary(summary);
  assert.match(text, /^非图片 1 张（视频 \/ 源文件 \/ 矢量图）/);
  assert.match(text, /动态图 2 张/);
  assert.match(text, /gif 不支持：GLM 视觉通道吃不下动图/);
  assert.match(text, /--include-gif/, '要告诉人这个开关存在');
  assert.match(text, /无预览路径 1 张/);

  // 加了 --include-gif：gif 不再算跳过（计数归零 + 文案改口径）
  const withGif = skipSummary(previews, {includeGif: true});
  assert.deepEqual(withGif, {total: 5, recognized: 3, noPath: 1, nonImage: 1, animated: 0});
  const withGifText = formatSkipSummary(withGif, {includeGif: true});
  assert.match(withGifText, /动态图 0 张（--include-gif：gif 照旧送模型）/);
  assert.doesNotMatch(withGifText, /gif 不支持/);

  // 一张都不可识别时也要照打（计数为 0 的行就是"凭什么是这条规则"的说明）
  const emptyText = formatSkipSummary(skipSummary([]));
  assert.match(emptyText, /^非图片 0 张/);
  assert.match(emptyText, /动态图 0 张/);
  assert.equal(skipSummary(null).total, 0, '空输入不许炸');

  // 脚本源码里必须留着实测数据与开关，免得以后有人以为这是"随手加的过滤"
  assert.match(scriptSource, /93 张 gif 只有 6 张成功|93 张只成功 6 张/);
  assert.match(scriptSource, /--include-gif/);
  assert.match(scriptSource, /GLM 视觉通道吃不下动图/);
});

test('待处理清单：没行要跑、成功且内容没变跳过、内容变了要跑、--force 全跑', () => {
  const fresh = previewOf('p-fresh');
  const stale = previewOf('p-stale');
  const failed = previewOf('p-failed');
  const missing = previewOf('p-missing');
  const previews = [fresh, stale, failed, missing];
  const existingRows = [
    tagRow(fresh),
    tagRow(stale, {contentKey: previewContentKey({...stale, updated_at: '2026-10-01T00:00:00Z'})}),
    tagRow(failed, {status: 'failed'})
  ];

  const plan = planWorkItems({previews, existingRows});
  assert.deepEqual(plan.pending.map(item => item.preview.id), ['p-stale', 'p-failed', 'p-missing']);
  assert.deepEqual(plan.pending.map(item => item.reason), ['content-changed', 'not-success', 'no-row']);
  assert.deepEqual(plan.skipped.map(item => item.preview.id), ['p-fresh']);
  assert.deepEqual(plan.stats, {
    materials: 4, pendingTotal: 3, pending: 3, skipped: 1,
    reasons: {noRow: 1, notSuccess: 1, contentChanged: 1, force: 0}
  });

  // --force：连内容没变的那张也重跑
  const forced = planWorkItems({previews, existingRows, force: true});
  assert.equal(forced.pending.length, 4);
  assert.equal(forced.skipped.length, 0);
  assert.equal(forced.stats.reasons.force, 3, '已有 3 行都会以 force 名义重跑；没有行的那个仍算 no-row');

  // --limit 只截待处理（不影响跳过的判断），并在统计里交代还有多少留到下一轮
  const limited = planWorkItems({previews, existingRows, limit: 2});
  assert.deepEqual(limited.pending.map(item => item.preview.id), ['p-stale', 'p-failed']);
  assert.equal(limited.stats.pendingTotal, 3);
  assert.equal(limited.stats.pending, 2);
  assert.equal(limited.stats.skipped, 1);

  // 状态是 running/expired 的（上次跑到一半断了）也要重跑
  const interrupted = planWorkItems({previews: [fresh], existingRows: [tagRow(fresh, {status: 'running'})]});
  assert.equal(interrupted.pending.length, 1);
});

test('cleanTags 与端点一致：去空、单条 ≤12 字、去重、最多 12 条', () => {
  assert.deepEqual(cleanTags(['汉堡', '汉堡', '', null, '  餐桌  ']), ['汉堡', '餐桌']);
  assert.deepEqual(cleanTags(['一二三四五六七八九十一二三']), [], '13 字必须丢（端点就是 >12 丢）');
  assert.deepEqual(cleanTags(['一二三四五六七八九十一二']), ['一二三四五六七八九十一二'], '12 字要保留');
  assert.equal(cleanTags(Array.from({length: 30}, (_, i) => 'w' + i)).length, 12);
  assert.deepEqual(cleanTags(null), []);
});

test('写库合并：manual_tags / excluded_tags 不被覆盖，excluded 里的词不进 ai_tags', () => {
  const preview = previewOf('p1');
  const current = {ai_tags: ['旧词'], manual_tags: ['人工补的词'], excluded_tags: ['手机'], model: 'glm-4v-flash', status: 'idle'};
  const row = buildSuccessRow({preview, tags: ['手机', '汉堡', '汉堡', '牛排'], current});
  assert.deepEqual(row.ai_tags, ['汉堡', '牛排'], '被排除过的词不能复活');
  assert.deepEqual(row.manual_tags, ['人工补的词'], '人工标签必须原样带回');
  assert.deepEqual(row.excluded_tags, ['手机'], '排除表必须原样带回');
  assert.equal(row.status, 'success');
  assert.equal(row.model, 'glm-4v-flash');
  assert.equal(row.error_message, '');
  assert.equal(row.content_key, previewContentKey(preview));
  assert.equal(row.experiment_key, EXPERIMENT_KEY);
  assert.equal(row.preview_id, 'p1');
  assert.equal(row.source_file_id, 'src-1');

  // 没有行时不许拿 undefined 起底（照端点的空数组默认）
  const plain = buildSuccessRow({preview, tags: ['汉堡'], current: null});
  assert.deepEqual(plain.manual_tags, []);
  assert.deepEqual(plain.excluded_tags, []);
  assert.deepEqual(plain.ai_tags, ['汉堡']);

  // 表里的字段名与端点 saveRow 的入参完全一致（别自创列名）
  assert.deepEqual(Object.keys(row).sort(), [
    'ai_tags', 'content_key', 'error_message', 'excluded_tags', 'experiment_key',
    'manual_tags', 'model', 'preview_id', 'run_id', 'source_file_id', 'status'
  ]);
});

test('失败行只带状态列：不会清空已有标签与人工标注', () => {
  const preview = previewOf('p2');
  const row = buildFailureRow({preview, error: 'HTTP 500', current: {model: 'glm-4v-flash'}});
  assert.equal(row.status, 'failed');
  assert.equal(row.model, 'glm-4v-flash', '失败不该清掉上次的模型标记');
  assert.equal(row.error_message, 'HTTP 500');
  assert.equal(row.content_key, previewContentKey(preview));
  assert.ok(!('ai_tags' in row), '失败行不能带 ai_tags，否则 merge-duplicates 会把旧标签抹掉');
  assert.ok(!('manual_tags' in row));
  assert.ok(!('excluded_tags' in row));
  assert.equal(buildFailureRow({preview, error: 'x'.repeat(900)}).error_message.length, 500);
  assert.equal(buildFailureRow({preview, error: '   '}).error_message, '识别失败');
});

test('元素词表：人工维护的排前面、去大小写重复、静态元素词兜底、上限 160', () => {
  const words = elementVocabularyFromRows([
    {name_zh: '汉堡', source: 'ai'},
    {name_zh: 'KIKI', source: 'manual'},
    {name_zh: 'kiki', source: 'ai'},
    {name_zh: '   ', source: 'ai'}
  ]);
  assert.deepEqual(words.slice(0, 3), ['KIKI', '汉堡', '银行卡']);
  assert.equal(words.includes('kiki'), false, '大小写不同但同一个词只留一个（留人工那个）');
  assert.equal(elementVocabularyFromRows(Array.from({length: 400}, (_, i) => ({name_zh: '词' + i, source: 'ai'}))).length, 160);
});

test('env 解析：KEY=VALUE 行式，认注释/引号/export，坏行丢掉', () => {
  const parsed = parseEnvText([
    '# 这是注释',
    '',
    'SUPABASE_URL=https://demo.supabase.co',
    'export SUPABASE_SERVICE_ROLE_KEY="srk-placeholder-value"',
    "GLM_API_KEY='glm-placeholder'",
    '这一行没有等号',
    '=只有值'
  ].join('\r\n'));
  assert.equal(parsed.SUPABASE_URL, 'https://demo.supabase.co');
  assert.equal(parsed.SUPABASE_SERVICE_ROLE_KEY, 'srk-placeholder-value');
  assert.equal(parsed.GLM_API_KEY, 'glm-placeholder');
  assert.deepEqual(Object.keys(parsed).sort(), ['GLM_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL']);
  assert.deepEqual(parseEnvText(''), {});
});

test('凭证：环境变量优先于文件，缺哪几个报哪几个，提示里不含任何 key 内容', () => {
  const creds = resolveCredentials(
    {SUPABASE_URL: 'https://demo.supabase.co/', GLM_API_KEY: 'glm-from-env'},
    {SUPABASE_SERVICE_ROLE_KEY: 'srk-from-file', GLM_API_KEY: 'glm-from-file-should-lose'}
  );
  assert.equal(creds.url, 'https://demo.supabase.co', '末尾斜杠要去掉，否则拼出来是双斜杠');
  assert.equal(creds.serviceKey, 'srk-from-file');
  assert.equal(creds.glmKey, 'glm-from-env', '环境变量赢过文件');
  assert.deepEqual(creds.missing, []);
  assert.equal(resolveCredentials({ZHIPU_API_KEY: 'zhipu-placeholder'}, {}).glmKey, 'zhipu-placeholder', 'ZHIPU_API_KEY 也要认');

  const empty = resolveCredentials({}, {});
  assert.deepEqual(empty.missing, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GLM_API_KEY（或 ZHIPU_API_KEY）']);
  const help = credentialsHelpMessage(empty.missing);
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GLM_API_KEY']) {
    assert.ok(help.includes(name), '提示里要说清该设哪个变量：' + name);
  }
  assert.match(help, /\.local\/recognize\.env/);
  assert.doesNotMatch(help, /srk-from-file|glm-from-env|eyJ/, '提示里绝不能带任何 key 内容');
  assert.equal(credentialsHelpMessage(['GLM_API_KEY']).includes('glm-placeholder'), false);

  // 用中性的占位串（不写任何像真 JWT 的东西，免得被密钥扫描器误报）
  assert.equal(maskSecret('abcd1234efgh5678ijkl'), 'abcd…(长度 20)');
  assert.equal(maskSecret('abcd'), 'abcd…(长度 4)');
  assert.equal(maskSecret(''), '(缺失)');
  assert.equal(maskSecret(undefined), '(缺失)');
});

test('错误分类与退避：限流/5xx/超时/网络重试，参数与图片问题不重试', () => {
  assert.equal(classifyError(Object.assign(new Error('HTTP 429'), {status: 429})), 'rate-limit');
  assert.equal(classifyError(new Error('您的账户已达到速率限制，请稍后再试')), 'rate-limit');
  assert.equal(classifyError(Object.assign(new Error('boom'), {status: 503})), 'server');
  assert.equal(classifyError(Object.assign(new Error('请求超过 60000ms 未返回'), {kind: 'timeout'})), 'timeout');
  assert.equal(classifyError(new Error('fetch failed')), 'network');
  assert.equal(classifyError(Object.assign(new Error('图片过大，请改用缩略图识别。'), {})), 'client');
  assert.equal(classifyError(Object.assign(new Error('bad param'), {status: 400})), 'client');
  assert.equal(classifyError(Object.assign(new Error('缩略图和原图都取不到'), {status: 404})), 'client', '404 的图重试也没有');

  const delays = [1, 2, 3].map(attempt => backoffDelayMs(attempt, 1000));
  assert.ok(delays[0] >= 750 && delays[0] <= 1250, '第 1 次退避约等于基准值（带抖动）');
  assert.ok(delays[1] > delays[0] && delays[2] > delays[1], '退避要指数增长');
});

test('重试：限流退避到上限，参数错误一次就放弃', async () => {
  let calls = 0;
  const slept = [];
  const rateLimited = await withRetry(
    async () => { calls += 1; throw Object.assign(new Error('HTTP 429'), {status: 429}); },
    {sleep: async ms => { slept.push(ms); }}
  ).catch(error => error);
  assert.match(rateLimited.message, /429/);
  assert.equal(calls, 3, '默认重试 3 次');
  assert.equal(slept.length, 2, '最后一次失败后不再等');
  assert.equal(rateLimited.attempts, 3, '失败清单里要记"真的试了 3 次"');
  assert.equal(rateLimited.kind, 'rate-limit');

  let clientCalls = 0;
  const clientError = await withRetry(
    async () => { clientCalls += 1; throw Object.assign(new Error('bad param'), {status: 400}); },
    {sleep: async () => {}}
  ).catch(error => error);
  assert.match(clientError.message, /bad param/);
  assert.equal(clientCalls, 1);
  assert.equal(clientError.attempts, 1, '不重试的错要记成 1 次，别混成 3 次');

  const ok = await withRetry(async () => 'done', {sleep: async () => {}});
  assert.deepEqual(ok, {value: 'done', attempts: 1});
});

test('CLI 解析：--project/--limit/--concurrency/--force/--dry-run/--yes，并发被夹到上限', () => {
  const options = parseArgs(['--project', 'AugPicks', '--limit', '50', '--concurrency', '6', '--force', '--dry-run', '--yes']);
  assert.equal(options.project, 'AugPicks');
  assert.equal(options.limit, 50);
  assert.equal(options.concurrency, 6);
  assert.equal(options.force, true);
  assert.equal(options.dryRun, true);
  assert.equal(options.yes, true);

  assert.equal(parseArgs(['--limit=7']).limit, 7, '--key=value 写法也认');
  assert.equal(parseArgs(['--project=abc']).project, 'abc');
  assert.equal(parseArgs(['--concurrency', '99']).concurrency, CONCURRENCY_MAX);
  const defaults = parseArgs([]);
  assert.equal(defaults.concurrency, DEFAULT_CONCURRENCY);
  assert.equal(defaults.limit, 0);
  assert.equal(defaults.force, false);
  assert.equal(defaults.dryRun, false);
  assert.equal(defaults.yes, false);
  assert.equal(defaults.markFailed, true, '默认写失败标记（app 里才看得到）');
  assert.equal(parseArgs(['--no-fail-mark']).markFailed, false);
  assert.equal(parseArgs(['-y']).yes, true);
  assert.equal(parseArgs(['--help']).help, true);
  // v916 逃生开关：默认关（gif 不进队列），传了才照旧送
  assert.equal(defaults.includeGif, false, '--include-gif 默认必须是关的');
  assert.equal(parseArgs(['--include-gif']).includeGif, true);
  assert.equal(parseArgs(['--dry-run', '--include-gif']).includeGif, true);

  assert.throws(() => parseArgs(['--concurrency', 'abc']), /并发/);
  assert.throws(() => parseArgs(['--limit']), /--limit/);
  assert.throws(() => parseArgs(['--whatever']), /未知参数/);
});

test('进度行与失败清单文件名', () => {
  assert.equal(progressLine({done: 123, total: 1925, ok: 120, fail: 3, elapsedMs: 252000}), '[123/1925] 6% ok=120 fail=3 用时 4m12s 速度 0.5/s');
  assert.match(failuresFilePath('/tmp/out', new Date('2026-10-13T04:05:06Z')), /\/tmp\/out\/recognize-failures-2026-10-13-04-05-06\.json$/);
});

test('v916 接线：main 的筛选、计数、跳过文案都走同一处判据；写库语义一行没动', () => {
  assert.match(scriptSource, /const previews = selectRecognizablePreviews\(casePreviews, \{includeGif: options\.includeGif\}\)/);
  assert.match(scriptSource, /const skipped = skipSummary\(casePreviews, \{includeGif: options\.includeGif\}\)/);
  assert.match(scriptSource, /formatSkipSummary\(skipped, \{includeGif: options\.includeGif\}\)/);
  assert.match(scriptSource, /if \(arg === '--include-gif'\) \{ options\.includeGif = true; continue; \}/);
  assert.match(scriptSource, /--include-gif\s+把 \.gif 也送进模型/);
  assert.match(scriptSource, /动态图 gif : /, '跑起来先让人看见 gif 是不是跳过');
  assert.match(scriptSource, /不进识别队列（物料 ' \+ casePreviews\.length \+ ' 张里跳过 '/, '分母也要给出来，否则"跳过 99 张"看不出占多少');
  // 写库口径（v914 统一的去重）不许被这次改动碰：仍然是"只 POST 一次 + ai_tags 刨掉 excluded 与 manual"
  assert.match(scriptSource, /\.filter\(tag => !excludedSet\.has\(tag\) && !manualSet\.has\(tag\)\)/);
  assert.equal(scriptSource.split("method: 'POST'").length - 1, 1);
});

test('项目筛选：认 uuid 也认标题片段；案例项目 = source_path 为空', () => {
  const sources = [
    {id: 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5', title: 'AugPicks campaign'},
    {id: '11111111-2222-4333-8444-555555555555', title: 'Ramadan 2026'}
  ];
  assert.equal(matchProjectSources(sources, '').length, 2);
  assert.equal(matchProjectSources(sources, 'augpicks').length, 1);
  assert.equal(matchProjectSources(sources, 'BFA82CE5-FCA0-403B-8F7E-C6B6EAFAF4C5')[0].title, 'AugPicks campaign');
  assert.equal(matchProjectSources(sources, '不存在').length, 0);

  // 案例库判定：库里是空字符串不是 NULL，两种都算案例项目；有 source_path 的是素材/模板库，不能混进来
  assert.equal(isCaseLibrarySource({source_path: ''}), true);
  assert.equal(isCaseLibrarySource({source_path: null}), true);
  assert.equal(isCaseLibrarySource({}), true);
  assert.equal(isCaseLibrarySource({source_path: 'u1/sources/x/a.png'}), false);
  assert.equal(isCaseLibrarySource({source_path: ' '}), false);
});

test('脚本源码：没有硬编码密钥，只写 vf_preview_ai_tags', () => {
  assert.doesNotMatch(scriptSource, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(scriptSource, /(service_role|serviceRoleKey|serviceKey|glmKey)\s*[:=]\s*['"][A-Za-z0-9._-]{16,}['"]/i);
  // 只允许碰这四张表（三张只读 + 标签表读写），多一张表就说明有人往里加了别的东西
  const readTables = [...new Set([...scriptSource.matchAll(/fetchRows\(creds,\s*'([a-z_]+)'/g)].map(match => match[1]))].sort();
  assert.deepEqual(readTables, ['vf_asset_previews', 'vf_preview_ai_tags', 'vf_source_files', 'vf_tag_vocabulary']);
  // 源码里写死的 REST 路径只允许有标签表这一条（其余都走变量拼）
  const literalPaths = [...new Set(scriptSource.match(/\/rest\/v1\/[a-z_]+/g) || [])];
  assert.deepEqual(literalPaths, ['/rest/v1/vf_preview_ai_tags']);
  // 全脚本只有一处写库，且只能写标签表（没有 PATCH/DELETE，绝不改业务表）
  assert.equal(scriptSource.split("method: 'POST'").length - 1, 1);
  assert.match(scriptSource, /supabaseRequest\(creds, '\/rest\/v1\/vf_preview_ai_tags\?on_conflict=experiment_key,preview_id', \{\n\s+method: 'POST'/);
  assert.doesNotMatch(scriptSource, /method:\s*'(PATCH|DELETE|PUT)'/);
  // 分区名不许改：现有 28 行都挂在这个 key 下
  assert.equal(EXPERIMENT_KEY, 'augpicks-v1');
  assert.match(scriptSource, /experiment_key: experimentKey/);
});
