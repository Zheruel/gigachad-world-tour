// Filmstrips of the Delhi background walkers (js/delhi_life_walk.js via delhi_life_market.js and
// delhi_life_river.js) going into and out of their doorways, lanes and pillars, at 2x, plus the
// front-row street sellers' routines. Writes tmp/review/delhi_pass2/walk/<name>.png (one strip each)
// and prints route stats. NODE_PATH=~/.cache/gachi-pw/node_modules node tools/verification/delhi_life_walk_review.cjs
const fs = require('fs'), studio = require('./studio_helper.cjs'), { execFileSync } = require('child_process');
const out = 'tmp/review/delhi_pass2/walk'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const { page, errors, close } = await studio.launch();
  const frame = await studio.openStudio(page, 'delhi/market');
  const run = (fn, arg) => frame.evaluate(async ([src, arg]) => {
    const [{ G }, market, river] = await Promise.all(['engine', 'delhi_life_market', 'delhi_life_river'].map(n => import(`/js/${n}.js`)));
    return (0, eval)('(' + src + ')')(window.__review?.game || parent.__review.game, G, market, river, arg);
  }, [fn.toString(), arg]);
  await run((g, G) => { G.enemies = []; G.boss = null; G.india.bullDone = true; G.locked = true; });
  const film = async (name, cam, box, n, every, setup, arg) => {
    const files = [];
    for (let i = 0; i < n; i++) {
      if (i === 0) await run(setup, arg);
      await run((g, G, m, r, c) => { G.enemies = []; G.camX = G.camLock = c; G.player.x = c + (c > 2600 ? 470 : 470); G.shake = 0; }, cam);
      const f = `${out}/_${name}_${i}.png`; await studio.capture(page, f, 2); files.push(f);
      await studio.step(page, every);
    }
    execFileSync('.venv/bin/python', ['-c', `
import sys;from PIL import Image
fs=sys.argv[3:];x,y,w,h=map(int,sys.argv[2].split(','));ims=[Image.open(f).crop((x*2,y*2,(x+w)*2,(y+h)*2)) for f in fs]
s=Image.new('RGB',(w*2*len(ims),h*2))
for i,im in enumerate(ims): s.paste(im,(i*w*2,0))
s.save(sys.argv[1])`, `${out}/${name}.png`, box.join(','), ...files]);
    files.forEach(f => fs.unlinkSync(f));
  };
  // Market walkers: start 70 px short of each end's diagonal and walk in.
  const walkers = await run((g, G, m) => m.MARKET_WALKERS.map(d => ({ key: d.key, a: d.a, b: d.b, speed: d.speed })));
  for (const [i, d] of walkers.entries()) for (const end of ['a', 'b']) {
    const e = d[end]; if (e.clip == null) continue;
    const toward = end === 'a' ? -1 : 1, x0 = e.x - toward * (e.len + 70), ticks = Math.ceil((e.len + 76) / d.speed);
    const cam = Math.round(e.clip - 240);
    await film(`m${i}_${d.key}_${end}`, cam, [170, 90, 150, 125], 10, Math.ceil(ticks / 9), (g, G, m, r, [i, x0, toward]) => {
      const w = G.india.marketLife.walkers[i]; Object.assign(w, { x: x0, dir: toward, inside: 0, flee: 0, alarm: 0, brake: 0 });
    }, [i, x0, toward]);
  }
  // River carriers (routes as walked; heading-left ones are mirrored, x < 0).
  const routes = await run((g, G, m, r) => { G.camX = 3300; g.render(); const c = r.riverCarriers(); return c.routes.map((d, i) => ({ key: d.key, a: d.a, b: d.b, speed: d.speed, flip: c.defs[i].dir < 0 })); });
  for (const [i, d] of routes.entries()) for (const end of ['a', 'b']) {
    const e = d[end], toward = end === 'a' ? -1 : 1;
    // a (entry) plays walking out of it, b (exit) walking into it.
    const x0 = end === 'a' ? e.x + 1 : e.x - (e.len + 70), dir = 1, ticks = Math.ceil((e.len + 76) / d.speed);
    const clipW = d.flip ? -e.clip : e.clip, cam = Math.round(clipW - 240);
    await film(`r${i}_${d.key}_${end}`, cam, [170, 70, 150, 135], 10, Math.ceil(ticks / 9), (g, G, m, r, [i, x0, dir, cam]) => {
      G.camX = cam; g.render(); const w = r.riverCarriers().walkers[i]; Object.assign(w, { x: x0, dir, inside: 0, alarm: 0 });
    }, [i, x0, dir, cam]);
  }
  // Street sellers: each held in frame through its routine.
  for (const [name, x] of [['panipuri', 42], ['pakora', 964], ['sugarcane', 1100], ['veggie', 1170]])
    await film(`s_${name}`, Math.max(0, x - 240), [Math.min(x, 240) - 75, 105, 150, 135], 12, 17, (g, G) => { }, null);
  console.log(JSON.stringify({ films: fs.readdirSync(out).length, errors: errors.slice(0, 5) }));
  await close();
})();
