// Real-clock train routines/charges, with the game's actual audio mixed into video.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);this.reviewBus=this.createMediaStreamDestination();window.reviewAudio=this;}};
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode&&this.context.reviewBus)connect.call(this,this.context.reviewBus);return result;};
 });await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');await page.keyboard.press('q');
 const dir='tmp/review/train-life-polish/live';fs.mkdirSync(dir,{recursive:true});const result=[];
 for(const scene of ['hall','platform','ac','conductor','boss-roof']){
  const out=await page.evaluate(async scene=>{
   const g=__game,G=g.G;g.trainScene(scene,scene==='conductor'?300:0);g.resetInput();G.audio.unlock();await reviewAudio.resume();G.state='play';G.fade=G.flash=G.shake=G.hitstop=0;G.enemies=[];G.props=[];G.player.invuln=10000;
   if(G.boss){G.boss.fightProps=[];Object.assign(G.boss,{state:'windup',pattern:'charge',t:12,shieldActive:false,x:G.camX+340,y:220,face:-1,trainWaiting:false});G.player.x=G.camX+70;G.player.y=220;}
   else G.train.t=scene==='ac'?410:scene==='platform'?15:160;
   const stream=document.querySelector('canvas').captureStream(60),mix=new MediaStream([...stream.getTracks(),...reviewAudio.reviewBus.stream.getAudioTracks()]),rec=new MediaRecorder(mix,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];
   rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>rec.onstop=async()=>{const a=new Uint8Array(await new Blob(chunks).arrayBuffer());let raw='';for(let i=0;i<a.length;i+=8192)raw+=String.fromCharCode(...a.subarray(i,i+8192));resolve(btoa(raw));});
   const start=G.rawTime;rec.start();G.freezeTime=false;await new Promise(r=>setTimeout(r,4500));G.freezeTime=true;rec.stop();const data=await done;return {data,ticks:G.rawTime-start,scene,bossState:G.boss?.state,hp:G.player.hp};
  },scene);fs.writeFileSync(`${dir}/${scene}.webm`,Buffer.from(out.data,'base64'));delete out.data;assert(out.ticks>=225&&out.ticks<330,JSON.stringify(out));result.push(out);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/checks.json`,JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
