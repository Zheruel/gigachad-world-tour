// Frozen finale, one-time score handoff and fresh keyboard/controller confirmation.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1080,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-train.html?scene=escape&t=0');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('play'));
 const f=page.frames().find(f=>f.url().includes('?auto=walk'));
 const checks=await f.evaluate(()=>{const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  g.trainScene('escape',1259);G.score=1234;G.lives=3;G.bestCombo=4;const expected=1234+3*500+4*25;g.press('use');g.step(1);
  ok('finale hands directly to clear',G.state==='clear'&&G.train.endingDone);ok('clear keeps final cinematic frame',G.train.cinematic?.t===1260);
  ok('clear applies earned bonus once',G.score===expected);const score=G.score,stats=JSON.stringify(G.clearStats);g.step(250);
  ok('held F cannot dismiss tally',G.state==='clear');ok('score and tally remain stable',G.score===score&&JSON.stringify(G.clearStats)===stats);
  g.release('use');g.press('attack');g.step(40);g.release('attack');ok('attack cannot dismiss train tally',G.state==='clear');
  g.press('pause');g.step(1);g.release('pause');const age=G.rawTime-G.stateT;g.step(80);ok('pause freezes clear and final frame',G.rawTime-G.stateT===age&&G.train.cinematic?.t===1260&&G.score===score);g.press('pause');g.step(1);g.release('pause');g.step(1);
  g.press('use');g.step(1);g.release('use');g.step(35);ok('fresh F continues to Delhi intro',G.state==='intro'&&G.stage.id==='delhi');
  g.trainScene('escape',1259);g.step(100);g.press('use');g.step(1);g.release('use');g.step(2);ok('fresh F before tally completion is ignored',G.state==='clear');
  g.trainScene('escape',1259);const pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};pad.buttons[4]={pressed:true,value:1};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});g.step(240);ok('held LB cannot dismiss tally',G.state==='clear');pad.buttons[4]={pressed:false,value:0};g.step(2);pad.buttons[4]={pressed:true,value:1};g.step(1);pad.buttons[4]={pressed:false,value:0};g.step(35);ok('fresh LB continues to Delhi intro',G.state==='intro'&&G.stage.id==='delhi');Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});g.resetInput();
  return out;
 });
 if(process.env.CLEAR_CAPTURE){fs.mkdirSync('/tmp/train-clear',{recursive:true});for(const age of [0,44,45,90,150,194,195,240]){await f.evaluate(age=>{__game.trainScene('escape',1259);__game.step(age+1);__game.render()},age);for(const size of [960,480]){if(size===480)await page.locator('#scale').click();await f.locator('canvas').screenshot({path:`/tmp/train-clear/${age}-${size}.png`});if(size===480)await page.locator('#scale').click();}}}
 console.log(JSON.stringify({checks,errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
