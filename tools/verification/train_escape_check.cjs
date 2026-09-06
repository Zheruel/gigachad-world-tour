// Deterministic finale contracts plus optional dense in-game visual capture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1080,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-train.html?scene=escape&t=0');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('play'));
 const game=page.frames().find(f=>f.url().includes('?auto=walk'));assert(game);
 const checks=await game.evaluate(async()=>{
  const {finaleState,FINALE_CUES,FINALE_VOICES,FINALE_BLASTS,FINALE_SECONDARIES}=await import('./js/train_finale.js'),g=__game,G=g.G,out=[];
  const ok=(name,value)=>out.push([name,!!value]);
  const snapshots=Array.from({length:1261},(_,t)=>finaleState(t));
  ok('all timeline positions are finite',snapshots.every(s=>['heroX','heroY','carX','cameraX','fade'].every(k=>Number.isFinite(s[k]))));
  ok('complete sequence reaches each authored beat',['approach','reaction','plant','run','jump','roll','rise','remote','light','cigar-walk','cigar-hold'].every(p=>snapshots.some(s=>s.phase===p)));
  ok('finale has one completion boundary',!finaleState(1259).complete&&finaleState(1260).complete);
  ok('actor has no discontinuous position jump',snapshots.slice(1).every((s,i)=>Math.abs(s.heroX-snapshots[i].heroX)<12&&Math.abs(s.heroY-snapshots[i].heroY)<12));
  ok('roll travels toward the exit',finaleState(584).heroX>finaleState(510).heroX);
  ok('walk continues away from the wreck',finaleState(1170).heroX>finaleState(810).heroX);
  ok('hold plants the actor',finaleState(1170).heroX===finaleState(1259).heroX&&finaleState(1170).heroY===finaleState(1259).heroY);
  ok('carriage continues rightward',snapshots.slice(1).every((s,i)=>s.carX>=snapshots[i].carX));
  ok('carriage stops after540',snapshots.slice(540).every(s=>s.carX===-400));
  ok('arrival covers960 logical pixels',Math.abs((finaleState(540).carX-finaleState(0).carX)*.8-960)<1e-8);
  ok('opening tracks600 world pixels',finaleState(0).carX===-1600&&finaleState(180).carX===-1000);
  ok('braking steadily decelerates',snapshots.slice(181,540).every((s,i)=>snapshots[i+182].carX-s.carX<=s.carX-snapshots[i+180].carX+1e-8));
  ok('camera tracks then locks',finaleState(0).cameraX===-1150&&finaleState(180).cameraX===-550&&snapshots.slice(450).every(s=>s.cameraX===0));
  ok('action clock waits for opening track',snapshots.every(s=>s.actionT===Math.max(0,s.t-180)));
  ok('screen-space actor motion stays continuous',snapshots.slice(1).every((s,i)=>Math.abs((s.heroX-s.cameraX)-(snapshots[i].heroX-snapshots[i].cameraX))<12));
  ok('camera has no position snap',snapshots.slice(1).every((s,i)=>Math.abs(s.cameraX-snapshots[i].cameraX)<5));
  ok('roof performance inherits train displacement',snapshots.slice(0,450).every(s=>Math.abs(s.heroX-s.carX-625)<1e-8&&s.heroY===114));
  ok('braking is one uninterrupted cue',FINALE_CUES.filter(c=>c.sound==='train_brake').length===1&&FINALE_CUES.some(c=>c.tick===182&&c.sound==='train_brake'));
  ok('passenger carriage and coupler share the train transform',snapshots.every(s=>s.passengerX===s.carX+858&&s.couplerX===s.carX+866));
  ok('remote click precedes first blast',FINALE_CUES.some(c=>c.tick===715)&&FINALE_CUES.some(c=>c.tick===732));
  ok('authored quotes have stable timing',JSON.stringify(FINALE_VOICES.map(v=>[v.tick,v.name]))===JSON.stringify([[188,'duke_getting_off'],[604,'duke_rest_pieces']]));
  ok('eight major blasts follow authored sequence',JSON.stringify(FINALE_BLASTS.map(b=>b.tick))===JSON.stringify([732,780,834,894,960,1026,1098,1170]));
  ok('twenty secondary blasts support destruction',FINALE_SECONDARIES.length===20&&FINALE_SECONDARIES.every(b=>b.tick>=720&&b.tick<=1200));
  ok('both coaches end completely destroyed',['left','right'].every(k=>finaleState(1260).damage[k].every(v=>v===5)));
  ok('damage never repairs itself',snapshots.slice(1).every((s,i)=>['left','right'].every(k=>s.damage[k].every((v,j)=>v>=snapshots[i].damage[k][j]))));
  ok('cigar lights after lighting action',!finaleState(775).cigarLit&&finaleState(776).cigarLit);
  ok('finale remains visible through completion',snapshots.every(s=>s.fade===0));
  const first=JSON.stringify(finaleState(399));finaleState(680);ok('seeking is deterministic',JSON.stringify(finaleState(399))===first);
  ok('sound cues have ordered valid timings',FINALE_CUES.every((c,i)=>Number.isInteger(c.tick)&&c.tick>0&&c.tick<1260&&typeof c.sound==='string'&&(!i||c.tick>=FINALE_CUES[i-1].tick)));
  g.trainScene('escape',0);let calls=[],voices=[];const original=G.audio.sfx,originalRoom=G.audio.roomSfx,originalVoice=G.audio.voice;G.audio.voice=(key)=>voices.push(key);G.audio.sfx=(key,...args)=>calls.push([key,...args]);G.audio.roomSfx=(key,volume)=>{calls.push([key,volume]);return true;};
  try{
   const initial=JSON.stringify(G.train);g.render();g.render();ok('rendering does not advance state or emit sound',JSON.stringify(G.train)===initial&&calls.length===0);
   g.step(1259);const expected=FINALE_CUES.filter(c=>c.tick<=1259).map(c=>c.sound);ok('each sound cue fires exactly once in playback',JSON.stringify(calls.map(c=>c[0]))===JSON.stringify(expected));
   ok('both quotes play exactly once',JSON.stringify(voices)===JSON.stringify(FINALE_VOICES.map(v=>v.name)));
   const voiceCount=voices.length;g.render();g.render();ok('rendering cannot repeat quotes',voices.length===voiceCount);
   g.trainScene('escape',360);calls=[];g.press('pause');g.step(1);g.release('pause');const paused=G.train.cinematic.t;g.step(60);ok('pause freezes finale and sound',G.train.cinematic.t===paused&&calls.length===0);
   g.press('pause');g.step(1);g.release('pause');g.step(4);ok('resume advances from paused frame',G.train.cinematic.t>paused);
   for(const point of [270,390,480,540,660,990]){
    g.trainScene('escape',point);calls=[];g.press('pause');g.step(1);g.release('pause');const held=G.train.cinematic.t,heldVoices=voices.length;g.step(30);
    ok(`pause freezes choreography and cues at ${point}`,G.train.cinematic.t===held&&calls.length===0&&voices.length===heldVoices);
    g.press('pause');g.step(1);g.release('pause');
   }
   g.trainScene('escape',300);g.press('attack');g.step(1);g.release('attack');ok('attack cannot skip the finale',G.train.cinematic?.kind==='escape'&&!G.train.endingDone);
   g.trainScene('escape',0);g.step(1260);ok('normal playback completes without interaction',G.train.endingDone);
   g.trainScene('escape',0);ok('replay resets completion',!G.train.endingDone&&G.train.cinematic.t===0);
   const {ASSETS}=await import('./js/assets.js'),removed=[];
   for(const key of Object.keys(ASSETS).filter(k=>/escape|finale|landing/.test(k))){removed.push([key,ASSETS[key]]);delete ASSETS[key];}
   try{g.render();g.step(1260);ok('missing finale artwork cannot trap progression',G.train.endingDone);}finally{for(const [k,v]of removed)ASSETS[k]=v;}
   g.trainScene('escape',360);g.press('pause');g.step(1);g.release('pause');g.press('down');g.step(1);g.release('down');g.press('use');g.step(1);g.release('use');g.step(26);ok('quit returns to title',G.state==='title');
  }finally{G.audio.sfx=original;G.audio.roomSfx=originalRoom;G.audio.voice=originalVoice;g.resetInput();}
  return out;
 });
 await game.locator('canvas').click();await page.keyboard.press('KeyQ');
 await game.waitForFunction(()=>__game.G.audio.has('duke_getting_off')&&__game.G.audio.has('duke_rest_pieces'));
 const audioChecks=await game.evaluate(()=>{const g=__game,G=g.G,out=[];
  g.trainScene('escape',0);g.step(189);out.push(['first quote starts a real sample',G.audio.snapshot().samples>0]);
  const entrySfx=G.audio.sfx;G.audio.sfx=()=>{};try{g.trainScene('escape',0);}finally{G.audio.sfx=entrySfx;}out.push(['replay clears interrupted quote and room sources',G.audio.snapshot().samples===0&&G.audio.snapshot().roomSources===0]);
  g.trainScene('escape',603);g.step(1);out.push(['remote quote starts a real sample',G.audio.snapshot().samples>0]);
  g.trainScene('escape',0);g.step(1260);out.push(['finale completion clears samples and room sources',G.audio.snapshot().samples===0&&G.audio.snapshot().roomSources===0]);
  return out;
 });checks.push(...audioChecks);
 await page.locator('#scene').selectOption('escape');
 await page.locator('#finale-checkpoint').selectOption('540');
 assert.equal(await game.evaluate(()=>__game.G.train.cinematic.t),540,'checkpoint seeks shoulder roll');
 await page.locator('#finale-step').click();assert.equal(await game.evaluate(()=>__game.G.train.cinematic.t),543);
 await page.locator('#finale-back').click();assert.equal(await game.evaluate(()=>__game.G.train.cinematic.t),540);
 for(const key of ['finaleActor','finaleCar','finaleEnvironment','finaleGear','finaleCoupling','finaleLeftDamage','finaleRightDamage','finaleDynamite','finaleCigar','fx']){await page.locator('#'+key).uncheck();assert.equal(await game.evaluate(k=>__game.G.train.review[k],key),false);await page.locator('#'+key).check();}
 if(process.env.FINALE_CAPTURE){
  const dir=path.resolve('tmp/review/finale');fs.mkdirSync(dir,{recursive:true});
  const times=[...new Set([0,30,60,90,120,150,179,180,210,270,329,330,390,449,...Array.from({length:51},(_,i)=>450+i*3),660,715,719,720,731,732,738,779,780,786,809,810,833,834,840,893,894,900,959,960,966,1025,1026,1032,1097,1098,1104,1169,1170,1176,1215,1259])].sort((a,b)=>a-b);
  for(const t of times){await page.locator('#time').evaluate((el,t)=>{el.value=t;el.dispatchEvent(new Event('input',{bubbles:true}));},t);await game.evaluate(()=>{__game.G.shake=0;__game.render()});
   await game.locator('canvas').screenshot({path:path.join(dir,`frame-${String(t).padStart(3,'0')}-960.png`)});
   await page.locator('#scale').click();await game.locator('canvas').screenshot({path:path.join(dir,`frame-${String(t).padStart(3,'0')}-480.png`)});await page.locator('#scale').click();
  }
  await page.locator('#finale-checkpoint').selectOption('834');
  for(const key of ['finaleActor','finaleCar','finaleEnvironment','finaleGear','finaleCoupling','finaleLeftDamage','finaleRightDamage','finaleDynamite','finaleCigar','fx']){await page.locator('#'+key).uncheck();await game.locator('canvas').screenshot({path:path.join(dir,`without-${key}.png`)});await page.locator('#'+key).check();}
  console.log(`Captured ${times.length} moments at both sizes in ${dir}`);
 }
 if(process.env.FINALE_LIVE){await page.locator('#reset').click();await page.locator('#play').click();await page.waitForTimeout(25200);await page.locator('#play').click();assert(await game.evaluate(()=>__game.G.train.endingDone),'normal-speed replay must complete');assert(await game.evaluate(()=>__game.G.state==='clear'&&__game.G.rawTime-__game.G.stateT>=195),'normal-speed replay must reach completed victory tally');}
 assert(checks.every(c=>c[1]),JSON.stringify(checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,ui:'checkpoints, stepping and layers passed',errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
