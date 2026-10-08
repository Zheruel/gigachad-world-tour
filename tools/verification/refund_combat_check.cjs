// Office-family contacts, punish windows, shared defence and actual encounter caps.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const checks=await page.evaluate(async()=>{
  const g=__game,G=g.G,{updateEnemies,drawEnemy}=await import('./js/enemies.js'),{updateShots}=await import('./js/shots.js');
  const {resolveIncomingHit,startSuper,updatePlayer}=await import('./js/player.js'),{createProp}=await import('./js/props.js');
  const barks=await import('./js/refund_encounters.js'),out=[],ok=(n,v)=>out.push([n,!!v]);
  function arena(){
   g.indiaScene('refund','calling',0);g.resetInput();Object.assign(G,{enemies:[],shots:[],props:[],effects:[],zones:[],boss:null,
    waveActive:false,locked:true,spawnQueue:[],hitstop:0,parrySlow:0,cinematic:null,swingAt:-99,paused:false});
   Object.assign(G.player,{x:G.camX+180,y:229,z:0,state:'idle',invuln:0,hp:100,dying:false,guardWindow:0,face:1});return G.player;
  }
  const tick=n=>{for(let i=0;i<n;i++){G.time++;updateEnemies();updateShots();}};
  const until=(fn,n=300)=>{for(let i=0;i<n&&!fn();i++){G.player.invuln=999;tick(1);}return fn();};
  const foe=(role,dx=40)=>{const e=g.spawn('ic_'+role,dx,0);e.state='idle';e.atkCd=1;return e;};
  let p=arena(),e=foe('headset');until(()=>e.state==='windup');ok('headset announces a plain opener',e.move==='rf_string'&&e.cls==='plain'&&e.wind===20);
  Object.assign(e,{state:'attack',t:4,face:-1,x:p.x+30,y:p.y});Object.assign(p,{invuln:0,guardWindow:20});let hp=p.hp;tick(1);
  ok('plain first fist deflects and cancels the follow-up',p.hp===hp&&p.lastDefense==='deflect'&&e.state==='hurt');
  p=arena();e=foe('headset');Object.assign(e,{state:'attack',move:'rf_string',cls:'plain',t:5,face:-1});tick(1);
  ok('second fist has a distinct green cue',e.cls==='counter'&&e.cueTo===31);Object.assign(e,{t:29,x:p.x+35,y:p.y});p.guardWindow=20;tick(1);
  ok('green second fist opens protected parry punish',p.lastDefense==='parry'&&e.protectedStagger===45&&p.counterT>0);
  hp=e.hp;e.hurt(2,1,true,false);tick(20);ok('follow-up cannot shorten protected stagger',e.state==='stagger'&&e.protectedStagger===25&&e.hp===hp-2);
  p=arena();e=foe('operator',70);until(()=>e.state==='windup');ok('operator commits a green kick',e.move==='rf_kick'&&e.cls==='counter');
  Object.assign(e,{state:'attack',t:4,x:p.x+42,y:p.y,face:-1,vx:-1});Object.assign(p,{invuln:0,guardWindow:0});hp=p.hp;tick(1);
  ok('operator kick connects only on authored contact',p.hp===hp-8);hp=p.hp;tick(8);ok('kick does not repeat its contact',p.hp===hp);
  p=arena();e=foe('thrower',120);until(()=>e.state==='windup');ok('IT guy announces a reflectable phone',e.move==='rf_phone'&&e.cls==='reflect');until(()=>G.shots.length>0);
  const phone=G.shots[0];ok('phone uses approved projectile and its own source',phone.kind==='phone'&&phone.source===e&&phone.parryClass==='reflect');
  Object.assign(phone,{x:p.x-e.face*3.2,y:p.y,vx:e.face*3.2});Object.assign(p,{invuln:0,guardWindow:20});updateShots();ok('timed parry returns the desk phone',phone.reflected&&p.lastDefense==='parry');
  until(()=>e.protectedStagger>0,90);ok('returned equipment punishes its thrower',e.protectedStagger>0&&e.hp<e.maxhp);
  p=arena();e=foe('thrower',125);until(()=>e.state==='reload');const x=e.x;hp=e.hp;tick(20);ok('reloading leaves IT guy planted and vulnerable',e.state==='reload'&&e.x===x);e.hurt(3,1,false,false);ok('reload can be interrupted',e.hp===hp-3&&e.state==='hurt');
  p=arena();e=foe('thrower',35);until(()=>e.state==='windup');ok('crowded IT guy switches to a green keyboard hit',e.move==='rf_keyboard'&&e.cls==='counter');
  p=arena();e=foe('security',50);e.atkCd=999;e.face=-1;hp=e.hp;e.hurt(4,1,false,false);ok('security blocks a frontal light',e.state==='block'&&e.hp===hp);
  e.hurt(8,1,true,false);ok('heavy breaks security guard into a real opening',e.state==='guardbreak'&&e.gbT===50&&e.hp===hp-12);
  Object.assign(e,{state:'attack',move:'rf_lathi',cls:'counter',t:8,x:p.x+50,y:p.y,face:-1,gbT:0});p.guardWindow=20;tick(1);ok('security baton obeys shared protected parry',e.protectedStagger===45&&p.lastDefense==='parry');
  p=arena();e=foe('cabinet',100);e.atkCd=999;e.face=-1;hp=e.hp;e.hurt(4,1,false,false);ok('intact cabinet absorbs frontal lights',e.hp===hp&&e.state==='block');
  e.rig.hurt(99,1,true);ok('breaking the cabinet removes the shield and long reach',e.rig.broken&&e.ramGone&&e.range===40);e.state='idle';e.atkCd=1;until(()=>e.state==='windup');ok('disarmed recovery agent uses a green punch',e.move==='rf_punch'&&e.cls==='counter');
  p=arena();e=foe('cabinet',140);p.y=245;const prop=createProp('ic_server',e.x-115,e.y);G.props.push(prop);
  Object.assign(e,{state:'windup',move:'rf_ram',cls:'unblockable',wind:36,t:0,face:-1});until(()=>e.state==='stuck',160);
  ok('cabinet ram jams against actual furniture',e.state==='stuck'&&prop.hp<prop.maxhp&&e.stuckFor===54);hp=e.hp;e.hurt(4,1,false,false);ok('jammed recovery agent stays exposed through lights',e.state==='stuck'&&e.hp===hp-4);
  p=arena();e=foe('lead',120);const mate=foe('headset',-90);e.atkCd=999;e.rallyCd=0;mate.atkCd=999;tick(1);ok('lead starts an interruptible call inside shared budget',e.state==='rally');e.hurt(3,1,false,false);tick(40);
  ok('interrupted lead never coordinates or spawns an extra worker',e.state!=='rally'&&G.enemies.length===2&&mate.atkCd>100);
  p=arena();G.meter=100;e=foe('security',45);e.atkCd=999;const other=foe('headset',-80);other.atkCd=999;hp=e.hp;const ohp=other.hp;
  ok('office families retain single-target super ownership',startSuper(p)&&p.specialTarget===e&&e.superLocked);for(let i=0;i<101;i++){G.time++;updatePlayer(p);updateEnemies();}
  ok('super applies full damage to only its owned office target',e.hp===hp-36&&other.hp===ohp&&!e.superLocked);
  const trace=rng=>{const old=Math.random;Math.random=rng;const rows=[];try{for(const role of ['headset','operator','thrower','security','cabinet','lead']){
   p=arena();G.time=1000;e=foe(role,120);mate2=foe('headset',-90);for(let i=0;i<720;i++){p.invuln=999;p.state='idle';tick(1);if(i%15===0)rows.push([role,e.state,e.move,e.x.toFixed(2),e.y.toFixed(2),mate2.state]);}
  }}finally{Math.random=old;}return JSON.stringify(rows);};let mate2;
  ok('all office decisions ignore combat RNG',trace(()=>.01)===trace(()=>.98));
  p=arena();G.waveIndex=9;G.waveActive=true;G.player.x=G.stage.waves[9].x;G.camX=G.camLock=G.player.x-170;G.india.office=[];G.india.pendingEntries=0;G.spawnQueue=[];G.india.reserveWave=9;G.india.reserveIndex=0;
  for(const role of ['cabinet','thrower','headset','operator','security','lead'])foe(role,role==='lead'?-90:100);
  let max=0;for(let i=0;i<900;i++){G.time++;p.invuln=999;updateEnemies();max=Math.max(max,G.enemies.filter(e=>!e.dead&&['windup','attack','drop','rally'].includes(e.state)).length);}
  ok('even six active office fighters permit only two attackers',max<=2&&max>0);
  p=arena();e=foe('thrower',90);e.set={...e.set,_aiKey:'missing-office-art'};for(let i=0;i<120;i++){p.invuln=999;tick(1);drawEnemy(document.querySelector('#game').getContext('2d'),e,G.camX);}ok('missing office art preserves combat fallback',e.hp>0&&Number.isFinite(e.x));
  // Speech follows an actual entrant, then is immediately quiet for a super or a retry.
  p=arena();G.waveIndex=2;G.waveActive=true;e=foe('thrower',90);e.atkCd=999;barks.updateRefundEncounters();ok('entrance line belongs to live IT speaker',G.india.refundEncounters.speech?.speaker===e);
  p.state='special';barks.updateRefundEncounters();ok('super clears ordinary office speech',!G.india.refundEncounters.speech);p.state='idle';G.india.cues=new Set();G.india.t=0;barks.updateRefundEncounters();ok('retry resets bubble observations',G.india.refundEncounters.cues===G.india.cues);
  const q=G.india.refundEncounters,before=JSON.stringify({age:q.speech?.age,cues:[...q.cues]});barks.drawRefundEncounters(document.querySelector('#game').getContext('2d'));barks.drawRefundEncounters(document.querySelector('#game').getContext('2d'));ok('speech rendering has no cue or timeline side effects',before===JSON.stringify({age:q.speech?.age,cues:[...q.cues]}));
  return out;
 });
 console.log(JSON.stringify({checks:checks.length,failures:checks.filter(x=>!x[1]),errors}));assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
