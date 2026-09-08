// Preserve Boxing Rush simulation while auditing its authored contact presentation.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1020,height:620}});await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
 const traces=await page.evaluate(async()=>{const g=__game,G=g.G,{startSuper,updatePlayer}=await import('./js/player.js'),{createBoss}=await import('./js/bosses.js'),traces={};
 for(const type of ['nr_tough','nr_heavy','ic_headset','ic_operator','ic_thrower','conductor','vikram'])for(const guarded of [false,true]){
  let seed=1841;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);g.trainScene('general',0);g.resetInput();G.enemies=[];G.props=[];G.boss=null;G.shots=[];G.effects=[];G.time=1000;G.rawTime=1000;G.score=0;G.meter=100;G.hitstop=0;Object.assign(G.player,{x:3200,y:220,z:0,face:1,hp:100,invuln:0,state:'idle',t:0});
  const p=G.player,e=['conductor','vikram'].includes(type)?createBoss(type,3250,220):g.spawn(type,50,0);Object.assign(e,{x:3250,y:220,hp:120,state:'idle',guard:guarded?3:0,protectedStagger:0});const by=g.spawn('nr_tough',60,0);by.hp=80;by.state='idle';startSuper(p);const frames=[];
  for(let i=0;i<105;i++){updatePlayer(p);frames.push([p.state,p.superT,p.x,p.y,p.hp,p.invuln,G.meter,G.score,G.hitstop,e.state,e.t,e.x,e.y,e.z,e.hp,e.guard,e.protectedStagger,e.superLocked,e.dead,by.hp]);}traces[type+':'+guarded]=frames;
 }return traces;});
 const hash=crypto.createHash('sha256').update(JSON.stringify(traces)).digest('hex');fs.mkdirSync('tmp/review/boxing-polish',{recursive:true});
 if(process.env.BOXING_RECORD_BASELINE)fs.writeFileSync('tmp/review/boxing-polish/baseline.json',JSON.stringify({hash,traces}));else assert.equal(hash,'0b274bc4de493823cbfe85a8a0a124afe56b14cb902c574ad4308062f2bf01a0','Boxing Rush mechanics changed');
 console.log(JSON.stringify({cases:Object.keys(traces).length,ticks:Object.values(traces).flat().length,hash}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
