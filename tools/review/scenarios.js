// Scenario adapters only: the Studio owns playback, input recording and seeking.
const title=s=>s.replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const checkpoints=items=>items.map(([tick,label])=>({tick,label}));
const layerList=ids=>ids.map(id=>({id,label:({npc:'Passengers and staff',fx:'Effects',art:'Scenery art',vista:'Window vistas',finaleGear:'Running gear',finaleCoupling:'Couplings',sets:'Cinematic structures'})[id]||title(id.replace(/([a-z])([A-Z])/g,'$1 $2'))}));
const trainLayers=layerList(['art','npc','fx','vista','near','interior','finaleActor','finaleCar','finaleEnvironment','finaleGear','finaleCoupling','finaleLeftDamage','finaleRightDamage','finaleDynamite','finaleCigar','conductorDesk','conductorActor','finishActors']);
const indiaLayers=layerList(['environment','foreground','ambient','props','fx','sets','actors','chairs','workers','rats','pigeons','flies']);
const tripLayers=layerList(['architecture','actors','effects']);
// Expose only switches consumed by the selected renderer, not every stage flag.
function supportedLayers(section,key,kind){
 if(kind==='result')return [];
 if(section==='trip'){
  if(key==='drive')return tripLayers.filter(l=>l.id==='effects');
  if(['takeoff','flight','india-approach'].includes(key))return tripLayers.filter(l=>l.id!=='actors');
  return ['curb','car-board','apron-arrival','apron','jet-board','landing','disembark','papers','arrival-exit'].includes(key)?tripLayers:[];
 }
 if(section==='train'){
  if(key==='escape')return trainLayers.filter(l=>l.id==='fx'||l.id.startsWith('finale'));
  if(['inspector-finish','knockout','roof-transition','shera-finish'].includes(key))return trainLayers.filter(l=>['vista','near','finishActors'].includes(l.id)||(key==='inspector-finish'&&l.id==='conductorDesk'));
  return trainLayers.filter(l=>!l.id.startsWith('finale')&&l.id!=='finishActors').filter(l=>!l.id.startsWith('conductor')||key==='office'||key==='conductor'||key.startsWith('conductor/')||key==='encounter-7'||key==='encounter-8'||key==='full');
 }
 let allowed=indiaLayers.filter(l=>!['chairs','workers','foreground'].includes(l.id)||section==='refund').filter(l=>!['rats','pigeons','flies'].includes(l.id)||section==='delhi');
 if(key.startsWith('intro'))allowed=allowed.filter(l=>l.id!=='props'&&(section==='delhi'||!['sets','actors'].includes(l.id)));
 if(kind!=='cinematic')allowed=allowed.filter(l=>l.id!=='actors');
 return allowed;
}
const resultBeats=checkpoints([[0,'Frozen composition'],[44,'Before title'],[45,'Victory title'],[90,'Score tally'],[105,'Flex hit'],[215,'Zippo'],[241,'Rank stamp'],[270,'Before continue'],[271,'Fresh confirmation enabled'],[345,'Exhale']]);
const retreatBeats=checkpoints([[0,'Fade out'],[12,'Black staging'],[36,'Double or nothing'],[78,'Wad slap'],[98,'Gut punch'],[120,'Head whip'],[147,'Super charge'],[180,'Silhouette haymaker'],[199,'Medals burst'],[268,'Crash on the trunks'],[282,'Come apart at the seams'],[290,'Netaji trips'],[312,'I want a refund'],[322,'Crawl'],[400,'Ladder climb'],[444,'Loafer drops'],[474,'Come get some'],[582,'CHAD follows'],[643,'CHAD climbs'],[684,'Roof reveal'],[803,'Return to play']]);
const areaLabels={yard:'Station forecourt',hall:'Station hall',platform:'Departure platform',general:'General-class carriage',sleeper:'Sleeper carriage',pantry:'Snack carriage',office:'Inspector’s office',ac:'Air-conditioned carriage',private:'Private carriage',roof:'Train roof',market:'Station-side market',bazaar:'Main bazaar',food:'Food alleys',culvert:'Culvert river reveal',ghat:'River approach',wharf:'Working waterfront',pontoon:'Dredger dock',annex:'Office annex',calling:'Main calling floor',calling_east:'East calling floor',servers:'Server room',records:'Records wing',executive:'Executive approach'};
const introBeats={train:[[0,'Station entrance'],[55,'Ticket demand'],[108,'Lower shoulder'],[123,'Charge / guard cowers'],[143,'Barrier impact / guard hides'],[174,'Recover'],[210,'White flag rises'],[222,'Walk onto platform'],[240,'Departure announcement'],[242,'Guard surrenders'],[280,'Stop'],[326,'Whistle'],[336,'Level title'],[352,'Duke line'],[480,'First encounter']],refund:[[0,'Callers at work'],[16,'Sir, your refund is ready'],[150,'Cord snaps taut'],[176,'Yanked off the chair'],[212,'Face-first into the wall'],[234,'Wall cracks'],[264,'Wall breach'],[296,'You called?'],[360,'Headset tossed'],[430,'Collar grab'],[488,'Thrown'],[502,'Desk smash'],[522,'Phone rings'],[568,'CHAD answers'],[664,'Handset crushed'],[670,'Workers flee'],[855,'Level title'],[939,'Ready']]};
const trainEntryBeats={conductor:[[0,'Count cash'],[28,'Pocket notes'],[60,'Push chair'],[85,'Stand'],[108,'Brace desk'],[120,'Walk around desk'],[170,'Step into aisle'],[210,'Assess CHAD'],[248,'Payment demand'],[278,'Guard'],[299,'Before combat'],[300,'Combat']], 'neta-intro':[[0,'Duo enters'],[60,'Shera counts cash'],[128,'Netaji pays'],[166,'Neck crack'],[194,'Teach him our rates'],[236,'Point'],[258,'Five hundred a punch'],[299,'Before combat']],'shera-finish':[[0,'Fade from the fight'],[30,'Approach'],[42,'Six gut punches'],[96,'Rib crunch'],[120,'Kneel · super charge'],[146,'Decapitating uppercut'],[159,'Head separates'],[160,'Head and body launch'],[188,'Head ricochets off ceiling'],[214,'Body crashes through trunk'],[220,'Head hits floor'],[232,'Bloody aftermath'],[234,'Aftermath · dentist'],[304,'Walk to the ladder'],[368,'Roof: out of the hatch'],[485,'Before handoff']],boarding:[[0,'Approach train'],[24,'First step'],[52,'Climb'],[76,'Pull aboard'],[106,'Boot contact'],[119,'Before carriage handoff']], 'train-arrival':[[0,'Train approaching'],[90,'Carriages passing'],[180,'Braking'],[240,'Stopped'],[299,'Platform hold']]};
// The vendor (480) and Dredger (930) performances run longer through hitstop and slow motion.
// Boss reveals as play reaches them: [scene, label, ticks, beats].
const bossIntros={delhi:[['vendor-intro','Ghee Pappu introduction',384,[[0,'Frying'],[80,'Fish out a pakora'],[100,'Stuff it in'],[136,'Clock CHAD'],[156,'Spit'],[176,'Waddle out'],[206,'Hitch lungi'],[236,'Wipe hands'],[260,'Skimmer slap'],[278,'Belch'],[296,'Plant / name'],[350,'Square up'],[383,'Combat']]],
 ['dredger-intro','Thekedar introduction',300,[[0,'At the levers'],[36,'Onto the gantry'],[54,'Spit'],[58,'Jeer'],[100,'Name card'],[120,'Arms crossed'],[176,'Back into the cab'],[190,'Lever / grab drops'],[224,'Grab lands'],[299,'Combat']]]],
 refund:[['closer-intro','The Closer · king of refunds',500,[]]]};
const finishDurations={'vendor-finish':402,'dredger-finish':790,'closer-finish':730};
const finishBeats={
 // Scenario ticks include the shared entry and impact freezes.
 'vendor-finish':[[0,'Fade out'],[12,'Black staging'],[30,'Approach'],[68,'Gut hook'],[100,'Chilli cram'],[142,'Gulp'],[170,'Puffing up'],[196,'Floating puri'],[234,'Cracking'],[254,'Uppercut'],[258,'Pop'],[280,'Pieces land'],[290,'Cigar'],[366,'Return to play']],
 // Scenario ticks of the DF beats: 30-tick entry plus the performance's hitstop.
 'dredger-finish':[[0,'Fade out'],[12,'Black staging'],[46,'Magnet call'],[74,'Magnet drops'],[110,'Overhead catch'],[160,'Stands'],[180,'Rips cable'],[204,'Toss'],[230,'Stuck to the magnet'],[266,'Takes cable'],[278,'Whirl'],[350,'Release'],[390,'Cab impact'],[435,'Tilt'],[475,'Collapse'],[483,'River splash'],[487,'Cigar out'],[507,'Zippo'],[529,'Lit'],[545,'Shut'],[553,'Quote / exhale'],[700,'Wreck hold']],
 'closer-finish':[[0,'Fade out'],[12,'Black staging'],[30,'Face-off'],[38,'First charge'],[42,'Loaded straight'],[50,'Charge builds'],[58,'Drive forward'],[62,'Chest impact'],[68,'Desk launch'],[74,'Airborne'],[88,'Desk impact'],[100,'Held collapse'],[120,'Roll off'],[132,'Fall from desk'],[148,'Floor landing'],[176,'Super charge'],[196,'Deep coil'],[210,'Drive stance'],[216,'Final drive'],[220,'Jaw break'],[225,'Blood and teeth'],[234,'Fast launch'],[242,'Screen collision'],[250,'Detonation'],[262,'Fireball'],[276,'Body fragments'],[290,'Cash rain'],[310,'Remains settle'],[336,'Shades'],[362,'Cigar'],[394,'Zippo flare'],[408,'Smoke ring'],[450,'Victory hold'],[515,'Ending screen'],[730,'Final score']]
};
export async function createScenarioRegistry(game){
 const imp=path=>game.importModule(path);
 const [train,india,cinematics,finale,travel,bosses,combat,ambient,story,delhiIntro,closerIntro]=await Promise.all(['train','india_stage','india_cinematics','train_finale','travel','bosses','player','delhi_ambient','story','delhi_intro','refund_boss_intro'].map(n=>imp(`js/${n}.js`)));
 const list=[]; const G=game.G;
 function add(section,group,key,label,kind,load,options={}){
  const layers=options.layers||supportedLayers(section,key,kind);
  const applySettings=settings=>{
   const toggles=Object.fromEntries(layers.map(l=>[l.id,settings?.layers?.[l.id]!==false]));
   if(section==='train'&&G.train)G.train.review=toggles;
   else if(section==='trip'&&G.travel)G.travel.streetLayers=toggles;
   else if(G.india)G.india.review=toggles;
   if(options.route&&Number.isFinite(Number(settings?.routeX))){const x=Math.max(0,Math.min(options.route.max,Number(settings.routeX)));G.camX=x;G.camLock=x;G.player.x=x+150;if(section==='train'&&G.train){G.train.aboard=x>=2880;G.train.climbed=x>=8160;G.train.scene=x>=7200?2:x>=4320?1:0;G.train.vistaStage=G.train.vistaFrom=x>=7200?2:x>=5280?1:0;G.train.vistaBlend=1;G.player.y=x>=8160?210:236;}}
   if(section==='delhi'&&kind==='area'){
    G.india.marketBroken=settings?.marketState!=='before';
    for(const prop of G.props)if(prop.prop==='ic_cart'&&prop.x===540)prop.dead=prop.broken=G.india.marketBroken;
   }
  };
  const item={id:`${section}/${key}`,section,group,label,kind,duration:options.duration||1800,description:options.description||`${label}. ${kind==='fight'?'Live combat with enemies active.':kind==='pattern'?'Isolated performance demonstration; enemies are active.':kind==='area'?'Explore the scenery with encounters disabled.':kind==='full'?'The full level, including encounters and progression.':'Authored sequence in the actual game renderer.'}`,checkpoints:options.checkpoints||[],layers,
   controls:options.route?[{id:'routeX',label:'Route camera',type:'range',min:0,max:options.route.max,step:1}]:[],
   ...options,applySettings,
   async load(settings={}){game.resetInput();await load(settings);if(section==='train'&&Number.isFinite(G.train?.motionT))G.train.motionT=Math.floor(G.train.motionT);G.freezeTime=true;G.fade=0;applySettings(settings);if(section!=='trip')game.syncSceneMusic();game.render();}
  };
  if(section==='delhi'&&kind==='area')item.controls.push({id:'marketState',label:'Opening aftermath',type:'select',default:'after',options:[{value:'after',label:'After the rampage'},{value:'before',label:'Intact stalls'}]});
  list.push(item);return item;
 }
 const trainScene=name=>()=>game.trainScene(name,0);
 const indiaScene=(id,name)=>()=>{game.indiaScene(id,name,0);if(name==='vendor-finish'){const b=G.india?.cinematic?.boss;if(b){b.inferno=b.mutated=true;Object.assign(b.kadai,{drained:true,smashed:true,stoveDestroyed:true,broken:true,smashX:b.kadai.x+12,smashY:b.kadai.y});}}};
 const engine=await imp('js/engine.js');
 const enemyModule=await imp('js/enemies.js');
 const advance=await imp('js/advance_cue.js');
 add('train','areas','style-demo','CHAD style ladder','pattern',()=>{
  game.trainScene('general');G.enemies=[];G.boss=null;G.props=[];G.locked=true;G.camLock=G.camX;
  engine.resetCombo();engine.bumpCombo();engine.bumpCombo();
 },{duration:820,layers:[],description:'A deterministic preview of every rank change, its quiet hit counter, hold and expiry.',
  checkpoints:checkpoints([[1,'D · warming up'],[49,'C · CHAD energy'],[113,'B · badass'],[193,'A · apocalyptic'],[305,'S · savage'],[433,'SS · sick skills'],[593,'SSS · GIGACHAD'],[650,'Held rank'],[770,'Chain fading'],[800,'Chain ended']]),
  beforeStep(t){if(t<640&&t%16===0)engine.bumpCombo();}
 });
 add('train','areas','advance-demo','GO arrow · arcade cue','pattern',()=>{
  game.trainScene('general');G.enemies=[];G.boss=null;G.props=[];G.locked=true;G.camLock=G.camX;
  engine.resetCombo();G.goTimer=0;
 },{duration:450,layers:[],description:'The gold GO arrow with the SoR2 GO beep and timing: seven blinks, one beep every 32 frames. Press Play to hear it.',
  checkpoints:checkpoints([[1,'First GO beep'],[33,'Second beep'],[193,'Seventh beep'],[224,'Cue ended'],[241,'Repeat']]),
  beforeStep(t){if(t===0||t===240)advance.startAdvanceCue();}
 });
 for(const [key,cls,move,label] of [['green','counter','lunge','Green diamond · parry'],['red','unblockable','sweep','Red cross · evade']]){
  let demo;
  add('train','duels','cue-'+key,label,'pattern',()=>{
   game.trainScene('general');G.enemies=[];G.boss=null;G.props=[];G.locked=true;G.camLock=G.camX;
   Object.assign(G.player,{x:G.camX+160,y:229,invuln:9999});
   demo=game.spawn('nr_commando',90,0);
   Object.assign(demo,{x:G.camX+260,y:229,state:'idle',atkCd:999,face:-1});
  },{duration:720,layers:[],description:'Repeat the real warning, local arm sheen and sound. Green means timed parry; red means evade.',
   checkpoints:checkpoints([[121,'Warning begins'],[125,'Symbol settles'],[130,'Sheen ended; warning stays'],[142,'Approaching contact'],[160,'Contact / recovery']]),
   beforeStep(t){if(t%180===120){Object.assign(demo,{move,cls,wind:34,state:'windup',t:0,face:-1,atkCd:999,plan:move});while(!enemyModule.enemyCueOn(demo)&&demo.t<34)demo.t++;demo.t=Math.max(0,demo.t-1);}G.player.invuln=9999;}
  });
 }
 // Home, departure and arrival use the existing travel lifecycle, not copies.
 add('trip','areas','penthouse','Penthouse','area',()=>game.hub());
 add('trip','cinematics','door','Penthouse departure','cinematic',()=>{game.hub();G.pendingDestination=0;game.setPlayerPos(1470,220);game.step(90);});
 for(const phase of travel.TRAVEL_PHASES){
  const area=['lobby','curb','apron','arrival-exit'].includes(phase);
  add('trip',area?'areas':'cinematics',phase,({elevator:'Elevator ride','car-board':'Board the car',drive:'Drive to the airport','papers':'Arrival official'})[phase]||title(phase),area?'area':'cinematic',()=>game.travel(phase,phase==='elevator'),{duration:travel.TRAVEL_DURATIONS[phase]||1800,checkpoints:phase==='elevator'?checkpoints([[0,'Departure'],[180,'Descent'],[600,'Arrival approach'],[779,'Lobby handoff']]):[]});
 }
 add('trip','cinematics','arrival','Elevator doors open','cinematic',()=>{game.travel('elevator',true);game.step(780);},{duration:190});
 add('trip','cinematics','exit','Leave the lobby','cinematic',()=>{game.travel('lobby');G.travel.x=827;game.step(1);game.press('use');game.step(1);game.release('use');},{duration:110});
 add('trip','areas','waiting','Elevator waiting position','area',()=>{game.travel('elevator');G.travel.x=430;});
 // Runtime area and wave definitions own route ordering and encounter counts.
 for(const stage of game.STAGES.filter(s=>['train','delhi','refund'].includes(s.id))){
  const id=stage.id;
  add(id,'areas','full','Play full level','full',()=>game.playStage(id),{duration:54000});
  const areas=id==='train'?train.TRAIN_AREAS.map(([name,x,end])=>({name,x,end})):india.INDIA_AREAS[id].map((name,i)=>({name,x:i*india.INDIA_PANEL_W,end:(i+1)*india.INDIA_PANEL_W}));
  // Delhi area reviews skip the scripted stray bull (it spawns beside CHAD past x 950); delhi/bull keeps it.
  const areaScene=name=>id==='train'?trainScene(name):id==='delhi'?()=>{
   game.indiaScene(id,name==='vendor'?'food':name,0);G.india.bullDone=true;
   if(name==='vendor'){G.camX=G.camLock=2430;G.player.x=2580;}
  }:indiaScene(id,name);
  for(const area of areas){if(area.name==='closer')continue;
   const key=id==='delhi'&&area.name==='vendor'?'kitchen-area':area.name;
   const label=id==='delhi'&&area.name==='vendor'?'Frying-kitchen approach':id==='refund'&&area.name==='office'?'Cramped scam office':areaLabels[area.name]||title(area.name);
   add(id,'areas',key,label,'area',areaScene(area.name),{route:{max:Math.max(0,stage.width-480)},routeStart:area.x});}
  if(id==='delhi')add(id,'fights','bull','Stray bull charge','fight',indiaScene(id,'bazaar'),{duration:1800});
  stage.waves.forEach((w,index)=>{
   // bosses have their own entries below (the Night Train's per phase)
   if(w.boss||id==='train'&&w.miniboss)return;
   const location=areas.find(a=>w.x>=a.x&&w.x<a.end)?.name||'final arena';
   const label=w.boss?`${id==='train'?'Netaji and Shera':title(stage.boss)} — full fight`:w.miniboss?`${title(w.miniboss)} — full fight`:`Encounter ${index+1} — ${id==='refund'&&location==='office'?'Cramped scam office':areaLabels[location]||title(location)}`;
   add(id,'fights',`encounter-${index}`,label,'fight',()=>{
    if(id==='train')game.trainScene(areas[0].name);else game.indiaScene(id,areas[0].name);
    G.enemies=[];G.spawnQueue=[];G.boss=null;G.waveIndex=index-1;G.waveActive=false;G.locked=false;
    for(const [j,wave]of G.stage.waves.entries())wave.done=j<index;
    G.player.x=w.x;G.camX=Math.max(0,w.camX??w.x-230);G.camLock=G.camX;
    if(G.india&&w.x>950)G.india.bullDone=true; // a real run met the market bull at x 950, long before this gate
    if(id==='train'){G.train.aboard=w.x>=2880;G.train.scene=w.x>=7200?2:w.x>=4320?1:0;}
   },{duration:18000,encounterIndex:index});
  });
  if(id==='delhi'){const ticks=delhiIntro.DELHI_INTRO_TICKS;add(id,'cinematics','intro','Ghee fireball','cinematic',()=>game.indiaScene(id,'intro',0),{duration:ticks,checkpoints:checkpoints([...delhiIntro.DELHI_INTRO_BEATS,[ticks-1,'Ready']])});}
  else add(id,'cinematics','intro',id==='refund'?'The Callback':'Station entrance','cinematic',id==='train'?trainScene('intro'):indiaScene(id,'intro'),{duration:id==='refund'?stage.introTicks:story.STATION_LAST_FRAME,checkpoints:checkpoints(introBeats[id]||[])});
  add(id,'results','clear','Victory and score tally','result',id==='train'?trainScene('clear'):indiaScene(id,'clear'),{duration:600,checkpoints:resultBeats});
  for(const rank of ['B','A','S'])add(id,'results',`grade-${rank}`,`Grade ${rank} example`,'result',()=>{
   if(id==='train')game.trainScene('clear',0);else game.indiaScene(id,'clear',0);
   const samples={B:{combo:2,parries:0,families:['strike'],damageTaken:500,knockouts:30,retries:4},A:{combo:8,parries:2,families:['strike','grab','finisher'],damageTaken:100,knockouts:20,retries:0},S:{combo:12,parries:0,families:['strike','grab','finisher','launcher','super'],damageTaken:300,knockouts:60,retries:0}};
   G.clearStats.grading={version:1,...samples[rank]};G.results=null;
  },{duration:600,checkpoints:resultBeats});
 }
 const trainCinematics=[['train-arrival','Train arrives',300],['boarding','Climb aboard',120],['conductor','Conductor introduction',300],['inspector-finish','Conductor: fare paid',342],['neta-intro','Netaji and Shera introduction',300],['roof-transition','Shera finisher · Netaji flees',train.ROOF_TRANSITION_TICKS+84],['shera-finish','Shera finisher · brutal KO',(train.SHERA_FINISH_TICKS||train.ROOF_TRANSITION_TICKS)+84],['knockout','Netaji rooftop knockout',226],['escape','Delhi station explosive finale',finale.FINALE_TICKS]];
 for(const [name,label,duration]of trainCinematics)add('train','cinematics',name,label,'cinematic',trainScene(name),{duration,checkpoints:name==='roof-transition'?retreatBeats:name==='escape'?checkpoints([[0,'Tracking arrival'],[179,'Before braking'],[184,'Brace'],[290,'Glance'],[330,'Dash to Netaji'],[350,'Plant charge'],[387,'Charge armed'],[454,'Coil'],[465,'Takeoff'],[480,'Hurdle apex'],[500,'Drop to platform'],[510,'Touchdown'],[521,'Roll'],[556,'Rise'],[600,'Remote'],[715,'Detonate · Netaji stirs'],[742,'Light cigar'],[finale.NETA_BURST,'Netaji explodes'],[810,'Pieces land'],...finale.FINALE_BLASTS.map((b,i)=>[b.tick,`Major blast ${i+1}`]),[830,'Cigar strut'],[912,'Hold'],[1259,'Before victory']]):name==='inspector-finish'?checkpoints([[0,'Fade'],[12,'Black'],[30,'Reveal · tie grab'],[40,'Yank'],[52,'Pluck bribe'],[76,'Stuff it back'],[86,'Suck it down'],[102,'Super charge'],[134,'Haymaker freeze'],[138,'Slow-mo launch'],[180,'Desk explodes'],[192,'Slumped'],[196,'Shades'],[228,'Cigar · money rain'],[341,'Return']]):name==='knockout'?checkpoints([[0,'Fade'],[12,'Black'],[30,'Barrage'],[60,'Charge'],[70,'Uppercut freeze'],[94,'Out of frame'],[102,'Ragnarok charge'],[116,'Ragnarok freeze'],[134,'Roof slam'],[146,'Victory flex'],[150,'Game over'],[225,'Arrival handoff']]):checkpoints(trainEntryBeats[name]||[])});
 // Night Train fights: one start per boss phase, straight into the fight.
 add('train','fights','conductor-fight','Head Conductor','fight',()=>game.trainScene('conductor',300),{duration:18000});
 // Shera: phase 1 plays the carriage introduction into the fight; phase 2 starts UNPAID at 45% with Netaji gone.
 add('train','fights','boss','Shera · phase 1 (introduction)','fight',trainScene('neta-intro'),{duration:18000});
 add('train','fights','boss-enraged','Shera · phase 2 (UNPAID)','fight',trainScene('boss-enraged'),{duration:18000});
 for(const [scene,label]of [['roof-guards','Rooftop commandos · Netaji waits'],['boss-roof','Netaji · rooftop']])add('train','fights',scene,label,'fight',trainScene(scene),{duration:18000});
 const roofReviewBeats=[[0,'shot','Revolver aim and recoil'],[108,'swing','Briefcase swing'],[216,'grit','Grit throw'],[324,'shove','Forearm shove and hop'],[432,'bribe','Begging fake-out'],[672,'reload','Reload fumble'],[780,'cower','Cornered: cowers under the briefcase'],[900,'flee','Flight: runs, looks back, trips'],[1080,'beg','Cornered in flight: begs, then pocket sand']];
 add('train','fights','roof-animation-review','Netaji · rooftop animation review','pattern',trainScene('boss-roof'),{
  duration:1260,description:'Every rooftop action in sequence, using its actual combat timing. CHAD is invulnerable for inspection.',
  checkpoints:checkpoints(roofReviewBeats.map(([tick,,label])=>[tick,label])),
  beforeStep(t){
   const b=G.boss,p=G.player;if(!b)return;p.invuln=9999;p.invulnFlashAfter=G.time+3;
   const beat=roofReviewBeats.find(([tick])=>tick===t%1260);if(!beat)return;
   Object.assign(b,{trainWaiting:false,state:'idle',t:0,atkCd:999,x:G.camX+300,y:218,face:-1,guardFlash:0,flinchT:0,z:0,vz:0,hitLanded:false});
   Object.assign(p,{x:b.x-(beat[1]==='shot'?140:70),y:b.y,z:0,vz:0,state:'idle',t:0,face:1});
   G.shots=[];b.delhi.demo(b,beat[1]);
  }
 });
 for(const [id,list]of Object.entries(bossIntros))for(const [name,label,duration,beats]of list)add(id,'cinematics',name,label,'cinematic',indiaScene(id,name),{duration:name==='closer-intro'?closerIntro.CLOSER_INTRO_TICKS:duration,checkpoints:checkpoints(name==='closer-intro'?closerIntro.CLOSER_INTRO_BEATS:beats)});
 for(const id of ['delhi','refund'])for(const name of id==='delhi'?['vendor','dredger']:['closer']){
  add(id,'fights',name,`${title(name)} — full fight`,'fight',indiaScene(id,name),{duration:18000});
  const key=`${name}-finish`;add(id,'cinematics',key,({vendor:'Puri pop · kitchen destruction',dredger:'Stuck to his own magnet',closer:'Account closed'})[name],'cinematic',indiaScene(id,key),{duration:finishDurations[key]??cinematics.INDIA_FINISHERS[key].ticks,checkpoints:checkpoints(finishBeats[key])});
 }
 add('delhi','fights','vendor/furnace','Vendor · Final form — full fight','fight',async()=>{
  await bossBase('delhi','vendor');const b=G.boss,p=G.player;
  Object.assign(b,{phase:3,phaseTwo:true,enraged:true,lastOrder:true,inferno:true,mutated:true,hp:Math.round(b.maxhp*.55),maxGuard:4,guard:4,state:'idle',t:0,atkCd:30,turn:0,lastPick:null,spawnT:G.rawTime-999});
  Object.assign(b.kadai,{drained:true,smashed:true,stoveDestroyed:true,broken:true,smashX:b.kadai.x+12,smashY:b.kadai.y});
  p.x=G.camLock+95;b.x=G.camLock+325;p.y=b.y=226;b.face=-1;
 },{duration:18000,description:'Fight the enlarged final form at 55% health. Parry the charged hammer fist, jump the ground smash, and jump onto the randomly dropped chopping block to escape the street-wide inferno. Punish his planted recovery.'});
 // Each preset initializes an actual boss, then changes only its review state.
 async function bossBase(id,scene){if(id==='train'){game.trainScene(scene==='conductor'?'conductor':scene,0);if(scene==='conductor')game.step(300);}else game.indiaScene(id,scene,0);G.hitstop=0;G.state='play';}
 const patterns=[['train','conductor',['stamp','seize','swing','brake','void','box','count','guardbreak']],['train','boss',['pound','bullrush','quake','count','paid','guardbreak','damaged']],['train','boss-roof',['shot','swing','grit','shove','bribe','reload','cower','flee','beg','guardbreak']],['delhi','vendor',['string','scoop','spicy-scoop','bump','rage','breath','flop','lastorder','lick','p3:forearm','p3:cleaver','p3:breath','crush','guardbreak']],['delhi','dredger',['grabswing','grabdrop','grabscoop','grabdump','return','blowout','operator','op:wrenchcombo','op:sack','op:grabcall','op:ladder','cutloose','mag:yank','mag:pull','mag:scrap','mag:shorted','op:crewcall','op:hook','hook:fling','hook:slam','hook:magnet','hook:sweep','damaged']],['refund','closer',['boxing','handset','deal','call','guardbreak','damaged','phase-break','boxing-phase2','handset-phase2','deal-phase2']]];
 const closerNames={boxing:'Two jabs into green overhand',handset:'Reflectable wine-red handset',deal:'False handshake (red: evade, punish the stumble)',call:'Interruptible escalation call','phase-break':'Half health · gloves off','boxing-phase2':'Phase two · jab, body shot, green cross','handset-phase2':'Phase two · two handsets and reload','deal-phase2':'Phase two · handshake grab (red: leave his lane)'};
 const netaNames={pound:'Hook string into hammer (parry)',bullrush:'Bull rush (unblockable)',quake:'Leap quake (unblockable)',count:'Counts his pay: punish',shot:'Revolver shot',paid:'Netaji bonus hand-off: PAID (hit to deny)',catch:'Palm catch into headbutt',hug:'Bear hug (red grab: jump or change lane)',chain:'Chain sweep (jump only)',hurl:'Luggage hurl (parry it back)',abandon:'Netaji fires Shera and leaves: UNPAID',enraged:'Shera UNPAID',guardbreak:'Protected guard break',damaged:'Broken arena props',swing:'Briefcase swing (parry)',grit:'Thrown grit',shove:'Shove',bribe:'Begging bribe fake-out',reload:'Empty revolver: reload',cower:'Cornered: cowers under the briefcase (break it)',flee:'Flight: runs, looks back, trips',beg:'Cornered in flight: begs, then pocket sand'};
 const dredgerNames={'op:wrenchcombo':'Wrench string (parry the overhead: STUCK)','op:sack':'Sand sack (reflect it: blinded)','op:grabcall':'BUCKET! · lure the grab onto him','op:ladder':'Ladder scramble · knock him off',cutloose:'Cut loose · magnet phase change','mag:pull':'Magnet pull and slam','mag:yank':'Scrap yank · fling a crewman (parry: SHORT)','mag:scrap':'Scrap drop','mag:shorted':'Short circuit · open','op:crewcall':'Crew call · double shift','op:hook':'Hook transition · CONTRACT TERMINATED','hook:fling':'Hook fling (parry: TANGLED)','hook:slam':'Hook slam · stuck in the deck','hook:magnet':'MAGNET! · radios the dead magnet down on CHAD','hook:sweep':'Hook sweep (jump it)'};
 const patternNames={lick:'Licking taunt (CHAD down)',reach:'Committed grab',lastorder:'Defeat fake-out · crawl, feast and transform','p3:forearm':'Charged hammer fist · parry the crushing blow','p3:cleaver':'Furnace smash · jump and punish','p3:naan':'Last order: triple naan','p3:scoop':'Last order: two oil volleys','p3:breath':'Street inferno · jump onto raised cover','p3:flop':'Last order: double belly flop',bump:'Belly bump (parry, or take the shove)','p3:bump':'Last order: belly bump into a flop',crush:'Guard crush bump (answer to turtling)',string:'Skimmer string',naan:'Naan throw',scoop:'Hot-oil lob','spicy-scoop':'Extra spicy · single oversized oil bomb',breath:'Chilli fire breath',clip:'Ticket-clipper combo',toss:'Suitcase throw',shoulder:'Shoulder charge',leap:'Leap slam',whistle:'Whistle for backup',taunt:'Count the bribe',stamp:'DENIED stamp',seize:'SEIZED meter stamp',swing:'Cash-box swing (unblockable)',brake:'Emergency chain and sliding luggage',void:'Parried stamp: VOID stun',box:'Loose cash box: refund and dive',count:'Count the bribe',guardbreak:'Protected guard break',damaged:'Broken arena props',rage:'Chilli feast at half health',flop:'Belly flop',operator:'Thekedar leaps down',ladder:'Ladder scramble',runaway:'Runaway grab sweep',blowout:'Cab blowout · phase change',grabswing:'Pendulum swing',grabdrop:'Grab drop',grabscoop:'Deck scoop',grabdump:'Sludge dump',return:'Return to sender',wrenchcombo:'Wrench string',sack:'Sand sack',grabcall:'Walkie grab call',crewcall:'Crew call'};
 for(const [id,scene,values]of patterns.filter(([id])=>id!=='train'))for(const value of values)add(id,'fights',`${scene}/${value.replaceAll(':','-')}`,`${scene==='boss'?'Shera and Netaji':scene==='boss-roof'?'Netaji rooftop':title(scene)} · ${(id==='refund'?(closerNames[value]||patternNames[value]):id==='train'&&scene.startsWith('boss')?netaNames[value]:scene==='dredger'?dredgerNames[value]||patternNames[value]:patternNames[value])||title(value.replace(':',' '))}`,'pattern',async()=>{
  await bossBase(id,scene);const b=G.boss,p=G.player;if(!b)return;
  if(b.key==='closer'&&value==='phase-break'){b.hp=b.maxhp*.5;b.phasePending=true;b.state='idle';b.t=0;return;}
  if(b.key==='closer'&&value.endsWith('-phase2')){const {SPR}=await imp('js/sprites.js');b.hp=b.maxhp*.5;b.phaseTwo=b.enraged=true;b.set=SPR.ic_closer_damaged;}
  if(value==='guardbreak'){if(b.key==='vendor')b.spawnT=G.rawTime-999;b.breakGuard();return;} // no entrance banner over the preview
  if(value==='taunt'){b.state='taunt';b.t=0;p.state='down';p.t=0;return;}
  if(value==='lick'){b.face=p.x<b.x?-1:1;b.state='taunt';b.t=0;b.taunted=true;p.state='down';p.t=0;return;}
  if(b.key==='conductor'){
   // The conductor's states as train_conductor.js starts them.
   b.face=p.x<b.x?-1:1;b.atkCd=999;b.t=0;b.hitLanded=false;
   if(value==='count'){b.state='count';p.state='down';p.t=0;return;}
   if(value==='box'){G.meter=0;b.boxMeter=b.seizedTotal=70;b.dropBox(b.face);b.state='recover';b.recoverFor=40;return;}
   if(value==='brake'){b.hp=b.maxhp*.45;b.p2Called=true;b.pattern='tochain';b.state='windup';return;}
   if(value==='void'){b.pattern='stamp';b.state='stamp';b.t=3;p.x=b.x+b.face*48;p.y=b.y;b.parried(0,-b.face);return;}
   if(value==='seize')G.meter=100;
   p.x=b.x+b.face*52;p.y=b.y;b.pattern=value;b.state='windup';return;
  }
  if(b.key==='neta'&&value!=='damaged'){b.delhi.demo(b,value);return;}
  if(value==='whistle'){b.hp=b.maxhp*.5;b.whistled=true;}
  if(value==='damaged'){for(const prop of b.fightProps||G.props.filter(p=>p.indiaBossProp))if(!prop.broken)prop.hurt?.(999,1,true,true);return;}
  if(value==='blowout'){Object.assign(b,{glass:0,operatorPending:true,state:'idle',t:0});return;}
  if(value==='cutloose'){Object.assign(b,{hp:b.magLine,magnetPending:true,state:'idle',t:0});return;}
  // The scrap magnet: its deck order is yank, pull, scrap.
  if(value.startsWith('mag:')){Object.assign(b,{rig:'magnet',hp:Math.round(b.magLine*.9),state:'idle',t:0,z:96,overload:0,atkCd:1,turn:['yank','pull','scrap'].indexOf(value.slice(4))});
   if(value==='mag:yank'){const {spawnEnemy}=await imp('js/enemies.js'),e=spawnEnemy('ic_docker',b.x+50,b.y);if(e){if(!G.enemies.includes(e))G.enemies.push(e);Object.assign(e,{state:'idle',t:0,atkCd:240,dredgerCrew:true});b.crewActors.push(e);}b.crewCd=999;p.x=b.x-150;}
   if(value==='mag:shorted'){b.z=80;b.delhi.onReflectHit(b,{kind:'hatch'});}return;}
  if((value==='operator'||value.startsWith('op:')||value.startsWith('hook:'))&&b.phase==='machine')b.delhi.operatorPhase(b);
  if(value==='op:hook'){Object.assign(b,{hp:Math.round(b.maxhp*.48),state:'idle',atkCd:1,x:G.camLock+240});p.x=G.camLock+150;return;}
  // The hook finale's deck order is fling, slam, magnet call, sweep.
  if(value.startsWith('hook:')){Object.assign(b,{hook:true,crewCalled:true,hp:Math.round(b.maxhp*.45),state:'idle',t:0,atkCd:1,turn:['fling','slam','magnet','sweep'].indexOf(value.slice(5)),x:G.camLock+260});Object.assign(b.grab,{state:'rest',t:0,rig:'magnet',z:150});p.x=b.x-110;p.y=b.y;p.invuln=0;return;}   // no handoff blink over the demonstration
  b.protectedStagger=0;b.t=0;b.face=p.x<b.x?-1:1;b.attackFace=b.face;b.hitLanded=false;b.attackLane=b.y;
  if(b.key==='closer'&&(value==='deal'||value==='deal-phase2')){p.x=b.x-66;p.y=b.y;b.face=b.attackFace=-1;}
  if(value==='operator'){Object.assign(b,{state:'leap',x:b.from[0],z:b.from[1]});return;}
  b.pattern=value.replace('op:','').replace('-phase2','');b.state='windup';
  if(b.key==='dredger'){
   // The machine's pattern states, as delhi_dredger.js starts them; the Thekedar's from his idle.
   const mid=G.camLock+240;b.lockY=p.y;
   if(value==='grabswing'){b.dir=p.x<mid?-1:1;b.state='swingwind';}
   if(value==='grabdrop')b.state='dropaim';
   if(value==='grabscoop'){b.dir=p.x<b.x?-1:1;b.state='scoopaim';}
   if(value==='grabdump')b.state='dumpaim';
   if(value==='return'){Object.assign(b,{pattern:'grabswing',state:'swing',dir:1,t:10,z:20});b.parried(0,1);}
   if(value==='op:grabcall')b.state='call';
   if(value==='op:crewcall')b.state='crewcall';
   if(value==='op:ladder'){b.pattern='ladder';b.state='scurry';}
  }else if(scene==='vendor'){
   // Phase-two moves need the post-rage vocabulary, p3: ones the last order's; the scoop walks to the kadai.
   const move=value==='crush'?'bump':value==='spicy-scoop'?'scoop':value.replace('p3:',''),phase=value.startsWith('p3:')||value==='lastorder'?3:['breath','flop'].includes(move)||value==='spicy-scoop'?2:1;
   if(phase>1){if(phase===2)b.hp=Math.round(b.maxhp*.7);b.phaseTwo=b.enraged=true;b.phase=phase;b.lastOrder=phase===3;if(phase===3){b.hp=Math.round(b.maxhp*.55);b.maxGuard=b.guard=4;b.inferno=b.mutated=true;Object.assign(b.kadai,{drained:true,smashed:true,stoveDestroyed:true,broken:true,smashX:b.kadai.x+12,smashY:b.kadai.y});}b.kadai.hp=2;}
   b.protectedStagger=0;b.pattern=move;b.state='windup';b.t=0;b.lastPick=move;
   // A forced pattern starts mid-fight: no entrance banner over the move (or over a phase stinger).
   b.spawnT=G.rawTime-999;
   if(move==='flop')b.flopChain=phase===3?1:0;
   // The bump starts a belly's front (42) plus 20 off CHAD: the wind-up's planted sandal never overlaps him.
   if(move==='forearm'||move==='cleaver'){p.x=b.x+b.face*110;p.y=b.y;}
   if(move==='bump'){p.x=b.x+b.face*62;p.y=b.y;b.queued=phase===3?'flop':'scoop';}
   if(value==='crush'){b.crush=true;b.turtle=0;p.state='parry';} // a CHAD sat in his guard
   if(value==='rage'){b.hp=Math.floor(b.maxhp*.5);b.state='rage';}
   if(value==='lastorder'){p.invuln=99999;p.invulnFlashAfter=G.time+99999;b.phase=2;b.lastOrder=false;b.maxGuard=b.guard=3;b.hp=Math.floor(b.maxhp*.3);b.inferno=b.mutated=false;Object.assign(b.kadai,{drained:false,smashed:false,broken:false});b.state='fakeout';b.face=b.kadai.x>b.x?1:-1;}
   if(move==='scoop')b.state='setup-scoop';
  }
 },{duration:600,description:scene==='vendor'&&value==='p3:forearm'?'Parry the green forearm strike, or evade its committed drive. Punish the recoil.':scene==='vendor'&&value==='p3:cleaver'?'Jump the red skimmer smash and its floor shockwave. Punish Pappu while he wrenches the tool free.':scene==='vendor'&&value==='lastorder'?'At 30% health Pappu falls, crawls to the pot and devours it. His health grows back to 55% as his body transforms, then he destroys the stove.':undefined,checkpoints:checkpoints(scene==='vendor'&&value==='p3:forearm'?[[0,'Plant'],[14,'Coil'],[18,'Green warning'],[34,'Drive'],[42,'Contact'],[58,'Retract'],[68,'Punish window']]:scene==='vendor'&&value==='p3:cleaver'?[[0,'Grip'],[12,'Raise'],[24,'Overhead'],[25,'Red warning'],[49,'Smash · jump'],[63,'Tool stuck · punish'],[88,'Wrench free'],[100,'Recover']]:scene==='vendor'&&value==='lastorder'?[[0,'Defeat fake-out'],[24,'Collapsed'],[66,'Crawl to the pot'],[112,'Reach'],[120,'Rise'],[144,'Grip the cauldron'],[162,'First sip'],[188,'Health grows · body swells'],[212,'Devour and recover'],[240,'Full growth · red warning'],[258,'Smash pot and stove'],[302,'Final mutation'],[318,'Roar'],[356,'Reach for skimmer'],[362,'Grip at the ground'],[368,'Rise with skimmer'],[374,'Final guard'],[380,'Final phase · 55% HP']]:[[0,'Preparation'],[30,'Windup'],[60,'Contact / action'],[90,'Follow-through'],[150,'Recovery']])});
 // Shared combat tests (supers, knockouts): listed once, in Delhi; they behave the same in every level.
 for(const id of ['delhi']){
  const base=()=>{id==='train'?game.trainScene('general',0):game.indiaScene(id,id==='delhi'?'bazaar':'calling',0);if(id==='delhi')G.india.bullDone=true;};   // delhi/fights/bull is the bull's own review
  for(const variant of [0,1])for(const target of ['survive','lethal','guarded','open'])add(id,'fights',`super-${variant}-${target}`,`${variant?'Electric rising fist':'Rapid barrage'} · ${{survive:'surviving enemy',lethal:'lethal enemy',guarded:'guarded boss',open:'open boss'}[target]}`,'pattern',async()=>{
   if(['guarded','open'].includes(target))await bossBase(id,id==='train'?'conductor':id==='delhi'?'vendor':'closer');else base();
   const p=G.player;G.enemies=[];G.shots=[];G.effects=[];G.hitstop=0;G.meter=100;
   Object.assign(p,{face:1,state:'idle',z:0,invuln:0});
   if(['survive','lethal'].includes(target)){G.boss=null;const e=game.spawn(id==='train'?'nr_brawler':id==='delhi'?'ic_brawler':'ic_headset',46,0);e.hp=target==='lethal'?1:200;e.state='idle';e.poise=0;}
   else{const b=G.boss;b.state='idle';b.protectedStagger=0;b.hp=Math.max(200,b.hp);b.guard=target==='guarded'?3:0;p.x=b.x-40;p.y=b.y;b.spawnT=G.rawTime-999;}   // mid-fight: no entrance banner (a real run's reveal outlasts it)
   // The runtime selector is read at activation; set the upcoming selection first.
   p.lastSuperMove=variant===0?1:0;combat.startSuper(p);
  },{duration:180,checkpoints:checkpoints([[0,'Activation'],...(target==='guarded'?[[24,'Body contact'],[43,'Second contact'],[62,'Guard break impact'],[85,'Release']]:combat.SUPER_MOVES[variant].hits.map((h,i)=>[h.at+i*3,h.finish?'Finishing impact':'Punch contact'])),[target==='guarded'?85:100+(combat.SUPER_MOVES[variant].hits.length-1)*3+(target==='lethal'?9:7),'Performance complete'],[150,'Landing / recovery'],[179,'Settled']])});
  for(const effect of ['daze','ko','heavy-ko','launch-ko','crowd-ko'])add(id,'fights',`effect-${effect}`,({daze:'Protected daze and orbiting stars',ko:'Ordinary knockout','heavy-ko':'Heavy knockout','launch-ko':'Launched knockout','crowd-ko':'Crowded defeat effects'})[effect],'pattern',()=>{
   base();G.boss=null;G.enemies=[];G.shots=[];G.effects=[];
   for(let i=0;i<(effect==='crowd-ko'?5:1);i++){const e=game.spawn(id==='train'?'nr_brawler':id==='delhi'?'ic_brawler':'ic_headset',50+i*27,i%2*5);e.state='idle';e.poise=0;
    if(effect==='daze'){e.state='stagger';e.protectedStagger=90;e.dazeT=0;}else{e.hp=1;e.hurt(30,1,effect!=='ko',effect==='launch-ko');}}
  },{duration:240});
 }
 // One family against CHAD in his own carriage: the berth thief in the sleeper, the captain in the private car.
 for(const [kind,label]of [['nr_brawler','Sleeper-class brawler'],['nr_chai','Chai wallah'],['nr_paan','Paan uncle'],['nr_tte','TTE'],['nr_rack','Top-bunk thief'],['nr_commando','Black-cat commando'],['nr_captain','Commando captain']])add('train','duels',`duel-${kind.slice(3)}`,`1v1 · ${label}`,'fight',()=>{
  game.trainScene(kind==='nr_rack'?'sleeper':kind==='nr_captain'?'private':kind==='nr_commando'?'ac':'general',0);G.boss=null;G.enemies=[];G.shots=[];G.effects=[];G.pickups=[];G.locked=true;G.camLock=G.camX;
  if(kind==='nr_captain')G.props=[];   // the private car's side table would stand in front of the duel
  Object.assign(G.player,{x:G.camX+110,y:226,face:1});
  if(false)G.pickups.push({x:G.camX+250,y:232,kind:'shake',heal:30,t:0});
  const e=game.spawn(kind,kind==='nr_rack'?150:200,0);e.state=e.perched?'perch':'idle';e.atkCd=20;
 },{duration:3600});
 // Dirty Delhi's six families, one at a time; the snatcher has meter to steal, the crew fight at the culvert.
 for(const [kind,label]of [['ic_brawler','Tout'],['ic_runner','Snatcher'],['ic_enforcer','Cricketer'],['ic_heavy','Thela-wallah'],['ic_kitchen','Dhaba cook'],['ic_docker','Dock crew']])add('delhi','duels',`duel-${kind.slice(3)}`,`1v1 · ${label}`,'fight',()=>{
  game.indiaScene('delhi',kind==='ic_docker'?'culvert':'market',0);G.boss=null;G.enemies=[];G.shots=[];G.effects=[];G.pickups=[];G.locked=true;G.camLock=G.camX;
  Object.assign(G.player,{x:G.camX+110,y:230,face:1});G.meter=kind==='ic_runner'?60:0;G.waveActive=kind==='ic_runner';G.india.bullDone=true;  // an escaped snatcher re-enters; no bull crossing mid-duel
  const e=game.spawn(kind,200,0);e.state='idle';e.atkCd=20;
 },{duration:3600});
 // Refund's six workers fight alone in the part of the tower where their job belongs.
 // Clear route props before spawning: the recovery agent creates his own cabinet rig.
 for(const [kind,label,area]of [['ic_headset','Headset caller','office'],['ic_operator','Night-shift operator','annex'],['ic_thrower','IT equipment thrower','calling'],['ic_security','Security enforcer','servers'],['ic_cabinet','Recovery agent','records'],['ic_lead','Team lead','executive']])add('refund','duels',`duel-${kind.slice(3)}`,`1v1 · ${label}`,'fight',()=>{
  game.indiaScene('refund',area,0);G.boss=null;G.enemies=[];G.props=[];G.spawnQueue=[];G.shots=[];G.effects=[];G.pickups=[];G.locked=true;G.camLock=G.camX;G.waveActive=false;
  Object.assign(G.player,{x:G.camX+110,y:230,face:1});
  const e=game.spawn(kind,200,0);e.state='idle';e.atkCd=20;
 },{duration:3600});
 // The families against the street: a cart rammed into a stall, a cook beside the boiler, a crewman at the cargo.
 const delhiSetpiece=async(scene,camX)=>{
  game.indiaScene('delhi',scene,0);Object.assign(G,{boss:null,enemies:[],shots:[],effects:[],pickups:[],locked:true,camX,camLock:camX});G.india.bullDone=true;
  const env=await imp('js/india_environment.js');env.initIndiaEnvironment();for(const n of G.india.environment.nodes)n.demoDone=true;
 };
 add('delhi','fights','cart-ram-stall','Thela-wallah · cart ram into stall','pattern',async()=>{
  await delhiSetpiece('bazaar',1180);Object.assign(G.player,{x:1410,y:238,face:-1});
  const e=game.spawn('ic_heavy',1350-G.player.x,219-G.player.y);Object.assign(e,{x:1350,y:219,face:1,state:'windup',t:0,move:'cram',cls:'unblockable',wind:34,atkCd:999});
 },{duration:600,checkpoints:checkpoints([[0,'Red windup'],[34,'Ram'],[70,'Stall impact · stuck'],[130,'Recovery']])});
 add('delhi','fights','cook-boiler','Dhaba cook · beside the steam boiler','fight',async()=>{
  await delhiSetpiece('food',1620);G.waveActive=true;Object.assign(G.player,{x:1790,y:222,face:1});
  const e=game.spawn('ic_kitchen',1880-G.player.x,0);e.state='idle';e.atkCd=20;
 },{duration:1800});
 add('delhi','fights','crew-chock','Dock crew · breakable cargo','fight',async()=>{
  await delhiSetpiece('ghat',4050);Object.assign(G.player,{x:4330,y:223,face:-1});
  const e=game.spawn('ic_docker',4262-G.player.x,0);e.state='idle';e.atkCd=200;
 },{duration:1800});
 for(const [kind,label] of [['nr_brawler','Brawler'],['nr_chai','Chai wallah'],['nr_paan','Paan uncle'],['nr_tte','TTE'],['nr_rack','Top-bunk thief'],['nr_commando','Commando'],['nr_captain','Captain']])add('train','duels',`daze-${kind}`,`${label} · recoil and dazed recovery`,'pattern',()=>{
  game.trainScene('general',0);G.boss=null;G.enemies=[];G.props=[];G.shots=[];G.effects=[];
  const e=game.spawn(kind,65,0);e.state='stagger';e.protectedStagger=90;e.dazeT=0;e.flash=4;e.poise=0;
 },{duration:120,checkpoints:checkpoints([[0,'Impact recoil'],[8,'Winded'],[18,'Unsteady guard'],[40,'Dazed hold'],[82,'Recovery pose'],[90,'Control restored']])});
 // Delhi's wildlife: a control on each street area rather than a second copy of it.
 for(const item of list.filter(s=>s.section==='delhi'&&s.kind==='area')){item.actions={...item.actions,flee:()=>{ambient.scareDelhiAmbient(G.camX+260,220);ambient.updateDelhiAmbient();}};item.controls.push({id:'flee',label:'Disturb nearby wildlife',type:'action'});}
 // Scripted motion is exposed as ordinary input so the replay log remains exact.
 // The guard crush needs a CHAD sitting in his held guard (the parry button down) when the bump lands.
 {const crush=list.find(s=>s.id==='delhi/vendor/crush');if(crush)crush.scriptedInput=()=>['parry'];}
 for(const item of list.filter(s=>s.section==='trip'&&['trip/elevator','trip/lobby','trip/curb','trip/apron','trip/arrival-exit'].includes(s.id))){
  item.controls.push({id:'motion',label:'CHAD movement',type:'select',options:[{value:'idle',label:'Manual / standing'},{value:'walk',label:'Walk back and forth'},{value:'left',label:'Walk left'},{value:'right',label:'Walk right'}]});
  item.scriptedInput=(tick,settings={})=>settings.motion==='walk'?[Math.floor(tick/150)%2?'left':'right']:['left','right'].includes(settings.motion)?[settings.motion]:[];
  // The penthouse and lobby are one walkable room each; staff beats are checkpoints, not separate areas.
  if(item.id==='trip/lobby')item.checkpoints=checkpoints([[60,'Barman polishes a glass'],[275,'Receptionist turns a page'],[430,'Barman pours'],[450,'Receptionist stamps the ledger'],[755,'Barman shakes a cocktail'],[1050,'Barman serves'],[1200,'Barman moves along the bar']]);
 }
 const papers=list.find(s=>s.id==='trip/papers');if(papers)papers.checkpoints=checkpoints([[0,'Papers'],[44,'Processing fee'],[146,'CHAD approaches'],[204,'Fury / lunge bark'],[222,'Full lunge / ready'],[230,'Catch (freeze)'],[246,'Pivot'],[252,'Head over heels'],[258,'Over the top'],[266,'Release'],[276,'Watch'],[300,'Dust off'],[340,'Light up'],[348,'Twinkle'],[376,'Too easy'],[459,'Handoff to exit']]);
 // Keep IDs stable and reject accidental duplicates instead of hiding entries.
 const tripOrder=['penthouse','door','waiting','elevator','arrival','lobby','exit','curb','car-board','drive','apron-arrival','apron','jet-board','takeoff','flight','india-approach','landing','disembark','papers','arrival-exit'];
 // Grouping is performed by the shell; preserve route order within every group.
 list.sort((a,b)=>a.section==='trip'&&b.section==='trip'?tripOrder.indexOf(a.id.slice(5))-tripOrder.indexOf(b.id.slice(5)):0);
 const seen=new Set();for(const item of list){if(seen.has(item.id))throw new Error(`Duplicate review scenario: ${item.id}`);seen.add(item.id);item.checkpoints=item.checkpoints.filter(c=>c.tick<=item.duration).sort((a,b)=>a.tick-b.tick);}
 return list;
}
