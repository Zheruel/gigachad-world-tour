const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:980,height:580}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 const result=await p.evaluate(async()=>{const {beginBossEntry,updateBossEntry}=await import('./js/boss_cinematic_entry.js');const c={};beginBossEntry(c,48);let staged=0;for(let i=0;i<30;i++){if(!updateBossEntry(c,()=>staged++))throw Error('entry advanced early');if(c.t!==48)throw Error('hidden performance advanced');}if(staged!==1||updateBossEntry(c,()=>staged++))throw Error('entry not once');return true});assert(result);
 const dir='tmp/review/boss-entry';fs.mkdirSync(dir,{recursive:true});
 for(const [stage,scene]of [['train','inspector-finish'],['train','knockout'],['train','roof-transition'],['delhi','vendor-finish'],['delhi','dredger-finish'],['refund','closer-finish']]){
  const beats=scene==='inspector-finish'?[80,134,154,180,208]:scene==='knockout'?[34,42,50,70,86,100,121,139]:scene==='roof-transition'?[60,84,112,133,222,270,360,475,540,660]:scene==='vendor-finish'?[168,194,220,262,324,388,496]:scene==='dredger-finish'?[88,124,162,230,360,528,678,916]:[260,288,322,370,444,536,796];
  const ticks=[...new Set([0,9,12,18,24,30,33,...beats.flatMap(t=>Array.from({length:9},(_,i)=>t-12+i*3))])].sort((a,b)=>a-b);
  for(const t of ticks){
   await p.evaluate(({stage,scene,t})=>{if(stage==='train')__game.trainScene(scene,t);else __game.indiaScene(stage,scene,t);__game.G.shake=0;__game.render()},{stage,scene,t});
   for(const width of [480,960]){await p.locator('#game').evaluate((c,w)=>Object.assign(c.style,{width:w+'px',height:w*270/480+'px',maxWidth:'none'}),width);await p.locator('#game').screenshot({path:`${dir}/${scene}-${t}-${width}.png`});}
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS: shared entry clocks/staging and six native/2x cinematic captures');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
