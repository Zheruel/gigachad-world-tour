const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const out='/tmp/gachi-porter';fs.mkdirSync(out,{recursive:true});try{
 const p=await browser.newPage({viewport:{width:960,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/?auto=travel-lobby');await p.waitForFunction(()=>window.__game?.travelReady());
 const checks=await p.evaluate(async()=>{const g=window.__game,{porterAt}=await import('/js/lobby_staff.js'),{TRAVEL_ART}=await import('/js/travel.js'),checks=[];
 const check=(name,pass)=>checks.push({name,pass:!!pass});
 const tasks=new Set(),positions=new Set();for(let t=800;t<2240;t++){const a=porterAt({t,greeted:true,greetT:0});tasks.add(a.task);positions.add(a.x);}
 check('waiting porter looks around, adjusts cap, shifts luggage and nods',['look','cap','luggage','nod','rest'].every(x=>tasks.has(x)));
 check('waiting porter stays at the door',positions.size===1&&positions.has(744));
 const delivery=[];for(let t=181;t<660;t++)delivery.push(porterAt({t,greeted:true,greetT:0}));
 check('delivery remains continuous and uses six walk frames',new Set(delivery.map(a=>a.frame)).size===6&&delivery.every((a,i)=>!i||a.x>=delivery[i-1].x&&a.x-delivery[i-1].x<1));
 const canvas=document.createElement('canvas');canvas.width=120;canvas.height=180;const ctx=canvas.getContext('2d');
 for(const [name,count] of [['porter_service',9],['porter_idle',12]]) {
  const im=TRAVEL_ART[name];check(`${name} loaded`,im?.width===count*120&&im.height===180);
  let padded=true;for(let i=0;i<count;i++){ctx.clearRect(0,0,120,180);ctx.drawImage(im,i*120,0,120,180,0,0,120,180);const d=ctx.getImageData(0,0,120,180).data;let top=180,bottom=0,left=120,right=0;
   for(let y=0;y<180;y++)for(let x=0;x<120;x++)if(d[(y*120+x)*4+3]>128){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
   padded&&=top>=7&&top<20&&bottom===179&&left>0&&right<119;
  }check(`${name} has complete padded poses and stable soles`,padded);
 }
 g.G.freezeTime=false;g.travel('lobby');g.G.travel.greeted=true;g.G.travel.greetT=-800;g.G.travel.x=690;g.step(1);
 const old=TRAVEL_ART.porter_idle;delete TRAVEL_ART.porter_idle;g.render();TRAVEL_ART.porter_idle=old;check('missing idle sheet uses the corrected standing fallback',true);
 const before=JSON.stringify(g.G.travel);g.render();g.render();check('porter rendering does not advance animation',before===JSON.stringify(g.G.travel));return checks;
 });assert(checks.every(c=>c.pass),JSON.stringify(checks));
 for(const [name,t] of [['rest',20],['look',120],['cap-reach',255],['cap-adjust',275],['cap-lower',312],['bag-look',391],['bag-lift',432],['bag-settle',462],['nod',530]]){
  await p.evaluate(t=>{const g=window.__game;g.G.freezeTime=false;g.travel('lobby');g.G.travel.greeted=true;g.G.travel.greetT=-800;g.G.travel.x=690;g.step(1);g.G.travel.t=t;g.G.freezeTime=true;g.G.fade=0;g.render();},t);await p.screenshot({path:`${out}/${name}.png`});
 }
 await p.setViewportSize({width:480,height:270});await p.screenshot({path:`${out}/native-scale.png`});
 await p.goto('http://localhost:8011/review-elevator.html?scene=porter&t=275');await p.waitForFunction(()=>document.querySelector('#readout').textContent.startsWith('Frame'));await p.locator('#porter').click();await p.locator('[data-step="30"]').click();assert.equal(await p.locator('#timeline').inputValue(),'31');
 await p.locator('#play').click();await p.waitForTimeout(900);await p.locator('#play').click();assert(Number(await p.locator('#timeline').inputValue())>31);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,screenshots:out,reviewPlayback:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
