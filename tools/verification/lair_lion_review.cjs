// Lair lion captures through the Review Studio (trip/penthouse), driven by his own brain
// (hub.js), not by setting poses: every pose held at 1x and 2x, then the real behaviours as
// per-tick sequences with a log of pose, x, y and camera per capture.
//   NODE_PATH=... PORT=8064 node tools/verification/lair_lion_review.cjs [outDir]
// Writes <outDir>/pose_<name>_{1x,2x}.png and <outDir>/<seq>/<nnn>.png + log.txt; the
// sheets, GIFs and the walk kymograph come from tools/verification/lair_lion_sheets.py.
const fs = require('fs');
const path = require('path');
const studio = require('./studio_helper.cjs');
const out = process.argv[2] || 'tmp/review/lair_lion';

(async () => {
  const { page, errors, close } = await studio.launch();
  const frame = await studio.openStudio(page, 'trip/penthouse');
  fs.mkdirSync(out, { recursive: true });
  // the hub module inside the runtime frame (same URL, so the same instance the game uses)
  const hub = (fn, arg) => frame.evaluate(async ([src, arg]) => {
    const m = await import('/js/hub.js');
    return (0, eval)('(' + src + ')')(m, window.__game.G, arg);
  }, [fn.toString(), arg]);
  // CHAD parked at px, the lion at lx in a given state, the camera settled
  const stage = async (px, lx, state, pose, face) => {
    await hub((m, G, [px, lx, state, pose, face]) => {
      const L = m.hubLion();
      G.player.x = px; G.player.y = 232; G.player.state = 'idle'; G.combo = 0;
      Object.assign(L, { x: lx, y: 228, ty: 228, face, target: lx, state, pose, anim: null, t: 0,
        alert: 0, placed: true, hurry: false, roam: 99999, lastDist: Math.abs(px - lx), lastCombo: 0 });
    }, [px, lx, state, pose, face]);
    await studio.step(page, 30);
  };
  const shot = async (name) => {
    await studio.capture(page, path.join(out, `${name}_1x.png`), 1);
    await studio.capture(page, path.join(out, `${name}_2x.png`), 2);
  };

  // every pose, held: set, render, no ticks in between
  const poses = await hub(() => import('/js/lion_rig.js').then((r) => r.LION_RIG.poses));
  await stage(820, 700, 'sit', 'sit', 1);
  const poseLog = [];
  for (const p of poses) {
    poseLog.push(await hub((m, G, p) => {
      const L = m.hubLion();
      Object.assign(L, { pose: p, anim: null, state: 'sit', t: 10, face: 1 });
      return `${p} ${L.x.toFixed(2)} ${L.y.toFixed(2)} ${G.camX.toFixed(2)}`;
    }, p));
    await shot(`pose_${p}`);
  }
  fs.writeFileSync(path.join(out, 'poses.txt'), poseLog.join('\n') + '\n');

  // a sequence: `setup`, then n captures `every` ticks apart (1x for the walk kymograph)
  const seq = async (name, setup, n, every, scale = 2) => {
    const dir = path.join(out, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    await hub(setup);
    const log = [];
    for (let i = 0; i < n; i++) {
      await studio.capture(page, path.join(dir, String(i).padStart(3, '0') + '.png'), scale);
      log.push(await hub((m, G) => {
        const L = m.hubLion();
        return `${L.state} ${m.hubLionPose()} ${L.x.toFixed(2)} ${L.y.toFixed(2)} ${G.camX.toFixed(2)} ${L.face}`;
      }));
      await studio.step(page, every);
    }
    fs.writeFileSync(path.join(dir, 'log.txt'), log.join('\n') + '\n');
  };

  // (the camera follows CHAD, so the lion is staged within 200 px of him to stay in shot)
  // asleep, then called over: he wakes, stretches, and comes
  await stage(520, 680, 'lie', 'lie', -1);
  await seq('getup', (m) => { const L = m.hubLion(); L.alert = 100; L.target = 590; }, 120, 2);
  // a steady walk, every tick at 1x, for the kymograph (floor band per tick)
  await stage(640, 460, 'stand', 'stand', 1);
  await seq('walk', (m) => { m.hubLion().target = 600; }, 150, 1, 1);
  // and the bound (he uses it for far off and in a hurry)
  await stage(640, 430, 'stand', 'stand', 1);
  await seq('run', (m) => { m.hubLion().target = 700; }, 110, 1, 1);
  // CHAD walks round behind him: he turns (through the front view), sitting and standing
  await stage(560, 660, 'sit', 'sit', -1);
  await seq('turn', (m, G) => { G.player.x = 760; }, 40, 1);
  // sit -> lie down, then CHAD walks up to him: the head comes up once, with a growl
  await stage(520, 660, 'sit', 'sit', -1);
  await seq('liedown', (m) => { const L = m.hubLion(); L.t = 890; }, 60, 2);
  await seq('approach', (m, G) => { G.player.x = 600; }, 30, 2);
  // the super: he bounds off to the far end on his side of CHAD, turns round and watches
  await stage(1560, 1590, 'sit', 'sit', -1);
  await seq('scatter', (m) => { m.petsScatter(); }, 130, 1);

  console.log(JSON.stringify({ out, errors }));
  await close();
  if (errors.length) process.exitCode = 1;
})();
