// AI 元素识别（v759）：上传时用 GLM-4V-Flash 认画面元素，产出「元素」标签建议，
// 用户点一下才采纳（不自动写入）。这里锁住解析容错、词表归一与长度/条数上限。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { parseElementSuggestions, parseCaseTagSuggestions, ELEMENT_TAG_MAX_CHARS, ELEMENT_TAG_MAX_COUNT } from '../functions/_ai.js';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const aiSource = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');
const VOCAB = ['银行卡', '券', 'kiki', '骑手', '国旗', '手机', '耳机', 'PS5'];

test('解析标准 JSON 输出', () => {
  const out = parseElementSuggestions('{"elements":["汉堡","摩托","帽子"]}', VOCAB);
  assert.deepEqual(out, ['汉堡', '摩托', '帽子']);
});

test('容错：代码块 / 前后废话 / 数组直出 / 纯文本列表', () => {
  assert.deepEqual(parseElementSuggestions('```json\n{"elements":["汉堡"]}\n```', VOCAB), ['汉堡']);
  assert.deepEqual(parseElementSuggestions('好的，我看到了：{"elements":["摩托"]} 就这样。', VOCAB), ['摩托']);
  assert.deepEqual(parseElementSuggestions('["汉堡","薯条"]', VOCAB), ['汉堡', '薯条']);
  assert.deepEqual(parseElementSuggestions('汉堡\n摩托、帽子', VOCAB), ['汉堡', '摩托', '帽子']);
});

test('约束：>5 字丢弃、去重、最多 8 条、去括号补充', () => {
  const long = parseElementSuggestions('{"elements":["这是一个很长的描述词"]}', VOCAB);
  assert.deepEqual(long, [], '超过 5 字的词条必须丢弃');
  const dedup = parseElementSuggestions('{"elements":["汉堡","汉堡","薯条"]}', VOCAB);
  assert.deepEqual(dedup, ['汉堡', '薯条']);
  const many = parseElementSuggestions(JSON.stringify({ elements: Array.from({ length: 20 }, (_, i) => '词' + i) }), VOCAB);
  assert.equal(many.length, ELEMENT_TAG_MAX_COUNT);
  assert.deepEqual(parseElementSuggestions('{"elements":["汉堡(食物)"]}', VOCAB), ['汉堡']);
  assert.equal(ELEMENT_TAG_MAX_CHARS, 5);
});

test('词表归一：命中现有元素词表时用词表写法（避免同义词分裂）', () => {
  assert.deepEqual(parseElementSuggestions('{"elements":["手机壳"]}', VOCAB), ['手机']);
  assert.deepEqual(parseElementSuggestions('{"elements":["汉堡"]}', VOCAB), ['汉堡'], '词表外的新词照常保留');
});

test('v902 词表写法归一不区分大小写／空格，且返回词表自己的写法', () => {
  const vocab = ['kiki', 'PS5', '薯条', '条'];
  assert.deepEqual(parseElementSuggestions('{"elements":["KIKI"]}', vocab), ['kiki'], 'AI 回大写也要归到库内的写法 kiki');
  assert.deepEqual(parseElementSuggestions('{"elements":["ps5"]}', vocab), ['PS5']);
  assert.deepEqual(parseElementSuggestions('{"elements":["PS5"]}', ['PS 5']), ['PS 5'], '词表写法带空格也能命中');
  assert.deepEqual(parseElementSuggestions('{"elements":["炸薯条"]}', vocab), ['薯条'], '命中多个时取最长的那个');
  assert.deepEqual(parseElementSuggestions('{"elements":["KIKI","kiki"]}', vocab), ['kiki'], '归一后要去重');
  assert.deepEqual(parseElementSuggestions('{"elements":["Sushi"]}', vocab), ['Sushi'], '词表里确实没有的照常保留');
});

test('Keeta 老虎吉祥物统一归一为 kiki，普通老虎不误改', () => {
  assert.deepEqual(parseElementSuggestions('{"elements":["卡通老虎","老虎吉祥物","黄色老虎","kiki"]}', VOCAB), ['kiki']);
  assert.deepEqual(parseElementSuggestions('{"elements":["老虎"]}', VOCAB), ['老虎']);
  assert.deepEqual(parseElementSuggestions('{"elements":["卡通老虎"]}', VOCAB.filter(word => word !== 'kiki')), ['卡通老虎']);
});

test('v828 活动主题自由识别：不再限词表、限 8 字，并从元素建议中去重', () => {
  const activities = ['聚餐','足球','夏日','新年','开斋节','宰牲节','国庆节'];
  assert.deepEqual(parseCaseTagSuggestions('{"elements":["足球","球员"],"activity":"足球"}', VOCAB, activities), { elements: ['球员'], activity: '足球' });
  // 词表外的主题也原样带出（前端作为建议 chip，点采纳才写入）
  assert.deepEqual(parseCaseTagSuggestions('{"elements":["灯笼"],"activity":"圣诞节"}', VOCAB, activities), { elements: ['灯笼'], activity: '圣诞节' });
  assert.deepEqual(parseCaseTagSuggestions('{"elements":["餐桌"],"activity":""}', VOCAB, activities), { elements: ['餐桌'], activity: '' });
  // 超长主题截到 8 字
  assert.deepEqual(parseCaseTagSuggestions('{"elements":[],"activity":"斋月开斋节促销活动"}', VOCAB, activities).activity, '斋月开斋节促销活');
});

test('前端：AI 建议只在点采纳后才进元素标签，且只建议图片', () => {
  assert.match(appSource, /data-case-tag-ai-value/, '要有可点击的 AI 建议 chip');
  const accept = appSource.slice(appSource.indexOf('采纳 AI 建议的元素'), appSource.indexOf('// 点浮窗外关闭；已选内容保留在气泡条上'));
  assert.match(accept, /caseTagSelToggle\(root\._caseTagSel, 'element', value\)/, '点采纳才写入元素选择');
  assert.match(appSource, /fetch\('\/api\/analyze-elements'/, '前端要调用元素识别接口');
  assert.match(appSource, /Authorization: 'Bearer ' \+ token/, '接口要带登录态');
  assert.match(appSource, /vocabulary: caseElementVocabulary\(\)/, '要把现有元素词表（含库内在用标签）带给模型');
  assert.match(appSource, /activities: FILTER_SECTIONS_CONFIG\.activity\.values/, '把活动词表一并带给模型（提示词参考用，不再强制限词表）');
  const trigger = appSource.slice(appSource.indexOf('多图时优先让 AI 识别开屏'), appSource.indexOf('// 图库预览：与案例库同一套卡片'));
  assert.match(trigger, /\^image\\\//, '只有图片才识别（视频跳过）');
  assert.match(trigger, /dataset\.aiElementKey === aiKey/, '同一优先图只识别一次');
  assert.match(trigger, /selectCaseElementSuggestionFile\(aiImages\)/, '多图要先选择开屏再识别');
  assert.match(trigger, /dataset\.aiElementBatchKey !== batchKey/, '异步选图完成前若文件批次改变，旧结果必须失效');
  assert.match(appSource, /dataset\.aiElementKey !== requestKey/, '新优先图开始识别后，旧请求不得覆盖建议');
  assert.match(appSource, /1024 \/ Math\.max/, '上传前缩到长边 1024 再识别（太小会漏小物体）');
});

test('多图 AI 识别优先开屏：清单里的开屏类别 > 第一张图片，视频跳过', async () => {
  const body = appSource.slice(appSource.indexOf('  async function selectCaseElementSuggestionFile('), appSource.indexOf('  function clearCaseElementSuggestions('));
  const dimensions = new Map([
    ['first.jpg', { width: 1372, height: 416 }],
    ['portrait.jpg', { width: 1000, height: 2168 }],
    ['popup.jpg', { width: 654, height: 941 }]
  ]);
  let reads = 0;
  const context = {
    isCaseVideoFile: file => file.type === 'video/mp4',
    readImageDimensions: async file => { reads++; return dimensions.get(file.name); },
    refreshMaterialCatalogForCases: async () => {},
    uploadCasePlatform: () => 'C端',
    caseSplashTypeName: () => '开机海报',
    detectCaseMaterialType: (name, width, height, platform) => platform === 'C端' && width / height <= .50 && width >= 700 ? '开机海报' : '弹窗'
  };
  vm.createContext(context); vm.runInContext(body, context);
  const image = name => ({ name, type: 'image/jpeg' });
  const video = { name: '开屏.mp4', type: 'video/mp4' };
  assert.equal((await context.selectCaseElementSuggestionFile([image('first.jpg'), image('portrait.jpg')])).name, 'portrait.jpg');
  assert.equal((await context.selectCaseElementSuggestionFile([image('first.jpg'), image('活动-Splash.png'), image('portrait.jpg')])).name, 'portrait.jpg');
  assert.equal((await context.selectCaseElementSuggestionFile([video, image('first.jpg'), image('popup.jpg')])).name, 'first.jpg');
  assert.equal(await context.selectCaseElementSuggestionFile([video]), null);
  assert.ok(reads >= 2, '按清单识别开屏类别，需要读取尺寸');
});

test('提示词口径：文字不当元素但可用于主题、要求列满、上限 12 条', () => {
  const src = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');
  // v826b：文字（节日祝福语等）不再一刀切禁止——主题判断要用；但仍不得把文字当元素输出
  assert.match(src, /不要把图片里的文字当成元素输出/, '必须禁止把文字当元素');
  assert.match(src, /判断活动主题时可以用上文字信息/, '主题判断允许参考文字（斋月/世界杯等主题常写在祝福语里）');
  assert.match(src, /标语、价格、水印、LOGO 仍然忽略/, '标语价格水印依旧忽略');
  assert.match(src, /动物、人物、角色或吉祥物、餐具与道具、餐桌桌面、背景场景/, '要覆盖动物/角色/道具/场景');
  assert.match(src, /尽量列满/, '要求尽量列满而不是只给几个');
  assert.match(src, /必须标为 kiki/, 'Keeta 黄色老虎吉祥物必须使用标准词 kiki');
  assert.equal(ELEMENT_TAG_MAX_COUNT, 12);
});

test('视觉接口保留 data URL 前缀发送给 image_url，同时按纯 base64 长度校验', () => {
  assert.match(aiSource, /const raw = String\(imageBase64 \|\| ''\)/);
  assert.match(aiSource, /const base64 = raw\.replace\(\/\^data:image/);
  assert.match(aiSource, /image_url: \{ url: raw \}/);
});


test('图库品类识别：只认词表里的值，判断不出返回空（不猜、不造新词）', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['汉堡', '披萨', '炸物', '健康餐', 'keeta logo', '商家logo'];
  assert.equal(ai.parseGalleryTagSuggestion('{"tag":"汉堡"}', vocab), '汉堡');
  assert.equal(ai.parseGalleryTagSuggestion('```json\n{"tag":"炸物"}\n```', vocab), '炸物');
  assert.equal(ai.parseGalleryTagSuggestion('商家 logo', vocab), '商家logo', '容空格差异');
  assert.equal(ai.parseGalleryTagSuggestion('{"tag":""}', vocab), '', '判断不出＝空');
  assert.equal(ai.parseGalleryTagSuggestion('{"tag":"未分类"}', vocab), '');
  assert.equal(ai.parseGalleryTagSuggestion('{"tag":"寿司"}', vocab), '', '词表外不采用');
  assert.equal(ai.parseGalleryTagSuggestion('画面里是一份沙拉，推断为健康餐', vocab), '健康餐', '整句里带出词表词也认');
  assert.equal(ai.parseGalleryTagSuggestion('', vocab), '');
});

test('图库品类识别：接口是登录态 + 词表约束的最小接口', async () => {
  const src = readFileSync(join(here, '..', 'functions', 'api', 'analyze-gallery-tag.js'), 'utf8');
  assert.match(src, /getUserFromToken/, '必须校验登录态');
  assert.match(src, /analyzeGalleryTagWithGlm/, '复用 GLM 通道');
  assert.match(src, /body\.vocabulary/, '词表由前端传（保证只选现有品类）');
  assert.doesNotMatch(src, /console\.log/, '不打印内容');
  const ai = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');
  assert.match(ai, /GLM_API_KEY/, '密钥只在服务端环境变量');
  assert.match(ai, /不确定\|none\|unknown|无法判断/, '提示模型判断不出就返回空');
});
