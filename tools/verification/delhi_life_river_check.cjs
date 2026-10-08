// Dirty Delhi river life (js/delhi_life_river.js): art loads, drawing is cosmetic (no Math.random, no
// actors), and extras flinch from a nearby hit and go back to work.
// Usage: NODE_PATH=... node tools/verification/delhi_life_river_check.cjs  (server on :8011)
const studio = require('./studio_helper.cjs');
(async () => {
  const { page, errors, close } = await studio.launch(); const checks = [];
  const frame = await studio.openStudio(page, 'delhi/ghat');
  const run = fn => frame.evaluate(async src => {
    const [{ G }, { ASSETS }, life] = await Promise.all(['engine', 'assets', 'delhi_life_river'].map(n => import(`/js/${n}.js`)));
    return (0, eval)('(' + src + ')')(window.__review?.game || parent.__review.game, G, ASSETS, life);
  }, fn.toString());
  const r = await run((g, G, ASSETS, life) => {
    const missing = Object.keys(life.RIVER_LIFE_FILES).filter(k => !ASSETS[k]);
    G.india.bullDone = true; G.enemies = []; G.locked = true;
    let calls = 0; const rnd = Math.random; Math.random = () => { calls++; return rnd(); };
    for (const camX of [3240, 3600, 4050, 4400, 4860, 5200, 5520, 5670, 6000]) { G.camX = camX; for (let i = 0; i < 20; i++) { G.india.t++; g.render(); } }
    Math.random = rnd;
    return { missing, calls, actors: G.enemies.length };
  });
  checks.push(['all river life art loads', r.missing.length === 0, r.missing]);
  checks.push(['rendering consumes no randomness', r.calls === 0, r.calls]);
  checks.push(['rendering creates no actors', r.actors === 0]);
  // The washerman (p1, at 4598) flinches from a spark beside him and is back at work later.
  await run((g, G) => { G.camX = G.camLock = 4400; G.player.x = 4460; });
  await studio.step(page, 30);
  const alarm = () => run((g, G, A, life) => { G.camX = 4400; g.render(); return life.riverLifeAlarm('p1'); });
  const calm = await alarm();
  await run((g, G) => { G.effects.push({ type: 'spark', x: 4600, y: 220, t: 0, life: 9 }); });
  await studio.step(page, 2); const scared = await alarm();
  await studio.step(page, 300); const back = await alarm();
  checks.push(['extra flinches from a nearby hit and recovers', calm === 0 && scared > 0 && back === 0, [calm, scared, back]]);
  // Quiet scenery retains the workers while roaming carriers remain absent in areas and fights.
  for (const id of ['delhi/culvert', 'delhi/ghat', 'delhi/wharf', 'delhi/pontoon', 'delhi/encounter-10']) {
    await studio.load(page, id); await studio.step(page, 180);
    const counts = await run((g, G, A, life) => {
      g.render(); const c=life.riverCarriers(), p=life.riverPoles();
      return [c.routes.length,c.walkers.length,p.routes.length,p.walkers.length,life.riverQuayWalkers().length];
    });
    checks.push([id + ': no background walking carriers', counts.every(n=>n===0), counts]);
  }
  const failures = checks.filter(c => !c[1]);
  console.log(JSON.stringify({ checks: checks.map(c => [c[0], c[1]]), failures, errors }));
  await close(); process.exit(failures.length || errors.length ? 1 : 0);
})();
