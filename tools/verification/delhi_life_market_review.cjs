// Filmstrips of the fixed Delhi stall workers at 2x, one capture every few ticks, plus a threat test
// (an enemy attacking beside the kebab cook). Writes tmp/review/delhi_life_market/film/*.png and
// film.json (crop boxes); tools/verification/delhi_life_market_sheet.py --film stitches them.
// NODE_PATH=~/.cache/gachi-pw/node_modules node tools/verification/delhi_life_market_review.cjs
const fs=require('fs'),studio=require('./studio_helper.cjs');
const out='tmp/review/delhi_life_market/film';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const {page,errors,close}=await studio.launch();
 await studio.openStudio(page,'delhi/market');
 await studio.game(page,(g,G)=>{G.enemies=[];G.india.bullDone=true;G.player.x=60;});
 const shots=[];
 const snap=async(name,i,cx)=>{await studio.game(page,(g,G,c)=>{G.camX=G.camLock=c;G.player.x=c-200;},cx);
  const f=`${out}/${name}_${String(i).padStart(2,'0')}.png`;await studio.capture(page,f,2);return f;};
 for(const [name,x,top]of [['fruit',652,110],['elec',1262,125],['cloth',1012,110],['chai',1596,110],['kebab',1784,105],['stirrer',2080,110]]){
  for(let i=0;i<20;i++){const cx=x-240;shots.push({name,file:await snap(name,i,cx),box:[180,top-6,120,100]});await studio.step(page,9);}
 }
 // Threat: a tout attacks next to the kebab stall; the cook startles and cowers, then resumes.
 await studio.game(page,(g,G)=>{const e=g.spawn('ic_brawler',30,0);e.x=1792;e.y=224;e.state='attack';e.t=0;});
 for(let i=0;i<12;i++){const cx=1784-240;shots.push({name:'threat',file:await snap('threat',i,cx),box:[180,99,120,100]});
  await studio.game(page,(g,G,i)=>{for(const e of G.enemies)if(i<5)e.state='attack';else{e.dead=true;}},i);await studio.step(page,12);}
 fs.writeFileSync(out+'/film.json',JSON.stringify(shots));
 console.log('shots',shots.length,'errors',errors.slice(0,5));await close();
})();
