import { audio } from './audio.js';
import { ASSETS } from './assets.js';
import { W, clamp } from './engine.js';
import { drawTextShadow, textWidth } from './sprites.js';

export function dialogueLines(text,width) {
  const lines=[''];
  for (const word of text.toUpperCase().split(' ')) {
    const i=lines.length-1, trial=lines[i]?lines[i]+' '+word:word;
    if(lines[i]&&textWidth(trial,1)>width)lines.push(word);else lines[i]=trial;
  }
  return lines;
}
// Match the station departure board: one character every two simulation frames.
export function dialogueReveal(text,age) {
 const full=text.toUpperCase(),count=clamp(Math.floor(age/2),0,full.length);
 return {full,count,text:full.slice(0,count),complete:count===full.length,cursor:count<full.length&&!!((Math.floor(age)>>2)&1)};
}
export function updateDialogue(text,age,{remaining=240,visible=true}={}) {
 if(!visible||remaining<=0||age<=0||age%6!==0||dialogueReveal(text,age).complete)return;
 audio.roomSfx('blip',.10,.045);
}
function panel(ctx,img,x,y,w,h) {
  // Fixed ornamental corners; only the blank interior and straight edges stretch.
  const sw=img.width, sh=Math.round(img.height*.88), s=24, d=8;
  const srcX=[0,s,sw-s],srcY=[0,s,sh-s],srcW=[s,sw-2*s,s],srcH=[s,sh-2*s,s];
  const dstX=[x,x+d,x+w-d],dstY=[y,y+d,y+h-d],dstW=[d,w-2*d,d],dstH=[d,h-2*d,d];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)ctx.drawImage(img,srcX[col],srcY[row],srcW[col],srcH[row],dstX[col],dstY[row],dstW[col],dstH[row]);
}
export function drawDialogue(ctx,{text,speaker='',x,bottom,age=60,remaining=240,width=176}) {
  if(age<0||remaining<=0||x<-60||x>W+60)return;
  width=Math.min(width,Math.max(96,textWidth(text.toUpperCase(),1)+22,textWidth(speaker.toUpperCase(),1)+22));
  const lines=dialogueLines(text,width-22),h=20+lines.length*9+(speaker?10:0);
  const left=Math.round(clamp(x-width/2,5,W-width-5)),top=Math.round(Math.max(32,bottom-h-5));
  const alpha=Math.min(1,(age+1)/5,remaining/20),grow=.94+.06*Math.min(1,age/6);
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(left+width/2,top+h);ctx.scale(grow,grow);ctx.translate(-left-width/2,-top-h);
  const img=ASSETS.dialogue_frame;
  if(img)panel(ctx,img,left,top,width,h);
  else {ctx.fillStyle='#171017';ctx.fillRect(left,top,width,h);ctx.strokeStyle='#b98b46';ctx.strokeRect(left+.5,top+.5,width-1,h-1);}
  // The small pointer stays attached to the speaker even when the panel is screen-clamped.
  const tx=clamp(x,left+12,left+width-12);
  if(img)ctx.drawImage(img,img.width/2-24,Math.round(img.height*.88),48,img.height-Math.round(img.height*.88),tx-6,top+h-1,12,6);
  let y=top+9;
  if(speaker){drawTextShadow(ctx,speaker.toUpperCase(),left+11,y,'#d6ac69',1);y+=10;}
  const reveal=dialogueReveal(text,age);let start=0;
  for(const line of lines){
    const count=clamp(reveal.count-start,0,line.length),active=reveal.count>=start&&reveal.count<start+line.length;
    const visible=line.slice(0,count)+(active&&reveal.cursor?'_':'');
    drawTextShadow(ctx,visible,left+11,y,'#f9e8ca',1);start+=line.length+1;y+=9;
  }
  ctx.restore();
}
