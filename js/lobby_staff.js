// Authored pose sequences with smooth travel between work stations. Pure sampling also
// lets the frame explorer inspect any instant without replay-dependent NPC state.
export const RECEPTION_DESK = {x:188,y:148,w:208,h:54};
export const CONCIERGE_X = RECEPTION_DESK.x + RECEPTION_DESK.w / 2;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const between = (t, start, end, a, b) => a + (b - a) * smooth((t - start) / (end - start));
function movePose(t, trips) {
  const [start,end,a,b]=trips.find(([start,end])=>t>=start&&t<end);
  const x=between(t,start+16,end-16,a,b);
  const frame=t<start+8?0:t<start+16?1:t>=end-8?11:t>=end-16?10:2+Math.floor(Math.abs(x-a)/3)%8;
  return {x,frame,face:b>a?1:-1};
}
export function porterAt(tr) {
  const age=tr.greeted?tr.t-tr.greetT-180:-1;
  const progress=Math.max(0,Math.min(1,age/480)), x=415+329*progress;
  const walking=age>0&&age<480;
  if(walking)return {x,art:'porter_service',frame:Math.floor((x-415)/5)%6,task:'deliver'};
  const t=tr.t%720;
  let frame=0,task='rest';
  if(t>=100&&t<215){frame=t<145?1:t<170?3:2;task='look';}
  else if(t>=240&&t<320){frame=t<252?6:t<264?4:t<296?5:t<308?4:6;task='cap';}
  else if(t>=380&&t<500){frame=t<402?8:t<414?10:t<454?9:t<470?10:8;task='luggage';}
  else if(t>=500&&t<550){frame=11;task='nod';}
  return {x,art:'porter_idle',frame,task};
}
export function lobbyStaffAt(time, greetingAge = -1, barAge = -1) {
  const t = time % 1500;
  let x = 582, frame = 0, art = 'bartender', task = 'polish', moving = false;
  if (t < 240) frame = [0,1,2,1,2,0][Math.floor(t / 40)];
  else if (t < 360) { x = between(t,240,360,582,628); moving = true; }
  else if (t < 540) { x = 628; frame = t < 405 ? 3 : t < 495 ? 4 : 3; task = 'pour'; }
  else if (t < 660) { x = between(t,540,660,628,575); moving = true; }
  else if (t < 1000) {
    x = 575; art = 'bartender_shake'; task = 'shake';
    frame = t < 690 ? 0 : t < 720 ? 1 : t < 960 ? [1,2,3,2][Math.floor((t-720)/7)%4] : 4;
  } else if (t < 1140) { x = 575; frame = t < 1100 ? 5 : 3; task = 'serve'; }
  else if (t < 1260) { x = between(t,1140,1260,575,532); moving = true; }
  else if (t < 1380) { x = 532; frame = [0,1,2,1][Math.floor((t-1260)/30)]; }
  else { x = between(t,1380,1500,532,582); moving = true; }
  let face=1;
  if (moving) { ({x,frame,face}=movePose(t,[[240,360,582,628],[540,660,628,575],[1140,1260,575,532],[1380,1500,532,582]])); art='bartender_walk'; task='move'; }
  // Acknowledge CHAD without snapping to another position or interrupting the shaker.
  if (barAge >= 0 && barAge < 120 && !moving && task !== 'shake') { art = 'bartender'; frame = 5; task = 'serve'; }
  const bartender = {x,frame,art,task,face,shakeBeat:art==='bartender_shake'&&t>=720&&t<960&&(t-720)%7===0};

  const c = time % 960;
  let cf=0,ct='rest';
  if(c<240){cf=[1,2,1,2][Math.floor(c/12)%4];ct='write';}
  else if(c<360){cf=[3,4,4,0][Math.floor((c-240)/30)];ct='page';}
  else if(c<510){cf=[0,5,5,6,7][Math.floor((c-360)/30)];ct='stamp';}
  else if(c<660){cf=0;ct='rest';}
  else if(c<840){cf=[1,2][Math.floor(c/16)%2];ct='write';}
  if(greetingAge>=0&&greetingAge<240){cf=greetingAge<18?8:greetingAge<42?9:greetingAge<92?10:greetingAge<115?11:8;ct='speak';}
  return {bartender,concierge:{x:CONCIERGE_X,frame:cf,task:ct,face:1,art:'concierge_seated'}};
}
