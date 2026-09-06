const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const checks=await p.evaluate(async()=>{const g=__game,G=g.G,{getAIFrame}=await import('./js/aiframes.js'),out=[],ok=(n,v)=>out.push([n,!!v]);
  for(const name of ['tough','bruiser','runner','ambusher','heavy','heavy_unarmed','guard','conductor','vikram','vikram_roof']){
   const walk=getAIFrame('nr_'+name,'walk'),rise=getAIFrame('nr_'+name,'getup');ok(name+' has authored walk and recovery',walk?.f.length===8&&rise?.f.length===4);
  }
  for(const name of ['tough','bruiser','runner','ambusher','heavy','heavy_unarmed','guard']){
   g.trainScene('general',0);const e=g.spawn('nr_'+(name==='heavy_unarmed'?'heavy':name),170,0);
   if(name==='heavy_unarmed')e.rig.hurt(9999,1);
   Object.assign(e,{state:'getup',t:0,z:0,vz:0,perched:false,noLane:false});G.hitstop=0;g.step(7);ok(name+' stays in recovery mid-cycle',e.state==='getup');g.step(8);ok(name+' returns to combat after recovery',e.state==='idle');
  }
  for(const scene of ['conductor','boss','boss-roof']){
   g.trainScene(scene,scene==='conductor'?300:0);Object.assign(G.boss,{state:'down',t:31,z:0,vz:0});G.hitstop=0;g.step(1);ok(scene+' enters authored getup',G.boss.state==='getup');g.step(15);ok(scene+' completes getup',G.boss.state==='idle');
   const actor=G.boss;Object.assign(actor,{x:G.player.x+40,y:G.player.y,state:'idle',atkCd:999});const phase=actor.stridePhase;g.step(10);ok(scene+' standing freezes stride clock',actor.stridePhase===phase);
   G.player.x=actor.x-140;g.step(10);ok(scene+' movement advances stride clock',actor.stridePhase>phase);
  }
  g.trainScene('sleeper',0);const e=g.spawn('nr_ambusher',170,0);Object.assign(e,{state:'drop',z:.01,vz:-1,perched:false,noLane:false,vx:0,t:0});g.step(1);ok('ambusher uses landing pose on contact',e.state==='land'&&e.z===0);g.step(8);ok('ambusher landing returns to combat',e.state==='idle');
  const snapshots=JSON.stringify({phase:e.stridePhase,t:e.t});g.render();g.render();ok('animation rendering is side-effect free',snapshots===JSON.stringify({phase:e.stridePhase,t:e.t}));
  return out;
 });console.log(JSON.stringify({checks:checks.length,failures:checks.filter(c=>!c[1]),errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
