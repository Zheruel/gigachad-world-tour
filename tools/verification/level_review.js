import { LEVEL_CARDS,drawLevelCard } from '../../js/level_card.js';
import { loadDisplayType } from '../../js/display_type.js';
await loadDisplayType();
const $=id=>document.getElementById(id),art={},stage=$('stage');
let selected=LEVEL_CARDS.find(c=>c.id===new URLSearchParams(location.search).get('option'))||LEVEL_CARDS[3];
await Promise.all(LEVEL_CARDS.map(c=>new Promise(resolve=>{
 const im=new Image();im.onload=()=>{art[c.id]=im;resolve();};im.onerror=resolve;im.src='/'+c.path;
})));
function draw(canvas,choice,main=false){const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);drawLevelCard(ctx,art[choice.id],{ready:main?$('ready').checked:true,ui:main?$('ui').checked:true});}
function refresh(){draw(stage,selected,true);for(const c of LEVEL_CARDS){draw(c.canvas,c);c.button.setAttribute('aria-pressed',String(c===selected));}}
function select(c){selected=c;history.replaceState(null,'','?option='+c.id);$('name').textContent=c.name;$('description').textContent=c.description;stage.setAttribute('aria-label',c.name);refresh();}
for(const c of LEVEL_CARDS){const b=document.createElement('button');b.className='option';b.dataset.option=c.id;const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const name=document.createElement('strong');name.textContent=c.name;b.append(canvas,name);c.canvas=canvas;c.button=b;b.onclick=()=>select(c);$('options').append(b);}
$('scale').onclick=()=>{$('scale').textContent=stage.classList.toggle('small')?'View at 2×':'View at 1×';};
for(const id of ['ui','ready'])$(id).onchange=refresh;
$('save').onclick=()=>{const a=document.createElement('a');a.href=stage.toDataURL();a.download='night-train-'+selected.id+'.png';a.click();};
select(selected);const missing=LEVEL_CARDS.filter(c=>!art[c.id]);$('status').textContent=missing.length?'Unavailable artwork: '+missing.map(c=>c.name).join(', '):'All cards ready. Preview choices do not change your saved game.';
