// Shared gore, impact holds and aftermath must survive seeking, pause and missing artwork.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011',out='tmp/review/scam-king/impact';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play',null,{timeout:90000});fs.mkdirSync(out,{recursive:true});
 const report=await page.evaluate(async()=>{
  const g=__game,G=g.G,{ASSETS}=await import('./js/assets.js'),{finisherPose,drawIndiaFinisher}=await import('./js/india_cinematics.js');
  const {drawRefundUnder,drawRefundGore,drawRefundFinish,refundVictim,REFUND_FINISH:F}=await import('./js/refund_finisher.js');
  const {refundPieces,drawRefundBurst}=await import('./js/refund_gore.js');
  const checks=[],ok=(name,value)=>checks.push([name,!!value]);
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d');
  g.indiaScene('refund','closer-finish',30);const c=G.india.cinematic;
  const draw=ctx.drawImage.bind(ctx);let gore=[];
  ctx.drawImage=(im,...args)=>{if(im===ASSETS.fx_gore)gore.push(args[0]/128+args[1]/128*4);draw(im,...args);};
  const sample=t=>{c.t=t;gore=[];ctx.clearRect(0,0,480,270);const p=finisherPose(c);drawRefundUnder(ctx,c,p,G.camX);drawRefundGore(ctx,c,p,G.camX);return [...gore];};
  ok('shared generated gore bank is available',ASSETS.fx_gore?.width===512);
  ok('charging does not bleed before the first punch',[0,8,20,31].every(t=>sample(t).every(i=>i>=13)));
  for(const [name,t]of [['desk',F.desk+5],['wall punch',F.wallPunch+5],['glass',F.wall+5]]){
   const cells=sample(t);ok(name+' emits generated blood',cells.some(i=>i<9));ok(name+' emits teeth',cells.some(i=>i>=9&&i<=12));
  }
  ok('desk impact holds twenty ticks without changing pose',Array.from({length:20},(_,i)=>refundVictim(c,F.desk+i).kingThrow).every(i=>i===4));
  ok('desk flight arrives from the left',refundVictim(c,F.desk-1).vx<refundVictim(c,F.desk).vx);
  ok('finished scene retains blood but no airborne teeth',sample(F.ticks).some(i=>i<9)&&gore.every(i=>i<9));
  ok('fragment family matches the Scam King',ASSETS.fragments_ic_closer?.width===512&&ASSETS.fragments_ic_closer?.height===256);
  ok('all fragments originate inside the wall-impact silhouette',refundPieces(0).length===8&&refundPieces(0).every(p=>Math.abs(p.x-refundVictim(c,F.wall+4).vx)<24&&p.y>=40&&p.y<=112));
  ok('all fragments settle and persist in the final tableau',refundPieces(F.ticks-F.blast).every(p=>p.landed&&Number.isFinite(p.x+p.y+p.angle))&&JSON.stringify(refundPieces(F.ticks-F.blast))===JSON.stringify(refundPieces(F.ticks-F.blast+10)));
  const {SPR,getFrame}=await import('./js/sprites.js'),whole=getFrame(SPR.ic_closer_damaged,'finish',5,-1);let bodyDraws=0;const track=ctx.drawImage;ctx.drawImage=(im,...a)=>{if(im===whole)bodyDraws++;track(im,...a);};
  c.t=F.blast;drawRefundFinish(ctx,c,finisherPose(c),G.camX);ok('no intact body is drawn once the King explodes',bodyDraws===0);ctx.drawImage=track;
  gore=[];drawRefundBurst(ctx,6,G.camX);ok('body explosion uses the shared gore sprites',gore.filter(i=>i<9).length>=12);
  c.t=F.blast+13;const p=finisherPose(c),before=JSON.stringify([c.t,c.cues.size,G.effects.length,G.score,G.seed]);
  ctx.clearRect(0,0,480,270);drawIndiaFinisher(ctx);const frozen=canvas.toDataURL();ctx.clearRect(0,0,480,270);drawIndiaFinisher(ctx);
  ok('paused redraw is pixel identical',frozen===canvas.toDataURL());
  ok('effects drawing cannot replay audio, rewards or spawn particles',before===JSON.stringify([c.t,c.cues.size,G.effects.length,G.score,G.seed]));
  const saved=ASSETS.fx_gore;ASSETS.fx_gore=null;sample(F.desk+4);sample(F.wall+4);ASSETS.fx_gore=saved;ok('missing gore artwork has a safe fallback',true);
  g.indiaScene('refund','closer-finish',30);const active=G.india.cinematic;
  const sfx=G.audio.roomSfx.bind(G.audio),calls=[];G.audio.roomSfx=(name,...args)=>{if(name==='finale_gore'||name==='remote_click')calls.push([name,active.t]);return sfx(name,...args);};
  g.step(F.ticks);G.audio.roomSfx=sfx;
  ok('wet impact sound plays once per physical contact',JSON.stringify(calls.filter(x=>x[0]==='finale_gore').map(x=>x[1]))===JSON.stringify([F.punch,F.desk,F.wallPunch,F.wall,F.blast]));
  ok('Zippo clicks once as the original lighting frame catches',JSON.stringify(calls.filter(x=>x[0]==='remote_click').map(x=>x[1]))===JSON.stringify([F.cigar+32]));
  ok('cinematic ends on time without leaked hitstop or slow motion',G.india.cinematic===null&&G.hitstop===0&&G.slowmo===0&&G.state==='clear');
  return{checks,calls};
 });
 fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));
 // Inspect both punches, the desk crush and wall launch at two-tick intervals.
 for(let t=24;t<=240;t+=2){const uri=await page.evaluate(t=>{__game.indiaScene('refund','closer-finish',t+30);__game.G.shake=__game.G.flash=0;__game.render();return document.querySelector('#game').toDataURL();},t);fs.writeFileSync(out+'/'+String(t).padStart(3,'0')+'.png',Buffer.from(uri.split(',')[1],'base64'));}
 console.log(JSON.stringify({checks:report.checks.length,failures:report.checks.filter(x=>!x[1]),errors}));assert(report.checks.every(x=>x[1]));assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
