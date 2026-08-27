#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, json, sys, traceback
import numpy as np
import cv2
import joblib

IMG_SIZE=32

def read_image(path):
    img=cv2.imdecode(np.fromfile(path,dtype=np.uint8),cv2.IMREAD_COLOR)
    if img is None: img=cv2.imread(path)
    return img

def prep_plate(img):
    if img is None: return None
    h,w=img.shape[:2]
    roi=img[int(h*0.08):int(h*0.92), int(w*0.03):int(w*0.97)]
    gray=cv2.cvtColor(roi,cv2.COLOR_BGR2GRAY)
    gray=cv2.GaussianBlur(gray,(3,3),0)
    th=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,31,9)
    th=cv2.morphologyEx(th,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    return th

def norm_digit(crop):
    if crop is None or crop.size==0: return None
    if crop.mean()>127: crop=255-crop
    ys,xs=np.where(crop>20)
    if len(xs) and len(ys): crop=crop[max(0,ys.min()-2):min(crop.shape[0],ys.max()+3), max(0,xs.min()-2):min(crop.shape[1],xs.max()+3)]
    h,w=crop.shape[:2]
    if h==0 or w==0: return None
    scale=min((IMG_SIZE-6)/w,(IMG_SIZE-6)/h)
    nw,nh=max(1,int(w*scale)),max(1,int(h*scale))
    resized=cv2.resize(crop,(nw,nh),interpolation=cv2.INTER_AREA)
    canvas=np.zeros((IMG_SIZE,IMG_SIZE),dtype=np.uint8)
    x=(IMG_SIZE-nw)//2; y=(IMG_SIZE-nh)//2
    canvas[y:y+nh,x:x+nw]=resized
    return canvas.astype(np.float32).reshape(-1)/255.0

def contour_slots(th):
    h,w=th.shape[:2]
    cnts,_=cv2.findContours(th,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    boxes=[]
    for c in cnts:
        x,y,bw,bh=cv2.boundingRect(c); area=bw*bh
        if bh<h*0.32 or bh>h*0.95: continue
        if bw<w*0.012 or bw>w*0.20: continue
        if area<h*w*0.004: continue
        boxes.append((x,y,bw,bh))
    boxes=sorted(boxes,key=lambda b:b[0])
    merged=[]
    for b in boxes:
        if not merged: merged.append(list(b)); continue
        px,py,pw,ph=merged[-1]; gap=b[0]-(px+pw)
        if gap<w*0.012 and abs((b[1]+b[3]/2)-(py+ph/2))<h*0.25:
            nx=min(px,b[0]); ny=min(py,b[1]); nr=max(px+pw,b[0]+b[2]); nb=max(py+ph,b[1]+b[3])
            merged[-1]=[nx,ny,nr-nx,nb-ny]
        else: merged.append(list(b))
    boxes=[tuple(b) for b in merged]
    if len(boxes)>=7: return boxes[:5], 'contour'
    if len(boxes)>=5: return boxes[:5], 'contour'
    # fallback fixed
    rel=[(0.00,0.14),(0.14,0.28),(0.42,0.56),(0.56,0.70),(0.70,0.84)]
    usable_left=int(w*0.04); usable_right=int(w*0.78); usable_w=max(10,usable_right-usable_left)
    return [(usable_left+int(usable_w*a), int(h*0.05), max(2,int(usable_w*(b-a))), int(h*0.90)) for a,b in rel], 'fixed'

def features(path):
    th=prep_plate(read_image(path))
    if th is None: return [], 'bad_image'
    boxes,method=contour_slots(th)
    out=[]
    for x,y,w,h in boxes[:5]:
        px=max(1,int(w*.12)); py=max(1,int(h*.10))
        crop=th[max(0,y-py):min(th.shape[0],y+h+py), max(0,x-px):min(th.shape[1],x+w+px)]
        f=norm_digit(crop)
        if f is not None: out.append(f)
    return out, method

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--model',required=True); ap.add_argument('--image',required=True); args=ap.parse_args()
    try:
        pack=joblib.load(args.model); clf=pack['classifier']; meta=pack.get('metadata',{})
        X,method=features(args.image)
        if len(X)!=5: print(json.dumps({'ok':False,'error':'segmentation_failed','segments':len(X)},ensure_ascii=False)); sys.exit(1)
        X=np.asarray(X,dtype=np.float32)
        pred=clf.predict(X).tolist()
        conf=None
        if hasattr(clf,'predict_proba'):
            probs=clf.predict_proba(X)
            conf=float(np.mean(np.max(probs,axis=1)))
        digits=''.join(str(x) for x in pred)
        print(json.dumps({'ok':True,'digits':digits,'plate':digits[:2]+'ت'+digits[2:5]+'-12','confidence':conf,'method':method,'classes_seen':meta.get('classes_seen')},ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ok':False,'error':str(e),'trace':traceback.format_exc()},ensure_ascii=False)); sys.exit(1)
if __name__=='__main__': main()
