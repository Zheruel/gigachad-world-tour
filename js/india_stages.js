import { initIndia } from './india_stage.js';
const common={chapter:true,width:6480,floorW:6480,moteCount:0,moteStyle:'dust',lamps:[],lampCol:'255,180,90',lampA:0,gradeA:0,skyLayers:[],areas:[],glows:[],birds:[],fg:[],ambience:[],emitters:[],events:[],crowd:[],build:()=>({}),ambient:()=>{},init:initIndia};
const wave=(x,spawns,extra={})=>({x,spawns,...extra});
const crew=(...roles)=>roles.map(role=>'ic_'+role);
// A reserve enters only after the previous queue is empty and at most two
// fighters remain. Individual scenes keep their first introduction compact.
const staged=(x,groups,visibleCap=6,extra={})=>({x,spawns:groups[0],reserves:groups.slice(1),visibleCap,...extra});
export const INDIA_STAGES=[
 {...common,id:'delhi',num:'1-2',name:'DIRTY DELHI',sub:'ACT II - THE MARKET AND THE RIVER',arrival:'market',introVoice:'duke_who_wants_some',music:'stage1a',musicB:'stage1b',musicBX:4050,bossMusic:'boss',bossMusicFinal:'boss1',boss:'dredger',introTicks:720,
 lanes:[{x0:0,x1:6480,top:213,bot:245}],
 props:[{kind:'ic_cart',x:460,y:227},{kind:'ic_stall',x:740,y:220},{kind:'ic_cart',x:1260,y:230},{kind:'ic_stall',x:1500,y:219},{kind:'ic_boiler',x:1910,y:218},{kind:'ic_stall',x:2210,y:219},{kind:'ic_cargo',x:4300,y:223},{kind:'ic_cargo',x:4770,y:227},{kind:'ic_cargo',x:5190,y:221},{kind:'ic_cargo',x:5550,y:232}],
 waves:[
  staged(350,[crew('brawler','brawler','brawler','runner')],4),
  staged(720,[crew('runner','brawler','enforcer','brawler'),crew('runner','brawler')],4),
  staged(1100,[crew('enforcer','brawler','runner','brawler'),crew('runner','brawler','enforcer','brawler'),crew('runner','brawler')],4),
  staged(1430,[crew('heavy','brawler','enforcer','runner'),crew('brawler','runner','brawler','enforcer'),crew('heavy','brawler','runner','brawler')]),
  staged(1720,[crew('runner','enforcer','brawler','heavy'),crew('brawler','runner','enforcer','brawler'),crew('heavy','brawler','runner','enforcer')]),
  staged(2050,[crew('kitchen','brawler','runner','brawler'),crew('kitchen','brawler','runner'),crew('kitchen','brawler','runner')],4),
  staged(2390,[crew('heavy','kitchen','enforcer','brawler'),crew('runner','kitchen','brawler','enforcer'),crew('heavy','brawler','runner','kitchen')]),
  wave(2840,[],{miniboss:'vendor',intro:true,camX:2670}),
  staged(4390,[crew('docker','docker','runner','enforcer'),crew('brawler','docker','enforcer'),crew('docker','runner','docker')],4),
  staged(4930,[crew('heavy','docker','enforcer','docker'),crew('runner','docker','enforcer','docker'),crew('heavy','docker','runner','enforcer')]),
  staged(5480,[crew('docker','enforcer','heavy','runner'),crew('docker','enforcer','docker','runner'),crew('heavy','docker','enforcer','docker')]),
  wave(6060,[],{boss:true,camX:6000}),
 ],
 },
 {...common,id:'refund',num:'1-3',name:'REFUND TOWER',sub:'ACT III - YOUR CALL IS IMPORTANT',arrival:'breach',music:'stage3a',musicB:'stage3b',musicBX:1620,bossMusic:'boss',bossMusicFinal:'final',boss:'closer',introTicks:480,final:true,
 lanes:[{x0:0,x1:6480,top:215,bot:245}],
 props:[{kind:'ic_monitor',x:510,y:224},{kind:'ic_cubicle',x:1330,y:219},{kind:'ic_monitor',x:1880,y:224},{kind:'ic_cubicle',x:2190,y:218},{kind:'ic_shelf',x:2800,y:217},{kind:'ic_cubicle',x:3120,y:217},{kind:'ic_server',x:3650,y:220},{kind:'ic_shelf',x:4440,y:217},{kind:'ic_monitor',x:5060,y:222},{kind:'ic_cabinet',x:5550,y:219}],
 waves:[
  staged(460,[crew('headset','headset','operator','headset')],4),
  staged(1230,[crew('operator','headset','thrower','headset'),crew('operator','headset')],4),
  staged(1800,[crew('security','headset','thrower','operator'),crew('headset','security','headset'),crew('operator','thrower','headset')],4),
  staged(2200,[crew('lead','headset','operator','thrower'),crew('security','headset','operator','headset'),crew('lead','headset','thrower','security')],4),
  staged(2700,[crew('cabinet','headset','thrower','operator'),crew('headset','operator','security','headset'),crew('cabinet','headset','thrower','operator')]),
  staged(3130,[crew('lead','security','cabinet','operator'),crew('thrower','headset','security','headset'),crew('lead','operator','security','thrower')],4),
  staged(3560,[crew('security','thrower','operator','security'),crew('headset','operator','thrower','headset'),crew('security','operator','headset','thrower')],4),
  staged(4360,[crew('cabinet','operator','lead','security'),crew('thrower','operator','headset','security'),crew('cabinet','lead','thrower','operator')]),
  staged(4690,[crew('security','security','lead'),crew('security','operator','headset')],4,{elite:true}),
  staged(5100,[crew('headset','cabinet','thrower','security'),crew('operator','headset','thrower','operator'),crew('security','cabinet','headset','operator')]),
  staged(5510,[crew('lead','security','security','operator'),crew('thrower','lead','security','operator')],4,{elite:true}),
  wave(5960,[],{boss:true,camX:5900}),
 ],
 },
];

// Reliable recovery belongs to the quiet gap after an encounter. It does not
// increase enemy drops or super income, and checkpoint rollback owns its history.
for(const stage of INDIA_STAGES){
 const recovery=stage.id==='delhi'?[2,4,6,11]:[1,3,5,6,8,10,11];
 for(const number of recovery)stage.waves[number-1].recovery=30;
}
