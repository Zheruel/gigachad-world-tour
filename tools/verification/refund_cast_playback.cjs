// The production frame loader at runtime scale, on the real office beside CHAD.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.GAME_URL||`http://localhost:${process.env.PORT||8011}`;
const out='tmp/review/refund-cast/playback';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const scale of [1,2]){
  const context=await browser.newContext({viewport:{width:480*scale,height:270*scale},recordVideo:{dir:`${out}/${scale}x`,size:{width:480*scale,height:270*scale}}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/?auto=walk`);await page.waitForFunction(()=>__game?.G.state==='play');
  const report=await page.evaluate(async scale=>{
   const g=__game,G=g.G,{getAIFrame}=await import('./js/aiframes.js'),{frameW,frameH}=await import('./js/sprites.js');
   const keys=['ic_headset','ic_operator','ic_thrower'];
   const manifest=await fetch('assets/frames/manifest.json',{cache:'reload'}).then(r=>r.json());
   const states=[...new Set(keys.flatMap(k=>Object.keys(manifest[k]).filter(s=>Array.isArray(manifest[k][s]))))];
   g.indiaScene('refund','office');G.boss=null;G.enemies=[];G.props=[];G.shots=[];G.effects=[];G.player.x=70;G.player.y=235;
   G.india.review.workers=false;G.paused=false;g.render();
   const baseCanvas=document.createElement('canvas');baseCanvas.width=480;baseCanvas.height=270;
   const baseCtx=baseCanvas.getContext('2d');baseCtx.imageSmoothingEnabled=false;
   baseCtx.drawImage(document.querySelector('#game'),0,0,480,270);
   G.paused=true;
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;
   canvas.style.cssText=`position:fixed;inset:0;width:${480*scale}px;height:${270*scale}px;image-rendering:pixelated;z-index:99999`;
   document.body.append(canvas);const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const shown=[];
   for(const state of states){
    const frames=keys.map(key=>getAIFrame(key,state)?.f||getAIFrame(key,'idle').f);
    const count=Math.max(...frames.map(a=>a.length)),ticks=count*8+8;
    await new Promise(resolve=>{let start;function next(now){start??=now;const tick=Math.min(ticks,Math.floor((now-start)*.06));
     ctx.drawImage(baseCanvas,0,0);ctx.fillStyle='#d8c6a4';ctx.font='8px monospace';ctx.fillText(state,20,130);
     frames.forEach((arr,i)=>{const im=arr[Math.floor(tick/8)%arr.length],w=frameW(im),h=frameH(im);ctx.drawImage(im,220+i*95-w/2,235-h+4,w,h);});
     if(tick<ticks)requestAnimationFrame(next);else resolve();}requestAnimationFrame(next);});
    shown.push({state,poses:frames.map(a=>a.length)});
   }
   return shown;
  },scale);
  assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/last-${scale}x.png`});
  fs.writeFileSync(`${out}/checks-${scale}x.json`,JSON.stringify({scale,states:report,errors},null,2));
  await context.close();console.log(JSON.stringify({scale,states:report.length,errors}));
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
