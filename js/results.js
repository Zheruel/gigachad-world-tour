import { G, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { drawDisplayTitle } from './display_type.js';
import { audio } from './audio.js';

export function resultRank(stats,health){
 const combo=stats?.combo||0;
 return health>=80&&combo>=12?'S':health>=60&&combo>=8?'A':health>=35?'B':'C';
}
export function updateResults(t){
 const r=G.results||(G.results={rank:resultRank(G.clearStats,G.player.hp),cues:new Set()});
 const once=(key,fn)=>{if(!r.cues.has(key)){r.cues.add(key);fn();}};
 if(t>=63&&t<163&&t%6===0)once('tick'+t,()=>audio.roomSfx('blip',.075,.035));
 for(let i=0;i<5;i++)if(t>=81+i*18)once('row'+i,()=>audio.roomSfx('room_page',.18));
 if(t>=165)once('rank',()=>{audio.roomSfx('slam',.3);audio.voice(r.rank==='S'?'duke_hail':r.rank==='A'?'duke_combo_2':r.rank==='B'?'duke_look_good':'duke_gotta_hurt',2400,false);});
}
// Results typography is sized in logical pixels; numbers use a tabular face.
function resultText(ctx,text,x,y,{align='left',color='#e6cfab',size=8,numeric=false}={}){
 ctx.save();ctx.font=`${size}px Impact, 'Arial Narrow', sans-serif`;ctx.textAlign=align;ctx.textBaseline='top';ctx.letterSpacing=numeric?'0.5px':'0.35px';
 ctx.fillStyle='#090606';ctx.fillText(text,x,y+1);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
// Bounds measured from the blank card at 960x540, then mapped to game pixels.
export const RESULTS_LAYOUT=Object.freeze({title:{x:64,y:15,w:352,h:22},rank:{x:60,y:189,w:32,h:32}});
export function resultPortraitFrame(t){
 const phase=Math.max(0,t-45)%360;
 const beats=[[108,0],[132,1],[144,2],[156,3],[168,4],[264,5],[276,4],[288,3],[300,6],[312,7],[360,0]];
 return beats.find(([end])=>phase<end)[1];
}
function portraitLife(ctx,t){
 const im=ASSETS.results_portrait;if(!im)return;
 const frame=resultPortraitFrame(t),phase=Math.max(0,t-45)%360;
 ctx.save();ctx.beginPath();ctx.rect(17,48,177,174);ctx.clip();
 // Fixed head/torso registration and one scale for all eight generated poses.
 ctx.drawImage(im,frame%4*384,Math.floor(frame/4)*512,384,512,22,20,161.28,215.04);
 const tips=[[270,205],[270,205],[279,193],[300,234],[250,300],[250,300],[279,193],[270,205]],tip=tips[frame];
 const tx=22+tip[0]*.42,ty=20+tip[1]*.42;
 ctx.globalCompositeOperation='screen';
 const glow=ctx.createRadialGradient(tx,ty,0,tx,ty,3);
 glow.addColorStop(0,`rgba(255,116,29,${frame===1?.75:.25})`);glow.addColorStop(1,'rgba(255,91,15,0)');ctx.fillStyle=glow;ctx.fillRect(tx-3,ty-3,6,6);
 ctx.globalCompositeOperation='source-over';
 // Smoke starts at the registered mouth during the exhale hold.
 if(phase>=166&&phase<264)for(let i=0;i<9;i++){
  const age=phase-166-i*7;if(age<0||age>48)continue;
  const sx=126+age*.44,sy=101-age*.30+Math.sin(age*.16+i)*1.5,r=1.4+age*.065;
  ctx.globalAlpha=.22*(1-age/48);ctx.fillStyle='#dbd0bc';ctx.beginPath();ctx.ellipse(sx,sy,r*1.6,r,0,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
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
 if(t>=165){const rank=G.results?.rank||resultRank(st,G.player.hp);
  const stamp=1+Math.max(0,1-(t-165)/12)*.3;
  const box=RESULTS_LAYOUT.rank;
  ctx.save();ctx.translate(box.x+box.w/2,box.y+box.h/2);ctx.scale(stamp,stamp);centeredArtwork(ctx,'RANK '+rank,{x:-box.w/2,y:-box.h/2,w:box.w,h:box.h},30,box.w);ctx.restore();
  const labels={S:'ABSOLUTE MENACE',A:'FIRST CLASS BEATDOWN',B:'JOB DONE',C:'STILL STANDING'};
  resultText(ctx,labels[rank],194,203,{size:8,color:'#eac17c'});
 }
 if(t>=195)resultText(ctx,G.stage?.id==='train'||G.stage?.chapter?'F / LB: CONTINUE':'Z: CONTINUE',302,235,{align:'center',size:8,color:'#ffdf94'});
 ctx.restore();
}
