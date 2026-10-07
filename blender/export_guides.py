"""Export crease axes and fold-direction arcs from the existing Blender scene.

blender -b flying_bat.blend --python blender/export_guides.py -- --out media/fold-guides.json
Film coordinates use Blender's actual animated camera. World coordinates use
the same Y-up conversion as the glTF exporter, for the rotatable browser model.
"""
import argparse
import json
from pathlib import Path
import runpy
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, Matrix

parser=argparse.ArgumentParser();parser.add_argument('--out',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
builder=runpy.run_path(str(Path(__file__).with_name('build_flying_bat.py')))
paper=builder['create_sequence']();scene=bpy.context.scene
FPS=builder['FPS'];LENGTH=builder['ACTION_FRAMES']

def crease(action):
    if action['kind']!='fold':return []
    origin,axis=action['origin'],action['axis'];along=[]
    for face,moves in zip(action['faces'],action['moving']):
        if not moves:continue
        for v in face['v']:
            d=v['p']-origin
            if abs(axis.x*d.y-axis.y*d.x)<1e-5:along.append(d.dot(axis))
    if len(along)<2:raise RuntimeError('Could not locate hinge on sheet: '+action['title'])
    return [origin+axis*min(along),origin+axis*max(along)]

def arrow_anchor(action):
    origin,axis=action['origin'],action['axis'];candidates=[]
    for face,moves in zip(action['faces'],action['moving']):
        if not moves:continue
        center=sum((v['p'] for v in face['v']),Vector())/len(face['v'])
        candidates.append((axis.cross(center-origin).length,center))
    return max(candidates,key=lambda p:p[0])[1]

def world_points(obj,points):
    return [obj.matrix_world@p for p in points]

def converted(points):
    return [[round(v.x,5),round(v.z,5),round(-v.y,5)] for v in points]

def projected(points):
    result=[]
    for point in points:
        p=world_to_camera_view(scene,scene.camera,point)
        result.append([round(p.x,6),round(1-p.y,6)])
    return result

actions=[]
for n,a in enumerate(paper.actions):
    kind=a['kind'];entry={'index':n,'start':n*LENGTH/FPS,'kind':kind,'label':'','frames':[]}
    if kind not in ('fold','turn'):
        actions.append(entry);continue
    entry['label']=('UNFOLD HERE' if n==2 else 'FOLD HERE') if kind=='fold' else ('OPEN THE WINGS' if n==19 else 'TURN OVER')
    hinge=crease(a);anchor=arrow_anchor(a)
    obj=bpy.data.objects[f'{n:02d} · {a["title"]}']
    for local_frame in range(LENGTH):
        scene.frame_set(1+n*LENGTH+local_frame)
        u=sum(key.value*(i/12) for i,key in enumerate(obj.data.shape_keys.key_blocks) if i)
        # Show the remaining motion, anchored to the moving flap, not a guessed
        # screen-space arrow. Stop the arrow near the end; keep the crease.
        arc=[]
        if u<.94:
            end=min(1,u+.65)
            for j in range(17):
                angle=a['angle']*(u+(end-u)*j/16)
                arc.append(a['origin']+Matrix.Rotation(angle,4,a['axis'])@(anchor-a['origin']))
        crease_world=world_points(obj,hinge);arc_world=world_points(obj,arc)
        entry['frames'].append({'crease':converted(crease_world),'arrow':converted(arc_world),
                                'filmCrease':projected(crease_world),'filmArrow':projected(arc_world)})
    actions.append(entry)
result={'fps':FPS,'width':scene.render.resolution_x,'height':scene.render.resolution_y,'actions':actions}
out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,separators=(',',':')))
print('GUIDES_EXPORTED',len(actions),out.stat().st_size,flush=True)
