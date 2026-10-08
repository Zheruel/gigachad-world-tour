// Boss mechanics: the Conductor (parry/guard, DENIED, VOID, SEIZED, brake chain) and Shera (palm catch, bear hug,
// chain sweep, trunk reflect, floor sources, phase trigger, UNPAID checkpoint, out on his feet -> shera-finish).
const studio=require('./studio_helper.cjs');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage();await studio.openStudio(page,'train/conductor');await studio.seek(page,300);const f=page.frames().find(f=>f.url().includes('?auto=walk'));const out=await f.evaluate(async()=>{const g=__game,G=g.G,{updateBoss}=await import('./js/bosses.js'),checks=[];const ok=(n,v)=>checks.push([n,!!v]);g.trainScene('conductor',300);let b=G.boss;b.parried(0,1);ok('parry removes one guard and protects45',b.guard===2&&b.protectedStagger===45);for(let i=0;i<3;i++)b.hurt(1,1,false,false);ok('followup cannot overwrite stagger',b.state==='stagger'&&b.protectedStagger===45);for(let i=0;i<45;i++)updateBoss();b.parried(0,1);for(let i=0;i<45;i++)updateBoss();b.parried(0,1);ok('third parry breaksguard90',b.guard===0&&b.protectedStagger===90);for(let i=0;i<90;i++)updateBoss();ok('guard rebuilds only after opening',b.guard===3&&b.state==='recover');const run=n=>{for(let i=0;i<n;i++)updateBoss();};const fresh=()=>{g.trainScene('conductor',300);const b=G.boss,p=G.player;G.enemies=[];Object.assign(b,{protectedStagger:0,atkCd:999,face:-1,hitLanded:false});Object.assign(p,{invuln:0,state:'idle',x:b.x-50,y:b.y,face:1,guardWindow:0,z:0});return [b,p];};let p;[b,p]=fresh();let hp=p.hp;b.pattern='stamp';b.state='stamp';b.t=4;run(1);ok('DENIED stamp hits and locks the guard',p.hp<hp&&p.guardDenied===150&&!!b.inkDenied);Object.assign(p,{state:'idle',invuln:0,guardWindow:10,guardDenied:60});b.inkDenied.t=90;hp=p.hp;b.state='stamp';b.t=4;b.hitLanded=false;run(1);ok('no parry while DENIED',p.lastDefense!=='parry'&&p.hp<hp);ok('DENIED never refreshes',p.guardDenied===60&&b.inkDenied?.t>=90);[b,p]=fresh();p.guardWindow=10;b.pattern='stamp';b.state='stamp';b.t=4;run(1);ok('parried stamp stamps him VOID and drops the box',p.lastDefense==='parry'&&b.voidT>0&&b.protectedStagger>=140&&!b.hasBox&&!!b.boxLoose);[b,p]=fresh();G.meter=80;b.pattern='seize';b.state='seize';b.t=5;run(40);ok('SEIZED drains the meter into the box',G.meter<5&&b.boxMeter>70);Object.assign(b,{state:'recover',t:0,recoverFor:999});b.dropBox(1);run(30);const m=G.meter;b.boxLoose.hurt(5,1);ok('hitting the loaded box refunds and he dives',G.meter>m&&b.state==='dive');[b,p]=fresh();p.guardWindow=10;hp=p.hp;b.pattern='swing';b.state='swing';b.t=7;run(1);ok('box swing is unblockable',p.hp<hp&&p.lastDefense!=='parry');[b,p]=fresh();Object.assign(b,{hp:b.maxhp*.52,state:'recover',recoverPose:'swing',recoverFor:99,t:0});b.hurt(40,1,true,false);ok('half health is floored until the chain is pulled',b.brakeDue&&b.hp>=b.maxhp*.5-1);[b,p]=fresh();p.guardWindow=10;b.pattern='stamp';b.state='stamp';b.t=4;run(1);for(let i=0;i<6;i++)b.hurt(10,1,false,false);ok('VOID punish is capped by a knockdown',b.state==='down'&&b.voidT===0);[b,p]=fresh();b.superApplying=true;b.hurt(1,1,true,false);b.superApplying=false;Object.assign(b,{protectedStagger:90,state:'stagger'});{const h=b.hp;for(let i=0;i<8;i++)b.hurt(12,1,false,false);ok('super opening pays out like a VOID',b.state==='down'&&h-b.hp<=40);}[b,p]=fresh();b.parryAt=G.time-26;b.pattern='stamp';b.state='stamp';b.t=4;run(1);ok('a parry pressed 26 ticks early is inked TOO EARLY',!!b.inkEarly&&p.lastDefense!=='parry');[b,p]=fresh();b.dropBox();Object.assign(b,{hp:b.maxhp*.45,p2Called:true,pattern:'brake',state:'windup',t:0});run(46);ok('chain is pulled without the box',!b.hasBox&&b.pulls===1&&b.state==='brake');[b,p]=fresh();Object.assign(b,{hp:b.maxhp*.45,p2Called:true,pattern:'brake',state:'windup',t:0});run(46);ok('chain yank lurches the office and slides luggage',b.pulls===1&&!!G.lurch&&b.slideQueue.length+b.slides.length>0&&b.state==='brake');run(30);ok('he is exposed re-hooking the chain',b.state==='rehook');run(125);ok('re-hook ends in recovery',b.state==='recover');
// ---- Shera (carriage) and the UNPAID phase ----
const S=(enraged)=>{g.trainScene('boss',0);const b=G.boss,p=G.player;G.enemies=[];G.shots=[];G.hitstop=0;if(enraged)b.delhi.enrage(b,.8);
 Object.assign(b,{atkCd:999,face:-1,protectedStagger:0,state:'idle',t:0,lights:0,lightAt:-999,palmT:0,floorBy:null,fightT:0});
 Object.assign(p,{invuln:0,state:'idle',x:b.x-50,y:b.y,face:1,guardWindow:0,guardDenied:0,z:0,vz:0,hp:100,grabbedBy:null,dying:false,mash:0});return [b,p];};
const clamp=(v,a,z)=>Math.max(a,Math.min(z,v)),PAY_CLOSE=34;
const U=n=>{for(let i=0;i<n;i++){G.hitstop=0;updateBoss();}};
const hurtF=(b,dmg,heavy,launch)=>b.hurt(dmg,-b.face,heavy,launch);
{let [b,p]=S(false);b.state='count';b.t=10;for(let i=0;i<3;i++)hurtF(b,4,false,false);const st3=b.state;hurtF(b,4,false,false);
 ok('palm catch takes the 4th light after 3 (calm)',st3!=='catch'&&b.state==='catch'&&p.state==='held');}
{let [b,p]=S(true);b.state='roar';b.t=4;for(let i=0;i<2;i++)hurtF(b,4,false,false);const st2=b.state;hurtF(b,4,false,false);
 ok('palm catch takes the 3rd light after 2 (UNPAID)',st2!=='catch'&&b.state==='catch'&&p.state==='held');}
for(const [how,set] of [['a timed parry',p=>{p.state='parry';p.guardWindow=10;}],['a held guard',p=>{p.state='parry';}]]){
 let [b,p]=S(false);set(p);p.x=b.x-40;Object.assign(b,{state:'hug',t:0,pattern:'hug'});for(let i=0;i<12&&b.state==='hug';i++){if(how==='a timed parry')p.guardWindow=10;U(1);}
 ok(`bear hug grabs through ${how}`,b.state==='hughold'&&p.grabbedBy===b);}
{let [b,p]=S(true);p.x=b.x-60;Object.assign(b,{state:'chain',t:0,pattern:'chain',chainY:b.y,hitLanded:false});const hp=p.hp;for(let i=0;i<16;i++){p.z=20;U(1);}
 ok('chain sweep passes under a jumping CHAD',p.hp===hp&&b.state==='snag');}
{let [b,p]=S(true);p.x=b.x-60;p.y=b.y+10;Object.assign(b,{state:'chain',t:0,pattern:'chain',chainY:b.y,hitLanded:false});const hp=p.hp;U(16);
 ok('chain sweep still catches CHAD after a lane change',p.hp<hp);}
for(const parry of [false,true]){let [b,p]=S(false);p.x=b.x-80;b.pd=0;Object.assign(b,{state:'pound',t:60,pattern:'pound',face:-1});const hp=p.hp,x0=b.x;
 for(let i=0;i<14;i++){if(parry&&b.t>=68){p.state='parry';p.guardWindow=10;}U(1);}
 ok(parry?'hammer lunges in from hook range and a timed parry turns it':'hammer lunges in and lands from hook range',x0-b.x>30&&(parry?p.hp===hp&&p.lastDefense==='parry':p.hp<hp));}
{let [b,p]=S(true);const q=b.fightProps.find(o=>!o.broken);b.x=q.x+30;b.y=q.y;p.x=b.x-120;p.y=b.y;Object.assign(b,{state:'hurl',t:0,pattern:'hurl',trunk:q});
 const hp0=b.hp;let reflected=false,maxStag=0;
 for(let i=0;i<120;i++){const s=G.shots.find(s=>s.netaTrunk);if(s&&!s.reflected&&Math.abs(s.x-p.x)<30){p.guardWindow=10;p.state='idle';}if(s?.reflected)reflected=true;G.hitstop=0;g.step(1);maxStag=Math.max(maxStag,b.protectedStagger);if(hp0-b.hp>=29)break;}
 ok('reflected trunk does 30 and staggers him 70',reflected&&hp0-b.hp>=29&&maxStag>=60&&b.state==='stagger');}
{let [b,p]=S(false);Object.assign(b,{state:'stagger',protectedStagger:40});hurtF(b,20,true,true);const noFloor=b.state!=='down';
 [b,p]=S(false);b.parried(0,1);hurtF(b,20,true,true);ok('floors only on an allowed source (uppercut no, riposte yes)',noFloor&&b.state==='down');}
{let [b,p]=S(false);const n=b.ally;p.x=b.x-120;b.hp=b.maxhp*.5;Object.assign(b,{state:'pound',t:5,pattern:'pound'});n.st='back';U(1);const waited=b.state==='pound';
 Object.assign(b,{state:'idle',t:0,atkCd:999});n.st='back';U(1);ok('phase trigger waits for a safe beat',waited&&b.state==='abandon'&&n.st==='flee');
 ok('at 50% Netaji fires Shera (USELESS! YOU\'RE FIRED, SHERA!)',b.speech?.who==='neta'&&/FIRED, SHERA/.test(b.speech.text));
 for(let i=0;i<600&&!(b.enragedShera&&b.netaFled);i++)U(1);ok('Netaji flees up the ladder and Shera goes UNPAID',b.enragedShera&&b.netaFled&&!b.ally&&G.train.sheraRage);
 g.trainCheckpoint();const r=G.boss;ok('UNPAID checkpoint restores him at 45% with Netaji gone',r&&r.enragedShera&&Math.abs(r.hp/r.maxhp-.45)<.01&&!r.ally);}
{let [b,p]=S(true);Object.assign(b,{state:'stagger',protectedStagger:30});hurtF(b,b.hp+50,true,false);b.superLocked=true;p.state='special';U(3);
 ok('out on his feet waits for the super to land',b.finishPending&&!b.outFeet&&!G.train.cinematic);
 b.superLocked=false;p.state='idle';U(3);ok('then he stands out on his feet (no finisher yet)',b.outFeet&&b.state==='outfeet'&&!G.train.cinematic);
 const h=b.hp;hurtF(b,40,true,true);ok('out on his feet takes no hits',b.hp===h&&b.state==='outfeet');
 U(40);ok('the shera-finish cinematic follows',G.train.cinematic?.kind==='shera-finish'&&b.roof);}
// Netaji never touches CHAD in phase 1: a long run with CHAD in reach of nothing but Netaji; he pays and heckles only.
{let [b,p]=S(false);const n=b.ally;n.payCd=60;p.x=b.x+150;p.y=b.y;let paid=false,shots=0,minHp=p.hp,minDist=1e9;
 for(let i=0;i<3600;i++){b.atkCd=999;G.hitstop=0;updateBoss();Object.assign(p,{x:clamp(p.x,G.camX+30,G.camX+450),invuln:0});if(b.paid)paid=true;shots+=G.shots.filter(s=>s.source===n).length;minHp=Math.min(minHp,p.hp);minDist=Math.min(minDist,Math.abs(n.x-p.x)+Math.abs(n.y-p.y));p.x+=Math.sin(i/90)*1.5;}
 ok('Netaji never damages CHAD in phase 1 (60 s, he still pays Shera)',minHp===100&&shots===0&&n.decor&&paid);}
{let [b,p]=S(false);b.delhi.demo(b,'paid');U(PAY_CLOSE+2);ok('an untouched bonus hand-off buffs Shera (PAID)',b.paid>0&&b.state==='bonus');
 [b,p]=S(false);b.delhi.demo(b,'paid');U(18);hurtF(b,6,false,false);ok('a hit before his hand closes DENIES the bonus (floorable stagger)',!b.paid&&b.state==='stagger'&&b.floorBy==='denied'&&b.protectedStagger>0);
 [b,p]=S(false);b.delhi.demo(b,'paid');U(PAY_CLOSE+20);Object.assign(b,{state:'stagger',protectedStagger:30,floorBy:'riposte'});hurtF(b,20,true,true);ok('flooring a PAID Shera cuts the pay',b.state==='down'&&!b.paid);}
// A super on an UNPAID Shera: every victim cell drawn is from the red set.
{let [b,p]=S(true);const c=document.createElement('canvas').getContext('2d');p.x=b.x-50;G.meter=100;g.press('super');g.step(1);g.release('super');const cells=[];
 for(let i=0;i<80&&(p.state==='special'||i<2);i++){G.hitstop=0;g.step(1);b.delhi.draw(c,b,G.camX);if(b.superLocked)cells.push(b.drawnCell);}
 ok('UNPAID Shera stays red through a super',cells.length>10&&cells.every(s=>/^rage_|^(chain|hurl)/.test(s)));}
// Knocked out he is a statue: no slide, no sway, one cell until the finisher.
{let [b,p]=S(true);const c=document.createElement('canvas').getContext('2d');Object.assign(b,{state:'stagger',protectedStagger:30});b.vx=3;hurtF(b,b.hp+50,true,false);U(2);
 const xs=new Set(),cells=new Set(),ys=new Set();for(let i=0;i<36;i++){U(1);b.delhi.draw(c,b,G.camX);xs.add(b.x);ys.add(b.y);cells.add(b.drawnCell);}
 ok('KO freezes him (position and pose)',b.outFeet&&xs.size===1&&ys.size===1&&cells.size===1);}
return checks;});console.log(JSON.stringify(out));assert(out.every(x=>x[1]),JSON.stringify(out.filter(x=>!x[1])));}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
