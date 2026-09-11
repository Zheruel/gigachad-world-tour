// Shared anatomical comparison, rendered at gameplay scale without normalizing pose height.
let canvas;
export function compareActor(sprites,key,state,index,selected){
 if(!canvas){const title=document.createElement('h3');title.textContent='Gameplay / selected pose — same scale';canvas=document.createElement('canvas');canvas.width=640;canvas.height=160;canvas.style='width:960px;image-rendering:pixelated';document.body.append(title,canvas);}
 const ctx=canvas.getContext('2d'),{SPR,getFrame,frameW,frameH,blit}=sprites;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#252832';ctx.fillRect(0,0,640,160);
 for(const y of [38,65,88,130]){ctx.strokeStyle=y===130?'#f5cb70':'#68717d';ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(640,y+.5);ctx.stroke();}
 const draw=(k,s,i,x)=>{const f=getFrame(SPR[k],s,i,1);if(f)blit(ctx,f,x-frameW(f)/2,134-frameH(f));};
 draw(key,'idle',0,80);if(selected)selected(ctx,350,134);else draw(key,state,index,350);
 if(state==='inspector_pair'||state==='seth_pair')draw(state==='inspector_pair'?'nr_conductor':'nr_vikram_roof','idle',0,570);
 ctx.fillStyle='#eee';ctx.font='10px monospace';ctx.fillText('Gameplay reference',12,151);ctx.fillText(`${state} / ${index}`,245,151);
}
