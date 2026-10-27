import test from 'node:test';
import assert from 'node:assert/strict';
import {finalizeDataProxyResponse,accountDataWriteTimeout} from '../functions/api/account-data.js';

test('v960 write response is buffered and framed with its exact byte length',async()=>{
 const upstream=new Response('{"Key":"owned/path.png"}',{status:200,headers:{'Content-Type':'application/json'}});
 const headers=new Headers(upstream.headers);
 const result=await finalizeDataProxyResponse('POST',upstream,headers);
 const body=await result.text();
 assert.equal(body,'{"Key":"owned/path.png"}');
 assert.equal(result.headers.get('content-length'),String(Buffer.byteLength(body)));
});

test('v960 reads remain streaming and do not invent a content length',async()=>{
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('image-bytes'));controller.close();}});
 const upstream=new Response(stream,{status:200,headers:{'Content-Type':'application/octet-stream'}});
 const result=await finalizeDataProxyResponse('GET',upstream,new Headers(upstream.headers));
 assert.equal(result.headers.get('content-length'),null);
 assert.equal(await result.text(),'image-bytes');
});

test('v962 source image writes get a long timeout; metadata writes stay short',()=>{
 assert.equal(accountDataWriteTimeout({storage:true,jsonBody:false},'POST'),600000);
 assert.equal(accountDataWriteTimeout({storage:false,jsonBody:true},'POST'),120000);
 assert.equal(accountDataWriteTimeout({storage:true,jsonBody:false},'GET'),undefined);
});
