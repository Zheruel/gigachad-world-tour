// Actual outfall motion over its river plate, plus fixed-infrastructure and pause checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
const out=process.argv[2]||'tmp/review/delhi-outfall-final';
(async()=>{
 const {page,errors,close}=await studio.launch();
 try{
  const frame=await studio.openStudio(page,'delhi/pontoon');fs.mkdirSync(out,{recursive:true});
  await studio.settings(page,{routeX:6000});await studio.seek(page,1500);
  const layers=await frame.evaluate(async()=>{
   const {ASSETS}=await import('/js/assets.js'),life=await import('/js/delhi_life_river.js');
   const ctx=document.createElement('canvas').getContext('2d'),draw=ctx.drawImage.bind(ctx),frames=[];
   ctx.drawImage=(im,...args)=>{
    if(im.width===100&&im.height===78&&args[2]===50&&args[3]===39){
     const d=im.getContext('2d').getImageData(0,0,100,78).data;
     // Contacts read from the actual plate: pipe lip, bollard and three rope points.
     const contacts=[[40,4],[70,30],[83,55],[80,70],[31,54],[44,51],[58,48]];
     const fixed=contacts.filter(([x,y])=>d[(y*100+x)*4+3]>0).length;
     let wet=0;for(let p=3;p<d.length;p+=4)if(d[p])wet++;
     frames.push({fixed,wet,png:im.toDataURL().split(',')[1]});
    }else draw(im,...args);
   };
   for(let t=0;t<64;t++)life.drawRiverLife(ctx,6000,ASSETS,t);
   return frames;
  });
  assert.equal(layers.length,64);assert(layers.every(f=>f.wet>0&&f.fixed===0),'Water never paints onto its fixed rope or bollard');
  assert(new Set(layers.map(f=>f.png)).size>32,'Flow has distinct travelling detail');
  layers.forEach((f,i)=>fs.writeFileSync(`${out}/layer-${String(i).padStart(3,'0')}.png`,Buffer.from(f.png,'base64')));
  for(let i=0;i<64;i++){
   if(i)await studio.step(page,1);
   const png=await frame.evaluate(()=>{
    const c=document.createElement('canvas');c.width=200;c.height=180;
    c.getContext('2d').drawImage(document.querySelector('#game'),760,240,200,180,0,0,200,180);
    return c.toDataURL().split(',')[1];
   });
   fs.writeFileSync(`${out}/${String(i).padStart(3,'0')}.png`,Buffer.from(png,'base64'));
  }
  const still=await frame.evaluate(()=>{const g=parent.__review.game,c=document.querySelector('#game');g.render();const before=c.toDataURL();g.render();return before===c.toDataURL()});
  assert(still,'Paused renders retain the same water frame');
  for(const scale of [1,2])await studio.capture(page,`${out}/scene-${scale}x.png`,scale);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({frames:64,fixedInfrastructure:true,paused:true,errors,out}));
 }finally{await close();}
})().catch(e=>{console.error(e);process.exitCode=1});
