import { IDENTITY_MAT4, mat4Multiply } from '../vendor/sfrip/lib/osg-scene.js';

function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [
    (1 - 2 * (y*y + z*z))*sx, 2*(x*y + z*w)*sx, 2*(x*z - y*w)*sx, 0,
    2*(x*y - z*w)*sy, (1 - 2*(x*x + z*z))*sy, 2*(y*z + x*w)*sy, 0,
    2*(x*z + y*w)*sz, 2*(y*z - x*w)*sz, (1 - 2*(x*x + y*y))*sz, 0,
    tx, ty, tz, 1
  ];
}

function accessor(json, bin, id) {
  const a = json.accessors?.[id];
  if (!a || a.sparse || a.normalized) throw new Error('Unsupported mesh accessor.');
  const b = json.bufferViews?.[a.bufferView];
  if (!b || b.buffer !== 0) throw new Error('Mesh buffer is missing.');
  const types = { 5121: ['getUint8', 1], 5123: ['getUint16', 2], 5125: ['getUint32', 4], 5126: ['getFloat32', 4] };
  const type = types[a.componentType];
  const itemSize = { SCALAR: 1, VEC3: 3 }[a.type];
  if (!type || !itemSize) throw new Error('Unsupported position/index format.');
  const [getter, bytes] = type;
  const stride = b.byteStride || itemSize * bytes;
  const base = (b.byteOffset || 0) + (a.byteOffset || 0);
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  if (!Number.isInteger(a.count) || a.count < 0 || stride < itemSize * bytes ||
      base < 0 || (a.count && base + (a.count-1)*stride + itemSize*bytes > (b.byteOffset || 0) + b.byteLength) ||
      (b.byteOffset || 0) + b.byteLength > bin.byteLength) throw new Error('Invalid mesh buffer bounds.');
  return {
    count: a.count,
    get(i, component = 0) {
      if (!Number.isInteger(i) || i < 0 || i >= a.count) throw new Error('Mesh index is out of range.');
      return view[getter](base + i*stride + component*bytes, true);
    }
  };
}

export function readTriangles(json, bin) {
  const parts = [];
  let capacity = 0;
  const nodes = json.nodes || [];
  const childNodes = new Set(nodes.flatMap(n => n.children || []));
  const roots = json.scenes?.[json.scene || 0]?.nodes || nodes.map((_, i) => i).filter(i => !childNodes.has(i));
  function visit(id, parent, path) {
    if (path.has(id)) throw new Error('Cyclic model scene.');
    if (path.size > 256) throw new Error('Model scene is too deeply nested.');
    const node = nodes[id];
    if (!node) throw new Error('Scene node is missing.');
    const world = mat4Multiply(parent, localMatrix(node));
    const det = world[0]*(world[5]*world[10]-world[9]*world[6]) - world[4]*(world[1]*world[10]-world[9]*world[2]) + world[8]*(world[1]*world[6]-world[5]*world[2]);
    if (node.skin != null) throw new Error('Unexpected unbaked skeleton in print geometry.');
    for (const primitive of json.meshes?.[node.mesh]?.primitives || []) {
      const mode = primitive.mode ?? 4;
      if (![4, 5, 6].includes(mode)) continue;
      const positions = accessor(json, bin, primitive.attributes.POSITION);
      const indices = primitive.indices != null ? accessor(json, bin, primitive.indices) : null;
      const count = indices?.count ?? positions.count;
      const triangles = mode === 4 ? Math.floor(count/3) : Math.max(0, count-2);
      capacity += triangles;
      if (capacity > 3000000) throw new Error('This mesh exceeds the browser limit of 3 million triangles.');
      parts.push({ positions, indices, count, mode, world, mirrored: det < 0 });
    }
    const next = new Set(path); next.add(id);
    for (const child of node.children || []) visit(child, world, next);
  }
  for (const root of roots) visit(root, IDENTITY_MAT4, new Set());
  const output = new Float32Array(capacity*9);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let used = 0, degenerate = 0;
  for (const p of parts) {
    const point = index => {
      const x = p.positions.get(index, 0), y = p.positions.get(index, 1), z = p.positions.get(index, 2);
      const m = p.world;
      // glTF is Y-up. Print meshes are Z-up, with world transforms applied.
      return [m[0]*x+m[4]*y+m[8]*z+m[12], -(m[2]*x+m[6]*y+m[10]*z+m[14]), m[1]*x+m[5]*y+m[9]*z+m[13]];
    };
    const emit = (a, b, c) => {
      const ids = [a, b, c].map(i => p.indices ? p.indices.get(i) : i);
      if (p.mirrored) [ids[1], ids[2]] = [ids[2], ids[1]];
      const points = ids.map(point);
      if (!points.flat().every(Number.isFinite)) throw new Error('Model contains invalid coordinates.');
      const [v0,v1,v2] = points;
      const u = v1.map((v,i) => v-v0[i]), v = v2.map((v,i) => v-v0[i]);
      if (Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]) === 0) { degenerate++; return; }
      for (const pt of points) for (let axis=0; axis<3; axis++) {
        output[used++] = pt[axis];
        min[axis] = Math.min(min[axis],pt[axis]); max[axis] = Math.max(max[axis],pt[axis]);
      }
    };
    if (p.mode === 4) for (let i=0; i+2<p.count; i+=3) emit(i,i+1,i+2);
    if (p.mode === 5) for (let i=2; i<p.count; i++) i%2 ? emit(i-1,i-2,i) : emit(i-2,i-1,i);
    if (p.mode === 6) for (let i=2; i<p.count; i++) emit(0,i-1,i);
  }
  if (!used) throw new Error('The model contains no printable triangles.');
  return { triangles: output.subarray(0, used), count: used/9, min, max,
    dimensions: max.map((v,i) => v-min[i]), degenerate };
}

export function resizedMesh(mesh, longestEdge) {
  const target = longestEdge === '' || longestEdge == null ? null : Number(longestEdge);
  if (target != null && (!Number.isFinite(target) || target <= 0 || target > 10000)) {
    throw new Error('Enter a longest edge between 0 and 10,000 mm, or leave it blank to preserve scale.');
  }
  const scale = target == null ? 1 : target / Math.max(...mesh.dimensions);
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('The model has an invalid size.');
  const out = new Float32Array(mesh.triangles.length);
  // Center on the bed in X/Y and put the lowest point at Z=0.
  const origin = [(mesh.min[0]+mesh.max[0])/2, (mesh.min[1]+mesh.max[1])/2, mesh.min[2]];
  for (let i=0; i<out.length; i++) out[i] = (mesh.triangles[i]-origin[i%3])*scale;
  return { triangles: out, count: mesh.count, scale,
    dimensions: mesh.dimensions.map(v => v*scale), units: target == null ? 'source coordinates; confirm slicer units' : 'mm' };
}

export function writeStl(mesh) {
  const bytes = new Uint8Array(84+mesh.count*50);
  bytes.set(new TextEncoder().encode('Sketchfab Easy Download | experimental authorized reference export'));
  const view = new DataView(bytes.buffer); view.setUint32(80,mesh.count,true);
  const t = mesh.triangles;
  for (let face=0; face<mesh.count; face++) {
    const i=face*9, off=84+face*50;
    const ax=t[i+3]-t[i], ay=t[i+4]-t[i+1], az=t[i+5]-t[i+2];
    const bx=t[i+6]-t[i], by=t[i+7]-t[i+1], bz=t[i+8]-t[i+2];
    const n=[ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx], len=Math.hypot(...n)||1;
    for(let j=0;j<3;j++) view.setFloat32(off+j*4,n[j]/len,true);
    for(let j=0;j<9;j++) view.setFloat32(off+12+j*4,t[i+j],true);
  }
  return bytes;
}

export function writeObj(mesh) {
  const lines=['# Experimental reference export; Z-up; verify scale and mesh before printing.'];
  const t=mesh.triangles;
  for(let i=0;i<t.length;i+=3) lines.push(`v ${t[i]} ${t[i+1]} ${t[i+2]}`);
  for(let i=1;i<=mesh.count*3;i+=3) lines.push(`f ${i} ${i+1} ${i+2}`);
  return new TextEncoder().encode(lines.join('\n')+'\n');
}
