import { accessContext, authFetch, fail, reply } from '../_account-access.js';

// Analytics needs identity labels, never the account-management password vault.
export async function handleAnalyticsAccounts(request, env, fetcher = fetch) {
  try {
    if (request.method !== 'GET') throw fail('请求方法不支持', 405);
    const ctx = await accessContext(request, env, fetcher);
    if (ctx.account.status !== 'active') throw fail('此账号已停用', 403);
    if (!ctx.maintenance) return reply({ accounts: [{ id: ctx.user.id, displayName: ctx.account.display_name || ctx.account.email, role: ctx.account.role === 'admin' ? 'admin' : 'operator' }] });
    const saved = await ctx.db.prepare('SELECT user_id,display_name,role FROM vf_accounts').all();
    const byId = new Map(saved.results.map(row => [row.user_id, row]));
    const accounts = [];
    for (let page = 1; ; page++) {
      const result = await authFetch(env, `admin/users?page=${page}&per_page=50`, {}, fetcher);
      const users = result.users || [];
      for (const user of users) {
        const row = byId.get(user.id);
        accounts.push({ id: user.id, displayName: row?.display_name || user.user_metadata?.display_name || user.email || '', role: row?.role === 'admin' ? 'admin' : 'operator' });
      }
      if (users.length < 50) break;
    }
    return reply({ accounts });
  } catch (error) {
    return reply({ error: error.status ? error.message : '账号名称暂时无法读取' }, error.status || 503);
  }
}
export const onRequest = ({ request, env }) => handleAnalyticsAccounts(request, env);
