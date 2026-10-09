import { initIndia } from './india_stage.js';
const common={chapter:true,width:6480,floorW:6480,moteCount:0,moteStyle:'dust',lamps:[],lampCol:'255,180,90',lampA:0,gradeA:0,skyLayers:[],areas:[],glows:[],birds:[],fg:[],ambience:[],emitters:[],events:[],crowd:[],build:()=>({}),ambient:()=>{},init:initIndia};
const wave=(x,spawns,extra={})=>({x,spawns,...extra});
const crew=(...roles)=>roles.map(role=>'ic_'+role);
// A reserve enters only after the previous queue is empty and at most two
// fighters remain. Individual scenes keep their first introduction compact.
const staged=(x,groups,visibleCap=6,extra={})=>({x,spawns:groups[0],reserves:groups.slice(1),visibleCap,...extra});
// Refund arenas have a composition, rather than stopping wherever CHAD happened
// to walk. A short line belongs to the actual crew member who enters that fight.
const refund=(x,groups,camX,id,role,line)=>staged(x,groups,4,{camX,refundBeat:{id,role:role&&'ic_'+role,line}});
export const INDIA_STAGES=[
 {...common,id:'delhi',num:'1-2',name:'DIRTY DELHI',sub:'ACT II - THE MARKET AND THE RIVER',arrival:'market',introVoice:true,music:'delhi_a',musicB:'delhi_b',musicBX:4050,bossMusic:'delhi_boss',minibossMusic:{vendor:'delhi_vendor'},boss:'dredger',introTicks:720,
 // The opening stall fronts end at y225; their rear boundary is solid, not a river lip.
 lanes:[{x0:0,x1:810,top:226,bot:245,solidBack:true},{x0:810,x1:3240,top:213,bot:245,solidBack:true},{x0:3240,x1:6480,top:213,bot:245}],
 // Breakables: market carts and produce stalls hold a lassi; the chai boiler vents steam until broken;
 // the river's fixed breakable cargo bales hold a lassi each. Placed on the walk
 // after the fights that hurt (tools/verification/breakables_balance.cjs): the first cart is score
 // only, a stall waits either side of the Vendor, and the last bale sits before the Dredger's pontoon.
 // The kadai is decor: Ghee Pappu's, fried at before the fight (vendor_boss.js adopts it).
 props:[{kind:'ic_cart',x:540,y:227,drop:null},{kind:'ic_cart',x:1380,y:230},{kind:'ic_boiler',x:1910,y:218},{kind:'ic_stall',x:2210,y:219},{kind:'ic_stall',x:2640,y:219},{kind:'dv_kadai',x:3042,y:222},{kind:'ic_stall',x:3230,y:220},{kind:'ic_cargo',x:4300,y:223},{kind:'ic_cargo',x:4770,y:227},{kind:'ic_cargo',x:5190,y:221},{kind:'ic_cargo',x:5900,y:232}],
 waves:[
  // Market: one new face per wave, introduced small - tout, snatcher, cricketer, thela, cook.
  staged(350,[crew('brawler','brawler','brawler')],3),
  staged(720,[crew('brawler','runner','brawler'),crew('brawler','brawler')],4),
  staged(1100,[crew('brawler','enforcer','brawler'),crew('runner','brawler')],4),
  staged(1430,[crew('heavy','brawler','brawler'),crew('enforcer','brawler')],4),
  staged(1720,[crew('runner','enforcer','brawler')],3),
  staged(2050,[crew('kitchen','brawler','brawler'),crew('runner','brawler')],4),
  staged(2390,[crew('heavy','kitchen','brawler'),crew('enforcer','brawler')],4),
  wave(2840,[],{miniboss:'vendor',intro:true,camX:2670}),
  // Culvert: the dock crew's first wrenches.
  staged(3650,[crew('docker','brawler','brawler')],3),
  // River: the Dredger's crew throw their spare wrenches.
  staged(4390,[crew('docker','enforcer','brawler'),crew('runner','brawler')],4),
  staged(4930,[crew('heavy','docker','brawler'),crew('enforcer','brawler')],4),
  staged(5480,[crew('docker','runner','enforcer'),crew('brawler','brawler')],4),
  wave(6060,[],{boss:true,camX:6000}),
 ],
 },
 {...common,id:'refund',num:'1-3',name:'REFUND TOWER',sub:'ACT III - YOUR CALL IS IMPORTANT',arrival:'breach',music:'refund_a',bossMusic:'refund_boss',boss:'closer',introTicks:1076,final:true,
 lanes:[{x0:0,x1:6480,top:215,bot:245,solidBack:true}],
 // Breakables, one a floor: monitors and server racks hold a lassi, records shelves a plate;
 // the executive cabinet drops nothing but can be knocked into the Closer's crew. Each food prop
 // stands on the walk just past a fight, not in it: after the IT guy's two floors, the servers and records,
 // and a lassi at the Closer's door.
 props:[{kind:'ic_shelf',x:1700,y:217},{kind:'ic_monitor',x:2100,y:224},{kind:'ic_monitor',x:2600,y:224},{kind:'ic_shelf',x:3050,y:217},{kind:'ic_server',x:3950,y:220},{kind:'ic_shelf',x:4620,y:217},{kind:'ic_execdesk',x:5550,y:221},{kind:'ic_partition',x:5840,y:219}],
 waves:[
  // Runtime keys: headset = the caller, operator = the night-shift kid, thrower = the IT guy,
  // security = the old guard, cabinet = the recovery agent, lead = the team lead.
  // Offices: callers rise from their desks, then one new face per wave.
  {...refund(460,[crew('headset','headset','headset')],220,'first-shift','headset','Your call is important.'),visibleCap:3},
  refund(1230,[crew('operator','headset','headset'),crew('operator','headset')],990,'night-shift','operator','Wrong department, mate.'),
  refund(1800,[crew('thrower','headset','operator'),crew('headset','thrower')],1620,'technical-support','thrower',"I'll fix your connection."),
  refund(2200,[crew('security','headset','thrower'),crew('operator','headset','headset')],2030,'staff-only','security','Staff only.'),
  refund(2700,[crew('lead','headset','headset','operator'),crew('thrower','security','headset')],2480,'floor-manager','lead','Back on the phones!'),
  // Calling floor and server wing: the recovery agent arrives, then mixed shifts,
  // never more than four on screen and at most one cabinet or guard pair at a time.
  refund(3130,[crew('cabinet','headset','thrower'),crew('operator','headset','security'),crew('headset','operator')],2880,'escalations','cabinet','Let me escalate this.'),
  refund(3560,[crew('lead','security','operator','headset'),crew('thrower','thrower','headset','operator')],3380,'server-security','lead','Nobody touches the servers.'),
  refund(4360,[crew('cabinet','lead','headset','operator'),crew('thrower','security','headset'),crew('operator','headset')],4180,'records'),
  // Records and executive floors: the last shifts before the Closer's door.
  refund(4690,[crew('security','lead','thrower'),crew('operator','headset','cabinet')],4480,'records-security'),
  refund(5100,[crew('cabinet','thrower','headset','operator'),crew('security','lead','thrower','headset')],4930,'executive-approach'),
  refund(5510,[crew('lead','security','operator','headset'),crew('cabinet','thrower','operator','security')],5300,'executive-manager','lead','The boss wants him handled.'),
  wave(5960,[],{boss:true,camX:5900}),
 ],
 },
];

// Reliable recovery belongs to the quiet gap after an encounter. It does not
// increase enemy drops or super income, and checkpoint rollback owns its history.
// Delhi names its recovery encounters by position, so an inserted wave never moves a heal:
// the last market fight heals before the Vendor, the last river fight before the Dredger, and the
// river's two big crews (4930, 5480) get one each. Refund skips its first, harmless office fight
// and heals after both of the IT guy's floors (waves 3 and 4).
const RECOVERY={delhi:[1430,2390,4930,5480],refund:[1800,2200,2700,3130,4690,5100,5510]};
for(const stage of INDIA_STAGES){
 for(const w of stage.waves)if(RECOVERY[stage.id]?.includes(w.x))w.recovery=30;
}
