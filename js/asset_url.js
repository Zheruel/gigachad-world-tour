// asset_url.js - the file an asset is actually fetched from. The Pages deploy
// (tools/production/build_pages.py) writes a .webp beside every runtime PNG under assets/ and an
// .mp3 beside every runtime WAV under audio/, and switches COMPRESSED on in its copy of this file;
// locally it stays off and every path is the source file.
const COMPRESSED = false;
export const assetURL = (src) => !COMPRESSED ? src
  : /^assets\/.*\.png$/.test(src) ? src.slice(0, -4) + '.webp'
  : /^audio\/.*\.wav$/.test(src) ? src.slice(0, -4) + '.mp3'
  : src;
