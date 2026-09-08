// Explicit wave fixtures test queue/cap/reset behavior. Pacing is measured by the
// separate input-only india_playtest_check runner, never by these forced clears.
const assert=require('node:assert/strict');
const{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
  const result=await page.evaluate(async()=>{
   const g=__game,G=g.G,{restoreIndiaCheckpoint}=await import('./js/india_checkpoints.js');
   const checks=[],check=(name,value)=>checks.push([name,!!value]);
   const live=()=>G.enemies.filter(e=>!e.dead&&!e.noCount);
   function fixture(id,index){
    g.indiaScene(id,id==='delhi'?'market':'calling');
    G.waveIndex=index-1;G.waveActive=false;G.boss=null;G.enemies=[];G.spawnQueue=[];
    G.player.x=G.stage.waves[index].x;G.player.y=240;G.player.invuln=10000;
    G.camX=G.camLock=Math.max(0,G.player.x-160);G.hitstop=G.slowmo=G.flash=0;
    G.india.office=[];G.india.pendingEntries=0;g.step(1);
   }
   function step(n){for(let i=0;i<n;i++){G.player.invuln=10000;g.step(1);}}
   fixture('delhi',3);step(220);
   check('initial batch stops at four living fighters',live().length===4&&G.spawnQueue.length===0&&G.india.reserveIndex===0);
   step(90);check('reserve does not enter while three or more remain',G.india.reserveIndex===0);
   live().slice(0,2).forEach(e=>e.dead=true);step(1);
   check('reserve queues immediately at two survivors',G.india.reserveIndex===1&&G.spawnQueue.length===3&&live().length===3);
   step(220);check('six-fighter arena fills without exceeding its cap',live().length===6&&G.spawnQueue.length===0);
   let maxLive=0;const ordinary=G.stage.waves[3];
   for(let i=0;i<500;i++){
    if(i%30===0)live().slice(0,1).forEach(e=>e.dead=true);
    step(1);maxLive=Math.max(maxLive,live().length);
   }
   check('all reserve groups consumed once',G.india.reserveIndex===ordinary.reserves.length);
   live().forEach(e=>e.dead=true);step(2);
   check('wave unlocks only after all groups clear',!G.waveActive&&!G.locked&&G.spawnQueue.length===0);
   check('reserve release preserves six-fighter cap',maxLive<=6);
   const recovery=G.pickups.filter(p=>p.indiaRecovery===3);
   check('cleared recovery encounter awards one reachable safe-lane shake',recovery.length===1&&recovery[0].y>=241&&recovery[0].x>G.player.x);
   G.waveActive=true;step(1);
   check('repeated clear cannot award another recovery pickup',G.pickups.filter(p=>p.indiaRecovery===3).length===1);
   fixture('refund',3);step(220);live().slice(0,2).forEach(e=>e.dead=true);step(120);
   check('narrow office caps reserve fighters at four',live().length===4&&G.spawnQueue.length===2);
   fixture('refund',2);G.india.pendingEntries=3;step(70);
   check('rising seated workers count toward visible cap',live().length===1&&G.spawnQueue.length===3);
   G.india.pendingEntries=0;step(150);check('queue resumes after pending seats clear',live().length===4&&G.spawnQueue.length===0);
   G.india.reserveIndex=2;G.india.reserveWave=2;G.india.pendingEntries=1;
   const restored=restoreIndiaCheckpoint();
   check('retry clears reserve and pending-entry state',restored&&G.india.reserveWave===-1&&G.india.reserveIndex===0&&G.india.pendingEntries===0&&G.spawnQueue.length===0);
   check('retry removes pickups from the abandoned attempt',G.pickups.length===0);
   const totals=Object.fromEntries(g.STAGES.filter(s=>s.chapter).map(s=>[s.id,s.waves.reduce((n,w)=>n+(w.spawns?.length||0)+(w.reserves||[]).reduce((a,r)=>a+r.length,0),0)]));
   check('authored ordinary totals stay explicit',totals.delhi===100&&totals.refund===106);
   const train=g.STAGES.find(s=>s.id==='train');check('train encounters have no new reserve mechanics',train.waves.every(w=>!w.reserves&&!w.visibleCap));
   return{checks,totals};
  });
  console.log(JSON.stringify({...result,errors}));assert(result.checks.every(c=>c[1]));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
