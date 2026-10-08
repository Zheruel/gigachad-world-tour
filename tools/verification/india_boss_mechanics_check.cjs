// Real browser modules, isolated encounter setup; no animation or damage mocks.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/__india_boss_check', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>India boss checks</title>' }));
    await page.goto((process.env.GAME_URL || 'http://localhost:8011') + '/__india_boss_check');
    const checks = await page.evaluate(async () => {
      const [{ G }, { createBoss, updateBoss, drawBoss }, { createPlayer, startSuper, updatePlayer }, { updateShots }, { debugPress, debugResetInput }] = await Promise.all([
        import('./js/engine.js'), import('./js/bosses.js'), import('./js/player.js'), import('./js/shots.js'), import('./js/input.js'),
      ]);
      const {OPERATOR_HEALTH,OPERATOR_FLOOR}=await import('./js/delhi_dredger.js');const {diff}=await import('./js/engine.js');
      const {VK,VENDOR_RAGE,VENDOR_LAST,VENDOR_FLING,VENDOR_WIND,VENDOR_BUMP,VENDOR_REACH,VENDOR_LANE_MAX,VENDOR_CHAD_MAX,VENDOR_BREATH_LANE,VENDOR_BELLY_CLEAR,VENDOR_CRUSH,stringBeats}=await import('./js/vendor_boss.js');const {laneMax}=await import('./js/engine.js');const {PROP_TYPES,createProp}=await import('./js/props.js');
      const results = [], ok = (name, value) => results.push([name, !!value]);
      let sounds = [], finishes = 0;
      G.audio = { sfx: n => sounds.push(n), roomSfx: n => sounds.push(n), voiceRandom: () => false };
      const reset = (key, cam = 0) => {
        debugResetInput(); G.state = 'play'; G.stage = { id: key === 'closer' ? 'refund' : 'delhi', lanes: [{ x0: 0, x1: 20000, top: 213, bot: 245 }] };
        G.camX = G.camLock = cam; G.arenaSqueeze = 0; G.enemies = []; G.props = []; G.shots = []; G.zones = []; G.effects = []; G.pickups = [];
        G.time = G.rawTime = 0; G.score = 0; G.meter = 0; G.hitstop = 0;
        G.player = createPlayer(); Object.assign(G.player, { x: cam + 90, y: 226, z: 0, state: 'idle', hp: 100, face: 1, invuln: 0 });
        G.india = { startCinematic: () => { finishes++; return true; } };
        return createBoss(key, cam + 345, 223);
      };
      const ticks = n => { for (let i = 0; i < n; i++) { G.time++; G.rawTime++; updateBoss(); } };
      // THE VENDOR: one answer per attack, three phases, and a kitchen that is only scenery.
      const V=(o={})=>{const b=reset('vendor',2670);Object.assign(b,{x:2670+250,y:226,face:-1,atkCd:999},o);Object.assign(G.player,{x:2670+180,y:226});return b;};
      let b = V();
      ok('vendor kitchen registers to the encounter camera',b.kadai.x===2670+VK.kadai[0]&&G.props.length===1&&b.fightProps.length===1&&!b.cart&&!b.cylinder&&b.phase===1);
      ok('the kadai is scenery, never a target',b.kadai.decor&&!PROP_TYPES.dv_cylinder&&!PROP_TYPES.dv_cart);
      b.hurt(4,1,false,false);
      ok('idle vendor guards a frontal jab',b.hp===b.maxhp&&b.guardFlash>0);
      b=V({state:'string',pattern:'string',t:40});b.parried(0,1);
      ok('parrying the overhead buries the skimmer: long stuck opening',b.openKind==='stuck'&&b.protectedStagger>=90&&b.state==='stagger');
      b=V({state:'string',pattern:'string',t:6});b.parried(0,1);
      ok('parrying a quick swing is an ordinary opening',b.openKind==='guard'&&b.protectedStagger>0&&b.protectedStagger<90);
      b=V({state:'string',pattern:'string',t:55});G.player.x=b.x-62;ticks(2);
      ok('the overhead slam reaches CHAD',G.player.hp<100);
      b=V({state:'recover',recovery:60});G.shots=[{kind:'naan',x:b.x-30,y:b.y,z:0,vx:3.4,vz:0,dmg:9,t:0,life:150,source:b,parryClass:'reflect',reflected:true}];
      for(let i=0;i<20&&G.shots.length;i++)updateShots();
      ok('a reflected naan blinds him',!G.shots.length&&b.openKind==='blind'&&b.protectedStagger>=100&&b.hp<b.maxhp);
      b=V({state:'recover',recovery:60});b.counterApplying=true;b.hurt(10,1,true,false);b.counterApplying=false;
      ok('an empowered hit is not a naan',b.openKind!=='blind');
      b=V({state:'dip',pattern:'scoop',t:10,face:1});b.hurt(4,1,false,false);
      ok('hitting him with his arm in the oil is a hot foot',b.openKind==='hotfoot'&&b.protectedStagger>=90);
      b=V({state:'fling',pattern:'scoop',t:VENDOR_FLING-1});G.player.x=b.x-120;G.shots=[];ticks(1);
      ok('the fling throws three oil globs at CHAD',G.shots.filter(s=>s.kind==='oil').length===3);
      const {SPICY_THROW}=await import('./js/vendor_spicy_throw.js');b=V({phase:2,phaseTwo:true,state:'fling',pattern:'scoop',t:SPICY_THROW.release-1});G.player.x=b.x-120;G.shots=[];ticks(1);
      ok('phase two hurls a fan of five',G.shots.filter(s=>s.kind==='oil').length===5);
      b=V({phase:3,phaseTwo:true,state:'fling',pattern:'scoop',t:VENDOR_FLING-1});G.player.x=b.x-120;G.shots=[];ticks(1);const volley1=G.shots.filter(s=>s.kind==='oil').length;ticks(22);
      ok('the last order flings two volleys',volley1===3&&G.shots.filter(s=>s.kind==='oil').length===6);
      // The naan was replaced by the oil scoop; an old naan state migrates to it.
      b=V({phase:3,phaseTwo:true,state:'naan',pattern:'naan',t:0});G.player.x=b.x-160;G.shots=[];ticks(1);
      ok('a legacy naan state migrates to a live attack (the scoop, or the last order breath)',['scoop','breath'].includes(b.pattern)&&!G.shots.some(s=>s.kind==='naan'));
      b=V();b.hp=Math.floor(b.maxhp*.7);b.state='idle';ticks(1);
      ok('above half health he stays calm',b.state!=='rage'&&b.phase===1);
      b=V();b.hp=Math.floor(b.maxhp*.5);b.state='idle';ticks(1);
      ok('half health: the chillies',b.state==='rage');
      const rageHp=b.hp;b.hurt(12,1,true,false);
      ok('the chug is armoured',b.hp===rageHp);
      ticks(VENDOR_RAGE);
      ok('phase two sets the kadai alight',b.phase===2&&b.phaseTwo&&b.kadai.hp===2&&b.state==='reguard');
      b=V({phase:2,phaseTwo:true});b.hp=1;b.state='idle';const shoveX=G.player.x=b.x-60;ticks(1);
      ok('phase two defeat: the knockdown fake-out',b.state==='fakeout');
      for(let i=0;i<180&&b.state==='setup-feast';i++)ticks(1);G.player.x=b.x-60;const mealShoveX=G.player.x;
      const lastHp=b.hp;b.hurt(12,1,true,false);G.player.z=30;for(let i=0;i<600&&b.phase!==3;i++)ticks(1);
      ok('the cauldron transition stays protected and a jump evades its one shockwave',b.hp===Math.round(b.maxhp*.55)&&G.player.hp===100&&!b.cauldronShot&&!b.kadai.bowlLifted);
      ok('phase three: renewed armor, the last order',b.phase===3&&b.lastOrder&&b.maxGuard===4&&b.state==='reguard');
      const k3=stringBeats({phase:3});
      b=V({phase:3,phaseTwo:true,state:'string',pattern:'string',t:k3.slam2-1});G.player.x=b.x-62;ticks(2);
      ok('the last order string brings the skimmer down twice',k3.slam2>k3.slam&&G.player.hp<100);
      b=V({phase:3,phaseTwo:true,state:'string',pattern:'string',t:k3.raise2+2});b.parried(0,1);
      ok('parrying the second overhead buries it too',b.openKind==='stuck'&&b.protectedStagger>=90);
      b=V({phaseTwo:true,state:'breath',pattern:'breath',t:0,lane:226});G.player.x=b.x-90;ticks(30);
      ok('fire breath burns down his lane',G.player.hp<100);
      // The street in front of him is shallow (it ends at VENDOR_CHAD_MAX): out of his lane is always one step up or down.
      b=V({phase:2,phaseTwo:true,y:222,state:'breath',pattern:'breath',t:0,lane:222});Object.assign(G.player,{x:b.x-90,y:VENDOR_CHAD_MAX});ticks(30);
      const missDown=G.player.hp===100&&b.lane===222;
      b=V({phase:2,phaseTwo:true,y:226,state:'breath',pattern:'breath',t:0,lane:226});Object.assign(G.player,{x:b.x-90,y:214});ticks(30);
      ok('off the lane the breath misses, down or up the street',missDown&&G.player.hp===100&&b.lane===226);
      ok('every lane he breathes down leaves CHAD a lane out of it',Array.from({length:VENDOR_LANE_MAX-213+1},(_,i)=>213+i).every(y=>y-VENDOR_BREATH_LANE>=213||y+VENDOR_BREATH_LANE<=VENDOR_CHAD_MAX));
      b=V({phase:3,phaseTwo:true,state:'breath',pattern:'breath',t:0,lane:226});Object.assign(G.player,{x:b.x-90,y:214,state:'jump',z:1});ticks(24);
      ok('the final breath stays committed and a jump clears every lane',b.lane===226&&G.player.hp===100);
      b=V({phaseTwo:true,state:'breath',pattern:'breath',t:23});ticks(2);
      ok('the breath ends in a coughing fit',b.state==='cough');
      b=V({phaseTwo:true,state:'flop',pattern:'flop',t:0,leapFrom:2670+250,leapFromY:226,leapTo:2670+180,leapY:226});ticks(40);
      ok('the belly flop crushes where CHAD stood',b.state==='flopped'&&G.player.hp<100);
      // A dodged last-order flop bounces into a second one at CHAD, never into the corner.
      b=V({phase:3,phaseTwo:true,state:'flop',pattern:'flop',t:0,flopChain:1,leapFrom:2670+250,leapFromY:226,leapTo:2670+180,leapY:226});Object.assign(G.player,{x:2670+330,y:230});ticks(40);
      Object.assign(G.player,{x:2670+330,y:230,state:'idle',hp:100,invuln:0,z:0});let second=0;
      for(let i=0;i<60&&!second;i++){ticks(1);if(b.state==='flop')second=b.leapTo;}
      ok('the last order bounces into a second flop at CHAD',second>2670+300&&b.flopChain===0);
      ticks(40);ticks(80);ok('after the double flop he lies winded longer',b.state==='flopped');
      // A flop that floors CHAD is never followed onto him: Pappu lies winded until CHAD has been up a while.
      b=V({phase:3,phaseTwo:true,state:'flop',pattern:'flop',t:0,flopChain:1,leapFrom:2670+250,leapFromY:226,leapTo:2670+180,leapY:226});ticks(40);
      const floored=G.player.state==='down';let chained=false;for(let i=0;i<60;i++){ticks(1);if(b.chainUp||b.state==='flop')chained=true;}
      ok('no second flop onto a floored CHAD',floored&&!chained&&b.flopChain===0&&b.state==='flopped');
      Object.assign(G.player,{state:'idle',invuln:0,z:0});ticks(30);const stillDown=b.state==='flopped';ticks(10);
      ok('he stays winded until CHAD is up, then rises',stillDown&&b.state==='flopup');
      b=V({phase:3,phaseTwo:true,state:'windup',pattern:'flop',t:VENDOR_WIND.flop[2]-1});Object.assign(G.player,{x:2670+20,y:236,state:'down'});ticks(1);
      ok('the flop lands clear of the wall and of a floored CHAD',b.leapTo>=2670+70&&Math.abs(b.leapTo-G.player.x)>=50);
      // Up close: the belly bump makes room, then the throw or flop he was saving follows.
      b=V({state:'idle',atkCd:1,turn:1,lastPick:'string'});Object.assign(G.player,{x:b.x-40,y:226});ticks(1);
      ok('a point-blank scoop becomes a belly bump with the scoop queued',b.state==='windup'&&b.pattern==='bump'&&b.queued==='scoop');
      b=V({state:'idle',atkCd:1,turn:0,lastPick:'string'});Object.assign(G.player,{x:b.x-50,y:226});ticks(1);
      ok('never two strings running',b.pattern!=='string');
      b=V({state:'windup',pattern:'bump',t:0,queued:'scoop'});Object.assign(G.player,{x:b.x-44,y:226,hp:100});const bx0=G.player.x;
      for(let i=0;i<60&&b.pattern!=='scoop';i++)ticks(1);
      ok('the bump shoves CHAD back and the scoop follows',G.player.hp<100&&G.player.hp>=92&&bx0-G.player.x>=30&&b.state==='setup-scoop'&&b.pattern==='scoop');
      b=V({state:'windup',pattern:'bump',t:VENDOR_WIND.bump[0]+VENDOR_BUMP.hit-2,queued:'naan'});Object.assign(G.player,{x:b.x-44,y:226});ticks(1);b.parried(0,1);
      ok('a parried bump is an opening, not a shove',b.state==='stagger'&&!b.shove);
      // Phases: no punish combo carries him past a change; turtling in the lunch rush meets the crush bump; bodies never merge.
      {const {VENDOR_TURTLE,VENDOR_CRUSH_DMG,VENDOR_CRUSH_DENY,VENDOR_BODY_GAP,VENDOR_PHASE,vendorChoose,vendorPhaseLine}=await import('./js/vendor_boss.js');
       b=V({state:'stagger',protectedStagger:60,openKind:'stuck'});b.hp=vendorPhaseLine(b)+12;b.hurt(60,1,true,false);const held=b.hp;
       Object.assign(b,{protectedStagger:0,state:'recover',t:0,recovery:1});ticks(2);
       ok('a punish stops at half health, and the chillies follow',held===Math.floor(b.maxhp*VENDOR_PHASE.spicy)&&b.state==='rage');
       b=V({phase:2,phaseTwo:true,state:'stagger',protectedStagger:60,openKind:'guard'});b.hp=vendorPhaseLine(b)+30;for(let i=0;i<4;i++)b.hurt(25,1,false,false);const held3=b.hp;
       Object.assign(b,{protectedStagger:0,state:'idle',t:0});ticks(1);
       ok('the fake-out starts at 30%, never past it',held3===Math.floor(b.maxhp*.3)&&b.state==='fakeout');
       b=V();b.guard=0;b.hurt(99999,1,true,true);ok('a debug kill still ends him in the lunch rush',b.dead);
       b=V({state:'idle',turn:0,lastPick:'naan',turtle:VENDOR_TURTLE});Object.assign(G.player,{x:b.x-60,y:226});
       ok('a turtle in the lunch rush draws the crush bump',vendorChoose(b)==='bump'&&b.crush);
       b=V({phase:2,phaseTwo:true,state:'idle',turn:0,lastPick:'naan',turtle:VENDOR_TURTLE});Object.assign(G.player,{x:b.x-60,y:226});vendorChoose(b);
       ok('only the lunch rush answers turtling that way',!b.crush);
       b=V({state:'bump',pattern:'bump',t:VENDOR_BUMP.hit-1,crush:true});Object.assign(G.player,{x:b.x-50,y:226,state:'parry',guardWindow:0,hp:100});debugPress('parry');ticks(1);
       ok('the crush bump caves in a held guard',G.player.guardDenied===VENDOR_CRUSH_DENY&&G.player.hp<=100-VENDOR_CRUSH_DMG+1);
       b=V({state:'bump',pattern:'bump',t:VENDOR_BUMP.hit-1,crush:false});Object.assign(G.player,{x:b.x-50,y:226,state:'parry',guardWindow:0,hp:100,guardDenied:0});debugPress('parry');ticks(1);
       ok('an ordinary bump is still guarded',!(G.player.guardDenied>0)&&G.player.hp>=98);debugResetInput();
       b=V({state:'stagger',protectedStagger:60,openKind:'guard'});Object.assign(G.player,{x:b.x-6,y:226,state:'idle'});ticks(24);
       ok('an opened Pappu steps back off CHAD: the bodies never merge',Math.abs(G.player.x-b.x)>=VENDOR_BODY_GAP.open-1);
       b=V({state:'dip',t:0,pattern:'scoop'});b.x=b.kadai.x-48;const dipX=b.x;Object.assign(G.player,{x:b.x+4,y:b.y,state:'idle'});ticks(24);
       ok('rooted at his kadai he holds his ground and CHAD is eased off the belly',b.x===dipX&&Math.abs(G.player.x-b.x)>=VENDOR_BODY_GAP.open-1);
       b=V({state:'rage',t:0});const rageX=b.x;Object.assign(G.player,{x:b.x-10,y:226,state:'idle'});ticks(24);
       ok('mid-chug he is rooted too',b.x===rageX&&Math.abs(G.player.x-b.x)>=VENDOR_BODY_GAP.open-1);}
      // Kept at range the lunch rush mixes it up: no naan twice running, and a far string walks in to reach.
      b=V({state:'idle',atkCd:1,turn:1,lastPick:'naan'});Object.assign(G.player,{x:b.x-150,y:226});ticks(1);
      ok('never two naan running',b.pattern!=='naan'&&b.lastPick!=='naan');
      b=V({state:'idle',atkCd:1,turn:0,lastPick:'naan'});Object.assign(G.player,{x:b.x-170,y:226,state:'idle'});ticks(1);const walked=b.state==='advance';
      for(let i=0;i<120&&b.state==='advance';i++)ticks(1);
      ok('a far lunch-rush string walks in to reach first',walked&&b.state==='windup'&&b.pattern==='string'&&Math.abs(G.player.x-b.x)<=VENDOR_REACH+8);
      b=V({state:'advance',pattern:'string',t:89,lastPick:'string'});Object.assign(G.player,{x:b.x-220,y:226});ticks(1);
      ok('the walk-in never swings at thin air: out of reach he scoops',b.state==='setup-scoop'&&b.pattern==='scoop');
      // Landing beside CHAD, the belly eases him out from under it over a few ticks: no snap. The street is too shallow
      // to step out of its lane in front of him, so he is eased along the street; with room behind, back out of the lane.
      b=V({phaseTwo:true,state:'flop',pattern:'flop',t:0,leapFrom:2670+300,leapFromY:226,leapTo:2670+250,leapY:226});Object.assign(G.player,{x:2670+195,y:228,state:'idle',hp:100,invuln:0,z:0});
      {let step=0,y=G.player.y,x=G.player.x;for(let i=0;i<60;i++){ticks(1);step=Math.max(step,Math.abs(G.player.y-y),Math.abs(G.player.x-x));y=G.player.y;x=G.player.x;}
       ok('CHAD eases out from under the flopped belly, never snapped',b.state==='flopped'&&Math.abs(G.player.x-b.x)>=VENDOR_BELLY_CLEAR-1&&step<=5);}
      b=V({phaseTwo:true,state:'flop',pattern:'flop',t:0,leapFrom:2670+300,leapFromY:216,leapTo:2670+250,leapY:216});Object.assign(G.player,{x:2670+195,y:218,state:'idle',hp:100,invuln:0,z:0});
      {let step=0,y=G.player.y;for(let i=0;i<60;i++){ticks(1);step=Math.max(step,Math.abs(G.player.y-y));y=G.player.y;}
       ok('with room in front he eases out of the belly\'s lane instead',b.state==='flopped'&&Math.abs(G.player.y-b.y)>=18&&G.player.y<=VENDOR_CHAD_MAX&&step<=4);}
      // CHAD's street ends above the boss bar while Pappu lives; a CHAD who came in lower is walked up, never snapped.
      {b=V();const live=laneMax(G.player.x);b.dead=true;const dead=laneMax(G.player.x);
       Object.assign(G.player,{y:245});b=createBoss('vendor',2670+345,223);let prev=laneMax(G.player.x),jump=0;for(let i=0;i<40;i++){ticks(1);const m=laneMax(G.player.x);jump=Math.max(jump,prev-m);prev=m;}
       ok('the vendor keeps CHAD out from under the boss bar',live===VENDOR_CHAD_MAX&&dead===245&&prev===VENDOR_CHAD_MAX&&jump<=.5);}
      // After a flop throws CHAD to the front of the street the walk-in reaches him: a swing or a naan, never a frozen stride.
      {b=V({phaseTwo:true,phase:2,state:'flopup',t:25,y:226});Object.assign(G.player,{x:b.x+100,y:245,state:'idle',z:0,invuln:0});
       const {vendorPose}=await import('./js/vendor_boss.js');let acted=0,frozen=0,cell='',run=0,walked=0;
       for(let i=0;i<120&&!acted;i++){if(G.player.y>laneMax(G.player.x))G.player.y=laneMax(G.player.x);if(b.state==='idle')b.atkCd=Math.min(b.atkCd,1),b.turn=0,b.lastPick='naan';ticks(1);
        if(b.state==='advance'){walked++;const c=vendorPose(b).join(':'),walk=c.startsWith('walk');run=walk&&c===cell?run+1:0;cell=c;frozen=Math.max(frozen,run);}
        else if(b.state==='windup'&&['string','naan'].includes(b.pattern)&&b.lastPick)acted=i+1;}
       ok('after a flop the walk-in swings or throws at a CHAD in front of him',G.player.y<=VENDOR_CHAD_MAX&&walked>0&&acted>0&&acted<=60&&frozen<=8);}
      // The phase changes land as events: a freeze and a banner.
      b=V({phase:1});b.hp=Math.floor(b.maxhp*.5);b.state='idle';ticks(1);ticks(80);
      ok('extra spicy stings: hitstop and a banner',b.sting?.n===2&&G.hitstop>=8);
      b=V({phase:2,phaseTwo:true});b.hp=1;b.state='idle';G.player.x=b.x-200;ticks(1);for(let i=0;i<700&&b.phase!==3;i++)ticks(1);
      ok('last order stings too',b.sting?.n===3);
      // The licking taunt plays raise, lick, savour, smack; waiting to attack he licks the skimmer now and then (first phase only).
      {const {vendorPose}=await import('./js/vendor_boss.js');b=V({state:'taunt',t:0});const seen=new Set();
       for(let i=0;i<58;i++){seen.add(vendorPose(b).join(':'));ticks(1);}
       ok('the taunt licks the skimmer: raise, lick, savour, smack, then back to idle',['lick:0','lick:1','lick:2','lick:3'].every(c=>seen.has(c))&&b.state==='idle');
       b=V({atkCd:60,lickAt:-999});const w=new Set();for(let i=0;i<34;i++){ticks(1);w.add(vendorPose(b)[0]);}
       ok('waiting to attack, he licks the skimmer once in a while',w.has('lick')&&b.state==='idle');
       b=V({phase:3,phaseTwo:true,atkCd:60,lickAt:-999});const q=new Set();for(let i=0;i<34;i++){ticks(1);q.add(vendorPose(b)[0]);}
       ok('the panting last order never licks',!q.has('lick'));}
      // The street's kadai is the one he fights at: nothing pops in at the trigger.
      {const x=2670+VK.kadai[0];const pre=createProp('dv_kadai',x,222);b=reset('vendor',2670);G.props=[pre];b=createBoss('vendor',2670+345,223);
       ok('he adopts the street kadai he was frying at',b.kadai===pre&&G.props.length===1&&pre.indiaBossProp);}
      b=V({phaseTwo:true,state:'flopped',t:0,wave:{x:2670+250,y:226,r:30,hit:false}});Object.assign(G.player,{x:2670+310,y:226,z:20});ticks(26);
      ok('the shockwave can be jumped',G.player.hp===100&&!b.wave);
      b=V({phaseTwo:true,state:'flopped',t:0,wave:{x:2670+250,y:226,r:30,hit:false}});Object.assign(G.player,{x:2670+310,y:226,z:0});ticks(20);
      ok('grounded CHAD is caught by the shockwave',G.player.hp<100);
      b=V();finishes=0;b.protectedStagger=90;b.hurt(9999,1,true,true);
      ok('vendor defeat starts the kitchen finisher',b.dead&&finishes===1&&b.fightProps.every(q=>q.decor));
      // His street's padded left wall keeps a floored CHAD (41 px either side of his feet) on screen, and lets go when he dies.
      {const {arenaMin}=await import('./js/engine.js');const {VENDOR_LEFT_PAD}=await import('./js/vendor_boss.js');b=V();const live=arenaMin()-G.camX;b.dead=true;const dead=arenaMin()-G.camX;
       ok('the vendor arena pads its left wall for a floored CHAD',G.boss===b&&live===14+VENDOR_LEFT_PAD&&live-41>=0&&dead===14);}
      // The belly bump meets CHAD at the belly's edge (rocking off him in the wind-up), then knocks him back off it.
      {b=V({state:'windup',pattern:'bump',t:0,queued:'naan'});Object.assign(G.player,{x:b.x-40,y:226,hp:100,state:'idle',invuln:0});let gap=0,push=0;
       for(let i=0;i<40;i++){const px=G.player.x;ticks(1);if(b.state==='bump'&&b.t===VENDOR_BUMP.hit){gap=b.x-px;push=px-G.player.x;break;}}
       const spark=G.effects.filter(e=>e.type==='spark').at(-1);
       ok('the belly bump meets CHAD at its edge and shoves him off it',gap>=VENDOR_BUMP.gap-1&&push>=VENDOR_BUMP.push);
       ok('the bump spark flares at the belly front, at CHAD\'s waist',!!spark&&Math.abs(spark.x-(b.x+b.face*VENDOR_BUMP.front))<=1&&Math.abs(spark.y-(G.player.y-VENDOR_BUMP.waist))<=1);}
      {const {VENDOR_FLOP_CLEAR}=await import('./js/vendor_boss.js');b=V({phaseTwo:true,phase:2,state:'flop',pattern:'flop',t:37,leapFrom:2670+300,leapFromY:226,leapTo:2670+220,leapY:226});
       Object.assign(G.player,{x:2670+218,y:226,z:0,state:'idle',hp:100,invuln:0});let px=G.player.x,snap=0,air=0;ticks(1);const hit=b.state==='flopped'&&G.player.hp<100;
       // crushed flat on the street for a short freeze (not stood on his back), then bounced out
       const crushed=G.player.state==='down'&&G.player.z===0&&G.player.vz===0&&G.hitstop>0&&G.hitstop<=VENDOR_CRUSH&&!b.flung;
       // launched from where he stood: never more than 8 px a tick, airborne, and he comes down clear of the belly
       let thrown=false;for(let i=0;i<70&&!(G.player.fell&&G.player.z===0&&thrown);i++){snap=Math.max(snap,Math.abs(G.player.x-px));px=G.player.x;if(G.player.z>0)air++;if(G.hitstop>0){G.hitstop--;continue;}ticks(1);thrown=thrown||b.flung;updatePlayer(G.player,{left:2670,right:3150,back:213,front:laneMax(G.player.x)});}
       snap=Math.max(snap,Math.abs(G.player.x-px));
       ok('the flop crushes CHAD flat for a short freeze, then throws him',crushed&&thrown);
       ok('a belly flop onto CHAD throws him clear of the belly without a snap',hit&&snap<=8&&air>=8&&b.x-G.player.x>=VENDOR_FLOP_CLEAR-8&&G.player.y<=VENDOR_CHAD_MAX);}
      // The selected finisher is covered frame-by-frame by pappu_finish_variants_check.cjs.
      {const {vendorVariant}=await import('./js/vendor_finish_variants.js');
       ok('Pappu uses Puri pop',vendorVariant({kind:'vendor-finish'}).label==='Puri pop');}
      b = reset('closer', 5900); b.state = 'boxing'; b.t = 42; b.x = 6080; b.face = -1; b.y = 226;
      Object.assign(G.player, { x: 6045, y: 226, face: 1, guardWindow: 12, state: 'parry' }); debugPress('parry'); ticks(1);
      ok('Closer boxing stops immediately on parry', b.state === 'stagger' && b.protectedStagger === 45 && G.player.hp === 100);
      b = reset('closer'); b.state = 'recover'; b.guard = 3; b.x = 200;
      G.shots.push({ kind: 'handset', x: 179, y: b.y, z: 0, vx: 4.2, vz: 0, dmg: 13, t: 0, life: 100, source: b, reflected: true });
      updateShots();
      ok('reflected handset damages Closer and guard without hitting bystanders', b.hp === b.maxhp - 20 && b.guard === 2 && G.shots.length === 0);
      b = reset('closer'); b.state = 'call'; b.t = 3;
      G.enemies = [{ x: 100, y: 224, hp: 30, atkCd: 100, dead: false, state: 'idle' }];
      b.hurt(2, 1, false, false); ticks(25);
      ok('sales call can be interrupted before it rallies ally', b.calls === 0 && G.enemies[0].atkCd === 100 && b.protectedStagger > 0);
      b.protectedStagger = 0; b.state = 'call'; b.t = 19; ticks(1);
      ok('completed call rallies exactly one existing ally', b.calls === 1 && G.enemies.length === 1 && G.enemies[0].atkCd === 18);
      b = reset('closer'); b.protectedStagger = 45; b.hurt(b.maxhp * .6, 1, true, false);
      ok('half-health office destruction waits for punish', b.phasePending && !b.phaseTwo && b.fightProps.every(p => !p.broken));
      ticks(45); ok('office stays intact for all protected ticks', !b.phaseTwo);
      ticks(1); ok('half-health begins an authored break after the opening', b.phaseTwo && b.state==='phase-break' && b.fightProps.every(p=>!p.broken));
      ticks(30); ok('the gloves-off impact swaps to the damaged family and preserves the furniture', b.set._aiKey === 'ic_closer_damaged' && b.fightProps.every(p => !p.broken));
      b = reset('closer'); Object.assign(b,{x:332,y:226,attackLane:226,attackFace:-1,face:-1,state:'deal',pattern:'deal',t:0});Object.assign(G.player,{x:280,y:244});
      ticks(13);ok('evading the false handshake earns a stumble opening',b.state==='stumble'&&!G.player.grabbedBy&&b.fightProps.every(p=>p.role!=='vault'));
      b.protectedStagger = 0; b.guard = 0; b.state = 'recover'; finishes = 0; b.hurt(9999, 1, true, true); b.hurt(9999, 1, true, true);
      ok('Closer defeat starts one stage-owned finishing performance', b.dead && b.finishStarted && finishes === 1);
      const score = G.score; ticks(120); ok('boss defeat cannot award score repeatedly', G.score === score);

      // THE DREDGER: steel that only gives on the deck, six panes of cab glass, then the man.
      const DC=6000,crewOf=b=>G.enemies.filter(e=>e.trainType==='ic_docker');
      const D=(o={})=>{const b=reset('dredger',DC);Object.assign(b,{atkCd:999,crewCd:999},o);Object.assign(G.player,{x:DC+150,y:226});return b;};
      const Op=(o={})=>{const b=D();b.delhi.operatorPhase(b);Object.assign(b,{x:DC+300,y:226,face:-1,atkCd:999},o);b.grab.x=DC+420;return b;};
      const M=(o={})=>D(Object.assign({rig:'magnet',z:96,hp:900},o));
      const drumAtMagnet=b=>{b.reflectTarget={x:b.x,y:b.y-b.z-34};G.shots=[{kind:'hatch',x:b.x-60,y:b.y,z:20,vx:-3,vz:0,dmg:12,t:0,life:400,source:b,parryClass:'reflect',reflected:true}];for(let i=0;i<150&&G.shots.length;i++)updateShots();};
      const wrenchAtCab=b=>{G.shots=[{kind:'wrench',x:b.reflectTarget.x-60,y:215,z:0,vx:-3,vz:0,dmg:9,t:0,life:400,source:b,parryClass:'reflect',reflected:true}];for(let i=0;i<150&&G.shots.length;i++)updateShots();};
      b = D(); b.hurt(20, 1, true, false);
      ok('the hanging grab shrugs off hits', b.hp === b.maxhp && sounds.includes('armor'));
      b = D({ state: 'stuck', z: 0, t: 0 }); b.hurt(20, 1, true, false);
      ok('a grab stuck in the deck takes damage', b.hp === b.maxhp - 20);
      ticks(121); ok('the stuck grab rips free after its opening', b.state === 'rip');
      b = D({ state: 'swing', pattern: 'grabswing', t: 0, dir: 1, lockY: 226 }); Object.assign(G.player, { x: DC + 240, y: 226 }); ticks(46);
      ok('the pendulum swing hits CHAD at the bottom of its arc', G.player.hp < 100 && b.state === 'swingout');
      b = D({ state: 'swing', pattern: 'grabswing', t: 10, dir: 1, lockY: 226, z: 20 }); b.parried(0, 1); ticks(60);
      ok('a parried swing returns to sender and cracks the cab twice', b.glass === 4 && b.z === 0 && b.state === 'stagger' && b.hp === b.maxhp - 180);
      const dented = b.hp; b.hurt(10, 1, false, false);
      ok('the dented grab on the deck is open to a beating', b.hp === dented - 10);
      b = D({ state: 'dropaim', t: 0 }); Object.assign(G.player, { x: b.x, y: b.y }); ticks(46 + 14 + 20);
      ok('the grab drop crushes CHAD in its shadow and sticks', G.player.hp < 100 && b.state === 'stuck');
      b = D({ state: 'droplock', t: 0 }); Object.assign(G.player, { x: b.x + 80, y: b.y }); ticks(30);
      ok('leaving the locked shadow dodges the drop', G.player.hp === 100 && b.state === 'stuck');
      b = D({ state: 'scoop', t: 0, dir: 1, x: DC + 56, lockY: 226, z: 6 }); ticks(40);
      ok('the deck scoop hits a grounded CHAD in its lane', G.player.hp < 100);
      b = D({ state: 'scoop', t: 0, dir: 1, x: DC + 56, lockY: 226, z: 6 }); G.player.z = 20; ticks(40);
      ok('jumping clears the deck scoop', G.player.hp === 100);
      b = D({ state: 'dump', t: 0 }); G.player.x = DC + 60; ticks(30);
      ok('the sludge dump lobs three blobs', G.shots.filter(s => s.kind === 'sludge').length === 3);
      b = D(); wrenchAtCab(b);
      ok('a reflected crew wrench cracks the cab glass once', b.glass === 5 && b.hp === b.maxhp - 40 && G.shots.length === 0);
      b.glass = 1; wrenchAtCab(b); ticks(1);
      ok('the last crack cuts the grab loose', b.glass === 0 && b.state === 'cutloose' && b.hp <= b.magLine && (b.hurt(50, 1, true, false), b.hp <= b.magLine));
      const hp0 = b.hp; ticks(222); ok('MAGNET MODE: the magnet takes over the cable and tops the machine up', b.rig === 'magnet' && b.stingKind === 'magnet' && b.hpFx && b.hpFx.to === hp0 + Math.round(b.maxhp * .08));
      ticks(60); ok('the refill eases in and the cinematic hands back', b.state === 'idle' && !b.hpFx && b.hp === hp0 + Math.round(b.maxhp * .08));
      b = D({ state: 'stuck', z: 0 }); b.hurt(9999, 1, true, false);
      ok('the grab gives out at the magnet line', b.hp === b.magLine && b.magnetPending && !b.dead);
      ticks(1); ok('and is cut loose', b.state === 'cutloose');
      b = M(); b.hurt(20, 1, true, false); ok('the hanging magnet shrugs off hits', b.hp === 900);
      b = M({ state: 'pull', t: 0, pattern: 'magpull' }); Object.assign(G.player, { x: b.x + 120, y: b.y, z: 0, invuln: 0 }); ticks(30);
      ok('the magnet drags CHAD toward it', G.player.x < b.x + 100 && G.player.magnetPull);
      b = M({ state: 'pullslam', t: 0, vz: 0, z: 60, slamAt: null }); ticks(30);
      ok('it slams onto the deck and lies open', b.state === 'slammed' && (b.hurt(20, 1, true, false), b.hp === 880));
      {const {spawnEnemy}=await import('./js/enemies.js');b = M(); G.shots=[]; G.player.x = b.x - 140; const e=spawnEnemy('ic_docker',b.x+40,b.y);if(!G.enemies.includes(e))G.enemies.push(e);Object.assign(e,{state:'idle',t:0,z:0,atkCd:999});b.crewActors=[e];Object.assign(b,{state:'yankseek',t:0,pattern:'magyank',yankAt:{e}});
      let lifted=false;for(let i=0;i<120&&!G.shots.length;i++){ticks(1);lifted||=b.yankee?.e===e&&!G.enemies.includes(e);}
      ok('the magnet yanks a crewman off the deck by his wrench', lifted && b.crewActors.includes(e));
      ok('and flings him: a reflectable crewman', G.shots.some(s => s.kind === 'crewman' && s.parryClass === 'reflect' && s.crew === e));
      G.player.invuln=999;for(let i=0;i<80&&G.shots.length;i++){updateShots();ticks(1);}
      ok('a missed crewman crashes onto the deck and is back in the fight', !G.shots.length && G.enemies.includes(e) && !b.flung);
      b = M(); G.shots=[]; b.crewActors=[]; Object.assign(b,{state:'yankseek',t:0,pattern:'magyank',yankAt:{x:b.x+20,y:b.y}}); for(let i=0;i<120&&!G.shots.length;i++)ticks(1);
      ok('with no crew in reach it rips a hatch lid out of the deck', G.shots.some(s => s.kind === 'hatch') && b.holes?.length === 1);const c=spawnEnemy('ic_docker',b.x-80,b.y);G.enemies=G.enemies.filter(o=>o!==c);b=M();b.reflectTarget={x:b.x,y:b.y-b.z-34};G.shots=[{kind:'crewman',crew:c,x:b.x-60,y:b.y,z:20,vx:-3,vz:0,dmg:16,t:0,life:400,source:b,parryClass:'reflect',reflected:true}];for(let i=0;i<150&&G.shots.length;i++)updateShots();
      ok('a parried crewman shorts the magnet and is out cold', b.state === 'shorted' && b.overload === 1 && G.enemies.includes(c) && (c.dead || c.hp <= 0));G.player.invuln=0;}
      b = M(); drumAtMagnet(b);
      ok('a reflected drum shorts the magnet', b.overload === 1 && b.state === 'shorted' && b.hp < 900);
      drumAtMagnet(b); drumAtMagnet(b); ticks(1);
      ok('the third short blows the rig: an armoured set piece', b.overload === 3 && b.phase === 'machine' && b.state === 'blowout' && (b.hurt(50, 1, true, false), b.hp > OPERATOR_FLOOR));
      ticks(100);
      ok('the last crack sends the Thekedar down', b.phase === 'operator' && b.label === 'THE THEKEDAR' && b.refill && b.maxhp === Math.round(OPERATOR_HEALTH * diff().hp));
      ok('the glass handoff launches from the cab seat instead of below it', b.state === 'leap' && b.y-b.z === 116 && b.from[1] === b.y-116 && b.face === -1);
      ticks(72); ok('his bar fills as he lands, under the banner', b.hp === b.maxhp && !b.refill && b.stingKind === 'operator');
      b = M({ state: 'slammed', z: 0 }); b.hurt(9999, 1, true, false);
      ok('lethal machine damage cannot skip the Thekedar', !b.dead && b.hp === OPERATOR_FLOOR && b.operatorPending);
      ticks(102); ok('the floor hands over to the Thekedar', b.phase === 'operator' && !b.dead);
      ticks(72);
      finishes = 0; b.hurt(9999, 1, true, false);
      ok('the Thekedar dies and starts the finisher', b.dead && b.state === 'dying' && finishes === 1);
      b = M({ state: 'slammed', z: 0 }); b.superLocked = b.superApplying = true; G.player.state = 'special'; b.hurt(9999, 1, true, false);
      ok('the transition waits for an active super', b.phase === 'machine' && b.hp === OPERATOR_FLOOR && !b.dead);
      b.superLocked = b.superApplying = false; G.player.state = 'idle'; ticks(102);
      ok('the Thekedar comes down after the super releases', b.phase === 'operator' && !b.dead);
      b = M({ state: 'slammed', z: 0, protectedStagger: 45 }); b.hurt(9999, 1, true, false);
      ticks(44); ok('lethal machine damage waits for all protected ticks', b.phase === 'machine' && b.protectedStagger === 1);
      ticks(2); ok('lethal machine damage advances after the opening', b.state === 'blowout' && !b.dead);
      b = D({ crewCd: 0 }); ticks(1);
      ok('the machine sends two dock crew', crewOf().length === 2 && crewOf().every(e => e.dredgerCrew));
      for (let i = 0; i < 6; i++) { G.enemies = []; b.crewCd = 0; ticks(1); }
      ok('machine reinforcements stop at four, keeping two for the crewcall', b.crewSpawned === 4);
      b = D({ crewCd: 0 }); ticks(1); for (const e of b.crewActors) e.state = 'attack'; b.state = 'droplock'; b.t = 0; ticks(1);
      ok('grab attacks hold the crew back', b.crewActors.length === 2 && b.crewActors.every(e => e.state === 'idle' && e.atkCd >= 30));
      b = Op(); b.hurt(4, 1, false, false);
      ok('the Thekedar guards a frontal jab', b.hp === b.maxhp && b.guardFlash > 0);
      b = Op({ state: 'wrench', pattern: 'wrenchcombo', t: 44 }); b.parried(0, 1);
      ok('parrying the overhead jams the wrench in the deck', b.stuckAt === G.time && b.protectedStagger >= 100);
      b = Op({ state: 'wrench', pattern: 'wrenchcombo', t: 8 }); b.parried(0, 1);
      ok('parrying the first swing is an ordinary opening', b.stuckAt === undefined && b.protectedStagger === 45);
      b = Op({ state: 'idle' }); G.shots = [{ kind: 'sack', x: b.x - 60, y: b.y, z: 30, vx: 4, vz: 0, dmg: 12, t: 0, life: 200, source: b, parryClass: 'reflect', reflected: true, homing: true }];
      for (let i = 0; i < 60 && G.shots.length; i++) updateShots();
      ok('a reflected sand sack gets sand in his eyes', b.blindAt === G.time && b.protectedStagger >= 110 && b.hp < b.maxhp);
      b = Op({ state: 'call', pattern: 'grabcall', t: 0 }); ticks(7);
      ok('BUCKET! sends the grab hunting CHAD', b.grab.state === 'aim' && sounds.includes('blip'));
      b = Op({ state: 'gloat', pattern: 'grabcall', t: 0 }); Object.assign(b.grab, { state: 'fall', x: b.x, y: b.y, z: 1, vz: 5, t: 0 }); G.player.x = DC + 100; ticks(1);
      ok('the grab lands on its own boss: SELF-DREDGED', b.crushedAt === G.time && b.hp === b.maxhp - Math.round(b.maxhp * .18) && b.protectedStagger >= 130 && G.player.hp === 100);
      b = Op({ state: 'gloat', pattern: 'grabcall', t: 0 }); Object.assign(G.player, { x: DC + 200, y: 226, invuln: 0 }); Object.assign(b.grab, { state: 'fall', x: DC + 200, y: 226, z: 1, vz: 5, t: 0 }); ticks(1);
      ok('the called grab crushes CHAD under it', G.player.hp < 100 && b.grab.state === 'stuck' && b.hp === b.maxhp);
      b = Op({ state: 'idle', atkCd: 1 }); b.hp = Math.floor(b.maxhp * .4); ticks(12);
      ok('at half health he calls the crew once', b.crewCalled && b.crewActors.length === 2 && b.crewActors.every(e => !e.dredgerCrew));
      ticks(40); ok('then runs for the hook', b.state === 'hookrun');
      for (let i = 0; i < 400 && b.state !== 'hooktoss'; i++) ticks(1);
      const tossHp = b.hp; ok('at the top he throws the wrench away', b.state === 'hooktoss' && (ticks(20), !!b.wrenchToss));
      for (let i = 0; i < 40 && !b.hookArt; i++) ticks(1);
      ok('and takes the hook: no wrench in his hands from here', b.hookArt && b.state === 'hooktoss');
      b.hurt(50, 1, true, false); ok('the transition is armoured', b.hp === tossHp);
      for (let i = 0; i < 600 && !b.hook; i++) ticks(1);
      ok('CONTRACT TERMINATED: he swings down on the hook and the magnet stays on the boom', b.hook && b.stingKind === 'hook' && ['rest','rise'].includes(b.grab.state) && b.z === 0 && b.hpFx?.to === Math.min(b.maxhp, tossHp + Math.round(b.maxhp * .12)));
      ok('the crew hold off while he roars', b.crewActors.every(e => e.state !== 'attack'));
      b = Op({ hook: true, crewCalled: true, state: 'hookfling', pattern: 'hookfling', t: 6 }); b.parried(0, 1);
      ok('parrying the hook fling tangles him in his chain', b.tangledAt === G.time && b.protectedStagger >= 96);
      b = Op({ hook: true, crewCalled: true, state: 'hookslam', pattern: 'hookslam', t: 0, slamAt: [DC + 200, 226] }); Object.assign(G.player, { x: DC + 200, y: 226, z: 0, invuln: 0, hp: 100 }); ticks(11);
      ok('the hook slam hits CHAD on its ring and sticks', G.player.hp < 100 && b.hookStuckAt > 0 && b.protectedStagger > 0);
      b = Op({ hook: true, crewCalled: true, state: 'hooksweep', pattern: 'hooksweep', t: 0, face: -1 }); Object.assign(G.player, { x: DC + 220, y: 226, z: 0, invuln: 0, hp: 100 }); ticks(20);
      ok('the hook sweep hits a grounded CHAD in front of him', G.player.hp < 100);
      b = Op({ state: 'idle', atkCd: 999, crewCalled: true }); Object.assign(G.player, { x: DC + 120, y: 226, z: 0, invuln: 0, hp: 100 }); Object.assign(b, { x: DC + 340, y: 226 }); Object.assign(b.grab, { state: 'rest', z: 92, t: 0, sweepCd: 0 }); ticks(2);
      ok('the operator\'s grab hauls out for a sweep down CHAD\'s lane', b.grab.state === 'sweepwind' && b.grab.lockY === 226);
      for (let i = 0; i < 200 && b.grab.state !== 'rise'; i++) ticks(1);
      ok('the sweep hits a grounded CHAD in its lane', G.player.hp < 100);
      b = Op({ state: 'idle', atkCd: 999, crewCalled: true }); Object.assign(G.player, { x: DC + 120, y: 226, z: 0, invuln: 0, hp: 100 }); Object.assign(b, { x: DC + 240, y: 226 }); Object.assign(b.grab, { state: 'sweep', t: 0, dir: 1, lockY: 226, x: DC + 56, z: 70, hitP: true, hitB: false }); for (let i = 0; i < 50; i++) ticks(1);
      ok('his own bucket bowls him over: WRONG LANE', b.crushedAt > 0 && b.protectedStagger > 0 && b.hp < b.maxhp);
      b = Op({ state: 'idle' }); b.parried(0, 1); ticks(46); ticks(60);
      ok('a parry never strands the Thekedar in recovery', b.state !== 'stagger' && b.protectedStagger === 0);
      b = Op({ state: 'idle' }); Object.assign(G.player, { x: b.x - 60, y: 226, face: 1, state: 'attack', t: 12, hitDone: true, hitConfirm: false }); ticks(1);
      ok('a whiffed swing in front of the Thekedar makes him flinch', b.state === 'flinch');
      G.player.state = 'idle'; const flinchHp = b.hp; b.hurt(4, 1, false, false);
      ok('he flinches with his guard down', b.hp === flinchHp - 4);
      b = Op({ state: 'climb', x: DC + 384, z: 20, t: 0 }); const ladderHp = b.hp; b.hurt(6, 1, false, false);
      ok('a hit on the ladder knocks him off it', b.state === 'down' && b.pluckedAt === G.time && b.hp === ladderHp - 6 - Math.round(b.maxhp * .08));
      b = Op({ state: 'climb', x: DC + 384, z: 110.5, t: 0 }); ticks(14);
      ok('reaching his cab drops the grab on CHAD', b.state === 'incab' && b.grab.state === 'aim');
      const cabHp = b.hp; b.hurt(20, 1, true, false);
      ok('he is out of reach in the cab', b.hp === cabHp);
      b = Op({state:'scurry',x:DC+370,y:224,z:0,t:0});
      for(let i=0;i<150&&b.state!=='incab';i++)ticks(1);
      ok('natural ladder entry preserves the last visible rung registration', b.state==='incab' && b.t===0 && b.cabEntry.idx===3 && Math.abs(b.cabEntry.x-DC-386.44)<.01 && b.cabEntry.y===103);
      ticks(12);
      ok('the entry ends on the cab pose shown at the lever cue', b.state==='incab' && b.cabEntry.seatedIdx===((G.time>>3)&1) && b.grab.state==='aim');
      for(let i=0;i<120&&b.state==='incab';i++)ticks(1);
      const departureIdx=((G.time-1)>>3)&1,departureHead=departureIdx?[217,161]:[224,155];
      ok('the return leap starts at seat height with the previous seated head anchor', b.state==='leap' && b.t===0 && b.y-b.z===116 && b.from[1]===b.y-116 && b.face===-1 && JSON.stringify(b.cabLeapHead)===JSON.stringify(departureHead));
      ticks(44);
      ok('the registered cab leap keeps its original 44-tick landing', b.state==='land' && b.z===0 && b.x===DC+300);
      for(const [state,z,hideInCab] of [['incab',111,true],['climb',60,false]]){
       b=Op({state,z,hideInCab,t:20,y:213});const hp=b.hp;
       Object.assign(b.grab,{state:'fall',x:b.x,y:b.y,z:1,vz:5,t:0});ticks(1);
       ok(`a grab landing under an elevated ${state} operator cannot crush him`,b.hp===hp && b.state===state && !b.crushedAt);
      }

      b = reset('vendor'); const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 270;
      const before = JSON.stringify({ b: [b.x, b.y, b.hp, b.t, b.turn], sounds: sounds.length, effects: G.effects.length });
      for (let i = 0; i < 10; i++) drawBoss(canvas.getContext('2d'), G.camX);
      ok('rendering missing art remains side-effect free', before === JSON.stringify({ b: [b.x, b.y, b.hp, b.t, b.turn], sounds: sounds.length, effects: G.effects.length }));
      return results;
    });
    console.log(JSON.stringify({ checkCount:checks.length, checks, errors }));
    assert(checks.every(x => x[1]), JSON.stringify(checks.filter(x => !x[1])));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
