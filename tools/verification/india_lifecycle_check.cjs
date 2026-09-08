// Exercise the real chapter runtime with decoded audio, missing art and controller input.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:960,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play',{timeout:60000});
 await p.keyboard.press('KeyQ');await p.waitForFunction(()=>__game.G.audio.has('duke_time_to_crash_this_party')&&__game.G.audio.has('duke_terminated'));
 const checks=await p.evaluate(async()=>{
  const g=__game,G=g.G,out=[],check=(n,v)=>out.push([n,!!v]);
  const {ASSETS}=await import('./js/assets.js'),{laneMin,laneMax}=await import('./js/engine.js');
  const voices=[],oldVoice=G.audio.voice;G.audio.voice=function(...a){voices.push(a[0]);return oldVoice.apply(this,a)};
  G.audio.stopSamples();G.audio.voice('duke_time_to_crash_this_party',2155,true);G.audio.voice('duke_terminated',1080,true);
  check('urgent dialogue replaces prior speech instead of overlapping',G.audio.snapshot().voices===1);
  check('ordinary quote waits while urgent speech is active',G.audio.voice('duke_time_to_crash_this_party',2155,false)===false&&G.audio.snapshot().voices===1);
  G.audio.stopSamples();
  for(let pass=0;pass<2;pass++){
   g.indiaScene('refund','intro',0);const before=voices.length;
   for(const at of [85,125,185,275]){
    const age=G.rawTime-G.stateT;g.step(Math.max(0,at-age));g.press('pause');g.step(1);g.release('pause');
    const raw=G.rawTime;g.step(12);check(`intro pass${pass} pauses at${at}`,G.paused&&G.rawTime===raw);
    g.press('pause');g.step(1);g.release('pause');g.step(2);
   }
   g.step(510);check(`intro pass${pass} completes once`,G.state==='play'&&G.india.wallBroken);
   check(`intro pass${pass} quote once`,voices.slice(before).filter(x=>x==='duke_time_to_crash_this_party').length===1);
   const n=voices.length,t=G.india.t,cues=[...G.india.cues].join('|');for(let i=0;i<12;i++)g.render();
   check('render does not advance choreography or sound',G.india.t===t&&voices.length===n&&[...G.india.cues].join('|')===cues);
  }
  const removed={};for(const key of Object.keys(ASSETS).filter(k=>k.startsWith('ic_'))){removed[key]=ASSETS[key];delete ASSETS[key];}
  const v=G.audio.voice;G.audio.voice=()=>false;
  g.indiaScene('refund','intro',0);g.step(485);check('missing chapter art/audio cannot trap entrance',G.state==='play'&&G.india.wallBroken);
  g.indiaScene('refund','finish',0);g.step(560);check('missing chapter art/audio reaches held victory',G.state==='clear'&&G.india.endingDone);
  Object.assign(ASSETS,removed);G.audio.voice=v;
  for(const id of ['delhi','refund'])for(let area=0;area<8;area++){
   g.indiaScene(id);G.camX=Math.min(area*810,6000);G.player.x=G.camX+160;
   g.press('up');g.step(120);g.release('up');check(`${id} area${area} back wall blocks walking`,G.player.y>=laneMin(G.player.x));
   g.press('down');g.step(120);g.release('down');check(`${id} area${area} front edge blocks walking`,G.player.y<=laneMax(G.player.x));
  }
  g.indiaScene('refund');const x=G.player.x,pad={connected:true,axes:[1,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});g.step(25);check('Refund controller stick moves',G.player.x>x+15);
  pad.axes[0]=0;pad.buttons[1]={pressed:true,value:1};g.step(4);check('Refund controller jump',G.player.z>0);
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});g.resetInput();
  G.audio.roomSfx('room_page',.2);G.audio.voice('duke_terminated',1080,true);
  check('new ending voice actually decodes and plays',G.audio.snapshot().samples>0);
  g.press('pause');g.step(1);g.release('pause');g.step(1);g.press('back');g.step(1);g.release('back');g.step(35);
  const a=G.audio.snapshot();check('quit removes chapter and all old sounds',G.state==='title'&&!G.india&&a.samples===0&&a.roomSources===0);
  G.audio.voice=oldVoice;return out;
 });assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
