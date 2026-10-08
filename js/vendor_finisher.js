import {G} from './engine.js';
import {vendorVariant,VENDOR_FINISH_VARIANTS} from './vendor_finish_variants.js';
import {puriFinish} from './vendor_puri_finish.js';
export function updateVendorFinish(c,t,cam){return (VENDOR_FINISH_VARIANTS[c.variant]||puriFinish).update(c,t,cam);}
export function drawVendorUnder(ctx,camX){const c=G.india?.cinematic?.kind==='vendor-finish'?G.india.cinematic:G.india?.completedScenes?.['vendor-finish'];if(c)return vendorVariant(c).drawUnder(ctx,c,camX);}
export function drawVendorFinish(ctx,c,showChad,camX){return vendorVariant(c).draw(ctx,c,showChad,camX);}
