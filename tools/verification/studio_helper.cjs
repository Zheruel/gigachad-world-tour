// Review Studio helper for checks and visual QA: a thin wrapper over review.html's window.__review.
//   const studio=require('./studio_helper.cjs');
//   const {page,errors,close}=await studio.launch();               // headless Chrome; errors collects page/console errors
//   const frame=await studio.openStudio(page,'train/duel-commando'); // scenario ids: tools/review/scenarios.js (or __review.listScenarios())
//   await studio.seek(page,120); await studio.step(page,1);          // paused; jump to an absolute tick / advance n ticks
//   const n=await studio.game(page,(g,G,arg)=>G.enemies.length);     // run JS against the game (g=__game, G=__game.G)
//   await studio.layers(page,{fg:false});                            // toggle scenario layers; settings(page,{...}) for other controls
//   await studio.capture(page,'tmp/review/x.png',1);                 // PNG of the game at 1× (480×270) or 2× (960×540)
//   await close();
// Server: GAME_URL, else http://localhost:$PORT (default 8011), serving the repo root.
const base=process.env.GAME_URL||`http://localhost:${process.env.PORT||8011}`;
async function launch({width=1600,height=1000}={}){
 const browser=await require('playwright').chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width,height}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 return {browser,page,errors,close:()=>browser.close()};
}
async function openStudio(page,id){
 await page.goto(`${base}/review.html?scenario=${encodeURIComponent(id)}`);
 await page.waitForFunction(()=>window.__review?.game&&window.__review?.snapshot()?.scenarioId,null,{timeout:90000});
 await load(page,id);
 await page.evaluate(()=>__review.setScale(2)); // captures stay at the exact 2× review size; the Studio itself fits the window
 return page.frames().find(f=>f.url().includes('/tools/review/runtime.html'));
}
async function load(page,id){await page.evaluate(async id=>{await __review.load(id);__review.pause();},id);}
async function seek(page,n){await page.evaluate(n=>__review.seek(n),n);}
async function step(page,n){await page.evaluate(n=>__review.step(n),n);}
async function settings(page,s){await page.evaluate(s=>__review.setSettings(s),s);}
async function layers(page,l){await settings(page,{layers:l});}
async function game(page,fn,arg){return page.evaluate(([src,arg])=>{const g=__review.game;return (0,eval)('('+src+')')(g,g.G,arg);},[fn.toString(),arg]);}
async function capture(page,path,scale=2){
 await page.evaluate(n=>{__review.setScale(n);__review.game.render();},scale);
 try{return await page.locator('#game').screenshot({path});}finally{await page.evaluate(()=>__review.setScale(2));}
}
module.exports={launch,openStudio,load,seek,step,settings,layers,game,capture};
