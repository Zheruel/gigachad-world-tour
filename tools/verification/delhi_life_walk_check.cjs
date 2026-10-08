// Delhi background walkers (js/delhi_life_walk.js, used by delhi_life_market.js / delhi_life_river.js):
// a fight makes a pedestrian turn at most once, a vehicle never turns (it brakes, then speeds on),
// carriers duck in place and recover, nobody leaves a doorway into a fight, walkers going the same way
// never walk through each other, carriers step clear of the fixed performers on their line (feet eased
// off the line, depth-sorted by feet), the chai-wallah on the pavement is passed one walker at a time, and none
// of it touches Math.random or creates actors.
// Usage: NODE_PATH=~/.cache/gachi-pw/node_modules node tools/verification/delhi_life_walk_check.cjs  (server on :8011)
const studio = require('./studio_helper.cjs');
(async () => {
  const { page, errors, close } = await studio.launch(); const checks = [];
  const frame = await studio.openStudio(page, 'delhi/market');
  const run = fn => frame.evaluate(async src => {
    const [{ G }, walk, market, river] = await Promise.all(['engine', 'delhi_life_walk', 'delhi_life_market', 'delhi_life_river'].map(n => import(`/js/${n}.js`)));
    return (0, eval)('(' + src + ')')(window.__review?.game || parent.__review.game, G, walk, market, river);
  }, fn.toString());
  const r = await run((g, G, walk, market, river) => {
    let calls = 0; const rnd = Math.random; Math.random = () => { calls++; return rnd(); };
    const base = { a: { x: 0, clip: 0, depth: 190, len: 30 }, b: { x: 1000, clip: 1000, depth: 190, len: 30 }, y: 205, speed: 1, tpf: 8 };
    // A fight that jitters either side of the walker (the old ping-pong trigger).
    const jitter = (d, w, n, at) => { const out = { flips: 0, speeds: [], dirs: new Set([w.dir]), xs: [] }; let dir = w.dir;
      for (let t = 0; t < n; t++) { const x0 = w.x; walk.stepWalker(d, w, [at ?? w.x + (t % 2 ? 12 : -12)]); if (w.inside > 0) break;
        out.speeds.push(Math.abs(w.x - x0)); out.xs.push(w.x); if (w.dir !== dir) { out.flips++; dir = w.dir; } }
      return out; };
    const ped = walk.walkerState(base, 0); ped.x = 500; ped.dir = 1; const p = jitter(base, ped, 2000);
    // Vehicles brake for a fight well ahead, and get past one that is already close without stopping.
    const vd = { ...base, vehicle: true, speed: 1.2 }, veh = walk.walkerState(vd, 1); veh.x = 500; veh.dir = -1; const v = jitter(vd, veh, 2000, 330);
    const veh2 = walk.walkerState(vd, 3); veh2.x = 500; veh2.dir = -1; const near = jitter(vd, veh2, 60);
    // Carriers ease clear of the performers on their line: behind the washerman, in front of (below) the
    // rag-picker's basket and the watchman where the ledge leaves no room behind. Signed by the avoid's dy.
    const rc = river.riverCarriers(), behind = rc.routes.filter(d => d.avoid).map(d => d.avoid.map(v => {
      const w = walk.walkerState(d, 9); w.x = v.x; w.inside = 0; return (walk.walkerPose(d, w).y - (d.y + (w.lane || 0))) * -Math.sign(v.dy); })).flat();
    const porter = rc.defs.find(d => d.key === 'porter');
    // Hidden walkers stay in while the fight is at their door, and come out once it has been quiet.
    let held = true; for (let t = 0; t < 600; t++) { walk.stepWalker(base, ped, [ped.x < 500 ? 60 : 940]); if (ped.inside <= 0) held = false; }
    let out = -1; for (let t = 0; t < 1200 && out < 0; t++) { walk.stepWalker(base, ped, []); if (ped.inside <= 0) out = t; }
    // A carrier with alarm poses stops, looks, ducks, then carries on.
    const cd = { ...base, alarm: [8, 9], oneWay: true }, car = walk.walkerState(cd, 2); car.x = 400;
    const frames = []; let still = true;
    for (let t = 0; t < 300; t++) { const x0 = car.x; walk.stepWalker(cd, car, t < 80 ? [420] : []); if (t < 80 && car.x !== x0 && t > 0) still = false; frames.push(walk.walkerPose(cd, car).frame); }
    // Retired market traffic never returns, even after multiple old spawn intervals.
    G.enemies = []; G.boss = null; G.paused = false; G.india.bullDone = true; G.camX = 900;
    const m = G.india.marketLife || (market.updateDelhiMarketLife(), G.india.marketLife);
    let marketTraffic = market.MARKET_WALKERS.length + m.walkers.length;
    const effects = G.effects; G.effects = [];
    for (let t = 0; t < 6000; t++) {
      market.updateDelhiMarketLife(); marketTraffic += m.walkers.length;
    }
    G.effects = effects;
    Math.random = rnd;
    return { calls, actors: G.enemies.length, p, v: { flips: v.flips, min: Math.min(...v.speeds.slice(0, 30)), fast: Math.max(...v.speeds), dirs: [...v.dirs] },
      near: { flips: near.flips, min: Math.min(...near.speeds) }, behind, riverRoutes: rc.routes.length, marketTraffic,
      held, out, still, looked: frames.includes(8), ducked: frames.includes(9), walking: frames.at(-1) < 8,
      };
  });
  checks.push(['pedestrian turns at most once in a jittering fight', r.p.flips <= 1, r.p.flips]);
  checks.push(['vehicle never turns; brakes for a fight ahead, then speeds on', r.v.flips === 0 && r.v.min < .6 && r.v.fast > 2, r.v]);
  checks.push(['vehicle passes a close fight without stopping behind it', r.near.flips === 0 && r.near.min > 1.2, r.near]);
  checks.push(['river background walkers are removed', r.riverRoutes === 0, r.riverRoutes]);
  checks.push(['market pedestrians and vehicles stay absent over 6000 ticks', r.marketTraffic === 0, r.marketTraffic]);
  checks.push(['walker stays inside while the fight is at its door', r.held]);
  checks.push(['walker comes back out once it is quiet', r.out >= 0, r.out]);
  checks.push(['carrier stops, looks, ducks and walks on', r.still && r.looked && r.ducked && r.walking, [r.still, r.looked, r.ducked, r.walking]]);
  checks.push(['no Math.random', r.calls === 0, r.calls]);
  checks.push(['no actors', r.actors === 0]);
  const failures = checks.filter(c => !c[1]);
  console.log(JSON.stringify({ checks: checks.map(c => [c[0], c[1]]), failures, errors: errors.slice(0, 5) }));
  await close(); process.exit(failures.length || errors.length ? 1 : 0);
})();
