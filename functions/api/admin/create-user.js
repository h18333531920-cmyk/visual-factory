// The old shared-admin endpoint must not bypass developer verification.
import { accessContext, requireMaintenance, reply } from '../../_account-access.js';
export async function onRequest({request,env}) {
  try { requireMaintenance(await accessContext(request,env)); return reply({error:'请使用新版账号管理面板创建账号'},410); }
  catch(error) { return reply({error:error.status?error.message:'服务暂时不可用'},error.status||503); }
}
