// The console boot sits between the welcome press and the title: art loads, it can't be skipped
// in its first second, a later press skips it, and every tick draws without its art.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1000,height:700}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/');await p.waitForFunction(()=>window.__game?.G.state==='welcome');
 const state=()=>p.evaluate(()=>__game.G.state);
 await p.waitForFunction(async()=>{const {ASSETS}=await import('/js/assets.js');return ['gs_emblem_l','gs_emblem_r','gs_wordmark','gs_ce','gs_logo','gs_chad'].every(k=>ASSETS[k]);},null,{timeout:20000});
 const canvas=p.locator('canvas').first();
 await canvas.click();await p.waitForFunction(()=>__game.G.state==='gsboot');
 await p.keyboard.press('Enter');await p.waitForTimeout(150);assert.equal(await state(),'gsboot','press in the first second does not skip');
 await p.waitForFunction(()=>__game.G.rawTime-__game.G.stateT>70);
 await p.keyboard.press('Enter');await p.waitForFunction(()=>__game.G.state==='title',null,{timeout:2000});
 // Deterministic draw of every beat, with and without art.
 const blank=await p.evaluate(async()=>{const {drawGigastationBoot,GS_BOOT_TICKS}=await import('/js/gigastation_boot.js'),{ASSETS}=await import('/js/assets.js');
  const c=document.createElement('canvas');c.width=480;c.height=270;const x=c.getContext('2d'),bad=[];
  // Pixels in the emblem/logo box that differ from the screen colour.
  const ink=(t,bg)=>{x.clearRect(0,0,480,270);drawGigastationBoot(x,t);const d=x.getImageData(180,50,120,120).data;let n=0;for(let i=0;i<d.length;i+=4)n+=Math.abs(d[i]-bg)+Math.abs(d[i+1]-bg)+Math.abs(d[i+2]-bg)>90;return n;};
  const keys=Object.keys(ASSETS).filter(k=>k.startsWith('gs_')),saved=keys.map(k=>ASSETS[k]);
  for(const noArt of [false,true]){if(noArt)keys.forEach(k=>ASSETS[k]=null);
   for(let t=0;t<GS_BOOT_TICKS;t+=4)drawGigastationBoot(x,t);
   // White screen shows the emblem; black licence screen shows the logo.
   const w=ink(200,255),b=ink(600,0);if(w<1500||b<1500)bad.push({noArt,w,b});}
  keys.forEach((k,i)=>ASSETS[k]=saved[i]);return bad;});
 assert.deepEqual(blank,[],'emblem and logo visible with and without art');
 assert.deepEqual(errors,[]);console.log('gigastation boot ok');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
