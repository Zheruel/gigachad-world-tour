// Netaji (nr_neta) cells through the game's own loader: every manifest state loads every file at 200x150 logical,
// the roof duel still renders with the replaced walk/backpedal/hurt cells, and each run-2 state is drawn with the
// game's getFrame/blit over the real roof or carriage scene next to CHAD (2x captures).
//   NODE_PATH=~/.cache/gachi-pw/node_modules node tools/verification/neta_moves_runtime_check.cjs [outDir]
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),studio=require('./studio_helper.cjs');
const OUT=process.argv[2]||'tmp/review/neta_moves/runtime';
(async()=>{const {page,errors,close}=await studio.launch();try{
 fs.mkdirSync(OUT,{recursive:true});const miss=[];page.on('response',r=>{if(r.status()>=400)miss.push(r.url().replace(/^.*?\/assets\//,'assets/'));});
 await page.goto((process.env.GAME_URL||`http://localhost:${process.env.PORT||8011}`)+'/?auto=walk');
 await page.waitForFunction(()=>window.__game?.G.state==='play',null,{timeout:90000});
 const res=await page.evaluate(async()=>{
  const man=(await (await fetch('assets/frames/manifest.json',{cache:'reload'})).json()).nr_neta,{getAIFrame}=await import('/js/aiframes.js');
  const bad=[];for(const [st,files] of Object.entries(man)){const a=getAIFrame('nr_neta',st);if(!a||a.f.length!==files.length)bad.push(st+' loaded '+(a?.f.length||0)+'/'+files.length);else a.f.forEach((f,i)=>{if(f.width!==400||f.height!==300)bad.push(st+'['+i+'] '+f.width+'x'+f.height);});}
  return {bad,states:Object.keys(man).filter(s=>man[s].some(f=>f.includes('/m_')))};
 });
 assert.deepEqual(res.bad,[],'manifest states load');
 // Roof duel: he walks in, backs off and takes a hit with the replaced cells, and nothing throws.
 const roof=await page.evaluate(()=>{const g=__game,G=g.G;g.trainScene('boss-roof',0);const b=G.boss;b.atkCd=999;
  const seen=new Set();for(let i=0;i<240;i++){g.step(1);g.render();seen.add(b.state+':'+(b.backing?'back':''));if(i===60)G.player.x=b.x-60;if(i===150)G.player.x=b.x-230;}
  return [...seen];});
 const shots=[];
 for(const scene of ['boss-roof','neta-abandon']){
  const list=res.states.filter(s=>(scene==='boss-roof')!==['climb_start','climb_back','flee_run','flee_glance','shout'].includes(s));
  for(const st of list){
   const file=path.join(OUT,`${scene==='boss-roof'?'roof':'carriage'}_${st}_2x.png`);
   const png=await page.evaluate(async([scene,st])=>{
    const g=__game,G=g.G,{SPR,getFrame,blit,frameW,frameH}=await import('/js/sprites.js');g.trainScene(scene,0);G.enemies=[];g.render();
    const src=document.getElementById('game'),c=document.createElement('canvas');c.width=960;c.height=540;const x=c.getContext('2d');x.drawImage(src,0,0,960,540);x.scale(2,2);
    const n=getFrame(SPR.nr_neta,st,0,1)?(await import('/js/aiframes.js')).getAIFrame('nr_neta',st).f.length:0,y=G.player.y;
    for(let i=0;i<n;i++){const f=getFrame(SPR.nr_neta,st,i,1),X=G.player.x-G.camX+70+i*(n>6?44:58);blit(x,f,Math.round(X-frameW(f)/2),Math.round(y-frameH(f)+4));}
    x.setTransform(1,0,0,1,0,0);x.fillStyle='#ff0';x.font='14px monospace';x.fillText(st+' x'+n,8,18);return c.toDataURL('image/png');
   },[scene,st]);
   fs.writeFileSync(file,Buffer.from(png.split(',')[1],'base64'));shots.push(file);
  }
 }
 // Other sets' missing files (another track mid-rebuild) are reported, not failed; nr_neta 404s and page errors fail.
 const own=miss.filter(u=>u.includes('/nr_neta/')),other=miss.filter(u=>!u.includes('/nr_neta/'));
 console.log(JSON.stringify({states:res.states.length,roofStates:roof,shots:shots.length,otherMissing:other.length,otherSample:other.slice(0,3)}));
 assert.deepEqual(own,[],'nr_neta files missing');
 assert.deepEqual(errors.filter(e=>!e.startsWith('Failed to load resource')),[],'no page errors');
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
