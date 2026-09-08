// Real game state-machine checks: route retries, input gates and campaign handoff.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.GAME_URL || 'http://localhost:8011') + '/?auto=walk');
    await page.waitForFunction(() => window.__game?.G.state === 'play', { timeout: 60000 });
    const results = await page.evaluate(async () => {
      const game = __game, G = game.G, results = [];
      const check = (label, pass) => results.push([label, !!pass]);
      const { updateIndiaCheckpoint, restoreIndiaCheckpoint } = await import('./js/india_checkpoints.js');
      const { readProgress } = await import('./js/progress.js');
      const { input } = await import('./js/input.js');
      for (const id of ['delhi', 'refund']) {
        game.indiaScene(id, 'card');
        check(id + ' preparation is silent', G.audio.snapshot().music === null);
        game.press('use'); game.step(45);
        check(id + ' held F cannot start loading card', G.state === 'chapter-card');
        game.release('use'); game.step(2); game.press('use'); game.step(1); game.release('use');
        check(id + ' fresh F starts intro and correct track', G.state === 'intro' && G.audio.snapshot().music === G.stage.music);
        const time = G.rawTime; G.paused = true; game.step(20);
        check(id + ' intro pauses', G.rawTime === time);
        G.paused = false; game.step(G.stage.introTicks + 3);
        check(id + ' introduction hands off into gameplay', G.state === 'play' && !G.player.dying);
      }
      game.indiaScene('refund', 'card');
      const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
      pad.buttons[4] = { pressed: true, value: 1 }; game.step(20);
      check('held LB cannot dismiss Refund card', G.state === 'chapter-card');
      pad.buttons[4] = { pressed: false, value: 0 }; game.step(2);
      pad.buttons[4] = { pressed: true, value: 1 }; game.step(1);
      check('fresh LB starts Refund intro', G.state === 'intro');
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] }); game.resetInput();

      for (const [id, gate, previousWave] of [['delhi', 3240, 7], ['delhi', 5800, 10], ['refund', 4050, 6], ['refund', 5800, 10]]) {
        game.stage(game.STAGES.findIndex(s => s.id === id)); G.freezeTime = true;
        G.score = 4321; G.stats = { hits: 17, kos: 12 }; G.bestCombo = 7;
        G.player.x = gate + 5; G.waveIndex = previousWave; G.boss = null; G.waveActive = true;
        updateIndiaCheckpoint();
        check(id + ' ' + gate + ' checkpoint waits for cleared encounter', G.india.checkpoint === 0);
        G.india.recoveryWaves = new Set([1, 3]);
        G.waveActive = false; updateIndiaCheckpoint();
        const cp = G.india.retryPoint, oldLives = G.lives;
        G.score += 999; G.stats.hits += 10; G.bestCombo = 22; G.meter = 99;
        G.player.hp = 1; G.player.poison = 120; G.player.grabbedBy = {}; G.player.guardWindow = 12;
        G.india.cinematic = { kind: 'closer-finish', t: 50 }; G.india.endingDone = true;
        G.india.recoveryWaves.add(8); G.india.reserveWave = 8; G.india.reserveIndex = 2;
        game.press('attack');
        restoreIndiaCheckpoint();
        check(id + ' ' + gate + ' full-health fixed-meter retry', G.player.hp === 100 && G.meter === 50 && !G.player.dying && G.player.poison === 0 && G.player.guardWindow === 0);
        check(id + ' ' + gate + ' score and earned stats roll back once', G.score === 4321 && G.stats.hits === 17 && G.bestCombo === 7 && G.lives === oldLives);
        check(id + ' ' + gate + ' route resumes at next uncleared wave', G.waveIndex === previousWave && G.stage.waves[previousWave].done && !G.stage.waves[previousWave + 1].done && G.player.x === cp.x);
        check(id + ' ' + gate + ' clears input and encounter leftovers', !input.held('attack') && !G.boss && !G.india.cinematic && !G.india.endingDone && !G.enemies.length && !G.shots.length);
        check(id + ' ' + gate + ' recovery awards and reserve queues roll back', G.india.recoveryWaves.size === 2 && G.india.recoveryWaves.has(1) && G.india.recoveryWaves.has(3) && !G.india.recoveryWaves.has(8) && G.india.reserveWave === -1 && G.india.reserveIndex === 0);
      }

      for (const [id, key] of [['delhi', 'vendor'], ['delhi', 'dredger'], ['refund', 'closer']]) {
        game.stage(game.STAGES.findIndex(s => s.id === id)); G.freezeTime = true;
        const wi = G.stage.waves.findIndex(w => w.miniboss === key || w.boss && G.stage.boss === key), wave = G.stage.waves[wi];
        G.stage.waves.forEach((w, i) => { w.done = i < wi; }); G.waveIndex = wi - 1;
        G.enemies = []; G.spawnQueue = []; G.waveActive = false; G.boss = null; G.locked = false;
        G.camX = G.camLock = wave.camX; G.player.x = wave.x; G.player.y = 236; G.score = 2000;
        game.step(1);
        check(key + ' activation captures whole encounter checkpoint', G.state === 'bossintro' && G.india.retryPoint.bossKey === key && G.india.retryPoint.completedWave === wi - 1);
        if (key === 'closer') check('Closer arrives with one security ally', G.enemies.length === 1 && G.enemies[0].trainType === 'ic_security');
        game.step(200); G.enemies = []; G.hitstop = 0;
        Object.assign(G.player, { hp: 0, dying: true, state: 'down', t: 71, z: 0, vz: 0 });
        G.score += 500; const lives = G.lives; game.step(1);
        check(key + ' death restores consistent player and score baseline', G.lives === lives - 1 && G.player.hp === 100 && G.meter === 50 && G.score === 2000 && !G.boss);
        game.step(1);
        check(key + ' retry starts fresh boss and props', G.state === 'bossintro' && G.boss.key === key && G.boss.hp === G.boss.maxhp && (!G.boss.fightProps || G.boss.fightProps.every(p => !p.broken)));
      }

      // Actual game-over/continue path must use the same checkpoint restoration.
      game.step(200); G.enemies = []; G.hitstop = 0; G.lives = 0;
      Object.assign(G.player, { hp: 0, dying: true, state: 'down', t: 71, z: 0, vz: 0 }); game.step(1);
      check('exhausted lives enter normal continue screen', G.state === 'over');
      game.press('attack'); game.step(1); game.release('attack'); game.step(24);
      check('continue restarts Closer from full encounter', G.state === 'bossintro' && G.boss.key === 'closer' && G.boss.hp === G.boss.maxhp && G.player.hp === 100 && G.meter === 50);

      game.trainScene('clear', 220); game.step(1); game.press('use'); game.step(1); game.release('use'); game.step(35);
      check('train victory hands off into silent Delhi card', G.stage.id === 'delhi' && G.state === 'chapter-card' && G.audio.snapshot().music === null);

      game.indiaScene('delhi', 'dredger'); G.boss.hurt(9999, 1, true, false); G.boss.hurt(9999, 1, true, false); G.hitstop = 0;
      game.press('use'); game.step(280);
      check('Delhi victory waits despite held confirmation', G.state === 'clear');
      const score = G.score; game.press('attack'); game.step(60); game.release('attack');
      check('attack cannot confirm or reaward Delhi victory', G.state === 'clear' && G.score === score);
      game.release('use'); game.step(2); game.press('use'); game.step(1); game.release('use'); game.step(35);
      check('Delhi victory reaches Refund loading card once', G.stage.id === 'refund' && G.state === 'chapter-card' && G.audio.snapshot().music === null);

      game.indiaScene('refund', 'closer'); G.boss.guard = 0; G.boss.hurt(9999, 1, true, true); G.hitstop = 0;
      check('Closer knockout begins the stage ending', G.india.cinematic?.kind === 'closer-finish');
      const cineT = G.india.cinematic.t; G.paused = true; game.step(40);
      check('Closer finishing sequence pauses', G.india.cinematic.t === cineT); G.paused = false;
      game.press('use'); game.step(540);
      check('Closer ending reaches held chapter victory', G.state === 'clear' && G.india.endingDone);
      const finalScore = G.score; game.step(300);
      check('chapter victory holds and scores only once', G.state === 'clear' && G.score === finalScore);
      game.release('use'); game.step(2); game.press('use'); game.step(1); game.release('use'); game.step(35);
      check('fresh confirmation reaches chapter conclusion', G.state === 'ending');

      const migrated = readProgress({ version: 2, stageBest: { train: 9000, delhi: 14000 }, unlockedIds: ['train', 'delhi'] }, game.STAGES);
      check('existing Delhi clear unlocks Refund without losing records', migrated.unlockedStage === 2 && migrated.actBest[0] === 9000 && migrated.actBest[1] === 14000);
      return results;
    });
    console.log(JSON.stringify({ checks: results, errors }));
    assert(results.every(x => x[1]), JSON.stringify(results.filter(x => !x[1])));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
