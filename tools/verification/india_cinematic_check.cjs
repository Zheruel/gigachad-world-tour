// Actual state-machine replay: all three finishers, damage history, input gates and cleanup.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play',{timeout:90000});
 const checks=await page.evaluate(async()=>{
  const {INDIA_FINISHERS,finisherPose}=await import('./js/india_cinematics.js'),{updateIndia,updateIndiaIntro,drawIndiaPerformance}=await import('./js/india_stage.js');
  const {startSuper,releaseSuper}=await import('./js/player.js'),{ASSETS}=await import('./js/assets.js');
  const {spawnShot,updateShots}=await import('./js/shots.js');
  const g=__game,G=g.G,out=[],ok=(s,b)=>out.push([s,!!b]),canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d');
  g.indiaScene('refund','intro',0);updateIndiaIntro(103);ok('Refund crack unchanged',G.india.wallCracked&&!G.india.wallBroken);updateIndiaIntro(120);ok('Refund breach unchanged',G.india.wallBroken);
  g.indiaScene('delhi','intro',0);ok('market opening lasts720ticks',G.stage.introTicks===720);updateIndiaIntro(395);ok('stalls intact before impact',G.india.marketIntro.damage===0);updateIndiaIntro(396);ok('left stall breaks at contact',G.india.marketIntro.damage===1);updateIndiaIntro(536);ok('awning collapses into persistent wreck',G.india.marketBroken);updateIndiaIntro(720);ok('market entrance reaches first encounter without teleport',G.player.x===392&&G.player.y===236);
  const original={sfx:G.audio.sfx,roomSfx:G.audio.roomSfx,voice:G.audio.voice};let sounds=[];G.audio.sfx=n=>sounds.push(n);G.audio.roomSfx=n=>(sounds.push(n),true);G.audio.voice=n=>(sounds.push(n),true);
  g.indiaScene('delhi','intro',0);G.waveIndex=-1;G.stage.waves.forEach(w=>w.done=false);g.step(722);g.press('right');g.step(3);g.release('right');ok('market returns to first wave without a second generic quote',G.waveIndex===0&&sounds.filter(n=>n==='duke_who_wants_some').length===1&&!sounds.includes('duke_come_get_some'));
  for(const [kind,cfg]of Object.entries(INDIA_FINISHERS)){
   const key=kind.replace('-finish',''),stage=key==='closer'?'refund':'delhi';g.indiaScene(stage,key,0);const b=G.boss;if(key==='dredger')b.delhi.operatorPhase(b);G.enemies=[];sounds=[];
   if(b.station){b.station.broken=true;b.station.dead=true;b.station.hp=0;}
   b.guard=0;const before=G.score;b.hurt(99999,1,true,true);ok(key+' real defeat triggers once',b.dead&&b.finishStarted&&G.india.cinematic?.kind===kind&&G.score>before);
   const awarded=G.score;ok(key+' cannot restart active performance',!G.india.startCinematic(kind,b));
   let pure=true,fixed=true,damage=true,previous={...G.india.damage};
   for(let i=1;i<=cfg.ticks;i++){
    if([80,cfg.damage[0]-1,cfg.damage[2]+1].includes(i)){const t=G.india.cinematic.t;G.paused=true;g.step(23);ok(key+' pause at'+i,G.india.cinematic.t===t);G.paused=false;}
    updateIndia();if(i>=72)fixed&&=G.camX===cfg.camera;
    for(const k of Object.keys(previous))damage&&=(G.india.damage[k]||0)>=(previous[k]||0);previous={...G.india.damage};
    const snap=JSON.stringify([G.player.x,G.player.y,G.india.cinematic?.t,G.effects.length,sounds.length,G.india.damage]);drawIndiaPerformance(ctx);drawIndiaPerformance(ctx);pure&&=snap===JSON.stringify([G.player.x,G.player.y,G.india.cinematic?.t,G.effects.length,sounds.length,G.india.damage]);
   }
   ok(key+' exact duration and persistent aftermath',!G.india.cinematic&&G.india.completedScenes[kind].t===cfg.ticks&&G.india.finishersDone.has(kind));
   ok(key+' camera fixed after setup',fixed);ok(key+' side-effect-free rendering',pure);ok(key+' damage never heals',damage);ok(key+' quote fires once',sounds.filter(n=>n===cfg.voice).length===1);ok(key+' score not reawarded during choreography',G.score===awarded);
   if(key==='vendor'){g.step(2);ok('vendor returns to play with boss gone',G.state==='play'&&!G.boss&&!G.india.endingDone&&G.player.invuln===0);}
   else{g.press('use');g.step(280);ok(key+' held confirmation cannot bypass victory',G.state==='clear');const score=G.score;g.press('attack');g.step(40);g.release('attack');ok(key+' attack cannot confirm or rescore',G.state==='clear'&&G.score===score);g.release('use');g.step(2);g.press('use');g.step(1);g.release('use');g.step(35);ok(key+' fresh confirmation advances once',key==='dredger'?G.stage.id==='refund'&&G.state==='chapter-card':G.state==='ending');}
   g.indiaScene(stage,key,0);const target=G.boss;if(key==='dredger')target.delhi.operatorPhase(target);const entries=Object.entries(ASSETS).filter(([k])=>k.startsWith('ic_cine_')||k.endsWith('_set'));for(const[k]of entries)ASSETS[k]=null;target.guard=0;target.hurt(99999,1,true,true);for(let i=0;i<cfg.ticks;i++){updateIndia();drawIndiaPerformance(ctx);}ok(key+' missing artwork still completes',G.india.finishersDone.has(kind));for(const[k,v]of entries)ASSETS[k]=v;
  }
  for(const [kind,cfg]of Object.entries(INDIA_FINISHERS))for(const offset of [-130,140]){
   const key=kind.replace('-finish','');g.indiaScene(key==='closer'?'refund':'delhi',key,0);const b=G.boss;if(key==='dredger')b.delhi.operatorPhase(b);
   b.x+=offset;G.player.x=b.x+55;G.player.y=244;const x=G.player.x,y=G.player.y,bx=b.x;
   for(const q of b.fightProps||[]){q.broken=q.dead=true;q.hp=0;}
   b.guard=0;b.hurt(99999,1,true,true);const c=G.india.cinematic;ok(kind+' captures alternate defeat position '+offset,c.playerX===x&&c.playerY===y&&c.bossX===bx);
   for(let t=0;t<cfg.ticks;t++)updateIndia();ok(kind+' finishes with prior destruction '+offset,G.india.finishersDone.has(kind)&&(b.fightProps||[]).every(q=>q.broken));
  }
  g.indiaScene('refund','closer',0);const corpse=g.spawn('ic_security',0,0);corpse.hp=0;corpse.dead=true;corpse.state='down';const corpseX=corpse.x;G.boss.guard=0;G.boss.hurt(99999,1,true,true);for(let i=0;i<40;i++)updateIndia();ok('dead support never stands up to flee',corpse.state==='down'&&corpse.x===corpseX);
  g.indiaScene('refund','closer',0);const falling=g.spawn('ic_security',0,0);Object.assign(falling,{hp:0,dead:true,state:'dying',z:28,vz:1.2,t:15});G.boss.guard=0;G.boss.hurt(99999,1,true,true);for(let i=0;i<70;i++)updateIndia();ok('airborne support keeps KO physics and expires normally',falling.z!==28&&falling.t>40&&!G.enemies.includes(falling));
  for(const key of ['vendor','closer']){
   g.indiaScene(key==='closer'?'refund':'delhi',key,0);G.enemies=[];const lives=G.lives;Object.assign(G.player,{hp:0,dying:true,state:'down',t:0,z:0,vz:0});G.boss.guard=0;G.boss.hurt(99999,1,true,true);ok(key+' simultaneous KO does not start a finisher',!G.india.cinematic&&G.player.state==='down');g.step(150);ok(key+' simultaneous KO takes the checkpoint retry',G.lives===lives-1&&G.player.hp>0&&!G.player.dying&&G.state!=='clear');
   g.indiaScene(key==='closer'?'refund':'delhi',key,0);G.enemies=[];const b=G.boss;b.hp=1;b.guard=0;spawnShot('wrench',G.camX+30,240,1,8,{source:b});spawnShot('wrench',b.x-1,b.y,1,8,{source:b}).reflected=true;updateShots();ok(key+' reflected lethal hit safely clears other projectiles',b.dead&&G.india.cinematic?.kind===key+'-finish'&&G.shots.length===0);
  }
  Object.assign(G.audio,original);
  g.indiaScene('refund','closer',0);G.enemies=[];G.player.x=G.boss.x-35;G.player.y=G.boss.y;G.player.face=1;G.meter=100;const b=G.boss;ok('real super locks boss',startSuper(G.player)&&b.superLocked);G.india.startCinematic('closer-finish',b);ok('finisher waits for active super',!!G.india.pendingFinisher&&!G.india.cinematic&&b.superLocked);releaseSuper(G.player);updateIndia();ok('queued finisher begins after release',G.india.cinematic?.kind==='closer-finish'&&!G.india.pendingFinisher);
  return out;
 });console.log(JSON.stringify({checks,errors}));assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
