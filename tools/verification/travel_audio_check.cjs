const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const NativeAudio = window.Audio;
      window.reviewTracks = [];
      window.Audio = function (...args) {
        const track = new NativeAudio(...args);
        window.reviewTracks.push(track);
        return track;
      };
      window.Audio.prototype = NativeAudio.prototype;
    });
    await page.goto('http://localhost:8011/?auto=travel-elevator&t=1');
    await page.waitForFunction(() => window.__game?.travelReady());
    await page.keyboard.press('ArrowRight');
    const result = await page.evaluate(async () => {
      const game = window.__game, { audio } = await import('/js/audio.js');
      const lobby = window.reviewTracks.find(a => a.src.endsWith('/marble_lobby_hustle.mp3'));
      const check = (ok, message) => { if (!ok) throw new Error(message); };
      check(!!lobby, 'lobby track registered');
      if (lobby.readyState < 2) await new Promise((resolve, reject) => {
        lobby.addEventListener('canplay', resolve, { once: true });
        lobby.addEventListener('error', reject, { once: true });
        setTimeout(() => reject(new Error('music load timeout')), 8000);
      });
      game.G.freezeTime = false;
      game.travel('elevator', true);
      check(window.reviewTracks.every(a => a.paused), 'elevator has no music');
      game.step(780);
      await new Promise(resolve => setTimeout(resolve, 100));
      check(game.G.travel.phase === 'lobby' && !lobby.paused, 'arrival plays supplied music');
      audio.setPaused(true);
      check(lobby.paused, 'pause stops lobby music');
      audio.setPaused(false);
      await new Promise(resolve => setTimeout(resolve, 50));
      check(!lobby.paused, 'resume restarts lobby music');
      game.step(192); game.G.travel.x = 827; game.press('use'); game.step(1); game.release('use'); game.step(110);
      check(game.G.travel.phase === 'curb' && lobby.volume <= .2, 'open exterior doorway carries quiet lobby music');
      game.step(134);check(lobby.paused, 'closed exterior doorway stops lobby music');
      game.travel('lobby');
      await new Promise(resolve => setTimeout(resolve, 50));
      check(!lobby.paused, 'repeat lobby plays music');
      game.hub();
      check(lobby.paused, 'leaving travel stops lobby music');
      return { checks: 8, musicDuration: lobby.duration };
    });
    assert(result.musicDuration > 280);
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
