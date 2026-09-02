// train.js - THE NIGHT TRAIN's moving parts. The station's departure, the world outside
// the windows on its own clock, the lurch, the tunnel and the bridges, the emergency
// chain, the roof's wind, and the ticket. Everything here reads and writes G.train;
// the stage entry in stages.js is the data and this is the machine.
import { G, W, H, FLOOR_TOP, clamp, laneAt, laneMin, laneMax, arenaMin, arenaMax } from './engine.js';
import { ASSETS } from './assets.js';
import { blit, frameW, frameH, artScale } from './sprites.js';
import { spawnPop, spawnDust, spawnSpark } from './effects.js';
import { hurtPlayer } from './player.js';

// Where the route changes its rules, in logical px. The stage entry agrees with these.
export const ABOARD_X = 4800;     // the cut: platform to vestibule
export const ROOF_X = 7680;       // the ladder: corridor to roof
export const RAKE_FROM = 3360;    // the rake stands from here along platform 1
export const RAKE_TO = 4800;
// The rake sprite is two coaches with one open door: the door sits 72% along it, and
// its bogies sink RAKE_SINK px below the platform edge (the wall band clips them).
const DOOR_FRAC = 0.72;
const RAKE_SINK = 72;
function rakeW() { const r = ASSETS.amb_rake; return r ? frameW(r) : 388; }
export function doorOff() { return Math.round(rakeW() * DOOR_FRAC); }
export const BERTH_Z = 52;        // the upper berths MANJA perches on
const TUNNEL_T = 200, BRIDGE_T = 130, LURCH_T = 50, BRAKE_T = 50;

// The rake stands so that one door is 50 px inside the arena the departure gate will
// lock: the camera is forward-only, so where it stops when the gate trips is known.
function rakeStart(st) {
  const gate = (st.waves || []).find((w) => w.depart);
  const gateX = gate ? gate.x : 4300;
  return gateX - 255 + 14 + 50 - doorOff();
}

export function initTrain(st) {
  G.train = {
    t: 0, speed: 0, aboard: false, cut: 0,
    rakeX: rakeStart(st), rakeV: 0, departure: null, softFail: false, pendingSpawns: null,
    ticket: false, ticketWas: false,
    lurch: 0, lurchDir: 1, lurchCd: 900, swing: 0,
    tunnel: 0, tunnelCd: 0,
    bridge: 0, bridgeCd: 0, bridgeHit: false, bridgesArmed: false,
    brake: 0, chainBroken: false, chainsPulled: 0, climbed: false, cutLabel: 'ABOARD',
    goods: 0, goodsCd: 1500, station: 0, stationCd: 2400,
    bridgeEvery: 0, detached: null,
    blind: 0,
    outsideW: 0,
  };
}

// ---- the departure -------------------------------------------------------
// A situation, not a person. The whistle goes, the rake creeps and then runs, and the
// only way onto it is a running jump into the open door while the wave is still on you.
export function startDeparture() {
  const tr = G.train;
  tr.departure = { t: 0 };
  tr.rakeV = 0.4;
  G.audio.sfx('go');
  spawnPop(G.camX + W / 2, 84, 'THE 22:40 IS LEAVING');
}

export function doorX() {
  const w = rakeW();
  let x = G.train.rakeX + doorOff();
  while (x < arenaMin() + 20) x += w;
  return x;
}

function updateDeparture() {
  const tr = G.train, p = G.player;
  const d = tr.departure;
  if (!d) return;
  d.t++;
  if (d.t > 60) tr.rakeV = Math.min(3.4, tr.rakeV + 0.004);
  tr.rakeX += tr.rakeV;
  if (d.t % 40 === 0 && tr.rakeV < 2) G.audio.sfx('armor');
  const dx = doorX();
  // the jump: airborne, over the door, and going the right way
  if (p.state === 'jump' && p.z > 8 && Math.abs(p.x - dx) < 26 && !p.grabbedBy) { boardTrain(false); return; }
  // the platform runs out: the door leaves the arena and you catch the guard's van
  if (dx > arenaMax() + 40) boardTrain(true);
}

export function boardTrain(soft) {
  const tr = G.train, p = G.player;
  tr.departure = null;
  tr.aboard = true;
  tr.softFail = soft;
  tr.cutLabel = soft ? "THE GUARD'S VAN. ONE COACH BACK." : 'ABOARD';
  tr.cut = 60;
  tr.t = 0;
  tr.speed = 0;
  G.enemies = [];
  G.shots = [];
  G.zones = [];
  G.pickups = G.pickups.filter((pk) => pk.x >= ABOARD_X);
  G.spawnQueue = [];
  G.waveActive = false;
  G.locked = false;
  G.arenaSqueezeTarget = 0;
  // the departure gate is done with, whichever way it ended
  for (const w of G.stage.waves) if (w.depart) w.done = true;
  G.camX = ABOARD_X;
  p.x = ABOARD_X + 40; p.y = 211; p.z = 0; p.vz = 0; p.vx = 0; p.grabbedBy = null;
  p.state = 'idle'; p.t = 0; p.invuln = 60;
  tr.lurchCd = 700;
  tr.tunnelCd = 0;
  tr.goodsCd = 1500;
  tr.stationCd = 2200;
  G.audio.sfx(soft ? 'slam' : 'land');
}

// The ladder at the end of the AC coach. The corridor ends and the roof begins on a
// cut, like the boarding: nobody walks from a lit corridor onto a roof in one step.
export function climbRoof() {
  const tr = G.train, p = G.player;
  tr.climbed = true;
  tr.cut = 40;
  tr.cutLabel = 'THE ROOF. KEEP LOW.';
  G.enemies = [];
  G.shots = [];
  G.zones = [];
  G.spawnQueue = [];
  G.waveActive = false;
  G.locked = false;
  G.camX = ROOF_X;
  p.x = ROOF_X + 60; p.y = 221; p.z = 0; p.vz = 0; p.vx = 0; p.grabbedBy = null;
  p.state = 'idle'; p.t = 0; p.invuln = 60;
  tr.lurchCd = Math.max(tr.lurchCd, 400);
  tr.bridgeCd = 360;   // the first girder comes early, while the lesson is cheap
  G.audio.sfx('land');
}

// ---- the chain -----------------------------------------------------------
// A runner reaching it brakes the train: everyone slides forward and goes down, and the
// next gate's men arrive now instead of later. Breaking any chain disarms all of them.
export function chainFor(x) {
  if (G.train.chainBroken) return null;
  let best = null;
  for (const pr of G.props) {
    if (pr.prop !== 'chain' || pr.broken) continue;
    if (pr.x < arenaMin() - 10 || pr.x > arenaMax() + 10) continue;
    if (!best || Math.abs(pr.x - x) < Math.abs(best.x - x)) best = pr;
  }
  return best;
}

export function chainPulled(x) {
  const tr = G.train;
  tr.brake = BRAKE_T;
  tr.chainsPulled++;
  spawnPop(x, 120, 'CHAIN PULLED');
  G.audio.sfx('heavy');
  G.shake = Math.max(G.shake, 8);
  const waves = G.stage.waves;
  const nx = waves[G.waveIndex + 1];
  if (nx && nx.spawns && nx.spawns.length && !nx.miniboss && !nx.boss && !nx.depart) {
    G.spawnQueue.push(...nx.spawns);
    nx.spawns = [];
  }
}

export function chainBroken() {
  G.train.chainBroken = true;
  spawnPop(G.camX + W / 2, 100, 'NO MORE STOPS');
  for (const e of G.enemies) if (e.chainTarget) { e.chainTarget = null; e.runner = false; e.noLane = false; e.state = 'idle'; e.atkCd = 30; }
}

// ---- the tunnel and the bridges -----------------------------------------
export function startTunnel() {
  const tr = G.train;
  if (tr.tunnel > 0) return;
  tr.tunnel = TUNNEL_T;
  G.audio.sfx('enrage');
  G.shake = Math.max(G.shake, 3);
}

export function startBridge() {
  const tr = G.train;
  if (tr.bridge > 0) return;
  tr.bridge = BRIDGE_T;
  tr.bridgeHit = false;
}

// The girder crosses the roof at head height. Anything lifted off the roof - a jump, a
// perch, a man held upright - is what it takes with it. Feet on the steel are safe.
function girderPass() {
  const tr = G.train, p = G.player;
  const lifted = (e) => e.z > 14 || e.perched;
  const onRoof = G.camX >= ROOF_X - 40;
  if (!onRoof) return;
  if (lifted(p) && p.state !== 'down' && !p.dying) {
    if (p.grabbedBy) { p.grabbedBy.girdered = true; p.grabbedBy = null; }
    hurtPlayer(p, 40, -1, true);
    p.vx = 0; p.vz = 2; p.y = laneMax(p.x) - 4;
    spawnPop(p.x, p.y - 90, 'GIRDER');
    G.shake = Math.max(G.shake, 10);
    G.audio.sfx('slam');
  }
  for (const e of G.enemies) {
    if (e.dead || !lifted(e)) continue;
    e.perched = false; e.z = Math.max(e.z, 0.1);
    e.hurt(30, -1, true, true);
    spawnSpark(e.x, e.y - 60);
  }
  const b = G.boss;
  if (b && !b.dead && b.z > 14) { b.hurt(20, -1, true, false); }
}

// ---- per-frame ----------------------------------------------------------
// Returns true while the cut holds the world still.
export function updateTrain() {
  const tr = G.train;
  if (!tr) return false;
  if (tr.cut > 0) {
    tr.cut--;
    if (tr.cut === 0) {
      spawnPop(G.player.x + 40, 96, tr.cutLabel);
      if (tr.softFail) tr.pendingSpawns = ['goonda', 'goonda'];   // main.js spawns them: this module must not import enemies.js
    }
    return true;
  }
  updateDeparture();
  if (!tr.aboard) return false;
  const p = G.player;
  if (!tr.climbed && p.x >= ROOF_X - 40 && !G.locked && !G.boss && p.z <= 0 && !p.grabbedBy) { climbRoof(); return true; }
  // the train gets up to speed out of the platform, and the outside runs on it
  tr.speed = Math.min(3.2, tr.speed + 0.012);
  tr.t += tr.speed;
  if (tr.blind > 0) tr.blind--;

  // what passes the windows, on its own clock
  if (tr.goods > 0) { tr.goods--; if (tr.goods % 9 === 0) G.shake = Math.max(G.shake, 1); }
  else if (--tr.goodsCd <= 0) { tr.goods = 180; tr.goodsCd = 3600; G.audio.sfx('heavy'); G.shake = Math.max(G.shake, 4); }
  if (tr.station > 0) tr.station--;
  else if (--tr.stationCd <= 0) { tr.station = 90; tr.stationCd = 2600; }

  if (tr.tunnel > 0) tr.tunnel--;
  const onRoof = G.camX >= ROOF_X - 40;
  // bridges: rare on the corridor for the strobe, regular on the roof for the girder
  if (tr.bridge > 0) {
    tr.bridge--;
    if (tr.bridge === 70) G.audio.sfx('blip');
    if (tr.bridge === 40 && !tr.bridgeHit) { tr.bridgeHit = true; girderPass(); }
  } else if (tr.bridgesArmed || onRoof) {
    if (tr.bridgeCd <= 0) tr.bridgeCd = tr.bridgeEvery || (onRoof ? 900 : 1600);
    if (--tr.bridgeCd <= 0) startBridge();
  }

  // the lurch: the scenery swings first, then the glasses, then you
  if (!onRoof) {
    if (tr.lurch > 0) {
      tr.lurch--;
      const dy = tr.lurchDir * 0.55;
      const slide = (e) => { if (!e.noLane && e.z <= 0 && e.state !== 'dying') e.y += dy; };
      if (p.z <= 0 && !p.grabbedBy) p.y += dy;
      for (const e of G.enemies) slide(e);
      if (G.boss && !G.boss.removeMe && !G.boss.perched) slide(G.boss);
      if (tr.lurch === 0) tr.lurchCd = 700 + Math.random() * 500;
    } else if (--tr.lurchCd <= 0) {
      tr.lurch = LURCH_T; tr.lurchDir = Math.random() < 0.5 ? -1 : 1; tr.swing = 0;
      G.audio.sfx('armor');
    }
    // the tell: hanging things reach full swing 60 frames before the floor moves
    const tell = tr.lurchCd < 60 && tr.lurch === 0;
    tr.swing += clamp((tell || tr.lurch > 0 ? 1 : 0) - tr.swing, -0.03, 0.05);
  }

  // the brake: everyone forward, then everyone down
  if (tr.brake > 0) {
    tr.brake--;
    const k = tr.brake > 20 ? 1.6 : 0.6;
    if (p.z <= 0 && !p.grabbedBy && p.state !== 'down') p.x += k;
    for (const e of G.enemies) if (!e.dead && e.z <= 0 && !e.chainTarget) e.x += k;
    if (G.boss && !G.boss.removeMe && !G.boss.perched) G.boss.x += k * 0.5;
    if (tr.brake === 0) {
      hurtPlayer(p, 3, 1, true);
      for (const e of G.enemies) {
        if (e.dead || e.perched || e.state === 'thrown') continue;
        e.state = 'down'; e.t = 0; e.vx = 1.2; e.vz = 1.5; e.z = Math.max(e.z, 0.1);
      }
      G.shake = Math.max(G.shake, 6);
      G.audio.sfx('slam');
    }
  }

  // the roof: wind off the front, rearward, on anything with its feet down
  const lane = laneAt(p.x);
  if (lane && lane.wind) {
    if (p.z <= 0 && !p.grabbedBy && p.state !== 'down' && p.state !== 'special') p.x -= lane.wind;
    for (const e of G.enemies) if (!e.dead && e.z <= 0 && !e.perched && !e.noLane) e.x -= lane.wind * 0.7;
  }
  return false;
}

// ---- drawing -------------------------------------------------------------
// The world outside, behind the plate. It shows only through what the stitcher keyed
// out: the carriage windows, the open doors, the sky over the roof. It scrolls on the
// train's clock, not the camera's - the camera moving along the corridor is you walking
// down a train, and the fields going past is the train.
export function drawOutside(ctx, camX) {
  const tr = G.train;
  if (!tr || camX < ABOARD_X - 480) return;
  const img = ASSETS.bg_d2_outside;
  const roof = camX >= ROOF_X - 480;
  ctx.save();
  // sky, then whatever the tile has, then the events over it
  ctx.fillStyle = tr.tunnel > 0 ? '#050508' : '#070a18';
  ctx.fillRect(0, 0, W, FLOOR_TOP + (roof ? 0 : 60));
  if (tr.tunnel > 0) {
    // tunnel lamps streaming past
    const off = (tr.t * 2.2) % 96;
    ctx.fillStyle = '#c8a850';
    for (let x = -off; x < W; x += 96) ctx.fillRect(Math.round(x), 70, 3, 6);
    ctx.restore();
    return;
  }
  if (roof) {
    // the glow the roof throws up into the night, the same on every screen
    const g = ctx.createLinearGradient(0, 96, 0, 156);
    g.addColorStop(0, 'rgba(70,66,92,0)');
    g.addColorStop(1, 'rgba(70,66,92,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 96, W, 60);
  }
  if (img) {
    const sw = img.width / artScale(img), sh = img.height / artScale(img);
    tr.outsideW = sw;
    // two depths of the same tile: the far one slow, the near one at the train's speed
    for (const [par, dy, a] of [[0.35, -6, 0.55], [1, 0, 1]]) {
      const off = ((Math.round(tr.t * par) % sw) + sw) % sw;
      ctx.globalAlpha = a;
      for (let x = -off; x < W; x += sw) ctx.drawImage(img, x, dy, sw, sh);
    }
    ctx.globalAlpha = 1;
  }
  // the platform sliding away, for the first seconds after the cut
  // (it accelerates away, and is drawn until its far end has left the screen)
  const platX = 480 - tr.t * 1.6 - tr.t * tr.t * 0.0012;
  if (platX + 900 > 0 && !roof) {
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(platX, 128, 900, 62);
    ctx.fillStyle = '#e0b060';
    for (let x = platX; x < platX + 900; x += 120) { ctx.fillRect(x, 88, 3, 40); ctx.fillRect(x - 10, 84, 24, 4); }
  }
  // a station gone in a second and a half
  if (tr.station > 0) {
    const k = tr.station / 90;
    const x0 = W - (1 - k) * (W + 700);
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x0, 90, 700, 100);
    ctx.fillStyle = '#ffd890';
    for (let x = x0 + 10; x < x0 + 700; x += 44) ctx.fillRect(x, 108, 20, 14);
    ctx.fillStyle = 'rgba(255,220,150,0.18)';
    ctx.fillRect(0, 0, W, FLOOR_TOP);
  }
  // a goods train filling every window
  if (tr.goods > 0) {
    const off = (tr.t * 2.6) % 150;
    for (let x = -off - 150; x < W; x += 150) {
      ctx.fillStyle = '#1a1612';
      ctx.fillRect(Math.round(x), 40, 136, 150);
      ctx.fillStyle = '#3a3028';
      ctx.fillRect(Math.round(x) + 6, 52, 124, 6);
    }
  }
  // the girder bridge: posts, and the light on the horizon before it
  if (tr.bridge > 0) {
    if (tr.bridge > 70) {
      const k = (BRIDGE_T - tr.bridge) / 60;
      ctx.fillStyle = `rgba(255,240,200,${0.5 + k * 0.5})`;
      ctx.beginPath(); ctx.arc(W - 30 - k * 60, 60, 2 + k * 5, 0, Math.PI * 2); ctx.fill();
    } else {
      const off = (tr.t * 3) % 60;
      ctx.fillStyle = '#20221e';
      for (let x = -off; x < W; x += 60) ctx.fillRect(Math.round(x), 0, 14, FLOOR_TOP + 60);
      ctx.fillRect(0, 20, W, 8);
    }
  }
  ctx.restore();
}

// Wall-plane pieces that have to move or breathe: the rake standing at platform 1,
// the hanging straps that telegraph the lurch, the family asleep in the AC coach.
export function drawTrainWallPlane(ctx, camX) {
  const tr = G.train;
  if (!tr) return;
  const rake = ASSETS.amb_rake;
  if (rake && !tr.aboard && camX < ABOARD_X + 60) {
    const w = frameW(rake), h = frameH(rake);
    const y = FLOOR_TOP - h + RAKE_SINK;
    ctx.save();
    ctx.beginPath(); ctx.rect(Math.max(0, RAKE_FROM - camX), 0, W, FLOOR_TOP); ctx.clip();
    for (let x = tr.rakeX; x < RAKE_TO + w + 400; x += w) {
      const sx = Math.round(x - camX);
      if (sx + w < -10 || sx > W + 10) continue;
      blit(ctx, rake, sx, y);
    }
    ctx.restore();
    // the departure's one tell before the wheels turn: the door lamp
    if (tr.departure) {
      const dx = Math.round(doorX() - camX);
      ctx.fillStyle = `rgba(255,220,120,${0.35 + 0.25 * Math.sin(G.rawTime * 0.3)})`;
      ctx.fillRect(dx - 14, 30, 28, 4);
    }
  }
  if (tr.aboard && camX < ROOF_X) {
    // grab straps and a plastic bag on a hook, one shared sine, one phase each
    const amp = 2 + tr.swing * 9;
    ctx.fillStyle = '#c8b898';
    for (let x = Math.floor(camX / 96) * 96; x < camX + W + 96; x += 96) {
      const ph = (x / 96) * 0.9;
      const dx = Math.sin(G.rawTime * 0.07 + ph) * amp;
      const sx = Math.round(x - camX + 48);
      ctx.fillRect(sx, 22, 2, 6);
      ctx.fillRect(Math.round(sx + dx * 0.5), 28, 2, 10);
      ctx.fillRect(Math.round(sx + dx - 3), 38, 8, 5);
    }
    const fam = ASSETS.amb_family;
    if (fam) {
      const fx = 6900 - camX;
      if (fx > -140 && fx < W) {
        const breathe = 1 + Math.sin(G.rawTime * 0.03) * 0.012;
        const w = frameW(fam), h = frameH(fam);
        ctx.save();
        ctx.translate(Math.round(fx), 92);
        ctx.scale(1, breathe);
        blit(ctx, fam, 0, -h);
        ctx.restore();
      }
    }
    // someone's phone, two berths down, one carriage only
    const ph = 5520 - camX;
    if (ph > -20 && ph < W) {
      ctx.fillStyle = `rgba(120,180,255,${0.25 + 0.2 * Math.sin(G.rawTime * 0.5)})`;
      ctx.fillRect(Math.round(ph), 84, 10, 7);
    }
  }
}

// After the world: the tunnel's dark, the bridge's strobe, the torch, the cut.
export function drawTrainOverlay(ctx, camX) {
  const tr = G.train;
  if (!tr) return;
  if (tr.tunnel > 0 && tr.aboard) {
    const k = Math.min(1, tr.tunnel / 20, (TUNNEL_T - tr.tunnel) / 12);
    ctx.fillStyle = `rgba(3,3,10,${0.74 * k})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let x = Math.floor(camX / 240) * 240 + 120; x < camX + W + 240; x += 240) {
      const sx = x - camX;
      const g = ctx.createRadialGradient(sx, 40, 2, sx, 40, 110);
      g.addColorStop(0, `rgba(200,40,30,${0.30 * k})`);
      g.addColorStop(1, 'rgba(200,40,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 110, 0, 220, H);
    }
    ctx.restore();
  }
  if (tr.bridge > 0 && tr.bridge <= 70 && tr.aboard) {
    // hard shadows at 6 Hz
    if (((G.rawTime / 5) | 0) & 1) {
      ctx.fillStyle = 'rgba(0,0,12,0.42)';
      const off = (tr.t * 3) % 60;
      for (let x = -off; x < W; x += 60) ctx.fillRect(Math.round(x), 0, 30, H);
    }
    if (camX >= ROOF_X - 40) {
      // the girder itself: a riveted steel truss sweeping in from the front at head
      // height, its portal frame first, then the cross-bracing streaming over
      const k = (70 - tr.bridge) / 70;
      const gx = W + 60 - k * (W + 200);
      const beamY = 108, beamH = 14;
      const x0 = Math.max(0, Math.round(gx));
      if (x0 < W) {
        ctx.fillStyle = '#14161b';
        ctx.fillRect(x0, beamY, W - x0, beamH);
        ctx.fillRect(x0, 0, W - x0, 8);
        ctx.fillStyle = '#2e323c';
        ctx.fillRect(x0, beamY, W - x0, 2);
        ctx.fillRect(x0, beamY + beamH - 2, W - x0, 2);
        ctx.strokeStyle = '#24272f'; ctx.lineWidth = 3;
        const off = (tr.t * 6) % 48;
        ctx.beginPath();
        for (let x = x0 - off; x < W + 48; x += 48) {
          ctx.moveTo(x, 8); ctx.lineTo(x + 24, beamY);
          ctx.moveTo(x + 24, 8); ctx.lineTo(x, beamY);
        }
        ctx.stroke();
        ctx.fillStyle = '#3a3e48';
        for (let x = x0 + 6 - off; x < W; x += 16) ctx.fillRect(Math.round(x), beamY + 6, 2, 2);
      }
      ctx.fillStyle = '#101216';
      ctx.fillRect(Math.round(gx), 0, 30, beamY + beamH);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x0, beamY + beamH, W - x0, H);
    }
  }
  if (tr.blind > 0) {
    const k = Math.min(1, tr.blind / 12);
    ctx.fillStyle = `rgba(255,250,235,${0.86 * k})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (tr.ticket) {
    // the one thing you are carrying, in the corner, no words
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(W - 30, 44, 18, 10);
    ctx.fillStyle = '#c04030';
    ctx.fillRect(W - 27, 47, 12, 2);
    ctx.fillRect(W - 27, 50, 8, 1);
  }
  if (tr.cut > 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }
}
