const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage();await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>__game?.G.state==='play');
 const traces=await p.evaluate(async()=>{const g=__game,G=g.G,{updateEnemies}=await import('./js/enemies.js'),out={};
 for(const kind of ['nr_tough','ic_headset','ic_heavy','bull','bandar'])for(const mode of ['normal','heavy','super']){
  g.trainScene('general',0);g.resetInput();G.enemies=[];G.props=[];G.boss=null;G.shots=[];G.effects=[];G.time=1000;G.rawTime=1000;G.score=0;G.hitstop=0;G.player.x=3200;G.player.y=220;G.player.hp=100;G.player.invuln=0;G.player.state='idle';
  let seed=810,draws=0;Math.random=()=>{draws++;return((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)};
  const e=g.spawn(kind,50,0);e.hp=1;e.poise=0;e.state='idle';e.superApplying=mode==='super';e.hurt(80,1,mode!=='normal',false);const a=[];
  for(let i=0;i<90;i++){G.time++;G.rawTime++;updateEnemies();a.push([e.state,e.t,e.x,e.y,e.z,e.vx,e.vz,e.hp,e.dead,e.removeMe,G.score,G.hitstop,G.player.hp,draws]);}out[kind+':'+mode]=a;
 }return out;});const hash=crypto.createHash('sha256').update(JSON.stringify(traces)).digest('hex');fs.mkdirSync('tmp/review/defeat-fx',{recursive:true});
 if(process.env.KO_RECORD_BASELINE)fs.writeFileSync('tmp/review/defeat-fx/baseline.json',JSON.stringify({hash,traces}));else assert.equal(hash,'87aee424935c0afd180437bf3ed788274ef20ca7cf6294cfade142e93248c290');console.log(JSON.stringify({cases:15,ticks:1350,hash}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
