// fx.js - loader for the generated effect, pickup and HUD art.
// Everything here replaced something that used to be drawn with raw fillRect:
// five orange sticks for fire, five squares for chilli powder, and a spinning
// triangle for a samosa.
const FX = {};

// name -> frame count (1 = single image)
const ITEMS = {
  pick_lassi: 1, pick_chaat: 1,
  samosa: 4, powder: 3, flame: 4, gas: 3, bird: 3,
  ragnarok_impact: 6,
  puddle: 1, hud_life: 1, hud_frame: 1, hud_bar: 1,
};

export function loadFX() {
  return Promise.all(Object.entries(ITEMS).flatMap(([name, n]) => {
    FX[name] = [];
    return Array.from({ length: n }, (_, i) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { img._as = 2; FX[name][i] = img; resolve(); };
      img.onerror = () => resolve();
      img.src = n === 1 ? `assets/fx/${name}.png` : `assets/fx/${name}${i + 1}.png`;
    }));
  }));
}

// one frame of a set, or null so callers can keep a fallback
export function fx(name, idx) {
  const set = FX[name];
  if (!set || !set.length) return null;
  return set[((idx | 0) % set.length + set.length) % set.length] || null;
}

export function fxCount(name) { return (FX[name] || []).length; }
