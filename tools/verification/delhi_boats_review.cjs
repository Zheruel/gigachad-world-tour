// River-panel boat placement at the game's logical and double display sizes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const studio=require('./studio_helper.cjs');
const out=process.argv[2]||'tmp/review/delhi-boats-final';
(async()=>{
 const {page,errors,close}=await studio.launch();
 try{
  const frame=await studio.openStudio(page,'delhi/ghat');
  const boats=await frame.evaluate(async()=>{
   const life=await import('/js/delhi_life_river.js'),{ASSETS}=await import('/js/assets.js');
   if(life.RIVER_LIFE_FILES.dr_boatman||life.RIVER_LIFE_FILES.dr_tug)throw Error('Removed boats still load');
   const im=ASSETS.dr_skiff,mask=document.createElement('canvas');mask.width=im.width;mask.height=im.height;
   const m=mask.getContext('2d');m.drawImage(im,0,0);const px=m.getImageData(0,0,im.width,im.height).data;
   let x0=im.width,y0=im.height,x1=0,y1=0;
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(px[(y*im.width+x)*4+3]>=128){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
   const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx),positions=[];
   ctx.drawImage=(image,...args)=>{
    if(image===im){
     const tr=ctx.getTransform(),[sx,sy,sw,sh,dx,dy,dw,dh]=args;
     const bounds=[6000+(tr.a*(dx+(x0-sx)*dw/sw)+tr.e)/2,(tr.d*(dy+(y0-sy)*dh/sh)+tr.f)/2,
      6000+(tr.a*(dx+(x1-sx)*dw/sw)+tr.e)/2,(tr.d*(dy+(y1-sy)*dh/sh)+tr.f)/2];
     positions.push({tick:__game.G.india.t,bounds,transform:[tr.a,tr.d,tr.e,tr.f]});
    }
    draw(image,...args);
   };
   const G=__game.G;G.enemies=[];G.boss=null;G.effects=[];G.player.x=5800;G.camX=6000;
   for(let t=0;t<960;t+=7){G.time=G.india.t=t;ctx.setTransform(2,0,0,2,0,0);life.drawRiverLife(ctx,6000,ASSETS,t);}
   return {positions,removed:!ASSETS.dr_boatman&&!ASSETS.dr_tug};
  });
  assert(boats.removed,'Moving boat assets are no longer requested');
  assert.equal(boats.positions.length,138,'The moored skiff stays present through its animation');
  for(const {bounds:b,transform:t}of boats.positions){
   // This measured rectangle is clear water on pontoon.png, between the island and outfall.
   assert(b[0]>=6030&&b[2]<=6220&&b[1]>=141&&b[3]<=179,'The entire hull remains in clear water');
   assert(t.every(Number.isInteger),'Skiff and its bob land on native raster pixels');
  }
  fs.mkdirSync(out,{recursive:true});const captures=[];
  for(const [area,base]of [['culvert',3240],['ghat',4050],['wharf',4860],['pontoon',5670]]){
   for(const [view,offset]of [['west',0],['east',330]])for(const tick of [0,1500,3500]){
    const camera=base+offset;await studio.settings(page,{routeX:camera});
    await studio.game(page,(g,G,t)=>{G.time=G.india.t=t;G.enemies=[];G.boss=null;g.render();},tick);
    for(const scale of [1,2]){
     const file=`${out}/${area}-${view}-t${tick}-${scale}x.png`;
     await studio.capture(page,file,scale);captures.push({area,view,camera,tick,scale,file});
    }
   }
  }
  fs.writeFileSync(`${out}/captures.json`,JSON.stringify({boats,captures,errors},null,2)+'\n');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({captures:captures.length,skiffSamples:boats.positions.length,errors,out}));
 }finally{await close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
