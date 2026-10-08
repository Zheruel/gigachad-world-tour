// Night Train boss balance bots (diff 1). Three policies play the carriage fight (Shera, then UNPAID Shera)
// and the rooftop duel headless and are held to the rework targets:
//   mash  - walks in and mashes attack, no defence            -> carriage: loses >3 life bars or takes >150 s
//   read  - answers tells (parry greens, dodge reds, heavy on the palm '!'), misreading a seeded 15% of moves
//           -> carriage mean 85-115 s and <=115 damage over six seeds (each seed 70-150 s)
//   smart - read, plus smashing thrown cash and hitting Netaji when Shera is floored
//   roof: read/smart mean 20-30 s (each 15-45 s); mash <=45 s losing at most one life bar.
// Six seeds, not three: three-seed means swing by 10 s with identical code.
// Also: no single state/move gives >30% of the damage dealt, and a seed replays identically.
// Usage: NODE_PATH=<playwright> node tools/verification/train_boss_balance_check.cjs [--json out.json] [--quick]
//   env: ONLY=boss:read (one pair), SEEDS=1,2,3, SLIP=.15, VERBOSE=1 (time and damage taken per state)
const studio=require('./studio_helper.cjs'),fs=require('fs');
const args=process.argv.slice(2),jsonOut=args.includes('--json')?args[args.indexOf('--json')+1]:null,quick=args.includes('--quick');
// ONLY=boss:read runs one scene/bot pair while tuning (the assertions then only cover that pair).
const only=process.env.ONLY||'';
(async()=>{
 const {page,errors,close}=await studio.launch(),missing=new Set();
 page.on('response',r=>{if(r.status()===404)missing.add(r.url().replace(/^.*?\/\/[^/]+\//,''));});
 let failed=false;
 try{
  await studio.openStudio(page,'train/boss');
  const res=await studio.game(page,async(g,G,{quick,only,slipRate,seedList})=>{
   const {greenWind}=await import('./js/combat_readability.js');
   const KEYS=['attack','parry','left','right','up','down','jump'];
   function run(scene,policy,seed){
    let s=seed;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
    g.resetInput();g.trainScene(scene,0);G.hitstop=0;
    let held=new Set(),want=new Set();const press=k=>want.add(k);
    const b=G.boss,p=G.player;p.hp=p.maxhp=100;
    const dmgBy={},hitsBy={},timeIn={},takenBy={};let dealt=0;
    const orig=b.hurt;
    b.hurt=(dmg,dir,heavy,launch)=>{const st=(b.enragedShera?'R:':'')+b.state,h=b.hp;orig(dmg,dir,heavy,launch);const d=Math.max(0,h-b.hp);const key=st+(heavy||launch?'*':'');dmgBy[key]=(dmgBy[key]||0)+d;hitsBy[key]=(hitsBy[key]||0)+1;dealt+=d;};
    const ev={catches:0,hugs:0,hugEscapes:0,chains:0,chainHits:0,hurls:0,reflects:0,floors:{},rageAt:null,rageHp:null,fledAt:null,parries:0};
    let taken=0,refills=0,prevHp=p.hp,ticks=0,prev={},jumpQ=0,lights=0,lastLight=-999,heavyNext=false,seenState='',slip=false;
    const limit=scene==='boss-roof'?6000:12000,SLIP=slipRate;
    for(;ticks<limit;ticks++){
     want=new Set();
     const n=b.ally,rage=!!b.enragedShera,need=rage?2:3;
     const target=b;
     const dx=target.x-p.x,dy=target.y-p.y;
     const lane=G.stage.lanes.find(l=>p.x>=l.x0&&p.x<l.x1)||{top:181,bot:241},laneAway=(y=b.y)=>press(y-lane.top>lane.bot-y?'up':'down');
     let dodge=false,hold=false;
     // A good player, not a perfect one: each of his moves has a seeded 15% chance to be misread.
     const key=b.state+'|'+b.pattern+'|'+(b.turn||0);if(key!==seenState){seenState=key;slip=policy!=='mash'&&Math.random()<SLIP;}
     if(policy==='mash'){
      if(p.state==='held'&&ticks%2===0)press('attack');
     }else if(slip){if(p.state==='held'&&ticks%2===0)press('attack');
     }else if(b.phase===1){
      // Reds: step out of a rush or quake lane, jump the shockwave, jump the chain and the hug.
      if((b.state==='windup'&&b.pattern==='bullrush'||b.state==='bullrush')&&Math.abs(p.y-b.y)<22){dodge=true;laneAway();}
      if((b.state==='windup'&&b.pattern==='quake')||(b.state==='quake'&&b.t<44)){dodge=true;if(Math.abs(p.y-(b.qy??b.y))<24)laneAway();if(b.state==='quake'&&b.t===37)press('jump');}
      if(b.state==='windup'&&b.pattern==='hug'){dodge=true;if(b.t===26)press('jump');}
      if(b.state==='hug'){dodge=true;}
      if(b.state==='windup'&&b.pattern==='chain'){dodge=true;}
      if(b.state==='chain'&&b.t===3)press('jump');
      if(b.state==='chain')dodge=true;
      // Greens: tap parry on each hook (deflect), on the hammer's flash and on an incoming trunk.
      const at=72+(b.pd||0);
      if(b.state==='pound'&&(b.t===2||b.t===24||b.t===at-8))press('parry');
      if(b.state==='pound'&&b.t<at+4)hold=Math.abs(p.x-b.x)<40;
      const trunk=G.shots.find(s=>s.netaTrunk&&!s.reflected);
      if(trunk){dodge=true;const tdx=(p.x-trunk.x)*Math.sign(trunk.vx);if(tdx>0&&tdx<26&&Math.abs(trunk.y-p.y)<18&&!p.guardWindow)press('parry');}
      if(b.state==='wakeshove'&&b.t===4)press('parry');
      if(p.state==='held'&&ticks%2===0)press('attack');
     }else{
      // Roof: sidestep the shot and the grit, parry the swing, shove, whip and the flung bribe.
      if((b.state==='windup'&&['shot','grit'].includes(b.pattern))||b.state==='shot'&&b.t<8||b.state==='grit'){dodge=true;if(Math.abs(p.y-b.y)<30)laneAway();}
      if(b.state==='windup'&&['swing','shove'].includes(b.pattern)&&b.t===Math.max(0,({swing:30,shove:greenWind(14,1)})[b.pattern]-6))press('parry');
      if(b.state==='bribe'&&(b.t===130+14||b.t===164-8))press('parry');
     }
     // Openings worth hitting (the mash bot hits whatever is in front of it).
     const open=policy==='mash'||b.phase===2||(policy==='smart'&&b.state==='bonus')||['count','stagger','snag','stumble','roar','hurt','down','getup'].includes(b.state)||b.state==='quake'&&b.t>=60;
     if(!dodge){
      const wantX=open?30:64;
      if(Math.abs(dx)>wantX+4)press(dx>0?'right':'left');else if(Math.abs(dx)<wantX-10&&!open)press(dx>0?'left':'right');
      if(Math.abs(dy)>4)press(dy>0?'down':'up');
      if(open&&!hold&&Math.abs(dx)<50&&Math.abs(dy)<12){
       if(policy==='mash'){if(ticks%3===0)press('attack');}
       else{
        // The palm catch: after the '!' (or before it would show) finish on a jump kick, not a fourth light.
        // In an opening he can be caught in, press only as many lights as the catch allows, then jump kick.
        const soft=b.phase===1&&!['stagger','down','getup'].includes(b.state);
        const live=G.rawTime-(b.lightAt??-999)<90?(b.lights||0):0,queued=p.state==='attack'?1+(p.queuedHits||0):0;
        if(soft&&live>=need){if(p.state==='idle'||p.state==='walk'){press('jump');jumpQ=4;}}
        else if(ticks%4===0&&!jumpQ&&(!soft||live+queued<need))press('attack');
       }
      }
     }
     if(jumpQ>0){jumpQ--;if(p.state==='jump'&&p.z>6)press('attack');}
     for(const k of KEYS){const w=want.has(k),h=held.has(k),tap=['attack','parry','jump'].includes(k);if(w&&(!h||tap)){if(tap&&h)g.release(k);g.press(k);held.add(k);}else if(!w&&h){g.release(k);held.delete(k);}}
     const st0=b.state;g.step(1);
     if(st0!=='catch'&&b.state==='catch')ev.catches++;
     if(st0!=='hughold'&&b.state==='hughold')ev.hugs++;
     if(st0==='hughold'&&b.state==='recover')ev.hugEscapes++;
     if(st0!=='chain'&&b.state==='chain')ev.chains++;
     if(st0!=='hurl'&&b.state==='hurl')ev.hurls++;
     if(b.floorBy==='reflect'&&prev.floorBy!=='reflect')ev.reflects++;
     if(st0!=='down'&&b.state==='down')ev.floors[prev.floorBy||'none']=(ev.floors[prev.floorBy||'none']||0)+1;
     if(p.lastDefense==='parry'&&prev.lastDefense!=='parry')ev.parries++;
     if(b.enragedShera&&ev.rageAt==null){ev.rageAt=+(ticks/60).toFixed(1);ev.rageHp=+(b.hp/b.maxhp).toFixed(3);}
     if(b.netaFled&&ev.fledAt==null)ev.fledAt=+(ticks/60).toFixed(1);
     prev={floorBy:b.floorBy,lastDefense:p.lastDefense};
     {const k=(b.enragedShera?'R:':'')+b.state;timeIn[k]=(timeIn[k]||0)+1;if(p.hp<prevHp)takenBy[k]=(takenBy[k]||0)+prevHp-p.hp;}
     if(p.hp<prevHp)taken+=prevHp-p.hp;
     if(p.hp<25){refills++;p.hp=100;p.dying=false;if(p.state==='down')p.invuln=60;}
     prevHp=p.hp;
     if(G.state!=='play'||G.train.cinematic||b.outFeet||b.dead)break;
    }
    const top=Object.entries(dmgBy).sort((a,c)=>c[1]-a[1])[0]||['',0];
    return {scene,policy,seed,ticks,seconds:+(ticks/60).toFixed(1),finished:!!(G.train.cinematic||b.outFeet||b.dead),bossHp:+b.hp.toFixed(1),bossMax:b.maxhp,
     playerDamage:taken,refills,dealt:+dealt.toFixed(1),topShare:+(dealt?top[1]/dealt:0).toFixed(3),topKey:top[0],dmgBy:Object.fromEntries(Object.entries(dmgBy).map(([k,v])=>[k,+v.toFixed(1)])),timeIn:Object.fromEntries(Object.entries(timeIn).map(([k,v])=>[k,+(v/60).toFixed(1)])),takenBy,ev};
   }
   const out=[];const seeds=seedList||(quick?[541]:[541,77,9001,12,345,678]);
   for(const scene of ['boss','boss-roof'])for(const policy of ['mash','read','smart'])for(const seed of seeds)if(!only||only===scene+':'+policy)out.push(run(scene,policy,seed));
   if(!only)out.push({...run('boss','read',541),replay:true});
   return out;
  },{quick,only,slipRate:+(process.env.SLIP||.15),seedList:process.env.SEEDS?process.env.SEEDS.split(',').map(Number):null});
  const rows=res.filter(r=>!r.replay);
  for(const r of res)console.log(`${r.replay?'replay ':''}${r.scene.padEnd(9)} ${r.policy.padEnd(5)} ${String(r.seed).padEnd(5)} t=${String(r.seconds).padStart(6)}s fin=${r.finished?1:0} boss=${r.bossHp}/${r.bossMax} dmg=${r.playerDamage} bars=${r.refills} top=${r.topKey}:${(r.topShare*100).toFixed(0)}% ${JSON.stringify(r.ev)}\n    dmgBy ${JSON.stringify(r.dmgBy)}${process.env.VERBOSE?`\n    timeIn ${JSON.stringify(r.timeIn)}\n    takenBy ${JSON.stringify(r.takenBy)}`:''}`);
  const checks=[],ok=(name,v)=>checks.push([name,!!v]);
  for(const r of rows){
   const id=`${r.scene}/${r.policy}/${r.seed}`;
   // Bot misreads are seeded, so single runs scatter: the 85-115 s / 115 damage target is the seed mean (below), each seed must finish inside 70-150 s.
   if(r.scene==='boss'&&r.policy!=='mash')ok(`${id} finishes in 70-150 s (${r.seconds})`,r.finished&&r.seconds>=70&&r.seconds<=150);
   if(r.scene==='boss'&&r.policy==='mash')ok(`${id} loses >3 bars or takes >150 s`,r.refills>3||!r.finished||r.seconds>150);
   if(r.scene==='boss-roof'&&r.policy!=='mash')ok(`${id} roof finishes in 15-45 s (${r.seconds})`,r.finished&&r.seconds>=15&&r.seconds<=45);
   if(r.scene==='boss-roof'&&r.policy==='mash')ok(`${id} roof <=45 s, <=1 bar`,r.finished&&r.seconds<=45&&r.refills<=1);
   if(r.policy!=='mash'||r.scene==='boss-roof')ok(`${id} no move gives >30% of damage (${r.topKey})`,r.topShare<=.3);
  }
  for(const scene of ['boss','boss-roof'])for(const policy of ['read','smart']){
   const rs=rows.filter(r=>r.scene===scene&&r.policy===policy);if(!rs.length)continue;
   const t=rs.reduce((n,r)=>n+r.seconds,0)/rs.length,d=rs.reduce((n,r)=>n+r.playerDamage,0)/rs.length,[lo,hi]=scene==='boss'?[85,115]:[20,30];
   console.log(`mean ${scene}/${policy}: ${t.toFixed(1)} s, ${d.toFixed(0)} damage`);
   ok(`${scene}/${policy} mean ${lo}-${hi} s (${t.toFixed(1)})`,t>=lo&&t<=hi);
   if(scene==='boss')ok(`${scene}/${policy} mean damage <=115 (${d.toFixed(0)})`,d<=115);
  }
  const a=rows.find(r=>r.scene==='boss'&&r.policy==='read'&&r.seed===541),b=res.find(r=>r.replay);
  if(!only)ok('seed 541 replays identically',a&&b&&a.ticks===b.ticks&&a.playerDamage===b.playerDamage&&a.bossHp===b.bossHp);
  // Missing art files (another track registering cells ahead of the files) are listed, not failed: the game falls back.
  const real=errors.filter(e=>!/Failed to load resource/.test(e));if(missing.size)console.log('404 (fallback art):',[...missing].slice(0,8).join(' '));
  ok('no page errors',!real.length);
  if(jsonOut)fs.writeFileSync(jsonOut,JSON.stringify({res,checks,errors},null,1));
  for(const [n,v]of checks)if(!v)console.log('FAIL',n);
  console.log(`${checks.filter(c=>c[1]).length}/${checks.length} balance checks pass`);
  if(real.length)console.log('errors',real.slice(0,5));
  failed=checks.some(c=>!c[1]);
 }finally{await close();}
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
