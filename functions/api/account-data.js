import { accessContext, configFor, fail, reply, limitedText } from '../_account-access.js';
import { dataPlan, restrictDataBody, dataResponseHeaders } from '../_account-data-policy.js';
export async function onRequest({ request, env }) {
  try {
    const ctx = await accessContext(request, env);
    const path = new URL(request.url).searchParams.get('path') || '';
    const config = configFor(env);
    const method = request.method;
    if (!['GET','HEAD'].includes(method) && request.headers.get('origin') !== new URL(request.url).origin) throw fail('不允许跨站操作', 403);
    const plan = dataPlan(ctx,path,method,config.url,request.headers);
    let body = ['GET','HEAD'].includes(method) ? undefined : request.body;
    if (plan.jsonBody) {
      if (Number(request.headers.get('content-length')||0)>4194304) throw fail('请求过大',413);
      const text=await limitedText(request,4194304);
      let value;try{value=JSON.parse(text);}catch{throw fail('请求格式错误');}
      body=JSON.stringify(restrictDataBody(ctx,plan,value));
    }
    const headers = new Headers();
    for(const key of ['content-type','accept','prefer','range','x-upsert','cache-control','if-none-match','if-modified-since'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
    headers.set('apikey',config.key);headers.set('Authorization',`Bearer ${config.key}`);
    const response = await fetch(plan.target.href, { method, headers, body, redirect: 'manual' });
    const output = dataResponseHeaders(plan,request,response);
    return new Response(response.body, { status: response.status, headers: output });
  } catch (error) { return reply({ message: error.status ? error.message : '数据服务暂时不可用' }, error.status || 503); }
}
