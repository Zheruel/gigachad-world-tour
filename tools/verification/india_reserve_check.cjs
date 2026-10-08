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
   // Expectations follow the authored wave (initial group, first reserve, visible cap).
   const shape=(id,i)=>{const w=g.STAGES.find(s=>s.id===id).waves[i];return{n:w.spawns.length,r:w.reserves[0].length,cap:w.visibleCap||6,w};};
   // First Delhi recovery encounter with at least three openers and a reserve.
   const di=g.STAGES.find(s=>s.id==='delhi').waves.findIndex(w=>w.spawns.length>=3&&w.reserves&&w.recovery);
   let d=shape('delhi',di);fixture('delhi',di);step(220);
   check('initial batch stops at its authored size',live().length===Math.min(d.n,d.cap)&&G.spawnQueue.length===0&&G.india.reserveIndex===0);
   step(90);check('reserve does not enter while three or more remain',G.india.reserveIndex===0);
   live().slice(0,d.n-2).forEach(e=>e.dead=true);step(1);
   check('reserve queues immediately at two survivors',G.india.reserveIndex===1&&G.spawnQueue.length+live().length===2+d.r);
   step(220);check('arena fills without exceeding its cap',live().length===Math.min(d.cap,2+d.r)&&G.spawnQueue.length===2+d.r-live().length);
   let maxLive=0;const ordinary=d.w;
   for(let i=0;i<500;i++){
    if(i%30===0)live().slice(0,1).forEach(e=>e.dead=true);
    step(1);maxLive=Math.max(maxLive,live().length);
   }
   check('all reserve groups consumed once',G.india.reserveIndex===ordinary.reserves.length);
   live().forEach(e=>e.dead=true);step(2);
   check('wave unlocks only after all groups clear',!G.waveActive&&!G.locked&&G.spawnQueue.length===0);
   check('reserve release preserves the visible cap',maxLive<=d.cap);
   const recovery=G.pickups.filter(p=>p.indiaRecovery===di);
   check('cleared recovery encounter awards one reachable safe-lane shake',recovery.length===1&&recovery[0].y>=241&&recovery[0].x>G.player.x);
   G.waveActive=true;step(1);
   check('repeated clear cannot award another recovery pickup',G.pickups.filter(p=>p.indiaRecovery===di).length===1);
   let r=shape('refund',3);fixture('refund',3);step(220);live().slice(0,r.n-2).forEach(e=>e.dead=true);step(120);
   check('narrow office caps reserve fighters at four',r.cap===4&&live().length===4&&G.spawnQueue.length===2+r.r-4);
   r=shape('refund',2);fixture('refund',2);G.india.pendingEntries=3;step(70);
   check('rising seated workers count toward visible cap',live().length===r.cap-3&&G.spawnQueue.length===r.n-(r.cap-3));
   G.india.pendingEntries=0;step(150);check('queue resumes after pending seats clear',live().length===Math.min(r.n,r.cap)&&G.spawnQueue.length===0);
   G.india.reserveIndex=2;G.india.reserveWave=2;G.india.pendingEntries=1;
   const restored=restoreIndiaCheckpoint();
   check('retry clears reserve and pending-entry state',restored&&G.india.reserveWave===-1&&G.india.reserveIndex===0&&G.india.pendingEntries===0&&G.spawnQueue.length===0);
   check('retry removes pickups from the abandoned attempt',G.pickups.length===0);
   const totals=Object.fromEntries(g.STAGES.filter(s=>s.chapter).map(s=>[s.id,s.waves.reduce((n,w)=>n+(w.spawns?.length||0)+(w.reserves||[]).reduce((a,r)=>a+r.length,0),0)]));
   check('authored ordinary totals stay explicit',totals.delhi===49&&totals.refund===73);
   const train=g.STAGES.find(s=>s.id==='train');check('train encounters have no new reserve mechanics',train.waves.every(w=>!w.reserves&&!w.visibleCap));
   return{checks,totals};
  });
  console.log(JSON.stringify({...result,errors}));assert(result.checks.every(c=>c[1]));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
