// Isolated Delhi scenery at native and double size, including each panel join.
// GAME_URL=http://localhost:8011 NODE_PATH=... node tools/verification/delhi_background_capture.cjs [output-dir]
const fs = require('fs');
const path = require('path');
const studio = require('./studio_helper.cjs');
const out = process.argv[2] || 'tmp/review/delhi-background/current';
const areas = ['market', 'bazaar', 'food', 'vendor', 'culvert', 'ghat', 'wharf', 'pontoon'];
fs.mkdirSync(out, { recursive: true });
(async () => {
  const { page, errors, close } = await studio.launch();
  const captures = [];
  try {
    await studio.openStudio(page, 'delhi/market');
    for (const [index, area] of areas.entries()) {
      for (const [view, offset, tick] of [['west', 0, 180], ['east', 330, 540]]) {
        const camera = index * 810 + offset;
        await studio.seek(page, tick);
        await studio.settings(page, { routeX: camera });
        for (const scale of [1, 2]) {
          const file = path.join(out, `${area}-${view}-${scale}x.png`);
          await studio.capture(page, file, scale);
          captures.push({ area, view, camera, tick, scale, file });
        }
      }
      if (index) {
        const camera = index * 810 - 240;
        await studio.seek(page, 300);
        await studio.settings(page, { routeX: camera });
        const file = path.join(out, `join-${areas[index - 1]}-${area}-2x.png`);
        await studio.capture(page, file, 2);
        captures.push({ area, view: 'join', camera, tick: 300, scale: 2, file });
      }
    }
    const isolation = await studio.game(page, (g, G) => ({ enemies: G.enemies.length, boss: !!G.boss, state: G.state }));
    const report = { captures, isolation, errors };
    fs.writeFileSync(path.join(out, 'captures.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ captures: captures.length, isolation, errors }));
    if (errors.length || isolation.enemies || isolation.boss) process.exitCode = 1;
  } finally { await close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
