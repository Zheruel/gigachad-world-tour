// Shera's brutal finisher ('shera-finish'): KO trigger from the enraged fight, beat timing and sounds, one Duke line,
// no window throw or Netaji lines, the landing breaks a trunk, climb to the roof and one handoff, pause, render purity,
// missing art. Captures the storyboard beats at 1x/2x into tmp/review/shera_rework/run2/finisher/ (NO_CAPTURE=1 skips).
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const URL='http://localhost:'+(process.env.PORT||8011)+'/?auto=walk';
const cells=JSON.parse(fs.readFileSync('assets/frames/manifest.json','utf8')).nr_neta_guard.rage_finish||[];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{const p=await b.newPage({viewport:{width:980,height:580}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(URL);await p.waitForFunction(()=>__game?.G.state==='play');
 const checks=await p.evaluate(async()=>{const g=__game,G=g.G,{updateTrain}=await import('./js/train.js'),{SHERA_FINISH_TICKS,SHERA_FINISH_BEATS:B}=await import('./js/train_neta_cinematics.js');const out=[],ok=(n,v)=>out.push([n,!!v]);
 for(const side of [-1,1]){
  g.trainScene('boss-enraged');const boss=G.boss;G.player.x=boss.x+side*130;G.hitstop=0;boss.hurt(9999,side,true,true);
  let n=0;while(!G.train.cinematic&&n++<400)g.step(1);
  const c=G.train.cinematic;ok('knocking enraged Shera out starts shera-finish '+side,c?.kind==='shera-finish'&&G.boss.roof);if(!c)continue;
  g.step(30);ok('CHAD staged left of Shera '+side,c.fromX<c.fromBossX);ok('no Netaji in the shot '+side,!G.props.some(q=>q.kind==='neta'));
  const sfx=[],voices=[],say=[],A=G.audio,[s0,v0]=[A.sfx,A.voice];A.sfx=(n,...r)=>{sfx.push([c.t,n]);};A.voice=(n,...r)=>{voices.push([c.t,n]);};
  let broke=-1,stops=0,slow=0,jawStop=0,guard=0;
  while(c.t<SHERA_FINISH_TICKS-1&&guard++<2000){G.hitstop=0;updateTrain();if(broke<0&&(c.fightProps||[]).some(q=>q.broken&&q.sheraCrash))broke=c.t;if(c.t===B.jaw)jawStop=G.hitstop;slow=Math.max(slow,G.slowmo||0);if(G.enemies.length)stops++;}
  const at=(n)=>sfx.filter(s=>s[1]===n).map(s=>s[0]);
  const hits=sfx.filter(s=>['punch','kick'].includes(s[1])&&s[0]<B.rib).map(s=>s[0]);
  ok('six gut punches between 12 and 60 '+side,hits.length===6&&hits[0]>=12&&hits[5]<60&&JSON.stringify(hits)===JSON.stringify(B.gut));
  ok('rib crunch at 60 with the crack '+side,B.rib===60&&at('bone_crack').includes(60)&&at('heavy').includes(60));
  ok('super charge at 80 '+side,B.kneel===78&&at('super').includes(80));
  ok('jaw shatter at 104: ko + crack + hitstop 12 '+side,B.jaw===104&&at('ko').includes(104)&&at('bone_crack').includes(104)&&jawStop>=12&&slow>=20);
  ok('crash at 150 breaks the nearest trunk '+side,B.crash===150&&broke===150&&at('shera_hammer').includes(150));
  ok('one Duke line: ahead of yourself '+side,voices.length===1&&voices[0][1]==='duke_ahead'&&voices[0][0]>=B.crash&&voices[0][0]<B.after);
  ok('climb from 240 '+side,B.after===240&&B.climb>B.after&&at('entrance_boot').includes(B.climb));
  ok('no enemies during the finisher '+side,stops===0&&G.train.cinematic?.kind==='shera-finish');
  A.sfx=s0;A.voice=v0;
  updateTrain();ok('one handoff to the roof '+side,!G.train.cinematic&&G.train.climbed&&G.train.roofCheckpoint&&G.boss.trainWaiting&&G.boss.roof&&G.boss.key==='neta');
  ok('Shera leaves the fight '+side,!G.props.some(q=>q.kind==='neta')&&G.boss.phase===2);
 }
 // The old 'roof' kind (roof-transition scenario) is the same cinematic.
 g.trainScene('roof-transition',0);ok('roof-transition aliases shera-finish',G.train.cinematic?.kind==='shera-finish');
 for(const t of [9,60,104,150,300,400]){g.trainScene('shera-finish',t);const before=G.train.cinematic.t;G.paused=true;g.step(20);ok('pause '+t,G.train.cinematic.t===before);G.paused=false;}
 for(const t of [60,104,150,200]){g.trainScene('shera-finish',t+30);const c=G.train.cinematic,old=JSON.stringify(c,(k,v)=>k==='snapshot'?null:v);g.render();g.render();ok('render pure '+t,old===JSON.stringify(c,(k,v)=>k==='snapshot'?null:v));}
 return out;});
 checks.push(['11 enraged victim cells registered',cells.length===11&&cells.every(f=>fs.existsSync('assets/frames/'+f))],['gore sheet present',fs.existsSync('assets/fx/finisher_gore.png')]);
 assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));
 const dir='tmp/review/shera_rework/run2/finisher';fs.mkdirSync(dir,{recursive:true});
 // Storyboard beats on the cinematic clock (entry skipped, hitstop cleared): approach, gut 1-3, gut 4-6, rib, charge, jaw, lift, crash, aftermath.
 const beats=[[6,'1_approach'],[27,'2_gut'],[48,'3_gut'],[61,'4_rib'],[95,'5_charge'],[104,'6_jaw'],[122,'7_lift'],[151,'8_crash'],[200,'9_aftermath'],[262,'10_climb']];
 if(!process.env.NO_CAPTURE)for(const [t,name]of beats){await p.evaluate(t=>{__game.trainScene('shera-finish',31);const c=__game.G.train.cinematic;c.entry=null;c.t=t;__game.G.shake=0;__game.G.hitstop=0;__game.render();},t);for(const width of [480,960]){await p.locator('#game').evaluate((c,w)=>Object.assign(c.style,{width:w+'px',height:w*270/480+'px',maxWidth:'none'}),width);await p.locator('#game').screenshot({path:`${dir}/${name}-${width}.png`});}}
 const missing=await b.newPage();await missing.route(/nr_neta|finisher_gore|chad_roof_climb/,r=>r.abort());await missing.goto(URL);await missing.waitForFunction(()=>__game?.G.state==='play');
 assert(await missing.evaluate(()=>{__game.trainScene('shera-finish',0);__game.render();for(let i=0;i<60;i++){__game.step(10);__game.render();}return __game.G.train.climbed&&!__game.G.train.cinematic;}),'missing art completes');await missing.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.length,errors,captures:process.env.NO_CAPTURE?'skipped':dir}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
