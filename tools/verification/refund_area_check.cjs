// Indoor architecture is solid through knockdowns, throws and ordinary movement.
const assert=require('node:assert/strict'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'refund/office');
 const checks=await frame.evaluate(async()=>{
  const g=__game,G=g.G,{clampToLane}=await import('/js/engine.js'),out=[];
  g.indiaScene('refund','office');G.enemies=[];G.spawnQueue=[];G.waveActive=false;
  for(const x of [240,1230,1800,2700,3560,4360,5100,6300]){
   for(const state of ['idle','down','thrown','grabbed']){
    const body={x,y:209,state,z:0};const edge=clampToLane(body);
    out.push([`${state} at ${x} remains on solid indoor floor`,edge===0&&body.y===215]);
   }
  }
  G.locked=true;G.camLock=G.camX=0;Object.assign(G.player,{x:300,y:240,state:'idle',z:0});
  g.resetInput();g.press('up');g.step(90);g.release('up');
  out.push(['CHAD cannot walk through the desk fronts',G.player.y===215]);
  const e=g.spawn('ic_headset',-40,-90);e.atkCd=999;
  out.push(['an enemy cannot spawn behind the desk fronts',e.y===215]);
  g.step(120);out.push(['ordinary enemy movement stays in the aisle',e.y>=215&&e.y<=245]);
  return out;
 });
 const failed=checks.filter(([,v])=>!v);console.log(JSON.stringify({checks:checks.length,failed,errors}));assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
 }finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
