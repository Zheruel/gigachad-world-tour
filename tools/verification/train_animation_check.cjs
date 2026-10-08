const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:'+(process.env.PORT||8011)+'/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const checks=await p.evaluate(async()=>{const g=__game,G=g.G,{getAIFrame}=await import('./js/aiframes.js'),out=[],ok=(n,v)=>out.push([n,!!v]);
  // Walk cells follow each family's authored gait (the conductor walks one measured 5-cell step); recoveries are four poses.
  const WALK={brawler:10,chai:6,commando:20,conductor:5};
  for(const name of ['brawler','chai','paan','tte','rack','commando','captain','conductor','neta_guard','neta']){
   const walk=getAIFrame('nr_'+name,'walk'),rise=getAIFrame('nr_'+name,'getup');ok(name+' has authored walk and recovery',walk?.f.length===(WALK[name]||8)&&rise?.f.length>=4);
  }
  // The cast's four-pose recovery runs about 26 ticks (the TTE hauls his trunk up for 30), then straight back into combat.
  for(const name of ['brawler','chai','paan','tte','rack','commando','captain']){
   g.trainScene(name==='rack'?'sleeper':'general',0);const e=g.spawn('nr_'+name,170,0);
   Object.assign(e,{state:'getup',t:0,z:0,vz:0,perched:false,noLane:false,airOnly:false,atkCd:999});G.hitstop=0;g.step(7);ok(name+' stays in recovery mid-cycle',e.state==='getup');
   g.step(14);ok(name+' holds the recovery to its last pose',e.state==='getup');g.step(12);ok(name+' returns to combat after recovery',e.state==='idle'&&e.z===0);
  }
  for(const scene of ['conductor','boss','boss-roof']){
   // Shera stays down longer: his floor time is the window to reach Netaji.
   const [downT,upT]=scene==='boss'?[109,25]:[31,15];
   g.trainScene(scene,scene==='conductor'?300:0);Object.assign(G.boss,{state:'down',t:downT,z:0,vz:0,trainWaiting:false});G.hitstop=0;g.step(1);ok(scene+' enters authored getup',G.boss.state==='getup');g.step(upT);ok(scene+' completes getup',G.boss.state==='idle');
   // Netaji backpedals inside 84px and closes beyond 150; Shera (x1.205) holds 48-84px: test each in his standing band.
   const near=scene==='boss-roof'?110:scene==='boss'?64:40,far=scene==='boss-roof'?220:140;
   const actor=G.boss;Object.assign(actor,{x:G.player.x+near,y:G.player.y,state:'idle',atkCd:999});const phase=actor.stridePhase;g.step(10);ok(scene+' standing freezes stride clock',actor.stridePhase===phase);
   G.player.x=actor.x-far;g.step(10);ok(scene+' movement advances stride clock',actor.stridePhase>phase);
  }
  g.trainScene('sleeper',0);const e=g.spawn('nr_rack',170,0);Object.assign(e,{state:'drop',z:.01,vz:-1,perched:false,noLane:false,vx:0,t:0});g.step(1);ok('berth thief uses landing pose on contact',e.state==='land'&&e.z===0);g.step(8);ok('berth thief landing returns to combat',e.state==='idle');
  // A parried pounce drops him to the floor: he never reels (or walks) in mid-air.
  g.trainScene('sleeper',0);const r=g.spawn('nr_rack',60,0);Object.assign(r,{state:'attack',move:'pounce',cls:'counter',t:12,z:24,vz:0,vx:0,perched:false,noLane:false,airOnly:false,face:-1});r.parried(0,1);r.protectedStagger=45;G.hitstop=0;G.parrySlow=0;g.step(20);ok('parried pounce lands',r.z===0);g.step(40);ok('parried pounce recovers on the floor',r.state!=='stagger'&&r.z===0);
  const snapshots=JSON.stringify({phase:e.stridePhase,t:e.t});g.render();g.render();ok('animation rendering is side-effect free',snapshots===JSON.stringify({phase:e.stridePhase,t:e.t}));
  return out;
 });console.log(JSON.stringify({checks:checks.length,failures:checks.filter(c=>!c[1]),errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
