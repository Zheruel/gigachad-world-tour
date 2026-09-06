const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=loading');await page.waitForFunction(()=>__game?.travelReady());
 const checks=await page.evaluate(async()=>{
  const {loadDisplayType,DISPLAY_FILES,drawDisplayTitle}=await import('/js/display_type.js'),art=await loadDisplayType();
  const out=[],check=(n,v)=>out.push([n,!!v]),c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');
  check('all six authored headings loaded',Object.keys(DISPLAY_FILES).every(k=>art[k]?.naturalWidth>0));
  for(const name of Object.keys(DISPLAY_FILES)){const size=drawDisplayTitle(ctx,name,240,10,{height:17,maxWidth:215});check(name+' fits heading bounds',size.width<=215&&size.height<=17);}
  const fallback=drawDisplayTitle(ctx,'THE NIGHT TRAIN',240,70,{height:30,maxWidth:300,art:{}});check('missing art has readable fallback',fallback.width>0&&fallback.width<=300);
  check('approved loading card selected',__game.G.stage.loadingArt==='loading_train');return out;
 });
 fs.mkdirSync('/tmp/gachi-display-type',{recursive:true});
 for(const scene of ['loading','train-stamp','delhi-stamp','map','clear','over']){
  const data=await page.evaluate(async scene=>{
   const g=__game,G=g.G;G.freezeTime=true;g.resetInput();G.paused=false;G.fade=0;
   if(scene==='loading'){g.loading();g.render();return document.querySelector('#game').toDataURL().split(',')[1];}
   if(scene==='map'){g.hub();G.hubPanel='map';G.fade=0;g.render();return document.querySelector('#game').toDataURL().split(',')[1];}
   g.stage(scene==='delhi-stamp'?1:0);G.freezeTime=true;G.fade=0;g.render();
   const ctx=document.querySelector('#game').getContext('2d');ctx.save();ctx.setTransform(2,0,0,2,0,0);
   if(scene.endsWith('stamp')){const {drawActStamp}=await import('/js/story.js');drawActStamp(ctx,30,G.stage.name,G.stage.sub);}
   else {const {drawClear,drawOver}=await import('/js/screens.js');G.stateT=G.rawTime-100;G.continueT=500;if(scene==='clear')drawClear(ctx);else drawOver(ctx);}
   ctx.restore();return document.querySelector('#game').toDataURL().split(',')[1];
  },scene);
  fs.writeFileSync(`/tmp/gachi-display-type/${scene}.png`,Buffer.from(data,'base64'));
 }
 assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
