const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'train/clear');
 const report=await frame.evaluate(async()=>{
  const g=__game,G=g.G,{STAGES}=await import('/js/stages.js'),T=await import('/js/trophies.js'),P=await import('/js/progress.js'),A=await import('/js/assets.js');
  const checks=[],ok=(n,v)=>checks.push([n,!!v]);G.actBest={};ok('no clear means no trophies',T.earnedTrophies(G,STAGES).length===0);
  const identities=[];
  for(const [i,stage]of STAGES.entries()){
   if(stage.id==='train')g.trainScene('clear',0);else g.indiaScene(stage.id,'clear',0);
   g.step(1);const earned=T.earnedTrophies(G,STAGES),t=T.trophyForStage(stage);identities.push([stage.id,t?.name]);
   ok(stage.id+' actual clear awards its trophy',P.hasCleared(G,i)&&earned.some(e=>e.stage.id===stage.id&&e.trophy===t));
   ok(stage.id+' shelf and detail art loaded',!!A.ASSETS[t?.shelf]&&!!A.ASSETS[t?.detail]);
   g.step(2);ok(stage.id+' waiting on results never duplicates award',T.earnedTrophies(G,STAGES).length===i+1);
  }
  const saved=P.writeProgress(G,STAGES),reversed=STAGES.slice().reverse(),restored=P.readProgress(saved,reversed);
  ok('all three clears survive save reload',T.earnedTrophies(P.readProgress(saved,STAGES),STAGES).length===3);
  ok('stage identity survives reorder',T.earnedTrophies(restored,reversed).every(e=>e.trophy===T.TROPHIES[e.stage.id]));
  const before=T.earnedTrophies(G,STAGES).length;g.trainScene('clear',0);g.step(1);ok('replay keeps one award per level',T.earnedTrophies(G,STAGES).length===before);
  return {checks,identities,saved:saved.stageBest};
 });assert(report.checks.every(c=>c[1]),JSON.stringify(report));
 const dir='tmp/review/trophy-ui';fs.mkdirSync(dir,{recursive:true});
 for(const id of ['train','delhi','refund']){await studio.load(page,id+'/clear');await studio.seek(page,300);await studio.capture(page,`${dir}/${id}-clear.png`,2);}
 await frame.evaluate(()=>{const G=__game.G;G.actBest={0:12345,1:23456,2:34567};__game.hub();Object.assign(G,{hubPanel:null,hubRelicKey:null,hubRelicT:0,camX:400,fade:0});__game.render();});await studio.capture(page,`${dir}/shelf.png`,2);
 for(let i=0;i<3;i++){await frame.evaluate(i=>{Object.assign(__game.G,{hubPanel:'trophies',hubAct:i,fade:0});__game.render();},i);await studio.capture(page,`${dir}/gallery-${i}.png`,2);}
 fs.writeFileSync(`${dir}/checks.json`,JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,errors}));
 }finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1});
