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
function portraitLife(ctx,t,exhaling){
 const tip=exhaling?{x:111,y:161}:{x:127,y:117};
 ctx.save();ctx.translate(tip.x-127,tip.y-117);
 const cycle=t%240,puff=Math.max(0,Math.sin(Math.PI*cycle/240));
 ctx.save();
 // The authored cigar tip is fixed at (127,117); emissions begin there.
 ctx.globalCompositeOperation='screen';
 const glow=ctx.createRadialGradient(127,117,0,127,117,5);
 glow.addColorStop(0,`rgba(255,111,27,${.2+puff*.28})`);glow.addColorStop(1,'rgba(255,91,15,0)');ctx.fillStyle=glow;ctx.fillRect(122,112,10,10);
 ctx.globalCompositeOperation='source-over';
 for(let i=0;i<7;i++){const age=(t*.35+i*9)%66;ctx.globalAlpha=.1*(1-age/66);ctx.strokeStyle='#e7cfac';ctx.lineWidth=.65+age/90;ctx.beginPath();
 const x=127+Math.sin(age*.085+i*.7)*(2+age*.06),y=115-age*.65;
 ctx.moveTo(x,y);ctx.quadraticCurveTo(x+4,y-3,x+1,y-7);ctx.stroke();}
 ctx.restore();
 const glint=t%420;if(glint<24){ctx.globalAlpha=Math.sin(glint/24*Math.PI)*.6;ctx.strokeStyle='#fff1c4';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(105,96);ctx.lineTo(110,92);ctx.stroke();}
 ctx.restore();
}
export function drawResults(ctx,t){
 if(t<45)return;
 const age=t-45,st=G.clearStats||{hits:0,kos:0,combo:0,bonus:0};
 ctx.save();ctx.globalAlpha=clamp(age/12,0,1);
 const x=14,y=8,w=452,h=254;
 if(ASSETS.results_card)ctx.drawImage(ASSETS.results_card,x,y,w,h);
 else{ctx.fillStyle='#160f14';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#b88c45';ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
 const exhaling=(t-45)%420>=210;
 if(exhaling&&ASSETS.results_exhale){ctx.save();ctx.beginPath();ctx.rect(14,49,186,127);ctx.rect(116,175,84,46);ctx.clip();ctx.drawImage(ASSETS.results_exhale,x,y,w,h);ctx.restore();}
 portraitLife(ctx,t,exhaling);
 drawDisplayTitle(ctx,'CHAD WINS',240,29,{height:30,maxWidth:340,anchor:[.508,.415]});
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
  resultText(ctx,'RANK',76,179,{align:'center',size:7,color:'#e6c285'});
  const stamp=1+Math.max(0,1-(t-165)/12)*.3;
  ctx.save();ctx.translate(76,203);ctx.scale(stamp,stamp);drawDisplayTitle(ctx,'RANK '+rank,0,0,{height:28,maxWidth:30,anchor:({S:[.487,.431],A:[.496,.49],B:[.496,.426],C:[.443,.401]})[rank]});ctx.restore();
  const labels={S:'ABSOLUTE MENACE',A:'FIRST CLASS BEATDOWN',B:'JOB DONE',C:'STILL STANDING'};
  resultText(ctx,labels[rank],194,203,{size:8,color:'#eac17c'});
 }
 if(t>=195)resultText(ctx,G.stage?.id==='train'||G.stage?.chapter?'F / LB: CONTINUE':'Z: CONTINUE',302,235,{align:'center',size:8,color:'#ffdf94'});
 ctx.restore();
}
