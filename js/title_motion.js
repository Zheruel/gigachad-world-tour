import { drawTextShadow, textWidth } from './sprites.js';
export const TITLE_MOTION_FILES={
 world:'assets/ui/title-motion/poster-world.png',globe:'assets/ui/title-motion/world-globe.png',
 sunset:'assets/ui/title-motion/poster-sunset.png',midnight:'assets/ui/title-motion/poster-midnight.png',
 cigar:'assets/ui/title-motion/chad-cigar.png',shades:'assets/ui/title-motion/chad-shades.png',logo:'assets/ui/logo.png',
 anchors:'assets/ui/title-motion/cigar-anchors.json',
};
export const TITLE_VARIANTS=[
 {id:'cigar',name:'A — World Tour: After Hours',tag:'Cigar drag, glowing ember, drifting smoke',description:'CHAD takes a slow draw, lowers the cigar and exhales over the brass globe. Tokyo neon, a harbor skyline, Mediterranean villas and Alpine peaks, with a separate brass globe and drifting atmosphere.',background:'world'},
 {id:'shades',name:'B — World Tour: Midnight Swagger',tag:'Sunglasses adjustment, glint, cool city glow',description:'CHAD unfolds one arm, adjusts his shades and settles back into his pose. Cobalt midnight with warm brass and neon.',background:'midnight'},
];
const CIGAR=[0,120,130,140,150,190,215,225,235,280,350,375,600];
const SHADES=[0,145,155,165,175,190,220,250,260,270,280,292,600];
const mod=(x,n)=>(x%n+n)%n;
export function titleMotionAt(kind,time){
 const t=mod(time,600),bounds=kind==='cigar'?CIGAR:SHADES;
 const frame=bounds.findIndex((b,i)=>i<12&&t>=b&&t<bounds[i+1]);
 return {t,frame,action:kind==='cigar'?(t<120||t>=375?'Resting':t<150?'Raising cigar':t<215?'Taking a draw':t<235?'Lowering cigar':t<350?'Exhaling':'Settling'):(t<145||t>=292?'Arms folded':t<175?'Raising hand':t<250?'Adjusting shades':'Lowering hand'),exhale:kind==='cigar'&&t>=235&&t<350,glint:kind==='shades'&&t>=207&&t<225};
}
export async function loadTitleMotion(){
 const art={};await Promise.all(Object.entries(TITLE_MOTION_FILES).map(async([name,path])=>{try{if(name==='anchors'){const r=await fetch(path);if(!r.ok)throw Error('Missing anchors');art[name]=await r.json();return;}const im=new Image();im.src=path;await im.decode();art[name]=im;}catch(_){art[name]=null;}}));return art;
}
function puff(ctx,x,y,r,alpha,tint='185,204,212'){
 const g=ctx.createRadialGradient(x-r*.2,y-r*.2,0,x,y,r);g.addColorStop(0,`rgba(${tint},${alpha})`);g.addColorStop(.4,`rgba(${tint},${alpha*.65})`);g.addColorStop(1,`rgba(${tint},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function steam(ctx,time,night){
 // Small steam plumes travel independently of the painted locomotive and skyline.
 for(let i=0;i<9;i++){
  const a=mod(time+i*19,150),p=a/150,x=58+p*14+Math.sin(p*7+i)*3,y=143-p*29;
  puff(ctx,x,y,2+p*7,.08*Math.sin(Math.PI*p),night?'153,188,213':'231,190,134');
 }
 const lights=[[338,163],[365,187],[404,178],[426,212],[442,199],[304,154]];
 ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<lights.length;i++){const[x,y]=lights[i];puff(ctx,x,y,2,.12+.1*Math.sin(time*Math.PI*2/200+i),'255,185,77');}ctx.restore();
}
// Frame-local mouth and cigar-tip coordinates are registered with the portrait strip.
const MOUTH=[246,120];
const TIPS=[[270,162],[272,147],[273,130],[270,122],[270,122],[270,122],[275,128],[274,145],[270,162],[270,162],[270,162],[270,162]];
function cigarSmoke(ctx,pose,time,anchors){
 const point=(key,fallback,frame=pose.frame)=>anchors?.[frame]?.[key]?.map((v,i)=>v*.5+(i?82:140))||fallback;
 const[ex,ey]=point('tip',TIPS[pose.frame]),mouth=point('mouth',MOUTH),draw=pose.t>=150&&pose.t<215;
 ctx.save();ctx.globalCompositeOperation='screen';puff(ctx,ex,ey,draw?3:1.7,draw?.45:.18,'255,117,39');ctx.fillStyle=draw?'#ffdf88':'#b77d44';ctx.fillRect(ex,ey,1,1);ctx.restore();
 // Embers release a thin rising wisp; the exhale is broader and carries forward.
 for(let i=0;i<12;i++){
  const age=mod(time+i*10,120),p=age/120;
  const bornFrame=titleMotionAt('cigar',time-age).frame,[sx,sy]=point('tip',TIPS[bornFrame],bornFrame);
  puff(ctx,sx+Math.sin(p*7+time*Math.PI*2/600)*2+p*5,sy-p*24,1+p*4,.1*Math.sin(Math.PI*p));
 }
 for(let i=0;i<18;i++){
  const born=235+i*5,age=pose.t-born;if(age<0||age>135)continue;
  const p=age/135;
  const origin=point('mouth',mouth,titleMotionAt('cigar',born).frame);
  const x=origin[0]+3+p*62,y=origin[1]-p*22+Math.sin(p*8+i*.55)*3;
  puff(ctx,x,y,1+p*12,.3*Math.sin(Math.PI*p));
 }
}
export function drawTitleMotion(ctx,art,kind,time,{ui=true,effects=true,background}={}){
 const pose=titleMotionAt(kind,time),variant=TITLE_VARIANTS.find(v=>v.id===kind)||TITLE_VARIANTS[0];
 const bg=background||variant.background,plate=art[bg];
 ctx.save();ctx.fillStyle='#080710';ctx.fillRect(0,0,480,270);ctx.imageSmoothingEnabled=false;
 const drift=Math.sin(time*Math.PI*2/600);
 if(plate)ctx.drawImage(plate,bg==='world'?-8+drift*5:-2+drift*.7,bg==='world'?-3:-1,bg==='world'?496:484,bg==='world'?279:272);
 if(bg==='world'){
  // Harbor haze passes behind the solid brass globe, never through CHAD.
  if(effects)for(let i=0;i<7;i++){const p=mod(time+i*80,600)/600;puff(ctx,70+p*340,201+Math.sin(i)*8,15,.045*Math.sin(p*Math.PI),'161,166,209');}
  if(art.globe)ctx.drawImage(art.globe,-drift,0,480,270);
 }else if(effects)steam(ctx,time,bg==='midnight');
 const sprite=art[kind];
 if(sprite)ctx.drawImage(sprite,pose.frame*400,0,400,368,140,82,200,184);
 if(effects&&sprite){
  if(kind==='cigar')cigarSmoke(ctx,pose,time,art.anchors);
  else if(pose.glint){const a=Math.sin((pose.t-207)/18*Math.PI);ctx.save();ctx.globalAlpha=a*.9;ctx.strokeStyle='#f9f4da';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(255-5*a,110);ctx.lineTo(255+5*a,110);ctx.moveTo(255,110-3*a);ctx.lineTo(255,110+3*a);ctx.stroke();ctx.restore();}
 }
 if(ui){
  const grad=ctx.createLinearGradient(0,229,0,270);grad.addColorStop(0,'rgba(8,5,11,0)');grad.addColorStop(1,'rgba(8,5,11,.96)');ctx.fillStyle=grad;ctx.fillRect(0,229,480,41);
  if(art.logo)ctx.drawImage(art.logo,136,4,208,art.logo.height/art.logo.width*208);
  const text=(s,y,col,scale=1)=>drawTextShadow(ctx,s,(480-textWidth(s,scale))/2,y,col,scale);
  if(mod(time,100)<75)text('PRESS Z',242,'#fff2d7',2);
  text('ENTER THE LAIR',260,'#eac275');
 }
 ctx.restore();return pose;
}
