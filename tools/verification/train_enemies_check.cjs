// Night Train families: one job and one answer each, deterministic, plus the boss rule changes.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:'+(process.env.PORT||8011)+'/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out=await page.evaluate(async()=>{
  const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  const {updateEnemies}=await import('./js/enemies.js'),{updateBoss}=await import('./js/bosses.js'),{updateShots}=await import('./js/shots.js');
  const arena=(area='general')=>{g.trainScene(area,0);g.resetInput();Object.assign(G,{enemies:[],shots:[],effects:[],pickups:[],props:[],boss:null,hitstop:0,swingAt:-99,locked:true,camLock:G.camX});Object.assign(G.player,{x:G.camX+150,y:226,z:0,face:1,state:'idle',invuln:0,hp:G.player.maxhp,dying:false});return G.player;};
  const tick=(n=1)=>{for(let i=0;i<n;i++){G.time++;updateEnemies();updateShots();}};
  const until=(f,n=600)=>{for(let i=0;i<n;i++){if(f())return true;G.player.invuln=999;tick();}return f();};
  const duel=(kind,dx=40)=>{const e=g.spawn(kind,dx,0);e.state='idle';e.atkCd=1;return e;};
  // Attack classes: plain opener then green follow-up, green/reflect answers, red commitments.
  const classes=(kind,dx,prep)=>{arena();const e=duel(kind,dx);prep?.(e);until(()=>e.state==='windup');return [e.move,e.cls,e];};
  let [m,c,e]=classes('nr_brawler');ok('brawler opens plain',m==='string'&&c==='plain');until(()=>e.state==='attack'&&e.t===14);ok('brawler string stays plain',e.cls==='plain');
  e.swings=2;e.state='idle';e.atkCd=1;until(()=>e.state==='windup');ok('brawler front kick every third swing is green',e.move==='fkick'&&e.cls==='counter');
  arena();e=duel('nr_brawler',60);e.atkCd=999;e.hurt(40,1,true,false);e.hp=e.maxhp;e.z=0;e.vz=0;e.state='getup';e.t=0;let gt=0;while(e.state==='getup'&&gt<60){tick();gt++;}ok('train getup takes about 26 frames',gt>=24&&gt<=28);
  [m,c]=classes('nr_runner',70);ok('pickpocket dash is green',m==='dash'&&c==='counter');
  [m,c]=classes('nr_bruiser',120);ok('coolie hurls a reflectable trunk',m==='hurl'&&c==='reflect');
  [m,c]=classes('nr_bruiser',40);ok('coolie rams red up close',m==='ram'&&c==='unblockable');
  [m,c]=classes('nr_chai',140);ok('chai lob reflects',m==='lob'&&c==='reflect');
  [m,c,e]=classes('nr_rack',40);ok('floor thief steps out and pounces green',m==='pounce'&&c==='counter'&&Math.abs(e.x-G.player.x)>=78);
  e.state='idle';e.atkCd=1;until(()=>e.state==='windup');ok('then swings his sack green',e.move==='swing'&&e.cls==='counter');
  [m,c]=classes('nr_heavy',90);ok('smuggler crate ram is red',m==='cram'&&c==='unblockable');
  [m,c]=classes('nr_guard',50);ok('constable lathi is green',m==='lathi'&&c==='counter');
  [m,c,e]=classes('nr_bodyguard',40);ok('bodyguard jab opens plain',m==='jab'&&c==='plain');until(()=>e.state==='attack'&&e.t===5);ok('bodyguard cross is green',e.cls==='counter');
  // Paan uncle: a hit mid-chew is absorbed, he backpedals and spits red; a face-full blinds and dazes CHAD, then he wipes: the opening.
  let pq=arena();e=duel('nr_paan',46);e.atkCd=999;e.state='chew';e.t=30;e.chewCd=300;e.hurt(4,1,false,false);ok('paan absorbs a hit mid-chew',e.state==='absorb');
  until(()=>e.state==='windup');ok('paan counter is a red spit',e.move==='spit'&&e.cls==='unblockable');
  until(()=>e.state==='attack');ok('paan backpedals to spitting distance',Math.abs(e.x-pq.x)>=54);
  pq.invuln=0;for(let i=0;i<20&&!(pq.blind>0);i++)tick();ok('paan spit blinds and dazes',pq.blind>0&&pq.blindKind==='paan'&&pq.state==='hurt');
  for(let i=0;i<30&&e.state!=='wipe';i++)tick();ok('paan wipes his mouth after the spit',e.state==='wipe');
  arena();e=duel('nr_paan',46);e.atkCd=999;e.state='chew';e.t=0;e.chewCd=300;until(()=>e.state!=='chew',200);ok('crowding a chewing paan uncle earns the spit',e.state==='windup'&&e.move==='spit');
  // Black-cat commando: plain baton then green re-chop, green lunge, red sweep; hurt, he radios and his partner steps in.
  [m,c,e]=classes('nr_commando',40);ok('commando baton opens plain',m==='baton'&&c==='plain');until(()=>e.state==='attack'&&e.t===7);ok('commando second chop is green',e.cls==='counter');
  e.swings=1;e.state='idle';e.atkCd=1;until(()=>e.state==='windup');ok('commando lunge is green',e.move==='lunge'&&e.cls==='counter');
  e.swings=2;e.state='idle';e.atkCd=1;until(()=>e.state==='windup');ok('commando sweep is red',e.move==='sweep'&&e.cls==='unblockable');
  let q=arena();e=duel('nr_commando',60);e.atkCd=999;let e2=duel('nr_commando',-80);e2.atkCd=300;e.hurt(Math.ceil(e.maxhp*.45),1,false,false);until(()=>e.state==='rally',40);
  ok('hurt commando radios his partner',e.state==='rally');ok('partner side-steps in to cover',until(()=>e2.state==='coverstep',40));
  q=arena();e=duel('nr_commando',60);e2=duel('nr_commando',66);e.atkCd=e2.atkCd=400;until(()=>Math.sign(e.x-q.x)!==Math.sign(e2.x-q.x),300);ok('commando pair splits round CHAD',Math.sign(e.x-q.x)!==Math.sign(e2.x-q.x));
  // Against a passive CHAD a black-cat pair (alone or with their captain) keep swinging in turn: each at least twice, never stacked (|dx|<36, |dy|<=26) over 40 ticks.
  const pairRun=(px,list,N=700)=>{const q=arena();q.x=G.camX+px;const es=list.map(([k,dx,dy,cd])=>{const e=g.spawn(k,dx,dy);e.state='idle';e.atkCd=cd;return e;}),cm=es.filter(e=>e.trainType==='nr_commando'),sw=es.map(()=>0),pv=es.map(()=>'');let run=0,worst=0;
    for(let t=0;t<N;t++){q.invuln=999;tick();es.forEach((e,i)=>{if(e.state==='windup'&&pv[i]!=='windup')sw[i]++;pv[i]=e.state;});
      run=cm.every(e=>!e.dead&&['idle','approach','windup','attack','backoff'].includes(e.state))&&Math.abs(cm[0].x-cm[1].x)<36&&Math.abs(cm[0].y-cm[1].y)<=26?run+1:0;worst=Math.max(worst,run);}
    return sw.every(n=>n>=2)&&worst<=40;};
  for(const [n,px,l,N] of [['second one behind',110,[['nr_commando',200,0,20],['nr_commando',150,-14,40]]],['mirrored',370,[['nr_commando',-200,0,20],['nr_commando',-150,-14,40]]],['a lane below',110,[['nr_commando',200,0,20],['nr_commando',150,14,40]]],
    ['close together',110,[['nr_commando',60,0,20],['nr_commando',66,4,40]]],['on one spot',240,[['nr_commando',90,0,5],['nr_commando',92,0,5]]],['either side',240,[['nr_commando',40,-20,20],['nr_commando',50,20,40]]],
    ['from across the carriage',60,[['nr_commando',300,-10,1],['nr_commando',330,12,1]],900],['with their captain',110,[['nr_captain',220,0,30],['nr_commando',200,-14,20],['nr_commando',160,12,40]],900]])
    ok('commando pair takes turns, never stacked ('+n+')',pairRun(px,l,N));
  // The black-cat group's slots (QA acceptance, its five scenarios): each man swings at least twice; no commando stands within
  // 16px along and 12px across of CHAD outside a swing or CHAD down; no walk cell is held 8 ticks while he moves 8px; no stride
  // turns round after a run under 12 ticks (a planted cell held standing is no run); two of them are stacked (36px along, 26px
  // across) under 30 ticks in all; no guard cell shows a single tick on his feet; out of a swing no boot jumps over 6px.
  const {drawEnemy}=await import('./js/enemies.js'),AF=await import('./js/aiframes.js'),man=await (await fetch('assets/frames/manifest.json')).json(),cellIm=new Map();
  const cv=document.createElement('canvas');cv.width=960;cv.height=540;const cx=cv.getContext('2d');let drawn=null,soles=null;const odraw=cx.drawImage.bind(cx);
  // (his soles on screen: the edges of the boot runs in the frame's bottom rows, 289-293 of 300, through the draw transform)
  const runsOf=new Map(),solesOf=im=>{if(!runsOf.has(im)){const W=im.width,H=im.height,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0);
      const y0=Math.floor(H*289/300),y1=Math.floor(H*293/300),d=x.getImageData(0,y0,W,y1-y0+1).data,on=u=>{for(let v=0;v<=y1-y0;v++)if(d[(v*W+u)*4+3]>128)return true;return false;},E=[];let r=-1;
      for(let u=0;u<=W;u++){const o=u<W&&on(u);if(o&&r<0)r=u;if(!o&&r>=0){E.push(r,u-1);r=-1;}}runsOf.set(im,E);}return runsOf.get(im);};
  cx.drawImage=(im,...a)=>{if(!drawn&&cellIm.has(im)){drawn=cellIm.get(im);const [dx,dy,dw]=a.length>=8?[a[4],a[5],a[6]]:a.length>=4?a:[a[0],a[1],im.width],m=cx.getTransform();
      soles=solesOf(im).map(u=>m.a*(dx+u*dw/im.width)+m.c*dy+m.e);}return odraw(im,...a);};
  const cellOf=e=>{const key=e.set._aiKey;if(!cellIm.has('k'+key)){cellIm.set('k'+key,1);const fam=man[e.trainType];for(const st of Object.keys(fam)){const a=AF.getAIFrame(key,st);if(!a)continue;[a.f,a.fl].forEach(L=>L.forEach((im,i)=>{if(!cellIm.has(im))cellIm.set(im,fam[st][i].split('/')[1].slice(0,-4));}));}}
    drawn=null;soles=null;cx.save();try{drawEnemy(cx,e,G.camX);}catch(x){}cx.restore();return drawn||'?';};
  // (the most planted boot's move between two cells: the least shift of any sole edge)
  const soleShift=(A,B)=>A?.length&&B?.length?Math.min(...A.map(a=>Math.min(...B.map(b=>Math.abs(a-b))))):0;
  const groupRun=(px,list,N,step,opt={})=>{const p=arena();p.x=G.camX+px;G.time=12000;   // (the family AI keys its choices off the clock: pinned, so the case is reproducible)
    const es=list.map(([k,dx,dy,cd])=>{const e=g.spawn(k,dx,dy);e.state='idle';e.atkCd=cd;return e;});
    const sw=es.map(()=>0),pv=es.map(()=>''),rec=es.map(()=>[]),bad=[],sws=[],LOC=['idle','approach','backoff'],px0=es.map(e=>e.x);let stack=0,near=0,tauntOn=0,fast=0;
    for(let t=0;t<N;t++){if(p.state!=='down'&&p.state!=='getup')p.invuln=999;step?.(t,p,es);G.time++;updateEnemies();updateShots();
      es.forEach((e,i)=>{if(e.state==='windup'&&pv[i]!=='windup'){sw[i]++;sws.push(t);}
        // (walking or waiting, a group member never moves faster along the carriage than he walks: backing off or hurrying in from
        // far off after a long wait, a little quicker)
        if(t>2&&!e.dead&&LOC.includes(e.state)&&LOC.includes(pv[i])&&Math.abs(e.x-px0[i])>e.speed*(e.state==='backoff'?1.4:e.hurry||1)+.1)fast++;px0[i]=e.x;pv[i]=e.state;
        rec[i].push([t,e.x,e.y,e.dead?'':cellOf(e),e.state,soles]);
        if(e.state==='taunt'&&Math.abs(e.x-p.x)<16&&Math.abs(e.y-p.y)<12)tauntOn++;
        // (the tick a swing ends, with CHAD walking into him, is part of the swing)
        if(['windup','attack'].includes(e.state))e.qaSwingT=t;
        if(e.trainType==='nr_commando'&&!e.dead&&!['windup','attack','down','thrown','getup','hurt','dying','fall'].includes(e.state)&&!(t-(e.qaSwingT??-9)<=1)&&!['down','getup'].includes(p.state)&&Math.abs(e.x-p.x)<16&&Math.abs(e.y-p.y)<12)near++;});
      if(es.some((a,i)=>es.some((c,j)=>j>i&&!a.dead&&!c.dead&&Math.abs(a.x-c.x)<36&&Math.abs(a.y-c.y)<=26)))stack++;}
    // (walk and side-step cells each show two ticks or more: a one-tick cell between two others is a flash)
    let one=0;rec.forEach(R=>{for(let k=1;k<R.length-1;k++)if(/^([wl]_|s_0)/.test(R[k][3])&&R[k][3]!==R[k-1][3]&&R[k][3]!==R[k+1][3])one++;});
    // (nor his guard between two steps or out of a swing into one: an idle cell shows two ticks or more on his feet)
    let oneIdle=0;rec.forEach(R=>{for(let k=1;k<R.length-1;k++)if(/^(a_00|idle_breath)$/.test(R[k][3])&&LOC.includes(R[k][4])&&R[k][3]!==R[k-1][3]&&R[k][3]!==R[k+1][3]&&!['down','getup'].includes(R[k+1][4]))oneIdle++;});
    // (out of a swing, a commando's boots never jump more than 6px as he comes back to his guard)
    let pop=0;rec.forEach((R,i)=>{if(es[i].trainType!=='nr_commando')return;let rec0=-99;for(let k=1;k<R.length;k++){if(['windup','attack'].includes(R[k-1][4])&&LOC.includes(R[k][4]))rec0=k;
      if(k-rec0<8&&R[k][3]!==R[k-1][3]&&!/^w_/.test(R[k][3])&&soleShift(R[k-1][5],R[k][5])>6)pop++;}});
    const gaps=[...sws,N].map((x,j,a)=>x-(j?a[j-1]:0));
    let held=0,rev=0;rec.forEach((R,i)=>{if(es[i].trainType!=='nr_commando')return;let s=0;for(let k=1;k<=R.length;k++){if(k<R.length&&R[k][3]===R[s][3])continue;if(/^w_/.test(R[s][3])&&k-s>=8&&Math.hypot(R[k-1][1]-R[s][1],R[k-1][2]-R[s][2])>8)held++;s=k;}
      let prev=null,dir=0,ds=0,px=null,py=null;for(const [t,x,y,c] of R){const still=x===px&&y===py;px=x;py=y;if(!/^w_/.test(c)||still){prev=null;dir=0;continue;}const n=+c.slice(2);if(prev!==null&&n!==prev){const d=((n-prev)%20+20)%20<10?1:-1;if(dir&&d!==dir){if(t-ds<12)rev++;ds=t;}else if(!dir)ds=t;dir=d;}prev=n;}});
    if(!sw.every(n=>n>=2))bad.push('swings '+sw.join('/'));if(near)bad.push('on CHAD '+near);if(held)bad.push('held cells '+held);if(rev)bad.push('reversals '+rev);if(stack>=30)bad.push('stacked '+stack);
    if(tauntOn)bad.push('taunting on CHAD '+tauntOn);if(fast)bad.push('ticks over walking pace '+fast);if(opt.one&&one)bad.push('one-tick cells '+one);if(oneIdle)bad.push('one-tick guard cells '+oneIdle);if(pop)bad.push('boots popping out of a swing '+pop);
    if(opt.turns&&!(sws[0]<=150&&Math.max(...gaps)<=200))bad.push('first swing '+sws[0]+', longest wait '+Math.max(...gaps));return bad;};
  const CM='nr_commando',CP='nr_captain';
  // (CHAD knocked flying through the pair: nobody taunts over him till he has landed, nor standing on him)
  const knock=(at,dir)=>(i,p)=>{if(i===at)Object.assign(p,{state:'down',t:0,groundT:0,z:1,vz:3,vx:dir*2.4});
    if(p.state==='down'){if(p.z>0||p.vz){p.x+=p.vx;p.z=Math.max(0,p.z+p.vz);p.vz=p.z>0?p.vz-.5:0;if(!p.z)p.vx=0;}else if(++p.groundT>40)Object.assign(p,{state:'idle',t:0});}};
  for(const [n,px,l,N,step,opt] of [
    ['trio',110,[[CM,200,0,20],[CM,150,-14,40],[CP,220,10,80]],900,null,{turns:1}],
    ['trio2',110,[[CM,200,0,60],[CM,-150,10,10],[CP,180,-12,40]],900,(i,p)=>{if(i>300&&i<360)p.x+=1.2;},{turns:1}],
    ['mix3',110,[[CP,200,0,20],[CM,150,-14,40],[CM,-120,12,60]],900,null,{one:1}],
    ['knockdown',110,[[CM,200,0,20],[CM,150,-14,40]],700,knock(150,1)],
    ['pair',110,[[CM,200,0,20],[CM,150,-14,40]],900],['pairB',110,[[CM,200,0,60],[CM,-160,20,10]],700],
    ['pairmove',110,[[CM,200,0,20],[CM,150,-14,40]],700,(i,p)=>{if(i>200&&i<260)p.x+=1.5;if(i>400&&i<440)p.y=Math.max(206,p.y-.8);if(i>500&&i<560)p.x-=1.5;}],
    ['mix',110,[[CM,200,0,20],[CP,150,-14,40]],900],
    ['pairdown',110,[[CM,200,0,9999],[CM,150,-14,40]],400,(i,p,es)=>{if(i<60)es[0].atkCd=9999;if(i===60)Object.assign(p,{state:'down',t:0,groundT:0,z:0});if(p.state==='down')p.groundT++;if(i===120)Object.assign(p,{state:'getup',t:0});if(i===146)Object.assign(p,{state:'idle',t:0});}]]){
    const f=groupRun(px,l,N,step,opt);ok('black-cat group holds its slots ('+n+')'+(f.length?': '+f.join(', '):''),!f.length);}
  // (alone too: out of each of his three swings a commando comes back to his guard with his boots within 6px)
  for(const [n,sws] of [['baton',0],['lunge',1],['sweep',2]]){const p=arena();p.invuln=999;const e=duel('nr_commando',40);e.swings=sws;G.time=12000;let pv=null,rec0=-99,worst=0;
    for(let t=0;t<200;t++){p.invuln=999;tick();const c=cellOf(e),S=soles,st=e.state;if(pv){if(['windup','attack'].includes(pv[1])&&['idle','approach','backoff'].includes(st))rec0=t;
      if(t-rec0<8&&c!==pv[0]&&!/^w_/.test(c))worst=Math.max(worst,soleShift(pv[2],S));}pv=[c,st,S];if(t-rec0>=8&&rec0>0)break;}
    ok('commando '+n+' recovers to his guard without a boot pop ('+worst.toFixed(1)+'px)',rec0>0&&worst<=6);}
  // Plain hits: a timed tap deflects them (no damage, a little meter, a recoil, no riposte); a whiff still locks.
  let p=arena();e=duel('nr_brawler',30);Object.assign(e,{state:'attack',move:'string',cls:'plain',t:4,face:-1,x:p.x+30,y:p.y});Object.assign(p,{guardWindow:20,counterT:0});Object.assign(G,{parrySlow:0,meter:0});const hp0=p.hp;tick();
  ok('plain jab is deflected by a timed parry',p.hp===hp0&&p.lastDefense==='deflect'&&!(p.counterT>0)&&!(G.parrySlow>0));
  ok('a deflect pays less meter than a parry',G.meter>0&&G.meter<12);
  ok('deflected brawler recoils out of his string without a stagger',e.state==='hurt'&&!(e.protectedStagger>0)&&e.vx>0);
  p.invuln=0;tick(14);ok('the deflected string is not finished',p.hp===hp0&&e.state!=='attack');
  p=arena();e=duel('nr_brawler',30);Object.assign(e,{state:'attack',move:'string',cls:'plain',t:4,face:-1,x:p.x+30,y:p.y});g.press('parry');p.state='parry';p.guardWindow=0;tick();g.release('parry');ok('a held guard still chips a plain jab',p.lastDefense==='guard'&&p.hp<hp0);
  p=arena();p.guardWindow=1;p.parryLock=0;g.step(1);ok('a whiffed tap still locks the next',p.parryLock>0);
  p=arena();e=duel('nr_brawler',30);Object.assign(e,{state:'attack',move:'string',cls:'plain',t:4,face:-1,x:p.x+30,y:p.y});Object.assign(p,{guardWindow:12,parryMashed:true});tick();ok('a mashed window does not deflect',p.hp<hp0&&p.lastDefense!=='deflect');
  // Captain: the shield stops a frontal light; red taser from range; a red charge that runs on to the carriage end and
  // sticks there; too close to run, a green bash; at half health he radios one commando, who walks in from off-screen.
  p=arena();e=duel('nr_captain',40);e.atkCd=999;e.face=-1;const capHp=e.hp;e.hurt(4,1,false,false);ok('captain shield blocks a frontal light',e.state==='block'&&e.hp===capHp);
  tick(6);e.hurt(4,1,false,false);ok('a mashed string into the shield earns his green bash',e.state==='windup'&&e.move==='bash'&&e.cls==='counter'&&e.hp===capHp);
  e.hurt(4,1,false,false);ok('the shield stays up through the bash',e.state==='windup'&&e.hp===capHp);
  arena();e=duel('nr_captain',40);e.atkCd=999;e.face=-1;e.hurt(4,1,false,false);tick(40);e.state='idle';e.hurt(4,1,false,false);ok('a paused string is only blocked',e.state==='block');
  [m,c]=classes('nr_captain',150);ok('captain tasers red from range',m==='taser'&&c==='unblockable');
  p=arena();e=duel('nr_captain',120);e.swings=1;until(()=>e.state==='windup');ok('captain charge is red',e.move==='charge'&&e.cls==='unblockable');
  p.y+=30;until(()=>e.state==='stuck',300);ok('a dodged charge runs to the carriage end and sticks',e.state==='stuck'&&e.x-G.camX<70);
  arena();e=duel('nr_captain',40);e.swings=1;until(()=>e.state==='windup');ok('too close to charge, he bashes green',e.move==='bash'&&e.cls==='counter');
  p=arena();e=duel('nr_captain',100);e.atkCd=999;tick();Object.assign(e,{state:'windup',move:'bash',t:0,poise:0});e.hurt(Math.ceil(e.maxhp*.55),-e.face,false,false);
  ok('below half health the captain wants his backup',e.wantCall);until(()=>e.state==='rally',60);
  let cmd=null;until(()=>(cmd=G.enemies.find(o=>o.trainType==='nr_commando')),60);ok('backup arrives off-screen',cmd&&cmd.state==='spawn'&&(cmd.x<G.camX||cmd.x>G.camX+480));
  until(()=>cmd.state!=='spawn',80);ok('backup walks in to the fight',cmd.x>G.camX+10&&cmd.x<G.camX+470&&G.enemies.filter(o=>o.trainType==='nr_commando').length===1);
  // Turtling in front of the brawler earns his red shove.
  p=arena();e=duel('nr_brawler',34);e.atkCd=999;p.state='parry';g.press('parry');for(let i=0;i<42;i++){p.state='parry';p.face=1;tick();}g.release('parry');ok('turtle watch builds',e.guardWatch>40);e.atkCd=1;until(()=>e.state==='windup');ok('turtling draws a red shove',e.move==='push'&&e.cls==='unblockable');
  // Runner: an opener dodge with a 240-frame cooldown and i-frames.
  p=arena();e=duel('nr_runner',60);e.atkCd=999;Object.assign(p,{state:'attack',combo:0});let hp=e.hp;e.hurt(5,1,false,false);ok('runner backsteps the opener',e.state==='dodge'&&e.hp===hp&&e.dodgeCd===240);
  e.hurt(5,1,false,false);ok('dodge has i-frames',e.hp===hp);until(()=>e.state!=='dodge',40);e.state='idle';e.hurt(5,1,false,false);ok('cooldown lets the next opener land',e.hp<hp);
  e.dodgeCd=0;e.state='idle';p.combo=2;hp=e.hp;e.hurt(5,1,false,false);ok('mid-string hits are not dodged',e.hp<hp);
  p=arena();G.pickups.push({x:p.x+120,y:p.y,kind:'shake',heal:30,t:0});e=duel('nr_runner',60);e.atkCd=999;until(()=>e.carry,300);ok('pickpocket steals a floor pickup',e.carry&&!G.pickups.length);e.hurt(4,1,true,false);ok('knockdown drops the stolen pickup',!e.carry&&G.pickups.length===1);
  // Coolie: a hurl leaves him unarmed; a knockdown drops the trunk as a breakable prop.
  p=arena();e=duel('nr_bruiser',120);until(()=>e.state==='attack'&&e.t>=5);const trunk=G.shots.find(s=>s.bowl);ok('hurl throws the trunk and disarms',trunk&&e.unarmed&&e.set._aiKey==='nr_bruiser_unarmed'&&e.range===40);
  const pin=duel('nr_tough',60);Object.assign(pin,{atkCd:999,x:trunk.x-e.face*20,y:trunk.y});trunk.reflected=true;trunk.vx=-trunk.vx;tick(3);ok('reflected trunk bowls through the crowd',['down','dying'].includes(pin.state));
  arena();e=duel('nr_bruiser',60);e.hurt(6,1,true,false);ok('knocked-down coolie drops his trunk',e.unarmed&&G.props.some(q=>q.prop==='nr_trunk'&&!q.broken));
  e.atkCd=1;e.state='idle';until(()=>e.state==='windup');ok('unarmed coolie throws a green haymaker',e.move==='punch'&&e.cls==='counter');
  // Ambusher: forced drop with a red landing ring even when CHAD is far away.
  p=arena('sleeper');e=g.spawn('nr_rack',300,0);ok('berth thief perches',e.perched);until(()=>e.state==='drop',300);ok('forced drop by 240 frames',e.state==='drop'&&e.landT>30&&e.cls==='unblockable');until(()=>!['drop'].includes(e.state),80);ok('drop lands in the lane',!e.perched&&e.z===0);
  p=arena('sleeper');e=g.spawn('nr_rack',300,0);e.throwCd=999;e.hurt(2,1,false,false);ok('a light hit rocks him on the berth',e.perched&&e.z===e.perchZ);
  e.perchT=0;e.throwCd=999;e.hurt(3,1,true,false);until(()=>e.z===0,200);ok('a heavy knocks him off into the aisle',!e.perched&&e.y>=221);
  e.hp=e.maxhp;Object.assign(e,{state:'idle',atkCd:999,reclimbed:false,x:G.player.x+260});until(()=>e.state==='perch',400);ok('left alone he climbs back up',e.perched&&e.z===e.perchZ);
  // Smuggler: the crate rides his front, takes three front heavies or a body, and drops when floored.
  p=arena();e=duel('nr_heavy',120);e.atkCd=999;const spawnX=e.rig.x;e.x+=60;tick();ok('crate follows his front',e.rig.carried&&Math.abs(e.rig.x-(e.x+e.face*32))<1&&Math.abs(spawnX-e.rig.x)>40);
  ok('no crate hitbox left at spawn',!G.props.some(q=>!q.broken&&q.hidden&&q!==e.rig));
  e.face=-1;p.x=e.x-50;e.rig.hurt(9,-1,false);e.rig.hurt(9,-1,true);e.rig.hurt(9,-1,true);ok('light and two heavies leave the crate',!e.rig.broken);const score=G.score,meter=G.meter;e.rig.hurt(9,-1,true);ok('third heavy spills contraband',e.rig.broken&&G.score>score&&G.meter>meter&&e.unarmed&&e.set._aiKey==='nr_heavy_unarmed');
  arena();e=duel('nr_heavy',120);e.rig.hurt(20,1,true,false,true);ok('a thrown body breaks the crate',e.rig.broken&&e.unarmed);
  arena();e=duel('nr_heavy',120);e.hurt(10,1,true,false);ok('knockdown drops the crate on the floor',!e.rig.carried&&!e.rig.hidden&&!e.rig.broken&&e.unarmed);e.rig.hurt(20,1);ok('dropped crate breaks normally',e.rig.broken);
  arena();e=duel('nr_heavy',120);e.protectedStagger=45;e.state='stagger';tick();ok('dazed smuggler lets the crate go',e.unarmed);
  // Constable: frontal block, heavy guard break with +50% damage, one whistle below 60%.
  p=arena();e=duel('nr_guard',40);e.atkCd=999;e.face=-1;hp=e.hp;e.hurt(8,1,false,false);ok('front block',e.state==='block'&&e.hp===hp);e.state='idle';e.hurt(10,1,true,false);ok('heavy breaks the guard',e.state==='guardbreak'&&e.gbT===50);
  hp=e.hp;e.hurt(10,1,false,false);ok('guard break takes +50%',hp-e.hp===15);
  p=arena();e=duel('nr_guard',40);e.atkCd=999;const ally=duel('nr_tough',-60);ally.atkCd=300;e.face=-1;e.blockCd=999;e.poise=0;e.hurt(Math.ceil(e.maxhp*.45),1,false,false);ok('below 60% he wants the whistle',e.called&&e.wantCall);until(()=>e.state==='rally',40);until(()=>e.t>=30,40);ok('whistle hurries idle allies',ally.atkCd<=10);
  // TTE: the trunk stops lights from the front; a heavy knocks it loose, he has no guard until he has fetched it back.
  p=arena();e=duel('nr_tte',40);e.atkCd=999;e.face=-1;hp=e.hp;e.hurt(6,1,false,false);ok('tte trunk blocks a front light',e.state==='block'&&e.hp===hp);
  e.state='idle';e.hurt(10,1,true,false);ok('tte heavy knocks the trunk loose',e.state==='guardbreak'&&e.trunk?.loose);
  until(()=>e.state==='fetch',80);e.atkCd=999;hp=e.hp;e.face=-1;e.hurt(4,1,false,false);ok('tte without his trunk takes a front light',e.hp<hp);
  until(()=>!e.trunk.loose,200);ok('tte picks the trunk back up',!e.trunk.loose&&['idle','approach'].includes(e.state));
  arena();e=duel('nr_tte',60);e.swings=0;until(()=>e.state==='windup');ok('tte trunk dash is red',e.move==='bump'&&e.cls==='unblockable');G.player.x=e.x-200;const bx=e.x;until(()=>e.state==='attack'&&e.t>=16);ok('tte trunk dash covers ground',Math.abs(e.x-bx)>=40);
  arena();e=duel('nr_tte',40);e.swings=1;until(()=>e.state==='windup');ok('tte overhead slam is green',e.move==='tslam'&&e.cls==='counter');until(()=>e.state==='attack');ok('tte green cue runs to the slam',e.cueTo===3);
  // Standing on his loose trunk is no hiding place: kept off it, he barges CHAD off it (red), then goes back for it.
  const camp=()=>{arena();const t=duel('nr_tte',40);t.atkCd=999;t.face=-1;t.hurt(10,1,true,false);until(()=>t.state==='fetch'&&t.trunk.z===0,80);Object.assign(G.player,{x:t.trunk.x+4*Math.sign(t.trunk.x-t.x),y:t.y});return t;};
  e=camp();until(()=>e.state==='windup',200);ok('tte kept off his trunk barges, red',e.move==='tbarge'&&e.cls==='unblockable');until(()=>e.state!=='windup'&&e.state!=='attack',60);ok('tte barge goes back for the trunk',['fetch','pickup'].includes(e.state)&&!e.hurtN);
  e=camp();until(()=>e.waitT>5,120);e.poise=0;e.hurt(3,-Math.sign(e.face),false,false);e.hurt(3,-Math.sign(e.face),false,false);ok('tte hit twice while kept off his trunk barges',e.state==='windup'&&e.move==='tbarge');
  // Bodyguard: three quick lights then the fourth is slipped into a green counter hook.
  p=arena();e=duel('nr_bodyguard',40);e.atkCd=999;e.face=-1;hp=e.hp;for(let i=0;i<3;i++){e.state='idle';e.hurt(4,1,false,false);G.time+=10;}const before=e.hp;e.state='idle';e.hurt(4,1,false,false);ok('fourth light is slipped',e.state==='slip'&&e.hp===before);
  p.invuln=0;until(()=>e.state==='windup',20);ok('slip turns into a green hook',e.move==='hook'&&e.cls==='counter');
  arena();e=duel('nr_bodyguard',40);e.atkCd=999;for(let i=0;i<3;i++){e.state='idle';e.hurt(4,1,false,false);G.time+=10;}G.time+=45;e.state='idle';hp=e.hp;e.hurt(4,1,false,false);ok('pausing the string avoids the slip',e.state!=='slip'&&e.hp<hp);
  arena();e=duel('nr_bodyguard',40);for(let i=0;i<3;i++){e.state='idle';e.hurt(4,1,false,false);G.time+=10;}e.state='idle';hp=e.hp;e.hurt(6,1,true,false);ok('a heavy is never slipped',e.hp<hp&&e.lightN===0);
  // Netaji and Shera: two plain hooks into one green hammer; the count is the punish window; guarded jabs answer.
  const pound=(at,gw=0)=>{g.trainScene('boss',0);G.enemies=[];const b=G.boss,p=G.player;Object.assign(b,{state:'pound',pattern:'pound',t:at-1,face:1,protectedStagger:0,hitLanded:false,z:0});Object.assign(p,{x:b.x+50,y:b.y,z:0,state:'idle',invuln:0,guardWindow:gw});G.state='play';G.hitstop=0;updateBoss();return p;};
  p=pound(6);ok('shera hook is light',p.state==='hurt');
  p=pound(6,20);ok('shera hook deflects but his string plays on',p.lastDefense==='deflect'&&p.hp===p.maxhp&&G.boss.state==='pound'&&!(G.boss.protectedStagger>0));p=pound(72);ok('shera hammer knocks down',p.state==='down');
  // The hammer lands where the fists do (HAMMER=72 in train_neta.js, ~61px reach), not across the car.
  p=pound(72);p.x=G.boss.x+90;p.state='idle';p.invuln=0;G.boss.t=71;updateBoss();ok('shera hammer does not reach past his fists',p.state==='idle');
  g.trainScene('boss',0);G.state='play';Object.assign(G.boss,{state:'count',t:10,countHits:0,protectedStagger:0});hp=G.boss.hp;G.boss.hurt(6,1,true,false);ok('heavy during the count hurts but does not floor shera (floors come from ripostes, crashes, guard breaks, reflects)',G.boss.state!=='down'&&G.boss.hp<hp);
  Object.assign(G.boss,{state:'stagger',t:0,protectedStagger:45,floorBy:'crash'});G.boss.hurt(6,1,true,false);ok('heavy in a crash stagger floors shera',G.boss.state==='down');
  g.trainScene('boss-roof',0);G.state='play';G.enemies=[];Object.assign(G.boss,{trainWaiting:false,state:'windup',pattern:'shot',t:0,ammo:0});for(let i=0;i<100&&G.boss.state!=='reload';i++){G.hitstop=0;updateBoss();}ok('empty revolver clicks into a reload',G.boss.state==='reload');
  g.trainScene('boss',0);let b=G.boss;Object.assign(b,{state:'idle',face:-1});G.player.x=b.x-40;const px=G.player.x;hp=b.hp;b.hurt(5,1,false,false);ok('guarded jab gives feedback',b.hp===hp&&b.guardFlash>0&&G.player.x<px);
  // Conductor: no random heavy knockdowns; heavies floor him only inside an opening; the chain brings hazards, not backup.
  g.trainScene('conductor',300);b=G.boss;const rnd=Math.random;Math.random=()=>0;let downs=0;for(let i=0;i<8;i++){Object.assign(b,{state:'idle',protectedStagger:0,hp:b.maxhp});b.hurt(3,1,true,false);if(b.state==='down')downs++;}Math.random=rnd;ok('no random heavy knockdown',downs===0);
  Object.assign(b,{state:'stagger',protectedStagger:45});b.hurt(3,1,true,false);ok('heavy in an opening floors him',b.state==='down'&&!b.protectedStagger);
  G.enemies=[];Object.assign(b,{state:'windup',pattern:'brake',t:39,protectedStagger:0,hp:b.maxhp*.45,p2Called:true});for(let i=0;i<60;i++)updateBoss();ok('emergency chain slides luggage without reinforcements',!G.enemies.length&&b.pulls===1&&b.slides.length+b.slideQueue.length>0);
  // A hook leaves CHAD time to recover and guard the next one.
  p=pound(6);for(let i=0;i<21&&p.state==='hurt';i++){G.hitstop=0;g.step(1);}ok('hook gap outlasts hurt stun',p.state!=='hurt'&&G.boss.t<28);
  // Chai puddles chip without a flinch; a direct hit leaves no puddle; a mid-jump hit falls to the floor.
  p=arena();G.zones=[];G.zones.push({kind:'chai',x:p.x,y:p.y,r:18,life:160,t:23});p.invuln=0;hp=p.hp;updateShots();ok('chai puddle chips without flinch',p.hp===hp-2&&p.state==='idle');
  p=arena();G.zones=[];G.shots.push({kind:'chai',burst:'chai',x:p.x,y:p.y,z:p.z,vx:1,vz:0,t:5,life:200,dmg:7,flat:false});p.invuln=0;updateShots();ok('direct chai hit leaves no puddle',!G.zones.length);
  p=arena();Object.assign(p,{z:30,vz:0,state:'hurt',t:0,invuln:0});for(let i=0;i<40;i++)g.step(1);ok('hit mid-jump falls back down',p.z===0);
  // A roof death resumes on the roof: Netaji at half health, guards stay beaten.
  g.trainScene('roof-transition',0);Object.assign(G.train.cinematic,{entry:null,t:1e6});g.step(1);ok('roof checkpoint set',G.train.roofCheckpoint);Object.assign(G,{lives:2});Object.assign(G.player,{hp:0,dying:true,state:'down',t:80,z:0});g.step(1);
  b=G.boss;ok('roof death resumes the roof duel',b?.roof&&b.hp===b.maxhp/2&&!b.trainWaiting&&G.camX===8640&&!G.enemies.some(e=>!e.dead)&&b.set===G.boss.set);
  // Respawn keeps at least forty meter.
  g.trainScene('general',0);Object.assign(G,{lives:2,meter:0});Object.assign(G.player,{hp:0,dying:true,state:'down',t:80,z:0});G.train.checkpoint=2880;g.step(1);ok('death restore keeps meter >= 40',G.meter>=40&&!G.player.dying);
  // Wave plan (docs/night-train.md): only the seven families, one new face per area, thieves where there are berths,
  // commandos in pairs, the captain once as the last fight before Netaji, and the station's four fights before boarding.
  const waves=G.stage.waves,at=x=>waves.find(w=>w.x===x).spawns,all=waves.flatMap(w=>w.spawns.map(k=>[k,w.x]));
  const CAST=['nr_brawler','nr_chai','nr_paan','nr_tte','nr_rack','nr_commando','nr_captain'];
  ok('waves use only the Night Train cast',all.every(([k])=>CAST.includes(k)));
  const DEBUT={nr_brawler:[0,960],nr_chai:[960,1920],nr_paan:[1920,2880],nr_tte:[2880,3840],nr_rack:[3840,5280],nr_commando:[6240,7200],nr_captain:[7200,8160]};
  ok('each family debuts in its own area',CAST.every(k=>{const x=all.find(a=>a[0]===k)?.[1];return x>=DEBUT[k][0]&&x<DEBUT[k][1];}));
  ok('berth thieves only where there are berths',all.filter(a=>a[0]==='nr_rack').every(([,x])=>G.stage.lanes.find(l=>x>=l.x0&&x<l.x1)?.berth));
  const lastWave=waves.at(-1),guardWave=waves[waves.length-2];
  ok('the captain is the one elite, guarding the rear carriage',all.filter(a=>a[0]==='nr_captain').length===1&&lastWave.boss&&guardWave.spawns.includes('nr_captain'));
  ok('commandos come in pairs',waves.every(w=>w.spawns.filter(k=>k==='nr_commando').length%2===0));
  ok('the conductor keeps his two TTE enforcers',JSON.stringify(at(5805))===JSON.stringify(['nr_tte','nr_tte'])&&waves.find(w=>w.x===5880)?.miniboss==='conductor');
  ok('station fights end before boarding',waves.filter(w=>w.x<2880&&w.spawns.length).length===4);
  ok('no wave overfills a carriage',waves.every(w=>w.spawns.length<=7));
  ok('elite flag removed',!waves.some(w=>'elite' in w));ok('enemy total matches the wave plan',waves.reduce((n,w)=>n+w.spawns.length,0)===55);
  // Smoke: every family survives a scripted minute against an invulnerable CHAD without errors.
  for(const kind of ['nr_tough','nr_runner','nr_bruiser','nr_chai','nr_ambusher','nr_heavy','nr_guard','nr_bodyguard','nr_brawler','nr_paan','nr_tte','nr_rack','nr_commando','nr_captain']){
   const p=arena(['nr_ambusher','nr_rack'].includes(kind)?'sleeper':'general');const e=g.spawn(kind,120,0);const seen=new Set();
   for(let i=0;i<3600;i++){p.invuln=999;if(i%40<12){p.state='attack';p.combo=(i>>4)%4;}else p.state='idle';tick();seen.add(e.state);if(i%10===0)g.render();}
   ok(`${kind} cycles through attacks`,seen.has('attack')&&!e.removeMe);
  }
  return out;
 });
 // Review Studio: each 1v1 loads, plays deterministically from its seed, and is captured for review.
 const fs=require('node:fs'),dir='tmp/review/train-duels';fs.mkdirSync(dir,{recursive:true});
 const studio=await browser.newPage({viewport:{width:1600,height:1050}});studio.on('pageerror',e=>errors.push(e.message));
 await studio.goto('http://localhost:'+(process.env.PORT||8011)+'/review.html');await studio.waitForFunction(()=>window.__review?.listScenarios,{timeout:90000});
 const ids=(await studio.evaluate(()=>__review.listScenarios())).map(s=>s.id),duels=ids.filter(id=>id.startsWith('train/duel-'));
 const cast=['brawler','chai','paan','tte','rack','commando','captain'];
 out.push(['seven 1v1 scenarios',duels.length===7],['every family has a daze preset',cast.every(k=>ids.includes('train/daze-nr_'+k))]);
 for(const id of duels){
  const snap=async t=>{await studio.evaluate(async({id,t})=>{await __review.load(id);__review.pause();await __review.seek(t);},{id,t});return studio.evaluate(()=>__review.snapshot().engine);};
  const a=await snap(420),b2=await snap(420);
  out.push([`${id} loads one live enemy`,a.enemies.length>=1&&a.stage==='train'],[`${id} replays deterministically`,JSON.stringify(a)===JSON.stringify(b2)]);
  const frame=studio.frames().find(f=>f.url().includes('/tools/review/runtime.html'));await frame.locator('canvas').first().screenshot({path:`${dir}/${id.slice(6)}-420.png`});
 }
 // The black-cat group in play (QA's fourteen group cases, played live from the commando 1v1 - CHAD hit, floored and walked
 // about): every man swings (twice in 900 ticks, never 450 ticks of CHAD up without one - run start and end counted, CHAD down or
 // getting up not: a third man legitimately waits while the two ahead of him have their turns); CHAD up is never
 // left unswung at over 150 ticks; no two stand stacked (36px
 // along, 26 across) 30 ticks after the first 30, nor two resting men within 30px both ways, nor one resting behind another
 // across the floor (30px along, 40 across: a two-headed man); one gloats at a time; nobody
 // stands on a floored CHAD for over two ticks after his own swing, nor on CHAD up outside a swing (two ticks of his guard
 // after it aside, and CHAD shoved about by the case itself, faster than they walk); no guard cell shows one
 // tick on his feet; no stride over walking pace, turned round within 12 ticks, held 8 ticks while he moves 8px (a stand of two
 // ticks ends the run), or held three ticks pinned at the carriage end.
 const QA=[['pair',900,'const b=g.spawn(CM,150,-14);b.state="idle";b.atkCd=40;e.atkCd=20;'],['pairB',700,'const b=g.spawn(CM,-160,20);b.state="idle";b.atkCd=10;e.atkCd=60;'],
  ['pairmove',700,'const b=g.spawn(CM,150,-14);b.state="idle";b.atkCd=40;e.atkCd=20;','if(i>200&&i<260)P.x+=1.5;if(i>400&&i<440)P.y-=.8;if(i>500&&i<560)P.x-=1.5;'],
  ['mix',900,'const b=g.spawn(CP,150,-14);b.state="idle";b.atkCd=40;e.atkCd=20;'],
  ['pairdown',400,'const b=g.spawn(CM,150,-14);b.state="idle";b.atkCd=40;e.atkCd=9999;','if(i===60)Object.assign(P,{state:"down",t:0,groundT:0,z:0});if(i<60)e.atkCd=9999;'],
  ['pairmove2',700,'const b=g.spawn(CM,150,-14);b.state="idle";b.atkCd=40;e.atkCd=20;','if(i>120&&i<170)P.x+=1.5;if(i>330&&i<360)P.y+=.8;if(i>450&&i<520)P.x-=1.5;'],
  ['pairmove3',700,'const b=g.spawn(CM,150,-14);b.state="idle";b.atkCd=40;e.atkCd=20;','const k=Math.floor(i/90)%4;if(i>60){if(k===0)P.x+=1.2;else if(k===2)P.x-=1.2;else if(k===1)P.y+=i%180<90?.4:-.4;}'],
  ['pairmove4',700,'const b=g.spawn(CM,-150,10);b.state="idle";b.atkCd=5;e.atkCd=50;','if(i>80&&i<130)P.x-=1.5;if(i>260&&i<320)P.x+=1.5;if(i>480&&i<520)P.y-=.8;'],
  ['trio',900,'const b=g.spawn(CM,150,-14);b.state="idle";b.atkCd=40;const c=g.spawn(CP,220,10);c.state="idle";c.atkCd=80;e.atkCd=20;'],
  ['trio2',900,'const b=g.spawn(CM,-150,10);b.state="idle";b.atkCd=10;const c=g.spawn(CP,180,-12);c.state="idle";c.atkCd=40;e.atkCd=60;','if(i>300&&i<360)P.x+=1.2;'],
  ['trio3',700,'const b=g.spawn(CM,-170,-10);b.state="idle";b.atkCd=30;const c=g.spawn(CP,-230,12);c.state="idle";c.atkCd=60;e.atkCd=20;'],
  ['trio4',700,'const b=g.spawn(CM,60,18);b.state="idle";b.atkCd=30;const c=g.spawn(CP,40,-16);c.state="idle";c.atkCd=10;e.atkCd=90;'],
  ['trio5',700,'const b=g.spawn(CM,-120,0);b.state="idle";b.atkCd=0;const c=g.spawn(CP,-60,-18);c.state="idle";c.atkCd=0;e.atkCd=0;','const k=Math.floor(i/100)%4;if(i>100){if(k===0)P.x+=1;else if(k===2)P.x-=1;}'],
  ['quad',700,'const b=g.spawn(CM,-150,10);b.state="idle";b.atkCd=30;const c=g.spawn(CP,180,-12);c.state="idle";c.atkCd=50;const d=g.spawn(CM,260,14);d.state="idle";d.atkCd=70;e.atkCd=20;']];
 for(const [n,N,setup,step,lim=150] of QA){
  await studio.evaluate(async()=>{await __review.load('train/duel-commando');__review.pause();});
  const frame=studio.frames().find(f=>f.url().includes('/tools/review/runtime.html'));
  const bad=await frame.evaluate(async([N,setup,step,lim])=>{const g=__game,G=g.G,e0=G.enemies[0],CM='nr_commando',CP='nr_captain';
   const {drawEnemy}=await import('/js/enemies.js'),EN=await import('/js/engine.js'),AF=await import('/js/aiframes.js'),man=await (await fetch('/assets/frames/manifest.json')).json(),cellIm=new Map();
   const cx=document.createElement('canvas').getContext('2d');let drawn=null;const odraw=cx.drawImage.bind(cx);cx.drawImage=(im,...a)=>{if(!drawn&&cellIm.has(im))drawn=cellIm.get(im);return odraw(im,...a);};
   const cellOf=e=>{const key=e.set._aiKey;if(!cellIm.has('k'+key)){cellIm.set('k'+key,1);const fam=man[e.trainType];for(const st of Object.keys(fam)){const a=AF.getAIFrame(key,st);if(!a)continue;[a.f,a.fl].forEach(L=>L.forEach((im,i)=>{if(!cellIm.has(im))cellIm.set(im,fam[st][i].split('/')[1].slice(0,-4));}));}}
     drawn=null;cx.save();try{drawEnemy(cx,e,G.camX);}catch(x){}cx.restore();return drawn||'?';};
   new Function('g','G','e','CM','CP',setup)(g,G,e0,CM,CP);const es=[...G.enemies],P=G.player,st=step&&new Function('P','e','i',step);
   const LOC=['idle','approach','backoff'],NA=['windup','attack','down','thrown','getup','hurt','dying','fall','stagger','daze','block','parried'],FL=['down','getup'];
   const sw=es.map(()=>0),swT=es.map(()=>[]),pv=es.map(()=>''),atkEnd=es.map(()=>-999),downRun=es.map(()=>0),px0=es.map(e=>e.x),rec=es.map(()=>[]);
   let upT=0,fr=0,stall=0,stack=0,rest=0,totem=0,t2=0,onDown=0,near=0,fast=0;
   let pushed=-99;for(let i=0;i<N;i++){const bx=P.x,by=P.y;st?.(P,e0,i);if(P.x!==bx||P.y!==by)pushed=i;g.step(1);
    if(!['down','getup'].includes(P.state))upT++;if(['down','getup','hurt','thrown','held'].includes(P.state)||es.some(e=>['windup','attack'].includes(e.state)))fr=0;else stall=Math.max(stall,++fr);
    es.forEach((e,k)=>{if(e.state==='windup'&&pv[k]!=='windup'){sw[k]++;swT[k].push(upT);}if(pv[k]==='attack'&&e.state!=='attack')atkEnd[k]=i;
     if(i>2&&!e.dead&&LOC.includes(e.state)&&LOC.includes(pv[k])&&Math.abs(e.x-px0[k])>e.speed*(e.state==='backoff'?1.4:e.hurry||1)+.1)fast++;px0[k]=e.x;pv[k]=e.state;
     rec[k].push([i,e.x,e.y,e.dead?'':cellOf(e),e.state,e.x<=EN.arenaMin()+.01||e.x>=EN.arenaMax()-.01]);
     const on=!e.dead&&Math.abs(e.x-P.x)<16&&Math.abs(e.y-P.y)<12;
     if(['windup','attack'].includes(e.state))e.qaSwingT=i;
     if(e.trainType===CM&&on&&!NA.includes(e.state)&&!FL.includes(P.state)&&i-(e.qaSwingT??-9)>2&&i-pushed>20)near++;
     downRun[k]=on&&!e.walking&&i-atkEnd[k]<60&&FL.includes(P.state)&&!['windup','attack','down','getup','hurt','dying','fall'].includes(e.state)?downRun[k]+1:0;if(downRun[k]>2)onDown++;});
    const L=es.filter(e=>!e.dead&&!e.removeMe),R=e=>!e.walking&&['idle','taunt','approach','backoff'].includes(e.state);
    if(i>=30&&L.some((a,x)=>L.some((c,y)=>y>x&&Math.abs(a.x-c.x)<36&&Math.abs(a.y-c.y)<=26)))stack++;
    if(L.some((a,x)=>L.some((c,y)=>y>x&&R(a)&&R(c)&&Math.abs(a.x-c.x)<30&&Math.abs(a.y-c.y)<30)))rest++;
    if(L.some((a,x)=>L.some((c,y)=>y>x&&R(a)&&R(c)&&Math.abs(a.x-c.x)<30&&Math.abs(a.y-c.y)<40)))totem++;
    if(L.filter(e=>e.state==='taunt').length>1)t2++;}
   let oneIdle=0,held=0,rev=0,pinned=0;rec.forEach((R,k)=>{let run=0;for(let j=1;j<R.length;j++){run=/^w_/.test(R[j][3])&&R[j][3]===R[j-1][3]&&R[j][5]?run+1:0;if(run===2)pinned++;}for(let j=1;j<R.length-1;j++)if(/^(a_00|idle_breath)$/.test(R[j][3])&&LOC.includes(R[j][4])&&R[j][3]!==R[j-1][3]&&R[j][3]!==R[j+1][3]&&!FL.includes(R[j+1][4]))oneIdle++;
    if(es[k].trainType!==CM)return;let s=0,sr=0;for(let j=1;j<=R.length;j++){sr=j<R.length&&R[j][1]===R[j-1][1]&&R[j][2]===R[j-1][2]?sr+1:0;if(j<R.length&&R[j][3]===R[s][3]&&sr<2)continue;if(/^w_/.test(R[s][3])&&j-s>=8&&Math.hypot(R[j-1][1]-R[s][1],R[j-1][2]-R[s][2])>8)held++;s=j;}
    let prev=null,dir=0,ds=0,px=null,py=null;for(const [t,x,y,c] of R){const still=x===px&&y===py;px=x;py=y;if(!/^w_/.test(c)||still){prev=null;dir=0;continue;}const m=+c.slice(2);if(prev!==null&&m!==prev){const d=((m-prev)%20+20)%20<10?1:-1;if(dir&&d!==dir){if(t-ds<12)rev++;ds=t;}else if(!dir)ds=t;dir=d;}prev=m;}});
   const bad=[];if(!sw.every(x=>x>=(N>=900?2:1)))bad.push('swings '+sw.join('/'));if(stall>lim)bad.push('CHAD up unswung '+stall);if(stack>=30)bad.push('stacked '+stack);if(rest>=30)bad.push('resting within 30px '+rest);if(totem>=30)bad.push('resting one behind another '+totem);
   const gap=swT.map(T=>Math.max(...[...T,upT].map((x,j,a)=>x-(j?a[j-1]:0))));if(N>=900&&gap.some(x=>x>450))bad.push('swing gaps '+gap.join('/'));if(pinned)bad.push('stride held at the carriage end '+pinned);
   if(t2)bad.push('two gloating '+t2);if(onDown)bad.push('standing on floored CHAD '+onDown);if(near)bad.push('on CHAD '+near);if(oneIdle)bad.push('one-tick guard cells '+oneIdle);
   if(fast)bad.push('ticks over walking pace '+fast);if(held)bad.push('held cells '+held);if(rev)bad.push('reversals '+rev);return bad;},[N,setup,step,lim]);
  out.push([`black-cat group in play (${n})${bad.length?': '+bad.join(', '):''}`,!bad.length]);
 }
 console.log(JSON.stringify({checks:out.length,failures:out.filter(x=>!x[1]),errors}));
 assert(out.every(x=>x[1]),JSON.stringify(out.filter(x=>!x[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
