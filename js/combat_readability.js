// A green warning gives 400 ms before the earliest contact at 60 Hz.
// This is anticipation time; the player's timed parry window stays unchanged.
export const GREEN_WARNING_TICKS = 24;
export const GREEN_FOLLOWUP = 6 + GREEN_WARNING_TICKS;
export const greenLead = contact => GREEN_WARNING_TICKS + 1 - contact;
export const greenWind = (wind, contact) => Math.max(wind, greenLead(contact));
export const greenCue = (state, t, wind, contact, last = contact) =>
  state === 'windup' ? t > wind - greenLead(contact) : t >= 0 && t <= last;
export const GREEN_CONTACT = Object.freeze({
  hook:4, dash:8, swing:5, lathi:8, punch:7, smash:6, hurl:4, lob:7,
  boxjab:3, fkick:6, bonk:5, tslam:2, pounce:11, lunge:7, bash:6,
  kick:3, drive:8, shove:6, barge:3, ladle:6, toss:7, wrench:6,
  rf_kick:5, rf_phone:7, rf_keyboard:7, rf_lathi:9, rf_jab:5, rf_punch:8,
});
