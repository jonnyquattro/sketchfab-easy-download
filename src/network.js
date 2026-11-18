const ALLOWED = new Set(['sketchfab.com', 'static.sketchfab.com', 'media.sketchfab.com']);
const MAX_BYTES = 150 * 1024 * 1024;
let signal;
export function setRequestSignal(value) { signal = value; }
export function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED.has(url.hostname) || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Blocked an unexpected asset address. Only Sketchfab HTTPS assets are allowed.');
  }
  return url.href;
}
export function gmFetch(value) {
  const url = validateUrl(value);
  const activeSignal = signal;
  if (activeSignal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  return new Promise((resolve, reject) => {
    let handle, finished = false;
    const finish = (fn, data) => {
      if (finished) return;
      finished = true;
      activeSignal?.removeEventListener('abort', abort);
      fn(data);
    };
    const abort = () => {
      finish(reject, new DOMException('Cancelled', 'AbortError'));
      handle?.abort();
    };
    handle = GM_xmlhttpRequest({
      method: 'GET', url, anonymous: true, responseType: 'arraybuffer', timeout: 60000,
      onload(response) {
        try {
          if (response.finalUrl) validateUrl(response.finalUrl);
          if (!(response.response instanceof ArrayBuffer)) throw new Error('The browser did not return a binary response. Check Tampermonkey permissions.');
          if (response.response.byteLength > MAX_BYTES) throw new Error('This asset exceeds the 150 MB browser limit.');
          finish(resolve, new Response(response.response, {
            status: response.status || 502,
            headers: { 'Content-Type': 'application/octet-stream' }
          }));
        } catch (error) { finish(reject, error); }
      },
      onprogress(event) {
        if (event.loaded > MAX_BYTES || event.total > MAX_BYTES) {
          finish(reject, new Error('This asset exceeds the 150 MB browser limit.'));
          handle?.abort();
        }
      },
      onerror: () => finish(reject, new Error('Network request failed. Allow the listed Sketchfab domains in Tampermonkey, then retry.')),
      ontimeout: () => finish(reject, new Error('The asset request timed out. Please retry.')),
      onabort: () => finish(reject, new DOMException('Cancelled', 'AbortError'))
    });
    activeSignal?.addEventListener('abort', abort, { once: true });
    if (activeSignal?.aborted) abort();
  });
}
