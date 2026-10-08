// Presentation-only train regression: compare deterministic boss traces before/after.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
const out=process.env.TRAIN_PRESENTATION_OUT||'tmp/review/train-presentation';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1000,height:620}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const capture=async(name)=>{for(const width of [960,480]){await p.locator('canvas').evaluate((c,w)=>Object.assign(c.style,{width:w+'px',height:w*270/480+'px',maxWidth:'none'}),width);await p.locator('canvas').screenshot({path:path.join(out,name+'-'+width+'.png')});}};
 const traces=await p.evaluate(async()=>{const g=__game,G=g.G,{updateBoss}=await import('./js/bosses.js'),traces={};
  for(const [scene,patterns] of [['conductor',['stamp','seize','swing','brake']],['boss',['pound','bullrush','quake']],['boss-roof',['shot','swing','grit','shove']]])for(const pattern of patterns){
   g.trainScene(scene,scene==='conductor'?300:0);g.resetInput();G.time=1000;G.rawTime=1000;G.effects=[];G.enemies=[];G.shots=[];G.props=[];G.hitstop=0;const b=G.boss;Object.assign(b,{state:'windup',pattern,t:0,x:G.camX+260,y:220,face:-1,guard:3,protectedStagger:0,trainWaiting:false,fightProps:[]});Object.assign(G.player,{x:G.camX+220,y:220,hp:100,invuln:0,z:0,state:'idle',guardWindow:0,parryWindow:0,parryT:0});
   const frames=[];for(let i=0;i<150;i++){G.time++;G.rawTime++;updateBoss();if(G.player.invuln>0)G.player.invuln--;frames.push([b.state,b.t,b.x,b.y,b.hp,b.guard,b.protectedStagger,G.player.hp,G.player.grabbedBy?.key||null,G.enemies.length,G.shots.length]);}
   traces[scene+':'+pattern]=frames;
  }
  return traces;
 });
 const baseline='tmp/review/india-baseline/train/presentation-traces.json';if(process.env.TRAIN_RECORD_BASELINE){assert(!fs.existsSync(baseline),'baseline already recorded');fs.writeFileSync(baseline,JSON.stringify(traces));}else{assert.equal(crypto.createHash('sha256').update(JSON.stringify(traces)).digest('hex'),'884dd047d8673d1e235b99417bdaa074d14dd0fbf1376b545199f3667fa80730','presentation changed combat outcomes');}
 for(const [scene,pattern,times]of [['conductor','stamp',[0,4,5,12,19]],['conductor','seize',[0,6,14,40]],['conductor','swing',[0,6,8,14]],['conductor','rehook',[0,14,40]],['boss','pound',[0,6,20,28,48,72,82,100]],['boss','quake',[0,22,44,60]],['boss-roof','swing',[0,8,16,26]],['boss-roof','shot',[0,1,25]],['boss-roof','grit',[0,4]]])for(const t of times){
  await p.evaluate(([s,pattern,t])=>{const g=__game,G=g.G;g.trainScene(s,s==='conductor'?300:0);Object.assign(G.boss,{state:pattern,pattern,t,face:-1,x:G.camX+300,y:220,guardFlash:0});G.shake=0;G.flash=0;G.fade=0;g.render()},[scene,pattern,t]);await capture(`${scene}-${pattern}-${t}`);
 }
 for(const t of [0,24,70,110,144]){await p.evaluate(t=>{const G=__game.G;__game.trainScene('general',0);G.train.t=t;G.train.passengerReactions=[{t,ready:360},{t:-1,ready:0}];G.fade=G.flash=G.shake=0;__game.render()},t);await capture('passenger-'+t);}
 for(const scene of ['conductor','boss','boss-roof']){await p.evaluate(scene=>{__game.trainScene(scene,scene==='conductor'?300:0);const G=__game.G;G.props=[];G.boss.fightProps=[];Object.assign(G.boss,{x:G.camX+270,y:220,state:'stagger',t:0,protectedStagger:45,guard:0});G.fade=G.flash=G.shake=0;__game.render()},scene);await capture(scene+'-stagger');}
 const checks=await p.evaluate(async()=>{const g=__game,G=g.G,{updateTrain}=await import('./js/train.js'),{ASSETS}=await import('./js/assets.js'),out=[];
  g.trainScene('general',0);G.enemies=[{x:3170,y:218,state:'windup',dead:false}];updateTrain();out.push(['nearby attack triggers passenger reaction',G.train.passengerReactions[0].t===0]);
  G.enemies=[];for(let i=0;i<151;i++)updateTrain();out.push(['reaction settles back into routine',G.train.passengerReactions[0].t===-1]);
  const im=ASSETS.nr_passenger_reaction;ASSETS.nr_passenger_reaction=null;G.train.passengerReactions[0].t=20;g.render();ASSETS.nr_passenger_reaction=im;out.push(['missing reaction falls back safely',true]);
  return out;
 });assert(checks.every(c=>c[1]),JSON.stringify(checks));
 const pure=await p.evaluate(()=>{const G=__game.G,b=G.boss||{},s=JSON.stringify([b.t,b.state,b.hp,b.x,b.y,b.guard,G.train]);__game.render();__game.render();return s===JSON.stringify([b.t,b.state,b.hp,b.x,b.y,b.guard,G.train])});assert(pure);assert.deepEqual(errors,[]);console.log(JSON.stringify({patterns:Object.keys(traces).length,ticks:Object.values(traces).flat().length,renderPure:pure,checks,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
