// Pappu's finisher (the main fight plays c.variant, 'puri' by default); also used by the frame review studio.
import {puriFinish} from './vendor_puri_finish.js';
export const VENDOR_FINISH_VARIANTS=Object.freeze({puri:puriFinish});
export const vendorVariant=c=>c?.kind==='vendor-finish'?VENDOR_FINISH_VARIANTS[c.variant]||puriFinish:null;
export function vendorVariantConfig(c,base){const v=vendorVariant(c);return v?{...base,performanceTicks:v.ticks,ticks:v.ticks+30,voice:null,hits:[],damage:[],exit:'play'}:base;}
