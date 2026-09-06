import { updateDialogue } from './room_dialogue.js';
import { audio } from './audio.js';
import { lobbyStaffAt, CONCIERGE_X } from './lobby_staff.js';
const SPEECH={
  concierge:['Your car is ready, sir.','Everything is in order. Enjoy your evening, sir.'],
  bartender:['The usual, sir?','Something strong for the road?'],
};
export function updateLobbyRoom(tr,interact=false) {
  if(tr.arriving||tr.exiting)return;
  tr.room ||= {};
  const bartender=lobbyStaffAt(tr.t).bartender,barX=bartender.x;
  for(const [role,x] of [['concierge',CONCIERGE_X],['bartender',barX]]) {
    const s=tr.room[role] ||= {near:false,last:-2000,count:0};
    const distance=Math.abs(tr.x-x),near=distance<(s.near?105:85),enter=near&&!s.near;
    s.near=near;
    if((enter||interact&&near)&&tr.t-s.last>1200) {
      s.text=SPEECH[role][s.count%2];s.count++;s.last=tr.t;
      if(role==='concierge') {if(!tr.greeted)tr.greetT=tr.t;tr.greeted=true;} else tr.barT=tr.t;
    }
    if(s.text)updateDialogue(s.text,tr.t-s.last,{remaining:300-(tr.t-s.last),visible:distance<220});
  }
  const t=tr.t%1500,c=tr.t%960;
  if(Math.abs(tr.x-barX)<190) {
    if(bartender.shakeBeat)audio.roomSfx('room_shaker',.95,(960-t)/60);
    if(t===405||t===1000)audio.roomSfx('room_glass',.48);
  }
  if(Math.abs(tr.x-CONCIERGE_X)<190 && tr.t-(tr.room.concierge?.last??-1000)>240) {
    if((c<240||c>=660&&c<840)&&c%40===0)audio.roomSfx('room_pen',.55);
    if(c===255||c===310)audio.roomSfx('room_page',.65);
    if(c===450)audio.roomSfx('room_stamp',.65);
  }
}
