"""Shared helper: extract full connected silhouettes rather than cutting limbs at grid boundaries.

The train enemy families it once registered are built by build_train_passengers.py.
"""
from collections import deque
import numpy as np
from PIL import Image
from build_train_rebuild import keyed

def extract(im,rows):
    a=np.array(keyed(im));mask=a[:,:,3]>16;h,w=mask.shape;groups={}
    for y,x in zip(*np.where(mask)):
        if not mask[y,x]:continue
        q=deque([(int(x),int(y))]);mask[y,x]=False;points=[]
        while q:
            px,py=q.popleft();points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and mask[ny,nx]:mask[ny,nx]=False;q.append((nx,ny))
        if len(points)<500:continue
        xs,ys=np.array(points).T;x0,x1=xs.min(),xs.max()+1;y0,y1=ys.min(),ys.max()+1
        index=min(rows-1,int((y0+y1)/2/h*rows))*4+min(3,int((x0+x1)/2/w*4))
        if index in groups and groups[index][0]>len(points):continue
        c=np.zeros((y1-y0,x1-x0,4),dtype='uint8');c[ys-y0,xs-x0]=a[ys,xs]
        groups[index]=(len(points),Image.fromarray(c))
    return {i:c for i,(_,c) in groups.items()}
