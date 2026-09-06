import { TITLE_VARIANTS,loadTitleMotion,drawTitleMotion,titleMotionAt } from '../../js/title_motion.js';
const $=id=>document.getElementById(id),stage=$('stage'),params=new URLSearchParams(location.search);
let selected=TITLE_VARIANTS.find(c=>c.id===params.get('option'))||TITLE_VARIANTS[0],motion=true,t=Number(params.get('t')??110),last=performance.now();
const art=await loadTitleMotion();
const missing=Object.entries(art).filter(([,v])=>!v).map(([k])=>k);
function draw(canvas,choice,time,main=false){
 const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/480,0,0,canvas.height/270,0,0);
 const images=main&&!$('hero').checked?{...art,[choice.id]:null}:art;
 return drawTitleMotion(ctx,images,choice.id,time,{ui:main?$('ui').checked:true,effects:main?$('effects').checked:true,background:main?$('background').value:undefined});
}
function refresh(){
 const pose=draw(stage,selected,t,true);$('timeline').value=Math.floor(pose.t);$('readout').textContent=`${Math.floor(pose.t)} / 599 · Pose ${pose.frame+1} · ${pose.action}`;
 for(const c of TITLE_VARIANTS)draw(c.canvas,c,t);
}
function select(c){selected=c;t=110;$('pose').value='';history.replaceState(null,'','?option='+c.id);$('name').textContent=c.name;$('description').textContent=c.description;stage.setAttribute('aria-label',c.name);for(const v of TITLE_VARIANTS)v.button.setAttribute('aria-pressed',String(v===c));refresh();}
for(const c of TITLE_VARIANTS){const button=document.createElement('button');button.className='option';button.dataset.option=c.id;button.innerHTML='<canvas width="960" height="540"></canvas><strong></strong><small></small>';button.querySelector('strong').textContent=c.name;button.querySelector('small').textContent=c.tag;c.button=button;c.canvas=button.querySelector('canvas');button.onclick=()=>select(c);$('options').append(button);}
for(let i=0;i<12;i++){const option=document.createElement('option');option.value=i;option.textContent=String(i+1);$('pose').append(option);}
const initial=t;select(selected);t=initial;refresh();$('status').textContent=missing.length?'Some layers are unavailable: '+missing.join(', '):'Both animations ready. Pause or scrub to inspect any frame.';
function pause(){motion=false;$('animate').textContent='Play';$('animate').setAttribute('aria-pressed','false');}
$('animate').onclick=()=>{if(motion)pause();else{motion=true;last=performance.now();$('animate').textContent='Pause';$('animate').setAttribute('aria-pressed','true');}};
$('timeline').oninput=()=>{pause();t=Number($('timeline').value);refresh();};
for(const button of document.querySelectorAll('[data-step]'))button.onclick=()=>{pause();t=(Math.floor(t)+Number(button.dataset.step)+600)%600;refresh();};
$('pose').onchange=()=>{if($('pose').value==='')return;pause();const frame=Number($('pose').value);for(let n=0;n<600;n++)if(titleMotionAt(selected.id,n).frame===frame){t=n;break;}refresh();};
for(const id of ['ui','effects','hero','background'])$(id).onchange=refresh;
$('scale').onclick=()=>{const small=stage.classList.toggle('small');$('scale').textContent=small?'View at 2×':'View at 1×';};
$('save').onclick=()=>{const a=document.createElement('a');a.href=stage.toDataURL();a.download=`gigachad-${selected.id}-${Math.floor(t)}.png`;a.click();};
function tick(now){if(motion){t=(t+Math.min(100,now-last)*.06)%600;refresh();}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
