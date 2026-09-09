import { G, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { drawTextShadow, textWidth } from './sprites.js';
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
export function drawResults(ctx,t){
 if(t<45)return;
 const age=t-45,st=G.clearStats||{hits:0,kos:0,combo:0,bonus:0};
 ctx.save();ctx.globalAlpha=clamp(age/12,0,1);
 const x=14,y=8,w=452,h=254;
 if(ASSETS.results_card)ctx.drawImage(ASSETS.results_card,x,y,w,h);
 else{ctx.fillStyle='#160f14';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#b88c45';ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
 drawDisplayTitle(ctx,'CHAD WINS',240,20,{height:24,maxWidth:340});
 const title=G.stage?.name||'STAGE CLEAR';drawTextShadow(ctx,title,Math.round(312-textWidth(title,1)/2),65,'#dcc597',1);
 const rows=[['HITS LANDED',st.hits],['KNOCKOUTS',st.kos],['BEST COMBO',st.combo],['CLEAR BONUS',st.bonus+st.combo*25],['TOTAL SCORE',G.score]];
 rows.forEach(([label,value],i)=>{
  const progress=clamp((t-63-i*18)/18,0,1);if(t<63+i*18)return;
  const yy=88+i*22,total=i===4;
  ctx.fillStyle=total?'#a87b39':'#45352c';ctx.fillRect(190,yy+13,246,1);
  drawTextShadow(ctx,label,194,yy,total?'#ffe5a0':'#c1ac8a',1);
  const shown=String(Math.floor((value||0)*(1-(1-progress)**3))).padStart(total?7:0,'0');
  drawTextShadow(ctx,shown,432-textWidth(shown,1),yy,'#fff0c8',1);
 });
 if(t>=165){const rank=G.results?.rank||resultRank(st,G.player.hp);
  drawTextShadow(ctx,'RANK',65,181,'#e6c285',1);
  drawTextShadow(ctx,rank,75,194,'#ffdc83',4);
  const labels={S:'ABSOLUTE MENACE',A:'FIRST CLASS BEATDOWN',B:'JOB DONE',C:'STILL STANDING'};
  drawTextShadow(ctx,labels[rank],194,204,'#eac17c',1);
 }
 if(t>=195)drawTextShadow(ctx,'F / LB: CONTINUE',Math.round(302-textWidth('F / LB: CONTINUE',1)/2),237,'#ffdf94',1);
 ctx.restore();
}
