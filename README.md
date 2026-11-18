# Sketchfab Easy Download

**One Tampermonkey script. No Python, Node.js, command window, local server or Sketchfab login required to use it.**

Save an authorized reference model as **STL, OBJ, GLB**, or a ZIP containing all three. Conversion runs inside your browser. The geometry is downloaded once; additional formats reuse the prepared model.

Experimental reference implementation, provided **AS IS**. Intended for models you own or have explicit permission to export and use. Public visibility alone is not permission.

## Install in Firefox

1. Install [Tampermonkey for Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) if needed.
2. **[Click to install the userscript](https://raw.githubusercontent.com/jonnyquattro/sketchfab-easy-download/main/dist/sketchfab-easy-download.user.js)**, then click **Install** in Tampermonkey.
3. Open or reload a Sketchfab model page. Click **Download 3D** at the bottom right.

If the link opens code instead of an installation screen, open Tampermonkey's dashboard, create a new script, replace the template with the [built script](dist/sketchfab-easy-download.user.js), and save with Ctrl+S. Ensure the extension and script are enabled.

**Upgrading from the old local-helper version:** disable the old “Sketchfab STL / OBJ Download (Local Helper)” script in Tampermonkey. The new script does not use port 8765 or require the old helper.

## Download a model

1. Choose a format: **STL** for a slicer, **OBJ** for editing, **GLB** for a 3D scene, or **ZIP** for all formats and source details.
2. Optionally enter the **longest edge in millimeters**. Leave blank to preserve source coordinates. This resizes STL/OBJ; GLB always preserves the original scene scale.
3. Confirm you own the model or have permission to export and use it, then click **Download**.

Progress appears in the panel. Cancel stops pending network requests; a running geometry calculation must yield before cancellation takes effect. After an export, choose another format to reuse the prepared model. Navigating to a different model clears the previous result and permission checkbox.

Allow Tampermonkey connections only to the listed Sketchfab domains if prompted. This script never asks for your password, API token or browser cookies. Requests use Tampermonkey's anonymous mode.

## Printing and scale

STL has no unit metadata. Source coordinates may be in meters, millimeters or arbitrary units; the script does not guess. Setting a longest edge explicitly establishes the intended STL/OBJ dimensions in millimeters. Review the displayed dimensions and confirm them in your slicer.

STL/OBJ exports apply scene transforms, convert to Z-up, center X/Y, and place the lowest point at Z=0. Mirrored instances have their triangle winding corrected; zero-area triangles are omitted. GLB keeps its original scene scale and Y-up orientation.

Textures, wireframe overlays and animations are omitted. Skeletons are baked to the converter's rest pose. Unsupported parts are reported. The tool does **not** repair holes, test watertightness, certify wall thickness or guarantee printability. Inspect and repair the mesh, review the sliced layers, and follow your printer/material instructions before printing. Reference meshes are not certified protective equipment, medical devices or load-bearing parts.

## Responsible use

- Export models you own or have explicit permission to export by this method. Keep the license, source link, attribution and any written permission.
- Prefer a creator-provided download, purchase or original project file where available. Check the applicable [platform terms](https://sketchfab.com/terms); a model license does not necessarily authorize every method of obtaining it.
- Do not use this to defeat passwords, access restrictions, payment requirements or platform enforcement. Private/password-protected content is unsupported.
- Reference, education, research, personal and noncommercial use are not automatic legal exemptions. Do not redistribute, sell or print someone else's work unless the applicable permissions cover those actions.
- The converter processes encoded/encrypted viewer assets. The project does not claim that this is authorized in every circumstance. “Experimental,” “reference only” and the MIT license do not prevent legal claims or takedowns.

The code is supplied as a reference implementation **AS IS**, without warranties, under the [MIT license](LICENSE). Use and modification are at your own risk. To the maximum extent permitted by applicable law, authors, contributors and maintainers assume no responsibility or liability for use, misuse, downloaded content, prints or resulting damages. This does not exclude liability that cannot legally be excluded or override third-party rights. It is not legal clearance; seek qualified legal advice for your circumstances.

See the [U.S. Copyright Office's permission/fair-use FAQ](https://www.copyright.gov/help/faq/faq-fairuse.html) and [GitHub's DMCA policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy). Rights concerns about this repository can be raised in [Issues](https://github.com/jonnyquattro/sketchfab-easy-download/issues); do not post private documents or confidential models there. Formal notices should follow GitHub's process.

## Privacy and limitations

- Conversion is local to the browser. Model assets are requested from Sketchfab; no third-party conversion service or local helper is used.
- The decoder is embedded in the script. Viewer JavaScript is read as text for decoder configuration, not executed by the exporter. No remote `@require` dependencies are loaded.
- Network requests are restricted to HTTPS on `sketchfab.com`, `static.sketchfab.com` and `media.sketchfab.com`. There is no telemetry in the userscript.
- Model files and source metadata are untrusted input. Keep Firefox, Tampermonkey, mesh editors and slicers updated. The converter is not a security sandbox.
- Browser limits: 150 MB per asset, 3 million output triangles. Large or unusual models may exceed memory, fail, or temporarily pause the tab. Viewer changes can break the exporter.
- The script's update URL points to this repository. Review future updates and Tampermonkey's update settings if you prefer manual updates.

## Develop

Development requires Node.js 18 or newer (use a supported LTS release). Runtime users only need Firefox and Tampermonkey.

```sh
npm ci --ignore-scripts
npm test
npm run build
```

Install `dist/sketchfab-easy-download.user.js`, not an individual source module. The build bundles the converter and its WASM payload into that file. [Tests](test/) cover print scale, transforms, winding, strip/fan triangles, invalid buffers, network restrictions and cancellation. The optional Firefox integration test requires Python/Selenium and a signed Tampermonkey XPI; it uses a fresh browser profile rather than modifying your regular one.

## Verified locally

- Firefox 160.0.1 with Tampermonkey 5.5.0 in a fresh, logged-out test profile: installed the built userscript through Tampermonkey's installation screen, opened a real Sketchfab model page, and used the panel to save a ZIP and a second cached STL.
- The reference export contained 42,688 triangles. STL and OBJ were independently reopened and measured at the requested 250 mm longest edge; the GLB retained source dimensions. ZIP integrity and all three geometry exports were checked.
- 13 automated geometry, export and network checks pass. Other models and browser/extension versions are not universally verified.

## Credits

Conversion core: [Corpocore/sfrip](https://github.com/Corpocore/sfrip), MIT, commit `2bb0b7594aeea9f979af035eccb8c6ad29586633`, which credits [seryi882/sketchfab-downloader-extension](https://github.com/seryi882/sketchfab-downloader-extension). Upstream files and license are retained in `vendor/sfrip/`. A build-time adapter routes its asset fetches through Tampermonkey; no runtime Node.js installation is needed.

See [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). Downloaded models retain their creators' rights. No model assets are shipped in this repository. This independent project is not affiliated with or endorsed by Sketchfab or Epic Games.
