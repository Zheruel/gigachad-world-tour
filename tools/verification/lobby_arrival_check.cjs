const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const out='/private/tmp/gachi-lobby-arrival'; fs.mkdirSync(out,{recursive:true});
  try {
    const page=await browser.newPage({viewport:{width:960,height:540}});
    await page.goto('http://localhost:8011/?auto=travel-elevator&t=1');
    await page.waitForFunction(()=>window.__game?.travelReady());
    const checks=await page.evaluate(async()=>{
      const g=window.__game, G=g.G, results=[];
      const check=(name,pass)=>results.push({name,pass:!!pass});
      G.freezeTime=false;g.travel('elevator',true);g.step(780);
      check('arrives inside closed doorway',G.travel.arriving&&G.travel.x===83&&G.travel.y===184);
      g.press('right');g.press('attack');g.press('use');g.step(100);
      check('held input cannot override exit',G.travel.arriving&&G.travel.x>83&&G.travel.x<133&&G.travel.actor.z===0);
      g.press('pause');g.step(1);g.release('pause');const before=JSON.stringify(G.travel);g.step(30);
      check('pause freezes door and actor',JSON.stringify(G.travel)===before);
      g.press('pause');g.step(1);g.release('pause');g.step(190-G.travel.t);
      check('closes behind CHAD before control returns',!G.travel.arriving&&G.travel.x===133&&G.travel.y===225&&G.travel.gate);
      g.step(5);check('held arrival input stays gated',G.travel.actor.state==='idle');
      for(const a of ['right','attack','use'])g.release(a);g.step(1);g.press('jump');g.step(1);g.release('jump');
      check('fresh input restores normal controller',G.travel.actor.state==='jump');
      const {TRAVEL_ART}=await import('/js/travel.js');const saved={...TRAVEL_ART};
      for(const key of Object.keys(TRAVEL_ART))delete TRAVEL_ART[key];
      g.travel('elevator',true);g.step(780);g.step(110);g.render();g.step(82);
      check('missing art still completes arrival',G.travel.phase==='lobby'&&!G.travel.arriving);
      Object.assign(TRAVEL_ART,saved);return results;
    });
    assert(checks.every(c=>c.pass),JSON.stringify(checks));
    for(const t of [1,30,55,78,110,140,165,190]){
      await page.evaluate(t=>{const g=window.__game;g.G.freezeTime=false;g.travel('elevator',true);g.step(780+t);g.G.freezeTime=true;g.G.fade=0;g.render();},t);
      await page.screenshot({path:`${out}/${t}.png`});
    }
    console.log(JSON.stringify({checks,screenshots:out}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
