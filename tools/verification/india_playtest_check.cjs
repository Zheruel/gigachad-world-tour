// Input-only encounter diagnostics. The policy can read actor tells, but cannot
// move actors, change health, force damage, skip waves, or release checkpoints.
// Times are automated lower bounds, not claims about a human first playthrough.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const OUT = 'tmp/review/india-playtest';
const STAGES = (process.env.STAGES || 'delhi,refund').split(',');
const POLICIES = (process.env.POLICIES || 'attack-heavy,varied').split(',');
const BOSS_ONLY=process.env.BOSS_ONLY==='1';
const BOSS_KEY=process.env.BOSS_KEY||'';
const MAX_TICKS=Number(process.env.MAX_TICKS)||66000;

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try {
    for(const stage of STAGES)for(const policy of POLICIES){
      const page=await browser.newPage({viewport:{width:1000,height:620}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://localhost:8011/?auto=walk');
      await page.waitForFunction(()=>window.__game?.G.state==='play');
      const result=await page.evaluate(async({stage,policy,bossOnly,bossKey,maxTicks})=>{
        const g=__game,G=g.G;
        let seed=541;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        // Audio detune/noise and wall-clock voice cooldowns must not consume the
        // gameplay seed. Sound still plays; only this diagnostic scopes its RNG.
        let audioSeed=991;
        const audioRandom=()=>{audioSeed=(Math.imul(audioSeed,1664525)+1013904223)>>>0;return audioSeed/4294967296;};
        for(const key of Object.keys(G.audio))if(typeof G.audio[key]==='function'){
          const original=G.audio[key];G.audio[key]=function(...args){
            const prior=Math.random;Math.random=audioRandom;
            try{return original.apply(this,args);}finally{Math.random=prior;}
          };
        }
        // Starting the diagnostic clock at zero removes variable time spent on
        // the preceding auto-preview. All stage actions then use normal updates.
        G.time=G.rawTime=0;
        g.resetInput();g.playStage(stage);G.freezeTime=true;
        if(bossOnly){
          g.indiaScene(stage,bossKey||(stage==='delhi'?'vendor':'closer'),0);
          if(stage==='refund')g.spawn('ic_security',260,0);
        }
        const isolatedBoss=bossOnly?G.boss:null;
        const technical=policy!=='attack-heavy',parryFocused=policy==='parry-focused';
        const pad=technical, held=new Set();
        const padMap={attack:0,jump:1,parry:2,super:3,use:4,pause:9,up:12,down:13,left:14,right:15};
        if(pad)Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{
          connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:[...held].some(a=>padMap[a]===i),value:[...held].some(a=>padMap[a]===i)?1:0})),
        }]});
        function input(actions){
          const wanted=new Set(actions);
          for(const a of held)if(!wanted.has(a)){if(!pad)g.release(a);held.delete(a);}
          for(const a of wanted)if(!held.has(a)){held.add(a);if(!pad)g.press(a);}
        }
        const trace=[],events=[],captures=[],encounters=[],defenses=[],watch=new Map(),patterns=new Set();
        let ticks=0,damage=0,deaths=0,continues=0,parries=0,guards=0,grabs=0,supers=0;
        let lastHP=G.player.hp,lastLives=G.lives,lastCounter=0,lastState='',lastEvent='',lastWave=-2;
        let encounter=null,clearTick=null,lastProgress=0,progressSignature='',lastParry=-100,grace=0;
        let lastActionState='',chosen=null,lastChosenTick=0,lastCheckpoint='',playerRef=G.player,dodgeLane=null,dodgeUntil=0;
        const stuck=[];
        const simple=e=>e?{key:e.key||e.trainType||e.kind,state:e.state,pattern:e.pattern,t:e.t,x:Math.round(e.x),y:Math.round(e.y),z:Math.round(e.z||0),hp:e.hp,guard:e.guard,phase:e.phase,phaseTwo:e.phaseTwo,...(e.key==='dredger'?{winchGone:e.winchGone,pumpGone:e.pumpGone,cabBroken:e.cab?.broken,crewSpawned:e.crewSpawned,restarts:e.restarts}:{} )}:null;
        function capture(label){g.render();if(captures.length<35)captures.push({label,ticks,png:document.querySelector('#game').toDataURL('image/png')});}
        function logState(){
          const key=[G.state,G.waveIndex,G.boss?.key,G.boss?.phase,G.india?.cinematic?.kind,G.india?.retryPoint?.id].join(':');
          if(key!==lastEvent){events.push({ticks,key,player:simple(G.player),lives:G.lives});lastEvent=key;}
          if(G.waveIndex!==lastWave){
            if(encounter){encounter.end=ticks;encounter.seconds=(ticks-encounter.start)/60;encounter.complete=G.waveIndex>lastWave;}
            lastWave=G.waveIndex;
            if(lastWave>=0){encounter={wave:lastWave+1,start:ticks,startHP:G.player.hp,startLives:G.lives,boss:isolatedBoss?.key||G.stage.waves[lastWave]?.miniboss||(G.stage.waves[lastWave]?.boss?G.stage.boss:null)};encounters.push(encounter);capture(`wave-${lastWave+1}-${encounters.length}`);}
          }
          if(G.india?.retryPoint?.id!==lastCheckpoint){lastCheckpoint=G.india?.retryPoint?.id;events.push({ticks,checkpoint:lastCheckpoint,baseline:{hp:G.player.hp,meter:G.meter}});}
        }
        function choose(){
          const p=G.player,alive=G.enemies.filter(e=>!e.dead&&!e.cow&&!e.noCount&&e.state!=='spawn'&&!e.officeEntering);
          const b=G.boss&&!G.boss.dead?G.boss:null;
          const food=G.pickups.filter(q=>q.heal>0);
          if(p.hp<(G.waveActive?60:90)&&food.length){return food.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];}
          if(b?.key==='dredger'&&b.phase==='machine'){
            const crew=alive.find(e=>Math.abs(e.x-p.x)<90);
            if(crew)return crew;
            if(technical&&b.pump&&!b.pump.broken)return b.pump;
            if(!b.winchGone)return b.winch;
            if(b.z<36)return b;
          }
          if(technical&&b?.key==='vendor'&&b.valveActive&&!b.valve.broken)return b.valve;
          // The varied route deliberately breaks nearby furniture and protection.
          if(technical&&b?.key==='vendor'&&!b.cartGone)return b.cart;
          if(chosen&&!chosen.dead&&!chosen.broken&&ticks-lastChosenTick<100&&chosen.state!=='spawn')return chosen;
          const list=[...alive,...(b&&(b.key!=='dredger'||b.phase!=='machine'||b.z<36)?[b]:[])];
          list.sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*2+(a.z>24?80:0))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)*2+(b.z>24?80:0)));
          chosen=list[0]||null;lastChosenTick=ticks;return chosen;
        }
        function dangerSoon(e){
          if(e.dead||e.protectedStagger||e.superLocked)return false;
          if(Math.abs(e.y-G.player.y)>18||Math.abs(e.x-G.player.x)>Math.max(85,e.range||0))return false;
          if(e.key){
            if(e.state==='ladle')return e.t>=5&&e.t<12||e.t>=27&&e.t<34||!e.cartGone&&e.t>=49&&e.t<56;
            if(e.state==='overhead')return e.t>=11&&e.t<18;
            if(e.state==='wrench')return e.t>=3&&e.t<10||e.t>=23&&e.t<30;
            if(e.state==='utensil')return e.t>=7&&e.t<14;
            if(e.state==='handset')return e.t>=7&&e.t<14;
            if(e.state==='boxing')return e.t>=3&&e.t<10||e.t>=21&&e.t<28||e.phaseTwo&&e.t>=39&&e.t<46;
            if(['rush','shove'].includes(e.state))return !e.hitLanded;
            if(e.state==='swing')return e.t<6;
            return false;
          }
          return e.state==='attack'&&e.t<8&&e.kind!=='cooker';
        }
        for(;ticks<maxTicks;ticks++){
          if(G.player!==playerRef){input([]);g.resetInput();held.clear();chosen=null;playerRef=G.player;grace=0;dodgeUntil=0;}
          logState();
          const p=G.player,actions=[],b=G.boss&&!G.boss.dead?G.boss:null;
          if(G.state==='chapter-card'){if(ticks%3===2)actions.push('use');}
          else if(G.state==='over'){
            // Continue is a normal game control, recorded separately from a clean run.
            if(continues<3&&ticks%60===0){actions.push('attack');continues++;held.clear();}
            else if(continues>=3)break;
          }
          else if(G.state==='clear'){
            if(clearTick===null){clearTick=ticks;capture('victory');}
            actions.push('use'); // Held throughout the tally must never continue.
            if(ticks-clearTick>=240)break;
          }
          else if(G.state==='play'&&!G.india?.cinematic&&!p.dying){
            const target=choose(),dx=target?target.x-p.x:200,dy=target?target.y-p.y:0,pickup=target&&G.pickups.includes(target);
            const neutral=['idle','walk','run','parry','parry_recover','parry_counter'].includes(p.state);
            if(target){
              if(Math.abs(dy)>(pickup?2:4))actions.push(dy>0?'down':'up');
              if(Math.abs(dx)>(pickup?2:30)||Math.sign(dx)!==p.face)actions.push(dx>0?'right':'left');
            }else actions.push('right');
            const hostile=[...G.enemies,...(b?[b]:[])];
            const incoming=G.shots.filter(s=>!s.reflected&&Math.abs(s.y-p.y)<18&&
              Math.abs(s.x-p.x)<100&&(p.x-s.x)*s.vx>0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
            const shot=incoming&&Math.abs(incoming.x-p.x)<38?incoming:null;
            const danger=hostile.find(dangerSoon);
            const cooker=hostile.find(e=>!e.dead&&e.kind==='cooker'&&['windup','attack'].includes(e.state)&&Math.abs(e.y-p.y)<16&&Math.abs(e.x-p.x)<190);
            const machineRed=b?.key==='dredger'&&b.phase==='machine'&&['sweepaim','sweep','dropaim','bucketfall','tell','hose'].includes(b.state);
            const preparing=parryFocused&&hostile.find(e=>!e.dead&&!e.protectedStagger&&
              Math.abs(e.x-p.x)<(e.key?180:90)&&Math.abs(e.y-p.y)<22&&
              (e.state==='windup'&&!['call','valve'].includes(e.pattern)||['handset','utensil'].includes(e.state)));
            const safeToAct=!pickup&&Math.abs(dx)<44&&Math.abs(dy)<14&&dx*p.face>=0;
            const turnThreat=technical&&(incoming||preparing||danger);
            const pressure=b?.key==='vendor'&&b.pressureT>0&&Math.abs(p.y-b.pressureLane)<17;
            const belly=b?.key==='vendor'&&(b.state==='vendor-lunge'||b.state==='windup'&&b.pattern==='vendor-lunge');
            if(technical&&(cooker||pressure||belly)){
              const lane=cooker?cooker.y:belly?b.attackLane:b.pressureLane;
              dodgeLane=lane>229?214:244;dodgeUntil=ticks+45;
            }
            if(parryFocused&&pressure&&neutral){
              actions.length=0;actions.push('jump',p.y>228?'up':'down');
            }else if(turnThreat&&['idle','walk','run'].includes(p.state)&&
              Math.sign(turnThreat.x-p.x)!==p.face){
              actions.length=0;actions.push(turnThreat.x>p.x?'right':'left');
            }else if(turnThreat&&['parry','parry_recover','parry_counter'].includes(p.state)&&
              Math.sign(turnThreat.x-p.x)!==p.face){
              actions.length=0;
              if(shot&&p.state==='parry')actions.push('jump');
            }else if(technical&&(cooker||machineRed)&&neutral){
              actions.push('jump');
              if(cooker)actions.push(p.y>229?'up':'down');
            }else if(technical&&p.counterT>0&&p.state==='parry_counter'&&p.t>=6&&safeToAct){
              actions.length=0;actions.push('attack');grace=0;
            }else if(technical&&(danger||shot)&&ticks-lastParry>=14&&neutral){
              // Start one fresh parry when the visible contact enters its window.
              actions.length=0;actions.push('parry');lastParry=ticks;grace=11;
            }else if(technical&&grace>0){actions.length=0;actions.push('parry');grace--;}
            else if(preparing){
              // Respect visible windups: finish/cancel the current confirmed hit,
              // release guard before contact, then time a genuinely fresh parry.
              const wind=preparing.key==='vendor'?(preparing.pattern==='rush'?52:preparing.pattern==='overhead'?52:36):
                preparing.key==='closer'?(preparing.pattern==='shove'?52:32):
                ({goonda:18,batta:28,constable:22,operator:25,sepoy:24,thela:30}[preparing.kind]||22);
              actions.length=0;
              if(preparing.state==='windup'&&preparing.t<wind-10&&p.hitConfirm)actions.push('parry');
            }
            else if(parryFocused&&b&&!b.protectedStagger&&['ladle','overhead','utensil','rush','vendor-lunge','wrench','toolthrow','hose'].includes(b.state)&&Math.abs(b.x-p.x)<110){
              // Do not start a fresh jab during an already committed boss string.
              // Wait for its next visible contact, then use the earned counter.
              actions.length=0;if(p.state==='attack'&&p.hitConfirm)actions.push('parry');
            }
            else if(target&&safeToAct){
              if(technical&&G.meter>=100&&target.kind!=='prop'&&['idle','walk','run'].includes(p.state)&&ticks%8===0)actions.push('super');
              else if(technical&&!target.key&&target.kind!=='prop'&&Math.abs(dx)<30&&Math.abs(dy)<10&&['idle','walk'].includes(p.state)&&ticks%130<8)actions.push('use');
              else if(ticks%8===0||p.state==='parry_counter'&&p.t>=6||p.state==='grabbing'&&p.t>=9)actions.push('attack');
              if(policy==='attack-heavy'&&G.meter>=100&&target.kind!=='prop'&&['idle','walk','run'].includes(p.state)&&ticks%8===0)actions.push('super');
            }
            if(['held','down'].includes(p.state)&&ticks%4===0)actions.push('attack');
            if(technical&&ticks<dodgeUntil){
              for(let i=actions.length-1;i>=0;i--)if(['up','down'].includes(actions[i]))actions.splice(i,1);
              if(Math.abs(p.y-dodgeLane)>2)actions.push(dodgeLane>p.y?'down':'up');
            }
          }
          const beforePlayer={state:p.state,t:p.t,hitConfirm:p.hitConfirm,guardWindow:p.guardWindow};
          input(actions);g.step(1);
          if(G.boss?.pattern)patterns.add(G.boss.key+':'+G.boss.pattern);
          if(G.player.hp<lastHP){
            damage+=lastHP-G.player.hp;
            if(defenses.length<400)defenses.push({ticks,beforePlayer,damage:lastHP-G.player.hp,actions:[...actions],beforeTarget:simple(chosen),player:{...simple(G.player),face:G.player.face,window:G.player.guardWindow,defense:G.player.lastDefense},boss:simple(G.boss),shots:G.shots.map(s=>({kind:s.kind,x:s.x,y:s.y,vx:s.vx}))});
          }
          if(G.lives<lastLives)deaths+=lastLives-G.lives;
          if(G.player.counterT>lastCounter)parries++;
          if(G.player.lastDefense==='guard'&&G.player.hp<lastHP)guards++;
          if(G.player.state!==lastActionState){if(G.player.state==='grabbing')grabs++;if(G.player.state==='special')supers++;lastActionState=G.player.state;}
          lastHP=G.player.hp;lastLives=G.lives;lastCounter=G.player.counterT||0;
          if(bossOnly&&G.player.dying){capture('defeat');break;}
          if(isolatedBoss?.dead){capture('boss-defeated');break;}
          if(ticks%60===0){
            const snapshot={ticks,state:G.state,wave:G.waveIndex+1,hp:G.player.hp,lives:G.lives,x:Math.round(G.player.x),y:Math.round(G.player.y),playerState:G.player.state,remaining:G.enemies.filter(e=>!e.dead&&!e.noCount).map(simple),boss:simple(G.boss),meter:Math.round(G.meter),checkpoint:G.india?.retryPoint?.id};
            trace.push(snapshot);
            const signature=JSON.stringify([G.state,G.waveIndex,G.stats.kos,G.boss?.hp,G.boss?.phase,G.player.hp,Math.round(G.player.x/30),G.enemies.filter(e=>!e.dead).map(e=>e.hp),G.props.filter(e=>!e.broken).map(e=>Math.ceil(e.hp/10))]);
            if(signature!==progressSignature){lastProgress=ticks;progressSignature=signature;}
            if(ticks-lastProgress>3600&&G.state==='play'){stuck.push({reason:'no visible progress for 60 seconds',...snapshot});capture('stuck');break;}
          }
          for(const e of G.enemies){
            const recovering=['down','thrown','grabbed','getup','hurt','grabhold'].includes(e.state);
            const age=recovering?(watch.get(e)||0)+1:0;watch.set(e,age);
            if(age===600)stuck.push({reason:'recovery longer than 10 seconds',ticks,enemy:simple(e)});
          }
        }
        if(encounter){encounter.end=ticks;encounter.seconds=(ticks-encounter.start)/60;encounter.complete=!!isolatedBoss?.dead||clearTick!==null;}
        g.render();capture('final');
        const result={stage,policy,bossOnly,input:pad?'simulated standard gamepad':'debug keyboard action edges',seed:541,ticks,seconds:ticks/60,result:isolatedBoss?.dead?'boss-defeated':G.state,clearTick,damage,deaths,continues,parries,guards,grabs,supers,lives:G.lives,hp:G.player.hp,score:G.score,kos:G.stats.kos,bestCombo:G.bestCombo,checkpoint:G.india?.retryPoint?.id,boss:simple(G.boss||isolatedBoss),patterns:[...patterns],encounters,stuck,events,trace,defenses,captures};
        if(clearTick!==null){
          const score=G.score,checks=[];
          checks.push(['held confirmation cannot continue',G.state==='clear']);
          input([]);g.step(1);input(['attack']);g.step(5);
          checks.push(['attack cannot confirm chapter victory',G.state==='clear']);
          checks.push(['score awarded once',G.score===score]);
          input([]);g.step(1);input(['use']);g.step(60);
          checks.push(['fresh confirmation reaches campaign destination',stage==='delhi'?G.stage.id==='refund'&&G.state==='chapter-card':G.state==='ending']);
          result.victoryChecks=checks;result.handoff={stage:G.stage.id,state:G.state};
        }
        input([]);
        return result;
      },{stage,policy,bossOnly:BOSS_ONLY,bossKey:BOSS_KEY,maxTicks:MAX_TICKS});
      const prefix=BOSS_ONLY?`boss-${BOSS_KEY?BOSS_KEY+'-':''}`:'';
      for(const c of result.captures){fs.writeFileSync(path.join(OUT,`${prefix}${stage}-${policy}-${c.label}.png`),Buffer.from(c.png.split(',')[1],'base64'));delete c.png;}
      result.errors=errors;results.push(result);
      fs.writeFileSync(path.join(OUT,`${prefix}${stage}-${policy}.json`),JSON.stringify(result,null,2));
      console.log(JSON.stringify({...result,trace:undefined,captures:undefined,events:undefined,defenses:undefined}));
      await page.close();
    }
    fs.writeFileSync(path.join(OUT,BOSS_ONLY?'boss-summary.json':'summary.json'),JSON.stringify(results.map(({trace,captures,events,defenses,...r})=>r),null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
