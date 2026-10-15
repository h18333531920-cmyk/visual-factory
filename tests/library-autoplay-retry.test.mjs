// 循环视频封面卡首帧（v748）：视频滚进视口时如果内存里没有签名地址
// （签名超 50 分钟被清理/该批没签过），旧逻辑静默放弃，封面永远停在静态首帧。
// 现在必须当场补签一次再播，且用 dataset 守卫防止无限循环。
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

test('地址缺失时当场补签并重试播放，且有防循环守卫', () => {
  const body = fnBody('playAutoplayVideo');
  assert.match(body, /resolveAutoplayVideoSources\(video\)/, '仍要先尝试现有地址');
  assert.match(body, /autoplaySignQueued/, '必须用 dataset 守卫防止无限补签');
  assert.match(body, /signLibraryPreviewUrls\(paths\)/, '地址缺失时必须主动补签');
  assert.match(body, /data-autoplay-poster-path/, '补签要带上 poster 路径');
  assert.match(body, /\.catch\(function\(\) \{ \/\* 补签失败/, '补签失败不允许未捕获异常');
});

test('补签守卫不得阻断正常播放路径', () => {
  const body = fnBody('playAutoplayVideo');
  const guardPos = body.indexOf('autoplaySignQueued');
  const resolvePos = body.indexOf('resolveAutoplayVideoSources(video)');
  assert.ok(resolvePos >= 0 && guardPos > resolvePos, '守卫必须在校验地址之后，不能挡住已有地址的播放');
});

test('视频首帧亮出时必须撤掉壳子占位（img 挂了也不能露出灰底）', () => {
  const here2 = dirname(fileURLToPath(import.meta.url));
  const styles = readFileSync(join(here2, '..', 'styles.css'), 'utf8');
  const body = fnBody('revealAutoplayVideo');
  assert.match(body, /is-preview-ready/, '视频亮出时壳子必须标记 ready');
  assert.match(body, /is-preview-loading/, '同时移除 loading 态');
  const shellStart = styles.indexOf('.library-preview-shell::before');
  const shellBlock = styles.slice(shellStart, shellStart + 400);
  assert.doesNotMatch(shellBlock, /linear-gradient|shimmer|sweep/, '占位底必须是纯色，不允许斜纹渐变或动画');
});
