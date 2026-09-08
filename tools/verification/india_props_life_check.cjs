// Review authored props and office routines on the actual chapter renderer.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1040,height:630}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>__game?.G.state==='play');
 fs.mkdirSync('tmp/review/india-props-life',{recursive:true});
 const capture=async n=>{for(const width of [480,960]){await p.locator('canvas').evaluate((c,w)=>Object.assign(c.style,{width:w+'px',height:w*270/480+'px',maxWidth:'none'}),width);await p.locator('canvas').screenshot({path:`tmp/review/india-props-life/${n}-${width}.png`});}};
 for(const [panel,x,y]of [['office',405,200],['annex',407,181],['calling',353,181],['calling_east',308,174]])for(let pose=0;pose<8;pose++){
  const frames=await p.evaluate(async({panel,x,y,pose})=>{const g=__game,G=g.G,{ASSETS}=await import('./js/assets.js'),{chapterFrame}=await import('./js/india_stage.js');g.indiaScene('refund',panel,0);G.enemies=[];G.boss=null;G.props=[];G.india.review.ambient=false;G.player.x=-100;G.camX=G.stage.width?['office','annex','calling','calling_east'].indexOf(panel)*810+Math.max(0,x-240):0;G.flash=G.shake=G.fade=0;g.render();const ctx=document.querySelector('canvas').getContext('2d');
   for(const key of ['office_life','office_stand','office_chair'])if(!ASSETS['qa_'+key]){const im=new Image();im.src='assets/stages/refund_tower/'+key+'.png';await im.decode();ASSETS['qa_'+key]=im;}
   const sx=x-(G.camX%810);chapterFrame(ctx,'qa_office_chair',0,sx,y,50,50,1,1);chapterFrame(ctx,pose<4?'qa_office_life':'qa_office_stand',4+(pose%4),sx+(pose<4?0:25),y,pose<4?50:100,pose<4?80:110,4,3);
   const c=document.querySelector('canvas'),d=document.createElement('canvas');d.width=960;d.height=540;const dc=d.getContext('2d');dc.imageSmoothingEnabled=false;dc.drawImage(c,0,0,960,540);return[c.toDataURL(),d.toDataURL()];
  },{panel,x,y,pose});for(let i=0;i<2;i++)fs.writeFileSync(`tmp/review/india-props-life/${panel}-${pose}-${[480,960][i]}.png`,Buffer.from(frames[i].split(',')[1],'base64'));
 }
 for(const [stage,scene]of [['delhi','market'],['delhi','food'],['refund','calling']]){await p.evaluate(({stage,scene})=>{__game.indiaScene(stage,scene,50);__game.G.shake=__game.G.flash=0;__game.render()}, {stage,scene});await capture(stage+'-'+scene);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({officePoses:32,nativeAndDouble:true,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
