"""Resume a Blender studio render, reusing identical pause frames losslessly.

blender -b flying_bat.blend --python render_frames.py -- --work OUTPUT_DIRECTORY
"""
import argparse
import json
from pathlib import Path
import shutil
import sys
import bpy

parser=argparse.ArgumentParser();parser.add_argument('--work',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
work=Path(args.work);frames=work/'frames';frames.mkdir(exist_ok=True)
chapters=json.loads((work/'chapters.json').read_text())
scene=bpy.context.scene
def path(n):return frames/f'frame-{n:04d}.png'
def complete(p):return p.exists() and p.read_bytes()[-12:]==b'\x00\x00\x00\x00IEND\xaeB`\x82'
def render(n):
    target=path(n)
    if complete(target):return
    scene.frame_set(n);scene.render.filepath=str(target);bpy.ops.render.render(write_still=True)
for a in chapters['actions']:
    start,end=a['start_frame'],a['end_frame']
    for frame in range(start,end+1):
        if complete(path(frame)):continue
        if a['index']==0:source=start
        elif a['step']==10:source=frame  # The turntable rotates during the whole shot.
        elif frame<=start+12:source=start
        elif frame>=end-12:source=end-12
        else:source=frame
        render(source)
        if frame!=source:shutil.copy2(path(source),path(frame))
    print('CHAPTER_RENDERED',a['index'],end,flush=True)
print('ALL_FRAMES_COMPLETE',chapters['frames'],flush=True)
