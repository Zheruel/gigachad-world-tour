// Shared 12-out / 6-black / 12-in entry. Performance clocks never run hidden.
export const BOSS_ENTRY_TICKS=30;
export function beginBossEntry(c,start=0){
 const source=document.getElementById('game'),snapshot=document.createElement('canvas');
 if(source){snapshot.width=source.width;snapshot.height=source.height;snapshot.getContext('2d').drawImage(source,0,0);}
 c.entry={t:0,start,staged:false,snapshot};c.t=start;
}
export function updateBossEntry(c,stage){
 const e=c.entry;if(!e||e.t>=30)return false;
 e.t++;if(e.t>=12&&!e.staged){stage();e.staged=true;}
 if(e.t===30)e.snapshot=null;
 return true;
}
export function seekBossEntry(c,t,stage){
 if(!c.entry)return;c.entry.t=Math.min(30,t);c.t=c.entry.start+Math.max(0,t-30);
 if(t>=12){stage();c.entry.staged=true;}
}
export function drawBossEntry(ctx,c){
 const e=c?.entry;if(!e||e.t>=30)return;
 ctx.save();
 if(e.t<12&&e.snapshot?.width)ctx.drawImage(e.snapshot,0,0,480,270);
 ctx.globalAlpha=e.t<12?e.t/12:e.t<18?1:(30-e.t)/12;
 ctx.fillStyle='#000';ctx.fillRect(0,0,480,270);ctx.restore();
}
