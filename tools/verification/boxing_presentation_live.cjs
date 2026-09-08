// Record real-clock presentation plus the actual WebAudio output without replacing cues.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const lethal=process.env.BOXING_REVIEW_KO==='1';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:600}});await page.addInitScript(()=>{
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);this.reviewBus=this.createMediaStreamDestination();window.reviewAudio=this;}};
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode&&this.context.reviewBus)connect.call(this,this.context.reviewBus);return result;};
 });await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');await page.keyboard.press('q');
 const out=await page.evaluate(async lethal=>{
  const g=__game,G=g.G,{startSuper}=await import('./js/player.js');lethal?g.indiaScene('refund','calling',0):g.trainScene('general',0);g.resetInput();G.enemies=[];G.props=[];G.boss=null;G.effects=[];G.shots=[];G.meter=100;G.hitstop=0;Object.assign(G.player,{x:G.camX+205,y:220,z:0,face:1,hp:100,invuln:0,state:'idle'});
  const e=g.spawn('ic_headset',50,0);e.hp=lethal?36:120;e.state='idle';e.face=-1;G.audio.unlock();await reviewAudio.resume();
  const video=document.querySelector('canvas').captureStream(60),mix=new MediaStream([...video.getTracks(),...reviewAudio.reviewBus.stream.getAudioTracks()]);const rec=new MediaRecorder(mix,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];
  rec.ondataavailable=e=>chunks.push(e.data);const ready=new Promise(resolve=>{rec.onstop=async()=>{const blob=new Blob(chunks,{type:rec.mimeType}),a=new Uint8Array(await blob.arrayBuffer());let raw='';for(let i=0;i<a.length;i+=8192)raw+=String.fromCharCode(...a.subarray(i,i+8192));resolve(btoa(raw));}});
  rec.start();const start=G.rawTime;G.freezeTime=false;startSuper(G.player);
  await new Promise(resolve=>setTimeout(resolve,3300));G.freezeTime=true;rec.stop();const data=await ready;
  return {data,elapsed:G.rawTime-start,superT:G.player.superT,state:G.player.state,hp:e.hp,dead:e.dead};
 },lethal);fs.mkdirSync('tmp/review/boxing-polish/live',{recursive:true});fs.writeFileSync(`tmp/review/boxing-polish/live/${lethal?'lethal-':''}boxing-with-audio.webm`,Buffer.from(out.data,'base64'));delete out.data;console.log(JSON.stringify(out));assert(out.superT>=(lethal?76:100));assert.equal(out.hp,lethal?0:84);if(lethal)assert(out.dead);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
