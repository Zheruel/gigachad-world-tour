const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const results=await page.evaluate(async()=>{
 const g=__game,G=g.G,{resolveIncomingHit,updatePlayer,startSuper,rewardAttack}=await import('./js/player.js'),{updateEnemies}=await import('./js/enemies.js'),{createBoss,updateBoss}=await import('./js/bosses.js'),{updateShots,spawnShot}=await import('./js/shots.js');
 const out=[],check=(n,v)=>out.push([n,!!v]);
 function setup(){g.trainScene('general');G.freezeTime=true;G.enemies=[];G.boss=null;G.player.invuln=0;G.player.x=3200;G.player.y=220;G.player.face=1;G.camX=3000;G.meter=100;G.hitstop=0;return G.player;}
 let p=setup(),e=g.spawn('nr_tough',35,0);e.state='attack';g.press('parry');updatePlayer(p);check('fresh press grants twenty ticks',p.guardWindow===20);
 check('timed parry consumes attack',resolveIncomingHit(p,e,{parryClass:'counter',dmg:20})&&p.hp===100&&p.lastDefense==='parry');
 check('parry protects punish for45',e.protectedStagger===45&&p.counterT===90);
 e.hurt(2,1,true,false);for(let i=0;i<44;i++)updateEnemies();check('followup cannot erase stagger',e.protectedStagger===1&&e.state==='stagger');
 p.state='parry';p.guardWindow=0;check('held guard does not parry again',resolveIncomingHit(p,e,{parryClass:'counter',dmg:19})&&p.hp===98&&p.lastDefense==='guard');
 check('red bypasses guard',!resolveIncomingHit(p,e,{parryClass:'unblockable',dmg:19}));
 e.x=p.x-25;check('rear strike bypasses frontal guard',!resolveIncomingHit(p,e,{parryClass:'counter',dmg:19}));
 p.state='idle';p.guardWindow=20;check('timed parry catches a rear strike and turns',resolveIncomingHit(p,e,{parryClass:'counter',dmg:19})&&p.lastDefense==='parry'&&p.face===-1);
 p=setup();p.state='attack';p.guardWindow=20;check('tapped parry works mid-attack without holding',resolveIncomingHit(p,e,{parryClass:'counter',dmg:19})&&p.lastDefense==='parry'&&G.parrySlow>0);
 p=setup();check('invalid super preserves meter',!startSuper(p)&&G.meter===100);e=g.spawn('nr_heavy',48,0);e.state='idle';const other=g.spawn('nr_tough',52,0);other.state='idle';const hp=e.hp,ohp=other.hp;
 check('super locks nearest valid target',startSuper(p)&&p.specialTarget===e&&e.superLocked);
 const ehp=e.hp;e.hurt(10,1,true,true);check('super target protected from unrelated hits',e.hp===ehp);
 for(let i=0;i<101;i++)updatePlayer(p);
 check('super deals36 to one enemy',hp-e.hp===36&&other.hp===ohp);check('super releases target',!e.superLocked&&!p.specialTarget&&p.state==='idle');
 p=setup();let b=createBoss('conductor',3250,220);b.state='idle';b.x=3250;b.y=220;
 startSuper(p);let bhp=b.hp;for(let i=0;i<101;i++)updatePlayer(p);
 check('open-to-supers boss takes full super36, guard kept',!p.superGuarded&&bhp-b.hp===36&&b.guard===3);
 p=setup();b=createBoss('conductor',3250,220);b.state='idle';b.x=3250;b.y=220;b.openToSupers=false;
 startSuper(p);bhp=b.hp;for(let i=0;i<73;i++)updatePlayer(p);
 check('guarded boss super18 and break',bhp-b.hp===18&&b.guard===0&&b.protectedStagger>=90);
 p=setup();b=createBoss('neta',3250,220);b.state='idle';g.press('parry');updatePlayer(p);resolveIncomingHit(p,b,{parryClass:'counter',dmg:10});check('one parry removes one guard point',b.guard===2);
 for(let j=0;j<2;j++){p.state='parry';p.guardWindow=12;resolveIncomingHit(p,b,{parryClass:'counter',dmg:10});}check('third parry breaks90',b.guard===0&&b.protectedStagger===90);
 b.hurt(2,1,false,false);updateBoss();check('boss punish survives hits',b.protectedStagger===89&&b.state==='stagger');
 p=setup();G.meter=0;rewardAttack(p,'launcher',6);check('variety bonus50percent',G.meter===9);rewardAttack(p,'launcher',6);check('repeat retains base meter',G.meter===15);
 p=setup();g.press('parry');p.state='parry';p.guardWindow=0;spawnShot('bullet',p.x,p.y,0,10,{parryClass:'reflect'});updateShots();check('guard absorbs without reflecting projectile',G.shots.length===0&&p.hp===99);
 // CHAD has no grab or throw (removed game-wide): a close use never takes hold, and a follow-up attack is an ordinary strike.
 p=setup();e=g.spawn('nr_tough',28,0);e.state='idle';e.atkCd=999;g.press('use');updatePlayer(p);check('close use never grabs',!['grabbing','throwing'].includes(p.state)&&!p.grabTarget&&e.state!=='grabbed');g.resetInput();
 for(let i=0;i<8;i++)updatePlayer(p);g.press('attack');updatePlayer(p);g.resetInput();for(let i=0;i<8;i++)updatePlayer(p);check('attack never throws',e.state!=='thrown'&&!p.grabTarget&&p.state!=='throwing');
 p=setup();e=g.spawn('nr_tough',40,0);e.state='idle';e.hp=100;startSuper(p);G.paused=true;const st=p.superT;g.step(20);check('pause holds super timeline',p.superT===st);G.paused=false;p.state='idle';updatePlayer(p);check('interruption releases super ownership',!e.superLocked&&!p.specialTarget);
 return out;
 });console.log(JSON.stringify({checks:results.length,failures:results.filter(x=>!x[1]),errors}));assert(results.every(x=>x[1]));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
