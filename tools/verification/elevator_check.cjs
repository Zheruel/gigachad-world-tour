// Deterministic scene review and native-input checks; exports stay outside the repo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const out = process.env.REVIEW_DIR || '/private/tmp/gachi-elevator-review';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.GAME_URL || 'http://localhost:8011') + '/?auto=travel-elevator&t=1');
    await page.waitForFunction(() => window.__game?.G.state === 'travel');
    await page.waitForFunction(() => window.__game.travelReady());
    const result = await page.evaluate(async () => {
      const game = window.__game, G = game.G, results = [];
      const { CABIN_BOUNDS: b, elevatorGuide, drawElevatorCabin } = await import('/js/elevator.js');
      const { TRAVEL_DURATIONS: duration, TRAVEL_ART } = await import('/js/travel.js');
      const { ASSETS } = await import('/js/assets.js');
      const check = (name, ok) => results.push({ name, pass: !!ok });
      const hold = (key, n) => { game.press(key); game.step(n); game.release(key); game.step(1); };
      let confirmations = 0; const originalConfirm = G.audio.destinationSelected;
      G.audio.destinationSelected = () => { confirmations++; };
      G.freezeTime = false; game.hub(); G.unlockedStage = 0; game.setPlayerPos(800, 220);
      hold('use', 2); hold('attack', 2); game.step(20);
      check('map selection arms arrow and plays one confirmation', G.pendingDestination === 0 && confirmations === 1);
      G.audio.destinationSelected = originalConfirm;
      check('offscreen guide points right', elevatorGuide(700).direction === 1 && !elevatorGuide(700).visible);
      check('visible guide points at doorway', elevatorGuide(1300).visible && elevatorGuide(1300).x === 170);
      const originalSky = ASSETS.bg_lair_sky_far;
      const skyProbe = document.createElement('canvas'); skyProbe.width = 1920; skyProbe.height = 362;
      const towerProbe = document.createElement('canvas'); towerProbe.width = 240; towerProbe.height = 1200;
      const towerCtx = towerProbe.getContext('2d'); towerCtx.fillStyle = '#00cc00'; towerCtx.fillRect(0, 0, 240, 1200);
      const probeArt = { ...TRAVEL_ART, tower_3: towerProbe };
      const renderProbe = (color, frame = 350) => {
        const skyCtx = skyProbe.getContext('2d'); skyCtx.fillStyle = color; skyCtx.fillRect(0, 0, 1920, 362);
        ASSETS.bg_lair_sky_far = skyProbe;
        const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 270;
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
        drawElevatorCabin(ctx, { t: frame, x: 240, y: 230, look: 0 }, () => {}, probeArt);
        return ctx.getImageData(0, 0, 480, 270).data;
      };
      const wallRed = renderProbe('#ff0000', 779), wallBlue = renderProbe('#0000ff', 779);
      check('arrival wall completely hides skyline', wallRed.every((v, i) => v === wallBlue[i]));
      const redSky = renderProbe('#ff0000'), blueSky = renderProbe('#0000ff');
      ASSETS.bg_lair_sky_far = originalSky;
      let outsideChanges = 0, insideChanges = 0;
      for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) {
        const at = (y * 480 + x) * 4;
        if (redSky[at] !== blueSky[at] || redSky[at + 2] !== blueSky[at + 2]) {
          if (x < 91 || x >= 389 || y < 57 || y >= 221) outsideChanges++;
          else insideChanges++;
        }
      }
      check('city is visible only through rear window', outsideChanges === 0 && insideChanges > 1000);
      const towerPixel = (130 * 480 + 135) * 4;
      check('distant tower fully occludes skyline', redSky[towerPixel + 1] > redSky[towerPixel]
        && redSky[towerPixel] === blueSky[towerPixel] && redSky[towerPixel + 2] === blueSky[towerPixel + 2]);
      G.freezeTime = false; game.travel('elevator'); game.step(900);
      check('waits indefinitely for button', G.travel.t === 0 && !G.travel.started);
      hold('use', 1); check('cannot press panel remotely', !G.travel.started);
      hold('right', 150); hold('use', 1);
      check('panel starts ride', G.travel.started);
      game.press('use'); game.travel('elevator'); G.travel.x = b.right; game.step(50);
      check('held boarding input cannot start elevator', !G.travel.started);
      game.release('use'); game.step(1); hold('use', 1);
      check('fresh panel press after release starts elevator', G.travel.started);
      game.travel('elevator', true); game.step(2);
      hold('attack', 20); check('attack cannot skip', G.travel.phase === 'elevator');
      hold('left', 190); check('left cabin wall', G.travel.x === b.left);
      hold('right', 310); check('right cabin wall', G.travel.x === b.right);
      hold('up', 30); check('rear glass boundary', G.travel.y === b.back);
      hold('down', 40); check('front cabin boundary', G.travel.y === b.front);
      hold('pause', 1); const frozen = JSON.stringify(G.travel);
      hold('left', 40); check('pause freezes camera and movement', G.paused && JSON.stringify(G.travel) === frozen);
      hold('pause', 1); check('resume preserves cabin', !G.paused && G.travel.phase === 'elevator');
      const beforeDraw = JSON.stringify(G.travel); game.render(); game.render();
      check('render does not advance simulation', JSON.stringify(G.travel) === beforeDraw);
      game.step(duration.elevator - G.travel.t - 1);
      check('descent lasts full duration', G.travel.phase === 'elevator' && G.travel.t === 779);
      game.press('use'); game.press('attack'); game.step(1);
      check('natural arrival enters lobby', G.travel.phase === 'lobby' && G.travel.gate);
      game.step(190); G.travel.x = 827; game.step(30);
      check('held actions cannot trigger lobby exit', G.travel.phase === 'lobby');
      game.release('attack'); game.release('use'); game.step(1); hold('use', 1);
      game.step(110); check('fresh interact exits lobby', G.travel.phase === 'curb');
      const saved = {}, savedArt = { ...TRAVEL_ART };
      for (const k of Object.keys(TRAVEL_ART)) delete TRAVEL_ART[k];
      for (const k of ['bg_lair_sky_far', 'bg_lair_sky_near', 'bg_lair_floor', 'bg_lair_wall', 'travel_elevator_frame']) {
        saved[k] = ASSETS[k]; delete ASSETS[k];
      }
      game.travel('elevator', true); game.step(500); game.render();
      game.step(280); check('missing penthouse art still arrives', G.travel.phase === 'lobby');
      Object.assign(ASSETS, saved);
      Object.assign(TRAVEL_ART, savedArt);
      game.travel('elevator', true); let validFrames = 0;
      for (let t = 0; t < duration.elevator; t++) {
        game.release('left'); game.release('right'); game.press(Math.floor(t / 60) % 2 ? 'left' : 'right');
        game.step(1); game.render();
        if (Number.isFinite(G.travel.x) && Number.isFinite(G.travel.y)) validFrames++;
      }
      game.release('left'); game.release('right');
      check('all 780 walking frames render and arrive', validFrames === 780 && G.travel.phase === 'lobby');
      game.travel('elevator', true); game.step(350); G.fade = 0; game.render();
      const start = performance.now(); for (let i = 0; i < 120; i++) game.render();
      return { results, renderMs: (performance.now() - start) / 120 };
    });
    // Real browser keyboard events, followed by the standard Gamepad API.
    await page.evaluate(() => { const g = window.__game; g.travel('elevator', true); g.G.freezeTime = false; });
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(200); await page.keyboard.up('ArrowRight');
    assert(await page.evaluate(() => window.__game.G.travel.x > 240), 'native keyboard cabin movement');
    await page.keyboard.press('z');
    assert(await page.evaluate(() => window.__game.G.travel.phase === 'elevator'), 'keyboard cannot skip');
    await page.evaluate(() => {
      const pad = { connected: true, axes: [-1, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
      window.reviewPad = pad;
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
      window.__game.travel('elevator', true); window.__game.step(20);
    });
    assert(await page.evaluate(() => window.__game.G.travel.x < 240), 'gamepad cabin movement');
    await page.evaluate(() => {
      window.reviewPad.axes = [0, 0]; window.reviewPad.buttons[0] = { pressed: true, value: 1 };
      window.__game.step(20);
    });
    assert(await page.evaluate(() => window.__game.G.travel.phase === 'elevator'), 'gamepad cannot skip');
    await page.evaluate(() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] }); });
    const captures = process.argv.includes('--filmstrip') ? [...Array.from({length:26}, (_,i)=>i*30+1),779] : [1,160,350,530,695,779];
    for (const frame of captures) {
      await page.evaluate(frame => {
        const g = window.__game; g.G.freezeTime = false; g.travel('elevator', true); g.step(frame);
        g.G.freezeTime = true; g.G.fade = 0; g.render();
      }, frame);
      await page.screenshot({ path: path.join(out, `descent-${frame}.png`) });
    }
    await page.goto((process.env.GAME_URL || 'http://localhost:8011') + '/?auto=hub-elevator');
    await page.waitForFunction(() => window.__game?.G.state === 'hub');
    await page.evaluate(() => { window.__game.G.freezeTime = true; window.__game.G.fade = 0; window.__game.render(); });
    await page.screenshot({ path: path.join(out, 'doorway.png') });
    // The same player-facing controls power the interactive frame explorer.
    await page.goto((process.env.GAME_URL || 'http://localhost:8011') + '/review-elevator.html');
    await page.waitForFunction(() => document.getElementById('readout').textContent.startsWith('Frame'));
    await page.locator('#map').click();
    await page.locator('#preview').screenshot({path:path.join(out,'destination-arrow.png')});
    await page.locator('#door').click();
    await page.locator('#preview').screenshot({path:path.join(out,'doorway-arrow.png')});
    await page.locator('#ride').click(); await page.locator('#motion').selectOption('walk');
    await page.locator('#timeline').fill('351');
    assert((await page.locator('#readout').textContent()).includes('351'), 'review timeline seeks exactly');
    await page.locator('[data-step="-1"]').click();
    assert((await page.locator('#readout').textContent()).includes('350'), 'review steps backwards exactly');
    await page.locator('#preview').screenshot({path:path.join(out,'walking-review.png')});
    await page.locator('#scale').click();
    await page.locator('#preview').screenshot({path:path.join(out,'walking-1x.png')});
    await page.locator('#timeline').fill('779'); await page.locator('#play').click();
    await page.waitForFunction(() => {
      const g = document.getElementById('preview').contentWindow.__game.G;
      return g.travel?.phase === 'lobby' && g.fade <= 0 && g.freezeTime;
    });
    console.log(JSON.stringify({ ...result, nativeInputChecks: 4, errors, screenshots: out }, null, 2));
    assert.equal(errors.length, 0); assert(result.results.every(r => r.pass), 'elevator checks failed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
