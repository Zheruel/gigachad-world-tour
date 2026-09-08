const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1020,height:630}});await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>__game?.G.state==='play');fs.mkdirSync('tmp/review/defeat-fx/game',{recursive:true});
 const result=await p.evaluate(async()=>{
  const g=__game,G=g.G,{updateEnemies}=await import('./js/enemies.js'),{updateEffects}=await import('./js/effects.js'),{startSuper,updatePlayer}=await import('./js/player.js'),{spawnDefeatFX,defeatVictimPose}=await import('./js/defeat_fx.js'),{ASSETS}=await import('./js/assets.js');const checks=[],images=[];
  const setup=()=>{g.indiaScene('refund','calling',0);g.resetInput();G.enemies=[];G.boss=null;G.props=[];G.effects=[];G.shots=[];G.india.review.ambient=false;G.flash=G.fade=G.shake=0;G.hitstop=0;G.meter=100;Object.assign(G.player,{x:G.camX+185,y:228,z:0,state:'idle',face:1,invuln:0});};
  function capture(label,t){G.shake=G.flash=G.fade=0;g.render();const c=document.querySelector('canvas'),d=document.createElement('canvas');d.width=960;d.height=540;const ctx=d.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(c,0,0,960,540);images.push({label,t,native:(()=>{const n=document.createElement('canvas');n.width=480;n.height=270;const nc=n.getContext('2d');nc.imageSmoothingEnabled=false;nc.drawImage(c,0,0,480,270);return n.toDataURL();})(),double:d.toDataURL()});}
  for(const kind of ['normal','heavy','super','crowd','animal']){
   setup();let victims=[];
   if(kind==='crowd'){for(let i=0;i<6;i++){const e=g.spawn('ic_headset',50+i*36,i%2*8);e.hp=1;e.state='idle';e.poise=0;e.hurt(20,1,i%2===1,false);victims.push(e);}}
   else{const e=g.spawn(kind==='animal'?'bull':'ic_headset',50,0);e.hp=kind==='super'?36:1;e.poise=0;e.state='idle';e.face=-1;victims=[e];if(kind==='super'){startSuper(G.player);for(let i=0;i<76;i++){updatePlayer(G.player);updateEffects();}checks.push(['lethal uppercut keeps cancellable visual followthrough',G.player.state==='idle'&&G.player.boxingAfter?.upper&&e.dead]);}else e.hurt(99,1,kind==='heavy',false);}
   const count=G.effects.length;for(const e of victims)spawnDefeatFX(e,1,true,true);checks.push([kind+' effect fires once',G.effects.length===count]);
   if(kind==='animal')checks.push(['animal creates no blood',G.effects.every(f=>!['koBurst','koChunk','koResidue'].includes(f.type))]);
   for(let t=0;t<=36;t++){if(t%3===0)capture(kind,t);updateEffects();updateEnemies();updatePlayer(G.player);G.time++;G.rawTime++;}
  }
  setup();for(const state of ['idle','attack','down','getup','thrown']){const e={kind:'goonda',state,x:240,y:228,z:0,h:80,t:0};spawnDefeatFX(e,1,true,false);e.dead=true;checks.push([state+' knockout contact registration',!!defeatVictimPose(e)===['idle','attack'].includes(state)]);}
  setup();spawnDefeatFX({kind:'boss',x:250,y:228},1,true,true);checks.push(['boss authored defeat is excluded',G.effects.length===0]);
  G.player.boxingAfter={t:0,upper:true};G.player.state='walk';updatePlayer(G.player);checks.push(['lethal followthrough yields immediately to movement',!G.player.boxingAfter]);
  setup();for(let i=0;i<20;i++){const e=g.spawn('ic_headset',50,0);e.hp=1;e.state='idle';e.hurt(99,1,true,false);}checks.push(['bounded residue',G.effects.filter(e=>e.type==='koResidue').length===8]);checks.push(['bounded flying pieces',G.effects.filter(e=>e.type==='koChunk').length<=48]);
  const before=JSON.stringify(G.effects);G.paused=true;g.step(20);checks.push(['pause freezes defeat effects',before===JSON.stringify(G.effects)]);G.paused=false;
  const s=JSON.stringify(G.effects);g.render();g.render();checks.push(['render is pure',s===JSON.stringify(G.effects)]);
  const art=ASSETS.arcade_defeats;ASSETS.arcade_defeats=null;g.render();ASSETS.arcade_defeats=art;checks.push(['missing art has safe fallback',true]);
  for(let t=0;t<300;t++)updateEffects();checks.push(['all defeat effects expire',G.effects.every(e=>!e.type.startsWith('ko'))]);
  g.indiaScene('refund','calling',0);checks.push(['scene replay clears old effects',G.effects.every(e=>!e.type.startsWith('ko'))]);
  return {checks,images};
 });for(const f of result.images)for(const[k,n]of [['native',480],['double',960]])fs.writeFileSync(`tmp/review/defeat-fx/game/${f.label}-${f.t}-${n}.png`,Buffer.from(f[k].split(',')[1],'base64'));console.log(JSON.stringify({captures:result.images.length,checks:result.checks,failures:result.checks.filter(c=>!c[1])}));assert(result.checks.every(c=>c[1]));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
