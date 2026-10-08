// Actual input, spawns, AI movement and knockdowns at the stall/river boundaries.
const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'delhi/duel-brawler');
 const out=await frame.evaluate(async()=>{
  const g=__game,G=g.G,{clampToLane}=await import('/js/engine.js'),checks=[];const ok=(n,v)=>checks.push([n,!!v]);
  g.indiaScene('delhi','market');g.resetInput();G.enemies=[];G.boss=null;G.waveActive=false;G.spawnQueue=[];G.locked=true;G.camLock=0;
  Object.assign(G.player,{x:300,y:240,hp:100,state:'idle',z:0});g.press('up');g.step(90);g.release('up');ok('held up input stops CHAD below the counter',G.player.y===226&&G.player.x===300);
  const e=g.spawn('ic_brawler',40,-100);e.state='idle';e.atkCd=999;ok('spawn clamps enemy feet below the counter',e.y===226);g.step(120);ok('enemy AI stays below the counter',e.y>=226);
  Object.assign(G.player,{y:220,state:'down',z:0,dying:false});clampToLane(G.player);ok('knockdown against a stall is solid ground',G.player.y===226&&!G.player.dying);
  Object.assign(e,{y:220,state:'thrown',z:0,dead:false});clampToLane(e);ok('thrown enemy hits a solid stall boundary',e.y===226&&!e.dead);
  g.indiaScene('delhi','bazaar');g.resetInput();G.enemies=[];G.locked=false;G.player.x=1100;G.player.y=240;G.player.state='idle';g.press('up');g.step(90);g.release('up');ok('bazaar keeps its wider dodge lane',G.player.y===213);
  Object.assign(G.player,{x:4250,y:205,state:'down',z:0,dying:false,hp:100});const river=clampToLane(G.player);ok('a helpless body still falls into the river',river===-1&&G.player.y===213);
  return checks;
 });gaps=out.filter(([,v])=>!v);fs.mkdirSync('tmp/review/combat-readability',{recursive:true});fs.writeFileSync('tmp/review/combat-readability/stall-boundary.json',JSON.stringify(out,null,2));console.log(JSON.stringify({checks:out.length,failures:gaps,errors}));assert.deepEqual(gaps,[]);assert.deepEqual(errors,[]);
 await studio.load(page,'delhi/duel-brawler');await frame.evaluate(()=>{__game.resetInput();__game.press('up');__game.step(100);__game.release('up');});await studio.capture(page,'tmp/review/combat-readability/stall-boundary.png',2);
 }finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
