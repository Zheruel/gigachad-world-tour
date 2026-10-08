// loading.js - what the player waits for, and the load screen in index.html that shows it.
// The boot loads only the menus, the penthouse, CHAD and the sounds ('core'). Each chapter's
// stage art and cast frames are a pack that streams in behind the title; a stage whose pack is
// not in yet holds on the load screen until it is. Test harnesses (webdriver, ?auto=, the review
// studio) still load everything at boot, so every hook sees a fully loaded game; ?stream forces
// streaming there too.
const params = new URLSearchParams(location.search);
export const LOAD_ALL = !params.has('stream') && (navigator.webdriver || params.has('auto') || location.pathname.includes('/tools/'));
export const PACKS = ['core', 'train', 'india'];

// Chapter art lives under assets/stages/<chapter>/; the penthouse trophies and relics are drawn
// in the lair, so they stay in the core even when their file sits with a chapter.
export function packOfFile(key, src) {
  if (/^(lair_|trophy_)/.test(key)) return 'core';
  const m = /^assets\/stages\/([^/]+)\//.exec(src);
  return !m ? 'core' : m[1] === 'night_train' ? 'train' : 'india';
}
export const packOfActor = (key) => key.startsWith('nr_') ? 'train' : /^(ic_|dl_)/.test(key) ? 'india' : 'core';
export const packOfStage = (stage) => stage?.id === 'train' ? 'train' : 'india';

const counts = Object.fromEntries(PACKS.map((p) => [p, { total: 0, done: 0 }]));
const ready = new Set();
let shown = null;   // pack the load screen is following

// Count one file of a pack; the promise resolves either way (a missing file falls back in game).
export function track(pack, promise) {
  const c = counts[pack] || counts.core;
  c.total++;
  return Promise.resolve(promise).finally(() => { c.done++; report(); });
}
export const urgentPack = () => shown;
export function markReady(pack) { ready.add(pack); if (pack === shown) report(); }
export const packReady = (pack) => LOAD_ALL || ready.has(pack);

// The screen itself is plain HTML (index.html), up before any module loads; pages without it
// (the review studio) simply have no screen.
const ui = () => window.GachiLoader;
export function showLoader(pack, title) { shown = pack; ui()?.show(title); report(); }
export function hideLoader() { shown = null; ui()?.hide(); }
function report() {
  if (!shown) return;
  const c = counts[shown];
  ui()?.progress(ready.has(shown) ? 1 : c.total ? c.done / c.total : 0);
}
