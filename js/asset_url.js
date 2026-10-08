// asset_url.js - the file an image is actually fetched from. The Pages deploy
// (tools/production/build_pages.py) writes a .webp beside every runtime PNG under assets/ and
// switches WEBP on in its copy of this file; locally it stays off and every path is the PNG.
const WEBP = false;
export const assetURL = (src) => WEBP && /^assets\/.*\.png$/.test(src) ? src.slice(0, -4) + '.webp' : src;
