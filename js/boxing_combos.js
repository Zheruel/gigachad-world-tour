// Each valid activation alternates performances without consuming combat RNG.
const make=(id,name,state,frames,hits,finish)=>({id,name,state,color:'#ff9b35',dur:100,frames,hits:hits.map(([at,dmg,pose,height],i)=>({at,dmg,pose,height,finish:i===hits.length-1})),finish});
export const BOXING_COMBOS=[
 make('boxing_barrage','RAPID BARRAGE','super_barrage',[[0,0],[5,1],[16,2],[20,3],[24,4],[27,5],[31,6],[34,7],[38,8],[41,9],[45,2],[48,3],[52,4],[55,5],[59,6],[62,7],[66,8],[69,9],[73,10],[77,11],[84,12],[89,13],[95,14],[99,15]],[[20,2,3,45],[27,2,5,66],[34,2,7,66],[41,2,9,45],[48,2,3,45],[55,2,5,66],[62,2,7,66],[69,2,9,45],[84,20,12,68]],'straight'),
 make('boxing_electric','ELECTRIC RISING FIST','super_electric',[[0,0],[6,1],[18,2],[26,3],[35,4],[43,5],[52,7],[64,8],[76,9],[81,10],[88,11],[94,12],[99,13]],[[26,8,3,45],[43,8,5,45],[76,20,9,68]],'upper'),
];
export function comboFor(p){return BOXING_COMBOS[p?.superMove||0]||BOXING_COMBOS[0];}
export function superCues(p){
 const c=comboFor(p);if(!p?.superGuarded)return c;
 return {...c,dur:72,frames:c.finish==='upper'?[[0,0],[6,1],[18,2],[24,3],[31,4],[40,5],[46,7],[51,8],[56,9],[61,10],[68,12]]:[[0,0],[6,1],[18,2],[24,3],[31,4],[40,5],[46,10],[51,11],[56,12],[61,13],[68,14]],hits:[{at:24,dmg:6,pose:3,height:45},{at:40,dmg:6,pose:5,height:45},{at:56,dmg:6,pose:c.finish==='upper'?9:12,height:72,finish:true}]};
}
export function chooseCombo(p){const n=p.lastSuperMove===0?1:0;p.superSerial=(p.superSerial||0)+1;p.lastSuperMove=n;return n;}
export function superPose(p,t=p.superT){const c=superCues(p);let idx=0;for(const [at,i]of c.frames)if(t>=at)idx=i;return {name:c.state,idx};}
