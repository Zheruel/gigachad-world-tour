// Delhi performances use a zero-based clock after the shared entry.
import {DF,DF_DAMAGE,dredgerFinishPose} from './dredger_finisher.js';
import {puriFinish} from './vendor_puri_finish.js';
import {vendorVariant} from './vendor_finish_variants.js';
export const DELHI_FINISHERS={
 'vendor-finish':{get ticks(){return puriFinish.ticks+30;},get performanceTicks(){return puriFinish.ticks;},camera:2670,voice:null,hits:[],damage:[],exit:'play'},
 'dredger-finish':{ticks:DF.end+30,performanceTicks:DF.end,camera:6000,voice:'duke_safety_inspections',voiceAt:DF.quote,voiceMs:3400,hits:[],damage:DF_DAMAGE,exit:'clear'},
};
export function delhiFinisherPose(c,t=c.t){const cam=DELHI_FINISHERS[c.kind].camera;return c.kind==='vendor-finish'?vendorVariant(c).pose(t,cam):dredgerFinishPose(t,cam);}
