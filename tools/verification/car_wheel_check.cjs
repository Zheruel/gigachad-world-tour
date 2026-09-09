const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1000,height:700}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8011/?auto=travel-drive&t=1');await p.waitForFunction(()=>__game.travelReady());
 const out='tmp/review/car-wheels';fs.mkdirSync(out,{recursive:true});
 const result=await p.evaluate(async()=>{
  const {drawCarWheels,CAR_WHEELS}=await import('/js/street.js'),{TRAVEL_ART:a}=await import('/js/travel.js');
  const c=document.createElement('canvas');c.width=460;c.height=a.car_driver.height;const x=c.getContext('2d');
  const render=(d,art=a)=>{x.clearRect(0,0,c.width,c.height);x.drawImage(a.car_driver,0,0);drawCarWheels(x,a.car_driver,0,0,c.width,c.height,d,art);return [...x.getImageData(0,0,c.width,c.height).data]};
  const checks=[],check=(n,v)=>checks.push([n,!!v]),base=render(0,{}),samples=[],brakeTransforms=[];
  const draw=x.drawImage.bind(x);x.drawImage=(im,...args)=>{if(im===a.wheel_brake)brakeTransforms.push(x.getTransform().toString());draw(im,...args)};
  for(let i=0;i<=24;i++){
   const pixels=render(i*Math.PI*2*28/24);samples.push(c.toDataURL());
   for(const w of CAR_WHEELS){let red=0,wrong=0;for(let y=w.y-24;y<w.y+24;y++)for(let xx=w.x-21;xx<w.x+21;xx++){
    const j=(y*c.width+xx)*4,r=pixels[j],g=pixels[j+1],bl=pixels[j+2];if(r>70&&r>g*2&&r>bl*2){red++;if(xx<w.x+4)wrong++}
   }check(`wheel ${w.x} caliper stays on right at ${i}`,red>0&&wrong===0)}
  }
  check('fixed brake transforms throughout rotation',brakeTransforms.every((v,i)=>v===brakeTransforms[i%2]));
  for(const key of ['wheel_brake','wheel_rims']){const missing={...a};delete missing[key];check('static fallback without '+key,render(47,missing).every((v,i)=>v===base[i]))}
  return {checks,samples};
 });
 for(let i=0;i<result.samples.length;i++)fs.writeFileSync(`${out}/rotation-${i}.png`,Buffer.from(result.samples[i].split(',')[1],'base64'));
 await p.locator('#game').evaluate(c=>{c.style.width='960px';c.style.height='540px'});
 for(let t=0;t<300;t+=15){await p.evaluate(t=>{__game.travel('drive');__game.G.freezeTime=true;__game.G.travel.t=t;__game.G.fade=0;__game.render()},t);await p.locator('#game').screenshot({path:`${out}/drive-${t}-2x.png`})}
 await p.locator('#game').evaluate(c=>{c.style.width='480px';c.style.height='270px'});
 await p.locator('#game').screenshot({path:`${out}/native.png`});
 await p.locator('#game').evaluate(c=>{c.style.width='960px';c.style.height='540px'});
 await p.evaluate(()=>{__game.G.freezeTime=false;__game.travel('drive');__game.G.fade=0});
 for(let i=0;i<7;i++){await p.waitForTimeout(500);await p.locator('#game').screenshot({path:`${out}/live-${i}.png`})}
 console.log({checks:result.checks,errors});assert.deepEqual(errors,[]);assert(result.checks.every(c=>c[1]));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
