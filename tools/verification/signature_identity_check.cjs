// Actual runtime checks and contact captures for the original-ink super pass.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const dir='tmp/review/signature-identity/runtime';
// The Night Train's regular families; each has its own daze scenario in Review Studio.
const TRAIN_CAST=['nr_brawler','nr_chai','nr_paan','nr_tte','nr_rack','nr_commando','nr_captain'];fs.mkdirSync(dir,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8011/review.html?scenario=train/general&mode=inspect');await page.waitForFunction(()=>window.__review,null,{timeout:120000});
 const checks=await page.evaluate(async(TRAIN_CAST)=>{
  const g=__review.game,G=g.G,{updateEnemies}=await g.importModule('js/enemies.js'),{dazePose}=await g.importModule('js/daze.js');const out=[];
  for(const kind of TRAIN_CAST){
   g.trainScene('general');G.enemies=[];G.boss=null;const e=g.spawn(kind,65,0);Object.assign(e,{state:'stagger',protectedStagger:90,dazeT:0,flash:4});const x=e.x,y=e.y,poses=new Set();
   for(let t=0;t<89;t++){updateEnemies();poses.add(dazePose(e).idx);if(t===3)out.push([kind+' flash expires',e.flash===0]);}
   out.push([kind+' full protected opening',e.state==='stagger'&&e.protectedStagger===1&&e.x===x&&e.y===y]);
   out.push([kind+' animated reaction',poses.size===4]);updateEnemies();out.push([kind+' releases exactly once',e.state==='idle'&&e.protectedStagger===0]);
  }
  return out;
 },TRAIN_CAST);assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));
 const art=await page.evaluate(async(TRAIN_CAST)=>{
  const s=await __review.game.importModule('js/sprites.js');const out=[];
  for(const[key,state]of [['player','super_barrage'],['player','super_electric'],...TRAIN_CAST.map(k=>[k,'stagger_polish'])]){
   const a=await __review.game.importModule('js/aiframes.js'),count=a.getAIFrame(key,state).f.length;
   for(const bg of ['#20242c','#ece8dc']){const c=document.createElement('canvas');c.width=720;c.height=Math.ceil(count/4)*125;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);
    for(let i=0;i<count;i++){x.save();x.translate(i%4*180,Math.floor(i/4)*125);x.fillStyle=bg==='#20242c'?'white':'black';x.fillText(i,5,10);const ref=s.getFrame(s.SPR[key],'idle',0,1),f=s.getFrame(s.SPR[key],state,i,1);s.blit(x,ref,32-s.frameW(ref)/2,114-s.frameH(ref));s.blit(x,f,112-s.frameW(f)/2,114-s.frameH(f));x.restore();}out.push({name:key+'-'+state+(bg==='#20242c'?'-dark':'-light'),url:c.toDataURL()});}
  }return out;
 },TRAIN_CAST);for(const p of art)fs.writeFileSync(`${dir}/${p.name}.png`,Buffer.from(p.url.split(',')[1],'base64'));
 for(const id of ['delhi/super-0-survive','delhi/super-1-survive','train/daze-nr_brawler','train/daze-nr_captain']){
  await page.evaluate(id=>__review.load(id),id);
  for(let t=0;t<=162;t+=3){await page.evaluate(t=>__review.seek(t),t);const c=await page.evaluate(()=>__review.capture(false));fs.writeFileSync(`${dir}/${id.replace("/","_")}-${t}.png`,Buffer.from(c.image.split(',')[1],'base64'));}
  await page.evaluate(()=>__review.restart());await page.evaluate(()=>__review.play());await page.waitForTimeout(3000);await page.evaluate(()=>__review.pause());assert((await page.evaluate(()=>__review.snapshot())).tick>60);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.length,sheets:art.length,captures:220,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
