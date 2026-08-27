#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
آموزش مدل واقعی تشخیص ۵ رقم پلاک تاکسی مشهد: [دو رقم] ت [سه رقم] - ۱۲
ورودی: manifest JSON شامل مسیر تصویر برش‌خورده و برچسب ۵ رقمی هر نمونه.
خروجی: فایل joblib مدل + metadata JSON.
"""
import argparse, json, os, sys, time, traceback
from pathlib import Path
import numpy as np
import cv2
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

IMG_SIZE = 32

def read_image(path):
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        img = cv2.imread(path)
    return img

def prep_plate(img):
    if img is None:
        return None, None
    h, w = img.shape[:2]
    if w < 80 or h < 25:
        return None, None
    # حذف حاشیه‌های افراطی و تمرکز روی نوار مرکزی پلاک
    top = int(h * 0.08); bottom = int(h * 0.92)
    left = int(w * 0.03); right = int(w * 0.97)
    roi = img[top:bottom, left:right]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3,3), 0)
    th = cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,31,9)
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, np.ones((2,2), np.uint8))
    return roi, th

def normalize_digit(crop):
    if crop is None or crop.size == 0:
        return None
    if len(crop.shape) == 3:
        crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    # اطمینان از رقم سفید روی زمینه سیاه
    if crop.mean() > 127:
        crop = 255 - crop
    ys, xs = np.where(crop > 20)
    if len(xs) and len(ys):
        crop = crop[max(0, ys.min()-2):min(crop.shape[0], ys.max()+3), max(0, xs.min()-2):min(crop.shape[1], xs.max()+3)]
    h, w = crop.shape[:2]
    if h == 0 or w == 0:
        return None
    scale = min((IMG_SIZE-6)/w, (IMG_SIZE-6)/h)
    nw, nh = max(1, int(w*scale)), max(1, int(h*scale))
    resized = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.uint8)
    x = (IMG_SIZE-nw)//2; y = (IMG_SIZE-nh)//2
    canvas[y:y+nh, x:x+nw] = resized
    return canvas.astype(np.float32).reshape(-1) / 255.0

def contour_slots(th):
    h, w = th.shape[:2]
    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        x,y,bw,bh = cv2.boundingRect(c)
        area = bw*bh
        if bh < h*0.32 or bh > h*0.95: continue
        if bw < w*0.012 or bw > w*0.20: continue
        if area < h*w*0.004: continue
        # حذف منطقه ۱۲ سمت راست: اگر خیلی انتهای راست باشد بعداً اولویت پایین می‌گیرد
        boxes.append((x,y,bw,bh))
    if not boxes:
        return []
    # ادغام اجزای نزدیک که متعلق به یک رقم هستند
    boxes = sorted(boxes, key=lambda b: b[0])
    merged = []
    for b in boxes:
        if not merged:
            merged.append(list(b)); continue
        px,py,pw,ph = merged[-1]
        gap = b[0] - (px+pw)
        if gap < w*0.012 and abs((b[1]+b[3]/2)-(py+ph/2)) < h*0.25:
            nx=min(px,b[0]); ny=min(py,b[1]); nr=max(px+pw,b[0]+b[2]); nb=max(py+ph,b[1]+b[3])
            merged[-1]=[nx,ny,nr-nx,nb-ny]
        else:
            merged.append(list(b))
    boxes = [tuple(b) for b in merged]
    # در پلاک ایران ۱۲، دو رقم منطقه در انتهای راست است؛ پنج رقم اصلی قبل از آن قرار می‌گیرد.
    boxes = sorted(boxes, key=lambda b: b[0])
    if len(boxes) >= 7:
        return boxes[:5]
    if len(boxes) >= 5:
        return boxes[:5]
    return []

def fixed_slots(th):
    h, w = th.shape[:2]
    # برش تقریبی پنج جایگاه عددی: ناحیه سمت راست منطقه ۱۲ کنار گذاشته می‌شود.
    usable_left = int(w*0.04)
    usable_right = int(w*0.78)
    usable_w = max(10, usable_right-usable_left)
    slots = []
    # دو رقم اول، حرف ت، سه رقم آخر. فضای حرف با یک فاصله میانی رد می‌شود.
    rel = [(0.00,0.14),(0.14,0.28),(0.42,0.56),(0.56,0.70),(0.70,0.84)]
    for a,b in rel:
        x = usable_left + int(usable_w*a); x2 = usable_left + int(usable_w*b)
        slots.append((x, int(h*0.05), max(2,x2-x), int(h*0.90)))
    return slots

def extract_digit_features(image_path):
    img = read_image(image_path)
    roi, th = prep_plate(img)
    if th is None: return [], 'bad_image'
    boxes = contour_slots(th)
    method = 'contour'
    if len(boxes) < 5:
        boxes = fixed_slots(th); method = 'fixed'
    feats = []
    for x,y,w,h in boxes[:5]:
        pad_x = max(1, int(w*0.12)); pad_y = max(1, int(h*0.10))
        x0=max(0,x-pad_x); y0=max(0,y-pad_y); x1=min(th.shape[1],x+w+pad_x); y1=min(th.shape[0],y+h+pad_y)
        f = normalize_digit(th[y0:y1, x0:x1])
        if f is not None: feats.append(f)
    if len(feats) != 5:
        return [], 'segmentation_failed'
    return feats, method

def train(manifest_path, out_dir):
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    samples = manifest.get('samples') or []
    X=[]; y=[]; used=[]; rejected=[]; methods={'contour':0,'fixed':0}
    for s in samples:
        digits = ''.join(ch for ch in str(s.get('digits','')) if ch.isdigit())[:5]
        if len(digits) != 5:
            rejected.append({'id':s.get('id'), 'reason':'invalid_label'}); continue
        feats, method = extract_digit_features(s.get('image',''))
        if len(feats) != 5:
            rejected.append({'id':s.get('id'), 'reason':method}); continue
        methods[method] = methods.get(method,0)+1
        for f, lab in zip(feats, digits):
            X.append(f); y.append(lab)
        used.append(s.get('id'))
    if len(used) < 10 or len(X) < 50:
        return {'ok':False,'status':'insufficient','samples_count':len(used),'digit_count':len(X),'rejected':rejected,'error':'not_enough_usable_samples'}
    X=np.asarray(X, dtype=np.float32); y=np.asarray(y)
    classes=sorted(set(y.tolist()))
    clf = RandomForestClassifier(n_estimators=180, max_depth=None, class_weight='balanced_subsample', random_state=140412, n_jobs=-1)
    if len(set(y)) > 1 and len(y) >= 80:
        try:
            Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=0.22,random_state=140412,stratify=y if min(np.bincount([int(i) for i in y]))>=2 else None)
        except Exception:
            Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=0.22,random_state=140412)
        clf.fit(Xtr,ytr)
        pred=clf.predict(Xte)
        acc=float(accuracy_score(yte,pred))
        report=classification_report(yte,pred,zero_division=0,output_dict=True)
        cm=confusion_matrix(yte,pred,labels=classes).tolist()
    else:
        clf.fit(X,y); acc=None; report={}; cm=[]
    out=Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    model_path=str(out/'taxi12_digit_rf.joblib')
    meta_path=str(out/'metadata.json')
    metadata={
        'type':'taxi12_plate_digit_model','fixed_letter':'ت','region_code':'12','algorithm':'RandomForestClassifier',
        'created_at':time.strftime('%Y-%m-%dT%H:%M:%S%z'),'samples_count':len(used),'digit_count':len(X),
        'classes_seen':classes,'accuracy':acc,'used_sample_ids':used,'rejected':rejected,'segmentation_methods':methods,
        'classification_report':report,'confusion_matrix':{'labels':classes,'matrix':cm},'image_size':IMG_SIZE
    }
    joblib.dump({'classifier':clf,'metadata':metadata}, model_path)
    with open(meta_path,'w',encoding='utf-8') as f: json.dump(metadata,f,ensure_ascii=False,indent=2)
    return {'ok':True,'status':'ready','model_path':model_path,'metadata_path':meta_path,**metadata}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--out-dir', required=True)
    args=ap.parse_args()
    try:
        print(json.dumps(train(args.manifest,args.out_dir), ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ok':False,'status':'failed','error':str(e),'trace':traceback.format_exc()}, ensure_ascii=False))
        sys.exit(1)
if __name__ == '__main__': main()
