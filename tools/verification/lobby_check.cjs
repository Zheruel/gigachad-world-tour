const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const out='/private/tmp/gachi-lobby-review'; fs.mkdirSync(out,{recursive:true});
  try {
    const page=await browser.newPage({viewport:{width:960,height:540}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:8011/?auto=travel-lobby');
    await page.waitForFunction(()=>window.__game?.travelReady());
    const checks=await page.evaluate(async()=>{
      const g=window.__game, {TRAVEL_ART}=await import('/js/travel.js'), checks=[];
      const check=(name,pass)=>checks.push({name,pass:!!pass});
      for(const [key,w,h] of [['concierge_seated',1920,160],['bartender',960,152],['porter_service',1080,180],['porter_idle',1440,180],['bartender_shake',960,152],['bartender_walk',1920,220]])
        check(`${key} registered poses loaded`,TRAVEL_ART[key]?.width===w&&TRAVEL_ART[key]?.height===h);
      const {lobbyStaffAt}=await import('/js/lobby_staff.js');
      const barTasks=new Set(), deskTasks=new Set();let prev=lobbyStaffAt(0), smooth=true;
      for(let t=1;t<=4500;t++) {
        const next=lobbyStaffAt(t);barTasks.add(next.bartender.task);deskTasks.add(next.concierge.task);
        smooth &&= Math.abs(next.bartender.x-prev.bartender.x)<1.2 && Math.abs(next.concierge.x-prev.concierge.x)<1.2;
        prev=next;
      }
      check('staff movement has no station or loop teleports',smooth);
      check('bartender alternates five activities',['polish','pour','shake','serve','move'].every(x=>barTasks.has(x)));
      check('concierge varies seated work',['write','page','stamp','rest'].every(x=>deskTasks.has(x)));
      g.G.freezeTime=false;g.resetInput();g.travel('lobby');g.G.travel.x=582;g.step(2);g.press('use');g.step(1);g.release('use');
      check('bar interaction at new counter',g.G.travel.barT>0);
      g.step(360);
      g.press('pause');g.step(1);g.release('pause');const paused=JSON.stringify(g.G.travel);g.step(60);
      check('pause freezes all staff routines',paused===JSON.stringify(g.G.travel));
      g.press('pause');g.step(1);g.release('pause');
      const before=JSON.stringify(g.G.travel);g.render();g.render();
      check('staff and layer rendering is pure',before===JSON.stringify(g.G.travel));
      const assets={...TRAVEL_ART};for(const key of Object.keys(TRAVEL_ART))delete TRAVEL_ART[key];
      g.step(1);g.render();g.G.travel.x=827;g.step(1);g.press('use');g.step(1);g.release('use');g.step(110);
      check('missing lobby layers do not block exit',g.G.travel.phase==='curb');
      Object.assign(TRAVEL_ART,assets);return checks;
    });
    assert(checks.every(c=>c.pass),JSON.stringify(checks));
    for(const [name,x,t] of [['reception',345,75],['bar',665,210],['entrance',850,750],['porter',440,285],['pour',665,430],['serve',665,1050],['desk-move',345,420],['desk-ledger',345,580],...[675,700,727,734,970,300].map((t,i)=>[`shake-${i}`,665,t])]) {
      await page.evaluate(([x,t])=>{const g=window.__game;g.G.freezeTime=false;g.resetInput();g.travel('lobby');g.G.travel.x=x;g.step(1);g.G.travel.t=t;g.G.travel.greeted=false;g.G.fade=0;g.G.freezeTime=true;g.render();},[x,t]);
      await page.screenshot({path:`${out}/${name}.png`});
    }
    await page.setViewportSize({width:480,height:270});
    await page.evaluate(()=>{const g=window.__game;g.G.travel.t=755;g.render();});
    await page.screenshot({path:`${out}/bar-1x.png`});
    await page.setViewportSize({width:960,height:540});
    await page.goto('http://localhost:8011/review-elevator.html');
    await page.waitForFunction(()=>document.querySelector('#readout').textContent.startsWith('Frame'));
    for(const id of ['reception','bar']) {
      await page.locator(`#${id}`).click();await page.locator('[data-step="30"]').click();
      assert.equal(await page.locator('#timeline').inputValue(),'31');
    }
    await page.locator('#activity').selectOption('bar:755');
    assert.equal(await page.locator('#timeline').inputValue(),'755');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,reviewChecks:2,screenshots:out}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
