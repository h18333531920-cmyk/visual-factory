const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dataRoot = '/Users/harvey/Documents/New project/mena-asset-platform/data';
const dbPath = path.join(dataRoot, 'platform.db');
const uploadRoot = path.join(dataRoot, 'uploads');
const previewRoot = path.join(dataRoot, 'previews');
const outputRoot = path.join(__dirname, '..', 'public', 'recovered', 'platform');
const filesRoot = path.join(outputRoot, 'files');
const maxPagesFileBytes = 24 * 1024 * 1024;

const extraFileCandidates = [
  '/Users/harvey/Downloads/iphone_02_en.psd'
];

const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp']);
const sourceExts = new Set(['psd', 'ai', 'pdf', 'eps']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value || '')
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'asset';
}

function fileExt(name) {
  return String(name || '').split('.').pop().toLowerCase();
}

function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function existingFile(...files) {
  return files.find(file => file && fs.existsSync(file)) || '';
}

function findExtraFile(row) {
  return extraFileCandidates.find(file => {
    if (!fs.existsSync(file)) return false;
    const base = path.basename(file);
    return base === row.file_name || base === row.stored_path;
  }) || '';
}

function publicCopy(sourceFile, outputName) {
  if (!sourceFile) return '';
  if (fileSize(sourceFile) > maxPagesFileBytes) return '';
  ensureDir(filesRoot);
  const targetName = safeName(outputName || path.basename(sourceFile));
  fs.copyFileSync(sourceFile, path.join(filesRoot, targetName));
  return `recovered/platform/files/${targetName}`;
}

function placeholderSvg(row, ext, exists) {
  const title = String(row.title || row.file_name || 'Recovered asset')
    .replace(/[<>&"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char]));
  const status = exists ? 'Recovered source file' : 'Source file missing';
  const accent = exists ? '#111827' : '#9f1239';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="#f7f7f5"/>
      <rect x="90" y="90" width="1020" height="720" rx="28" fill="#fff" stroke="#d0d5dd" stroke-width="3"/>
      <text x="150" y="260" fill="${accent}" font-family="Arial, sans-serif" font-size="96" font-weight="800">${ext.toUpperCase()}</text>
      <text x="150" y="390" fill="#101828" font-family="Arial, sans-serif" font-size="48" font-weight="700">${title}</text>
      <text x="150" y="490" fill="#667085" font-family="Arial, sans-serif" font-size="34">${status}</text>
      <text x="150" y="585" fill="#98a2b3" font-family="Arial, sans-serif" font-size="28">Recovered from previous platform records</text>
    </svg>
  `)}`;
}

function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  ensureDir(filesRoot);
  if (!fs.existsSync(dbPath)) {
    console.log('[platform-recovery] old platform database not found, skipping.');
    return;
  }

  const rows = JSON.parse(execFileSync('sqlite3', [
    '-json',
    dbPath,
    `select id,title,asset_type,file_name,stored_path,preview_path,file_size,mime_type,created_at,updated_at,is_deleted from assets order by id;`
  ], { encoding: 'utf8' }) || '[]');

  const options = [
    { id: 'recovered-old-platform', option_type: 'country', name_zh: '旧平台恢复', name_en: 'Recovered', sort_order: 10 },
    { id: 'recovered-uploaded', option_type: 'activity', name_zh: '历史上传', name_en: 'Previous Uploads', sort_order: 10 },
    { id: 'recovered-assets', option_type: 'category', name_zh: '恢复素材', name_en: 'Recovered Assets', sort_order: 10 }
  ];
  const sources = [];
  const previews = [];
  const previewUrls = {};

  rows.forEach(row => {
    const ext = fileExt(row.file_name || row.stored_path);
    const sourceFile = existingFile(
      path.join(uploadRoot, row.stored_path || ''),
      findExtraFile(row)
    );
    const previewFile = existingFile(
      row.preview_path ? path.join(previewRoot, row.preview_path) : '',
      imageExts.has(ext) ? sourceFile : ''
    );
    const kind = imageExts.has(ext) ? 'gallery' : 'source';
    const sourcePublicUrl = publicCopy(sourceFile, sourceFile ? `${row.id}-${path.basename(sourceFile)}` : '');
    const previewPublicUrl = previewFile
      ? publicCopy(previewFile, `${row.id}-preview-${path.basename(previewFile)}`)
      : placeholderSvg(row, ext || 'file', Boolean(sourceFile));
    const sourceId = `old-platform-${row.id}`;
    const previewId = `${sourceId}-preview`;
    const tags = [
      kind === 'gallery' ? 'vf:library:gallery' : 'vf:library:source',
      '旧平台恢复',
      row.asset_type || '',
      row.is_deleted ? '旧库标记已删除' : '',
      sourceFile ? '' : '源文件缺失',
      sourceFile && !sourcePublicUrl ? '文件过大未上线' : ''
    ].filter(Boolean);

    sources.push({
      id: sourceId,
      title: row.title || row.file_name || `Recovered ${row.id}`,
      country_id: 'recovered-old-platform',
      activity_id: 'recovered-uploaded',
      category_id: 'recovered-assets',
      tags,
      visibility: 'all',
      source_path: row.stored_path || '',
      source_public_url: sourcePublicUrl,
      source_missing: !sourceFile,
      source_too_large: Boolean(sourceFile && !sourcePublicUrl),
      source_filename: row.file_name || row.stored_path || '',
      source_mime_type: row.mime_type || '',
      source_size_bytes: sourceFile ? fileSize(sourceFile) : (row.file_size || 0),
      source_ext: ext || 'file',
      uploaded_by: 'old_platform_recovery',
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString()
    });

    previews.push({
      id: previewId,
      source_file_id: sourceId,
      preview_path: `old-platform-preview-${row.id}`,
      preview_filename: previewFile ? path.basename(previewFile) : `${row.id}-placeholder.svg`,
      preview_mime_type: previewFile ? row.mime_type || '' : 'image/svg+xml',
      preview_size_bytes: previewFile ? fileSize(previewFile) : 0,
      width: 0,
      height: 0,
      sort_order: 10,
      created_at: row.created_at || new Date().toISOString()
    });
    previewUrls[`old-platform-preview-${row.id}`] = previewPublicUrl;
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'mena-asset-platform SQLite recovery',
    totalSources: sources.length,
    options,
    sources,
    previews,
    previewUrls
  };
  fs.writeFileSync(path.join(outputRoot, 'index.json'), JSON.stringify(payload));
  console.log(`[platform-recovery] Generated ${sources.length} recovered platform assets.`);
}

main();
