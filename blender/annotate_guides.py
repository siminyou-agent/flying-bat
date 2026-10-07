"""Composite high-contrast crease/direction guides onto the clean Blender film.

Requires Pillow and ffmpeg. Keeps the clean clips so the guide toggle can hide
annotations. Crease coordinates come from export_guides.py, not hand placement.
"""
import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

parser=argparse.ArgumentParser()
parser.add_argument('--frames',required=True);parser.add_argument('--guides',required=True)
parser.add_argument('--work',required=True);parser.add_argument('--dest',required=True)
parser.add_argument('--background',action='store_true')
args=parser.parse_args();source=Path(args.frames);work=Path(args.work);dest=Path(args.dest)
data=json.loads(Path(args.guides).read_text());width,height=data['width'],data['height'];fps=data['fps']
work.mkdir(parents=True,exist_ok=True);dest.mkdir(parents=True,exist_ok=True)
if args.background:
    with (work/'annotate.log').open('a') as log:
        process=subprocess.Popen([sys.executable,__file__,*[arg for arg in sys.argv[1:] if arg!='--background']],stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
    print('ANNOTATION_STARTED',process.pid,str(work/'annotate.log'));raise SystemExit(0)
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg:raise SystemExit('ffmpeg is required')
font=None
for name in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf','DejaVuSans-Bold.ttf'):
    try:font=ImageFont.truetype(name,26);break
    except OSError:pass
if font is None:font=ImageFont.load_default(size=26)
RED=(205,32,64,255);BLUE=(17,96,202,255);HALO=(255,254,245,250)

def pixels(points):return [(p[0]*width,p[1]*height) for p in points]

def dashed(draw,start,end,color,thickness):
    dx,dy=end[0]-start[0],end[1]-start[1];length=math.hypot(dx,dy)
    if length<1:return
    count=max(2,round(length/38));unit=length/count
    for i in range(count):
        a=i*unit;b=min(length,a+unit*.64)
        p=(start[0]+dx*a/length,start[1]+dy*a/length);q=(start[0]+dx*b/length,start[1]+dy*b/length)
        draw.line([p,q],fill=color,width=thickness)
        r=thickness/2
        for x,y in (p,q):draw.ellipse((x-r,y-r,x+r,y+r),fill=color)

def annotate(image,entry,frame):
    layer=Image.new('RGBA',image.size);draw=ImageDraw.Draw(layer)
    line=pixels(frame['filmCrease']);arrow=pixels(frame['filmArrow'])
    if line:
        dashed(draw,*line,HALO,17);dashed(draw,*line,RED,9)
        for x,y in line:
            draw.ellipse((x-9,y-9,x+9,y+9),fill=HALO)
            draw.ellipse((x-5,y-5,x+5,y+5),fill=RED)
    if len(arrow)>1:
        length=sum(math.dist(arrow[i-1],arrow[i]) for i in range(1,len(arrow)))
        if length>20:
            draw.line(arrow,fill=HALO,width=15,joint='curve');draw.line(arrow,fill=BLUE,width=8,joint='curve')
            end=arrow[-1];tail=next((p for p in reversed(arrow[:-1]) if math.dist(p,end)>10),arrow[0])
            dx,dy=end[0]-tail[0],end[1]-tail[1];distance=max(.01,math.hypot(dx,dy));dx/=distance;dy/=distance
            for size,color in ((30,HALO),(23,BLUE)):
                draw.polygon([end,(end[0]-dx*size-dy*size*.55,end[1]-dy*size+dx*size*.55),(end[0]-dx*size+dy*size*.55,end[1]-dy*size-dx*size*.55)],fill=color)
    text=entry['label'];box=draw.textbbox((0,0),text,font=font);box_width=box[2]-box[0]+32
    draw.rounded_rectangle((20,20,20+box_width,66),radius=10,fill=HALO)
    draw.text((36,27),text,font=font,fill=RED if line else BLUE)
    return Image.alpha_composite(image.convert('RGBA'),layer).convert('RGB')

options=['-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart']
for entry in data['actions']:
    start=entry['index']*72+1
    for offset in range(72):
        original=source/f'frame-{start+offset:04d}.png';target=work/f'frame-{start+offset:04d}.png'
        if entry['frames']:
            with Image.open(original) as image:annotate(image,entry,entry['frames'][offset]).save(target)
        else:shutil.copy2(original,target)
    subprocess.run([ffmpeg,'-v','error','-y','-framerate',str(fps),'-start_number',str(start),'-i',str(work/'frame-%04d.png'),'-frames:v','72',*options,str(dest/f'fold-guided-{entry["index"]:02d}.mp4')],check=True)
    print('GUIDED_CLIP_READY',entry['index'],flush=True)
subprocess.run([ffmpeg,'-v','error','-y','-framerate',str(fps),'-start_number','1','-i',str(work/'frame-%04d.png'),*options,str(dest/'full-fold-guided.mp4')],check=True)
print('GUIDED_FILM_COMPLETE',flush=True)
