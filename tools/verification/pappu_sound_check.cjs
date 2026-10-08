// Ghee Pappu's sound design: the cue table, the generated samples, the manifest, the fight, the finisher and the loop bed hold to each other.
// Cue timing is checked in the real boss/finisher modules with a logging audio stub; the loop bed and pause/quit are checked on the real audio engine.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const URL0 = process.env.GAME_URL || 'http://localhost:8011', T = 1000 / 60;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const errors = [], results = [];
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/__pappu_sound_check', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Pappu sound check</title>' }));
    await page.goto(URL0 + '/__pappu_sound_check');
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../../audio/sfx/manifest.json'), 'utf8'));
    const logic = await page.evaluate(async (gen) => {
      const [{ G }, { createBoss, updateBoss }, { createPlayer }, { updateShots }, { debugResetInput }] = await Promise.all([
        import('./js/engine.js'), import('./js/bosses.js'), import('./js/player.js'), import('./js/shots.js'), import('./js/input.js')]);
      const { stringBeats, VENDOR_BUMP, VENDOR_FLING } = await import('./js/vendor_boss.js');
      const { PAPPU_CUES, pappuReset, pappu } = await import('./js/vendor_sound.js');
      const { PAPPU_SFX } = await import('./js/vendor_sound_bank.js');
      const { updateVendorFinish } = await import('./js/vendor_finisher.js');
      const {PB} = await import('./js/vendor_puri_finish.js');
      const out = [], ok = (n, v, d) => out.push([n, !!v, d === undefined ? '' : JSON.stringify(d)]);
      let plays = [], loops = [];
      G.audio = { sfx() {}, roomSfx() { return true; }, roomSfxAt() { return true; }, roomLoop: (n, v) => { loops.push([n, v, G.rawTime]); return true; },
        stopRoomLoop() {}, voiceRandom() { return false; }, voice() { return false; } };
      // 1. table, samples and manifest agree
      const used = new Set(Object.values(PAPPU_CUES).flatMap(c => c.s)), bank = new Set(PAPPU_SFX);
      const missingFiles = [];
      for (const n of bank) { const r = await fetch(`audio/sfx/${n}.wav`, { method: 'HEAD' }); if (!r.ok) missingFiles.push(n); }
      ok('every bank sample has a wav', !missingFiles.length, missingFiles);
      const notReg = [...bank].filter(n => !gen[n] || gen[n].verifiedByEar !== false || !(gen[n].peakMs >= 0) || !gen[n].sources?.length);
      ok('every bank sample is in the manifest with sources, peak and verifiedByEar:false', !notReg.length, notReg);
      ok('every manifest vendor_ sample is in the bank', Object.keys(gen).filter(n => n.startsWith('vendor_')).every(n => bank.has(n)));
      ok('every cue variant is in the bank', [...used].every(n => bank.has(n)), [...used].filter(n => !bank.has(n)));
      const loose = [...bank].filter(n => !used.has(n) && !gen[n].loop);
      ok('no bank sample is orphaned from the cue table', !loose.length, loose);
      ok('both beds are loops', gen.vendor_bed?.loop && gen.vendor_flame_bed?.loop);
      // lead: the sample's main peak lands on the frame it belongs to
      const T = 1000 / 60, badLead = [], badPeak = [];
      for (const [k, c] of Object.entries(PAPPU_CUES)) for (const s of c.s) {
        const pk = gen[s].peakMs;
        if (c.lead != null) { if (Math.abs(pk - c.lead * T) > 70) badLead.push([k, s, pk, c.lead]); }
        else if (!c.swell && pk > 120) badPeak.push([k, s, pk]);
      }
      ok('cues with a lead have their peak within 4 ticks of it', !badLead.length, badLead);
      ok('cues that fire on the beat (no lead, not a swell) peak within 120 ms', !badPeak.length, badPeak);
      ok('repeated hits have 2+ variants (swing, guard, hurt, cough, belly, slam, flop_land, oil_land)', ['swing', 'guard', 'hurt', 'cough', 'belly', 'slam', 'flop_land', 'oil_land'].every(k => PAPPU_CUES[k].s.length >= 2));
      // the helper: gap, rotation, fallback
      const setup = (o = {}) => {
        debugResetInput(); G.state = 'play'; G.stage = { id: 'delhi', lanes: [{ x0: 0, x1: 20000, top: 213, bot: 245 }] };
        G.camX = G.camLock = 2670; G.arenaSqueeze = 0; G.enemies = []; G.props = []; G.shots = []; G.zones = []; G.effects = []; G.pickups = [];
        G.time = G.rawTime = 0; G.score = 0; G.meter = 0; G.hitstop = 0; G.player = createPlayer();
        Object.assign(G.player, { x: 2670 + 180, y: 226, z: 0, state: 'idle', hp: 100, face: 1, invuln: 0 });
        G.india = { startCinematic: () => true }; const b = createBoss('vendor', 2670 + 250, 223);
        Object.assign(b, { x: 2670 + 250, y: 226, face: -1, atkCd: 999 }, o); pappuReset(); G.pappuLog = []; loops = []; return b;
      };
      const run = (b, n, px, f) => { const hits = []; for (let i = 0; i < n; i++) { G.time++; G.rawTime++; const hp = G.player.hp; updateBoss(); if (G.player.hp < hp) hits.push(G.rawTime); G.player.hp = 100; G.player.invuln = 0; if (px != null) G.player.x = b.x - px; f && f(i); } return hits; };
      const tk = (n) => G.pappuLog.filter(e => e.name === n).map(e => e.t);
      setup(); G.rawTime = 100; pappu('guard', 0); G.rawTime = 101; const g2 = pappu('guard', 0);
      ok('a cue inside its gap holds off', g2 === '');
      G.rawTime = 200; const seq = []; for (let i = 0; i < 12; i++) { G.rawTime += 40; seq.push(pappu('hurt', 0)); }
      ok('hurt variants never repeat back to back', seq.every((s, i) => i === 0 || s !== seq[i - 1]) && new Set(seq).size >= 3, seq);
      G.audio.roomSfxAt = () => false; const savedSfx = G.audio.roomSfx; let fb = 0; G.audio.roomSfx = () => false; G.audio.burp = () => { fb++; };
      pappu('burp', 0); ok('a missing sample falls back to the synth cue', fb === 1);
      G.audio.roomSfxAt = () => true; G.audio.roomSfx = savedSfx; delete G.audio.burp;
      // 2. attacks: the cue lands on the impact tick (lead ticks before the hit for whooshes)
      let b = setup({ state: 'string', pattern: 'string', t: 0 }); let hits = run(b, 200, 62); const k1 = stringBeats({ phase: 1 });
      const sw = tk('swing'), sb = tk('swing_big'), sl = tk('slam');
      ok('phase 1 string: swings sound lead ticks before each swing', sw[0] === Math.max(1, k1.a - PAPPU_CUES.swing.lead) && sw[1] === k1.b - PAPPU_CUES.swing.lead, { sw, k1 });
      ok('phase 1 string: the windup whoosh and the slam land on the overhead', sb[0] === k1.slam - PAPPU_CUES.swing_big.lead && sl[0] === k1.slam && hits.includes(k1.slam), { sb, sl, hits, k1 });
      ok('phase 1 string: the skimmer lifts on the raise beat', tk('raise')[0] === k1.raise);
      b = setup({ state: 'string', pattern: 'string', t: 0, phase: 3, phaseTwo: true }); run(b, 120, 62); const k3 = stringBeats({ phase: 3 });
      ok('phase 3 string: the ripped-out second overhead has its own whoosh, slam and rip', tk('swing_big')[1] === k3.slam2 - PAPPU_CUES.swing_big.lead && tk('slam')[1] === k3.slam2 && tk('rip')[0] === k3.slam + 10, { k3, sb: tk('swing_big'), sl: tk('slam'), rip: tk('rip') });
      b = setup({ state: 'bump', pattern: 'bump', t: 0 }); hits = run(b, 60, VENDOR_BUMP.front);
      ok('belly bump: air push leads the hit, the belly lands on it', tk('bump_whoosh')[0] === Math.max(1, VENDOR_BUMP.hit - PAPPU_CUES.bump_whoosh.lead) && tk('belly')[0] === VENDOR_BUMP.hit && hits[0] === VENDOR_BUMP.hit, { w: tk('bump_whoosh'), bl: tk('belly'), hits });
      b = setup({ state: 'fling', pattern: 'scoop', t: 0, face: 1 }); G.player.x = b.x - 120; let spawn = 0;
      for (let i = 0; i < 60; i++) { G.time++; G.rawTime++; const n = G.shots.length; updateBoss(); if (G.shots.length > n && !spawn) spawn = G.rawTime; }
      ok('oil fling: the swish leads the first glob by its lead', spawn === VENDOR_FLING && tk('fling')[0] === VENDOR_FLING - PAPPU_CUES.fling.lead, { spawn, f: tk('fling') });
      b = setup({ state: 'dip', pattern: 'scoop', t: 0 }); run(b, 40, null);
      ok('the ladle goes into the oil on the first tick and stirs on its beat', tk('ladle_in')[0] === 1 && tk('stir').length >= 1, { l: tk('ladle_in'), s: tk('stir') });
      // hurt / guard / parry reactions
      b = setup(); b.hurt(4, 1, false, false); ok('a guarded jab clangs the pan', tk('guard').length === 1);
      // 3. a whole fight: no machine-gunning, no same-sample stacking, the bed heartbeat every tick
      const fight = [];
      for (const ph of [1, 2, 3]) {
        b = setup(ph > 1 ? { phase: ph, phaseTwo: true, atkCd: 30 } : { atkCd: 30 });
        if (ph === 3) Object.assign(b, { lastOrder: true, maxGuard: 1 });
        b.hp = ph === 1 ? b.maxhp : ph === 2 ? Math.floor(b.maxhp * .5) : Math.floor(b.maxhp * .2);
        run(b, 3600, 70); fight.push({ ph, log: G.pappuLog.slice(), loops: loops.slice() });
      }
      const problems = [];
      for (const f of fight) {
        const by = {};
        for (const e of f.log) (by[e.name] ??= []).push(e);
        for (const [n, es] of Object.entries(by)) {
          const c = PAPPU_CUES[n];
          for (let i = 1; i < es.length; i++) {
            if (c.gap && es[i].t - es[i - 1].t < c.gap && es[i].t !== es[i - 1].t) problems.push(['gap', f.ph, n, es[i - 1].t, es[i].t]);
            if (c.s.length > 1 && es[i].sample === es[i - 1].sample && es[i].t - es[i - 1].t < 90) problems.push(['repeat', f.ph, n, es[i].t]);
          }
        }
        for (let i = 0; i < f.log.length; i++) { let n = 1; for (let j = i + 1; j < f.log.length && f.log[j].t - f.log[i].t < 30; j++) n++; if (n > 6) { problems.push(['dense', f.ph, f.log[i].t, n]); break; } }
        const beats = new Set(f.loops.map(l => l[2]));
        if (!(beats.size > 3000)) problems.push(['bed', f.ph, beats.size]);
      }
      ok('a full three-phase fight has no machine-gunning, no repeated variant, one bed heartbeat per tick', !problems.length, problems.slice(0, 8));
      ok('the fight actually makes the attack sounds (slam every phase; swing and fling before the furnace; breath, flop_land)',
        fight.every(f => f.log.some(e => e.name === 'slam')) && ['swing', 'fling'].every(n => fight.slice(0, 2).every(f => f.log.some(e => e.name === n))) && fight.some(f => f.log.some(e => e.name === 'breath')) && fight.some(f => f.log.some(e => e.name === 'flop_land')),
        fight.map(f => [...new Set(f.log.map(e => e.name))]));
      ok('the bed volume steps up with the phase', fight[0].loops[0][1] < fight[1].loops[0][1] && fight[1].loops[0][1] < fight[2].loops[0][1], fight.map(f => f.loops[0]?.[1]));
      // 5. the finisher: cues on the exact cinematic ticks
      G.pappuLog = []; loops = [];
      const c = { cues: new Set(), boss: { kadai: null, x: 2670 + 250, y: 226 } }, cam = 2670;
      for (let t = 0; t <= PB.end + 4; t++) { G.rawTime = t; G.time = t; try { updateVendorFinish(c, t, cam); } catch (e) { ok('finisher cue pass runs (t=' + t + ')', false, e.message); break; } }
      const fl = G.pappuLog, at = n => fl.filter(e => e.name === n).map(e => e.t);
      const one = [['gut_hook', PB.gut], ['vest_grab', PB.grab], ['glug', PB.gulp], ['rib_crack', PB.crack], ['scream_pop', PB.burst]];
      const wrong = one.filter(([n, t]) => at(n)[0] !== t).map(([n, t]) => [n, t, at(n)[0]]);
      ok('finisher: gut hook, grab, gulp, crack and pop cues land on contact', !wrong.length, wrong);
      ok('finisher: every major cue fires once', one.every(([n])=>at(n).length===1));
      ok('finisher: never resurrects the discarded cooking pot', !fl.some(e=>['pot_clang','pot_jam','kadai_tip','ghee_spill'].includes(e.name)));
      // overlap in AUDIO time: two loud voice-class samples must not sound together for more than a moment
      const dur = n => gen[n].seconds * 60, voiceLike = /^vendor_(scream|roar|groan|grunt|hurt|cough|wheeze|chuckle|exhale)/;
      const vl = fl.filter(e => voiceLike.test(e.sample)).sort((a, b) => a.t - b.t), stack = [];
      for (let i = 0; i < vl.length; i++) for (let j = i + 1; j < vl.length; j++) { const over = vl[i].t + dur(vl[i].sample) - vl[j].t; if (over > 12) stack.push([vl[i].sample, vl[j].sample, Math.round(over)]); }
      ok('finisher: voice-class sounds never overlap for more than 12 ticks', !stack.length, stack);
      const same = []; for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) if (fl[i].sample === fl[j].sample && fl[j].t - fl[i].t < 4 && fl[i].t !== fl[j].t) same.push([fl[i].sample, fl[i].t, fl[j].t]);
      ok('finisher: the same sample is never re-triggered within 4 ticks', !same.length, same);
      return out;
    }, manifest.generated);
    results.push(...logic);
    // 6. real audio engine: the bed lives on a heartbeat, dies with pause, quit and neglect
    const game = await browser.newPage();
    game.on('pageerror', e => errors.push(e.message));
    await game.goto(URL0 + '/?auto=walk');
    await game.waitForFunction(() => window.__game?.G.state === 'play', { timeout: 60000 });
    await game.keyboard.press('KeyQ');
    await game.waitForFunction(() => __game.G.audio.has('vendor_bed') && __game.G.audio.has('vendor_flame_bed') && __game.G.audio.has('vendor_swing_1'), { timeout: 60000 });
    const live = await game.evaluate(async () => {
      const G = __game.G, A = G.audio, out = [], ok = (n, v, d) => out.push([n, !!v, d === undefined ? '' : JSON.stringify(d)]), wait = ms => new Promise(r => setTimeout(r, ms));
      const wasPaused = G.paused; G.paused = true; // (the autowalking game would otherwise add its own room sounds)
      A.stopRoomAudio(); const s0 = A.snapshot();
      ok('the real engine plays a Pappu cue sample', A.roomSfxAt('vendor_swing_1', .3, 0, 1) === true && A.snapshot().roomSources === s0.roomSources + 1);
      A.stopRoomAudio();
      ok('the bed starts on its first heartbeat', A.roomLoop('vendor_bed', .15) === true && A.snapshot().loops === 1 && A.snapshot().roomSources === 1);
      await wait(900); A.roomLoop('vendor_bed', .15);
      ok('a repeated heartbeat keeps a single bed', A.snapshot().loops === 1, A.snapshot());
      A.setPaused(true); await wait(200);
      ok('pause suspends the audio context, so the bed is silent', A.snapshot().state === 'suspended');
      await wait(1400);
      ok('the bed is not reaped while paused (the audio clock is frozen)', A.snapshot().loops === 1);
      A.setPaused(false); await wait(150); A.roomLoop('vendor_bed', .15);
      ok('resuming picks the bed up again without a second one', A.snapshot().state === 'running' && A.snapshot().loops === 1, A.snapshot());
      await wait(1500);
      ok('a bed nobody calls fades out on its own (finisher / boss gone)', A.snapshot().loops === 0, A.snapshot());
      A.roomLoop('vendor_bed', .15); A.roomLoop('vendor_flame_bed', .15); A.roomSfxAt('vendor_dunk', .3, 0, 1);
      A.stopRoomAudio();
      ok('quit / checkpoint / finisher stopRoomAudio kills beds and cues', A.snapshot().loops === 0 && A.snapshot().roomSources === 0, A.snapshot());
      A.roomLoop('vendor_bed', .15); A.stopRoomLoop('vendor_bed', .1); await wait(400);
      ok('stopRoomLoop fades one bed out', A.snapshot().loops === 0 && A.snapshot().roomSources === 0, A.snapshot());
      A.stopRoomAudio(); G.paused = wasPaused; return out;
    });
    results.push(...live);
    const bad = results.filter(r => !r[1]);
    for (const [n, v, d] of results) console.log((v ? 'ok   ' : 'FAIL ') + n + (v || !d ? '' : '  ' + d.slice(0, 400)));
    assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));
    assert.equal(bad.length, 0, bad.length + ' Pappu sound checks failed');
    console.log('pappu sound check passed (' + results.length + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
