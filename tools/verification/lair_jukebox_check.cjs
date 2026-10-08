// The lair's heavy bag takes the super, the control text is current, and the SOUND TEST lists
// every music slot the game plays, grouped by place, locked until first heard, persisted and
// announced. Captures (480 and 2x) go to tmp/review/lair_jukebox/.
// NODE_PATH=<playwright> PORT=8063 node tools/verification/lair_jukebox_check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GAME_URL || `http://localhost:${process.env.PORT || 8011}`;
const root = path.join(__dirname, '..', '..');
const out = path.join(root, 'tmp', 'review', 'lair_jukebox');
const SAVE = 'gigachadworldtour.save';

// Player-facing strings are upper-case literals; internal ids (ragnarok_*, 'grab' sfx,
// drawRagnarokGround) are not. Comments are stripped first.
function staleText() {
  const bad = [];
  for (const f of fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    for (const m of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
      if (/\bRAGNAROK\b|\bGRAB\b|USE\/GRAB/.test(m[2])) bad.push(f + ': ' + m[2]);
    }
  }
  return bad;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const checks = [];
  const check = (name, ok, info) => checks.push({ name, pass: !!ok, ...(ok ? {} : { info }) });
  const stale = staleText();
  check('no RAGNAROK/GRAB in player-facing strings', !stale.length, stale);
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  check('README controls drop grab', !/grab/i.test(readme.split('## Local play')[0]));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/');
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.G.state === 'welcome', null, { timeout: 90000 });
    await page.evaluate(() => { window.__game.G.freezeTime = true; });
    const shot = async (name) => {
      for (const [w, h, tag] of [[480, 270, '480'], [960, 540, '2x']]) {
        await page.setViewportSize({ width: w, height: h });
        await page.evaluate(() => window.__game.render());
        await page.locator('#game').screenshot({ path: path.join(out, `${name}_${tag}.png`) });
      }
      await page.setViewportSize({ width: 480, height: 270 });
    };
    const lib = () => page.evaluate(async () => {
      const m = await import('/js/music_library.js');
      return m.musicGroups().map((g) => ({ id: g.id, title: g.title, tracks: g.tracks.map((t) => ({ slot: t.slot, name: t.name, open: m.trackOpen(t) })) }));
    });

    // ---------------------------------------------------------------- the bag super
    const bag = await page.evaluate(async () => {
      const g = window.__game, G = g.G, { METER_MAX } = await import('/js/engine.js');
      g.hub(); G.fade = 0; G.transition = null;
      const b = G.props[0];
      Object.assign(G.player, { x: b.x - 60, y: 236, face: 1, state: 'idle', t: 0 });
      G.meter = METER_MAX; const score = G.score, hi = G.hiscore, bx = b.x;
      g.step(2);
      g.press('super'); g.step(1); g.release('super');
      const started = { special: G.player.state === 'special', target: G.player.specialTarget === b, meter: G.meter };
      return { started, score, hi, bx, METER_MAX };
    });
    check('bag: super starts on the bag', bag.started.special && bag.started.target, bag.started);
    check('bag: super spends the meter', bag.started.meter === 0, bag.started);
    // frames to capture: the wind-up, a mid blow and the finish
    const frames = await page.evaluate(async () => {
      const { superCues } = await import('/js/boxing_combos.js');
      const c = superCues(window.__game.G.player);
      return { hits: c.hits.map((h) => h.at), dur: c.dur };
    });
    const at = async (t) => page.evaluate((t) => { const G = window.__game.G; while (G.player.state === 'special' && G.player.superT < t) window.__game.step(1); }, t);
    await at(10); await shot('bag_super_windup');
    await at(frames.hits[1] ?? frames.hits[0]); await shot('bag_super_blow');
    await at(frames.hits.at(-1)); await shot('bag_super_finish');
    const early = await page.evaluate(() => {
      const g = window.__game, b = g.G.props[0];
      let peak = 0;
      for (let i = 0; i < 26; i++) { g.step(1); peak = Math.max(peak, Math.abs(b.swing)); }
      return peak;
    });
    await shot('bag_super_swing');
    const after = await page.evaluate((early) => {
      const g = window.__game, G = g.G, b = G.props[0];
      let peak = early;
      for (let i = 0; i < 240; i++) { g.step(1); peak = Math.max(peak, Math.abs(b.swing)); }
      return { peak, state: b.state, z: b.z, x: b.x, locked: b.superLocked, player: G.player.state, score: G.score, hi: G.hiscore };
    }, early);
    check('bag: the finish swings it hard', after.peak > 0.2, after);
    check('bag: it stays hung (no launch, no knockdown)', after.state === 'idle' && after.z === 0 && after.x === bag.bx && !after.locked, after);
    check('bag: CHAD recovers', ['idle', 'walk', 'idleanim'].includes(after.player), after);
    check('bag: no score farmed', after.score === bag.score && after.hi === bag.hi, after);
    await page.evaluate(() => { const g = window.__game, G = g.G; G.player.x = G.props[0].x - 40; G.meter = 100; g.step(2); });
    await shot('bag_meter_full_hud');
    const whiff = await page.evaluate(() => {
      const g = window.__game, G = g.G; G.player.x = 300; G.player.face = 1; G.meter = 100; g.step(2);
      g.press('super'); g.step(1); g.release('super'); g.step(2);
      return { state: G.player.state, meter: G.meter };
    });
    check('bag: nothing in reach still whiffs and keeps the meter', whiff.state !== 'special' && whiff.meter === 100, whiff);

    // ---------------------------------------------------------------- catalog
    const cat = await page.evaluate(async () => {
      const { audio } = await import('/js/audio.js'), { STAGES } = await import('/js/stages.js');
      const m = await import('/js/music_library.js');
      const manifest = await (await fetch('/audio/manifest.json')).json();
      const listed = m.musicGroups().flatMap((g) => g.tracks.map((t) => t.slot));
      const playable = audio.tracks();
      const staged = [...new Set(STAGES.flatMap(m.stageSlots))];
      const hub = (await import('/js/hub.js')).HUB_STAGE.music;
      return { listed, playable, staged, hub, manifest, groups: m.musicGroups().map((g) => [g.id, g.tracks.map((t) => t.slot)]), stageIds: STAGES.map((s) => s.id) };
    });
    const musicFiles = fs.readdirSync(path.join(root, 'audio', 'music')).filter((f) => f.endsWith('.mp3'));
    const manifestFiles = Object.values(cat.manifest).filter((v) => typeof v === 'string' && v.endsWith('.mp3')).map((v) => path.basename(v));
    check('every audio/music file is in the manifest', musicFiles.every((f) => manifestFiles.includes(f)), { musicFiles, manifestFiles });
    const fileSlots = Object.entries(cat.manifest).filter(([, v]) => typeof v === 'string' && v.endsWith('.mp3')).map(([k]) => k);
    check('every music file is listed', fileSlots.every((s) => cat.listed.includes(s)), { fileSlots, listed: cat.listed });
    const stagePlayable = cat.staged.filter((s) => cat.playable.includes(s));
    check('every playable stage slot is listed', stagePlayable.every((s) => cat.listed.includes(s)), { stagePlayable, listed: cat.listed });
    check('lair, lobby and title are listed', ['lair', 'lobby', 'title', cat.hub].every((s) => cat.listed.includes(s)));
    check('ending theme is listed', cat.listed.includes('ending'));
    check('only playable slots are listed', cat.listed.every((s) => cat.playable.includes(s)), cat.listed);
    check('no slot listed twice', new Set(cat.listed).size === cat.listed.length);
    check('groups in play order', JSON.stringify(cat.groups.map((g) => g[0])) === JSON.stringify(['lair', ...cat.stageIds.filter((id) => cat.groups.some((g) => g[0] === id))]), cat.groups);

    // ------------------------------------------------------------ locking and unlocking
    const fresh = await lib();
    check('fresh save: lair group open', fresh[0].tracks.every((t) => t.open));
    check('fresh save: stage tracks locked', fresh.slice(1).every((g) => g.tracks.every((t) => !t.open)), fresh);
    // the bag test above ran in the hub: nothing on the stage side should have unlocked
    const jb = await page.evaluate(() => {
      const g = window.__game, G = g.G, tap = (a) => { g.press(a); g.step(1); g.release(a); g.step(2); };
      g.hub(); G.fade = 0; G.transition = null; G.player.x = 880; g.step(3);
      tap('use');
      const opened = G.hubPanel, cursor = G.hubAct;
      // down to the first locked row (the train's platform theme) and try it
      tap('down'); tap('down'); tap('down');
      const before = G.hubTrack; tap('attack');
      const lockedPick = { hubTrack: G.hubTrack, before, shake: G.shakePoster > 0, cursor: G.hubAct };
      return { opened, cursor, lockedPick };
    });
    check('jukebox opens on the playing track', jb.opened === 'hifi' && jb.cursor === 0, jb);
    check('locked track cannot be set', jb.lockedPick.hubTrack === jb.lockedPick.before && jb.lockedPick.shake, jb);
    await shot('jukebox_locked');
    // left/right jump by group, headers are never a stop
    const nav = await page.evaluate(async () => {
      const g = window.__game, G = g.G, tap = (a) => { g.press(a); g.step(1); g.release(a); g.step(2); };
      const m = await import('/js/music_library.js'), list = m.musicGroups().flatMap((x) => x.tracks);
      G.hubAct = 0; tap('right'); const r1 = list[G.hubAct].group.id;
      tap('right'); const r2 = list[G.hubAct].group.id; tap('left'); const l1 = list[G.hubAct].group.id;
      for (let i = 0; i < 40; i++) tap('down');
      const last = G.hubAct === list.length - 1;
      tap('back');
      return { r1, r2, l1, last, closed: !G.hubPanel };
    });
    check('right/left jump places', nav.r1 === 'train' && nav.r2 === 'delhi' && nav.l1 === 'train', nav);
    check('cursor reaches the last track and backs out', nav.last && nav.closed, nav);

    // hear the train's first theme and a silent slot
    const heard = await page.evaluate(async () => {
      const { audio } = await import('/js/audio.js'), G = window.__game.G;
      audio.music('train_a'); audio.music('hold'); audio.music('lair');
      const saved = JSON.parse(localStorage.getItem('gigachadworldtour.save') || '{}');
      return { heard: G.tracksHeard.slice(), pending: G.tracksNew.slice(), unseen: G.tracksUnseen.slice(), saved: saved.tracks };
    });
    check('first play unlocks a stage track', heard.heard.includes('train_a') && heard.pending.includes('train_a') && heard.unseen.includes('train_a'), heard);
    check('a slot that makes no sound unlocks nothing', !heard.heard.includes('hold'), heard);
    check('lair tracks are never queued', !heard.pending.includes('lair'), heard);
    check('unlock is saved at once', heard.saved?.heard?.includes('train_a') && heard.saved?.pending?.includes('train_a'), heard.saved);

    // leaving the lair before the toast comes up keeps the queue for next time
    const leftEarly = await page.evaluate(() => {
      const g = window.__game, G = g.G; g.hub(); g.step(5); g.travel('elevator'); G.freezeTime = true;
      return { toast: G.trackToast, queued: G.tracksNew.slice() };
    });
    check('an unshown toast is not lost', !leftEarly.toast && leftEarly.queued.includes('train_a'), leftEarly);
    // the lair announces it on arrival, then the hi-fi flags NEW until opened
    const toast = await page.evaluate(async () => {
      const g = window.__game, G = g.G, { TOAST_LIFE } = await import('/js/music_library.js');
      g.hub(); G.fade = 0; G.transition = null;
      const t0 = G.trackToast && { ...G.trackToast };
      const waiting = G.tracksNew.length;
      while (G.trackToast && G.rawTime < G.trackToast.start + 60) g.step(1);
      const saved = JSON.parse(localStorage.getItem('gigachadworldtour.save')).tracks.pending;
      return { t0, waiting, queued: G.tracksNew.length, saved, chimed: G.trackToast?.chimed, TOAST_LIFE };
    });
    check('lair arrival announces queued tracks', toast.t0?.slots?.includes('train_a') && toast.chimed, toast);
    check('queue kept until the toast is up, then spent and saved', toast.waiting > 0 && toast.queued === 0 && !toast.saved.length, toast);
    await shot('toast_lair');
    const expire = await page.evaluate(() => { const g = window.__game, G = g.G; g.step(400); return { toast: G.trackToast, unseen: G.tracksUnseen.slice() }; });
    check('toast expires, NEW stays until the hi-fi is opened', !expire.toast && expire.unseen.includes('train_a'), expire);
    await page.evaluate(() => { const g = window.__game, G = g.G; G.player.x = 760; g.step(2); });
    await shot('lair_hifi_new');
    // hi-fi out of view: the tag pins to the screen edge
    const edge = await page.evaluate(() => { const g = window.__game, G = g.G; G.player.x = 250; g.step(2); return G.camX; });
    await shot('lair_hifi_new_edge');
    await page.evaluate(() => { const g = window.__game, G = g.G; G.player.x = 1500; g.step(2); });
    await shot('lair_hifi_new_edge_left');
    const seen = await page.evaluate(() => {
      const g = window.__game, G = g.G, tap = (a) => { g.press(a); g.step(1); g.release(a); g.step(2); };
      G.player.x = 880; g.step(2); tap('use');
      const fresh = G.jukeboxFresh.slice(), unseen = G.tracksUnseen.slice();
      // set the newly unlocked track
      tap('right'); tap('attack');
      return { fresh, unseen, pick: G.hubTrack, saved: JSON.parse(localStorage.getItem('gigachadworldtour.save')).tracks };
    });
    check('opening the jukebox shows NEW and clears the flag', seen.fresh.includes('train_a') && !seen.unseen.length && !seen.saved.unseen.length, seen);
    check('an unlocked stage track can be set', seen.pick === 'train_a', seen);
    await shot('jukebox_partial');

    // reload: what was heard is still heard; the pick stays session-only
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.G.state === 'welcome', null, { timeout: 90000 });
    await page.evaluate(() => { window.__game.G.freezeTime = true; });
    const reloaded = await lib();
    const flat = reloaded.flatMap((g) => g.tracks);
    check('unlocks persist across a reload', flat.find((t) => t.slot === 'train_a').open && !flat.find((t) => t.slot === 'train_b').open, reloaded);

    // results: the card fills the screen from the banner to the continue prompt for the whole
    // tally, so a run's new music is never announced there; it waits for the lair
    const res = await page.evaluate(async () => {
      const g = window.__game, G = g.G, { RESULTS_CONTINUE } = await import('/js/results.js');
      g.trainScene('clear', 0);
      const { audio } = await import('/js/audio.js');
      audio.music('train_b'); audio.music('train_boss');
      let toastSeen = false;
      while (G.rawTime - G.stateT < RESULTS_CONTINUE + 120) { g.step(1); toastSeen ||= !!G.trackToast; }
      return { toastSeen, queued: G.tracksNew.slice(), state: G.state, RESULTS_CONTINUE };
    });
    check('results never show the toast', !res.toastSeen && res.state === 'clear', res);
    check('results leave the run\'s music queued', res.queued.includes('train_b') && res.queued.includes('train_boss'), res);
    await shot('toast_results');
    const cont = await page.evaluate(async () => {
      const g = window.__game, G = g.G;
      g.release('use'); g.step(2); g.press('use'); g.step(1); g.release('use');
      return { transition: !!G.transition, state: G.state };
    });
    check('results still continue on F', cont.transition && cont.state === 'clear', cont);
    const home = await page.evaluate(() => {
      const g = window.__game, G = g.G; G.transition = null; g.hub(); G.fade = 0;
      while (G.trackToast && G.rawTime < G.trackToast.start + 90) g.step(1);
      return { slots: G.trackToast?.slots || null, queued: G.tracksNew.slice() };
    });
    check('the lair announces what the run unlocked', home.slots?.includes('train_b') && home.slots?.includes('train_boss') && !home.queued.length, home);
    await shot('toast_lair_after_run');

    // everything open
    await page.evaluate(async () => {
      const g = window.__game, G = g.G, m = await import('/js/music_library.js');
      G.transition = null;
      for (const grp of m.musicGroups()) for (const t of grp.tracks) if (!G.tracksHeard.includes(t.slot)) G.tracksHeard.push(t.slot);
      G.tracksUnseen = []; G.tracksNew = [];
      g.hub(); G.fade = 0; G.transition = null; G.player.x = 880; g.step(2);
      g.press('use'); g.step(1); g.release('use'); g.step(2);
      G.hubAct = 7; g.step(1);
    });
    await shot('jukebox_unlocked');

    // an old save that cleared the train and Delhi, with no track record: backfilled, announced once
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ version: 2, hiscore: 5000, unlockedIds: ['train', 'delhi'], stageBest: { train: 5000, delhi: 9000 } })), SAVE);
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.G.state === 'welcome', null, { timeout: 90000 });
    const legacy = await page.evaluate(() => {
      const g = window.__game, G = g.G; G.freezeTime = true;
      const r = { heard: G.tracksHeard.slice(), pending: G.tracksNew.slice() };
      g.hub(); r.toast = G.trackToast?.slots || null;
      while (G.trackToast && G.rawTime < G.trackToast.start + 90) g.step(1);
      return r;
    });
    await shot('toast_lair_backfill');
    check('old save: cleared stage tracks backfilled', ['train_a', 'train_b', 'train_boss', 'delhi_a', 'delhi_boss'].every((s) => legacy.heard.includes(s)) && !legacy.heard.includes('miniboss') && !legacy.heard.includes('ending'), legacy);
    check('old save: announced once in the lair', legacy.toast && legacy.toast.includes('train_a'), legacy);

    // a save from when slots were named by act number keeps its unlocks under the new ids
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ version: 2, hiscore: 5000, unlockedIds: ['train'], stageBest: {},
      tracks: { heard: ['stage2a', 'boss', 'stage1b'], pending: ['boss2'], unseen: ['boss1', 'final'] } })), SAVE);
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.G.state === 'welcome', null, { timeout: 90000 });
    const renamed = await page.evaluate(() => {
      const G = window.__game.G;
      return { heard: G.tracksHeard.slice(), pending: G.tracksNew.slice(), unseen: G.tracksUnseen.slice() };
    });
    check('old slot ids migrate to stage names', ['train_a', 'delhi_b'].every((s) => renamed.heard.includes(s))
      && renamed.pending.includes('train_boss') && renamed.unseen.includes('delhi_boss') && renamed.unseen.includes('refund_boss')
      && !['stage2a', 'boss', 'miniboss', 'stage1b', 'boss2', 'boss1', 'final'].some((s) => [...renamed.heard, ...renamed.pending, ...renamed.unseen].includes(s)), renamed);

    check('no page errors', !errors.length, errors);
  } finally {
    await browser.close();
  }
  const failed = checks.filter((c) => !c.pass);
  console.log(JSON.stringify({ checks: checks.length, failed, captures: out }, null, 1));
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
