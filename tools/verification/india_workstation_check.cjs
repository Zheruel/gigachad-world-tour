// Actual renderer and entry lifecycle; fixtures isolate the authored workstation
// geometry without changing the production 70-tick activation or attack budget.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const OUT='tmp/review/workstations';
(async()=>{fs.mkdirSync(OUT,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:580}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
 const report=await page.evaluate(async()=>{
  const g=__game,G=g.G,m=await import('./js/india_office.js'),{ASSETS}=await import('./js/assets.js');
  const checks=[],check=(name,value)=>checks.push([name,!!value]);
  function setup(index=0){g.indiaScene('refund','office');G.boss=null;G.enemies=[];G.props=[];G.hitstop=G.flash=G.shake=0;G.camX=Math.max(0,G.india.office[index].x-240);G.player.x=G.camX+70;G.player.y=240;return G.india.office[index];}
  setup();check('twelve individually authored workstations',G.india.office.length===12&&new Set(G.india.office.map(n=>n.x)).size===12);
  const paths=[];
  for(let index=0;index<12;index++){
   const n=setup(index),before=G.india.office.filter(n=>n.phase==='working').length;
   check(`seat ${index}: activation queues one worker`,m.queueOfficeWorker(n.kind)&&G.india.pendingEntries===1&&G.india.office.filter(n=>n.phase==='working').length===before-1);
   const entry=G.india.office.find(v=>v.phase==='rising');
   // Several seats share a kind. Isolate the requested one for exact pose QA.
   if(entry!==n)throw Error('wrong workstation selected');
   check(`seat ${index}: cannot queue same seat twice`,!m.queueOfficeWorker(n.kind)&&G.india.pendingEntries===1);
   const poses=[];for(let t=0;t<70;t++){poses.push(m.officeWorkerPose(n));m.updateOfficeWorkers();if(t===68)check(`seat ${index}: absent before tick 70`,G.enemies.length===0&&n.phase==='rising');}
   const e=G.enemies[0];check(`seat ${index}: one matching fighter at tick 70`,G.enemies.length===1&&e?.trainType===n.kind&&n.phase==='gone'&&G.india.pendingEntries===0);
   const a=poses[69].actor;check(`seat ${index}: final pose joins spawn within one stride`,Math.abs(e.x-a.x)<4&&Math.abs(e.y-a.y)<4);
   m.updateOfficeWorkers();check(`seat ${index}: entry cannot repeat`,G.enemies.length===1);
   paths.push({index,x:n.x,y:n.y,kind:n.kind,exitX:e.x,exitY:e.y,poses});
  }
  const n=setup();m.queueOfficeWorker(n.kind);g.press('pause');g.step(1);g.release('pause');const t=n.t;g.step(20);check('pause holds chair and entry timeline',G.paused&&n.t===t);g.press('pause');g.step(1);g.release('pause');g.step(1);check('resume continues entry once',!G.paused&&n.t>t);
  setup();const assetKeys=['ic_office_life','ic_office_stand','ic_office_chair'],saved=assetKeys.map(k=>ASSETS[k]);assetKeys.forEach(k=>ASSETS[k]=null);m.queueOfficeWorker(G.india.office[0].kind);for(let i=0;i<70;i++){m.updateOfficeWorkers();g.render();}check('missing artwork still completes entry',G.enemies.length===1&&G.india.pendingEntries===0);assetKeys.forEach((k,i)=>ASSETS[k]=saved[i]);
  setup();m.queueOfficeWorker(G.india.office[0].kind);for(let i=0;i<27;i++)m.updateOfficeWorkers();const snapshot=JSON.stringify(G.india.office),pending=G.india.pendingEntries;g.render();g.render();check('render does not mutate office state',JSON.stringify(G.india.office)===snapshot&&G.india.pendingEntries===pending);
  const ctx=document.createElement('canvas').getContext('2d');let chairs=0,actors=0;const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(im,...args)=>{if(im===ASSETS.ic_office_chair)chairs++;draw(im,...args);};
  G.camX=0;m.drawOfficeWorkers(ctx,0,()=>actors++,()=>actors++);const visible=G.india.office.filter(n=>n.x>=-90&&n.x<=570).length;check('one rendered chair per visible workstation',chairs===visible);
  chairs=actors=0;G.india.review.chairs=false;m.drawOfficeWorkers(ctx,0,()=>actors++,()=>actors++);check('chair isolation leaves workers visible',chairs===0&&actors===visible);
  chairs=actors=0;G.india.review.chairs=true;G.india.review.workers=false;m.drawOfficeWorkers(ctx,0,()=>actors++,()=>actors++);check('worker isolation leaves one chair',chairs===visible&&actors===0);
  m.initOfficeWorkers('refund',1000);check('restored passed workstations have empty pushed chairs',G.india.office.filter(n=>n.x<880).every(n=>n.phase==='gone'&&m.officeWorkerPose(n).actor===null&&m.officeWorkerPose(n).chairY===n.y+4));
  return{checks,paths};
 });
 assert(report.checks.every(c=>c[1]),JSON.stringify(report.checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
 if(process.env.CAPTURE==='1'){
  for(let index=0;index<12;index++)for(const tick of Array.from({length:24},(_,i)=>i*3)){
   const data=await page.evaluate(({index,tick})=>{const g=__game,G=g.G;g.indiaScene('refund','office');G.boss=null;G.enemies=[];G.props=[];G.flash=G.shake=0;const n=G.india.office[index];G.camX=Math.max(0,n.x-240);G.player.x=G.camX+75;G.player.y=240;n.phase=tick?'rising':'working';n.t=tick;n.face=-1;n.exitX=n.x-32;g.render();return document.querySelector('#game').toDataURL();},{index,tick});
   fs.writeFileSync(`${OUT}/seat-${index}-${tick}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
 }
 if(process.env.PLAYBACK==='1'){
  // Normal-speed replay uses the same update and draw functions as the game.
  // Record both presentation sizes; the capture is reproducible review evidence.
  for(const scale of [1,2]){
   const context=await browser.newContext({viewport:{width:480*scale,height:270*scale},recordVideo:{dir:`${OUT}/playback-${scale}x`,size:{width:480*scale,height:270*scale}}});
   const live=await context.newPage();await live.goto('http://localhost:8011/?auto=walk');await live.waitForFunction(()=>__game?.G.state==='play');
   await live.addStyleTag({content:`html,body{margin:0!important;padding:0!important;overflow:hidden!important}#game{position:fixed!important;inset:0!important;width:${480*scale}px!important;height:${270*scale}px!important;margin:0!important;max-width:none!important;max-height:none!important}`});
   for(let index=0;index<12;index++)await live.evaluate(async(index)=>{
    const g=__game,G=g.G,m=await import('./js/india_office.js');g.indiaScene('refund','office');G.boss=null;G.enemies=[];G.props=[];G.flash=G.shake=0;
    const n=G.india.office[index];G.camX=Math.max(0,n.x-240);G.player.x=G.camX+75;G.player.y=240;m.queueOfficeWorker(n.kind);let frame=0;
    await new Promise(resolve=>{let start;function next(now){start??=now;const target=Math.min(84,Math.floor((now-start)*.06));while(frame<target){if(frame<70)m.updateOfficeWorkers();frame++;}g.render();if(frame<84)requestAnimationFrame(next);else resolve();}requestAnimationFrame(next);});
   },index);
   await context.close();
  }
 }
 fs.writeFileSync(`${OUT}/checks.json`,JSON.stringify({...report,errors},null,2));console.log(JSON.stringify({checks:report.checks,errors,captured:process.env.CAPTURE==='1'}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
