import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const aiSource = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');

test('v829 扩展词解析：认 JSON、兜底按行拆、去重、≤8 字、不回显搜索词', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['骑手', '摩托车', '国旗', '世界杯'];
  // 正常 JSON：v892 起「先找词表里的」——命中「骑手」就不再收词表外的 摩托/头盔/餐箱
  assert.deepEqual(ai.parseQueryExpansion('{"terms":["摩托","头盔","餐箱","骑手"]}', vocab, '外卖小哥'), ['骑手']);
  // 代码块包裹也能认
  assert.deepEqual(ai.parseQueryExpansion('```json\n{"terms":["摩托车"]}\n```', vocab, '骑手'), ['摩托车']);
  // 词表命中的原样返回；词表外自由词只在这轮一个词表命中都没有时才兜底
  assert.deepEqual(ai.parseQueryExpansion('{"terms":["骑手","Moto"]}', vocab, '送外卖的'), ['骑手']);
  // 不回显搜索词本身、去重、>8 字丢弃；这一轮没有词表命中，于是自由词兜底
  assert.deepEqual(ai.parseQueryExpansion('{"terms":["骑手","骑手","斋月开斋节促销活动","头盔"]}', vocab, '骑手'), ['头盔']);
  // 空输入/坏 JSON → 按行兜底或空数组
  assert.deepEqual(ai.parseQueryExpansion('', vocab, '骑手'), []);
  assert.deepEqual(ai.parseQueryExpansion('头盔 餐箱', vocab, '骑手'), ['头盔', '餐箱'], '非 JSON 文本按空白/标点兜底拆词');
  // 两层口径可分别取：known = 词表命中，fresh = 词表一个都没命中时才有的新词（≤3）
  const tiers = ai.parseQueryExpansionTiers('{"terms":["摩托车","火花塞","轮胎","化油器","链条"]}', vocab, '机车');
  assert.deepEqual(tiers.known, ['摩托车'], '第一层只收词表里的词');
  assert.deepEqual(tiers.fresh, [], '第一层有命中就不给新词');
  const freshOnly = ai.parseQueryExpansionTiers('{"terms":["火花塞","轮胎","化油器","链条"]}', vocab, '机车');
  assert.deepEqual(freshOnly.known, []);
  assert.deepEqual(freshOnly.fresh, ['火花塞', '轮胎', '化油器'], '第二层最多 3 个新词');
});

test('v845 中东业务桥：羊系词追加宰牲节/开斋节，菜品词保留，AI 空结果也兜底', async () => {
  const ai = await import('../functions/_ai.js');
  const festivalVocab = ['宰牲节', '开斋节', '世界杯', '优惠券'];
  // AI 返回菜品词（羊肉串/烤羊肉）：v892 起，确定性桥已经把词表里的节日词补上，
  // 这时就不再收词表外的菜品词（「先找现有的，没有符合的才造新的」）
  const out1 = ai.parseQueryExpansion('{"terms":["羊肉串","烤羊肉"]}', festivalVocab, '小羊');
  assert.deepEqual(out1, ['宰牲节', '开斋节'], '词表里有节日词时，自由菜品词让位');
  // AI 空结果时，搜索词本身也触发桥
  assert.deepEqual(ai.parseQueryExpansion('{"terms":[]}', festivalVocab, '小羊'), ['宰牲节', '开斋节']);
  // 词表里没有节日词时不凭空造词 → 这一轮没有词表命中，自由词兜底（≤3）
  assert.deepEqual(ai.parseQueryExpansion('{"terms":["羊肉串"]}', ['世界杯'], '小羊'), ['羊肉串']);
  assert.deepEqual(ai.parseQueryExpansion('{"terms":["羊肉串","烤羊肉","手抓饭","馕"]}', ['世界杯'], '小羊'), ['羊肉串', '烤羊肉', '手抓饭'], '兜底新词最多 3 个');
  // 双向：搜节日补节日族（开斋节→宰牲节）
  assert.ok(ai.parseQueryExpansion('{"terms":["羊"]}', festivalVocab, '开斋节').includes('宰牲节'));
  // 英文也触发
  assert.ok(ai.parseQueryExpansion('{"terms":["lamb"]}', festivalVocab, 'lamb').includes('宰牲节'));
  // 斋月 → 开斋节/宰牲节
  const outRamadan = ai.parseQueryExpansion('{"terms":["开斋节"]}', festivalVocab, '斋月');
  assert.ok(outRamadan.includes('开斋节') && outRamadan.includes('宰牲节'));
  // 提示词有中东业务规则 + 前端缓存键已升 v5（v856：v4 无英文翻译 termsEn）
  assert.match(aiSource, /搜「小羊」「羊」「羔羊」→ 羊肉串、烤羊肉这类相关词可以保留/, 'v845 中东追加式规则：菜品词保留 + 节日词必返回');
  assert.match(appSource, /vf_library_search_expansion_v7:/, 'v894 缓存键升 v7：v6 旧缓存存着「AI 新词」那一层，现在只留库内标签');
});

test('v829 后端接口：登录鉴权 + 走文本模型扩展 + 返回 terms', () => {
  const route = readFileSync(join(here, '..', 'functions', 'api', 'expand-query.js'), 'utf8');
  assert.match(route, /getUserFromToken\(env, getBearerToken\(request\)\)/, '要校验登录态');
  assert.match(route, /expandQueryWithGlm\(env, body\.query, body\.vocabulary\)/);
  assert.match(route, /terms/);
  const ai = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');
  assert.match(ai, /glm-4-flash/, '纯文本扩展走免费的 glm-4-flash，不占用识图通道');
  assert.match(ai, /联想词必须优先从词表里选/, 'v839 词表锚定：词表有相关词必须原样返回');
  assert.match(ai, /搜「红包」应优先返回「优惠券」「折扣」/, 'v839 锚定示例：红包→优惠券/折扣');
  assert.match(ai, /只返回搜索词指代事物的同义说法、画面主体或必要组成部分/, 'v833 收紧：只收主体/同义/组成部分');
  assert.match(ai, /不要返回同类并列的其他事物/, 'v833 收紧：排除薯条炸鸡这类并列词');
  assert.match(ai, /搜「世界杯」→ 足球/, '口径示例：概念到画面主体');
  assert.match(ai, /export async function expandQueryWithGlm/);
});

test('v829 前端：缓存自长、秩排序精确优先、开关持久化', () => {
  // 匹配秩：-1 不命中 / 0 精确 / 1 仅扩展
  assert.match(appSource, /function libraryItemQueryMatchRank\(item, query, expansionTerms\)/);
  assert.match(appSource, /return exact \? 0 : 1;/);
  // 精确命中的排前面（稳定排序，不打乱新图优先）
  assert.match(appSource, /queryRankById\.get\(a\.source\.id\) \|\| 0\) - \(queryRankById\.get\(b\.source\.id\) \|\| 0\)/);
  // 扩展词缓存：v833 起带 7 天 TTL，到期自动重新扩展；v894 键升 v7（只留库内标签那一层）
  assert.match(appSource, /vf_library_search_expansion_v7:/);
  assert.match(appSource, /LIBRARY_EXPANSION_CACHE_TTL_MS/);
  assert.match(appSource, /Date\.now\(\) - parsed\.ts > LIBRARY_EXPANSION_CACHE_TTL_MS/);
  assert.match(appSource, /function readLibraryExpansionCache/);
  assert.match(appSource, /writeLibraryExpansionCache\(q, kept, termsEn\)/);
  // v894：只剩「库内确实存在的标签」一层，匹配直接用它
  assert.match(appSource, /libraryItemQueryMatchRank\(item, state\.libraryFilters\.query, libraryExpansionTerms\)/);
  assert.doesNotMatch(appSource, /libraryExpansionMatchTerms/, '两层合并的辅助函数已删');
  assert.doesNotMatch(appSource, /libraryExpansionFresh/, 'AI 新词层已停用');
  // 过期请求作废：换搜索词后旧扩展不覆盖新结果
  assert.match(appSource, /if \(libraryExpansionRequestKey !== requestKey\) return;/);
  // 扩展词表带全：六类筛选 + 物料类型，让 AI 优先返回库内真实标签
  assert.match(appSource, /function librarySearchVocabulary\(\)/);
  assert.match(appSource, /materialCatalogTypeNames\(platform\)/);
  // 三处搜索入口都要触发扩展（输入防抖/回车/首页 hero 回车）
  assert.equal((appSource.match(/applyLibraryQueryExpansion\(state\.libraryFilters\.query\)/g) || []).length >= 3, true, '输入、回车、hero 三处都要接线');
  // 开关持久化 + 状态条提示
  assert.match(appSource, /vf_library_search_exact_only_v1/);
  // v841：开关改为搜索框右侧滑块（library-ai-switch），chips 里不再渲染旧按钮
  assert.match(appSource, /id="library-ai-switch"/);
  assert.match(appSource, /getElementById\('library-ai-switch'\)\?\.addEventListener\('change'/);
  // v842：控制条内联样式不得带 grid-template-columns（会压死 ≤1180px 的响应式堆叠，tabs 被挤成 0 宽）
  assert.doesNotMatch(appSource, /library-control-strip" style="[^"]*grid-template-columns/);
  // v843：筛选标签的 AI 扩展——维度候选值求交集 + 匹配助手 + 两个触发点
  assert.match(appSource, /vf_library_filter_expansion_v1:/);
  assert.match(appSource, /function libraryDimensionValues\(dim\)/);
  assert.match(appSource, /function librarySourceMatchesFilterValue\(dim, source, value\)/);
  assert.match(appSource, /function applyLibraryFilterExpansion\(\)/);
  // v844：只有活动主题/业务策略/元素三个语义维度做联想；国家（专名）、格式/数量（硬属性）、收藏不联想
  assert.match(appSource, /LIBRARY_FILTER_EXPANSION_DIMS = \['activity', 'strategy', 'element'\]/);
  // 六条筛选链都要走统一匹配助手（非联想维度的扩展词被硬性置空，只剩精确语义）
  assert.equal((appSource.match(/librarySourceMatchesFilterValue\('(country|activity|strategy|element|format|quantity)'/g) || []).length >= 6, true, '六个筛选维度都要走统一匹配助手');
  // 扩展词必须和维度候选值求交集，防止跨维度污染（国家筛选永远匹配不到足球标签）
  assert.match(appSource, /allowed\[t\.toLowerCase\(\)\]/);
  // 触发点：筛选点击后 + AI 开关切换时
  assert.match(appSource, /filterLibraryCardsInPlace\(\);\s*\n\s*applyLibraryFilterExpansion\(\)/);
  assert.match(appSource, /applyLibraryQueryExpansion\(state\.libraryFilters\.query\);\s*\n\s*applyLibraryFilterExpansion\(\)/);
  // v894：关联标签从「搜索框左侧 chips」搬进搜索框下方的浮窗（原「历史搜索」位置）
  assert.match(appSource, /id="search-history-dropdown" class="search-history-dropdown" hidden/);
  assert.match(appSource, /id="search-history-list"/);
  assert.doesNotMatch(appSource, /id="library-expansion-chips"/, '搜索框左侧那一排已经不要了');
  assert.match(appSource, /library-expansion-chip/);
  // 调扩展接口要带登录态
  assert.match(appSource, /fetch\('\/api\/expand-query'/);
});

test('v829 扩展匹配逻辑：关联词命中算命中，精确秩优先', () => {
  // 摘出匹配秩函数单独跑：搜索词原文命中 → 0；只靠扩展词 → 1；都不沾 → -1
  const start = appSource.indexOf('  // 匹配返回秩：-1 不命中；0 每个词都原文命中（精确）；1 靠扩展词才命中（排后面）');
  const end = appSource.indexOf('  function libraryItemMatchesQuery(item, query) {');
  assert.ok(start >= 0 && end > start, '匹配秩函数片段必须存在');
  const context = vm.createContext({});
  vm.runInContext(appSource.slice(start, end) + ';({ libraryItemQueryMatchRank })', context);
  const rank = vm.runInContext('libraryItemQueryMatchRank', context);
  const item = { source: { tags: ['骑手', '摩托'] }, preview: {} };
  const searchText = item => ['骑手', '摩托'].join(' ');
  // 直接替换 libraryItemSearchText：rank 函数引用外层的它，注入简化版
  vm.runInContext('var libraryItemSearchText = ' + searchText.toString() + ';', context);
  assert.equal(rank(item, '骑手', []), 0, '原文命中是精确');
  assert.equal(rank(item, '骑手', ['摩托']), 0, '原文命中优先于扩展');
  assert.equal(rank(item, '头盔', []), -1, '没扩展词就不命中');
  assert.equal(rank(item, '头盔', ['摩托']), 1, '靠扩展词命中排后面');
  assert.equal(rank(item, '骑手 头盔', ['摩托']), 1, '多词里任一词靠扩展也算命中，但非精确');
});

test('v831 复合词桥接词表：「汉堡店」自动补出词表里的「汉堡」', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['汉堡', '炸鸡', '可乐', '世界杯'];
  // AI 返回复合词「汉堡店」，库里标签是「汉堡」→ 桥接补出词表短词；v892 起自由词让位
  assert.deepEqual(
    ai.parseQueryExpansion('{"terms":["汉堡店","快餐"]}', vocab, '汉堡包'),
    ['汉堡'],
    '桥出词表词就不再收词表外的「汉堡店/快餐」'
  );
  // 精确等于词表的词不重复桥接
  assert.deepEqual(
    ai.parseQueryExpansion('{"terms":["汉堡","炸鸡"]}', vocab, '汉堡包'),
    ['汉堡', '炸鸡']
  );
  // 搜索词本身即使被桥接命中也不回显（搜「汉堡」时不会把「汉堡」当扩展词）→ 这一轮没有词表命中，自由词兜底
  assert.deepEqual(
    ai.parseQueryExpansion('{"terms":["汉堡店"]}', vocab, '汉堡'),
    ['汉堡店'],
    '桥接不回显搜索词本身'
  );
  // 单字词表词不做桥接，避免复合词桥出单字噪音：「咖啡杯垫」桥出「杯垫」，不桥出「杯」
  assert.deepEqual(
    ai.parseQueryExpansion('{"terms":["咖啡杯垫"]}', ['杯', '杯垫', '托盘'], '咖啡'),
    ['杯垫'],
    '长度 <2 的词表词不参与桥接，但 2 字词正常桥接'
  );
});

test('v832 前端词表：物料真实元素标签并入，桥接可命中真实标签', () => {
  assert.match(appSource, /v832：物料身上真实存在的元素\/活动标签也进词表/);
  assert.match(appSource, /visibleLibrarySourcesForSession\(\)\.forEach\(function\(source\) \{\s*visibleLibraryTags\(source\)\.forEach\(function\(tag\) \{/);
  const v = appSource.match(/TOOL_UI_VERSION = '\S+-v(\d+)'/)?.[1] || '0';
  assert.ok(Number(v) >= 832, `TOOL_UI_VERSION 不应回退到 v832 之前，当前 v${v}`);
});

test('v834 状态条可见：index.html 不得再用 display:none 隐藏 #library-status', () => {
  const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
  // 徽章、命中数、扩展开关全在状态条里；曾因内联 display:none !important 导致功能"看不见"
  assert.doesNotMatch(html, /#library-status\s*\{[^}]*display:\s*none/);
  const v = appSource.match(/TOOL_UI_VERSION = '\S+-v(\d+)'/)?.[1] || '0';
});

test('v837 加载态：AI 请求期间搜索框左侧显示「AI 联想中…」转圈提示', () => {
  assert.match(appSource, /libraryExpansionPendingQuery/, '要有请求中的查询状态');
  assert.match(appSource, /AI 联想中…/);
  assert.match(appSource, /library-expansion-spinner/);
  // 状态变化（发出/返回/失败/换词）都要重渲染 chips
  assert.equal((appSource.match(/renderLibraryExpansionChips\(\);/g) || []).length >= 6, true, '发出+缓存+空词+成功+失败+renderLibraryGrid 至少 6 处调用');
  // 请求作废时不误清新请求的 pending 状态
  assert.match(appSource, /catch\(function\(\) \{\s*\n\s*if \(libraryExpansionRequestKey !== requestKey\) return;/);
  const css = readFileSync(join(here, '..', 'styles.css'), 'utf8');
  assert.match(css, /library-expansion-spin/);
// 发起新请求时必须清空旧词条，否则 pending 态被旧词条遮蔽（线上验证发现）
assert.match(appSource, /libraryExpansionTerms = \[\];[^\n]*\n\s*libraryExpansionPendingQuery = q;/);
});

test('v839 词表锚定 + 语素兜底桥接 + chips 按钮防遮挡', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['优惠券', '折扣', '骑手', '门票'];
  // AI 无视词表返回了库里不存在的复合词「红包礼券」→ 尾部同字（券/票/卡）兜底桥接出词表同族词
  const out = ai.parseQueryExpansion('{"terms":["红包礼券","促销海报"]}', vocab, '红包');
  assert.deepEqual(out, ['优惠券'], '桥出词表词后，词表外的「红包礼券/促销海报」让位');
  assert.ok(!out.includes('骑手') && !out.includes('折扣'), '尾字不在族表（海报）不乱桥接');
  // 票族尾字桥接：AI 返回库里不存在的「电影票」→ 兜底桥接出词表里的门票
  const out2 = ai.parseQueryExpansion('{"terms":["电影票"]}', vocab, '票根');
  assert.ok(out2.includes('门票'), '票族尾字桥接到门票');
  // v894：浮窗里的关联标签用 search-history-items 排布，标签本身仍走 library-expansion-chip 样式
  assert.match(appSource, /class="search-history-items"/, '浮窗里一排标签');
  assert.match(appSource, /class="library-expansion-chip is-clickable" data-library-expansion-term=/, '标签可点（点一下改成只搜它）');
  const css = readFileSync(join(here, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.search-history-items \{\s*\n\s*align-items: center;/);
  assert.match(css, /\.library-expansion-chip\.is-clickable \{/);
});

test('v840 词表去虚词 + 英文搜索规则', () => {
  // 前端：物料类型只收“库内实际在用”的，静态目录预设类型不再误导 AI
  assert.match(appSource, /usedTypes\[t\] = true;/);
  assert.match(appSource, /if \(name && usedTypes\[name\] && vocab\.indexOf\(name\) < 0\) vocab\.push\(name\);/);
  // 后端：英文/拼音搜索词先翻译成中文（优先词表）
  assert.match(aiSource, /搜索词是英文、拼音或其他外语时，先返回它的中文说法/);
  assert.match(aiSource, /搜「coupon」→ 优惠券、折扣/);
});

test('v856 英文模式：AI 联想词逐词带英文翻译，配不上的走前端词表兑底', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['汉堡', '优惠券', '世界杯'];
  // terms_en 与 terms 逐词配对成 中文→英文 映射
  const out = ai.parseQueryExpansionI18n(
    '{"terms":["汉堡包","汉堡店","优惠券"],"terms_en":["Burger","Burger Shop","Coupon"]}',
    vocab, '汉堡包'
  );
  assert.deepEqual(out.terms, ['汉堡', '优惠券'], 'v892：桥出词表词就不再收词表外的（搜索词本身不回显，汉堡店桥出汉堡）');
  assert.deepEqual(out.fresh, [], '第一层有命中就没有新词层');
  assert.equal(out.translations['汉堡包'], 'Burger');
  assert.equal(out.translations['汉堡店'], 'Burger Shop');
  assert.equal(out.translations['汉堡'], undefined, '桥接补出的词表词 AI 没翻，留给前端词表兑底');
  assert.equal(out.translations['优惠券'], 'Coupon');
  // terms_en 缺省/长度不齐时不炸，翻译映射为空；这一轮没有词表命中 → 落在 fresh 层
  const out2 = ai.parseQueryExpansionI18n('{"terms":["摩托","头盔"]}', vocab, '骑手');
  assert.deepEqual(out2.terms, []);
  assert.deepEqual(out2.fresh, ['摩托', '头盔']);
  assert.deepEqual(Array.from(out2.translations), []);
  assert.deepEqual(out2.translations, {});
  // 前后端接线：提示词要求输出 terms_en；端点透传 termsEn；前端有展示函数与三处存取
  assert.match(aiSource, /terms_en 和 terms 逐词一一对应/);
  assert.match(aiSource, /export function parseQueryExpansionI18n/);
  const route = readFileSync(join(here, '..', 'functions', 'api', 'expand-query.js'), 'utf8');
  assert.match(route, /termsEn: termsEn/, '端点要透传英文映射');
  assert.match(appSource, /function libraryChipDisplayLabel\(term\)/);
  assert.match(appSource, /return libraryExpansionTermsEn\[key\] \|\| libraryDisplayLabel\(term\);/, '英文显示：AI 翻译优先，词表兑底');
  assert.match(appSource, /const termsEn = data && data\.termsEn && typeof data\.termsEn === 'object' \? data\.termsEn : \{\};/);
  assert.match(appSource, /termsEn: termsEn \|\| \{\}/, '缓存要连英文映射一起存');
});

test('v856 手动刷新：词条区尾部刷新按钮，追加不覆盖，优先匹配库内标签不变', () => {
  // 刷新按钮渲染在 chips 尾部（搜索框左侧），busy 态转圈
  assert.match(appSource, /id="library-expansion-refresh"/);
  assert.match(appSource, /class="library-expansion-refresh' \+ \(libraryExpansionRefreshing \? ' is-busy' : ''\) \+ '"/);
  // 刷新期间不清空已有词条（只有换新搜索词才清空）
  assert.match(appSource, /function refreshLibraryExpansionTerms\(\)/);
  assert.match(appSource, /libraryExpansionRefreshing = true;/);
  const fnStart = appSource.indexOf('function refreshLibraryExpansionTerms');
  const fnEnd = appSource.indexOf('// 匹配返回秩：-1 不命中', fnStart);
  const fn = appSource.slice(fnStart, fnEnd);
  assert.ok(!/libraryExpansionTerms = \[\];/.test(fn), '刷新函数内不得清空已有词条');
  // 追加合并：新词去重后 push 到已有词条后面，总上限 12（v894：只收库内确实存在的标签）
  assert.match(fn, /const merged = libraryExpansionTerms\.slice\(\);/);
  assert.match(fn, /if \(!key \|\| merged\.length >= 12\) return;/);
  assert.match(fn, /merged\.some\(function\(existing\) \{ return normKey\(existing\) === key; \}\)/);
  assert.match(fn, /if \(libraryExpansionIsLibraryTerm\(term\) === false\) return;/);
  assert.match(fn, /writeLibraryExpansionCache\(q, merged, libraryExpansionTermsEn\);/, '合并结果写回缓存');
  // 匹配优先库内标签：请求仍带全量词表（服务端词表锚定规则不变）
  assert.match(fn, /vocabulary: librarySearchVocabulary\(\)/);
  // 按钮随浮窗内容重建，用一次性事件委托绑定
  assert.match(appSource, /__vfLibraryExpansionRefreshBound/);
  assert.match(appSource, /target\.closest\('#library-expansion-refresh'\)/);
  // v857：刷新没挤出任何新词时弹轻提示（词库收敛或达 12 上限），避免误以为按钮失灵
  assert.match(appSource, /AI 暂时没有更多新联想词了/);
  assert.match(appSource, /if \(merged\.length === beforeCount\) \{\s*\n\s*showCaseToast\(state\.lang === 'zh' \? 'AI 暂时没有更多新联想词了' : 'AI has no new related terms for now'\);/);
  const css = readFileSync(join(here, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.library-expansion-refresh/);
  assert.match(css, /\.library-expansion-refresh\.is-busy svg \{\s*\nanimation: library-expansion-spin/);
});
