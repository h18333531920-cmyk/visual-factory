import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('项目弹窗就地编辑保留固定标签编辑，并用数据库最新基底与 updated_at 防覆盖',()=>{
  const start=source.indexOf('function enterCaseHeadInlineEdit');
  const end=source.indexOf('let caseProjectKeyHandler',start);
  const body=source.slice(start,end);
  assert.match(body,/update\(\{\s*title: title,\s*owner_name:/);
  assert.match(body,/data-case-inline-tag-bar/);
  assert.match(body,/select\('tags,country_id,activity_id,updated_at'\)\.eq\('id', source\.id\)\.maybeSingle\(\)/);
  assert.match(body,/caseTagSelectionUpdatePayload\(base, chipSel\)/);
  assert.match(body,/tags: tagPayload\.tags/);
  assert.match(body,/\.eq\('updated_at', fresh\.data\.updated_at\)/);
  assert.match(body,/select\('id,title,owner_name,owner_contact,project_note,download_link,tags,country_id,activity_id,updated_at'\)\.maybeSingle\(\)/);
  assert.match(body,/Object\.assign\(source, result\.data\)/);
});

test('保存后使用最新源记录刷新当前弹窗，联系所有者也读取当前值',()=>{
  assert.match(source,/const refreshed = await refreshCaseProjectSource\(source\);/);
  assert.match(source,/if \(refreshed\) Object\.assign\(source, refreshed\);/);
  assert.match(source,/renderCaseProjectHeadInfo\(backdrop, source\)/);
  assert.match(source,/const currentOwner = String\(source\.owner_name \|\| ''\)\.trim\(\)/);
  assert.match(source,/const currentOwnerContact = String\(source\.owner_contact \|\| ''\)\.trim\(\)/);
});

// v937：进编辑态时只留编辑表单 —— 上面那一段项目信息、下面的舞台/素材、底栏都收起来。
// 用户口径：「项目展示界面的编辑信息，下面红框里的东西都不要显示出来」（截图里上下各框了一块）。
test('v937 编辑态：项目信息那一段 + 舞台/素材 + 底栏都收起来，退出编辑原样回来',()=>{
  const start = source.indexOf('function enterCaseHeadInlineEdit');
  const end = source.indexOf('let caseProjectKeyHandler', start);
  const body = source.slice(start, end);
  assert.match(body, /const editingChrome = function\(on\) \{\s*\n\s*if \(modal && modal\.classList\) modal\.classList\.toggle\('is-head-editing', on\);/, '进/退编辑态切一个 class');
  assert.match(body, /editingChrome\(true\);/, '进来就收起来');
  assert.match(body, /const exit = function\(\) \{[^}]*editingChrome\(false\);/, '「取消」要恢复');
  assert.match(body, /editingChrome\(false\);\s*\n\s*if \(onSaved\) onSaved\(result\.data\);/, '「保存」成功后也要恢复');
  // 收起哪些：头部信息块（标题/日期/链接/所有者/固定标签）、舞台+素材、底栏
  assert.match(source, /\.case-project-modal\.is-head-editing \.case-project-titlewrap,\s*\n\.case-project-modal\.is-head-editing \.case-project-body,\s*\n\.case-project-modal\.is-head-editing \.case-project-foot \{ display: none; \}/,
    '三块都只切 display（DOM 留着，视频/观察者不受影响）');
  // 编辑表单本身要挂在头部之后、并且是 is-active（老行为不能坏）
  assert.match(body, /modal\.insertBefore\(wrap, header\.nextSibling\)/);
  assert.match(body, /wrap\.classList\.add\('is-active'\)/);
});
