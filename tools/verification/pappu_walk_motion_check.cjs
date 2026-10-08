const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const checks=await p.evaluate(async()=>{
  const g=__game,G=g.G,{SPR,getFrame}=await import('/js/sprites.js'),{vendorWalkMotion,VENDOR_WALK_CELLS,VENDOR_WALK_SETTLE}=await import('/js/vendor_walk_motion.js'),{vendorPose,vendorCombatFrame}=await import('/js/vendor_boss.js');
  const out=[],ok=(n,v)=>out.push([n,!!v]);
  const pixels=f=>{const c=document.createElement('canvas');c.width=f.width;c.height=f.height;const x=c.getContext('2d');x.drawImage(f,0,0);return x.getImageData(0,0,c.width,c.height).data;};
  const base=getFrame(SPR.ic_vendor,'demon_idle3',0,1),source=pixels(base);let neutral=true,authored=true,mirror=true;
  for(let i=0;i<VENDOR_WALK_CELLS;i++){
   const f=vendorWalkMotion(SPR.ic_vendor,i,1),a=pixels(f),b=pixels(vendorWalkMotion(SPR.ic_vendor,i,1,1)),flip=pixels(vendorWalkMotion(SPR.ic_vendor,i,-1));
   neutral&&=b.every((n,k)=>n===source[k]);
   authored&&=f===getFrame(SPR.ic_vendor,'demon_walk3',i,1)&&f.width===560&&f.height===440;
   for(let y=0;y<440;y++)for(let x=0;x<560;x++)for(let ch=0;ch<4;ch++)mirror&&=a[(y*560+x)*4+ch]===flip[(y*560+559-x)*4+ch];
  }
  ok('all fifteen walk poses use authored anatomy on the shared canvas',authored);
  ok('every stopped pose returns pixel-for-pixel to the approved idle',neutral);
  ok('both directions retain the same detailed painted poses',mirror);
  let whole=true;for(let i=0;i<VENDOR_WALK_CELLS;i++)for(const progress of [0,.25,.5,.75,.99])whole&&=vendorWalkMotion(SPR.ic_vendor,i,1,0,progress)===getFrame(SPR.ic_vendor,'demon_walk3',i,1);
  ok('every travel fraction renders one whole authored body without slicing or moving parts',whole);
  const setup=()=>{g.indiaScene('delhi','vendor',0);G.state='play';Object.assign(G.boss,{phase:3,mutated:true,inferno:true,state:'idle',x:G.camLock+400,y:226,face:-1,hp:375,t:0,atkCd:9999,spawnT:-9999});Object.assign(G.boss.kadai,{broken:true,smashed:true,stoveDestroyed:true});Object.assign(G.player,{x:G.camLock+60,y:226,state:'idle',z:0,invuln:9999});G.freezeTime=true;G.hitstop=0;return G.boss;};
  let b=setup();g.step(8);const moving=vendorPose(b);ok('real pursuit uses the authored gait',moving[0]==='walk3'&&vendorCombatFrame(b,...moving)===getFrame(SPR.ic_vendor,'demon_walk3',moving[1],b.face));
  G.player.x=b.x-90;g.step(1);let settled=true;for(let n=0;n<VENDOR_WALK_SETTLE-2;n++){g.step(1);const pose=vendorPose(b);settled&&=b.face===-1&&pose[0]==='walk3';}ok('stopping replants feet before idle',settled);g.step(2);ok('settling completes without moving his collision root',b.state==='idle'&&Math.abs(G.player.x-b.x)===90);
  b=setup();g.step(8);G.player.x=b.x+90;g.step(1);const bx=b.x;let holds=true;for(let n=0;n<VENDOR_WALK_SETTLE-1;n++){g.step(1);holds&&=b.face===-1&&b.x===bx;}ok('pivot holds the old facing while both feet replant',holds);g.step(1);ok('pivot mirrors only after the twelve-tick replant',b.face===1&&b.x===bx);
  G.paused=true;const stride=b.stridePhase;g.step(20);ok('pause freezes the foot-contact cycle',b.stridePhase===stride);G.paused=false;
  return out;
 });assert(checks.every(v=>v[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors}));
 const dir='tmp/review/pappu-whole-walk-world';fs.mkdirSync(dir,{recursive:true});
 for(const type of ['advance','reverse','stop','pivot']){
  await p.evaluate(type=>{const g=__game,G=g.G;g.indiaScene('delhi','vendor',0);G.state='play';Object.assign(G.boss,{phase:3,mutated:true,inferno:true,state:'idle',x:G.camLock+(type==='reverse'?80:430),y:226,face:type==='reverse'?1:-1,hp:375,t:0,atkCd:9999,spawnT:-9999});Object.assign(G.boss.kadai,{broken:true,smashed:true,stoveDestroyed:true});Object.assign(G.player,{x:G.camLock+(type==='reverse'?430:60),y:226,state:'idle',z:0,invuln:9999});G.freezeTime=true;G.hitstop=0;},type);
  for(let t=0;t<150;t++){
   const uri=await p.evaluate(({type,t})=>{const g=__game;if(t===40&&['stop','pivot'].includes(type))g.G.player.x=g.G.boss.x+(type==='stop'?-95:95);g.step(1);return document.querySelector('canvas').toDataURL();},{type,t});
   fs.writeFileSync(`${dir}/${type}-${String(t).padStart(3,'0')}.png`,Buffer.from(uri.split(',')[1],'base64'));
  }
 }
 console.log(JSON.stringify({captured:600,dir}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
