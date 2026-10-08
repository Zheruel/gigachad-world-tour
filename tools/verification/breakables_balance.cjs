// Health economy audit: plays whole stages with input-only bots and books every
// point of damage and every heal to the encounter it happened in.
// Policies: novice (keyboard, no parry or dodges, mashes), skilled (gamepad, parries
// visible tells, dodges hazards). Both break the breakables they pass and eat food
// when hurt, as a player would. Numbers are automated diagnostics, not human data.
// Usage: PORT=8041 LABEL=after STAGES=train,delhi,refund POLICIES=novice,skilled SEEDS=541
//        node tools/verification/breakables_balance.cjs
// Writes tmp/review/breakables_balance/<LABEL>/<stage>-<policy>-<seed>.json and summary.json.
const fs=require('node:fs'),path=require('node:path');
const{chromium}=require('playwright');
const PORT=process.env.PORT||8011,LABEL=process.env.LABEL||'current';
const OUT=path.join('tmp/review/breakables_balance',LABEL);
const STAGES=(process.env.STAGES||'train,delhi,refund').split(',');
const POLICIES=(process.env.POLICIES||'novice,skilled').split(',');
const SEEDS=(process.env.SEEDS||'541').split(',').map(Number);
const MAX_TICKS=Number(process.env.MAX_TICKS)||120000;
const REGULAR_ONLY=process.env.REGULAR_ONLY==='1';
const ASSIST=process.env.ASSIST!=='0';   // boss fights on a virtual bar (see below)
// OVERRIDE=file.json replays other placements under the same bots (e.g. the pre-rebalance layout):
// {propTypes:{kind:{drop}}, stages:{id:{props:[...], recovery:[wave x...], recoveryWaves:[wave numbers]}}}
const OVERRIDE=process.env.OVERRIDE?JSON.parse(fs.readFileSync(process.env.OVERRIDE,'utf8')):null;

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{
  for(const stage of STAGES)for(const policy of POLICIES)for(const seed0 of SEEDS){
   const page=await browser.newPage({viewport:{width:1000,height:620}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   for(let attempt=0;;attempt++){
    try{await page.goto(`http://localhost:${PORT}/?auto=walk`);await page.waitForFunction(()=>window.__game?.G.state==='play',null,{timeout:120000});break;}
    catch(e){if(attempt>=2)throw e;}
   }
   const r=await page.evaluate(async({stage,policy,seed0,maxTicks,ASSIST,OVERRIDE,REGULAR_ONLY})=>{
    const g=__game,G=g.G,{PROP_TYPES}=await import('./js/props.js');
    const {stringBeats,VENDOR_BUMP}=await import('./js/vendor_boss.js'),{getCloserTiming}=await import('./js/refund_boss_timing.js'),{GREEN_CONTACT,GREEN_FOLLOWUP}=await import('./js/combat_readability.js');
    if(REGULAR_ONLY){const def=g.STAGES.find(s=>s.id===stage);def.waves=def.waves.filter(w=>!w.boss&&!w.miniboss);}
    if(OVERRIDE){
     for(const [k,v] of Object.entries(OVERRIDE.propTypes||{}))Object.assign(PROP_TYPES[k],v);
     const o=OVERRIDE.stages?.[stage],def=g.STAGES.find(s=>s.id===stage);
     if(o?.props)def.props=o.props;
     if(o?.recovery)for(const w of def.waves)w.recovery=o.recovery.includes(w.x)?30:0;
     if(o?.recoveryWaves)def.waves.forEach((w,i)=>{w.recovery=o.recoveryWaves.includes(i+1)?30:0;});
    }
    // Bot timing has its own seeded jitter (India enemies are deterministic, so seeds
    // alone would replay one run): mash cadence varies, and the skilled bot misses some reads.
    let botSeed=(seed0^0x5bd1)>>>0;const br=()=>{botSeed=(Math.imul(botSeed,22695477)+1)>>>0;return botSeed/4294967296;};
    let atkNext=0;
    let seed=seed0;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    let audioSeed=991;const audioRandom=()=>{audioSeed=(Math.imul(audioSeed,1664525)+1013904223)>>>0;return audioSeed/4294967296;};
    for(const key of Object.keys(G.audio))if(typeof G.audio[key]==='function'){const o=G.audio[key];G.audio[key]=function(...a){const pr=Math.random;Math.random=audioRandom;try{return o.apply(this,a);}finally{Math.random=pr;}};}
    G.time=G.rawTime=0;g.resetInput();g.playStage(stage);G.freezeTime=true;
    const st=G.stage,waves=st.waves,skilled=policy==='skilled',pad=skilled,held=new Set();
    const padMap={attack:0,jump:1,parry:2,super:3,use:4,pause:9,up:12,down:13,left:14,right:15};
    if(pad)Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:[...held].some(a=>padMap[a]===i),value:[...held].some(a=>padMap[a]===i)?1:0}))}]});
    const input=acts=>{const w=new Set(acts);for(const a of held)if(!w.has(a)){if(!pad)g.release(a);held.delete(a);}for(const a of w)if(!held.has(a)){held.add(a);if(!pad)g.press(a);}};
    // ---- accounting ----
    const seg=i=>i<0?'approach':(waves[i].boss?'boss:'+st.boss:waves[i].miniboss?'mini:'+waves[i].miniboss:'w'+(i+1)+'@'+waves[i].x);
    const book={},entry=k=>book[k]||(book[k]={seg:k,damage:0,heal:{},deaths:0,entryHP:null,entries:0,ticks:0,wasted:{}});
    const tag=new WeakMap(),rigs=()=>new Set(G.enemies.map(e=>e.rig).filter(Boolean));
    let lastWave=-2,lastHP=G.player.hp,lastLives=G.lives,prevPickups=[],prevBroken=new Map(),continues=0,ticks=0,clearTick=null;
    let virt=null;const assist=ASSIST;let chosen=null,lastChosenTick=0,lastParry=-100,grace=0,dodgeLane=null,dodgeUntil=0,playerRef=G.player,roofSeen=false;
    const segKey=()=>{let k=seg(G.waveIndex);if(G.train?.climbed)k='boss:roof';return k;};
    const snapProps=()=>{const m=new Map();for(const q of G.props)m.set(q,q.broken);return m;};
    function account(){
     // Tag new pickups by source: the prop that broke this tick, a recovery placement, a carried lunch.
     const cur=new Set(G.pickups);
     for(const q of G.pickups)if(!tag.has(q)){
      let src=q.indiaRecovery!==undefined?'recovery':q.kind==='tiffin'?'tiffin':null;
      if(!src){const b=G.props.filter(p=>p.broken&&prevBroken.get(p)===false).sort((a,b)=>Math.abs(a.x-q.x)-Math.abs(b.x-q.x))[0];src=b?b.prop:'returned';}
      tag.set(q,{src,born:ticks,seg:segKey()});
     }
     return cur;
    }
    // ---- policy (india_playtest_check.cjs, extended for the train and breakables) ----
    // what just hurt CHAD: a projectile in reach, else the nearest attacker
    function sourceOf(){
     const p=G.player,shot=G.shots.filter(q=>Math.abs(q.x-p.x)<40&&Math.abs(q.y-p.y)<20)[0];
     if(shot)return 'shot:'+(shot.kind||'?');
     const z=(G.zones||[]).find(q=>Math.abs(q.x-p.x)<(q.r||30)+10&&Math.abs(q.y-p.y)<20);
     const foe=[...G.enemies,...(G.boss?[G.boss]:[])].filter(q=>!q.dead).sort((a,b)=>Math.abs(a.x-p.x)+2*Math.abs(a.y-p.y)-Math.abs(b.x-p.x)-2*Math.abs(b.y-p.y))[0];
     if(foe&&Math.abs(foe.x-p.x)<140)return (foe.key||foe.trainType||foe.kind)+':'+foe.state;
     return z?'zone:'+z.type:'other';
    }
    const alive=()=>G.enemies.filter(e=>!e.dead&&!e.cow&&!e.noCount&&e.state!=='spawn'&&!e.officeEntering);
    function breakable(){
     const p=G.player,r=rigs();
     return G.props.filter(q=>!q.broken&&!q.decor&&!q.hidden&&!q.carried&&!q.indiaBossProp&&!r.has(q)&&PROP_TYPES[q.prop]?.hp<999&&q!==G.boss?.cart&&q.x>p.x-80&&q.x>G.camX+8&&q.x<G.camX+472)
      .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    }
    function choose(){
     const p=G.player,list0=alive(),b=G.boss&&!G.boss.dead&&!G.boss.trainWaiting?G.boss:null;
     const fighting=list0.length||b;
     const food=G.pickups.filter(q=>q.heal>0&&q.x>G.camX+6&&q.x<G.camX+474&&(q.heal<=p.maxhp-p.hp||p.hp<p.maxhp-12));
     if(food.length&&(fighting?p.hp<60:p.hp<p.maxhp))return food.sort((a,c)=>Math.abs(a.x-p.x)-Math.abs(c.x-p.x))[0];
     if(b?.key==='dredger'&&b.phase==='machine'){if(b.z<10)return b;const crew=list0.find(e=>Math.abs(e.x-p.x)<90)||list0[0];if(crew)return crew;return skilled?{x:G.camLock+240,y:226,kind:'spot'}:null;}
     if(skilled&&b?.key==='vendor'&&b.valveActive&&!b.valve.broken)return b.valve;
     if(!fighting){const q=breakable();if(q)return q;}
     if(chosen&&!chosen.dead&&!chosen.broken&&chosen.kind!=='prop'&&ticks-lastChosenTick<100&&chosen.state!=='spawn')return chosen;
     const list=[...list0,...(b&&(b.key!=='dredger'||b.phase!=='machine'||b.z<10)?[b]:[])];
     list.sort((a,c)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*2+(a.z>24?80:0))-(Math.abs(c.x-p.x)+Math.abs(c.y-p.y)*2+(c.z>24?80:0)));
     chosen=list[0]||null;lastChosenTick=ticks;return chosen;
    }
    function dangerSoon(e){
     if(e.dead||e.protectedStagger||e.superLocked)return false;
     if(Math.abs(e.y-G.player.y)>18||Math.abs(e.x-G.player.x)>Math.max(85,e.range||0))return false;
     if(e.key){
      if(e.key==='vendor'&&e.state==='string'){const k=stringBeats(e);return [k.a,k.b,k.slam,k.slam2].filter(h=>h!=null).some(h=>e.t>=h-4&&e.t<h+2);}
      if(e.state==='ladle')return e.t>=5&&e.t<12||e.t>=27&&e.t<34||!e.cartGone&&e.t>=49&&e.t<56;
      if(e.state==='overhead')return e.t>=11&&e.t<18;
      if(e.state==='wrench')return [14,50].some(h=>e.t>=h-4&&e.t<=h);
      if(e.key==='vendor'&&e.state==='bump')return e.t>=VENDOR_BUMP.hit-4&&e.t<=VENDOR_BUMP.hit;
      if(e.state==='utensil'||e.state==='handset')return e.t>=7&&e.t<14;
      if(e.state==='boxing')return getCloserTiming(e).hits.some(h=>e.t>=h.at-4&&e.t<=h.at);
      // train bosses (train_boss_balance_check 'learned')
      if(e.state==='cane')return e.t<8||e.t>=20&&e.t<26||e.roof&&e.t>=38&&e.t<44;
      if(e.state==='clip')return e.t>=4&&e.t<=9||e.t>=16&&e.t<=21||e.t>=40&&e.t<=45;
      if(e.state==='charge')return e.t<6;
      if(['rush','shove'].includes(e.state))return !e.hitLanded;
      if(e.state==='swing')return !e.hitLanded&&e.z<40;
      return false;
     }
     if(e.state!=='attack'||e.kind==='cooker')return false;
     const at=['string','rf_string','baton'].includes(e.move)&&e.cls==='counter'?GREEN_FOLLOWUP:GREEN_CONTACT[e.move]||5;return e.t>=at-4&&e.t<=at;
    }
    for(;ticks<maxTicks;ticks++){
     if(REGULAR_ONLY&&G.waveIndex>=waves.length-1&&!G.waveActive&&!alive().length&&!G.spawnQueue.length)break;
     if(G.player!==playerRef){input([]);g.resetInput();held.clear();chosen=null;playerRef=G.player;grace=0;dodgeUntil=0;lastHP=G.player.hp;}
     if(G.waveIndex!==lastWave){lastWave=G.waveIndex;const e=entry(segKey());e.entries++;if(e.entryHP===null)e.entryHP=G.player.hp;}
     if(G.train?.climbed&&!roofSeen){roofSeen=true;const e=entry('boss:roof');e.entries++;if(e.entryHP===null)e.entryHP=virt!==null?Math.round(virt):G.player.hp;}
     const p=G.player,actions=[],b=G.boss&&!G.boss.dead&&!G.boss.trainWaiting?G.boss:null;
     const cine=G.india?.cinematic||G.train?.cinematic;
     if(G.state==='over'){if(continues<3&&ticks%60===0){actions.push('attack');continues++;held.clear();}else if(continues>=3)break;}
     else if(G.state==='clear'){if(clearTick===null)clearTick=ticks;break;}
     else if(G.state==='play'&&!cine&&!p.dying){
      const target=choose(),pickup=target&&G.pickups.includes(target),isProp=target?.kind==='prop';
      const tx=isProp?target.x-target.w*.5-10:target?.x,dx=target?tx-p.x:200,dy=target?target.y-p.y:0;
      const neutral=['idle','walk','run','parry','parry_recover','parry_counter'].includes(p.state);
      if(target){
       if(Math.abs(dy)>(pickup?2:4))actions.push(dy>0?'down':'up');
       if(isProp){if(Math.abs(dx)>6)actions.push(dx>0?'right':'left');else if(p.face<0)actions.push('right');}
       else if(Math.abs(dx)>(pickup?2:30)||Math.sign(dx)!==p.face)actions.push(dx>0?'right':'left');
      }else if(G.train&&!G.train.aboard){
       // the platform: walk to the coach door and board it
       if(p.x<2715)actions.push('right');else if(p.x>2740)actions.push('left');
       if(p.x>=2670&&p.x<=2765&&ticks%20<2)actions.push('use');
      }else actions.push('right');
      const hostile=[...G.enemies,...(b?[b]:[])];
      const incoming=G.shots.filter(s=>!s.reflected&&Math.abs(s.y-p.y)<18&&Math.abs(s.x-p.x)<100&&(p.x-s.x)*s.vx>0).sort((a,c)=>Math.abs(a.x-p.x)-Math.abs(c.x-p.x))[0];
      const shot=incoming&&Math.abs(incoming.x-p.x)<38?incoming:null;
      const danger=hostile.find(dangerSoon);
      const cooker=hostile.find(e=>!e.dead&&e.kind==='cooker'&&['windup','attack'].includes(e.state)&&Math.abs(e.y-p.y)<16&&Math.abs(e.x-p.x)<190);
      const machineRed=b?.key==='dredger'&&b.phase==='machine'&&b.state==='scoop'&&Math.abs(b.y-p.y)<14&&Math.abs(b.x-p.x)<70;
      const grabLock=b?.key==='dredger'&&(b.phase==='machine'?['droplock','dropfall'].includes(b.state)&&b:['lock','fall'].includes(b.grab?.state)&&b.grab);
      const safeToAct=!pickup&&(isProp?Math.abs(dx)<14:Math.abs(dx)<44)&&Math.abs(dy)<14&&(isProp||dx*p.face>=0);
      const turnThreat=skilled&&(incoming||danger);
      const pressure=b?.key==='vendor'&&b.pressureT>0&&Math.abs(p.y-b.pressureLane)<17;
      const belly=b?.key==='vendor'&&(['breath','fling'].includes(b.state)||b.state==='windup'&&b.pattern==='breath');
      const flop=b?.key==='vendor'&&(b.state==='flop'&&b.t>30&&Math.abs(b.leapTo-p.x)<60||b.wave&&Math.abs(Math.hypot(p.x-b.wave.x,(p.y-b.wave.y)*2.6)-b.wave.r)<22);
      const reach=skilled&&b&&['reach','sweep'].includes(b.pattern)&&b.state==='windup'&&b.t===24;
      if(skilled&&(cooker||pressure||belly)){const lane=cooker?cooker.y:belly?(b.state==='fling'?b.flingTo?.y??p.y:b.state==='breath'?b.lane:b.y):b.pressureLane;dodgeLane=lane>229?214:244;dodgeUntil=ticks+45;}
      if(turnThreat&&['idle','walk','run'].includes(p.state)&&Math.sign(turnThreat.x-p.x)!==p.face){actions.length=0;actions.push(turnThreat.x>p.x?'right':'left');}
      else if(turnThreat&&['parry','parry_recover','parry_counter'].includes(p.state)&&Math.sign(turnThreat.x-p.x)!==p.face){actions.length=0;if(shot&&p.state==='parry')actions.push('jump');}
      else if(skilled&&(cooker||machineRed||flop||reach)&&neutral){actions.push('jump');if(cooker)actions.push(p.y>229?'up':'down');}
      else if(skilled&&p.counterT>0&&p.state==='parry_counter'&&p.t>=6&&safeToAct){actions.length=0;actions.push('attack');grace=0;}
      else if(skilled&&(danger||shot)&&ticks-lastParry>=14&&neutral&&br()<0.15){lastParry=ticks;}
      else if(skilled&&(danger||shot)&&ticks-lastParry>=14&&neutral){actions.length=0;actions.push('parry');lastParry=ticks;grace=11;}
      else if(skilled&&grace>0){actions.length=0;actions.push('parry');grace--;}
      else if(target&&safeToAct){
       if(G.meter>=100&&!isProp&&['idle','walk','run'].includes(p.state)&&ticks%8===0)actions.push('super');
       else if(skilled&&!target.key&&!isProp&&Math.abs(dx)<30&&Math.abs(dy)<10&&['idle','walk'].includes(p.state)&&ticks%130<8)actions.push('use');
       else if(ticks>=atkNext&&(atkNext=ticks+(skilled?6+Math.floor(br()*4):6+Math.floor(br()*8)))||p.state==='parry_counter'&&p.t>=6||p.state==='grabbing'&&p.t>=9)actions.push('attack');
      }
      if(skilled&&grabLock&&Math.abs(grabLock.x-p.x)<44&&Math.abs(grabLock.y-p.y)<18){actions.length=0;actions.push(grabLock.x>p.x?'left':'right');}
      if(['held','down'].includes(p.state)&&ticks%4===0)actions.push('attack');
      if(skilled&&ticks<dodgeUntil){for(let i=actions.length-1;i>=0;i--)if(['up','down'].includes(actions[i]))actions.splice(i,1);if(Math.abs(p.y-dodgeLane)>2)actions.push(dodgeLane>p.y?'down':'up');}
     }
     prevPickups=[...G.pickups];prevBroken=snapProps();
     const kBefore=segKey(),livesBefore=G.lives;
     input(actions);g.step(1);
     const cur=account(),e=entry(kBefore);e.ticks++;
     let hp=G.player.hp;
     const gone=prevPickups.filter(q=>!cur.has(q)&&q.heal>0),same=G.player===playerRef;
     const fight=assist&&G.boss&&!G.boss.dead&&same&&!G.player.dying&&G.state==='play';
     if(G.lives<livesBefore){e.deaths+=livesBefore-G.lives;lastHP=hp;virt=null;}
     else if(G.lives>livesBefore){if(prevPickups.some(q=>q.kind==='life'&&!cur.has(q)))e.heal['1UP']=(e.heal['1UP']||0)+1;else e.continues=(e.continues||0)+1;}
     else if(fight||virt!==null){
      // Boss assist: the fight is played out on a virtual bar so the rest of the stage is
      // still measured. A bar that empties books a modelled retry at full health.
      if(virt===null)virt=lastHP;
      if(same&&hp<lastHP){e.damage+=lastHP-hp;virt-=lastHP-hp;while(virt<=0){e.modelDeaths=(e.modelDeaths||0)+1;virt+=100;}}
      for(const q of gone)if(hp>lastHP){const t=tag.get(q)?.src||'?',a=Math.min(q.heal,100-virt);virt+=a;e.heal[t]=(e.heal[t]||0)+a;}
      if(fight){G.player.hp=hp=G.player.maxhp-1;}
      else{G.player.hp=hp=Math.max(1,Math.round(virt));virt=null;}
     }
     else if(same&&hp<lastHP){e.damage+=lastHP-hp;const who=sourceOf();e.src=e.src||{};e.src[who]=(e.src[who]||0)+lastHP-hp;}
     else if(same&&hp>lastHP){
      // a drop can burst and be eaten on the same tick when CHAD stands where the prop stood
      const burst=G.props.find(p=>p.broken&&prevBroken.get(p)===false&&p.drop);
      const src=gone.length?(tag.get(gone[0])?.src||'?'):burst?burst.prop:'other';
      e.heal[src]=(e.heal[src]||0)+(hp-lastHP);
     }
     // offered but lost: a heal pickup that expired or was stolen without healing
     if(!(same&&G.player.hp>lastHP)&&!(fight&&gone.length))for(const q of gone){const t=tag.get(q)?.src||'?';e.wasted[t]=(e.wasted[t]||0)+q.heal;}
     lastHP=hp;
    }
    input([]);
    const offered={};
    for(const q of st.props){const d='drop' in q?q.drop:PROP_TYPES[q.kind].drop;if(d)offered[q.kind]=(offered[q.kind]||0)+1;}
    return{stage,policy,regularOnly:REGULAR_ONLY,seed:seed0,ticks,seconds:Math.round(ticks/60),result:G.state==='clear'||clearTick!==null?'clear':G.state,continues,livesLeft:G.lives,
     totalDamage:Object.values(book).reduce((s,e)=>s+e.damage,0),totalDeaths:Object.values(book).reduce((s,e)=>s+e.deaths,0),
     totalHeal:Object.values(book).reduce((s,e)=>s+Object.entries(e.heal).filter(([k])=>k!=='1UP'&&k!=='other').map(([,v])=>v).reduce((a,b)=>a+b,0),0),
     segments:Object.values(book),offered,
     layout:{width:st.width,boss:st.boss,
      waves:waves.map((w,i)=>({seg:seg(i),x:w.x,camX:w.camX,boss:!!w.boss,miniboss:w.miniboss||null,recovery:w.recovery||0,
       fighters:[...w.spawns0||w.spawns,...(w.reserves||[]).flat()].length,rigs:[...w.spawns0||w.spawns,...(w.reserves||[]).flat()].filter(k=>['ic_heavy','nr_heavy','ic_cabinet'].includes(k))})),
      props:st.props.map(q=>({kind:q.kind,x:q.x,y:q.y,drop:('drop' in q?q.drop:PROP_TYPES[q.kind].drop)||null})),
      checkpoints:G.train?[2880,5700,6240,7200]:((await import('./js/india_checkpoints.js')).INDIA_CHECKPOINTS[stage]||[]).map(c=>c.at)}};
   },{stage,policy,seed0,maxTicks:MAX_TICKS,ASSIST,OVERRIDE,REGULAR_ONLY});
   r.errors=errors;results.push(r);
   fs.writeFileSync(path.join(OUT,`${stage}-${policy}-${seed0}.json`),JSON.stringify(r,null,1));
   console.log(`${stage} ${policy} seed${seed0}: ${r.result} ${r.seconds}s dmg ${r.totalDamage} heal ${r.totalHeal} deaths ${r.totalDeaths} continues ${r.continues} errors ${errors.length}`);
   for(const s of r.segments)console.log(`  ${s.seg.padEnd(18)} in ${String(s.entryHP).padStart(3)} dmg ${String(s.damage).padStart(4)} deaths ${s.deaths}${s.modelDeaths?'+'+s.modelDeaths+'m':''} heal ${JSON.stringify(s.heal)} lost ${JSON.stringify(s.wasted)}`);
   await page.close();
  }
  fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(results,null,1));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
