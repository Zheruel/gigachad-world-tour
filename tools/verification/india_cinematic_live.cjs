// Real-time playback records the canvas and the game's actual audio mix.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:960,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...a){super(...a);this.reviewBus=this.createMediaStreamDestination();window.reviewAudio=this;}};
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...a){const r=connect.call(this,destination,...a);if(destination instanceof AudioDestinationNode&&this.context.reviewBus)connect.call(this,this.context.reviewBus);return r;};
 });
 await p.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await p.waitForFunction(()=>__game?.G.state==='play');await p.keyboard.press('q');
 await p.waitForFunction(()=>__game.G.audio.has('duke_time_to_crash_this_party')&&__game.G.audio.has('duke_terminated'));
 const dir='tmp/review/refund-cinematics-qa/live';fs.mkdirSync(dir,{recursive:true});const results=[];
 for(const scene of ['intro','finish']){
  const result=await p.evaluate(async scene=>{
   const g=__game,G=g.G;g.indiaScene('refund',scene,0);G.audio.music(scene==='intro'?G.stage.music:G.stage.bossMusicFinal);await reviewAudio.resume();
   const stream=new MediaStream([...document.querySelector('canvas').captureStream(60).getTracks(),...reviewAudio.reviewBus.stream.getAudioTracks()]);
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);
   const ready=new Promise(resolve=>{recorder.onstop=async()=>{const a=new Uint8Array(await new Blob(chunks).arrayBuffer());let raw='';for(let i=0;i<a.length;i+=8192)raw+=String.fromCharCode(...a.subarray(i,i+8192));resolve(btoa(raw));};});
   const start=G.rawTime;recorder.start();G.freezeTime=false;await new Promise(r=>setTimeout(r,scene==='intro'?9200:8900));G.freezeTime=true;recorder.stop();
   return {scene,state:G.state,elapsed:G.rawTime-start,endingDone:G.india.endingDone,audio:G.audio.snapshot(),data:await ready};
  },scene);
  fs.writeFileSync(`${dir}/${scene}-with-audio.webm`,Buffer.from(result.data,'base64'));delete result.data;
  assert.equal(result.state,scene==='intro'?'play':'clear');assert(result.elapsed>=(scene==='intro'?480:525));results.push(result);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
