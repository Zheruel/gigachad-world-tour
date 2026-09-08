// Record normal-speed game playback with its actual effect/voice/music mix.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:960,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...a){super(...a);this.reviewBus=this.createMediaStreamDestination();window.reviewAudio=this;}};
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...a){const r=connect.call(this,destination,...a);if(destination instanceof AudioDestinationNode&&this.context.reviewBus)connect.call(this,this.context.reviewBus);return r;};
  const NativeAudio=window.Audio;window.Audio=function(...args){const a=new NativeAudio(...args);a.addEventListener('play',()=>{if(!a.reviewSource&&window.reviewAudio){a.reviewSource=reviewAudio.createMediaElementSource(a);a.reviewSource.connect(reviewAudio.destination);}});return a;};
 });
 await p.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await p.waitForFunction(()=>__game?.G.state==='play');await p.keyboard.press('q');
 await p.waitForFunction(()=>['duke_who_wants_some','duke_turn_up_heat','duke_safety_inspections','duke_checks_cash'].every(n=>__game.G.audio.has(n)));
 const dir='tmp/review/india-setpieces/live';fs.mkdirSync(dir,{recursive:true});const results=[];
 for(const [stage,scene,ticks,exit]of [['delhi','intro',540,'play'],['delhi','vendor-finish',540,'play'],['delhi','dredger-finish',960,'clear'],['refund','closer-finish',840,'clear'],['refund','intro',480,'play']]){
  const result=await p.evaluate(async({stage,scene,ticks})=>{
   const g=__game,G=g.G;g.indiaScene(stage,scene,0);G.audio.music(scene==='intro'||scene==='vendor-finish'?G.stage.music:G.stage.bossMusicFinal);await reviewAudio.resume();
   const canvas=document.querySelector('canvas'),stream=new MediaStream([...canvas.captureStream(60).getTracks(),...reviewAudio.reviewBus.stream.getAudioTracks()]);
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);
   const ready=new Promise(resolve=>{recorder.onstop=async()=>{const a=new Uint8Array(await new Blob(chunks).arrayBuffer());let raw='';for(let i=0;i<a.length;i+=8192)raw+=String.fromCharCode(...a.subarray(i,i+8192));resolve(btoa(raw));};});
   const start=G.rawTime;recorder.start();G.freezeTime=false;await new Promise(resolve=>{function poll(){if(G.rawTime-start>=ticks+90)resolve();else requestAnimationFrame(poll);}poll();});G.freezeTime=true;recorder.stop();
   return {stage,scene,state:G.state,elapsed:G.rawTime-start,endingDone:G.india.endingDone,audio:G.audio.snapshot(),data:await ready};
  },{stage,scene,ticks});
  fs.writeFileSync(`${dir}/${stage}-${scene}-with-audio.webm`,Buffer.from(result.data,'base64'));delete result.data;
  assert.equal(result.state,exit);assert(result.elapsed>=ticks+90);results.push(result);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
