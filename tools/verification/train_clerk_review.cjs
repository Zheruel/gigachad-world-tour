// Actual Studio renderer: every transition frame, plus an occlusion regression.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}});await require('./studio_helper.cjs').openStudio(page,'train/intro');
 const result=await page.evaluate(async()=>{
  const game=__review.game,{drawTicketClerk}=await game.importModule('js/train.js');
  const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');ctx.scale(2,2);let checked=0;
  for(let t=0;t<480;t++){
   ctx.clearRect(0,0,480,270);drawTicketClerk(ctx,t);const a=ctx.getImageData(0,0,960,540).data;
   for(let y=240;y<350;y++)for(let x=90;x<285;x++)if(a[(y*960+x)*4+3]&&(y<268||y>=321||x<100||x>=276))throw Error('Guard crosses painted opening at '+t);
   checked++;
  }
  const sheets=[];
  for(const [name,start,end] of [['duck',120,146],['rise',208,246]]){
   const sheet=document.createElement('canvas');sheet.width=1400;sheet.height=Math.ceil((end-start+1)/7)*112;const s=sheet.getContext('2d');s.fillStyle='#17171d';s.fillRect(0,0,sheet.width,sheet.height);s.imageSmoothingEnabled=false;
   for(let t=start;t<=end;t++){
    await __review.seek(t);const shot=await __review.capture(false),im=new Image();im.src=shot.image;await im.decode();const i=t-start,x=i%7*200,y=Math.floor(i/7)*112;s.drawImage(im,90,248,200,86,x,y,200,86);s.fillStyle='#eee';s.font='12px monospace';s.fillText(String(t),x+5,y+104);
   }
   sheets.push({name,image:sheet.toDataURL()});
  }
  return{checked,sheets};
 });
 fs.mkdirSync('tmp/review/gate-guard',{recursive:true});for(const s of result.sheets)fs.writeFileSync('tmp/review/gate-guard/'+s.name+'-every-frame.png',Buffer.from(s.image.split(',')[1],'base64'));
 assert.equal(result.checked,480);console.log(JSON.stringify({occlusionFrames:result.checked,contactFrames:66}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
