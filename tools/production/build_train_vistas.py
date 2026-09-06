"""Register authored unmirrored looping vistas without changing their aspect ratio."""
from PIL import Image,ImageChops
import numpy as np
from build_train_rebuild import SOURCE,OUT

def main():
    for name in ['rural','industry','river']:
        original=Image.open(SOURCE/f'vista_{name}.png').convert('RGB').resize((1620,540),Image.Resampling.NEAREST)
        original=ImageChops.offset(original,810,0)
        repair=Image.open(SOURCE/f'vista_{name}_join.png').convert('RGB').resize((1620,540),Image.Resampling.NEAREST)
        # The true adjoining source columns are retained at the wrapping edge.
        # Generated repair supplies a complete bank/skyline at the old center cut.
        x=np.arange(1620);weight=np.clip(np.minimum(x,1619-x)/80,0,1)
        weight=weight*weight*(3-2*weight)
        a=np.array(original).astype(float);b=np.array(repair).astype(float)
        out=Image.fromarray(np.round(a*(1-weight[None,:,None])+b*weight[None,:,None]).astype('uint8'))
        out.save(OUT/f'vista_{name}.png')
        sheet=Image.new('RGB',(960,540));sheet.paste(out.crop((1140,0,1620,540)),(0,0));sheet.paste(out.crop((0,0,480,540)),(480,0));sheet.save(f'/tmp/vista_{name}_wrap.png')
if __name__=='__main__':main()
