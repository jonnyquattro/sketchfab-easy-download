import { build } from 'esbuild';
import fs from 'node:fs/promises';
const wasm = await fs.readFile(new URL('./vendor/sfrip/lib/wasm/decrypt.wasm', import.meta.url));
const header = `// ==UserScript==
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
`;
await fs.mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/userscript.js'], outfile: 'dist/sketchfab-easy-download.user.js',
  bundle: true, format: 'iife', platform: 'browser', target: ['firefox115', 'chrome120'],
  banner: { js: header }, legalComments: 'inline',
  define: { __DECRYPT_WASM_BASE64__: JSON.stringify(wasm.toString('base64')) },
  plugins: [{
    name: 'userscript-network',
    setup(builder) {
      builder.onLoad({ filter: /sf-api\.js$/ }, async args => ({
        contents: `import { gmFetch as fetch } from '../../../src/network.js';\n` + await fs.readFile(args.path, 'utf8'),
        loader: 'js'
      }));
      // Browser builds never attempt to load Node modules or remote executable code.
      builder.onResolve({ filter: /^node:/ }, args => ({ path: args.path, namespace: 'empty-node' }));
      builder.onLoad({ filter: /.*/, namespace: 'empty-node' }, () => ({ contents: 'export default {};', loader: 'js' }));
    }
  }]
});
const result = await fs.stat('dist/sketchfab-easy-download.user.js');
console.log(`Built self-contained userscript (${(result.size / 1024).toFixed(0)} KB).`);
