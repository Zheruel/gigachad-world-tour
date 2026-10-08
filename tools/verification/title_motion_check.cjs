const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const out='/tmp/gachi-title-motion';fs.mkdirSync(out,{recursive:true});try{
 const p=await b.newPage({viewport:{width:1120,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await require('./studio_helper.cjs').openStudio(p,'train/intro');await p.evaluate(()=>__review.load('tools/presentation'));await p.locator('#specialist-host canvas').waitFor();
 const checks=await p.evaluate(async()=>{const m=await import('/js/title_motion.js'),art=await m.loadTitleMotion(),checks=[];const check=(name,pass)=>checks.push({name,pass:!!pass});
 check('active 12-frame portrait loaded',['cigar'].every(k=>art[k]?.width===4800&&art[k]?.height===368));
 check('active backdrop loaded',['world'].every(k=>art[k]?.width===960&&art[k]?.height===540));
 check('only production artwork loads',!art.shades&&!art.sunset&&!art.midnight&&m.TITLE_VARIANTS.length===1);
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d');ctx.scale(2,2);
 for(const k of ['cigar']){
  const poses=new Set();for(let t=0;t<600;t++){const pose=m.titleMotionAt(k,t);poses.add(pose.frame);m.drawTitleMotion(ctx,art,k,t);}
  check(k+' visits all twelve animation slots',poses.size===12);
  m.drawTitleMotion(ctx,art,k,0);const start=canvas.toDataURL();m.drawTitleMotion(ctx,art,k,600);check(k+' seamless ten-second loop',start===canvas.toDataURL());
  m.drawTitleMotion(ctx,art,k,250);const once=canvas.toDataURL();m.drawTitleMotion(ctx,art,k,250);check(k+' deterministic frame rendering',once===canvas.toDataURL());
  m.drawTitleMotion(ctx,{},k,250);check(k+' missing layers render safely',true);
 }
 check('cigar emitter anchors remain inside portrait',art.anchors.length===12&&art.anchors.every(a=>['mouth','tip'].every(k=>a[k][0]>0&&a[k][0]<400&&a[k][1]>0&&a[k][1]<368)));
 return checks;});assert(checks.every(c=>c.pass),JSON.stringify(checks));
 for(const k of ['cigar']){

  const poses=await p.evaluate(async k=>{const m=await import('/js/title_motion.js'),seen=new Map();for(let t=0;t<600;t++){const i=m.titleMotionAt(k,t).frame;if(!seen.has(i))seen.set(i,t);}return [...seen.entries()];},k);
  for(const [i,t]of poses){await p.getByLabel('Animation frame',{exact:true}).fill(String(t));await p.getByLabel('Animation frame',{exact:true}).dispatchEvent('change');await p.locator('#specialist-host canvas').screenshot({path:`${out}/${k}-${i}.png`});}
 }
 await p.getByLabel('CHAD',{exact:true}).uncheck();await p.locator('#specialist-host canvas').screenshot({path:`${out}/clean-background.png`});await p.getByLabel('CHAD',{exact:true}).check();
 await p.locator('#specialist-host').getByLabel('Display',{exact:false}).selectOption('1');await p.locator('#specialist-host canvas').screenshot({path:`${out}/native.png`});
 const field=p.getByLabel('Animation frame',{exact:true}),before=await field.inputValue();await p.getByRole('button',{name:'Play animation',exact:true}).click();await p.waitForTimeout(600);await p.getByRole('button',{name:'Pause animation',exact:true}).click();assert.notEqual(await field.inputValue(),before);
 const paused=await field.inputValue();await p.waitForTimeout(180);assert.equal(await field.inputValue(),paused);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks,controls:'pose, timeline, layers, scale, playback and pause passed',screenshots:out}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
