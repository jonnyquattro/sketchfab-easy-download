// ==UserScript==
// @name         Sketchfab Easy Download — STL / OBJ / GLB
// @namespace    https://github.com/jonnyquattro/sketchfab-easy-download
// @version      2.0.0
// @description  Experimental reference exporter. Runs entirely in your browser with Tampermonkey; no local helper. Authorized use only, AS IS.
// @match        https://sketchfab.com/*
// @grant        GM_xmlhttpRequest
// @connect      sketchfab.com
// @connect      static.sketchfab.com
// @connect      media.sketchfab.com
// @noframes
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/jonnyquattro/sketchfab-easy-download/main/dist/sketchfab-easy-download.user.js
// @updateURL    https://raw.githubusercontent.com/jonnyquattro/sketchfab-easy-download/main/dist/sketchfab-easy-download.user.js
// @homepageURL  https://github.com/jonnyquattro/sketchfab-easy-download
// @supportURL   https://github.com/jonnyquattro/sketchfab-easy-download/issues
// @license      MIT
// ==/UserScript==

// Provided AS IS, at your own risk. Export only models you own or have permission to export.
// Embedded converter: Corpocore/sfrip (MIT), commit 2bb0b7594aeea9f979af035eccb8c6ad29586633.
// See the repository LICENSE and THIRD_PARTY_NOTICES.txt.

(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // empty-node:node:zlib
  var node_zlib_exports = {};
  __export(node_zlib_exports, {
    default: () => node_zlib_default
  });
  var node_zlib_default;
  var init_node_zlib = __esm({
    "empty-node:node:zlib"() {
      node_zlib_default = {};
    }
  });

  // src/network.js
  var ALLOWED = /* @__PURE__ */ new Set(["sketchfab.com", "static.sketchfab.com", "media.sketchfab.com"]);
  var MAX_BYTES = 150 * 1024 * 1024;
  var signal;
  function setRequestSignal(value) {
    signal = value;
  }
  function validateUrl(value) {
    const url = new URL(value);
    if (url.protocol !== "https:" || !ALLOWED.has(url.hostname) || url.username || url.password || url.port && url.port !== "443") {
      throw new Error("Blocked an unexpected asset address. Only Sketchfab HTTPS assets are allowed.");
    }
    return url.href;
  }
  function gmFetch(value) {
    const url = validateUrl(value);
    const activeSignal = signal;
    if (activeSignal?.aborted) return Promise.reject(new DOMException("Cancelled", "AbortError"));
    return new Promise((resolve, reject) => {
      let handle, finished = false;
      const finish = (fn, data) => {
        if (finished) return;
        finished = true;
        activeSignal?.removeEventListener("abort", abort);
        fn(data);
      };
      const abort = () => {
        finish(reject, new DOMException("Cancelled", "AbortError"));
        handle?.abort();
      };
      handle = GM_xmlhttpRequest({
        method: "GET",
        url,
        anonymous: true,
        responseType: "arraybuffer",
        timeout: 6e4,
        onload(response) {
          try {
            if (response.finalUrl) validateUrl(response.finalUrl);
            if (!(response.response instanceof ArrayBuffer)) throw new Error("The browser did not return a binary response. Check Tampermonkey permissions.");
            if (response.response.byteLength > MAX_BYTES) throw new Error("This asset exceeds the 150 MB browser limit.");
            finish(resolve, new Response(response.response, {
              status: response.status || 502,
              headers: { "Content-Type": "application/octet-stream" }
            }));
          } catch (error) {
            finish(reject, error);
          }
        },
        onprogress(event) {
          if (event.loaded > MAX_BYTES || event.total > MAX_BYTES) {
            finish(reject, new Error("This asset exceeds the 150 MB browser limit."));
            handle?.abort();
          }
        },
        onerror: () => finish(reject, new Error("Network request failed. Allow the listed Sketchfab domains in Tampermonkey, then retry.")),
        ontimeout: () => finish(reject, new Error("The asset request timed out. Please retry.")),
        onabort: () => finish(reject, new DOMException("Cancelled", "AbortError"))
      });
      activeSignal?.addEventListener("abort", abort, { once: true });
      if (activeSignal?.aborted) abort();
    });
  }

  // vendor/sfrip/lib/decrypt.js
  var DEFAULT_STATIC_KEY = "7d61ef7c7530c12cf080fafd05e603d1aa3a92c6";
  function parseWasmDataSize(wasmBytes) {
    let m = 65536;
    let d = 8;
    while (d < wasmBytes.length) {
      const v = () => wasmBytes[d++];
      const w = () => {
        let t = d, n = 0, e = 128;
        while (128 & e) {
          e = wasmBytes[d];
          n |= (127 & e) << 7 * (d - t);
          d++;
        }
        return n;
      };
      let y = w(), I = w(), h = d + I;
      if (y < 0 || y > 11 || I <= 0 || h > wasmBytes.length) break;
      if (6 === y) {
        w();
        v();
        v();
        w();
        let _ = w();
        w();
        m = _;
      }
      if (11 === y) {
        for (let Z = w(), A = 0; A !== Z && d < h; A++) {
          v();
          w();
          w();
          w();
          let U = w();
          d += U;
        }
      }
      d = h;
    }
    return m;
  }
  async function initWasm(wasmBytes) {
    const r = new Uint8Array(wasmBytes);
    const m = parseWasmDataSize(r);
    const u = 536870912;
    const g = 262144 + (m + 65535 >> 16 << 16);
    let currentBreak = m;
    const memory = new WebAssembly.Memory({
      initial: g >> 16,
      maximum: u >> 16,
      shared: false
    });
    let uint8View = new Uint8Array(memory.buffer);
    let uint32View = new Uint32Array(memory.buffer);
    const refreshViews = () => {
      uint8View = new Uint8Array(memory.buffer);
      uint32View = new Uint32Array(memory.buffer);
    };
    const env = {
      sbrk(increment) {
        const old = currentBreak;
        const newBreak = old + increment;
        const overflow = newBreak - memory.buffer.byteLength;
        if (overflow > 0) {
          memory.grow(overflow + 65535 >> 16);
          refreshViews();
        }
        currentBreak = newBreak;
        return old | 0;
      },
      time(t) {
        const r2 = Date.now() / 1e3 | 0;
        if (t) uint32View[t >> 2] = r2;
        return r2;
      },
      gettimeofday(t) {
        const n = Date.now();
        uint32View[t >> 2] = n / 1e3 | 0;
        uint32View[t + 4 >> 2] = n % 1e3 * 1e3;
      },
      abort() {
        throw new Error("WASM abort");
      },
      memory
    };
    env.__lock = env.__unlock = env.setjmp = env.__cxa_atexit = function() {
    };
    const result = await WebAssembly.instantiate(r, { env });
    const ex = result.instance.exports;
    if (ex.__wasm_call_ctors) ex.__wasm_call_ctors();
    return {
      a: ex,
      H: () => {
        refreshViews();
        return uint8View;
      }
    };
  }
  function b64ToBytes(b64) {
    const clean = String(b64).replace(/\\n/g, "").replace(/\n/g, "").replace(/\s/g, "");
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function decryptBinzBytes(wasmBytes, encData, diterB, staticKey) {
    const wasm = await initWasm(wasmBytes);
    const a = wasm.a;
    const allocInput = a["heSBnb29kYnllCk5ldmVyIGdvbm5hIHRl"];
    const reset = a["mV2ZXIgZ29ubmEgbGV0IHlvdSBkb3duCk5l"];
    const rickRolled = a["Umlja1JvbGxlZDRV"];
    const allocDiterB = a["dmVyIGdvbm5hIHJ1biBhcm91bmQgYW5kI"];
    const process_ = a["GRlc2VydCB5b3UKTmV2ZXIgZ29ubmEgbW"];
    const advance = a["FrZSB5b3UgY3J5Ck5ldmVyIGdvbm5hIHN"];
    const getInfo = a["bGwgYSBsaWUgYW5kIGh1cnQgeW91Cg"];
    const getStart = a["TmV2ZXIgZ29ubmEgZ2l2ZSB5b3UgdXAKT"];
    if (!allocInput || !reset || !rickRolled || !allocDiterB || !process_ || !advance || !getInfo || !getStart) {
      throw new Error("WASM exports missing (decrypt.wasm outdated?)");
    }
    const keyHex = (staticKey || DEFAULT_STATIC_KEY).slice(0, 40).toLowerCase();
    const seed = 1314 + Math.floor(9999 * Math.random());
    const collected = [];
    let running = seed;
    for (let i = 0; i < 10; i++) {
      const G = parseInt(keyHex.slice(4 * i, 4 * i + 4), 16);
      running ^= G;
      collected.push(G ^ seed);
      collected.push(running);
    }
    let xorAll = collected[19];
    for (let t = 0; t < 10; t++) xorAll ^= collected[2 * t];
    const keyArr = Array.from({ length: 10 }, (_, t) => collected[2 * t] ^ xorAll);
    const keyOff = rickRolled(seed, 40);
    let mem = wasm.H();
    for (let t = 0; t < 10; t++) {
      let h = keyArr[t].toString(16);
      h = "0".repeat(4 - h.length) + h;
      for (let n = 0; n < h.length; n++) mem[keyOff + n + 4 * t] = h.charCodeAt(n);
    }
    const diterBBytes = b64ToBytes(diterB);
    reset();
    const dOff = allocDiterB(diterBBytes.length);
    mem = wasm.H();
    for (let i = 0; i < diterBBytes.length; i++) mem[dOff + i] = diterBBytes[i];
    process_(0);
    const input = encData instanceof Uint8Array ? encData : new Uint8Array(encData);
    const chunks = [];
    for (let off = 0; off < input.length; off += 10240) {
      const len = Math.min(10240, input.length - off);
      const iOff = allocInput(len);
      mem = wasm.H();
      for (let i = 0; i < len; i++) mem[iOff + i] = input[off + i];
      let more = process_(1);
      while (more) {
        mem = wasm.H();
        const s = getStart();
        const e = getStart() + getInfo();
        chunks.push(mem.subarray(s, e).slice(0));
        advance();
        more = process_(0);
      }
    }
    if (!chunks.length) throw new Error("WASM produced no output");
    let total = 0;
    for (const c of chunks) total += c.length;
    let result = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) {
      result.set(c, o);
      o += c.length;
    }
    if (result[0] === 31 && result[1] === 139) {
      result = await gunzip(result);
    }
    return result;
  }
  async function gunzip(data) {
    if (typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("gzip");
      const stream = new Blob([data]).stream().pipeThrough(ds);
      const ab = await new Response(stream).arrayBuffer();
      return new Uint8Array(ab);
    }
    throw new Error("gzip decompress not supported in this browser");
  }

  // vendor/sfrip/lib/descramble.js
  function asU8(bytes) {
    if (bytes instanceof Uint8Array) return bytes;
    if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
    if (ArrayBuffer.isView(bytes)) {
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    return new Uint8Array(bytes);
  }
  function copyBuf(u8) {
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }
  var PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  function isPng(bytes) {
    if (!bytes || bytes.length < 8) return false;
    for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIG[i]) return false;
    return true;
  }
  function u32be(b, o) {
    return (b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]) >>> 0;
  }
  function putU32be(b, o, v) {
    b[o] = v >>> 24 & 255;
    b[o + 1] = v >>> 16 & 255;
    b[o + 2] = v >>> 8 & 255;
    b[o + 3] = v & 255;
  }
  var CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8, start, len) {
    let c = 4294967295;
    const end = start + len;
    for (let i = start; i < end; i++) {
      c = CRC_TABLE[(c ^ u8[i]) & 255] ^ c >>> 8;
    }
    return (c ^ 4294967295) >>> 0;
  }
  async function inflateZlib(src) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("no DecompressionStream");
    }
    const ds = new DecompressionStream("deflate");
    const ab = await new Response(new Blob([copyBuf(src)]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }
  async function deflateZlib(src) {
    if (typeof CompressionStream !== "function") {
      throw new Error("no CompressionStream");
    }
    const cs = new CompressionStream("deflate");
    const ab = await new Response(new Blob([copyBuf(src)]).stream().pipeThrough(cs)).arrayBuffer();
    return new Uint8Array(ab);
  }
  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }
  function unfilter(raw, w, h, bpp) {
    const stride = w * bpp;
    const out = new Uint8Array(h * stride);
    let src = 0;
    let prev = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const type = raw[src++];
      const row = new Uint8Array(stride);
      if (src + stride > raw.length) throw new Error("png row overflow");
      if (type === 0) {
        row.set(raw.subarray(src, src + stride));
      } else {
        for (let i = 0; i < stride; i++) {
          const x = raw[src + i];
          const a = i >= bpp ? row[i - bpp] : 0;
          const b = prev[i];
          const c = i >= bpp ? prev[i - bpp] : 0;
          let v = x;
          if (type === 1) v = x + a;
          else if (type === 2) v = x + b;
          else if (type === 3) v = x + (a + b >> 1);
          else if (type === 4) v = x + paeth(a, b, c);
          else throw new Error("png filter " + type);
          row[i] = v & 255;
        }
      }
      out.set(row, y * stride);
      prev = row;
      src += stride;
    }
    return out;
  }
  function toRgba(px, w, h, colorType, bitDepth, palette, trns) {
    if (bitDepth !== 8) throw new Error("png bitDepth " + bitDepth);
    const n = w * h;
    const rgba = new Uint8ClampedArray(n * 4);
    if (colorType === 6) {
      rgba.set(px.subarray(0, n * 4));
      return rgba;
    }
    if (colorType === 2) {
      for (let i = 0, p = 0; i < n; i++, p += 3) {
        const o = i * 4;
        rgba[o] = px[p];
        rgba[o + 1] = px[p + 1];
        rgba[o + 2] = px[p + 2];
        rgba[o + 3] = 255;
      }
      return rgba;
    }
    if (colorType === 0) {
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        const g = px[i];
        rgba[o] = g;
        rgba[o + 1] = g;
        rgba[o + 2] = g;
        rgba[o + 3] = 255;
      }
      return rgba;
    }
    if (colorType === 4) {
      for (let i = 0, p = 0; i < n; i++, p += 2) {
        const o = i * 4;
        const g = px[p];
        rgba[o] = g;
        rgba[o + 1] = g;
        rgba[o + 2] = g;
        rgba[o + 3] = px[p + 1];
      }
      return rgba;
    }
    if (colorType === 3 && palette) {
      for (let i = 0; i < n; i++) {
        const idx = px[i] * 3;
        const o = i * 4;
        rgba[o] = palette[idx];
        rgba[o + 1] = palette[idx + 1];
        rgba[o + 2] = palette[idx + 2];
        rgba[o + 3] = trns && px[i] < trns.length ? trns[px[i]] : 255;
      }
      return rgba;
    }
    throw new Error("png colorType " + colorType);
  }
  async function decodePngRgba(bytes) {
    const b = asU8(bytes);
    if (!isPng(b)) throw new Error("not a PNG");
    let o = 8;
    let w = 0;
    let h = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    let palette = null;
    let trns = null;
    const idats = [];
    while (o + 12 <= b.length) {
      const len = u32be(b, o);
      const type = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);
      const data = b.subarray(o + 8, o + 8 + len);
      if (type === "IHDR") {
        w = u32be(data, 0);
        h = u32be(data, 4);
        bitDepth = data[8];
        colorType = data[9];
        interlace = data[12];
      } else if (type === "PLTE") {
        palette = data;
      } else if (type === "tRNS") {
        trns = data;
      } else if (type === "IDAT") {
        idats.push(data);
      } else if (type === "IEND") {
        break;
      }
      o += 12 + len;
    }
    if (!w || !h) throw new Error("png missing IHDR");
    if (interlace) throw new Error("png interlaced");
    let idatLen = 0;
    for (const c of idats) idatLen += c.length;
    const idat = new Uint8Array(idatLen);
    let p = 0;
    for (const c of idats) {
      idat.set(c, p);
      p += c.length;
    }
    const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
    const raw = await inflateZlib(idat);
    const px = unfilter(raw, w, h, bpp);
    return { rgba: toRgba(px, w, h, colorType, bitDepth, palette, trns), width: w, height: h };
  }
  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    putU32be(out, 0, data.length);
    out[4] = type.charCodeAt(0);
    out[5] = type.charCodeAt(1);
    out[6] = type.charCodeAt(2);
    out[7] = type.charCodeAt(3);
    out.set(data, 8);
    putU32be(out, 8 + data.length, crc32(out, 4, 4 + data.length));
    return out;
  }
  async function encodePngRgba(rgba, w, h) {
    const stride = w * 4;
    const raw = new Uint8Array(h * (stride + 1));
    for (let y = 0; y < h; y++) {
      raw[y * (stride + 1)] = 0;
      raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
    }
    const ihdr = new Uint8Array(13);
    putU32be(ihdr, 0, w);
    putU32be(ihdr, 4, h);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const idat = await deflateZlib(raw);
    const sig = new Uint8Array(PNG_SIG);
    const cIHDR = chunk("IHDR", ihdr);
    const cIDAT = chunk("IDAT", idat);
    const cIEND = chunk("IEND", new Uint8Array(0));
    const out = new Uint8Array(sig.length + cIHDR.length + cIDAT.length + cIEND.length);
    let o = 0;
    out.set(sig, o);
    o += sig.length;
    out.set(cIHDR, o);
    o += cIHDR.length;
    out.set(cIDAT, o);
    o += cIDAT.length;
    out.set(cIEND, o);
    return out;
  }

  // vendor/sfrip/lib/sf-api.js
  var UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  };
  function extractUid(text) {
    if (!text) return null;
    const m = text.match(/sketchfab\.com\/(?:3d-models\/[^/?#]+-|models\/)([a-f0-9]{32})/i) || text.match(/\b([a-f0-9]{32})\b/i);
    return m ? m[1].toLowerCase() : null;
  }
  function browserHeaders(url) {
    const h = { ...UA };
    if (/sketchfab\.com/i.test(url)) {
      h.Referer = "https://sketchfab.com/";
      h.Accept = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";
    }
    return h;
  }
  async function withRetry(fn, attempts = 3, label = "request") {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      if (i) await new Promise((r) => setTimeout(r, 250 * 2 ** (i - 1)));
      try {
        return await fn();
      } catch (e) {
        const msg = e && e.message ? String(e.message) : "";
        if (/^HTTP 4/.test(msg)) throw e;
        lastErr = e;
      }
    }
    throw lastErr || new Error(`${label} failed`);
  }
  async function fetchText(url) {
    return withRetry(async () => {
      const resp = await gmFetch(url, { credentials: "omit", headers: browserHeaders(url) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      return resp.text();
    }, 3, url);
  }
  async function fetchBytes(url) {
    return withRetry(async () => {
      const resp = await gmFetch(url, { credentials: "omit", headers: browserHeaders(url) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      return new Uint8Array(await resp.arrayBuffer());
    }, 3, url);
  }
  async function fetchViewerInfo(uid) {
    const embedUrl = `https://sketchfab.com/models/${uid}/embed`;
    const embedHtml = await fetchText(embedUrl);
    let m = embedHtml.match(
      /id="js-dom-data-prefetched-data"><!--([\s\S]*?)-->/
    );
    if (!m) {
      m = embedHtml.match(
        /js-dom-data-prefetched-data[^>]*>\s*<!--([\s\S]*?)-->/
      );
    }
    if (!m) throw new Error("Could not read public viewer data (private/deleted model?)");
    const raw = m[1].replace(/&#34;/g, '"');
    const data = JSON.parse(raw);
    let key = `/i/models/${uid}`;
    if (!(key in data)) {
      const alt = Object.keys(data).find((k) => k.startsWith(`/i/models/${uid}`));
      if (!alt) throw new Error(`Model ${uid} not in prefetched data`);
      key = alt;
    }
    const info = data[key];
    const listing = data[`/i/models/${uid}/animations?optimized=1`] || data[`/i/models/${uid}/animations`];
    if (listing && Array.isArray(listing.results)) {
      info.options = info.options || {};
      info.options.animationUrls = listing.results.map((r) => ({ uid: r.uid, url: r.url }));
    }
    return { info, embedHtml, prefetched: data };
  }
  function parseViewerMaterials(info) {
    const out = /* @__PURE__ */ new Map();
    const mats = info && info.options && info.options.materials || {};
    for (const [id, mat] of Object.entries(mats)) {
      if (id === "updatedAt" || !mat || typeof mat !== "object") continue;
      const name = mat.name || id;
      const ch = mat.channels || {};
      const getTex = (channel, { requireEnable = true } = {}) => {
        const c = ch[channel];
        if (!c) return null;
        if (requireEnable && !c.enable) return null;
        const t = c.texture;
        if (!t || !t.uid) return null;
        return String(t.uid).toLowerCase();
      };
      const getTexFormat = (channel) => {
        const c = ch[channel];
        const t = c && c.texture;
        return t && t.internalFormat ? String(t.internalFormat).toUpperCase() : "";
      };
      const getFactor = (channel, def) => {
        const c = ch[channel];
        if (!c || c.enable === false) return def;
        const f = c.factor;
        return typeof f === "number" ? f : def;
      };
      const albedo = getTex("AlbedoPBR") || getTex("DiffusePBR") || getTex("AlbedoPBR", { requireEnable: false }) || getTex("DiffusePBR", { requireEnable: false }) || getTex("DiffuseColor");
      const normal = getTex("NormalMap") || getTex("BumpMap") || getTex("NormalMap", { requireEnable: false }) || getTex("BumpMap", { requireEnable: false });
      const metalness = getTex("MetalnessPBR");
      const roughness = getTex("RoughnessPBR");
      const gloss = getTex("GlossinessPBR");
      const specular = getTex("SpecularPBR") || getTex("SpecularF0");
      const ao = getTex("AOPBR") || getTex("CavityPBR");
      const opacityTex = getTex("Opacity") || getTex("AlphaMask");
      const emit = getTex("EmitColor");
      const metalF = getFactor("MetalnessPBR", 0);
      const glossF = getFactor("GlossinessPBR", null);
      const roughF = getFactor("RoughnessPBR", null);
      let roughnessFactor = 0.9;
      if (typeof roughF === "number") roughnessFactor = roughF;
      else if (typeof glossF === "number") roughnessFactor = Math.max(0, Math.min(1, 1 - glossF));
      const opacity = ch.Opacity || {};
      const alphaMask = ch.AlphaMask || {};
      const opacityEnable = !!(opacity.enable || alphaMask.enable);
      const opacityFactor = typeof opacity.factor === "number" ? opacity.factor : 1;
      const opacityType = opacity.type || alphaMask.type || "";
      const albedoFactor = getFactor("AlbedoPBR", 1);
      const clearCoatCh = ch.ClearCoat || {};
      const clearCoatNormalCh = ch.ClearCoatNormalMap || {};
      const clearCoatOn = !!clearCoatCh.enable;
      const clearCoat = clearCoatOn ? {
        factor: typeof clearCoatCh.factor === "number" ? clearCoatCh.factor : 1,
        roughness: getFactor("ClearCoatRoughness", 0),
        textureUid: getTex("ClearCoat"),
        normalTextureUid: getTex("ClearCoatNormalMap"),
        normalFlipY: clearCoatNormalCh.flipY !== false
      } : null;
      const sheenCh = ch.Sheen || {};
      const sheenOn = !!sheenCh.enable;
      const sheenColor = Array.isArray(sheenCh.color) && sheenCh.color.length >= 3 ? sheenCh.color.slice(0, 3) : [1, 1, 1];
      const sheen = sheenOn ? {
        colorFactor: sheenColor,
        roughness: getFactor("SheenRoughness", 0),
        textureUid: getTex("Sheen")
      } : null;
      const transmission = opacityEnable && /refract/i.test(opacityType);
      const invisible = opacityEnable && !transmission && (opacityFactor <= 0.01 || opacityType === "additive" && albedoFactor <= 0.01);
      const skipMesh = invisible;
      const texCoordUnits = {};
      const textureWraps = {};
      const uvTransforms = {};
      for (const c of Object.values(ch)) {
        const t = c && c.texture;
        if (!t || !t.uid) continue;
        const uid = String(t.uid).toLowerCase();
        if (typeof t.texCoordUnit === "number" && !(uid in texCoordUnits)) {
          texCoordUnits[uid] = t.texCoordUnit;
        }
        if (!(uid in textureWraps) && (t.wrapS || t.wrapT)) {
          textureWraps[uid] = { wrapS: t.wrapS || "REPEAT", wrapT: t.wrapT || "REPEAT" };
        }
        const uvt = c.UVTransforms;
        if (uvt && !(uid in uvTransforms)) {
          const scale = Array.isArray(uvt.scale) ? [uvt.scale[0], uvt.scale[1]] : [1, 1];
          const offset = Array.isArray(uvt.offset) ? [uvt.offset[0], uvt.offset[1]] : [0, 0];
          const rotation = typeof uvt.rotation === "number" ? uvt.rotation : 0;
          const identity = scale[0] === 1 && scale[1] === 1 && offset[0] === 0 && offset[1] === 0 && rotation === 0;
          if (!identity) uvTransforms[uid] = { scale, offset, rotation };
        }
      }
      const normalCh = ch.NormalMap || {};
      out.set(name, {
        texCoordUnits,
        textureWraps,
        uvTransforms,
        id,
        name,
        albedoUid: albedo,
        normalUid: normal,
        metalnessUid: metalness,
        roughnessUid: roughness || gloss,
        // GlossinessPBR is inverted roughness. The factor is converted above;
        // consumers of the *texture* must invert it too (see packOrmPixels).
        roughnessIsGloss: !roughness && !!gloss,
        metalnessFormat: getTexFormat("MetalnessPBR"),
        specularUid: specular,
        aoUid: ao,
        opacityUid: opacityTex,
        emitUid: emit,
        metallicFactor: typeof metalF === "number" ? metalF : 0,
        roughnessFactor,
        normalFlipY: normalCh.flipY !== false,
        // Sketchfab default often flipY:true
        /**
         * Sketchfab stores the cull mode, not a sided-ness flag: DISABLE means
         * nothing is culled, BACK means back faces are. Exporting everything
         * double-sided lit the inside of every closed surface and made
         * single-sided authoring intent unrecoverable. Absent means unculled,
         * which is the viewer's own default.
         */
        doubleSided: mat.cullFace ? mat.cullFace === "DISABLE" : true,
        opacityEnable,
        opacityFactor,
        opacityType,
        transmission,
        albedoFactor,
        /**
         * The document ordinal that ties this material to its geometry.
         *
         * Geometry does not name its material: it points at a StateSet, and only
         * ~100 of the 16,617 real StateSets carry an `osg.Material` inline. The
         * rest are identified positionally -- the viewer stamps each material
         * with the 1-based index of its StateSet in document order. Matching on
         * names instead resolved barely a third of the model and silently
         * dropped the rest, including the materials that give a building its
         * colour.
         */
        stateSetID: mat.stateSetID,
        clearCoat,
        sheen,
        skipMesh,
        /**
         * The solid tint to use when no albedo texture exists.
         *
         * Which channel holds it depends on the workflow, and Sketchfab's own
         * viewer decides that one way:
         *
         *   isWorkflowMetalness: function () {
         *     return this.getChannels().MetalnessPBR.getEnable();
         *   }
         *
         * Under metalness the colour lives in AlbedoPBR; under specular it lives
         * in DiffuseColor. Reading DiffuseColor unconditionally meant a metalness
         * material whose author had set AlbedoPBR came out wearing whatever stale
         * default sat in the channel it does not use -- a material named "Black
         * fabric", black in the viewer, arrived as 0.8 grey.
         *
         * The texture side of this file already picks AlbedoPBR first; only the
         * colour did not.
         */
        baseColorFactor: (() => {
          const metalness2 = !!(ch.MetalnessPBR && ch.MetalnessPBR.enable);
          const order = metalness2 ? [ch.AlbedoPBR, ch.DiffuseColor, ch.DiffusePBR] : [ch.DiffuseColor, ch.DiffusePBR, ch.AlbedoPBR];
          for (const chan of order) {
            if (!chan || chan.enable === false) continue;
            const col = chan.color;
            if (Array.isArray(col) && col.length >= 3) {
              return [col[0], col[1], col[2], 1];
            }
          }
          return [1, 1, 1, 1];
        })()
      });
    }
    return out;
  }
  function isBinzFormat(info) {
    try {
      return !!(info.files && info.files[0].p[0].b);
    } catch {
      return false;
    }
  }
  function modelBinzUrls(info) {
    const osgjsUrl = info.files[0].osgjsUrl;
    return [
      osgjsUrl,
      osgjsUrl.replace("file.binz", "model_file.binz"),
      osgjsUrl.replace("file.binz", "model_file_wireframe.binz")
    ];
  }
  function getDiterB(info) {
    return info.files[0].p[0].b;
  }
  async function extractStaticKey(embedHtml, onProgress) {
    const urls = [
      ...new Set(
        [...embedHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
      )
    ].sort((a, b) => {
      const sa = a.includes("/static/builds/web/dist/") ? 0 : 1;
      const sb = b.includes("/static/builds/web/dist/") ? 0 : 1;
      return sa - sb;
    });
    const patterns = [
      /exports\s*\.\s*k\s*:\s*\(\)\s*=>\s*\w+\}\s*;\s*const\s+\w+\s*=\s*"([0-9a-f]{40})(?:\\n)?"/,
      /\{k:\s*\(\)\s*=>\s*\w+\}[^;]*;\s*const\s+\w+\s*=\s*"([0-9a-f]{40})(?:\\n)?"/,
      /a\.d\(t,\{\s*k:\(\)=>\w+\s*\}\)[^"]{0,40}const\s+\w+\s*=\s*"([0-9a-f]{40})(?:\\n)?"/,
      /const\s+\w+\s*=\s*"([0-9a-f]{40})\\n"/,
      /const\s+\w+\s*=\s*"([0-9a-f]{40})"/
    ];
    for (const url of urls) {
      const name = url.split("/").pop();
      let js;
      try {
        if (onProgress) onProgress(`Reading key from ${name}\u2026`);
        js = await fetchText(url);
      } catch {
        continue;
      }
      for (const pat of patterns) {
        const mm = js.match(pat);
        if (mm && /^[0-9a-f]{40}$/i.test(mm[1])) {
          const key = mm[1].toLowerCase();
          try {
            await chrome.storage.local.set({ sf_static_key: key });
          } catch (_) {
          }
          return key;
        }
      }
      if (js.length < 2e5) {
        const hexes = [...js.matchAll(/["']([0-9a-f]{40})(?:\\n)?["']/g)].map(
          (x) => x[1].toLowerCase()
        );
        const uniq = [...new Set(hexes)];
        if (uniq.length === 1) {
          try {
            await chrome.storage.local.set({ sf_static_key: uniq[0] });
          } catch (_) {
          }
          return uniq[0];
        }
      }
    }
    try {
      const stored = await chrome.storage.local.get("sf_static_key");
      if (stored.sf_static_key && /^[0-9a-f]{40}$/i.test(stored.sf_static_key)) {
        return stored.sf_static_key.toLowerCase();
      }
    } catch (_) {
    }
    return DEFAULT_STATIC_KEY;
  }
  function sanitizeName(name) {
    return String(name || "model").replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "model";
  }
  function viewerOrientation(info) {
    const m = info && info.options && info.options.orientation && info.options.orientation.matrix;
    if (!Array.isArray(m) || m.length !== 16 || !m.every((v) => Number.isFinite(v))) return null;
    const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    return m.every((v, i) => Math.abs(v - I[i]) < 1e-9) ? null : m.slice();
  }

  // vendor/sfrip/lib/orm.js
  function baseName(filename) {
    return String(filename || "").split("/").pop().split("?")[0];
  }
  function stemOf(filename) {
    return baseName(filename).replace(/\.[^.]+$/, "").toLowerCase();
  }
  function isPackedOrmName(filename) {
    const stem = stemOf(filename);
    if (!stem) return false;
    const packed = stem.replace(/[^a-z0-9]+/g, "");
    if (/metallicroughness|metalroughness|metalrough|mrao|occlusionroughnessmetallic/.test(packed)) {
      return true;
    }
    return /(?:^|[_-])(orm|rma)(?:[_-]|$)/.test(stem);
  }

  // vendor/sfrip/lib/osg-scene.js
  var IDENTITY_MAT3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  var ZUP_TO_YUP_MAT3 = [1, 0, 0, 0, 0, -1, 0, 1, 0];
  var IDENTITY_MAT4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function mat4Multiply(a, b) {
    const out = new Float64Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
        out[c * 4 + r] = sum;
      }
    }
    return out;
  }
  function isIdentityMat4(m) {
    if (!m) return true;
    for (let i = 0; i < 16; i++) {
      if (Math.abs(m[i] - IDENTITY_MAT4[i]) > 1e-9) return false;
    }
    return true;
  }
  function normalMatrixFromMat4(m) {
    const a = mat3FromMat4(m);
    const det = a[0] * (a[4] * a[8] - a[5] * a[7]) - a[3] * (a[1] * a[8] - a[2] * a[7]) + a[6] * (a[1] * a[5] - a[2] * a[4]);
    if (!isFinite(det) || Math.abs(det) < 1e-12) return a;
    const inv = [
      (a[4] * a[8] - a[5] * a[7]) / det,
      (a[2] * a[7] - a[1] * a[8]) / det,
      (a[1] * a[5] - a[2] * a[4]) / det,
      (a[5] * a[6] - a[3] * a[8]) / det,
      (a[0] * a[8] - a[2] * a[6]) / det,
      (a[2] * a[3] - a[0] * a[5]) / det,
      (a[3] * a[7] - a[4] * a[6]) / det,
      (a[1] * a[6] - a[0] * a[7]) / det,
      (a[0] * a[4] - a[1] * a[3]) / det
    ];
    return mat3Transpose(inv);
  }
  function mat3Multiply(a, b) {
    const out = new Array(9);
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) sum += a[k * 3 + r] * b[c * 3 + k];
        out[c * 3 + r] = sum;
      }
    }
    return out;
  }
  function mat3FromMat4(m) {
    return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  }
  function mat4FromMat3(m) {
    return [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1];
  }
  function mat3Transpose(m) {
    return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  }
  function mat3Invert(m) {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = f * g - d * i;
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    if (!det || !Number.isFinite(det)) return null;
    const s = 1 / det;
    return [
      A * s,
      (c * h - b * i) * s,
      (b * f - c * e) * s,
      B * s,
      (a * i - c * g) * s,
      (c * d - a * f) * s,
      C * s,
      (b * g - a * h) * s,
      (a * e - b * d) * s
    ];
  }
  function isIdentityMat3(m) {
    for (let i = 0; i < 9; i++) {
      if (Math.abs(m[i] - IDENTITY_MAT3[i]) > 1e-6) return false;
    }
    return true;
  }
  function outermostTransform(node, depth) {
    if (!node || typeof node !== "object" || depth > 40) return null;
    if (Array.isArray(node)) {
      for (const v of node) {
        const hit = outermostTransform(v, depth + 1);
        if (hit) return hit;
      }
      return null;
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object" && Array.isArray(value.Matrix) && value.Matrix.length === 16) {
        return value;
      }
      const hit = outermostTransform(value, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  function isAxisWrapper(m) {
    if (!Array.isArray(m) || m.length !== 16) return false;
    const k = m[0];
    if (!(k > 1e-9) || !Number.isFinite(k)) return false;
    const eps = 1e-4 * Math.max(1, k);
    const near = (a, b) => Math.abs(a - b) <= eps;
    if (!near(m[12], 0) || !near(m[13], 0) || !near(m[14], 0)) return false;
    if (!near(m[1], 0) || !near(m[2], 0) || !near(m[4], 0) || !near(m[8], 0)) return false;
    const c = m[5];
    const sn = m[6];
    if (!near(m[10], c) || !near(m[9], -sn)) return false;
    if (!near(Math.hypot(c, sn), k)) return false;
    return !(near(k, 1) && near(c, 1) && near(sn, 0));
  }
  function findAxisConversion(osgjs) {
    const node = outermostTransform(osgjs, 0);
    if (!node || !isAxisWrapper(node.Matrix)) return null;
    return node;
  }
  function axisRotationFor(osgjs) {
    const node = findAxisConversion(osgjs);
    const conv = node ? mat3FromMat4(node.Matrix) : IDENTITY_MAT3;
    return { matrix: mat3Multiply(ZUP_TO_YUP_MAT3, conv), node };
  }

  // vendor/sfrip/lib/osg-codec.js
  function decodeVarint(bytes, count, typeName) {
    const signed = typeName[0] !== "U";
    const result = signed ? new Int32Array(count) : new Uint32Array(count);
    let a = 0;
    let o = 0;
    while (a < count) {
      let s = 0;
      let l = 0;
      do {
        s |= (bytes[o] & 127) << l;
        l += 7;
      } while ((bytes[o++] & 128) !== 0);
      result[a++] = s;
    }
    if (signed) {
      for (let u = 0; u < count; u++) {
        const c = result[u];
        result[u] = c >> 1 ^ -(c & 1);
      }
    }
    return result;
  }
  function deltaDecodeInPlace(arr, startIdx) {
    const start = startIdx || 0;
    let prev = arr[start];
    for (let i = start + 1; i < arr.length; i++) {
      const v = arr[i];
      prev = arr[i] = prev + (v >> 1 ^ -(v & 1));
    }
    return arr;
  }
  function dequantize(encoded, output, bbl, h, itemSize) {
    const count = encoded.length / itemSize;
    for (let i = 0; i < count; i++) {
      const base = i * itemSize;
      for (let j = 0; j < itemSize; j++) {
        output[base + j] = bbl[j] + encoded[base + j] * h[j];
      }
    }
    return output;
  }
  function deinterleave(src, dst, itemSize) {
    const count = src.length / itemSize;
    for (let i = 0; i < count; i++) {
      const base = i * itemSize;
      for (let j = 0; j < itemSize; j++) dst[base + j] = src[i + count * j];
    }
    return dst;
  }
  function prefixSum(arr, itemSize) {
    const n = itemSize || 1;
    for (let i = 1, count = arr.length / n; i < count; i++) {
      const prev = (i - 1) * n;
      const cur = i * n;
      for (let j = 0; j < n; j++) arr[cur + j] += arr[prev + j];
    }
    return arr;
  }
  function quatAccumulate(arr) {
    for (let i = 1, count = arr.length / 4; i < count; i++) {
      const p = 4 * (i - 1);
      const c = 4 * i;
      const ax = arr[p];
      const ay = arr[p + 1];
      const az = arr[p + 2];
      const aw = arr[p + 3];
      const bx = arr[c];
      const by = arr[c + 1];
      const bz = arr[c + 2];
      const bw = arr[c + 3];
      arr[c] = ax * bw + ay * bz - az * by + aw * bx;
      arr[c + 1] = -ax * bz + ay * bw + az * bx + aw * by;
      arr[c + 2] = ax * by - ay * bx + az * bw + aw * bz;
      arr[c + 3] = -ax * bx - ay * by - az * bz + aw * bw;
    }
    return arr;
  }
  function decodeSpherical(encoded, output, itemSize, epsilon, nphi, hasThirdComponent) {
    epsilon = epsilon || 0.25;
    nphi = nphi || 720;
    const PI = 3.14159265359;
    const HALF_ANGLE_STEP = 47938362584151635e-21;
    const cosEps = Math.cos(0.01745329251 * epsilon);
    const dPhi = PI / (nphi - 1);
    const dGamma = 1.57079632679 / (nphi - 1);
    const stride = hasThirdComponent ? 3 : 2;
    const count = encoded.length / stride;
    for (let i = 0; i < count; i++) {
      const outIdx = i * itemSize;
      const inIdx = i * stride;
      let S = encoded[inIdx];
      const x = encoded[inIdx + 1];
      if (itemSize === 4 && !hasThirdComponent) {
        output[outIdx + 3] = S & 1024 ? -1 : 1;
        S &= ~1024;
      }
      const A0 = S * dPhi;
      const R = Math.cos(A0);
      const w = Math.sin(A0);
      const A1 = A0 + dGamma;
      let E = (cosEps - R * Math.cos(A1)) / Math.max(1e-5, w * Math.sin(A1));
      if (E > 1) E = 1;
      else if (E < -1) E = -1;
      const P = 6.28318530718 * x / Math.ceil(PI / Math.max(1e-5, Math.acos(E)));
      const dx = w * Math.cos(P);
      const dy = w * Math.sin(P);
      const dz = R;
      if (hasThirdComponent) {
        const half = HALF_ANGLE_STEP * encoded[inIdx + 2];
        const s = Math.sin(half);
        output[outIdx] = s * dx;
        output[outIdx + 1] = s * dy;
        output[outIdx + 2] = s * dz;
        output[outIdx + 3] = Math.cos(half);
      } else {
        output[outIdx] = dx;
        output[outIdx + 1] = dy;
        output[outIdx + 2] = dz;
      }
    }
    return output;
  }

  // vendor/sfrip/lib/skin.js
  var TYPED_ARRAYS = {
    Float32Array,
    Int32Array,
    Uint32Array,
    Uint16Array,
    Int16Array,
    Uint8Array,
    Int8Array
  };
  var MODE_DEQUANTIZE = 1;
  var MODE_PREPEND_ORIGIN = 4;
  var MODE_SPHERICAL = 8;
  var MODE_PREPEND_TIME = 16;
  var CHANNEL_PATHS = {
    translate: "translation",
    translation: "translation",
    rotate: "rotation",
    rotation: "rotation",
    quaternion: "rotation",
    scale: "scale"
  };
  function readUserData(node) {
    const out = {};
    const values = node && node.UserDataContainer && node.UserDataContainer.Values;
    if (!values) return out;
    for (const v of values) {
      if (!v || v.Name == null) continue;
      const n = Number(v.Value);
      out[v.Name] = v.Value !== "" && Number.isFinite(n) ? n : v.Value;
    }
    return out;
  }
  function stackedTRS(bone) {
    const callbacks = bone.UpdateCallbacks || [];
    let stack = null;
    for (const cb of callbacks) {
      const update = cb && (cb["osgAnimation.UpdateBone"] || cb["osgAnimation.UpdateMatrixTransform"]);
      if (update && update.StackedTransforms) {
        stack = update.StackedTransforms;
        break;
      }
    }
    if (!stack) return decomposeMatrix(bone.Matrix);
    let translation = null;
    let rotation = null;
    let scale = null;
    let unsupported = false;
    for (const entry of stack) {
      const key = Object.keys(entry)[0];
      const v = entry[key];
      if (key === "osgAnimation.StackedTranslate") translation = v.Translate;
      else if (key === "osgAnimation.StackedQuaternion") rotation = v.Quaternion;
      else if (key === "osgAnimation.StackedScale") scale = v.Scale;
      else unsupported = true;
    }
    if (unsupported) return decomposeMatrix(bone.Matrix);
    return {
      translation: translation ? Array.from(translation) : [0, 0, 0],
      rotation: rotation ? Array.from(rotation) : [0, 0, 0, 1],
      scale: scale ? Array.from(scale) : [1, 1, 1]
    };
  }
  function decomposeMatrix(m) {
    if (!m || m.length < 16) {
      return { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] };
    }
    const translation = [m[12], m[13], m[14]];
    let sx = Math.hypot(m[0], m[1], m[2]);
    const sy = Math.hypot(m[4], m[5], m[6]);
    const sz = Math.hypot(m[8], m[9], m[10]);
    const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
    if (det < 0) sx = -sx;
    const r = [
      sx ? m[0] / sx : 0,
      sx ? m[1] / sx : 0,
      sx ? m[2] / sx : 0,
      sy ? m[4] / sy : 0,
      sy ? m[5] / sy : 0,
      sy ? m[6] / sy : 0,
      sz ? m[8] / sz : 0,
      sz ? m[9] / sz : 0,
      sz ? m[10] / sz : 0
    ];
    const trace = r[0] + r[4] + r[8];
    let x;
    let y;
    let z;
    let w;
    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      w = 0.25 * s;
      x = (r[5] - r[7]) / s;
      y = (r[6] - r[2]) / s;
      z = (r[1] - r[3]) / s;
    } else if (r[0] > r[4] && r[0] > r[8]) {
      const s = Math.sqrt(1 + r[0] - r[4] - r[8]) * 2;
      w = (r[5] - r[7]) / s;
      x = 0.25 * s;
      y = (r[3] + r[1]) / s;
      z = (r[6] + r[2]) / s;
    } else if (r[4] > r[8]) {
      const s = Math.sqrt(1 + r[4] - r[0] - r[8]) * 2;
      w = (r[6] - r[2]) / s;
      x = (r[3] + r[1]) / s;
      y = 0.25 * s;
      z = (r[7] + r[5]) / s;
    } else {
      const s = Math.sqrt(1 + r[8] - r[0] - r[4]) * 2;
      w = (r[1] - r[3]) / s;
      x = (r[6] + r[2]) / s;
      y = (r[7] + r[5]) / s;
      z = 0.25 * s;
    }
    return { translation, rotation: [x, y, z, w], scale: [sx, sy, sz] };
  }
  function updateCallbackName(json) {
    for (const cb of json && json.UpdateCallbacks || []) {
      if (!cb || typeof cb !== "object") continue;
      const value = cb[Object.keys(cb)[0]];
      if (value && value.Name) return value.Name;
    }
    return "";
  }
  function collectSkeletons(osgjs, axisNode = null) {
    const skeletons = [];
    const boneByName = /* @__PURE__ */ new Map();
    function readBone(json, skeleton) {
      const bone = {
        name: json.Name || "",
        /**
         * The name animation channels address this bone by.
         *
         * It is usually the bone's own name, but not always: models imported
         * from FBX come back with the update callback carrying a different
         * suffix from the bone node, and channels follow the callback. Matching
         * on the bone name alone silently loses every clip on those models.
         */
        animName: updateCallbackName(json) || json.Name || "",
        json,
        trs: stackedTRS(json),
        invBind: json.InvBindMatrixInSkeletonSpace || null,
        children: [],
        skeleton
      };
      skeleton.bones.push(bone);
      if (bone.name && !boneByName.has(bone.name)) boneByName.set(bone.name, bone);
      for (const child of json.Children || []) {
        if (!child || typeof child !== "object") continue;
        const sub = child["osgAnimation.Bone"] || child["osg.Bone"];
        if (sub) bone.children.push(readBone(sub, skeleton));
      }
      return bone;
    }
    function findRootBones(node, skeleton, depth) {
      if (!node || typeof node !== "object" || depth > 40) return;
      if (Array.isArray(node)) {
        for (const v of node) findRootBones(v, skeleton, depth + 1);
        return;
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === "osgAnimation.Bone" || key === "osg.Bone") {
          skeleton.roots.push(readBone(value, skeleton));
          continue;
        }
        findRootBones(value, skeleton, depth + 1);
      }
    }
    function walk(node, depth, acc) {
      if (!node || typeof node !== "object" || depth > 80) return;
      if (Array.isArray(node)) {
        for (const v of node) walk(v, depth + 1, acc);
        return;
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === "osgAnimation.Bone" || key === "osg.Bone") continue;
        if (key === "osgAnimation.Skeleton" || key === "osg.Skeleton") {
          const worldMatrix = hasMatrix(value) ? mat4Multiply(acc, value.Matrix) : acc;
          const skeleton = { json: value, roots: [], bones: [], worldMatrix };
          skeletons.push(skeleton);
          findRootBones(value.Children || [], skeleton, 0);
          for (const [k, v] of Object.entries(value)) {
            if (k === "Children") continue;
            walk(v, depth + 1, worldMatrix);
          }
          walk(value.Children || [], depth + 1, worldMatrix);
          continue;
        }
        walk(value, depth + 1, hasMatrix(value) ? mat4Multiply(acc, value.Matrix) : acc);
      }
    }
    function hasMatrix(value) {
      if (!value || typeof value !== "object") return false;
      if (!Array.isArray(value.Matrix) || value.Matrix.length !== 16) return false;
      return value !== axisNode;
    }
    walk(osgjs, 0, IDENTITY_MAT4);
    return { skeletons, boneByName };
  }
  function collectAnimations(osgjs) {
    const out = [];
    function walk(node, depth) {
      if (!node || typeof node !== "object" || depth > 80) return;
      if (Array.isArray(node)) {
        for (const v of node) walk(v, depth + 1);
        return;
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === "osgAnimation.Animation") {
          out.push(value);
          continue;
        }
        walk(value, depth + 1);
      }
    }
    walk(osgjs, 0);
    return out;
  }
  function readRaw(bin, def, typeName, count) {
    const offset = def.Offset || 0;
    if (def.Encoding === "varint") {
      return decodeVarint(new Uint8Array(bin, offset), count, typeName);
    }
    const Ctor = TYPED_ARRAYS[typeName];
    if (!Ctor) throw new Error(`Unknown array type: ${typeName}`);
    if (offset % Ctor.BYTES_PER_ELEMENT !== 0) {
      const bytes = new Uint8Array(bin, offset, count * Ctor.BYTES_PER_ELEMENT);
      return new Ctor(bytes.slice().buffer);
    }
    return new Ctor(bin, offset, count);
  }
  function decodeKeyframeArray(bin, part, userData, packed, compressed, itemSize) {
    const encodedItemSize = part.ItemSize || 1;
    const typeName = Object.keys(part.Array)[0];
    const def = part.Array[typeName];
    const size = def.Size;
    const mode = userData.channel_mode || 0;
    const prepend = !!(itemSize === 1 ? mode & MODE_PREPEND_TIME : mode & MODE_PREPEND_ORIGIN);
    const out = new Float32Array((prepend ? size + 1 : size) * itemSize);
    const body = prepend ? out.subarray(itemSize) : out;
    let raw = readRaw(bin, def, typeName, encodedItemSize * size);
    if (itemSize === 4 && mode & MODE_SPHERICAL) {
      if (compressed) raw = deinterleave(raw, new Float32Array(raw.length), encodedItemSize);
      decodeSpherical(raw, body, itemSize, userData.epsilon, userData.nphi, true);
      if (prepend) {
        out[0] = userData.ox || 0;
        out[1] = userData.oy || 0;
        out[2] = userData.oz || 0;
        out[3] = userData.ow == null ? 1 : userData.ow;
        quatAccumulate(out);
      }
      return out;
    }
    if (compressed && itemSize !== 1) deinterleave(raw, body, encodedItemSize);
    else body.set(raw);
    if (packed) {
      if (itemSize === 3 && mode & MODE_DEQUANTIZE) {
        dequantize(
          body,
          body,
          [userData.bx || 0, userData.by || 0, userData.bz || 0],
          [userData.hx || 0, userData.hy || 0, userData.hz || 0],
          itemSize
        );
      }
      if (prepend) {
        if (itemSize === 3) {
          out[0] = userData.ox || 0;
          out[1] = userData.oy || 0;
          out[2] = userData.oz || 0;
        } else {
          out[0] = userData.ot || 0;
        }
        prefixSum(out, itemSize);
      }
    }
    return out;
  }
  function decodeChannelCurve(bin, typeName, channel) {
    const kf = channel && channel.KeyFrames;
    if (!kf || !kf.Time || !kf.Key || !channel.TargetName) return null;
    const isQuat = typeName.indexOf("Quat") !== -1;
    const isFloat = typeName.indexOf("Float") !== -1;
    const itemSize = isQuat ? 4 : isFloat ? 1 : 3;
    const path = isFloat ? "weights" : CHANNEL_PATHS[String(channel.Name || "").toLowerCase()];
    if (!path) return null;
    const compressed = typeName.indexOf("Compressed") !== -1;
    const packed = typeName.indexOf("Packed") !== -1;
    const userData = readUserData(channel);
    const times = decodeKeyframeArray(bin, kf.Time, userData, packed, false, 1);
    const values = decodeKeyframeArray(bin, kf.Key, userData, packed, compressed, itemSize);
    if (!times.length || values.length < times.length * itemSize) return null;
    if (isQuat) normalizeQuaternions(values);
    return { target: channel.TargetName, path, times, values, itemSize };
  }
  function stripNonIncreasingKeys(times, values, itemSize) {
    let repeats = false;
    for (let i = 1; i < times.length; i++) {
      if (times[i] <= times[i - 1]) {
        repeats = true;
        break;
      }
    }
    if (!repeats) return { times, values, dropped: 0 };
    const outTimes = [];
    const outValues = [];
    for (let i = 0; i < times.length; i++) {
      if (outTimes.length && times[i] <= outTimes[outTimes.length - 1]) {
        const base = outValues.length - itemSize;
        for (let c = 0; c < itemSize; c++) outValues[base + c] = values[i * itemSize + c];
        continue;
      }
      outTimes.push(times[i]);
      for (let c = 0; c < itemSize; c++) outValues.push(values[i * itemSize + c]);
    }
    return {
      times: Float32Array.from(outTimes),
      values: Float32Array.from(outValues),
      dropped: times.length - outTimes.length
    };
  }
  function normalizeQuaternions(values) {
    for (let i = 0; i < values.length; i += 4) {
      const len = Math.hypot(values[i], values[i + 1], values[i + 2], values[i + 3]);
      if (!len) {
        values[i] = 0;
        values[i + 1] = 0;
        values[i + 2] = 0;
        values[i + 3] = 1;
        continue;
      }
      values[i] /= len;
      values[i + 1] /= len;
      values[i + 2] /= len;
      values[i + 3] /= len;
    }
    return values;
  }

  // vendor/sfrip/lib/osgjs2gltf.js
  function concatBytes(chunks) {
    let len = 0;
    for (const c of chunks) len += c.length;
    const out = new Uint8Array(len);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  }
  function pad4(bytes, fill = 0) {
    const n = Math.ceil(bytes.length / 4) * 4;
    if (n === bytes.length) return bytes;
    const out = new Uint8Array(n);
    out.fill(fill);
    out.set(bytes);
    return out;
  }
  function typedToBytes(buf) {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  function applyPlacement(result, m) {
    if (!m || isIdentityMat4(m)) return;
    const nm = normalMatrixFromMat4(m);
    const pos = result.attributes.POSITION;
    if (pos && pos.data && (pos.itemSize || 0) >= 3) {
      const d = pos.data;
      const stride = pos.itemSize;
      for (let i = 0; i < d.length; i += stride) {
        const x = d[i];
        const y = d[i + 1];
        const z = d[i + 2];
        d[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
        d[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        d[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      }
    }
    for (const key of ["NORMAL", "TANGENT"]) {
      const attr = result.attributes[key];
      if (!attr || !attr.data || (attr.itemSize || 0) < 3) continue;
      const d = attr.data;
      const stride = attr.itemSize;
      for (let i = 0; i < d.length; i += stride) {
        const x = d[i];
        const y = d[i + 1];
        const z = d[i + 2];
        let nx = nm[0] * x + nm[3] * y + nm[6] * z;
        let ny = nm[1] * x + nm[4] * y + nm[7] * z;
        let nz = nm[2] * x + nm[5] * y + nm[8] * z;
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-12) {
          nx /= len;
          ny /= len;
          nz /= len;
        }
        d[i] = nx;
        d[i + 1] = ny;
        d[i + 2] = nz;
      }
    }
  }
  function applyAxisRotation(result, m) {
    if (!m || isIdentityMat3(m)) return;
    for (const key of ["POSITION", "NORMAL", "TANGENT"]) {
      const attr = result.attributes[key];
      if (!attr || !attr.data || (attr.itemSize || 0) < 3) continue;
      const isDirection = key !== "POSITION";
      const d = attr.data;
      const stride = attr.itemSize;
      for (let i = 0; i < d.length; i += stride) {
        const x = d[i];
        const y = d[i + 1];
        const z = d[i + 2];
        let nx = m[0] * x + m[3] * y + m[6] * z;
        let ny = m[1] * x + m[4] * y + m[7] * z;
        let nz = m[2] * x + m[5] * y + m[8] * z;
        if (isDirection) {
          const len = Math.hypot(nx, ny, nz);
          if (len > 1e-12) {
            nx /= len;
            ny /= len;
            nz /= len;
          }
        }
        d[i] = nx;
        d[i + 1] = ny;
        d[i + 2] = nz;
      }
    }
  }
  function implicitDecode(encoded, output, startIdx, useExpected) {
    let r = encoded[2];
    const maskLen = encoded[1];
    const headerLen = 3;
    const maskView = encoded.subarray(headerLen, maskLen + headerLen);
    const masks = new Uint32Array(maskView.buffer, maskView.byteOffset, maskLen);
    let idx = startIdx;
    const padBits = maskLen * 32 - output.length;
    for (let u = 0; u < maskLen; u++) {
      const c = masks[u];
      let h = u * 32;
      const dStart = u === maskLen - 1 ? padBits : 0;
      for (let d = dStart; d < 32; d++, h++) {
        if (h >= output.length) break;
        if (c & -2147483648 >>> d) {
          output[h] = encoded[idx++];
        } else {
          output[h] = useExpected ? r : r++;
        }
      }
    }
    return output;
  }
  function expectedRenumber(arr, state) {
    let n = state[0];
    for (let a = 0; a < arr.length; a++) {
      const o = n - arr[a];
      arr[a] = o;
      if (n <= o) n = o + 1;
    }
    state[0] = n;
    return arr;
  }
  function widenIndices(arr) {
    if (arr instanceof Uint32Array || arr instanceof Int32Array) return arr;
    return Int32Array.from(arr);
  }
  function triStripToTriangles(indices) {
    if (indices.length < 3) return new Uint32Array(0);
    const tris = [];
    for (let i = 0; i < indices.length - 2; i++) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      if (a === b || b === c || a === c) continue;
      if (i % 2 === 0) {
        tris.push(a, b, c);
      } else {
        tris.push(b, a, c);
      }
    }
    return new Uint32Array(tris);
  }
  function looseTrianglesToTriangles(indices) {
    const tris = [];
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      if (a === b || b === c || a === c) continue;
      tris.push(a, b, c);
    }
    return new Uint32Array(tris);
  }
  function parallelogramPredict(data, itemSize, stripIndices) {
    const vertCount = data.length / itemSize;
    const visited = new Uint8Array(vertCount);
    const numStrip = stripIndices.length - 1;
    visited[stripIndices[0]] = 1;
    visited[stripIndices[1]] = 1;
    visited[stripIndices[2]] = 1;
    for (let i = 2; i < numStrip; i++) {
      const a = stripIndices[i - 2];
      const b = stripIndices[i - 1];
      const c = stripIndices[i];
      const d = stripIndices[i + 1];
      if (visited[d] !== 1) {
        visited[d] = 1;
        const ai = a * itemSize;
        const bi = b * itemSize;
        const ci = c * itemSize;
        const di = d * itemSize;
        for (let j = 0; j < itemSize; j++) {
          data[di + j] = data[di + j] + data[bi + j] + data[ci + j] - data[ai + j];
        }
      }
    }
    return data;
  }
  function asArrayBuffer(src) {
    if (!src) return null;
    if (src instanceof ArrayBuffer) return src;
    if (src.buffer instanceof ArrayBuffer) {
      if (typeof src.byteOffset === "number" && typeof src.byteLength === "number" && !(src instanceof ArrayBuffer)) {
        return src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength);
      }
      return src.buffer;
    }
    if (src instanceof Uint8Array) return src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength);
    return src;
  }
  function readBufferArray(binData, vb, typeName) {
    const offset = vb.Offset || 0;
    const size = vb.Size;
    const itemSize = vb.ItemSize || 1;
    if (vb.Encoding === "varint") {
      return decodeVarint(new Uint8Array(binData, offset), size * itemSize, typeName);
    }
    const types = {
      Float32Array,
      Int32Array,
      Uint32Array,
      Uint16Array,
      Uint8Array,
      Int16Array
    };
    const TypedArr = types[typeName];
    if (!TypedArr) throw new Error(`Unknown type: ${typeName}`);
    return new TypedArr(binData, offset, size * itemSize);
  }
  function colorVaries(data, itemSize) {
    const stride = itemSize || 4;
    if (!data || data.length < stride * 2) return false;
    for (let i = stride; i < data.length; i += stride) {
      for (let c = 0; c < stride; c++) {
        if (data[i + c] !== data[c]) return true;
      }
    }
    return false;
  }
  function khrTextureTransform(t) {
    const scale = t.scale || [1, 1];
    const offset = t.offset || [0, 0];
    const rotation = t.rotation || 0;
    const ext = {};
    if (offset[0] !== 0 || offset[1] !== 0) ext.offset = [offset[0], offset[1]];
    if (rotation !== 0) ext.rotation = rotation;
    if (scale[0] !== 1 || scale[1] !== 1) ext.scale = [scale[0], scale[1]];
    const exact = rotation === 0 || scale[0] === scale[1];
    return { ext, exact };
  }
  function texCoordsForGeometry(map, uvUnits) {
    const out = {};
    const units = map && map.uvUnits;
    if (!units || !Array.isArray(uvUnits) || uvUnits.length < 2) return out;
    for (const [role, unit] of Object.entries(units)) {
      if (typeof unit !== "number") continue;
      const i = uvUnits.indexOf(unit);
      if (i > 0) out[role] = i;
    }
    return out;
  }
  var ARRAY_BUFFER = 34962;
  var ELEMENT_ARRAY_BUFFER = 34963;
  function uvQuantBox(meta, uvSuffix) {
    const own = `uv_${uvSuffix}_`;
    if (meta[own + "bbl_x"] !== void 0) {
      return {
        bbl: [meta[own + "bbl_x"], meta[own + "bbl_y"]],
        h: [meta[own + "h_x"], meta[own + "h_y"]]
      };
    }
    let donor = null;
    for (const key of Object.keys(meta)) {
      const m = /^uv_(\d+)_bbl_x$/.exec(key);
      if (!m) continue;
      const n = Number(m[1]);
      if (donor === null || n < donor) donor = n;
    }
    if (donor === null) return null;
    const p = `uv_${donor}_`;
    return {
      bbl: [meta[p + "bbl_x"], meta[p + "bbl_y"]],
      h: [meta[p + "h_x"], meta[p + "h_y"]]
    };
  }
  function processGeometry(geom, polyBin, wireBin, sharedState, axisRotation, placement, opts = {}) {
    const userData = sharedState || {};
    const result = { name: geom.Name || "unnamed", attributes: {}, indices: null, mode: "TRIANGLES", material: null };
    const meta = {};
    const udc = geom.UserDataContainer;
    if (udc && udc.Values) {
      for (const v of udc.Values) {
        const val = v.Value;
        meta[v.Name] = isNaN(Number(val)) ? val : Number(val);
      }
    }
    const primList = geom.PrimitiveSetList || [];
    const DELTA = 1, EXPECTED = 2, IMPLICIT = 4, TRIANGLE_ATTR = 16;
    const triMode = meta.triangle_mode || 0;
    const hasTriAttr = (meta.attributes || 0) & TRIANGLE_ATTR;
    const triChunks = [];
    const expState = [0];
    const lineChunks = [];
    for (const prim of primList) {
      const drawType = Object.keys(prim)[0];
      const draw = prim[drawType];
      const idxInfo = draw.Indices;
      if (draw.Mode === "POINTS") {
        result.mode = "POINTS";
        result.pointCount = (result.pointCount || 0) + (draw.Count || 0);
        continue;
      }
      if (!idxInfo) continue;
      const isLines = draw.Mode === "LINES";
      if (!isLines && draw.Mode !== "TRIANGLE_STRIP" && draw.Mode !== "TRIANGLES") continue;
      const arrInfo = idxInfo.Array;
      const arrType = Object.keys(arrInfo)[0];
      const arrDef = arrInfo[arrType];
      const isWireframe = arrDef.File && arrDef.File.includes("wireframe");
      if (isLines && isWireframe) continue;
      const binSrc = isWireframe ? wireBin : polyBin;
      if (!binSrc) continue;
      if (isLines) {
        result.mode = "LINES";
        const li = widenIndices(
          readBufferArray(asArrayBuffer(binSrc), { ...arrDef, ItemSize: 1 }, arrType)
        );
        lineChunks.push(li);
        continue;
      }
      const isStrip = draw.Mode === "TRIANGLE_STRIP";
      let indices = widenIndices(readBufferArray(asArrayBuffer(binSrc), { ...arrDef, ItemSize: 1 }, arrType));
      if (!hasTriAttr) {
        if (isStrip) {
          result.stripIndices = indices;
          triChunks.push(triStripToTriangles(indices));
        } else triChunks.push(looseTrianglesToTriangles(indices));
        continue;
      }
      let out = indices, startIdx = 0;
      if (triMode & IMPLICIT && isStrip) {
        startIdx = 3 + indices[1];
        out = new Int32Array(indices[0]);
      }
      if (triMode & DELTA) deltaDecodeInPlace(indices, startIdx);
      if (triMode & IMPLICIT && isStrip) implicitDecode(indices, out, startIdx, !!(triMode & EXPECTED));
      if (triMode & EXPECTED) expectedRenumber(out, expState);
      if (isStrip) {
        result.stripIndices = out;
        triChunks.push(triStripToTriangles(out));
      } else {
        triChunks.push(looseTrianglesToTriangles(out));
      }
    }
    if (result.mode === "LINES") {
      let n = 0;
      for (const c of lineChunks) n += c.length;
      if (n) {
        const merged = new Uint32Array(n);
        let o = 0;
        for (const c of lineChunks) {
          merged.set(c, o);
          o += c.length;
        }
        result.indices = merged;
      }
    }
    let total = 0;
    for (const c of triChunks) total += c.length;
    if (total) {
      const merged = new Uint32Array(total);
      let o = 0;
      for (const c of triChunks) {
        merged.set(c, o);
        o += c.length;
      }
      result.indices = merged;
      result.mode = "TRIANGLES";
    }
    if (!result.indices && result.mode !== "POINTS" && !opts.attributesOnly) return result;
    const vaList = geom.VertexAttributeList || {};
    for (const [attrName, attrDef] of Object.entries(vaList)) {
      const arrInfo = attrDef.Array;
      const arrType = Object.keys(arrInfo)[0];
      const arrDef = arrInfo[arrType];
      const isWireframe = arrDef.File && arrDef.File.includes("wireframe");
      const binSrc = isWireframe ? wireBin : polyBin;
      if (!binSrc) continue;
      const itemSize = attrDef.ItemSize || 1;
      let data = readBufferArray(asArrayBuffer(binSrc), { ...arrDef, ItemSize: itemSize }, arrType);
      const count = arrDef.Size;
      const attrFlags = meta.attributes || 0;
      if (attrName === "Vertex") {
        const vtxMode = meta.vertex_mode || 0;
        if (vtxMode & 2 && result.stripIndices) {
          parallelogramPredict(data, itemSize, result.stripIndices);
        }
        if (attrFlags & 1 || vtxMode & 1) {
          const prefix = "vtx_";
          if (meta[prefix + "bbl_x"] !== void 0) {
            const bbl = [meta[prefix + "bbl_x"], meta[prefix + "bbl_y"]];
            const h = [meta[prefix + "h_x"], meta[prefix + "h_y"]];
            if (itemSize === 3) {
              bbl.push(meta[prefix + "bbl_z"]);
              h.push(meta[prefix + "h_z"]);
            }
            const floats = new Float32Array(data.length);
            dequantize(data, floats, bbl, h, itemSize);
            data = floats;
          }
        }
        result.attributes.POSITION = { data, itemSize, count };
      } else if (attrName === "Normal") {
        if (attrFlags & 2) {
          const floats = new Float32Array(count * 3);
          decodeSpherical(data, floats, 3, meta.epsilon, meta.nphi);
          result.attributes.NORMAL = { data: floats, itemSize: 3, count };
        } else {
          result.attributes.NORMAL = { data, itemSize, count };
        }
      } else if (attrName === "Tangent") {
        if (attrFlags & 32) {
          const floats = new Float32Array(count * 4);
          decodeSpherical(data, floats, 4, meta.epsilon, meta.nphi);
          result.attributes.TANGENT = { data: floats, itemSize: 4, count };
        }
      } else if (attrName.startsWith("TexCoord")) {
        const uvSuffix = attrName.replace("TexCoord", "");
        const uvMode = meta[`uv_${uvSuffix}_mode`] !== void 0 ? meta[`uv_${uvSuffix}_mode`] : meta.vertex_mode || 0;
        if (uvMode & 2 && result.stripIndices) {
          parallelogramPredict(data, itemSize, result.stripIndices);
        }
        const box = uvQuantBox(meta, uvSuffix);
        if (box && (attrFlags & 4 || uvMode & 1)) {
          const floats = new Float32Array(data.length);
          dequantize(data, floats, box.bbl, box.h, itemSize);
          data = floats;
        } else if (!(data instanceof Float32Array)) {
          data = new Float32Array(data);
        }
        let anyNonZero = false;
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 1e-6 && data[i] < 1 - 1e-6) {
            anyNonZero = true;
            break;
          }
          if (data[i] > 1e-6) {
            anyNonZero = true;
            break;
          }
        }
        if (!anyNonZero) {
          let maxAbs = 0;
          for (let i = 0; i < data.length; i++) {
            const a = Math.abs(data[i]);
            if (a > maxAbs) maxAbs = a;
          }
          if (maxAbs < 1e-6) {
            continue;
          }
        }
        result.attributes[`_TC_${uvSuffix}`] = { data, itemSize: itemSize || 2, count };
      } else if (attrName === "Color") {
        if (result.mode === "POINTS" || colorVaries(data, itemSize)) {
          const isFloat = data instanceof Float32Array;
          result.attributes.COLOR_0 = {
            data,
            itemSize,
            count,
            componentType: isFloat ? 5126 : 5121,
            normalized: !isFloat
          };
        }
      }
    }
    const stateSet = geom.StateSet;
    if (stateSet && stateSet["osg.StateSet"]) {
      const ss = stateSet["osg.StateSet"];
      if (ss.Name) result.stateSetName = String(ss.Name);
      const attrList = ss.AttributeList || [];
      for (const attr of attrList) {
        if (attr["osg.Material"]) {
          result.material = attr["osg.Material"];
          if (attr["osg.Material"].Name) {
            result.materialName = String(attr["osg.Material"].Name);
          }
        }
      }
      if (!result.materialName && result.stateSetName) {
        result.materialName = result.stateSetName;
      }
      const texFiles = [];
      const tal = ss.TextureAttributeList || [];
      for (const unit of tal) {
        const entries = Array.isArray(unit) ? unit : [unit];
        for (const entry of entries) {
          if (!entry || typeof entry !== "object") continue;
          const tex = entry["osg.Texture"] || entry["osg.Texture2D"];
          if (tex && tex.File) texFiles.push(String(tex.File));
        }
      }
      if (texFiles.length) result.textureFiles = texFiles;
    }
    if (!result.materialName && result.name) {
      const m = String(result.name).match(/MI_[A-Za-z0-9_]+/i);
      if (m) result.materialName = m[0].replace(/_\d+$/, "");
    }
    applyPlacement(result, placement);
    if (!opts.skipAxis) applyAxisRotation(result, axisRotation);
    return result;
  }
  function textureBasename(filename) {
    let base = String(filename || "").split("/").pop();
    base = base.replace(/^[a-f0-9]{32}_/i, "");
    return base;
  }
  function classifyTextureName(filename) {
    const base = textureBasename(filename).toLowerCase();
    if (!base) return "unknown";
    const stem = base.replace(/\.[^.]+$/, "");
    const packed = stem.replace(/[^a-z0-9]+/g, "");
    if (/normalmap|normal_map|bumpmap|bump_map/.test(packed) || /(?:^|_)(nrm|norm)(?:_|$)/.test(stem)) {
      return "normal";
    }
    if (/specularmap|specmap|spec_map/.test(packed) || /(?:^|_)(spec|specular)(?:_|$)/.test(stem)) {
      return "specular";
    }
    if (/metallicroughness|metalrough|mrao/.test(packed) || /(?:^|_)(orm)(?:_|$)/.test(stem)) {
      return "metalrough";
    }
    if (/(?:^|_)(rough|roughness|metal|metallic)(?:_|$)/.test(stem)) return "metalrough";
    if (/basecolor|base_color|albedo|diffuse/.test(packed)) return "albedo";
    if (/emissive|emission/.test(packed) || /(?:^|_)(emit|glow)(?:_|$)/.test(stem)) return "emissive";
    if (/ambientocclusion|occlusion/.test(packed) || /(?:^|_)(ao)(?:_|$)/.test(stem)) return "occlusion";
    if (/lightmap/.test(packed) || /(?:^|_)(lm)(?:_|$)/.test(stem)) return "lightmap";
    if (/opacity|alphamask|cutout|glowmask/.test(packed)) return "alpha";
    if (/^[a-z][a-z0-9]*n$/i.test(stem) && /[aeiou]/.test(stem.slice(0, -1))) {
      return "normal";
    }
    if (/_(orm|mrao|metallicroughness|metalrough)$/i.test(stem)) return "metalrough";
    if (/_(normal|nrm|norm)$/i.test(stem) || /_n$/i.test(stem)) return "normal";
    if (/_(diffuse|albedo|basecolor|base_color|col)$/i.test(stem) || /_d$/i.test(stem)) return "albedo";
    if (/_(emissive|emission|emit|glow)$/i.test(stem) || /_e$/i.test(stem)) return "emissive";
    if (/_(ao|occlusion|ambientocclusion)$/i.test(stem) || /_ao$/i.test(stem)) return "occlusion";
    if (/_(lightmap|lm)$/i.test(stem) || /lm_final/i.test(stem)) return "lightmap";
    if (/_(opacity|alpha|mask|cutout|glowmask)$/i.test(stem) || /_(an|m)$/i.test(stem)) return "alpha";
    if (/_s$/i.test(stem) || /_(spec|specular)$/i.test(stem)) return "specular";
    const norm = `_${stem.replace(/[^a-z0-9]+/g, "_")}_`;
    const has = (...words) => words.some((w) => norm.includes(`_${w}_`));
    if (has("lightmap", "lm")) return "lightmap";
    if (has("ao", "occlusion", "cavity")) return "occlusion";
    if (has("normal", "nrm", "norm")) return "normal";
    if (has("metal", "metallic", "rough", "roughness", "orm", "mrao")) return "metalrough";
    if (has("emissive", "emiss", "emit", "glow")) return "emissive";
    if (has("albedo", "diffuse", "basecolor", "atlas", "diff")) return "albedo";
    if (has("spec", "specular")) return "specular";
    return "unknown";
  }
  function pbrFactors(map) {
    const metalF = map && typeof map.metallicFactor === "number" ? map.metallicFactor : 0;
    const roughF = map && typeof map.roughnessFactor === "number" ? map.roughnessFactor : 0.9;
    if (map && map.metalness && map.ormPacked) {
      return { metallicFactor: 1, roughnessFactor: 1, bindTexture: true };
    }
    return { metallicFactor: metalF, roughnessFactor: roughF, bindTexture: false };
  }
  function identityKey(name) {
    let s = String(name || "");
    s = s.split("/").pop();
    s = s.replace(/^[a-f0-9]{32}_/i, "");
    s = s.replace(/\.[^.]+$/, "");
    s = s.replace(/^MI_/i, "").replace(/^T_/i, "").replace(/^TX_/i, "");
    s = s.replace(/_(d|n|orm|mrao|e|ao|s|m|an|normal|diffuse|albedo|emissive|glowmask|mask|opacity)$/i, "");
    s = s.replace(/_(\d)$/, "");
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }
  function mimeFromBytes(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    if (b.length < 12) return null;
    if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) return "image/png";
    if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
    if (b[0] === 71 && b[1] === 73 && b[2] === 70) return "image/gif";
    if (b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80) return "image/webp";
    return null;
  }
  function mimeFromName(filename) {
    const base = String(filename || "").split("/").pop().toLowerCase();
    if (base.endsWith(".png")) return "image/png";
    if (base.endsWith(".webp")) return "image/webp";
    if (base.endsWith(".gif")) return "image/gif";
    return "image/jpeg";
  }
  function findTextureBytes(filename, textureFiles) {
    if (!filename || !textureFiles) return null;
    if (textureFiles[filename]) return { data: textureFiles[filename], key: filename };
    const base = filename.split("/").pop();
    if (textureFiles[base]) return { data: textureFiles[base], key: base };
    const bare = textureBasename(filename);
    if (textureFiles[bare]) return { data: textureFiles[bare], key: bare };
    if (textureFiles["textures/" + bare]) {
      return { data: textureFiles["textures/" + bare], key: "textures/" + bare };
    }
    const uidM = String(filename).match(/([a-f0-9]{32})/i);
    if (uidM) {
      const uid = uidM[1].toLowerCase();
      for (const [k, v] of Object.entries(textureFiles)) {
        if (k.toLowerCase().includes(uid)) return { data: v, key: k };
      }
    }
    const stem = bare.replace(/\.[^.]+$/, "").toLowerCase();
    const id = identityKey(bare);
    for (const [k, v] of Object.entries(textureFiles)) {
      const kb = textureBasename(k).toLowerCase();
      if (kb === bare.toLowerCase() || kb === stem + ".png" || kb === stem + ".jpg") {
        return { data: v, key: k };
      }
      if (id && identityKey(kb) === id && classifyTextureName(kb) === classifyTextureName(bare)) {
        return { data: v, key: k };
      }
    }
    return null;
  }
  function mapTexturesForName(matName, geomName, textureList) {
    const list = textureList || [];
    if (!list.length) return null;
    const targets = [];
    if (matName) targets.push(identityKey(matName));
    if (geomName) {
      const g = String(geomName);
      const mi = g.match(/MI_[A-Za-z0-9_]+/i);
      if (mi) targets.push(identityKey(mi[0]));
      targets.push(identityKey(g));
    }
    const uniqTargets = [...new Set(targets.filter(Boolean))];
    const scored = list.map((t) => {
      const base = textureBasename(t.name);
      const tid = identityKey(base);
      let score = 0;
      for (const tgt of uniqTargets) {
        if (!tgt || !tid) continue;
        if (tid === tgt) score = Math.max(score, 100);
        else if (tid.endsWith(tgt) || tgt.endsWith(tid)) score = Math.max(score, 80);
        else if (tid.includes(tgt) || tgt.includes(tid)) score = Math.max(score, 60);
        else {
          const tt = new Set(tgt.split("_").filter((x) => x.length > 2 && !/^\d+$/.test(x)));
          const ti = tid.split("_").filter((x) => x.length > 2 && !/^\d+$/.test(x));
          let hit = 0;
          for (const x of ti) if (tt.has(x)) hit++;
          if (hit >= 2) score = Math.max(score, 40 + hit * 5);
          else if (hit === 1 && ti.length <= 3) score = Math.max(score, 25);
        }
      }
      return { base, cls: classifyTextureName(base), score, name: t.name };
    });
    const bestByClass = {};
    for (const s of scored) {
      const need = s.cls === "albedo" || s.cls === "unknown" ? 25 : 55;
      if (s.score < need) continue;
      const prev = bestByClass[s.cls];
      if (!prev || s.score > prev.score) bestByClass[s.cls] = s;
    }
    if (!Object.keys(bestByClass).length) return null;
    const map = {};
    if (bestByClass.albedo) map.albedo = bestByClass.albedo.base;
    if (bestByClass.normal) map.normal = bestByClass.normal.base;
    if (bestByClass.metalrough) map.metalness = bestByClass.metalrough.base;
    if (bestByClass.emissive) map.emissive = bestByClass.emissive.base;
    if (bestByClass.occlusion) map.occlusion = bestByClass.occlusion.base;
    if (bestByClass.alpha && bestByClass.alpha.score >= 80) {
      const n = bestByClass.alpha.base.toLowerCase();
      if (/opacity|cutout|alphamask|alpha_mask|_opacity/.test(n)) {
        map.alpha = bestByClass.alpha.base;
      }
    }
    if (!map.albedo && bestByClass.unknown && bestByClass.unknown.score >= 60) {
      map.albedo = bestByClass.unknown.base;
    }
    return Object.keys(map).length ? map : null;
  }
  function resolveUidToBase(uid, textureList) {
    if (!uid) return null;
    const u = String(uid).toLowerCase();
    for (const t of textureList || []) {
      if (t.uid && String(t.uid).toLowerCase() === u) return textureBasename(t.name);
      if (t.imageUids && t.imageUids.some((id) => String(id).toLowerCase() === u)) {
        return textureBasename(t.name);
      }
      if (t.name && t.name.toLowerCase().includes(u)) return textureBasename(t.name);
    }
    return null;
  }
  function texDims(t) {
    if (!t) return { w: 0, h: 0 };
    if ((t.width || 0) > 0 && (t.height || 0) > 0) {
      return { w: t.width, h: t.height };
    }
    const d = t.data;
    if (d instanceof Uint8Array && d.length >= 24 && d[0] === 137 && d[1] === 80) {
      const w = (d[16] << 24 | d[17] << 16 | d[18] << 8 | d[19]) >>> 0;
      const h = (d[20] << 24 | d[21] << 16 | d[22] << 8 | d[23]) >>> 0;
      return { w, h };
    }
    return { w: 0, h: 0 };
  }
  function texMetaByName(textureList, name) {
    if (!name) return null;
    const b = textureBasename(name).toLowerCase();
    for (const t of textureList || []) {
      if (textureBasename(t.name).toLowerCase() === b) return t;
    }
    return null;
  }
  function chooseAlbedoName(albedoName, specularName, textureList) {
    if (!specularName) return albedoName || null;
    const cls = classifyTextureName(specularName);
    if (cls === "normal" || cls === "metalrough" || cls === "specular" || cls === "alpha") {
      return albedoName || null;
    }
    const a = texMetaByName(textureList, albedoName);
    const s = texMetaByName(textureList, specularName);
    const aa = (() => {
      const d = texDims(a);
      return d.w * d.h;
    })();
    const sa = (() => {
      const d = texDims(s);
      return d.w * d.h;
    })();
    const weak = !albedoName || aa < 512 * 512;
    if (weak && sa > Math.max(aa, 1) * 2) return specularName;
    return albedoName || null;
  }
  function shouldSkipUntexturedShell(spec, matName, geomName, mode) {
    if (!spec) return false;
    if (spec.skipMesh) return true;
    if (spec.albedoUid || spec.opacityUid) return false;
    if (mode === "LINES" || mode === "POINTS") return false;
    return /hair|line|brow|lash/i.test(String(matName || geomName || ""));
  }
  function findViewerSpec(vm, matName, geomName, stateSetOrdinal) {
    if (!vm) return null;
    if (typeof stateSetOrdinal === "number" && stateSetOrdinal > 0) {
      const byOrdinal = /* @__PURE__ */ new Map();
      vm.forEach((spec) => {
        if (typeof spec.stateSetID === "number") byOrdinal.set(spec.stateSetID, spec);
      });
      for (const delta of [1, 0, 2, -1]) {
        const spec = byOrdinal.get(stateSetOrdinal + delta);
        if (!spec) continue;
        if (!matName || sameMaterialFamily(matName, spec.name)) {
          return { spec, via: "stateset-ordinal" };
        }
      }
    }
    if (matName && vm.has(matName)) return { spec: vm.get(matName), via: "viewer-uid" };
    const keys = [];
    vm.forEach((_, k) => keys.push(k));
    const tryNames = [matName, geomName].filter(Boolean);
    for (const raw of tryNames) {
      const id = identityKey(raw);
      if (!id || id === "unnamed") continue;
      for (const k of keys) {
        if (identityKey(k) === id) return { spec: vm.get(k), via: "stateset" };
      }
    }
    return null;
  }
  function sameMaterialFamily(a, b) {
    const stem = (n) => String(n || "").replace(/_\d+$/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const sa = stem(a);
    const sb = stem(b);
    if (!sa || !sb) return true;
    return sa === sb;
  }
  function sampleLum(rgba, w, h, u, v) {
    let x = Math.round(u * (w - 1));
    let y = Math.round(v * (h - 1));
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x >= w) x = w - 1;
    if (y >= h) y = h - 1;
    const o = (y * w + x) * 4;
    return rgba[o] * 77 + rgba[o + 1] * 150 + rgba[o + 2] * 29 >> 8;
  }
  async function bakeOpacityIntoAlbedo(albedoBytes, alphaBytes) {
    const a = await decodePngRgba(albedoBytes);
    const m = await decodePngRgba(alphaBytes);
    if (!a.width || !m.width) return null;
    const out = new Uint8ClampedArray(a.rgba);
    const same = a.width === m.width && a.height === m.height;
    let hasTransparency = false;
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        const o = (y * a.width + x) * 4;
        const lum = same ? m.rgba[o] * 77 + m.rgba[o + 1] * 150 + m.rgba[o + 2] * 29 >> 8 : sampleLum(m.rgba, m.width, m.height, x / (a.width - 1 || 1), y / (a.height - 1 || 1));
        const v = Math.round(out[o + 3] * lum / 255);
        out[o + 3] = v;
        if (v < 250) hasTransparency = true;
      }
    }
    return {
      data: await encodePngRgba(out, a.width, a.height),
      hasTransparency
    };
  }
  async function bakeTintWithAlpha(factor, alphaBytes) {
    const m = await decodePngRgba(alphaBytes);
    if (!m.width) return null;
    const r = Math.round(Math.max(0, Math.min(1, factor[0] ?? 1)) * 255);
    const g = Math.round(Math.max(0, Math.min(1, factor[1] ?? 1)) * 255);
    const b = Math.round(Math.max(0, Math.min(1, factor[2] ?? 1)) * 255);
    let alphaUseful = false;
    const n = m.width * m.height;
    for (let i = 0; i < n; i++) {
      if (m.rgba[i * 4 + 3] < 250) {
        alphaUseful = true;
        break;
      }
    }
    const out = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const lum = m.rgba[o] * 77 + m.rgba[o + 1] * 150 + m.rgba[o + 2] * 29 >> 8;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = alphaUseful ? m.rgba[o + 3] : lum;
    }
    return encodePngRgba(out, m.width, m.height);
  }
  function buildTextureMaps(geometries, textureList, textureFiles, viewerMaterials) {
    const byClass = {
      albedo: [],
      normal: [],
      metalrough: [],
      emissive: [],
      occlusion: [],
      alpha: [],
      lightmap: [],
      unknown: [],
      specular: []
    };
    const list = textureList || [];
    for (const t of list) {
      const base = textureBasename(t.name);
      const cls = classifyTextureName(base);
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(base);
    }
    const pickFirst = (...groups) => {
      for (const g of groups) {
        if (g && g.length) return g[0];
      }
      return null;
    };
    const albedoSafeUnknown = (byClass.unknown || []).filter((n) => {
      const c = classifyTextureName(n);
      return c === "unknown" || c === "albedo";
    });
    const global = {
      albedo: pickFirst(byClass.albedo, albedoSafeUnknown),
      normal: pickFirst(byClass.normal),
      metalness: null,
      emissive: null,
      occlusion: null,
      alpha: null,
      metallicFactor: 0,
      roughnessFactor: 0.9,
      normalFlipY: true,
      baseColorFactor: [1, 1, 1, 1],
      via: "classify"
    };
    const vm = viewerMaterials instanceof Map ? viewerMaterials : viewerMaterials ? new Map(Object.entries(viewerMaterials)) : null;
    const perGeom = geometries.map((geom) => {
      const matName = geom.materialName || null;
      let found = findViewerSpec(vm, matName, geom.name, geom.stateSetOrdinal);
      if (!found && vm && vm.size === 1) {
        const only = vm.values().next().value;
        if (only && !only.skipMesh) found = { spec: only, via: "single" };
      }
      if (found && found.spec) {
        const spec = found.spec;
        if (shouldSkipUntexturedShell(spec, matName, geom.name, geom.mode)) {
          return { skip: true };
        }
        let albedo = resolveUidToBase(spec.albedoUid, list);
        const specularName = resolveUidToBase(spec.specularUid, list);
        albedo = chooseAlbedoName(albedo, specularName, list);
        const alpha = resolveUidToBase(spec.opacityUid, list);
        const usedOpacityAsAlbedo = !albedo && !!alpha;
        if (usedOpacityAsAlbedo) albedo = alpha;
        let metalTex = resolveUidToBase(spec.metalnessUid, list);
        let metallicFactor = spec.metallicFactor != null ? spec.metallicFactor : 0;
        if (metalTex && classifyTextureName(metalTex) === "albedo") metalTex = null;
        if (spec.metalnessUid && !metalTex) metallicFactor = 0;
        let ormPacked = false;
        if (spec.packedOrmName) {
          metalTex = spec.packedOrmName;
          ormPacked = true;
        } else if (metalTex && isPackedOrmName(metalTex)) {
          ormPacked = true;
        }
        const map = {
          albedo,
          normal: resolveUidToBase(spec.normalUid, list),
          metalness: metalTex,
          ormPacked,
          emissive: resolveUidToBase(spec.emitUid, list),
          occlusion: resolveUidToBase(spec.aoUid, list),
          alpha,
          metallicFactor,
          roughnessFactor: spec.roughnessFactor != null ? spec.roughnessFactor : 0.9,
          normalFlipY: !!spec.normalFlipY,
          // Opacity-only cards keep the viewer tint. Real albedo must not
          // be multiplied by a leftover DiffuseColor.
          baseColorFactor: usedOpacityAsAlbedo ? spec.baseColorFactor || [1, 1, 1, 1] : albedo ? [1, 1, 1, 1] : spec.baseColorFactor || [1, 1, 1, 1],
          opacityEnable: !!spec.opacityEnable,
          opacityFactor: spec.opacityFactor,
          opacityType: spec.opacityType,
          transmission: !!spec.transmission,
          opacityAsAlbedo: usedOpacityAsAlbedo,
          clearCoat: spec.clearCoat ? {
            ...spec.clearCoat,
            texture: resolveUidToBase(spec.clearCoat.textureUid, list),
            normalTexture: resolveUidToBase(spec.clearCoat.normalTextureUid, list)
          } : null,
          sheen: spec.sheen ? { ...spec.sheen, texture: resolveUidToBase(spec.sheen.textureUid, list) } : null,
          doubleSided: spec.doubleSided !== false,
          // Non-identity UV transform per role, for KHR_texture_transform.
          uvTransforms: (() => {
            const at = (uid) => uid && spec.uvTransforms ? spec.uvTransforms[uid] : void 0;
            return {
              albedo: at(spec.albedoUid),
              normal: at(spec.normalUid),
              metalness: at(spec.metalnessUid),
              emissive: at(spec.emitUid),
              occlusion: at(spec.aoUid),
              clearCoat: spec.clearCoat ? at(spec.clearCoat.textureUid) : void 0,
              sheen: spec.sheen ? at(spec.sheen.textureUid) : void 0
            };
          })(),
          // Wrap mode per role, so a clamped or mirrored texture keeps
          // its sampler instead of falling back to the global REPEAT.
          wraps: (() => {
            const at = (uid) => uid && spec.textureWraps ? spec.textureWraps[uid] : void 0;
            return {
              albedo: at(spec.albedoUid),
              normal: at(spec.normalUid),
              metalness: at(spec.metalnessUid),
              emissive: at(spec.emitUid),
              occlusion: at(spec.aoUid),
              clearCoat: spec.clearCoat ? at(spec.clearCoat.textureUid) : void 0,
              sheen: spec.sheen ? at(spec.sheen.textureUid) : void 0
            };
          })(),
          // Which texture unit each role samples, so a material bound to
          // a second UV set can be pointed at the right TEXCOORD_n.
          uvUnits: (() => {
            const at = (uid) => uid && spec.texCoordUnits ? spec.texCoordUnits[uid] : void 0;
            return {
              albedo: at(spec.albedoUid),
              normal: at(spec.normalUid),
              metalness: at(spec.metalnessUid),
              emissive: at(spec.emitUid),
              occlusion: at(spec.aoUid),
              clearCoat: spec.clearCoat ? at(spec.clearCoat.textureUid) : void 0,
              sheen: spec.sheen ? at(spec.sheen.textureUid) : void 0
            };
          })(),
          via: found.via
        };
        const hasTexture = {
          albedo: !!map.albedo,
          normal: !!map.normal,
          metalness: !!map.metalness,
          emissive: !!map.emissive,
          occlusion: !!map.occlusion,
          clearCoat: !!(map.clearCoat && (map.clearCoat.texture || map.clearCoat.normalTexture)),
          sheen: !!(map.sheen && map.sheen.texture)
        };
        for (const field of ["wraps", "uvTransforms"]) {
          if (!map[field]) continue;
          for (const role of Object.keys(map[field])) {
            if (!hasTexture[role] || map[field][role] === void 0) {
              delete map[field][role];
            }
          }
          if (!Object.keys(map[field]).length) map[field] = null;
        }
        if (!map.albedo && spec.albedoUid) {
          const byName2 = mapTexturesForName(matName, geom.name, list);
          if (byName2 && byName2.albedo) map.albedo = byName2.albedo;
          if (byName2 && byName2.normal && !map.normal) map.normal = byName2.normal;
        }
        return map;
      }
      if (geom.textureFiles && geom.textureFiles.length) {
        const map = {
          metallicFactor: 0,
          roughnessFactor: 0.9,
          normalFlipY: true,
          baseColorFactor: [1, 1, 1, 1]
        };
        for (const ref of geom.textureFiles) {
          const hit = findTextureBytes(ref, textureFiles);
          if (!hit) continue;
          const base = textureBasename(hit.key);
          const cls = classifyTextureName(base);
          if (cls === "normal") map.normal = base;
          else if (cls === "metalrough") map.metalness = base;
          else if (cls === "emissive") map.emissive = base;
          else if (cls === "occlusion") map.occlusion = base;
          else if (cls === "lightmap" || cls === "specular") {
          } else map.albedo = base;
        }
        if (map.albedo || map.normal) return map;
      }
      const byName = mapTexturesForName(geom.materialName, geom.name, list);
      if (byName) {
        return {
          albedo: byName.albedo || global.albedo,
          normal: byName.normal || null,
          metalness: null,
          // don't invent ORM
          emissive: byName.emissive || null,
          occlusion: null,
          alpha: byName.alpha || null,
          metallicFactor: 0,
          roughnessFactor: 0.9,
          normalFlipY: true,
          baseColorFactor: [1, 1, 1, 1],
          via: "classify"
        };
      }
      return global.albedo ? { ...global } : {
        metallicFactor: 0,
        roughnessFactor: 0.9,
        normalFlipY: true,
        baseColorFactor: [1, 1, 1, 1]
      };
    });
    return { global, perGeom };
  }
  function mergeScopeFor(level, geom, materialKey, animAncestor) {
    const objectKey = geom.groupName || "";
    const scope = level === "materials" ? String(materialKey) : level === "groups" ? geom.rootGroupName || objectKey : level === "all" ? "" : objectKey;
    return `${scope}|${animAncestor}`;
  }
  function isMergeable(geom) {
    return !geom.morphTargets && !geom.boneMap && geom.mode !== "POINTS" && geom.mode !== "LINES";
  }
  function animAncestorOf(geom) {
    return geom.animCtx && !geom.boneMap ? geom.animCtx.name || "" : "";
  }
  function orientationKeepsSkeletonUpright(skeletonData, orientation) {
    if (!skeletonData || !skeletonData.skeletons || !skeletonData.skeletons.length) return true;
    if (!orientation) return true;
    const restPosition = (bone) => {
      const m = bone.invBind;
      if (!m || m.length < 16) return null;
      return [-m[12], -m[13], -m[14]];
    };
    const HEADISH = /head|neck|skull|hat|horn/i;
    const FOOTISH = /foot|feet|toe|ankle|leg|hip|pelvis|root/i;
    let headY = 0, headN = 0, footY = 0, footN = 0;
    for (const sk of skeletonData.skeletons) {
      for (const bone of sk.bones) {
        const p = restPosition(bone);
        if (!p) continue;
        const y = orientation[1] * p[0] + orientation[5] * p[1] + orientation[9] * p[2];
        if (HEADISH.test(bone.name)) {
          headY += y;
          headN++;
        } else if (FOOTISH.test(bone.name)) {
          footY += y;
          footN++;
        }
      }
    }
    if (!headN || !footN) return true;
    const head = headY / headN;
    const foot = footY / footN;
    return head >= foot;
  }
  function composeTRS(trs) {
    if (!trs) return IDENTITY_MAT4;
    const t = trs.translation || [0, 0, 0];
    const q = trs.rotation || [0, 0, 0, 1];
    const s = trs.scale || [1, 1, 1];
    const [x, y, z, w] = q;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return [
      (1 - (yy + zz)) * s[0],
      (xy + wz) * s[0],
      (xz - wy) * s[0],
      0,
      (xy - wz) * s[1],
      (1 - (xx + zz)) * s[1],
      (yz + wx) * s[1],
      0,
      (xz + wy) * s[2],
      (yz - wx) * s[2],
      (1 - (xx + yy)) * s[2],
      0,
      t[0],
      t[1],
      t[2],
      1
    ];
  }
  function mulMat4(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = sum;
      }
    }
    return o;
  }
  function applyRestPose(result, skinAttrs, boneMap, skeleton) {
    const pos = result.attributes.POSITION;
    const nrm = result.attributes.NORMAL;
    if (!pos || !skeleton) return false;
    const joints = skinAttrs.JOINTS_0;
    const weights = skinAttrs.WEIGHTS_0;
    if (!joints || !weights) return false;
    const count = pos.count;
    const world = new Array(skeleton.bones.length).fill(null);
    const invBind = new Array(skeleton.bones.length).fill(null);
    (function walk(bone, parent) {
      const local = composeTRS(bone.trs);
      const m = parent ? mulMat4(parent, local) : local;
      const dense = boneMap ? boneMap[bone.name] : void 0;
      if (dense !== void 0 && dense >= 0 && dense < world.length) {
        world[dense] = m;
        invBind[dense] = bone.invBind && bone.invBind.length >= 16 ? bone.invBind : null;
      }
      for (const child of bone.children || []) walk(child, m);
    })(skeleton.roots[0], null);
    const skinMat = world.map((w, i) => w && invBind[i] ? mulMat4(w, invBind[i]) : null);
    const p = pos.data;
    const n = nrm ? nrm.data : null;
    for (let i = 0; i < count; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      let ox = 0, oy = 0, oz = 0, total = 0;
      let nx = 0, ny = 0, nz = 0;
      for (let k = 0; k < 4; k++) {
        const w = weights.data[i * 4 + k];
        if (!w) continue;
        const j = joints.data[i * 4 + k];
        const m = skinMat[j];
        if (!m) continue;
        ox += w * (m[0] * x + m[4] * y + m[8] * z + m[12]);
        oy += w * (m[1] * x + m[5] * y + m[9] * z + m[13]);
        oz += w * (m[2] * x + m[6] * y + m[10] * z + m[14]);
        total += w;
        if (n) {
          const vx = n[i * 3], vy = n[i * 3 + 1], vz = n[i * 3 + 2];
          nx += w * (m[0] * vx + m[4] * vy + m[8] * vz);
          ny += w * (m[1] * vx + m[5] * vy + m[9] * vz);
          nz += w * (m[2] * vx + m[6] * vy + m[10] * vz);
        }
      }
      if (total > 0) {
        p[i * 3] = ox;
        p[i * 3 + 1] = oy;
        p[i * 3 + 2] = oz;
        if (n) {
          const len = Math.hypot(nx, ny, nz) || 1;
          n[i * 3] = nx / len;
          n[i * 3 + 1] = ny / len;
          n[i * 3 + 2] = nz / len;
        }
      }
    }
    return true;
  }
  function buildGLTF(geometries, textureMap, textureFiles, perGeomMaps, options = {}) {
    const externalTextures = !!options.externalTextures;
    const gltf = {
      asset: { version: "2.0", generator: "sketchfab-osgjs-converter" },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [],
      meshes: [],
      accessors: [],
      bufferViews: [],
      buffers: [],
      materials: [],
      textures: [],
      images: [],
      samplers: [],
      skins: [],
      animations: []
    };
    const usedExtensions = /* @__PURE__ */ new Set();
    const warnedTransforms = /* @__PURE__ */ new Set();
    function warnInexactTransform(matName, role, t) {
      if (externalTextures) return;
      const key = `${matName}|${role}`;
      if (warnedTransforms.has(key)) return;
      warnedTransforms.add(key);
      console.warn(
        `  Note: ${matName} ${role} combines a non-uniform scale [${t.scale[0]}, ${t.scale[1]}] with a ${(t.rotation * 180 / Math.PI).toFixed(1)}deg rotation. glTF applies scale before rotation and Sketchfab after, so this placement cannot be reproduced exactly; exported as the closest KHR_texture_transform.`
      );
    }
    const binChunks = [];
    let byteOffset = 0;
    function addAccessor(data, type, componentType, count, itemSize, normalized, opts = {}) {
      const typeMap = { 1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4", 16: "MAT4" };
      let buf;
      if (componentType === 5126) {
        buf = data instanceof Float32Array ? data : new Float32Array(data.buffer ? data : Array.from(data));
      } else if (componentType === 5125) {
        buf = data instanceof Uint32Array ? data : new Uint32Array(data.buffer ? data : Array.from(data));
      } else if (componentType === 5123) {
        buf = data instanceof Uint16Array ? data : new Uint16Array(data.buffer ? data : Array.from(data));
      } else if (componentType === 5121) {
        buf = data instanceof Uint8Array ? data : new Uint8Array(data.buffer ? data : Array.from(data));
      } else {
        buf = new Float32Array(data);
      }
      const bytes = typedToBytes(buf);
      const padded = pad4(bytes, 0);
      const bvIdx = gltf.bufferViews.length;
      const isIndex = type === "SCALAR" && (componentType === 5125 || componentType === 5123);
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset,
        byteLength: bytes.length,
        /**
         * target tells a loader which GL buffer this belongs in, so it can
         * upload straight to the GPU instead of inspecting every accessor
         * first. It is only meaningful for vertex and index data, so it is
         * passed in rather than inferred -- inverse bind matrices and
         * animation curves are neither, and labelling those would be wrong
         * rather than merely redundant.
         */
        ...opts.target ? { target: opts.target } : {},
        ...!isIndex && !opts.noStride && itemSize > 1 ? { byteStride: itemSize * buf.BYTES_PER_ELEMENT } : {}
      });
      const min = [], max = [];
      if (!opts.noMinMax) {
        for (let j = 0; j < itemSize; j++) {
          min.push(Infinity);
          max.push(-Infinity);
        }
        for (let i = 0; i < count; i++) {
          for (let j = 0; j < itemSize; j++) {
            const v = buf[i * itemSize + j];
            if (v < min[j]) min[j] = v;
            if (v > max[j]) max[j] = v;
          }
        }
      }
      const accIdx = gltf.accessors.length;
      gltf.accessors.push({
        bufferView: bvIdx,
        byteOffset: 0,
        componentType,
        count,
        type: typeMap[itemSize] || "SCALAR",
        ...opts.noMinMax ? {} : { min, max },
        ...normalized ? { normalized: true } : {}
      });
      binChunks.push(padded);
      byteOffset += padded.length;
      return accIdx;
    }
    gltf.samplers.push({ magFilter: 9729, minFilter: 9729, wrapS: 10497, wrapT: 10497 });
    const GL_WRAP = {
      REPEAT: 10497,
      CLAMP_TO_EDGE: 33071,
      MIRRORED_REPEAT: 33648
    };
    const samplerCache = { "10497|10497": 0 };
    function samplerFor(wrap) {
      const wrapS = GL_WRAP[wrap && wrap.wrapS] || 10497;
      const wrapT = GL_WRAP[wrap && wrap.wrapT] || 10497;
      const key = `${wrapS}|${wrapT}`;
      if (samplerCache[key] !== void 0) return samplerCache[key];
      const idx = gltf.samplers.length;
      gltf.samplers.push({ magFilter: 9729, minFilter: 9729, wrapS, wrapT });
      samplerCache[key] = idx;
      return idx;
    }
    const texIndexCache = /* @__PURE__ */ Object.create(null);
    const imgIndexCache = /* @__PURE__ */ Object.create(null);
    function addImage(filename, opts = {}) {
      if (!filename || !textureFiles) return -1;
      const imgKey = String(filename).split("/").pop().toLowerCase() + (opts.flipNormalY ? "|fy" : "");
      if (imgIndexCache[imgKey] !== void 0) return imgIndexCache[imgKey];
      let hit = null;
      if (opts.flipNormalY) {
        const bare2 = textureBasename(filename);
        hit = findTextureBytes(filename + ".__flipY", textureFiles) || findTextureBytes(bare2 + ".__flipY", textureFiles) || findTextureBytes("textures/" + bare2 + ".__flipY", textureFiles);
      }
      if (!hit) hit = findTextureBytes(filename, textureFiles);
      if (!hit) {
        imgIndexCache[imgKey] = -1;
        return -1;
      }
      const imgData = hit.data;
      const keyName = hit.key.replace(/\.__flipY$/, "");
      const bare = textureBasename(keyName) + (opts.flipNormalY ? "_flipY" : "");
      const mimeType = mimeFromBytes(imgData) || mimeFromName(keyName);
      const imgIdx = gltf.images.length;
      if (externalTextures) {
        const uriBare = textureBasename(keyName);
        gltf.images.push({
          uri: "textures/" + uriBare,
          mimeType,
          name: uriBare
        });
        imgIndexCache[imgKey] = imgIdx;
        return imgIdx;
      }
      const raw = imgData instanceof Uint8Array ? imgData : new Uint8Array(imgData);
      const padded = pad4(raw, 0);
      const bvIdx = gltf.bufferViews.length;
      gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: raw.length });
      byteOffset += padded.length;
      binChunks.push(padded);
      gltf.images.push({ bufferView: bvIdx, mimeType, name: bare });
      imgIndexCache[imgKey] = imgIdx;
      return imgIdx;
    }
    function addTexture(filename, opts = {}) {
      if (!filename) return -1;
      const flip = !!opts.flipNormalY;
      const sampler = samplerFor(opts.wrap);
      const cacheKey = String(filename).split("/").pop().toLowerCase() + (flip ? "|fy" : "") + (sampler ? `|s${sampler}` : "");
      if (texIndexCache[cacheKey] !== void 0) return texIndexCache[cacheKey];
      const imgIdx = addImage(filename, opts);
      if (imgIdx < 0) {
        texIndexCache[cacheKey] = -1;
        return -1;
      }
      const texIdx = gltf.textures.length;
      gltf.textures.push({ source: imgIdx, sampler });
      texIndexCache[cacheKey] = texIdx;
      return texIdx;
    }
    function makeMaterial(name, map, texCoords = {}) {
      const tc = (role) => texCoords[role] || 0;
      const wr = (role) => map && map.wraps ? map.wraps[role] : void 0;
      const texInfo = (role, index) => {
        const info = { index, texCoord: tc(role) };
        const t = map && map.uvTransforms ? map.uvTransforms[role] : null;
        if (t) {
          const { ext, exact } = khrTextureTransform(t);
          if (Object.keys(ext).length) {
            info.extensions = { KHR_texture_transform: ext };
            usedExtensions.add("KHR_texture_transform");
            if (!exact) warnInexactTransform(name, role, t);
          }
        }
        return info;
      };
      const baseF = map && map.baseColorFactor || [1, 1, 1, 1];
      const factors = pbrFactors(map);
      const material = {
        name: name || "Material",
        // Unculled unless the viewer said otherwise; a map with no
        // sided-ness information keeps the old permissive default.
        doubleSided: !map || map.doubleSided !== false,
        pbrMetallicRoughness: {
          baseColorFactor: baseF.slice(0, 4),
          metallicFactor: factors.metallicFactor,
          roughnessFactor: factors.roughnessFactor
        }
      };
      if (map && map.via) {
        material.extras = { via: map.via };
      }
      if (map) {
        if (map.albedo) {
          const idx = addTexture(map.albedo, { wrap: wr("albedo") });
          if (idx >= 0) {
            material.pbrMetallicRoughness.baseColorTexture = texInfo("albedo", idx);
          }
        }
        if (map.metalness && factors.bindTexture) {
          const idx = addTexture(map.metalness, { wrap: wr("metalness") });
          if (idx >= 0) {
            material.pbrMetallicRoughness.metallicRoughnessTexture = {
              ...texInfo("metalness", idx)
            };
          }
        }
        if (map.normal) {
          const idx = addTexture(map.normal, { flipNormalY: !!map.normalFlipY, wrap: wr("normal") });
          if (idx >= 0) material.normalTexture = { ...texInfo("normal", idx), scale: 1 };
        }
        if (map.emissive) {
          const idx = addTexture(map.emissive, { wrap: wr("emissive") });
          if (idx >= 0) {
            material.emissiveTexture = texInfo("emissive", idx);
            material.emissiveFactor = [1, 1, 1];
          }
        }
        if (map.occlusion) {
          const idx = addTexture(map.occlusion, { wrap: wr("occlusion") });
          if (idx >= 0) material.occlusionTexture = { ...texInfo("occlusion", idx), strength: 1 };
        }
        const opType = String(map.opacityType || "");
        if (map.transmission) {
          material.extensions = material.extensions || {};
          material.extensions.KHR_materials_transmission = { transmissionFactor: 1 };
          material.alphaMode = "OPAQUE";
          material.doubleSided = false;
          usedExtensions.add("KHR_materials_transmission");
        } else if (map.forceOpaque) {
          material.alphaMode = "OPAQUE";
        } else if (map.opacityEnable && /dither/i.test(opType)) {
          material.alphaMode = "BLEND";
        } else if (map.opacityEnable && map.alpha) {
          if (opType === "mask" || /mask|cutout/i.test(opType)) {
            material.alphaMode = "MASK";
            material.alphaCutoff = 0.5;
          } else if (opType === "alphaBlend" || opType === "blend" || opType === "additive" || !opType) {
            material.alphaMode = "BLEND";
          } else {
            material.alphaMode = "OPAQUE";
          }
        } else if (map.opacityEnable && typeof map.opacityFactor === "number" && map.opacityFactor < 1 && !/mask|cutout/i.test(opType)) {
          const pbr = material.pbrMetallicRoughness || (material.pbrMetallicRoughness = {});
          const bcf = pbr.baseColorFactor || [1, 1, 1, 1];
          pbr.baseColorFactor = [bcf[0], bcf[1], bcf[2], map.opacityFactor];
          material.alphaMode = "BLEND";
        } else if (map.alpha && /opacity|cutout|alphamask/i.test(map.alpha)) {
          material.alphaMode = "MASK";
          material.alphaCutoff = 0.5;
        } else {
          material.alphaMode = "OPAQUE";
        }
        if (map.clearCoat) {
          const ext = { clearcoatFactor: map.clearCoat.factor };
          if (typeof map.clearCoat.roughness === "number") {
            ext.clearcoatRoughnessFactor = map.clearCoat.roughness;
          }
          if (map.clearCoat.texture) {
            const idx = addTexture(map.clearCoat.texture, { wrap: wr("clearCoat") });
            if (idx >= 0) ext.clearcoatTexture = texInfo("clearCoat", idx);
          }
          if (map.clearCoat.normalTexture) {
            const idx = addTexture(map.clearCoat.normalTexture, {
              flipNormalY: !!map.clearCoat.normalFlipY,
              wrap: wr("clearCoat")
            });
            if (idx >= 0) ext.clearcoatNormalTexture = texInfo("clearCoat", idx);
          }
          material.extensions = material.extensions || {};
          material.extensions.KHR_materials_clearcoat = ext;
          usedExtensions.add("KHR_materials_clearcoat");
        }
        if (map.sheen) {
          const ext = { sheenColorFactor: map.sheen.colorFactor.slice(0, 3) };
          if (typeof map.sheen.roughness === "number") {
            ext.sheenRoughnessFactor = map.sheen.roughness;
          }
          if (map.sheen.texture) {
            const idx = addTexture(map.sheen.texture, { wrap: wr("sheen") });
            if (idx >= 0) ext.sheenColorTexture = texInfo("sheen", idx);
          }
          material.extensions = material.extensions || {};
          material.extensions.KHR_materials_sheen = ext;
          usedExtensions.add("KHR_materials_sheen");
        }
      }
      return material;
    }
    const matCache = /* @__PURE__ */ Object.create(null);
    function materialIndexFor(map, geomName, uvUnits) {
      const texCoords = texCoordsForGeometry(map, uvUnits);
      const key = map ? [
        "a:" + (map.albedo || ""),
        "n:" + (map.normal || ""),
        "m:" + (map.metalness || ""),
        "op:" + (map.ormPacked ? 1 : 0),
        "e:" + (map.emissive || ""),
        "o:" + (map.occlusion || ""),
        "mf:" + (map.metallicFactor != null ? map.metallicFactor : ""),
        "rf:" + (map.roughnessFactor != null ? map.roughnessFactor : ""),
        // The tint. Untextured materials are distinguished by little
        // else, so leaving it out collapsed every flat-coloured
        // material in a scene into whichever came first -- a city of
        // grey facades rendered entirely in one building's colour.
        "bc:" + (map.baseColorFactor ? map.baseColorFactor.join(",") : ""),
        "fy:" + (map.normalFlipY ? 1 : 0),
        "ds:" + (map.doubleSided === false ? 0 : 1),
        "al:" + (map.alpha || ""),
        "oe:" + (map.opacityEnable ? 1 : 0),
        "ot:" + (map.opacityType || ""),
        "of:" + (map.opacityFactor != null ? map.opacityFactor : ""),
        "cc:" + (map.clearCoat ? [
          map.clearCoat.factor,
          map.clearCoat.roughness,
          map.clearCoat.texture || "",
          map.clearCoat.normalTexture || "",
          map.clearCoat.normalFlipY ? 1 : 0
        ].join(",") : ""),
        "sh:" + (map.sheen ? [map.sheen.colorFactor.join(","), map.sheen.roughness, map.sheen.texture || ""].join(",") : ""),
        "tc:" + JSON.stringify(texCoords),
        "wr:" + (map.wraps ? JSON.stringify(map.wraps) : ""),
        "ut:" + (map.uvTransforms ? JSON.stringify(map.uvTransforms) : "")
      ].join("|") : "__default__";
      if (matCache[key] !== void 0) return matCache[key];
      const mat = makeMaterial(geomName || "Material", map, texCoords);
      const idx = gltf.materials.length;
      gltf.materials.push(mat);
      matCache[key] = idx;
      return idx;
    }
    if (!textureMap) textureMap = null;
    const axisRotation = options.axisRotation || ZUP_TO_YUP_MAT3;
    const AXIS_MAT4 = mat4FromMat3(axisRotation);
    const orientationMat = options.orientation || null;
    const AXIS_INVERSE_MAT4 = mat4FromMat3(
      mat3Invert(axisRotation) || mat3Transpose(axisRotation)
    );
    const orientationUsable = orientationMat && orientationKeepsSkeletonUpright(options.skeletons, orientationMat);
    const rootMatrix = orientationUsable ? mat4Multiply2(mat4Multiply2(AXIS_MAT4, orientationMat), AXIS_INVERSE_MAT4) : null;
    const meshNodes = [];
    const skinnedMeshNodes = [];
    const animTargetIndex = /* @__PURE__ */ new Map();
    const animNodeByCtx = /* @__PURE__ */ new Map();
    const animRootNodes = [];
    function nodeForAnimCtx(ctx) {
      if (!ctx) return -1;
      const cached = animNodeByCtx.get(ctx);
      if (cached !== void 0) return cached;
      const parentIdx = ctx.parent ? nodeForAnimCtx(ctx.parent) : -1;
      const offset = ctx.parent ? ctx.pre : mat4Multiply2(AXIS_MAT4, ctx.pre);
      let anchor = parentIdx;
      if (!isIdentityMat4(offset)) {
        const idx2 = gltf.nodes.length;
        gltf.nodes.push({
          name: `${ctx.name || "Animated"}_placement`,
          matrix: Array.from(offset),
          children: []
        });
        if (anchor >= 0) gltf.nodes[anchor].children.push(idx2);
        else animRootNodes.push(idx2);
        anchor = idx2;
      }
      const idx = gltf.nodes.length;
      const node = { name: ctx.name || "Animated", children: [] };
      const trs = ctx.trs || {};
      if (trs.translation) node.translation = Array.from(trs.translation);
      if (trs.rotation) node.rotation = Array.from(trs.rotation);
      if (trs.scale) node.scale = Array.from(trs.scale);
      gltf.nodes.push(node);
      if (anchor >= 0) gltf.nodes[anchor].children.push(idx);
      else animRootNodes.push(idx);
      animNodeByCtx.set(ctx, idx);
      if (ctx.name && !animTargetIndex.has(ctx.name)) animTargetIndex.set(ctx.name, idx);
      return idx;
    }
    const morphTargetIndex = /* @__PURE__ */ new Map();
    const skipped = [];
    const merge = !!options.merge;
    const MERGE_ALIASES = {
      grouped: "objects",
      objects: "objects",
      group: "groups",
      groups: "groups",
      material: "materials",
      materials: "materials",
      all: "all"
    };
    const mergeMode = MERGE_ALIASES[options.mergeMode] || "objects";
    const mergedNodeByMaterial = /* @__PURE__ */ new Map();
    let geomI = 0;
    for (const geom of geometries) {
      if (geom.animateOnly) {
        nodeForAnimCtx(geom.animCtx);
        continue;
      }
      const isPoints = geom.mode === "POINTS";
      const isLines = geom.mode === "LINES";
      if (!geom.indices && !isPoints || !geom.attributes.POSITION) {
        skipped.push({ name: geom.name || `geometry_${geomI}`, reason: "no geometry data" });
        geomI++;
        continue;
      }
      const map = perGeomMaps && perGeomMaps[geomI] || textureMap;
      if (map && map.skip) {
        skipped.push({
          name: geom.name || `geometry_${geomI}`,
          reason: "the viewer does not draw it (opacity 0)"
        });
        geomI++;
        continue;
      }
      const matName = geom.materialName || geom.name || "Material_" + geomI;
      const matIdx = materialIndexFor(map, matName, geom.uvUnits);
      const primitive = { attributes: {}, material: matIdx, mode: isPoints ? 0 : isLines ? 1 : 4 };
      if (!isPoints) {
        const idx = geom.indices;
        const idxType = idx.BYTES_PER_ELEMENT === 4 ? 5125 : 5123;
        primitive.indices = addAccessor(idx, "SCALAR", idxType, idx.length, 1, false, { target: ELEMENT_ARRAY_BUFFER });
      }
      for (const [name, attr] of Object.entries(geom.attributes)) {
        if (name.startsWith("_")) continue;
        const ct = attr.componentType || 5126;
        const norm = attr.normalized || false;
        primitive.attributes[name] = addAccessor(
          attr.data,
          name === "SCALAR" ? "SCALAR" : `VEC${attr.itemSize}`,
          ct,
          attr.count,
          attr.itemSize,
          norm,
          { target: ARRAY_BUFFER }
        );
      }
      if (!isPoints && !isLines && !primitive.attributes.TEXCOORD_0 && map && (map.albedo || map.normal || map.metalness)) {
        const nVerts = geom.attributes.POSITION.count;
        const zeros = new Float32Array(nVerts * 2);
        primitive.attributes.TEXCOORD_0 = addAccessor(zeros, "VEC2", 5126, nVerts, 2, false, { target: ARRAY_BUFFER });
      }
      if (primitive.indices !== void 0) {
        const idxBV = gltf.accessors[primitive.indices].bufferView;
        delete gltf.bufferViews[idxBV].byteStride;
      }
      const animAncestor = animAncestorOf(geom);
      const mergeable = merge && isMergeable(geom);
      const mergeKey = mergeable ? mergeScopeFor(mergeMode, geom, matIdx, animAncestor) : null;
      if (mergeable) {
        const existing = mergedNodeByMaterial.get(mergeKey);
        if (existing !== void 0) {
          gltf.meshes[gltf.nodes[existing].mesh].primitives.push(primitive);
          geomI++;
          continue;
        }
      }
      const meshIdx = gltf.meshes.length;
      const meshName = (mergeable && geom.groupName ? geom.groupName : geom.name || matName || "Mesh_" + geomI).slice(0, 64);
      const mesh = { name: meshName, primitives: [primitive] };
      if (geom.morphTargets && geom.morphTargets.length) {
        primitive.targets = geom.morphTargets.map((t) => {
          const entry = {
            POSITION: addAccessor(t.POSITION, "VEC3", 5126, t.count, 3, false, { target: ARRAY_BUFFER })
          };
          if (t.NORMAL) {
            entry.NORMAL = addAccessor(t.NORMAL, "VEC3", 5126, t.count, 3, false, { target: ARRAY_BUFFER });
          }
          return entry;
        });
        mesh.weights = geom.morphTargets.map(() => 0);
        mesh.extras = {
          ...mesh.extras || {},
          targetNames: geom.morphTargets.map((t, i) => t.name || `target_${i}`)
        };
      }
      gltf.meshes.push(mesh);
      const nodeIdx = gltf.nodes.length;
      gltf.nodes.push({ name: meshName, mesh: meshIdx });
      if (mergeable) mergedNodeByMaterial.set(mergeKey, nodeIdx);
      if (geom.morphTargets) {
        geom.morphTargets.forEach((t, i) => {
          if (t.name && !morphTargetIndex.has(t.name)) {
            morphTargetIndex.set(t.name, {
              node: nodeIdx,
              index: i,
              count: geom.morphTargets.length
            });
          }
        });
      }
      const animParent = geom.animCtx ? nodeForAnimCtx(geom.animCtx) : -1;
      if (animParent >= 0) gltf.nodes[animParent].children.push(nodeIdx);
      else meshNodes.push(nodeIdx);
      if (geom.boneMap) skinnedMeshNodes.push([nodeIdx, geom]);
      geomI++;
    }
    const IDENTITY_MAT42 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    function mat4Multiply2(a, b) {
      const out = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          let sum = 0;
          for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
          out[c * 4 + r] = sum;
        }
      }
      return out;
    }
    const skeletonData = options.skeletons || null;
    const boneNodeIndex = /* @__PURE__ */ new Map();
    const rigRootNodes = [];
    const rigRootBySkeleton = /* @__PURE__ */ new Map();
    const rigUnitScale = /* @__PURE__ */ new Map();
    const boneUnitScale = /* @__PURE__ */ new Map();
    function emitBoneNode(bone, unitScale) {
      const nodeIdx = gltf.nodes.length;
      const node = { name: bone.name || "Bone" };
      gltf.nodes.push(node);
      boneUnitScale.set(nodeIdx, unitScale);
      if (bone.name) boneNodeIndex.set(bone.name, nodeIdx);
      if (bone.name && !animTargetIndex.has(bone.name)) animTargetIndex.set(bone.name, nodeIdx);
      if (bone.animName && !animTargetIndex.has(bone.animName)) {
        animTargetIndex.set(bone.animName, nodeIdx);
      }
      if (bone.trs) {
        node.translation = Array.from(bone.trs.translation, (v) => v * unitScale);
        node.rotation = Array.from(bone.trs.rotation);
        node.scale = Array.from(bone.trs.scale);
      }
      const kids = [];
      for (const child of bone.children) kids.push(emitBoneNode(child, unitScale));
      if (kids.length) node.children = kids;
      return nodeIdx;
    }
    if (skeletonData && skeletonData.skeletons) {
      for (const skeleton of skeletonData.skeletons) {
        if (!skeleton.roots.length) continue;
        const wrapperIdx = gltf.nodes.length;
        const wrapper = {
          name: skeleton.json && skeleton.json.Name || "Skeleton",
          // Axis fix, then the character's own placement, which the
          // flattened mesh path bakes into its vertices.
          matrix: Array.from(
            mat4Multiply2(AXIS_MAT4, skeleton.worldMatrix || IDENTITY_MAT42)
          ),
          children: []
        };
        const m = wrapper.matrix;
        const unitScale = Math.max(
          Math.hypot(m[0], m[1], m[2]),
          Math.hypot(m[4], m[5], m[6]),
          Math.hypot(m[8], m[9], m[10])
        ) || 1;
        rigUnitScale.set(skeleton, unitScale);
        for (let c = 0; c < 3; c++) {
          for (let r = 0; r < 3; r++) m[c * 4 + r] /= unitScale;
        }
        gltf.nodes.push(wrapper);
        for (const rootBone of skeleton.roots) wrapper.children.push(emitBoneNode(rootBone, unitScale));
        rigRootBySkeleton.set(skeleton, wrapperIdx);
        rigRootNodes.push(wrapperIdx);
      }
    }
    function skinForGeometry(geom) {
      if (!geom.boneMap || !boneNodeIndex.size) return -1;
      const entries = Object.entries(geom.boneMap);
      let maxIdx = -1;
      for (const [, i] of entries) if (i > maxIdx) maxIdx = i;
      if (maxIdx < 0) return -1;
      const joints = new Array(maxIdx + 1).fill(-1);
      const ibm = new Float32Array((maxIdx + 1) * 16);
      let skeletonRoot = -1;
      for (const [name, i] of entries) {
        const nodeIdx = boneNodeIndex.get(name);
        if (nodeIdx === void 0 || i < 0 || i > maxIdx) continue;
        joints[i] = nodeIdx;
        const bone = skeletonData.boneByName.get(name);
        const inv = bone && bone.invBind;
        ibm.set(
          inv && inv.length >= 16 ? mat4Multiply2(inv, AXIS_INVERSE_MAT4) : IDENTITY_MAT42,
          i * 16
        );
        const unitScale = bone ? rigUnitScale.get(bone.skeleton) ?? 1 : 1;
        for (let c = 0; c < 4; c++) {
          for (let r = 0; r < 3; r++) ibm[i * 16 + c * 4 + r] *= unitScale;
        }
        if (skeletonRoot < 0 && bone && rigRootBySkeleton.has(bone.skeleton)) {
          skeletonRoot = rigRootBySkeleton.get(bone.skeleton);
        }
      }
      for (let i = 0; i < joints.length; i++) {
        if (joints[i] >= 0) continue;
        joints[i] = skeletonRoot >= 0 ? skeletonRoot : 0;
        ibm.set(IDENTITY_MAT42, i * 16);
      }
      const acc = addAccessor(ibm, "MAT4", 5126, joints.length, 16, false, {
        noStride: true,
        noMinMax: true
      });
      gltf.skins.push({
        joints,
        inverseBindMatrices: acc,
        ...skeletonRoot >= 0 ? { skeleton: skeletonRoot } : {}
      });
      return gltf.skins.length - 1;
    }
    for (const [nodeIdx, geom] of skinnedMeshNodes) {
      const skinIdx = skinForGeometry(geom);
      if (skinIdx >= 0) gltf.nodes[nodeIdx].skin = skinIdx;
      else {
        const prim = gltf.meshes[gltf.nodes[nodeIdx].mesh].primitives[0];
        delete prim.attributes.JOINTS_0;
        delete prim.attributes.WEIGHTS_0;
      }
    }
    const timeAccessors = [];
    function addTimeAccessor(times) {
      for (const entry of timeAccessors) {
        if (entry.data.length !== times.length) continue;
        let same = true;
        for (let i = 0; i < times.length; i++) {
          if (entry.data[i] !== times[i]) {
            same = false;
            break;
          }
        }
        if (same) return entry.accessor;
      }
      const accessor2 = addAccessor(times, "SCALAR", 5126, times.length, 1, false, {
        noStride: true
      });
      timeAccessors.push({ data: times, accessor: accessor2 });
      return accessor2;
    }
    for (const anim of options.animationCurves || []) {
      const samplers = [];
      const channels = [];
      const weightsByNode = /* @__PURE__ */ new Map();
      for (const curve of anim.curves) {
        if (curve.path === "weights") {
          const slot = morphTargetIndex.get(curve.target);
          if (!slot) continue;
          const list = weightsByNode.get(slot.node) || { count: slot.count, entries: [] };
          list.entries.push({ index: slot.index, curve });
          weightsByNode.set(slot.node, list);
          continue;
        }
        const nodeIdx = animTargetIndex.get(curve.target);
        if (nodeIdx === void 0) continue;
        const keys = stripNonIncreasingKeys(curve.times, curve.values, curve.itemSize);
        const unitScale = boneUnitScale.get(nodeIdx) ?? 1;
        const values = curve.path === "translation" && unitScale !== 1 ? Float32Array.from(keys.values, (v) => v * unitScale) : keys.values;
        const input = addTimeAccessor(keys.times);
        const output = addAccessor(
          values,
          `VEC${curve.itemSize}`,
          5126,
          keys.times.length,
          curve.itemSize,
          false,
          { noStride: true, noMinMax: true }
        );
        samplers.push({ input, output, interpolation: "LINEAR" });
        channels.push({
          sampler: samplers.length - 1,
          target: { node: nodeIdx, path: curve.path }
        });
      }
      for (const [nodeIdx, group] of weightsByNode) {
        const merged = mergeWeightCurves(group.entries, group.count);
        if (!merged) continue;
        const input = addTimeAccessor(merged.times);
        const output = addAccessor(
          merged.values,
          "SCALAR",
          5126,
          merged.values.length,
          1,
          false,
          { noStride: true, noMinMax: true }
        );
        samplers.push({ input, output, interpolation: "LINEAR" });
        channels.push({
          sampler: samplers.length - 1,
          target: { node: nodeIdx, path: "weights" }
        });
      }
      if (channels.length) {
        gltf.animations.push({ name: anim.name || "Animation", samplers, channels });
      }
    }
    let rootNodeIndex = -1;
    if (meshNodes.length || animRootNodes.length) {
      const root = gltf.nodes.length;
      gltf.nodes.push({
        name: "Sketchfab_model",
        ...rootMatrix ? { matrix: Array.from(rootMatrix) } : {},
        children: meshNodes.concat(rigRootNodes, animRootNodes)
      });
      gltf.scenes[0].nodes = [root];
      rootNodeIndex = root;
    } else {
      gltf.meshes.push({ primitives: [] });
      gltf.nodes.push({ mesh: 0, name: "root" });
      gltf.scenes[0].nodes = [gltf.nodes.length - 1];
      rootNodeIndex = gltf.nodes.length - 1;
    }
    if (!gltf.images.length && textureFiles && textureMap && textureMap.albedo) {
    }
    if (!gltf.skins.length) delete gltf.skins;
    if (!gltf.animations.length) delete gltf.animations;
    const punctualLights = [];
    const lightNodeIndexes = [];
    for (const light of options.lights || []) {
      const node = { name: `Light_${light.type}` };
      if (light.matrix) {
        const m = light.matrix;
        node.matrix = [
          m[0],
          m[4],
          m[8],
          m[12],
          m[1],
          m[5],
          m[9],
          m[13],
          m[2],
          m[6],
          m[10],
          m[14],
          m[3],
          m[7],
          m[11],
          m[15]
        ];
      }
      node.extensions = { KHR_lights_punctual: { light: punctualLights.length } };
      punctualLights.push({
        type: light.type,
        color: light.color,
        intensity: light.intensity
      });
      gltf.nodes.push(node);
      lightNodeIndexes.push(gltf.nodes.length - 1);
    }
    if (punctualLights.length) {
      gltf.extensions = gltf.extensions || {};
      gltf.extensions.KHR_lights_punctual = { lights: punctualLights };
      usedExtensions.add("KHR_lights_punctual");
      for (const idx of lightNodeIndexes) {
        if (rootNodeIndex >= 0) gltf.nodes[rootNodeIndex].children.push(idx);
        else gltf.scenes[0].nodes.push(idx);
      }
    }
    if (!gltf.images.length) {
      delete gltf.images;
      delete gltf.textures;
      delete gltf.samplers;
    }
    const binBuffer = concatBytes(binChunks);
    gltf.buffers.push({ byteLength: binBuffer.length });
    if (usedExtensions.size) {
      gltf.extensionsUsed = [...usedExtensions];
    }
    return { json: gltf, bin: binBuffer, skipped };
  }
  function buildUidMap(obj, map) {
    if (!obj || typeof obj !== "object") return;
    if (obj.UniqueID !== void 0 && Object.keys(obj).length > 1) {
      map[obj.UniqueID] = obj;
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) v.forEach((c) => buildUidMap(c, map));
      else if (typeof v === "object") buildUidMap(v, map);
    }
  }
  function resolveRefs(obj, uidMap) {
    if (!obj || typeof obj !== "object") return obj;
    if (obj.UniqueID !== void 0 && Object.keys(obj).length === 1) {
      const resolved = uidMap[obj.UniqueID];
      if (resolved) return resolved;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        obj[k] = v.map((c) => typeof c === "object" ? resolveRefs(c, uidMap) : c);
      } else if (typeof v === "object") {
        obj[k] = resolveRefs(v, uidMap);
      }
    }
    return obj;
  }
  function isWireframeGeom(geom) {
    if (!geom) return false;
    const prims = geom.PrimitiveSetList || [];
    let sawLines = false;
    for (const p of prims) {
      const dt = Object.values(p)[0];
      if (!dt || dt.Mode !== "LINES") continue;
      sawLines = true;
      const arr = dt.Indices && dt.Indices.Array;
      const def = arr && Object.values(arr)[0];
      if (!def || !def.File || !def.File.includes("wireframe")) return false;
    }
    return sawLines;
  }
  function sanitizeInfluences(js, ws, boneCount) {
    const j = [0, 0, 0, 0];
    const w = [0, 0, 0, 0];
    let n = 0;
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const idx = js[k] | 0;
      const wt = +ws[k];
      if (!(wt > 0)) continue;
      if (!(idx >= 0 && idx < boneCount)) continue;
      let at = -1;
      for (let m = 0; m < n; m++) if (j[m] === idx) {
        at = m;
        break;
      }
      if (at >= 0) {
        w[at] += wt;
      } else {
        j[n] = idx;
        w[n] = wt;
        n++;
      }
      sum += wt;
    }
    if (sum > 0 && Math.abs(sum - 1) > 1e-6) {
      for (let k = 0; k < n; k++) w[k] /= sum;
    }
    return [j, w];
  }
  function readRigAttributes(rig, polyBin, vertexCount) {
    const vaList = rig && rig.VertexAttributeList || {};
    if (!vaList.Bones || !vaList.Weights || !rig.BoneMap) return null;
    function read(attr) {
      const arrInfo = attr.Array;
      const arrType = Object.keys(arrInfo)[0];
      const arrDef = arrInfo[arrType];
      const itemSize = attr.ItemSize || 4;
      const data = readBufferArray(
        asArrayBuffer(polyBin),
        { ...arrDef, ItemSize: itemSize },
        arrType
      );
      return { data, count: arrDef.Size, itemSize };
    }
    let bones;
    let weights;
    try {
      bones = read(vaList.Bones);
      weights = read(vaList.Weights);
    } catch (_) {
      return null;
    }
    if (bones.count !== vertexCount || weights.count !== vertexCount) return null;
    const joints = new Uint16Array(vertexCount * 4);
    const wts = new Float32Array(vertexCount * 4);
    const boneCount = Object.keys(rig.BoneMap).length;
    const n = Math.min(4, bones.itemSize);
    const srcJ = [0, 0, 0, 0];
    const srcW = [0, 0, 0, 0];
    for (let i = 0; i < vertexCount; i++) {
      for (let k = 0; k < 4; k++) {
        srcJ[k] = k < n ? bones.data[i * bones.itemSize + k] : 0;
        srcW[k] = k < n ? weights.data[i * weights.itemSize + k] : 0;
      }
      const [vj, vw] = sanitizeInfluences(srcJ, srcW, boneCount);
      for (let k = 0; k < 4; k++) {
        joints[i * 4 + k] = vj[k];
        wts[i * 4 + k] = vw[k];
      }
    }
    return {
      JOINTS_0: { data: joints, itemSize: 4, count: vertexCount, componentType: 5123 },
      WEIGHTS_0: { data: wts, itemSize: 4, count: vertexCount, componentType: 5126 }
    };
  }
  function extractMeshGeometry(wrapper) {
    if (!wrapper || typeof wrapper !== "object") return null;
    if (wrapper.PrimitiveSetList && wrapper.VertexAttributeList) return wrapper;
    if (wrapper["osg.Geometry"]) return wrapper["osg.Geometry"];
    const src = wrapper.SourceGeometry;
    if (src && typeof src === "object") {
      if (src["osg.Geometry"]) return src["osg.Geometry"];
      if (src.PrimitiveSetList && src.VertexAttributeList) return src;
      for (const [k, v] of Object.entries(src)) {
        if (v && typeof v === "object" && v.VertexAttributeList) return v;
      }
    }
    return null;
  }
  function readMorphTargets(morphNode, base, polyBin, wireBin, axisRotation, placement, skipAxis) {
    const entries = morphNode.MorphTargets || [];
    const basePos = base.attributes.POSITION;
    if (!basePos || !entries.length) return [];
    const baseNormal = base.attributes.NORMAL;
    const out = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const geom = entry["osg.Geometry"] || (entry.VertexAttributeList ? entry : null);
      if (!geom || !geom.VertexAttributeList) continue;
      let target;
      try {
        target = processGeometry(
          geom,
          polyBin,
          wireBin,
          {},
          axisRotation,
          placement,
          { attributesOnly: true, skipAxis }
        );
      } catch (e) {
        continue;
      }
      const pos = target.attributes.POSITION;
      if (!pos || pos.count !== basePos.count) continue;
      const deltaPos = new Float32Array(basePos.count * 3);
      for (let i = 0; i < deltaPos.length; i++) {
        deltaPos[i] = pos.data[i] - basePos.data[i];
      }
      const rec = { name: geom.Name || "", POSITION: deltaPos, count: basePos.count };
      const nrm = target.attributes.NORMAL;
      if (baseNormal && nrm && nrm.count === baseNormal.count) {
        const deltaNrm = new Float32Array(baseNormal.count * 3);
        for (let i = 0; i < deltaNrm.length; i++) {
          deltaNrm[i] = nrm.data[i] - baseNormal.data[i];
        }
        rec.NORMAL = deltaNrm;
      }
      out.push(rec);
    }
    return out;
  }
  function sampleScalar(times, values, t) {
    const n = times.length;
    if (!n) return 0;
    if (t <= times[0]) return values[0];
    if (t >= times[n - 1]) return values[n - 1];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = lo + hi >> 1;
      if (times[mid] <= t) lo = mid;
      else hi = mid;
    }
    const span = times[hi] - times[lo];
    const f = span > 0 ? (t - times[lo]) / span : 0;
    return values[lo] + (values[hi] - values[lo]) * f;
  }
  function mergeWeightCurves(entries, targetCount) {
    const timeSet = /* @__PURE__ */ new Set();
    for (const e of entries) {
      for (const t of e.curve.times) timeSet.add(t);
    }
    const times = [...timeSet].sort((a, b) => a - b);
    if (!times.length) return null;
    const values = new Float32Array(times.length * targetCount);
    for (const e of entries) {
      if (e.index < 0 || e.index >= targetCount) continue;
      for (let i = 0; i < times.length; i++) {
        values[i * targetCount + e.index] = sampleScalar(
          e.curve.times,
          e.curve.values,
          times[i]
        );
      }
    }
    return { times: Float32Array.from(times), values };
  }
  function animatedTransform(value) {
    if (!value || typeof value !== "object") return null;
    for (const cb of value.UpdateCallbacks || []) {
      if (!cb || typeof cb !== "object") continue;
      if (Object.keys(cb)[0] !== "osgAnimation.UpdateMatrixTransform") continue;
      const update = cb["osgAnimation.UpdateMatrixTransform"];
      if (update && update.Name) return update;
    }
    return null;
  }
  function collectGeometries(node, polyBin, wireBin, axisRotation, axisNode, skeletonData = null, flatten = false, animatedNames = null, bonePolicy = "keep") {
    const uidMap = {};
    buildUidMap(node, uidMap);
    resolveRefs(node, uidMap);
    const animateOnlyCtx = [];
    const stateSetOrdinal = /* @__PURE__ */ new Map();
    function childrenOf(item) {
      if (!item || typeof item !== "object") return null;
      if (Array.isArray(item.Children)) return item.Children;
      for (const v of Object.values(item)) {
        if (v && typeof v === "object" && Array.isArray(v.Children)) return v.Children;
      }
      return null;
    }
    const objectNames = (() => {
      const names = /* @__PURE__ */ new Set();
      let kids = childrenOf(node) || [];
      for (let i = 0; i < 20; i++) {
        if (kids.length !== 1) break;
        const grand = childrenOf(kids[0]);
        if (!grand) break;
        kids = grand;
      }
      const harvest = (n, depth) => {
        if (!n || typeof n !== "object" || depth > 3) return;
        if (Array.isArray(n)) {
          for (const item of n) harvest(item, depth);
          return;
        }
        const kids2 = childrenOf(n);
        const nm = nodeGroupName(n);
        if (nm && kids2 && kids2.length > 1) names.add(nm);
        else if (nm && depth === 0) names.add(nm);
        for (const v of Object.values(n)) {
          if (v && typeof v === "object") harvest(v, depth + 1);
        }
      };
      for (const child of kids) harvest(child, 0);
      return names;
    })();
    const rootGroupOf = /* @__PURE__ */ new Map();
    (function mapRoots(n, depth, root) {
      if (!n || typeof n !== "object" || depth > 12) return;
      if (Array.isArray(n)) {
        for (const item of n) mapRoots(item, depth, root);
        return;
      }
      const kids = childrenOf(n);
      const nm = nodeGroupName(n);
      const startsObject = !!(nm && objectNames.has(nm));
      const here = startsObject ? nm : root;
      if (startsObject && !rootGroupOf.has(nm)) rootGroupOf.set(nm, root || nm);
      for (const v of Object.values(n)) {
        if (v && typeof v === "object") mapRoots(v, depth + 1, here);
      }
    })(node, 0, null);
    (function ordinalPass(o) {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) {
        for (const item of o) ordinalPass(item);
        return;
      }
      const ss = o["osg.StateSet"];
      if (ss && ss.UniqueID !== void 0 && !stateSetOrdinal.has(ss.UniqueID)) {
        stateSetOrdinal.set(ss.UniqueID, stateSetOrdinal.size + 1);
      }
      for (const v of Object.values(o)) {
        if (v && typeof v === "object") ordinalPass(v);
      }
    })(node);
    const AXIS_MAT4 = mat4FromMat3(axisRotation);
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    function skeletonsFor(rig) {
      if (!rig || !rig.BoneMap || !skeletonData) return null;
      for (const name of Object.keys(rig.BoneMap)) {
        const bone = skeletonData.boneByName.get(name);
        if (bone && bone.skeleton) return bone.skeleton;
      }
      return null;
    }
    const sharedState = { expectedState: [0] };
    const stats = { rig: 0, geom: 0, morph: 0, wire: 0, skip: 0, errors: [] };
    function acceptGeometry(geom, label, rig, placement, morphNode, animCtx, group) {
      if (!geom) return;
      if (isWireframeGeom(geom)) {
        stats.wire++;
        return;
      }
      const uid = geom.UniqueID;
      const key = uid !== void 0 ? "id:" + uid : "obj:" + (geom.Name || label || results.length);
      if (seen.has(key)) return;
      if (uid !== void 0) seen.add(key);
      else seen.add(key);
      try {
        const underAnimated = !!animCtx && !rig;
        const animDrivenWrapper = !!(animCtx && animCtx.name && animatedNames && animatedNames.has(animCtx.name));
        const flattenAnimated = underAnimated && flatten && !animDrivenWrapper;
        const result = processGeometry(
          geom,
          polyBin,
          wireBin,
          sharedState,
          axisRotation,
          placement,
          // The axis fix stays off either way: when not flattening it
          // rides the wrapper node, and when flattening animChainMatrix
          // composes it in. Applying it here as well would double it.
          { skipAxis: underAnimated }
        );
        if (underAnimated && !flattenAnimated) result.animCtx = animCtx;
        else if (flattenAnimated) {
          applyPlacement(result, animChainMatrix(animCtx));
        }
        const ssId = geom.StateSet && geom.StateSet["osg.StateSet"] ? geom.StateSet["osg.StateSet"].UniqueID : void 0;
        if (ssId !== void 0 && stateSetOrdinal.has(ssId)) {
          result.stateSetOrdinal = stateSetOrdinal.get(ssId);
        }
        if (group) {
          result.groupName = group;
          result.rootGroupName = rootGroupOf.get(group) || group;
        }
        if ((result.indices || result.mode === "POINTS") && result.attributes.POSITION) {
          const tcKeys = Object.keys(result.attributes).filter((k) => k.startsWith("_TC_")).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
          result.uvUnits = tcKeys.map((k) => Number(k.slice(4)));
          let tcIdx = 0;
          for (const k of tcKeys) {
            result.attributes[`TEXCOORD_${tcIdx++}`] = result.attributes[k];
            delete result.attributes[k];
          }
          if (morphNode) {
            const targets = readMorphTargets(
              morphNode,
              result,
              polyBin,
              wireBin,
              axisRotation,
              placement,
              underAnimated
            );
            if (targets.length) result.morphTargets = targets;
          }
          if (rig) {
            const skinAttrs = readRigAttributes(
              rig,
              polyBin,
              result.attributes.POSITION.count
            );
            if (skinAttrs) {
              if (bonePolicy === "bake") {
                applyRestPose(result, skinAttrs, rig.BoneMap, skeletonsFor(rig));
              } else {
                result.attributes.JOINTS_0 = skinAttrs.JOINTS_0;
                result.attributes.WEIGHTS_0 = skinAttrs.WEIGHTS_0;
                result.boneMap = rig.BoneMap;
              }
            }
          }
          results.push(result);
        } else {
          stats.skip++;
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        stats.errors.push(`${geom.Name || label || "?"}: ${msg}`);
        console.warn(`  Warning: skipping ${geom.Name || label}: ${msg}`);
      }
    }
    function fullPathOf(value, acc) {
      if (!value || typeof value !== "object") return acc;
      if (!Array.isArray(value.Matrix) || value.Matrix.length !== 16) return acc;
      return mat4Multiply(acc, value.Matrix);
    }
    function placementOf(value, acc) {
      if (!value || typeof value !== "object") return acc;
      const inner = Array.isArray(value.Matrix) && value.Matrix.length === 16 ? value : (() => {
        for (const v of Object.values(value)) {
          if (v && typeof v === "object" && Array.isArray(v.Matrix) && v.Matrix.length === 16) {
            return v;
          }
        }
        return null;
      })();
      if (!inner) return acc;
      if (inner === axisNode || value === axisNode) return acc;
      return mat4Multiply(acc, inner.Matrix);
    }
    function descend(value, acc, ctx) {
      const update = value === axisNode ? null : animatedTransform(value);
      if (!update) return [placementOf(value, acc), ctx];
      const next = { name: update.Name, trs: stackedTRS(value), pre: acc, parent: ctx, node: -1 };
      if (animatedNames && update.Name && animatedNames.has(update.Name)) {
        animateOnlyCtx.push(next);
      }
      return [IDENTITY_MAT4, next];
    }
    function trsToMatrix(trs) {
      if (!trs) return IDENTITY_MAT4;
      const t = trs.translation || [0, 0, 0];
      const q = trs.rotation || [0, 0, 0, 1];
      const s = trs.scale || [1, 1, 1];
      const [x, y, z, w] = q;
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      return new Float32Array([
        (1 - (yy + zz)) * s[0],
        (xy + wz) * s[0],
        (xz - wy) * s[0],
        0,
        (xy - wz) * s[1],
        (1 - (xx + zz)) * s[1],
        (yz + wx) * s[1],
        0,
        (xz + wy) * s[2],
        (yz - wx) * s[2],
        (1 - (xx + yy)) * s[2],
        0,
        t[0],
        t[1],
        t[2],
        1
      ]);
    }
    function animChainMatrix(ctx) {
      if (!ctx) return IDENTITY_MAT4;
      const chain = [];
      for (let c = ctx; c; c = c.parent) chain.push(c);
      chain.reverse();
      let m = IDENTITY_MAT4;
      for (const link of chain) {
        const pre = link.parent ? link.pre : mat4Multiply(AXIS_MAT4, link.pre || IDENTITY_MAT4);
        if (pre && !isIdentityMat4(pre)) m = mat4Multiply(m, pre);
        const local = trsToMatrix(link.trs);
        if (local && !isIdentityMat4(local)) m = mat4Multiply(m, local);
      }
      return m;
    }
    function walk(obj, depth, acc, ctx, belowSkel, group) {
      if (!obj || typeof obj !== "object" || depth > 60) return;
      if (Array.isArray(obj)) {
        for (const item of obj) walk(item, depth + 1, acc, ctx, belowSkel, group);
        return;
      }
      const ownName = nodeGroupName(obj);
      const groupHere = ownName && objectNames.has(ownName) ? ownName : group;
      if (obj["osgAnimation.Skeleton"] || obj["osg.Skeleton"]) {
        const skel = obj["osgAnimation.Skeleton"] || obj["osg.Skeleton"];
        for (const [k, v] of Object.entries(obj)) {
          if (k === "osgAnimation.Skeleton" || k === "osg.Skeleton") continue;
          const [a2, c2] = descend(v, acc, ctx);
          walk(v, depth + 1, a2, c2, belowSkel, groupHere);
        }
        for (const [, v] of Object.entries(skel)) {
          const [a2, c2] = descend(v, acc, ctx);
          walk(v, depth + 1, a2, c2, IDENTITY_MAT4, groupHere);
        }
        return;
      }
      if (obj["osgAnimation.RigGeometry"] || obj["osg.RigGeometry"]) {
        const rig = obj["osgAnimation.RigGeometry"] || obj["osg.RigGeometry"];
        stats.rig++;
        const mesh = extractMeshGeometry(rig);
        const morph = rig.SourceGeometry && rig.SourceGeometry["osgAnimation.MorphGeometry"] || null;
        acceptGeometry(mesh, "RigGeometry", rig, belowSkel, morph, ctx, groupHere);
        for (const [k, v] of Object.entries(rig)) {
          if (k === "SourceGeometry") continue;
          {
            const [a2, c2] = descend(v, acc, ctx);
            walk(v, depth + 1, a2, c2, belowSkel && fullPathOf(v, belowSkel), groupHere);
          }
        }
        for (const [k, v] of Object.entries(obj)) {
          if (k === "osgAnimation.RigGeometry" || k === "osg.RigGeometry") continue;
          {
            const [a2, c2] = descend(v, acc, ctx);
            walk(v, depth + 1, a2, c2, belowSkel && fullPathOf(v, belowSkel), groupHere);
          }
        }
        return;
      }
      if (obj["osgAnimation.MorphGeometry"] || obj["osg.MorphGeometry"]) {
        const morph = obj["osgAnimation.MorphGeometry"] || obj["osg.MorphGeometry"];
        stats.morph++;
        const mesh = extractMeshGeometry(morph) || morph;
        acceptGeometry(mesh, "MorphGeometry", null, acc, morph, ctx, groupHere);
        for (const [k, v] of Object.entries(obj)) {
          if (k === "osgAnimation.MorphGeometry" || k === "osg.MorphGeometry") continue;
          {
            const [a2, c2] = descend(v, acc, ctx);
            walk(v, depth + 1, a2, c2, belowSkel && fullPathOf(v, belowSkel), groupHere);
          }
        }
        for (const [k, v] of Object.entries(morph)) {
          if (k === "SourceGeometry") continue;
          {
            const [a2, c2] = descend(v, acc, ctx);
            walk(v, depth + 1, a2, c2, belowSkel && fullPathOf(v, belowSkel), groupHere);
          }
        }
        return;
      }
      if (obj["osg.Geometry"]) {
        stats.geom++;
        acceptGeometry(obj["osg.Geometry"], "Geometry", null, acc, null, ctx, groupHere);
      }
      for (const v of Object.values(obj)) {
        const [a2, c2] = descend(v, acc, ctx);
        walk(v, depth + 1, a2, c2, belowSkel && fullPathOf(v, belowSkel), groupHere);
      }
    }
    function nodeGroupName(obj) {
      if (!obj || typeof obj !== "object") return null;
      if (typeof obj.Name === "string" && obj.Name) return obj.Name;
      for (const key of [
        "osg.MatrixTransform",
        "osg.Node",
        "osg.Transform",
        "osg.PositionAttitudeTransform",
        "osg.Geometry"
      ]) {
        const inner = obj[key];
        if (inner && typeof inner.Name === "string" && inner.Name) return inner.Name;
      }
      return null;
    }
    walk(node, 0, IDENTITY_MAT4, null, null, null);
    const usedCtx = new Set(results.filter((r) => !r.animateOnly).map((r) => r.animCtx).filter(Boolean));
    for (const ctx of animateOnlyCtx) {
      if (usedCtx.has(ctx)) continue;
      usedCtx.add(ctx);
      results.push({ animCtx: ctx, animateOnly: true });
    }
    if (!results.length) {
      const errBits = [
        `rig=${stats.rig}`,
        `geom=${stats.geom}`,
        `morph=${stats.morph}`,
        `wire=${stats.wire}`,
        `skip=${stats.skip}`
      ];
      if (stats.errors.length) {
        errBits.push("errors=" + stats.errors.slice(0, 3).join(" | "));
      }
      console.warn("collectGeometries: no meshes", errBits.join(", "));
    }
    return results;
  }
  function packGlb(json, bin) {
    const j = JSON.parse(JSON.stringify(json));
    if (j.buffers && j.buffers[0]) delete j.buffers[0].uri;
    const jsonBytes = new TextEncoder().encode(JSON.stringify(j));
    const jsonPadded = pad4(jsonBytes, 32);
    const binPadded = pad4(bin, 0);
    const totalLen = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
    const glb = new Uint8Array(totalLen);
    const dv = new DataView(glb.buffer);
    dv.setUint32(0, 1179937895, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalLen, true);
    let o = 12;
    dv.setUint32(o, jsonPadded.length, true);
    o += 4;
    dv.setUint32(o, 1313821514, true);
    o += 4;
    glb.set(jsonPadded, o);
    o += jsonPadded.length;
    dv.setUint32(o, binPadded.length, true);
    o += 4;
    dv.setUint32(o, 5130562, true);
    o += 4;
    glb.set(binPadded, o);
    return glb;
  }
  function indexTextureFiles(textureList) {
    const textureFiles = {};
    if (!textureList || !textureList.length) return textureFiles;
    for (const t of textureList) {
      const base = t.name.split("/").pop();
      const bare = textureBasename(base);
      textureFiles[base] = t.data;
      textureFiles[bare] = t.data;
      textureFiles[t.name] = t.data;
      textureFiles["textures/" + base] = t.data;
      textureFiles["textures/" + bare] = t.data;
      if (t.originalName) {
        textureFiles[t.originalName] = t.data;
        textureFiles["textures/" + t.originalName] = t.data;
      }
      const uidM = base.match(/^([a-f0-9]{32})_/i);
      if (uidM) textureFiles[uidM[1].toLowerCase()] = t.data;
      if (t.uid) textureFiles[String(t.uid).toLowerCase()] = t.data;
      const anyUid = t.name.match(/([a-f0-9]{32})/i);
      if (anyUid) textureFiles[anyUid[1].toLowerCase()] = t.data;
    }
    return textureFiles;
  }
  async function flipNormalMapY(bytes) {
    if (typeof createImageBitmap === "undefined" || typeof OffscreenCanvas === "undefined") {
      return bytes;
    }
    try {
      const blob = new Blob([bytes]);
      const bmp = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i + 1] = 255 - d[i + 1];
      }
      ctx.putImageData(img, 0, 0);
      const outBlob = await canvas.convertToBlob({ type: "image/png" });
      return new Uint8Array(await outBlob.arrayBuffer());
    } catch (_) {
      return bytes;
    }
  }
  function animBinKey(name) {
    return String(name || "").split("/").pop().replace(/\.gz$/i, "").replace(/\.bin$/i, "").toLowerCase();
  }
  function channelFileName(channel) {
    const key = channel && channel.KeyFrames && channel.KeyFrames.Key;
    if (!key || !key.Array) return "";
    const type = Object.keys(key.Array)[0];
    return key.Array[type] && key.Array[type].File || "";
  }
  function buildAnimationCurves(osgjs, animationBins) {
    const entries = animationBins ? Object.entries(animationBins) : [];
    if (!entries.length) return [];
    const animations = collectAnimations(osgjs);
    if (!animations.length) return [];
    const buffers = /* @__PURE__ */ new Map();
    for (const [name, data] of entries) {
      if (!data) continue;
      buffers.set(animBinKey(name), asArrayBuffer(data));
    }
    const only = buffers.size === 1 ? [...buffers.values()][0] : null;
    const out = [];
    for (const anim of animations) {
      const curves = [];
      let failed = 0;
      for (const entry of anim.Channels || []) {
        const type = Object.keys(entry)[0];
        const channel = entry[type];
        const bin = buffers.get(animBinKey(channelFileName(channel))) || only;
        if (!bin) continue;
        try {
          const curve = decodeChannelCurve(bin, type, channel);
          if (curve) curves.push(curve);
        } catch (e) {
          failed++;
        }
      }
      if (failed) {
        console.warn(`  Warning: ${failed} animation channel(s) failed to decode`);
      }
      if (curves.length) out.push({ name: anim.Name || "Animation", curves });
    }
    return out;
  }
  async function convertOsgjsToGlb(osgjs, polyBin, wireBin, textureList, viewerMaterials = null, animationBins = null, orientation = null, merge = false, mergeMode = "grouped", lights = null, bones = true) {
    const poly = polyBin instanceof Uint8Array ? polyBin.buffer.slice(polyBin.byteOffset, polyBin.byteOffset + polyBin.byteLength) : polyBin;
    const wire = !wireBin ? null : wireBin instanceof Uint8Array ? wireBin.buffer.slice(wireBin.byteOffset, wireBin.byteOffset + wireBin.byteLength) : wireBin;
    const axis = axisRotationFor(osgjs);
    const skeletons = collectSkeletons(osgjs, axis.node);
    const animationCurves = buildAnimationCurves(osgjs, animationBins);
    const geometries = collectGeometries(
      osgjs,
      poly,
      wire,
      axis.matrix,
      axis.node,
      skeletons,
      merge,
      new Set(animationCurves.flatMap((a) => a.curves.map((c) => c.target))),
      bones === false ? "bake" : "keep"
    );
    if (!geometries.length) {
      throw new Error(
        "No triangle geometries found in osgjs (checked osg.Geometry, RigGeometry.SourceGeometry, MorphGeometry)"
      );
    }
    const list = (textureList || []).map((t) => ({ ...t }));
    const needFlipUids = /* @__PURE__ */ new Set();
    let flipAllNormals = true;
    if (viewerMaterials) {
      const vm = viewerMaterials instanceof Map ? viewerMaterials : new Map(Object.entries(viewerMaterials));
      let anySpec = false;
      for (const spec of vm.values()) {
        if (!spec) continue;
        anySpec = true;
        if (spec.normalFlipY && spec.normalUid) {
          needFlipUids.add(String(spec.normalUid).toLowerCase());
        }
        if (spec.clearCoat && spec.clearCoat.normalFlipY && spec.clearCoat.normalTextureUid) {
          needFlipUids.add(String(spec.clearCoat.normalTextureUid).toLowerCase());
        }
      }
      if (anySpec && needFlipUids.size > 0) flipAllNormals = false;
    }
    for (const t of list) {
      const bare = textureBasename(t.name);
      const uids = [t.uid, ...t.imageUids || []].filter(Boolean).map((x) => String(x).toLowerCase());
      const nameIsNormal = /_n\.(png|jpe?g|webp)$/i.test(bare) || /normal/i.test(bare);
      const uidMatch = uids.some((u) => needFlipUids.has(u));
      const shouldFlip = uidMatch || flipAllNormals && nameIsNormal;
      if (shouldFlip) {
        t._flipYData = await flipNormalMapY(t.data);
      }
    }
    const textureFiles = indexTextureFiles(list);
    for (const t of list) {
      if (t._flipYData) {
        const bare = textureBasename(t.name);
        textureFiles[t.name + ".__flipY"] = t._flipYData;
        textureFiles[bare + ".__flipY"] = t._flipYData;
        textureFiles["textures/" + bare + ".__flipY"] = t._flipYData;
        textureFiles[bare + ".__flipY"] = t._flipYData;
      }
    }
    const { global: textureMap, perGeom: perGeomMaps } = buildTextureMaps(
      geometries,
      list,
      textureFiles,
      viewerMaterials
    );
    const tintDone = /* @__PURE__ */ new Map();
    for (const map of perGeomMaps) {
      if (!map || map.skip || !map.opacityAsAlbedo || !map.alpha) continue;
      const tintKey = map.alpha + "|" + (map.baseColorFactor || []).join(",");
      if (tintDone.has(tintKey)) {
        map.albedo = tintDone.get(tintKey);
        map.baseColorFactor = [1, 1, 1, 1];
        continue;
      }
      const mHit = findTextureBytes(map.alpha, textureFiles);
      if (!mHit) continue;
      try {
        const baked = await bakeTintWithAlpha(map.baseColorFactor || [1, 1, 1, 1], mHit.data);
        if (!baked) continue;
        const bakedName = textureBasename(map.alpha).replace(/\.[^.]+$/, "") + "_tint.png";
        textureFiles[bakedName] = baked;
        textureFiles["textures/" + bakedName] = baked;
        list.push({ name: "textures/" + bakedName, data: baked });
        tintDone.set(tintKey, bakedName);
        map.albedo = bakedName;
        map.baseColorFactor = [1, 1, 1, 1];
      } catch (_) {
      }
    }
    const bakedDone = /* @__PURE__ */ new Map();
    for (const map of perGeomMaps) {
      if (!map || map.skip || !map.albedo || !map.alpha || !map.opacityEnable) continue;
      if (/dither/i.test(String(map.opacityType || ""))) continue;
      const bakeKey = map.albedo + "|" + map.alpha;
      if (bakedDone.has(bakeKey)) {
        const prev = bakedDone.get(bakeKey);
        if (prev) map.albedo = prev;
        else map.forceOpaque = true;
        continue;
      }
      const aHit = findTextureBytes(map.albedo, textureFiles);
      const mHit = findTextureBytes(map.alpha, textureFiles);
      if (!aHit || !mHit) continue;
      try {
        const baked = await bakeOpacityIntoAlbedo(aHit.data, mHit.data);
        if (!baked) continue;
        if (!baked.hasTransparency) {
          bakedDone.set(bakeKey, null);
          map.forceOpaque = true;
          continue;
        }
        const bakedName = textureBasename(map.albedo).replace(/\.[^.]+$/, "") + "_alpha.png";
        textureFiles[bakedName] = baked.data;
        textureFiles["textures/" + bakedName] = baked.data;
        list.push({ name: "textures/" + bakedName, data: baked.data });
        bakedDone.set(bakeKey, bakedName);
        map.albedo = bakedName;
      } catch (_) {
      }
    }
    const embedded = buildGLTF(geometries, textureMap, textureFiles, perGeomMaps, {
      skeletons: bones === false ? { skeletons: [], boneByName: /* @__PURE__ */ new Map() } : skeletons,
      animationCurves,
      axisRotation: axis.matrix,
      orientation,
      externalTextures: false,
      merge,
      mergeMode,
      lights
    });
    const glb = packGlb(embedded.json, embedded.bin);
    const textureEmbedCount = embedded.json.images && embedded.json.images.length || 0;
    const meshCount = embedded.json.meshes && embedded.json.meshes.length || 0;
    const external = buildGLTF(geometries, textureMap, textureFiles, perGeomMaps, {
      skeletons: bones === false ? { skeletons: [], boneByName: /* @__PURE__ */ new Map() } : skeletons,
      animationCurves,
      axisRotation: axis.matrix,
      orientation,
      externalTextures: true,
      merge,
      mergeMode,
      lights
    });
    external.json.buffers = [
      {
        byteLength: external.bin.length,
        uri: "model.bin"
      }
    ];
    const jsonText = new TextEncoder().encode(
      JSON.stringify(external.json, null, 2)
    );
    const textureAliases = [];
    const usedBare = new Set(
      (external.json.images || []).map((im) => (im.uri || "").replace(/^textures\//, "")).filter(Boolean)
    );
    for (const t of list) {
      const bare = textureBasename(t.name);
      if (usedBare.has(bare)) {
        textureAliases.push({ from: t.name, to: "textures/" + bare, data: t.data });
      }
    }
    const boneCount = skeletons.skeletons.reduce((n, sk) => n + sk.bones.length, 0);
    return {
      glb,
      skippedGeometries: embedded.skipped || [],
      geometryCount: meshCount || geometries.length,
      json: embedded.json,
      textureEmbedCount,
      rig: {
        skeletons: skeletons.skeletons.length,
        bones: boneCount,
        skins: (embedded.json.skins || []).length,
        animations: (embedded.json.animations || []).length,
        channels: (embedded.json.animations || []).reduce(
          (n, a) => n + a.channels.length,
          0
        )
      },
      gltfExternal: {
        jsonText,
        bin: external.bin instanceof Uint8Array ? external.bin : new Uint8Array(external.bin),
        textureAliases
      }
    };
  }
  async function convertOsgjsToGlbFromFiles(fileMap, viewerMaterials = null, textureList = null, orientation = null, merge = false, mergeMode = "grouped", lights = null, bones = true) {
    let osgjsRaw = fileMap["file.osgjs"];
    if (!osgjsRaw) throw new Error("file.osgjs missing");
    if (osgjsRaw instanceof Uint8Array) osgjsRaw = new TextDecoder().decode(osgjsRaw);
    const osgjs = typeof osgjsRaw === "string" ? JSON.parse(osgjsRaw) : osgjsRaw;
    const poly = fileMap["model_file.bin"];
    if (!poly) throw new Error("model_file.bin missing");
    const wire = fileMap["model_file_wireframe.bin"] || null;
    const animationBins = {};
    for (const [name, data] of Object.entries(fileMap)) {
      if (!(data instanceof Uint8Array)) continue;
      if (/(^|\/)animations\//i.test(name) || /\.bin\.gz$/i.test(name)) {
        animationBins[name] = data;
      }
    }
    const textures = [];
    if (Array.isArray(textureList)) {
      for (const t of textureList) {
        if (t && t.data) textures.push(t);
      }
    } else {
      for (const [name, data] of Object.entries(fileMap)) {
        if (name.startsWith("textures/") && data instanceof Uint8Array) {
          textures.push({ name, data });
        }
      }
    }
    return convertOsgjsToGlb(osgjs, poly, wire, textures, viewerMaterials, animationBins, orientation, merge, mergeMode, lights, bones);
  }

  // src/mesh.js
  function localMatrix(node) {
    if (node.matrix) return node.matrix;
    const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
    const [sx, sy, sz] = node.scale || [1, 1, 1];
    const [tx, ty, tz] = node.translation || [0, 0, 0];
    return [
      (1 - 2 * (y * y + z * z)) * sx,
      2 * (x * y + z * w) * sx,
      2 * (x * z - y * w) * sx,
      0,
      2 * (x * y - z * w) * sy,
      (1 - 2 * (x * x + z * z)) * sy,
      2 * (y * z + x * w) * sy,
      0,
      2 * (x * z + y * w) * sz,
      2 * (y * z - x * w) * sz,
      (1 - 2 * (x * x + y * y)) * sz,
      0,
      tx,
      ty,
      tz,
      1
    ];
  }
  function accessor(json, bin, id) {
    const a = json.accessors?.[id];
    if (!a || a.sparse || a.normalized) throw new Error("Unsupported mesh accessor.");
    const b = json.bufferViews?.[a.bufferView];
    if (!b || b.buffer !== 0) throw new Error("Mesh buffer is missing.");
    const types = { 5121: ["getUint8", 1], 5123: ["getUint16", 2], 5125: ["getUint32", 4], 5126: ["getFloat32", 4] };
    const type = types[a.componentType];
    const itemSize = { SCALAR: 1, VEC3: 3 }[a.type];
    if (!type || !itemSize) throw new Error("Unsupported position/index format.");
    const [getter, bytes] = type;
    const stride = b.byteStride || itemSize * bytes;
    const base = (b.byteOffset || 0) + (a.byteOffset || 0);
    const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    if (!Number.isInteger(a.count) || a.count < 0 || stride < itemSize * bytes || base < 0 || a.count && base + (a.count - 1) * stride + itemSize * bytes > (b.byteOffset || 0) + b.byteLength || (b.byteOffset || 0) + b.byteLength > bin.byteLength) throw new Error("Invalid mesh buffer bounds.");
    return {
      count: a.count,
      get(i, component = 0) {
        if (!Number.isInteger(i) || i < 0 || i >= a.count) throw new Error("Mesh index is out of range.");
        return view[getter](base + i * stride + component * bytes, true);
      }
    };
  }
  function readTriangles(json, bin) {
    const parts = [];
    let capacity = 0;
    const nodes = json.nodes || [];
    const childNodes = new Set(nodes.flatMap((n) => n.children || []));
    const roots = json.scenes?.[json.scene || 0]?.nodes || nodes.map((_, i) => i).filter((i) => !childNodes.has(i));
    function visit(id, parent, path) {
      if (path.has(id)) throw new Error("Cyclic model scene.");
      if (path.size > 256) throw new Error("Model scene is too deeply nested.");
      const node = nodes[id];
      if (!node) throw new Error("Scene node is missing.");
      const world = mat4Multiply(parent, localMatrix(node));
      const det = world[0] * (world[5] * world[10] - world[9] * world[6]) - world[4] * (world[1] * world[10] - world[9] * world[2]) + world[8] * (world[1] * world[6] - world[5] * world[2]);
      if (node.skin != null) throw new Error("Unexpected unbaked skeleton in print geometry.");
      for (const primitive of json.meshes?.[node.mesh]?.primitives || []) {
        const mode = primitive.mode ?? 4;
        if (![4, 5, 6].includes(mode)) continue;
        const positions = accessor(json, bin, primitive.attributes.POSITION);
        const indices = primitive.indices != null ? accessor(json, bin, primitive.indices) : null;
        const count = indices?.count ?? positions.count;
        const triangles = mode === 4 ? Math.floor(count / 3) : Math.max(0, count - 2);
        capacity += triangles;
        if (capacity > 3e6) throw new Error("This mesh exceeds the browser limit of 3 million triangles.");
        parts.push({ positions, indices, count, mode, world, mirrored: det < 0 });
      }
      const next = new Set(path);
      next.add(id);
      for (const child of node.children || []) visit(child, world, next);
    }
    for (const root of roots) visit(root, IDENTITY_MAT4, /* @__PURE__ */ new Set());
    const output = new Float32Array(capacity * 9);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let used = 0, degenerate = 0;
    for (const p of parts) {
      const point = (index) => {
        const x = p.positions.get(index, 0), y = p.positions.get(index, 1), z = p.positions.get(index, 2);
        const m = p.world;
        return [m[0] * x + m[4] * y + m[8] * z + m[12], -(m[2] * x + m[6] * y + m[10] * z + m[14]), m[1] * x + m[5] * y + m[9] * z + m[13]];
      };
      const emit = (a, b, c) => {
        const ids = [a, b, c].map((i) => p.indices ? p.indices.get(i) : i);
        if (p.mirrored) [ids[1], ids[2]] = [ids[2], ids[1]];
        const points = ids.map(point);
        if (!points.flat().every(Number.isFinite)) throw new Error("Model contains invalid coordinates.");
        const [v0, v1, v2] = points;
        const u = v1.map((v3, i) => v3 - v0[i]), v = v2.map((v3, i) => v3 - v0[i]);
        if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) === 0) {
          degenerate++;
          return;
        }
        for (const pt of points) for (let axis = 0; axis < 3; axis++) {
          output[used++] = pt[axis];
          min[axis] = Math.min(min[axis], pt[axis]);
          max[axis] = Math.max(max[axis], pt[axis]);
        }
      };
      if (p.mode === 4) for (let i = 0; i + 2 < p.count; i += 3) emit(i, i + 1, i + 2);
      if (p.mode === 5) for (let i = 2; i < p.count; i++) i % 2 ? emit(i - 1, i - 2, i) : emit(i - 2, i - 1, i);
      if (p.mode === 6) for (let i = 2; i < p.count; i++) emit(0, i - 1, i);
    }
    if (!used) throw new Error("The model contains no printable triangles.");
    return {
      triangles: output.subarray(0, used),
      count: used / 9,
      min,
      max,
      dimensions: max.map((v, i) => v - min[i]),
      degenerate
    };
  }
  function resizedMesh(mesh, longestEdge) {
    const target = longestEdge === "" || longestEdge == null ? null : Number(longestEdge);
    if (target != null && (!Number.isFinite(target) || target <= 0 || target > 1e4)) {
      throw new Error("Enter a longest edge between 0 and 10,000 mm, or leave it blank to preserve scale.");
    }
    const scale = target == null ? 1 : target / Math.max(...mesh.dimensions);
    if (!Number.isFinite(scale) || scale <= 0) throw new Error("The model has an invalid size.");
    const out = new Float32Array(mesh.triangles.length);
    const origin = [(mesh.min[0] + mesh.max[0]) / 2, (mesh.min[1] + mesh.max[1]) / 2, mesh.min[2]];
    for (let i = 0; i < out.length; i++) out[i] = (mesh.triangles[i] - origin[i % 3]) * scale;
    return {
      triangles: out,
      count: mesh.count,
      scale,
      dimensions: mesh.dimensions.map((v) => v * scale),
      units: target == null ? "source coordinates; confirm slicer units" : "mm"
    };
  }
  function writeStl(mesh) {
    const bytes = new Uint8Array(84 + mesh.count * 50);
    bytes.set(new TextEncoder().encode("Sketchfab Easy Download | experimental authorized reference export"));
    const view = new DataView(bytes.buffer);
    view.setUint32(80, mesh.count, true);
    const t = mesh.triangles;
    for (let face = 0; face < mesh.count; face++) {
      const i = face * 9, off = 84 + face * 50;
      const ax = t[i + 3] - t[i], ay = t[i + 4] - t[i + 1], az = t[i + 5] - t[i + 2];
      const bx = t[i + 6] - t[i], by = t[i + 7] - t[i + 1], bz = t[i + 8] - t[i + 2];
      const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx], len = Math.hypot(...n) || 1;
      for (let j = 0; j < 3; j++) view.setFloat32(off + j * 4, n[j] / len, true);
      for (let j = 0; j < 9; j++) view.setFloat32(off + 12 + j * 4, t[i + j], true);
    }
    return bytes;
  }
  function writeObj(mesh) {
    const lines = ["# Experimental reference export; Z-up; verify scale and mesh before printing."];
    const t = mesh.triangles;
    for (let i = 0; i < t.length; i += 3) lines.push(`v ${t[i]} ${t[i + 1]} ${t[i + 2]}`);
    for (let i = 1; i <= mesh.count * 3; i += 3) lines.push(`f ${i} ${i + 1} ${i + 2}`);
    return new TextEncoder().encode(lines.join("\n") + "\n");
  }

  // src/model.js
  var cachedKey;
  async function prepareModel(url, { signal: signal2, progress = () => {
  } } = {}) {
    const uid = extractUid(url);
    if (!uid) throw new Error("Open a Sketchfab model page first.");
    setRequestSignal(signal2);
    const stage = (label, percent) => {
      if (signal2?.aborted) throw new DOMException("Cancelled", "AbortError");
      progress(label, percent);
    };
    stage("Reading model details\u2026", 6);
    const { info, embedHtml } = await fetchViewerInfo(uid);
    if (!isBinzFormat(info)) throw new Error("This viewer format is not supported, or the model is not publicly accessible.");
    if (info.isPrivate || info.isPasswordProtected) throw new Error("Private or password-protected models are not supported.");
    if (Number(info.files?.[0]?.modelSize) > 150 * 1024 * 1024) throw new Error("This model is too large for the browser exporter (150 MB).");
    stage("Preparing viewer decoder\u2026", 18);
    const key = cachedKey || await extractStaticKey(embedHtml);
    const wasm = Uint8Array.from(atob("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IF4gyAE3AgAgAygCBCFfIF8pAgAhyQFC//////////8/IcoBIMkBIMoBgyHLASBfIMsBNwIAIAMoAhAhYCBgKQIAIcwBQj4hzQEgzAEgzQGIIc4BIM4BpyFhAkAgYUUNACADKAIQIWIgYikCACHPAUL//////////z8h0AEgzwEg0AGDIdEBIGIg0QE3AgAgAygCBCFjIGMpAgAh0gFC//////////8/IdMBINIBINMBgyHUAUKAgICAgICAgMAAIdUBINQBINUBhCHWASBjINYBNwIACwsgAygCECFkIGQpAgAh1wFC/////3Mh2AEg1wEg2AGDIdkBQoCAgIAEIdoBINkBINoBhCHbASBkINsBNwIAIAMoAhAhZUEIIWYgZSBmaiFnIAMgZzYCHAwECwsgAygCECFoIGgpAgAh3AFCPiHdASDcASDdAYgh3gEg3gGnIWkCQCBpRQ0ADAILIAMoAhAhaiADKAIQIWsgaykCACHfAUL/////AyHgASDfASDgAYMh4QEg4QGnIWwgaiBsEA8hbSADIG02AhAMAAALAAtBACFuEBAgAygCFCFvIG8QASFwIAMgcDYCABAQIAMoAhQhcSADKAIAIXIgcSFzIHOtIeIBIHIpAgAh4wFC/////wMh5AEg4gEg5AGDIeUBQoCAgIB8IeYBIOMBIOYBgyHnASDnASDlAYQh6AEgciDoATcCACADKAIAIXQgdCkCACHpAUL/////cyHqASDpASDqAYMh6wFCgICAgAQh7AEg6wEg7AGEIe0BIHQg7QE3AgAgAygCACF1IHUpAgAh7gFC//////////8/Ie8BIO4BIO8BgyHwAUKAgICAgICAgMAAIfEBIPABIPEBhCHyASB1IPIBNwIAQQAhdiB2KAKUiwEhdyB3IXggbiF5IHggeUchekEBIXsgeiB7cSF8AkACQCB8DQAgAygCACF9IH0pAgAh8wFC/////4+AgIBAIfQBIPMBIPQBgyH1ASB9IPUBNwIAIAMoAgAhfkEAIX8gfyB+NgKUiwEgAygCACGAAUEAIYEBIIEBIIABNgKYiwEMAQtBACGCASADKAIQIYMBIIMBKQIAIfYBQv////8DIfcBIPYBIPcBgyH4ASD4AachhAEgAygCACGFASCEASGGASCGAa0h+QEghQEpAgAh+gFC/////wMh+wEg+QEg+wGDIfwBQiAh/QEg/AEg/QGGIf4BQv////+PgICAQCH/ASD6ASD/AYMhgAIggAIg/gGEIYECIIUBIIECNwIAIAMoAhAhhwEgAygCECGIASCIASkCACGCAkL/////AyGDAiCCAiCDAoMhhAIghAKnIYkBIIcBIIkBEA8higEgAygCACGLASCLASCCARAPIYwBIIoBIY0BIIwBIY4BII0BII4BRiGPAUEBIZABII8BIJABcSGRAQJAAkAgkQFFDQBBASGSAUEBIZMBIJIBIJMBcSGUASCUAQ0BCxAACyADKAIQIZUBIJUBKQIAIYUCQv//////////PyGGAiCFAiCGAoMhhwIglQEghwI3AgALEBAgAygCACGWAUEIIZcBIJYBIJcBaiGYASADIJgBNgIcCyADKAIcIZkBQSAhmgEgAyCaAWohmwEgmwEkACCZAQ8L4wUCL380fiMAIQFBECECIAEgAmshAyADIAA2AgggAygCCCEEIAQpAgAhMEI+ITEgMCAxiCEyIDKnIQUCQAJAIAVFDQBBACEGIAYhBwwBCyADKAIIIQggAygCCCEJIAkpAgAhM0L/////AyE0IDMgNIMhNSA1pyEKIAggCmohCyALIQcLIAchDEEAIQ0gAyAMNgIEIAMoAgQhDiAOIQ8gDSEQIA8gEEchEUEBIRIgESAScSETAkACQCATDQAgAygCCCEUIAMgFDYCDAwBCyADKAIEIRUgFSkCACE2Qv////8DITcgNiA3gyE4IDinIRYgAygCCCEXIBcpAgAhOUL/////AyE6IDkgOoMhOyA7pyEYIBggFmohGSAZIRogGq0hPCAXKQIAIT1C/////wMhPiA8ID6DIT9CgICAgHwhQCA9IECDIUEgQSA/hCFCIBcgQjcCACADKAIEIRsgGykCACFDQj4hRCBDIESIIUUgRachHCADKAIIIR0gHCEeIB6tIUYgHSkCACFHQgMhSCBGIEiDIUlCPiFKIEkgSoYhS0L//////////z8hTCBHIEyDIU0gTSBLhCFOIB0gTjcCACADKAIIIR8gHykCACFPQj4hUCBPIFCIIVEgUachIAJAICANACADKAIIISEgISkCACFSQj4hUyBSIFOIIVQgVKchIgJAAkAgIkUNAEEAISMgIyEkDAELIAMoAgQhJSADKAIEISYgJikCACFVQv////8DIVYgVSBWgyFXIFenIScgJSAnaiEoICghJAsgJCEpIAMgKTYCACADKAIIISogKikCACFYQv////8DIVkgWCBZgyFaIFqnISsgAygCACEsICshLSAtrSFbICwpAgAhXEL/////AyFdIFsgXYMhXkIgIV8gXiBfhiFgQv////+PgICAQCFhIFwgYYMhYiBiIGCEIWMgLCBjNwIACyADKAIIIS4gAyAuNgIMCyADKAIMIS8gLw8LmwUCPn8dfiMAIQFBECECIAEgAmshAyADJABBACEEIAMgADYCDCADKAIMIQUgBSEGIAQhByAGIAdHIQhBASEJIAggCXEhCgJAAkAgCg0ADAELQQAhCyADKAIMIQxBeCENIAwgDWohDiADIA42AgggAygCCCEPIA8pAgAhP0IgIUAgPyBAiCFBQv////8DIUIgQSBCgyFDIEOnIRAgECERIAshEiARIBJKIRNBASEUIBMgFHEhFQJAIBVFDQBBACEWIAMoAgghFyADKAIIIRggGCkCACFEQiAhRSBEIEWIIUZC/////wMhRyBGIEeDIUggSKchGSAWIBlrIRogFyAaaiEbIAMgGzYCBCADKAIEIRwgHCkCACFJQh4hSiBJIEqIIUtCAyFMIEsgTIMhTSBNpyEdAkAgHQ0AIAMoAgQhHiAeEBIhHyADIB82AggLCyADKAIIISAgICkCACFOQj4hTyBOIE+IIVAgUKchIQJAICENACADKAIIISIgAygCCCEjICMpAgAhUUL/////AyFSIFEgUoMhUyBTpyEkICIgJGohJSADICU2AgAgAygCACEmICYpAgAhVEIeIVUgVCBViCFWQgMhVyBWIFeDIVggWKchJwJAICcNACADKAIIISggKBASISkgAyApNgIICwsgAygCCCEqICopAgAhWUL/////cyFaIFkgWoMhWyAqIFs3AgAgAygCCCErQQAhLCAsKAKYiwEhLSArIS4gLSEvIC4gL0khMEEBITEgMCAxcSEyAkAgMg0AQQAhM0EAITQgNCgCmIsBITUgNSE2IDMhNyA2IDdGIThBASE5IDggOXEhOiA6RQ0BCyADKAIIITtBACE8IDwgOzYCmIsBC0EQIT0gAyA9aiE+ID4kAA8L4yICywN/Cn4jACEGQaABIQcgBiAHayEIIAgkAEHkByEJQQAhCiAIIAA2ApgBIAggATYClAEgCCACNgKQASAIIAM2AowBIAggBDYCiAEgCCAFNgKEASAIIAo2AoABIAggCjYCfCAIKAKYASELQQQhDCALIAxqIQ0gCCANNgJ0IAgoAnQhDiAIIA42AnAgCCgCjAEhDyAIIA82AmwgCCgCiAEhECAJIREgECESIBEgEkshE0EBIRQgEyAUcSEVAkACQCAVRQ0AQVQhFiAIIBY2ApwBDAELQYACIRdB/AAhGCAIIBhqIRkgGSEaQYABIRsgCCAbaiEcIBwhHUHkAiEeIAgoAmwhH0HkBSEgIB8gIGohISAIKAJsISIgCCgClAEhIyAIKAKQASEkIAgoAmwhJUGAASEmICUgJmohJyAIKAKEASEoICEgFyAiIBogHSAjICQgJyAeICgQFSEpIAggKTYCeCAIKAJ4ISogKhAWISsCQCArRQ0AIAgoAnghLCAIICw2ApwBDAELQegAIS0gCCAtaiEuIC4hLyAIKAKYASEwIC8gMBAXIAgoAoABITEgCC0AaCEyQf8BITMgMiAzcSE0QQEhNSA0IDVqITYgMSE3IDYhOCA3IDhLITlBASE6IDkgOnEhOwJAIDtFDQBBVCE8IAggPDYCnAEMAQtBACE9QQQhPkHoACE/IAggP2ohQCBAIUFBACFCIAggQjoAaSAIKAKAASFDIAggQzoAaiAIKAKYASFEIEEoAAAhRSBEIEU2AAAgCCA9NgJgIAggPjYCXCAIKAJ8IUZBBCFHIEYgR2shSEEBIUkgSCBJaiFKIAggSjYCWCAIID02AmQCQANAIAgoAmQhSyAIKAKAASFMQQEhTSBMIE1qIU4gSyFPIE4hUCBPIFBIIVFBASFSIFEgUnEhUyBTRQ0BIAgoAmAhVCAIIFQ2AlQgCCgCbCFVIAgoAmQhVkECIVcgViBXdCFYIFUgWGohWSBZKAIAIVogCCgCYCFbIFsgWmohXCAIIFw2AmAgCCgCVCFdIAgoAmwhXkHAACFfIF4gX2ohYCAIKAJkIWFBAiFiIGEgYnQhYyBgIGNqIWQgZCBdNgIAIAgoAmQhZUEBIWYgZSBmaiFnIAggZzYCZAwAAAsAC0EAIWggCCBoNgJkAkADQCAIKAJkIWkgCCgCWCFqIGkhayBqIWwgayBsSCFtQQEhbiBtIG5xIW8gb0UNAUEAIXAgCCBwNgJQAkADQEEEIXEgCCgCUCFyIHIhcyBxIXQgcyB0SCF1QQEhdiB1IHZxIXcgd0UNASAIKAJsIXhB5AUheSB4IHlqIXogCCgCZCF7IAgoAlAhfCB7IHxqIX0geiB9aiF+IH4tAAAhf0H/ASGAASB/IIABcSGBASAIIIEBNgJMIAgoAmQhggEgCCgCUCGDASCCASCDAWohhAEgCCgCbCGFAUHkAyGGASCFASCGAWohhwEgCCgCbCGIAUHAACGJASCIASCJAWohigEgCCgCTCGLAUECIYwBIIsBIIwBdCGNASCKASCNAWohjgEgjgEoAgAhjwFBASGQASCPASCQAWohkQEgjgEgkQE2AgAghwEgjwFqIZIBIJIBIIQBOgAAIAgoAlAhkwFBASGUASCTASCUAWohlQEgCCCVATYCUAwAAAsACyAIKAJkIZYBQQQhlwEglgEglwFqIZgBIAggmAE2AmQMAAALAAsCQANAIAgoAmQhmQEgCCgCfCGaASCZASGbASCaASGcASCbASCcAUghnQFBASGeASCdASCeAXEhnwEgnwFFDQEgCCgCbCGgAUHkBSGhASCgASChAWohogEgCCgCZCGjASCiASCjAWohpAEgpAEtAAAhpQFB/wEhpgEgpQEgpgFxIacBIAggpwE2AkggCCgCZCGoASAIKAJsIakBQeQDIaoBIKkBIKoBaiGrASAIKAJsIawBQcAAIa0BIKwBIK0BaiGuASAIKAJIIa8BQQIhsAEgrwEgsAF0IbEBIK4BILEBaiGyASCyASgCACGzAUEBIbQBILMBILQBaiG1ASCyASC1ATYCACCrASCzAWohtgEgtgEgqAE6AAAgCCgCZCG3AUEBIbgBILcBILgBaiG5ASAIILkBNgJkDAAACwALQQEhugFBACG7ASAIKAJsIbwBILwBKAIAIb0BIAggvQE2AkAgCCC7ATYCPCAIILoBNgJEAkADQCAIKAJEIb4BIAgoAoABIb8BQQEhwAEgvwEgwAFqIcEBIL4BIcIBIMEBIcMBIMIBIMMBSSHEAUEBIcUBIMQBIMUBcSHGASDGAUUNASAIKAJsIccBIAgoAkQhyAFBAiHJASDIASDJAXQhygEgxwEgygFqIcsBIMsBKAIAIcwBIAggzAE2AjggCCgCRCHNAUEBIc4BIM4BIM0BdCHPASDPASDOAXUh0AEgCCDQATYCNCAIKAI8IdEBIAgg0QE2AjAgCCgCgAEh0gEgCCgCRCHTASDSASDTAWsh1AEg1AEgzgFqIdUBIAgg1QE6AC8gCCgCNCHWAUF/IdcBINYBINcBaiHYAUEHIdkBINgBINkBSxoCQAJAAkACQAJAAkAg2AEOCAABBAIEBAQDBAtBACHaASAIINoBNgIoAkADQCAIKAIoIdsBIAgoAjgh3AEg2wEh3QEg3AEh3gEg3QEg3gFIId8BQQEh4AEg3wEg4AFxIeEBIOEBRQ0BQSAh4gEgCCDiAWoh4wEg4wEh5AEgCCgCbCHlAUHkAyHmASDlASDmAWoh5wEgCCgCQCHoASAIKAIoIekBIOgBIOkBaiHqASDnASDqAWoh6wEg6wEtAAAh7AEgCCDsAToAICAILQAvIe0BIAgg7QE6ACEgCCgCcCHuASAIKAIwIe8BQQEh8AEg7wEg8AF0IfEBIO4BIPEBaiHyASDkAS8AACHzASDyASDzATsAACAIKAIwIfQBQQEh9QEg9AEg9QFqIfYBIAgg9gE2AjAgCCgCKCH3AUEBIfgBIPcBIPgBaiH5ASAIIPkBNgIoDAAACwALDAQLQQAh+gEgCCD6ATYCKAJAA0AgCCgCKCH7ASAIKAI4IfwBIPsBIf0BIPwBIf4BIP0BIP4BSCH/AUEBIYACIP8BIIACcSGBAiCBAkUNAUEYIYICIAggggJqIYMCIIMCIYQCIAgoAmwhhQJB5AMhhgIghQIghgJqIYcCIAgoAkAhiAIgCCgCKCGJAiCIAiCJAmohigIghwIgigJqIYsCIIsCLQAAIYwCIAggjAI6ABggCC0ALyGNAiAIII0COgAZIAgoAnAhjgIgCCgCMCGPAkEAIZACII8CIJACaiGRAkEBIZICIJECIJICdCGTAiCOAiCTAmohlAIghAIvAAAhlQIglAIglQI7AAAgCCgCcCGWAiAIKAIwIZcCQQEhmAIglwIgmAJqIZkCQQEhmgIgmQIgmgJ0IZsCIJYCIJsCaiGcAiCEAi8AACGdAiCcAiCdAjsAACAIKAIwIZ4CQQIhnwIgngIgnwJqIaACIAggoAI2AjAgCCgCKCGhAkEBIaICIKECIKICaiGjAiAIIKMCNgIoDAAACwALDAMLQQAhpAIgCCCkAjYCKAJAA0AgCCgCKCGlAiAIKAI4IaYCIKUCIacCIKYCIagCIKcCIKgCSCGpAkEBIaoCIKkCIKoCcSGrAiCrAkUNASAIKAJsIawCQeQDIa0CIKwCIK0CaiGuAiAIKAJAIa8CIAgoAighsAIgrwIgsAJqIbECIK4CILECaiGyAiCyAi0AACGzAiAILQAvIbQCQf8BIbUCILMCILUCcSG2AkH/ASG3AiC0AiC3AnEhuAIgtgIguAIQGCHRAyAIINEDNwMQIAgoAnAhuQIgCCgCMCG6AkEBIbsCILoCILsCdCG8AiC5AiC8AmohvQIgCCkDECHSAyC9AiDSAxAZIAgoAjAhvgJBBCG/AiC+AiC/AmohwAIgCCDAAjYCMCAIKAIoIcECQQEhwgIgwQIgwgJqIcMCIAggwwI2AigMAAALAAsMAgtBACHEAiAIIMQCNgIoAkADQCAIKAIoIcUCIAgoAjghxgIgxQIhxwIgxgIhyAIgxwIgyAJIIckCQQEhygIgyQIgygJxIcsCIMsCRQ0BIAgoAmwhzAJB5AMhzQIgzAIgzQJqIc4CIAgoAkAhzwIgCCgCKCHQAiDPAiDQAmoh0QIgzgIg0QJqIdICINICLQAAIdMCIAgtAC8h1AJB/wEh1QIg0wIg1QJxIdYCQf8BIdcCINQCINcCcSHYAiDWAiDYAhAYIdMDIAgg0wM3AwggCCgCcCHZAiAIKAIwIdoCQQEh2wIg2gIg2wJ0IdwCINkCINwCaiHdAiAIKQMIIdQDIN0CINQDEBkgCCgCcCHeAiAIKAIwId8CQQEh4AIg3wIg4AJ0IeECIN4CIOECaiHiAkEIIeMCIOICIOMCaiHkAiAIKQMIIdUDIOQCINUDEBkgCCgCMCHlAkEIIeYCIOUCIOYCaiHnAiAIIOcCNgIwIAgoAigh6AJBASHpAiDoAiDpAmoh6gIgCCDqAjYCKAwAAAsACwwBC0EAIesCIAgg6wI2AigCQANAIAgoAigh7AIgCCgCOCHtAiDsAiHuAiDtAiHvAiDuAiDvAkgh8AJBASHxAiDwAiDxAnEh8gIg8gJFDQFBACHzAiAIKAJsIfQCQeQDIfUCIPQCIPUCaiH2AiAIKAJAIfcCIAgoAigh+AIg9wIg+AJqIfkCIPYCIPkCaiH6AiD6Ai0AACH7AiAILQAvIfwCQf8BIf0CIPsCIP0CcSH+AkH/ASH/AiD8AiD/AnEhgAMg/gIggAMQGCHWAyAIINYDNwMAIAgg8wI2AiQCQANAIAgoAiQhgQMgCCgCNCGCAyCBAyGDAyCCAyGEAyCDAyCEA0ghhQNBASGGAyCFAyCGA3EhhwMghwNFDQEgCCgCcCGIAyAIKAIwIYkDQQEhigMgiQMgigN0IYsDIIgDIIsDaiGMAyAIKAIkIY0DQQEhjgMgjQMgjgN0IY8DIIwDII8DaiGQAyAIKQMAIdcDIJADINcDEBkgCCgCcCGRAyAIKAIwIZIDQQEhkwMgkgMgkwN0IZQDIJEDIJQDaiGVAyAIKAIkIZYDQQEhlwMglgMglwN0IZgDIJUDIJgDaiGZA0EIIZoDIJkDIJoDaiGbAyAIKQMAIdgDIJsDINgDEBkgCCgCcCGcAyAIKAIwIZ0DQQEhngMgnQMgngN0IZ8DIJwDIJ8DaiGgAyAIKAIkIaEDQQEhogMgoQMgogN0IaMDIKADIKMDaiGkA0EQIaUDIKQDIKUDaiGmAyAIKQMAIdkDIKYDINkDEBkgCCgCcCGnAyAIKAIwIagDQQEhqQMgqAMgqQN0IaoDIKcDIKoDaiGrAyAIKAIkIawDQQEhrQMgrAMgrQN0Ia4DIKsDIK4DaiGvA0EYIbADIK8DILADaiGxAyAIKQMAIdoDILEDINoDEBkgCCgCJCGyA0EQIbMDILIDILMDaiG0AyAIILQDNgIkDAAACwALIAgoAiQhtQMgCCgCNCG2AyC1AyG3AyC2AyG4AyC3AyC4A0YhuQNBASG6AyC5AyC6A3EhuwMCQCC7Aw0AEAALIAgoAjQhvAMgCCgCMCG9AyC9AyC8A2ohvgMgCCC+AzYCMCAIKAIoIb8DQQEhwAMgvwMgwANqIcEDIAggwQM2AigMAAALAAsLIAgoAjghwgMgCCgCQCHDAyDDAyDCA2ohxAMgCCDEAzYCQCAIKAI4IcUDIAgoAjQhxgMgxQMgxgNsIccDIAgoAjwhyAMgyAMgxwNqIckDIAggyQM2AjwgCCgCRCHKA0EBIcsDIMoDIMsDaiHMAyAIIMwDNgJEDAAACwALIAgoAnghzQMgCCDNAzYCnAELIAgoApwBIc4DQaABIc8DIAggzwNqIdADINADJAAgzgMPC8QBAQ9/IwAhCkEwIQsgCiALayEMIAwkACAMIAA2AiwgDCABNgIoIAwgAjYCJCAMIAM2AiAgDCAENgIcIAwgBTYCGCAMIAY2AhQgDCAHNgIQIAwgCDYCDCAMIAk2AgggDCgCLCENIAwoAighDiAMKAIkIQ8gDCgCICEQIAwoAhwhESAMKAIYIRIgDCgCFCETIAwoAhAhFCAMKAIMIRUgDSAOIA8gECARIBIgEyAUIBUQGiEWQTAhFyAMIBdqIRggGCQAIBYPC0MBCn8jACEBQRAhAiABIAJrIQNBiH8hBCADIAA2AgwgAygCDCEFIAUhBiAEIQcgBiAHSyEIQQEhCSAIIAlxIQogCg8LMAEFfyMAIQJBECEDIAIgA2shBCAEIAE2AgwgBCgCDCEFIAUoAAAhBiAAIAY2AAAPC4ECAhp/Bn4jACECQRAhAyACIANrIQQgBCQAIAQgADoADyAEIAE6AA4QGyEFAkACQCAFRQ0AIAQtAA8hBkH/ASEHIAYgB3EhCCAELQAOIQlB/wEhCiAJIApxIQtBCCEMIAsgDHQhDSAIIA1qIQ4gDiEPIA+sIRwgBCAcNwMADAELIAQtAA8hEEH/ASERIBAgEXEhEkEIIRMgEiATdCEUIAQtAA4hFUH/ASEWIBUgFnEhFyAUIBdqIRggGCEZIBmsIR0gBCAdNwMACyAEKQMAIR5CgYCEgJCAwAAhHyAeIB9+ISAgBCAgNwMAIAQpAwAhIUEQIRogBCAaaiEbIBskACAhDws5AgR/AX4jACECQRAhAyACIANrIQQgBCAANgIMIAQgATcDACAEKQMAIQYgBCgCDCEFIAUgBjcAAA8LhRMCgAJ/AX4jACEJQYABIQogCSAKayELIAskAEEAIQwgCyAANgIkIAsgATYCICALIAI2AhwgCyADNgIYIAsgBDYCFCALIAU2AhAgCyAGNgIMIAsgBzYCCCALIAg2AgQgCygCJCENIAsoAiAhDiALKAIcIQ8gCygCGCEQIAsoAhQhESALKAIQIRIgCygCDCETIAsoAgghFCALKAIEIRUgCyANNgJ4IAsgDjYCdCALIA82AnAgCyAQNgJsIAsgETYCaCALIBI2AmQgCyATNgJgIAsgFDYCXCALIBU2AlggCyAMNgJUIAsoAmQhFiALIBY2AkwgCygCYCEXAkACQCAXDQBBuH8hGCALIBg2AnwMAQtBgAEhGSALKAJMIRogGi0AACEbQf8BIRwgGyAccSEdIAsgHTYCSCALKAJIIR4gHiEfIBkhICAfICBPISFBASEiICEgInEhIwJAAkAgI0UNACALKAJIISRB/wAhJSAkICVrISYgCyAmNgJEIAsoAkQhJ0EBISggJyAoaiEpQQEhKiApICp2ISsgCyArNgJIIAsoAkghLEEBIS0gLCAtaiEuIAsoAmAhLyAuITAgLyExIDAgMUshMkEBITMgMiAzcSE0AkAgNEUNAEG4fyE1IAsgNTYCfAwDCyALKAJEITYgCygCdCE3IDYhOCA3ITkgOCA5TyE6QQEhOyA6IDtxITwCQCA8RQ0AQWwhPSALID02AnwMAwtBACE+IAsoAkwhP0EBIUAgPyBAaiFBIAsgQTYCTCALID42AkACQANAIAsoAkAhQiALKAJEIUMgQiFEIEMhRSBEIEVJIUZBASFHIEYgR3EhSCBIRQ0BIAsoAkwhSSALKAJAIUpBASFLIEogS3YhTCBJIExqIU0gTS0AACFOQf8BIU8gTiBPcSFQQQQhUSBQIFF1IVIgCygCeCFTIAsoAkAhVCBTIFRqIVUgVSBSOgAAIAsoAkwhViALKAJAIVdBASFYIFcgWHYhWSBWIFlqIVogWi0AACFbQf8BIVwgWyBccSFdQQ8hXiBdIF5xIV8gCygCeCFgIAsoAkAhYUEBIWIgYSBiaiFjIGAgY2ohZCBkIF86AAAgCygCQCFlQQIhZiBlIGZqIWcgCyBnNgJADAAACwALDAELIAsoAkghaEEBIWkgaCBpaiFqIAsoAmAhayBqIWwgayFtIGwgbUshbkEBIW8gbiBvcSFwAkAgcEUNAEG4fyFxIAsgcTYCfAwCC0EGIXIgCygCeCFzIAsoAnQhdEEBIXUgdCB1ayF2IAsoAkwhd0EBIXggdyB4aiF5IAsoAkgheiALKAJcIXsgCygCWCF8IAsoAlQhfSBzIHYgeSB6IHIgeyB8IH0QhwEhfiALIH42AkQgCygCRCF/IH8QgwEhgAECQCCAAUUNACALKAJEIYEBIAsggQE2AnwMAgsLQQAhggEgCygCcCGDAUIAIYkCIIMBIIkCNwIAQTAhhAEggwEghAFqIYUBQQAhhgEghQEghgE2AgBBKCGHASCDASCHAWohiAEgiAEgiQI3AgBBICGJASCDASCJAWohigEgigEgiQI3AgBBGCGLASCDASCLAWohjAEgjAEgiQI3AgBBECGNASCDASCNAWohjgEgjgEgiQI3AgBBCCGPASCDASCPAWohkAEgkAEgiQI3AgAgCyCCATYCUCALIIIBNgI8AkADQCALKAI8IZEBIAsoAkQhkgEgkQEhkwEgkgEhlAEgkwEglAFJIZUBQQEhlgEglQEglgFxIZcBIJcBRQ0BQQwhmAEgCygCeCGZASALKAI8IZoBIJkBIJoBaiGbASCbAS0AACGcAUH/ASGdASCcASCdAXEhngEgngEhnwEgmAEhoAEgnwEgoAFOIaEBQQEhogEgoQEgogFxIaMBAkAgowFFDQBBbCGkASALIKQBNgJ8DAMLQQEhpQEgCygCcCGmASALKAJ4IacBIAsoAjwhqAEgpwEgqAFqIakBIKkBLQAAIaoBQf8BIasBIKoBIKsBcSGsAUECIa0BIKwBIK0BdCGuASCmASCuAWohrwEgrwEoAgAhsAFBASGxASCwASCxAWohsgEgrwEgsgE2AgAgCygCeCGzASALKAI8IbQBILMBILQBaiG1ASC1AS0AACG2AUH/ASG3ASC2ASC3AXEhuAEgpQEguAF0IbkBQQEhugEguQEgugF1IbsBIAsoAlAhvAEgvAEguwFqIb0BIAsgvQE2AlAgCygCPCG+AUEBIb8BIL4BIL8BaiHAASALIMABNgI8DAAACwALIAsoAlAhwQECQCDBAQ0AQWwhwgEgCyDCATYCfAwBC0EMIcMBIAsoAlAhxAEgxAEQeiHFAUEBIcYBIMUBIMYBaiHHASALIMcBNgI4IAsoAjghyAEgyAEhyQEgwwEhygEgyQEgygFLIcsBQQEhzAEgywEgzAFxIc0BAkAgzQFFDQBBbCHOASALIM4BNgJ8DAELQQEhzwEgCygCOCHQASALKAJoIdEBINEBINABNgIAIAsoAjgh0gEgzwEg0gF0IdMBIAsg0wE2AjQgCygCNCHUASALKAJQIdUBINQBINUBayHWASALINYBNgIwIAsoAjAh1wEg1wEQeiHYASDPASDYAXQh2QEgCyDZATYCLCALKAIwIdoBINoBEHoh2wFBASHcASDbASDcAWoh3QEgCyDdATYCKCALKAIsId4BIAsoAjAh3wEg3gEh4AEg3wEh4QEg4AEg4QFHIeIBQQEh4wEg4gEg4wFxIeQBAkAg5AFFDQBBbCHlASALIOUBNgJ8DAELQQIh5gEgCygCKCHnASALKAJ4IegBIAsoAkQh6QEg6AEg6QFqIeoBIOoBIOcBOgAAIAsoAnAh6wEgCygCKCHsAUECIe0BIOwBIO0BdCHuASDrASDuAWoh7wEg7wEoAgAh8AFBASHxASDwASDxAWoh8gEg7wEg8gE2AgAgCygCcCHzASDzASgCBCH0ASD0ASH1ASDmASH2ASD1ASD2AUkh9wFBASH4ASD3ASD4AXEh+QECQAJAIPkBDQAgCygCcCH6ASD6ASgCBCH7AUEBIfwBIPsBIPwBcSH9ASD9AUUNAQtBbCH+ASALIP4BNgJ8DAELIAsoAkQh/wFBASGAAiD/ASCAAmohgQIgCygCbCGCAiCCAiCBAjYCACALKAJIIYMCQQEhhAIggwIghAJqIYUCIAsghQI2AnwLIAsoAnwhhgJBgAEhhwIgCyCHAmohiAIgiAIkACCGAg8LSwELfyMAIQBBECEBIAAgAWshAkEIIQMgAiADaiEEIAQhBUEAIQYgBigCnB0hByAFIAc2AgAgAi0ACCEIQf8BIQkgCCAJcSEKIAoPC6wWAYwCfyMAIQZBsAIhByAGIAdrIQggCCQAQTAhCSAIIAlqIQogCiELQSghDCAIIAxqIQ0gDSEOIAggADYCHCAIIAE2AhggCCACNgIUIAggAzYCECAIIAQ2AgwgCCAFNgIIIAgoAhwhDyAIKAIYIRAgCCgCFCERIAgoAhAhEiAIKAIMIRMgCCAPNgJoIAggEDYCZCAIIBE2AmAgCCASNgJcIAggEzYCWCAIKAJoIRQgCCAUNgJUIAgoAlQhFSAIKAJkIRYgFSAWaiEXIAggFzYCUCAIKAJYIRhBBCEZIBggGWohGiAIIBo2AkwgCCgCTCEbIAggGzYCSCAIKAJYIRwgDiAcEBcgCC0AKiEdQf8BIR4gHSAecSEfIAggHzYCJCAIKAJgISAgCCgCXCEhIAsgICAhEB0hIiAIICI2AiAgCCgCICEjICMQFiEkAkACQCAkRQ0AIAgoAiAhJSAIICU2AmwMAQtBMCEmIAggJmohJyAnISggCCgCVCEpIAgoAlAhKiAIKAJIISsgCCgCJCEsIAggKTYChAEgCCAoNgKAASAIICo2AnwgCCArNgJ4IAggLDYCdCAIKAKEASEtIAggLTYCcAJAA0BBACEuIAgoAoABIS8gLxAeITAgMCExIC4hMiAxIDJGITNBASE0IDMgNHEhNSAIKAKEASE2IAgoAnwhN0F9ITggNyA4aiE5IDYhOiA5ITsgOiA7SSE8QQEhPSA8ID1xIT4gNSA+cSE/ID9FDQEQHyFAAkAgQEUNACAIKAKAASFBIAgoAnghQiAIKAJ0IUMgCCBBNgKYASAIIEI2ApQBIAggQzYCkAEgCCgCmAEhRCAIKAKQASFFIEQgRRAgIUYgCCBGNgKMASAIKAKUASFHIAgoAowBIUhBASFJIEggSXQhSiBHIEpqIUsgSy0AACFMIAggTDoAiwEgCCgCmAEhTSAIKAKUASFOIAgoAowBIU9BASFQIE8gUHQhUSBOIFFqIVIgUi0AASFTQf8BIVQgUyBUcSFVIAggTTYCoAEgCCBVNgKcASAIKAKcASFWIAgoAqABIVcgVygCBCFYIFggVmohWSBXIFk2AgQgCC0AiwEhWiAIKAKEASFbQQEhXCBbIFxqIV0gCCBdNgKEASBbIFo6AAALEB8hXgJAIF4NAAsgCCgCgAEhXyAIKAJ4IWAgCCgCdCFhIAggXzYCtAEgCCBgNgKwASAIIGE2AqwBIAgoArQBIWIgCCgCrAEhYyBiIGMQICFkIAggZDYCqAEgCCgCsAEhZSAIKAKoASFmQQEhZyBmIGd0IWggZSBoaiFpIGktAAAhaiAIIGo6AKcBIAgoArQBIWsgCCgCsAEhbCAIKAKoASFtQQEhbiBtIG50IW8gbCBvaiFwIHAtAAEhcUH/ASFyIHEgcnEhcyAIIGs2ArwBIAggczYCuAEgCCgCuAEhdCAIKAK8ASF1IHUoAgQhdiB2IHRqIXcgdSB3NgIEIAgtAKcBIXggCCgChAEheUEBIXogeSB6aiF7IAggezYChAEgeSB4OgAAEB8hfAJAIHxFDQAgCCgCgAEhfSAIKAJ4IX4gCCgCdCF/IAggfTYC0AEgCCB+NgLMASAIIH82AsgBIAgoAtABIYABIAgoAsgBIYEBIIABIIEBECAhggEgCCCCATYCxAEgCCgCzAEhgwEgCCgCxAEhhAFBASGFASCEASCFAXQhhgEggwEghgFqIYcBIIcBLQAAIYgBIAggiAE6AMMBIAgoAtABIYkBIAgoAswBIYoBIAgoAsQBIYsBQQEhjAEgiwEgjAF0IY0BIIoBII0BaiGOASCOAS0AASGPAUH/ASGQASCPASCQAXEhkQEgCCCJATYC2AEgCCCRATYC1AEgCCgC1AEhkgEgCCgC2AEhkwEgkwEoAgQhlAEglAEgkgFqIZUBIJMBIJUBNgIEIAgtAMMBIZYBIAgoAoQBIZcBQQEhmAEglwEgmAFqIZkBIAggmQE2AoQBIJcBIJYBOgAACyAIKAKAASGaASAIKAJ4IZsBIAgoAnQhnAEgCCCaATYC7AEgCCCbATYC6AEgCCCcATYC5AEgCCgC7AEhnQEgCCgC5AEhngEgnQEgngEQICGfASAIIJ8BNgLgASAIKALoASGgASAIKALgASGhAUEBIaIBIKEBIKIBdCGjASCgASCjAWohpAEgpAEtAAAhpQEgCCClAToA3wEgCCgC7AEhpgEgCCgC6AEhpwEgCCgC4AEhqAFBASGpASCoASCpAXQhqgEgpwEgqgFqIasBIKsBLQABIawBQf8BIa0BIKwBIK0BcSGuASAIIKYBNgL0ASAIIK4BNgLwASAIKALwASGvASAIKAL0ASGwASCwASgCBCGxASCxASCvAWohsgEgsAEgsgE2AgQgCC0A3wEhswEgCCgChAEhtAFBASG1ASC0ASC1AWohtgEgCCC2ATYChAEgtAEgswE6AAAMAAALAAsQISG3AQJAILcBRQ0AAkADQEEAIbgBIAgoAoABIbkBILkBEB4hugEgugEhuwEguAEhvAEguwEgvAFGIb0BQQEhvgEgvQEgvgFxIb8BIAgoAoQBIcABIAgoAnwhwQEgwAEhwgEgwQEhwwEgwgEgwwFJIcQBQQEhxQEgxAEgxQFxIcYBIL8BIMYBcSHHASDHAUUNASAIKAKAASHIASAIKAJ4IckBIAgoAnQhygEgCCDIATYCiAIgCCDJATYChAIgCCDKATYCgAIgCCgCiAIhywEgCCgCgAIhzAEgywEgzAEQICHNASAIIM0BNgL8ASAIKAKEAiHOASAIKAL8ASHPAUEBIdABIM8BINABdCHRASDOASDRAWoh0gEg0gEtAAAh0wEgCCDTAToA+wEgCCgCiAIh1AEgCCgChAIh1QEgCCgC/AEh1gFBASHXASDWASDXAXQh2AEg1QEg2AFqIdkBINkBLQABIdoBQf8BIdsBINoBINsBcSHcASAIINQBNgKQAiAIINwBNgKMAiAIKAKMAiHdASAIKAKQAiHeASDeASgCBCHfASDfASDdAWoh4AEg3gEg4AE2AgQgCC0A+wEh4QEgCCgChAEh4gFBASHjASDiASDjAWoh5AEgCCDkATYChAEg4gEg4QE6AAAMAAALAAsLAkADQCAIKAKEASHlASAIKAJ8IeYBIOUBIecBIOYBIegBIOcBIOgBSSHpAUEBIeoBIOkBIOoBcSHrASDrAUUNASAIKAKAASHsASAIKAJ4Ie0BIAgoAnQh7gEgCCDsATYCpAIgCCDtATYCoAIgCCDuATYCnAIgCCgCpAIh7wEgCCgCnAIh8AEg7wEg8AEQICHxASAIIPEBNgKYAiAIKAKgAiHyASAIKAKYAiHzAUEBIfQBIPMBIPQBdCH1ASDyASD1AWoh9gEg9gEtAAAh9wEgCCD3AToAlwIgCCgCpAIh+AEgCCgCoAIh+QEgCCgCmAIh+gFBASH7ASD6ASD7AXQh/AEg+QEg/AFqIf0BIP0BLQABIf4BQf8BIf8BIP4BIP8BcSGAAiAIIPgBNgKsAiAIIIACNgKoAiAIKAKoAiGBAiAIKAKsAiGCAiCCAigCBCGDAiCDAiCBAmohhAIgggIghAI2AgQgCC0AlwIhhQIgCCgChAEhhgJBASGHAiCGAiCHAmohiAIgCCCIAjYChAEghgIghQI6AAAMAAALAAtBMCGJAiAIIIkCaiGKAiCKAiGLAiCLAhAiIYwCAkAgjAINAEFsIY0CIAggjQI2AmwMAQsgCCgCZCGOAiAIII4CNgJsCyAIKAJsIY8CQbACIZACIAggkAJqIZECIJECJAAgjwIPC/YKAqIBfwF+IwAhA0EgIQQgAyAEayEFIAUkAEEBIQYgBSAANgIYIAUgATYCFCAFIAI2AhAgBSgCECEHIAchCCAGIQkgCCAJSSEKQQEhCyAKIAtxIQwCQAJAIAxFDQBBuH8hDSAFKAIYIQ5CACGlASAOIKUBNwIAQRAhDyAOIA9qIRBBACERIBAgETYCAEEIIRIgDiASaiETIBMgpQE3AgAgBSANNgIcDAELQQQhFCAFKAIUIRUgBSgCGCEWIBYgFTYCDCAFKAIYIRcgFygCDCEYQQQhGSAYIBlqIRogBSgCGCEbIBsgGjYCECAFKAIQIRwgHCEdIBQhHiAdIB5PIR9BASEgIB8gIHEhIQJAAkAgIUUNACAFKAIUISIgBSgCECEjICIgI2ohJEF8ISUgJCAlaiEmIAUoAhghJyAnICY2AgggBSgCGCEoICgoAgghKSApELMBISogBSgCGCErICsgKjYCACAFKAIUISwgBSgCECEtQQEhLiAtIC5rIS8gLCAvaiEwIDAtAAAhMSAFIDE6AA8gBS0ADyEyQf8BITMgMiAzcSE0AkACQCA0RQ0AQQghNSAFLQAPITZB/wEhNyA2IDdxITggOBB6ITkgNSA5ayE6IDohOwwBC0EAITwgPCE7CyA7IT0gBSgCGCE+ID4gPTYCBCAFLQAPIT9B/wEhQCA/IEBxIUECQCBBDQBBfyFCIAUgQjYCHAwDCwwBCyAFKAIYIUMgQygCDCFEIEMgRDYCCCAFKAIYIUUgRSgCDCFGIEYtAAAhRyBFIEc2AgAgBSgCECFIQX4hSSBIIElqIUpBBSFLIEogS0saAkACQAJAAkACQAJAAkAgSg4GBQQDAgEABgsgBSgCFCFMIEwtAAYhTUH/ASFOIE0gTnEhT0EQIVAgTyBQdCFRIAUoAhghUiBSKAIAIVMgUyBRaiFUIFIgVDYCAAsgBSgCFCFVIFUtAAUhVkH/ASFXIFYgV3EhWEEIIVkgWCBZdCFaIAUoAhghWyBbKAIAIVwgXCBaaiFdIFsgXTYCAAsgBSgCFCFeIF4tAAQhX0H/ASFgIF8gYHEhYUEAIWIgYSBidCFjIAUoAhghZCBkKAIAIWUgZSBjaiFmIGQgZjYCAAsgBSgCFCFnIGctAAMhaEH/ASFpIGggaXEhakEYIWsgaiBrdCFsIAUoAhghbSBtKAIAIW4gbiBsaiFvIG0gbzYCAAsgBSgCFCFwIHAtAAIhcUH/ASFyIHEgcnEhc0EQIXQgcyB0dCF1IAUoAhghdiB2KAIAIXcgdyB1aiF4IHYgeDYCAAsgBSgCFCF5IHktAAEhekH/ASF7IHoge3EhfEEIIX0gfCB9dCF+IAUoAhghfyB/KAIAIYABIIABIH5qIYEBIH8ggQE2AgALIAUoAhQhggEgBSgCECGDAUEBIYQBIIMBIIQBayGFASCCASCFAWohhgEghgEtAAAhhwEgBSCHAToADiAFLQAOIYgBQf8BIYkBIIgBIIkBcSGKAQJAAkAgigFFDQBBCCGLASAFLQAOIYwBQf8BIY0BIIwBII0BcSGOASCOARB6IY8BIIsBII8BayGQASCQASGRAQwBC0EAIZIBIJIBIZEBCyCRASGTASAFKAIYIZQBIJQBIJMBNgIEIAUtAA4hlQFB/wEhlgEglQEglgFxIZcBAkAglwENAEFsIZgBIAUgmAE2AhwMAgtBBCGZASAFKAIQIZoBIJkBIJoBayGbAUEDIZwBIJsBIJwBdCGdASAFKAIYIZ4BIJ4BKAIEIZ8BIJ8BIJ0BaiGgASCeASCgATYCBAsgBSgCECGhASAFIKEBNgIcCyAFKAIcIaIBQSAhowEgBSCjAWohpAEgpAEkACCiAQ8LmwUBVX8jACEBQRAhAiABIAJrIQMgAyQAQSAhBCADIAA2AgggAygCCCEFIAUoAgQhBiAGIQcgBCEIIAcgCEshCUEBIQogCSAKcSELAkACQCALRQ0AQQMhDCADIAw2AgwMAQsgAygCCCENIA0oAgghDiADKAIIIQ8gDygCECEQIA4hESAQIRIgESASTyETQQEhFCATIBRxIRUCQCAVRQ0AIAMoAgghFiAWECUhFyADIBc2AgwMAQsgAygCCCEYIBgoAgghGSADKAIIIRogGigCDCEbIBkhHCAbIR0gHCAdRiEeQQEhHyAeIB9xISACQCAgRQ0AQSAhISADKAIIISIgIigCBCEjICMhJCAhISUgJCAlSSEmQQEhJyAmICdxISgCQCAoRQ0AQQEhKSADICk2AgwMAgtBAiEqIAMgKjYCDAwBC0EAISsgAygCCCEsICwoAgQhLUEDIS4gLSAudiEvIAMgLzYCBCADICs2AgAgAygCCCEwIDAoAgghMSADKAIEITIgKyAyayEzIDEgM2ohNCADKAIIITUgNSgCDCE2IDQhNyA2ITggNyA4SSE5QQEhOiA5IDpxITsCQCA7RQ0AQQEhPCADKAIIIT0gPSgCCCE+IAMoAgghPyA/KAIMIUAgPiBAayFBIAMgQTYCBCADIDw2AgALQQAhQiADKAIEIUMgAygCCCFEIEQoAgghRSBCIENrIUYgRSBGaiFHIEQgRzYCCCADKAIEIUhBAyFJIEggSXQhSiADKAIIIUsgSygCBCFMIEwgSmshTSBLIE02AgQgAygCCCFOIE4oAgghTyBPELMBIVAgAygCCCFRIFEgUDYCACADKAIAIVIgAyBSNgIMCyADKAIMIVNBECFUIAMgVGohVSBVJAAgUw8LCwEBf0EAIQAgAA8LwgEBGn8jACECQRAhAyACIANrIQQgBCQAQQEhBUEfIQYgBCAANgIMIAQgATYCCCAEIAY2AgQgBCgCCCEHIAchCCAFIQkgCCAJTyEKQQEhCyAKIAtxIQwCQCAMDQAQAAtBICENIAQoAgwhDiAOKAIAIQ8gBCgCDCEQIBAoAgQhEUEfIRIgESAScSETIA8gE3QhFCAEKAIIIRUgDSAVayEWQR8hFyAWIBdxIRggFCAYdiEZQRAhGiAEIBpqIRsgGyQAIBkPCwsBAX9BASEAIAAPC5cBARd/IwAhAUEQIQIgASACayEDQQAhBCADIAA2AgwgAygCDCEFIAUoAgghBiADKAIMIQcgBygCDCEIIAYhCSAIIQogCSAKRiELQQEhDCALIAxxIQ0gBCEOAkAgDUUNAEEgIQ8gAygCDCEQIBAoAgQhESARIRIgDyETIBIgE0YhFCAUIQ4LIA4hFUEBIRYgFSAWcSEXIBcPC/ePAQHqDH8jACEGQdALIQcgBiAHayEIIAgkAEEKIQkgCCAANgIYIAggATYCFCAIIAI2AhAgCCADNgIMIAggBDYCCCAIIAU2AgQgCCgCGCEKIAgoAhQhCyAIKAIQIQwgCCgCDCENIAgoAgghDiAIIAo2AogCIAggCzYChAIgCCAMNgKAAiAIIA02AvwBIAggDjYC+AEgCCgC/AEhDyAPIRAgCSERIBAgEUkhEkEBIRMgEiATcSEUAkACQCAURQ0AQWwhFSAIIBU2AowCDAELQQEhFkE4IRcgCCAXaiEYIBghGSAIKAKAAiEaIAggGjYC9AEgCCgCiAIhGyAIIBs2AvABIAgoAvABIRwgCCgChAIhHSAcIB1qIR4gCCAeNgLsASAIKALsASEfQX0hICAfICBqISEgCCAhNgLoASAIKAL4ASEiQQQhIyAiICNqISQgCCAkNgLkASAIKALkASElIAggJTYC4AEgCCgC9AEhJiAmECQhJ0H//wMhKCAnIChxISkgCCApNgJ8IAgoAvQBISpBAiErICogK2ohLCAsECQhLUH//wMhLiAtIC5xIS8gCCAvNgJ4IAgoAvQBITBBBCExIDAgMWohMiAyECQhM0H//wMhNCAzIDRxITUgCCA1NgJ0IAgoAvwBITYgCCgCfCE3IAgoAnghOCA3IDhqITkgCCgCdCE6IDkgOmohO0EGITwgOyA8aiE9IDYgPWshPiAIID42AnAgCCgC9AEhP0EGIUAgPyBAaiFBIAggQTYCbCAIKAJsIUIgCCgCfCFDIEIgQ2ohRCAIIEQ2AmggCCgCaCFFIAgoAnghRiBFIEZqIUcgCCBHNgJkIAgoAmQhSCAIKAJ0IUkgSCBJaiFKIAggSjYCYCAIKAKEAiFLQQMhTCBLIExqIU1BAiFOIE0gTnYhTyAIIE82AlwgCCgC8AEhUCAIKAJcIVEgUCBRaiFSIAggUjYCWCAIKAJYIVMgCCgCXCFUIFMgVGohVSAIIFU2AlQgCCgCVCFWIAgoAlwhVyBWIFdqIVggCCBYNgJQIAgoAvABIVkgCCBZNgJMIAgoAlghWiAIIFo2AkggCCgCVCFbIAggWzYCRCAIKAJQIVwgCCBcNgJAIAgoAvgBIV0gGSBdEBcgCC0AOiFeQf8BIV8gXiBfcSFgIAggYDYCNCAIIBY2AjAgCCgCcCFhIAgoAvwBIWIgYSFjIGIhZCBjIGRLIWVBASFmIGUgZnEhZwJAIGdFDQBBbCFoIAggaDYCjAIMAQtByAEhaSAIIGlqIWogaiFrIAgoAmwhbCAIKAJ8IW0gayBsIG0QHSFuIAggbjYCLCAIKAIsIW8gbxAWIXACQCBwRQ0AIAgoAiwhcSAIIHE2AowCDAELQbABIXIgCCByaiFzIHMhdCAIKAJoIXUgCCgCeCF2IHQgdSB2EB0hdyAIIHc2AiggCCgCKCF4IHgQFiF5AkAgeUUNACAIKAIoIXogCCB6NgKMAgwBC0GYASF7IAgge2ohfCB8IX0gCCgCZCF+IAgoAnQhfyB9IH4gfxAdIYABIAgggAE2AiQgCCgCJCGBASCBARAWIYIBAkAgggFFDQAgCCgCJCGDASAIIIMBNgKMAgwBC0GAASGEASAIIIQBaiGFASCFASGGASAIKAJgIYcBIAgoAnAhiAEghgEghwEgiAEQHSGJASAIIIkBNgIgIAgoAiAhigEgigEQFiGLAQJAIIsBRQ0AIAgoAiAhjAEgCCCMATYCjAIMAQsCQANAIAgoAjAhjQEgCCgCQCGOASAIKALoASGPASCOASGQASCPASGRASCQASCRAUkhkgFBASGTASCSASCTAXEhlAEgjQEglAFxIZUBIJUBRQ0BEB8hlgECQCCWAUUNAEHIASGXASAIIJcBaiGYASCYASGZASAIKALgASGaASAIKAI0IZsBIAggmQE2AqACIAggmgE2ApwCIAggmwE2ApgCIAgoAqACIZwBIAgoApgCIZ0BIJwBIJ0BECAhngEgCCCeATYClAIgCCgCnAIhnwEgCCgClAIhoAFBASGhASCgASChAXQhogEgnwEgogFqIaMBIKMBLQAAIaQBIAggpAE6AJMCIAgoAqACIaUBIAgoApwCIaYBIAgoApQCIacBQQEhqAEgpwEgqAF0IakBIKYBIKkBaiGqASCqAS0AASGrAUH/ASGsASCrASCsAXEhrQEgCCClATYCqAIgCCCtATYCpAIgCCgCpAIhrgEgCCgCqAIhrwEgrwEoAgQhsAEgsAEgrgFqIbEBIK8BILEBNgIEIAgtAJMCIbIBIAgoAkwhswFBASG0ASCzASC0AWohtQEgCCC1ATYCTCCzASCyAToAAAsQHyG2AQJAILYBRQ0AQbABIbcBIAggtwFqIbgBILgBIbkBIAgoAuABIboBIAgoAjQhuwEgCCC5ATYCvAIgCCC6ATYCuAIgCCC7ATYCtAIgCCgCvAIhvAEgCCgCtAIhvQEgvAEgvQEQICG+ASAIIL4BNgKwAiAIKAK4AiG/ASAIKAKwAiHAAUEBIcEBIMABIMEBdCHCASC/ASDCAWohwwEgwwEtAAAhxAEgCCDEAToArwIgCCgCvAIhxQEgCCgCuAIhxgEgCCgCsAIhxwFBASHIASDHASDIAXQhyQEgxgEgyQFqIcoBIMoBLQABIcsBQf8BIcwBIMsBIMwBcSHNASAIIMUBNgLEAiAIIM0BNgLAAiAIKALAAiHOASAIKALEAiHPASDPASgCBCHQASDQASDOAWoh0QEgzwEg0QE2AgQgCC0ArwIh0gEgCCgCSCHTAUEBIdQBINMBINQBaiHVASAIINUBNgJIINMBINIBOgAACxAfIdYBAkAg1gFFDQBBmAEh1wEgCCDXAWoh2AEg2AEh2QEgCCgC4AEh2gEgCCgCNCHbASAIINkBNgLYAiAIINoBNgLUAiAIINsBNgLQAiAIKALYAiHcASAIKALQAiHdASDcASDdARAgId4BIAgg3gE2AswCIAgoAtQCId8BIAgoAswCIeABQQEh4QEg4AEg4QF0IeIBIN8BIOIBaiHjASDjAS0AACHkASAIIOQBOgDLAiAIKALYAiHlASAIKALUAiHmASAIKALMAiHnAUEBIegBIOcBIOgBdCHpASDmASDpAWoh6gEg6gEtAAEh6wFB/wEh7AEg6wEg7AFxIe0BIAgg5QE2AuACIAgg7QE2AtwCIAgoAtwCIe4BIAgoAuACIe8BIO8BKAIEIfABIPABIO4BaiHxASDvASDxATYCBCAILQDLAiHyASAIKAJEIfMBQQEh9AEg8wEg9AFqIfUBIAgg9QE2AkQg8wEg8gE6AAALEB8h9gECQCD2AUUNAEGAASH3ASAIIPcBaiH4ASD4ASH5ASAIKALgASH6ASAIKAI0IfsBIAgg+QE2AvQCIAgg+gE2AvACIAgg+wE2AuwCIAgoAvQCIfwBIAgoAuwCIf0BIPwBIP0BECAh/gEgCCD+ATYC6AIgCCgC8AIh/wEgCCgC6AIhgAJBASGBAiCAAiCBAnQhggIg/wEgggJqIYMCIIMCLQAAIYQCIAgghAI6AOcCIAgoAvQCIYUCIAgoAvACIYYCIAgoAugCIYcCQQEhiAIghwIgiAJ0IYkCIIYCIIkCaiGKAiCKAi0AASGLAkH/ASGMAiCLAiCMAnEhjQIgCCCFAjYC/AIgCCCNAjYC+AIgCCgC+AIhjgIgCCgC/AIhjwIgjwIoAgQhkAIgkAIgjgJqIZECII8CIJECNgIEIAgtAOcCIZICIAgoAkAhkwJBASGUAiCTAiCUAmohlQIgCCCVAjYCQCCTAiCSAjoAAAsQHyGWAgJAIJYCDQALQcgBIZcCIAgglwJqIZgCIJgCIZkCIAgoAuABIZoCIAgoAjQhmwIgCCCZAjYCkAMgCCCaAjYCjAMgCCCbAjYCiAMgCCgCkAMhnAIgCCgCiAMhnQIgnAIgnQIQICGeAiAIIJ4CNgKEAyAIKAKMAyGfAiAIKAKEAyGgAkEBIaECIKACIKECdCGiAiCfAiCiAmohowIgowItAAAhpAIgCCCkAjoAgwMgCCgCkAMhpQIgCCgCjAMhpgIgCCgChAMhpwJBASGoAiCnAiCoAnQhqQIgpgIgqQJqIaoCIKoCLQABIasCQf8BIawCIKsCIKwCcSGtAiAIIKUCNgKYAyAIIK0CNgKUAyAIKAKUAyGuAiAIKAKYAyGvAiCvAigCBCGwAiCwAiCuAmohsQIgrwIgsQI2AgQgCC0AgwMhsgIgCCgCTCGzAkEBIbQCILMCILQCaiG1AiAIILUCNgJMILMCILICOgAAEB8htgICQCC2Ag0AC0GwASG3AiAIILcCaiG4AiC4AiG5AiAIKALgASG6AiAIKAI0IbsCIAgguQI2AqwDIAggugI2AqgDIAgguwI2AqQDIAgoAqwDIbwCIAgoAqQDIb0CILwCIL0CECAhvgIgCCC+AjYCoAMgCCgCqAMhvwIgCCgCoAMhwAJBASHBAiDAAiDBAnQhwgIgvwIgwgJqIcMCIMMCLQAAIcQCIAggxAI6AJ8DIAgoAqwDIcUCIAgoAqgDIcYCIAgoAqADIccCQQEhyAIgxwIgyAJ0IckCIMYCIMkCaiHKAiDKAi0AASHLAkH/ASHMAiDLAiDMAnEhzQIgCCDFAjYCtAMgCCDNAjYCsAMgCCgCsAMhzgIgCCgCtAMhzwIgzwIoAgQh0AIg0AIgzgJqIdECIM8CINECNgIEIAgtAJ8DIdICIAgoAkgh0wJBASHUAiDTAiDUAmoh1QIgCCDVAjYCSCDTAiDSAjoAABAfIdYCAkAg1gINAAtBmAEh1wIgCCDXAmoh2AIg2AIh2QIgCCgC4AEh2gIgCCgCNCHbAiAIINkCNgLIAyAIINoCNgLEAyAIINsCNgLAAyAIKALIAyHcAiAIKALAAyHdAiDcAiDdAhAgId4CIAgg3gI2ArwDIAgoAsQDId8CIAgoArwDIeACQQEh4QIg4AIg4QJ0IeICIN8CIOICaiHjAiDjAi0AACHkAiAIIOQCOgC7AyAIKALIAyHlAiAIKALEAyHmAiAIKAK8AyHnAkEBIegCIOcCIOgCdCHpAiDmAiDpAmoh6gIg6gItAAEh6wJB/wEh7AIg6wIg7AJxIe0CIAgg5QI2AtADIAgg7QI2AswDIAgoAswDIe4CIAgoAtADIe8CIO8CKAIEIfACIPACIO4CaiHxAiDvAiDxAjYCBCAILQC7AyHyAiAIKAJEIfMCQQEh9AIg8wIg9AJqIfUCIAgg9QI2AkQg8wIg8gI6AAAQHyH2AgJAIPYCDQALQYABIfcCIAgg9wJqIfgCIPgCIfkCIAgoAuABIfoCIAgoAjQh+wIgCCD5AjYC5AMgCCD6AjYC4AMgCCD7AjYC3AMgCCgC5AMh/AIgCCgC3AMh/QIg/AIg/QIQICH+AiAIIP4CNgLYAyAIKALgAyH/AiAIKALYAyGAA0EBIYEDIIADIIEDdCGCAyD/AiCCA2ohgwMggwMtAAAhhAMgCCCEAzoA1wMgCCgC5AMhhQMgCCgC4AMhhgMgCCgC2AMhhwNBASGIAyCHAyCIA3QhiQMghgMgiQNqIYoDIIoDLQABIYsDQf8BIYwDIIsDIIwDcSGNAyAIIIUDNgLsAyAIII0DNgLoAyAIKALoAyGOAyAIKALsAyGPAyCPAygCBCGQAyCQAyCOA2ohkQMgjwMgkQM2AgQgCC0A1wMhkgMgCCgCQCGTA0EBIZQDIJMDIJQDaiGVAyAIIJUDNgJAIJMDIJIDOgAAEB8hlgMCQCCWA0UNAEHIASGXAyAIIJcDaiGYAyCYAyGZAyAIKALgASGaAyAIKAI0IZsDIAggmQM2AoAEIAggmgM2AvwDIAggmwM2AvgDIAgoAoAEIZwDIAgoAvgDIZ0DIJwDIJ0DECAhngMgCCCeAzYC9AMgCCgC/AMhnwMgCCgC9AMhoANBASGhAyCgAyChA3QhogMgnwMgogNqIaMDIKMDLQAAIaQDIAggpAM6APMDIAgoAoAEIaUDIAgoAvwDIaYDIAgoAvQDIacDQQEhqAMgpwMgqAN0IakDIKYDIKkDaiGqAyCqAy0AASGrA0H/ASGsAyCrAyCsA3EhrQMgCCClAzYCiAQgCCCtAzYChAQgCCgChAQhrgMgCCgCiAQhrwMgrwMoAgQhsAMgsAMgrgNqIbEDIK8DILEDNgIEIAgtAPMDIbIDIAgoAkwhswNBASG0AyCzAyC0A2ohtQMgCCC1AzYCTCCzAyCyAzoAAAsQHyG2AwJAILYDRQ0AQbABIbcDIAggtwNqIbgDILgDIbkDIAgoAuABIboDIAgoAjQhuwMgCCC5AzYCnAQgCCC6AzYCmAQgCCC7AzYClAQgCCgCnAQhvAMgCCgClAQhvQMgvAMgvQMQICG+AyAIIL4DNgKQBCAIKAKYBCG/AyAIKAKQBCHAA0EBIcEDIMADIMEDdCHCAyC/AyDCA2ohwwMgwwMtAAAhxAMgCCDEAzoAjwQgCCgCnAQhxQMgCCgCmAQhxgMgCCgCkAQhxwNBASHIAyDHAyDIA3QhyQMgxgMgyQNqIcoDIMoDLQABIcsDQf8BIcwDIMsDIMwDcSHNAyAIIMUDNgKkBCAIIM0DNgKgBCAIKAKgBCHOAyAIKAKkBCHPAyDPAygCBCHQAyDQAyDOA2oh0QMgzwMg0QM2AgQgCC0AjwQh0gMgCCgCSCHTA0EBIdQDINMDINQDaiHVAyAIINUDNgJIINMDINIDOgAACxAfIdYDAkAg1gNFDQBBmAEh1wMgCCDXA2oh2AMg2AMh2QMgCCgC4AEh2gMgCCgCNCHbAyAIINkDNgK4BCAIINoDNgK0BCAIINsDNgKwBCAIKAK4BCHcAyAIKAKwBCHdAyDcAyDdAxAgId4DIAgg3gM2AqwEIAgoArQEId8DIAgoAqwEIeADQQEh4QMg4AMg4QN0IeIDIN8DIOIDaiHjAyDjAy0AACHkAyAIIOQDOgCrBCAIKAK4BCHlAyAIKAK0BCHmAyAIKAKsBCHnA0EBIegDIOcDIOgDdCHpAyDmAyDpA2oh6gMg6gMtAAEh6wNB/wEh7AMg6wMg7ANxIe0DIAgg5QM2AsAEIAgg7QM2ArwEIAgoArwEIe4DIAgoAsAEIe8DIO8DKAIEIfADIPADIO4DaiHxAyDvAyDxAzYCBCAILQCrBCHyAyAIKAJEIfMDQQEh9AMg8wMg9ANqIfUDIAgg9QM2AkQg8wMg8gM6AAALEB8h9gMCQCD2A0UNAEGAASH3AyAIIPcDaiH4AyD4AyH5AyAIKALgASH6AyAIKAI0IfsDIAgg+QM2AtQEIAgg+gM2AtAEIAgg+wM2AswEIAgoAtQEIfwDIAgoAswEIf0DIPwDIP0DECAh/gMgCCD+AzYCyAQgCCgC0AQh/wMgCCgCyAQhgARBASGBBCCABCCBBHQhggQg/wMgggRqIYMEIIMELQAAIYQEIAgghAQ6AMcEIAgoAtQEIYUEIAgoAtAEIYYEIAgoAsgEIYcEQQEhiAQghwQgiAR0IYkEIIYEIIkEaiGKBCCKBC0AASGLBEH/ASGMBCCLBCCMBHEhjQQgCCCFBDYC3AQgCCCNBDYC2AQgCCgC2AQhjgQgCCgC3AQhjwQgjwQoAgQhkAQgkAQgjgRqIZEEII8EIJEENgIEIAgtAMcEIZIEIAgoAkAhkwRBASGUBCCTBCCUBGohlQQgCCCVBDYCQCCTBCCSBDoAAAtBACGWBEGAASGXBCAIIJcEaiGYBCCYBCGZBEGYASGaBCAIIJoEaiGbBCCbBCGcBEGwASGdBCAIIJ0EaiGeBCCeBCGfBEHIASGgBCAIIKAEaiGhBCChBCGiBCAIKALgASGjBCAIKAI0IaQEIAggogQ2AvAEIAggowQ2AuwEIAggpAQ2AugEIAgoAvAEIaUEIAgoAugEIaYEIKUEIKYEECAhpwQgCCCnBDYC5AQgCCgC7AQhqAQgCCgC5AQhqQRBASGqBCCpBCCqBHQhqwQgqAQgqwRqIawEIKwELQAAIa0EIAggrQQ6AOMEIAgoAvAEIa4EIAgoAuwEIa8EIAgoAuQEIbAEQQEhsQQgsAQgsQR0IbIEIK8EILIEaiGzBCCzBC0AASG0BEH/ASG1BCC0BCC1BHEhtgQgCCCuBDYC+AQgCCC2BDYC9AQgCCgC9AQhtwQgCCgC+AQhuAQguAQoAgQhuQQguQQgtwRqIboEILgEILoENgIEIAgtAOMEIbsEIAgoAkwhvARBASG9BCC8BCC9BGohvgQgCCC+BDYCTCC8BCC7BDoAACAIKALgASG/BCAIKAI0IcAEIAggnwQ2AowFIAggvwQ2AogFIAggwAQ2AoQFIAgoAowFIcEEIAgoAoQFIcIEIMEEIMIEECAhwwQgCCDDBDYCgAUgCCgCiAUhxAQgCCgCgAUhxQRBASHGBCDFBCDGBHQhxwQgxAQgxwRqIcgEIMgELQAAIckEIAggyQQ6AP8EIAgoAowFIcoEIAgoAogFIcsEIAgoAoAFIcwEQQEhzQQgzAQgzQR0Ic4EIMsEIM4EaiHPBCDPBC0AASHQBEH/ASHRBCDQBCDRBHEh0gQgCCDKBDYClAUgCCDSBDYCkAUgCCgCkAUh0wQgCCgClAUh1AQg1AQoAgQh1QQg1QQg0wRqIdYEINQEINYENgIEIAgtAP8EIdcEIAgoAkgh2ARBASHZBCDYBCDZBGoh2gQgCCDaBDYCSCDYBCDXBDoAACAIKALgASHbBCAIKAI0IdwEIAggnAQ2AqgFIAgg2wQ2AqQFIAgg3AQ2AqAFIAgoAqgFId0EIAgoAqAFId4EIN0EIN4EECAh3wQgCCDfBDYCnAUgCCgCpAUh4AQgCCgCnAUh4QRBASHiBCDhBCDiBHQh4wQg4AQg4wRqIeQEIOQELQAAIeUEIAgg5QQ6AJsFIAgoAqgFIeYEIAgoAqQFIecEIAgoApwFIegEQQEh6QQg6AQg6QR0IeoEIOcEIOoEaiHrBCDrBC0AASHsBEH/ASHtBCDsBCDtBHEh7gQgCCDmBDYCsAUgCCDuBDYCrAUgCCgCrAUh7wQgCCgCsAUh8AQg8AQoAgQh8QQg8QQg7wRqIfIEIPAEIPIENgIEIAgtAJsFIfMEIAgoAkQh9ARBASH1BCD0BCD1BGoh9gQgCCD2BDYCRCD0BCDzBDoAACAIKALgASH3BCAIKAI0IfgEIAggmQQ2AsQFIAgg9wQ2AsAFIAgg+AQ2ArwFIAgoAsQFIfkEIAgoArwFIfoEIPkEIPoEECAh+wQgCCD7BDYCuAUgCCgCwAUh/AQgCCgCuAUh/QRBASH+BCD9BCD+BHQh/wQg/AQg/wRqIYAFIIAFLQAAIYEFIAgggQU6ALcFIAgoAsQFIYIFIAgoAsAFIYMFIAgoArgFIYQFQQEhhQUghAUghQV0IYYFIIMFIIYFaiGHBSCHBS0AASGIBUH/ASGJBSCIBSCJBXEhigUgCCCCBTYCzAUgCCCKBTYCyAUgCCgCyAUhiwUgCCgCzAUhjAUgjAUoAgQhjQUgjQUgiwVqIY4FIIwFII4FNgIEIAgtALcFIY8FIAgoAkAhkAVBASGRBSCQBSCRBWohkgUgCCCSBTYCQCCQBSCPBToAACCiBBAlIZMFIJMFIZQFIJYEIZUFIJQFIJUFRiGWBUEBIZcFIJYFIJcFcSGYBSAIKAIwIZkFIJkFIJgFcSGaBSAIIJoFNgIwIJ8EECUhmwUgmwUhnAUglgQhnQUgnAUgnQVGIZ4FQQEhnwUgngUgnwVxIaAFIAgoAjAhoQUgoQUgoAVxIaIFIAggogU2AjAgnAQQJSGjBSCjBSGkBSCWBCGlBSCkBSClBUYhpgVBASGnBSCmBSCnBXEhqAUgCCgCMCGpBSCpBSCoBXEhqgUgCCCqBTYCMCCZBBAlIasFIKsFIawFIJYEIa0FIKwFIK0FRiGuBUEBIa8FIK4FIK8FcSGwBSAIKAIwIbEFILEFILAFcSGyBSAIILIFNgIwDAAACwALIAgoAkwhswUgCCgCWCG0BSCzBSG1BSC0BSG2BSC1BSC2BUshtwVBASG4BSC3BSC4BXEhuQUCQCC5BUUNAEFsIboFIAggugU2AowCDAELIAgoAkghuwUgCCgCVCG8BSC7BSG9BSC8BSG+BSC9BSC+BUshvwVBASHABSC/BSDABXEhwQUCQCDBBUUNAEFsIcIFIAggwgU2AowCDAELIAgoAkQhwwUgCCgCUCHEBSDDBSHFBSDEBSHGBSDFBSDGBUshxwVBASHIBSDHBSDIBXEhyQUCQCDJBUUNAEFsIcoFIAggygU2AowCDAELQcgBIcsFIAggywVqIcwFIMwFIc0FIAgoAkwhzgUgCCgCWCHPBSAIKALgASHQBSAIKAI0IdEFIAggzgU2AuQFIAggzQU2AuAFIAggzwU2AtwFIAgg0AU2AtgFIAgg0QU2AtQFIAgoAuQFIdIFIAgg0gU2AtAFAkADQEEAIdMFIAgoAuAFIdQFINQFEB4h1QUg1QUh1gUg0wUh1wUg1gUg1wVGIdgFQQEh2QUg2AUg2QVxIdoFIAgoAuQFIdsFIAgoAtwFIdwFQX0h3QUg3AUg3QVqId4FINsFId8FIN4FIeAFIN8FIOAFSSHhBUEBIeIFIOEFIOIFcSHjBSDaBSDjBXEh5AUg5AVFDQEQHyHlBQJAIOUFRQ0AIAgoAuAFIeYFIAgoAtgFIecFIAgoAtQFIegFIAgg5gU2AvgFIAgg5wU2AvQFIAgg6AU2AvAFIAgoAvgFIekFIAgoAvAFIeoFIOkFIOoFECAh6wUgCCDrBTYC7AUgCCgC9AUh7AUgCCgC7AUh7QVBASHuBSDtBSDuBXQh7wUg7AUg7wVqIfAFIPAFLQAAIfEFIAgg8QU6AOsFIAgoAvgFIfIFIAgoAvQFIfMFIAgoAuwFIfQFQQEh9QUg9AUg9QV0IfYFIPMFIPYFaiH3BSD3BS0AASH4BUH/ASH5BSD4BSD5BXEh+gUgCCDyBTYCgAYgCCD6BTYC/AUgCCgC/AUh+wUgCCgCgAYh/AUg/AUoAgQh/QUg/QUg+wVqIf4FIPwFIP4FNgIEIAgtAOsFIf8FIAgoAuQFIYAGQQEhgQYggAYggQZqIYIGIAggggY2AuQFIIAGIP8FOgAACxAfIYMGAkAggwYNAAsgCCgC4AUhhAYgCCgC2AUhhQYgCCgC1AUhhgYgCCCEBjYClAYgCCCFBjYCkAYgCCCGBjYCjAYgCCgClAYhhwYgCCgCjAYhiAYghwYgiAYQICGJBiAIIIkGNgKIBiAIKAKQBiGKBiAIKAKIBiGLBkEBIYwGIIsGIIwGdCGNBiCKBiCNBmohjgYgjgYtAAAhjwYgCCCPBjoAhwYgCCgClAYhkAYgCCgCkAYhkQYgCCgCiAYhkgZBASGTBiCSBiCTBnQhlAYgkQYglAZqIZUGIJUGLQABIZYGQf8BIZcGIJYGIJcGcSGYBiAIIJAGNgKcBiAIIJgGNgKYBiAIKAKYBiGZBiAIKAKcBiGaBiCaBigCBCGbBiCbBiCZBmohnAYgmgYgnAY2AgQgCC0AhwYhnQYgCCgC5AUhngZBASGfBiCeBiCfBmohoAYgCCCgBjYC5AUgngYgnQY6AAAQHyGhBgJAIKEGRQ0AIAgoAuAFIaIGIAgoAtgFIaMGIAgoAtQFIaQGIAggogY2ArAGIAggowY2AqwGIAggpAY2AqgGIAgoArAGIaUGIAgoAqgGIaYGIKUGIKYGECAhpwYgCCCnBjYCpAYgCCgCrAYhqAYgCCgCpAYhqQZBASGqBiCpBiCqBnQhqwYgqAYgqwZqIawGIKwGLQAAIa0GIAggrQY6AKMGIAgoArAGIa4GIAgoAqwGIa8GIAgoAqQGIbAGQQEhsQYgsAYgsQZ0IbIGIK8GILIGaiGzBiCzBi0AASG0BkH/ASG1BiC0BiC1BnEhtgYgCCCuBjYCuAYgCCC2BjYCtAYgCCgCtAYhtwYgCCgCuAYhuAYguAYoAgQhuQYguQYgtwZqIboGILgGILoGNgIEIAgtAKMGIbsGIAgoAuQFIbwGQQEhvQYgvAYgvQZqIb4GIAggvgY2AuQFILwGILsGOgAACyAIKALgBSG/BiAIKALYBSHABiAIKALUBSHBBiAIIL8GNgLMBiAIIMAGNgLIBiAIIMEGNgLEBiAIKALMBiHCBiAIKALEBiHDBiDCBiDDBhAgIcQGIAggxAY2AsAGIAgoAsgGIcUGIAgoAsAGIcYGQQEhxwYgxgYgxwZ0IcgGIMUGIMgGaiHJBiDJBi0AACHKBiAIIMoGOgC/BiAIKALMBiHLBiAIKALIBiHMBiAIKALABiHNBkEBIc4GIM0GIM4GdCHPBiDMBiDPBmoh0AYg0AYtAAEh0QZB/wEh0gYg0QYg0gZxIdMGIAggywY2AtQGIAgg0wY2AtAGIAgoAtAGIdQGIAgoAtQGIdUGINUGKAIEIdYGINYGINQGaiHXBiDVBiDXBjYCBCAILQC/BiHYBiAIKALkBSHZBkEBIdoGINkGINoGaiHbBiAIINsGNgLkBSDZBiDYBjoAAAwAAAsACxAhIdwGAkAg3AZFDQACQANAQQAh3QYgCCgC4AUh3gYg3gYQHiHfBiDfBiHgBiDdBiHhBiDgBiDhBkYh4gZBASHjBiDiBiDjBnEh5AYgCCgC5AUh5QYgCCgC3AUh5gYg5QYh5wYg5gYh6AYg5wYg6AZJIekGQQEh6gYg6QYg6gZxIesGIOQGIOsGcSHsBiDsBkUNASAIKALgBSHtBiAIKALYBSHuBiAIKALUBSHvBiAIIO0GNgLoBiAIIO4GNgLkBiAIIO8GNgLgBiAIKALoBiHwBiAIKALgBiHxBiDwBiDxBhAgIfIGIAgg8gY2AtwGIAgoAuQGIfMGIAgoAtwGIfQGQQEh9QYg9AYg9QZ0IfYGIPMGIPYGaiH3BiD3Bi0AACH4BiAIIPgGOgDbBiAIKALoBiH5BiAIKALkBiH6BiAIKALcBiH7BkEBIfwGIPsGIPwGdCH9BiD6BiD9Bmoh/gYg/gYtAAEh/wZB/wEhgAcg/wYggAdxIYEHIAgg+QY2AvAGIAgggQc2AuwGIAgoAuwGIYIHIAgoAvAGIYMHIIMHKAIEIYQHIIQHIIIHaiGFByCDByCFBzYCBCAILQDbBiGGByAIKALkBSGHB0EBIYgHIIcHIIgHaiGJByAIIIkHNgLkBSCHByCGBzoAAAwAAAsACwsCQANAIAgoAuQFIYoHIAgoAtwFIYsHIIoHIYwHIIsHIY0HIIwHII0HSSGOB0EBIY8HII4HII8HcSGQByCQB0UNASAIKALgBSGRByAIKALYBSGSByAIKALUBSGTByAIIJEHNgKEByAIIJIHNgKAByAIIJMHNgL8BiAIKAKEByGUByAIKAL8BiGVByCUByCVBxAgIZYHIAgglgc2AvgGIAgoAoAHIZcHIAgoAvgGIZgHQQEhmQcgmAcgmQd0IZoHIJcHIJoHaiGbByCbBy0AACGcByAIIJwHOgD3BiAIKAKEByGdByAIKAKAByGeByAIKAL4BiGfB0EBIaAHIJ8HIKAHdCGhByCeByChB2ohogcgogctAAEhowdB/wEhpAcgowcgpAdxIaUHIAggnQc2AowHIAggpQc2AogHIAgoAogHIaYHIAgoAowHIacHIKcHKAIEIagHIKgHIKYHaiGpByCnByCpBzYCBCAILQD3BiGqByAIKALkBSGrB0EBIawHIKsHIKwHaiGtByAIIK0HNgLkBSCrByCqBzoAAAwAAAsAC0GwASGuByAIIK4HaiGvByCvByGwByAIKAJIIbEHIAgoAlQhsgcgCCgC4AEhswcgCCgCNCG0ByAIILEHNgKkByAIILAHNgKgByAIILIHNgKcByAIILMHNgKYByAIILQHNgKUByAIKAKkByG1ByAIILUHNgKQBwJAA0BBACG2ByAIKAKgByG3ByC3BxAeIbgHILgHIbkHILYHIboHILkHILoHRiG7B0EBIbwHILsHILwHcSG9ByAIKAKkByG+ByAIKAKcByG/B0F9IcAHIL8HIMAHaiHBByC+ByHCByDBByHDByDCByDDB0khxAdBASHFByDEByDFB3EhxgcgvQcgxgdxIccHIMcHRQ0BEB8hyAcCQCDIB0UNACAIKAKgByHJByAIKAKYByHKByAIKAKUByHLByAIIMkHNgK4ByAIIMoHNgK0ByAIIMsHNgKwByAIKAK4ByHMByAIKAKwByHNByDMByDNBxAgIc4HIAggzgc2AqwHIAgoArQHIc8HIAgoAqwHIdAHQQEh0Qcg0Acg0Qd0IdIHIM8HINIHaiHTByDTBy0AACHUByAIINQHOgCrByAIKAK4ByHVByAIKAK0ByHWByAIKAKsByHXB0EBIdgHINcHINgHdCHZByDWByDZB2oh2gcg2gctAAEh2wdB/wEh3Acg2wcg3AdxId0HIAgg1Qc2AsAHIAgg3Qc2ArwHIAgoArwHId4HIAgoAsAHId8HIN8HKAIEIeAHIOAHIN4HaiHhByDfByDhBzYCBCAILQCrByHiByAIKAKkByHjB0EBIeQHIOMHIOQHaiHlByAIIOUHNgKkByDjByDiBzoAAAsQHyHmBwJAIOYHDQALIAgoAqAHIecHIAgoApgHIegHIAgoApQHIekHIAgg5wc2AtQHIAgg6Ac2AtAHIAgg6Qc2AswHIAgoAtQHIeoHIAgoAswHIesHIOoHIOsHECAh7AcgCCDsBzYCyAcgCCgC0Ach7QcgCCgCyAch7gdBASHvByDuByDvB3Qh8Acg7Qcg8AdqIfEHIPEHLQAAIfIHIAgg8gc6AMcHIAgoAtQHIfMHIAgoAtAHIfQHIAgoAsgHIfUHQQEh9gcg9Qcg9gd0IfcHIPQHIPcHaiH4ByD4By0AASH5B0H/ASH6ByD5ByD6B3Eh+wcgCCDzBzYC3AcgCCD7BzYC2AcgCCgC2Ach/AcgCCgC3Ach/Qcg/QcoAgQh/gcg/gcg/AdqIf8HIP0HIP8HNgIEIAgtAMcHIYAIIAgoAqQHIYEIQQEhgggggQgggghqIYMIIAgggwg2AqQHIIEIIIAIOgAAEB8hhAgCQCCECEUNACAIKAKgByGFCCAIKAKYByGGCCAIKAKUByGHCCAIIIUINgLwByAIIIYINgLsByAIIIcINgLoByAIKALwByGICCAIKALoByGJCCCICCCJCBAgIYoIIAggigg2AuQHIAgoAuwHIYsIIAgoAuQHIYwIQQEhjQggjAggjQh0IY4IIIsIII4IaiGPCCCPCC0AACGQCCAIIJAIOgDjByAIKALwByGRCCAIKALsByGSCCAIKALkByGTCEEBIZQIIJMIIJQIdCGVCCCSCCCVCGohlggglggtAAEhlwhB/wEhmAgglwggmAhxIZkIIAggkQg2AvgHIAggmQg2AvQHIAgoAvQHIZoIIAgoAvgHIZsIIJsIKAIEIZwIIJwIIJoIaiGdCCCbCCCdCDYCBCAILQDjByGeCCAIKAKkByGfCEEBIaAIIJ8IIKAIaiGhCCAIIKEINgKkByCfCCCeCDoAAAsgCCgCoAchogggCCgCmAchowggCCgClAchpAggCCCiCDYCjAggCCCjCDYCiAggCCCkCDYChAggCCgCjAghpQggCCgChAghpgggpQggpggQICGnCCAIIKcINgKACCAIKAKICCGoCCAIKAKACCGpCEEBIaoIIKkIIKoIdCGrCCCoCCCrCGohrAggrAgtAAAhrQggCCCtCDoA/wcgCCgCjAghrgggCCgCiAghrwggCCgCgAghsAhBASGxCCCwCCCxCHQhsgggrwggsghqIbMIILMILQABIbQIQf8BIbUIILQIILUIcSG2CCAIIK4INgKUCCAIILYINgKQCCAIKAKQCCG3CCAIKAKUCCG4CCC4CCgCBCG5CCC5CCC3CGohuggguAggugg2AgQgCC0A/wchuwggCCgCpAchvAhBASG9CCC8CCC9CGohvgggCCC+CDYCpAcgvAgguwg6AAAMAAALAAsQISG/CAJAIL8IRQ0AAkADQEEAIcAIIAgoAqAHIcEIIMEIEB4hwgggwgghwwggwAghxAggwwggxAhGIcUIQQEhxgggxQggxghxIccIIAgoAqQHIcgIIAgoApwHIckIIMgIIcoIIMkIIcsIIMoIIMsISSHMCEEBIc0IIMwIIM0IcSHOCCDHCCDOCHEhzwggzwhFDQEgCCgCoAch0AggCCgCmAch0QggCCgClAch0gggCCDQCDYCqAggCCDRCDYCpAggCCDSCDYCoAggCCgCqAgh0wggCCgCoAgh1Agg0wgg1AgQICHVCCAIINUINgKcCCAIKAKkCCHWCCAIKAKcCCHXCEEBIdgIINcIINgIdCHZCCDWCCDZCGoh2ggg2ggtAAAh2wggCCDbCDoAmwggCCgCqAgh3AggCCgCpAgh3QggCCgCnAgh3ghBASHfCCDeCCDfCHQh4Agg3Qgg4AhqIeEIIOEILQABIeIIQf8BIeMIIOIIIOMIcSHkCCAIINwINgKwCCAIIOQINgKsCCAIKAKsCCHlCCAIKAKwCCHmCCDmCCgCBCHnCCDnCCDlCGoh6Agg5ggg6Ag2AgQgCC0Amwgh6QggCCgCpAch6ghBASHrCCDqCCDrCGoh7AggCCDsCDYCpAcg6ggg6Qg6AAAMAAALAAsLAkADQCAIKAKkByHtCCAIKAKcByHuCCDtCCHvCCDuCCHwCCDvCCDwCEkh8QhBASHyCCDxCCDyCHEh8wgg8whFDQEgCCgCoAch9AggCCgCmAch9QggCCgClAch9gggCCD0CDYCxAggCCD1CDYCwAggCCD2CDYCvAggCCgCxAgh9wggCCgCvAgh+Agg9wgg+AgQICH5CCAIIPkINgK4CCAIKALACCH6CCAIKAK4CCH7CEEBIfwIIPsIIPwIdCH9CCD6CCD9CGoh/ggg/ggtAAAh/wggCCD/CDoAtwggCCgCxAghgAkgCCgCwAghgQkgCCgCuAghgglBASGDCSCCCSCDCXQhhAkggQkghAlqIYUJIIUJLQABIYYJQf8BIYcJIIYJIIcJcSGICSAIIIAJNgLMCCAIIIgJNgLICCAIKALICCGJCSAIKALMCCGKCSCKCSgCBCGLCSCLCSCJCWohjAkgigkgjAk2AgQgCC0AtwghjQkgCCgCpAchjglBASGPCSCOCSCPCWohkAkgCCCQCTYCpAcgjgkgjQk6AAAMAAALAAtBmAEhkQkgCCCRCWohkgkgkgkhkwkgCCgCRCGUCSAIKAJQIZUJIAgoAuABIZYJIAgoAjQhlwkgCCCUCTYC5AggCCCTCTYC4AggCCCVCTYC3AggCCCWCTYC2AggCCCXCTYC1AggCCgC5AghmAkgCCCYCTYC0AgCQANAQQAhmQkgCCgC4AghmgkgmgkQHiGbCSCbCSGcCSCZCSGdCSCcCSCdCUYhnglBASGfCSCeCSCfCXEhoAkgCCgC5AghoQkgCCgC3AghoglBfSGjCSCiCSCjCWohpAkgoQkhpQkgpAkhpgkgpQkgpglJIacJQQEhqAkgpwkgqAlxIakJIKAJIKkJcSGqCSCqCUUNARAfIasJAkAgqwlFDQAgCCgC4AghrAkgCCgC2AghrQkgCCgC1AghrgkgCCCsCTYC+AggCCCtCTYC9AggCCCuCTYC8AggCCgC+AghrwkgCCgC8AghsAkgrwkgsAkQICGxCSAIILEJNgLsCCAIKAL0CCGyCSAIKALsCCGzCUEBIbQJILMJILQJdCG1CSCyCSC1CWohtgkgtgktAAAhtwkgCCC3CToA6wggCCgC+AghuAkgCCgC9AghuQkgCCgC7AghuglBASG7CSC6CSC7CXQhvAkguQkgvAlqIb0JIL0JLQABIb4JQf8BIb8JIL4JIL8JcSHACSAIILgJNgKACSAIIMAJNgL8CCAIKAL8CCHBCSAIKAKACSHCCSDCCSgCBCHDCSDDCSDBCWohxAkgwgkgxAk2AgQgCC0A6wghxQkgCCgC5AghxglBASHHCSDGCSDHCWohyAkgCCDICTYC5AggxgkgxQk6AAALEB8hyQkCQCDJCQ0ACyAIKALgCCHKCSAIKALYCCHLCSAIKALUCCHMCSAIIMoJNgKUCSAIIMsJNgKQCSAIIMwJNgKMCSAIKAKUCSHNCSAIKAKMCSHOCSDNCSDOCRAgIc8JIAggzwk2AogJIAgoApAJIdAJIAgoAogJIdEJQQEh0gkg0Qkg0gl0IdMJINAJINMJaiHUCSDUCS0AACHVCSAIINUJOgCHCSAIKAKUCSHWCSAIKAKQCSHXCSAIKAKICSHYCUEBIdkJINgJINkJdCHaCSDXCSDaCWoh2wkg2wktAAEh3AlB/wEh3Qkg3Akg3QlxId4JIAgg1gk2ApwJIAgg3gk2ApgJIAgoApgJId8JIAgoApwJIeAJIOAJKAIEIeEJIOEJIN8JaiHiCSDgCSDiCTYCBCAILQCHCSHjCSAIKALkCCHkCUEBIeUJIOQJIOUJaiHmCSAIIOYJNgLkCCDkCSDjCToAABAfIecJAkAg5wlFDQAgCCgC4Agh6AkgCCgC2Agh6QkgCCgC1Agh6gkgCCDoCTYCsAkgCCDpCTYCrAkgCCDqCTYCqAkgCCgCsAkh6wkgCCgCqAkh7Akg6wkg7AkQICHtCSAIIO0JNgKkCSAIKAKsCSHuCSAIKAKkCSHvCUEBIfAJIO8JIPAJdCHxCSDuCSDxCWoh8gkg8gktAAAh8wkgCCDzCToAowkgCCgCsAkh9AkgCCgCrAkh9QkgCCgCpAkh9glBASH3CSD2CSD3CXQh+Akg9Qkg+AlqIfkJIPkJLQABIfoJQf8BIfsJIPoJIPsJcSH8CSAIIPQJNgK4CSAIIPwJNgK0CSAIKAK0CSH9CSAIKAK4CSH+CSD+CSgCBCH/CSD/CSD9CWohgAog/gkggAo2AgQgCC0AowkhgQogCCgC5AghggpBASGDCiCCCiCDCmohhAogCCCECjYC5AggggoggQo6AAALIAgoAuAIIYUKIAgoAtgIIYYKIAgoAtQIIYcKIAgghQo2AswJIAgghgo2AsgJIAgghwo2AsQJIAgoAswJIYgKIAgoAsQJIYkKIIgKIIkKECAhigogCCCKCjYCwAkgCCgCyAkhiwogCCgCwAkhjApBASGNCiCMCiCNCnQhjgogiwogjgpqIY8KII8KLQAAIZAKIAggkAo6AL8JIAgoAswJIZEKIAgoAsgJIZIKIAgoAsAJIZMKQQEhlAogkwoglAp0IZUKIJIKIJUKaiGWCiCWCi0AASGXCkH/ASGYCiCXCiCYCnEhmQogCCCRCjYC1AkgCCCZCjYC0AkgCCgC0AkhmgogCCgC1AkhmwogmwooAgQhnAognAogmgpqIZ0KIJsKIJ0KNgIEIAgtAL8JIZ4KIAgoAuQIIZ8KQQEhoAognwogoApqIaEKIAggoQo2AuQIIJ8KIJ4KOgAADAAACwALECEhogoCQCCiCkUNAAJAA0BBACGjCiAIKALgCCGkCiCkChAeIaUKIKUKIaYKIKMKIacKIKYKIKcKRiGoCkEBIakKIKgKIKkKcSGqCiAIKALkCCGrCiAIKALcCCGsCiCrCiGtCiCsCiGuCiCtCiCuCkkhrwpBASGwCiCvCiCwCnEhsQogqgogsQpxIbIKILIKRQ0BIAgoAuAIIbMKIAgoAtgIIbQKIAgoAtQIIbUKIAggswo2AugJIAggtAo2AuQJIAggtQo2AuAJIAgoAugJIbYKIAgoAuAJIbcKILYKILcKECAhuAogCCC4CjYC3AkgCCgC5AkhuQogCCgC3AkhugpBASG7CiC6CiC7CnQhvAoguQogvApqIb0KIL0KLQAAIb4KIAggvgo6ANsJIAgoAugJIb8KIAgoAuQJIcAKIAgoAtwJIcEKQQEhwgogwQogwgp0IcMKIMAKIMMKaiHECiDECi0AASHFCkH/ASHGCiDFCiDGCnEhxwogCCC/CjYC8AkgCCDHCjYC7AkgCCgC7AkhyAogCCgC8AkhyQogyQooAgQhygogygogyApqIcsKIMkKIMsKNgIEIAgtANsJIcwKIAgoAuQIIc0KQQEhzgogzQogzgpqIc8KIAggzwo2AuQIIM0KIMwKOgAADAAACwALCwJAA0AgCCgC5Agh0AogCCgC3Agh0Qog0Aoh0gog0Qoh0wog0gog0wpJIdQKQQEh1Qog1Aog1QpxIdYKINYKRQ0BIAgoAuAIIdcKIAgoAtgIIdgKIAgoAtQIIdkKIAgg1wo2AoQKIAgg2Ao2AoAKIAgg2Qo2AvwJIAgoAoQKIdoKIAgoAvwJIdsKINoKINsKECAh3AogCCDcCjYC+AkgCCgCgAoh3QogCCgC+Akh3gpBASHfCiDeCiDfCnQh4Aog3Qog4ApqIeEKIOEKLQAAIeIKIAgg4go6APcJIAgoAoQKIeMKIAgoAoAKIeQKIAgoAvgJIeUKQQEh5gog5Qog5gp0IecKIOQKIOcKaiHoCiDoCi0AASHpCkH/ASHqCiDpCiDqCnEh6wogCCDjCjYCjAogCCDrCjYCiAogCCgCiAoh7AogCCgCjAoh7Qog7QooAgQh7gog7gog7ApqIe8KIO0KIO8KNgIEIAgtAPcJIfAKIAgoAuQIIfEKQQEh8gog8Qog8gpqIfMKIAgg8wo2AuQIIPEKIPAKOgAADAAACwALQYABIfQKIAgg9ApqIfUKIPUKIfYKIAgoAkAh9wogCCgC7AEh+AogCCgC4AEh+QogCCgCNCH6CiAIIPcKNgKkCiAIIPYKNgKgCiAIIPgKNgKcCiAIIPkKNgKYCiAIIPoKNgKUCiAIKAKkCiH7CiAIIPsKNgKQCgJAA0BBACH8CiAIKAKgCiH9CiD9ChAeIf4KIP4KIf8KIPwKIYALIP8KIIALRiGBC0EBIYILIIELIIILcSGDCyAIKAKkCiGECyAIKAKcCiGFC0F9IYYLIIULIIYLaiGHCyCECyGICyCHCyGJCyCICyCJC0khigtBASGLCyCKCyCLC3EhjAsggwsgjAtxIY0LII0LRQ0BEB8hjgsCQCCOC0UNACAIKAKgCiGPCyAIKAKYCiGQCyAIKAKUCiGRCyAIII8LNgK4CiAIIJALNgK0CiAIIJELNgKwCiAIKAK4CiGSCyAIKAKwCiGTCyCSCyCTCxAgIZQLIAgglAs2AqwKIAgoArQKIZULIAgoAqwKIZYLQQEhlwsglgsglwt0IZgLIJULIJgLaiGZCyCZCy0AACGaCyAIIJoLOgCrCiAIKAK4CiGbCyAIKAK0CiGcCyAIKAKsCiGdC0EBIZ4LIJ0LIJ4LdCGfCyCcCyCfC2ohoAsgoAstAAEhoQtB/wEhogsgoQsgogtxIaMLIAggmws2AsAKIAggows2ArwKIAgoArwKIaQLIAgoAsAKIaULIKULKAIEIaYLIKYLIKQLaiGnCyClCyCnCzYCBCAILQCrCiGoCyAIKAKkCiGpC0EBIaoLIKkLIKoLaiGrCyAIIKsLNgKkCiCpCyCoCzoAAAsQHyGsCwJAIKwLDQALIAgoAqAKIa0LIAgoApgKIa4LIAgoApQKIa8LIAggrQs2AtQKIAggrgs2AtAKIAggrws2AswKIAgoAtQKIbALIAgoAswKIbELILALILELECAhsgsgCCCyCzYCyAogCCgC0AohswsgCCgCyAohtAtBASG1CyC0CyC1C3QhtgsgswsgtgtqIbcLILcLLQAAIbgLIAgguAs6AMcKIAgoAtQKIbkLIAgoAtAKIboLIAgoAsgKIbsLQQEhvAsguwsgvAt0Ib0LILoLIL0LaiG+CyC+Cy0AASG/C0H/ASHACyC/CyDAC3EhwQsgCCC5CzYC3AogCCDBCzYC2AogCCgC2AohwgsgCCgC3AohwwsgwwsoAgQhxAsgxAsgwgtqIcULIMMLIMULNgIEIAgtAMcKIcYLIAgoAqQKIccLQQEhyAsgxwsgyAtqIckLIAggyQs2AqQKIMcLIMYLOgAAEB8hygsCQCDKC0UNACAIKAKgCiHLCyAIKAKYCiHMCyAIKAKUCiHNCyAIIMsLNgLwCiAIIMwLNgLsCiAIIM0LNgLoCiAIKALwCiHOCyAIKALoCiHPCyDOCyDPCxAgIdALIAgg0As2AuQKIAgoAuwKIdELIAgoAuQKIdILQQEh0wsg0gsg0wt0IdQLINELINQLaiHVCyDVCy0AACHWCyAIINYLOgDjCiAIKALwCiHXCyAIKALsCiHYCyAIKALkCiHZC0EBIdoLINkLINoLdCHbCyDYCyDbC2oh3Asg3AstAAEh3QtB/wEh3gsg3Qsg3gtxId8LIAgg1ws2AvgKIAgg3ws2AvQKIAgoAvQKIeALIAgoAvgKIeELIOELKAIEIeILIOILIOALaiHjCyDhCyDjCzYCBCAILQDjCiHkCyAIKAKkCiHlC0EBIeYLIOULIOYLaiHnCyAIIOcLNgKkCiDlCyDkCzoAAAsgCCgCoAoh6AsgCCgCmAoh6QsgCCgClAoh6gsgCCDoCzYCjAsgCCDpCzYCiAsgCCDqCzYChAsgCCgCjAsh6wsgCCgChAsh7Asg6wsg7AsQICHtCyAIIO0LNgKACyAIKAKICyHuCyAIKAKACyHvC0EBIfALIO8LIPALdCHxCyDuCyDxC2oh8gsg8gstAAAh8wsgCCDzCzoA/wogCCgCjAsh9AsgCCgCiAsh9QsgCCgCgAsh9gtBASH3CyD2CyD3C3Qh+Asg9Qsg+AtqIfkLIPkLLQABIfoLQf8BIfsLIPoLIPsLcSH8CyAIIPQLNgKUCyAIIPwLNgKQCyAIKAKQCyH9CyAIKAKUCyH+CyD+CygCBCH/CyD/CyD9C2ohgAwg/gsggAw2AgQgCC0A/wohgQwgCCgCpAohggxBASGDDCCCDCCDDGohhAwgCCCEDDYCpAogggwggQw6AAAMAAALAAsQISGFDAJAIIUMRQ0AAkADQEEAIYYMIAgoAqAKIYcMIIcMEB4hiAwgiAwhiQwghgwhigwgiQwgigxGIYsMQQEhjAwgiwwgjAxxIY0MIAgoAqQKIY4MIAgoApwKIY8MII4MIZAMII8MIZEMIJAMIJEMSSGSDEEBIZMMIJIMIJMMcSGUDCCNDCCUDHEhlQwglQxFDQEgCCgCoAohlgwgCCgCmAohlwwgCCgClAohmAwgCCCWDDYCqAsgCCCXDDYCpAsgCCCYDDYCoAsgCCgCqAshmQwgCCgCoAshmgwgmQwgmgwQICGbDCAIIJsMNgKcCyAIKAKkCyGcDCAIKAKcCyGdDEEBIZ4MIJ0MIJ4MdCGfDCCcDCCfDGohoAwgoAwtAAAhoQwgCCChDDoAmwsgCCgCqAshogwgCCgCpAshowwgCCgCnAshpAxBASGlDCCkDCClDHQhpgwgowwgpgxqIacMIKcMLQABIagMQf8BIakMIKgMIKkMcSGqDCAIIKIMNgKwCyAIIKoMNgKsCyAIKAKsCyGrDCAIKAKwCyGsDCCsDCgCBCGtDCCtDCCrDGohrgwgrAwgrgw2AgQgCC0AmwshrwwgCCgCpAohsAxBASGxDCCwDCCxDGohsgwgCCCyDDYCpAogsAwgrww6AAAMAAALAAsLAkADQCAIKAKkCiGzDCAIKAKcCiG0DCCzDCG1DCC0DCG2DCC1DCC2DEkhtwxBASG4DCC3DCC4DHEhuQwguQxFDQEgCCgCoAohugwgCCgCmAohuwwgCCgClAohvAwgCCC6DDYCxAsgCCC7DDYCwAsgCCC8DDYCvAsgCCgCxAshvQwgCCgCvAshvgwgvQwgvgwQICG/DCAIIL8MNgK4CyAIKALACyHADCAIKAK4CyHBDEEBIcIMIMEMIMIMdCHDDCDADCDDDGohxAwgxAwtAAAhxQwgCCDFDDoAtwsgCCgCxAshxgwgCCgCwAshxwwgCCgCuAshyAxBASHJDCDIDCDJDHQhygwgxwwgygxqIcsMIMsMLQABIcwMQf8BIc0MIMwMIM0McSHODCAIIMYMNgLMCyAIIM4MNgLICyAIKALICyHPDCAIKALMCyHQDCDQDCgCBCHRDCDRDCDPDGoh0gwg0Awg0gw2AgQgCC0Atwsh0wwgCCgCpAoh1AxBASHVDCDUDCDVDGoh1gwgCCDWDDYCpAog1Awg0ww6AAAMAAALAAtBgAEh1wwgCCDXDGoh2Awg2Awh2QxBmAEh2gwgCCDaDGoh2wwg2wwh3AxBsAEh3QwgCCDdDGoh3gwg3gwh3wxByAEh4AwgCCDgDGoh4Qwg4Qwh4gwg4gwQIiHjDCDfDBAiIeQMIOMMIOQMcSHlDCDcDBAiIeYMIOUMIOYMcSHnDCDZDBAiIegMIOcMIOgMcSHpDCAIIOkMNgIcIAgoAhwh6gwCQCDqDA0AQWwh6wwgCCDrDDYCjAIMAQsgCCgChAIh7AwgCCDsDDYCjAILIAgoAowCIe0MQdALIe4MIAgg7gxqIe8MIO8MJAAg7QwPC8QBARd/IwAhAUEQIQIgASACayEDIAMkACADIAA2AggQGyEEAkACQCAERQ0AIAMoAgghBSAFEEwhBiADIAY7AQ4MAQsgAygCCCEHIAMgBzYCBCADKAIEIQggCC0AACEJQf8BIQogCSAKcSELIAMoAgQhDCAMLQABIQ1B/wEhDiANIA5xIQ9BCCEQIA8gEHQhESALIBFqIRIgAyASOwEOCyADLwEOIRNB//8DIRQgEyAUcSEVQRAhFiADIBZqIRcgFyQAIBUPC8QCASl/IwAhAUEQIQIgASACayEDIAMkACADIAA2AgggAygCCCEEIAQoAgghBSADKAIIIQYgBigCECEHIAUhCCAHIQkgCCAJSSEKQQEhCyAKIAtxIQwCQAJAIAxFDQBBAyENIAMgDTYCDAwBC0EgIQ4gAygCCCEPIA8oAgQhECAQIREgDiESIBEgEk0hE0EBIRQgEyAUcSEVAkAgFQ0AEAALQQAhFiADKAIIIRcgFygCBCEYQQMhGSAYIBl2IRogAygCCCEbIBsoAgghHCAWIBprIR0gHCAdaiEeIBsgHjYCCCADKAIIIR8gHygCBCEgQQchISAgICFxISIgHyAiNgIEIAMoAgghIyAjKAIIISQgJBCzASElIAMoAgghJiAmICU2AgAgAyAWNgIMCyADKAIMISdBECEoIAMgKGohKSApJAAgJw8LlgMBJn8jACEIQTAhCSAIIAlrIQogCiQAIAogADYCKCAKIAE2AiQgCiACNgIgIAogAzYCHCAKIAQ2AhggCiAFNgIUIAogBjYCECAKIAc2AgwgCigCHCELIAogCzYCCCAKKAIoIQwgCigCHCENIAooAhghDiAKKAIUIQ8gCigCECEQIAooAgwhESAMIA0gDiAPIBAgERAUIRIgCiASNgIEIAooAgQhEyATEBYhFAJAAkAgFEUNACAKKAIEIRUgCiAVNgIsDAELIAooAgQhFiAKKAIYIRcgFiEYIBchGSAYIBlPIRpBASEbIBogG3EhHAJAIBxFDQBBuH8hHSAKIB02AiwMAQsgCigCBCEeIAooAgghHyAfIB5qISAgCiAgNgIIIAooAgQhISAKKAIYISIgIiAhayEjIAogIzYCGCAKKAIkISQgCigCICElIAooAgghJiAKKAIYIScgCigCKCEoIAooAgwhKSAkICUgJiAnICggKRAjISogCiAqNgIsCyAKKAIsIStBMCEsIAogLGohLSAtJAAgKw8LjBYBqQJ/IwAhBUGgASEGIAUgBmshByAHJABBACEIQfAAIQkgByAJaiEKIAohCyAHIAA2ApgBIAcgATYClAEgByACNgKQASAHIAM2AowBIAcgBDYCiAEgBygCmAEhDCALIAwQFyAHLQBwIQ1B/wEhDiANIA5xIQ8gByAPNgJsIAcoApgBIRBBBCERIBAgEWohEiAHIBI2AmQgBygCZCETIAcgEzYCYCAHIAg2AkQgBygCjAEhFCAHKAJEIRVBAiEWIBUgFnQhFyAUIBdqIRggByAYNgJYIAcoAkQhGUGcASEaIBkgGmohGyAHIBs2AkQgBygCjAEhHCAHKAJEIR1BAiEeIB0gHnQhHyAcIB9qISAgByAgNgJUIAcoAkQhIUENISIgISAiaiEjIAcgIzYCRCAHKAKMASEkIAcoAkQhJUECISYgJSAmdCEnICQgJ2ohKCAHICg2AlAgBygCRCEpQQ4hKiApICpqISsgByArNgJEIAcoAowBISwgBygCRCEtQQIhLiAtIC50IS9BASEwIC8gMHYhMUEBITIgMSAydCEzICwgM2ohNCAHIDQ2AkwgBygCRCE1QYABITYgNSA2aiE3IAcgNzYCRCAHKAKMASE4IAcoAkQhOUECITogOSA6dCE7IDggO2ohPCAHIDw2AkggBygCRCE9QcAAIT4gPSA+aiE/IAcgPzYCRCAHKAJEIUBBAiFBIEAgQXQhQiAHKAKIASFDIEIhRCBDIUUgRCBFSyFGQQEhRyBGIEdxIUgCQAJAIEhFDQBBVCFJIAcgSTYCnAEMAQtBDCFKIAcoAlAhS0EEIUwgSyBMaiFNIAcgTTYCXCAHKAJUIU5B7AAhT0EAIVAgTiBQIE8QDhogBygCbCFRIFEhUiBKIVMgUiBTSyFUQQEhVSBUIFVxIVYCQCBWRQ0AQVQhVyAHIFc2ApwBDAELQYACIVhB+AAhWSAHIFlqIVogWiFbQYQBIVwgByBcaiFdIF0hXiAHKAJIIV8gBygCVCFgIAcoApQBIWEgBygCkAEhYiBfIFggYCBbIF4gYSBiECghYyAHIGM2AmggBygCaCFkIGQQFiFlAkAgZUUNACAHKAJoIWYgByBmNgKcAQwBCyAHKAKEASFnIAcoAmwhaCBnIWkgaCFqIGkgaksha0EBIWwgayBscSFtAkAgbUUNAEFUIW4gByBuNgKcAQwBCyAHKAKEASFvIAcgbzYCgAECQANAIAcoAlQhcCAHKAKAASFxQQIhciBxIHJ0IXMgcCBzaiF0IHQoAgAhdSB1DQEgBygCgAEhdkF/IXcgdiB3aiF4IAcgeDYCgAEMAAALAAtBASF5QQAheiAHIHo2AjwgByB5NgJAAkADQCAHKAJAIXsgBygCgAEhfEEBIX0gfCB9aiF+IHshfyB+IYABIH8ggAFJIYEBQQEhggEggQEgggFxIYMBIIMBRQ0BIAcoAjwhhAEgByCEATYCOCAHKAJUIYUBIAcoAkAhhgFBAiGHASCGASCHAXQhiAEghQEgiAFqIYkBIIkBKAIAIYoBIAcoAjwhiwEgiwEgigFqIYwBIAcgjAE2AjwgBygCOCGNASAHKAJcIY4BIAcoAkAhjwFBAiGQASCPASCQAXQhkQEgjgEgkQFqIZIBIJIBII0BNgIAIAcoAkAhkwFBASGUASCTASCUAWohlQEgByCVATYCQAwAAAsAC0EAIZYBIAcoAjwhlwEgBygCXCGYASCYASCXATYCACAHKAI8IZkBIAcgmQE2AnwgByCWATYCNAJAA0AgBygCNCGaASAHKAJ4IZsBIJoBIZwBIJsBIZ0BIJwBIJ0BSSGeAUEBIZ8BIJ4BIJ8BcSGgASCgAUUNASAHKAJIIaEBIAcoAjQhogEgoQEgogFqIaMBIKMBLQAAIaQBQf8BIaUBIKQBIKUBcSGmASAHIKYBNgIwIAcoAlwhpwEgBygCMCGoAUECIakBIKgBIKkBdCGqASCnASCqAWohqwEgqwEoAgAhrAFBASGtASCsASCtAWohrgEgqwEgrgE2AgAgByCsATYCLCAHKAI0Ia8BIAcoAkwhsAEgBygCLCGxAUEBIbIBILEBILIBdCGzASCwASCzAWohtAEgtAEgrwE6AAAgBygCMCG1ASAHKAJMIbYBIAcoAiwhtwFBASG4ASC3ASC4AXQhuQEgtgEguQFqIboBILoBILUBOgABIAcoAjQhuwFBASG8ASC7ASC8AWohvQEgByC9ATYCNAwAAAsAC0EBIb4BQQAhvwEgBygCXCHAASDAASC/ATYCACAHKAJYIcEBIAcgwQE2AiggBygCbCHCASAHKAKEASHDASDCASDDAWshxAFBASHFASDEASDFAWshxgEgByDGATYCJCAHIL8BNgIgIAcgvgE2AhwCQANAIAcoAhwhxwEgBygCgAEhyAFBASHJASDIASDJAWohygEgxwEhywEgygEhzAEgywEgzAFJIc0BQQEhzgEgzQEgzgFxIc8BIM8BRQ0BIAcoAiAh0AEgByDQATYCGCAHKAJUIdEBIAcoAhwh0gFBAiHTASDSASDTAXQh1AEg0QEg1AFqIdUBINUBKAIAIdYBIAcoAhwh1wEgBygCJCHYASDXASDYAWoh2QEg1gEg2QF0IdoBIAcoAiAh2wEg2wEg2gFqIdwBIAcg3AE2AiAgBygCGCHdASAHKAIoId4BIAcoAhwh3wFBAiHgASDfASDgAXQh4QEg3gEg4QFqIeIBIOIBIN0BNgIAIAcoAhwh4wFBASHkASDjASDkAWoh5QEgByDlATYCHAwAAAsACyAHKAKEASHmAUEBIecBIOYBIOcBaiHoASAHKAKAASHpASDoASDpAWsh6gEgByDqATYCFCAHKAIUIesBIAcg6wE2AhACQANAIAcoAhAh7AEgBygCbCHtASAHKAIUIe4BIO0BIO4BayHvAUEBIfABIO8BIPABaiHxASDsASHyASDxASHzASDyASDzAUkh9AFBASH1ASD0ASD1AXEh9gEg9gFFDQFBASH3ASAHKAJYIfgBIAcoAhAh+QFBNCH6ASD5ASD6AWwh+wEg+AEg+wFqIfwBIAcg/AE2AgwgByD3ATYCCAJAA0AgBygCCCH9ASAHKAKAASH+AUEBIf8BIP4BIP8BaiGAAiD9ASGBAiCAAiGCAiCBAiCCAkkhgwJBASGEAiCDAiCEAnEhhQIghQJFDQEgBygCKCGGAiAHKAIIIYcCQQIhiAIghwIgiAJ0IYkCIIYCIIkCaiGKAiCKAigCACGLAiAHKAIQIYwCIIsCIIwCdiGNAiAHKAIMIY4CIAcoAgghjwJBAiGQAiCPAiCQAnQhkQIgjgIgkQJqIZICIJICII0CNgIAIAcoAgghkwJBASGUAiCTAiCUAmohlQIgByCVAjYCCAwAAAsACyAHKAIQIZYCQQEhlwIglgIglwJqIZgCIAcgmAI2AhAMAAALAAtB8AAhmQIgByCZAmohmgIgmgIhmwJBASGcAiAHKAJgIZ0CIAcoAmwhngIgBygCTCGfAiAHKAJ8IaACIAcoAlAhoQIgBygCWCGiAiAHKAKAASGjAiAHKAKEASGkAkEBIaUCIKQCIKUCaiGmAiCdAiCeAiCfAiCgAiChAiCiAiCjAiCmAhApIAcoAmwhpwIgByCnAjoAciAHIJwCOgBxIAcoApgBIagCIJsCKAAAIakCIKgCIKkCNgAAIAcoAmghqgIgByCqAjYCnAELIAcoApwBIasCQaABIawCIAcgrAJqIa0CIK0CJAAgqwIPC8ABARB/IwAhB0GAAyEIIAcgCGshCSAJJABB5AIhCkEAIQsgCSEMIAkgADYC/AIgCSABNgL4AiAJIAI2AvQCIAkgAzYC8AIgCSAENgLsAiAJIAU2AugCIAkgBjYC5AIgCSgC/AIhDSAJKAL4AiEOIAkoAvQCIQ8gCSgC8AIhECAJKALsAiERIAkoAugCIRIgCSgC5AIhEyANIA4gDyAQIBEgEiATIAwgCiALEBUhFEGAAyEVIAkgFWohFiAWJAAgFA8LogwCqwF/Bn4jACEIQaABIQkgCCAJayEKIAokAEEAIQtBwAAhDCAKIAxqIQ0gDSEOIAogADYCnAEgCiABNgKYASAKIAI2ApQBIAogAzYCkAEgCiAENgKMASAKIAU2AogBIAogBjYChAEgCiAHNgKAASAKKAKAASEPIAooApgBIRAgDyAQayERIAogETYCPCAKKAKAASESIAooAoQBIRMgEiATayEUIAogFDYCOCAKKAKIASEVIBUpAgAhswEgDiCzATcCAEEwIRYgDiAWaiEXIBUgFmohGCAYKAIAIRkgFyAZNgIAQSghGiAOIBpqIRsgFSAaaiEcIBwpAgAhtAEgGyC0ATcCAEEgIR0gDiAdaiEeIBUgHWohHyAfKQIAIbUBIB4gtQE3AgBBGCEgIA4gIGohISAVICBqISIgIikCACG2ASAhILYBNwIAQRAhIyAOICNqISQgFSAjaiElICUpAgAhtwEgJCC3ATcCAEEIISYgDiAmaiEnIBUgJmohKCAoKQIAIbgBICcguAE3AgAgCiALNgI0AkADQCAKKAI0ISkgCigCkAEhKiApISsgKiEsICsgLEkhLUEBIS4gLSAucSEvIC9FDQFBASEwQcAAITEgCiAxaiEyIDIhMyAKKAKUASE0IAooAjQhNUEBITYgNSA2dCE3IDQgN2ohOCA4LQAAITlB/wEhOiA5IDpxITsgCiA7OwEyIAooApQBITwgCigCNCE9QQEhPiA9ID50IT8gPCA/aiFAIEAtAAEhQUH/ASFCIEEgQnEhQyAKIEM2AiwgCigCgAEhRCAKKAIsIUUgRCBFayFGIAogRjYCKCAKKAIsIUdBAiFIIEcgSHQhSSAzIElqIUogSigCACFLIAogSzYCJCAKKAKYASFMIAooAighTSBMIE1rIU4gMCBOdCFPIAogTzYCICAKKAKYASFQIAooAighUSBQIFFrIVIgCigCOCFTIFIhVCBTIVUgVCBVTyFWQQEhVyBWIFdxIVgCQAJAIFhFDQBBASFZIAooAighWiAKKAI8IVsgWiBbaiFcIAogXDYCGCAKKAIYIV0gXSFeIFkhXyBeIF9IIWBBASFhIGAgYXEhYgJAIGJFDQBBASFjIAogYzYCGAsgCigCjAEhZCAKKAIYIWVBAiFmIGUgZnQhZyBkIGdqIWggaCgCACFpIAogaTYCHCAKKAKcASFqIAooAiQha0ECIWwgayBsdCFtIGogbWohbiAKKAKYASFvIAooAighcCBvIHBrIXEgCigCKCFyIAooAogBIXMgCigCKCF0QTQhdSB0IHVsIXYgcyB2aiF3IAooAhgheCAKKAKUASF5IAooAhwhekEBIXsgeiB7dCF8IHkgfGohfSAKKAKQASF+IAooAhwhfyB+IH9rIYABIAooAoABIYEBIAovATIhggFB//8DIYMBIIIBIIMBcSGEASBuIHEgciB3IHggfSCAASCBASCEARAqDAELQQEhhQFBECGGASAKIIYBaiGHASCHASGIASAKLwEyIYkBQf//AyGKASCJASCKAXEhiwEgiAEgiwEQKyAKKAIoIYwBIAogjAE6ABIgCiCFAToAEyAKKAIkIY0BIAooAiAhjgEgjQEgjgFqIY8BIAogjwE2AgwgCigCJCGQASAKIJABNgIIAkADQCAKKAIIIZEBIAooAgwhkgEgkQEhkwEgkgEhlAEgkwEglAFJIZUBQQEhlgEglQEglgFxIZcBIJcBRQ0BQRAhmAEgCiCYAWohmQEgmQEhmgEgCigCnAEhmwEgCigCCCGcAUECIZ0BIJwBIJ0BdCGeASCbASCeAWohnwEgmgEoAQAhoAEgnwEgoAE2AQAgCigCCCGhAUEBIaIBIKEBIKIBaiGjASAKIKMBNgIIDAAACwALC0HAACGkASAKIKQBaiGlASClASGmASAKKAIgIacBIAooAiwhqAFBAiGpASCoASCpAXQhqgEgpgEgqgFqIasBIKsBKAIAIawBIKwBIKcBaiGtASCrASCtATYCACAKKAI0Ia4BQQEhrwEgrgEgrwFqIbABIAogsAE2AjQMAAALAAtBoAEhsQEgCiCxAWohsgEgsgEkAA8LqAsCogF/Bn4jACEJQZABIQogCSAKayELIAskAEEBIQxBMCENIAsgDWohDiAOIQ8gCyAANgKMASALIAE2AogBIAsgAjYChAEgCyADNgKAASALIAQ2AnwgCyAFNgJ4IAsgBjYCdCALIAc2AnAgCyAIOwFuIAsoAoABIRAgECkCACGrASAPIKsBNwIAQTAhESAPIBFqIRIgECARaiETIBMoAgAhFCASIBQ2AgBBKCEVIA8gFWohFiAQIBVqIRcgFykCACGsASAWIKwBNwIAQSAhGCAPIBhqIRkgECAYaiEaIBopAgAhrQEgGSCtATcCAEEYIRsgDyAbaiEcIBAgG2ohHSAdKQIAIa4BIBwgrgE3AgBBECEeIA8gHmohHyAQIB5qISAgICkCACGvASAfIK8BNwIAQQghISAPICFqISIgECAhaiEjICMpAgAhsAEgIiCwATcCACALKAJ8ISQgJCElIAwhJiAlICZKISdBASEoICcgKHEhKQJAIClFDQBBACEqQQEhK0HoACEsIAsgLGohLSAtIS5BMCEvIAsgL2ohMCAwITEgCygCfCEyQQIhMyAyIDN0ITQgMSA0aiE1IDUoAgAhNiALIDY2AiggCy8BbiE3Qf//AyE4IDcgOHEhOSAuIDkQKyALKAKEASE6IAsgOjoAaiALICs6AGsgCyAqNgIsAkADQCALKAIsITsgCygCKCE8IDshPSA8IT4gPSA+SSE/QQEhQCA/IEBxIUEgQUUNAUHoACFCIAsgQmohQyBDIUQgCygCjAEhRSALKAIsIUZBAiFHIEYgR3QhSCBFIEhqIUkgRCgBACFKIEkgSjYBACALKAIsIUtBASFMIEsgTGohTSALIE02AiwMAAALAAsLQQAhTiALIE42AiQCQANAIAsoAiQhTyALKAJ0IVAgTyFRIFAhUiBRIFJJIVNBASFUIFMgVHEhVSBVRQ0BQQIhVkHoACFXIAsgV2ohWCBYIVlBMCFaIAsgWmohWyBbIVxBASFdIAsoAnghXiALKAIkIV9BASFgIF8gYHQhYSBeIGFqIWIgYi0AACFjQf8BIWQgYyBkcSFlIAsgZTYCICALKAJ4IWYgCygCJCFnQQEhaCBnIGh0IWkgZiBpaiFqIGotAAEha0H/ASFsIGsgbHEhbSALIG02AhwgCygCcCFuIAsoAhwhbyBuIG9rIXAgCyBwNgIYIAsoAogBIXEgCygCGCFyIHEgcmshcyBdIHN0IXQgCyB0NgIUIAsoAhwhdUECIXYgdSB2dCF3IFwgd2oheCB4KAIAIXkgCyB5NgIQIAsoAhAheiALIHo2AgwgCygCECF7IAsoAhQhfCB7IHxqIX0gCyB9NgIIIAsvAW4hfkH//wMhfyB+IH9xIYABIAsoAiAhgQFBCCGCASCBASCCAXQhgwEggAEggwFqIYQBQf//AyGFASCEASCFAXEhhgEgWSCGARArIAsoAhghhwEgCygChAEhiAEghwEgiAFqIYkBIAsgiQE6AGogCyBWOgBrA0BB6AAhigEgCyCKAWohiwEgiwEhjAEgCygCjAEhjQEgCygCDCGOAUEBIY8BII4BII8BaiGQASALIJABNgIMQQIhkQEgjgEgkQF0IZIBII0BIJIBaiGTASCMASgBACGUASCTASCUATYBACALKAIMIZUBIAsoAgghlgEglQEhlwEglgEhmAEglwEgmAFJIZkBQQEhmgEgmQEgmgFxIZsBIJsBDQALQTAhnAEgCyCcAWohnQEgnQEhngEgCygCFCGfASALKAIcIaABQQIhoQEgoAEgoQF0IaIBIJ4BIKIBaiGjASCjASgCACGkASCkASCfAWohpQEgowEgpQE2AgAgCygCJCGmAUEBIacBIKYBIKcBaiGoASALIKgBNgIkDAAACwALQZABIakBIAsgqQFqIaoBIKoBJAAPC7gBARN/IwAhAkEQIQMgAiADayEEIAQkACAEIAA2AgwgBCABOwEKEBshBQJAAkAgBUUNACAEKAIMIQYgBC8BCiEHQf//AyEIIAcgCHEhCSAGIAkQgQEMAQsgBCgCDCEKIAQgCjYCBCAELwEKIQsgBCgCBCEMIAwgCzoAACAELwEKIQ1B//8DIQ4gDSAOcSEPQQghECAPIBB1IREgBCgCBCESIBIgEToAAQtBECETIAQgE2ohFCAUJAAPC/gfAZADfyMAIQZBwAIhByAGIAdrIQggCCQAQTAhCSAIIAlqIQogCiELIAggADYCFCAIIAE2AhAgCCACNgIMIAggAzYCCCAIIAQ2AgQgCCAFNgIAIAgoAhQhDCAIKAIQIQ0gCCgCDCEOIAgoAgghDyAIKAIEIRAgCCAMNgJUIAggDTYCUCAIIA42AkwgCCAPNgJIIAggEDYCRCAIKAJMIREgCCgCSCESIAsgESASEB0hEyAIIBM2AiwgCCgCLCEUIBQQFiEVAkACQCAVRQ0AIAgoAiwhFiAIIBY2AlgMAQtBMCEXIAggF2ohGCAYIRlBGCEaIAggGmohGyAbIRwgCCgCVCEdIAggHTYCKCAIKAIoIR4gCCgCUCEfIB4gH2ohICAIICA2AiQgCCgCRCEhQQQhIiAhICJqISMgCCAjNgIgIAgoAiAhJCAIICQ2AhwgCCgCRCElIBwgJRAXIAgoAighJiAIKAIkIScgCCgCHCEoIAgtABohKUH/ASEqICkgKnEhKyAIICY2AnAgCCAZNgJsIAggJzYCaCAIICg2AmQgCCArNgJgIAgoAnAhLCAIICw2AlwCQANAQQAhLSAIKAJsIS4gLhAeIS8gLyEwIC0hMSAwIDFGITJBASEzIDIgM3EhNCAIKAJwITUgCCgCaCE2QX0hNyA2IDdqITggNSE5IDghOiA5IDpJITtBASE8IDsgPHEhPSA0ID1xIT4gPkUNARAfIT8CQCA/RQ0AIAgoAnAhQCAIKAJsIUEgCCgCZCFCIAgoAmAhQyAIIEA2AoQBIAggQTYCgAEgCCBCNgJ8IAggQzYCeCAIKAKAASFEIAgoAnghRSBEIEUQICFGIAggRjYCdCAIKAKEASFHIAgoAnwhSCAIKAJ0IUlBAiFKIEkgSnQhSyBIIEtqIUwgTC8AACFNIEcgTTsAACAIKAKAASFOIAgoAnwhTyAIKAJ0IVBBAiFRIFAgUXQhUiBPIFJqIVMgUy0AAiFUQf8BIVUgVCBVcSFWIAggTjYCjAEgCCBWNgKIASAIKAKIASFXIAgoAowBIVggWCgCBCFZIFkgV2ohWiBYIFo2AgQgCCgCfCFbIAgoAnQhXEECIV0gXCBddCFeIFsgXmohXyBfLQADIWBB/wEhYSBgIGFxIWIgCCgCcCFjIGMgYmohZCAIIGQ2AnALEB8hZQJAIGUNAAsgCCgCcCFmIAgoAmwhZyAIKAJkIWggCCgCYCFpIAggZjYCoAEgCCBnNgKcASAIIGg2ApgBIAggaTYClAEgCCgCnAEhaiAIKAKUASFrIGogaxAgIWwgCCBsNgKQASAIKAKgASFtIAgoApgBIW4gCCgCkAEhb0ECIXAgbyBwdCFxIG4gcWohciByLwAAIXMgbSBzOwAAIAgoApwBIXQgCCgCmAEhdSAIKAKQASF2QQIhdyB2IHd0IXggdSB4aiF5IHktAAIhekH/ASF7IHoge3EhfCAIIHQ2AqgBIAggfDYCpAEgCCgCpAEhfSAIKAKoASF+IH4oAgQhfyB/IH1qIYABIH4ggAE2AgQgCCgCmAEhgQEgCCgCkAEhggFBAiGDASCCASCDAXQhhAEggQEghAFqIYUBIIUBLQADIYYBQf8BIYcBIIYBIIcBcSGIASAIKAJwIYkBIIkBIIgBaiGKASAIIIoBNgJwEB8hiwECQCCLAUUNACAIKAJwIYwBIAgoAmwhjQEgCCgCZCGOASAIKAJgIY8BIAggjAE2ArwBIAggjQE2ArgBIAggjgE2ArQBIAggjwE2ArABIAgoArgBIZABIAgoArABIZEBIJABIJEBECAhkgEgCCCSATYCrAEgCCgCvAEhkwEgCCgCtAEhlAEgCCgCrAEhlQFBAiGWASCVASCWAXQhlwEglAEglwFqIZgBIJgBLwAAIZkBIJMBIJkBOwAAIAgoArgBIZoBIAgoArQBIZsBIAgoAqwBIZwBQQIhnQEgnAEgnQF0IZ4BIJsBIJ4BaiGfASCfAS0AAiGgAUH/ASGhASCgASChAXEhogEgCCCaATYCxAEgCCCiATYCwAEgCCgCwAEhowEgCCgCxAEhpAEgpAEoAgQhpQEgpQEgowFqIaYBIKQBIKYBNgIEIAgoArQBIacBIAgoAqwBIagBQQIhqQEgqAEgqQF0IaoBIKcBIKoBaiGrASCrAS0AAyGsAUH/ASGtASCsASCtAXEhrgEgCCgCcCGvASCvASCuAWohsAEgCCCwATYCcAsgCCgCcCGxASAIKAJsIbIBIAgoAmQhswEgCCgCYCG0ASAIILEBNgLYASAIILIBNgLUASAIILMBNgLQASAIILQBNgLMASAIKALUASG1ASAIKALMASG2ASC1ASC2ARAgIbcBIAggtwE2AsgBIAgoAtgBIbgBIAgoAtABIbkBIAgoAsgBIboBQQIhuwEgugEguwF0IbwBILkBILwBaiG9ASC9AS8AACG+ASC4ASC+ATsAACAIKALUASG/ASAIKALQASHAASAIKALIASHBAUECIcIBIMEBIMIBdCHDASDAASDDAWohxAEgxAEtAAIhxQFB/wEhxgEgxQEgxgFxIccBIAggvwE2AuABIAggxwE2AtwBIAgoAtwBIcgBIAgoAuABIckBIMkBKAIEIcoBIMoBIMgBaiHLASDJASDLATYCBCAIKALQASHMASAIKALIASHNAUECIc4BIM0BIM4BdCHPASDMASDPAWoh0AEg0AEtAAMh0QFB/wEh0gEg0QEg0gFxIdMBIAgoAnAh1AEg1AEg0wFqIdUBIAgg1QE2AnAMAAALAAsCQANAQQAh1gEgCCgCbCHXASDXARAeIdgBINgBIdkBINYBIdoBINkBINoBRiHbAUEBIdwBINsBINwBcSHdASAIKAJwId4BIAgoAmgh3wFBfiHgASDfASDgAWoh4QEg3gEh4gEg4QEh4wEg4gEg4wFNIeQBQQEh5QEg5AEg5QFxIeYBIN0BIOYBcSHnASDnAUUNASAIKAJwIegBIAgoAmwh6QEgCCgCZCHqASAIKAJgIesBIAgg6AE2AvQBIAgg6QE2AvABIAgg6gE2AuwBIAgg6wE2AugBIAgoAvABIewBIAgoAugBIe0BIOwBIO0BECAh7gEgCCDuATYC5AEgCCgC9AEh7wEgCCgC7AEh8AEgCCgC5AEh8QFBAiHyASDxASDyAXQh8wEg8AEg8wFqIfQBIPQBLwAAIfUBIO8BIPUBOwAAIAgoAvABIfYBIAgoAuwBIfcBIAgoAuQBIfgBQQIh+QEg+AEg+QF0IfoBIPcBIPoBaiH7ASD7AS0AAiH8AUH/ASH9ASD8ASD9AXEh/gEgCCD2ATYC/AEgCCD+ATYC+AEgCCgC+AEh/wEgCCgC/AEhgAIggAIoAgQhgQIggQIg/wFqIYICIIACIIICNgIEIAgoAuwBIYMCIAgoAuQBIYQCQQIhhQIghAIghQJ0IYYCIIMCIIYCaiGHAiCHAi0AAyGIAkH/ASGJAiCIAiCJAnEhigIgCCgCcCGLAiCLAiCKAmohjAIgCCCMAjYCcAwAAAsACwJAA0AgCCgCcCGNAiAIKAJoIY4CQX4hjwIgjgIgjwJqIZACII0CIZECIJACIZICIJECIJICTSGTAkEBIZQCIJMCIJQCcSGVAiCVAkUNASAIKAJwIZYCIAgoAmwhlwIgCCgCZCGYAiAIKAJgIZkCIAgglgI2ApACIAgglwI2AowCIAggmAI2AogCIAggmQI2AoQCIAgoAowCIZoCIAgoAoQCIZsCIJoCIJsCECAhnAIgCCCcAjYCgAIgCCgCkAIhnQIgCCgCiAIhngIgCCgCgAIhnwJBAiGgAiCfAiCgAnQhoQIgngIgoQJqIaICIKICLwAAIaMCIJ0CIKMCOwAAIAgoAowCIaQCIAgoAogCIaUCIAgoAoACIaYCQQIhpwIgpgIgpwJ0IagCIKUCIKgCaiGpAiCpAi0AAiGqAkH/ASGrAiCqAiCrAnEhrAIgCCCkAjYCmAIgCCCsAjYClAIgCCgClAIhrQIgCCgCmAIhrgIgrgIoAgQhrwIgrwIgrQJqIbACIK4CILACNgIEIAgoAogCIbECIAgoAoACIbICQQIhswIgsgIgswJ0IbQCILECILQCaiG1AiC1Ai0AAyG2AkH/ASG3AiC2AiC3AnEhuAIgCCgCcCG5AiC5AiC4AmohugIgCCC6AjYCcAwAAAsACyAIKAJwIbsCIAgoAmghvAIguwIhvQIgvAIhvgIgvQIgvgJJIb8CQQEhwAIgvwIgwAJxIcECAkAgwQJFDQBBASHCAiAIKAJwIcMCIAgoAmwhxAIgCCgCZCHFAiAIKAJgIcYCIAggwwI2AqwCIAggxAI2AqgCIAggxQI2AqQCIAggxgI2AqACIAgoAqgCIccCIAgoAqACIcgCIMcCIMgCECAhyQIgCCDJAjYCnAIgCCgCrAIhygIgCCgCpAIhywIgCCgCnAIhzAJBAiHNAiDMAiDNAnQhzgIgywIgzgJqIc8CIM8CLQAAIdACIMoCINACOgAAIAgoAqQCIdECIAgoApwCIdICQQIh0wIg0gIg0wJ0IdQCINECINQCaiHVAiDVAi0AAyHWAkH/ASHXAiDWAiDXAnEh2AIg2AIh2QIgwgIh2gIg2QIg2gJGIdsCQQEh3AIg2wIg3AJxId0CAkACQCDdAkUNACAIKAKoAiHeAiAIKAKkAiHfAiAIKAKcAiHgAkECIeECIOACIOECdCHiAiDfAiDiAmoh4wIg4wItAAIh5AJB/wEh5QIg5AIg5QJxIeYCIAgg3gI2ArQCIAgg5gI2ArACIAgoArACIecCIAgoArQCIegCIOgCKAIEIekCIOkCIOcCaiHqAiDoAiDqAjYCBAwBC0EgIesCIAgoAqgCIewCIOwCKAIEIe0CIO0CIe4CIOsCIe8CIO4CIO8CSSHwAkEBIfECIPACIPECcSHyAgJAIPICRQ0AQSAh8wIgCCgCqAIh9AIgCCgCpAIh9QIgCCgCnAIh9gJBAiH3AiD2AiD3AnQh+AIg9QIg+AJqIfkCIPkCLQACIfoCQf8BIfsCIPoCIPsCcSH8AiAIIPQCNgK8AiAIIPwCNgK4AiAIKAK4AiH9AiAIKAK8AiH+AiD+AigCBCH/AiD/AiD9AmohgAMg/gIggAM2AgQgCCgCqAIhgQMggQMoAgQhggMgggMhgwMg8wIhhAMggwMghANLIYUDQQEhhgMghQMghgNxIYcDAkAghwNFDQBBICGIAyAIKAKoAiGJAyCJAyCIAzYCBAsLCyAIKAJwIYoDQQEhiwMgigMgiwNqIYwDIAggjAM2AnALQTAhjQMgCCCNA2ohjgMgjgMhjwMgjwMQIiGQAwJAIJADDQBBbCGRAyAIIJEDNgJYDAELIAgoAlAhkgMgCCCSAzYCWAsgCCgCWCGTA0HAAiGUAyAIIJQDaiGVAyCVAyQAIJMDDwvVwAEB+RF/IwAhBkHgDCEHIAYgB2shCCAIJABBCiEJIAggADYCHCAIIAE2AhggCCACNgIUIAggAzYCECAIIAQ2AgwgCCAFNgIIIAgoAhwhCiAIKAIYIQsgCCgCFCEMIAgoAhAhDSAIKAIMIQ4gCCAKNgKIAiAIIAs2AoQCIAggDDYCgAIgCCANNgL8ASAIIA42AvgBIAgoAvwBIQ8gDyEQIAkhESAQIBFJIRJBASETIBIgE3EhFAJAAkAgFEUNAEFsIRUgCCAVNgKMAgwBC0E4IRYgCCAWaiEXIBchGEEBIRkgCCgCgAIhGiAIIBo2AvQBIAgoAogCIRsgCCAbNgLwASAIKALwASEcIAgoAoQCIR0gHCAdaiEeIAggHjYC7AEgCCgC7AEhH0F9ISAgHyAgaiEhIAggITYC6AEgCCgC+AEhIkEEISMgIiAjaiEkIAggJDYC5AEgCCgC5AEhJSAIICU2AuABIAgoAvQBISYgJhAkISdB//8DISggJyAocSEpIAggKTYCfCAIKAL0ASEqQQIhKyAqICtqISwgLBAkIS1B//8DIS4gLSAucSEvIAggLzYCeCAIKAL0ASEwQQQhMSAwIDFqITIgMhAkITNB//8DITQgMyA0cSE1IAggNTYCdCAIKAL8ASE2IAgoAnwhNyAIKAJ4ITggNyA4aiE5IAgoAnQhOiA5IDpqITtBBiE8IDsgPGohPSA2ID1rIT4gCCA+NgJwIAgoAvQBIT9BBiFAID8gQGohQSAIIEE2AmwgCCgCbCFCIAgoAnwhQyBCIENqIUQgCCBENgJoIAgoAmghRSAIKAJ4IUYgRSBGaiFHIAggRzYCZCAIKAJkIUggCCgCdCFJIEggSWohSiAIIEo2AmAgCCgChAIhS0EDIUwgSyBMaiFNQQIhTiBNIE52IU8gCCBPNgJcIAgoAvABIVAgCCgCXCFRIFAgUWohUiAIIFI2AlggCCgCWCFTIAgoAlwhVCBTIFRqIVUgCCBVNgJUIAgoAlQhViAIKAJcIVcgViBXaiFYIAggWDYCUCAIKALwASFZIAggWTYCTCAIKAJYIVogCCBaNgJIIAgoAlQhWyAIIFs2AkQgCCgCUCFcIAggXDYCQCAIIBk2AjwgCCgC+AEhXSAYIF0QFyAILQA6IV5B/wEhXyBeIF9xIWAgCCBgNgI0IAgoAnAhYSAIKAL8ASFiIGEhYyBiIWQgYyBkSyFlQQEhZiBlIGZxIWcCQCBnRQ0AQWwhaCAIIGg2AowCDAELQcgBIWkgCCBpaiFqIGohayAIKAJsIWwgCCgCfCFtIGsgbCBtEB0hbiAIIG42AjAgCCgCMCFvIG8QFiFwAkAgcEUNACAIKAIwIXEgCCBxNgKMAgwBC0GwASFyIAggcmohcyBzIXQgCCgCaCF1IAgoAnghdiB0IHUgdhAdIXcgCCB3NgIsIAgoAiwheCB4EBYheQJAIHlFDQAgCCgCLCF6IAggejYCjAIMAQtBmAEheyAIIHtqIXwgfCF9IAgoAmQhfiAIKAJ0IX8gfSB+IH8QHSGAASAIIIABNgIoIAgoAighgQEggQEQFiGCAQJAIIIBRQ0AIAgoAighgwEgCCCDATYCjAIMAQtBgAEhhAEgCCCEAWohhQEghQEhhgEgCCgCYCGHASAIKAJwIYgBIIYBIIcBIIgBEB0hiQEgCCCJATYCJCAIKAIkIYoBIIoBEBYhiwECQCCLAUUNACAIKAIkIYwBIAggjAE2AowCDAELAkADQCAIKAI8IY0BIAgoAkAhjgEgCCgC6AEhjwEgjgEhkAEgjwEhkQEgkAEgkQFJIZIBQQEhkwEgkgEgkwFxIZQBII0BIJQBcSGVASCVAUUNARAfIZYBAkAglgFFDQBByAEhlwEgCCCXAWohmAEgmAEhmQEgCCgCTCGaASAIKALgASGbASAIKAI0IZwBIAggmgE2AqACIAggmQE2ApwCIAggmwE2ApgCIAggnAE2ApQCIAgoApwCIZ0BIAgoApQCIZ4BIJ0BIJ4BECAhnwEgCCCfATYCkAIgCCgCoAIhoAEgCCgCmAIhoQEgCCgCkAIhogFBAiGjASCiASCjAXQhpAEgoQEgpAFqIaUBIKUBLwAAIaYBIKABIKYBOwAAIAgoApwCIacBIAgoApgCIagBIAgoApACIakBQQIhqgEgqQEgqgF0IasBIKgBIKsBaiGsASCsAS0AAiGtAUH/ASGuASCtASCuAXEhrwEgCCCnATYCqAIgCCCvATYCpAIgCCgCpAIhsAEgCCgCqAIhsQEgsQEoAgQhsgEgsgEgsAFqIbMBILEBILMBNgIEIAgoApgCIbQBIAgoApACIbUBQQIhtgEgtQEgtgF0IbcBILQBILcBaiG4ASC4AS0AAyG5AUH/ASG6ASC5ASC6AXEhuwEgCCgCTCG8ASC8ASC7AWohvQEgCCC9ATYCTAsQHyG+AQJAIL4BRQ0AQbABIb8BIAggvwFqIcABIMABIcEBIAgoAkghwgEgCCgC4AEhwwEgCCgCNCHEASAIIMIBNgK8AiAIIMEBNgK4AiAIIMMBNgK0AiAIIMQBNgKwAiAIKAK4AiHFASAIKAKwAiHGASDFASDGARAgIccBIAggxwE2AqwCIAgoArwCIcgBIAgoArQCIckBIAgoAqwCIcoBQQIhywEgygEgywF0IcwBIMkBIMwBaiHNASDNAS8AACHOASDIASDOATsAACAIKAK4AiHPASAIKAK0AiHQASAIKAKsAiHRAUECIdIBINEBINIBdCHTASDQASDTAWoh1AEg1AEtAAIh1QFB/wEh1gEg1QEg1gFxIdcBIAggzwE2AsQCIAgg1wE2AsACIAgoAsACIdgBIAgoAsQCIdkBINkBKAIEIdoBINoBINgBaiHbASDZASDbATYCBCAIKAK0AiHcASAIKAKsAiHdAUECId4BIN0BIN4BdCHfASDcASDfAWoh4AEg4AEtAAMh4QFB/wEh4gEg4QEg4gFxIeMBIAgoAkgh5AEg5AEg4wFqIeUBIAgg5QE2AkgLEB8h5gECQCDmAUUNAEGYASHnASAIIOcBaiHoASDoASHpASAIKAJEIeoBIAgoAuABIesBIAgoAjQh7AEgCCDqATYC2AIgCCDpATYC1AIgCCDrATYC0AIgCCDsATYCzAIgCCgC1AIh7QEgCCgCzAIh7gEg7QEg7gEQICHvASAIIO8BNgLIAiAIKALYAiHwASAIKALQAiHxASAIKALIAiHyAUECIfMBIPIBIPMBdCH0ASDxASD0AWoh9QEg9QEvAAAh9gEg8AEg9gE7AAAgCCgC1AIh9wEgCCgC0AIh+AEgCCgCyAIh+QFBAiH6ASD5ASD6AXQh+wEg+AEg+wFqIfwBIPwBLQACIf0BQf8BIf4BIP0BIP4BcSH/ASAIIPcBNgLgAiAIIP8BNgLcAiAIKALcAiGAAiAIKALgAiGBAiCBAigCBCGCAiCCAiCAAmohgwIggQIggwI2AgQgCCgC0AIhhAIgCCgCyAIhhQJBAiGGAiCFAiCGAnQhhwIghAIghwJqIYgCIIgCLQADIYkCQf8BIYoCIIkCIIoCcSGLAiAIKAJEIYwCIIwCIIsCaiGNAiAIII0CNgJECxAfIY4CAkAgjgJFDQBBgAEhjwIgCCCPAmohkAIgkAIhkQIgCCgCQCGSAiAIKALgASGTAiAIKAI0IZQCIAggkgI2AvQCIAggkQI2AvACIAggkwI2AuwCIAgglAI2AugCIAgoAvACIZUCIAgoAugCIZYCIJUCIJYCECAhlwIgCCCXAjYC5AIgCCgC9AIhmAIgCCgC7AIhmQIgCCgC5AIhmgJBAiGbAiCaAiCbAnQhnAIgmQIgnAJqIZ0CIJ0CLwAAIZ4CIJgCIJ4COwAAIAgoAvACIZ8CIAgoAuwCIaACIAgoAuQCIaECQQIhogIgoQIgogJ0IaMCIKACIKMCaiGkAiCkAi0AAiGlAkH/ASGmAiClAiCmAnEhpwIgCCCfAjYC/AIgCCCnAjYC+AIgCCgC+AIhqAIgCCgC/AIhqQIgqQIoAgQhqgIgqgIgqAJqIasCIKkCIKsCNgIEIAgoAuwCIawCIAgoAuQCIa0CQQIhrgIgrQIgrgJ0Ia8CIKwCIK8CaiGwAiCwAi0AAyGxAkH/ASGyAiCxAiCyAnEhswIgCCgCQCG0AiC0AiCzAmohtQIgCCC1AjYCQAsQHyG2AgJAILYCDQALQcgBIbcCIAggtwJqIbgCILgCIbkCIAgoAkwhugIgCCgC4AEhuwIgCCgCNCG8AiAIILoCNgKQAyAIILkCNgKMAyAIILsCNgKIAyAIILwCNgKEAyAIKAKMAyG9AiAIKAKEAyG+AiC9AiC+AhAgIb8CIAggvwI2AoADIAgoApADIcACIAgoAogDIcECIAgoAoADIcICQQIhwwIgwgIgwwJ0IcQCIMECIMQCaiHFAiDFAi8AACHGAiDAAiDGAjsAACAIKAKMAyHHAiAIKAKIAyHIAiAIKAKAAyHJAkECIcoCIMkCIMoCdCHLAiDIAiDLAmohzAIgzAItAAIhzQJB/wEhzgIgzQIgzgJxIc8CIAggxwI2ApgDIAggzwI2ApQDIAgoApQDIdACIAgoApgDIdECINECKAIEIdICINICINACaiHTAiDRAiDTAjYCBCAIKAKIAyHUAiAIKAKAAyHVAkECIdYCINUCINYCdCHXAiDUAiDXAmoh2AIg2AItAAMh2QJB/wEh2gIg2QIg2gJxIdsCIAgoAkwh3AIg3AIg2wJqId0CIAgg3QI2AkwQHyHeAgJAIN4CDQALQbABId8CIAgg3wJqIeACIOACIeECIAgoAkgh4gIgCCgC4AEh4wIgCCgCNCHkAiAIIOICNgKsAyAIIOECNgKoAyAIIOMCNgKkAyAIIOQCNgKgAyAIKAKoAyHlAiAIKAKgAyHmAiDlAiDmAhAgIecCIAgg5wI2ApwDIAgoAqwDIegCIAgoAqQDIekCIAgoApwDIeoCQQIh6wIg6gIg6wJ0IewCIOkCIOwCaiHtAiDtAi8AACHuAiDoAiDuAjsAACAIKAKoAyHvAiAIKAKkAyHwAiAIKAKcAyHxAkECIfICIPECIPICdCHzAiDwAiDzAmoh9AIg9AItAAIh9QJB/wEh9gIg9QIg9gJxIfcCIAgg7wI2ArQDIAgg9wI2ArADIAgoArADIfgCIAgoArQDIfkCIPkCKAIEIfoCIPoCIPgCaiH7AiD5AiD7AjYCBCAIKAKkAyH8AiAIKAKcAyH9AkECIf4CIP0CIP4CdCH/AiD8AiD/AmohgAMggAMtAAMhgQNB/wEhggMggQMgggNxIYMDIAgoAkghhAMghAMggwNqIYUDIAgghQM2AkgQHyGGAwJAIIYDDQALQZgBIYcDIAgghwNqIYgDIIgDIYkDIAgoAkQhigMgCCgC4AEhiwMgCCgCNCGMAyAIIIoDNgLIAyAIIIkDNgLEAyAIIIsDNgLAAyAIIIwDNgK8AyAIKALEAyGNAyAIKAK8AyGOAyCNAyCOAxAgIY8DIAggjwM2ArgDIAgoAsgDIZADIAgoAsADIZEDIAgoArgDIZIDQQIhkwMgkgMgkwN0IZQDIJEDIJQDaiGVAyCVAy8AACGWAyCQAyCWAzsAACAIKALEAyGXAyAIKALAAyGYAyAIKAK4AyGZA0ECIZoDIJkDIJoDdCGbAyCYAyCbA2ohnAMgnAMtAAIhnQNB/wEhngMgnQMgngNxIZ8DIAgglwM2AtADIAggnwM2AswDIAgoAswDIaADIAgoAtADIaEDIKEDKAIEIaIDIKIDIKADaiGjAyChAyCjAzYCBCAIKALAAyGkAyAIKAK4AyGlA0ECIaYDIKUDIKYDdCGnAyCkAyCnA2ohqAMgqAMtAAMhqQNB/wEhqgMgqQMgqgNxIasDIAgoAkQhrAMgrAMgqwNqIa0DIAggrQM2AkQQHyGuAwJAIK4DDQALQYABIa8DIAggrwNqIbADILADIbEDIAgoAkAhsgMgCCgC4AEhswMgCCgCNCG0AyAIILIDNgLkAyAIILEDNgLgAyAIILMDNgLcAyAIILQDNgLYAyAIKALgAyG1AyAIKALYAyG2AyC1AyC2AxAgIbcDIAggtwM2AtQDIAgoAuQDIbgDIAgoAtwDIbkDIAgoAtQDIboDQQIhuwMgugMguwN0IbwDILkDILwDaiG9AyC9Ay8AACG+AyC4AyC+AzsAACAIKALgAyG/AyAIKALcAyHAAyAIKALUAyHBA0ECIcIDIMEDIMIDdCHDAyDAAyDDA2ohxAMgxAMtAAIhxQNB/wEhxgMgxQMgxgNxIccDIAggvwM2AuwDIAggxwM2AugDIAgoAugDIcgDIAgoAuwDIckDIMkDKAIEIcoDIMoDIMgDaiHLAyDJAyDLAzYCBCAIKALcAyHMAyAIKALUAyHNA0ECIc4DIM0DIM4DdCHPAyDMAyDPA2oh0AMg0AMtAAMh0QNB/wEh0gMg0QMg0gNxIdMDIAgoAkAh1AMg1AMg0wNqIdUDIAgg1QM2AkAQHyHWAwJAINYDRQ0AQcgBIdcDIAgg1wNqIdgDINgDIdkDIAgoAkwh2gMgCCgC4AEh2wMgCCgCNCHcAyAIINoDNgKABCAIINkDNgL8AyAIINsDNgL4AyAIINwDNgL0AyAIKAL8AyHdAyAIKAL0AyHeAyDdAyDeAxAgId8DIAgg3wM2AvADIAgoAoAEIeADIAgoAvgDIeEDIAgoAvADIeIDQQIh4wMg4gMg4wN0IeQDIOEDIOQDaiHlAyDlAy8AACHmAyDgAyDmAzsAACAIKAL8AyHnAyAIKAL4AyHoAyAIKALwAyHpA0ECIeoDIOkDIOoDdCHrAyDoAyDrA2oh7AMg7AMtAAIh7QNB/wEh7gMg7QMg7gNxIe8DIAgg5wM2AogEIAgg7wM2AoQEIAgoAoQEIfADIAgoAogEIfEDIPEDKAIEIfIDIPIDIPADaiHzAyDxAyDzAzYCBCAIKAL4AyH0AyAIKALwAyH1A0ECIfYDIPUDIPYDdCH3AyD0AyD3A2oh+AMg+AMtAAMh+QNB/wEh+gMg+QMg+gNxIfsDIAgoAkwh/AMg/AMg+wNqIf0DIAgg/QM2AkwLEB8h/gMCQCD+A0UNAEGwASH/AyAIIP8DaiGABCCABCGBBCAIKAJIIYIEIAgoAuABIYMEIAgoAjQhhAQgCCCCBDYCnAQgCCCBBDYCmAQgCCCDBDYClAQgCCCEBDYCkAQgCCgCmAQhhQQgCCgCkAQhhgQghQQghgQQICGHBCAIIIcENgKMBCAIKAKcBCGIBCAIKAKUBCGJBCAIKAKMBCGKBEECIYsEIIoEIIsEdCGMBCCJBCCMBGohjQQgjQQvAAAhjgQgiAQgjgQ7AAAgCCgCmAQhjwQgCCgClAQhkAQgCCgCjAQhkQRBAiGSBCCRBCCSBHQhkwQgkAQgkwRqIZQEIJQELQACIZUEQf8BIZYEIJUEIJYEcSGXBCAIII8ENgKkBCAIIJcENgKgBCAIKAKgBCGYBCAIKAKkBCGZBCCZBCgCBCGaBCCaBCCYBGohmwQgmQQgmwQ2AgQgCCgClAQhnAQgCCgCjAQhnQRBAiGeBCCdBCCeBHQhnwQgnAQgnwRqIaAEIKAELQADIaEEQf8BIaIEIKEEIKIEcSGjBCAIKAJIIaQEIKQEIKMEaiGlBCAIIKUENgJICxAfIaYEAkAgpgRFDQBBmAEhpwQgCCCnBGohqAQgqAQhqQQgCCgCRCGqBCAIKALgASGrBCAIKAI0IawEIAggqgQ2ArgEIAggqQQ2ArQEIAggqwQ2ArAEIAggrAQ2AqwEIAgoArQEIa0EIAgoAqwEIa4EIK0EIK4EECAhrwQgCCCvBDYCqAQgCCgCuAQhsAQgCCgCsAQhsQQgCCgCqAQhsgRBAiGzBCCyBCCzBHQhtAQgsQQgtARqIbUEILUELwAAIbYEILAEILYEOwAAIAgoArQEIbcEIAgoArAEIbgEIAgoAqgEIbkEQQIhugQguQQgugR0IbsEILgEILsEaiG8BCC8BC0AAiG9BEH/ASG+BCC9BCC+BHEhvwQgCCC3BDYCwAQgCCC/BDYCvAQgCCgCvAQhwAQgCCgCwAQhwQQgwQQoAgQhwgQgwgQgwARqIcMEIMEEIMMENgIEIAgoArAEIcQEIAgoAqgEIcUEQQIhxgQgxQQgxgR0IccEIMQEIMcEaiHIBCDIBC0AAyHJBEH/ASHKBCDJBCDKBHEhywQgCCgCRCHMBCDMBCDLBGohzQQgCCDNBDYCRAsQHyHOBAJAIM4ERQ0AQYABIc8EIAggzwRqIdAEINAEIdEEIAgoAkAh0gQgCCgC4AEh0wQgCCgCNCHUBCAIINIENgLUBCAIINEENgLQBCAIINMENgLMBCAIINQENgLIBCAIKALQBCHVBCAIKALIBCHWBCDVBCDWBBAgIdcEIAgg1wQ2AsQEIAgoAtQEIdgEIAgoAswEIdkEIAgoAsQEIdoEQQIh2wQg2gQg2wR0IdwEINkEINwEaiHdBCDdBC8AACHeBCDYBCDeBDsAACAIKALQBCHfBCAIKALMBCHgBCAIKALEBCHhBEECIeIEIOEEIOIEdCHjBCDgBCDjBGoh5AQg5AQtAAIh5QRB/wEh5gQg5QQg5gRxIecEIAgg3wQ2AtwEIAgg5wQ2AtgEIAgoAtgEIegEIAgoAtwEIekEIOkEKAIEIeoEIOoEIOgEaiHrBCDpBCDrBDYCBCAIKALMBCHsBCAIKALEBCHtBEECIe4EIO0EIO4EdCHvBCDsBCDvBGoh8AQg8AQtAAMh8QRB/wEh8gQg8QQg8gRxIfMEIAgoAkAh9AQg9AQg8wRqIfUEIAgg9QQ2AkALQQAh9gRBgAEh9wQgCCD3BGoh+AQg+AQh+QRBmAEh+gQgCCD6BGoh+wQg+wQh/ARBsAEh/QQgCCD9BGoh/gQg/gQh/wRByAEhgAUgCCCABWohgQUggQUhggUgCCgCTCGDBSAIKALgASGEBSAIKAI0IYUFIAgggwU2AvAEIAggggU2AuwEIAgghAU2AugEIAgghQU2AuQEIAgoAuwEIYYFIAgoAuQEIYcFIIYFIIcFECAhiAUgCCCIBTYC4AQgCCgC8AQhiQUgCCgC6AQhigUgCCgC4AQhiwVBAiGMBSCLBSCMBXQhjQUgigUgjQVqIY4FII4FLwAAIY8FIIkFII8FOwAAIAgoAuwEIZAFIAgoAugEIZEFIAgoAuAEIZIFQQIhkwUgkgUgkwV0IZQFIJEFIJQFaiGVBSCVBS0AAiGWBUH/ASGXBSCWBSCXBXEhmAUgCCCQBTYC+AQgCCCYBTYC9AQgCCgC9AQhmQUgCCgC+AQhmgUgmgUoAgQhmwUgmwUgmQVqIZwFIJoFIJwFNgIEIAgoAugEIZ0FIAgoAuAEIZ4FQQIhnwUgngUgnwV0IaAFIJ0FIKAFaiGhBSChBS0AAyGiBUH/ASGjBSCiBSCjBXEhpAUgCCgCTCGlBSClBSCkBWohpgUgCCCmBTYCTCAIKAJIIacFIAgoAuABIagFIAgoAjQhqQUgCCCnBTYCjAUgCCD/BDYCiAUgCCCoBTYChAUgCCCpBTYCgAUgCCgCiAUhqgUgCCgCgAUhqwUgqgUgqwUQICGsBSAIIKwFNgL8BCAIKAKMBSGtBSAIKAKEBSGuBSAIKAL8BCGvBUECIbAFIK8FILAFdCGxBSCuBSCxBWohsgUgsgUvAAAhswUgrQUgswU7AAAgCCgCiAUhtAUgCCgChAUhtQUgCCgC/AQhtgVBAiG3BSC2BSC3BXQhuAUgtQUguAVqIbkFILkFLQACIboFQf8BIbsFILoFILsFcSG8BSAIILQFNgKUBSAIILwFNgKQBSAIKAKQBSG9BSAIKAKUBSG+BSC+BSgCBCG/BSC/BSC9BWohwAUgvgUgwAU2AgQgCCgChAUhwQUgCCgC/AQhwgVBAiHDBSDCBSDDBXQhxAUgwQUgxAVqIcUFIMUFLQADIcYFQf8BIccFIMYFIMcFcSHIBSAIKAJIIckFIMkFIMgFaiHKBSAIIMoFNgJIIAgoAkQhywUgCCgC4AEhzAUgCCgCNCHNBSAIIMsFNgKoBSAIIPwENgKkBSAIIMwFNgKgBSAIIM0FNgKcBSAIKAKkBSHOBSAIKAKcBSHPBSDOBSDPBRAgIdAFIAgg0AU2ApgFIAgoAqgFIdEFIAgoAqAFIdIFIAgoApgFIdMFQQIh1AUg0wUg1AV0IdUFINIFINUFaiHWBSDWBS8AACHXBSDRBSDXBTsAACAIKAKkBSHYBSAIKAKgBSHZBSAIKAKYBSHaBUECIdsFINoFINsFdCHcBSDZBSDcBWoh3QUg3QUtAAIh3gVB/wEh3wUg3gUg3wVxIeAFIAgg2AU2ArAFIAgg4AU2AqwFIAgoAqwFIeEFIAgoArAFIeIFIOIFKAIEIeMFIOMFIOEFaiHkBSDiBSDkBTYCBCAIKAKgBSHlBSAIKAKYBSHmBUECIecFIOYFIOcFdCHoBSDlBSDoBWoh6QUg6QUtAAMh6gVB/wEh6wUg6gUg6wVxIewFIAgoAkQh7QUg7QUg7AVqIe4FIAgg7gU2AkQgCCgCQCHvBSAIKALgASHwBSAIKAI0IfEFIAgg7wU2AsQFIAgg+QQ2AsAFIAgg8AU2ArwFIAgg8QU2ArgFIAgoAsAFIfIFIAgoArgFIfMFIPIFIPMFECAh9AUgCCD0BTYCtAUgCCgCxAUh9QUgCCgCvAUh9gUgCCgCtAUh9wVBAiH4BSD3BSD4BXQh+QUg9gUg+QVqIfoFIPoFLwAAIfsFIPUFIPsFOwAAIAgoAsAFIfwFIAgoArwFIf0FIAgoArQFIf4FQQIh/wUg/gUg/wV0IYAGIP0FIIAGaiGBBiCBBi0AAiGCBkH/ASGDBiCCBiCDBnEhhAYgCCD8BTYCzAUgCCCEBjYCyAUgCCgCyAUhhQYgCCgCzAUhhgYghgYoAgQhhwYghwYghQZqIYgGIIYGIIgGNgIEIAgoArwFIYkGIAgoArQFIYoGQQIhiwYgigYgiwZ0IYwGIIkGIIwGaiGNBiCNBi0AAyGOBkH/ASGPBiCOBiCPBnEhkAYgCCgCQCGRBiCRBiCQBmohkgYgCCCSBjYCQCCCBRAlIZMGIJMGIZQGIPYEIZUGIJQGIJUGRiGWBkEBIZcGIJYGIJcGcSGYBiD/BBAlIZkGIJkGIZoGIPYEIZsGIJoGIJsGRiGcBkEBIZ0GIJwGIJ0GcSGeBiCYBiCeBnEhnwYg/AQQJSGgBiCgBiGhBiD2BCGiBiChBiCiBkYhowZBASGkBiCjBiCkBnEhpQYgnwYgpQZxIaYGIPkEECUhpwYgpwYhqAYg9gQhqQYgqAYgqQZGIaoGQQEhqwYgqgYgqwZxIawGIKYGIKwGcSGtBiAIIK0GNgI8DAAACwALIAgoAkwhrgYgCCgCWCGvBiCuBiGwBiCvBiGxBiCwBiCxBkshsgZBASGzBiCyBiCzBnEhtAYCQCC0BkUNAEFsIbUGIAggtQY2AowCDAELIAgoAkghtgYgCCgCVCG3BiC2BiG4BiC3BiG5BiC4BiC5BkshugZBASG7BiC6BiC7BnEhvAYCQCC8BkUNAEFsIb0GIAggvQY2AowCDAELIAgoAkQhvgYgCCgCUCG/BiC+BiHABiC/BiHBBiDABiDBBkshwgZBASHDBiDCBiDDBnEhxAYCQCDEBkUNAEFsIcUGIAggxQY2AowCDAELQcgBIcYGIAggxgZqIccGIMcGIcgGIAgoAkwhyQYgCCgCWCHKBiAIKALgASHLBiAIKAI0IcwGIAggyQY2AuQFIAggyAY2AuAFIAggygY2AtwFIAggywY2AtgFIAggzAY2AtQFIAgoAuQFIc0GIAggzQY2AtAFAkADQEEAIc4GIAgoAuAFIc8GIM8GEB4h0AYg0AYh0QYgzgYh0gYg0QYg0gZGIdMGQQEh1AYg0wYg1AZxIdUGIAgoAuQFIdYGIAgoAtwFIdcGQX0h2AYg1wYg2AZqIdkGINYGIdoGINkGIdsGINoGINsGSSHcBkEBId0GINwGIN0GcSHeBiDVBiDeBnEh3wYg3wZFDQEQHyHgBgJAIOAGRQ0AIAgoAuQFIeEGIAgoAuAFIeIGIAgoAtgFIeMGIAgoAtQFIeQGIAgg4QY2AvgFIAgg4gY2AvQFIAgg4wY2AvAFIAgg5AY2AuwFIAgoAvQFIeUGIAgoAuwFIeYGIOUGIOYGECAh5wYgCCDnBjYC6AUgCCgC+AUh6AYgCCgC8AUh6QYgCCgC6AUh6gZBAiHrBiDqBiDrBnQh7AYg6QYg7AZqIe0GIO0GLwAAIe4GIOgGIO4GOwAAIAgoAvQFIe8GIAgoAvAFIfAGIAgoAugFIfEGQQIh8gYg8QYg8gZ0IfMGIPAGIPMGaiH0BiD0Bi0AAiH1BkH/ASH2BiD1BiD2BnEh9wYgCCDvBjYCgAYgCCD3BjYC/AUgCCgC/AUh+AYgCCgCgAYh+QYg+QYoAgQh+gYg+gYg+AZqIfsGIPkGIPsGNgIEIAgoAvAFIfwGIAgoAugFIf0GQQIh/gYg/QYg/gZ0If8GIPwGIP8GaiGAByCABy0AAyGBB0H/ASGCByCBByCCB3EhgwcgCCgC5AUhhAcghAcggwdqIYUHIAgghQc2AuQFCxAfIYYHAkAghgcNAAsgCCgC5AUhhwcgCCgC4AUhiAcgCCgC2AUhiQcgCCgC1AUhigcgCCCHBzYClAYgCCCIBzYCkAYgCCCJBzYCjAYgCCCKBzYCiAYgCCgCkAYhiwcgCCgCiAYhjAcgiwcgjAcQICGNByAIII0HNgKEBiAIKAKUBiGOByAIKAKMBiGPByAIKAKEBiGQB0ECIZEHIJAHIJEHdCGSByCPByCSB2ohkwcgkwcvAAAhlAcgjgcglAc7AAAgCCgCkAYhlQcgCCgCjAYhlgcgCCgChAYhlwdBAiGYByCXByCYB3QhmQcglgcgmQdqIZoHIJoHLQACIZsHQf8BIZwHIJsHIJwHcSGdByAIIJUHNgKcBiAIIJ0HNgKYBiAIKAKYBiGeByAIKAKcBiGfByCfBygCBCGgByCgByCeB2ohoQcgnwcgoQc2AgQgCCgCjAYhogcgCCgChAYhowdBAiGkByCjByCkB3QhpQcgogcgpQdqIaYHIKYHLQADIacHQf8BIagHIKcHIKgHcSGpByAIKALkBSGqByCqByCpB2ohqwcgCCCrBzYC5AUQHyGsBwJAIKwHRQ0AIAgoAuQFIa0HIAgoAuAFIa4HIAgoAtgFIa8HIAgoAtQFIbAHIAggrQc2ArAGIAggrgc2AqwGIAggrwc2AqgGIAggsAc2AqQGIAgoAqwGIbEHIAgoAqQGIbIHILEHILIHECAhswcgCCCzBzYCoAYgCCgCsAYhtAcgCCgCqAYhtQcgCCgCoAYhtgdBAiG3ByC2ByC3B3QhuAcgtQcguAdqIbkHILkHLwAAIboHILQHILoHOwAAIAgoAqwGIbsHIAgoAqgGIbwHIAgoAqAGIb0HQQIhvgcgvQcgvgd0Ib8HILwHIL8HaiHAByDABy0AAiHBB0H/ASHCByDBByDCB3EhwwcgCCC7BzYCuAYgCCDDBzYCtAYgCCgCtAYhxAcgCCgCuAYhxQcgxQcoAgQhxgcgxgcgxAdqIccHIMUHIMcHNgIEIAgoAqgGIcgHIAgoAqAGIckHQQIhygcgyQcgygd0IcsHIMgHIMsHaiHMByDMBy0AAyHNB0H/ASHOByDNByDOB3EhzwcgCCgC5AUh0Acg0AcgzwdqIdEHIAgg0Qc2AuQFCyAIKALkBSHSByAIKALgBSHTByAIKALYBSHUByAIKALUBSHVByAIINIHNgLMBiAIINMHNgLIBiAIINQHNgLEBiAIINUHNgLABiAIKALIBiHWByAIKALABiHXByDWByDXBxAgIdgHIAgg2Ac2ArwGIAgoAswGIdkHIAgoAsQGIdoHIAgoArwGIdsHQQIh3Acg2wcg3Ad0Id0HINoHIN0HaiHeByDeBy8AACHfByDZByDfBzsAACAIKALIBiHgByAIKALEBiHhByAIKAK8BiHiB0ECIeMHIOIHIOMHdCHkByDhByDkB2oh5Qcg5QctAAIh5gdB/wEh5wcg5gcg5wdxIegHIAgg4Ac2AtQGIAgg6Ac2AtAGIAgoAtAGIekHIAgoAtQGIeoHIOoHKAIEIesHIOsHIOkHaiHsByDqByDsBzYCBCAIKALEBiHtByAIKAK8BiHuB0ECIe8HIO4HIO8HdCHwByDtByDwB2oh8Qcg8QctAAMh8gdB/wEh8wcg8gcg8wdxIfQHIAgoAuQFIfUHIPUHIPQHaiH2ByAIIPYHNgLkBQwAAAsACwJAA0BBACH3ByAIKALgBSH4ByD4BxAeIfkHIPkHIfoHIPcHIfsHIPoHIPsHRiH8B0EBIf0HIPwHIP0HcSH+ByAIKALkBSH/ByAIKALcBSGACEF+IYEIIIAIIIEIaiGCCCD/ByGDCCCCCCGECCCDCCCECE0hhQhBASGGCCCFCCCGCHEhhwgg/gcghwhxIYgIIIgIRQ0BIAgoAuQFIYkIIAgoAuAFIYoIIAgoAtgFIYsIIAgoAtQFIYwIIAggiQg2AugGIAggigg2AuQGIAggiwg2AuAGIAggjAg2AtwGIAgoAuQGIY0IIAgoAtwGIY4III0III4IECAhjwggCCCPCDYC2AYgCCgC6AYhkAggCCgC4AYhkQggCCgC2AYhkghBAiGTCCCSCCCTCHQhlAggkQgglAhqIZUIIJUILwAAIZYIIJAIIJYIOwAAIAgoAuQGIZcIIAgoAuAGIZgIIAgoAtgGIZkIQQIhmgggmQggmgh0IZsIIJgIIJsIaiGcCCCcCC0AAiGdCEH/ASGeCCCdCCCeCHEhnwggCCCXCDYC8AYgCCCfCDYC7AYgCCgC7AYhoAggCCgC8AYhoQggoQgoAgQhogggogggoAhqIaMIIKEIIKMINgIEIAgoAuAGIaQIIAgoAtgGIaUIQQIhpgggpQggpgh0IacIIKQIIKcIaiGoCCCoCC0AAyGpCEH/ASGqCCCpCCCqCHEhqwggCCgC5AUhrAggrAggqwhqIa0IIAggrQg2AuQFDAAACwALAkADQCAIKALkBSGuCCAIKALcBSGvCEF+IbAIIK8IILAIaiGxCCCuCCGyCCCxCCGzCCCyCCCzCE0htAhBASG1CCC0CCC1CHEhtgggtghFDQEgCCgC5AUhtwggCCgC4AUhuAggCCgC2AUhuQggCCgC1AUhugggCCC3CDYChAcgCCC4CDYCgAcgCCC5CDYC/AYgCCC6CDYC+AYgCCgCgAchuwggCCgC+AYhvAgguwggvAgQICG9CCAIIL0INgL0BiAIKAKEByG+CCAIKAL8BiG/CCAIKAL0BiHACEECIcEIIMAIIMEIdCHCCCC/CCDCCGohwwggwwgvAAAhxAggvgggxAg7AAAgCCgCgAchxQggCCgC/AYhxgggCCgC9AYhxwhBAiHICCDHCCDICHQhyQggxgggyQhqIcoIIMoILQACIcsIQf8BIcwIIMsIIMwIcSHNCCAIIMUINgKMByAIIM0INgKIByAIKAKIByHOCCAIKAKMByHPCCDPCCgCBCHQCCDQCCDOCGoh0Qggzwgg0Qg2AgQgCCgC/AYh0gggCCgC9AYh0whBAiHUCCDTCCDUCHQh1Qgg0ggg1QhqIdYIINYILQADIdcIQf8BIdgIINcIINgIcSHZCCAIKALkBSHaCCDaCCDZCGoh2wggCCDbCDYC5AUMAAALAAsgCCgC5AUh3AggCCgC3AUh3Qgg3Agh3ggg3Qgh3wgg3ggg3whJIeAIQQEh4Qgg4Agg4QhxIeIIAkAg4ghFDQBBASHjCCAIKALkBSHkCCAIKALgBSHlCCAIKALYBSHmCCAIKALUBSHnCCAIIOQINgKgByAIIOUINgKcByAIIOYINgKYByAIIOcINgKUByAIKAKcByHoCCAIKAKUByHpCCDoCCDpCBAgIeoIIAgg6gg2ApAHIAgoAqAHIesIIAgoApgHIewIIAgoApAHIe0IQQIh7ggg7Qgg7gh0Ie8IIOwIIO8IaiHwCCDwCC0AACHxCCDrCCDxCDoAACAIKAKYByHyCCAIKAKQByHzCEECIfQIIPMIIPQIdCH1CCDyCCD1CGoh9ggg9ggtAAMh9whB/wEh+Agg9wgg+AhxIfkIIPkIIfoIIOMIIfsIIPoIIPsIRiH8CEEBIf0IIPwIIP0IcSH+CAJAAkAg/ghFDQAgCCgCnAch/wggCCgCmAchgAkgCCgCkAchgQlBAiGCCSCBCSCCCXQhgwkggAkggwlqIYQJIIQJLQACIYUJQf8BIYYJIIUJIIYJcSGHCSAIIP8INgKoByAIIIcJNgKkByAIKAKkByGICSAIKAKoByGJCSCJCSgCBCGKCSCKCSCICWohiwkgiQkgiwk2AgQMAQtBICGMCSAIKAKcByGNCSCNCSgCBCGOCSCOCSGPCSCMCSGQCSCPCSCQCUkhkQlBASGSCSCRCSCSCXEhkwkCQCCTCUUNAEEgIZQJIAgoApwHIZUJIAgoApgHIZYJIAgoApAHIZcJQQIhmAkglwkgmAl0IZkJIJYJIJkJaiGaCSCaCS0AAiGbCUH/ASGcCSCbCSCcCXEhnQkgCCCVCTYCsAcgCCCdCTYCrAcgCCgCrAchngkgCCgCsAchnwkgnwkoAgQhoAkgoAkgnglqIaEJIJ8JIKEJNgIEIAgoApwHIaIJIKIJKAIEIaMJIKMJIaQJIJQJIaUJIKQJIKUJSyGmCUEBIacJIKYJIKcJcSGoCQJAIKgJRQ0AQSAhqQkgCCgCnAchqgkgqgkgqQk2AgQLCwsgCCgC5AUhqwlBASGsCSCrCSCsCWohrQkgCCCtCTYC5AULQbABIa4JIAggrglqIa8JIK8JIbAJIAgoAkghsQkgCCgCVCGyCSAIKALgASGzCSAIKAI0IbQJIAggsQk2AsgHIAggsAk2AsQHIAggsgk2AsAHIAggswk2ArwHIAggtAk2ArgHIAgoAsgHIbUJIAggtQk2ArQHAkADQEEAIbYJIAgoAsQHIbcJILcJEB4huAkguAkhuQkgtgkhugkguQkguglGIbsJQQEhvAkguwkgvAlxIb0JIAgoAsgHIb4JIAgoAsAHIb8JQX0hwAkgvwkgwAlqIcEJIL4JIcIJIMEJIcMJIMIJIMMJSSHECUEBIcUJIMQJIMUJcSHGCSC9CSDGCXEhxwkgxwlFDQEQHyHICQJAIMgJRQ0AIAgoAsgHIckJIAgoAsQHIcoJIAgoArwHIcsJIAgoArgHIcwJIAggyQk2AtwHIAggygk2AtgHIAggywk2AtQHIAggzAk2AtAHIAgoAtgHIc0JIAgoAtAHIc4JIM0JIM4JECAhzwkgCCDPCTYCzAcgCCgC3Ach0AkgCCgC1Ach0QkgCCgCzAch0glBAiHTCSDSCSDTCXQh1Akg0Qkg1AlqIdUJINUJLwAAIdYJINAJINYJOwAAIAgoAtgHIdcJIAgoAtQHIdgJIAgoAswHIdkJQQIh2gkg2Qkg2gl0IdsJINgJINsJaiHcCSDcCS0AAiHdCUH/ASHeCSDdCSDeCXEh3wkgCCDXCTYC5AcgCCDfCTYC4AcgCCgC4Ach4AkgCCgC5Ach4Qkg4QkoAgQh4gkg4gkg4AlqIeMJIOEJIOMJNgIEIAgoAtQHIeQJIAgoAswHIeUJQQIh5gkg5Qkg5gl0IecJIOQJIOcJaiHoCSDoCS0AAyHpCUH/ASHqCSDpCSDqCXEh6wkgCCgCyAch7Akg7Akg6wlqIe0JIAgg7Qk2AsgHCxAfIe4JAkAg7gkNAAsgCCgCyAch7wkgCCgCxAch8AkgCCgCvAch8QkgCCgCuAch8gkgCCDvCTYC+AcgCCDwCTYC9AcgCCDxCTYC8AcgCCDyCTYC7AcgCCgC9Ach8wkgCCgC7Ach9Akg8wkg9AkQICH1CSAIIPUJNgLoByAIKAL4ByH2CSAIKALwByH3CSAIKALoByH4CUECIfkJIPgJIPkJdCH6CSD3CSD6CWoh+wkg+wkvAAAh/Akg9gkg/Ak7AAAgCCgC9Ach/QkgCCgC8Ach/gkgCCgC6Ach/wlBAiGACiD/CSCACnQhgQog/gkggQpqIYIKIIIKLQACIYMKQf8BIYQKIIMKIIQKcSGFCiAIIP0JNgKACCAIIIUKNgL8ByAIKAL8ByGGCiAIKAKACCGHCiCHCigCBCGICiCICiCGCmohiQoghwogiQo2AgQgCCgC8AchigogCCgC6AchiwpBAiGMCiCLCiCMCnQhjQogigogjQpqIY4KII4KLQADIY8KQf8BIZAKII8KIJAKcSGRCiAIKALIByGSCiCSCiCRCmohkwogCCCTCjYCyAcQHyGUCgJAIJQKRQ0AIAgoAsgHIZUKIAgoAsQHIZYKIAgoArwHIZcKIAgoArgHIZgKIAgglQo2ApQIIAgglgo2ApAIIAgglwo2AowIIAggmAo2AogIIAgoApAIIZkKIAgoAogIIZoKIJkKIJoKECAhmwogCCCbCjYChAggCCgClAghnAogCCgCjAghnQogCCgChAghngpBAiGfCiCeCiCfCnQhoAognQogoApqIaEKIKEKLwAAIaIKIJwKIKIKOwAAIAgoApAIIaMKIAgoAowIIaQKIAgoAoQIIaUKQQIhpgogpQogpgp0IacKIKQKIKcKaiGoCiCoCi0AAiGpCkH/ASGqCiCpCiCqCnEhqwogCCCjCjYCnAggCCCrCjYCmAggCCgCmAghrAogCCgCnAghrQogrQooAgQhrgogrgogrApqIa8KIK0KIK8KNgIEIAgoAowIIbAKIAgoAoQIIbEKQQIhsgogsQogsgp0IbMKILAKILMKaiG0CiC0Ci0AAyG1CkH/ASG2CiC1CiC2CnEhtwogCCgCyAchuAoguAogtwpqIbkKIAgguQo2AsgHCyAIKALIByG6CiAIKALEByG7CiAIKAK8ByG8CiAIKAK4ByG9CiAIILoKNgKwCCAIILsKNgKsCCAIILwKNgKoCCAIIL0KNgKkCCAIKAKsCCG+CiAIKAKkCCG/CiC+CiC/ChAgIcAKIAggwAo2AqAIIAgoArAIIcEKIAgoAqgIIcIKIAgoAqAIIcMKQQIhxAogwwogxAp0IcUKIMIKIMUKaiHGCiDGCi8AACHHCiDBCiDHCjsAACAIKAKsCCHICiAIKAKoCCHJCiAIKAKgCCHKCkECIcsKIMoKIMsKdCHMCiDJCiDMCmohzQogzQotAAIhzgpB/wEhzwogzgogzwpxIdAKIAggyAo2ArgIIAgg0Ao2ArQIIAgoArQIIdEKIAgoArgIIdIKINIKKAIEIdMKINMKINEKaiHUCiDSCiDUCjYCBCAIKAKoCCHVCiAIKAKgCCHWCkECIdcKINYKINcKdCHYCiDVCiDYCmoh2Qog2QotAAMh2gpB/wEh2wog2gog2wpxIdwKIAgoAsgHId0KIN0KINwKaiHeCiAIIN4KNgLIBwwAAAsACwJAA0BBACHfCiAIKALEByHgCiDgChAeIeEKIOEKIeIKIN8KIeMKIOIKIOMKRiHkCkEBIeUKIOQKIOUKcSHmCiAIKALIByHnCiAIKALAByHoCkF+IekKIOgKIOkKaiHqCiDnCiHrCiDqCiHsCiDrCiDsCk0h7QpBASHuCiDtCiDuCnEh7wog5gog7wpxIfAKIPAKRQ0BIAgoAsgHIfEKIAgoAsQHIfIKIAgoArwHIfMKIAgoArgHIfQKIAgg8Qo2AswIIAgg8go2AsgIIAgg8wo2AsQIIAgg9Ao2AsAIIAgoAsgIIfUKIAgoAsAIIfYKIPUKIPYKECAh9wogCCD3CjYCvAggCCgCzAgh+AogCCgCxAgh+QogCCgCvAgh+gpBAiH7CiD6CiD7CnQh/Aog+Qog/ApqIf0KIP0KLwAAIf4KIPgKIP4KOwAAIAgoAsgIIf8KIAgoAsQIIYALIAgoArwIIYELQQIhggsggQsgggt0IYMLIIALIIMLaiGECyCECy0AAiGFC0H/ASGGCyCFCyCGC3EhhwsgCCD/CjYC1AggCCCHCzYC0AggCCgC0AghiAsgCCgC1AghiQsgiQsoAgQhigsgigsgiAtqIYsLIIkLIIsLNgIEIAgoAsQIIYwLIAgoArwIIY0LQQIhjgsgjQsgjgt0IY8LIIwLII8LaiGQCyCQCy0AAyGRC0H/ASGSCyCRCyCSC3EhkwsgCCgCyAchlAsglAsgkwtqIZULIAgglQs2AsgHDAAACwALAkADQCAIKALIByGWCyAIKALAByGXC0F+IZgLIJcLIJgLaiGZCyCWCyGaCyCZCyGbCyCaCyCbC00hnAtBASGdCyCcCyCdC3EhngsgngtFDQEgCCgCyAchnwsgCCgCxAchoAsgCCgCvAchoQsgCCgCuAchogsgCCCfCzYC6AggCCCgCzYC5AggCCChCzYC4AggCCCiCzYC3AggCCgC5AghowsgCCgC3AghpAsgowsgpAsQICGlCyAIIKULNgLYCCAIKALoCCGmCyAIKALgCCGnCyAIKALYCCGoC0ECIakLIKgLIKkLdCGqCyCnCyCqC2ohqwsgqwsvAAAhrAsgpgsgrAs7AAAgCCgC5AghrQsgCCgC4AghrgsgCCgC2AghrwtBAiGwCyCvCyCwC3QhsQsgrgsgsQtqIbILILILLQACIbMLQf8BIbQLILMLILQLcSG1CyAIIK0LNgLwCCAIILULNgLsCCAIKALsCCG2CyAIKALwCCG3CyC3CygCBCG4CyC4CyC2C2ohuQsgtwsguQs2AgQgCCgC4AghugsgCCgC2AghuwtBAiG8CyC7CyC8C3QhvQsgugsgvQtqIb4LIL4LLQADIb8LQf8BIcALIL8LIMALcSHBCyAIKALIByHCCyDCCyDBC2ohwwsgCCDDCzYCyAcMAAALAAsgCCgCyAchxAsgCCgCwAchxQsgxAshxgsgxQshxwsgxgsgxwtJIcgLQQEhyQsgyAsgyQtxIcoLAkAgygtFDQBBASHLCyAIKALIByHMCyAIKALEByHNCyAIKAK8ByHOCyAIKAK4ByHPCyAIIMwLNgKECSAIIM0LNgKACSAIIM4LNgL8CCAIIM8LNgL4CCAIKAKACSHQCyAIKAL4CCHRCyDQCyDRCxAgIdILIAgg0gs2AvQIIAgoAoQJIdMLIAgoAvwIIdQLIAgoAvQIIdULQQIh1gsg1Qsg1gt0IdcLINQLINcLaiHYCyDYCy0AACHZCyDTCyDZCzoAACAIKAL8CCHaCyAIKAL0CCHbC0ECIdwLINsLINwLdCHdCyDaCyDdC2oh3gsg3gstAAMh3wtB/wEh4Asg3wsg4AtxIeELIOELIeILIMsLIeMLIOILIOMLRiHkC0EBIeULIOQLIOULcSHmCwJAAkAg5gtFDQAgCCgCgAkh5wsgCCgC/Agh6AsgCCgC9Agh6QtBAiHqCyDpCyDqC3Qh6wsg6Asg6wtqIewLIOwLLQACIe0LQf8BIe4LIO0LIO4LcSHvCyAIIOcLNgKMCSAIIO8LNgKICSAIKAKICSHwCyAIKAKMCSHxCyDxCygCBCHyCyDyCyDwC2oh8wsg8Qsg8ws2AgQMAQtBICH0CyAIKAKACSH1CyD1CygCBCH2CyD2CyH3CyD0CyH4CyD3CyD4C0kh+QtBASH6CyD5CyD6C3Eh+wsCQCD7C0UNAEEgIfwLIAgoAoAJIf0LIAgoAvwIIf4LIAgoAvQIIf8LQQIhgAwg/wsggAx0IYEMIP4LIIEMaiGCDCCCDC0AAiGDDEH/ASGEDCCDDCCEDHEhhQwgCCD9CzYClAkgCCCFDDYCkAkgCCgCkAkhhgwgCCgClAkhhwwghwwoAgQhiAwgiAwghgxqIYkMIIcMIIkMNgIEIAgoAoAJIYoMIIoMKAIEIYsMIIsMIYwMIPwLIY0MIIwMII0MSyGODEEBIY8MII4MII8McSGQDAJAIJAMRQ0AQSAhkQwgCCgCgAkhkgwgkgwgkQw2AgQLCwsgCCgCyAchkwxBASGUDCCTDCCUDGohlQwgCCCVDDYCyAcLQZgBIZYMIAgglgxqIZcMIJcMIZgMIAgoAkQhmQwgCCgCUCGaDCAIKALgASGbDCAIKAI0IZwMIAggmQw2AqwJIAggmAw2AqgJIAggmgw2AqQJIAggmww2AqAJIAggnAw2ApwJIAgoAqwJIZ0MIAggnQw2ApgJAkADQEEAIZ4MIAgoAqgJIZ8MIJ8MEB4hoAwgoAwhoQwgngwhogwgoQwgogxGIaMMQQEhpAwgowwgpAxxIaUMIAgoAqwJIaYMIAgoAqQJIacMQX0hqAwgpwwgqAxqIakMIKYMIaoMIKkMIasMIKoMIKsMSSGsDEEBIa0MIKwMIK0McSGuDCClDCCuDHEhrwwgrwxFDQEQHyGwDAJAILAMRQ0AIAgoAqwJIbEMIAgoAqgJIbIMIAgoAqAJIbMMIAgoApwJIbQMIAggsQw2AsAJIAggsgw2ArwJIAggsww2ArgJIAggtAw2ArQJIAgoArwJIbUMIAgoArQJIbYMILUMILYMECAhtwwgCCC3DDYCsAkgCCgCwAkhuAwgCCgCuAkhuQwgCCgCsAkhugxBAiG7DCC6DCC7DHQhvAwguQwgvAxqIb0MIL0MLwAAIb4MILgMIL4MOwAAIAgoArwJIb8MIAgoArgJIcAMIAgoArAJIcEMQQIhwgwgwQwgwgx0IcMMIMAMIMMMaiHEDCDEDC0AAiHFDEH/ASHGDCDFDCDGDHEhxwwgCCC/DDYCyAkgCCDHDDYCxAkgCCgCxAkhyAwgCCgCyAkhyQwgyQwoAgQhygwgygwgyAxqIcsMIMkMIMsMNgIEIAgoArgJIcwMIAgoArAJIc0MQQIhzgwgzQwgzgx0Ic8MIMwMIM8MaiHQDCDQDC0AAyHRDEH/ASHSDCDRDCDSDHEh0wwgCCgCrAkh1Awg1Awg0wxqIdUMIAgg1Qw2AqwJCxAfIdYMAkAg1gwNAAsgCCgCrAkh1wwgCCgCqAkh2AwgCCgCoAkh2QwgCCgCnAkh2gwgCCDXDDYC3AkgCCDYDDYC2AkgCCDZDDYC1AkgCCDaDDYC0AkgCCgC2Akh2wwgCCgC0Akh3Awg2wwg3AwQICHdDCAIIN0MNgLMCSAIKALcCSHeDCAIKALUCSHfDCAIKALMCSHgDEECIeEMIOAMIOEMdCHiDCDfDCDiDGoh4wwg4wwvAAAh5Awg3gwg5Aw7AAAgCCgC2Akh5QwgCCgC1Akh5gwgCCgCzAkh5wxBAiHoDCDnDCDoDHQh6Qwg5gwg6QxqIeoMIOoMLQACIesMQf8BIewMIOsMIOwMcSHtDCAIIOUMNgLkCSAIIO0MNgLgCSAIKALgCSHuDCAIKALkCSHvDCDvDCgCBCHwDCDwDCDuDGoh8Qwg7wwg8Qw2AgQgCCgC1Akh8gwgCCgCzAkh8wxBAiH0DCDzDCD0DHQh9Qwg8gwg9QxqIfYMIPYMLQADIfcMQf8BIfgMIPcMIPgMcSH5DCAIKAKsCSH6DCD6DCD5DGoh+wwgCCD7DDYCrAkQHyH8DAJAIPwMRQ0AIAgoAqwJIf0MIAgoAqgJIf4MIAgoAqAJIf8MIAgoApwJIYANIAgg/Qw2AvgJIAgg/gw2AvQJIAgg/ww2AvAJIAgggA02AuwJIAgoAvQJIYENIAgoAuwJIYINIIENIIINECAhgw0gCCCDDTYC6AkgCCgC+AkhhA0gCCgC8AkhhQ0gCCgC6Akhhg1BAiGHDSCGDSCHDXQhiA0ghQ0giA1qIYkNIIkNLwAAIYoNIIQNIIoNOwAAIAgoAvQJIYsNIAgoAvAJIYwNIAgoAugJIY0NQQIhjg0gjQ0gjg10IY8NIIwNII8NaiGQDSCQDS0AAiGRDUH/ASGSDSCRDSCSDXEhkw0gCCCLDTYCgAogCCCTDTYC/AkgCCgC/AkhlA0gCCgCgAohlQ0glQ0oAgQhlg0glg0glA1qIZcNIJUNIJcNNgIEIAgoAvAJIZgNIAgoAugJIZkNQQIhmg0gmQ0gmg10IZsNIJgNIJsNaiGcDSCcDS0AAyGdDUH/ASGeDSCdDSCeDXEhnw0gCCgCrAkhoA0goA0gnw1qIaENIAggoQ02AqwJCyAIKAKsCSGiDSAIKAKoCSGjDSAIKAKgCSGkDSAIKAKcCSGlDSAIIKINNgKUCiAIIKMNNgKQCiAIIKQNNgKMCiAIIKUNNgKICiAIKAKQCiGmDSAIKAKICiGnDSCmDSCnDRAgIagNIAggqA02AoQKIAgoApQKIakNIAgoAowKIaoNIAgoAoQKIasNQQIhrA0gqw0grA10Ia0NIKoNIK0NaiGuDSCuDS8AACGvDSCpDSCvDTsAACAIKAKQCiGwDSAIKAKMCiGxDSAIKAKECiGyDUECIbMNILINILMNdCG0DSCxDSC0DWohtQ0gtQ0tAAIhtg1B/wEhtw0gtg0gtw1xIbgNIAggsA02ApwKIAgguA02ApgKIAgoApgKIbkNIAgoApwKIboNILoNKAIEIbsNILsNILkNaiG8DSC6DSC8DTYCBCAIKAKMCiG9DSAIKAKECiG+DUECIb8NIL4NIL8NdCHADSC9DSDADWohwQ0gwQ0tAAMhwg1B/wEhww0gwg0gww1xIcQNIAgoAqwJIcUNIMUNIMQNaiHGDSAIIMYNNgKsCQwAAAsACwJAA0BBACHHDSAIKAKoCSHIDSDIDRAeIckNIMkNIcoNIMcNIcsNIMoNIMsNRiHMDUEBIc0NIMwNIM0NcSHODSAIKAKsCSHPDSAIKAKkCSHQDUF+IdENINANINENaiHSDSDPDSHTDSDSDSHUDSDTDSDUDU0h1Q1BASHWDSDVDSDWDXEh1w0gzg0g1w1xIdgNINgNRQ0BIAgoAqwJIdkNIAgoAqgJIdoNIAgoAqAJIdsNIAgoApwJIdwNIAgg2Q02ArAKIAgg2g02AqwKIAgg2w02AqgKIAgg3A02AqQKIAgoAqwKId0NIAgoAqQKId4NIN0NIN4NECAh3w0gCCDfDTYCoAogCCgCsAoh4A0gCCgCqAoh4Q0gCCgCoAoh4g1BAiHjDSDiDSDjDXQh5A0g4Q0g5A1qIeUNIOUNLwAAIeYNIOANIOYNOwAAIAgoAqwKIecNIAgoAqgKIegNIAgoAqAKIekNQQIh6g0g6Q0g6g10IesNIOgNIOsNaiHsDSDsDS0AAiHtDUH/ASHuDSDtDSDuDXEh7w0gCCDnDTYCuAogCCDvDTYCtAogCCgCtAoh8A0gCCgCuAoh8Q0g8Q0oAgQh8g0g8g0g8A1qIfMNIPENIPMNNgIEIAgoAqgKIfQNIAgoAqAKIfUNQQIh9g0g9Q0g9g10IfcNIPQNIPcNaiH4DSD4DS0AAyH5DUH/ASH6DSD5DSD6DXEh+w0gCCgCrAkh/A0g/A0g+w1qIf0NIAgg/Q02AqwJDAAACwALAkADQCAIKAKsCSH+DSAIKAKkCSH/DUF+IYAOIP8NIIAOaiGBDiD+DSGCDiCBDiGDDiCCDiCDDk0hhA5BASGFDiCEDiCFDnEhhg4ghg5FDQEgCCgCrAkhhw4gCCgCqAkhiA4gCCgCoAkhiQ4gCCgCnAkhig4gCCCHDjYCzAogCCCIDjYCyAogCCCJDjYCxAogCCCKDjYCwAogCCgCyAohiw4gCCgCwAohjA4giw4gjA4QICGNDiAIII0ONgK8CiAIKALMCiGODiAIKALECiGPDiAIKAK8CiGQDkECIZEOIJAOIJEOdCGSDiCPDiCSDmohkw4gkw4vAAAhlA4gjg4glA47AAAgCCgCyAohlQ4gCCgCxAohlg4gCCgCvAohlw5BAiGYDiCXDiCYDnQhmQ4glg4gmQ5qIZoOIJoOLQACIZsOQf8BIZwOIJsOIJwOcSGdDiAIIJUONgLUCiAIIJ0ONgLQCiAIKALQCiGeDiAIKALUCiGfDiCfDigCBCGgDiCgDiCeDmohoQ4gnw4goQ42AgQgCCgCxAohog4gCCgCvAohow5BAiGkDiCjDiCkDnQhpQ4gog4gpQ5qIaYOIKYOLQADIacOQf8BIagOIKcOIKgOcSGpDiAIKAKsCSGqDiCqDiCpDmohqw4gCCCrDjYCrAkMAAALAAsgCCgCrAkhrA4gCCgCpAkhrQ4grA4hrg4grQ4hrw4grg4grw5JIbAOQQEhsQ4gsA4gsQ5xIbIOAkAgsg5FDQBBASGzDiAIKAKsCSG0DiAIKAKoCSG1DiAIKAKgCSG2DiAIKAKcCSG3DiAIILQONgLoCiAIILUONgLkCiAIILYONgLgCiAIILcONgLcCiAIKALkCiG4DiAIKALcCiG5DiC4DiC5DhAgIboOIAggug42AtgKIAgoAugKIbsOIAgoAuAKIbwOIAgoAtgKIb0OQQIhvg4gvQ4gvg50Ib8OILwOIL8OaiHADiDADi0AACHBDiC7DiDBDjoAACAIKALgCiHCDiAIKALYCiHDDkECIcQOIMMOIMQOdCHFDiDCDiDFDmohxg4gxg4tAAMhxw5B/wEhyA4gxw4gyA5xIckOIMkOIcoOILMOIcsOIMoOIMsORiHMDkEBIc0OIMwOIM0OcSHODgJAAkAgzg5FDQAgCCgC5Aohzw4gCCgC4Aoh0A4gCCgC2Aoh0Q5BAiHSDiDRDiDSDnQh0w4g0A4g0w5qIdQOINQOLQACIdUOQf8BIdYOINUOINYOcSHXDiAIIM8ONgLwCiAIINcONgLsCiAIKALsCiHYDiAIKALwCiHZDiDZDigCBCHaDiDaDiDYDmoh2w4g2Q4g2w42AgQMAQtBICHcDiAIKALkCiHdDiDdDigCBCHeDiDeDiHfDiDcDiHgDiDfDiDgDkkh4Q5BASHiDiDhDiDiDnEh4w4CQCDjDkUNAEEgIeQOIAgoAuQKIeUOIAgoAuAKIeYOIAgoAtgKIecOQQIh6A4g5w4g6A50IekOIOYOIOkOaiHqDiDqDi0AAiHrDkH/ASHsDiDrDiDsDnEh7Q4gCCDlDjYC+AogCCDtDjYC9AogCCgC9Aoh7g4gCCgC+Aoh7w4g7w4oAgQh8A4g8A4g7g5qIfEOIO8OIPEONgIEIAgoAuQKIfIOIPIOKAIEIfMOIPMOIfQOIOQOIfUOIPQOIPUOSyH2DkEBIfcOIPYOIPcOcSH4DgJAIPgORQ0AQSAh+Q4gCCgC5Aoh+g4g+g4g+Q42AgQLCwsgCCgCrAkh+w5BASH8DiD7DiD8Dmoh/Q4gCCD9DjYCrAkLQYABIf4OIAgg/g5qIf8OIP8OIYAPIAgoAkAhgQ8gCCgC7AEhgg8gCCgC4AEhgw8gCCgCNCGEDyAIIIEPNgKQCyAIIIAPNgKMCyAIIIIPNgKICyAIIIMPNgKECyAIIIQPNgKACyAIKAKQCyGFDyAIIIUPNgL8CgJAA0BBACGGDyAIKAKMCyGHDyCHDxAeIYgPIIgPIYkPIIYPIYoPIIkPIIoPRiGLD0EBIYwPIIsPIIwPcSGNDyAIKAKQCyGODyAIKAKICyGPD0F9IZAPII8PIJAPaiGRDyCODyGSDyCRDyGTDyCSDyCTD0khlA9BASGVDyCUDyCVD3Ehlg8gjQ8glg9xIZcPIJcPRQ0BEB8hmA8CQCCYD0UNACAIKAKQCyGZDyAIKAKMCyGaDyAIKAKECyGbDyAIKAKACyGcDyAIIJkPNgKkCyAIIJoPNgKgCyAIIJsPNgKcCyAIIJwPNgKYCyAIKAKgCyGdDyAIKAKYCyGeDyCdDyCeDxAgIZ8PIAggnw82ApQLIAgoAqQLIaAPIAgoApwLIaEPIAgoApQLIaIPQQIhow8gog8gow90IaQPIKEPIKQPaiGlDyClDy8AACGmDyCgDyCmDzsAACAIKAKgCyGnDyAIKAKcCyGoDyAIKAKUCyGpD0ECIaoPIKkPIKoPdCGrDyCoDyCrD2ohrA8grA8tAAIhrQ9B/wEhrg8grQ8grg9xIa8PIAggpw82AqwLIAggrw82AqgLIAgoAqgLIbAPIAgoAqwLIbEPILEPKAIEIbIPILIPILAPaiGzDyCxDyCzDzYCBCAIKAKcCyG0DyAIKAKUCyG1D0ECIbYPILUPILYPdCG3DyC0DyC3D2ohuA8guA8tAAMhuQ9B/wEhug8guQ8gug9xIbsPIAgoApALIbwPILwPILsPaiG9DyAIIL0PNgKQCwsQHyG+DwJAIL4PDQALIAgoApALIb8PIAgoAowLIcAPIAgoAoQLIcEPIAgoAoALIcIPIAggvw82AsALIAggwA82ArwLIAggwQ82ArgLIAggwg82ArQLIAgoArwLIcMPIAgoArQLIcQPIMMPIMQPECAhxQ8gCCDFDzYCsAsgCCgCwAshxg8gCCgCuAshxw8gCCgCsAshyA9BAiHJDyDIDyDJD3Qhyg8gxw8gyg9qIcsPIMsPLwAAIcwPIMYPIMwPOwAAIAgoArwLIc0PIAgoArgLIc4PIAgoArALIc8PQQIh0A8gzw8g0A90IdEPIM4PINEPaiHSDyDSDy0AAiHTD0H/ASHUDyDTDyDUD3Eh1Q8gCCDNDzYCyAsgCCDVDzYCxAsgCCgCxAsh1g8gCCgCyAsh1w8g1w8oAgQh2A8g2A8g1g9qIdkPINcPINkPNgIEIAgoArgLIdoPIAgoArALIdsPQQIh3A8g2w8g3A90Id0PINoPIN0PaiHeDyDeDy0AAyHfD0H/ASHgDyDfDyDgD3Eh4Q8gCCgCkAsh4g8g4g8g4Q9qIeMPIAgg4w82ApALEB8h5A8CQCDkD0UNACAIKAKQCyHlDyAIKAKMCyHmDyAIKAKECyHnDyAIKAKACyHoDyAIIOUPNgLcCyAIIOYPNgLYCyAIIOcPNgLUCyAIIOgPNgLQCyAIKALYCyHpDyAIKALQCyHqDyDpDyDqDxAgIesPIAgg6w82AswLIAgoAtwLIewPIAgoAtQLIe0PIAgoAswLIe4PQQIh7w8g7g8g7w90IfAPIO0PIPAPaiHxDyDxDy8AACHyDyDsDyDyDzsAACAIKALYCyHzDyAIKALUCyH0DyAIKALMCyH1D0ECIfYPIPUPIPYPdCH3DyD0DyD3D2oh+A8g+A8tAAIh+Q9B/wEh+g8g+Q8g+g9xIfsPIAgg8w82AuQLIAgg+w82AuALIAgoAuALIfwPIAgoAuQLIf0PIP0PKAIEIf4PIP4PIPwPaiH/DyD9DyD/DzYCBCAIKALUCyGAECAIKALMCyGBEEECIYIQIIEQIIIQdCGDECCAECCDEGohhBAghBAtAAMhhRBB/wEhhhAghRAghhBxIYcQIAgoApALIYgQIIgQIIcQaiGJECAIIIkQNgKQCwsgCCgCkAshihAgCCgCjAshixAgCCgChAshjBAgCCgCgAshjRAgCCCKEDYC+AsgCCCLEDYC9AsgCCCMEDYC8AsgCCCNEDYC7AsgCCgC9AshjhAgCCgC7AshjxAgjhAgjxAQICGQECAIIJAQNgLoCyAIKAL4CyGRECAIKALwCyGSECAIKALoCyGTEEECIZQQIJMQIJQQdCGVECCSECCVEGohlhAglhAvAAAhlxAgkRAglxA7AAAgCCgC9AshmBAgCCgC8AshmRAgCCgC6AshmhBBAiGbECCaECCbEHQhnBAgmRAgnBBqIZ0QIJ0QLQACIZ4QQf8BIZ8QIJ4QIJ8QcSGgECAIIJgQNgKADCAIIKAQNgL8CyAIKAL8CyGhECAIKAKADCGiECCiECgCBCGjECCjECChEGohpBAgohAgpBA2AgQgCCgC8AshpRAgCCgC6AshphBBAiGnECCmECCnEHQhqBAgpRAgqBBqIakQIKkQLQADIaoQQf8BIasQIKoQIKsQcSGsECAIKAKQCyGtECCtECCsEGohrhAgCCCuEDYCkAsMAAALAAsCQANAQQAhrxAgCCgCjAshsBAgsBAQHiGxECCxECGyECCvECGzECCyECCzEEYhtBBBASG1ECC0ECC1EHEhthAgCCgCkAshtxAgCCgCiAshuBBBfiG5ECC4ECC5EGohuhAgtxAhuxAguhAhvBAguxAgvBBNIb0QQQEhvhAgvRAgvhBxIb8QILYQIL8QcSHAECDAEEUNASAIKAKQCyHBECAIKAKMCyHCECAIKAKECyHDECAIKAKACyHEECAIIMEQNgKUDCAIIMIQNgKQDCAIIMMQNgKMDCAIIMQQNgKIDCAIKAKQDCHFECAIKAKIDCHGECDFECDGEBAgIccQIAggxxA2AoQMIAgoApQMIcgQIAgoAowMIckQIAgoAoQMIcoQQQIhyxAgyhAgyxB0IcwQIMkQIMwQaiHNECDNEC8AACHOECDIECDOEDsAACAIKAKQDCHPECAIKAKMDCHQECAIKAKEDCHREEECIdIQINEQINIQdCHTECDQECDTEGoh1BAg1BAtAAIh1RBB/wEh1hAg1RAg1hBxIdcQIAggzxA2ApwMIAgg1xA2ApgMIAgoApgMIdgQIAgoApwMIdkQINkQKAIEIdoQINoQINgQaiHbECDZECDbEDYCBCAIKAKMDCHcECAIKAKEDCHdEEECId4QIN0QIN4QdCHfECDcECDfEGoh4BAg4BAtAAMh4RBB/wEh4hAg4RAg4hBxIeMQIAgoApALIeQQIOQQIOMQaiHlECAIIOUQNgKQCwwAAAsACwJAA0AgCCgCkAsh5hAgCCgCiAsh5xBBfiHoECDnECDoEGoh6RAg5hAh6hAg6RAh6xAg6hAg6xBNIewQQQEh7RAg7BAg7RBxIe4QIO4QRQ0BIAgoApALIe8QIAgoAowLIfAQIAgoAoQLIfEQIAgoAoALIfIQIAgg7xA2ArAMIAgg8BA2AqwMIAgg8RA2AqgMIAgg8hA2AqQMIAgoAqwMIfMQIAgoAqQMIfQQIPMQIPQQECAh9RAgCCD1EDYCoAwgCCgCsAwh9hAgCCgCqAwh9xAgCCgCoAwh+BBBAiH5ECD4ECD5EHQh+hAg9xAg+hBqIfsQIPsQLwAAIfwQIPYQIPwQOwAAIAgoAqwMIf0QIAgoAqgMIf4QIAgoAqAMIf8QQQIhgBEg/xAggBF0IYERIP4QIIERaiGCESCCES0AAiGDEUH/ASGEESCDESCEEXEhhREgCCD9EDYCuAwgCCCFETYCtAwgCCgCtAwhhhEgCCgCuAwhhxEghxEoAgQhiBEgiBEghhFqIYkRIIcRIIkRNgIEIAgoAqgMIYoRIAgoAqAMIYsRQQIhjBEgixEgjBF0IY0RIIoRII0RaiGOESCOES0AAyGPEUH/ASGQESCPESCQEXEhkREgCCgCkAshkhEgkhEgkRFqIZMRIAggkxE2ApALDAAACwALIAgoApALIZQRIAgoAogLIZURIJQRIZYRIJURIZcRIJYRIJcRSSGYEUEBIZkRIJgRIJkRcSGaEQJAIJoRRQ0AQQEhmxEgCCgCkAshnBEgCCgCjAshnREgCCgChAshnhEgCCgCgAshnxEgCCCcETYCzAwgCCCdETYCyAwgCCCeETYCxAwgCCCfETYCwAwgCCgCyAwhoBEgCCgCwAwhoREgoBEgoREQICGiESAIIKIRNgK8DCAIKALMDCGjESAIKALEDCGkESAIKAK8DCGlEUECIaYRIKURIKYRdCGnESCkESCnEWohqBEgqBEtAAAhqREgoxEgqRE6AAAgCCgCxAwhqhEgCCgCvAwhqxFBAiGsESCrESCsEXQhrREgqhEgrRFqIa4RIK4RLQADIa8RQf8BIbARIK8RILARcSGxESCxESGyESCbESGzESCyESCzEUYhtBFBASG1ESC0ESC1EXEhthECQAJAILYRRQ0AIAgoAsgMIbcRIAgoAsQMIbgRIAgoArwMIbkRQQIhuhEguREguhF0IbsRILgRILsRaiG8ESC8ES0AAiG9EUH/ASG+ESC9ESC+EXEhvxEgCCC3ETYC1AwgCCC/ETYC0AwgCCgC0AwhwBEgCCgC1AwhwREgwREoAgQhwhEgwhEgwBFqIcMRIMERIMMRNgIEDAELQSAhxBEgCCgCyAwhxREgxREoAgQhxhEgxhEhxxEgxBEhyBEgxxEgyBFJIckRQQEhyhEgyREgyhFxIcsRAkAgyxFFDQBBICHMESAIKALIDCHNESAIKALEDCHOESAIKAK8DCHPEUECIdARIM8RINARdCHRESDOESDREWoh0hEg0hEtAAIh0xFB/wEh1BEg0xEg1BFxIdURIAggzRE2AtwMIAgg1RE2AtgMIAgoAtgMIdYRIAgoAtwMIdcRINcRKAIEIdgRINgRINYRaiHZESDXESDZETYCBCAIKALIDCHaESDaESgCBCHbESDbESHcESDMESHdESDcESDdEUsh3hFBASHfESDeESDfEXEh4BECQCDgEUUNAEEgIeERIAgoAsgMIeIRIOIRIOERNgIECwsLIAgoApALIeMRQQEh5BEg4xEg5BFqIeURIAgg5RE2ApALC0GAASHmESAIIOYRaiHnESDnESHoEUGYASHpESAIIOkRaiHqESDqESHrEUGwASHsESAIIOwRaiHtESDtESHuEUHIASHvESAIIO8RaiHwESDwESHxESDxERAiIfIRIO4RECIh8xEg8hEg8xFxIfQRIOsRECIh9REg9BEg9RFxIfYRIOgRECIh9xEg9hEg9xFxIfgRIAgg+BE2AiAgCCgCICH5EQJAIPkRDQBBbCH6ESAIIPoRNgKMAgwBCyAIKAKEAiH7ESAIIPsRNgKMAgsgCCgCjAIh/BFB4Awh/REgCCD9EWoh/hEg/hEkACD8EQ8LjQMBJX8jACEIQTAhCSAIIAlrIQogCiQAIAogADYCKCAKIAE2AiQgCiACNgIgIAogAzYCHCAKIAQ2AhggCiAFNgIUIAogBjYCECAKIAc2AgwgCigCHCELIAogCzYCCCAKKAIoIQwgCigCHCENIAooAhghDiAKKAIUIQ8gCigCECEQIAwgDSAOIA8gEBAnIREgCiARNgIEIAooAgQhEiASEBYhEwJAAkAgE0UNACAKKAIEIRQgCiAUNgIsDAELIAooAgQhFSAKKAIYIRYgFSEXIBYhGCAXIBhPIRlBASEaIBkgGnEhGwJAIBtFDQBBuH8hHCAKIBw2AiwMAQsgCigCBCEdIAooAgghHiAeIB1qIR8gCiAfNgIIIAooAgQhICAKKAIYISEgISAgayEiIAogIjYCGCAKKAIkISMgCigCICEkIAooAgghJSAKKAIYISYgCigCKCEnIAooAgwhKCAjICQgJSAmICcgKBAtISkgCiApNgIsCyAKKAIsISpBMCErIAogK2ohLCAsJAAgKg8LpgQBTH8jACECQSAhAyACIANrIQQgBCQAQQAhBSAEIAA2AhwgBCABNgIYIAQoAhwhBiAGIQcgBSEIIAcgCEshCUEBIQogCSAKcSELAkAgCw0AEAALQYCACCEMIAQoAhwhDSANIQ4gDCEPIA4gD00hEEEBIREgECARcSESAkAgEg0AEAALIAQoAhghEyAEKAIcIRQgEyEVIBQhFiAVIBZPIRdBASEYIBcgGHEhGQJAAkAgGUUNAEEPIRogGiEbDAELIAQoAhghHEEEIR0gHCAddCEeIAQoAhwhHyAeIB9uISAgICEbCyAbISFBgAghIiAEICE2AhQgBCgCHCEjQQghJCAjICR2ISUgBCAlNgIQIAQoAhQhJkEYIScgJiAnbCEoICIgKGohKSApKAIAISogBCgCFCErQRghLCArICxsIS0gIiAtaiEuIC4oAgQhLyAEKAIQITAgLyAwbCExICogMWohMiAEIDI2AgwgBCgCFCEzQRghNCAzIDRsITUgIiA1aiE2IDYoAgghNyAEKAIUIThBGCE5IDggOWwhOiAiIDpqITsgOygCDCE8IAQoAhAhPSA8ID1sIT4gNyA+aiE/IAQgPzYCCCAEKAIIIUBBAyFBIEAgQXYhQiAEKAIIIUMgQyBCaiFEIAQgRDYCCCAEKAIIIUUgBCgCDCFGIEUhRyBGIUggRyBISSFJQQEhSiBJIEpxIUtBICFMIAQgTGohTSBNJAAgSw8LhAIBGn8jACEGQSAhByAGIAdrIQggCCQAIAghCSAIIAA2AhwgCCABNgIYIAggAjYCFCAIIAM2AhAgCCAENgIMIAggBTYCCCAIKAIMIQogCSAKEBcgCC0AASELQf8BIQwgCyAMcSENAkACQCANRQ0AIAgoAhwhDiAIKAIYIQ8gCCgCFCEQIAgoAhAhESAIKAIMIRIgCCgCCCETIA4gDyAQIBEgEiATECwhFCAUIRUMAQsgCCgCHCEWIAgoAhghFyAIKAIUIRggCCgCECEZIAgoAgwhGiAIKAIIIRsgFiAXIBggGSAaIBsQHCEcIBwhFQsgFSEdQSAhHiAIIB5qIR8gHyQAIB0PC5YDASZ/IwAhCEEwIQkgCCAJayEKIAokACAKIAA2AiggCiABNgIkIAogAjYCICAKIAM2AhwgCiAENgIYIAogBTYCFCAKIAY2AhAgCiAHNgIMIAooAhwhCyAKIAs2AgggCigCKCEMIAooAhwhDSAKKAIYIQ4gCigCFCEPIAooAhAhECAKKAIMIREgDCANIA4gDyAQIBEQFCESIAogEjYCBCAKKAIEIRMgExAWIRQCQAJAIBRFDQAgCigCBCEVIAogFTYCLAwBCyAKKAIEIRYgCigCGCEXIBYhGCAXIRkgGCAZTyEaQQEhGyAaIBtxIRwCQCAcRQ0AQbh/IR0gCiAdNgIsDAELIAooAgQhHiAKKAIIIR8gHyAeaiEgIAogIDYCCCAKKAIEISEgCigCGCEiICIgIWshIyAKICM2AhggCigCJCEkIAooAiAhJSAKKAIIISYgCigCGCEnIAooAighKCAKKAIMISkgJCAlICYgJyAoICkQHCEqIAogKjYCLAsgCigCLCErQTAhLCAKICxqIS0gLSQAICsPC4QCARp/IwAhBkEgIQcgBiAHayEIIAgkACAIIQkgCCAANgIcIAggATYCGCAIIAI2AhQgCCADNgIQIAggBDYCDCAIIAU2AgggCCgCDCEKIAkgChAXIAgtAAEhC0H/ASEMIAsgDHEhDQJAAkAgDUUNACAIKAIcIQ4gCCgCGCEPIAgoAhQhECAIKAIQIREgCCgCDCESIAgoAgghEyAOIA8gECARIBIgExAtIRQgFCEVDAELIAgoAhwhFiAIKAIYIRcgCCgCFCEYIAgoAhAhGSAIKAIMIRogCCgCCCEbIBYgFyAYIBkgGiAbECMhHCAcIRULIBUhHUEgIR4gCCAeaiEfIB8kACAdDwv+AgEifyMAIQhBMCEJIAggCWshCiAKJAAgCiAANgIoIAogATYCJCAKIAI2AiAgCiADNgIcIAogBDYCGCAKIAU2AhQgCiAGNgIQIAogBzYCDCAKKAIgIQsCQAJAIAsNAEG6fyEMIAogDDYCLAwBCyAKKAIYIQ0CQCANDQBBbCEOIAogDjYCLAwBCyAKKAIgIQ8gCigCGCEQIA8gEBAvIREgCiARNgIIIAooAgghEgJAAkAgEkUNACAKKAIoIRMgCigCJCEUIAooAiAhFSAKKAIcIRYgCigCGCEXIAooAhQhGCAKKAIQIRkgCigCDCEaIBMgFCAVIBYgFyAYIBkgGhAuIRsgGyEcDAELIAooAighHSAKKAIkIR4gCigCICEfIAooAhwhICAKKAIYISEgCigCFCEiIAooAhAhIyAKKAIMISQgHSAeIB8gICAhICIgIyAkECYhJSAlIRwLIBwhJiAKICY2AiwLIAooAiwhJ0EwISggCiAoaiEpICkkACAnDwtsAQ5/IwAhAUEQIQIgASACayEDIAMkAEEAIQQgAyAANgIMIAMoAgwhBSAFIQYgBCEHIAYgB0chCEEBIQkgCCAJcSEKAkAgCg0AEAALIAMoAgwhCyALKAIEIQxBECENIAMgDWohDiAOJAAgDA8LbAEOfyMAIQFBECECIAEgAmshAyADJABBACEEIAMgADYCDCADKAIMIQUgBSEGIAQhByAGIAdHIQhBASEJIAggCXEhCgJAIAoNABAACyADKAIMIQsgCygCCCEMQRAhDSADIA1qIQ4gDiQAIAwPC6oFAUx/IwAhAkEQIQMgAiADayEEIAQkAEEAIQUgBCAANgIMIAQgATYCCCAEKAIMIQYgBiEHIAUhCCAHIAhHIQlBASEKIAkgCnEhCwJAIAsNABAAC0EAIQwgBCgCCCENIA0hDiAMIQ8gDiAPRyEQQQEhESAQIBFxIRICQCASDQAQAAsgBCgCCCETIBMoAqjVASEUIAQoAgwhFSAVIBQ2ApjnASAEKAIIIRYgFigCBCEXIAQoAgwhGCAYIBc2ArDlASAEKAIIIRkgGSgCBCEaIAQoAgwhGyAbIBo2ArTlASAEKAIIIRwgHCgCBCEdIAQoAgghHiAeKAIIIR8gHSAfaiEgIAQoAgwhISAhICA2ArjlASAEKAIMISIgIigCuOUBISMgBCgCDCEkICQgIzYCrOUBIAQoAgghJSAlKAKs1QEhJgJAAkAgJkUNAEEBIScgBCgCDCEoICggJzYCgOYBIAQoAgwhKSApICc2AoTmASAEKAIIISpBDCErICogK2ohLCAEKAIMIS0gLSAsNgIAIAQoAgghLkEMIS8gLiAvaiEwQZAwITEgMCAxaiEyIAQoAgwhMyAzIDI2AgQgBCgCCCE0QQwhNSA0IDVqITZBiCAhNyA2IDdqITggBCgCDCE5IDkgODYCCCAEKAIIITpBDCE7IDogO2ohPEGY0AAhPSA8ID1qIT4gBCgCDCE/ID8gPjYCDCAEKAIIIUAgQCgCqNABIUEgBCgCDCFCIEIgQTYCrNABIAQoAgghQyBDKAKs0AEhRCAEKAIMIUUgRSBENgKw0AEgBCgCCCFGIEYoArDQASFHIAQoAgwhSCBIIEc2ArTQAQwBC0EAIUkgBCgCDCFKIEogSTYCgOYBIAQoAgwhSyBLIEk2AoTmAQtBECFMIAQgTGohTSBNJAAPC6QBARN/IwAhAkEQIQMgAiADayEEIAQkAEEAIQUgBCAANgIIIAEoAgAhBiAGIQcgBSEIIAcgCEchCUEBIQogCSAKcSELAkACQCALRQ0AIAEoAgAhDCABKAIIIQ0gBCgCCCEOIA0gDiAMEQEAIQ8gBCAPNgIMDAELIAQoAgghECAQEBEhESAEIBE2AgwLIAQoAgwhEkEQIRMgBCATaiEUIBQkACASDwuTAwIwfwN+IwAhAUHAACECIAEgAmshAyADJABBACEEIAMgADYCOCADKAI4IQUgBSEGIAQhByAGIAdGIQhBASEJIAggCXEhCgJAAkAgCkUNAEEAIQsgAyALNgI8DAELQSghDCADIAxqIQ0gDSEOIAMoAjghD0Gw1QEhECAPIBBqIREgESkCACExIA4gMTcCAEEIIRIgDiASaiETIBEgEmohFCAUKAIAIRUgEyAVNgIAIAMoAjghFiAWKAIAIRdBCCEYQQghGSADIBlqIRogGiAYaiEbQSghHCADIBxqIR0gHSAYaiEeIB4oAgAhHyAbIB82AgAgAykDKCEyIAMgMjcDCEEIISAgAyAgaiEhIBcgIRA5IAMoAjghIkEIISNBGCEkIAMgJGohJSAlICNqISZBKCEnIAMgJ2ohKCAoICNqISkgKSgCACEqICYgKjYCACADKQMoITMgAyAzNwMYQRghKyADICtqISwgIiAsEDlBACEtIAMgLTYCPAsgAygCPCEuQcAAIS8gAyAvaiEwIDAkACAuDwu2AQEXfyMAIQJBECEDIAIgA2shBCAEJABBACEFIAQgADYCDCAEKAIMIQYgBiEHIAUhCCAHIAhHIQlBASEKIAkgCnEhCwJAIAtFDQBBACEMIAEoAgQhDSANIQ4gDCEPIA4gD0chEEEBIREgECARcSESAkACQCASRQ0AIAEoAgQhEyABKAIIIRQgBCgCDCEVIBQgFSATEQIADAELIAQoAgwhFiAWEBMLC0EQIRcgBCAXaiEYIBgkAA8LnwEBE38jACEBQRAhAiABIAJrIQMgAyQAQQAhBCADIAA2AgggAygCCCEFIAUhBiAEIQcgBiAHRiEIQQEhCSAIIAlxIQoCQAJAIApFDQBBACELIAMgCzYCDAwBCyADKAIIIQwgDCgCBCENIAMoAgghDiAOKAIIIQ8gDSAPEDshECADIBA2AgwLIAMoAgwhEUEQIRIgAyASaiETIBMkACARDwveAQEbfyMAIQJBECEDIAIgA2shBCAEJABBCCEFIAQgADYCCCAEIAE2AgQgBCgCBCEGIAYhByAFIQggByAISSEJQQEhCiAJIApxIQsCQAJAIAtFDQBBACEMIAQgDDYCDAwBC0G3yMLhfiENIAQoAgghDiAOEDwhDyAPIRAgDSERIBAgEUchEkEBIRMgEiATcSEUAkAgFEUNAEEAIRUgBCAVNgIMDAELIAQoAgghFkEEIRcgFiAXaiEYIBgQPCEZIAQgGTYCDAsgBCgCDCEaQRAhGyAEIBtqIRwgHCQAIBoPC3YBDH8jACEBQRAhAiABIAJrIQMgAyQAIAMgADYCCBAbIQQCQAJAIARFDQAgAygCCCEFIAUQRiEGIAMgBjYCDAwBCyADKAIIIQcgBxBGIQggCBBHIQkgAyAJNgIMCyADKAIMIQpBECELIAMgC2ohDCAMJAAgCg8LqwMCJX8CfiMAIQFBMCECIAEgAmshAyADJABBGCEEIAMgBGohBSAFIQZBACEHIAMgADYCLCADKAIsIQggCCAHNgKI5wEgAygCLCEJIAkgBzYClOcBIAMoAiwhCiAKIAc2ApDnASADKAIsIQsgCyAHNgK45QEgAygCLCEMIAwgBzYCnOcBIAMoAiwhDSANIAc2AqDnASADKAIsIQ4gDiAHNgKw5wEgAygCLCEPIA8gBzYCtOcBIAMoAiwhECAQIAc2AsTnASADKAIsIREgESAHNgKs5wEgAygCLCESIBIgBzYC1OcBIAMoAiwhEyATIAc2AtjnASADKAIsIRQgFCAHNgLk5wEgAygCLCEVIBUgBzYCrOgJIAYQPkEIIRZBCCEXIAMgF2ohGCAYIBZqIRlBGCEaIAMgGmohGyAbIBZqIRwgHCkDACEmIBkgJjcDACADKQMYIScgAyAnNwMIQQghHSADIB1qIR4gHhA/IR9BACEgIAMoAiwhISAhIB82AoznASADKAIsISIgIiAgNgKk5wEgAygCLCEjICMQQEEwISQgAyAkaiElICUkAA8LbAEIfyMAIQFBECECIAEgAmshA0EAIQQgAyAENgIMIAMgBDYCCCADIAQ2AgQgAyAENgIAIAMoAgwhBSAAIAU2AgAgAygCCCEGIAAgBjYCBCADKAIEIQcgACAHNgIIIAMoAgAhCCAAIAg2AgwPCzgBCX9BACEBIAAoAgghAkGAAiEDIAIgA3EhBCAEIQUgASEGIAUgBkchB0EBIQggByAIcSEJIAkPC6QBAQ5/IwAhAUEQIQIgASACayEDIAMkACADIAA2AgwgAygCDCEEIAQoAqznASEFAkAgBUUNABAAC0EAIQZBgYCAwAAhByADKAIMIQggCCAGNgLk5gEgAygCDCEJIAkgBzYCvOcBIAMoAgwhCiAKIAY2AujnASADKAIMIQsgCyAGNgLo5gEgAygCDCEMIAwgBjYCqOcBQRAhDSADIA1qIQ4gDiQADwufAwI0fwJ+IwAhAUEgIQIgASACayEDIAMkAEEAIQQgACgCACEFIAUhBiAEIQcgBiAHRyEIQX8hCSAIIAlzIQpBASELIAogC3EhDCAAKAIEIQ0gDSEOIAQhDyAOIA9HIRBBfyERIBAgEXMhEkEBIRMgEiATcSEUIAwgFHMhFQJAAkAgFUUNAEEAIRYgAyAWNgIcDAELQQghFyAAIBdqIRggGCgCACEZQQghGiADIBpqIRsgGyAXaiEcIBwgGTYCACAAKQIAITUgAyA1NwMIQbDoCSEdQQghHiADIB5qIR8gHSAfEDchIEEAISFBsOgJGiADICA2AhggAygCGCEiICIhIyAhISQgIyAkRyElQQEhJiAlICZxIScCQCAnDQBBACEoIAMgKDYCHAwBCyADKAIYISlB9OYBISogKSAqaiErIAApAgAhNiArIDY3AgBBCCEsICsgLGohLSAAICxqIS4gLigCACEvIC0gLzYCACADKAIYITAgMBA9IAMoAhghMSADIDE2AhwLIAMoAhwhMkEgITMgAyAzaiE0IDQkACAyDwtSAgl/AX4jACEAQRAhASAAIAFrIQIgAiQAQQghAyACIANqIQRBACEFIAQgBTYCAEIAIQkgAiAJNwMAIAIQQSEGQRAhByACIAdqIQggCCQAIAYPC4QFAkt/BH4jACEBQdAAIQIgASACayEDIAMkAEEAIQQgAyAANgJIIAMoAkghBSAFIQYgBCEHIAYgB0YhCEEBIQkgCCAJcSEKAkACQCAKRQ0AQQAhCyADIAs2AkwMAQsgAygCSCEMIAwoAojnASENAkAgDUUNAEFAIQ4gAyAONgJMDAELQTghDyADIA9qIRAgECERIAMoAkghEkH05gEhEyASIBNqIRQgFCkCACFMIBEgTDcCAEEIIRUgESAVaiEWIBQgFWohFyAXKAIAIRggFiAYNgIAIAMoAkghGSAZEEQgAygCSCEaIBooArDnASEbQQghHEEoIR0gAyAdaiEeIB4gHGohH0E4ISAgAyAgaiEhICEgHGohIiAiKAIAISMgHyAjNgIAIAMpAzghTSADIE03AyhBKCEkIAMgJGohJSAbICUQOUEAISYgAygCSCEnICcgJjYCsOcBIAMoAkghKCAoKAKk5wEhKSApISogJiErICogK0chLEEBIS0gLCAtcSEuAkAgLkUNACADKAJIIS8gLygCpOcBITBBCCExQRghMiADIDJqITMgMyAxaiE0QTghNSADIDVqITYgNiAxaiE3IDcoAgAhOCA0IDg2AgAgAykDOCFOIAMgTjcDGEEYITkgAyA5aiE6IDAgOhBFQQAhOyADKAJIITwgPCA7NgKk5wELIAMoAkghPUEIIT5BCCE/IAMgP2ohQCBAID5qIUFBOCFCIAMgQmohQyBDID5qIUQgRCgCACFFIEEgRTYCACADKQM4IU8gAyBPNwMIQQghRiADIEZqIUcgPSBHEDlBACFIIAMgSDYCTAsgAygCTCFJQdAAIUogAyBKaiFLIEskACBJDwt3AQt/IwAhAUEQIQIgASACayEDIAMkAEEAIQQgAyAANgIMIAMoAgwhBSAFKAKQ5wEhBiAGEDgaIAMoAgwhByAHIAQ2ApDnASADKAIMIQggCCAENgKU5wEgAygCDCEJIAkgBDYCoOcBQRAhCiADIApqIQsgCyQADwvOAgIqfwJ+IwAhAkEgIQMgAiADayEEIAQkAEEAIQUgBCAANgIcIAQoAhwhBiAGIQcgBSEIIAcgCEchCUEBIQogCSAKcSELAkAgC0UNAEEAIQwgBCgCHCENIA0oAgAhDiAOIQ8gDCEQIA8gEEchEUEBIRIgESAScSETIBNFDQAgBCgCHCEUIBQoAgAhFUEIIRYgASAWaiEXIBcoAgAhGEEQIRkgBCAZaiEaIBogFmohGyAbIBg2AgAgASkCACEsIAQgLDcDEEEQIRwgBCAcaiEdIBUgHRA5C0EAIR4gBCgCHCEfIB8hICAeISEgICAhRyEiQQEhIyAiICNxISQCQCAkRQ0AIAQoAhwhJUEIISYgASAmaiEnICcoAgAhKCAEICZqISkgKSAoNgIAIAEpAgAhLSAEIC03AwAgJSAEEDkLQSAhKiAEICpqISsgKyQADwsrAQV/IwAhAUEQIQIgASACayEDIAMgADYCDCADKAIMIQQgBCgAACEFIAUPC3gBEX8jACEBQRAhAiABIAJrIQMgAyAANgIMIAMoAgwhBEEYIQUgBCAFdiEGQQghByAEIAd2IQhBgP4DIQkgCCAJcSEKIAogBnIhCyAEIAV0IQwgBCAHdCENQYCA/AchDiANIA5xIQ8gDCAPciEQIBAgC3IhESARDwu1BAFOfyMAIQNBMCEEIAMgBGshBSAFJAAgBSAANgIoIAUgATYCJCAFIAI2AiAgBSgCICEGIAYQSSEHIAUgBzYCHCAFKAIkIQggBSgCHCEJIAghCiAJIQsgCiALSSEMQQEhDSAMIA1xIQ4CQAJAIA5FDQBBuH8hDyAFIA82AiwMAQtBACEQQbAdIRFBoB0hEkEAIRMgBSgCKCEUIAUoAhwhFUEBIRYgFSAWayEXIBQgF2ohGCAYLQAAIRkgBSAZOgAbIAUtABshGkH/ASEbIBogG3EhHEEDIR0gHCAdcSEeIAUgHjYCFCAFLQAbIR9B/wEhICAfICBxISFBBSEiICEgInUhI0EBISQgIyAkcSElIAUgJTYCECAFLQAbISZB/wEhJyAmICdxIShBBiEpICggKXUhKiAFICo2AgwgBSgCHCErIAUoAhAhLCAsIS0gEyEuIC0gLkchL0F/ITAgLyAwcyExQQEhMiAxIDJxITMgKyAzaiE0IAUoAhQhNUECITYgNSA2dCE3IBIgN2ohOCA4KAIAITkgNCA5aiE6IAUoAgwhO0ECITwgOyA8dCE9IBEgPWohPiA+KAIAIT8gOiA/aiFAIAUoAhAhQSAQIUICQCBBRQ0AQQAhQyAFKAIMIUQgRCFFIEMhRiBFIEZHIUdBfyFIIEcgSHMhSSBJIUILIEIhSkEBIUsgSiBLcSFMIEAgTGohTSAFIE02AiwLIAUoAiwhTkEwIU8gBSBPaiFQIFAkACBODwuQAQESfyMAIQFBECECIAEgAmshAyADJABBBSEEQQEhBSADIAA2AgwgAygCDCEGIAUgBCAGGyEHIAMgBzYCCCADKAIMIQgCQCAIRQ0AQQEhCSADKAIMIQogCiELIAkhDCALIAxGIQ1BASEOIA0gDnEhDyAPDQAQAAsgAygCCCEQQRAhESADIBFqIRIgEiQAIBAPC9ETAuwBfx5+IwAhBEHgACEFIAQgBWshBiAGJAAgBiAANgJYIAYgATYCVCAGIAI2AlAgBiADNgJMIAYoAlQhByAGIAc2AkggBigCTCEIIAgQSSEJIAYgCTYCRCAGKAJYIQpCACHwASAKIPABNwMAQSAhCyAKIAtqIQwgDCDwATcDAEEYIQ0gCiANaiEOIA4g8AE3AwBBECEPIAogD2ohECAQIPABNwMAQQghESAKIBFqIRIgEiDwATcDACAGKAJQIRMgBigCRCEUIBMhFSAUIRYgFSAWSSEXQQEhGCAXIBhxIRkCQAJAIBlFDQAgBigCRCEaIAYgGjYCXAwBC0EAIRsgBigCVCEcIBwhHSAbIR4gHSAeRiEfQQEhICAfICBxISECQCAhRQ0AQX8hIiAGICI2AlwMAQtBASEjIAYoAkwhJCAkISUgIyEmICUgJkchJ0EBISggJyAocSEpAkAgKUUNAEGo6r5pISogBigCVCErICsQPCEsICwhLSAqIS4gLSAuRyEvQQEhMCAvIDBxITEgMUUNAEHQ1LTCASEyIAYoAlQhMyAzEDwhNEFwITUgNCA1cSE2IDYhNyAyITggNyA4RiE5QQEhOiA5IDpxITsCQCA7RQ0AQQghPCAGKAJQIT0gPSE+IDwhPyA+ID9JIUBBASFBIEAgQXEhQgJAIEJFDQBBCCFDIAYgQzYCXAwDC0EAIURBASFFIAYoAlghRkIAIfEBIEYg8QE3AwBBICFHIEYgR2ohSCBIIPEBNwMAQRghSSBGIElqIUogSiDxATcDAEEQIUsgRiBLaiFMIEwg8QE3AwBBCCFNIEYgTWohTiBOIPEBNwMAIAYoAlQhT0EEIVAgTyBQaiFRIFEQPCFSIFIhUyBTrSHyASAGKAJYIVQgVCDyATcDACAGKAJYIVUgVSBFNgIUIAYgRDYCXAwCC0F2IVYgBiBWNgJcDAELIAYoAlQhVyAGKAJQIVggBigCTCFZIFcgWCBZEEghWiAGIFo2AkAgBigCUCFbIAYoAkAhXCBbIV0gXCFeIF0gXkkhX0EBIWAgXyBgcSFhAkAgYUUNACAGKAJAIWIgBiBiNgJcDAELQn8h8wFBACFjQgAh9AEgBigCQCFkIAYoAlghZSBlIGQ2AhggBigCSCFmIAYoAkQhZ0EBIWggZyBoayFpIGYgaWohaiBqLQAAIWsgBiBrOgA/IAYoAkQhbCAGIGw2AjggBi0APyFtQf8BIW4gbSBucSFvQQMhcCBvIHBxIXEgBiBxNgI0IAYtAD8hckH/ASFzIHIgc3EhdEECIXUgdCB1dSF2QQEhdyB2IHdxIXggBiB4NgIwIAYtAD8heUH/ASF6IHkgenEhe0EFIXwgeyB8dSF9QQEhfiB9IH5xIX8gBiB/NgIsIAYtAD8hgAFB/wEhgQEggAEggQFxIYIBQQYhgwEgggEggwF1IYQBIAYghAE2AiggBiD0ATcDICAGIGM2AhwgBiDzATcDECAGLQA/IYUBQf8BIYYBIIUBIIYBcSGHAUEIIYgBIIcBIIgBcSGJAQJAIIkBRQ0AQXIhigEgBiCKATYCXAwBCyAGKAIsIYsBAkAgiwENAEEeIYwBIAYoAkghjQEgBigCOCGOAUEBIY8BII4BII8BaiGQASAGIJABNgI4II0BII4BaiGRASCRAS0AACGSASAGIJIBOgAPIAYtAA8hkwFB/wEhlAEgkwEglAFxIZUBQQMhlgEglQEglgF1IZcBQQohmAEglwEgmAFqIZkBIAYgmQE2AgggBigCCCGaASCaASGbASCMASGcASCbASCcAUshnQFBASGeASCdASCeAXEhnwECQCCfAUUNAEFwIaABIAYgoAE2AlwMAgtCASH1ASAGKAIIIaEBIKEBIaIBIKIBrSH2ASD1ASD2AYYh9wEgBiD3ATcDICAGKQMgIfgBQgMh+QEg+AEg+QGIIfoBIAYtAA8howFB/wEhpAEgowEgpAFxIaUBQQchpgEgpQEgpgFxIacBIKcBIagBIKgBrCH7ASD6ASD7AX4h/AEgBikDICH9ASD9ASD8AXwh/gEgBiD+ATcDIAsgBigCNCGpAUEDIaoBIKkBIKoBSxoCQAJAAkACQAJAAkAgqQEOBAECAwQACxAACwwDCyAGKAJIIasBIAYoAjghrAEgqwEgrAFqIa0BIK0BLQAAIa4BQf8BIa8BIK4BIK8BcSGwASAGILABNgIcIAYoAjghsQFBASGyASCxASCyAWohswEgBiCzATYCOAwCCyAGKAJIIbQBIAYoAjghtQEgtAEgtQFqIbYBILYBECQhtwFB//8DIbgBILcBILgBcSG5ASAGILkBNgIcIAYoAjghugFBAiG7ASC6ASC7AWohvAEgBiC8ATYCOAwBCyAGKAJIIb0BIAYoAjghvgEgvQEgvgFqIb8BIL8BEDwhwAEgBiDAATYCHCAGKAI4IcEBQQQhwgEgwQEgwgFqIcMBIAYgwwE2AjgLIAYoAighxAFBAyHFASDEASDFAUsaAkACQAJAAkACQAJAIMQBDgQBAgMEAAsQAAsgBigCLCHGAQJAIMYBRQ0AIAYoAkghxwEgBigCOCHIASDHASDIAWohyQEgyQEtAAAhygFB/wEhywEgygEgywFxIcwBIMwBrSH/ASAGIP8BNwMQCwwDCyAGKAJIIc0BIAYoAjghzgEgzQEgzgFqIc8BIM8BECQh0AFB//8DIdEBINABINEBcSHSAUGAAiHTASDSASDTAWoh1AEg1AEh1QEg1QGsIYACIAYggAI3AxAMAgsgBigCSCHWASAGKAI4IdcBINYBINcBaiHYASDYARA8IdkBINkBIdoBINoBrSGBAiAGIIECNwMQDAELIAYoAkgh2wEgBigCOCHcASDbASDcAWoh3QEg3QEQSyGCAiAGIIICNwMQCyAGKAIsId4BAkAg3gFFDQAgBikDECGDAiAGIIMCNwMgC0KAgAghhAJBACHfASAGKAJYIeABIOABIN8BNgIUIAYpAxAhhQIgBigCWCHhASDhASCFAjcDACAGKQMgIYYCIAYoAlgh4gEg4gEghgI3AwggBikDICGHAiCHAiGIAiCEAiGJAiCIAiCJAlQh4wFBASHkASDjASDkAXEh5QECQAJAIOUBRQ0AIAYpAyAhigIgigIhiwIMAQtCgIAIIYwCIIwCIYsCCyCLAiGNAkEAIeYBII0CpyHnASAGKAJYIegBIOgBIOcBNgIQIAYoAhwh6QEgBigCWCHqASDqASDpATYCHCAGKAIwIesBIAYoAlgh7AEg7AEg6wE2AiAgBiDmATYCXAsgBigCXCHtAUHgACHuASAGIO4BaiHvASDvASQAIO0BDwt4Agh/BH4jACEBQRAhAiABIAJrIQMgAyQAIAMgADYCBBAbIQQCQAJAIARFDQAgAygCBCEFIAUQTSEJIAMgCTcDCAwBCyADKAIEIQYgBhBNIQogChBOIQsgAyALNwMICyADKQMIIQxBECEHIAMgB2ohCCAIJAAgDA8LOAEHfyMAIQFBECECIAEgAmshAyADIAA2AgwgAygCDCEEIAQvAAAhBUH//wMhBiAFIAZxIQcgBw8LLQIEfwF+IwAhAUEQIQIgASACayEDIAMgADYCDCADKAIMIQQgBCkAACEFIAUPC/0BAgN/IH4jACEBQRAhAiABIAJrIQMgAyAANwMIIAMpAwghBEI4IQUgBCAFiCEGQighByAEIAeIIQhCgP4DIQkgCCAJgyEKIAogBoQhC0IYIQwgBCAMiCENQoCA/AchDiANIA6DIQ9CCCEQIAQgEIghEUKAgID4DyESIBEgEoMhEyATIA+EIRQgFCALhCEVIAQgEIYhFkKAgICA8B8hFyAWIBeDIRggBCAMhiEZQoCAgICA4D8hGiAZIBqDIRsgGyAYhCEcIAQgBYYhHSAEIAeGIR5CgICAgICAwP8AIR8gHiAfgyEgIB0gIIQhISAhIByEISIgIiAVhCEjICMPC88CASh/IwAhAkEgIQMgAiADayEEIAQkAEEIIQUgBCAANgIYIAQgATYCFCAEIAU2AhAgBCgCFCEGIAYhByAFIQggByAISSEJQQEhCiAJIApxIQsCQAJAIAtFDQBBuH8hDCAEIAw2AhwMAQsgBCgCGCENQQQhDiANIA5qIQ8gDxA8IRAgBCAQNgIMIAQoAgwhEUEIIRIgESASaiETIAQoAgwhFCATIRUgFCEWIBUgFkkhF0EBIRggFyAYcSEZAkAgGUUNAEFyIRogBCAaNgIcDAELIAQoAgwhG0EIIRwgGyAcaiEdIAQgHTYCCCAEKAIIIR4gBCgCFCEfIB4hICAfISEgICAhSyEiQQEhIyAiICNxISQCQCAkRQ0AQbh/ISUgBCAlNgIcDAELIAQoAgghJiAEICY2AhwLIAQoAhwhJ0EgISggBCAoaiEpICkkACAnDwugAwEyfyMAIQNBICEEIAMgBGshBSAFJABBAyEGIAUgADYCGCAFIAE2AhQgBSACNgIQIAUoAhQhByAHIQggBiEJIAggCUkhCkEBIQsgCiALcSEMAkACQCAMRQ0AQbh/IQ0gBSANNgIcDAELQQEhDiAFKAIYIQ8gDxBkIRAgBSAQNgIMIAUoAgwhEUEDIRIgESASdiETIAUgEzYCCCAFKAIMIRRBASEVIBQgFXEhFiAFKAIQIRcgFyAWNgIEIAUoAgwhGEEBIRkgGCAZdiEaQQMhGyAaIBtxIRwgBSgCECEdIB0gHDYCACAFKAIIIR4gBSgCECEfIB8gHjYCCCAFKAIQISAgICgCACEhICEhIiAOISMgIiAjRiEkQQEhJSAkICVxISYCQCAmRQ0AQQEhJyAFICc2AhwMAQtBAyEoIAUoAhAhKSApKAIAISogKiErICghLCArICxGIS1BASEuIC0gLnEhLwJAIC9FDQBBbCEwIAUgMDYCHAwBCyAFKAIIITEgBSAxNgIcCyAFKAIcITJBICEzIAUgM2ohNCA0JAAgMg8LqgIBI38jACEDQRAhBCADIARrIQUgBSAANgIMIAUgATYCCCAFIAI2AgQgBSgCCCEGIAUoAgwhByAHKAKs5QEhCCAGIQkgCCEKIAkgCkchC0EBIQwgCyAMcSENAkAgDUUNAEEAIQ4gBSgCBCEPIA8hECAOIREgECARSyESQQEhEyASIBNxIRQgFEUNAEEAIRUgBSgCDCEWIBYoAqzlASEXIAUoAgwhGCAYIBc2ArjlASAFKAIIIRkgBSgCDCEaIBooAqzlASEbIAUoAgwhHCAcKAKw5QEhHSAbIB1rIR4gFSAeayEfIBkgH2ohICAFKAIMISEgISAgNgK05QEgBSgCCCEiIAUoAgwhIyAjICI2ArDlASAFKAIIISQgBSgCDCElICUgJDYCrOUBCw8LoAoBkAF/IwAhCEHQACEJIAggCWshCiAKJABBACELIAogADYCSCAKIAE2AkQgCiACNgJAIAogAzYCPCAKIAQ2AjggCiAFNgI0IAogBjYCMCAKIAc2AiwgCigCRCEMIAogDDYCKCAKIAs2AiQgCigCNCENIA0hDiALIQ8gDiAPRiEQQQEhESAQIBFxIRICQCASDQBBACETIAooAiwhFCAUIRUgEyEWIBUgFkYhF0EBIRggFyAYcSEZIBkNABAAC0EAIRogCigCLCEbIBshHCAaIR0gHCAdRyEeQQEhHyAeIB9xISACQCAgRQ0AIAooAiwhISAhEDQhIiAKICI2AjQgCigCLCEjICMQNSEkIAogJDYCMAsCQAJAA0AgCigCOCElIAooAkghJiAmKALk5gEhJyAnEEkhKCAlISkgKCEqICkgKk8hK0EBISwgKyAscSEtIC1FDQFB0NS0wgEhLiAKKAI8IS8gLxA8ITAgCiAwNgIgIAooAiAhMUFwITIgMSAycSEzIDMhNCAuITUgNCA1RiE2QQEhNyA2IDdxITgCQCA4RQ0AIAooAjwhOSAKKAI4ITogOSA6EE8hOyAKIDs2AhwgCigCHCE8IAogPDYCGCAKKAIYIT0gPRAWIT4CQCA+RQ0AIAooAhghPyAKID82AkwMBAsgCigCHCFAIAooAjghQSBAIUIgQSFDIEIgQ00hREEBIUUgRCBFcSFGAkAgRg0AEAALIAooAjwhRyAKKAIcIUggRyBIaiFJIAogSTYCPCAKKAIcIUogCigCOCFLIEsgSmshTCAKIEw2AjgMAQtBACFNIAooAiwhTiBOIU8gTSFQIE8gUEchUUEBIVIgUSBScSFTAkACQCBTRQ0AIAooAkghVCAKKAIsIVUgVCBVEFMhViAKIFY2AhQgCigCFCFXIFcQFiFYAkAgWEUNACAKKAIUIVkgCiBZNgJMDAULDAELIAooAkghWiAKKAI0IVsgCigCMCFcIFogWyBcEFQhXSAKIF02AhAgCigCECFeIF4QFiFfAkAgX0UNACAKKAIQIWAgCiBgNgJMDAQLC0EKIWFBPCFiIAogYmohYyBjIWRBOCFlIAogZWohZiBmIWcgCigCSCFoIAooAkQhaSAKKAJAIWogaCBpIGoQUSAKKAJIIWsgCigCRCFsIAooAkAhbSBrIGwgbSBkIGcQVSFuIAogbjYCDCAKKAIMIW8gbxBWIXAgcCFxIGEhciBxIHJGIXNBASF0IHMgdHEhdQJAIHVFDQBBASF2IAooAiQhdyB3IXggdiF5IHggeUYhekEBIXsgeiB7cSF8IHxFDQBBuH8hfSAKIH02AkwMAwsgCigCDCF+IH4QFiF/AkAgf0UNACAKKAIMIYABIAoggAE2AkwMAwsgCigCDCGBASAKKAJAIYIBIIEBIYMBIIIBIYQBIIMBIIQBTSGFAUEBIYYBIIUBIIYBcSGHAQJAIIcBDQAQAAsgCigCDCGIAQJAIIgBRQ0AIAooAkQhiQEgCigCDCGKASCJASCKAWohiwEgCiCLATYCRAtBASGMASAKKAIMIY0BIAooAkAhjgEgjgEgjQFrIY8BIAogjwE2AkAgCiCMATYCJAwAAAsACyAKKAI4IZABAkAgkAFFDQBBuH8hkQEgCiCRATYCTAwBCyAKKAJEIZIBIAooAighkwEgkgEgkwFrIZQBIAoglAE2AkwLIAooAkwhlQFB0AAhlgEgCiCWAWohlwEglwEkACCVAQ8LpgMBM38jACECQSAhAyACIANrIQQgBCQAQQAhBSAEIAA2AhggBCABNgIUIAQoAhghBiAGIQcgBSEIIAcgCEchCUEBIQogCSAKcSELAkAgCw0AEAALQQAhDCAEKAIUIQ0gDSEOIAwhDyAOIA9HIRBBASERIBAgEXEhEgJAIBJFDQAgBCgCFCETIBMQNCEUIAQgFDYCECAEKAIUIRUgFRA1IRYgBCAWNgIMIAQoAhAhFyAEKAIMIRggFyAYaiEZIAQgGTYCCCAEKAIYIRogGigCuOUBIRsgBCgCCCEcIBshHSAcIR4gHSAeRyEfQQEhICAfICBxISEgBCgCGCEiICIgITYCnOcBCyAEKAIYISMgIxB2ISQgBCAkNgIEIAQoAgQhJSAlEBYhJgJAAkAgJkUNACAEKAIEIScgBCAnNgIcDAELQQAhKCAEKAIUISkgKSEqICghKyAqICtHISxBASEtICwgLXEhLgJAIC5FDQAgBCgCGCEvIAQoAhQhMCAvIDAQNgtBACExIAQgMTYCHAsgBCgCHCEyQSAhMyAEIDNqITQgNCQAIDIPC/8BARp/IwAhA0EgIQQgAyAEayEFIAUkACAFIAA2AhggBSABNgIUIAUgAjYCECAFKAIYIQYgBhB2IQcgBSAHNgIMIAUoAgwhCCAIEBYhCQJAAkAgCUUNACAFKAIMIQogBSAKNgIcDAELQQAhCyAFKAIUIQwgDCENIAshDiANIA5HIQ9BASEQIA8gEHEhEQJAIBFFDQAgBSgCECESIBJFDQAgBSgCGCETIAUoAhQhFCAFKAIQIRUgEyAUIBUQdyEWIBYQFiEXAkAgF0UNAEFiIRggBSAYNgIcDAILC0EAIRkgBSAZNgIcCyAFKAIcIRpBICEbIAUgG2ohHCAcJAAgGg8L/hAC0wF/C34jACEFQeAAIQYgBSAGayEHIAckACAHIAA2AlggByABNgJUIAcgAjYCUCAHIAM2AkwgByAENgJIIAcoAkwhCCAIKAIAIQkgByAJNgJEIAcoAkQhCiAHIAo2AkAgBygCVCELIAcgCzYCPCAHKAJQIQwCQAJAIAxFDQAgBygCPCENIAcoAlAhDiANIA5qIQ8gDyEQDAELIAcoAjwhESARIRALIBAhEkEGIRNBAiEUIAcgEjYCOCAHKAI8IRUgByAVNgI0IAcoAkghFiAWKAIAIRcgByAXNgIwIAcoAjAhGCAHKAJYIRkgGSgC5OYBIRogFCATIBobIRtBAyEcIBsgHGohHSAYIR4gHSEfIB4gH0khIEEBISEgICAhcSEiAkACQCAiRQ0AQbh/ISMgByAjNgJcDAELQQUhJEEBISUgBygCQCEmIAcoAlghJyAnKALk5gEhKCAlICQgKBshKSAHKAJYISogKigC5OYBISsgJiApICsQSCEsIAcgLDYCLCAHKAIsIS0gLRAWIS4CQCAuRQ0AIAcoAiwhLyAHIC82AlwMAQsgBygCMCEwIAcoAiwhMUEDITIgMSAyaiEzIDAhNCAzITUgNCA1SSE2QQEhNyA2IDdxITgCQCA4RQ0AQbh/ITkgByA5NgJcDAELIAcoAlghOiAHKAJAITsgBygCLCE8IDogOyA8EFshPSAHID02AiggBygCKCE+ID4QFiE/AkAgP0UNACAHKAIoIUAgByBANgJcDAELIAcoAiwhQSAHKAJAIUIgQiBBaiFDIAcgQzYCQCAHKAIsIUQgBygCMCFFIEUgRGshRiAHIEY2AjADQEEYIUcgByBHaiFIIEghSSAHKAJAIUogBygCMCFLIEogSyBJEFAhTCAHIEw2AhQgBygCFCFNIE0QFiFOAkAgTkUNACAHKAIUIU8gByBPNgJcDAILIAcoAkAhUEEDIVEgUCBRaiFSIAcgUjYCQCAHKAIwIVNBAyFUIFMgVGshVSAHIFU2AjAgBygCFCFWIAcoAjAhVyBWIVggVyFZIFggWUshWkEBIVsgWiBbcSFcAkAgXEUNAEG4fyFdIAcgXTYCXAwCCyAHKAIYIV5BAyFfIF4gX0saAkACQAJAAkACQAJAIF4OBAECAAMEC0EBIWAgBygCWCFhIAcoAjQhYiAHKAI4IWMgBygCNCFkIGMgZGshZSAHKAJAIWYgBygCFCFnIGEgYiBlIGYgZyBgEFwhaCAHIGg2AiQMBAsgBygCNCFpIAcoAjghaiAHKAI0IWsgaiBrayFsIAcoAkAhbSAHKAIUIW4gaSBsIG0gbhBdIW8gByBvNgIkDAMLIAcoAjQhcCAHKAI4IXEgBygCNCFyIHEgcmshcyAHKAJAIXQgdC0AACF1IAcoAiAhdkH/ASF3IHUgd3EheCBwIHMgeCB2EF4heSAHIHk2AiQMAgsLQWwheiAHIHo2AlwMAgsgBygCJCF7IHsQFiF8AkAgfEUNACAHKAIkIX0gByB9NgJcDAILIAcoAlghfiB+KALs5gEhfwJAIH9FDQAgBygCWCGAAUGI5gEhgQEggAEggQFqIYIBIAcoAjQhgwEgBygCJCGEASCCASCDASCEARBfGgsgBygCJCGFAQJAIIUBRQ0AIAcoAiQhhgEgBygCNCGHASCHASCGAWohiAEgByCIATYCNAtBACGJASAHKAJAIYoBIIoBIYsBIIkBIYwBIIsBIIwBRyGNAUEBIY4BII0BII4BcSGPAQJAII8BDQAQAAsgBygCFCGQASAHKAJAIZEBIJEBIJABaiGSASAHIJIBNgJAIAcoAhQhkwEgBygCMCGUASCUASCTAWshlQEgByCVATYCMCAHKAIcIZYBAkACQCCWAUUNAAwBCwwBCwtCfyHYASAHKAJYIZcBIJcBKQPA5QEh2QEg2QEh2gEg2AEh2wEg2gEg2wFSIZgBQQEhmQEgmAEgmQFxIZoBAkAgmgFFDQAgBygCNCGbASAHKAI8IZwBIJsBIJwBayGdASCdASGeASCeAawh3AEgBygCWCGfASCfASkDwOUBId0BINwBId4BIN0BId8BIN4BIN8BUiGgAUEBIaEBIKABIKEBcSGiAQJAIKIBRQ0AQWwhowEgByCjATYCXAwCCwsgBygCWCGkASCkASgC4OUBIaUBAkAgpQFFDQBBBCGmASAHKAIwIacBIKcBIagBIKYBIakBIKgBIKkBSSGqAUEBIasBIKoBIKsBcSGsAQJAIKwBRQ0AQWohrQEgByCtATYCXAwCCyAHKAJYIa4BIK4BKALo5gEhrwECQCCvAQ0AIAcoAlghsAFBiOYBIbEBILABILEBaiGyASCyARBhIeABIOABpyGzASAHILMBNgIQIAcoAkAhtAEgtAEQPCG1ASAHILUBNgIMIAcoAgwhtgEgBygCECG3ASC2ASG4ASC3ASG5ASC4ASC5AUchugFBASG7ASC6ASC7AXEhvAECQCC8AUUNAEFqIb0BIAcgvQE2AlwMAwsLIAcoAkAhvgFBBCG/ASC+ASC/AWohwAEgByDAATYCQCAHKAIwIcEBQQQhwgEgwQEgwgFrIcMBIAcgwwE2AjALQQAhxAEgBygCWCHFASAHKAI0IcYBIAcoAjwhxwEgxgEgxwFrIcgBIMgBIckBIMkBrCHhASAHKAJAIcoBIAcoAkQhywEgygEgywFrIcwBIMwBIc0BIM0BrCHiASDFASDhASDiASDEARBgIAcoAkAhzgEgBygCTCHPASDPASDOATYCACAHKAIwIdABIAcoAkgh0QEg0QEg0AE2AgAgBygCNCHSASAHKAI8IdMBINIBINMBayHUASAHINQBNgJcCyAHKAJcIdUBQeAAIdYBIAcg1gFqIdcBINcBJAAg1QEPCz4BB38jACEBQRAhAiABIAJrIQMgAyQAIAMgADYCDCADKAIMIQQgBBCEASEFQRAhBiADIAZqIQcgByQAIAUPC4wBAQ1/IwAhBUEgIQYgBSAGayEHIAckACAHIAA2AhwgByABNgIYIAcgAjYCFCAHIAM2AhAgByAENgIMIAcoAhwhCCAHKAIYIQkgBygCFCEKIAcoAhAhCyAHKAIMIQwgBygCHCENIA0QWCEOIAggCSAKIAsgDCAOEFkhD0EgIRAgByAQaiERIBEkACAPDwvRAQETfyMAIQFBECECIAEgAmshAyADJAAgAyAANgIIIAMoAgghBCAEKAKg5wEhBUEBIQYgBSAGaiEHQQIhCCAHIAhLGgJAAkACQAJAAkAgBw4DAgEDAAsQAAtBACEJIAMoAgghCiAKEEQgAyAJNgIMDAILIAMoAgghCyALKAKU5wEhDCADIAw2AgwMAQtBACENIAMoAgghDiAOIA02AqDnASADKAIIIQ8gDygClOcBIRAgAyAQNgIMCyADKAIMIRFBECESIAMgEmohEyATJAAgEQ8LlQEBDX8jACEGQSAhByAGIAdrIQggCCQAQQAhCSAIIAA2AhwgCCABNgIYIAggAjYCFCAIIAM2AhAgCCAENgIMIAggBTYCCCAIKAIcIQogCCgCGCELIAgoAhQhDCAIKAIQIQ0gCCgCDCEOIAgoAgghDyAKIAsgDCANIA4gCSAJIA8QUiEQQSAhESAIIBFqIRIgEiQAIBAPC+YBARd/IwAhBEEgIQUgBCAFayEGIAYkAEEAIQcgBiAANgIYIAYgATYCFCAGIAI2AhAgBiADNgIMEEIhCCAGIAg2AgQgBigCBCEJIAkhCiAHIQsgCiALRiEMQQEhDSAMIA1xIQ4CQAJAIA5FDQBBQCEPIAYgDzYCHAwBCyAGKAIEIRAgBigCGCERIAYoAhQhEiAGKAIQIRMgBigCDCEUIBAgESASIBMgFBBXIRUgBiAVNgIIIAYoAgQhFiAWEEMaIAYoAgghFyAGIBc2AhwLIAYoAhwhGEEgIRkgBiAZaiEaIBokACAYDwu7BQJSfwR+IwAhA0EgIQQgAyAEayEFIAUkACAFIAA2AhggBSABNgIUIAUgAjYCECAFKAIYIQZBwOUBIQcgBiAHaiEIIAUoAhQhCSAFKAIQIQogBSgCGCELIAsoAuTmASEMIAggCSAKIAwQSiENIAUgDTYCDCAFKAIMIQ4gDhAWIQ8CQAJAIA9FDQAgBSgCDCEQIAUgEDYCHAwBC0EAIREgBSgCDCESIBIhEyARIRQgEyAUSyEVQQEhFiAVIBZxIRcCQCAXRQ0AQbh/IRggBSAYNgIcDAELQQEhGSAFKAIYIRogGigCqOcBIRsgGyEcIBkhHSAcIB1GIR5BASEfIB4gH3EhIAJAICBFDQBBACEhIAUoAhghIiAiKAKk5wEhIyAjISQgISElICQgJUchJkEBIScgJiAncSEoIChFDQAgBSgCGCEpICkQYgsgBSgCGCEqICooAtzlASErAkAgK0UNACAFKAIYISwgLCgCmOcBIS0gBSgCGCEuIC4oAtzlASEvIC0hMCAvITEgMCAxRyEyQQEhMyAyIDNxITQgNEUNAEFgITUgBSA1NgIcDAELQQAhNiAFKAIYITcgNygC4OUBITggNiE5AkAgOEUNAEEAITogBSgCGCE7IDsoAujmASE8IDwhPSA6IT4gPSA+RyE/QX8hQCA/IEBzIUEgQSE5CyA5IUJBASFDQQAhREEBIUUgQiBFcSFGIEMgRCBGGyFHIAUoAhghSCBIIEc2AuzmASAFKAIYIUkgSSgC7OYBIUoCQCBKRQ0AQgAhVSAFKAIYIUtBiOYBIUwgSyBMaiFNIE0gVRBjGgtBACFOIAUoAhAhTyBPIVAgUK0hViAFKAIYIVEgUSkD6OUBIVcgVyBWfCFYIFEgWDcD6OUBIAUgTjYCHAsgBSgCHCFSQSAhUyAFIFNqIVQgVCQAIFIPC54JAn5/Cn4jACEGQcAAIQcgBiAHayEIIAgkAEEAIQkgCCAANgI4IAggATYCNCAIIAI2AjAgCCADNgIsIAggBDYCKCAIIAU2AiQgCCgCLCEKIAggCjYCIBAhIQsgCSEMAkAgC0UNAEEBIQ0gCCgCJCEOIA0hDwJAIA5FDQBCASGEAUEZIRBBOSERIAgoAjghEiASKQPI5QEhhQEQISETIBAgESATGyEUIBQhFSAVrSGGASCEASCGAYYhhwEghQEhiAEghwEhiQEgiAEgiQFWIRYgFiEPCyAPIRcgFyEMCyAMIRhBgIAIIRlBASEaIBggGnEhGyAIIBs2AhwgCCgCKCEcIBwhHSAZIR4gHSAeTyEfQQEhICAfICBxISECQAJAICFFDQBBuH8hIiAIICI2AjwMAQsgCCgCOCEjIAgoAiwhJCAIKAIoISUgIyAkICUQZSEmIAggJjYCGCAIKAIYIScgJxAWISgCQCAoRQ0AIAgoAhghKSAIICk2AjwMAQtBECEqIAggKmohKyArISwgCCgCGCEtIAgoAiAhLiAuIC1qIS8gCCAvNgIgIAgoAhghMCAIKAIoITEgMSAwayEyIAggMjYCKCAIKAI4ITMgMygCnOcBITQgCCA0NgIUIAgoAjghNSAIKAIgITYgCCgCKCE3IDUgLCA2IDcQZiE4IAggODYCDCAIKAIMITkgORAWIToCQCA6RQ0AIAgoAgwhOyAIIDs2AjwMAQtBACE8IAgoAgwhPSAIKAIgIT4gPiA9aiE/IAggPzYCICAIKAIMIUAgCCgCKCFBIEEgQGshQiAIIEI2AiggCCgCNCFDIEMhRCA8IUUgRCBFRiFGQQEhRyBGIEdxIUgCQCBIRQ0AQQAhSSAIKAIQIUogSiFLIEkhTCBLIExKIU1BASFOIE0gTnEhTyBPRQ0AQbp/IVAgCCBQNgI8DAELIAgoAhQhUQJAIFENACAIKAIkIVICQCBSRQ0AQoCAgAghigEgCCgCOCFTIFMpA8jlASGLASCLASGMASCKASGNASCMASCNAVYhVEEBIVUgVCBVcSFWIFZFDQELQQQhVyAIKAIQIVggWCFZIFchWiBZIFpKIVtBASFcIFsgXHEhXSBdRQ0AQQchXkEUIV8gCCgCOCFgIGAoAgghYSBhEGchYiAIIGI2AggQHyFjIF4gXyBjGyFkIAggZDYCBCAIKAIIIWUgCCgCBCFmIGUhZyBmIWggZyBoTyFpQQEhaiBpIGpxIWsgCCBrNgIUC0EAIWwgCCgCOCFtIG0gbDYCnOcBIAgoAhQhbgJAIG5FDQAgCCgCOCFvIAgoAjQhcCAIKAIwIXEgCCgCICFyIAgoAighcyAIKAIQIXQgCCgCHCF1IAgoAiQhdiBvIHAgcSByIHMgdCB1IHYQaCF3IAggdzYCPAwBCyAIKAI4IXggCCgCNCF5IAgoAjAheiAIKAIgIXsgCCgCKCF8IAgoAhAhfSAIKAIcIX4gCCgCJCF/IHggeSB6IHsgfCB9IH4gfxBpIYABIAgggAE2AjwLIAgoAjwhgQFBwAAhggEgCCCCAWohgwEggwEkACCBAQ8LjwIBHH8jACEEQSAhBSAEIAVrIQYgBiQAIAYgADYCGCAGIAE2AhQgBiACNgIQIAYgAzYCDCAGKAIMIQcgBigCFCEIIAchCSAIIQogCSAKSyELQQEhDCALIAxxIQ0CQAJAIA1FDQBBun8hDiAGIA42AhwMAQtBACEPIAYoAhghECAQIREgDyESIBEgEkYhE0EBIRQgEyAUcSEVAkAgFUUNACAGKAIMIRYCQCAWDQBBACEXIAYgFzYCHAwCC0G2fyEYIAYgGDYCHAwBCyAGKAIYIRkgBigCECEaIAYoAgwhGyAZIBogGxANGiAGKAIMIRwgBiAcNgIcCyAGKAIcIR1BICEeIAYgHmohHyAfJAAgHQ8LmwIBHn8jACEEQSAhBSAEIAVrIQYgBiQAIAYgADYCGCAGIAE2AhQgBiACOgATIAYgAzYCDCAGKAIMIQcgBigCFCEIIAchCSAIIQogCSAKSyELQQEhDCALIAxxIQ0CQAJAIA1FDQBBun8hDiAGIA42AhwMAQtBACEPIAYoAhghECAQIREgDyESIBEgEkYhE0EBIRQgEyAUcSEVAkAgFUUNACAGKAIMIRYCQCAWDQBBACEXIAYgFzYCHAwCC0G2fyEYIAYgGDYCHAwBCyAGKAIYIRkgBi0AEyEaQf8BIRsgGiAbcSEcIAYoAgwhHSAZIBwgHRAOGiAGKAIMIR4gBiAeNgIcCyAGKAIcIR9BICEgIAYgIGohISAhJAAgHw8LulACgAZ/5gF+IwAhA0GgBSEEIAMgBGshBSAFJABBASEGIAUgADYCGCAFIAE2AhQgBSACNgIQQQAhByAHLQCYHSEIQRghCSAIIAl0IQogCiAJdSELIAUgCzYCDCAFKAIMIQwgDCENIAYhDiANIA5GIQ9BASEQIA8gEHEhEQJAAkAgEUUNAEEgIRJBASETIAUoAhghFCAFKAIUIRUgBSgCECEWIAUgFDYCXCAFIBU2AlggBSAWNgJUIAUgEzYCUCAFKAJYIRcgBSAXNgJMIAUoAkwhGCAFKAJUIRkgGCAZaiEaIAUgGjYCSCAFKAJUIRsgGyEcIBytIYMGIAUoAlwhHSAdKQMAIYQGIIQGIIMGfCGFBiAdIIUGNwMAIAUoAlwhHiAeKAJIIR8gBSgCVCEgIB8gIGohISAhISIgEiEjICIgI0khJEEBISUgJCAlcSEmAkACQCAmRQ0AQQAhJyAFKAJYISggKCEpICchKiApICpHIStBASEsICsgLHEhLQJAIC1FDQAgBSgCXCEuQSghLyAuIC9qITAgBSgCXCExIDEoAkghMiAwIDJqITMgBSgCWCE0IAUoAlQhNSAzIDQgNRBqGgtBACE2IAUoAlQhNyAFKAJcITggOCgCSCE5IDkgN2ohOiA4IDo2AkggBSA2NgJgDAELIAUoAlwhOyA7KAJIITwCQCA8RQ0AQQEhPUEgIT4gBSgCXCE/QSghQCA/IEBqIUEgBSgCXCFCIEIoAkghQyBBIENqIUQgBSgCWCFFIAUoAlwhRiBGKAJIIUcgPiBHayFIIEQgRSBIEGoaIAUoAlwhSSBJKQMIIYYGIAUoAlwhSkEoIUsgSiBLaiFMIAUoAlAhTSAFIEw2AmggBSBNNgJkIAUoAmghTiAFKAJkIU8gBSBONgJ0IAUgTzYCcCAFID02AmwgBSgCbCFQIFAhUSA9IVIgUSBSRiFTQQEhVCBTIFRxIVUCQAJAIFVFDQBBASFWIAUoAnAhVyBXIVggViFZIFggWUYhWkEBIVsgWiBbcSFcAkACQCBcRQ0AIAUoAnQhXSBdEGshhwYghwYhiAYMAQsgBSgCdCFeIF4QayGJBiCJBhBsIYoGIIoGIYgGCyCIBiGLBiAFIIsGNwN4DAELQQEhXyAFKAJwIWAgYCFhIF8hYiBhIGJGIWNBASFkIGMgZHEhZQJAAkAgZUUNACAFKAJ0IWYgZikDACGMBiCMBiGNBgwBCyAFKAJ0IWcgZykDACGOBiCOBhBsIY8GII8GIY0GCyCNBiGQBiAFIJAGNwN4C0EBIWggBSkDeCGRBiCGBiCRBhBtIZIGIAUoAlwhaSBpIJIGNwMIIAUoAlwhaiBqKQMQIZMGIAUoAlwha0EoIWwgayBsaiFtQQghbiBtIG5qIW8gBSgCUCFwIAUgbzYCiAEgBSBwNgKEASAFKAKIASFxIAUoAoQBIXIgBSBxNgKUASAFIHI2ApABIAUgaDYCjAEgBSgCjAEhcyBzIXQgaCF1IHQgdUYhdkEBIXcgdiB3cSF4AkACQCB4RQ0AQQEheSAFKAKQASF6IHoheyB5IXwgeyB8RiF9QQEhfiB9IH5xIX8CQAJAIH9FDQAgBSgClAEhgAEggAEQayGUBiCUBiGVBgwBCyAFKAKUASGBASCBARBrIZYGIJYGEGwhlwYglwYhlQYLIJUGIZgGIAUgmAY3A5gBDAELQQEhggEgBSgCkAEhgwEggwEhhAEgggEhhQEghAEghQFGIYYBQQEhhwEghgEghwFxIYgBAkACQCCIAUUNACAFKAKUASGJASCJASkDACGZBiCZBiGaBgwBCyAFKAKUASGKASCKASkDACGbBiCbBhBsIZwGIJwGIZoGCyCaBiGdBiAFIJ0GNwOYAQtBASGLASAFKQOYASGeBiCTBiCeBhBtIZ8GIAUoAlwhjAEgjAEgnwY3AxAgBSgCXCGNASCNASkDGCGgBiAFKAJcIY4BQSghjwEgjgEgjwFqIZABQRAhkQEgkAEgkQFqIZIBIAUoAlAhkwEgBSCSATYCqAEgBSCTATYCpAEgBSgCqAEhlAEgBSgCpAEhlQEgBSCUATYCtAEgBSCVATYCsAEgBSCLATYCrAEgBSgCrAEhlgEglgEhlwEgiwEhmAEglwEgmAFGIZkBQQEhmgEgmQEgmgFxIZsBAkACQCCbAUUNAEEBIZwBIAUoArABIZ0BIJ0BIZ4BIJwBIZ8BIJ4BIJ8BRiGgAUEBIaEBIKABIKEBcSGiAQJAAkAgogFFDQAgBSgCtAEhowEgowEQayGhBiChBiGiBgwBCyAFKAK0ASGkASCkARBrIaMGIKMGEGwhpAYgpAYhogYLIKIGIaUGIAUgpQY3A7gBDAELQQEhpQEgBSgCsAEhpgEgpgEhpwEgpQEhqAEgpwEgqAFGIakBQQEhqgEgqQEgqgFxIasBAkACQCCrAUUNACAFKAK0ASGsASCsASkDACGmBiCmBiGnBgwBCyAFKAK0ASGtASCtASkDACGoBiCoBhBsIakGIKkGIacGCyCnBiGqBiAFIKoGNwO4AQtBASGuASAFKQO4ASGrBiCgBiCrBhBtIawGIAUoAlwhrwEgrwEgrAY3AxggBSgCXCGwASCwASkDICGtBiAFKAJcIbEBQSghsgEgsQEgsgFqIbMBQRghtAEgswEgtAFqIbUBIAUoAlAhtgEgBSC1ATYCyAEgBSC2ATYCxAEgBSgCyAEhtwEgBSgCxAEhuAEgBSC3ATYC1AEgBSC4ATYC0AEgBSCuATYCzAEgBSgCzAEhuQEguQEhugEgrgEhuwEgugEguwFGIbwBQQEhvQEgvAEgvQFxIb4BAkACQCC+AUUNAEEBIb8BIAUoAtABIcABIMABIcEBIL8BIcIBIMEBIMIBRiHDAUEBIcQBIMMBIMQBcSHFAQJAAkAgxQFFDQAgBSgC1AEhxgEgxgEQayGuBiCuBiGvBgwBCyAFKALUASHHASDHARBrIbAGILAGEGwhsQYgsQYhrwYLIK8GIbIGIAUgsgY3A9gBDAELQQEhyAEgBSgC0AEhyQEgyQEhygEgyAEhywEgygEgywFGIcwBQQEhzQEgzAEgzQFxIc4BAkACQCDOAUUNACAFKALUASHPASDPASkDACGzBiCzBiG0BgwBCyAFKALUASHQASDQASkDACG1BiC1BhBsIbYGILYGIbQGCyC0BiG3BiAFILcGNwPYAQtBACHRAUEgIdIBIAUpA9gBIbgGIK0GILgGEG0huQYgBSgCXCHTASDTASC5BjcDICAFKAJcIdQBINQBKAJIIdUBINIBINUBayHWASAFKAJMIdcBINcBINYBaiHYASAFINgBNgJMIAUoAlwh2QEg2QEg0QE2AkgLIAUoAkwh2gFBICHbASDaASDbAWoh3AEgBSgCSCHdASDcASHeASDdASHfASDeASDfAU0h4AFBASHhASDgASDhAXEh4gECQCDiAUUNACAFKAJIIeMBQWAh5AEg4wEg5AFqIeUBIAUg5QE2AkQgBSgCXCHmASDmASkDCCG6BiAFILoGNwM4IAUoAlwh5wEg5wEpAxAhuwYgBSC7BjcDMCAFKAJcIegBIOgBKQMYIbwGIAUgvAY3AyggBSgCXCHpASDpASkDICG9BiAFIL0GNwMgA0BBASHqASAFKQM4Ib4GIAUoAkwh6wEgBSgCUCHsASAFIOsBNgLoASAFIOwBNgLkASAFKALoASHtASAFKALkASHuASAFIO0BNgL0ASAFIO4BNgLwASAFIOoBNgLsASAFKALsASHvASDvASHwASDqASHxASDwASDxAUYh8gFBASHzASDyASDzAXEh9AECQAJAIPQBRQ0AQQEh9QEgBSgC8AEh9gEg9gEh9wEg9QEh+AEg9wEg+AFGIfkBQQEh+gEg+QEg+gFxIfsBAkACQCD7AUUNACAFKAL0ASH8ASD8ARBrIb8GIL8GIcAGDAELIAUoAvQBIf0BIP0BEGshwQYgwQYQbCHCBiDCBiHABgsgwAYhwwYgBSDDBjcD+AEMAQtBASH+ASAFKALwASH/ASD/ASGAAiD+ASGBAiCAAiCBAkYhggJBASGDAiCCAiCDAnEhhAICQAJAIIQCRQ0AIAUoAvQBIYUCIIUCKQMAIcQGIMQGIcUGDAELIAUoAvQBIYYCIIYCKQMAIcYGIMYGEGwhxwYgxwYhxQYLIMUGIcgGIAUgyAY3A/gBC0EBIYcCIAUpA/gBIckGIL4GIMkGEG0hygYgBSDKBjcDOCAFKAJMIYgCQQghiQIgiAIgiQJqIYoCIAUgigI2AkwgBSkDMCHLBiAFKAJMIYsCIAUoAlAhjAIgBSCLAjYCiAIgBSCMAjYChAIgBSgCiAIhjQIgBSgChAIhjgIgBSCNAjYClAIgBSCOAjYCkAIgBSCHAjYCjAIgBSgCjAIhjwIgjwIhkAIghwIhkQIgkAIgkQJGIZICQQEhkwIgkgIgkwJxIZQCAkACQCCUAkUNAEEBIZUCIAUoApACIZYCIJYCIZcCIJUCIZgCIJcCIJgCRiGZAkEBIZoCIJkCIJoCcSGbAgJAAkAgmwJFDQAgBSgClAIhnAIgnAIQayHMBiDMBiHNBgwBCyAFKAKUAiGdAiCdAhBrIc4GIM4GEGwhzwYgzwYhzQYLIM0GIdAGIAUg0AY3A5gCDAELQQEhngIgBSgCkAIhnwIgnwIhoAIgngIhoQIgoAIgoQJGIaICQQEhowIgogIgowJxIaQCAkACQCCkAkUNACAFKAKUAiGlAiClAikDACHRBiDRBiHSBgwBCyAFKAKUAiGmAiCmAikDACHTBiDTBhBsIdQGINQGIdIGCyDSBiHVBiAFINUGNwOYAgtBASGnAiAFKQOYAiHWBiDLBiDWBhBtIdcGIAUg1wY3AzAgBSgCTCGoAkEIIakCIKgCIKkCaiGqAiAFIKoCNgJMIAUpAygh2AYgBSgCTCGrAiAFKAJQIawCIAUgqwI2AqgCIAUgrAI2AqQCIAUoAqgCIa0CIAUoAqQCIa4CIAUgrQI2ArQCIAUgrgI2ArACIAUgpwI2AqwCIAUoAqwCIa8CIK8CIbACIKcCIbECILACILECRiGyAkEBIbMCILICILMCcSG0AgJAAkAgtAJFDQBBASG1AiAFKAKwAiG2AiC2AiG3AiC1AiG4AiC3AiC4AkYhuQJBASG6AiC5AiC6AnEhuwICQAJAILsCRQ0AIAUoArQCIbwCILwCEGsh2QYg2QYh2gYMAQsgBSgCtAIhvQIgvQIQayHbBiDbBhBsIdwGINwGIdoGCyDaBiHdBiAFIN0GNwO4AgwBC0EBIb4CIAUoArACIb8CIL8CIcACIL4CIcECIMACIMECRiHCAkEBIcMCIMICIMMCcSHEAgJAAkAgxAJFDQAgBSgCtAIhxQIgxQIpAwAh3gYg3gYh3wYMAQsgBSgCtAIhxgIgxgIpAwAh4AYg4AYQbCHhBiDhBiHfBgsg3wYh4gYgBSDiBjcDuAILQQEhxwIgBSkDuAIh4wYg2AYg4wYQbSHkBiAFIOQGNwMoIAUoAkwhyAJBCCHJAiDIAiDJAmohygIgBSDKAjYCTCAFKQMgIeUGIAUoAkwhywIgBSgCUCHMAiAFIMsCNgLIAiAFIMwCNgLEAiAFKALIAiHNAiAFKALEAiHOAiAFIM0CNgLUAiAFIM4CNgLQAiAFIMcCNgLMAiAFKALMAiHPAiDPAiHQAiDHAiHRAiDQAiDRAkYh0gJBASHTAiDSAiDTAnEh1AICQAJAINQCRQ0AQQEh1QIgBSgC0AIh1gIg1gIh1wIg1QIh2AIg1wIg2AJGIdkCQQEh2gIg2QIg2gJxIdsCAkACQCDbAkUNACAFKALUAiHcAiDcAhBrIeYGIOYGIecGDAELIAUoAtQCId0CIN0CEGsh6AYg6AYQbCHpBiDpBiHnBgsg5wYh6gYgBSDqBjcD2AIMAQtBASHeAiAFKALQAiHfAiDfAiHgAiDeAiHhAiDgAiDhAkYh4gJBASHjAiDiAiDjAnEh5AICQAJAIOQCRQ0AIAUoAtQCIeUCIOUCKQMAIesGIOsGIewGDAELIAUoAtQCIeYCIOYCKQMAIe0GIO0GEGwh7gYg7gYh7AYLIOwGIe8GIAUg7wY3A9gCCyAFKQPYAiHwBiDlBiDwBhBtIfEGIAUg8QY3AyAgBSgCTCHnAkEIIegCIOcCIOgCaiHpAiAFIOkCNgJMIAUoAkwh6gIgBSgCRCHrAiDqAiHsAiDrAiHtAiDsAiDtAk0h7gJBASHvAiDuAiDvAnEh8AIg8AINAAsgBSkDOCHyBiAFKAJcIfECIPECIPIGNwMIIAUpAzAh8wYgBSgCXCHyAiDyAiDzBjcDECAFKQMoIfQGIAUoAlwh8wIg8wIg9AY3AxggBSkDICH1BiAFKAJcIfQCIPQCIPUGNwMgCyAFKAJMIfUCIAUoAkgh9gIg9QIh9wIg9gIh+AIg9wIg+AJJIfkCQQEh+gIg+QIg+gJxIfsCAkAg+wJFDQAgBSgCXCH8AkEoIf0CIPwCIP0CaiH+AiAFKAJMIf8CIAUoAkghgAMgBSgCTCGBAyCAAyCBA2shggMg/gIg/wIgggMQahogBSgCSCGDAyAFKAJMIYQDIIMDIIQDayGFAyAFKAJcIYYDIIYDIIUDNgJIC0EAIYcDIAUghwM2AmALIAUoAmAhiAMgBSCIAzYCHAwBC0EgIYkDQQAhigMgBSgCGCGLAyAFKAIUIYwDIAUoAhAhjQMgBSCLAzYCnAMgBSCMAzYCmAMgBSCNAzYClAMgBSCKAzYCkAMgBSgCmAMhjgMgBSCOAzYCjAMgBSgCjAMhjwMgBSgClAMhkAMgjwMgkANqIZEDIAUgkQM2AogDIAUoApQDIZIDIJIDIZMDIJMDrSH2BiAFKAKcAyGUAyCUAykDACH3BiD3BiD2Bnwh+AYglAMg+AY3AwAgBSgCnAMhlQMglQMoAkghlgMgBSgClAMhlwMglgMglwNqIZgDIJgDIZkDIIkDIZoDIJkDIJoDSSGbA0EBIZwDIJsDIJwDcSGdAwJAAkAgnQNFDQBBACGeAyAFKAKYAyGfAyCfAyGgAyCeAyGhAyCgAyChA0chogNBASGjAyCiAyCjA3EhpAMCQCCkA0UNACAFKAKcAyGlA0EoIaYDIKUDIKYDaiGnAyAFKAKcAyGoAyCoAygCSCGpAyCnAyCpA2ohqgMgBSgCmAMhqwMgBSgClAMhrAMgqgMgqwMgrAMQahoLQQAhrQMgBSgClAMhrgMgBSgCnAMhrwMgrwMoAkghsAMgsAMgrgNqIbEDIK8DILEDNgJIIAUgrQM2AqADDAELIAUoApwDIbIDILIDKAJIIbMDAkAgswNFDQBBASG0A0EgIbUDIAUoApwDIbYDQSghtwMgtgMgtwNqIbgDIAUoApwDIbkDILkDKAJIIboDILgDILoDaiG7AyAFKAKYAyG8AyAFKAKcAyG9AyC9AygCSCG+AyC1AyC+A2shvwMguwMgvAMgvwMQahogBSgCnAMhwAMgwAMpAwgh+QYgBSgCnAMhwQNBKCHCAyDBAyDCA2ohwwMgBSgCkAMhxAMgBSDDAzYCqAMgBSDEAzYCpAMgBSgCqAMhxQMgBSgCpAMhxgMgBSDFAzYCtAMgBSDGAzYCsAMgBSC0AzYCrAMgBSgCrAMhxwMgxwMhyAMgtAMhyQMgyAMgyQNGIcoDQQEhywMgygMgywNxIcwDAkACQCDMA0UNAEEBIc0DIAUoArADIc4DIM4DIc8DIM0DIdADIM8DINADRiHRA0EBIdIDINEDINIDcSHTAwJAAkAg0wNFDQAgBSgCtAMh1AMg1AMQayH6BiD6BiH7BgwBCyAFKAK0AyHVAyDVAxBrIfwGIPwGEGwh/QYg/QYh+wYLIPsGIf4GIAUg/gY3A7gDDAELQQEh1gMgBSgCsAMh1wMg1wMh2AMg1gMh2QMg2AMg2QNGIdoDQQEh2wMg2gMg2wNxIdwDAkACQCDcA0UNACAFKAK0AyHdAyDdAykDACH/BiD/BiGABwwBCyAFKAK0AyHeAyDeAykDACGBByCBBxBsIYIHIIIHIYAHCyCAByGDByAFIIMHNwO4AwtBASHfAyAFKQO4AyGEByD5BiCEBxBtIYUHIAUoApwDIeADIOADIIUHNwMIIAUoApwDIeEDIOEDKQMQIYYHIAUoApwDIeIDQSgh4wMg4gMg4wNqIeQDQQgh5QMg5AMg5QNqIeYDIAUoApADIecDIAUg5gM2AsgDIAUg5wM2AsQDIAUoAsgDIegDIAUoAsQDIekDIAUg6AM2AtQDIAUg6QM2AtADIAUg3wM2AswDIAUoAswDIeoDIOoDIesDIN8DIewDIOsDIOwDRiHtA0EBIe4DIO0DIO4DcSHvAwJAAkAg7wNFDQBBASHwAyAFKALQAyHxAyDxAyHyAyDwAyHzAyDyAyDzA0Yh9ANBASH1AyD0AyD1A3Eh9gMCQAJAIPYDRQ0AIAUoAtQDIfcDIPcDEGshhwcghwchiAcMAQsgBSgC1AMh+AMg+AMQayGJByCJBxBsIYoHIIoHIYgHCyCIByGLByAFIIsHNwPYAwwBC0EBIfkDIAUoAtADIfoDIPoDIfsDIPkDIfwDIPsDIPwDRiH9A0EBIf4DIP0DIP4DcSH/AwJAAkAg/wNFDQAgBSgC1AMhgAQggAQpAwAhjAcgjAchjQcMAQsgBSgC1AMhgQQggQQpAwAhjgcgjgcQbCGPByCPByGNBwsgjQchkAcgBSCQBzcD2AMLQQEhggQgBSkD2AMhkQcghgcgkQcQbSGSByAFKAKcAyGDBCCDBCCSBzcDECAFKAKcAyGEBCCEBCkDGCGTByAFKAKcAyGFBEEoIYYEIIUEIIYEaiGHBEEQIYgEIIcEIIgEaiGJBCAFKAKQAyGKBCAFIIkENgLoAyAFIIoENgLkAyAFKALoAyGLBCAFKALkAyGMBCAFIIsENgL0AyAFIIwENgLwAyAFIIIENgLsAyAFKALsAyGNBCCNBCGOBCCCBCGPBCCOBCCPBEYhkARBASGRBCCQBCCRBHEhkgQCQAJAIJIERQ0AQQEhkwQgBSgC8AMhlAQglAQhlQQgkwQhlgQglQQglgRGIZcEQQEhmAQglwQgmARxIZkEAkACQCCZBEUNACAFKAL0AyGaBCCaBBBrIZQHIJQHIZUHDAELIAUoAvQDIZsEIJsEEGshlgcglgcQbCGXByCXByGVBwsglQchmAcgBSCYBzcD+AMMAQtBASGcBCAFKALwAyGdBCCdBCGeBCCcBCGfBCCeBCCfBEYhoARBASGhBCCgBCChBHEhogQCQAJAIKIERQ0AIAUoAvQDIaMEIKMEKQMAIZkHIJkHIZoHDAELIAUoAvQDIaQEIKQEKQMAIZsHIJsHEGwhnAcgnAchmgcLIJoHIZ0HIAUgnQc3A/gDC0EBIaUEIAUpA/gDIZ4HIJMHIJ4HEG0hnwcgBSgCnAMhpgQgpgQgnwc3AxggBSgCnAMhpwQgpwQpAyAhoAcgBSgCnAMhqARBKCGpBCCoBCCpBGohqgRBGCGrBCCqBCCrBGohrAQgBSgCkAMhrQQgBSCsBDYCiAQgBSCtBDYChAQgBSgCiAQhrgQgBSgChAQhrwQgBSCuBDYClAQgBSCvBDYCkAQgBSClBDYCjAQgBSgCjAQhsAQgsAQhsQQgpQQhsgQgsQQgsgRGIbMEQQEhtAQgswQgtARxIbUEAkACQCC1BEUNAEEBIbYEIAUoApAEIbcEILcEIbgEILYEIbkEILgEILkERiG6BEEBIbsEILoEILsEcSG8BAJAAkAgvARFDQAgBSgClAQhvQQgvQQQayGhByChByGiBwwBCyAFKAKUBCG+BCC+BBBrIaMHIKMHEGwhpAcgpAchogcLIKIHIaUHIAUgpQc3A5gEDAELQQEhvwQgBSgCkAQhwAQgwAQhwQQgvwQhwgQgwQQgwgRGIcMEQQEhxAQgwwQgxARxIcUEAkACQCDFBEUNACAFKAKUBCHGBCDGBCkDACGmByCmByGnBwwBCyAFKAKUBCHHBCDHBCkDACGoByCoBxBsIakHIKkHIacHCyCnByGqByAFIKoHNwOYBAtBACHIBEEgIckEIAUpA5gEIasHIKAHIKsHEG0hrAcgBSgCnAMhygQgygQgrAc3AyAgBSgCnAMhywQgywQoAkghzAQgyQQgzARrIc0EIAUoAowDIc4EIM4EIM0EaiHPBCAFIM8ENgKMAyAFKAKcAyHQBCDQBCDIBDYCSAsgBSgCjAMh0QRBICHSBCDRBCDSBGoh0wQgBSgCiAMh1AQg0wQh1QQg1AQh1gQg1QQg1gRNIdcEQQEh2AQg1wQg2ARxIdkEAkAg2QRFDQAgBSgCiAMh2gRBYCHbBCDaBCDbBGoh3AQgBSDcBDYChAMgBSgCnAMh3QQg3QQpAwghrQcgBSCtBzcD+AIgBSgCnAMh3gQg3gQpAxAhrgcgBSCuBzcD8AIgBSgCnAMh3wQg3wQpAxghrwcgBSCvBzcD6AIgBSgCnAMh4AQg4AQpAyAhsAcgBSCwBzcD4AIDQEEBIeEEIAUpA/gCIbEHIAUoAowDIeIEIAUoApADIeMEIAUg4gQ2AqgEIAUg4wQ2AqQEIAUoAqgEIeQEIAUoAqQEIeUEIAUg5AQ2ArQEIAUg5QQ2ArAEIAUg4QQ2AqwEIAUoAqwEIeYEIOYEIecEIOEEIegEIOcEIOgERiHpBEEBIeoEIOkEIOoEcSHrBAJAAkAg6wRFDQBBASHsBCAFKAKwBCHtBCDtBCHuBCDsBCHvBCDuBCDvBEYh8ARBASHxBCDwBCDxBHEh8gQCQAJAIPIERQ0AIAUoArQEIfMEIPMEEGshsgcgsgchswcMAQsgBSgCtAQh9AQg9AQQayG0ByC0BxBsIbUHILUHIbMHCyCzByG2ByAFILYHNwO4BAwBC0EBIfUEIAUoArAEIfYEIPYEIfcEIPUEIfgEIPcEIPgERiH5BEEBIfoEIPkEIPoEcSH7BAJAAkAg+wRFDQAgBSgCtAQh/AQg/AQpAwAhtwcgtwchuAcMAQsgBSgCtAQh/QQg/QQpAwAhuQcguQcQbCG6ByC6ByG4BwsguAchuwcgBSC7BzcDuAQLQQEh/gQgBSkDuAQhvAcgsQcgvAcQbSG9ByAFIL0HNwP4AiAFKAKMAyH/BEEIIYAFIP8EIIAFaiGBBSAFIIEFNgKMAyAFKQPwAiG+ByAFKAKMAyGCBSAFKAKQAyGDBSAFIIIFNgLIBCAFIIMFNgLEBCAFKALIBCGEBSAFKALEBCGFBSAFIIQFNgLUBCAFIIUFNgLQBCAFIP4ENgLMBCAFKALMBCGGBSCGBSGHBSD+BCGIBSCHBSCIBUYhiQVBASGKBSCJBSCKBXEhiwUCQAJAIIsFRQ0AQQEhjAUgBSgC0AQhjQUgjQUhjgUgjAUhjwUgjgUgjwVGIZAFQQEhkQUgkAUgkQVxIZIFAkACQCCSBUUNACAFKALUBCGTBSCTBRBrIb8HIL8HIcAHDAELIAUoAtQEIZQFIJQFEGshwQcgwQcQbCHCByDCByHABwsgwAchwwcgBSDDBzcD2AQMAQtBASGVBSAFKALQBCGWBSCWBSGXBSCVBSGYBSCXBSCYBUYhmQVBASGaBSCZBSCaBXEhmwUCQAJAIJsFRQ0AIAUoAtQEIZwFIJwFKQMAIcQHIMQHIcUHDAELIAUoAtQEIZ0FIJ0FKQMAIcYHIMYHEGwhxwcgxwchxQcLIMUHIcgHIAUgyAc3A9gEC0EBIZ4FIAUpA9gEIckHIL4HIMkHEG0hygcgBSDKBzcD8AIgBSgCjAMhnwVBCCGgBSCfBSCgBWohoQUgBSChBTYCjAMgBSkD6AIhywcgBSgCjAMhogUgBSgCkAMhowUgBSCiBTYC6AQgBSCjBTYC5AQgBSgC6AQhpAUgBSgC5AQhpQUgBSCkBTYC9AQgBSClBTYC8AQgBSCeBTYC7AQgBSgC7AQhpgUgpgUhpwUgngUhqAUgpwUgqAVGIakFQQEhqgUgqQUgqgVxIasFAkACQCCrBUUNAEEBIawFIAUoAvAEIa0FIK0FIa4FIKwFIa8FIK4FIK8FRiGwBUEBIbEFILAFILEFcSGyBQJAAkAgsgVFDQAgBSgC9AQhswUgswUQayHMByDMByHNBwwBCyAFKAL0BCG0BSC0BRBrIc4HIM4HEGwhzwcgzwchzQcLIM0HIdAHIAUg0Ac3A/gEDAELQQEhtQUgBSgC8AQhtgUgtgUhtwUgtQUhuAUgtwUguAVGIbkFQQEhugUguQUgugVxIbsFAkACQCC7BUUNACAFKAL0BCG8BSC8BSkDACHRByDRByHSBwwBCyAFKAL0BCG9BSC9BSkDACHTByDTBxBsIdQHINQHIdIHCyDSByHVByAFINUHNwP4BAtBASG+BSAFKQP4BCHWByDLByDWBxBtIdcHIAUg1wc3A+gCIAUoAowDIb8FQQghwAUgvwUgwAVqIcEFIAUgwQU2AowDIAUpA+ACIdgHIAUoAowDIcIFIAUoApADIcMFIAUgwgU2AogFIAUgwwU2AoQFIAUoAogFIcQFIAUoAoQFIcUFIAUgxAU2ApQFIAUgxQU2ApAFIAUgvgU2AowFIAUoAowFIcYFIMYFIccFIL4FIcgFIMcFIMgFRiHJBUEBIcoFIMkFIMoFcSHLBQJAAkAgywVFDQBBASHMBSAFKAKQBSHNBSDNBSHOBSDMBSHPBSDOBSDPBUYh0AVBASHRBSDQBSDRBXEh0gUCQAJAINIFRQ0AIAUoApQFIdMFINMFEGsh2Qcg2Qch2gcMAQsgBSgClAUh1AUg1AUQayHbByDbBxBsIdwHINwHIdoHCyDaByHdByAFIN0HNwOYBQwBC0EBIdUFIAUoApAFIdYFINYFIdcFINUFIdgFINcFINgFRiHZBUEBIdoFINkFINoFcSHbBQJAAkAg2wVFDQAgBSgClAUh3AUg3AUpAwAh3gcg3gch3wcMAQsgBSgClAUh3QUg3QUpAwAh4Acg4AcQbCHhByDhByHfBwsg3wch4gcgBSDiBzcDmAULIAUpA5gFIeMHINgHIOMHEG0h5AcgBSDkBzcD4AIgBSgCjAMh3gVBCCHfBSDeBSDfBWoh4AUgBSDgBTYCjAMgBSgCjAMh4QUgBSgChAMh4gUg4QUh4wUg4gUh5AUg4wUg5AVNIeUFQQEh5gUg5QUg5gVxIecFIOcFDQALIAUpA/gCIeUHIAUoApwDIegFIOgFIOUHNwMIIAUpA/ACIeYHIAUoApwDIekFIOkFIOYHNwMQIAUpA+gCIecHIAUoApwDIeoFIOoFIOcHNwMYIAUpA+ACIegHIAUoApwDIesFIOsFIOgHNwMgCyAFKAKMAyHsBSAFKAKIAyHtBSDsBSHuBSDtBSHvBSDuBSDvBUkh8AVBASHxBSDwBSDxBXEh8gUCQCDyBUUNACAFKAKcAyHzBUEoIfQFIPMFIPQFaiH1BSAFKAKMAyH2BSAFKAKIAyH3BSAFKAKMAyH4BSD3BSD4BWsh+QUg9QUg9gUg+QUQahogBSgCiAMh+gUgBSgCjAMh+wUg+gUg+wVrIfwFIAUoApwDIf0FIP0FIPwFNgJIC0EAIf4FIAUg/gU2AqADCyAFKAKgAyH/BSAFIP8FNgIcCyAFKAIcIYAGQaAFIYEGIAUggQZqIYIGIIIGJAAggAYPCzABA38jACEEQSAhBSAEIAVrIQYgBiAANgIcIAYgATcDECAGIAI3AwggBiADNgIEDwuqKgKTAn+RAn4jACEBQYACIQIgASACayEDIAMkAEEBIQQgAyAANgIEQQAhBSAFLQCYHSEGQRghByAGIAd0IQggCCAHdSEJIAMgCTYCACADKAIAIQogCiELIAQhDCALIAxGIQ1BASEOIA0gDnEhDwJAAkAgD0UNAEIgIZQCQQEhECADKAIEIREgAyARNgJQIAMgEDYCTCADKAJQIRJBKCETIBIgE2ohFCADIBQ2AkggAygCUCEVQSghFiAVIBZqIRcgAygCUCEYIBgoAkghGSAXIBlqIRogAyAaNgJEIAMoAlAhGyAbKQMAIZUCIJUCIZYCIJQCIZcCIJYCIJcCWiEcQQEhHSAcIB1xIR4CQAJAIB5FDQAgAygCUCEfIB8pAwghmAIgAyCYAjcDMCADKAJQISAgICkDECGZAiADIJkCNwMoIAMoAlAhISAhKQMYIZoCIAMgmgI3AyAgAygCUCEiICIpAyAhmwIgAyCbAjcDGCADKQMwIZwCQgEhnQIgnAIgnQKGIZ4CIAMpAzAhnwJCPyGgAiCfAiCgAoghoQIgngIgoQKEIaICIAMpAyghowJCByGkAiCjAiCkAoYhpQIgAykDKCGmAkI5IacCIKYCIKcCiCGoAiClAiCoAoQhqQIgogIgqQJ8IaoCIAMpAyAhqwJCDCGsAiCrAiCsAoYhrQIgAykDICGuAkI0Ia8CIK4CIK8CiCGwAiCtAiCwAoQhsQIgqgIgsQJ8IbICIAMpAxghswJCEiG0AiCzAiC0AoYhtQIgAykDGCG2AkIuIbcCILYCILcCiCG4AiC1AiC4AoQhuQIgsgIguQJ8IboCIAMgugI3AzggAykDOCG7AiADKQMwIbwCILsCILwCEG4hvQIgAyC9AjcDOCADKQM4Ib4CIAMpAyghvwIgvgIgvwIQbiHAAiADIMACNwM4IAMpAzghwQIgAykDICHCAiDBAiDCAhBuIcMCIAMgwwI3AzggAykDOCHEAiADKQMYIcUCIMQCIMUCEG4hxgIgAyDGAjcDOAwBCyADKAJQISMgIykDGCHHAkLFz9my8eW66ichyAIgxwIgyAJ8IckCIAMgyQI3AzgLIAMoAlAhJCAkKQMAIcoCIAMpAzghywIgywIgygJ8IcwCIAMgzAI3AzgCQANAIAMoAkghJUEIISYgJSAmaiEnIAMoAkQhKCAnISkgKCEqICkgKk0hK0EBISwgKyAscSEtIC1FDQFBASEuIAMoAkghLyADKAJMITAgAyAvNgJYIAMgMDYCVCADKAJYITEgAygCVCEyIAMgMTYCZCADIDI2AmAgAyAuNgJcIAMoAlwhMyAzITQgLiE1IDQgNUYhNkEBITcgNiA3cSE4AkACQCA4RQ0AQQEhOSADKAJgITogOiE7IDkhPCA7IDxGIT1BASE+ID0gPnEhPwJAAkAgP0UNACADKAJkIUAgQBBrIc0CIM0CIc4CDAELIAMoAmQhQSBBEGshzwIgzwIQbCHQAiDQAiHOAgsgzgIh0QIgAyDRAjcDaAwBC0EBIUIgAygCYCFDIEMhRCBCIUUgRCBFRiFGQQEhRyBGIEdxIUgCQAJAIEhFDQAgAygCZCFJIEkpAwAh0gIg0gIh0wIMAQsgAygCZCFKIEopAwAh1AIg1AIQbCHVAiDVAiHTAgsg0wIh1gIgAyDWAjcDaAtCACHXAiADKQNoIdgCINcCINgCEG0h2QIgAyDZAjcDECADKQMQIdoCIAMpAzgh2wIg2wIg2gKFIdwCIAMg3AI3AzggAykDOCHdAkIbId4CIN0CIN4ChiHfAiADKQM4IeACQiUh4QIg4AIg4QKIIeICIN8CIOIChCHjAkKHla+vmLbem55/IeQCIOMCIOQCfiHlAkLj3MqV/M7y9YV/IeYCIOUCIOYCfCHnAiADIOcCNwM4IAMoAkghS0EIIUwgSyBMaiFNIAMgTTYCSAwAAAsACyADKAJIIU5BBCFPIE4gT2ohUCADKAJEIVEgUCFSIFEhUyBSIFNNIVRBASFVIFQgVXEhVgJAIFZFDQBBASFXIAMoAkghWCADKAJMIVkgAyBYNgJ0IAMgWTYCcCADKAJ0IVogAygCcCFbIAMgWjYCgAEgAyBbNgJ8IAMgVzYCeCADKAJ4IVwgXCFdIFchXiBdIF5GIV9BASFgIF8gYHEhYQJAAkAgYUUNAEEBIWIgAygCfCFjIGMhZCBiIWUgZCBlRiFmQQEhZyBmIGdxIWgCQAJAIGhFDQAgAygCgAEhaSBpEG8haiBqIWsMAQsgAygCgAEhbCBsEG8hbSBtEHAhbiBuIWsLIGshbyADIG82AoQBDAELQQEhcCADKAJ8IXEgcSFyIHAhcyByIHNGIXRBASF1IHQgdXEhdgJAAkAgdkUNACADKAKAASF3IHcoAgAheCB4IXkMAQsgAygCgAEheiB6KAIAIXsgexBwIXwgfCF5CyB5IX0gAyB9NgKEAQsgAygChAEhfiB+IX8gf60h6AJCh5Wvr5i23puefyHpAiDoAiDpAn4h6gIgAykDOCHrAiDrAiDqAoUh7AIgAyDsAjcDOCADKQM4Ie0CQhch7gIg7QIg7gKGIe8CIAMpAzgh8AJCKSHxAiDwAiDxAogh8gIg7wIg8gKEIfMCQs/W077Sx6vZQiH0AiDzAiD0An4h9QJC+fPd8Zn2masWIfYCIPUCIPYCfCH3AiADIPcCNwM4IAMoAkghgAFBBCGBASCAASCBAWohggEgAyCCATYCSAsCQANAIAMoAkghgwEgAygCRCGEASCDASGFASCEASGGASCFASCGAUkhhwFBASGIASCHASCIAXEhiQEgiQFFDQEgAygCSCGKASCKAS0AACGLAUH/ASGMASCLASCMAXEhjQEgjQGtIfgCQsXP2bLx5brqJyH5AiD4AiD5An4h+gIgAykDOCH7AiD7AiD6AoUh/AIgAyD8AjcDOCADKQM4If0CQgsh/gIg/QIg/gKGIf8CIAMpAzghgANCNSGBAyCAAyCBA4ghggMg/wIgggOEIYMDQoeVr6+Ytt6bnn8hhAMggwMghAN+IYUDIAMghQM3AzggAygCSCGOAUEBIY8BII4BII8BaiGQASADIJABNgJIDAAACwALIAMpAzghhgNCISGHAyCGAyCHA4ghiAMgAykDOCGJAyCJAyCIA4UhigMgAyCKAzcDOCADKQM4IYsDQs/W077Sx6vZQiGMAyCLAyCMA34hjQMgAyCNAzcDOCADKQM4IY4DQh0hjwMgjgMgjwOIIZADIAMpAzghkQMgkQMgkAOFIZIDIAMgkgM3AzggAykDOCGTA0L5893xmfaZqxYhlAMgkwMglAN+IZUDIAMglQM3AzggAykDOCGWA0IgIZcDIJYDIJcDiCGYAyADKQM4IZkDIJkDIJgDhSGaAyADIJoDNwM4IAMpAzghmwMgAyCbAzcDCAwBC0IgIZwDQQAhkQEgAygCBCGSASADIJIBNgLIASADIJEBNgLEASADKALIASGTAUEoIZQBIJMBIJQBaiGVASADIJUBNgLAASADKALIASGWAUEoIZcBIJYBIJcBaiGYASADKALIASGZASCZASgCSCGaASCYASCaAWohmwEgAyCbATYCvAEgAygCyAEhnAEgnAEpAwAhnQMgnQMhngMgnAMhnwMgngMgnwNaIZ0BQQEhngEgnQEgngFxIZ8BAkACQCCfAUUNACADKALIASGgASCgASkDCCGgAyADIKADNwOoASADKALIASGhASChASkDECGhAyADIKEDNwOgASADKALIASGiASCiASkDGCGiAyADIKIDNwOYASADKALIASGjASCjASkDICGjAyADIKMDNwOQASADKQOoASGkA0IBIaUDIKQDIKUDhiGmAyADKQOoASGnA0I/IagDIKcDIKgDiCGpAyCmAyCpA4QhqgMgAykDoAEhqwNCByGsAyCrAyCsA4YhrQMgAykDoAEhrgNCOSGvAyCuAyCvA4ghsAMgrQMgsAOEIbEDIKoDILEDfCGyAyADKQOYASGzA0IMIbQDILMDILQDhiG1AyADKQOYASG2A0I0IbcDILYDILcDiCG4AyC1AyC4A4QhuQMgsgMguQN8IboDIAMpA5ABIbsDQhIhvAMguwMgvAOGIb0DIAMpA5ABIb4DQi4hvwMgvgMgvwOIIcADIL0DIMADhCHBAyC6AyDBA3whwgMgAyDCAzcDsAEgAykDsAEhwwMgAykDqAEhxAMgwwMgxAMQbiHFAyADIMUDNwOwASADKQOwASHGAyADKQOgASHHAyDGAyDHAxBuIcgDIAMgyAM3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ByCACHEhgQgCQAJAIIEIRQ0AIAooAsQFIYIIIIIIKAI8IYMIIIMIIYQIDAELIAooAsQFIYUIIIUIKAI4IYYIIIYIIYQICyCECCGHCEEAIYgIIAoghwg2AvgEIAooAvgEIYkIIAooAvwEIYoIIIkIIIoIaiGLCCAKKAJYIYwIIIgIIIwIayGNCCCLCCCNCGohjgggCiCOCDYCXCAKKAL8BCGPCCAKKAJUIZAIII8IIJAIaiGRCCAKKALEBSGSCCCSCCCRCDYCQAtBICGTCEEfIZQIQbAFIZUIIAoglQhqIZYIIJYIIZcIQcgFIZgIIAogmAhqIZkIIJkIIZoIQQAhmwggCiCbCDYC9AQgCigCxAUhnAhBFCGdCCCcCCCdCGohngggCigCxAUhnwgglwgpAAAhthUgmgggthU3AAAgCiCeCDYC4AUgCiCfCDYC3AUgCi0AywUhoAhB/wEhoQggoAggoQhxIaIIIAogogg2AtgFIAooAtwFIaMIIAooAtgFIaQIIAogowg2AuwFIAogpAg2AugFIAooAuwFIaUIIAooAugFIaYIIAogpQg2AvQFIAogpgg2AvAFIAooAvQFIacIIKcIKAIAIagIIAooAvQFIakIIKkIKAIEIaoIIJMIIKoIayGrCCAKKALwBSGsCCCrCCCsCGshrQggCigC8AUhrgggCiCoCDYChAYgCiCtCDYCgAYgCiCuCDYC/AUgCiCUCDYC+AUgCigC/AUhrwggrwghsAggkwghsQggsAggsQhJIbIIQQEhswggsgggswhxIbQIAkAgtAgNABAAC0EgIbUIQR8htghBqAUhtwggCiC3CGohuAgguAghuQhBkAYhugggCiC6CGohuwgguwghvAhBwB0hvQggCigChAYhvgggCigCgAYhvwhBHyHACCC/CCDACHEhwQggvgggwQh2IcIIIAooAvwFIcMIQQIhxAggwwggxAh0IcUIIL0IIMUIaiHGCCDGCCgCACHHCCDCCCDHCHEhyAggCiDICDYC5AUgCigC7AUhyQggCigC6AUhygggCiDJCDYCjAYgCiDKCDYCiAYgCigCiAYhywggCigCjAYhzAggzAgoAgQhzQggzQggywhqIc4IIMwIIM4INgIEIAooAuQFIc8IIAogzwg2AtQFIAovAcgFIdAIQf//AyHRCCDQCCDRCHEh0gggCigC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AuAHIesJIOsJKAIAIewJIAooAqAHIe0JIOwJIO0JaiHuCSAKIO4JNgK8ByAKKALMByHvCSAKKAKoByHwCSCrCSDwCWsh8Qkg7wkg8QlqIfIJIAog8gk2ArgHIAooAugHIfMJIPMJIfQJIKsJIfUJIPQJIPUJRyH2CUEBIfcJIPYJIPcJcSH4CQJAIPgJDQAQAAsgCigCwAch+QkgCigC5Ach+gkg+Qkh+wkg+gkh/Akg+wkg/AlJIf0JQQEh/gkg/Qkg/glxIf8JAkAg/wkNABAAC0EBIYAKIAooArwHIYEKIAooAtwHIYIKIIEKIYMKIIIKIYQKIIMKIIQKSyGFCkEBIYYKIIUKIIYKcSGHCiCACiGICgJAIIcKDQBBASGJCiAKKALEByGKCiAKKALAByGLCiCKCiGMCiCLCiGNCiCMCiCNCkshjgpBASGPCiCOCiCPCnEhkAogiQohiAogkAoNAEEAIZEKECEhkgogkQohkwoCQCCSCkUNACAKKALkByGUCiAKKALoByGVCiCUCiCVCmshlgogCigCyAchlwpBICGYCiCXCiCYCmohmQoglgohmgogmQohmwogmgogmwpJIZwKIJwKIZMKCyCTCiGdCiCdCiGICgsgiAohngpBASGfCiCeCiCfCnEhoAoCQAJAIKAKRQ0AIAooAugHIaEKIAooAuQHIaIKIAooAuAHIaMKIAooAtwHIaQKIAooAtgHIaUKIAooAtQHIaYKIAooAtAHIacKQQghqAogCiCoCmohqQpBoAchqgogCiCqCmohqwogqwogqApqIawKIKwKKQMAIbsVIKkKILsVNwMAIAopA6AHIbwVIAogvBU3AwAgoQogogogCiCjCiCkCiClCiCmCiCnChC3ASGtCiAKIK0KNgLsBwwBCyAKKALoByGuCiAKKALMByGvCiCuCiGwCiCvCiGxCiCwCiCxCk0hsgpBASGzCiCyCiCzCnEhtAoCQCC0Cg0AEAALIAooAswHIbUKIAooAsQHIbYKILUKIbcKILYKIbgKILcKILgKSSG5CkEBIboKILkKILoKcSG7CgJAILsKDQAQAAsgCigCxAchvAogCigC5AchvQogvAohvgogvQohvwogvgogvwpNIcAKQQEhwQogwAogwQpxIcIKAkAgwgoNABAACyAKKAK8ByHDCiAKKALcByHECiDDCiHF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AqAJIYcQIAooApwJIYgQIAooApgJIYkQIAooApQJIYoQIAooApAJIYsQQQghjBBBECGNECAKII0QaiGOECCOECCMEGohjxBB4AghkBAgCiCQEGohkRAgkRAgjBBqIZIQIJIQKQMAIcEVII8QIMEVNwMAIAopA+AIIcIVIAogwhU3AxBBECGTECAKIJMQaiGUECCFECCGECCUECCHECCIECCJECCKECCLEBC3ASGVECAKIJUQNgKsCQwBCyAKKAKoCSGWECAKKAKMCSGXECCWECGYECCXECGZECCYECCZEE0hmhBBASGbECCaECCbEHEhnBACQCCcEA0AEAALIAooAowJIZ0QIAooAoQJIZ4QIJ0QIZ8QIJ4QIaAQIJ8QIKAQSSGhEEEBIaIQIKEQIKIQcSGjEAJAIKMQDQAQAAsgCigChAkhpBAgCigCpAkhpRAgpBAhphAgpRAhpxAgphAgpxBNIagQQQEhqRAgqBAgqRBxIaoQAkAgqhANABAACyAKKAL8CCGrECAKKAKcCSGsECCrECGtECCsECGuECCtECCuEE0hrxBBASGwECCvECCwEHEhsRACQCCxEA0AEAALIAooAowJIbIQIAooAoAJIbMQILIQIbQQILMQIbUQILQQILUQTSG2EEEBIbcQILYQILcQcSG4EAJAILgQDQAQAAsgCigChAkhuRAgCigCgAkhuhAguRAhuxAguhAhvBAguxAgvBBNIb0QQQEhvhAgvRAgvhBxIb8QAkAgvxANABAAC0EQIcAQIAooAqgJIcEQIAooAqAJIcIQIMIQKAIAIcMQIMEQIMMQEH8gCigC4AghxBAgxBAhxRAgwBAhxhAgxRAgxhBLIccQQQEhyBAgxxAgyBBxIckQAkAgyRBFDQBBCCHKEEEAIcsQIAooAqgJIcwQQRAhzRAgzBAgzRBqIc4QIAooAqAJIc8QIM8QKAIAIdAQQRAh0RAg0BAg0RBqIdIQIAooAuAIIdMQQRAh1BAg0xAg1BBrIdUQIAogzhA2AswJIAog0hA2AsgJIAog1RA2AsQJIAogyxA2AsAJIAooAswJIdYQIAooAsgJIdcQINYQINcQayHYECAKINgQNgK8CSAKKALICSHZECAKINkQNgK4CSAKKALMCSHaECAKINoQNgK0CSAKKAK0CSHbECAKKALECSHcECDbECDcEGoh3RAgCiDdEDYCsAkgCigCvAkh3hAg3hAh3xAgyhAh4BAg3xAg4BBOIeEQQQEh4hAg4RAg4hBxIeMQAkAg4xANACAKKALACSHkEAJAIOQQDQBBcCHlECAKKAK8CSHmECDmECHnECDlECHoECDnECDoEEwh6RBBASHqECDpECDqEHEh6xAg6xANAQsQAAtBASHsECAKKALACSHtECDtECHuECDsECHvECDuECDvEEYh8BBBASHxECDwECDxEHEh8hACQAJAIPIQRQ0AQRAh8xAgCigCvAkh9BAg9BAh9RAg8xAh9hAg9RAg9hBIIfcQQQEh+BAg9xAg+BBxIfkQIPkQRQ0AA0AgCigCtAkh+hAgCigCuAkh+xAg+hAg+xAQgAEgCigCtAkh/BBBCCH9ECD8ECD9EGoh/hAgCiD+EDYCtAkgCigCuAkh/xBBCCGAESD/ECCAEWohgREgCiCBETYCuAkgCigCtAkhghEgCigCsAkhgxEgghEhhBEggxEhhREghBEghRFJIYYRQQEhhxEghhEghxFxIYgRIIgRDQALDAELQRAhiREgCigCvAkhihEgihEhixEgiREhjBEgixEgjBFOIY0RQQEhjhEgjREgjhFxIY8RAkAgjxENAEFwIZARIAooArwJIZERIJERIZIRIJARIZMRIJIRIJMRTCGUEUEBIZURIJQRIJURcSGWESCWEQ0AEAALQRAhlxEgCigCtAkhmBEgCigCuAkhmREgmBEgmREQfyAKKALECSGaESCXESGbESCaESGcESCbESCcEU4hnRFBASGeESCdESCeEXEhnxECQCCfEUUNAAwBCyAKKAK0CSGgEUEQIaERIKARIKERaiGiESAKIKIRNgK0CSAKKAK4CSGjEUEQIaQRIKMRIKQRaiGlESAKIKURNgK4CQNAIAooArQJIaYRIAooArgJIacRIKYRIKcREH8gCigCtAkhqBFBECGpESCoESCpEWohqhEgCiCqETYCtAkgCigCuAkhqxFBECGsESCrESCsEWohrREgCiCtETYCuAkgCigCtAkhrhEgCigCuAkhrxEgrhEgrxEQfyAKKAK0CSGwEUEQIbERILARILERaiGyESAKILIRNgK0CSAKKAK4CSGzEUEQIbQRILMRILQRaiG1ESAKILURNgK4CSAKKAK0CSG2ESAKKAKwCSG3ESC2ESG4ESC3ESG5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3gcg3Qcg3gdMId8HQQEh4Acg3wcg4AdxIeEHIOEHDQELEAALQQEh4gcgCigCoAUh4wcg4wch5Acg4gch5Qcg5Acg5QdGIeYHQQEh5wcg5gcg5wdxIegHAkACQCDoB0UNAEEQIekHIAooApwFIeoHIOoHIesHIOkHIewHIOsHIOwHSCHtB0EBIe4HIO0HIO4HcSHvByDvB0UNAANAIAooApQFIfAHIAooApgFIfEHIPAHIPEHEIABIAooApQFIfIHQQgh8wcg8gcg8wdqIfQHIAog9Ac2ApQFIAooApgFIfUHQQgh9gcg9Qcg9gdqIfcHIAog9wc2ApgFIAooApQFIfgHIAooApAFIfkHIPgHIfoHIPkHIfsHIPoHIPsHSSH8B0EBIf0HIPwHIP0HcSH+ByD+Bw0ACwwBC0EQIf8HIAooApwFIYAIIIAIIYEIIP8HIYIIIIEIIIIITiGDCEEBIYQIIIMIIIQIcSGFCAJAIIUIDQBBcCGGCCAKKAKcBSGHCCCHCCGICCCGCCGJCCCICCCJCEwhighBASGLCCCKCCCLCHEhjAggjAgNABAAC0EQIY0IIAooApQFIY4IIAooApgFIY8III4III8IEH8gCigCpAUhkAggjQghkQggkAghkgggkQggkghOIZMIQQEhlAggkwgglAhxIZUIAkAglQhFDQAMAQsgCigClAUhlghBECGXCCCWCCCXCGohmAggCiCYCDYClAUgCigCmAUhmQhBECGaCCCZCCCaCGohmwggCiCbCDYCmAUDQCAKKAKUBSGcCCAKKAKYBSGdCCCcCCCdCBB/IAooApQFIZ4IQRAhnwggngggnwhqIaAIIAogoAg2ApQFIAooApgFIaEIQRAhogggoQggoghqIaMIIAogowg2ApgFIAooApQFIaQIIAooApgFIaUIIKQIIKUIEH8gCigClAUhpghBECGnCCCmCCCnCGohqAggCiCoCDYClAUgCigCmAUhqQhBECGqCCCpCCCqCGohqwggCiCrCDYCmAUgCigClAUhrAggCigCkAUhrQggrAghrgggrQghrwggrgggrwhJIbAIQQEhsQggsAggsQhxIbIIILIIDQALCyAKKALIBCGzCCAKILMINgLsBAwBC0EQIbQIIAooAqgEIbUIILUIIbYIILQIIbcIILYIILcISSG4CEEBIbkIILgIILkI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IXcgdy0AASF4QRgheSB4IHl0IXogeiB5dSF7IHshfCB2IX0gfCB9RyF+QQEhfyB+IH9xIYABIIABDQBBwwAhgQEgAygCyIABIYIBIIIBLQACIYMBQRghhAEggwEghAF0IYUBIIUBIIQBdSGGASCGASGHASCBASGIASCHASCIAUchiQFBASGKASCJASCKAXEhiwEgiwENAEH6ACGMASADKALIgAEhjQEgjQEtAAMhjgFBGCGPASCOASCPAXQhkAEgkAEgjwF1IZEBIJEBIZIBIIwBIZMBIJIBIJMBRyGUAUEBIZUBIJQBIJUBcSGWASCWAUUNAQsMBAsLDAELIAMoAtiAASGXASCXASgCCCGYASADIJgBNgK4gAEgAygCyIABIZkBQRAhmgEgmQEgmgFqIZsBIAMoAriAASGcAUEBIZ0BIJwBIJ0BaiGeAUECIZ8BIJ4BIJ8BdCGgASCbASCgAWohoQEgoQEoAgAhogEgAygCyIABIaMBQRAhpAEgowEgpAFqIaUBIAMoAriAASGmAUECIacBIKYBIKcBdCGoASClASCoAWohqQEgqQEoAgAhqgEgogEgqgFrIasBIAMgqwE2ArSAASADKALYgAEhrAEgrAEoAgQhrQEgAygCxIABIa4BIK0BIK4BayGvASADIK8BNgKwgAEgAygCsIABIbABIAMoArSAASGxASCwASGyASCxASGzASCyASCzAUkhtAFBASG1ASC0ASC1AXEhtgECQCC2AUUNACADKAK0gAEhtwEgAygCsIABIbgBILcBILgBayG5ASADKALQgAEhugEguQEhuwEgugEhvAEguwEgvAFJIb0BQQEhvgEgvQEgvgFxIb8BAkACQCC/AUUNACADKAK0gAEhwAEgAygCsIABIcEBIMABIMEBayHCASDCASHDAQwBCyADKALQgAEhxAEgxAEhwwELIMMBIcUBIAMgxQE2AqyAASADKALYgAEhxgFBDCHHASDGASDHAWohyAEgAygC2IABIckBIMkBKAIEIcoBIMgBIMoBaiHLASADKALUgAEhzAEgAygCrIABIc0BIMsBIMwBIM0BEA0aIAMoAqyAASHOASADKALYgAEhzwEgzwEoAgQh0AEg0AEgzgFqIdEBIM8BINEBNgIEIAMoAqyAASHSASADKALUgAEh0wEg0wEg0gFqIdQBIAMg1AE2AtSA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IRwgGyAcayEdIAMgHTYCCAtBASEeQQQhHyADLwESISAgAygCGCEhIAMoAgwhIiAhICJqISMgAygCCCEkQf//AyElICAgJXEhJiAmICMgJBCpASEnIAMgJzsBEiADKAIcISggKCAfEJgBIAMoAhwhKSADLwESISpB//8DISsgKiArcSEsICkgLBCaAUEgIS0gAyAtaiEuIC4kACAeDwuIAQEQfyMAIQFBECECIAEgAmshAyADJAAgAyAANgIMA39BfSEEQYCAgIAEIQUgAygCDCEGIAYgBRCsASEHIAMgBzYCCCADKAIIIQggCCEJIAQhCiAJIApHIQtBASEMIAsgDHEhDQJAIA1FDQAgAygCCCEOQRAhDyADIA9qIRAgECQAIA4PCwwACwuSKgP9A38IfgF9IwAhAkGgAiEDIAIgA2shBCAEJABBACEFIAQgADYCmAIgBCABNgKUAiAEKAKYAiEGIAQgBjYCkAIgBCgCkAIhByAHKAIAIQggBCAINgKMAiAEKAKQAiEJIAkvAQQhCkH//wMhCyAKIAtxIQwgBCAMNgKIAiAEKAKQAiENIA0vAYwwIQ5B//8DIQ8gDiAPcSEQIAQgEDYChAIgBCAFNgKAAgJAAkADQCAEKAKAAiERIAQoApQCIRIgESETIBIhFCATIBRIIRVBASEWIBUgFnEhFyAXRQ0BIAQoAoQCIRggBCgCiAIhGSAYIRogGSEbIBogG0khHEEBIR0gHCAdcSEeAkACQCAeRQ0AQQEhH0EBISAgHyAgcSEhICENAQsQAAsgBCgCjAIhIiAEKAKEAiEjQQEhJCAjICRqISUgBCAlNgKEAiAiICNqISYgJi0AACEnIAQgJzoA/wEgBC0A/wEhKEEAISkCQAJAICkNAAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAoDoACAAIDBAsFDhAQEA8PDA0RERERERERERESEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISBwgGCQoSEhISEhISEhISAQALDBILQX8hKkEAIStBACEsIAQoApACIS0gLSAsNgIAIAQoApACIS4gLiArOwEEIAQoApACIS8gLyArOwGMMCAEICo2ApwCDBQLIAQoAoQCITBBASExIDAgMWohMiAEKAKQAiEzIDMgMjsBjDAgBCgCjAIhNCAEKAKEAiE1IDQgNWohNiA2LQAAITdB/wEhOCA3IDhxITkgBCA5NgKcAgwTCyAEKAKYAiE6IAQoAowCITsgBCgChAIhPCA7IDxqIT0gPS0AACE+Qf8BIT8gPiA/cSFAIDogQBCYASAEKAKEAiFBQQEhQiBBIEJqIUMgBCBDNgKEAgwPCyAEKAKYAiFEIAQoAowCIUUgBCgChAIhRiBFIEZqIUcgRy0AACFIQf8BIUkgSCBJcSFKQYABIUsgSiBLayFMIEQgTBCUASAEKAKEAiFNQQEhTiBNIE5qIU8gBCBPNgKEAgwOCyAEKAKYAiFQIAQoAowCIVEgBCgChAIhUiBRIFJqIVMgUy0AACFUQf8BIVUgVCBVcSFWIFAgVhCdARogBCgChAIhV0EBIVggVyBYaiFZIAQgWTYChAIMDQsgBCgCmAIhWiAEKAKMAiFbIAQoAoQCIVwgWyBcaiFdIF0QrQEhhwQgWiCHBBCZASAEKAKEAiFeQQQhXyBeIF9qIWAgBCBgNgKEAgwMCyAEKAKYAiFhIAQoAowCIWIgBCgChAIhYyBiIGNqIWQgZBCuASFlIGEgZRCaASAEKAKEAiFmQQQhZyBmIGdqIWggBCBoNgKEAgwLCyAEKAKYAiFpIAQoAowCIWogBCgChAIhayBqIGtqIWwgbBCvASFtIGkgbRCbASAEKAKEAiFuQQQhbyBuIG9qIXAgBCBwNgKEAgwKC0GgHyFxIAQoApgCIXIgBCgCjAIhcyAEKAKEAiF0IHMgdGohdSB1LQAAIXZB/wEhdyB2IHdxIXhBAiF5IHggeXQheiBxIHpqIXsgeygCACF8IHIgfBCcASAEKAKEAiF9QQEhfiB9IH5qIX8gBCB/NgKEAgwJC0EAIYABIAQoAowCIYEBIAQoAoQCIYIBIIEBIIIBaiGDASCDAS0AACGEAUH/ASGFASCEASCFAXEhhgFBCCGHASCGASCHAXQhiAEgBCgCjAIhiQEgBCgChAIhigFBASGLASCKASCLAWohjAEgiQEgjAFqIY0BII0BLQAAIY4BQf8BIY8BII4BII8BcSGQASCIASCQAXIhkQEgBCCRATsB/AEgBCCAATYC+AECQANAIAQoAvgBIZIBIAQoApACIZMBIJMBLQDQNiGUAUH/ASGVASCUASCVAXEhlgEgkgEhlwEglgEhmAEglwEgmAFIIZkBQQEhmgEgmQEgmgFxIZsBIJsBRQ0BIAQoApACIZwBQdAwIZ0BIJwBIJ0BaiGeASAEKAL4ASGfAUEBIaABIJ8BIKABdCGhASCeASChAWohogEgogEvAQAhowFB//8DIaQBIKMBIKQBcSGlASAELwH8ASGmAUH//wMhpwEgpgEgpwFxIagBIKUBIakBIKgBIaoBIKkBIKoBRiGrAUEBIawBIKsBIKwBcSGtAQJAIK0BRQ0AIAQoApgCIa4BIAQoApACIa8BQdAyIbABIK8BILABaiGxASAEKAL4ASGyAUECIbMBILIBILMBdCG0ASCxASC0AWohtQEgtQEoAgAhtgEgrgEgtgEQnAEMAgsgBCgC+AEhtwFBASG4ASC3ASC4AWohuQEgBCC5ATYC+AEMAAALAAsgBCgC+AEhugEgBCgCkAIhuwEguwEtANA2IbwBQf8BIb0BILwBIL0BcSG+ASC6ASG/ASC+ASHAASC/ASDAAU4hwQFBASHCASDBASDCAXEhwwECQCDDAUUNABAACyAEKAKEAiHEAUECIcUBIMQBIMUBaiHGASAEIMYBNgKEAgwICyAEKAKYAiHHASAEKAKMAiHIASAEKAKEAiHJASDIASDJAWohygEgygEtAAAhywFB/wEhzAEgywEgzAFxIc0BQYABIc4BIM0BIM4BayHPASDHASDPARCVASAEKAKEAiHQAUEBIdEBINABINEBaiHSASAEINIBNgKEAgwHCyAEKAKMAiHTASAEKAKEAiHUASDTASDUAWoh1QEg1QEvAAAh1gEgBCDWATYC9AEgBCgChAIh1wFBAiHYASDXASDYAWoh2QEgBCDZATYC8AEgBCgC8AEh2gEgBCgCkAIh2wFBjjAh3AEg2wEg3AFqId0BINsBLwHOMCHeAUEBId8BIN4BIN8BaiHgASDbASDgATsBzjBB//8DIeEBIN4BIOEBcSHiAUEBIeMBIOIBIOMBdCHkASDdASDkAWoh5QEg5QEg2gE7AQAgBCgC9AEh5gEgBCDmATYChAIMBgsgBCgCkAIh5wFBjjAh6AEg5wEg6AFqIekBIOcBLwHOMCHqAUF/IesBIOoBIOsBaiHsASDnASDsATsBzjBB//8DIe0BIOwBIO0BcSHuAUEBIe8BIO4BIO8BdCHwASDpASDwAWoh8QEg8QEvAQAh8gFB//8DIfMBIPIBIPMBcSH0ASAEIPQBNgKEAgwFCyAEKAKMAiH1ASAEKAKEAiH2ASD1ASD2AWoh9wEg9wEtAAAh+AFB/wEh+QEg+AEg+QFxIfoBIAQoAowCIfsBIAQoAoQCIfwBQQEh/QEg/AEg/QFqIf4BIPsBIP4BaiH/ASD/AS0AACGAAkH/ASGBAiCAAiCBAnEhggJBCCGDAiCCAiCDAnQhhAIg+gEghAJyIYUCIAQghQI2AoQCDAQLQdgBIYYCIAQghgJqIYcCIIcCIYgCIAQoAowCIYkCIAQoAoQCIYoCQQEhiwIgigIgiwJqIYwCIAQgjAI2AoQCIIkCIIoCaiGNAiCNAi0AACGOAkH/ASGPAiCOAiCPAnEhkAJBgAEhkQIgkAIgkQJrIZICIAQgkgI2AuwBIAQoApgCIZMCIAQoAuwBIZQCIIgCIJMCIJQCEI4BQQghlQJBCCGWAiAEIJYCaiGXAiCXAiCVAmohmAJB2AEhmQIgBCCZAmohmgIgmgIglQJqIZsCIJsCKAIAIZwCIJgCIJwCNgIAIAQpA9gBIf8DIAQg/wM3AwhBCCGdAiAEIJ0CaiGeAiCeAhCSASGfAkEKIaACQQAhoQIgnwIhogIgoQIhowIgogIgowJGIaQCQQEhpQIgpAIgpQJxIaYCIAQgpgI2AugBIAQtAP8BIacCQf8BIagCIKcCIKgCcSGpAiCpAiGqAiCgAiGrAiCqAiCrAkYhrAJBASGtAiCsAiCtAnEhrgIgBCCuAjYC1AEgBCgCjAIhrwIgBCgChAIhsAIgrwIgsAJqIbECILECLQAAIbICQf8BIbMCILICILMCcSG0AiAEKAKMAiG1AiAEKAKEAiG2AkEBIbcCILYCILcCaiG4AiC1AiC4AmohuQIguQItAAAhugJB/wEhuwIgugIguwJxIbwCQQghvQIgvAIgvQJ0Ib4CILQCIL4CciG/AiAEIL8CNgLQASAEKALoASHAAiAEKALUASHBAiDAAiHCAiDBAiHDAiDCAiDDAkYhxAJBASHFAiDEAiDFAnEhxgICQAJAIMYCRQ0AIAQoAtABIccCIMcCIcgCDAELIAQoAoQCIckCQQIhygIgyQIgygJqIcsCIMsCIcgCCyDIAiHMAiAEIMwCNgKEAgwDCyAEKAKMAiHNAiAEKAKEAiHOAkEBIc8CIM4CIM8CaiHQAiAEINACNgKEAiDNAiDOAmoh0QIg0QItAAAh0gJBgH8h0wIg0gIg0wJqIdQCIAQg1AI2AswBIAQoAowCIdUCIAQoAoQCIdYCINYCIM8CaiHXAiAEINcCNgKEAiDVAiDWAmoh2AIg2AItAAAh2QIg2QIg0wJqIdoCIAQg2gI2AsgBIAQoAowCIdsCIAQoAoQCIdwCINsCINwCaiHdAiDdAi8AACHeAiAEIN4CNgLEASAEKAKYAiHfAiAEKALMASHgAkG4ASHhAiAEIOECaiHiAiDiAiDfAiDgAhCOASAEKAKYAiHjAiAEKALIASHkAkGoASHlAiAEIOUCaiHmAiDmAiDjAiDkAhCOAUEAIecCIAQg5wI2AqQBIAQtAP8BIegCQXkh6QIg6AIg6QJqIeoCQQIh6wIg6gIg6wJLGgJAAkACQAJAIOoCDgMCAAEDC0EIIewCQSgh7QIgBCDtAmoh7gIg7gIg7AJqIe8CQbgBIfACIAQg8AJqIfECIPECIOwCaiHyAiDyAigCACHzAiDvAiDzAjYCACAEKQO4ASGABCAEIIAENwMoQRgh9AIgBCD0Amoh9QIg9QIg7AJqIfYCQagBIfcCIAQg9wJqIfgCIPgCIOwCaiH5AiD5AigCACH6AiD2AiD6AjYCACAEKQOoASGBBCAEIIEENwMYQSgh+wIgBCD7Amoh/AJBGCH9AiAEIP0CaiH+AiD8AiD+AhCwASH/AiAEIP8CNgKkAQwCC0EIIYADQcgAIYEDIAQggQNqIYIDIIIDIIADaiGDA0G4ASGEAyAEIIQDaiGFAyCFAyCAA2ohhgMghgMoAgAhhwMggwMghwM2AgAgBCkDuAEhggQgBCCCBDcDSEE4IYgDIAQgiANqIYkDIIkDIIADaiGKA0GoASGLAyAEIIsDaiGMAyCMAyCAA2ohjQMgjQMoAgAhjgMgigMgjgM2AgAgBCkDqAEhgwQgBCCDBDcDOEHIACGPAyAEII8DaiGQA0E4IZEDIAQgkQNqIZIDIJADIJIDELEBIZMDIAQgkwM2AqQBDAELQQghlANB6AAhlQMgBCCVA2ohlgMglgMglANqIZcDQbgBIZgDIAQgmANqIZkDIJkDIJQDaiGaAyCaAygCACGbAyCXAyCbAzYCACAEKQO4ASGEBCAEIIQENwNoQdgAIZwDIAQgnANqIZ0DIJ0DIJQDaiGeA0GoASGfAyAEIJ8DaiGgAyCgAyCUA2ohoQMgoQMoAgAhogMgngMgogM2AgAgBCkDqAEhhQQgBCCFBDcDWEHoACGjAyAEIKMDaiGkA0HYACGlAyAEIKUDaiGmAyCkAyCmAxCyASGnAyAEIKcDNgKkAQsgBCgCpAEhqAMCQAJAIKgDRQ0AIAQoAsQBIakDIKkDIaoDDAELIAQoAoQCIasDQQIhrAMgqwMgrANqIa0DIK0DIaoDCyCqAyGuAyAEIK4DNgKEAgwCC0GIASGvAyAEIK8DaiGwAyCwAyGxAyAEKAKMAiGyAyAEKAKEAiGzA0EBIbQDILMDILQDaiG1AyAEILUDNgKEAiCyAyCzA2ohtgMgtgMtAAAhtwNB/wEhuAMgtwMguANxIbkDQYABIboDILkDILoDayG7AyAEILsDNgKgASAELQD/ASG8A0H/ASG9AyC8AyC9A3EhvgNBAiG/AyC+AyC/A2ohwANBDiHBAyDAAyDBA2shwgMgBCDCAzYCnAEgBCgCmAIhwwMgBCgCoAEhxAMgsQMgwwMgxAMQjgFBCCHFA0H4ACHGAyAEIMYDaiHHAyDHAyDFA2ohyANBiAEhyQMgBCDJA2ohygMgygMgxQNqIcsDIMsDKAIAIcwDIMgDIMwDNgIAIAQpA4gBIYYEIAQghgQ3A3hB+AAhzQMgBCDNA2ohzgMgzgMQkwEhzwMgBCDPAzYCmAEgBCgCmAEh0AMgBCgCnAEh0QMg0AMh0gMg0QMh0wMg0gMg0wNJIdQDQQEh1QMg1AMg1QNxIdYDAkACQCDWA0UNACAEKAKMAiHXAyAEKAKEAiHYAyAEKAKYASHZA0EBIdoDINkDINoDdCHbAyDYAyDbA2oh3AMg1wMg3ANqId0DIN0DLQAAId4DQf8BId8DIN4DIN8DcSHgAyAEKAKMAiHhAyAEKAKEAiHiAyAEKAKYASHjA0EBIeQDIOMDIOQDdCHlAyDiAyDlA2oh5gNBASHnAyDmAyDnA2oh6AMg4QMg6ANqIekDIOkDLQAAIeoDQf8BIesDIOoDIOsDcSHsA0EIIe0DIOwDIO0DdCHuAyDgAyDuA3Ih7wMgBCDvAzYChAIMAQsgBCgCnAEh8ANBASHxAyDwAyDxA3Qh8gMgBCgChAIh8wMg8wMg8gNqIfQDIAQg9AM2AoQCCwwBC0F+IfUDEAAgBCD1AzYCnAIMAwsgBCgChAIh9gMgBCgCkAIh9wMg9wMg9gM7AYwwIAQoAoACIfgDQQEh+QMg+AMg+QNqIfoDIAQg+gM2AoACDAAACwALQX0h+wMgBCD7AzYCnAILIAQoApwCIfwDQaACIf0DIAQg/QNqIf4DIP4DJAAg/AMPC1wCCn8BfSMAIQFBECECIAEgAmshAyADJABBBCEEQQghBSADIAVqIQYgBiEHIAMgADYCDCADKAIMIQggByAIIAQQDRogAyoCCCELQRAhCSADIAlqIQogCiQAIAsPC1oBC38jACEBQRAhAiABIAJrIQMgAyQAQQQhBEEIIQUgAyAFaiEGIAYhByADIAA2AgwgAygCDCEIIAcgCCAEEA0aIAMoAgghCUEQIQogAyAKaiELIAskACAJDwtaAQt/IwAhAUEQIQIgASACayEDIAMkAEEEIQRBCCEFIAMgBWohBiAGIQcgAyAANgIMIAMoAgwhCCAHIAggBBANGiADKAIIIQlBECEKIAMgCmohCyALJAAgCQ8LtQMDMH8DfgJ9IwAhAkEwIQMgAiADayEEIAQkACAALQAAIQVBfyEGIAUgBmohB0ECIQggByAISxoCQAJAAkACQAJAIAcOAwABAgMLIAAqAgQhNUEIIQkgASAJaiEKIAooAgAhCyAEIAlqIQwgDCALNgIAIAEpAgAhMiAEIDI3AwAgBBCPASE2IDUgNlshDUEBIQ4gDSAOcSEPIAQgDzYCLAwDCyAAKAIEIRBBCCERIAEgEWohEiASKAIAIRNBECEUIAQgFGohFSAVIBFqIRYgFiATNgIAIAEpAgAhMyAEIDM3AxBBECEXIAQgF2ohGCAYEJIBIRkgECEaIBkhGyAaIBtGIRxBASEdIBwgHXEhHiAEIB42AiwMAgsgACgCBCEfQQghICABICBqISEgISgCACEiQSAhIyAEICNqISQgJCAgaiElICUgIjYCACABKQIAITQgBCA0NwMgQSAhJiAEICZqIScgJxCTASEoIB8hKSAoISogKSAqRiErQQEhLCArICxxIS0gBCAtNgIsDAELQQAhLhAAIAQgLjYCLAsgBCgCLCEvQTAhMCAEIDBqITEgMSQAIC8PC7UDAzB/A34CfSMAIQJBMCEDIAIgA2shBCAEJAAgAC0AACEFQX8hBiAFIAZqIQdBAiEIIAcgCEsaAkACQAJAAkACQCAHDgMAAQIDCyAAKgIEITVBCCEJIAEgCWohCiAKKAIAIQsgBCAJaiEMIAwgCzYCACABKQIAITIgBCAyNwMAIAQQjwEhNiA1IDZeIQ1BASEOIA0gDnEhDyAEIA82AiwMAwsgACgCBCEQQQghESABIBFqIRIgEigCACETQRAhFCAEIBRqIRUgFSARaiEWIBYgEzYCACABKQIAITMgBCAzNwMQQRAhFyAEIBdqIRggGBCSASEZIBAhGiAZIRsgGiAbSiEcQQEhHSAcIB1xIR4gBCAeNgIsDAILIAAoAgQhH0EIISAgASAgaiEhICEoAgAhIkEgISMgBCAjaiEkICQgIGohJSAlICI2AgAgASkCACE0IAQgNDcDIEEgISYgBCAmaiEnICcQkwEhKCAfISkgKCEqICkgKkshK0EBISwgKyAscSEtIAQgLTYCLAwBC0EAIS4QACAEIC42AiwLIAQoAiwhL0EwITAgBCAwaiExIDEkACAvDwu1AwMwfwN+An0jACECQTAhAyACIANrIQQgBCQAIAAtAAAhBUF/IQYgBSAGaiEHQQIhCCAHIAhLGgJAAkACQAJAAkAgBw4DAAECAwsgACoCBCE1QQghCSABIAlqIQogCigCACELIAQgCWohDCAMIAs2AgAgASkCACEyIAQgMjcDACAEEI8BITYgNSA2XSENQQEhDiANIA5xIQ8gBCAPNgIsDAMLIAAoAgQhEEEIIREgASARaiESIBIoAgAhE0EQIRQgBCAUaiEVIBUgEWohFiAWIBM2AgAgASkCACEzIAQgMzcDEEEQIRcgBCAXaiEYIBgQkgEhGSAQIRogGSEbIBogG0ghHEEBIR0gHCAdcSEeIAQgHjYCLAwCCyAAKAIEIR9BCCEgIAEgIGohISAhKAIAISJBICEjIAQgI2ohJCAkICBqISUgJSAiNgIAIAEpAgAhNCAEIDQ3AyBBICEmIAQgJmohJyAnEJMBISggHyEpICghKiApICpJIStBASEsICsgLHEhLSAEIC02AiwMAQtBACEuEAAgBCAuNgIsCyAEKAIsIS9BMCEwIAQgMGohMSAxJAAgLw8LdwILfwF+IwAhAUEQIQIgASACayEDIAMkACADIAA2AggQISEEAkACQCAERQ0AIAMoAgghBSAFEDwhBiADIAY2AgwMAQsgAygCCCEHIAcQSyEMIAynIQggAyAINgIMCyADKAIMIQlBECEKIAMgCmohCyALJAAgCQ8LlwECD38FfiMAIQJBECEDIAIgA2shBCAEJABBBCEFQgAhEUEIIQYgBCAGaiEHIAchCCAEIAA2AgwgBCABNgIIIAggBSAREIIBIRIgBCASNwMAIAQpAwAhEyAEKAIMIQkgCSgCBCEKQQEhCyAKIAtrIQwgDCENIA2tIRQgEyAUgyEVIBWnIQ5BECEPIAQgD2ohECAQJAAgDg8L8gMBNX8jACEDQcAAIQQgAyAEayEFIAUkAEEgIQZBHyEHIAUgADYCECAFIAE2AgwgBSACNgIIIAUoAgghCCAFIAg2AgQgBSgCBCEJIAUgCTYCACAFKAIMIQogBSgCACELIAsoAgQhDCAFIAo2AhwgBSAMNgIYIAUoAhwhDSAFKAIYIQ4gBSANNgIkIAUgDjYCICAFKAIkIQ8gDygCACEQIAUoAiQhESARKAIEIRIgBiASayETIAUoAiAhFCATIBRrIRUgBSgCICEWIAUgEDYCNCAFIBU2AjAgBSAWNgIsIAUgBzYCKCAFKAIsIRcgFyEYIAYhGSAYIBlJIRpBASEbIBogG3EhHAJAIBwNABAAC0HAHSEdIAUoAjQhHiAFKAIwIR9BHyEgIB8gIHEhISAeICF2ISIgBSgCLCEjQQIhJCAjICR0ISUgHSAlaiEmICYoAgAhJyAiICdxISggBSAoNgIUIAUoAhwhKSAFKAIYISogBSApNgI8IAUgKjYCOCAFKAI4ISsgBSgCPCEsICwoAgQhLSAtICtqIS4gLCAuNgIEIAUoAhQhLyAFKAIQITAgMCAvNgIAIAUoAgwhMSAxEB4aIAUoAgghMkEIITMgMiAzaiE0IAUoAhAhNSA1IDQ2AgRBwAAhNiAFIDZqITcgNyQADwvIAQEWfyMAIQJBICEDIAIgA2shBCAEJABBASEFIAQgADYCFCAEIAE2AhAgBCgCFCEGIAQoAhAhByAGIAcQICEIIAQgCDYCDCAEKAIQIQkgCSEKIAUhCyAKIAtPIQxBASENIAwgDXEhDgJAIA4NABAACyAEKAIUIQ8gBCgCECEQIAQgDzYCHCAEIBA2AhggBCgCGCERIAQoAhwhEiASKAIEIRMgEyARaiEUIBIgFDYCBCAEKAIMIRVBICEWIAQgFmohFyAXJAAgFQ8L7ggBggF/IwAhCEHAACEJIAggCWshCiAKJABBACELIAogADYCOCAKIAE2AjQgCiADNgIwIAogBDYCLCAKIAU2AiggCiAGNgIkIAogBzYCICAKKAI4IQwgAigCACENIAwgDWohDiAKIA42AhwgAigCACEPIAIoAgQhECAPIBBqIREgCiARNgIYIAooAjAhEiASKAIAIRMgAigCACEUIBMgFGohFSAKIBU2AhQgCigCHCEWIAIoAgghFyALIBdrIRggFiAYaiEZIAogGTYCECAKKAI0IRpBYCEbIBogG2ohHCAKIBw2AgwgCigCGCEdIAooAjQhHiAKKAI4IR8gHiAfayEgIB0hISAgISIgISAiSyEjQQEhJCAjICRxISUCQAJAICVFDQBBun8hJiAKICY2AjwMAQsgAigCACEnIAooAiwhKCAKKAIwISkgKSgCACEqICggKmshKyAnISwgKyEtICwgLUshLkEBIS8gLiAvcSEwAkAgMEUNAEFsITEgCiAxNgI8DAELIAooAjghMiAKKAI4ITMgCigCGCE0IDMgNGohNSAyITYgNSE3IDYgN0khOEEBITkgOCA5cSE6AkAgOg0AEAALIAooAhwhOyAKKAI4ITwgCigCGCE9IDwgPWohPiA7IT8gPiFAID8gQEkhQUEBIUIgQSBCcSFDAkAgQw0AEAALQQAhRCAKKAI4IUUgCigCDCFGIAooAjAhRyBHKAIAIUggAigCACFJIEUgRiBIIEkgRBC5ASAKKAIcIUogCiBKNgI4IAooAhQhSyAKKAIwIUwgTCBLNgIAIAIoAgghTSAKKAIcIU4gCigCKCFPIE4gT2shUCBNIVEgUCFSIFEgUkshU0EBIVQgUyBUcSFVAkAgVUUNACACKAIIIVYgCigCHCFXIAooAiQhWCBXIFhrIVkgViFaIFkhWyBaIFtLIVxBASFdIFwgXXEhXgJAIF5FDQBBbCFfIAogXzYCPAwCC0EAIWAgCigCICFhIAooAighYiAKKAIQIWMgYiBjayFkIGAgZGshZSBhIGVqIWYgCiBmNgIQIAooAhAhZyACKAIEIWggZyBoaiFpIAooAiAhaiBpIWsgaiFsIGsgbE0hbUEBIW4gbSBucSFvAkAgb0UNACAKKAIcIXAgCigCECFxIAIoAgQhciBwIHEgchAMGiAKKAIYIXMgCiBzNgI8DAILIAooAiAhdCAKKAIQIXUgdCB1ayF2IAogdjYCCCAKKAIcIXcgCigCECF4IAooAggheSB3IHggeRAMGiAKKAIcIXogCigCCCF7IHoge2ohfCAKIHw2AjggCigCCCF9IAIoAgQhfiB+IH1rIX8gAiB/NgIEIAooAighgAEgCiCAATYCEAtBASGBASAKKAI4IYIBIAooAgwhgwEgCigCECGEASACKAIEIYUBIIIBIIMBIIQBIIUBIIEBELkBIAooAhghhgEgCiCGATYCPAsgCigCPCGHAUHAACGIASAKIIgBaiGJASCJASQAIIcBDws+AQZ/IwAhAkEQIQMgAiADayEEIAQgADYCDCAEIAE2AgggBCgCDCEFIAQoAgghBiAGKAAAIQcgBSAHNgAADwubIAHCA38jACEFQfAAIQYgBSAGayEHIAckACAHIAA2AhwgByABNgIYIAcgAjYCFCAHIAM2AhAgByAENgIMIAcoAhwhCCAHKAIUIQkgCCAJayEKIAcgCjYCCCAHKAIcIQsgBygCECEMIAsgDGohDSAHIA02AgQgBygCDCEOAkACQCAODQBBeCEPIAcoAgghECAQIREgDyESIBEgEkwhE0EBIRQgEyAUcSEVIBUNAUEIIRYgBygCCCEXIBchGCAWIRkgGCAZTiEaQQEhGyAaIBtxIRwgHA0BIAcoAhwhHSAHKAIYIR4gHSEfIB4hICAfICBPISFBASEiICEgInEhIyAjDQELQQEhJCAHKAIMISUgJSEmICQhJyAmICdGIShBASEpICggKXEhKgJAICpFDQBBACErIAcoAgghLCAsIS0gKyEuIC0gLk4hL0EBITAgLyAwcSExIDENAQsQAAtBCCEyIAcoAhAhMyAzITQgMiE1IDQgNUghNkEBITcgNiA3cSE4AkACQCA4RQ0AAkADQCAHKAIcITkgBygCBCE6IDkhOyA6ITwgOyA8SSE9QQEhPiA9ID5xIT8gP0UNASAHKAIUIUBBASFBIEAgQWohQiAHIEI2AhQgQC0AACFDIAcoAhwhREEBIUUgRCBFaiFGIAcgRjYCHCBEIEM6AAAMAAALAAsMAQtBASFHIAcoAgwhSCBIIUkgRyFKIEkgSkYhS0EBIUwgSyBMcSFNAkAgTUUNAEEIIU4gBygCECFPIE8hUCBOIVEgUCBRTiFSQQEhUyBSIFNxIVQCQCBUDQAQAAtBFCFVIAcgVWohViBWIVdBHCFYIAcgWGohWSBZIVogBygCCCFbIAcgWjYCLCAHIFc2AiggByBbNgIkIAcoAighXCBcKAIAIV0gBygCLCFeIF4oAgAhXyBdIWAgXyFhIGAgYU0hYkEBIWMgYiBjcSFkAkAgZA0AEAALQQghZSAHKAIkIWYgZiFnIGUhaCBnIGhJIWlBASFqIGkganEhawJAAkAga0UNAEEAIWxBwB4hbUHgHiFuIAcoAiQhb0ECIXAgbyBwdCFxIG4gcWohciByKAIAIXMgByBzNgIgIAcoAighdCB0KAIAIXUgdS0AACF2IAcoAiwhdyB3KAIAIXggeCB2OgAAIAcoAigheSB5KAIAIXogei0AASF7IAcoAiwhfCB8KAIAIX0gfSB7OgABIAcoAighfiB+KAIAIX8gfy0AAiGAASAHKAIsIYEBIIEBKAIAIYIBIIIBIIABOgACIAcoAighgwEggwEoAgAhhAEghAEtAAMhhQEgBygCLCGGASCGASgCACGHASCHASCFAToAAyAHKAIkIYgBQQIhiQEgiAEgiQF0IYoBIG0gigFqIYsBIIsBKAIAIYwBIAcoAighjQEgjQEoAgAhjgEgjgEgjAFqIY8BII0BII8BNgIAIAcoAiwhkAEgkAEoAgAhkQFBBCGSASCRASCSAWohkwEgBygCKCGUASCUASgCACGVASCTASCVARC4ASAHKAIgIZYBIAcoAighlwEglwEoAgAhmAEgbCCWAWshmQEgmAEgmQFqIZoBIJcBIJoBNgIADAELIAcoAiwhmwEgmwEoAgAhnAEgBygCKCGdASCdASgCACGeASCcASCeARCAAQtBCCGfASAHKAIoIaABIKABKAIAIaEBQQghogEgoQEgogFqIaMBIKABIKMBNgIAIAcoAiwhpAEgpAEoAgAhpQFBCCGmASClASCmAWohpwEgpAEgpwE2AgAgBygCLCGoASCoASgCACGpASAHKAIoIaoBIKoBKAIAIasBIKkBIKsBayGsASCsASGtASCfASGuASCtASCuAU4hrwFBASGwASCvASCwAXEhsQECQCCxAQ0AEAALQQghsgEgBygCHCGzASAHKAIUIbQBILMBILQBayG1ASC1ASG2ASCyASG3ASC2ASC3AU4huAFBASG5ASC4ASC5AXEhugECQCC6AQ0AEAALIAcoAhwhuwEgBygCBCG8ASC7ASG9ASC8ASG+ASC9ASC+AU0hvwFBASHAASC/ASDAAXEhwQECQCDBAQ0AEAALCyAHKAIEIcIBIAcoAhghwwEgwgEhxAEgwwEhxQEgxAEgxQFNIcYBQQEhxwEgxgEgxwFxIcgBAkAgyAFFDQBBCCHJASAHKAIcIcoBIAcoAhQhywEgBygCECHMASAHKAIMIc0BIAcgygE2AkwgByDLATYCSCAHIMwBNgJEIAcgzQE2AkAgBygCTCHOASAHKAJIIc8BIM4BIM8BayHQASAHINABNgI8IAcoAkgh0QEgByDRATYCOCAHKAJMIdIBIAcg0gE2AjQgBygCNCHTASAHKAJEIdQBINMBINQBaiHVASAHINUBNgIwIAcoAjwh1gEg1gEh1wEgyQEh2AEg1wEg2AFOIdkBQQEh2gEg2QEg2gFxIdsBAkAg2wENACAHKAJAIdwBAkAg3AENAEFwId0BIAcoAjwh3gEg3gEh3wEg3QEh4AEg3wEg4AFMIeEBQQEh4gEg4QEg4gFxIeMBIOMBDQELEAALQQEh5AEgBygCQCHlASDlASHmASDkASHnASDmASDnAUYh6AFBASHpASDoASDpAXEh6gECQAJAIOoBRQ0AQRAh6wEgBygCPCHsASDsASHtASDrASHuASDtASDuAUgh7wFBASHwASDvASDwAXEh8QEg8QFFDQADQCAHKAI0IfIBIAcoAjgh8wEg8gEg8wEQgAEgBygCNCH0AUEIIfUBIPQBIPUBaiH2ASAHIPYBNgI0IAcoAjgh9wFBCCH4ASD3ASD4AWoh+QEgByD5ATYCOCAHKAI0IfoBIAcoAjAh+wEg+gEh/AEg+wEh/QEg/AEg/QFJIf4BQQEh/wEg/gEg/wFxIYACIIACDQALDAELQRAhgQIgBygCPCGCAiCCAiGDAiCBAiGEAiCDAiCEAk4hhQJBASGGAiCFAiCGAnEhhwICQCCHAg0AQXAhiAIgBygCPCGJAiCJAiGKAiCIAiGLAiCKAiCLAkwhjAJBASGNAiCMAiCNAnEhjgIgjgINABAAC0EQIY8CIAcoAjQhkAIgBygCOCGRAiCQAiCRAhB/IAcoAkQhkgIgjwIhkwIgkgIhlAIgkwIglAJOIZUCQQEhlgIglQIglgJxIZcCAkAglwJFDQAMAQsgBygCNCGYAkEQIZkCIJgCIJkCaiGaAiAHIJoCNgI0IAcoAjghmwJBECGcAiCbAiCcAmohnQIgByCdAjYCOANAIAcoAjQhngIgBygCOCGfAiCeAiCfAhB/IAcoAjQhoAJBECGhAiCgAiChAmohogIgByCiAjYCNCAHKAI4IaMCQRAhpAIgowIgpAJqIaUCIAcgpQI2AjggBygCNCGmAiAHKAI4IacCIKYCIKcCEH8gBygCNCGoAkEQIakCIKgCIKkCaiGqAiAHIKoCNgI0IAcoAjghqwJBECGsAiCrAiCsAmohrQIgByCtAjYCOCAHKAI0Ia4CIAcoAjAhrwIgrgIhsAIgrwIhsQIgsAIgsQJJIbICQQEhswIgsgIgswJxIbQCILQCDQALCwwBCyAHKAIcIbUCIAcoAhghtgIgtQIhtwIgtgIhuAIgtwIguAJNIbkCQQEhugIguQIgugJxIbsCAkAguwJFDQAgBygCBCG8AiAHKAIYIb0CILwCIb4CIL0CIb8CIL4CIL8CSyHAAkEBIcECIMACIMECcSHCAgJAIMICDQAQAAtBCCHDAiAHKAIcIcQCIAcoAhQhxQIgBygCGCHGAiAHKAIcIccCIMYCIMcCayHIAiAHKAIMIckCIAcgxAI2AmwgByDFAjYCaCAHIMgCNgJkIAcgyQI2AmAgBygCbCHKAiAHKAJoIcsCIMoCIMsCayHMAiAHIMwCNgJcIAcoAmghzQIgByDNAjYCWCAHKAJsIc4CIAcgzgI2AlQgBygCVCHPAiAHKAJkIdACIM8CINACaiHRAiAHINECNgJQIAcoAlwh0gIg0gIh0wIgwwIh1AIg0wIg1AJOIdUCQQEh1gIg1QIg1gJxIdcCAkAg1wINACAHKAJgIdgCAkAg2AINAEFwIdkCIAcoAlwh2gIg2gIh2wIg2QIh3AIg2wIg3AJMId0CQQEh3gIg3QIg3gJxId8CIN8CDQELEAALQQEh4AIgBygCYCHhAiDhAiHiAiDgAiHjAiDiAiDjAkYh5AJBASHlAiDkAiDlAnEh5gICQAJAIOYCRQ0AQRAh5wIgBygCXCHoAiDoAiHpAiDnAiHqAiDpAiDqAkgh6wJBASHsAiDrAiDsAnEh7QIg7QJFDQADQCAHKAJUIe4CIAcoAlgh7wIg7gIg7wIQgAEgBygCVCHwAkEIIfECIPACIPECaiHyAiAHIPICNgJUIAcoAlgh8wJBCCH0AiDzAiD0Amoh9QIgByD1AjYCWCAHKAJUIfYCIAcoAlAh9wIg9gIh+AIg9wIh+QIg+AIg+QJJIfoCQQEh+wIg+gIg+wJxIfwCIPwCDQALDAELQRAh/QIgBygCXCH+AiD+AiH/AiD9AiGAAyD/AiCAA04hgQNBASGCAyCBAyCCA3EhgwMCQCCDAw0AQXAhhAMgBygCXCGFAyCFAyGGAyCEAyGHAyCGAyCHA0whiANBASGJAyCIAyCJA3EhigMgigMNABAAC0EQIYsDIAcoAlQhjAMgBygCWCGNAyCMAyCNAxB/IAcoAmQhjgMgiwMhjwMgjgMhkAMgjwMgkANOIZEDQQEhkgMgkQMgkgNxIZMDAkAgkwNFDQAMAQsgBygCVCGUA0EQIZUDIJQDIJUDaiGWAyAHIJYDNgJUIAcoAlghlwNBECGYAyCXAyCYA2ohmQMgByCZAzYCWANAIAcoAlQhmgMgBygCWCGbAyCaAyCbAxB/IAcoAlQhnANBECGdAyCcAyCdA2ohngMgByCeAzYCVCAHKAJYIZ8DQRAhoAMgnwMgoANqIaEDIAcgoQM2AlggBygCVCGiAyAHKAJYIaMDIKIDIKMDEH8gBygCVCGkA0EQIaUDIKQDIKUDaiGmAyAHIKYDNgJUIAcoAlghpwNBECGoAyCnAyCoA2ohqQMgByCpAzYCWCAHKAJUIaoDIAcoAlAhqwMgqgMhrAMgqwMhrQMgrAMgrQNJIa4DQQEhrwMgrgMgrwNxIbADILADDQALCyAHKAIYIbEDIAcoAhwhsgMgsQMgsgNrIbMDIAcoAhQhtAMgtAMgswNqIbUDIAcgtQM2AhQgBygCGCG2AyAHILYDNgIcCwNAIAcoAhwhtwMgBygCBCG4AyC3AyG5AyC4AyG6AyC5AyC6A0khuwNBASG8AyC7AyC8A3EhvQMgvQNFDQEgBygCFCG+A0EBIb8DIL4DIL8DaiHAAyAHIMADNgIUIL4DLQAAIcEDIAcoAhwhwgNBASHDAyDCAyDDA2ohxAMgByDEAzYCHCDCAyDBAzoAAAwAAAsAC0HwACHFAyAHIMUDaiHGAyDGAyQADwvcBgNbfwN+Bn0jACEBQeAAIQIgASACayEDIAMkAEECIQRBOCEFIAMgBWohBiAGIQdByAAhCCADIAhqIQkgCSEKQQEhCyADIAA2AlggAygCWCEMIAogDCALEI4BIAMoAlghDSAHIA0gBBCOASADKAJYIQ4gDiAEEJgBIAMtAEghD0H/ASEQIA8gEHEhESADLQA4IRJB/wEhEyASIBNxIRQgESEVIBQhFiAVIBZGIRdBASEYIBcgGHEhGQJAAkACQCAZRQ0AIAMtAEghGkF/IRsgGiAbaiEcQQIhHSAcIB1LGgJAAkACQAJAIBwOAwIAAQMLQQEhHiADKAJYIR8gAygCTCEgIAMoAjwhISAgICFrISIgHyAiEJoBIAMgHjYCXAwFC0EBISMgAygCWCEkIAMoAkwhJSADKAI8ISYgJSAmayEnICQgJxCbASADICM2AlwMBAtBASEoIAMoAlghKSADKgJMIV8gAyoCPCFgIF8gYJMhYSApIGEQmQEgAyAoNgJcDAMLDAELIAMtAEghKkF/ISsgKiAraiEsQQIhLSAsIC1LGgJAAkACQAJAICwOAwIAAQMLIAMoAlghLiADKAJMIS9BCCEwQQghMSADIDFqITIgMiAwaiEzQTghNCADIDRqITUgNSAwaiE2IDYoAgAhNyAzIDc2AgAgAykDOCFcIAMgXDcDCEEIITggAyA4aiE5IDkQkgEhOkEBITsgLyA6ayE8IC4gPBCaASADIDs2AlwMBAsgAygCWCE9IAMoAkwhPkEIIT9BGCFAIAMgQGohQSBBID9qIUJBOCFDIAMgQ2ohRCBEID9qIUUgRSgCACFGIEIgRjYCACADKQM4IV0gAyBdNwMYQRghRyADIEdqIUggSBCTASFJQQEhSiA+IElrIUsgPSBLEJsBIAMgSjYCXAwDCyADKAJYIUwgAyoCTCFiQQghTUEoIU4gAyBOaiFPIE8gTWohUEE4IVEgAyBRaiFSIFIgTWohUyBTKAIAIVQgUCBUNgIAIAMpAzghXiADIF43AyhBKCFVIAMgVWohViBWEI8BIWNBASFXIGIgY5MhZCBMIGQQmQEgAyBXNgJcDAILC0EAIVgQACADIFg2AlwLIAMoAlwhWUHgACFaIAMgWmohWyBbJAAgWQ8L/QUDTn8Dfgd9IwAhAUHgACECIAEgAmshAyADJAAgAyAANgJYIAMoAlghBEEBIQVByAAhBiADIAZqIQcgByAEIAUQjgEgAygCWCEIQQIhCUE4IQogAyAKaiELIAsgCCAJEI4BIAMoAlghDCAMIAkQmAEgAy0ASCENQX8hDiANIA5qIQ8gDyAJSxoCQAJAAkACQAJAIA8OAwIAAQMLQQghECADIBBqIRFBOCESIAMgEmohEyATIBBqIRQgFCgCACEVIBEgFTYCACADKQM4IU8gAyBPNwMAIAMQkgEhFiADIBY2AjQgAygCWCEXIAMoAkwhGCADKAI0IRkgGCEaIBkhGyAaIBtIIRxBASEdIBwgHXEhHgJAAkAgHkUNACADKAJMIR8gHyEgDAELIAMoAjQhISAhISALICAhIkEBISMgFyAiEJoBIAMgIzYCXAwDC0EIISRBECElIAMgJWohJiAmICRqISdBOCEoIAMgKGohKSApICRqISogKigCACErICcgKzYCACADKQM4IVAgAyBQNwMQQRAhLCADICxqIS0gLRCTASEuIAMgLjYCMCADKAJYIS8gAygCTCEwIAMoAjAhMSAwITIgMSEzIDIgM0khNEEBITUgNCA1cSE2AkACQCA2RQ0AIAMoAkwhNyA3ITgMAQsgAygCMCE5IDkhOAsgOCE6QQEhOyAvIDoQmwEgAyA7NgJcDAILQQghPEEgIT0gAyA9aiE+ID4gPGohP0E4IUAgAyBAaiFBIEEgPGohQiBCKAIAIUMgPyBDNgIAIAMpAzghUSADIFE3AyBBICFEIAMgRGohRSBFEI8BIVIgAyBSOAIsIAMoAlghRiADKgJMIVMgAyoCLCFUIFMgVF0hR0EBIUggRyBIcSFJAkACQCBJRQ0AIAMqAkwhVSBVIVYMAQsgAyoCLCFXIFchVgsgViFYQQEhSiBGIFgQmQEgAyBKNgJcDAELQQAhSxAAIAMgSzYCXAsgAygCXCFMQeAAIU0gAyBNaiFOIE4kACBMDwv9BQNOfwN+B30jACEBQeAAIQIgASACayEDIAMkACADIAA2AlggAygCWCEEQQEhBUHIACEGIAMgBmohByAHIAQgBRCOASADKAJYIQhBAiEJQTghCiADIApqIQsgCyAIIAkQjgEgAygCWCEMIAwgCRCYASADLQBIIQ1BfyEOIA0gDmohDyAPIAlLGgJAAkACQAJAAkAgDw4DAgABAwtBCCEQIAMgEGohEUE4IRIgAyASaiETIBMgEGohFCAUKAIAIRUgESAVNgIAIAMpAzghTyADIE83AwAgAxCSASEWIAMgFjYCNCADKAJYIRcgAygCTCEYIAMoAjQhGSAYIRogGSEbIBogG0ohHEEBIR0gHCAdcSEeAkACQCAeRQ0AIAMoAkwhHyAfISAMAQsgAygCNCEhICEhIAsgICEiQQEhIyAXICIQmgEgAyAjNgJcDAMLQQghJEEQISUgAyAlaiEmICYgJGohJ0E4ISggAyAoaiEpICkgJGohKiAqKAIAISsgJyArNgIAIAMpAzghUCADIFA3AxBBECEsIAMgLGohLSAtEJMBIS4gAyAuNgIwIAMoAlghLyADKAJMITAgAygCMCExIDAhMiAxITMgMiAzSyE0QQEhNSA0IDVxITYCQAJAIDZFDQAgAygCTCE3IDchOAwBCyADKAIwITkgOSE4CyA4ITpBASE7IC8gOhCbASADIDs2AlwMAgtBCCE8QSAhPSADID1qIT4gPiA8aiE/QTghQCADIEBqIUEgQSA8aiFCIEIoAgAhQyA/IEM2AgAgAykDOCFRIAMgUTcDIEEgIUQgAyBEaiFFIEUQjwEhUiADIFI4AiwgAygCWCFGIAMqAkwhUyADKgIsIVQgUyBUXiFHQQEhSCBHIEhxIUkCQAJAIElFDQAgAyoCTCFVIFUhVgwBCyADKgIsIVcgVyFWCyBWIVhBASFKIEYgWBCZASADIEo2AlwMAQtBACFLEAAgAyBLNgJcCyADKAJcIUxB4AAhTSADIE1qIU4gTiQAIEwPC3IBDH8jACEBQRAhAiABIAJrIQMgAyQAQQEhBEF/IQUgAyAANgIMIAMoAgwhBiAGIAUQpAEhByADIAc2AgggAygCDCEIIAggBBCYASADKAIMIQkgAygCCCEKIAkgChCaAUEQIQsgAyALaiEMIAwkACAEDwvNAwE7fyMAIQFBMCECIAEgAmshAyADJABBICEEIAMgBGohBSAFIQZBECEHIAMgB2ohCCAIIQlBAiEKQQEhCyADIAA2AiwgAygCLCEMIAYgDCALEI4BIAMoAiwhDSAJIA0gChCOASAGEL8BIQ4CQAJAIA5FDQBBECEPIAMgD2ohECAQIREgERC/ASESIBJFDQBBASETQQEhFCATIBRxIRUgFQ0BCxAAC0GABCEWQQIhFyADKAIsIRggGCAXEJgBIAMoAiwhGSADIBk2AgwgAygCDCEaIBovAYgwIRtB//8DIRwgGyAccSEdQQEhHiAdIB5qIR8gHyEgIBYhISAgICFIISJBASEjICIgI3EhJAJAAkAgJEUNAEEBISVBASEmICUgJnEhJyAnDQELEAALQQEhKCADKAIMISlBCCEqICkgKmohKyApLwGIMCEsQQEhLSAsIC1qIS4gKSAuOwGIMEH//wMhLyAsIC9xITBBDCExIDAgMWwhMiArIDJqITMgAyAzNgIIIAMtACAhNCADKAIIITUgNSA0OgAAIAMoAiQhNiADKAIUITcgNiA3cyE4IAMoAgghOSA5IDg2AgRBMCE6IAMgOmohOyA7JAAgKA8LagEMfyMAIQFBECECIAEgAmshAyADIAA2AgggAygCCCEEIAQtAAAhBUF/IQYgBSAGaiEHQQIhCCAHIAhLIQkCQAJAIAkNAEEBIQogAyAKNgIMDAELQQAhCyADIAs2AgwLIAMoAgwhDCAMDwvNAwE7fyMAIQFBMCECIAEgAmshAyADJABBICEEIAMgBGohBSAFIQZBECEHIAMgB2ohCCAIIQlBAiEKQQEhCyADIAA2AiwgAygCLCEMIAYgDCALEI4BIAMoAiwhDSAJIA0gChCOASAGEL8BIQ4CQAJAIA5FDQBBECEPIAMgD2ohECAQIREgERC/ASESIBJFDQBBASETQQEhFCATIBRxIRUgFQ0BCxAAC0GABCEWQQIhFyADKAIsIRggGCAXEJgBIAMoAiwhGSADIBk2AgwgAygCDCEaIBovAYgwIRtB//8DIRwgGyAccSEdQQEhHiAdIB5qIR8gHyEgIBYhISAgICFIISJBASEjICIgI3EhJAJAAkAgJEUNAEEBISVBASEmICUgJnEhJyAnDQELEAALQQEhKCADKAIMISlBCCEqICkgKmohKyApLwGIMCEsQQEhLSAsIC1qIS4gKSAuOwGIMEH//wMhLyAsIC9xITBBDCExIDAgMWwhMiArIDJqITMgAyAzNgIIIAMtACAhNCADKAIIITUgNSA0OgAAIAMoAiQhNiADKAIUITcgNiA3cSE4IAMoAgghOSA5IDg2AgRBMCE6IAMgOmohOyA7JAAgKA8LzQMBO38jACEBQTAhAiABIAJrIQMgAyQAQSAhBCADIARqIQUgBSEGQRAhByADIAdqIQggCCEJQQIhCkEBIQsgAyAANgIsIAMoAiwhDCAGIAwgCxCOASADKAIsIQ0gCSANIAoQjgEgBhC/ASEOAkACQCAORQ0AQRAhDyADIA9qIRAgECERIBEQvwEhEiASRQ0AQQEhE0EBIRQgEyAUcSEVIBUNAQsQAAtBgAQhFkECIRcgAygCLCEYIBggFxCYASADKAIsIRkgAyAZNgIMIAMoAgwhGiAaLwGIMCEbQf//AyEcIBsgHHEhHUEBIR4gHSAeaiEfIB8hICAWISEgICAhSCEiQQEhIyAiICNxISQCQAJAICRFDQBBASElQQEhJiAlICZxIScgJw0BCxAAC0EBISggAygCDCEpQQghKiApICpqISsgKS8BiDAhLEEBIS0gLCAtaiEuICkgLjsBiDBB//8DIS8gLCAvcSEwQQwhMSAwIDFsITIgKyAyaiEzIAMgMzYCCCADLQAgITQgAygCCCE1IDUgNDoAACADKAIkITYgAygCFCE3IDYgN3IhOCADKAIIITkgOSA4NgIEQTAhOiADIDpqITsgOyQAICgPC44FAlN/AX4jACEBQcAAIQIgASACayEDIAMkAEEwIQQgAyAEaiEFIAUhBkEgIQcgAyAHaiEIIAghCUECIQpBASELIAMgADYCPCADKAI8IQwgBiAMIAsQjgEgAygCPCENIAkgDSAKEI4BIAYQvwEhDgJAAkAgDkUNAEEgIQ8gAyAPaiEQIBAhESAREL8BIRIgEkUNAEEBIRNBASEUIBMgFHEhFSAVDQELEAALQYAEIRZBAiEXIAMoAjwhGCAYIBcQmAEgAygCPCEZIAMgGTYCHCADKAIcIRogGi8BiDAhG0H//wMhHCAbIBxxIR1BASEeIB0gHmohHyAfISAgFiEhICAgIUghIkEBISMgIiAjcSEkAkACQCAkRQ0AQQEhJUEBISYgJSAmcSEnICcNAQsQAAsgAygCHCEoQQghKSAoIClqISogKC8BiDAhK0EBISwgKyAsaiEtICggLTsBiDBB//8DIS4gKyAucSEvQQwhMCAvIDBsITEgKiAxaiEyIAMgMjYCGCADLQAwITMgAygCGCE0IDQgMzoAAEEIITVBCCE2IAMgNmohNyA3IDVqIThBICE5IAMgOWohOiA6IDVqITsgOygCACE8IDggPDYCACADKQMgIVQgAyBUNwMIQQghPSADID1qIT4gPhCSASE/QQAhQCADID82AhQgAygCFCFBIEEhQiBAIUMgQiBDSCFEQQEhRSBEIEVxIUYCQAJAIEZFDQBBACFHIAMoAjQhSCADKAIUIUkgRyBJayFKIEggSnQhSyADKAIYIUwgTCBLNgIEDAELIAMoAjQhTSADKAIUIU4gTSBOdiFPIAMoAhghUCBQIE82AgQLQQEhUUHAACFSIAMgUmohUyBTJAAgUQ8LC7GDAQMAQYAIC4AXAAAAAAAAAAABAAAAAQAAAAIAAAACAAAAAAAAAAAAAAABAAAAAQAAAAIAAAACAAAAJgAAAIIAAAAhBQAASgAAAGcIAAAmAAAAwAEAAIAAAABJBQAASgAAAL4IAAApAAAALAIAAIAAAABJBQAASgAAAL4IAAAvAAAAygIAAIAAAACKBQAASgAAAIQJAAA1AAAAcwMAAIAAAACdBQAASgAAAKAJAAA9AAAAgQMAAIAAAADrBQAASwAAAD4KAABEAAAAngMAAIAAAABNBgAASwAAAKoKAABLAAAAswMAAIAAAADBBgAATQAAAB8NAABNAAAAUwQAAIAAAAAjCAAAUQAAAKYPAABUAAAAmQQAAIAAAABLCQAAVwAAALESAABYAAAA2gQAAIAAAABvCQAAXQAAACMUAABUAAAARQUAAIAAAABUCgAAagAAAIwUAABqAAAArwUAAIAAAAB2CQAAfAAAAE4QAAB8AAAA0gIAAIAAAABjBwAAkQAAAJAHAACSAAAAAAAAAAEAAAABAAAABQAAAA0AAAAdAAAAPQAAAH0AAAD9AAAA/QEAAP0DAAD9BwAA/Q8AAP0fAAD9PwAA/X8AAP3/AAD9/wEA/f8DAP3/BwD9/w8A/f8fAP3/PwD9/38A/f//AP3//wH9//8D/f//B/3//w/9//8f/f//P/3//38AAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAEQAAABIAAAATAAAAFAAAABUAAAAWAAAAFwAAABgAAAAZAAAAGgAAABsAAAAcAAAAHQAAAB4AAAAfAAAAIAAAACEAAAAiAAAAIwAAACUAAAAnAAAAKQAAACsAAAAvAAAAMwAAADsAAABDAAAAUwAAAGMAAACDAAAAAwEAAAMCAAADBAAAAwgAAAMQAAADIAAAA0AAAAOAAAADAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAABQAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABIAAAAUAAAAFgAAABgAAAAcAAAAIAAAACgAAAAwAAAAQAAAAIAAAAAAAQAAAAIAAAAEAAAACAAAABAAAAAgAAAAQAAAAIAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAIAAAACAAAAAwAAAAMAAAAEAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAABAAAABAAAAAgAAAAAAAAAAQABAQYAAAAAAAAEAAAAABAAAAQAAAAAIAAABQEAAAAAAAAFAwAAAAAAAAUEAAAAAAAABQYAAAAAAAAFBwAAAAAAAAUJAAAAAAAABQoAAAAAAAAFDAAAAAAAAAYOAAAAAAABBRAAAAAAAAEFFAAAAAAAAQUWAAAAAAACBRwAAAAAAAMFIAAAAAAABAUwAAAAIAAGBUAAAAAAAAcFgAAAAAAACAYAAQAAAAAKBgAEAAAAAAwGABAAACAAAAQAAAAAAAAABAEAAAAAAAAFAgAAACAAAAUEAAAAAAAABQUAAAAgAAAFBwAAAAAAAAUIAAAAIAAABQoAAAAAAAAFCwAAAAAAAAYNAAAAIAABBRAAAAAAAAEFEgAAACAAAQUWAAAAAAACBRgAAAAgAAMFIAAAAAAAAwUoAAAAAAAGBEAAAAAQAAYEQAAAACAABwWAAAAAAAAJBgACAAAAAAsGAAgAADAAAAQAAAAAEAAABAEAAAAgAAAFAgAAACAAAAUDAAAAIAAABQUAAAAgAAAFBgAAACAAAAUIAAAAIAAABQkAAAAgAAAFCwAAACAAAAUMAAAAAAAABg8AAAAgAAEFEgAAACAAAQUUAAAAIAACBRgAAAAgAAIFHAAAACAAAwUoAAAAIAAEBTAAAAAAABAGAAABAAAADwYAgAAAAAAOBgBAAAAAAA0GACAAAAAAAAAAAAAAAQABAQUAAAAAAAAFAAAAAAAABgQ9AAAAAAAJBf0BAAAAAA8F/X8AAAAAFQX9/x8AAAADBQUAAAAAAAcEfQAAAAAADAX9DwAAAAASBf3/AwAAABcF/f9/AAAABQUdAAAAAAAIBP0AAAAAAA4F/T8AAAAAFAX9/w8AAAACBQEAAAAQAAcEfQAAAAAACwX9BwAAAAARBf3/AQAAABYF/f8/AAAABAUNAAAAEAAIBP0AAAAAAA0F/R8AAAAAEwX9/wcAAAABBQEAAAAQAAYEPQAAAAAACgX9AwAAAAAQBf3/AAAAABwF/f//DwAAGwX9//8HAAAaBf3//wMAABkF/f//AQAAGAX9//8AAAAAAAAAAAABAAEBBgAAAAAAAAYDAAAAAAAABAQAAAAgAAAFBQAAAAAAAAUGAAAAAAAABQgAAAAAAAAFCQAAAAAAAAULAAAAAAAABg0AAAAAAAAGEAAAAAAAAAYTAAAAAAAABhYAAAAAAAAGGQAAAAAAAAYcAAAAAAAABh8AAAAAAAAGIgAAAAAAAQYlAAAAAAABBikAAAAAAAIGLwAAAAAAAwY7AAAAAAAEBlMAAAAAAAcGgwAAAAAACQYDAgAAEAAABAQAAAAAAAAEBQAAACAAAAUGAAAAAAAABQcAAAAgAAAFCQAAAAAAAAUKAAAAAAAABgwAAAAAAAAGDwAAAAAAAAYSAAAAAAAABhUAAAAAAAAGGAAAAAAAAAYbAAAAAAAABh4AAAAAAAAGIQAAAAAAAQYjAAAAAAABBicAAAAAAAIGKwAAAAAAAwYzAAAAAAAEBkMAAAAAAAUGYwAAAAAACAYDAQAAIAAABAQAAAAwAAAEBAAAABAAAAQFAAAAIAAABQcAAAAgAAAFCAAAACAAAAUKAAAAIAAABQsAAAAAAAAGDgAAAAAAAAYRAAAAAAAABhQAAAAAAAAGFwAAAAAAAAYaAAAAAAAABh0AAAAAAAAGIAAAAAAAEAYDAAEAAAAPBgOAAAAAAA4GA0AAAAAADQYDIAAAAAAMBgMQAAAAAAsGAwgAAAAACgYDBAAAAQAAAAEAAAAAAAAAAQAAAAIAAAAEAAAAAAAAAAIAAAAEAAAACAAAAAAAAAABAAAAAwAAAAcAAAAPAAAAHwAAAD8AAAB/AAAA/wAAAP8BAAD/AwAA/wcAAP8PAAD/HwAA/z8AAP9/AAD//wAA//8BAP//AwD//wcA//8PAP//HwD//z8A//9/AP///wD///8B////A////wf///8P////H////z////9/AAAAAAEAAAACAAAAAQAAAAQAAAAEAAAABAAAAAQAAAAIAAAACAAAAAgAAAAHAAAACAAAAAkAAAAKAAAACwAAAABBgB8LRAEAAADGAwAAAgAAAKoIAAADAAAAohMAAAAAAAAAAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAAAEHEHwvYawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"), (char) => char.charCodeAt(0));
    stage("Downloading geometry\u2026", 35);
    const urls = modelBinzUrls(info).slice(0, 2);
    const payloads = await Promise.all(urls.map((url2) => fetchBytes(url2)));
    stage("Decoding geometry\u2026", 58);
    const b = getDiterB(info);
    const files = {
      "file.osgjs": await decryptBinzBytes(wasm, payloads[0], b, key),
      "model_file.bin": await decryptBinzBytes(wasm, payloads[1], b, key)
    };
    cachedKey = key;
    stage("Building 3D scene\u2026", 75);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const result = await convertOsgjsToGlbFromFiles(
      files,
      parseViewerMaterials(info),
      [],
      viewerOrientation(info),
      true,
      "objects",
      null,
      false
    );
    if (result.skippedGeometries?.length) {
      progress(`${result.skippedGeometries.length} unsupported part(s) skipped`, 82);
    }
    stage("Preparing print formats\u2026", 90);
    const jsonText = result.gltfExternal.jsonText;
    const json = JSON.parse(typeof jsonText === "string" ? jsonText : new TextDecoder().decode(jsonText));
    const mesh = readTriangles(json, result.gltfExternal.bin);
    stage("Ready to save", 100);
    return {
      uid,
      name: sanitizeName(info.name || uid),
      title: info.name || uid,
      author: info.user?.displayName || info.user?.username || "Unknown",
      source: `https://sketchfab.com/models/${uid}`,
      glb: result.glb,
      mesh,
      skipped: result.skippedGeometries || []
    };
  }

  // vendor/sfrip/lib/zip.js
  function u16(n) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, n, true);
    return b;
  }
  function u32(n) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n >>> 0, true);
    return b;
  }
  function concat(chunks) {
    const len = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.length;
    }
    return out;
  }
  var CRC_TABLE2 = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  function crc322(data) {
    let c = 4294967295;
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE2[(c ^ u8[i]) & 255] ^ c >>> 8;
    return (c ^ 4294967295) >>> 0;
  }
  async function deflateRaw(data) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (typeof CompressionStream === "function") {
      try {
        const cs = new CompressionStream("deflate-raw");
        const ab = await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer();
        return new Uint8Array(ab);
      } catch (_) {
      }
    }
    try {
      const zlib = await Promise.resolve().then(() => (init_node_zlib(), node_zlib_exports));
      if (zlib && typeof zlib.deflateRawSync === "function") {
        return new Uint8Array(zlib.deflateRawSync(u8));
      }
    } catch (_) {
    }
    return null;
  }
  async function buildZip(files) {
    const enc = new TextEncoder();
    const locals = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(String(f.name || "file").replace(/\\/g, "/"));
      let raw;
      if (f.data instanceof Uint8Array) raw = f.data;
      else if (typeof f.data === "string") raw = enc.encode(f.data);
      else if (f.data instanceof ArrayBuffer) raw = new Uint8Array(f.data);
      else raw = new Uint8Array(f.data || []);
      const crc = crc322(raw);
      let payload = raw;
      let method = 0;
      const compressed = await deflateRaw(raw);
      if (compressed && compressed.length < raw.length) {
        payload = compressed;
        method = 8;
      }
      const local = concat([
        u32(67324752),
        u16(20),
        u16(0),
        u16(method),
        u16(0),
        u16(0),
        u32(crc),
        u32(payload.length),
        u32(raw.length),
        u16(name.length),
        u16(0),
        name,
        payload
      ]);
      locals.push(local);
      const cen = concat([
        u32(33639248),
        u16(20),
        u16(20),
        u16(0),
        u16(method),
        u16(0),
        u16(0),
        u32(crc),
        u32(payload.length),
        u32(raw.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ]);
      central.push(cen);
      offset += local.length;
    }
    const centralBlob = concat(central);
    const end = concat([
      u32(101010256),
      u16(0),
      u16(0),
      u16(files.length),
      u16(files.length),
      u32(centralBlob.length),
      u32(offset),
      u16(0)
    ]);
    return concat([...locals, centralBlob, end]);
  }

  // src/files.js
  async function makeDownload(model, format, longestEdge) {
    const stem = model.name || model.uid;
    if (format === "glb") return { name: stem + ".glb", data: model.glb, type: "model/gltf-binary" };
    const mesh = resizedMesh(model.mesh, longestEdge);
    const suffix = longestEdge ? `_${Number(longestEdge)}mm` : "_source-scale";
    if (format === "stl") return { name: stem + suffix + ".stl", data: writeStl(mesh), type: "application/octet-stream" };
    if (format === "obj") return { name: stem + suffix + ".obj", data: writeObj(mesh), type: "text/plain" };
    if (format !== "zip") throw new Error("Unknown export format.");
    const report = {
      name: model.title,
      author: model.author,
      source: model.source,
      triangles: mesh.count,
      print_dimensions: mesh.dimensions,
      print_units: mesh.units,
      print_scale: mesh.scale,
      source_dimensions: model.mesh.dimensions,
      skipped_parts: model.skipped,
      removed_zero_area_triangles: model.mesh.degenerate,
      orientation: "STL/OBJ: Z-up, centered X/Y, minimum Z=0. GLB: original scene scale and Y-up.",
      watertight: "not assessed; inspect in your slicer",
      note: "Textures and animation are omitted. No hole filling or printability guarantee. Export only with permission."
    };
    const data = await buildZip([
      { name: stem + suffix + ".stl", data: writeStl(mesh) },
      { name: stem + suffix + ".obj", data: writeObj(mesh) },
      { name: stem + ".glb", data: model.glb },
      { name: "model-info.json", data: JSON.stringify(report, null, 2) },
      { name: "READ-ME.txt", data: "Experimental reference export. Provided AS IS; use at your own risk.\nUse only models you own or have permission to export and use.\nSTL/OBJ use the chosen print size. GLB preserves the original scene scale.\nInspect units, wall thickness, open edges and the sliced preview before printing.\nSee model-info.json for dimensions and skipped geometry.\n" }
    ]);
    return { name: stem + suffix + ".zip", data, type: "application/zip" };
  }

  // src/userscript.js
  (() => {
    "use strict";
    if (document.getElementById("sf-easy-download")) return;
    const host = document.createElement("div");
    host.id = "sf-easy-download";
    Object.assign(host.style, { position: "fixed", bottom: "20px", right: "20px", zIndex: "2147483647" });
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
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
        <label>Format<select id="format"><option value="stl">STL \xB7 printing</option><option value="obj">OBJ \xB7 editing</option><option value="glb">GLB \xB7 3D scene</option><option value="zip">ZIP \xB7 all formats</option></select></label>
        <label>Longest edge (mm)<input id="size" type="number" min="0.01" max="10000" step="any" placeholder="Keep source scale"></label>
      </div>
      <p class="muted" id="size-note">Optional. STL and OBJ use this size; GLB keeps its original scale.</p>
      <label class="consent"><input type="checkbox" id="consent"><span>I own this model or have permission to export and use it.</span></label>
      <div class="actions"><button class="primary" id="download">Download STL</button><button class="secondary" id="cancel" hidden>Cancel</button></div>
      <progress value="0" max="100" hidden></progress>
      <div class="status" role="status" aria-live="polite">Ready when you are.</div>
      <div class="details" hidden></div>
      <p class="muted">Experimental reference code \xB7 AS IS. Check scale and mesh repair before printing. <a href="https://github.com/jonnyquattro/sketchfab-easy-download#responsible-use" target="_blank" rel="noopener noreferrer">Usage notes</a></p>
    </section>
    <button class="toggle" aria-expanded="false">Download 3D</button>
  </div>`;
    document.documentElement.append(host);
    const $ = (s) => root.querySelector(s);
    const toggle = $(".toggle"), panel = $(".panel"), button = $("#download"), format = $("#format"), size = $("#size");
    const consent = $("#consent"), cancel = $("#cancel"), bar = $("progress"), status = $(".status"), details = $(".details");
    let busy = false, model = null, controller = null, currentUid = null, preparedUid = null;
    const uid = () => location.pathname.match(/(?:^|[-/])([a-f0-9]{32})(?:\/|$)/i)?.[1]?.toLowerCase();
    const setStatus = (text, error = false) => {
      status.textContent = text;
      status.classList.toggle("error", error);
    };
    const label = () => {
      button.textContent = busy ? "Preparing\u2026" : `Download ${format.value.toUpperCase()}`;
      size.disabled = busy || format.value === "glb";
      $("#size-note").textContent = format.value === "glb" ? "GLB preserves the original scene scale and orientation." : "Optional. STL and OBJ use this size; GLB keeps its original scale.";
    };
    const setBusy = (value) => {
      busy = value;
      button.disabled = value;
      format.disabled = value;
      consent.disabled = value;
      cancel.hidden = !value;
      bar.hidden = !value;
      label();
    };
    const observePage = () => {
      const next = uid();
      host.hidden = !next;
      if (next !== currentUid) {
        controller?.abort();
        currentUid = next;
        model = null;
        preparedUid = null;
        consent.checked = false;
        details.hidden = true;
        setStatus("Ready when you are.");
      }
    };
    setInterval(observePage, 600);
    observePage();
    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });
    format.addEventListener("change", label);
    cancel.addEventListener("click", () => {
      controller?.abort();
      setStatus("Cancelling\u2026");
    });
    button.addEventListener("click", async () => {
      if (busy || !uid()) return;
      if (!consent.checked) {
        setStatus("Confirm that you have permission to export this model.", true);
        consent.focus();
        return;
      }
      if (format.value !== "glb" && size.value && !size.checkValidity()) {
        size.reportValidity();
        return;
      }
      const startedUid = uid(), selectedFormat = format.value, targetSize = size.value;
      controller = new AbortController();
      const signal2 = controller.signal;
      setBusy(true);
      bar.value = 0;
      setStatus("Starting\u2026");
      try {
        if (!model || preparedUid !== startedUid) {
          const prepared = await prepareModel(location.href, { signal: signal2, progress: (text, percent) => {
            if (uid() === startedUid) {
              bar.value = percent;
              setStatus(text);
            }
          } });
          if (signal2.aborted || uid() !== startedUid) throw new DOMException("Cancelled", "AbortError");
          model = prepared;
          preparedUid = startedUid;
        }
        if (signal2.aborted) throw new DOMException("Cancelled", "AbortError");
        setStatus("Saving file\u2026");
        await new Promise((resolve) => setTimeout(resolve, 0));
        const file = await makeDownload(model, selectedFormat, targetSize);
        if (signal2.aborted || uid() !== startedUid) throw new DOMException("Cancelled", "AbortError");
        const blob = new Blob([file.data], { type: file.type });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name;
        document.documentElement.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 12e4);
        setStatus("Saved. Choose another format to reuse the prepared model.");
        const dimensions = model.mesh.dimensions;
        const scale = selectedFormat === "glb" || !targetSize ? 1 : Number(targetSize) / Math.max(...dimensions);
        details.textContent = `${model.title}
${model.mesh.count.toLocaleString()} triangles \xB7 by ${model.author}
Size: ${dimensions.map((v) => (v * scale).toLocaleString(void 0, { maximumFractionDigits: 3 })).join(" \xD7 ")} ${targetSize && selectedFormat !== "glb" ? "mm" : "source units"}
` + (model.skipped.length ? `Warning: ${model.skipped.length} part(s) could not be exported.
` : "") + "Watertightness is not assessed. Check your slicer preview.";
        details.hidden = false;
      } catch (error) {
        host.dataset.lastError = error.stack || String(error);
        console.error("[Sketchfab Easy Download]", error);
        if (uid() === startedUid) setStatus(signal2.aborted || error.name === "AbortError" ? "Cancelled. Click download to try again." : error.message || "The export failed. Please retry.", !signal2.aborted && error.name !== "AbortError");
      } finally {
        setBusy(false);
        controller = null;
      }
    });
  })();
})();
