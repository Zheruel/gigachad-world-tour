// Actual cinematic replay: fixed furniture, contact ordering, full art, rewards and aftermath.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011',out='tmp/review/scam-king/punch';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play',null,{timeout:90000});
 const report=await page.evaluate(async()=>{
  const g=__game,G=g.G,{finisherPose,startIndiaFinisher,drawIndiaFinisher}=await import('./js/india_cinematics.js'),{ASSETS}=await import('./js/assets.js'),{REFUND_FINISH:F}=await import('./js/refund_finisher.js');
  const checks=[],ok=(n,v)=>checks.push([n,!!v]),trace=[];
  g.indiaScene('refund','closer-intro',0);const original=G.boss.fightProps.map(q=>({role:q.role,x:q.x,y:q.y}));
  g.indiaScene('refund','closer-finish',0);const c=G.india.cinematic,b=c.boss,desk=b.fightProps.find(q=>q.role==='desk');
  ok('duplicate finisher cannot start',!startIndiaFinisher('closer-finish',b));
  for(const [key,n]of [['cl_king_throw',12]]){
   const im=ASSETS[key];ok(key+' has complete native cells',im?.width===1024&&im?.height===256*Math.ceil(n/4));
   const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);
   for(let i=0;i<n;i++){const a=ctx.getImageData(i%4*256,Math.floor(i/4)*256,256,256).data;let opaque=0,clean=true,inside=true;
    for(let j=3;j<a.length;j+=4){const alpha=a[j];if(alpha)opaque++;if(alpha!==0&&alpha!==255)clean=false;if(alpha&&(j<1024||j>255*1024||((j-3)/4)%256===0||((j-3)/4)%256===255))inside=false;}
    ok(key+' pose '+i+' is complete and has clean transparent edges',opaque>1000&&clean&&inside);
   }
  }
  g.step(30);ok('reveal uses CHAD original guard',c.t===0&&finisherPose(c).chad.pose==='idle');
  const {SPR,getFrame}=await import('./js/sprites.js');
  for(const family of ['combo_power_a','combo_power_b'])ok(family+' has all four original action frames',Array.from({length:4},(_,i)=>getFrame(SPR.player,family,i,1)).every(Boolean));
  let fixed=true,scoreAtDesk,deskCount=0;
  for(let t=0;t<=F.ticks;t++){
   const p=finisherPose(c);trace.push({t,x:p.x,y:p.y,vx:p.vx,vy:p.vy,king:p.kingThrow,native:p.chad,cam:G.camX,deskBroken:desk.broken});
   fixed&&=b.fightProps.every(q=>{const o=original.find(a=>a.role===q.role);return q.x===o.x&&q.y===o.y;});
   if(t===F.desk-1)ok('desk survives until body contact',!desk.broken&&p.vx>desk.x-5&&p.vx<desk.x+5);
   if(t===F.desk){scoreAtDesk=G.score;deskCount=c.cues.has('desk-smash')?1:0;ok('real desk breaks exactly once at landing',desk.broken&&p.kingThrow===4&&G.india.damage.success===0);}
   if(t===F.punch)ok('first straight meets the folded chest',p.chad.pose==='combo_power_a'&&p.chad.i===2&&p.victim===1&&Math.abs((p.x+34.3)-(p.vx-16))<1&&Math.abs((p.y-73.1)-(p.vy-70.5))<1);
   if(t===F.wallPunch)ok('final straight meets the kneeling jaw',p.chad.pose==='combo_power_b'&&p.chad.i===2&&p.kingThrow===11&&Math.abs((p.x+46)-(p.vx-12))<1&&Math.abs((p.y-65)-(p.vy-68))<2);
   if(t===F.wall-1)ok('glass remains intact during flight',G.india.damage.success===0);
   if(t===F.wall)ok('glass breaks at wall contact',G.india.damage.success===1&&p.victim===5&&p.lift===62);
   if(t<F.ticks)g.step(1);
  }
  ok('all furniture keeps its intro world position through every frame',fixed);
  ok('first punch launches the body to the fixed desk',trace[F.release].vx<desk.x-50&&trace[F.desk].vx===desk.x);
  ok('desk impact holds body contact for twenty ticks',trace.slice(F.desk,F.desk+20).every(p=>p.king===4&&p.vx===desk.x&&p.vy===trace[F.desk].vy));
  ok('first punch holds contact before launch',trace.slice(F.punch,F.release).every(p=>p.native.pose==='combo_power_a'&&p.native.i===2));
  ok('wall punch holds contact before launch',trace.slice(F.wallPunch,F.launch).every(p=>p.king===11&&p.native.pose==='combo_power_b'&&p.native.i===2));
  ok('second charge is longer and progresses from grounded coil into drive',F.wallPunch-F.charge>F.punch-F.deskCharge&&trace[F.charge+20].native.i===0&&trace[F.wallPunch-5].native.i===1);
  ok('camera holds the launch then leads the final four ticks',trace.slice(F.launch,F.wall-3).every(p=>p.cam===trace[F.launch].cam));
  ok('camera settles smoothly after impact',trace.slice(F.wall+5,F.wall+23).every((p,i)=>p.cam>=trace[F.wall+4+i].cam&&p.cam-trace[F.wall+4+i].cam<9));
  ok('every character coordinate is finite',trace.every(p=>[p.x,p.y,p.vx,p.vy,p.cam].every(Number.isFinite)));
  ok('performance completes once',G.india.finishersDone.has('closer-finish')&&G.india.cinematic===null&&G.state==='clear'&&deskCount===1);
  const done=G.india.completedScenes['closer-finish'];ok('finished pose is original cigar',finisherPose(done).chad.pose==='idle_cigar'&&finisherPose(done).chad.i===5);
  ok('desk and victory rewards are paid once',G.score===scoreAtDesk+G.lives*500+G.bestCombo*25);const score=G.score;g.step(20);ok('result cannot repeat rewards',G.score===score);
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d'),before=JSON.stringify([G.effects.length,G.score,done.t,done.cues.size]);for(let i=0;i<16;i++)drawIndiaFinisher(ctx);ok('drawing is side-effect free',before===JSON.stringify([G.effects.length,G.score,done.t,done.cues.size]));
  g.indiaScene('refund','closer',0);G.boss.fightProps.find(q=>q.role==='desk').hurt(999,1,true,true);const oldScore=G.score;startIndiaFinisher('closer-finish',G.boss);g.step(F.desk+31);ok('prior desk destruction is retained without another reward',G.boss.fightProps.find(q=>q.role==='desk').broken&&G.score===oldScore);
  return{checks,trace};
 });fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failures:report.checks.filter(x=>!x[1]),errors}));assert(report.checks.every(x=>x[1]));assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
