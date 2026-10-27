import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('  async function uploadLibraryAsset(event) {');
const end = app.indexOf('\n  // 限制并发的工作队列', start);
assert.ok(start > 0 && end > start);
const uploadSource = app.slice(start, end);

test('gallery upload failure shows the original error and restores the button', async () => {
  const message = {innerHTML: '', textContent: ''};
  const button = {textContent: '上传入库', disabled: false, dataset: {}};
  const form = {querySelector: () => button};
  const shown = [];
  const context = {
    state: {lang: 'zh', libraryFilters: {}},
    document: {getElementById: () => message},
    FormData: class {get(key) {return key === 'library_kind' ? 'gallery' : null;}},
    canUploadAssets: () => true,
    uploadGalleryAssets: async () => {throw new Error('图片上传超时');},
    cleanupFailedLibraryUpload: async () => {},
    setMessage: (_node, value, error) => shown.push({value, error}),
    LIBRARY_UPLOAD_CANCELLED: 'vf:upload-cancelled',
    LIBRARY_BUCKET: 'vf-library',
  };
  const upload = runInNewContext(`let libraryUploadRun = null;\n${uploadSource}\nuploadLibraryAsset`, context);
  await upload({preventDefault() {}, currentTarget: form, submitter: button});
  assert.deepEqual(shown, [{value: '图片上传超时', error: true}]);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '上传入库');
});

test('large gallery file failure names the file and does not leave a pending timer', async () => {
  const begin = app.indexOf('  function galleryUploadConcurrency(');
  const finish = app.indexOf('\n  async function cleanupGalleryUpload', begin);
  const source = app.slice(begin, finish);
  const file = {name: 'Margherita Pizza.jpg', size: 4_372_836, type: 'image/jpeg'};
  const context = {
    state: {lang: 'zh', session: {user: {id: 'test-user'}}},
    validateGalleryUpload() {},
    mapWithConcurrency: async (files, _limit, worker) => {await worker(files[0]);},
    cleanupGalleryUpload: async () => {},
    safeStorageName: name => name,
    LIBRARY_UPLOAD_CANCELLED: 'vf:upload-cancelled',
    LIBRARY_BUCKET: 'vf-library',
    crypto: {randomUUID: () => 'test-id'},
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  context.state.supabase = {storage: {from: () => ({upload: async () => {throw new Error('网络中断');}})}};
  const upload = runInNewContext(source + '\nuploadGalleryAssets', context);
  await assert.rejects(
    upload({getAll: () => [file], get: () => ''}, () => {}, {cancelled: false}),
    /Margherita Pizza\.jpg.*网络中断/
  );
});
