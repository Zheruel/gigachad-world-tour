// Delhi's authored performances use a zero-based clock after the shared entry.
import {clamp} from './engine.js';
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1);
export const DELHI_FINISHERS={
 'vendor-finish':{ticks:660,performanceTicks:630,camera:2670,voice:'duke_turn_up_heat',voiceAt:18,voiceMs:2060,hits:[154,184,216],damage:[218,354,480],exit:'play'},
 'dredger-finish':{ticks:960,performanceTicks:930,camera:6000,voice:'duke_safety_inspections',voiceAt:708,voiceMs:3400,hits:[58,90,126],damage:[354,468,612],exit:'clear'},
};
export function delhiFinisherPose(c,t=c.t){
 const vendor=c.kind==='vendor-finish',cam=DELHI_FINISHERS[c.kind].camera;
 const p={x:cam+190,y:236,pose:0,walk:false,vx:cam+246,vy:236,victim:0,art:0};
 if(vendor){
  p.pose=t<140?0:t<154?1:t<166?2:t<178?4:t<194?5:t<208?3:t<232?6:t<266?7:t<286?8:t<314?9:t<354?10:t<370?11:t<526?0:t<566?14:15;
  if(t>=154)p.art=t<178?1:t<208?2:t<232?3:t<266?4:t<354?5:t<376?6:t<407?7:t<437?8:t<453?9:t<470?10:11;
  // Shove into the vessel, then approach its nearby release with actual steps.
  if(t>=216&&t<266){p.vx=mix(cam+246,cam+342,(t-216)/50);p.vy=mix(236,217,(t-216)/50);}
  else if(t>=266&&t<354){p.vx=cam+342;p.vy=217;}
  if(t>=232&&t<280){p.x=mix(cam+190,cam+286,(t-232)/48);p.walk=true;}
  else if(t>=280)p.x=cam+286;
  if(t>=354){const q=clamp((t-354)/99,0,1);p.vx=mix(cam+342,cam+410,q);p.vy=mix(217,239,q)-104*Math.sin(q*Math.PI);if(t>=453&&t<470)p.vy=239-9*Math.sin((t-453)/17*Math.PI);}
 }else{
  p.pose=t<44?0:t<58?1:t<70?2:t<78?4:t<102?5:t<116?8:t<148?12:t<164?7:t<198?8:t<224?9:t<260?10:t<278?11:t<700?0:t<754?14:15;
  p.art=t<58?0:t<78?1:t<116?2:t<126?3:t<158?4:t<188?5:t<260?6:t<310?7:t<354?8:9;
  if(t>=126&&t<188){let q=(t-126)/62;p.vx=mix(cam+246,cam+320,q);p.vy=mix(236,194,q)-52*Math.sin(q*Math.PI);}
  else if(t>=188){const q=clamp((t-260)/94,0,1);p.vx=mix(cam+320,cam+359,q);p.vy=mix(194,215,q*q);}
  if(t>=148&&t<188){p.x=mix(cam+190,cam+231,(t-148)/40);p.walk=true;}else if(t>=188)p.x=cam+231;
 }
 p.victim=p.art>=4?5:p.art>0?1:0;return p;
}
export function delhiBucketPose(t){const q=clamp((t-260)/94,0,1);return{x:6320+39*q,y:194+21*q*q,angle:q*.82};}
