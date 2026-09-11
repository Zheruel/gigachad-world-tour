// Actual Chrome renderer, exact display sizes, deterministic contact sweep and real-clock recordings.
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:980,height:580}});await p.addInitScript(()=>{
 const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...a){super(...a);this.reviewBus=this.createMediaStreamDestination();window.reviewAudio=this;}};
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(d,...a){const r=connect.call(this,d,...a);if(d instanceof AudioDestinationNode&&this.context.reviewBus)connect.call(this,this.context.reviewBus);return r;};
 });await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>__game?.G.state==='play');await p.keyboard.press('q');
 const dir='tmp/review/combat-variety/sweep';fs.mkdirSync(dir,{recursive:true});
 await p.locator('canvas').first().evaluate(c=>Object.assign(c.style,{width:'960px',height:'540px',maxWidth:'none'}));
 for(const [scene,end]of [['inspector-finish',240],['knockout',150],['roof-transition',150]])for(let t=0;t<=end;t+=3){
 await p.evaluate(({scene,t})=>{__game.trainScene(scene,t);__game.G.shake=0;__game.render();},{scene,t});
 await p.locator('canvas').first().screenshot({path:`${dir}/${scene}-${String(t).padStart(3,'0')}-2x.png`});
 }
 for(const v of [0,1]){
 await p.evaluate(async v=>{const g=__game,G=g.G,{startSuper}=await import('./js/player.js');g.trainScene('general');G.enemies=[];G.boss=null;G.meter=100;const e=g.spawn('nr_tough',40,0);e.state='idle';e.hp=200;G.player.face=1;startSuper(G.player);G.player.superMove=v;},v);
 for(let t=0;t<140;t+=3){await p.evaluate(()=>{__game.step(3);__game.G.shake=0;__game.render();});await p.locator('canvas').first().screenshot({path:`${dir}/super-${v}-${String(t).padStart(3,'0')}-2x.png`});}
 }
 for(const scene of ['conductor','inspector-finish','knockout','roof-transition']){
 await p.evaluate(scene=>{__game.trainScene(scene,scene==='conductor'?300:82);__game.G.shake=0;__game.render();},scene);
 await p.locator('canvas').first().evaluate(c=>Object.assign(c.style,{width:'480px',height:'270px'}));await p.locator('canvas').first().screenshot({path:`${dir}/${scene}-native.png`});
 await p.locator('canvas').first().evaluate(c=>Object.assign(c.style,{width:'960px',height:'540px'}));
 }
 for(const scene of ['inspector-finish','knockout','roof-transition']){
 const r=await p.evaluate(async scene=>{
 const g=__game,G=g.G;g.trainScene(scene,0);g.resetInput();G.audio.unlock();await reviewAudio.resume();
 const stream=new MediaStream([...document.querySelector('canvas').captureStream(60).getTracks(),...reviewAudio.reviewBus.stream.getAudioTracks()]);const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
 const done=new Promise(resolve=>rec.onstop=async()=>{const a=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));resolve(btoa(s));});
 rec.start();G.freezeTime=false;await new Promise(r=>setTimeout(r,scene==='roof-transition'?11200:scene==='inspector-finish'?6200:3800));G.freezeTime=true;rec.stop();return await done;
 },scene);fs.writeFileSync(`${dir}/${scene}-live.webm`,Buffer.from(r,'base64'));
 }
 console.log('Captured every three ticks, native/2x scenes and real-clock video with WebAudio.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
