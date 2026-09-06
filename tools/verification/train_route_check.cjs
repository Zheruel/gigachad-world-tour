const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{const page=await b.newPage();await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');const report=await page.evaluate(mortal=>{
 const g=__game,G=g.G;g.stage(0);G.freezeTime=true;const visits=[],phases=new Set();let i=0,hold={},deaths=0,lastLives=G.lives;
 const set=(a,v)=>{if(v&&!hold[a])g.press(a);if(!v&&hold[a])g.release(a);hold[a]=v;};
 for(;i<60*60*20;i++){
  const p=G.player;if(!mortal)p.invuln=999999;if(G.lives<lastLives)deaths++;lastLives=G.lives;if(G.state==='gameover')break;
  if(!visits.some(v=>v.wave===G.waveIndex))visits.push({wave:G.waveIndex,frame:i,x:Math.round(p.x)});
  if(G.state==='clear')break;
  if(G.train.cinematic){phases.add(G.train.cinematic.kind);for(const a in hold)set(a,false);g.step(1);continue;}
  const foes=G.enemies.filter(e=>!e.dead&&!e.noCount);if(G.boss&&!G.boss.dead&&!G.boss.trainWaiting)foes.push(G.boss);
  const e=foes.sort((a,b)=>Math.abs(a.x-p.x)+2*Math.abs(a.y-p.y)-Math.abs(b.x-p.x)-2*Math.abs(b.y-p.y))[0];
  if(e){const dx=e.x-p.x,evade=mortal&&e===G.boss&&['windup','cane','charge','reach','pistol'].includes(e.state),dy=(evade?(G.train.climbed?(e.y<200?220:181):(e.y<211?239:184)):e.y)-p.y;set('right',dx>29);set('left',dx<-29);set('down',dy>5);set('up',dy<-5);p.face=dx<0?-1:1;set('attack',!evade&&i%18===0);set('jump',i%100===0||e.perched&&i%50===0);set('super',G.meter>=100&&i%120===0);set('use',i%180===0);}
  else{set('right',G.train.aboard||p.x<2715);set('left',!G.train.aboard&&p.x>2740);set('down',false);set('up',false);set('attack',false);set('jump',false);set('super',false);set('use',!G.train.aboard&&p.x>=2670&&i%20===0);}
  g.step(1);
 }
 g.resetInput();return {state:G.state,mortal,deaths,seconds:i/60,visits,phases:[...phases],position:G.player.x,enemies:G.enemies.filter(e=>!e.dead).map(e=>({kind:e.trainType,state:e.state,hp:e.hp,x:e.x,y:e.y})),boss:G.boss&&{hp:G.boss.hp,state:G.boss.state},checkpoint:G.train.checkpoint};
},!!process.env.TRAIN_MORTAL);console.log(JSON.stringify(report));assert.equal(report.state,'clear','Input-driven combat bot must traverse the complete route');assert.deepEqual(report.phases,['boarding','roof','escape']);}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
