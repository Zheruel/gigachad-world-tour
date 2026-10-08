"""Registered station joins, platform layers and matte-free cinematic sprites."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance
from build_train_rebuild import SOURCE, OUT, neutral_key, crop, cell, clean_actor, atlas, build_entry

def matte(im, strength=.88):
    a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].astype(float)
    mask=a[:,:,3]>0
    padded=np.pad(mask,1)
    interior=np.ones_like(mask)
    for dy in range(3):
        for dx in range(3):interior &= padded[dy:dy+mask.shape[0],dx:dx+mask.shape[1]]
    edge=mask&~interior
    # Remove residual neutral key fringe only at the silhouette, not highlights.
    neutral=(rgb.max(2)-rgb.min(2)<35)&(rgb.min(2)>105)
    a[edge&neutral,3]=0
    rgb[edge]*=.58
    rgb*=np.array([strength,strength*.98,min(1,strength*1.05)])
    a[:,:,:3]=np.clip(rgb,0,255).astype('uint8');a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)

def chad_board():
    """CHAD boarding the coach (back view): registered like the other train sheets, finished on the gold palette."""
    from build_train_rebuild import register, CHAD_CROWN
    from chad_cutscene import finish
    im=neutral_key(Image.open(SOURCE/'chad_board.png'));cells=[crop(clean_actor(cell(im,i,3,2))) for i in range(6)]
    atlas(register(cells,(224,240),CHAD_CROWN),OUT/'chad_board.png');finish(OUT/'chad_board.png',(224,240))

def main():
    build_entry()
    # Rebuild interiors from selected sources, removing saturated key spill only
    # near keyed windows; this does not recolor the vista behind them.
    from build_train_rebuild import keyed
    for name in ['general','sleeper','pantry','ac','private','private_damaged','roof']:
        source=Image.open(SOURCE/('general_windows.png' if name=='general' else name+'.png'))
        if name=='general':source=source.crop((0,62,2149,685))
        im=ImageEnhance.Brightness(keyed(source)).enhance(1.13).resize((1920,540),Image.Resampling.NEAREST)
        a=np.array(im);rgb=a[:,:,:3].astype(float);clear=a[:,:,3]==0;padded=np.pad(clear,4);near=np.zeros_like(clear)
        for dy in range(9):
            for dx in range(9):near|=padded[dy:dy+540,dx:dx+1920]
        spill=near&(rgb[:,:,0]>rgb[:,:,1]*1.6)&(rgb[:,:,2]>rgb[:,:,1]*1.6)&(rgb[:,:,0]>65)&(rgb[:,:,2]>65)
        a[spill,3]=0;a[a[:,:,3]==0,:3]=0;Image.fromarray(a).save(OUT/(name+'.png'))
    # CHAD's entry sheet is finished on the gold palette by build_entry (chad_cutscene.finish), not darkened here.
    for name in ['ticket_scanner']:
        matte(Image.open(OUT/(name+'.png')),.9).save(OUT/(name+'.png'))
    platform=Image.open(SOURCE/'platform_empty.png').convert('RGBA').crop((0,50,2172,673)).resize((1920,540),Image.Resampling.NEAREST)
    platform.save(OUT/'platform.png')
    for left,right,name in [('yard','hall','join_yard_hall'),('hall','platform','join_hall_platform')]:
        base=Image.new('RGBA',(960,540));base.paste(Image.open(OUT/(left+'.png')).crop((1440,0,1920,540)));base.paste(Image.open(OUT/(right+'.png')).crop((0,0,480,540)),(480,0))
        patch=Image.open(SOURCE/(name+'.png')).convert('RGBA').resize((960,540),Image.Resampling.NEAREST)
        a=np.array(patch);x=np.arange(960);weight=np.clip(np.minimum(x,959-x)/120,0,1);weight=weight*weight*(3-2*weight);a[:,:,3]=(weight*255).astype('uint8')[None,:]
        base.alpha_composite(Image.fromarray(a));base.save(OUT/(name+'.png'))
    # The same painted columns, lanterns, lamp post and sign occlude trains on the tracks.
    from build_station_fronts import main as station_fronts
    station_fronts()
    c=crop(clean_actor(Image.open(SOURCE/'vestibule.png').convert('RGBA')));matte(c,.85).resize((160,390),Image.Resampling.NEAREST).save(OUT/'vestibule.png')
    for left,right in [('general','sleeper'),('sleeper','pantry'),('pantry','ac'),('ac','private')]:
        li=np.array(Image.open(OUT/(left+'.png')).convert('RGBA'));ri=np.array(Image.open(OUT/(right+'.png')).convert('RGBA'))
        # Sleeper ends halfway through its reflected second tile.
        if left=='sleeper':li=li[:,::-1];li=li[:,:960]
        l=li[370:,-240:];r=ri[370:,:240];l=np.concatenate([l,l[:,::-1]],1);r=np.concatenate([r[:,::-1],r],1)
        weight=np.linspace(0,1,480)[None,:,None];weight=weight*weight*(3-2*weight)
        floor=(l*(1-weight)+r*weight).astype('uint8');floor[:,:,3]=(floor[:,:,3]*np.clip(np.arange(floor.shape[0])/50,0,1)[:,None]).astype('uint8');out=Image.new('RGBA',(480,540));out.paste(Image.fromarray(floor),(0,370));out.save(OUT/f'floor_{left}_{right}.png')
    chad_board()
    c=matte(crop(Image.open(SOURCE/'locomotive.png').convert('RGBA')),.92);c.resize((1000,round(c.height*1000/c.width)),Image.Resampling.NEAREST).save(OUT/'locomotive.png')
    # Transparent key RGB must not contaminate transformed edge sampling.
    im=Image.open(OUT/'train_exterior.png').convert('RGBA');a=np.array(im);a[a[:,:,3]==0,:3]=0;Image.fromarray(a).save(OUT/'train_exterior.png')
    from build_train_atmosphere import main as atmosphere
    atmosphere()
    from build_train_cast_polish import main as cast_polish
    cast_polish()
    from build_train_coaches import main as coaches
    coaches()
    from build_train_vistas import main as vistas
    vistas()
    from build_train_finale_environment import main as finale_environment
    finale_environment()
    from build_train_finale_approach import main as finale_approach
    finale_approach()
    from build_train_finale_damage import main as finale_damage
    finale_damage()
    from build_train_finale_cigar import main as finale_cigar
    finale_cigar()
    from build_train_office_layers import main as office_layers
    office_layers()
    from build_combat_variety import main as combat_variety
    combat_variety()
    from build_signature_supers import main as signature_supers
    signature_supers()
    # The passenger cast, the Head Conductor, Netaji and Shera and their props replace every older train-enemy pass.
    from build_train_passengers import main as passengers
    passengers()
    from build_train_conductor import main as conductor
    conductor()
    from build_train_neta import main as neta
    neta()
    from build_train_fx import main as train_fx
    train_fx()
if __name__=='__main__':main()
