// Registered art, recovery playback and every ordinary encounter's live queue.
const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 await studio.openStudio(page,'delhi/duel-brawler');
 const art=await studio.game(page,async(g,G)=>{
  const {getAIFrame,hasAIState}=await g.importModule('js/aiframes.js');
  const manifest=await fetch('assets/frames/manifest.json',{cache:'reload'}).then(r=>r.json());
  const keys=['ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker'],failures=[];let frames=0;
  for(const key of keys){
   if(!hasAIState(key,'revamp_idle'))failures.push(`${key}: missing production marker`);
   for(const [state,files]of Object.entries(manifest[key]))for(let i=0;i<files.length;i++){
    const loaded=getAIFrame(key,state),f=loaded?.f[i],fl=loaded?.fl[i];frames++;
    if(!f||f._file!==files[i]||!fl)failures.push(`${key} ${state} ${i}: missing/misordered frame`);
    else if(f.width!==360||f.height!==300)failures.push(`${key} ${state} ${i}: changed registration canvas`);
   }
   if(manifest[key].walk.length<12||manifest[key].getup.length!==6)failures.push(`${key}: incomplete walk/recovery`);
   const e=g.spawn(key,120,0),walk=key==='ic_heavy'&&e.rig&&!e.rig.broken?'push':'walk';
   if(e.walkBeat?.length!==manifest[key][walk]?.length||e.walkBeat.some(n=>!Number.isFinite(n)||n<=0))
    failures.push(`${key}: walking distance clock does not match its poses`);
   if(key==='ic_heavy'){
    e.rig.hurt(9999,1,true,false,true);
    if(!e.cartBroken||e.walkBeat?.length!==manifest[key].walk.length)
     failures.push(`${key}: cart loss did not switch to the unarmed walking clock`);
   }
  }
  return{frames,failures};
 });
 assert.deepEqual(art.failures,[]);console.log(JSON.stringify({art}));
 const ids=(await page.evaluate(()=>__review.listScenarios())).filter(s=>s.group==='fights'&&s.id.startsWith('delhi/encounter-')&&!s.label?.includes('full fight'));
 const waves=await page.evaluate(()=>__review.game.G.stage.waves.map((w,i)=>({i,regular:!!w.spawns?.length})));
 const rows=[];
 for(const w of waves.filter(w=>w.regular)){
  await studio.load(page,`delhi/encounter-${w.i}`);
  const row=await studio.game(page,(g,G)=>{
   const born=new Set(),liveSeen=new Set();let max=0,cleared=false,reserves=false,steps=0;
   for(let t=0;t<3000;t++){
    G.player.invuln=9999;g.step(1);steps++;
    const live=G.enemies.filter(e=>!e.dead&&!e.noCount&&!e.runner);
    max=Math.max(max,live.length);
    for(const e of live){born.add(e);liveSeen.add(e.trainType);e.auditAge=(e.auditAge||0)+1;
     // Leave both opening and reserve groups alive long enough to run their real AI.
     if(e.auditAge===150)e.hurt(9999,1,true,true);
    }
    reserves||=G.spawnQueue.length>0;
    if(t>80&&!G.waveActive&&born.size){cleared=true;break;}
   }
   return{count:born.size,max,cleared,reserves,steps,families:[...liveSeen]};
  });
  assert(row.cleared,`Encounter ${w.i} never clears`);assert(row.max<=4,`Encounter ${w.i} exceeds four opponents`);
  rows.push({index:w.i,...row});
 }
 assert.equal(rows.reduce((a,r)=>a+r.count,0),49);
 assert.equal(rows.length,11);
 const recovery=await studio.game(page,async(g,G)=>{
  const {updateEnemies}=await g.importModule('js/enemies.js'),rows=[];
  for(const key of ['ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker']){
   G.enemies=[];G.boss=null;G.player.invuln=9999;const e=g.spawn(key,120,0);Object.assign(e,{state:'getup',t:0,z:0,vz:0});
   let n=0;while(e.state==='getup'&&n<100){G.time++;updateEnemies();n++;}rows.push({key,ticks:n});
  }return rows;
 });
 assert(recovery.every(r=>r.ticks>=29&&r.ticks<=34));assert.deepEqual(errors,[]);
 const result={artFrames:art.frames,encounters:rows,recovery,errors};fs.mkdirSync('tmp/review/delhi-cast/production',{recursive:true});fs.writeFileSync('tmp/review/delhi-cast/production/integration-check.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
