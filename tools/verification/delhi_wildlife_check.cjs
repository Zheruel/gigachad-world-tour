// Wildlife population, scattering, quiet returns, pause, and cinematic preservation.
const assert=require('node:assert/strict'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const f=await studio.openStudio(page,'delhi/market');
 const report=await f.evaluate(async()=>{
  const [{G},a,{ASSETS}]=await Promise.all(['engine','delhi_ambient','assets'].map(n=>import('/js/'+n+'.js')));
  G.paused=false;G.effects=[];G.enemies=[];G.india.environment=null;
  let rngCalls=0;const random=Math.random;Math.random=()=>{rngCalls++;return random();};
  try{
   a.initDelhiAmbient();a.updateDelhiAmbient();const w=G.india.wildlife;
   const groupSizes=[...new Set(w.actors.filter(b=>b.kind==='pigeon').map(b=>b.flock))].sort();
   const rat=w.actors.find(b=>b.kind==='rat'&&b.playOnly),bird=w.actors.find(b=>b.kind==='pigeon'&&b.slot<b.flock);
   const extraRats=w.actors.filter(b=>b.playOnly).length;
   const bazaarHomes=w.actors.filter(b=>b.kind==='pigeon'&&b.site===3&&b.slot<2).map(b=>[b.homeX,b.homeY]);
   // Measure real opaque toes after draw registration, including the feeding pose.
   const birdImage=ASSETS.ic_pigeon,probe=document.createElement('canvas');probe.width=probe.height=128;
   const pc=probe.getContext('2d'),footErrors=[];
   for(const b of w.actors)b.visible=false;
   bird.visible=true;bird.state='idle';const draws=[];
   const ctx={save(){},restore(){},translate(){},scale(){},fillRect(){},drawImage(...args){draws.push(args);}};
   for(let frame=0;frame<5;frame++){
    bird.frame=frame;draws.length=0;a.drawDelhiAmbient(ctx,G.camX);
    const d=draws[0];pc.clearRect(0,0,128,128);pc.drawImage(birdImage,d[1],d[2],d[3],d[4],0,0,128,128);
    const pixels=pc.getImageData(0,0,128,128).data;let bottom=0;
    for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>=128)bottom=y+1;
    footErrors.push(d[6]+bottom*d[8]/128);
   }
   a.scareDelhiAmbient(rat.x,rat.y);for(let i=0;i<160;i++)a.updateDelhiAmbient();
   const scattered=rat.state==='hidden'&&bird.state==='hidden'&&rat.hx<rat.homeX;
   const startAge=bird.age;let returnAfter=-1;
   for(let i=0;i<2500;i++){a.updateDelhiAmbient();if(bird.state==='return'){returnAfter=i+startAge;break;}}
   G.paused=true;const paused=JSON.stringify(w);for(let i=0;i<30;i++)a.updateDelhiAmbient();const pauseStable=paused===JSON.stringify(w);
   G.paused=false;G.state='intro';a.initDelhiAmbient();a.updateDelhiAmbient();const c=G.india.wildlife;
   const introGroup=c.actors.filter(b=>b.kind==='pigeon'&&b.homeX>245&&b.homeX<330&&b.visible).length;
   const introExtras=c.actors.filter(b=>b.playOnly&&b.visible).length;
   return {groupSizes,extraRats,bazaarHomes,footErrors,scattered,returnAfter,pauseStable,introGroup,introExtras,rngCalls};
  }finally{Math.random=random;}
 });
 assert(report.groupSizes.every(n=>n<=2));assert(report.groupSizes.includes(1)&&report.groupSizes.includes(2));
 assert.equal(report.extraRats,4);assert(report.scattered);assert(report.returnAfter>=1200&&report.returnAfter<=2401);
 assert.deepEqual(report.bazaarHomes,[[1022,225],[1046,226]]);assert(report.footErrors.every(n=>Math.abs(n)<.01));
 assert(report.pauseStable);assert.equal(report.introGroup,3);assert.equal(report.introExtras,0);assert.equal(report.rngCalls,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({...report,errors}));
 }finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
