const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1060,height:700}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:8011/?auto=walk');
    await page.waitForFunction(()=>window.__game?.G.state==='play');
    await page.addStyleTag({content:'canvas{width:960px!important;height:540px!important}'});
    const data=await page.evaluate(async()=>{
      const g=window.__game,G=g.G,{spawnEnemy,updateEnemies}=await import('./js/enemies.js');
      const {getAIFrame}=await import('./js/aiframes.js');
      const keys=['brawler','runner','enforcer','heavy','kitchen','docker','headset','operator','thrower','security','cabinet','lead'];
      const checks=[],check=(n,v)=>checks.push([n,!!v]);
      g.indiaScene('delhi','market',0);G.enemies=[];G.boss=null;G.freezeTime=true;
      for(const name of keys){
        G.enemies=[];G.props=[];const key='ic_'+name,e=spawnEnemy(key,230,232);
        check(`${key} uses new art`,e.set._aiKey===key&&getAIFrame(key,'walk')?.f.length===8);
        check(`${key} reactions present`,['atk','hurt','down','getup','block'].every(s=>getAIFrame(key,s)?.f.length>0));
        e.state='approach';G.player.x=130;for(let i=0;i<18;i++)updateEnemies();
        check(`${key} movement is finite`,[e.x,e.y,e.stridePhase].every(Number.isFinite));
      }
      G.enemies=[];G.props=[];const lead=spawnEnemy('ic_lead',260,232),ally=spawnEnemy('ic_headset',300,232);
      lead.state='rally';lead.t=31;ally.state='idle';ally.atkCd=200;updateEnemies();
      check('leader coordinates an existing ally',ally.atkCd<=10&&G.enemies.length===2);
      lead.state='rally';lead.t=12;lead.hurt(1,-1,true,false);
      check('leader call is interruptible',lead.state!=='rally');
      G.enemies=[];G.props=[];const heavy=spawnEnemy('ic_heavy',250,232);
      heavy.rig.hurt(999,1,true,false);check('cart destruction permanently removes ram',heavy.ramGone&&heavy.rig.broken);
      G.enemies=[];const security=spawnEnemy('ic_security',260,232);security.state='idle';security.face=-1;
      const hp=security.hp;security.hurt(4,1,false,false);check('security guards frontal light strike',security.hp===hp&&security.state==='block');
      G.enemies=[];G.zones=[];G.props=[];
      const kitchen=spawnEnemy('ic_kitchen',260,232),nearby=spawnEnemy('ic_brawler',280,232);
      kitchen.state=nearby.state='idle';const nearbyHP=nearby.hp;
      kitchen.hurt(999,1,true,false);
      check('new kitchen KO cannot create an untelegraphed hazard',kitchen.dead&&G.zones.length===0&&nearby.hp===nearbyHP);
      G.enemies=[];const legacy=spawnEnemy('cooker',260,232);legacy.state='idle';legacy.hurt(999,1,true,false);
      check('legacy cooker behavior remains unchanged',G.zones.some(z=>z.kind==='fire'));
      return checks;
    });
    fs.mkdirSync('tmp/review/india-cast/game',{recursive:true});
    for(const [stage,scene,cast]of [['delhi','market',['brawler','runner','enforcer']],['delhi','food',['heavy','kitchen','docker']],['refund','calling',['headset','operator','thrower']],['refund','executive',['security','cabinet','lead']]]){
      await page.evaluate(async({stage,scene,cast})=>{
        const g=__game,G=g.G,{spawnEnemy}=await import('./js/enemies.js');g.indiaScene(stage,scene,0);G.enemies=[];G.boss=null;G.props=[];G.flash=0;G.shake=0;
        for(const [i,name]of cast.entries()){const e=spawnEnemy('ic_'+name,G.camX+210+i*95,236);e.state='idle';e.face=-1;}
        g.render();
      },{stage,scene,cast});
      await page.locator('canvas').first().screenshot({path:`tmp/review/india-cast/game/${stage}-${scene}-2x.png`});
      await page.locator('canvas').first().evaluate(c=>{c.style.setProperty('width','480px','important');c.style.setProperty('height','270px','important')});
      await page.locator('canvas').first().screenshot({path:`tmp/review/india-cast/game/${stage}-${scene}-native.png`});
      await page.locator('canvas').first().evaluate(c=>{c.style.setProperty('width','960px','important');c.style.setProperty('height','540px','important')});
    }
    console.log(JSON.stringify({checks:data,errors}));assert(data.every(c=>c[1]));assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
