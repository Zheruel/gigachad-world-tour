const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8011/?auto=travel-papers');await page.waitForFunction(()=>__game?.travelReady());
 const checks=await page.evaluate(async()=>{
  const {dialogueReveal,dialogueLines,updateDialogue,drawDialogue,bossIntroDialogue}=await import('/js/room_dialogue.js'),{ENCOUNTER,waitingOfficialAt,papersAt:actualPapersAt,papersDialogue}=await import('/js/airport.js'),{audio}=await import('/js/audio.js'),out=[],check=(n,v)=>out.push([n,!!v]);
  const papersAt=t=>actualPapersAt(t+ENCOUNTER.throwDelay);
  for(const [key,start,end] of [['conductor',210,300],['vikram',194,315],['vendor',80,170],['closer',75,180],['dredger',73,195]]){
   const b={key,x:300,def:{taunt:'TEST LINE'}};
   check(key+' speech and audio share exact boundaries',!bossIntroDialogue(b,start-1)&&bossIntroDialogue(b,start).age===0&&bossIntroDialogue(b,end-1).remaining===1&&!bossIntroDialogue(b,end));
  }
  const text='AND THE PROCESSING FEE.';
  check('train-speed two frames per letter',dialogueReveal(text,12).text==='AND TH');check('typing begins empty',dialogueReveal(text,0).text==='');check('complete line remains visible',dialogueReveal(text,100).text===text&&dialogueReveal(text,100).complete);check('cursor blinks only during reveal',dialogueReveal(text,4).cursor&&!dialogueReveal(text,8).cursor&&!dialogueReveal(text,100).cursor);
  let calls=[];const original=audio.roomSfx;audio.roomSfx=(...a)=>{calls.push(a);return true;};
  for(let age=0;age<100;age++)updateDialogue(text,age);check('quiet blips stop when typing finishes',calls.length===7&&calls.every(c=>c[0]==='blip'&&c[1]<=.1));
  const before=calls.length;updateDialogue(text,6,{visible:false});updateDialogue(text,6,{remaining:0});const c=document.createElement('canvas');c.width=480;c.height=270;drawDialogue(c.getContext('2d'),{text,x:240,bottom:130,age:12});check('hidden bubbles and rendering are silent',calls.length===before);audio.roomSfx=original;
  const end=papersDialogue(125);check('fee has readable hold after typing',end.end-end.start>text.length*2+35);check('wrapping reserves complete lines',dialogueLines(text,60).length>1);
  let prev=papersAt(218),shrinks=true;for(let t=219;t<258;t++){const p=papersAt(t);if(p.airX>=prev.airX||p.airScale>=prev.airScale)shrinks=false;prev=p;}check('official moves backward and recedes continuously',shrinks);check('arc remains below the HUD',Array.from({length:40},(_,i)=>papersAt(218+i).airY).every(y=>y>44));check('official passes behind plane layers',papersAt(228).far&&!papersAt(227).far);check('tiny distant silhouette before glint',papersAt(257).airScale<.017&&papersAt(257).airY<95);check('distant glint replaces official once',papersAt(258).glint&&!papersAt(258).airborne&&!papersAt(265).glint);
  const waiting=['landing','disembark','papers'].map(phase=>waitingOfficialAt({phase,t:1}));check('official waits at the same post across arrival',waiting.every(p=>p.visible&&p.x===ENCOUNTER.officialX&&p.y===ENCOUNTER.y));check('official halts CHAD during descent',waitingOfficialAt({phase:'disembark',t:100}).frame===1);
  const g=__game;g.G.freezeTime=false;g.travel('papers');g.step(125);check('CHAD waits for papers and money demand',g.G.travel.x===ENCOUNTER.waitX);g.step(35);check('CHAD walks to stationary official',g.G.travel.x>ENCOUNTER.waitX&&g.G.travel.x<ENCOUNTER.heroX&&g.G.travel.actor.state==='walk');g.step(44);check('approach reaches registered throw position',g.G.travel.x===ENCOUNTER.heroX&&g.G.travel.cam===ENCOUNTER.camera);g.G.freezeTime=true;
  return out;
 });
 fs.mkdirSync('/tmp/gachi-distance',{recursive:true});
 for(const t of [6,16,50,64,100,125,160,204,220,251,258,260,264,268,272,280,288,298,304,318]){
  await page.evaluate(t=>{__game.G.freezeTime=false;__game.travel('papers');__game.step(t);__game.G.freezeTime=true;__game.G.fade=0;__game.render();},t);
  fs.writeFileSync(`/tmp/gachi-distance/papers-${t}.png`,Buffer.from(await page.locator('#game').evaluate(c=>c.toDataURL().split(',')[1]),'base64'));
 }
 await page.evaluate(()=>{__game.G.freezeTime=false;__game.travel('papers');__game.step(268);__game.G.freezeTime=true;__game.G.fade=0;__game.render();});
 for(const width of [960,480]){await page.setViewportSize({width,height:width*9/16});await page.locator('#game').screenshot({path:`/tmp/gachi-distance/review-${width}.png`});}
 console.log(JSON.stringify({checks,errors}));assert(checks.every(x=>x[1]));assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
