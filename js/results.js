import {evaluateGrade} from './grading.js';
import { G, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { drawDisplayTitle } from './display_type.js';
import { audio } from './audio.js';
import { drawCigarReplay } from './cigar_smoke.js';
import { trophyForStage } from './trophies.js';

export {evaluateGrade} from './grading.js';
export function resultRank(stats){return evaluateGrade(stats).rank;}
export function updateResults(t){
 const r=G.results||(G.results={...evaluateGrade(G.clearStats),cues:new Set()});
 const once=(key,fn)=>{if(!r.cues.has(key)){r.cues.add(key);fn();}};
 if(t>=63&&t<163&&t%6===0)once('tick'+t,()=>audio.roomSfx('dialogue_typing',.075,.035));
 for(let i=0;i<5;i++)if(t>=81+i*18)once('row'+i,()=>audio.roomSfx('room_page',.18));
 if(t>=ENTER)once('enter',()=>audio.roomSfx('whiff',.3));
 if(t>=123)once('glare',()=>audio.roomSfx('parry',.12));
 if(t>=PEAK)once('flex',()=>{audio.roomSfx('heavy',.3);audio.roomSfx('super_electric',.16,.5);});
 if(t>=200)once('zippo',()=>audio.roomSfx('remote_click',.3));
 if(t>=RESULTS_RANK)once('rank',()=>{audio.roomSfx('slam',.3);audio.voice(r.rank==='S'?'duke_hail':r.rank==='A'?'duke_combo_2':r.rank==='B'?'duke_look_good':'duke_gotta_hurt',2400,false);});
}
// Results typography is sized in logical pixels; numbers use a tabular face.
function resultText(ctx,text,x,y,{align='left',color='#e6cfab',size=8,numeric=false}={}){
 ctx.save();ctx.font=`${size}px Impact, 'Arial Narrow', sans-serif`;ctx.textAlign=align;ctx.textBaseline='top';ctx.letterSpacing=numeric?'0.5px':'0.35px';
 ctx.fillStyle='#090606';ctx.fillText(text,x,y+1);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
// Bounds measured from the blank card at 960x540, then mapped to game pixels.
export const RESULTS_LAYOUT=Object.freeze({title:{x:64,y:15,w:352,h:22},rank:{x:58,y:186,w:32,h:32}});
// Victory close-ups (results_portrait.png, 4 columns; cells are the portrait window at 2x, see
// build_results_portrait.py). Keys: 0 arms crossed, 1 finger on shades, 2 shades down, 3 flex,
// 4 Zippo, 5 cigar grin. In-betweens (drawn only when the second sheet is present): 6 uncross,
// 7 arm rising, 8 laughing flex, 9 Zippo up, 10 drag, 11 exhale.
const PERFORMANCE=[[104,0],[108,6,1],[120,1],[150,2],[168,3],[186,8],[194,3],[200,9,4],[228,4]];
export const RESULTS_RANK=241,RESULTS_CONTINUE=271;
const LOOP=240,PEAK=150,UNFLEX=194,ENTER=53,LIT=228;
// The in-between sheet adds a third row of cells.
const hasInbetweens=()=>(ASSETS.results_portrait?.height||0)>=348*3;
export function resultPortraitFrame(t){
 const full=hasInbetweens();
 for(const [end,f,fallback]of PERFORMANCE)if(t<end)return f>5&&!full?fallback:f;
 const phase=Math.max(0,t-RESULTS_RANK)%LOOP;
 if(full&&t>=RESULTS_RANK&&phase>=60&&phase<90)return 10;
 if(full&&t>=RESULTS_RANK&&phase>=90&&phase<132)return 11;
 return 5;
}
// Key poses start with a short punch-in on the face; in-betweens do not.
const KEY_START=[[ENTER,0],[108,1],[120,2],[PEAK,3],[194,9],[LIT,5]];
// Feature positions in logical px on the registered cells.
const FACE={0:[104,103],1:[104,103],2:[104,103],3:[122,100],4:[104,103],5:[102,96],6:[104,103],7:[106,101],8:[134.5,99],9:[104,103],10:[102,96],11:[102,96]};
const TIP4=[121.5,128.5],LENS={1:[110,106],3:[131,106],8:[141.5,104]},EYE=[95.5,105],FLAME=[127.5,123];
const EMBER={5:[134.5,104.5],10:[124,120],11:[129.5,111.5]},LIPS=[110,110],FIST=[67,72],FISTS={3:FIST,8:[77.5,72]};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const WX=17,WY=48,WW=177,WH=174;
// Effects share a 1-logical-px grid (the close-ups are detailed art, not 3x sprites).
function dot(ctx,x,y,n=1){ctx.fillRect(Math.round(x),Math.round(y),n,n);}
function glow(ctx,x,y,r,rgb,a){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
// Four-point star glint that grows and shrinks.
function glint(ctx,x,y,s){
 ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,x,y,s*1.6+2,'255,250,220',.7);ctx.restore();
 ctx.fillStyle='#fffbe8';dot(ctx,x,y);for(let k=1;k<=s;k++){ctx.globalAlpha=1-k/(s+1)*.7;dot(ctx,x+k,y);dot(ctx,x-k,y);dot(ctx,x,y+k);dot(ctx,x,y-k);}ctx.globalAlpha=1;
}
// Lightning off the fist: zig-zag segments aimed away from the arm, a white core with a gold
// edge, one short branch.
function boltPath(x,y,seed,dir){
 const pts=[],branch=[];let cx=x,cy=y,a=dir,zig=hash(seed)>.5?1:-1;
 const seg=(x0,y0,x1,y1,out)=>{const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)));for(let s=0;s<=n;s++)out.push([x0+(x1-x0)*s/n,Math.max(42,y0+(y1-y0)*s/n)]);};
 const len=7+Math.floor(hash(seed+3)*4);
 for(let k=0;k<len;k++){
  a=dir+zig*(.45+hash(seed+k*7.3)*.25);zig=-zig;const l=3+hash(seed+k*3.1)*3;
  const nx=cx+Math.cos(a)*l,ny=cy+Math.sin(a)*l;seg(cx,cy,nx,ny,pts);
  if(k===2){const b=dir-zig*.9;seg(nx,ny,nx+Math.cos(b)*5,ny+Math.sin(b)*5,branch);}
  cx=nx;cy=ny;
 }
 return pts.concat(branch);
}
function bolt(ctx,pts,after=false){
 ctx.fillStyle=after?'rgba(255,181,46,.4)':'#ffa726';for(const [px,py]of pts)dot(ctx,px,py+1);
 if(after)return;ctx.fillStyle='#fffbe0';for(const [px,py]of pts)dot(ctx,px,py);
}
// Smoke: a soft clump of overlapping lobes, lit upper left, shadowed lower right; it thins by
// alpha as it spreads (no dither).
function puff(ctx,x,y,r,life,seed,fade=0,wide=1.3){
 if(life<=0||r<1)return;const a=life*(1-fade);if(a<=0)return;
 ctx.save();
 for(let k=0;k<5;k++){
  const ang=hash(seed+k*3.3)*Math.PI*2,d=r*.45*hash(seed+k*7.1),lx=x+Math.cos(ang)*d*wide,ly=y+Math.sin(ang)*d*.8,lr=r*(.55+.35*hash(seed+k*1.9));
  for(const [ox,oy,rgb,al]of [[.25,.3,'120,112,104',.45],[0,0,'196,188,178',.55],[-.3,-.35,'240,234,224',.4]]){
   const cx=lx+ox*lr,cy=ly+oy*lr,g=ctx.createRadialGradient(cx,cy,0,cx,cy,lr*(ox||oy?.8:1));
   g.addColorStop(0,`rgba(${rgb},${(al*a).toFixed(3)})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(cx-lr,cy-lr,lr*2,lr*2);
  }
 }
 ctx.restore();
}
// Thin thread off the ember: faint at the tip, gentle sway, breaking up higher up.
function wisp(ctx,x,y,t,grow){
 const top=Math.min(30,Math.floor(grow*1.4));
 for(let k=1;k<top;k++){
  const sway=Math.sin(k*.16-t*.05)*k*.22;if(k>12&&hash(Math.floor((k+t*.3)/6))<.45)continue;
  ctx.fillStyle=`rgba(214,206,194,${(.5*(1-k/30)).toFixed(3)})`;dot(ctx,x+sway,y-k);
 }
}
let tintCanvas=null,flashCanvas=null;
function flashLayer(){const c=flashCanvas||(flashCanvas=document.createElement('canvas'));c.width=960;c.height=540;const x=c.getContext('2d');x.setTransform(2,0,0,2,0,0);return x;}
// The current cell as a flat silhouette (white flash, dark drop shadow).
function silhouette(im,frame,color){
 const c=tintCanvas||(tintCanvas=document.createElement('canvas'));c.width=354;c.height=348;const x=c.getContext('2d');
 x.drawImage(im,frame%4*354,Math.floor(frame/4)*348,354,348,0,0,354,348);x.globalCompositeOperation='source-atop';x.fillStyle=color;x.fillRect(0,0,354,348);return c;
}
// Camera on the close-up: slide in, punch in on each key pose, breathe, recoil on the flex.
function camera(t,frame){
 let x=0,zoom=1,alpha=1;
 const e=t-ENTER;if(e<14){const q=1-Math.max(0,e)/14;x=-70*q*q*q;alpha=Math.min(1,(e+2)/6);}
 for(const [at,f]of KEY_START){const k=t-at;if(at>ENTER&&k>=0&&k<8)zoom=1+(f===3?.12:.06)*(1-k/8)**2;}
 const a=t-PEAK;const shake=a>=0&&a<6?[3,-2,2,-1,1,0][a]:0;
 const breathe=1+.006*Math.sin(t*.07);
 return {x:x+shake,zoom,alpha,breathe,face:FACE[frame]||[104,103]};
}
function drawCell(ctx,im,frame,cam,source=im,dx=0,dy=0){
 ctx.save();ctx.translate(cam.face[0]+cam.x+dx,cam.face[1]+dy);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.face[0],-cam.face[1]);
 // Breathing lifts the chest from the belt line.
 ctx.translate(0,WY+WH);ctx.scale(1,cam.breathe);ctx.translate(0,-(WY+WH));
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(source===im)ctx.drawImage(im,frame%4*354,Math.floor(frame/4)*348,354,348,WX,WY,WW,WH);else ctx.drawImage(source,0,0,354,348,WX,WY,WW,WH);
 ctx.restore();
}
function portraitLife(ctx,t){
 const im=ASSETS.results_portrait;if(!im||t<ENTER)return;
 const frame=resultPortraitFrame(t),phase=Math.max(0,t-RESULTS_RANK)%LOOP,a=t-PEAK,cam=camera(t,frame);
 ctx.save();ctx.beginPath();ctx.rect(WX,WY,WW,WH);ctx.clip();ctx.globalAlpha=cam.alpha;
 // Rotating gold/white burst behind him through the flex.
 if(a>=0&&t<UNFLEX){
  const k=Math.min(1,(a+1)/3)*Math.min(1,(UNFLEX-t)/10);ctx.save();ctx.beginPath();ctx.rect(32,50,129,172);ctx.clip();ctx.globalCompositeOperation='screen';
  ctx.translate(FIST[0]+20,FIST[1]+10);ctx.rotate(a*Math.PI/360);
  for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);const g=ctx.createLinearGradient(0,0,200,0);g.addColorStop(0,`rgba(255,${i%2?196:236},${i%2?80:190},${(i%2?.5:.42)*k})`);g.addColorStop(1,'rgba(255,190,80,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(200,-7);ctx.lineTo(200,7);ctx.fill();}
  ctx.restore();
 }
 // Entrance ghosts trail the slide.
 const e=t-ENTER;if(e<10)for(const k of [2,1]){ctx.save();ctx.globalAlpha=.22*k*(1-e/10);drawCell(ctx,im,frame,cam,im,-k*12*(1-e/10),0);ctx.restore();}
 // Break-out: arms that cross the pillars cast a dark shadow onto them.
 ctx.save();ctx.beginPath();ctx.rect(WX,WY,WW,WH);ctx.rect(32,50,129,172);ctx.clip('evenodd');ctx.globalAlpha=.5;drawCell(ctx,im,frame,cam,silhouette(im,frame,'#0c0604'),3,1.5);ctx.restore();
 drawCell(ctx,im,frame,cam);
 // Hit flash on the flex (two white frames, one fading), a softer blink on each cut.
 const cut=KEY_START.find(([at])=>t-at>=0&&t-at<2&&at>ENTER&&at!==108);
 const flash=a>=0&&a<2?.95:a===2?.4:0;
 if(flash){ctx.save();ctx.globalAlpha=flash;drawCell(ctx,im,frame,cam,silhouette(im,frame,'#fff'));ctx.restore();}
 else if(cut){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.11*(2-(t-cut[0]))/2;drawCell(ctx,im,frame,cam,silhouette(im,frame,'#ffb45a'));ctx.restore();}
 // Zippo: flicker light on his face and hands over the painted flame.
 if(frame===4){const f=hash(Math.floor(t/3));ctx.save();ctx.globalCompositeOperation='screen';
  glow(ctx,FLAME[0],FLAME[1]+2,26+f*4,'255,120,40',.45);glow(ctx,FLAME[0]-10,FLAME[1]-10,14,'255,170,90',.25+f*.1);ctx.restore();
  if(t>=LIT-12){const k=(t-LIT+12)/12;ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,TIP4[0],TIP4[1],3+3*k,'255,110,30',.5*k);ctx.restore();}}
 // Ember: lit from the light, pulses, flares on each drag.
 const em=EMBER[frame],drag=frame===10;
 if(em&&t>=LIT){const k=drag?.6+.4*Math.sin((phase-60)/30*Math.PI):.35+.15*Math.sin(t*.06),lit=Math.min(1,(t-LIT)/4);
  ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,em[0],em[1],(drag?10:6)+(t<LIT+8?8*(1-(t-LIT)/8):0),'255,90,20',.6*k*lit+(t<LIT+8?.4:0));ctx.restore();
  ctx.fillStyle=`rgba(255,${drag?220:140},${drag?130:50},${Math.min(1,.5+k)*lit})`;dot(ctx,em[0],em[1],2);}
 // Glints: on the lens as he touches the shades and at the flex, on his eye over the shades.
 for(const [start,f,pos,len]of [[112,1,LENS[1],12],[123,2,EYE,12],[PEAK+5,3,LENS[3],12]]){const g=t-start;if(frame===f&&g>=0&&g<len)glint(ctx,...pos,g<len/2?Math.floor(g/1.5):Math.floor((len-g)/1.5));}
 // Smoke: a thread off the ember, and an exhale after each drag.
 if(em&&t>=LIT){
  wisp(ctx,em[0]+1,em[1]-2,t,t-LIT);
  for(let i=0;i<8;i++){const g=phase-92-i*4,life=64;if(t<RESULTS_RANK||g<0||g>=life)continue;
   const out=18*(1-Math.exp(-g/12))+g*.14,rise=g*.32+g*g*.004;
   ctx.save();ctx.globalAlpha=.8-.3*g/life;
   puff(ctx,LIPS[0]+4+out,LIPS[1]-1-rise+Math.sin(g*.08+i*1.9)*1.5,3+g*.09,1-g/life,i*31,clamp((g-life+28)/28,0,1),1.3+.4*g/life);ctx.restore();}
  // The exhale opens with two smoke rings off his lips, the same rings CHAD blows in play
  // (cigar_smoke.js), at close-up size.
  if(t>=RESULTS_RANK)drawCigarReplay(ctx,0,t,b=>b>=RESULTS_RANK&&{tip:[LIPS[0]-2,LIPS[1]],face:1},{exhales:[t-phase+90,t-phase+90-LOOP],ember:false,wisps:false,scale:2.2});
 }
 ctx.restore();
 // Electric crackle off the fist at the peak, with a one-tick afterglow. Drawn outside the
 // window clip so it breaks out over the frame.
 if((frame===3||frame===8)&&a>=0&&a<40&&Math.floor(t/2)%3!==2){
  const seed=Math.floor(t/3),[fx,fy]=FISTS[frame],x=cam.face[0]+cam.x+(fx-cam.face[0])*cam.zoom,y=cam.face[1]+(fy-cam.face[1])*cam.zoom;
  for(let b=0;b<3;b++){const dir=[-2.4,-1.7,-2.9][b];if(t%3===0&&a>0)bolt(ctx,boltPath(x,y,(seed-1)*13+b,dir),true);bolt(ctx,boltPath(x,y,seed*13+b,dir));}
 }
}
// The rank medallion lands hard: gold sparks and a white flash.
function rankSparks(ctx,t){
 const a=t-RESULTS_RANK;if(a<0||a>40)return;const {x,y,w,h}=RESULTS_LAYOUT.rank,cx=x+w/2,cy=y+h/2;
 ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,cx,cy,40,'255,220,130',.8*Math.max(0,1-a/8));ctx.restore();
 for(let i=0;i<40;i++){const ang=hash(i)*Math.PI*2,v=2.2+hash(i+40)*3,d=v*a-.05*a*a,life=1-a/(20+hash(i+9)*20);if(life<=0)continue;
  ctx.fillStyle=i%3?`rgba(255,206,96,${life})`:`rgba(255,250,224,${life})`;ctx.fillRect(Math.round(cx+Math.cos(ang)*d),Math.round(cy+Math.sin(ang)*d+.06*a*a),2,2);}
}
// Stamp scale: from 2.5x down past 1 and settled by 9 ticks.
// Whole-number steps keep the lettering's pixels square.
function stampScale(a){return a<2?3:a<4?2:1;}
function centeredArtwork(ctx,text,box,height,maxWidth){
 drawDisplayTitle(ctx,text,box.x+box.w/2,box.y+box.h/2,{height,maxWidth,anchor:[.5,.5]});
}
export function drawResults(ctx,t){
 if(t<45)return;
 const age=t-45,st=G.clearStats||{hits:0,kos:0,combo:0,bonus:0};
 ctx.save();ctx.globalAlpha=clamp(age/12,0,1);
 const x=14,y=8,w=452,h=254;
 if(ASSETS.results_card)ctx.drawImage(ASSETS.results_card,x,y,w,h);
 else{ctx.fillStyle='#160f14';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#b88c45';ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
 portraitLife(ctx,t);
 if(ASSETS.results_badge)ctx.drawImage(ASSETS.results_badge,x,y,w,h);
 centeredArtwork(ctx,'CHAD WINS',RESULTS_LAYOUT.title,22,330);
 const title=G.stage?.name||'STAGE CLEAR';resultText(ctx,title,312,63,{align:'center',size:10,color:'#dcc597'});
 const rows=[['HITS LANDED',st.hits],['KNOCKOUTS',st.kos],['BEST COMBO',st.combo],['CLEAR BONUS',st.bonus+st.combo*25],['TOTAL SCORE',G.score]];
 rows.forEach(([label,value],i)=>{
  const progress=clamp((t-63-i*18)/18,0,1);if(t<63+i*18)return;
  const yy=88+i*22,total=i===4;
  ctx.fillStyle=total?'#a87b39':'#45352c';ctx.fillRect(190,yy+13,246,1);
  resultText(ctx,label,194,yy-1,{size:9,color:total?'#ffe5a0':'#c1ac8a'});
  const shown=String(Math.floor((value||0)*(1-(1-progress)**3))).padStart(total?7:0,'0');
  resultText(ctx,shown,432,yy-2,{align:'right',numeric:true,size:10,color:'#fff0c8'});
 });
 if(t>=RESULTS_RANK){const rank=G.results?.rank||resultRank(st,G.player.hp);
  const stamp=stampScale(t-RESULTS_RANK);
  const box=RESULTS_LAYOUT.rank;
  ctx.save();ctx.translate(box.x+box.w/2,box.y+box.h/2);ctx.scale(stamp,stamp);centeredArtwork(ctx,'RANK '+rank,{x:-box.w/2,y:-box.h/2,w:box.w,h:box.h},30,box.w);ctx.restore();
  // Landing flash: the letter's own silhouette and the medallion's gold ring burn white.
  const land=t-RESULTS_RANK-4;
  if(land>=0&&land<2){
   const c=flashLayer();c.translate(box.x+box.w/2,box.y+box.h/2);centeredArtwork(c,'RANK '+rank,{x:-box.w/2,y:-box.h/2,w:box.w,h:box.h},30,box.w);
   c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-atop';c.fillStyle='#fff';c.fillRect(0,0,960,540);
   ctx.save();ctx.globalAlpha=land?.4:.9;ctx.drawImage(c.canvas,0,0,480,270);
   ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#fff6dc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(74.5,202.5,31,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  const labels={S:'ABSOLUTE MENACE',A:'FIRST CLASS BEATDOWN',B:'JOB DONE',C:'STILL STANDING'};
  const grade=evaluateGrade(st);resultText(ctx,`${labels[rank]} · ${Math.floor(grade.rating)}/100`,194,195,{size:8,color:'#eac17c'});
  resultText(ctx,`CLEAR 60  STYLE +${Math.round(grade.components.combo+grade.components.parries+grade.components.variety)}  CLEAN +${Math.round(grade.components.clean)}  RETRY ${grade.components.retries}`,194,205,{size:6,color:'#c1ac8a'});
  const trophy=trophyForStage(G.stage),im=ASSETS[trophy?.shelf]||ASSETS[trophy?.detail];
  if(trophy){
   // The shelf thumbnail is already filtered at 48px: draw it at its exact 2x UI size.
   // Sampling the 192px gallery art directly at 18 logical pixels erased its gold highlights.
   // One group on the plate's centre line (y 236.5): medal, then label over name; the prompt sits right.
   if(im){const h=26,w=im.width*h/im.height,x=Math.round((146-w/2)*2)/2;ctx.drawImage(im,x,223.5,w,h);}
   resultText(ctx,'TROPHY EARNED',163,227.5,{size:6,color:'#b89a6c'});
   resultText(ctx,trophy.name,163,234,{size:10,color:'#ffe5a0'});
  }
 }
 if(t>=RESULTS_RANK)rankSparks(ctx,t);
 if(t>=RESULTS_CONTINUE){const prompt=G.stage?.id==='train'||G.stage?.chapter?'F / LB: CONTINUE':'Z: CONTINUE';if(trophyForStage(G.stage))resultText(ctx,prompt,430,232.5,{align:'right',size:9,color:'#ffdf94'});else resultText(ctx,prompt,302,235,{align:'center',size:8,color:'#ffdf94'});}
 ctx.restore();
}
