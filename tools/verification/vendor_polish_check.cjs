// Real boss updates: jumpable one-hit fire, food preparation, and health-gated armor.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__vendor_polish',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/__vendor_polish');
 const checks=await page.evaluate(async()=>{
  const [{G},{createBoss,updateBoss},{createPlayer},{VENDOR_PHASE,VENDOR_BREATH,VENDOR_LAST,vendorPose},{debugResetInput}]=await Promise.all([import('./js/engine.js'),import('./js/bosses.js'),import('./js/player.js'),import('./js/vendor_boss.js'),import('./js/input.js')]);
  const out=[],ok=(n,v)=>out.push([n,!!v]);G.audio={sfx(){},roomSfx(){},voiceRandom(){return false;}};
  function setup(o={}){debugResetInput();Object.assign(G,{state:'play',stage:{id:'delhi',lanes:[{x0:0,x1:20000,top:213,bot:245}]},camX:2670,camLock:2670,arenaSqueeze:0,enemies:[],props:[],shots:[],zones:[],effects:[],pickups:[],time:0,rawTime:0,score:0,meter:0,hitstop:0});G.player=createPlayer();Object.assign(G.player,{x:2900,y:226,z:0,state:'idle',hp:100,face:1,invuln:0});G.india={startCinematic(){return true;}};const b=createBoss('vendor',3000,226);Object.assign(b,{state:'idle',x:3000,y:226,face:-1,atkCd:999},o);return b;}
  function step(n){for(let i=0;i<n;i++){G.time++;G.rawTime++;updateBoss();}}
  for(const phase of [2]){   // the final breath is the floor fire (pappu_inferno_check)
   let b=setup({phase,state:'breath',pattern:'breath',t:0,lane:226});step(phase===3?32:24);ok(`phase ${phase} fire only hits once`,G.player.hp===(phase===3?86:90)&&b.breathHits===1);ok(`phase ${phase} fire recovery matches phase`,b.state===(phase===3?'recover':'cough'));if(phase===2){step(69);ok('phase2 cough gives70ticks',b.state==='cough');}else{step(30);ok('final fire has planted recovery and a fresh cooldown',b.state==='idle'&&b.atkCd===22);}
   b=setup({phase,state:'breath',pattern:'breath',t:0,lane:226});G.player.z=30;step(phase===3?32:24);ok(`phase ${phase} jump clears entire flame`,G.player.hp===100);ok(`phase ${phase} flame does not follow player lane`,b.lane===226);
   b=setup({phase,state:'breath',pattern:'breath',t:0,lane:226});G.player.x=3100;step(phase===3?32:24);ok(`phase ${phase} behind boss is safe`,G.player.hp===100);
  }
  let b=setup();b.hp=Math.floor(b.maxhp*.5);step(1);ok('chillies start at half health',b.state==='rage');
  b=setup({phase:2,phaseTwo:true});b.hp=Math.floor(b.maxhp*.34);step(1);ok('above 30% stays in second phase',b.state!=='setup-feast');
  b=setup({phase:2,phaseTwo:true});b.hp=Math.floor(b.maxhp*.3);step(1);ok('30% starts the knockdown fake-out',b.state==='fakeout');step(700);ok('cauldron transition reaches final phase',b.phase===3&&b.maxGuard===4&&b.guard===4);
  b=setup({state:'lastorder',t:5});ok('meal uses eating pose',vendorPose(b)[0]==='rage'||vendorPose(b)[0]==='devour_smash');const hp=b.hp;b.hurt(20,1,true,false);ok('meal protected against interrupted transition',b.hp===hp);
  ok('threshold definitions match accepted phase design',VENDOR_PHASE.spicy===.5&&VENDOR_PHASE.last===.3&&VENDOR_PHASE.spicyRevive===.7&&VENDOR_PHASE.revive===.55&&VENDOR_BREATH.ticks===24&&VENDOR_BREATH.lastRecovery===30);
  return out;
 });for(const[n,v]of checks){console.log(`${v?'PASS':'FAIL'} ${n}`);assert.ok(v,n);}assert.deepEqual(errors,[]);console.log(`${checks.length} vendor polish checks passed`);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
