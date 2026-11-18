import test from 'node:test';
import assert from 'node:assert/strict';
import { gmFetch, setRequestSignal, validateUrl } from '../src/network.js';

test('only expected HTTPS asset hosts are allowed',()=>{
  assert.equal(validateUrl('https://media.sketchfab.com/a'),'https://media.sketchfab.com/a');
  for(const url of ['http://sketchfab.com/a','https://sketchfab.com.evil.test/a','https://user:pass@sketchfab.com/','https://sketchfab.com:123/a','file:///a']) assert.throws(()=>validateUrl(url));
});
test('Tampermonkey request omits login cookies and returns binary response',async()=>{
  let options;
  globalThis.GM_xmlhttpRequest=o=>{options=o;queueMicrotask(()=>o.onload({status:200,finalUrl:o.url,response:new Uint8Array([1,2,3]).buffer}));return {abort(){}};};
  setRequestSignal(null);
  const response=await gmFetch('https://sketchfab.com/a');
  assert.equal(options.anonymous,true);assert.equal(options.method,'GET');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3]);
});
test('cancel aborts the outstanding request',async()=>{
  let aborted=false;
  globalThis.GM_xmlhttpRequest=()=>({abort(){aborted=true;}});
  const controller=new AbortController();setRequestSignal(controller.signal);
  const request=gmFetch('https://sketchfab.com/a');controller.abort();
  await assert.rejects(request,{name:'AbortError'});assert.equal(aborted,true);setRequestSignal(null);
});
test('oversized and timed out responses provide actionable errors',async()=>{
  globalThis.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onprogress({total:200*1024*1024,loaded:1}));return {abort(){}};};
  await assert.rejects(gmFetch('https://sketchfab.com/a'),/150 MB/);
  globalThis.GM_xmlhttpRequest=o=>{queueMicrotask(o.ontimeout);return {abort(){}};};
  await assert.rejects(gmFetch('https://sketchfab.com/a'),/timed out/);
});
