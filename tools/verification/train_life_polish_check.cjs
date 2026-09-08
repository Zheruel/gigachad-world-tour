// Read actual game state and renders; background routines cannot change combat.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out='tmp/review/train-life-polish/verify';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1020,height:660}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const checks=await p.evaluate(async()=>{
  const g=__game,G=g.G,life=await import('./js/train_life.js'),{ASSETS}=await import('./js/assets.js');const checks=[];const ok=(name,value)=>checks.push([name,!!value]);
  g.trainScene('hall',0);let tr=G.train;ok('three routines initialize at rest',tr.stationLife.length===3&&tr.stationLife.every(s=>s.alert===-1));
  G.enemies=[{x:1338,y:220,state:'windup',dead:false}];life.updateTrainLife(tr);ok('nearby combat creates authored startled pose',tr.stationLife[0].alert===0&&life.trainLifePose(tr,0)===3);
  G.enemies=[];for(let i=0;i<104;i++){tr.t++;life.updateTrainLife(tr);}ok('reaction returns to routine',tr.stationLife[0].alert===-1);
  G.enemies=[{x:1338,y:220,state:'attack',dead:false}];life.updateTrainLife(tr);ok('reaction cooldown prevents chatter',tr.stationLife[0].alert===-1);
  G.enemies=[];tr.t=600;G.enemies=[{x:1338,y:220,state:'attack',dead:true}];life.updateTrainLife(tr);ok('defeated actors cannot frighten staff',tr.stationLife[0].alert===-1);
  const record=[],prior=G.audio.roomSfxAt;G.audio.roomSfxAt=(...a)=>record.push(a);G.enemies=[];tr.arrival=-1;tr.t=425;G.camX=6320;life.updateTrainLife(tr);
  ok('page cue uses spatial helper quietly',record.length===1&&record[0][0]==='room_page'&&record[0][1]<.065&&record[0][2]>0);
  record.length=0;G.camX=0;life.updateTrainLife(tr);ok('offscreen routines stay silent',record.length===0);
  for(const kind of ['intro','boarding','roof','escape']){tr.cinematic={kind,t:0};const before=JSON.stringify(tr.stationLife);life.updateTrainLife(tr);ok(kind+' preserves approved cinematic state',before===JSON.stringify(tr.stationLife)&&record.length===0);}
  tr.cinematic=null;G.audio.roomSfxAt=prior;
  g.trainScene('ac',0);tr=G.train;const phase=[0,500,565,711];ok('reader has distinct long quiet reading cycle',phase.map(t=>{tr.t=t-75;return life.trainLifePose(tr,2)}).join(',')==='0,1,2,0');
  const actor=ASSETS.nr_station_life;ASSETS.nr_station_life=null;g.render();ASSETS.nr_station_life=actor;ok('missing life art renders safely',true);
  const before=JSON.stringify([tr,G.boss,G.enemies],(k,v)=>['set','def','audio'].includes(k)?undefined:v);g.render();g.render();ok('render stays side-effect free',before===JSON.stringify([tr,G.boss,G.enemies],(k,v)=>['set','def','audio'].includes(k)?undefined:v));
  g.trainScene('hall',0);ok('scene reset clears reaction/cooldown',G.train.stationLife.every(s=>s.alert===-1&&s.ready===0));
  const pausedAt=G.train.t;g.press('pause');g.step(1);g.release('pause');g.step(20);ok('pause freezes station routines',G.paused&&G.train.t===pausedAt);g.press('pause');g.step(1);g.release('pause');g.resetInput();
  return checks;
 });assert(checks.every(c=>c[1]),JSON.stringify(checks));
 const capture=async name=>{for(const width of [480,960]){await p.locator('canvas').evaluate((c,w)=>Object.assign(c.style,{width:w+'px',height:w*270/480+'px',maxWidth:'none'}),width);await p.locator('canvas').screenshot({path:path.join(out,`${name}-${width}.png`)});}};
 for(const [row,scene]of ['hall','platform','ac'].entries())for(let pose=0;pose<4;pose++){
  await p.evaluate(([row,scene,pose])=>{__game.trainScene(scene,0);const G=__game.G,tr=G.train,offset=[130,270,75][row];tr.t=(row===2?[0,500,565,0]:[0,300,500,0])[pose]-offset;tr.arrival=-1;if(pose===3)tr.stationLife[row].alert=0;G.fade=G.flash=G.shake=0;__game.render()},[row,scene,pose]);await capture(`life-${scene}-${pose}`);
 }
 for(const scene of ['conductor','boss-roof'])for(const state of ['windup','charge'])for(let t=0;t<=57;t+=3){
  await p.evaluate(([scene,state,t])=>{__game.trainScene(scene,scene==='conductor'?300:0);const G=__game.G;G.state='play';G.props=[];G.boss.fightProps=[];Object.assign(G.boss,{state,pattern:'charge',t,x:G.camX+290,y:220,face:-1,shieldActive:false,trainWaiting:false});G.fade=G.flash=G.shake=0;__game.render()},[scene,state,t]);await capture(`${scene}-${state}-${t}`);
 }
 for(const [scene,state,t,shield]of [['boss-roof','windup',20,false],['boss-roof','sweep',14,false],['boss-roof','sweep',27,false],['conductor','windup',20,true],['conductor','charge',15,true],['conductor','stagger',0,true]]){
  await p.evaluate(([scene,state,t,shield])=>{__game.trainScene(scene,scene==='conductor'?300:0);const G=__game.G;G.state='play';G.boss.fightProps=[];Object.assign(G.boss,{state,pattern:scene==='boss-roof'?'sweep':'charge',t,shieldActive:shield,guardFlash:state==='stagger'?4:0,x:G.camX+290,y:220,face:-1,trainWaiting:false});G.fade=G.flash=G.shake=0;__game.render()},[scene,state,t,shield]);await capture(`${scene}-contact-${state}-${t}`);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,chargeFrames:160,lifeFrames:24,weaponContacts:12,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
