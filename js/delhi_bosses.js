// Dirty Delhi's boss hooks. The Dredger and its Thekedar live in delhi_dredger.js.
import { dredger } from './delhi_dredger.js';

export const DELHI = { dredger };

export function initDelhi(b) {
  const d = DELHI[b.key];
  if (!d) return;
  b.delhi = d;
  d.init(b);
}

export function delhiIntro(b, t) {
  if (b.delhi && b.delhi.intro) { b.delhi.intro(b, t); return true; }
  return false;
}
