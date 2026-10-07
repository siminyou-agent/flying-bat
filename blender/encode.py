"""Package a completed Blender render as browser-ready H.264 assets."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

parser=argparse.ArgumentParser();parser.add_argument('--work',required=True);parser.add_argument('--dest',default='media')
args=parser.parse_args();work=Path(args.work);dest=Path(args.dest);dest.mkdir(parents=True,exist_ok=True)
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg:raise SystemExit('Install ffmpeg with the libx264 encoder first.')
chapters=json.loads((work/'chapters.json').read_text());fps=chapters['fps']
for n in range(1,chapters['frames']+1):
    if not (work/'frames'/f'frame-{n:04d}.png').exists():raise SystemExit(f'Missing frame {n}')
for name in ('flying_bat.blend','flying_bat.glb','chapters.json'):shutil.copy2(work/name,dest/name)
shutil.copy2(work/'preview-19.png',dest/'poster.png')
options=['-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart']
def encode(name,start,count):
    subprocess.run([ffmpeg,'-v','error','-y','-framerate',str(fps),'-start_number',str(start),'-i',str(work/'frames'/'frame-%04d.png'),'-frames:v',str(count),*options,str(dest/name)],check=True)
encode('full-fold.mp4',1,chapters['frames'])
for action in chapters['actions']:
    encode(f'fold-{action["index"]:02d}.mp4',action['start_frame'],action['end_frame']-action['start_frame']+1)
def timestamp(seconds):
    ms=round(seconds*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
vtt='WEBVTT\n\n'+'\n\n'.join(f'{timestamp(a["start"])} --> {timestamp(a["end"])}\n{a["title"]}' for a in chapters['actions'])+'\n'
(dest/'full-fold.vtt').write_text(vtt)
print('Packaged full film, 21 clips, captions, and Blender/glTF models.')
