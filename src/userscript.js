import { prepareModel } from './model.js';
import { makeDownload } from './files.js';

(() => {
  'use strict';
  if (document.getElementById('sf-easy-download')) return;
  const host=document.createElement('div'); host.id='sf-easy-download';
  Object.assign(host.style,{position:'fixed',bottom:'20px',right:'20px',zIndex:'2147483647'});
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`
  <style>
  :host{all:initial}*{box-sizing:border-box}button,input,select{font:inherit}
  .wrap{font:14px/1.45 system-ui,sans-serif;color:#e9f1f5;width:330px;max-width:calc(100vw - 32px)}
  button{cursor:pointer;border:0;border-radius:8px;padding:11px 14px;font-weight:650}
  .toggle,.primary{background:#21b8a6;color:#052b28;box-shadow:0 4px 20px #0003}
  .toggle{display:block;margin-left:auto}.panel{background:#152029;border:1px solid #40505c;border-radius:14px;box-shadow:0 10px 36px #0006;padding:18px;margin-bottom:10px}
  h2{font-size:18px;margin:0 0 4px}p{margin:6px 0 12px}.muted{color:#b8c7d1;font-size:12px}
  .row{display:flex;gap:8px;margin:12px 0}.row>*{flex:1;min-width:0}label{display:block;font-size:12px;color:#c6d6e1}
  select,input[type=number]{display:block;width:100%;background:#24343f;border:1px solid #53636f;border-radius:6px;color:#fff;padding:9px;margin-top:4px}
  .consent{display:flex;gap:8px;margin:12px 0;align-items:flex-start}.consent input{margin-top:3px}
  button:disabled{opacity:.55;cursor:wait}.actions{display:flex;gap:8px}.primary{flex:1}.secondary{background:#33444f;color:#fff}
  progress{display:block;width:100%;accent-color:#21b8a6;height:9px;margin:14px 0 8px}
  .status{font-size:12px;overflow-wrap:anywhere;min-height:18px}.error{color:#ffad9f}.details{white-space:pre-line;font-size:12px;color:#d1e1ec;margin:10px 0}
  a{color:#63dbc9}.busy{animation:pulse 1.5s infinite}@keyframes pulse{50%{opacity:.6}}
  [hidden]{display:none!important}:focus-visible{outline:2px solid #63dbc9;outline-offset:3px}
  </style>
  <div class="wrap">
    <section class="panel" hidden aria-label="Export model">
      <h2>Save your 3D model</h2>
      <p class="muted">Runs here in your browser. No local helper or login.</p>
      <div class="row">
        <label>Format<select id="format"><option value="stl">STL · printing</option><option value="obj">OBJ · editing</option><option value="glb">GLB · 3D scene</option><option value="zip">ZIP · all formats</option></select></label>
        <label>Longest edge (mm)<input id="size" type="number" min="0.01" max="10000" step="any" placeholder="Keep source scale"></label>
      </div>
      <p class="muted" id="size-note">Optional. STL and OBJ use this size; GLB keeps its original scale.</p>
      <label class="consent"><input type="checkbox" id="consent"><span>I own this model or have permission to export and use it.</span></label>
      <div class="actions"><button class="primary" id="download">Download STL</button><button class="secondary" id="cancel" hidden>Cancel</button></div>
      <progress value="0" max="100" hidden></progress>
      <div class="status" role="status" aria-live="polite">Ready when you are.</div>
      <div class="details" hidden></div>
      <p class="muted">Experimental reference code · AS IS. Check scale and mesh repair before printing. <a href="https://github.com/jonnyquattro/sketchfab-easy-download#responsible-use" target="_blank" rel="noopener noreferrer">Usage notes</a></p>
    </section>
    <button class="toggle" aria-expanded="false">Download 3D</button>
  </div>`;
  document.documentElement.append(host);
  const $=s=>root.querySelector(s);
  const toggle=$('.toggle'), panel=$('.panel'), button=$('#download'), format=$('#format'), size=$('#size');
  const consent=$('#consent'), cancel=$('#cancel'), bar=$('progress'), status=$('.status'), details=$('.details');
  let busy=false, model=null, controller=null, currentUid=null, preparedUid=null;
  const uid=()=>location.pathname.match(/(?:^|[-/])([a-f0-9]{32})(?:\/|$)/i)?.[1]?.toLowerCase();
  const setStatus=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
  const label=()=>{
    button.textContent=busy?'Preparing…':`Download ${format.value.toUpperCase()}`;
    size.disabled=busy||format.value==='glb';
    $('#size-note').textContent=format.value==='glb'?'GLB preserves the original scene scale and orientation.':'Optional. STL and OBJ use this size; GLB keeps its original scale.';
  };
  const setBusy=value=>{
    busy=value;button.disabled=value;format.disabled=value;consent.disabled=value;
    cancel.hidden=!value;bar.hidden=!value;label();
  };
  const observePage=()=>{
    const next=uid(); host.hidden=!next;
    if(next!==currentUid){
      controller?.abort();currentUid=next;model=null;preparedUid=null;consent.checked=false;
      details.hidden=true;setStatus('Ready when you are.');
    }
  };
  setInterval(observePage,600);observePage();
  toggle.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
  });
  format.addEventListener('change',label);
  cancel.addEventListener('click',()=>{controller?.abort();setStatus('Cancelling…');});
  button.addEventListener('click',async()=>{
    if(busy||!uid())return;
    if(!consent.checked){setStatus('Confirm that you have permission to export this model.',true);consent.focus();return;}
    if(format.value!=='glb'&&size.value&&!size.checkValidity()){size.reportValidity();return;}
    const startedUid=uid(), selectedFormat=format.value, targetSize=size.value;
    controller=new AbortController();const signal=controller.signal;
    setBusy(true);bar.value=0;setStatus('Starting…');
    try{
      if(!model||preparedUid!==startedUid){
        const prepared=await prepareModel(location.href,{signal,progress:(text,percent)=>{
          if(uid()===startedUid){bar.value=percent;setStatus(text);}
        }});
        if(signal.aborted||uid()!==startedUid)throw new DOMException('Cancelled','AbortError');
        model=prepared;preparedUid=startedUid;
      }
      if(signal.aborted)throw new DOMException('Cancelled','AbortError');
      setStatus('Saving file…');
      await new Promise(resolve=>setTimeout(resolve,0));
      const file=await makeDownload(model,selectedFormat,targetSize);
      if(signal.aborted||uid()!==startedUid)throw new DOMException('Cancelled','AbortError');
      const blob=new Blob([file.data],{type:file.type});
      const objectUrl=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=objectUrl;link.download=file.name;
      document.documentElement.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),120000);
      setStatus('Saved. Choose another format to reuse the prepared model.');
      const dimensions=model.mesh.dimensions;
      const scale=selectedFormat==='glb'||!targetSize?1:Number(targetSize)/Math.max(...dimensions);
      details.textContent=`${model.title}\n${model.mesh.count.toLocaleString()} triangles · by ${model.author}\n`+
        `Size: ${dimensions.map(v=>(v*scale).toLocaleString(undefined,{maximumFractionDigits:3})).join(' × ')} ${targetSize&&selectedFormat!=='glb'?'mm':'source units'}\n`+
        (model.skipped.length?`Warning: ${model.skipped.length} part(s) could not be exported.\n`:'')+
        'Watertightness is not assessed. Check your slicer preview.';
      details.hidden=false;
    }catch(error){
      host.dataset.lastError=error.stack||String(error);
      console.error('[Sketchfab Easy Download]',error);
      if(uid()===startedUid)setStatus(signal.aborted||error.name==='AbortError'?'Cancelled. Click download to try again.':error.message||'The export failed. Please retry.',!signal.aborted&&error.name!=='AbortError');
    }finally{setBusy(false);controller=null;}
  });
})();
