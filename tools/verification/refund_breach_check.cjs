// Real timeline, cue ownership, evacuation, fallback arrivals and retry aftermath.
const assert=require('node:assert/strict'),fs=require('fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,close,errors}=await studio.launch();try{
 const f=await studio.openStudio(page,'refund/intro');
 const checks=await f.evaluate(async()=>{
  const g=__game,G=g.G,{updateIndiaIntro,drawIndiaIntro}=await import('/js/india_stage.js');
  const {updateOfficeWorkers,officeWorkerPose,queueOfficeWorker,initOfficeWorkers}=await import('/js/india_office.js');
  const {updateIndiaCheckpoint,restoreIndiaCheckpoint}=await import('/js/india_checkpoints.js');
  const {ASSETS}=await import('/js/assets.js'),{CB}=await import('/js/refund_intro.js');
  const checks=[],ok=(name,value)=>checks.push([name,!!value]),sounds=[];
  const prior={sfx:G.audio.sfx,room:G.audio.roomSfx,voice:G.audio.voice};
  G.audio.sfx=(...a)=>sounds.push(a);G.audio.roomSfx=(...a)=>{sounds.push(a);return true;};G.audio.voice=(...a)=>sounds.push(a);
  const scene=()=>{g.indiaScene('refund','intro',0);sounds.length=0;return G.india;};
  const tick=n=>{for(let t=0;t<=n;t++)updateIndiaIntro(t);};
  try{
   let s=scene();tick(CB.yank-1);ok('the caller is still on his call until his cord yanks him',s.office[0].phase==='working'&&s.office[0].scripted);
   tick(CB.boom-1);ok('wall pressure precedes the breach; the yanked caller has left his chair, the others stay seated',s.wallCracked&&!s.wallBroken&&s.office[0].phase==='gone'&&s.office.slice(1,3).every(n=>n.phase==='working'));
   updateIndiaIntro(CB.boom);ok('one burst opens the wall and records persistent aftermath',s.wallBroken&&s.refundBreachDone);
   tick(CB.flee+80);const poses=s.office.slice(1,3).map(officeWorkerPose);
   ok('the operator runs while the technician finishes standing',poses[0].actor.pose==='escape'&&s.office[2].phase==='evacuating');
   tick(CB.end-1);ok('all first-room staff leave physically before control returns',s.office.slice(0,3).every((n,row)=>n.phase==='gone'&&n.chairDx===(row?8:26)));
   ok('later rooms retain their ordinary desk routines',s.office.slice(3).every(n=>n.phase==='working'));
   const cues=[...s.cues],before=sounds.length;updateIndiaIntro(CB.end-1);
   ok('re-render/repeated final update cannot repeat impact, Foley or quote',sounds.length===before&&JSON.stringify([...s.cues])===JSON.stringify(cues));
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d');
   const state=JSON.stringify({s:s.office,c:s.completedScenes,t:s.t,cues:[...s.cues]});drawIndiaIntro(ctx,CB.end-1);drawIndiaIntro(ctx,CB.end-1);
   ok('drawing is pure and never advances staff or plays cues',state===JSON.stringify({s:s.office,c:s.completedScenes,t:s.t,cues:[...s.cues]})&&sounds.length===before);
   G.state='play';G.paused=false;updateIndiaCheckpoint();const chairs=s.office.slice(0,3).map(officeWorkerPose).map(p=>p.chairY);
   ok('evacuated seats no longer provide combat entrants',!queueOfficeWorker('ic_headset'));
   restoreIndiaCheckpoint();initOfficeWorkers('refund',G.player.x);
   ok('entrance retry keeps workers gone and chairs in the same abandoned positions',s.office.slice(0,3).every((n,row)=>n.phase==='gone'&&n.chairDx===(row?8:26))&&JSON.stringify(s.office.slice(0,3).map(officeWorkerPose).map(p=>p.chairY))===JSON.stringify(chairs));
   ok('retry retains the broken wall and cleared first desk',s.wallBroken&&s.refundBreachDone);
   s=scene();const samples=[];for(let t=0;t<CB.end;t++){updateIndiaIntro(t);if(t%13===0)samples.push(JSON.stringify({p:[G.player.x,G.player.y,G.player.z],w:s.office.slice(0,3).map(n=>[n.phase,n.t]),c:[...s.cues]}));}
   s=scene();let index=0,replay=true;for(let t=0;t<CB.end;t++){updateIndiaIntro(t);if(t%13===0)replay&&=samples[index++]===JSON.stringify({p:[G.player.x,G.player.y,G.player.z],w:s.office.slice(0,3).map(n=>[n.phase,n.t]),c:[...s.cues]});}
   ok('timeline scrub/restart restores identical actor positions and once-only cues',replay);
   const keys=['ic_refund_breach','ic_office_panic_turn','ic_office_flee_caller','ic_office_flee_operator','ic_office_flee_technician','ic_office_escape_caller','ic_office_escape_operator','ic_office_escape_technician',...['caller','operator','technician'].flatMap(role=>['body','support'].map(layer=>`ic_office_escape_${role}_${layer}`)),'ic_refund_entrance_debris','ic_refund_entrance_desk','ic_callback_victim','ic_callback_chad','ic_callback_props','ic_callback_cord'];const art=keys.map(k=>[k,ASSETS[k]]);
   for(const [k]of art)ASSETS[k]=null;
   try{for(const t of [100,CB.yank+10,CB.boom+20,CB.grab+20,CB.release+10,CB.pickup+20,CB.toss+10,CB.end-1])drawIndiaIntro(ctx,t);ok('missing art retains the safe fallback renderer',true);}finally{for(const [k,v]of art)ASSETS[k]=v;}
  }finally{Object.assign(G.audio,{sfx:prior.sfx,roomSfx:prior.room,voice:prior.voice});}
  return checks;
 });
 // Actual main-loop handoff, with default group queue and no test-only spawns.
 await studio.load(page,'refund/full');await studio.seek(page,await f.evaluate(()=>import('/js/refund_intro.js').then(m=>m.CB.end+5)));
 const handoff=await f.evaluate(()=>({state:__game.G.state,workers:__game.G.india.office.slice(0,3).map(n=>n.phase),x:__game.G.player.x}));
 checks.push(['full game intro hands control to CHAD at the authored position',handoff.state==='play'&&handoff.x===160&&handoff.workers.every(p=>p==='gone')]);
 await f.evaluate(()=>{__game.G.player.invuln=999;});
 await page.evaluate(()=>__review.input('right',true));await studio.step(page,230);
 await page.evaluate(()=>__review.input('right',false));
 await studio.step(page,360);
 const first=await f.evaluate(()=>({wave:__game.G.waveIndex,enemies:__game.G.enemies.map(e=>e.trainType),queue:__game.G.spawnQueue.length,pending:__game.G.india.pendingEntries||0,total:__game.G.stage.waves[0].spawns.length}));
 checks.push(['first fight receives its intended cast through fallback arrivals',first.wave===0&&first.enemies.length+first.queue===first.total&&first.pending===0]);
 fs.mkdirSync('tmp/review/refund-overhaul/entrance',{recursive:true});fs.writeFileSync('tmp/review/refund-overhaul/entrance/checks.json',JSON.stringify({checks,handoff,first,errors},null,2));
 console.log(JSON.stringify({checks,first,errors}));assert.deepEqual(checks.filter(([,v])=>!v),[]);assert.deepEqual(errors,[]);
 }finally{await close();}})().catch(e=>{console.error(e);process.exit(1)});
