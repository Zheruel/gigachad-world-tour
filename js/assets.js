// assets.js - loads game-ready PNGs at boot; each degrades to null if missing.
// NOTE: assets/ai/* are reference-only and are never loaded here.
import { RS } from './engine.js';

const FILES = {
  title_art: 'assets/title_art.png',
  ending_art: 'assets/ending_art.png',
  go_sign: 'assets/go_sign.png',
  portrait_chad: 'assets/portrait_chad.png',
  portrait_chad_48: 'assets/portrait_chad_48.png',
  portrait_mirchi: 'assets/portrait_mirchi.png',
  portrait_raja: 'assets/portrait_raja.png',
  portrait_refund: 'assets/portrait_refund.png',
  portrait_yadav: 'assets/portrait_yadav.png',
  portrait_rana: 'assets/portrait_rana.png',
  bg_lair_wall: 'assets/bg_lair_wall.png',
  bg_lair_floor: 'assets/bg_lair_floor.png',
  lair_worldmap: 'assets/lair/worldmap.png',
  lair_hifi: 'assets/lair/hifi.png',
  lair_map_panel: 'assets/lair/map_panel.png',
  bg_lair_sky_far: 'assets/bg_lair_sky_far.png',
  bg_lair_sky_near: 'assets/bg_lair_sky_near.png',
  lair_bar_stools: 'assets/lair/bar_stools.png',
  lair_humidor: 'assets/lair/humidor.png',
  lair_tankscape: 'assets/lair/tankscape.png',
  lair_overmantel: 'assets/lair/overmantel.png',
  lair_portrait: 'assets/lair/portrait.png',
  lair_bag_chain: 'assets/lair/bag_chain.png',
  lair_gloves: 'assets/lair/gloves.png',
  // the master suite: one generation per pose, chaining from sitting up to lying down
  lair_bed_0: 'assets/lair/bed_0.png',
  lair_bed_1: 'assets/lair/bed_1.png',
  lair_bed_2: 'assets/lair/bed_2.png',
  lair_bed_3: 'assets/lair/bed_3.png',
  lair_bed_4: 'assets/lair/bed_4.png',
  lair_bed_5: 'assets/lair/bed_5.png',
  lair_bed_6: 'assets/lair/bed_6.png',
  lair_bed_7: 'assets/lair/bed_7.png',
  // four frames: the logs hold still, the flames move
  lair_fender: 'assets/lair/fender.png',
  lair_fire_0: 'assets/lair/fire_0.png',
  lair_fire_1: 'assets/lair/fire_1.png',
  lair_fire_2: 'assets/lair/fire_2.png',
  lair_fire_3: 'assets/lair/fire_3.png',
  lair_bed_rug: 'assets/lair/bed_rug.png',
  lair_bed_wardrobe: 'assets/lair/bed_wardrobe.png',
  lair_bed_nightstand: 'assets/lair/bed_nightstand.png',
  lair_gym_plates: 'assets/lair/gym_plates.png',
  lair_gym_kettles: 'assets/lair/gym_kettles.png',
  // the two gym stations: the rig alone, then three poses of CHAD working it
  lair_gym_curl_empty: 'assets/lair/gym_curl_empty.png',
  lair_gym_curl_0: 'assets/lair/gym_curl_0.png',
  lair_gym_curl_1: 'assets/lair/gym_curl_1.png',
  lair_gym_curl_2: 'assets/lair/gym_curl_2.png',
  lair_gym_bench_empty: 'assets/lair/gym_bench_empty.png',
  lair_gym_bench_0: 'assets/lair/gym_bench_0.png',
  lair_gym_bench_1: 'assets/lair/gym_bench_1.png',
  lair_gym_bench_2: 'assets/lair/gym_bench_2.png',
  lair_lounge_empty: 'assets/lair/lounge_empty.png',
  lair_lounge_chad: 'assets/lair/lounge_chad.png',
  lair_tiger_sit: 'assets/lair/tiger_sit.png',
  lair_tiger_lie: 'assets/lair/tiger_lie.png',
  lair_tiger_0: 'assets/lair/tiger_0.png',
  lair_tiger_1: 'assets/lair/tiger_1.png',
  lair_tiger_2: 'assets/lair/tiger_2.png',
  lair_tiger_3: 'assets/lair/tiger_3.png',
  lair_tiger_4: 'assets/lair/tiger_4.png',
  lair_tiger_5: 'assets/lair/tiger_5.png',
  lair_shark_0: 'assets/lair/shark_0.png',
  lair_shark_1: 'assets/lair/shark_1.png',
  lair_shark_2: 'assets/lair/shark_2.png',
  lair_shark_3: 'assets/lair/shark_3.png',
  // keyed by boss id, so js/hub.js can look one up straight off BOSSES
  lair_relic_raja: 'assets/lair/relic_raja.png',
  lair_relic_mirchi: 'assets/lair/relic_mirchi.png',
  lair_relic_refund: 'assets/lair/relic_refund.png',
  lair_relic_yadav: 'assets/lair/relic_yadav.png',
  lair_relic_rana: 'assets/lair/relic_rana.png',
  bg_bazaar_v2_wall: 'assets/stages/bazaar_v2/wall.png',
  bg_bazaar_v2_floor: 'assets/stages/bazaar_v2/floor.png',
  bg_gutter_wall: 'assets/bg_gutter_wall.png',
  bg_gutter_floor: 'assets/bg_gutter_floor.png',
  bg_refund_wall: 'assets/bg_refund_wall.png',
  bg_refund_floor: 'assets/bg_refund_floor.png',
  bg_police_wall: 'assets/bg_police_wall.png',
  bg_police_floor: 'assets/bg_police_floor.png',
  bg_fort_wall: 'assets/bg_fort_wall.png',
  bg_fort_floor: 'assets/bg_fort_floor.png',
  prop_crate: 'assets/props/crate.png',
  prop_crate_b: 'assets/props/crate_b.png',
  prop_matka: 'assets/props/matka.png',
  prop_matka_b: 'assets/props/matka_b.png',
  prop_tyres: 'assets/props/tyres.png',
  prop_tyres_b: 'assets/props/tyres_b.png',
  prop_table: 'assets/props/table.png',
  prop_table_b: 'assets/props/table_b.png',
  prop_sign: 'assets/props/sign.png',
  prop_sign_b: 'assets/props/sign_b.png',
  prop_cart: 'assets/props/cart.png',
  prop_cart_b: 'assets/props/cart_b.png',
  prop_bag: 'assets/props/bag.png',
};

export const ASSETS = Object.fromEntries(Object.keys(FILES).map((k) => [k, null]));

// Everything is authored at RS device pixels per logical px.
const LOGICAL_SCALE = new Set();

export function loadAssets() {
  return Promise.all(Object.entries(FILES).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { img._as = LOGICAL_SCALE.has(key) ? 1 : RS; ASSETS[key] = img; resolve(); };
    img.onerror = () => { ASSETS[key] = null; resolve(); };
    img.src = src;
  })));
}
