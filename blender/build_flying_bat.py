"""Blender 5.x: continuous-sheet origami motion study, studio render and glTF.

blender -b --python blender/build_flying_bat.py -- --output /tmp/bat --preview

Faces are subdivided at each crease, preserving source-sheet coordinates and
surface area. Thickness is a visual approximation; this is a kinematic fold
model, not a paper collision/elasticity simulation.
"""
import argparse
import copy
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector, Matrix

EPS = 1e-7
THICKNESS = .0035
W, H = 1.5, 1.5 * 8.5 / 11
FPS = 24
ACTION_FRAMES = 72

def vertex(x, y, z=0, u=None, v=None):
    return {'p': Vector((x, y, z)), 'uv': (x if u is None else u, y if v is None else v)}

def polygon_area(face):
    p = [v['p'] for v in face['v']]
    return sum((p[i] - p[0]).cross(p[i + 1] - p[0]).length / 2 for i in range(1, len(p) - 1))

def interpolate(a, b, t):
    return {'p': a['p'].lerp(b['p'], t), 'uv': tuple(a['uv'][i] * (1-t) + b['uv'][i] * t for i in range(2))}

def clip(face, a, b, sign):
    direction = b - a
    def distance(v):
        p = v['p']
        return sign * (direction.x * (p.y-a.y) - direction.y * (p.x-a.x))
    verts = face['v']; out=[]
    for i, start in enumerate(verts):
        end = verts[(i+1) % len(verts)]
        ds, de = distance(start), distance(end)
        if ds >= -EPS:
            out.append(copy.deepcopy(start))
        if (ds > EPS and de < -EPS) or (ds < -EPS and de > EPS):
            out.append(interpolate(start, end, ds / (ds-de)))
    clean=[]
    for v in out:
        if not clean or (v['p']-clean[-1]['p']).length > EPS: clean.append(v)
    if len(clean)>1 and (clean[0]['p']-clean[-1]['p']).length < EPS: clean.pop()
    result={'v':clean,'tags':set(face['tags'])}
    return result if len(clean)>=3 and polygon_area(result)>1e-8 else None

class Paper:
    def __init__(self):
        self.faces=[{'v':[vertex(-W,-H),vertex(W,-H),vertex(W,H),vertex(-W,H)],'tags':set()}]
        self.actions=[]

    def fold(self, title, step, a, b, sign, selector=None, tag=None, angle=math.pi, under=False):
        a, b = Vector((*a,0)), Vector((*b,0))
        output=[]; moving=[]
        for face in self.faces:
            if selector and not selector(face):
                output.append(copy.deepcopy(face)); moving.append(False); continue
            stay, move=clip(face,a,b,-sign),clip(face,a,b,sign)
            if stay: output.append(stay); moving.append(False)
            if move:
                if tag: move['tags'].add(tag)
                output.append(move); moving.append(True)
        if not any(moving): raise RuntimeError('Empty fold: '+title)
        # Use the moving packet's mid-plane. Using the tallest point of the
        # entire model incorrectly puts later hinges above already-raised wings.
        z_values=[v['p'].z for f,m in zip(output,moving) if m for v in f['v']]
        level=(min(z_values)+max(z_values))/2 + THICKNESS*.6*(-1 if under else 1)
        a.z=b.z=level
        axis=(b-a).normalized()
        signed_angle=angle*sign*(-1 if under else 1)
        action={'title':title,'step':step,'faces':copy.deepcopy(output),'moving':moving,
                'origin':a,'axis':axis,'angle':signed_angle,'kind':'fold'}
        self.actions.append(action)
        self.faces=self.evaluate(action,1)
        self.check(title)

    def turn(self,title,step,axis,angle):
        verts=[v['p'] for f in self.faces for v in f['v']]
        z=(max(v.z for v in verts)+min(v.z for v in verts))/2
        action={'title':title,'step':step,'faces':copy.deepcopy(self.faces),'moving':[True]*len(self.faces),
                'origin':Vector((0,0,z)), 'axis':Vector(axis),'angle':angle,'kind':'turn'}
        self.actions.append(action); self.faces=self.evaluate(action,1); self.check(title)

    def unfold(self,title,step):
        previous=self.actions[-1]
        action=dict(previous,title=title,step=step,faces=copy.deepcopy(self.faces),angle=-previous['angle'])
        self.actions.append(action);self.faces=self.evaluate(action,1);self.check(title)

    def hold(self,title,step,orbit=False):
        self.actions.append({'title':title,'step':step,'faces':copy.deepcopy(self.faces),
                             'moving':[False]*len(self.faces),'kind':'orbit' if orbit else 'hold'})

    @staticmethod
    def evaluate(action,t):
        faces=copy.deepcopy(action['faces'])
        if 'angle' not in action: return faces
        rotation=Matrix.Rotation(action['angle']*t,4,action['axis'])
        for face,moves in zip(faces,action['moving']):
            if moves:
                for v in face['v']:v['p']=action['origin']+rotation@(v['p']-action['origin'])
        return faces

    def check(self,label):
        area=sum(polygon_area(f) for f in self.faces)
        assert abs(area-4*W*H)<.0002,(label,area,4*W*H)
        assert all(math.isfinite(c) for f in self.faces for v in f['v'] for c in v['p'])

def create_sequence():
    p=Paper();p.hold('One rectangle of construction paper',0)
    p.fold('Make the center crease',1,(0,-H),(0,H),1)
    p.unfold('Open the sheet again',1)
    p.fold('Left edge to the center',2,(-.75,-H),(-.75,H),1,tag='left_flap')
    p.fold('Right edge to the center',2,(.75,-H),(.75,H),-1,tag='right_flap')
    p.fold('Fan the right flap outward',3,(0,H),(.75,-H),-1,lambda f:'right_flap' in f['tags'])
    p.fold('Fan the left flap outward',3,(0,H),(-.75,-H),1,lambda f:'left_flap' in f['tags'])
    p.fold('Fold the upper-right corner',4,(0,H),(.75,H-.75),1)
    p.fold('Fold the upper-left corner',4,(0,H),(-.75,H-.75),-1)
    p.turn('Turn the paper over',5,(0,1,0),math.pi)
    p.fold('Bring the top point to the bottom',5,(-1.5,0),(1.5,0),1,tag='nose')
    p.fold('Fold the small right shoulder',6,(.48,0),(.98,-.30),1)
    p.fold('Fold the small left shoulder',6,(-.48,0),(-.98,-.30),-1)
    p.fold('Lift the point over the small corners',7,(-1.5,-H*.26),(1.5,-H*.26),-1,lambda f:'nose' in f['tags'])
    p.turn('Turn over to expose the small point',7,(0,1,0),math.pi)
    p.fold('Fold the small exposed point down',8,(-1.5,0),(1.5,0),1)
    # Tag the two physical wing halves before the central body fold.
    tagged=[]
    for f in p.faces:
        for sign,name in [(1,'wing_left'),(-1,'wing_right')]:
            piece=clip(f,Vector((0,-H,0)),Vector((0,H,0)),sign)
            if piece: piece['tags'].add(name);tagged.append(piece)
    p.faces=tagged
    p.fold('Close the model along its center',8,(0,-H),(0,H),1,under=True)
    p.fold('Fold the first wing, keeping a body strip',9,(.17,-H),(.17,.2),-1,
           lambda f:'wing_right' in f['tags'],angle=math.radians(76))
    p.fold('Fold the matching wing on the other side',9,(.17,-H),(.17,.2),-1,
           lambda f:'wing_left' in f['tags'],angle=math.radians(76),under=True)
    p.turn('Open the wings into flying position',9,(0,1,0),-math.pi/2)
    p.hold('Your finished flying bat — all sides',10,orbit=True)
    return p

def material(name,color,roughness=.8,paper=False):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Roughness'].default_value=roughness
    if paper:
        noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=360;noise.inputs['Detail'].default_value=2
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.007
        links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
        bsdf.inputs['Specular IOR Level'].default_value=.23
    return mat

def point_camera(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def setup_studio(output,width):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=width;scene.render.resolution_y=int(width*3/4)
    scene.render.resolution_percentage=100;scene.render.fps=FPS
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
    scene.render.film_transparent=False
    scene.world.color=(.3,.3,.3);scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.75,.79,.84,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.25
    scene.view_settings.view_transform='AgX'
    if hasattr(scene,'eevee') and hasattr(scene.eevee,'taa_render_samples'):scene.eevee.taa_render_samples=32
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.075));ground=bpy.context.object;ground.name='Warm seamless studio surface'
    ground.data.materials.append(material('Deep blue-gray studio backdrop',(.025,.040,.065),.93))
    for name,loc,energy,size,color in [
        ('Large softbox',(-3,-2,6),650,5,(1,.92,.80)),
        ('Cool fill',(4,1,4),250,4,(.80,.88,1)),
        ('Edge light',(-1,4,3),350,3,(1,.97,.86))]:
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
        data.use_shadow=name=='Large softbox'
        light=bpy.data.objects.new(name,data);scene.collection.objects.link(light);light.location=loc;point_camera(light,(0,0,0))
    data=bpy.data.cameras.new('Studio camera');cam=bpy.data.objects.new('Studio camera',data);scene.collection.objects.link(cam)
    scene.camera=cam;cam.location=(3.4,-5.4,6.8);point_camera(cam,(0,0,.2));data.type='ORTHO';data.ortho_scale=5.0;data.lens=50
    return scene,cam

def build_animation(paper,scene,cam):
    front=material('Warm yellow folding paper',(.86,.62,.22),paper=True)
    edge=material('Warm golden paper cut edge',(.46,.31,.08),paper=True)
    source=bpy.data.collections.new('Single sheet — folded surfaces');scene.collection.children.link(source)
    objects=[];metadata=[]
    total=len(paper.actions)
    for n,a in enumerate(paper.actions):
        start=1+n*ACTION_FRAMES;end=start+ACTION_FRAMES-1
        coords=[];faces=[];uvs=[];lookup={};flat_indices=[]
        for f,moves in zip(a['faces'],a['moving']):
            face=[]
            for v in f['v']:
                identity=tuple(round(c,6) for c in (*v['p'],*v['uv']))+(moves,)
                if identity not in lookup:
                    lookup[identity]=len(coords);coords.append(tuple(v['p']));uvs.append(v['uv'])
                idx=lookup[identity];face.append(idx);flat_indices.append(idx)
            faces.append(face)
        mesh=bpy.data.meshes.new(f'Sheet topology {n:02d}');mesh.from_pydata(coords,[],faces);mesh.update()
        obj=bpy.data.objects.new(f'{n:02d} · {a["title"]}',mesh);source.objects.link(obj);objects.append(obj)
        mesh.materials.append(front);mesh.materials.append(edge)
        uv=mesh.uv_layers.new(name='Original rectangular sheet')
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                raw=uvs[mesh.loops[li].vertex_index];uv.data[li].uv=((raw[0]+W)/(2*W),(raw[1]+H)/(2*H))
        solid=obj.modifiers.new('Construction paper thickness','SOLIDIFY');solid.thickness=THICKNESS;solid.offset=0;solid.material_offset_rim=1
        bevel=obj.modifiers.new('Soft paper crease edges','BEVEL');bevel.width=.0013;bevel.segments=3;bevel.affect='EDGES'
        obj.shape_key_add(name='Unfolded action start')
        # Twelve arc samples, interpolated at 24 fps, keep the fold genuinely 3D.
        samples=12
        for j in range(1,samples+1):
            key=obj.shape_key_add(name=f'Fold arc {j:02d}')
            evaluated=Paper.evaluate(a,j/samples)
            verts=[v['p'] for f in evaluated for v in f['v']]
            for idx,value in zip(flat_indices,verts):key.data[idx].co=value
            for k in range(samples+1):
                frame=start+12+round(k*(ACTION_FRAMES-25)/samples)
                key.value=1 if k==j else 0;key.keyframe_insert('value',frame=frame)
        # Visibility is keyframed in scale so the exported glTF retains it.
        for frame,on in [(0,False),(start-1,False),(start,True),(end,True),(end+1,False),(total*ACTION_FRAMES+1,False)]:
            obj.scale=(1,1,1) if on else (0,0,0);obj.keyframe_insert('scale',frame=frame)
        # Keep the lowest layer above the studio surface throughout a turn,
        # including both ends; never hide half the model beneath the floor.
        for k in range(samples+1):
            t=k/samples;posed=Paper.evaluate(a,t)
            obj.location.z=.018-min(v['p'].z for f in posed for v in f['v'])
            frame=start+12+round(k*(ACTION_FRAMES-25)/samples)
            obj.keyframe_insert('location',frame=frame)
        if a['kind']=='orbit':
            for frame,angle in [(start,0),(end,math.tau)]:obj.rotation_euler.z=angle;obj.keyframe_insert('rotation_euler',frame=frame)
        # Later steps get a closer framing, without cutting off the lifted flap.
        scale=4.8 if n<10 else 3.7
        for frame in (start,end):
            cam.data.ortho_scale=scale;cam.data.keyframe_insert('ortho_scale',frame=frame)
            center_y=0 if n<10 else -.42
            cam.location=(3.4,-5.4+center_y,6.8);point_camera(cam,(0,center_y,.2))
            cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
        metadata.append({'index':n,'step':a['step'],'title':a['title'],'start_frame':start,'end_frame':end,
                         'start':(start-1)/FPS,'end':end/FPS,'faces':len(faces)})
    scene.frame_start=1;scene.frame_end=total*ACTION_FRAMES
    # Blender 5 action slots use channelbags, not the pre-4.4 action.fcurves API.
    for action in bpy.data.actions:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for kp in curve.keyframe_points:
                            kp.interpolation='CONSTANT' if curve.data_path=='scale' else 'LINEAR'
    return objects,metadata

def export_thick_model(objects,output):
    """Bake Solidify into every morph target, so browser paper has real edges."""
    bpy.ops.object.select_all(action='DESELECT')
    exported=[]
    for obj in objects:
        keys=obj.data.shape_keys
        key_action=keys.animation_data.action if keys.animation_data else None
        key_slot=keys.animation_data.action_slot if keys.animation_data else None
        keys.animation_data_clear()
        for mod in obj.modifiers:
            if mod.type=='BEVEL':mod.show_viewport=False
        for key in keys.key_blocks:key.value=0
        bpy.context.view_layer.update()
        dg=bpy.context.evaluated_depsgraph_get()
        mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(dg),depsgraph=dg)
        baked=bpy.data.objects.new(obj.name+' · solid paper',mesh);bpy.context.scene.collection.objects.link(baked)
        baked.location=obj.location;baked.rotation_euler=obj.rotation_euler;baked.scale=obj.scale
        baked.shape_key_add(name='Unfolded action start')
        for key in list(keys.key_blocks)[1:]:
            key.value=1;bpy.context.view_layer.update()
            posed=bpy.data.meshes.new_from_object(obj.evaluated_get(dg),depsgraph=dg)
            if len(posed.vertices)!=len(mesh.vertices):raise RuntimeError('Solidify topology changed')
            target=baked.shape_key_add(name=key.name)
            for v,p in zip(target.data,posed.vertices):v.co=p.co
            bpy.data.meshes.remove(posed);key.value=0
        if key_action:
            animation=baked.data.shape_keys.animation_data_create();animation.action=key_action;animation.action_slot=key_slot
        if obj.animation_data:
            animation=baked.animation_data_create();animation.action=obj.animation_data.action;animation.action_slot=obj.animation_data.action_slot
        baked.select_set(True);exported.append(baked)
    bpy.context.view_layer.objects.active=exported[0]
    bpy.context.scene.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=str(output/'flying_bat.glb'),export_format='GLB',use_selection=True,
                              export_animations=True,export_apply=False,export_materials='EXPORT',export_cameras=False,
                              export_lights=False,export_animation_mode='SCENE',export_frame_range=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--width',type=int,default=960)
    parser.add_argument('--preview',action='store_true');parser.add_argument('--render',action='store_true');parser.add_argument('--export',action='store_true')
    parser.add_argument('--start',type=int);parser.add_argument('--end',type=int)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    output=Path(args.output).resolve();output.mkdir(parents=True,exist_ok=True)
    paper=create_sequence();scene,cam=setup_studio(output,args.width);objects,metadata=build_animation(paper,scene,cam)
    (output/'chapters.json').write_text(json.dumps({'fps':FPS,'frames':scene.frame_end,'actions':metadata},indent=2))
    scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(output/'flying_bat.blend'),compress=True)
    if args.preview:
        for n,t in [(0,0),(3,.55),(6,1),(10,.55),(14,1),(19,1),(20,.35)]:
            frame=1+n*ACTION_FRAMES+round(t*(ACTION_FRAMES-1));scene.frame_set(frame)
            scene.render.filepath=str(output/f'preview-{n:02d}.png');bpy.ops.render.render(write_still=True)
    if args.render:
        scene.render.filepath=str(output/'frames'/'frame-');(output/'frames').mkdir(exist_ok=True)
        if args.start:scene.frame_start=args.start
        if args.end:scene.frame_end=args.end
        bpy.ops.render.render(animation=True)
    if args.export:export_thick_model(objects,output)
    print('BAT_BUILD_COMPLETE',json.dumps({'actions':len(metadata),'frames':scene.frame_end,'output':str(output)}),flush=True)

if __name__=='__main__':main()
