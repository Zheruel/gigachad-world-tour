const assert=require('node:assert/strict'),fs=require('node:fs');
const{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
  const result=await page.evaluate(async()=>{
   const g=__game,G=g.G,{createProp}=await import('./js/props.js'),{spawnEnemy}=await import('./js/enemies.js');
   const{initIndiaEnvironment:init,updateIndiaEnvironment:update,drawIndiaEnvironment:draw}=await import('./js/india_environment.js');
   const checks=[],captures=[],check=(n,v)=>checks.push([n,!!v]),run=n=>{for(let i=0;i<n;i++)update();};
   function setup(kinds=['ic_boiler']){
    g.indiaScene(kinds[0]==='ic_monitor'?'refund':'delhi',kinds[0]==='ic_monitor'?'calling':'food');G.boss=null;G.enemies=[];G.flash=0;
    const x=G.camX+200;G.props=kinds.map((k,i)=>createProp(k,x+i*100,229));G.player.x=x+55;G.player.y=229;G.player.invuln=0;init();
    return G.india.environment;
   }
   let s=setup(),p=G.player,pr=G.props[0],e=spawnEnemy('ic_brawler',pr.x+58,229);e.state='idle';
   run(97);check('first vent demonstrates without damaging either side',p.hp===100&&e.hp===e.maxhp&&s.nodes[0].demoDone);
   G.waveActive=true;run(360);check('live vent begins with visible warning',s.nodes[0].mode==='tell'&&s.dangerActive);
   const warningHP=p.hp;run(52);check('full warning remains harmless',p.hp===warningHP);
   run(3);check('locked vent hurts both player and enemy once',p.hp===94&&e.hp===e.maxhp-10);
   const contactHP=p.hp,enemyHP=e.hp;run(30);check('vent does not repeatedly stun or damage contacts',p.hp===contactHP&&e.hp===enemyHP);
   const node=s.nodes[0],beforeEvents=s.events.length;G.props=G.props.filter(Boolean);update();
   check('replacing prop array preserves existing hazard state',G.india.environment.nodes[0]===node&&s.events.length>=beforeEvents);
   s=setup();pr=G.props[0];run(12);pr.hurt(1,1);check('striking pressure equipment interrupts its warning',s.nodes[0].mode==='rest'&&!s.active);
   s=setup();pr=G.props[0];run(97);G.waveActive=true;run(360);G.player.z=30;run(60);check('jump avoids the locked vent lane',G.player.hp===100);
   s=setup();pr=G.props[0];run(97);G.waveActive=true;run(360);G.player.y=244;run(60);check('lane movement avoids the vent',G.player.hp===100);
   s=setup(['ic_boiler','ic_cargo']);run(20);check('only one environment warning can start',s.nodes.filter(n=>n.mode!=='rest').length===1);
   const cooker=spawnEnemy('ic_kitchen',G.camX+340,229);cooker.state='windup';cooker.t=5;run(70);check('hazard waits while a red enemy tell is active',s.nodes.every(n=>n.mode!=='active'));
   s=setup(['ic_cart']);pr=G.props[0];G.player.x=pr.x-32;e=spawnEnemy('ic_brawler',pr.x+47,229);e.state='idle';const x0=pr.x;
   pr.hurt(14,1,true);run(10);check('heavy hit drives a cart into a nearby fighter',pr.x>x0+12&&e.hp<e.maxhp&&G.player.hp===100);
   pr.hurt(99,1);run(2);check('broken moving prop stops and bursts, leaving no wreck',pr.broken&&pr.dead&&s.nodes[0].vx===0&&G.effects.some(e=>e.type==='propChunk'));
   s=setup(['ic_cargo']);pr=G.props[0];const start=pr.x;G.waveActive=true;run(600);check('Delhi cargo remains fixed with no warning or contact damage',pr.x===start&&!s.nodes.length&&!s.active&&G.player.hp===100);
   pr.hurt(14,1,true);run(60);check('heavy hits damage cargo without sliding it',pr.x===start&&pr.hp===pr.maxhp-14);
   const drops=G.pickups.length;pr.hurt(99,1);run(2);check('ordinary cargo break leaves its recovery shake',pr.broken&&G.pickups.length===drops+1&&G.pickups.at(-1).kind==='shake');
   s=setup(['ic_monitor']);pr=G.props[0];G.player.x=pr.x+15;pr.hurt(99,1);run(60);check('destroyed equipment leaves no floor hazard',pr.broken&&!s.active&&!s.nodes.length&&G.player.hp===100);
   G.props=[createProp('ic_cart',G.camX+200,229)];update();const fresh=G.props[0];fresh.hurt(1,1);check('fresh retry props receive exactly one new wrapper',fresh.hp===fresh.maxhp-1&&s.nodes.length===1&&s.nodes[0].prop===fresh);
   s=setup();run(60);
   const snapshot=()=>JSON.stringify({t:s.t,nodes:s.nodes.map(n=>({t:n.t,mode:n.mode,x:n.prop.x,hp:n.prop.hp,cooldown:n.cooldown})),events:s.events});
   const before=snapshot(),ctx=document.querySelector('#game').getContext('2d');draw(ctx,G.camX);draw(ctx,G.camX);check('rendering has no choreography or cue side effects',snapshot()===before);
   for(let frame=0;frame<42;frame+=3){run(3);g.render();captures.push({frame,png:document.querySelector('#game').toDataURL('image/png')});}
   return{checks,captures};
  });
  fs.mkdirSync('tmp/review/india-environment/actual',{recursive:true});
  for(const c of result.captures)fs.writeFileSync(`tmp/review/india-environment/actual/steam-${String(c.frame).padStart(2,'0')}.png`,Buffer.from(c.png.split(',')[1],'base64'));
  console.log(JSON.stringify({checks:result.checks,errors}));assert(result.checks.every(c=>c[1]));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
