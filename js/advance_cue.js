import { G } from './engine.js';

// Mirrors SoR2 sub_8188: a $E0-frame timer; the arrow shows while (timer & $18) != 0
// (24 of every 32 frames) and the GO beep ($439) sounds each time it reappears.
export const GO_TICKS = 0xE0;
const visibleAt = (timer) => (timer & 0x18) !== 0;
export function startAdvanceCue() { G.goTimer = GO_TICKS; }
export function updateAdvanceCue() {
  if (G.goTimer <= 0) return;
  const wasVisible = visibleAt(G.goTimer);
  G.goTimer--;
  if (visibleAt(G.goTimer) && !wasVisible) G.audio?.sfx('advance');
}
export function advanceVisible() {
  return G.goTimer > 0 && visibleAt(G.goTimer);
}
