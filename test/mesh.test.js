import test from 'node:test';
import assert from 'node:assert/strict';
import { readTriangles, resizedMesh, writeStl, writeObj } from '../src/mesh.js';

function fixture({ positions=[0,0,0,1,0,0,0,1,0], indices=[0,1,2], mode=4, node={}, children }={}) {
  const pos=new Float32Array(positions), ind=new Uint16Array(indices);
  const bin=new Uint8Array(pos.byteLength+ind.byteLength);bin.set(new Uint8Array(pos.buffer));bin.set(new Uint8Array(ind.buffer),pos.byteLength);
  return {bin,json:{
    scenes:[{nodes:[0]}],scene:0,nodes:[{mesh:0,...node},...(children||[])],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,mode}]}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:pos.byteLength},{buffer:0,byteOffset:pos.byteLength,byteLength:ind.byteLength}],
    accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:positions.length/3},{bufferView:1,componentType:5123,type:'SCALAR',count:indices.length}]
  }};
}
test('world transforms and Y-up to Z-up are preserved',()=>{
  const {json,bin}=fixture({node:{translation:[10,20,30],scale:[2,3,4]}});
  const m=readTriangles(json,bin);
  assert.deepEqual([...m.triangles],[10,-30,20,12,-30,20,10,-30,23]);
  assert.deepEqual(m.dimensions,[2,0,3]);
});
test('mirrored transforms preserve winding',()=>{
  const {json,bin}=fixture({node:{scale:[-1,1,1]}});
  const m=readTriangles(json,bin), data=writeStl(resizedMesh(m,''));
  assert.equal(new DataView(data.buffer).getFloat32(88,true),-1); // outward normal Y=-1
});
test('requested print size, bed placement and STL record count',()=>{
  const {json,bin}=fixture(), mesh=resizedMesh(readTriangles(json,bin),200);
  assert.equal(Math.max(...mesh.dimensions),200);
  const data=writeStl(mesh), view=new DataView(data.buffer);
  assert.equal(data.length,134);assert.equal(view.getUint32(80,true),1);
  assert.equal(view.getFloat32(84+12+8,true),0);
  assert.match(new TextDecoder().decode(writeObj(mesh)),/f 1 2 3/);
  assert.throws(()=>resizedMesh(readTriangles(json,bin),'banana'),/longest edge/);
});
test('triangle strips alternate winding and fans export all triangles',()=>{
  for(const mode of [5,6]){
    const {json,bin}=fixture({positions:[0,0,0,1,0,0,0,1,0,1,1,0],indices:[0,1,2,3],mode});
    assert.equal(readTriangles(json,bin).count,2);
  }
});
test('invalid indices, missing buffers and cyclic scenes fail clearly',()=>{
  let f=fixture({indices:[0,1,100]});assert.throws(()=>readTriangles(f.json,f.bin),/out of range/);
  f=fixture();f.json.bufferViews[0].byteLength=10000;assert.throws(()=>readTriangles(f.json,f.bin),/bounds/);
  f=fixture({node:{children:[0]}});assert.throws(()=>readTriangles(f.json,f.bin),/Cyclic/);
});
test('zero area triangles are counted and excluded',()=>{
  const f=fixture({indices:[0,1,2,0,0,1]});
  const m=readTriangles(f.json,f.bin);assert.equal(m.count,1);assert.equal(m.degenerate,1);
});
