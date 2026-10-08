// Delhi scenery routing, isolated-area fixtures, and preservation of approved intro art.
const assert = require('node:assert/strict');
const studio = require('./studio_helper.cjs');
(async () => {
 const { page, errors, close } = await studio.launch();
 try {
  const frame = await studio.openStudio(page, 'delhi/market');
  const routing = await frame.evaluate(async () => {
   const [{ G }, { ASSETS }, { drawProp }] = await Promise.all(['engine','assets','props'].map(n=>import('/js/'+n+'.js')));
   const ctx=document.createElement('canvas').getContext('2d'), drawn=[];
   ctx.drawImage=im=>{if(im.src)drawn.push(im.src);};
   const result={missing:[],dimensions:[],routes:[]};
   for(const name of ['ic_stall','ic_cart','ic_boiler','ic_cargo'])for(const suffix of ['', '_b']){
    const key=name+suffix, a=ASSETS['prop_delhi_'+key], b=ASSETS['prop_'+key];
    if(!a||!b)result.missing.push(key);
    else result.dimensions.push([key,name==='ic_boiler'?a.width===b.width&&a.height===b.height:a.width>b.width&&a.height>b.height]);
   }
   for(const [stage,state,expected]of [['delhi','play','/dirty_delhi/props/'],['delhi','intro','/india/props/'],['train','play','/india/props/']]){
    const oldStage=G.stage,oldState=G.state;G.stage={id:stage};G.state=state;
    for(const prop of ['ic_stall','ic_cart','ic_boiler','ic_cargo','ic_thela']){
     drawProp(ctx,{prop,x:100,y:220,z:0,t:0},0);
     const route=stage==='delhi'&&state==='play'&&prop==='ic_thela'?'/dirty_delhi/cast/':expected;
     result.routes.push([stage,state,prop,drawn.some(src=>src.includes(route))]);drawn.length=0;
    }
    G.stage=oldStage;G.state=oldState;
   }
   result.sellerDimensions=['pakora','sugarcane'].flatMap(n=>['','_prop',...(n==='sugarcane'?['_wheel']:[])].map(s=>{
    const a=ASSETS['dm_play_seller_'+n+s],b=ASSETS['dm_seller_'+n+s];return [n+s,!!a&&a.width===b.width&&a.height===b.height];
   }));
   const market=await import('/js/delhi_life_market.js');
   result.marketTraffic=[market.MARKET_WALKERS.length,...['porter','shopper','saree','teaboy','cyclist','rickshaw'].map(n=>Number(!!market.MARKET_LIFE_FILES['dm_'+n]))];
   const life=await import('/js/delhi_life_river.js');
   result.riverWalkers=[life.riverCarriers().routes.length,life.riverPoles().routes.length];
   return result;
  });
  assert.deepEqual(routing.missing,[]);
  assert(routing.dimensions.every(x=>x[1]),'Delhi working props grow; the boiler retains its approved size');
  assert(routing.routes.every(x=>x[3]),'Intro and other stages use approved original props');
  assert(routing.sellerDimensions.every(x=>x[1]),'Seller overrides retain every pose and prop registration');
  assert(routing.marketTraffic.every(n=>n===0),'Market pedestrians and vehicles are retired and not loaded');
  assert.deepEqual(routing.riverWalkers,[0,0],'River retains fixed workers without roaming carriers');
  for(const area of ['market','bazaar','food','kitchen-area','culvert','ghat','wharf','pontoon']){
   await studio.load(page,'delhi/'+area);
   const state=await studio.game(page,(g,G)=>({enemies:G.enemies.length,boss:!!G.boss,aftermath:G.india.marketBroken}));
   assert.deepEqual(state,{enemies:0,boss:false,aftermath:true},area);
  }
  await studio.load(page,'delhi/market');
  for(const marketState of ['before','after']){
   await studio.settings(page,{marketState});await studio.seek(page,180);
   const s=await studio.game(page,(g,G)=>({aftermath:G.india.marketBroken,cart:G.props.find(p=>p.prop==='ic_cart'&&p.x===540)?.broken}));
   assert.deepEqual(s,{aftermath:marketState==='after',cart:marketState==='after'});
  }
  await studio.load(page,'delhi/intro');
  for(const tick of [0,180,720,1230]){
   await studio.seek(page,tick);
   const unchanged=await frame.evaluate(async()=>{
    const {ASSETS}=await import('/js/assets.js');const g=parent.__review.game;
    g.render();const canvas=document.querySelector('canvas'),a=canvas.toDataURL(),saved={};
    for(const key of Object.keys(ASSETS))if(key.startsWith('dm_play_')||key.startsWith('prop_delhi_')){saved[key]=ASSETS[key];ASSETS[key]=null;}
    try{g.render();return a===canvas.toDataURL();}finally{Object.assign(ASSETS,saved);g.render();}
   });
   assert(unchanged,'Play-only artwork leaves intro pixels unchanged at tick '+tick);
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({areas:8,propRoutes:15,registeredProps:8,sellerLayers:5,riverWalkers:0,introPixelChecks:4,aftermathReplay:true,errors}));
 }finally{await close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
