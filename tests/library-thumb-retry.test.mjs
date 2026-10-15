// 素材卡「小图失败先重试」逻辑（v723）的静态不变量。
// 背景：缩略图失败一次（网络抖动/带宽被大图挤占）就退回几 MB～十几 MB 的原图，
// 封面会长时间停在模糊占位。v723 起先重签地址重试一次，仍失败才降级。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function recoverBody() {
  const start = appSource.indexOf('async function recoverLibraryCardImage(img)');
  assert.ok(start >= 0, 'recoverLibraryCardImage 必须存在');
  const end = appSource.indexOf('function renderLibrarySelects()', start);
  assert.ok(end > start, '找不到 recoverLibraryCardImage 的结束位置');
  return appSource.slice(start, end);
}

test('小图失败先重签重试一次，仍失败才标记不可用并退回原图', () => {
  const body = recoverBody();
  assert.match(body, /const thumbRetries = Number\(img\.dataset\.libraryThumbRetries \|\| 0\);/);
  assert.match(body, /if \(thumbPath && thumbRetries < 1 && state\.supabase && !state\.localPreview\)/);
  assert.match(body, /await signLibraryPreviewUrls\(\[thumbPath\]\)/);
  const retryIdx = body.indexOf('libraryThumbRetries = String(thumbRetries + 1)');
  const retryAssignIdx = body.indexOf('img.src = retryUrl;');
  const downgradeIdx = body.indexOf('markLibraryThumbUnavailable(thumbPath)');
  assert.ok(retryIdx >= 0 && retryAssignIdx > retryIdx, '重试分支必须先重签再换回小图地址');
  assert.ok(downgradeIdx > retryAssignIdx, '降级（标记不可用）必须排在本页重试之后');
});

test('重试预算按图片身份重置、加载成功归还', () => {
  assert.match(
    appSource,
    /if \(imageIdentityChanged \|\| !img\.dataset\.libraryImageRetries\) \{\s*\n\s*img\.dataset\.libraryImageRetries = '0';\s*\n\s*img\.dataset\.libraryThumbRetries = '0';/
  );
  assert.match(appSource, /delete this\.dataset\.libraryThumbRetries;/);
});
