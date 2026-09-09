const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1000,height:700}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const checks=await p.evaluate(async()=>{
  const {drawDisplayTitle,loadDisplayType}=await import('/js/display_type.js'),{RESULTS_LAYOUT,resultPortraitFrame}=await import('/js/results.js');await loadDisplayType();
  const out=[],check=(n,v)=>out.push([n,!!v]);
  for(const [text,cx,cy,h,w]of [['CHAD WINS',240,26,22,330],...['S','A','B','C'].map(r=>['RANK '+r,74,202,30,32])]){
   const c=document.createElement('canvas');c.width=480;c.height=270;const x=c.getContext('2d');drawDisplayTitle(x,text,cx,cy,{height:h,maxWidth:w,anchor:[.5,.5]});
   const data=x.getImageData(0,0,480,270).data;let minX=480,minY=270,maxX=0,maxY=0;
   for(let y=0;y<270;y++)for(let px=0;px<480;px++){
    const i=(y*480+px)*4,r=data[i],g=data[i+1],b=data[i+2];
    if(data[i+3]>128&&r>90&&g>70&&r>b*1.6&&g>b*1.5){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   }
   check(text+' centered gold face',Math.abs((minX+maxX+1)/2-cx)<=1&&Math.abs((minY+maxY+1)/2-cy)<=1);
   if(text==='CHAD WINS')check('title clears inner header border',minY>=RESULTS_LAYOUT.title.y&&maxY<RESULTS_LAYOUT.title.y+RESULTS_LAYOUT.title.h);
  }
  check('all twelve authored poses used',new Set(Array.from({length:360},(_,t)=>resultPortraitFrame(t+45))).size===12);
  check('arms folded before rank stamp',resultPortraitFrame(164)===7&&resultPortraitFrame(165)===8);
  check('arms stay folded after the rank',Array.from({length:960},(_,t)=>resultPortraitFrame(t+165)).every(f=>f>=8));
  check('breathing repeats deterministically',Array.from({length:240},(_,t)=>resultPortraitFrame(t+165)===resultPortraitFrame(t+405)).every(Boolean));
  return out;
 });
 const out='tmp/review/results-registered';fs.mkdirSync(out,{recursive:true});
 // Every three ticks through arm folding, then all breathing holds.
 for(const t of [...Array.from({length:21},(_,i)=>108+i*3),205,245,285,325,365,404,405]){
  const b64=await p.evaluate(t=>{const g=__game;g.trainScene('clear',t);g.G.results={rank:'B',cues:new Set()};g.G.clearStats={hits:238,kos:47,combo:18,bonus:1500};g.G.score=42650;g.render();const c=document.createElement('canvas');c.width=480;c.height=270;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(document.querySelector('#game'),0,0,480,270);return c.toDataURL().split(',')[1]},t);
  fs.writeFileSync(`${out}/${t}.png`,Buffer.from(b64,'base64'));
 }
 for(const rank of ['S','A','B','C']){
  await p.evaluate(rank=>{__game.trainScene('clear',240);__game.G.results={rank,cues:new Set()};__game.render()},rank);
  await p.locator('#game').evaluate(c=>{c.style.width='960px';c.style.height='540px'});await p.locator('#game').screenshot({path:`${out}/rank-${rank}-2x.png`});
 }
 assert.deepEqual(errors,[]);console.log({checks,errors});assert(checks.every(c=>c[1]));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
