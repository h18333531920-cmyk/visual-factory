// v961：**上传卡在 0% / 素材压根没传上去** 的三处挂起点修复。
//
// 背景：v960 只把「写响应」收齐了（上游写完但响应流不结束），没有处理「写请求」侧。
// 实测现象是进度条 0%、对象没落库：
//   ① 代理层把 request.body（ReadableStream）直接透传给上游 fetch ⇒ Cloudflare 只能用
//      chunked 编码转发 ⇒ Supabase storage 偶发挂起，对象不落库、响应也不返回；
//   ② 上游 fetch 没有超时 ⇒ 任何一次挂起都会让整条请求无限等待；
//   ③ 前端图片解码（Image.onload / canvas.toBlob）没有收敛兜底 ⇒ Promise 永远 pending，
//      即使对象已上传，也走不到入库那一步（素材库看不到 = "没传上去"）。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const proxy = readFileSync(join(ROOT, 'functions/api/account-data.js'), 'utf8');
const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
const VERSION = '20261022-storage-buffer-v961';

test('v961 ①：storage 写请求体先完整缓冲再转发（不再把 request.body 流透传给上游）', () => {
  assert.match(
    proxy,
    /else if \(plan\.storage && !\['GET','HEAD'\]\.includes\(method\)\) \{/,
    'storage 写请求必须走独立的缓冲分支'
  );
  assert.match(proxy, /const bytes = await request\.arrayBuffer\(\);/, '请求体要完整读成 ArrayBuffer（运行时据此带精确 Content-Length）');
  assert.match(proxy, /bytes\.byteLength > 80 \* 1024 \* 1024/, '大文件上限保护（避免 Function 内存被打爆）');
  // 缓冲必须发生在 fetch 之前
  const bufferAt = proxy.indexOf('const bytes = await request.arrayBuffer();');
  const fetchAt = proxy.indexOf('const response = await fetch(plan.target.href');
  assert.ok(bufferAt > 0 && fetchAt > bufferAt, '先缓冲、后转发');
  // GET/HEAD 仍然流式（下载大图不整块进内存）
  assert.match(proxy, /let body = \['GET','HEAD'\]\.includes\(method\) \? undefined : request\.body;/, '读请求保持流式');
});

test('v961 ②：写操作的上游 fetch 有 120 秒上限（读操作不加）', () => {
  assert.match(
    proxy,
    /signal: \['GET','HEAD'\]\.includes\(method\) \? undefined : AbortSignal\.timeout\(120000\)/,
    '写操作必须有上游超时，否则挂起会无限等待'
  );
});

test('v961 ③：前端图片解码/压缩全部有收敛兜底 + 上传本身有 30 秒超时', () => {
  // previewImageThumbnailAndDimensions：整体 10 秒兜底 + toBlob 8 秒兜底
  assert.match(app, /const guard = setTimeout\(\(\) => finish\(\{ width: null, height: null, thumbnail: null \}\), 10000\);/, '整体兜底');
  assert.match(app, /setTimeout\(\(\) => \{ if \(!toBlobDone\) \{ clearTimeout\(guard\); finish\(\{ width, height, thumbnail: null \}\); \} \}, 8000\);/, 'toBlob 兜底');
  // compressImageIfNeeded：15 秒兜底直接传原图
  assert.match(app, /var guard = setTimeout\(function\(\) \{ finish\(file\); \}, 15000\);/, '压缩兜底');
  // 上传本身：30 秒 Promise.race 超时，卡住时明确报错而不是永远 0%
  assert.match(app, /上传超时，请刷新页面后重试/, '上传超时要给用户明确提示');
  assert.match(app, /Promise\.race\(\[\s*state\.supabase\.storage\.from\(LIBRARY_BUCKET\)\.upload\(sourcePath, uploadFile/, 'gallery 源图上传必须包超时');
});

test('v961：版本号三处一致（app.js 常量 + index.html ?v= + 本文件）', () => {
  assert.match(app, new RegExp(`TOOL_UI_VERSION = '${VERSION}'`), 'app.js 内部版本号必须是 v961');
  const refs = (index.match(new RegExp(`\\?v=${VERSION}`, 'g')) || []).length;
  assert.equal(refs, 5, 'index.html 必须 5 处 ?v= 引用 v961');
  assert.equal(VERSION, '20261022-storage-buffer-v961');
});
