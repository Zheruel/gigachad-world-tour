// The Closer's registered poses share anatomy, contact clocks, and local cue classes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011',out=process.env.REFUND_BOSS_CAPTURE_DIR||'tmp/review/refund-boss';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:620}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play',null,{timeout:90000});fs.mkdirSync(out,{recursive:true});
 const result=await page.evaluate(async()=>{
  const game=__game,G=game.G,{closerPose,drawCloser}=await import('./js/refund_boss_presentation.js'),{getCloserBeat,CLOSER_TIMING}=await import('./js/refund_boss_timing.js'),{getAIFrame}=await import('./js/aiframes.js'),{SPR,getFrame,frameW,frameH}=await import('./js/sprites.js');
  game.indiaScene('refund','closer',0);G.state='play';G.enemies=[];G.spawnQueue=[];G.india.review={};
  const b=G.boss;Object.assign(b,{x:G.camLock+310,y:230,z:0,face:-1,protectedStagger:0,hitReactT:0,guardFlash:0,flash:0,moved:0,dead:false});G.player.x=G.camLock+150;G.player.y=230;G.player.state='idle';b.delhi.draw=drawCloser;
  const checks=[],check=(name,ok)=>checks.push([name,!!ok]);
  const FAMILIES=[['idle',2],['block',1],['walk',8],['boxing',8],['cross',6],['handset',4],['reload',2],['call',2],['deal',8],['hurt',2],['stagger',2],['fall',2],['down',1],['getup',3],['taunt',6],['seated',8],['phasebreak',8]];
  for(const key of ['ic_closer','ic_closer_damaged'])for(const [state,count] of [...FAMILIES,...(key==='ic_closer_damaged'?[['finish',8]]:[])]){
   const f=getAIFrame(key,state);check(key+' '+state+' loads all authored poses',f?.f.length===count);check(key+' '+state+' retains native canvas scale',f?.f.every(c=>c._as===2&&c.height===300));
  }
  for(const phaseTwo of [false,true]){
   Object.assign(b,{phaseTwo,set:phaseTwo?SPR.ic_closer_damaged:SPR.ic_closer});
   for(const pattern of ['boxing','handset','deal','call']){
    Object.assign(b,{state:'windup',pattern,t:18});const p=closerPose(b);
    check((phaseTwo?'phase2 ':'phase1 ')+pattern+' exact local tell cue',p.cls==={boxing:'plain',handset:'reflect',call:'hazard',deal:'unblockable'}[pattern]);
   }
   Object.assign(b,{state:'boxing',pattern:'boxing'});const timing=CLOSER_TIMING[phaseTwo?'phase2':'phase1'].boxing;
   for(const h of timing.hits){b.t=h.at;const p=closerPose(b);const want={jab:['boxing',3],jab2:['boxing',3],overhand:['boxing',7],body:['cross',1],cross:['cross',3]}[h.name];check('contact '+phaseTwo+'/'+h.name+' uses authored strike',p.action===want[0]&&p.index===want[1]);}
   b.t=timing.hits.at(-1).at-24;check('green only starts before committed finishing punch '+phaseTwo,getCloserBeat(b).cls==='counter');
   b.t=timing.hits.at(-1).at-25;check('ordinary preceding boxing beat stays plain '+phaseTwo,getCloserBeat(b).cls==='plain');
  }
  G.state='bossintro';for(const [t,action,index] of [[20,'seated',0],[130,'seated',1],[170,'seated',2],[266,'seated',3],[318,'seated',7],[400,'taunt',1],[440,'taunt',4]]){b.introT=t;const p=closerPose(b);check('intro '+t+' uses authored '+action+' '+index,p.action===action&&p.index===index);}G.state='play';
  Object.assign(b,{state:'dealhold',pattern:'deal',phaseTwo:true,set:SPR.ic_closer_damaged});const D=CLOSER_TIMING.phase2.deal;
  for(const [t,index] of [[2,2],[D.headbutt-4,3],[D.headbutt-2,4],[D.headbutt+8,4]]){b.t=t;const p=closerPose(b);check('handshake '+t+' uses deal '+index,p.action==='deal'&&p.index===index);}
  Object.assign(b,{phaseTwo:false,t:25,set:SPR.ic_closer});check('first phase grip ends in a shove pose',closerPose(b).action==='deal'&&closerPose(b).index===5);b.phaseTwo=true;b.set=SPR.ic_closer_damaged;
  b.t=D.release+2;check('a closed deal gloats over CHAD',closerPose(b).action==='taunt'&&closerPose(b).index===4);
  Object.assign(b,{state:'stumble',t:2});check('whiffed handshake lurches',closerPose(b).index===6);b.t=40;check('then stands winded',closerPose(b).index===7);
  Object.assign(b,{state:'recover',recoverPattern:'call',pattern:'call',recovery:54,moved:0,phaseTwo:false,set:SPR.ic_closer});
  b.t=0;check('hung-up call recovery points first',closerPose(b).action==='call'&&closerPose(b).index===1);b.t=40;check('then returns to guard',closerPose(b).action==='idle');
  const sheet=document.createElement('canvas');sheet.width=1920;sheet.height=288*Math.ceil((FAMILIES.reduce((n,f)=>n+f[1],0)*2+8)/4);const sc=sheet.getContext('2d');sc.fillStyle='#171b20';sc.fillRect(0,0,sheet.width,sheet.height);sc.font='12px monospace';const poses=[];
  for(const phaseTwo of [false,true]){
   Object.assign(b,{phaseTwo,set:phaseTwo?SPR.ic_closer_damaged:SPR.ic_closer});
   for(const [action,count] of [...FAMILIES,...(phaseTwo?[['finish',8]]:[])])for(let index=0;index<count;index++){
    const n=poses.length,x=n%4*480,y=Math.floor(n/4)*288;
    // Keep the actual office, CHAD, overlays and draw ordering; freeze only this pose.
    b.delhi.draw=(ctx,b,camX)=>{const f=getFrame(b.set,action,index,b.face);ctx.drawImage(f,Math.round(b.x-camX-frameW(f)/2),Math.round(b.y-frameH(f)+4),frameW(f),frameH(f));};G.shake=G.flash=0;game.render();sc.drawImage(document.querySelector('#game'),x,y,480,270);sc.fillStyle='#efd5a4';sc.fillText((phaseTwo?'damaged ':'intact ')+action+' '+index,x+8,y+283);poses.push({phaseTwo,action,index});
   }
  }
  b.delhi.draw=drawCloser;
  return{checks,poses,sheet:sheet.toDataURL()};
 });
 fs.writeFileSync(path.join(out,'all-poses-runtime-native.png'),Buffer.from(result.sheet.split(',')[1],'base64'));delete result.sheet;
 fs.writeFileSync(path.join(out,'pose-report.json'),JSON.stringify(result,null,2));
 for(const [name,state,pattern,t,phaseTwo] of [['jab','boxing','boxing',10,false],['hook-tell','boxing','boxing',30,false],['hook','boxing','boxing',43,false],['handshake','dealhold','deal',20,true],['phone','windup','handset',26,false],['handshake-offer','windup','deal',18,false],['damage','phase-break','boxing',34,true]]){
  await page.evaluate(async({state,pattern,t,phaseTwo})=>{const G=__game.G,b=G.boss,{SPR}=await import('./js/sprites.js');Object.assign(b,{state,pattern,t,phaseTwo});b.set=phaseTwo?SPR.ic_closer_damaged:SPR.ic_closer;G.shake=G.flash=0;__game.render();},{state,pattern,t,phaseTwo});
  for(const scale of [1,2]){await page.locator('#game').evaluate((c,s)=>{c.style.setProperty('width',480*s+'px','important');c.style.setProperty('height',270*s+'px','important')},scale);await page.locator('#game').screenshot({path:path.join(out,name+'-'+scale+'x.png')});}
 }
 console.log(JSON.stringify({checks:result.checks,poses:result.poses.length,captures:out,errors}));assert(result.checks.every(c=>c[1]),JSON.stringify(result.checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
