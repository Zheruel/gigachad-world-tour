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
      const {OPERATOR_HEALTH}=await import('./js/delhi_dredger_rebuild.js');
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
      let b = reset('vendor', 2670);
      ok('vendor props register to encounter camera', b.station.x === 2748 && b.valve.x === 2776 && G.props.length === 3);
      b.parried(0, 1);
      b.hurt(4, 1, false, false); b.hurt(4, 1, true, false);
      ok('vendor parry protects full 45 ticks from followups', b.guard <= 2 && b.protectedStagger === 45 && b.state === 'stagger');
      ticks(45); b.parried(0, 1); ticks(45); b.parried(0, 1);
      ok('third parry creates 90 tick guard break', b.guard === 0 && b.protectedStagger === 90);
      ticks(89); ok('guard cannot regenerate inside earned opening', b.guard === 0 && b.protectedStagger === 1);
      ticks(1); ok('guard returns after full opening', b.guard === 3 && b.state === 'reguard');
      const restoredHP=b.hp;b.face=-1;b.hurt(10,1,false,false);
      ok('earned-opening exit cannot leak a second free-damage recovery',b.hp===restoredHP&&b.state==='reguard');

      b = reset('vendor'); b.state = 'recover'; b.recovery = 54;
      for (let i = 0; i < 55; i++) { if (i % 8 === 0) b.hurt(1, 1, false, false); ticks(1); }
      ok('clean jabs cannot restart boss recovery indefinitely', b.state === 'idle' && b.protectedStagger === 0);
      b = reset('vendor'); b.state = 'windup'; b.pattern = 'rush'; b.face = -1; b.attackLane = b.y;
      G.player.x = b.x + 100; G.player.y = 245; const lockedY = b.y; ticks(20);
      ok('rush tell locks facing and lane before impact', b.face === -1 && b.y === lockedY);
      b=reset('vendor');G.player.x=b.x-30;b.atkCd=0;ticks(1);
      ok('close range chooses a ladle instead of a long setup walk',b.state==='windup'&&b.pattern==='ladle');
      const patterns=[];
      for(let i=0;i<10;i++){b.state='idle';b.atkCd=0;ticks(1);patterns.push(b.pattern);}
      ok('distance-aware selector does not immediately repeat',patterns.every((p,i)=>!i||p!==patterns[i-1]));
      ok('close pressure still exposes the cart pattern',patterns.includes('rush'));
      b.state='setup-rush';b.t=0;const setupX=b.x;ticks(16);
      ok('cart braces without a backwards setup walk',b.state==='windup'&&b.pattern==='rush'&&Math.abs(b.x-setupX)<3);
      ticks(52);ok('cart commits after readable windup',b.state==='rush'&&b.face===-1);
      b = reset('vendor'); b.state = 'rush'; b.t = 4; b.face = -1; b.x = b.station.x + 60; b.y = b.station.y - 3;
      ticks(1);
      ok('baited cart collision destroys station and exposes vendor', b.station.broken && b.guard === 0 && b.protectedStagger === 90);
      b.cart.hurt(999, 1, true, true);
      ok('cart destruction permanently removes rush', b.cartGone && b.cart.broken);
      b.protectedStagger = 0; b.state = 'idle'; b.atkCd = 0; b.turn = 5; G.player.x = b.x + 180; ticks(1);
      ok('pattern selection never reintroduces a broken cart', b.pattern !== 'rush');

      b = reset('vendor'); b.state = 'windup'; b.pattern = 'valve'; b.valveActive = true; b.valve.decor = false; b.pressureT = 20;
      b.valve.hurt(7, 1);
      ok('valve hit interrupts with protected opening and guard pressure', b.state === 'stagger' && b.protectedStagger === 45 && b.pressureT === 0 && b.guard === 2 && b.hp===b.maxhp-24);
      b = reset('vendor'); b.state = 'windup'; b.pattern = 'valve'; b.valveActive = true; b.valve.decor = false;
      b.hurt(4, 1, false, false);
      ok('direct hit also interrupts pressure tell through neutral guard', b.state === 'stagger' && b.protectedStagger === 45);

      b = reset('vendor'); b.state = 'ladle'; b.t = 11; b.x = 180; b.y = 226; b.face = -1;
      Object.assign(G.player, { x: 145, y: 226, guardWindow: 12, state: 'parry', face: 1 }); debugPress('parry'); ticks(1);
      ok('actual ladle contact parries and cancels remaining combo', G.player.hp === 100 && G.player.lastDefense === 'parry' && b.state === 'stagger' && b.protectedStagger === 45);
      ticks(30); ok('second ladle strike cannot escape protected stagger', G.player.hp === 100 && b.protectedStagger === 15);

      b=reset('vendor');b.cart.hurt(999,1,true,true);b.protectedStagger=0;
      G.player.x=b.x-110;const footPatterns=[];
      for(let i=0;i<14;i++){b.state='idle';b.atkCd=0;ticks(1);footPatterns.push(b.pattern);}
      ok('broken cart permanently unlocks both on-foot attacks',footPatterns.includes('overhead')&&footPatterns.includes('vendor-lunge')&&!footPatterns.includes('rush'));
      const lunges=footPatterns.map((p,i)=>p==='vendor-lunge'?i:-1).filter(i=>i>=0);
      ok('red belly lunge stays rare',lunges.every((n,i)=>!i||n-lunges[i-1]>=4));
      b.station.broken=true;b.valve.broken=true;
      let stranded=false;for(let i=0;i<12;i++){b.state='idle';b.atkCd=0;ticks(1);stranded ||= b.pattern==='valve'||b.pattern==='rush';}
      ok('all destroyed equipment leaves actionable on-foot patterns',!stranded);
      b=reset('vendor');b.state='ladle';b.t=55;b.face=-1;b.x=180;b.y=226;
      Object.assign(G.player,{x:145,y:226,state:'idle',invuln:0});ticks(1);
      ok('equipment ladle has a third contact',G.player.hp<100);
      b=reset('vendor');b.cartGone=true;b.state='ladle';b.t=55;b.face=-1;b.x=180;b.y=226;
      Object.assign(G.player,{x:145,y:226,state:'idle',invuln:0});ticks(1);
      ok('on-foot ladle string shortens to two contacts',G.player.hp===100&&b.state==='recover');
      b=reset('vendor');b.state='vendor-lunge';b.pattern='vendor-lunge';b.t=7;b.face=-1;b.x=230;b.y=226;
      Object.assign(G.player,{x:195,y:245,state:'idle',invuln:0});ticks(21);
      ok('locked lunge is avoidable by changing lanes',G.player.hp===100&&b.y===226);

      b=reset('vendor');b.state='overhead';b.pattern='overhead';b.t=0;b.face=-1;b.x=220;b.y=226;G.player.x=190;G.player.y=226;
      ticks(10);ok('committed overhead steps cannot cross a close target',b.x>=G.player.x+30);
      b=reset('vendor');G.player.x=b.station.x+80;b.atkCd=0;const kitchenPatterns=[];
      for(let i=0;i<10;i++){b.state='idle';b.atkCd=0;ticks(1);kitchenPatterns.push(b.pattern);}
      ok('pressure is selected when its valve and lane are reachable',kitchenPatterns.includes('valve'));
      b=reset('vendor');b.state='utensil';b.pattern='utensil';b.t=13;b.face=-1;b.x=200;b.y=226;
      Object.assign(G.player,{x:175,y:226,face:1,state:'parry',guardWindow:12});debugPress('parry');ticks(1);updateShots();
      ok('close utensil starts in front of target and remains reflectable',G.player.hp===100&&G.shots.some(s=>s.reflected));
      b = reset('closer', 5900); b.state = 'boxing'; b.t = 9; b.x = 6080; b.face = -1; b.y = 226;
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
      ticks(1); ok('half-health breaks furniture persistently after opening', b.phaseTwo && b.fightProps.filter(p => p.role !== 'cabinet').every(p => p.broken));
      b = reset('closer'); b.cabinet.x = 152; b.cabinet.y = 226; b.x = 200; b.y = 223; b.face = -1; b.state = 'shove'; b.t = 2;
      ticks(1); ok('cabinet collision opens guard and breaks office prop', b.fightProps.some(p => p.role !== 'cabinet' && p.broken) && b.protectedStagger === 90);
      b.protectedStagger = 0; b.guard = 0; b.state = 'recover'; finishes = 0; b.hurt(9999, 1, true, true); b.hurt(9999, 1, true, true);
      ok('Closer defeat starts one stage-owned finishing performance', b.dead && b.finishStarted && finishes === 1);
      const score = G.score; ticks(120); ok('boss defeat cannot award score repeatedly', G.score === score);

      b = reset('dredger'); b.state = 'grounded'; b.z = 0; b.hurt(9999, 1, true, false);
      ok('lethal machine damage cannot skip Dredger operator', !b.dead && b.phase === 'operator' && b.hp === OPERATOR_HEALTH && b.maxhp === OPERATOR_HEALTH);
      b.hurt(9999, 1, true, false); ok('operator can still be defeated normally', b.dead && b.state === 'dying');
      b = reset('dredger'); b.superLocked = b.superApplying = true; G.player.state = 'special'; b.hurt(9999, 1, true, false);
      ok('Dredger transition cannot interrupt active super', b.phase === 'machine' && b.hp === 90 && !b.dead);
      b.superLocked = b.superApplying = false; G.player.state = 'idle'; ticks(1);
      ok('Dredger operator begins after super releases', b.phase === 'operator' && !b.dead);
      let repeated = true;
      for (let i = 0; i < 20; i++) {
        b = reset('dredger'); b.hurt(b.hp - 80, 1, false, false);
        repeated &&= b.phase === 'operator' && !b.dead && b.maxhp === OPERATOR_HEALTH;
      }
      ok('operator threshold is deterministic across twenty resets', repeated);

      b = reset('dredger'); G.stage.chapter = true; b.crewCd = 0;
      b.delhi.crew(b);
      ok('chapter Dredger creates real waterfront profiles', G.enemies.length === 2 && G.enemies.every(e => e.trainType === 'ic_docker'));
      b.crewCd = 0; b.delhi.crew(b);
      ok('waterfront profile identity enforces two-crew limit', G.enemies.length === 2);
      b.hurt(b.hp-80, 1, false, false);
      ok('operator transition preserves registered waterfront crew', b.phase === 'operator' && G.enemies.every(e => !e.dead));

      b = reset('dredger'); b.winch.hurt(999,1,true,true); ticks(15);
      G.enemies = []; G.player.x=b.x-40; G.player.y=b.y; G.player.face=1; G.meter=100;
      const bucketHP=b.hp;
      ok('destroyed winch leaves bucket reachable for a real super', b.dead_bucket && b.state === 'grounded' && b.z === 0 && startSuper(G.player));
      for(let i=0;i<100;i++){G.time++;G.rawTime++;updatePlayer(G.player);updateBoss();}
      ok('full super releases machine into a protected opening', !b.superLocked && b.protectedStagger > 0 && b.hp === bucketHP-36);
      let stayedGrounded=true;
      for(let i=0;i<160;i++){ticks(1);stayedGrounded &&= b.z === 0;}
      ok('broken winch cannot re-hoist after super or shared recovery', stayedGrounded && b.state === 'grounded' && b.dead_bucket);

      const equipment=await import('./js/delhi_dredger_rebuild.js');
      for(const order of [['winch','pump','cab'],['winch','cab','pump'],['pump','winch','cab'],['pump','cab','winch'],['cab','winch','pump'],['cab','pump','winch']]){
        b=reset('dredger');
        for(const key of order){b[key].hurt(999,1,true,true);ticks(2);}
        ticks(20);ok('component order '+order.join(' > ')+' leaves exposed machine',b.phase==='machine'&&!b.dead&&b.z===0&&order.every(key=>b[key].broken));
        b.hurt(9999,1,true,false);ok('component order '+order.join(' > ')+' can reach living operator',b.phase==='operator'&&!b.dead);
      }
      b=reset('dredger');equipment.spawnDredgerCrew(b,99);
      ok('crew spawn request bounded to two visible',b.crewActors.length===2&&G.enemies.length===2);
      for(let i=0;i<8;i++){for(const e of b.crewActors)e.dead=true;equipment.spawnDredgerCrew(b,99);}
      ok('encounter crew budget ends after six total',b.crewSpawned===6&&b.crewActors.length===0);
      b=reset('dredger');equipment.spawnDredgerCrew(b,2);G.enemies=[];equipment.updateDredgerLife(b);equipment.spawnDredgerCrew(b,1);
      ok('removed crew do not block bounded reinforcement call',b.crewActors.length===1&&b.crewSpawned===3);
      b=reset('dredger');equipment.spawnDredgerCrew(b,2);b.state='sweep';
      for(const e of b.crewActors)e.state='attack';equipment.updateDredgerLife(b);
      ok('dangerous machine attack suppresses crew commitments',b.crewActors.every(e=>e.state==='idle'&&e.atkCd>=30));
      b=reset('dredger');b.protectedStagger=45;b.cab.hurt(999,1,true,true);b.hurt(9999,1,true,false);
      ticks(44);ok('lethal machine damage waits for all protected ticks',b.phase==='machine'&&b.protectedStagger===1);
      ticks(2);ok('lethal machine damage advances after protected opening',b.phase==='operator'&&!b.dead);
      b=reset('dredger');b.delhi.operatorPhase(b);b.state='windup';b.pattern='restart';b.t=40;b.hurt(2,1,false,false);
      ok('restart interruption guarantees opening',b.state==='stagger'&&b.protectedStagger>=45);
      const interruptedProps=b.fightProps.map(p=>p.hp);ticks(45);ticks(200);
      ok('operator resumes after protected restart interruption',b.state!=='recover'||b.t<100);
      ok('restart cannot repair machinery',b.fightProps.every((p,i)=>p.hp<=interruptedProps[i]));
      b=reset('dredger');b.delhi.operatorPhase(b);b.state='windup';b.pattern='call';b.t=20;b.hurt(2,1,false,false);ticks(44);
      ok('interrupted call cannot spawn through protected opening',b.crewSpawned===0&&!b.operatorCall&&b.protectedStagger===1);
      b=reset('dredger');b.delhi.operatorPhase(b);b.state='call';b.pattern='call';b.t=0;ticks(1);
      ok('operator call summons one finite helper',b.operatorCall&&b.crewSpawned===1&&b.crewActors.length===1);
      b=reset('dredger');b.delhi.operatorPhase(b);b.coverTarget=b.covers[0];b.state='cower';b.coverTarget.hurt(999,1,true,true);
      ok('cover destruction guarantees full guard break',b.guard===0&&b.protectedStagger===90);
      b=reset('dredger');b.delhi.operatorPhase(b);b.state='idle';b.parried(0,1);ticks(45);ticks(120);
      ok('normal parry cannot strand operator in recovery',b.state!=='recover'||b.t<90);
      b=reset('dredger');b.winch.hurt(999,1,true,true);b.pump.hurt(999,1,true,true);ticks(20);
      const beforeDirect=b.hp;b.hurt(10,1,false,false);
      ok('machine without winch or pump remains directly actionable',b.phase==='operator'||b.z===0&&b.hp<beforeDirect);

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
