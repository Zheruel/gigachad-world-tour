// The Closer's reveal: the king of the scam floor is still on a call at his desk, under his own portrait.
// He makes CHAD wait, closes one last victim, slams the phone, rises, walks round his desk towards CHAD,
// cracks his knuckles under his name and takes guard. Skipping lands on the same combat position.
import { G, clamp } from './engine.js';
import { refundGaitFrame } from './refund_gait.js';

export const CLOSER_INTRO_TICKS = 500;
export const CLOSER_INTRO_BEATS = Object.freeze([
 [0,'On a call'],[16,'Your refund is ready'],[120,'Laugh'],[144,'Please hold'],[200,'Read me the numbers'],
 [262,'Slam the phone'],[276,'Rise'],[312,'Glasses'],[328,'Round the desk'],[388,'Knuckles'],[392,'Name card'],
 [420,'Your call is important'],[480,'Take guard'],[499,'Before combat'],[500,'Combat'],
]);
// Seated behind the desk (y 216 sorts between throne and desk), out along the back of the desk until his
// whole body clears its left end (desk 166..334), then forward into CHAD's lane.
const SEAT={x:260,y:216},CORNER={x:128,y:216},GUARD={x:148,y:230};
const WALK0=328,TURN=376,WALK1=388;
const leg1=SEAT.x-CORNER.x,leg2=Math.hypot(CORNER.x-GUARD.x,GUARD.y-CORNER.y),travel=leg1+leg2;
const LINES=[
 {from:16,to:118,text:'YES MADAM. YOUR REFUND IS READY.',seated:true},
 {from:144,to:196,text:'PLEASE HOLD.',seated:true},
 {from:200,to:260,text:'READ ME THE NUMBERS.',seated:true},
 {from:420,to:500,text:'YOUR CALL IS IMPORTANT TO US.'},
];
// Footfalls land on the gait's double-support poses.
const stepAt=[];
{let last=-1;for(let t=WALK0;t<=WALK1;t++){const f=refundGaitFrame('ic_closer',walked(t),false,8);if(f!==last&&(f===0||f===4))stepAt.push(t);last=f;}}
function walked(t){return t<WALK0?0:t<TURN?leg1*clamp((t-WALK0)/(TURN-WALK0),0,1):t<WALK1?leg1+leg2*clamp((t-TURN)/(WALK1-TURN),0,1):travel;}

export function closerIntroPose(t){
 const d=walked(t),moving=t>=WALK0&&t<WALK1;
 const x=d<=leg1?SEAT.x-d:CORNER.x+(GUARD.x-CORNER.x)*(d-leg1)/leg2,y=d<=leg1?SEAT.y:CORNER.y+(GUARD.y-CORNER.y)*(d-leg1)/leg2;
 let action='seated',frame=0;
 if(t<120)frame=0;
 else if(t<144)frame=1;               // laughing at his victim
 else if(t<200)frame=2;               // finger up at CHAD: please hold
 else if(t<262)frame=0;
 else if(t<276)frame=3;               // slams the handset
 else if(t<288)frame=4;
 else if(t<300)frame=5;
 else if(t<312)frame=6;
 else if(t<WALK0)frame=7;             // glasses
 else if(moving){action='walk';frame=refundGaitFrame('ic_closer',d,false,8);}
 else if(t<420){action='taunt';frame=t<406?1:2;}   // knuckles, neck roll
 else if(t<470){action='taunt';frame=4;}           // points at CHAD
 else action='idle';
 return {x,y,face:-1,action,frame,moving};
}
export function updateCloserIntro(b,t){
 const p=closerIntroPose(t);b.introT=t;b.x=G.camLock+p.x;b.y=p.y;b.face=p.face;
 b.stridePhase=p.moving?walked(t):0;
 const a=G.audio;
 if(t===1)a.sfx('refund_ring',.25);
 if(t===120)a.sfx('cond_laugh',.55);
 if(t===144)a.roomSfx?.('room_chair',.2);
 if(t===264){a.sfx('slam',.5);a.roomSfx?.('room_stamp',.4);}
 if(t===270){a.sfx('neta_cash',.5);if(G.india)G.india.closerSales=(G.india.closerSales||0)+1;}
 if(t===280)a.roomSfx?.('room_chair',.35);
 if(stepAt.includes(t))a.sfx('step',.4);
 if(t===390||t===398)a.sfx('bone_crack',.25);
 if(t===480)a.roomSfx?.('room_shaker',.25);
}
export function endCloserIntro(b){
 Object.assign(b,{x:G.camLock+GUARD.x,y:GUARD.y,face:-1,state:'idle',t:0,atkCd:60,introT:CLOSER_INTRO_TICKS});
 b.refundWalkPos=travel;
}
export function closerIntroLine(b,t,camX){
 const line=LINES.find(line=>t>=line.from&&t<line.to);if(!line)return null;
 // Seated, the panel sits left over the window so the portrait above him stays clear; its pointer ends by his head.
 const sx=b.x-camX;
 if(line.seated)return {text:line.text,x:sx-126,bottom:110,age:t-line.from,remaining:line.to-t,width:line.text.length>24?176:150};
 return {text:line.text,x:sx-56,bottom:100,age:t-line.from,remaining:line.to-t,width:line.text.length>24?176:150};
}
// Combat barks, typed in the same lobby frame (only from the fight, never over the reveal).
export function closerFightLine(){return null;}
