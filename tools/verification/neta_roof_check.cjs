// Rooftop Netaji: one speech bubble per frame (never a mirrored copy from the glossy-floor reflection pass), every
// roof state animates through several of his r_* coward cells, the neta_roof_* sounds load, and his voice never
// machine-guns. Run: node tools/verification/neta_roof_check.cjs (server on PORT, default 8011).
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const br=await chromium.launch({channel:'chrome',headless:true});try{const page=await br.newPage();
 await page.goto('http://localhost:'+(process.env.PORT||8011)+'/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out=await page.evaluate(async()=>{
  const g=__game,G=g.G,{hasAIState}=await import('/js/aiframes.js'),out=[];
  // Count dialogue-frame blits per render, split into the normal and the reflection pass.
  const bubbles=()=>{const C=CanvasRenderingContext2D.prototype,orig=C.drawImage;let n=0,refl=0,reflAny=0;
   C.drawImage=function(img,...a){if(G.reflecting)reflAny++;if(/dialogue/.test(img?.src||''))G.reflecting?refl++:n++;return orig.call(this,img,...a);};
   try{g.render();}finally{C.drawImage=orig;}return {n,refl,reflAny};};
  // Roof, high lane (the mirrored copy used to land on screen upside down under him), bribe line and laugh line.
  g.trainScene('boss-roof',0);let b=G.boss;b.trainWaiting=false;b.y=200;G.player.y=200;G.player.invuln=9999;b.delhi.demo(b,'bribe');g.step(12);
  const one=bubbles();b.speech=null;b.sayQ=[];const none=bubbles();
  out.push(['roof: the reflection pass runs',one.reflAny>0]);
  out.push(['roof: bribe line draws one bubble, none mirrored',!!b.delhi&&one.n>0&&one.refl===0,JSON.stringify(one)]);
  out.push(['roof: no line, no bubble',none.n===0&&none.refl===0]);
  b.speech={who:'neta',text:'HA HA HA!',life:60,age:0,t:0};const laugh=bubbles();
  out.push(['roof: laugh line single bubble (same blit count as bribe)',laugh.refl===0&&laugh.n===one.n,JSON.stringify(laugh)]);
  // Carriage: Netaji's heckle and Shera's line each draw exactly one bubble.
  g.trainScene('boss',0);b=G.boss;G.player.invuln=9999;
  for(const who of ['neta','shera']){b.speech={who,text:'TEST LINE',life:90,age:0,t:0};g.step(1);b.speech&&(b.speech.who=who);const r=bubbles();out.push([`carriage: ${who} line single bubble`,r.refl===0&&r.n===one.n,JSON.stringify(r)]);}
  // Every roof state plays several r_* coward cells.
  g.trainScene('boss-roof',0);b=G.boss;b.trainWaiting=false;const P=b.delhi.roofPose;
  const sample=(setup,ticks,clock)=>{const seen=new Set();for(let t=0;t<ticks;t++){setup(t);if(clock)G.time=t;const [n,i]=P(b);seen.add(n+':'+i);}return [...seen];};
  const S=(st,extra={})=>t=>Object.assign(b,{state:st,t,guardFlash:0,flinchT:0,z:0,moved:0,backing:false,cornered:0,tripDown:false,floorT:0},extra);
  const want={
   'idle tremble':[sample(S('idle'),40,true),4],'cower (cornered)':[sample(S('idle',{cornered:5}),40,true),4],
   'aim shake (shot windup)':[sample(S('windup',{pattern:'shot'}),44),4],'shot':[sample(S('shot'),24),3],
   'tantrum (bark)':[sample(S('bark'),60),5],'trip':[sample(S('trip'),14),3],'reload click+fumble':[sample(S('reload'),72),10],
   'bribe':[sample(S('bribe'),60),6],'laugh':[sample(S('laugh'),24),2],'gulp':[sample(S('gulp'),18),2],
   'recover after shot':[sample(S('recover',{pattern:'shot'}),28),4],'recover wheeze':[sample(S('recover',{pattern:'shove'}),32),4],
   'hurt whimper':[sample(S('hurt'),8),3],'downed kicks':[sample(t=>S('down')(t)&&(b.floorT=t),30),4],
   'belly-flop':[sample(t=>S('down',{tripDown:true})(t)&&(b.floorT=t),20),2],'crawl':[sample(S('crawl'),30),6]};
  for(const [k,[cells,min]] of Object.entries(want)){const r=cells.filter(c=>c.startsWith('r_'));
   out.push([`${k}: ${cells.length}>=${min} cells, r_* art loaded`,cells.length>=min&&r.length>0&&r.every(c=>hasAIState('nr_neta',c.split(':')[0])),cells.join(' ')]);}
  // Trip -> belly-flop -> crawl away -> up again, and the fight resumes.
  g.trainScene('boss-roof',0);b=G.boss;b.trainWaiting=false;G.player.invuln=9999;G.player.x=b.x-160;Object.assign(b,{state:'trip',t:0,tripDir:1,face:1});
  const path=[];for(let i=0;i<220;i++){g.step(1);if(path.at(-1)!==b.state)path.push(b.state);}
  out.push(['trip -> down -> crawl -> getup -> idle',/trip,down,(getup,)?crawl,getup,idle/.test(path.join()),path.join()]);
  // Voice: a burst of light hits yelps at most once per 16 ticks.
  g.trainScene('boss-roof',0);b=G.boss;b.trainWaiting=false;const calls=[];const sfx=G.audio.sfx;G.audio.sfx=(n,...a)=>{calls.push([G.rawTime,n]);return sfx.call(G.audio,n,...a);};
  try{for(let i=0;i<12;i++){b.state='idle';b.t=0;b.hurt(1,1,false,false);g.step(2);}}finally{G.audio.sfx=sfx;}
  const voice=calls.filter(c=>/neta_roof_(yelp|whimper|beg|laugh|gulp)/.test(c[1]));
  out.push(['hit yelps are rate-limited (<=2 in 24 ticks)',voice.length>=1&&voice.length<=2,voice.map(c=>c[1]).join()]);
  // Sound files.
  const names=['yelp1','yelp2','yelp3','whimper','beg','laugh','scream','ko','thud','whip','click','spin','drop','snap','cash','step','gulp'];
  const st=await Promise.all(names.map(n=>fetch(`/audio/sfx/neta_roof_${n}.wav`,{cache:'reload'}).then(r=>r.status)));
  out.push(['17 neta_roof_* wavs load',st.every(s=>s===200),st.join()]);
  return out;});
 for(const [k,ok,info] of out)console.log(ok?'PASS':'FAIL',k,info?'- '+info:'');
 assert(out.every(x=>x[1]),'neta roof check failed');console.log(`neta roof check: ${out.length}/${out.length}`);
}finally{await br.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
