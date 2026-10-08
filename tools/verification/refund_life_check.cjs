// Authored caller routines, room machinery and lifecycle on the actual game runtime.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const studio=require('./studio_helper.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const frame=await studio.openStudio(page,'refund/office');
  const report=await frame.evaluate(async()=>{
   const g=__game,G=g.G,office=await import('/js/india_office.js'),life=await import('/js/refund_life.js');
   const {ASSETS}=await import('/js/assets.js'),{spawnEnemy}=await import('/js/enemies.js'),{createProp}=await import('/js/props.js');
   const checks=[],ok=(name,value)=>checks.push([name,!!value]),sounds=[],loops=[],stops=[];
   const prior={at:G.audio.roomSfxAt,loop:G.audio.roomLoop,stop:G.audio.stopRoomLoop};
   G.audio.roomSfxAt=(...a)=>{sounds.push(a);return true;};
   G.audio.roomLoop=(...a)=>{loops.push(a);return true;};G.audio.stopRoomLoop=(...a)=>stops.push(a);
   const reset=()=>{g.indiaScene('refund','office',0);G.enemies=[];G.props=[];G.waveActive=false;G.player.state='idle';G.player.x=160;G.india.review={};sounds.length=loops.length=stops.length=0;return G.india;};
   const tick=n=>{for(let i=0;i<n;i++){G.india.t++;office.updateOfficeWorkers();}};
   try{
    let s=reset(),variants=new Set();
    for(const n of s.office){
     const sequence=Array.from({length:900},(_,i)=>office.officeSeatedFrame(n,i));
     ok(`caller ${n.x} has typing and desk business`,[0,1,2].every(v=>sequence.includes(v)));
     variants.add(sequence.join(''));
    }
    ok('all twelve callers use independent clocks',variants.size===12);
    office.alarmOfficeWorkers(135);ok('wall alarm reaches near callers before the far desk',s.office[0].alert>0&&s.office[1].alert===0);
    office.alarmOfficeWorkers(250);ok('breach flinches settle without erasing the alert',s.office[0].alert===0&&s.office[0].alarmed);
    s=reset();tick(1250);
    ok('occupied desk work uses quiet positional keyboard Foley',sounds.some(a=>a[0]==='room_pen'&&a[1]<=.2&&Math.abs(a[2])<=1));
    ok('headset caller answers a desk phone',sounds.some(a=>a[0]==='refund_ring')&&s.office[0].callAt!=null);
    const voiceAt=s.office[0].callAt;ok('phone answer uses the approved mic pose',office.officeSeatedFrame(s.office[0],voiceAt+30)===5);
    ok('offscreen desks cannot create a room sound',life.refundRoomCue('refund_ring',2800,.2)===false);
    ok('office ventilation remains quieter than server cooling',loops.every(a=>a[0]==='refund_cooling'&&a[1]<.05));
    s.office[0].phase='gone';s.office[0].leftAt=s.t;sounds.length=0;tick(1200);
    ok('abandoned phone stops ringing',!sounds.some(a=>a[0]==='refund_ring'));
    s=reset();const e=spawnEnemy('ic_headset',260,236);e.state='attack';tick(1);
    ok('nearby violence interrupts desk work',s.office[0].alert===72&&office.officeSeatedFrame(s.office[0])===7);
    G.enemies=[];tick(1);ok('cleared room retains its combat aftermath',s.refundLife.areas[0].fought&&s.refundLife.areas[0].clearAt===s.t);
    tick(200);ok('a quiet room relaxes its brief reaction',s.office[0].alert===0);
    s=reset();const p=createProp('ic_monitor',270,230);G.props=[p];tick(1);p.hurt(999,1);tick(1);
    ok('broken equipment registers one power dip',s.refundLife.areas[0].damage===1&&s.refundLife.areas[0].shock===23);
    G.props=[];tick(30);ok('equipment aftermath survives prop cleanup without repeated dips',s.refundLife.areas[0].damage===1&&s.refundLife.areas[0].shock===0);
    s=reset();office.queueOfficeWorker(s.office[0].kind);const node=s.office[0];
    G.paused=true;const before=JSON.stringify(s.office),clock=s.refundLife.t,count=sounds.length;tick(20);
    ok('pause holds worker entries, machinery and cues',JSON.stringify(s.office)===before&&s.refundLife.t===clock&&sounds.length===count);
    G.paused=false;s.cinematic={kind:'closer-finish'};tick(20);
    ok('cinematic holds worker entry and ambient audio',node.t===0&&sounds.length===count);
    life.updateRefundLife();ok('cinematic releases the ambient loop',stops.some(a=>a[0]==='refund_cooling'));
    s.cinematic=null;tick(69);ok('worker still waits for the complete authored entry',node.phase==='rising'&&node.t===69);
    tick(1);ok('worker enters combat exactly once after tick seventy',node.phase==='gone'&&G.enemies.length===1&&s.pendingEntries===0);
    s=reset();tick(90);const ctx=document.createElement('canvas').getContext('2d');
    const snapshot=()=>JSON.stringify({t:s.refundLife.t,areas:s.refundLife.areas,office:s.office,sounds:sounds.length,loops:loops.length});
    const snap=snapshot();life.drawRefundLife(ctx,0);life.drawRefundLife(ctx,0);
    ok('rendering cannot advance routine, sound or aftermath',snapshot()===snap);
    let random=0;const rand=Math.random;Math.random=()=>{random++;return .5;};
    try{tick(10);life.drawRefundLife(ctx,0);}finally{Math.random=rand;}
    ok('ambient work does not consume combat randomness',random===0);
    s.review.ambient=false;sounds.length=loops.length=0;tick(80);
    ok('ambient isolation is silent and releases the loop',sounds.length===0&&loops.length===0&&stops.length>0);
    const art=Object.entries(ASSETS).filter(([key])=>key.startsWith('ic_refund_'));
    for(const [key]of art)ASSETS[key]=null;
    try{life.drawRefundLife(ctx,0);tick(10);ok('missing plates do not stop the simulation',s.refundLife.t===s.t);}finally{for(const [key,value]of art)ASSETS[key]=value;}
    office.initOfficeWorkers('refund',3300);ok('checkpoint recreates empty desks and quiet passed rooms',G.india.office.every(n=>n.phase==='gone')&&G.india.refundLife.areas.slice(0,3).every(a=>a.clearAt===0));
   }finally{G.audio.roomSfxAt=prior.at;G.audio.roomLoop=prior.loop;G.audio.stopRoomLoop=prior.stop;G.paused=false;}
   return checks;
  });
  fs.mkdirSync('tmp/review/refund-life',{recursive:true});
  for(const scene of ['office','annex','calling','calling_east','servers','records','executive']){
   await studio.load(page,`refund/${scene}`);await studio.seek(page,300);
   await studio.capture(page,`tmp/review/refund-life/${scene}-480.png`,1);
   await studio.capture(page,`tmp/review/refund-life/${scene}-960.png`,2);
  }
  fs.writeFileSync('tmp/review/refund-life/checks.json',JSON.stringify({checks:report,errors},null,2));
  console.log(JSON.stringify({checks:report,errors}));assert(report.every(x=>x[1]),JSON.stringify(report.filter(x=>!x[1])));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
