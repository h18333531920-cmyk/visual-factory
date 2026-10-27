import { accessContext, configFor, fail, reply, limitedText } from '../_account-access.js';
import { dataPlan, restrictDataBody, dataResponseHeaders } from '../_account-data-policy.js';

export async function finalizeDataProxyResponse(method, response, output) {
  if (!['GET','HEAD'].includes(method)) {
    const bytes = await response.arrayBuffer();
    output.set('Content-Length', String(bytes.byteLength));
    return new Response(bytes, { status: response.status, headers: output });
  }
  return new Response(response.body, { status: response.status, headers: output });
}

export function accountDataWriteTimeout(plan, method) {
  if (['GET','HEAD'].includes(method)) return undefined;
  return plan.storage && !plan.jsonBody && ['POST','PUT'].includes(method) ? 600000 : 120000;
}

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
    } else if (plan.storage && !['GET','HEAD'].includes(method)) {
      // v961：storage 写请求（对象上传/删除）先**完整缓冲**请求体再转发上游。
      // 直接把 request.body（ReadableStream）透传给 fetch 时，Cloudflare 只能用 chunked
      // 编码转发；Supabase storage 对 chunked 上传偶发挂起 —— 对象迟迟不落库、响应也不返回，
      // 前端表现就是「进度条永远停在 0%、素材压根没传上去」。写请求体本身不大（单个素材），
      // 缓冲后运行时自动带精确 Content-Length，转发行为与浏览器直连一致。
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > 80 * 1024 * 1024) throw fail('文件过大', 413);
      body = bytes;
    }
    const headers = new Headers();
    for(const key of ['content-type','accept','prefer','range','x-upsert','cache-control','if-none-match','if-modified-since'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
    headers.set('apikey',config.key);headers.set('Authorization',`Bearer ${config.key}`);
    // 大图原文件走代理上传时可能超过 2 分钟；只对原始对象写入给 10 分钟，
    // 其余写操作仍限 2 分钟，读操作继续由浏览器/Range 控制。
    const writeTimeout = accountDataWriteTimeout(plan, method);
    const response = await fetch(plan.target.href, { method, headers, body, redirect: 'manual', signal: writeTimeout ? AbortSignal.timeout(writeTimeout) : undefined });
    const output = dataResponseHeaders(plan,request,response);
    // v960：写操作不能把上游 Response.body 原样穿过 Pages Function 流给浏览器。
    // Supabase 已经完成了对象写入，但这条小响应偶发不结束，上传页会一直等到超时，
    // 随后又按失败路径把刚传好的对象回滚。写响应本来都很小，先收齐并带精确长度；
    // GET/HEAD（可能是大图片）继续流式返回，避免把素材整块读进 Function 内存。
    return finalizeDataProxyResponse(method, response, output);
  } catch (error) { return reply({ message: error.status ? error.message : '数据服务暂时不可用' }, error.status || 503); }
}
