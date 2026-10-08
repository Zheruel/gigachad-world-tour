// Real shared combat modules: Closer contacts, readable windows and earned openings.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__closer_check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Closer checks</title>'}));
 await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/__closer_check');
 const checks=await page.evaluate(async()=>{
  const [{G},{createBoss,updateBoss,drawBoss},{createPlayer,startSuper,updatePlayer},{updateShots},{debugPress,debugResetInput},{getCloserBeat,closerCueClass,CLOSER_TIMING}]=await Promise.all([
   import('./js/engine.js'),import('./js/bosses.js'),import('./js/player.js'),import('./js/shots.js'),import('./js/input.js'),import('./js/refund_boss_timing.js')]);
  let sounds=[],finishes=0;G.audio={sfx:n=>sounds.push(n),roomSfx:n=>sounds.push(n),voiceRandom:()=>false};
  const out=[],ok=(n,v,i)=>out.push(i&&!v?[n,!!v,i]:[n,!!v]),tick=n=>{for(let i=0;i<n;i++){G.time++;G.rawTime++;updateBoss();}};
  function arena(o={}){
   debugResetInput();Object.assign(G,{state:'play',stage:{id:'refund',lanes:[{x0:0,x1:20000,top:213,bot:245}]},camX:5900,camLock:5900,arenaSqueeze:0,
    enemies:[],props:[],shots:[],zones:[],effects:[],pickups:[],time:0,rawTime:0,score:0,meter:0,hitstop:0,parrySlow:0,paused:false,india:{startCinematic:()=>{finishes++;return true;}}});
   const p=G.player=createPlayer();Object.assign(p,{x:6080,y:226,z:0,state:'idle',hp:100,face:1,invuln:0});
   const b=createBoss('closer',6116,226);Object.assign(b,{face:-1,atkCd:999,hitCount:0,...o});return b;
  }
  const hook=CLOSER_TIMING.phase1.boxing.hits.at(-1).at,cross=CLOSER_TIMING.phase2.boxing.hits.at(-1).at,PB=CLOSER_TIMING.phaseBreak;
  let b=arena({state:'boxing',pattern:'boxing',t:6});tick(1);ok('jab holds its cocked pose before contact',G.player.hp===100&&getCloserBeat(b).part==='tell');
  tick(1);ok('first jab connects at its authored height',G.player.hp===94&&b.contactY===88&&b.lastContact==='jab'&&getCloserBeat(b).part==='contact');
  const hp=G.player.hp;tick(5);ok('jab has one contact, not damage on every visible frame',G.player.hp===hp&&b.hitCount===1);
  b=arena({state:'boxing',pattern:'boxing',t:7});Object.assign(G.player,{state:'parry',guardWindow:20});debugPress('parry');tick(1);
  ok('a timed jab deflects while the boss string plays on',G.player.hp===100&&G.player.lastDefense==='deflect'&&b.state==='boxing'&&b.protectedStagger===0&&b.guard===3);
  b=arena({state:'boxing',pattern:'boxing',t:hook-25});ok('green cue waits for the committed overhand, never promising a jab riposte',closerCueClass(b)==='plain');tick(1);ok('overhand announces its green cue twenty-four ticks before contact',closerCueClass(b)==='counter');
  b=arena({state:'boxing',pattern:'boxing',t:hook-1});Object.assign(G.player,{state:'parry',guardWindow:20});debugPress('parry');tick(1);
  ok('timed overhand grants the whole shared counter and stops the string',b.state==='stagger'&&b.protectedStagger===45&&b.guard===2&&G.player.counterT===90&&G.player.hp===100);
  const bhp=b.hp;b.hurt(9,1,true,false);tick(44);ok('punishing the overhand cannot shorten the protected opening',b.hp===bhp-9&&b.protectedStagger===1&&b.state==='stagger');tick(1);ok('an earned opening returns to a readable guard',b.state==='reguard'&&b.protectedStagger===0);
  b=arena({state:'windup',pattern:'boxing',t:15});const heldHp=b.hp;b.hurt(5,1,false,false);ok('a frontal light meets a visible guard without cancelling the attack',b.hp===heldHp&&b.state==='windup'&&b.t===15&&b.guardFlash>0);b.hurt(10,1,true,false);ok('a guarded heavy wears the shared guard and retains the contact clock',b.hp===heldHp-2&&b.guard===2.65&&b.t===15&&b.state==='windup');
  b=arena({state:'boxing',pattern:'boxing',t:hook-1,guard:1});Object.assign(G.player,{state:'parry',guardWindow:20});debugPress('parry');tick(1);ok('the third successful answer breaks guard for the full ninety ticks',b.guard===0&&b.protectedStagger===90);tick(90);ok('broken guard restores only after the full punish',b.guard===3&&b.state==='reguard');
  b=arena({phaseTwo:true,state:'boxing',pattern:'boxing',t:0});const seen=[];
  for(let i=0;i<CLOSER_TIMING.phase2.boxing.end;i++){G.player.state='idle';G.player.invuln=0;G.player.z=0;const old=G.player.hp;tick(1);if(G.player.hp<old)seen.push([b.t,b.lastContact,old-G.player.hp]);}
  ok('second phase adds a body shot before the green cross',JSON.stringify(seen)===JSON.stringify([[8,'jab',5],[22,'body',6],[cross,'cross',14]])&&b.state==='recover'&&b.recovery===48);
  b=arena({phaseTwo:true,state:'boxing',pattern:'boxing',t:cross-1});Object.assign(G.player,{state:'parry',guardWindow:20});debugPress('parry');tick(1);ok('the second-phase cross preserves the same parry answer',b.protectedStagger===45&&G.player.lastDefense==='parry');
  b=arena({state:'recover',pattern:'boxing',t:17,recovery:54});for(let i=0;i<20;i++){b.hurt(1,1,false,false);tick(1);}ok('light attacks do not reset the authored recovery clock',b.state==='recover'&&b.t===37&&b.hp===b.maxhp-20);
  b=arena({state:'idle',atkCd:1,turn:2});tick(1);ok('phone choice visibly walks out to throwing distance',b.state==='setup-handset');for(let i=0;i<120&&b.state==='setup-handset';i++)tick(1);
  ok('phone preparation reaches a useful distance before committing',b.state==='windup'&&b.pattern==='handset'&&Math.abs(b.x-G.player.x)>=120);
  b=arena({state:'handset',pattern:'handset',t:11});tick(1);const s=G.shots[0];ok('handset releases once with the actual boss as reflection source',G.shots.length===1&&s.kind==='handset'&&s.source===b&&s.parryClass==='reflect');tick(21);ok('the followthrough keeps an empty hand before reload',G.shots.length===1&&b.state==='handset'&&getCloserBeat(b).part==='reload');tick(1);ok('a thrown phone leaves a long planted punish window',b.state==='recover'&&b.recovery===66);
  const k2=CLOSER_TIMING.phase2.handset;b=arena({phaseTwo:true,state:'handset',pattern:'handset',t:0});G.player.invuln=999;tick(k2.end);ok('second phase throws two handsets in one string',G.shots.filter(x=>x.kind==='handset').length===2&&b.state==='recover');
  b=arena({state:'recover',pattern:'handset'});G.shots=[{kind:'handset',x:b.x-21,y:b.y,z:0,vx:4.2,vz:0,dmg:13,t:0,life:100,source:b,reflected:true}];updateShots();ok('a returned phone damages health and one guard with a protected opening',b.hp===b.maxhp-20&&b.guard===2&&b.protectedStagger===45&&!G.shots.length);
  const D1=CLOSER_TIMING.phase1.deal;
  b=arena({state:'windup',pattern:'deal',t:1});ok('first-phase offered handshake has the shared red tell',closerCueClass(b)==='unblockable');
  ok('the room contains no vault attack fixture',!b.vault&&b.fightProps.every(p=>p.role!=='vault'));
  b=arena({state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});G.player.x=6080;Object.assign(G.player,{state:'parry',guardWindow:20});debugPress('parry');tick(1);ok('guard cannot stop the first-phase grab',b.state==='dealhold'&&G.player.grabbedBy===b);
  tick(D1.headbutt+5);ok('first phase has one shove, without collar squeezes',G.player.hp===91&&G.player.state==='down'&&G.player.grabbedBy===null);
  b=arena({state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});G.player.x=6080;tick(1);tick(7);G.player.mash=6;tick(1);ok('the first grip can be escaped before its shove',G.player.hp===100&&G.player.grabbedBy===null&&b.state==='recover');
  b=arena({state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});Object.assign(G.player,{x:6080,y:244});tick(D1.lunge+1);ok('first-phase lane evasion earns a long stumble opening',b.state==='stumble'&&G.player.hp===100);const whiffHp=b.hp;b.hurt(10,1,true,false);ok('a whiffed first-phase hand is punishable',b.hp===whiffHp-10);
  b=arena({state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});Object.assign(G.player,{x:6080,z:24});tick(D1.lunge+1);ok('jumping clears the first-phase offered hand',b.state==='stumble'&&G.player.grabbedBy!==b);
  b=arena({state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});Object.assign(G.player,{x:6080,invuln:20});tick(2);ok('the grab respects player invulnerability',G.player.grabbedBy!==b&&G.player.hp===100);
  b=arena({state:'call',pattern:'call',t:3});G.enemies=[{x:6100,y:226,atkCd:100,dead:false,state:'idle'}];b.hurt(2,1,false,false);tick(25);ok('interrupting his order prevents an ally attack and never spawns staff',b.calls===0&&G.enemies.length===1&&G.enemies[0].atkCd===100&&b.protectedStagger>0);
  b=arena({state:'idle',atkCd:1,turn:4,calls:2});G.enemies=[{x:6100,y:226,atkCd:100,dead:false,state:'idle'}];tick(1);ok('completed sales calls have a finite budget',b.pattern==='boxing'&&b.calls===2&&G.enemies.length===1);
  // The handshake: red, a lunge into a collar grab, squeezes, a headbutt; mash out, leave the lane or jump.
  const D=CLOSER_TIMING.phase2.deal;
  b=arena({phaseTwo:true,state:'windup',pattern:'deal',t:1});ok('the handshake is red from its offered hand',closerCueClass(b)==='unblockable');
  b=arena({phaseTwo:true,state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});G.player.x=6080;Object.assign(G.player,{state:'parry',guardWindow:20});debugPress('parry');tick(1);ok('guard cannot answer the lunge: it grabs the collar',b.state==='dealhold'&&G.player.state==='held'&&G.player.grabbedBy===b);
  tick(D.squeeze[0]);ok('the first squeeze hurts',G.player.hp===100-D.damage.squeeze);tick(D.headbutt-D.squeeze[0]);ok('the headbutt lands with CHAD still in his grip',G.player.grabbedBy===b&&G.player.state==='held');tick(5);ok('a held fighter takes the headbutt and is floored',G.player.state==='down'&&G.player.grabbedBy===null&&G.player.hp===100-D.damage.squeeze*2-D.damage.headbutt);
  tick(D.end-D.headbutt-5);ok('the handshake ends in a recovery',b.state==='recover');
  b=arena({phaseTwo:true,state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});G.player.x=6080;tick(1);tick(D.squeeze[0]+1);G.player.mash=6;tick(1);ok('mashing after the first squeeze breaks the grip before the headbutt',G.player.grabbedBy===null&&G.player.state==='idle'&&b.state==='recover'&&G.player.hp===100-D.damage.squeeze);
  b=arena({phaseTwo:true,state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});G.player.x=6136;tick(1);{const x0=G.player.x;tick(1);const x1=G.player.x;tick(10);ok('hugging him does not dodge the handshake: he grabs and eases CHAD to arm\'s length',b.state==='dealhold'&&Math.abs(x1-x0)<8&&Math.abs(G.player.x-(b.x-D.arms))<1,{x0,x1,x:G.player.x,bx:b.x});}
  b=arena({phaseTwo:true,state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});Object.assign(G.player,{x:6080,y:244});tick(D.lunge+1);ok('leaving his lane makes him whiff into a stumble',b.state==='stumble'&&G.player.state==='idle');
  const sb=b.hp;b.hurt(10,1,true,false);ok('the stumble is wide open',b.hp===sb-10);
  b=arena({phaseTwo:true,state:'deal',pattern:'deal',t:0,x:6150,attackLane:226});Object.assign(G.player,{x:6080,z:24});tick(D.lunge+1);ok('jumping clears the handshake',b.state==='stumble'&&G.player.grabbedBy!==b);
  b=arena({protectedStagger:45});b.hurt(360,1,true,false);tick(45);ok('half-health escalation respects every earned protected tick',b.phasePending&&!b.phaseTwo&&b.fightProps.every(p=>!p.broken));tick(1);ok('half-health starts a visible gloves-off phase break',b.phaseTwo&&b.state==='phase-break'&&b.fightProps.every(p=>!p.broken)&&b.set._aiKey==='ic_closer');tick(12);b.parried(0,1);tick(45);ok('a protected hit pauses and resumes the physical phase break',b.phaseBreakActive&&b.state==='phase-break'&&b.t===12);
  tick(PB.impact-12);ok('the jacket rips at the impact beat: the damaged family takes over',b.set._aiKey==='ic_closer_damaged'&&b.flung.length>=5);
  const score=G.score,drops=G.pickups.length;tick(PB.end-PB.impact);ok('phase break finishes without breaking furniture, drops or score',!b.phaseBreakActive&&b.state==='reguard'&&b.fightProps.every(p=>!p.broken)&&G.pickups.length===drops&&G.score===score&&b.flung.some(f=>f.key==='cl_shades')&&b.flung.some(f=>f.key==='cl_sleeve'));
  b=arena();G.meter=100;ok('the Closer still uses shared single-target super ownership',startSuper(G.player)&&G.player.specialTarget===b&&b.superLocked);const superHp=b.hp;for(let i=0;i<101;i++){G.time++;updatePlayer(G.player);updateBoss();}ok('guarded super deals its full authored damage then opens the guard',b.hp===superHp-18&&!b.superLocked&&b.protectedStagger>0);
  b=arena({protectedStagger:45,state:'stagger'});G.meter=100;startSuper(G.player);const openedHp=b.hp;for(let i=0;i<101;i++){G.time++;updatePlayer(G.player);updateBoss();}ok('super in an earned opening keeps its full damage and protection',b.hp===openedHp-36&&!b.superLocked&&b.protectedStagger>0);
  b=arena({state:'recover',pattern:'boxing',guard:0});finishes=0;b.hurt(9999,1,true,true);b.hurt(9999,1,true,true);ok('600-health Closer finishes exactly once through the stage-owned handoff',b.maxhp===600&&b.dead&&b.finishStarted&&finishes===1);
  b=arena({state:'boxing',pattern:'boxing',t:25});const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const before=JSON.stringify([b.x,b.y,b.t,b.turn,b.hp,sounds.length,G.effects.length]);for(let i=0;i<10;i++)drawBoss(canvas.getContext('2d'),G.camX);ok('missing boss art draws safely without advancing contacts, sounds or effects',before===JSON.stringify([b.x,b.y,b.t,b.turn,b.hp,sounds.length,G.effects.length]));
  const trace=random=>{const old=Math.random;Math.random=random;try{b=arena({atkCd:1});G.player.invuln=999;const rows=[];for(let i=0;i<1800;i++){G.player.state='idle';tick(1);if(i%12===0)rows.push([b.state,b.pattern,b.t,b.turn,b.x.toFixed(2),b.y.toFixed(2),b.guard,b.fightProps.find(p=>p.role==='desk').broken]);}return JSON.stringify(rows);}finally{Math.random=old;}};
  ok('pattern choices and preparation ignore combat randomness',trace(()=>.01)===trace(()=>.99));
  return out;
 });console.log(JSON.stringify({checks:checks.length,failures:checks.filter(x=>!x[1]),errors}));assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
