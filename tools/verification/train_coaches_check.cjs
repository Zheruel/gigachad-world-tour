const studio=require('./studio_helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await studio.openStudio(page,'train/yard');
 const f=page.frames().find(f=>f.url().includes('?auto=walk'));fs.mkdirSync('/tmp/train-coaches',{recursive:true});
 for(const [scene,t,x]of [['general',0,3600],['pantry',0,5040],['ac',0,6000],['private',0,6960],['conductor',0],['conductor',42],['roof',550],['roof',600],['escape',179],['escape',180],['escape',240],['escape',270],['escape',330],['escape',500]]){
  await f.evaluate(([s,t,x])=>{__game.trainScene(s,t);if(x){__game.G.camX=x;__game.G.player.x=x+240;__game.G.player.y=218;}__game.render()},[scene,t,x]);
  for(const scale of [960,480]){if(scale===480)await page.evaluate(()=>__review.setScale(document.querySelector('#scale').value==='1'?2:1));await f.locator('canvas').screenshot({path:`/tmp/train-coaches/${scene}-${x||t}-${scale}.png`});if(scale===480)await page.evaluate(()=>__review.setScale(document.querySelector('#scale').value==='1'?2:1));}
 }
 const checks=await f.evaluate(async()=>{const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  const {ASSETS}=await import('./js/assets.js');ok('scenic artwork keeps natural 3:1 ratio',['rural','industry','river'].every(n=>Math.abs(ASSETS['nr_'+n].width/ASSETS['nr_'+n].height-3)<.01));
  for(const x of [3840,5280,5760,6240,7200]){g.trainScene('general',0);G.player.x=x-80;G.camX=x-200;G.player.invuln=9999;g.press('right');g.step(130);g.release('right');ok('walks across connected coaches '+x,G.player.x>x+80);
   g.trainScene('general',0);G.player.x=x;G.player.y=232;g.step(12);ok('join preserves walking depth '+x,G.player.y===232);
  }
  g.trainScene('conductor',300);const b=G.boss;b.state='windup';b.pattern='stamp';b.face=-1;const hp=b.hp;b.hurt(10,1,false,false);ok('conductor guards frontal jabs',b.hp===hp);b.hurt(10,1,true,false);ok('heavy chips through conductor guard',b.hp<hp);
  Object.assign(b,{hp:b.maxhp*.52,state:'recover',recoverPose:'swing',recoverFor:30,t:0,protectedStagger:0});b.hurt(30,1,true,false);ok('half health calls the emergency chain',b.brakeDue);G.player.invuln=9999;G.hitstop=0;g.step(260);ok('he pulls the chain once, then fights on',b.pulls===1&&!b.dead);
  g.trainScene('conductor',300);g.step(1);G.boss.pulls=2;G.boss.hurt(9999,1,true,true);G.hitstop=0;g.step(420);ok('miniboss defeat does not end stage',G.state==='play'&&!G.boss);
  g.trainScene('general',0);g.step(120);const d=G.train.distance;g.press('pause');g.step(1);g.release('pause');g.step(90);ok('scenery freezes during pause',G.train.distance===d);
  g.trainScene('escape',0);const snap=JSON.stringify(G.train);g.render();g.render();ok('escape rendering has no side effects',JSON.stringify(G.train)===snap);g.step(1261);ok('restaged escape completes',G.train.endingDone);
  return out;
 });console.log(JSON.stringify({checks,errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
