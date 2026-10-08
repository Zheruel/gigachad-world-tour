// Dirty Delhi families: one job and one answer each, deterministic, plus the boss and wave rule changes.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out=await page.evaluate(async()=>{
  const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  const {updateEnemies,FAMILY_MOVES}=await import('./js/enemies.js'),{updateBoss}=await import('./js/bosses.js'),{updateShots}=await import('./js/shots.js');
  const {createProp}=await import('./js/props.js'),{diff}=await import('./js/engine.js'),env=await import('./js/india_environment.js');
  const {CREW_TOTAL,GLASS}=await import('./js/delhi_dredger.js');
  const arena=(scene='market')=>{g.indiaScene('delhi',scene,0);g.resetInput();Object.assign(G,{enemies:[],shots:[],effects:[],pickups:[],props:[],zones:[],boss:null,hitstop:0,swingAt:-99,locked:true,camLock:G.camX,waveActive:false,spawnQueue:[]});Object.assign(G.player,{x:G.camX+150,y:229,z:0,face:1,state:'idle',invuln:0,hp:G.player.maxhp,dying:false,guardWindow:0,grabbedBy:null,mash:0});return G.player;};
  const tick=(n=1)=>{for(let i=0;i<n;i++){G.time++;updateEnemies();updateShots();}};
  const until=(f,n=600)=>{for(let i=0;i<n;i++){if(f())return true;G.player.invuln=999;tick();}return f();};
  const duel=(kind,dx=40)=>{const e=g.spawn(kind,dx,0);e.state='idle';e.atkCd=1;return e;};
  const classes=(kind,dx,prep)=>{arena();const e=duel(kind,dx);prep?.(e);until(()=>e.state==='windup');return [e.move,e.cls,e];};
  // Attack classes: plain openers (guard or deflect), green parries, reflected throws, red commitments.
  let [m,c,e]=classes('ic_brawler');ok('tout opens plain',m==='string'&&c==='plain');until(()=>e.state==='attack'&&e.t===6);ok('tout shove is green',e.cls==='counter');
  [m,c]=classes('ic_runner',70);ok('snatcher flying kick is green',m==='kick'&&c==='counter');
  [m,c]=classes('ic_enforcer',50);ok('cricketer cover drive is green',m==='drive'&&c==='counter');
  [m,c]=classes('ic_enforcer',150);ok('standing off draws the red slam',m==='slam'&&c==='unblockable');
  [m,c]=classes('ic_enforcer',50,e=>e.swings=2);ok('every third ball is the slam',m==='slam'&&c==='unblockable');
  [m,c]=classes('ic_heavy',90);ok('thela cart ram is red',m==='cram'&&c==='unblockable');
  [m,c]=classes('ic_kitchen',100);ok('cook steam jet is red',m==='jet'&&c==='unblockable');
  [m,c]=classes('ic_kitchen',30);ok('cook ladle up close is green',m==='ladle'&&c==='counter');
  [m,c]=classes('ic_docker',120);ok('crew wrench throw reflects',m==='toss'&&c==='reflect');
  [m,c]=classes('ic_docker',40);ok('crew wrench swing is green',m==='wrench'&&c==='counter');
  ok('move table covers every family move',['string','backgrab','kick','drive','slam','cram','shove','barge','jet','ladle','toss','wrench'].every(k=>FAMILY_MOVES[k]));
  // Plain hits are deflected by a timed parry: no damage, the tout recoils before his green shove, no riposte.
  let p=arena();e=duel('ic_brawler',30);Object.assign(e,{state:'attack',move:'string',cls:'plain',t:4,face:-1,x:p.x+30,y:p.y});Object.assign(p,{guardWindow:20,counterT:0});let hp=p.hp;tick();ok('plain slap is deflected by a timed parry',p.hp===hp&&p.lastDefense==='deflect'&&!(p.counterT>0)&&e.state==='hurt');
  // Tout: CHAD swinging at somebody else with his back to him earns a short red hold.
  p=arena();e=duel('ic_brawler',-30);e.atkCd=999;p.state='attack';tick();ok('back turned mid-swing draws the red back-grab',e.state==='windup'&&e.move==='backgrab'&&e.cls==='unblockable');
  for(let i=0;i<30&&e.state!=='grabhold';i++){p.state=p.grabbedBy?p.state:'attack';tick();}ok('back-grab holds CHAD',e.state==='grabhold'&&p.grabbedBy===e);
  hp=p.hp;for(let i=0;i<62&&p.grabbedBy;i++)tick();ok('hold lasts 60 frames for three 4-damage bites',!p.grabbedBy&&hp-p.hp===3*Math.round(4*diff().dmg));
  p=arena();e=duel('ic_brawler',-30);e.atkCd=999;p.state='attack';for(let i=0;i<30&&e.state!=='grabhold';i++){if(!p.grabbedBy)p.state='attack';tick();}p.mash=5;tick();ok('mashing out frees CHAD',!p.grabbedBy);
  p=arena();e=duel('ic_brawler',30);e.atkCd=999;p.state='attack';tick();ok('no grab while facing him',e.state!=='windup');
  // Snatcher: a landed kick steals fifteen meter; a knockdown returns it; escaping loses it.
  p=arena();G.meter=50;e=duel('ic_runner',40);Object.assign(e,{state:'attack',move:'kick',cls:'counter',t:2,face:-1,vx:-6,atkCd:999});hp=p.hp;for(let i=0;i<20&&!e.chain;i++)tick();
  let m0=G.meter;ok('landed kick snatches 15 meter',e.chain===15&&m0<=38&&p.hp<hp);until(()=>e.state==='flee',120);ok('snatcher runs with the chain',e.state==='flee');
  m0=G.meter;e.hurt(4,1,true,false);ok('knockdown returns the chain',!e.chain&&G.meter===m0+15);
  p=arena();G.meter=50;G.waveActive=true;e=duel('ic_runner',40);Object.assign(e,{state:'attack',move:'kick',cls:'counter',t:2,face:-1,vx:-6});for(let i=0;i<20&&!e.chain;i++)tick();
  m0=G.meter;until(()=>!G.enemies.includes(e),400);ok('escape keeps the meter and he re-enters empty-handed',!G.enemies.includes(e)&&G.meter===m0&&m0<=38&&G.spawnQueue.includes('ic_runner'));G.waveActive=false;
  p=arena();G.meter=50;e=duel('ic_runner',40);Object.assign(e,{state:'attack',move:'kick',cls:'counter',t:2,face:-1,vx:-6});p.guardWindow=20;for(let i=0;i<20;i++)tick();ok('a parried kick steals nothing',!e.chain&&G.meter>=50&&p.lastDefense==='parry');
  p=arena();e=duel('ic_runner',60);e.atkCd=999;hp=e.hp;e.hurt(5,1,false,false);ok('snatcher backhops an idle opener',e.state==='dodge'&&e.hp===hp&&e.dodgeCd===240);
  ok('snatcher and cook can be grabbed',g.spawn('ic_runner',80,0).canGrab&&g.spawn('ic_kitchen',100,0).canGrab);
  // An opposite-foot stop changes stance in place, then resumes a full attack tell.
  const stanceTout=()=>{const p=arena(),e=duel('ic_brawler',40);Object.assign(e,{state:'approach',atkCd:0,walking:true,walkPos:.05,gCell:0,gCellN:2,face:-1,range:42});until(()=>e.stanceAt!=null,12);return e;};
  e=stanceTout();const stanceX=e.x,stanceY=e.y;tick(9);
  ok('the guard exchange holds the root and windup clock',e.stanceAt!=null&&e.x===stanceX&&e.y===stanceY&&e.t===0);
  tick();ok('the guard exchange finishes and resumes the attack',e.stanceAt==null&&e.t===1&&until(()=>e.state==='attack',45));
  e=stanceTout();e.hurt(1,1,false,false);tick();ok('a hit interrupts the guard exchange immediately',e.stanceAt==null&&e.state==='hurt');
  // Cricketer: the slam cracks down his lane, then the bat sticks: 45 frames, +50% damage, light hits hold him.
  p=arena();e=duel('ic_enforcer',150);until(()=>e.state==='attack'&&e.t>=8);ok('slam sends a crack along the lane',G.shots.some(s=>s.kind==='crack'&&s.parryClass==='unblockable'));
  until(()=>e.state==='stuck',20);hp=e.hp;e.hurt(10,1,false,false);ok('stuck bat takes +50% and holds him',e.state==='stuck'&&hp-e.hp===15);
  let stuckFor=0;while(e.state==='stuck'&&stuckFor<80){tick();stuckFor++;}ok('the bat sticks for 45 frames',stuckFor>=40&&stuckFor<=46);
  p=arena();e=duel('ic_enforcer',60);e.atkCd=999;Object.assign(e,{state:'attack',move:'slam',cls:'unblockable',t:7,face:-1});p.y+=20;p.invuln=0;hp=p.hp;for(let i=0;i<30;i++)tick();ok('sidestepping the slam and crack avoids both',p.hp===hp);
  // Thela: the cart rides his front, only front heavies or a body break it, then he roars and fights bare-handed.
  p=arena();e=duel('ic_heavy',120);e.atkCd=999;e.x+=60;tick(20);ok('cart rides his front',!e.rig.hidden&&Math.abs(e.rig.x-(e.x+e.face*66))<1&&Math.abs(e.rig.y-(e.y-2))<1);
  ok('no stale cart hitbox',G.props.filter(q=>q.prop==='ic_thela').length===1);
  // The loaded gait must retreat to a reachable contact before committing at the cart's separation boundary.
  for(const side of [-1,1]){
   p=arena();e=duel('ic_heavy',side*76.3);
   const w=e.walkBeat.slice(0,11).reduce((a,b)=>a+b,0)+e.walkBeat[11]/2;
   Object.assign(e,{state:'approach',t:0,atkCd:0,walking:true,walkPos:w,gCell:11,gCellN:3,face:-side,range:166});
   const reached=until(()=>e.state==='windup',200),wx=e.x,wy=e.y;
   tick(10);ok(`loaded porter plants and holds his tell from side ${side}`,reached&&Math.abs(wx-p.x)>=76&&e.x===wx&&e.y===wy&&e.state==='windup');
  }
  for(const side of [-1,1]){
   p=arena();p.x=G.camX+(side<0?90:390);e=duel('ic_heavy',side*75);
   Object.assign(e,{state:'approach',t:0,atkCd:0,walking:true,walkPos:e.walkBeat.slice(0,11).reduce((a,b)=>a+b,0)+e.walkBeat[11]/2,gCell:11,gCellN:3,face:-side,y:p.y,range:166});
   e.rig.x=e.x+e.face*66;e.rig.y=e.y-2;const cart=e.rig,cx=cart.x,cy=cart.y;
   const parked=until(()=>e.cartReleased,180),attacks=until(()=>e.state==='attack',400);
   ok(`wall-pinned porter leaves an intact cart and fights from side ${side}`,parked&&attacks&&!cart.broken&&cart.x===cx&&cart.y===cy&&e.move!=='cram');
  }
  p=arena();e=duel('ic_heavy',120);e.atkCd=999;
  e.face=-1;p.x=e.x+60;e.rig.hurt(9,1,true);e.rig.hurt(9,1,true);e.rig.hurt(9,1,true);ok('hits from behind never reach the cart',!e.rig.broken&&!e.cartHits);
  p.x=e.x-60;e.rig.hurt(9,-1,false);e.rig.hurt(9,-1,true);e.rig.hurt(9,-1,true);ok('a light and two front heavies leave the cart',!e.rig.broken);
  e.rig.hurt(9,-1,true);ok('third front heavy spills produce',e.rig.broken&&e.cartBroken&&G.pickups.some(q=>q.kind==='plate'&&q.heal===15));
  until(()=>e.state==='rage',10);ok('cartless thela roars first',e.state==='rage');e.hurt(3,1,false,false);ok('the roar is interruptible',e.state!=='rage');
  e.state='idle';e.atkCd=1;until(()=>e.state==='windup');ok('bare-handed shove is green',e.move==='shove'&&e.cls==='counter');
  arena();e=duel('ic_heavy',120);e.rig.hurt(20,1,true,false,true);ok('a thrown body breaks the cart',e.rig.broken&&e.cartBroken);
  p=arena();e=duel('ic_heavy',120);e.atkCd=999;const dropped=e.rig,cartX=dropped.x,cartY=dropped.y;e.hurt(4,1,true,false);
  ok('a knockdown releases the intact cart',e.cartReleased&&!dropped.broken&&e.range===44&&e.poise===0);
  until(()=>!['down','getup'].includes(e.state),240);tick(90);
  ok('the released cart stays behind through recovery and combat',dropped.x===cartX&&dropped.y===cartY&&e.move!=='cram');
  const drops=G.pickups.length;dropped.hurt(dropped.hp,1,false,false);
  ok('the released cart breaks normally and still drops produce',dropped.broken&&G.pickups.length===drops+1&&G.pickups.at(-1).kind==='plate');
  p=arena();e=duel('ic_heavy',120);e.atkCd=999;tick(20);
  const parked=e.rig,parkX=parked.x,parkY=parked.y,parkFace=parked.face;
  p.x=e.x-e.face*100;tick();
  ok('flanking the handles releases the cart before he turns',e.cartReleased&&e.face!==parkFace&&e.range===44&&!parked.broken);
  tick(60);ok('turning leaves the cart parked with its old orientation',parked.x===parkX&&parked.y===parkY&&parked.face===parkFace);
  p=arena();e=duel('ic_heavy',100);e.atkCd=999;const stall=createProp('ic_stall',e.x-130,e.y);G.props.push(stall);p.y+=20;Object.assign(e,{state:'windup',t:0,move:'cram',cls:'unblockable',wind:34,face:-1});
  until(()=>e.state==='stuck',160);ok('ramming a stall jams him',e.state==='stuck'&&stall.hp<stall.maxhp);e.hurt(4,1,false,false);ok('jammed thela holds through light hits',e.state==='stuck');
  p=arena();e=duel('ic_heavy',220);e.atkCd=999;const ally=duel('ic_brawler',90);Object.assign(e,{state:'windup',t:0,move:'cram',cls:'unblockable',wind:34,face:-1});p.y+=20;const ahp=ally.hp;
  for(let i=0;i<120&&['windup','attack'].includes(e.state);i++){Object.assign(ally,{atkCd:999,y:e.y});tick();}ok('his cart ram flattens his own side',ally.hp<ahp);
  // Dhaba cook: one red jet worth ten, a sealed-lid punish window, and a telegraphed death vent.
  p=arena();e=duel('ic_kitchen',80);Object.assign(e,{state:'attack',move:'jet',cls:'unblockable',t:0,face:-1,atkCd:999});p.invuln=0;hp=p.hp;tick(30);
  ok('steam jet is a single hit of ten',hp-p.hp===Math.round(10*diff().dmg)&&e.state==='reseal');let reseal=e.t;while(e.state==='reseal'&&reseal<80){tick();reseal++;}ok('reseal is a 50-frame opening',reseal>=48&&reseal<=52);
  p=arena();e=duel('ic_kitchen',30);const nb=duel('ic_brawler',60);nb.atkCd=999;e.atkCd=999;e.hurt(999,0,true,false);ok('death vent is telegraphed, not instant',e.dead&&e.ventT===30&&nb.hp===nb.maxhp);
  const php=p.hp;p.invuln=0;tick(29);ok('ring holds for thirty frames',nb.hp===nb.maxhp);tick(2);ok('vent bursts on neighbours and CHAD',nb.hp<nb.maxhp&&p.hp<php);
  // Dock crew retain reflectable wrenches; river cargo stays an ordinary breakable.
  p=arena();e=duel('ic_docker',120);until(()=>e.state==='attack'&&e.t>=8);const w=G.shots.find(s=>s.kind==='wrench');ok('thrown wrench is a reflectable bowler',w&&w.bowl&&w.source===e&&w.parryClass==='reflect');
  g.indiaScene('delhi','ghat',0);Object.assign(G,{enemies:[],shots:[],effects:[],pickups:[],boss:null,hitstop:0,locked:true,camLock:G.camX,waveActive:false});env.initIndiaEnvironment();for(const n of G.india.environment.nodes)n.demoDone=true;
  const cargo=G.props.find(q=>q.prop==='ic_cargo'&&q.x===4300);Object.assign(G.player,{x:4330,y:cargo.y,invuln:999,state:'idle'});e=g.spawn('ic_docker',4262-G.player.x,0);e.state='idle';e.atkCd=300;
  const x0=cargo.x;let lever=false;for(let i=0;i<140;i++){G.time++;updateEnemies();env.updateIndiaEnvironment();lever||=e.state==='lever';}
  ok('river cargo stays fixed beside dock crew',!lever&&!G.india.environment.events.some(v=>v.event==='chock')&&cargo.x===x0);
  const pickups=G.pickups.length;cargo.hurt(cargo.hp,1);ok('fixed cargo still breaks and drops its lassi',cargo.broken&&G.pickups.length===pickups+1&&G.pickups.at(-1).kind==='shake');
  // Determinism: no dice in any family decision - two different RNGs play out identically.
  const trace=rnd=>{const r0=Math.random;Math.random=rnd;const rows=[];try{
   for(const kind of ['ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker']){
    const p=arena();G.meter=40;G.time=1000;const e=g.spawn(kind,120,0),b=g.spawn('ic_brawler',-90,6);
    for(let i=0;i<900;i++){p.invuln=i%200<150?999:0;if(i%40<12){p.state='attack';p.combo=(i>>4)%4;}else p.state='idle';tick();if(i%15===0)rows.push([kind,e.state,e.move,Math.round(e.x*10),Math.round(e.y*10),b.state,Math.round(b.x*10),Math.round(b.y*10)].join());}
   }}finally{Math.random=r0;}return rows.join('|');};
  ok('family decisions ignore Math.random',trace(()=>.02)===trace(()=>.97));
  // Bosses: no dice knockdowns; the Vendor's quick swings are plain; the Dredger's glass, crew and Thekedar.
  g.indiaScene('refund','closer',0);let b=G.boss;const r0=Math.random;Math.random=()=>0;let downs=0;for(let i=0;i<8;i++){Object.assign(b,{state:'idle',protectedStagger:0,hp:b.maxhp,guard:0});b.hurt(3,1,true,false);if(b.state==='down')downs++;}Math.random=r0;ok('no random heavy knockdown for any boss',downs===0);
  g.indiaScene('delhi','vendor',0);G.state='play';b=G.boss;p=G.player;Object.assign(b,{state:'string',pattern:'string',t:3,face:-1,x:p.x+60,y:p.y,protectedStagger:0});Object.assign(p,{invuln:0,guardWindow:20,state:'idle'});hp=p.hp;G.time++;updateBoss();
  ok('vendor quick swing deflects but his string swings on',p.hp===hp&&p.lastDefense==='deflect'&&b.state==='string'&&!(b.protectedStagger>0));
  g.indiaScene('delhi','vendor',0);G.state='play';b=G.boss;p=G.player;Object.assign(b,{state:'string',pattern:'string',t:55,face:-1,x:p.x+70,y:p.y,protectedStagger:0});Object.assign(p,{invuln:0,guardWindow:20,state:'idle'});G.time++;updateBoss();
  ok('vendor overhead is the parry',p.lastDefense==='parry'&&b.openKind==='stuck');
  g.indiaScene('delhi','dredger',0);G.state='play';b=G.boss;ok('cab glass takes six',b.glass===GLASS&&GLASS===6);
  const D=()=>{g.indiaScene('delhi','dredger',0);G.state='play';G.enemies=[];return G.boss;};
  b=D();for(let i=0;i<8;i++){G.enemies=[];b.crewCd=0;G.time++;updateBoss();}ok('machine reinforcements hold two back',b.crewSpawned===CREW_TOTAL-2);
  b.delhi.operatorPhase(b);G.enemies=[];Object.assign(b,{state:'idle',atkCd:1,hp:Math.floor(b.maxhp*.4)});for(let i=0;i<14;i++){G.time++;updateBoss();}
  ok('crewcall brings two: six crew in all',b.crewCalled&&b.crewSpawned===6&&G.enemies.filter(e=>e.trainType==='ic_docker').length===2);
  b=D();b.delhi.operatorPhase(b);G.enemies=[];p=G.player;Object.assign(b,{x:p.x+40,y:p.y,face:-1,atkCd:999,state:'idle'});let run=0,maxRun=0,backstep=false;
  for(let i=0;i<120;i++){if(i%4===0&&!b.dead)b.hurt(2,b.face,false,false);G.time++;updateBoss();run=b.state==='hurt'?run+1:0;maxRun=Math.max(maxRun,run);backstep||=b.state==='backstep';b.atkCd=999;}
  ok('Thekedar cannot be stun-locked',maxRun<=17&&backstep);
  b=D();b.delhi.operatorPhase(b);G.enemies=[];Object.assign(b,{x:G.player.x+40,y:G.player.y,face:-1,atkCd:999,state:'idle'});b.hurt(10,b.face,true,false);ok('no knockdown outside an opening',b.state!=='down');
  Object.assign(b,{state:'wrench',pattern:'wrenchcombo',t:34,protectedStagger:0});b.parried(0,1);b.hurt(10,1,true,false);ok('a heavy in the STUCK opening floors him',b.state==='down'&&!b.protectedStagger);
  let rose=false;for(let i=0;i<90;i++){G.time++;updateBoss();rose||=b.state==='getup';}ok('he rises through his getup',rose&&b.state!=='down');
  // Waves: real counts, a culvert introduction, heals before both bosses, lane-slot spawns.
  const st=g.STAGES.find(s=>s.id==='delhi'),all=st.waves.flatMap(w=>[...(w.spawns||[]),...(w.reserves||[]).flat()]);
  ok('forty-nine authored fighters',all.length===49);
  ok('culvert introduces one dock worker among familiar brawlers',st.waves.some(w=>w.x===3650&&w.spawns.filter(k=>k==='ic_docker').length===1&&w.spawns.filter(k=>k==='ic_brawler').length===2));
  const fights=st.waves.filter(w=>w.spawns?.length);
  ok('eleven compact introductions and mixed fights',fights.length===11&&fights.every(w=>w.spawns.length<=3&&w.visibleCap<=4));
  ok('reserve groups keep one cart and one ranged specialist',fights.every(w=>[w.spawns,...(w.reserves||[])].every(group=>group.filter(k=>k==='ic_heavy').length<=1&&group.filter(k=>['ic_kitchen','ic_docker'].includes(k)).length<=1)));
  ok('recovery lands after the market finale and the last river fight',['1430','2390','4930','5480'].every(x=>st.waves.find(w=>w.x===+x).recovery)&&st.waves.filter(w=>w.recovery).length===4);
  ok('no cook on the river',st.waves.filter(w=>w.x>3000).every(w=>![...(w.spawns||[]),...(w.reserves||[]).flat()].includes('ic_kitchen')));
  const lanes=rnd=>{const r0=Math.random;Math.random=rnd;const ys=[];try{g.indiaScene('delhi','market',0);Object.assign(G,{waveIndex:-1,enemies:[],spawnQueue:[]});st.waves.forEach(w=>w.done=false);G.player.x=360;G.player.invuln=1e4;
   for(let i=0;i<200&&ys.length<3;i++){g.step(1);for(const e of G.enemies)if(!ys.some(y=>y[0]===e))ys.push([e,e.y]);}}finally{Math.random=r0;}return ys.map(y=>y[1].toFixed(2)).join();};
  ok('spawn depths come from lane slots',lanes(()=>.03)===lanes(()=>.96));
  // Smoke: every family survives a scripted minute against an invulnerable CHAD without errors.
  for(const kind of ['ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker']){
   const p=arena();G.meter=30;const e=g.spawn(kind,120,0);const seen=new Set();
   for(let i=0;i<3600;i++){p.invuln=999;if(i%40<12){p.state='attack';p.combo=(i>>4)%4;}else p.state='idle';tick();seen.add(e.state);if(i%10===0)g.render();}
   ok(`${kind} cycles through attacks`,seen.has('attack'));
  }
  return out;
 });
 // Review Studio: each Delhi 1v1 and set piece loads, replays deterministically from its seed, and is captured.
 const fs=require('node:fs'),dir='tmp/review/delhi-duels';fs.mkdirSync(dir,{recursive:true});
 const studio=await browser.newPage({viewport:{width:1600,height:1050}});studio.on('pageerror',e=>errors.push(e.message));
 await studio.goto((process.env.GAME_URL||'http://localhost:8011')+'/review.html');await studio.waitForFunction(()=>window.__review?.listScenarios,{timeout:90000});
 const ids=(await studio.evaluate(()=>__review.listScenarios())).map(s=>s.id),duels=ids.filter(id=>id.startsWith('delhi/duel-')),sets=['delhi/cart-ram-stall','delhi/cook-boiler','delhi/crew-chock'];
 out.push(['six Delhi 1v1 scenarios',duels.length===6],['three Delhi set pieces',sets.every(id=>ids.includes(id))]);
 for(const id of [...duels,...sets]){
  const snap=async t=>{await studio.evaluate(async({id,t})=>{await __review.load(id);__review.pause();await __review.seek(t);},{id,t});return studio.evaluate(()=>__review.snapshot().engine);};
  const at=id.startsWith('delhi/duel-')?420:90,a=await snap(at),b2=await snap(at);
  out.push([`${id} loads a live enemy`,a.enemies.length>=1&&a.stage==='delhi'],[`${id} replays deterministically`,JSON.stringify(a)===JSON.stringify(b2)]);
  const frame=studio.frames().find(f=>f.url().includes('/tools/review/runtime.html'));await frame.locator('canvas').first().screenshot({path:`${dir}/${id.slice(6)}-${at}.png`});
 }
 console.log(JSON.stringify({checks:out.length,failures:out.filter(x=>!x[1]),errors}));
 assert(out.every(x=>x[1]),JSON.stringify(out.filter(x=>!x[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
