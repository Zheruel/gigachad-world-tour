const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const out='/tmp/gachi-title-motion';fs.mkdirSync(out,{recursive:true});try{
 const p=await b.newPage({viewport:{width:1120,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/review-title.html');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both animations ready'));
 await p.locator('#animate').click();
 const checks=await p.evaluate(async()=>{const m=await import('/js/title_motion.js'),art=await m.loadTitleMotion(),checks=[];const check=(name,pass)=>checks.push({name,pass:!!pass});
 check('two reusable 12-frame portraits loaded',['cigar','shades'].every(k=>art[k]?.width===4800&&art[k]?.height===368));
 check('all three backdrops loaded',['world','sunset','midnight'].every(k=>art[k]?.width===960&&art[k]?.height===540));
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d');ctx.scale(2,2);
 for(const k of ['cigar','shades']){
  const poses=new Set();for(let t=0;t<600;t++){const pose=m.titleMotionAt(k,t);poses.add(pose.frame);m.drawTitleMotion(ctx,art,k,t);}
  check(k+' visits all twelve animation slots',poses.size===12);
  m.drawTitleMotion(ctx,art,k,0);const start=canvas.toDataURL();m.drawTitleMotion(ctx,art,k,600);check(k+' seamless ten-second loop',start===canvas.toDataURL());
  m.drawTitleMotion(ctx,art,k,250);const once=canvas.toDataURL();m.drawTitleMotion(ctx,art,k,250);check(k+' deterministic frame rendering',once===canvas.toDataURL());
  m.drawTitleMotion(ctx,{},k,250);check(k+' missing layers render safely',true);
 }
 check('cigar emitter anchors remain inside portrait',art.anchors.length===12&&art.anchors.every(a=>['mouth','tip'].every(k=>a[k][0]>0&&a[k][0]<400&&a[k][1]>0&&a[k][1]<368)));
 return checks;});assert(checks.every(c=>c.pass),JSON.stringify(checks));
 for(const k of ['cigar','shades']){
  await p.locator('[data-option="'+k+'"]').click();
  for(let i=0;i<12;i++){await p.locator('#pose').selectOption({value:String(i)});assert.equal(await p.locator('#pose').inputValue(),String(i));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));fs.writeFileSync(`${out}/${k}-${i}.png`,Buffer.from(await p.locator('#stage').evaluate(c=>c.toDataURL().split(',')[1]),'base64'));}
  await p.locator('#timeline').fill(k==='cigar'?'320':'212');await p.locator('#stage').screenshot({path:`${out}/${k}-effects.png`});
 }
 await p.locator('#background').selectOption('sunset');await p.locator('#hero').uncheck();await p.locator('#stage').screenshot({path:`${out}/clean-background.png`});await p.locator('#hero').check();
 await p.locator('#scale').click();await p.locator('#stage').screenshot({path:`${out}/native.png`});
 const before=await p.locator('#timeline').inputValue();await p.locator('#animate').click();await p.waitForTimeout(600);await p.locator('#animate').click();assert.notEqual(await p.locator('#timeline').inputValue(),before);
 const paused=await p.locator('#timeline').inputValue();await p.waitForTimeout(180);assert.equal(await p.locator('#timeline').inputValue(),paused);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks,controls:'pose, timeline, backdrop, layers, scale, playback and pause passed',screenshots:out}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
