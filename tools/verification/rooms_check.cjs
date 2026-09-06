const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const out = '/private/tmp/gachi-rooms-review'; fs.mkdirSync(out, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8011/?auto=travel-elevator&t=1');
    await page.waitForFunction(() => window.__game?.travelReady());
    const checks = await page.evaluate(() => {
      const g = window.__game, results = [];
      const check = (name, ok) => { results.push({ name, pass: !!ok }); };
      for (const phase of ['elevator', 'lobby']) {
        g.G.freezeTime = false; g.travel(phase); g.step(2);
        g.press('jump'); g.step(1); g.release('jump'); g.step(8);
        check(`${phase} normal jump`, g.G.travel.actor.z > 15 && g.G.travel.actor.state === 'jump');
        g.step(60); check(`${phase} lands`, g.G.travel.actor.z === 0);
        g.press('right'); g.step(1); g.release('right'); g.step(1); g.press('right'); g.step(1);
        check(`${phase} double tap dash`, g.G.travel.actor.state === 'dash');
        g.step(20); check(`${phase} run after dash`, g.G.travel.actor.state === 'run');
        g.release('right'); g.step(20);
        g.press('attack'); g.step(1); g.release('attack');
        check(`${phase} normal attack`, g.G.travel.actor.state === 'attack');
        g.step(50);
        const before = JSON.stringify(g.G.travel); g.render(); g.render();
        check(`${phase} render is pure`, before === JSON.stringify(g.G.travel));
      }
      g.travel('elevator'); g.G.travel.x = 430; g.step(2); g.G.fade = 0; g.G.freezeTime = true; g.render();
      return results;
    });
    assert(checks.every(c => c.pass), JSON.stringify(checks));
    await page.evaluate(() => { window.__game.G.freezeTime = false; });
    await page.mouse.click(675, 325); await page.waitForTimeout(80);
    assert(await page.evaluate(() => !window.__game.G.travel.started), 'old center button is inactive');
    await page.mouse.click(926, 330);
    await page.waitForFunction(() => window.__game.G.travel.started, null, { timeout: 3000 });
    assert(await page.evaluate(() => window.__game.G.travel.started), 'click right wall stack starts elevator');
    await page.evaluate(() => { const g=window.__game; g.G.freezeTime=true; g.G.fade=0; g.render(); });
    await page.screenshot({ path: `${out}/right-buttons.png` });
    for (const [name, x, t] of [['lobby-left',180,45],['lobby-bar',540,60],['lobby-exit',885,100]]) {
      await page.evaluate(([x,t]) => { const g=window.__game; g.G.freezeTime=false; g.travel('lobby'); g.G.travel.x=x; g.step(t); g.G.fade=0; g.G.freezeTime=true; g.render(); }, [x,t]);
      await page.screenshot({ path: `${out}/${name}.png` });
    }
    for (let i=0;i<4;i++) {
      await page.evaluate(i => { const g=window.__game; g.G.freezeTime=false; g.travel('lobby'); g.G.travel.x=420; g.step(1+i*24); g.G.fade=0; g.G.freezeTime=true; g.render(); },i);
      await page.screenshot({ path: `${out}/staff-${i}.png` });
    }
    await page.goto('http://localhost:8011/review-elevator.html');
    await page.waitForFunction(() => document.getElementById('readout').textContent.startsWith('Frame'));
    for (const [id, state] of [['penthouse','hub'],['lobby','travel']]) {
      await page.locator(`#${id}`).click();
      assert(await page.evaluate(state => document.getElementById('preview').contentWindow.__game.G.state===state,state));
      await page.locator('#explore').click();
      const frame=page.frames().find(f=>f.url().includes('?auto='));
      await frame.locator('#game').focus();
      await page.keyboard.press('x'); await page.waitForTimeout(80);
      assert(await frame.evaluate(() => window.__game.G.player.z>0), `${id} review allows native jumping`);
      await page.locator('#play').click();
    }
    await page.locator('#scale').click();
    await page.locator('#preview').screenshot({path:`${out}/lobby-1x.png`});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({checks, pointerChecks:2, reviewChecks:4, screenshots:out}));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
