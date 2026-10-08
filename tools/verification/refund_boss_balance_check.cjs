// Input-only Closer fight: read the authored tells, punish recovery and clear the
// real support guard. No health refills, actor moves, forced hits or state skips.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const URL=process.env.GAME_URL||'http://localhost:8011',seeds=(process.env.SEEDS||'541,77,9001,12,345,678').split(',').map(Number),policies=(process.env.POLICIES||'read,mash').split(','),slip=Number(process.env.SLIP??.15);
(async()=>{fs.mkdirSync('tmp/review/refund-boss',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const rows=[];try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(URL+'/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 for(const policy of policies)for(const seed of seeds){
  const r=await page.evaluate(async({policy,seed,slip})=>{
   const g=__game,G=g.G,{getCloserTiming}=await import('./js/refund_boss_timing.js');
   let rng=seed,readSeed=seed^12345,arng=991;Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
   const randomRead=()=>{readSeed=(Math.imul(readSeed,1664525)+1013904223)>>>0;return readSeed/4294967296;};
   if(!G.audio._closerDiagnostic)for(const key of Object.keys(G.audio))if(typeof G.audio[key]==='function'){
    const original=G.audio[key];G.audio[key]=function(...args){const old=Math.random;Math.random=()=>{arng=(Math.imul(arng,1664525)+1013904223)>>>0;return arng/4294967296;};try{return original.apply(this,args);}finally{Math.random=old;}};
   }G.audio._closerDiagnostic=true;
   // A fresh first-stage start gives every fixture the same normal100HP baseline;
   // otherwise startStage legitimately carries the preceding diagnostic's HP.
   g.resetInput();g.stage(0);g.indiaScene('refund','closer',0);G.time=G.rawTime=0;g.spawn('ic_security',235,-2);
   const b=G.boss,p=G.player,held=new Set(),keys=['attack','parry','super','left','right','up','down','jump'];
   const startHp=p.hp;let ticks=0,damage=0,hp=p.hp,parries=0,deflects=0,supers=0,seenDefense=null,seenPlayer=null,seenMove='',misread=false,lastParry=-99,guardUntil=0,phaseAt=null;
   const moves=new Set(),dealtBy={},takenBy={},timeBy={},trace=[],defenses=[];const hurt=b.hurt;
   b.hurt=(...a)=>{const key=(b.phaseTwo?'2:':'1:')+b.state,old=b.hp;hurt(...a);dealtBy[key]=(dealtBy[key]||0)+Math.max(0,old-b.hp);};
   for(;ticks<21600&&!b.dead&&!p.dying&&G.state==='play';ticks++){
    const want=new Set(),press=k=>want.add(k),moveX=(x,d=3)=>{if(Math.abs(x-p.x)>d)press(x>p.x?'right':'left');},moveY=(y,d=3)=>{if(Math.abs(y-p.y)>d)press(y>p.y?'down':'up');};
    const neutral=['idle','walk','run','parry','parry_recover','parry_counter'].includes(p.state),ready=['idle','walk','run'].includes(p.state),timing=getCloserTiming(b);
    const ally=G.enemies.find(e=>!e.dead&&!e.noCount&&e.state!=='spawn'),target=ally||b,dx=target.x-p.x,dy=target.y-p.y;
    const name=b.state+'|'+b.pattern+'|'+b.turn;if(name!==seenMove){seenMove=name;misread=policy==='read'&&randomRead()<slip;}
    const red=b.state==='deal'||b.state==='windup'&&b.pattern==='deal';
    const phone=G.shots.find(s=>!s.reflected&&(p.x-s.x)*s.vx>0&&Math.abs(s.y-p.y)<16),shot=phone&&Math.abs(phone.x-p.x)<34;
    let hold=false,dodge=false,parryNow=false;
    if(policy==='read'&&!misread){
     if(red){dodge=true;moveY((b.attackLane??b.y)>229?214:244);}
     if(b.state==='boxing'){
      // The last green cue appears24 ticks before contact. Reacting with three
      // ticks left models a350ms response, rather than frame-perfect anticipation.
      hold=true;const next=timing.hits.find(h=>h.at>b.t),lead=next?.cls==='counter'?3:6;if(next&&next.at-b.t<=lead&&next.at-b.t>=1&&neutral&&ticks-lastParry>14)parryNow=true;
     }
     if(b.state==='windup'&&b.pattern==='boxing')hold=true;
     if(!ally&&['setup-handset','handset'].includes(b.state)||!ally&&b.state==='windup'&&b.pattern==='handset')hold=true;
     if(shot&&neutral&&ticks-lastParry>14){parryNow=true;hold=true;}
     if(ally&&ally.state==='attack'&&ally.t<7&&Math.abs(dx)<85&&Math.abs(dy)<16&&neutral&&ticks-lastParry>14){parryNow=true;hold=true;}
     if(ally&&ally.state==='windup'&&Math.abs(dx)<85&&Math.abs(dy)<16)hold=true;
    }
    const open=policy==='mash'||ally||b.protectedStagger>0||['recover','stumble','call'].includes(b.state)||b.state==='windup'&&b.pattern==='call';
    if(!dodge){
     const range=open?30:44;moveY(target.y,4);
     if(!hold)moveX(target.x-Math.sign(dx||p.face)*range,3);
     if(Math.sign(dx)!==p.face&&ready)press(dx>0?'right':'left');
     if(open&&!hold&&Math.abs(dx)<53&&Math.abs(dy)<12){
      if(G.meter>=100&&ready&&(target===b?b.protectedStagger>0||b.state==='recover':true))press('super');
      else if(ticks%4===0||p.state==='parry_counter'&&p.t>=6)press('attack');
     }
    }
    if(parryNow){want.delete('attack');want.delete('super');press('parry');lastParry=ticks;guardUntil=ticks+9;}
    else if(policy==='read'&&ticks<guardUntil){want.delete('attack');want.delete('super');press('parry');}
    if(['down','held'].includes(p.state)&&ticks%4===0)press('attack');
    for(const k of keys){const w=want.has(k),h=held.has(k);if(w&&!h){g.press(k);held.add(k);}else if(!w&&h){g.release(k);held.delete(k);}}
    const prior=[p.state,p.t,p.guardWindow,b.state,b.t];g.step(1);
    if(b.pattern)moves.add((b.phaseTwo?'2:':'1:')+b.pattern);if(b.phaseTwo&&phaseAt===null)phaseAt=ticks/60;
    if(p.hp<hp){const d=hp-p.hp;damage+=d;const k=(b.phaseTwo?'2:':'1:')+b.state;takenBy[k]=(takenBy[k]||0)+d;if(defenses.length<100)defenses.push({ticks,d,prior,now:[p.state,p.t,p.guardWindow,b.state,b.t],actions:[...want],lastDefense:p.lastDefense});}hp=p.hp;
    if(p.lastDefense!==seenDefense){if(p.lastDefense==='parry')parries++;if(p.lastDefense==='deflect')deflects++;seenDefense=p.lastDefense;}
    if(p.state!==seenPlayer){if(p.state==='special')supers++;seenPlayer=p.state;}
    const clock=(b.phaseTwo?'2:':'1:')+b.state;timeBy[clock]=(timeBy[clock]||0)+1;
    if(ticks%60===0)trace.push({ticks,hp:p.hp,bossHp:b.hp,player:[p.state,Math.round(p.x),Math.round(p.y)],boss:[b.state,b.t,Math.round(b.x),Math.round(b.y),b.guard],ally:ally?[ally.state,ally.hp]:null,meter:Math.round(G.meter)});
   }
   for(const k of held)g.release(k);g.render();return{policy,seed,slip,startHp,ticks,seconds:+(ticks/60).toFixed(1),finished:b.dead,playerHp:p.hp,bossHp:+b.hp.toFixed(1),maxHp:b.maxhp,damage,parries,deflects,supers,phaseAt,moves:[...moves],dealtBy,takenBy,timeBy,trace,defenses,png:document.querySelector('#game').toDataURL('image/png')};
  },{policy,seed,slip});
  fs.writeFileSync(`tmp/review/refund-boss/${policy}-${seed}.png`,Buffer.from(r.png.split(',')[1],'base64'));delete r.png;rows.push(r);
  console.log(JSON.stringify({...r,trace:undefined,defenses:undefined}));
 }
 fs.writeFileSync('tmp/review/refund-boss/balance.json',JSON.stringify({rows,errors},null,2));assert.deepEqual(errors,[]);
 for(const r of rows)assert(r.startHp===100&&r.maxHp===600,'standard health fixture');
 for(let i=0;i<rows.length;i++){const r=rows[i],prior=rows.slice(0,i).find(x=>x.policy===r.policy&&x.seed===r.seed);if(prior)assert(prior.ticks===r.ticks&&prior.damage===r.damage&&prior.bossHp===r.bossHp,'seeded input replay differs');}
 if(process.env.ENFORCE==='1')for(const r of rows.filter(r=>r.policy==='read'))assert(r.finished&&r.seconds<=200,`learned fight ${r.seed}: ${r.seconds}s,finished=${r.finished},HP=${r.bossHp}`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
