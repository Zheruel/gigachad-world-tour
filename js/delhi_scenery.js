// Registered scenery detail; actor and boss collision positions are unchanged.
export const DELHI_SCENERY_FILES = Object.fromEntries([
  'dredger_cab', 'river_glints', 'river_current', 'outfall',
].map(name => ['ic_delhi_' + name, 'assets/stages/dirty_delhi/rebuild/' + name + '.png']));

export function drawDelhiScenery(ctx, camX, assets, time = 0, ambient = true) {
  if (ambient) {
    for (const [name,x,y,w,h,phase] of [
      ['river_glints',5030,118,50,17,0],
      ['river_current',6070,141,170,17,71],
      ['outfall',6430,152,20,32,139],
    ]) {
      if (x-camX > 480 || x+w-camX < 0) continue;
      const image = assets['ic_delhi_'+name];
      if (!image) continue;
      const tick=time+phase;
      ctx.save();
      ctx.globalAlpha=.22+.12*Math.sin(tick*.027);
      const drift=name==='outfall'?0:Math.sin(tick*.018);
      const fall=name==='outfall'?(tick%24)/12:0;
      ctx.drawImage(image,Math.round(x-camX+drift),y+fall,w,h);
      ctx.restore();
    }
  }
  // Source landmarks: glass is at (107,36) within this 166x174 assembly.
  // It consequently meets the live reflection target at arena+(352,74).
  const cabin=assets.ic_delhi_dredger_cab;
  const x=6000+245-camX;
  if(cabin && x<480 && x+166>0)ctx.drawImage(cabin,Math.round(x),38,166,174);
}
