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
