// 使用者名单的纯逻辑测试（v666）。
// app.js 是个 IIFE、没有导出，沿用 tests/static-template-loading.test.mjs 的做法：
// 按注释标记切出一段代码，放进 vm 里跑。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

const START = '// ── 使用者名单（v666）开始 ──';
const END = '// ── 使用者名单（v666）结束 ──';

// vm 里造出来的对象原型跟主 realm 不同，deepStrictEqual 会因此失败，先转成普通对象再比
const plain = (value) => JSON.parse(JSON.stringify(value));

function loadRosterModule(sandbox = {}) {
  const start = appSource.indexOf(START);
  const end = appSource.indexOf(END);
  assert.ok(start >= 0 && end > start, '使用者名单区块的起止标记必须存在（代码挪动时请同步更新标记）');
  const slice = appSource.slice(start, end);
  // teamMembersCache 是切片自己声明的 let，外层塞不进去，所以额外导出一个 setter
  const expose = `
;({
  normalizeTeamMember, filterTeamMemberOptions, teamMemberOptions, resolveTeamMemberDaxiang, isTeamTableMissingError,
  setTeamMembers: function(list) { teamMembersCache = list; },
  isTableReady: function() { return teamMembersTableReady; }
})`;
  const context = vm.createContext({
    localStorage: { getItem: () => null, setItem: () => {} },
    state: { supabase: null },
    recentCaseOwnerNames: () => [],
    ...sandbox
  });
  const mod = vm.runInContext(slice + expose, context);
  if (sandbox.teamMembersCache) mod.setTeamMembers(sandbox.teamMembersCache);
  return mod;
}

test('normalizeTeamMember：中英文名分开、去空格、兼容旧的单 name 字段', () => {
  const mod = loadRosterModule();
  assert.deepEqual(
    plain(mod.normalizeTeamMember({ id: 7, name_zh: '  王新泽 ', name_en: ' Wang Xinze ', daxiang_id: ' wb_wangxinze02 ' })),
    { id: '7', name_zh: '王新泽', name_en: 'Wang Xinze', daxiang_id: 'wb_wangxinze02' }
  );
  assert.deepEqual(
    plain(mod.normalizeTeamMember({ name_en: 'Alice', daxiangId: 'wb_alice' })),
    { id: '', name_zh: '', name_en: 'Alice', daxiang_id: 'wb_alice' }
  );
  // 早期本机缓存里只有 name
  assert.deepEqual(
    plain(mod.normalizeTeamMember({ name: '王新泽' })),
    { id: '', name_zh: '王新泽', name_en: '', daxiang_id: '' }
  );
  assert.deepEqual(plain(mod.normalizeTeamMember(null)), { id: '', name_zh: '', name_en: '', daxiang_id: '' });
});

test('缺表报错要能识别（PostgREST 缺表 / 缺关系都算，普通报错不算）', () => {
  const mod = loadRosterModule();
  assert.equal(mod.isTeamTableMissingError({ message: "Could not find the table 'public.vf_team_members' in the schema cache" }), true);
  assert.equal(mod.isTeamTableMissingError({ message: 'relation "vf_team_members" does not exist' }), true);
  assert.equal(mod.isTeamTableMissingError({ message: 'permission denied for table vf_team_members' }), false);
  assert.equal(mod.isTeamTableMissingError(null), false);
});

test('联想候选：名单在前（带大象编号），历史姓名补在后且不重复', () => {
  const mod = loadRosterModule({
    teamMembersCache: [
      { id: '1', name_zh: '王新泽', name_en: 'Wang Xinze', daxiang_id: 'wb_wangxinze02' },
      { id: '2', name_zh: '李四', name_en: '', daxiang_id: '' }
    ],
    recentCaseOwnerNames: () => ['王新泽', '老名字', 'Wang Xinze', 'wb_wangxinze02']
  });
  // 历史里中文名/英文名/大象编号都出现过，都不该再单独成条
  assert.deepEqual(plain(mod.teamMemberOptions()), [
    { nameZh: '王新泽', nameEn: 'Wang Xinze', daxiangId: 'wb_wangxinze02', fromRoster: true },
    { nameZh: '李四', nameEn: '', daxiangId: '', fromRoster: true },
    { nameZh: '老名字', nameEn: '', daxiangId: '', fromRoster: false }
  ]);
});

test('联想过滤与排序：完全命中 → 前缀 → 包含；姓名和大象编号都能匹配，大小写不敏感', () => {
  const mod = loadRosterModule();
  const options = [
    { nameZh: '小王', nameEn: 'Xiao Wang', daxiangId: 'wb_xiaowang' },
    { nameZh: '王新泽', nameEn: 'Wang Xinze', daxiangId: 'wb_wangxinze02' },
    { nameZh: '老王', nameEn: 'Old Wang', daxiangId: 'wb_laowang' }
  ];
  const hits = (query) => plain(mod.filterTeamMemberOptions(options, query).map((option) => option.nameZh));
  assert.deepEqual(hits('王新泽'), ['王新泽']);
  // 前缀命中（王新泽）排在包含命中（小王 / 老王）之前，同级保持原顺序
  assert.deepEqual(hits('王'), ['王新泽', '小王', '老王']);
  assert.deepEqual(hits('WB_WANGXIN'), ['王新泽']);
  // 英文名同样能搜到
  assert.deepEqual(hits('Xiao'), ['小王']);
  assert.deepEqual(hits('old wang'), ['老王']);
  assert.deepEqual(hits('  '), ['小王', '王新泽', '老王']);
  assert.deepEqual(hits('zzz'), []);
});

test('输入姓名命中名单时解析出大象编号（决定提交时写不写 owner_contact）', () => {
  const mod = loadRosterModule({
    teamMembersCache: [
      { id: '1', name_zh: '王新泽', name_en: 'Wang Xinze', daxiang_id: 'wb_wangxinze02' },
      { id: '2', name_zh: '李四', name_en: 'Li Si', daxiang_id: '' }
    ]
  });
  assert.equal(mod.resolveTeamMemberDaxiang(' 王新泽 '), 'wb_wangxinze02');
  assert.equal(mod.resolveTeamMemberDaxiang('wang xinze'), 'wb_wangxinze02');
  // 兼容老数据：直接输入大象编号也能解析（历史素材里编号被当成姓名存过）
  assert.equal(mod.resolveTeamMemberDaxiang('wb_wangxinze02'), 'wb_wangxinze02');
  assert.equal(mod.resolveTeamMemberDaxiang('WB_WANGXINZE02'), 'wb_wangxinze02');
  assert.equal(mod.resolveTeamMemberDaxiang('王新泽x'), '');
  assert.equal(mod.resolveTeamMemberDaxiang(''), '');
  // 名单里登记过但没填编号 → 解析到空串（提交时不写编号）
  assert.equal(mod.resolveTeamMemberDaxiang('李四'), '');
  assert.equal(mod.resolveTeamMemberDaxiang('Li Si'), '');
});
