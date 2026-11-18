import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDownload } from '../src/files.js';
const model={
  name:'Reference',title:'Reference',uid:'0'.repeat(32),author:'Owner',source:'https://sketchfab.com/models/'+ '0'.repeat(32),
  glb:new Uint8Array([0x67,0x6c,0x54,0x46]),skipped:[],
  mesh:{triangles:new Float32Array([0,0,0,1,0,0,0,1,0]),count:1,min:[0,0,0],max:[1,1,0],dimensions:[1,1,0],degenerate:0}
};
test('GLB preserves scene bytes and ignores disabled print size control',async()=>{
  const result=await makeDownload(model,'glb','not a print size');
  assert.equal(result.data,model.glb);assert.equal(result.name,'Reference.glb');
});
test('sized STL exports the requested dimension and reports it in the filename',async()=>{
  const result=await makeDownload(model,'stl','250');
  assert.equal(result.name,'Reference_250mm.stl');
  const view=new DataView(result.data.buffer);
  assert.equal(view.getFloat32(84+12+3*4,true)-view.getFloat32(84+12,true),250);
});
test('ZIP output has local records and a central directory',async()=>{
  const result=await makeDownload(model,'zip','250');
  const view=new DataView(result.data.buffer);
  assert.equal(view.getUint32(0,true),0x04034b50);
  assert.equal(view.getUint32(result.data.length-22,true),0x06054b50);
  assert.equal(view.getUint16(result.data.length-22+10,true),5);
});
