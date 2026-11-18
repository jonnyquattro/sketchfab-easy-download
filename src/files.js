import { resizedMesh, writeStl, writeObj } from './mesh.js';
import { buildZip } from '../vendor/sfrip/lib/zip.js';

export async function makeDownload(model, format, longestEdge) {
  const stem = model.name || model.uid;
  if (format==='glb') return { name: stem+'.glb', data: model.glb, type: 'model/gltf-binary' };
  const mesh = resizedMesh(model.mesh, longestEdge);
  const suffix = longestEdge ? `_${Number(longestEdge)}mm` : '_source-scale';
  if (format==='stl') return { name: stem+suffix+'.stl', data: writeStl(mesh), type: 'application/octet-stream' };
  if (format==='obj') return { name: stem+suffix+'.obj', data: writeObj(mesh), type: 'text/plain' };
  if (format!=='zip') throw new Error('Unknown export format.');
  const report = {
    name:model.title, author:model.author, source:model.source, triangles:mesh.count,
    print_dimensions:mesh.dimensions, print_units:mesh.units, print_scale:mesh.scale,
    source_dimensions:model.mesh.dimensions, skipped_parts:model.skipped,
    removed_zero_area_triangles:model.mesh.degenerate,
    orientation:'STL/OBJ: Z-up, centered X/Y, minimum Z=0. GLB: original scene scale and Y-up.',
    watertight:'not assessed; inspect in your slicer',
    note:'Textures and animation are omitted. No hole filling or printability guarantee. Export only with permission.'
  };
  const data=await buildZip([
    {name:stem+suffix+'.stl',data:writeStl(mesh)},
    {name:stem+suffix+'.obj',data:writeObj(mesh)},
    {name:stem+'.glb',data:model.glb},
    {name:'model-info.json',data:JSON.stringify(report,null,2)},
    {name:'READ-ME.txt',data:'Experimental reference export. Provided AS IS; use at your own risk.\nUse only models you own or have permission to export and use.\nSTL/OBJ use the chosen print size. GLB preserves the original scene scale.\nInspect units, wall thickness, open edges and the sliced preview before printing.\nSee model-info.json for dimensions and skipped geometry.\n'}
  ]);
  return {name:stem+suffix+'.zip',data,type:'application/zip'};
}
