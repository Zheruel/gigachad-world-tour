// Native/double contact sweeps through the real render and a live normal-speed pass.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 fs.mkdirSync('tmp/review/boxing-polish/game',{recursive:true});
 const page=await browser.newPage({viewport:{width:1000,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
 for(const type of ['ic_headset','nr_heavy','conductor','vikram']){
  const captures=await page.evaluate(async type=>{
   const g=__game,G=g.G,{startSuper,updatePlayer}=await import('./js/player.js'),{updateEffects}=await import('./js/effects.js'),{createBoss}=await import('./js/bosses.js');
   g.trainScene(type==='conductor'?'conductor':type==='vikram'?'boss':'general',type==='conductor'?300:0);g.resetInput();G.enemies=[];G.props=[];G.boss=null;G.effects=[];G.shots=[];G.meter=100;G.hitstop=0;G.shake=G.flash=G.fade=0;const p=G.player;Object.assign(p,{x:G.camX+205,y:220,z:0,face:1,hp:100,invuln:0,state:'idle'});
   const e=['conductor','vikram'].includes(type)?createBoss(type,p.x+50,p.y):g.spawn(type,50,0);Object.assign(e,{x:p.x+50,y:p.y,state:'idle',face:-1,hp:120,guard:type==='conductor'?3:0,protectedStagger:0});G.state='play';startSuper(p);const images=[];
   for(let i=0;i<=102;i++){
    if(i){updateEffects();updatePlayer(p);G.time++;G.rawTime++;}G.shake=G.flash=G.fade=0;
    if(i%3===0||[24,32,40,48,56,60,76,80,100].includes(i)){g.render();const c=document.querySelector('canvas'),d=document.createElement('canvas');d.width=960;d.height=540;const dc=d.getContext('2d');dc.imageSmoothingEnabled=false;dc.drawImage(c,0,0,960,540);images.push({t:i,native:(()=>{const n=document.createElement('canvas');n.width=480;n.height=270;const nc=n.getContext('2d');nc.imageSmoothingEnabled=false;nc.drawImage(c,0,0,480,270);return n.toDataURL();})(),double:d.toDataURL()});}
   }
   return images;
  },type);
  for(const frame of captures)for(const [key,size]of [['native',480],['double',960]])fs.writeFileSync(`tmp/review/boxing-polish/game/${type}-${String(frame.t).padStart(3,'0')}-${size}.png`,Buffer.from(frame[key].split(',')[1],'base64'));
 }
 const pure=await page.evaluate(()=>{const G=__game.G,s=JSON.stringify([G.player,G.enemies],(k,v)=>['set','specialTarget','rig','grabbedBy','grabTarget'].includes(k)?undefined:v);__game.render();__game.render();return s===JSON.stringify([G.player,G.enemies],(k,v)=>['set','specialTarget','rig','grabbedBy','grabTarget'].includes(k)?undefined:v)});assert(pure);assert.deepEqual(errors,[]);console.log(JSON.stringify({targets:4,step:3,renderPure:pure,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
