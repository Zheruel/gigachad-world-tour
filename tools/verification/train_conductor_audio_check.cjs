// Head Conductor sound cues: every beat of the reveal, the fight and the finisher asks for its cond_* sample
// (tools/production/build_conductor_audio.py), pools rotate, repeats are rate-limited and pause stops the cues.
// Run: NODE_PATH=<playwright> node tools/verification/train_conductor_audio_check.cjs (server on :8011)
const studio=require('./studio_helper.cjs');
const assert=require('node:assert/strict');
(async()=>{const {page,errors,close}=await studio.launch();try{
 await studio.openStudio(page,'train/conductor');await studio.seek(page,300);const f=page.frames().find(f=>f.url().includes('?auto=walk'));
 const out=await f.evaluate(async()=>{
  const g=__game,G=g.G,{updateBoss}=await import('./js/bosses.js'),checks=[],ok=(n,v,d)=>checks.push([n,!!v,...(v?[]:[d])]);
  // Every cue the game asks for, with the moment it asked; has() is true so fallbacks never mask a cue.
  let log=[];const allLog=[],a=G.audio,realAudio={...a},rec=kind=>(n,...r)=>{const e={n,kind,t:G.boss?.t,s:G.boss?.state,intro:G.boss?.introT,cin:G.train?.cinematic?.t,pan:kind==='at'?r[1]:0,volume:r[0],duration:kind==='room'?r[1]:undefined};log.push(e);allLog.push(e);return true;};
  Object.assign(a,{sfx:rec('sfx'),roomSfx:rec('room'),roomSfxAt:rec('at'),trainSfx:rec('train'),voice:rec('voice'),has:()=>true});
  const names=()=>log.map(e=>e.n),has=(n,l=log)=>l.some(e=>e.n===n||e.n.startsWith(n+'_')),clear=()=>{log=[];};
  const run=n=>{for(let i=0;i<n;i++){G.time++;updateBoss();}};  // the game clock drives pool gaps
  const fresh=()=>{g.trainScene('conductor',300);const b=G.boss,p=G.player;G.enemies=[];Object.assign(b,{protectedStagger:0,atkCd:999,face:-1,hitLanded:false});Object.assign(p,{invuln:0,state:'idle',x:b.x-50,y:b.y,face:1,guardWindow:0,z:0,hp:p.maxhp||100});clear();return [b,p];};
  // Files exist for every registered cue.
  const files=['grunt_1','grunt_2','grunt_3','hurt_1','hurt_2','yell','laugh','fall','ohno','whistle','crash','box_hit','thud','stamp','ink','punch','note_1','note_2','coins_1','coins_2','chain_1','chain_2','latch','lid','scrape','chair','step_1','step_2','desk','clatter','papers','coin_tick','box_drop','swing'].map(n=>'cond_'+n);
  const heads=await Promise.all(files.map(n=>fetch(`audio/sfx/${n}.wav`,{method:'HEAD',cache:'reload'}).then(r=>r.ok)));
  ok('all 34 cond_* files are served',heads.every(Boolean),files.filter((n,i)=>!heads[i]));
  const src=await (await fetch('js/audio.js',{cache:'reload'})).text();
  ok('every cond_* file is registered in SFX_FILES',files.every(n=>src.includes(`'${n}'`)));

  // ---- the reveal ----
  g.trainScene('conductor',0);clear();for(let i=0;i<300;i++)g.step(1);
  const at=(n,t)=>log.some(e=>(e.n===n||e.n.startsWith(n+'_'))&&e.intro===t);
  ok('reveal: counting notes at 4/13/22',[4,13,22].every(t=>at('cond_note',t)),log.filter(e=>e.intro<30).map(e=>e.n+'@'+e.intro));
  ok('reveal: box lid at 30, chair shoved at 62, up with a grunt at 68, hand on desk at 88',at('cond_lid',30)&&at('cond_chair',62)&&at('cond_grunt',68)&&at('cond_desk',88));
  ok('reveal: four shoe steps round the desk',[132,150,176,194].every(t=>at('cond_step',t)));
  ok('reveal: steps alternate left/right samples',new Set(log.filter(e=>e.n.startsWith('cond_step')).map(e=>e.n)).size===2);
  ok('reveal: nothing over the spoken line (210-300) but its own typing',!log.some(e=>e.intro>=210&&e.n.startsWith('cond_')));
  ok('reveal: old placeholder Foley retired',!has('room_page')&&!has('room_chair')&&!has('entrance_boot'));
  g.trainScene('conductor',100);g.press('pause');g.step(1);g.release('pause');clear();g.step(120);
  ok('reveal: pause holds every cue',log.length===0,names());g.press('pause');g.step(1);g.release('pause');

  // ---- the fight ----
  let [b,p]=fresh();Object.assign(b,{state:'windup',pattern:'stamp',t:0});run(1);
  ok('DENIED wind-up inks the stamp',has('cond_ink'),names());
  [b,p]=fresh();Object.assign(b,{state:'windup',pattern:'stamp',t:29});run(2);
  ok('stamp thrown with a whiff and an effort grunt',has('whiff')&&has('cond_grunt'),names());
  [b,p]=fresh();Object.assign(b,{pattern:'stamp',state:'stamp',t:4});run(1);
  ok('landed stamp thumps (rubber stamp)',has('cond_stamp')&&p.guardDenied>0,names());
  [b,p]=fresh();G.meter=60;b.boxMeter=30;p.guardWindow=10;Object.assign(b,{pattern:'stamp',state:'stamp',t:4});run(1);
  ok('parried stamp: VOID thump + yell + box knocked loose (steel box, spilled change)',b.voidT>0&&has('cond_stamp')&&has('cond_yell')&&has('cond_box_hit')&&has('cond_coins'),names());
  ok('VOID does not also cry "oh my god"',!has('cond_ohno'));
  ok('VOID does not stack a pain grunt under its yell',!has('cond_hurt'));
  [b,p]=fresh();b.parryAt=G.time-26;Object.assign(b,{pattern:'stamp',state:'stamp',t:4});run(1);
  ok('TOO EARLY punches the ticket',!!b.inkEarly&&has('cond_punch'),names());
  [b,p]=fresh();Object.assign(b,{state:'windup',pattern:'seize',t:0});run(1);
  ok('SEIZED wind-up flips the box catch',has('cond_latch'),names());
  [b,p]=fresh();G.meter=80;Object.assign(b,{pattern:'seize',state:'seize',t:5});run(1);
  ok('SEIZED impact does not overlap the attack grunt with a laugh',has('cond_stamp')&&!has('cond_laugh'),names());
  clear();for(let i=0;i<120&&b.state==='seize';i++)run(1);const coinN=log.filter(e=>e.n==='cond_coin_tick').length;
  ok('meter transfer uses short clinks rather than overlapping coin spills',coinN>=2&&coinN<=4&&!has('pickup')&&!has('cond_coins'),coinN);
  ok('gloating starts after the launch grunt has finished',has('cond_laugh')&&log.find(e=>e.n==='cond_laugh').t>=31,names());
  ok('pour ends with the lid snapping shut',b.state==='recover'&&log.at(-1)?.n==='cond_lid',names());
  [b,p]=fresh();G.meter=80;Object.assign(b,{pattern:'seize',state:'seize',t:5});run(27);clear();G.meter=80;Object.assign(b,{pattern:'seize',state:'seize',t:5});run(27);
  ok('laugh is rate-limited across seizes',!has('cond_laugh'));
  [b,p]=fresh();b.boxMeter=20;Object.assign(b,{state:'windup',pattern:'swing',t:0});run(1);
  ok('box swing wind-up hefts the loaded box',has('grab')&&has('cond_coins'),names());
  [b,p]=fresh();Object.assign(b,{pattern:'swing',state:'swing',t:7});run(1);
  ok('box swing connects with a steel bang',p.hp<(p.maxhp||100)&&has('cond_box_hit'),names());
  for(const [pattern,end] of [['stamp',5],['seize',6],['swing',8]]){
   [b,p]=fresh();p.x=b.x-200;Object.assign(b,{state:'windup',pattern,t:35});run(1);clear();
  // Include launch in the counted sounds, then run the actual contact ticks against an absent target.
   Object.assign(b,{state:'windup',pattern,t:35});run(1);for(let i=0;i<end;i++)run(1);
   const whooshes=log.filter(e=>e.n==='whiff'||e.n==='cond_swing');
   ok(pattern+' miss has exactly one whoosh and no impact',whooshes.length===1&&!has('cond_stamp')&&!has('cond_box_hit'),names());
  }
  [b,p]=fresh();Object.assign(b,{hp:b.maxhp*.45,p2Called:true,pattern:'brake',state:'windup',t:0});run(1);
  ok('EMERGENCY: whistle blast',has('cond_whistle'),names());
  clear();run(45);ok('reaching for the chain rattles it (3-4 times)',[3,4].includes(log.filter(e=>e.n==='cond_chain_1').length),log.filter(e=>e.n==='cond_chain_1').length);
  ok('yank: chain, effort, brakes',has('cond_chain_2')&&has('cond_grunt')&&has('train_brake')&&b.pulls===1,names());
  clear();run(100);const scr=log.filter(e=>e.n==='cond_scrape');
  ok('each sliding case scrapes, panned to its side',scr.length===3&&scr.every(e=>e.pan===-.6),scr.map(e=>e.pan));
  clear();run(90);ok('re-hook: chain jingles, shackle latches',has('cond_chain_1')&&has('cond_latch'),names());
  [b,p]=fresh();b.boxMeter=40;b.seizedTotal=40;b.dropBox(1);ok('first loaded box knocked loose: "oh my god" once',has('cond_ohno'),names());
  clear();run(30);ok('loose box lands with its own metal drop and change',has('cond_box_drop')&&has('cond_coins')&&!has('cond_lid'),names());
  clear();Object.assign(b,{state:'recover',t:0,recoverFor:999});b.boxLoose.hurt(5,1);
  ok('hitting the box: steel bang, refund cue, dive yell',has('cond_box_hit')&&has('pickup')&&has('cond_yell')&&b.state==='dive',names());
  ok('a recent box landing spill is not restarted by the refund',!has('cond_coins'),names());
  clear();run(40);ok('dive lands on the box with a thud',b.state==='sprawl'&&has('cond_thud'),names());
  clear();run(60);ok('gets up off the box with a grunt and takes it back',has('cond_grunt')&&has('cond_lid'),names());
  b.hasBox=true;b.boxMeter=40;b.dropBox(1);ok('"oh my god" is once per fight',!log.slice(-4).some(e=>e.n==='cond_ohno'));
  [b,p]=fresh();Object.assign(b,{state:'idle',t:0,atkCd:999});for(let i=0;i<8;i++){b.state='idle';b.hurt(2,b.face,false,false);G.time+=6;}
  const hurts=log.filter(e=>e.n.startsWith('cond_hurt'));
  ok('hit reactions voice, rate-limited (8 hits 6 ticks apart -> 2)',hurts.length===2,hurts.length);
  ok('hurt pool never repeats back to back',hurts.every((e,i)=>!i||e.n!==hurts[i-1].n));
  [b,p]=fresh();Object.assign(b,{state:'stagger',protectedStagger:45});b.hurt(30,1,true,false);
  ok('knockdown yells',b.state==='down'&&has('cond_yell'),[b.state,names()]);
  ok('knockdown has one pain performance',!has('cond_hurt'));
  clear();for(let i=0;i<30&&b.state==='down';i++)run(1);ok('knockdown lands with a thud',has('cond_thud'),names());
  clear();for(let i=0;i<60&&b.state!=='getup';i++)run(1);run(2);ok('gets up with a grunt',has('cond_grunt'),[b.state,names()]);
  [b,p]=fresh();Object.assign(p,{state:'down'});Object.assign(b,{state:'idle',atkCd:999,x:p.x+80,taunted:false});run(1);
  ok('downed CHAD: he laughs and counts notes',b.state==='count'&&has('cond_laugh'),[b.state,names()]);
  clear();run(48);ok('counting flicks notes every 12 ticks',log.filter(e=>e.n.startsWith('cond_note')).length===4,names());
  [b,p]=fresh();Object.assign(b,{hp:b.maxhp*.52,state:'recover',recoverPose:'swing',recoverFor:99,t:0});b.hurt(40,1,true,false);
  ok('phase 2 call: enrage + whistle',has('enrage')&&has('cond_whistle'),names());
  [b,p]=fresh();b.state='idle';p.dying=true;run(1);p.dying=false;ok('victory laugh',b.state==='victory'&&has('cond_laugh'),names());
  [b,p]=fresh();const picks=[];for(let i=0;i<12;i++){G.time+=60;Object.assign(b,{state:'windup',pattern:'stamp',t:29});clear();run(2);const e=log.find(e=>e.n.startsWith('cond_grunt'));if(e)picks.push(e.n);}
  ok('attack grunts rotate without back-to-back repeats',picks.length===12&&picks.every((n,i)=>!i||n!==picks[i-1])&&new Set(picks).size===3,picks);

  // ---- the finisher ----
  g.trainScene('inspector-finish',0);clear();for(let i=0;i<370&&G.train.cinematic;i++)g.step(1);
  const cin=(n,t)=>log.some(e=>e.n===n&&e.cin===t);
  ok('finisher: choked (56, 64), wad plucked (74), notes burst (154)',cin('cond_hurt_2',56)&&cin('cond_hurt_1',64)&&cin('cond_note_2',74)&&cin('cond_note_1',154),log.filter(e=>e.n.startsWith('cond_')).map(e=>e.n+'@'+e.cin));
  ok('finisher: scream across the office (157), stamp clatters (192), desk crashes (199)',cin('cond_fall',157)&&cin('cond_clatter',192)&&cin('cond_crash',199));
  const choke=log.filter(e=>e.n.startsWith('cond_hurt')&&[56,64].includes(e.cin)),scream=log.find(e=>e.n==='cond_fall');
  ok('finisher choke reactions finish before the next reaction',choke.length===2&&choke[0].duration<8/60&&choke[1].duration<10/60,choke);
  ok('flight scream ends before the landed groan',scream?.duration<(222-157)/60,scream);
  ok('finisher: papers (205, 232) and a last groan (222)',cin('cond_papers',205)&&cin('cond_papers',232)&&log.some(e=>e.n==='cond_hurt_2'&&e.cin===222&&e.kind==='at'));
  ok('finisher: CHAD keeps his Duke line',log.some(e=>e.n==='duke_suck_it_down'));
  Object.assign(a,realAudio);return {checks,events:allLog};
 });
 const checks=out.checks;
 await page.getByRole('button',{name:'Play cinematic',exact:true}).click();
 const active=await studio.game(page,(g,G)=>{const a=G.audio;a.sfx('cond_stamp',.7);a.roomSfx('cond_fall',.8,1);a.roomSfxAt('cond_scrape',.45,-.6);return a.snapshot();});
 checks.push(['real stamp, timed scream and panned scrape have tracked sources',active.samples>0&&active.roomSources>=2]);
 await page.evaluate(()=>__review.pause());await page.waitForFunction(()=>__review.game.G.audio.snapshot().state==='suspended');
 checks.push(['pause suspends real conductor samples',true]);
 await studio.load(page,'train/conductor-fight');
 const stopped=await studio.game(page,(g,G)=>G.audio.snapshot());
 checks.push(['changing the review scene stops old conductor samples',stopped.samples===0&&stopped.roomSources===0]);
 require('node:fs').mkdirSync('tmp/review/combat-ui',{recursive:true});
 require('node:fs').writeFileSync('tmp/review/combat-ui/conductor-audio-events.json',JSON.stringify(out,null,2));
 console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c[1]).length,failures:checks.filter(c=>!c[1]),errors}));
 assert(checks.every(c=>c[1]),JSON.stringify(checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
