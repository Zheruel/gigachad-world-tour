"""Remove neighbouring-cell remnants without moving registered Pappu bodies."""
from pathlib import Path
import json,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from keying import components
ROOT=Path(__file__).resolve().parents[2]
def main():
 m=json.loads((ROOT/'assets/frames/manifest.json').read_text())['ic_vendor'];fixed=[];checked=0;edge=[]
 for name in sorted({p for fam,files in m.items() if fam!='fry' for p in files}):
  path=ROOT/'assets/frames'/name;im=Image.open(path).convert('RGBA');a=np.array(im);parts=sorted(components(a[:,:,3]>127),key=len,reverse=True);checked+=1
  if len(parts)>1:
   mask=np.zeros(a.shape[:2],bool);q=parts[0];mask[q[:,0],q[:,1]]=True;removed=int((a[:,:,3]>127).sum()-mask.sum());a[~mask]=0;Image.fromarray(a).save(path);fixed.append([name,removed])
  if np.any(a[0,:,3]) or np.any(a[-1,:,3]) or np.any(a[:,0,3]) or np.any(a[:,-1,3]):edge.append(name)
 print(json.dumps({'frames_checked':checked,'cleaned':fixed,'canvas_edge_contacts':edge}))
if __name__=='__main__':main()
