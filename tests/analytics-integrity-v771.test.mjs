import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const context = vm.createContext({console, Date, Set, state:{lang:'zh'}});
vm.runInContext(source.slice(source.indexOf('  function analyticsAccountKey'), source.indexOf('  async function fetchAnalyticsAccounts')), context);
test('analytics paginates beyond 5000 rows even when server caps pages at 100', async () => {
 const rows = Array.from({length: 5101}, (_, id) => ({id}));
 const result = await context.fetchAnalyticsRows(() => ({range: async (offset) => ({data: rows.slice(offset, offset + 100), count: rows.length})}));
 assert.equal(result.data.length, 5101);
 assert.equal(new Set(result.data.map(r => r.id)).size, 5101);
});
test('analytics rejects partial reads instead of reporting false zero or incomplete totals', async () => {
 await assert.rejects(context.fetchAnalyticsRows(() => ({range: async () => ({error: new Error('offline')})})), /offline/);
 await assert.rejects(context.fetchAnalyticsRows(() => ({range: async () => ({data: [], count: 12})})), /incomplete/);
});
test('same-name accounts stay distinct; renames and null historical roles resolve from directory', () => {
 const accounts = {abc: {displayName:'同事',role:'operator'}, xyz: {displayName:'同事',role:'admin'}};
 assert.notEqual(context.analyticsAccountKey({actor_id:'abc'}), context.analyticsAccountKey({actor_id:'xyz'}));
 assert.equal(context.analyticsAccountName({actor_id:'abc',meta:{account_label:'旧名字'}}, accounts), '同事');
 assert.equal(context.analyticsIsAdmin({actor_id:'xyz',actor_role:null}, accounts), true);
 assert.equal(context.analyticsIsAdmin({actor_id:'abc',actor_role:'admin'}, accounts), false);
 assert.equal(context.analyticsAccountName({actor_id:'1234567890'}, {}), '账号 12345678');
});
test('daily buckets use local calendar days at midnight, including DST boundaries', () => {
 const old = process.env.TZ;
 try {
  process.env.TZ = 'Asia/Shanghai';
  assert.equal(context.analyticsDateKey('2026-09-22T16:30:00Z'), '2026-09-23');
  assert.equal(context.analyticsDayIndex('2026-09-22T16:30:00Z', new Date('2026-09-23T00:00:00+08:00')), 0);
  process.env.TZ = 'America/New_York';
  assert.equal(context.analyticsDayIndex('2026-03-09T12:00:00-04:00', new Date('2026-03-07T00:00:00-05:00')), 2);
 } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test('case ZIP records one download only after successful packaging; failures do not count', async () => {
 const events = [], downloads = [];
 const c = vm.createContext({state:{libraryPreviewUrls:{'path/a':'https://example.invalid/a','path/b':'https://example.invalid/b'}}, caseMaterialsOf:()=>[{preview_path:'path/a',preview_filename:'a.png'},{preview_path:'path/b',preview_filename:'b.png'}], signVisibleLibraryUrls:async()=>{}, fileExt:()=> 'png', fetch:async()=>({ok:true,blob:async()=>({arrayBuffer:async()=>new ArrayBuffer(2)})}), buildZip:async(entries)=>entries, triggerBlobDownload:blob=>downloads.push(blob), logAssetEvent:async(...args)=>events.push(args)});
 vm.runInContext(source.slice(source.indexOf('  async function downloadAllCaseMaterials('),source.indexOf('  async function uploadCaseAppendPreviews(')), c);
 await c.downloadAllCaseMaterials({id:'case-id',title:'test'});
 assert.equal(downloads.length,1); assert.equal(events.length,1); assert.equal(events[0][0],'batch_download'); assert.equal(events[0][2].material_count,2);
 c.fetch=async()=>({ok:false});
 await assert.rejects(c.downloadAllCaseMaterials({id:'case-id'}));
 assert.equal(events.length,1);
});
