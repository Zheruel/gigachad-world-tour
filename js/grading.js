import {G,clamp} from './engine.js';
export const newGrade=()=>({version:1,combo:0,parries:0,families:[],damageTaken:0,knockouts:0,retries:0});
export function snapshotGrade(){return G.grading?{...G.grading,families:[...G.grading.families]}:null;}
export function restoreGrade(saved){const retries=(G.grading?.retries||0)+1;G.grading=saved?{...saved,families:[...saved.families],retries}:{...newGrade(),retries};}
export function gradeDamage(amount){if(G.grading)G.grading.damageTaken+=Math.max(0,amount);}
export function gradeFamily(family){if(G.grading&&!G.grading.families.includes(family))G.grading.families.push(family);}
export function evaluateGrade(stats){
 const s=stats?.grading||stats;
 const complete=s?.version===1&&['combo','parries','damageTaken','knockouts','retries'].every(k=>Number.isFinite(s[k])&&s[k]>=0)&&Array.isArray(s.families);
 const components={completion:60,combo:0,parries:0,variety:0,clean:0,retries:0};
 if(complete){components.combo=15*clamp(s.combo/12,0,1);components.parries=10*clamp(s.parries/5,0,1);components.variety=3*Math.min(5,new Set(s.families).size);components.clean=10*clamp(1-s.damageTaken/(10*Math.max(1,s.knockouts)),0,1);components.retries=-Math.min(6,2*s.retries);}
 const rating=clamp(Object.values(components).reduce((a,b)=>a+b,0),60,100);
 return {rank:rating>=90?'S':rating>=75?'A':'B',rating,components};
}
