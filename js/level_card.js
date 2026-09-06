import { drawTextShadow, textWidth } from './sprites.js';
import { drawDisplayTitle } from './display_type.js';

export const LEVEL_CARDS = [
  {id:'locomotive',name:'Locomotive Breaker',description:'A fist-first hero shot on the locomotive. Big attitude, blazing headlights and rail sparks.',path:'assets/travel/india/level-cards/locomotive.png'},
  {id:'rooftop',name:'Rooftop Rampage',description:'A flying kick above the city. Speeding trains, a steel bridge and an explosive skyline.',path:'assets/travel/india/level-cards/rooftop.png'},
  {id:'station',name:'Station Showdown',description:'A platform-clearing uppercut. Golden steam, flying tickets and the train bearing down.',path:'assets/travel/india/level-cards/station.png'},
  {id:'station-grit',name:'Grimy Platform',description:'The uppercut revisited: scruffy railway thugs, stained clothing, battered luggage and a filthy platform.',path:'assets/travel/india/level-cards/station-grit.png'},
  {id:'baggage',name:'Baggage Claim',description:'A straight punch sends a grubby thug through a luggage trolley. Dirty amber light and flying suitcases.',path:'assets/travel/india/level-cards/baggage.png'},
  {id:'last-stop',name:'Last Stop',description:'An over-shoulder throw under battered station arches, with a rougher crew and the locomotive looming behind.',path:'assets/travel/india/level-cards/last-stop.png'},
];

export function drawLevelCard(ctx,art,{ready=true,ui=true}={}) {
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#100d18';ctx.fillRect(0,0,480,270);
  if(art)ctx.drawImage(art,0,0,480,270);
  if(ui){
    const shade=ctx.createLinearGradient(0,181,0,270);
    shade.addColorStop(0,'rgba(7,5,14,0)');shade.addColorStop(.48,'rgba(7,5,14,.82)');shade.addColorStop(1,'#07050e');
    ctx.fillStyle=shade;ctx.fillRect(0,181,480,89);
    const center=(text,y,color,scale)=>drawTextShadow(ctx,text,Math.round((480-textWidth(text,scale))/2),y,color,scale);
    drawDisplayTitle(ctx,'ACT 1 / INDIA',240,192,{height:15,maxWidth:145});
    drawDisplayTitle(ctx,'THE NIGHT TRAIN',240,212,{height:30,maxWidth:378});
    center(ready?'F / LB: START LEVEL':'PREPARING YOUR ARRIVAL...',252,'#eee2ce',1);
  }
  ctx.restore();
}
