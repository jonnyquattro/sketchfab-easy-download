import {
  extractUid, fetchViewerInfo, isBinzFormat, extractStaticKey, getDiterB,
  modelBinzUrls, fetchBytes, parseViewerMaterials, viewerOrientation, sanitizeName
} from '../vendor/sfrip/lib/sf-api.js';
import { decryptBinzBytes } from '../vendor/sfrip/lib/decrypt.js';
import { convertOsgjsToGlbFromFiles } from '../vendor/sfrip/lib/osgjs2gltf.js';
import { setRequestSignal } from './network.js';
import { readTriangles } from './mesh.js';

let cachedKey;
export async function prepareModel(url, { signal, progress = () => {} } = {}) {
  const uid = extractUid(url);
  if (!uid) throw new Error('Open a Sketchfab model page first.');
  setRequestSignal(signal);
  const stage = (label, percent) => {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    progress(label, percent);
  };
  stage('Reading model details…', 6);
  const { info, embedHtml } = await fetchViewerInfo(uid);
  if (!isBinzFormat(info)) throw new Error('This viewer format is not supported, or the model is not publicly accessible.');
  if (info.isPrivate || info.isPasswordProtected) throw new Error('Private or password-protected models are not supported.');
  if (Number(info.files?.[0]?.modelSize) > 150 * 1024 * 1024) throw new Error('This model is too large for the browser exporter (150 MB).');
  stage('Preparing viewer decoder…', 18);
  const key = cachedKey || await extractStaticKey(embedHtml);
  const wasm = Uint8Array.from(atob(__DECRYPT_WASM_BASE64__), char => char.charCodeAt(0));
  stage('Downloading geometry…', 35);
  // Fetch essential assets concurrently; wireframes, textures and animations are omitted.
  const urls = modelBinzUrls(info).slice(0, 2);
  const payloads = await Promise.all(urls.map(url => fetchBytes(url)));
  stage('Decoding geometry…', 58);
  const b = getDiterB(info);
  const files = {
    'file.osgjs': await decryptBinzBytes(wasm, payloads[0], b, key),
    'model_file.bin': await decryptBinzBytes(wasm, payloads[1], b, key)
  };
  cachedKey = key;
  stage('Building 3D scene…', 75);
  await new Promise(resolve => setTimeout(resolve, 0));
  const result = await convertOsgjsToGlbFromFiles(
    files, parseViewerMaterials(info), [], viewerOrientation(info), true, 'objects', null, false
  );
  if (result.skippedGeometries?.length) {
    // Preserve incomplete-export information, rather than claiming a complete model.
    progress(`${result.skippedGeometries.length} unsupported part(s) skipped`, 82);
  }
  stage('Preparing print formats…', 90);
  const jsonText = result.gltfExternal.jsonText;
  const json = JSON.parse(typeof jsonText === 'string' ? jsonText : new TextDecoder().decode(jsonText));
  const mesh = readTriangles(json, result.gltfExternal.bin);
  stage('Ready to save', 100);
  return {
    uid, name: sanitizeName(info.name || uid), title: info.name || uid,
    author: info.user?.displayName || info.user?.username || 'Unknown',
    source: `https://sketchfab.com/models/${uid}`, glb: result.glb, mesh,
    skipped: result.skippedGeometries || []
  };
}
