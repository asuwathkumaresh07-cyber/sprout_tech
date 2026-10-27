"""Offline film render of the exact scene authored in dist/campus.js."""
import bpy, json, base64, math, sys, struct
from pathlib import Path
from mathutils import Matrix, Vector, Quaternion

root=Path(__file__).resolve().parent.parent/'outputs'
data=json.loads((root/'campus-scene.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples=16
scene.render.resolution_x=960
scene.render.resolution_y=540
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.fps=12
scene.frame_start=1
scene.frame_end=len(data['frames'])
scene.world.color=(.35,.45,.32)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.67,.51,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
env=scene.world.node_tree.nodes.new('ShaderNodeTexEnvironment')
env.image=bpy.data.images.load(str(root.parent/'dist'/'assets'/'xanderklinge.jpg'),check_existing=True)
scene.world.node_tree.links.new(env.outputs['Color'],scene.world.node_tree.nodes['Background'].inputs['Color'])
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
images={}
for uuid,item in data['textures'].items():
    p=root/(uuid+'.png')
    p.write_bytes(base64.b64decode(item['url'].split(',',1)[1]))
    images[uuid]=bpy.data.images.load(str(p))
mats={}
for uuid,item in data['materials'].items():
    mat=bpy.data.materials.new(uuid)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    bsdf=nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*item['color'],1)
    bsdf.inputs['Roughness'].default_value=item['roughness']
    bsdf.inputs['Metallic'].default_value=item['metalness']
    bsdf.inputs['Emission Color'].default_value=(*item['color'],1)
    bsdf.inputs['Emission Strength'].default_value=.22
    if item['opacity']<.99 or item.get('transparent'):
        bsdf.inputs['Alpha'].default_value=item['opacity']
        mat.surface_render_method='DITHERED'
    if any(item['emissive']):
        bsdf.inputs['Emission Color'].default_value=(*item['emissive'],1)
        bsdf.inputs['Emission Strength'].default_value=item['emissiveIntensity']
    if item.get('map'):
        tex=nodes.new('ShaderNodeTexImage');tex.image=images[item['map']]
        mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
        mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Emission Color'])
        mat.node_tree.links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha'])
        mat.surface_render_method='DITHERED'
        bsdf.inputs['Emission Strength'].default_value=.8 if item.get('basic') else .12
        repeat=data['textures'][item['map']]['repeat']
        if repeat!=[1,1]:
            coord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(*repeat,1)
            mat.node_tree.links.new(coord.outputs['UV'],mapping.inputs[0]);mat.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
    mats[uuid]=mat

convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def matrix(values):return Matrix([values[i:i+4] for i in range(0,16,4)]).transposed()
geometries={}
for item in data['meshes']:
    key=(item['geometry'],item['material'])
    if key not in geometries:
        mesh=bpy.data.meshes.new('original-campus-mesh')
        v=item['vertices'];inds=item['indices']
        mesh.from_pydata([v[i:i+3] for i in range(0,len(v),3)],[],[inds[i:i+3] for i in range(0,len(inds),3)])
        mesh.materials.append(mats[item['material']])
        if item.get('uv'):
            uv=mesh.uv_layers.new(name='UVMap');values=item['uv']
            for polygon in mesh.polygons:
                for loop in polygon.loop_indices:
                    vertex=mesh.loops[loop].vertex_index
                    uv.data[loop].uv=values[vertex*2:vertex*2+2]
        mesh.update()
        if item.get('normals'):
            normals=item['normals']
            for polygon in mesh.polygons:polygon.use_smooth=True
            mesh.normals_split_custom_set_from_vertices([normals[i:i+3] for i in range(0,len(normals),3)])
        geometries[key]=mesh
    parent=matrix(item['matrix'])
    instances=item.get('instances')
    transforms=[matrix(instances[i:i+16]) for i in range(0,len(instances),16)] if instances else [Matrix.Identity(4)]
    for transform in transforms:
        obj=bpy.data.objects.new('campus-'+str(item['id']),geometries[key]);scene.collection.objects.link(obj);obj.matrix_world=convert@parent@transform

# Use the same downloaded props and normalized placements as the interactive lab.
for prop in data.get('imports',[]):
    before=set(scene.objects)
    asset_path=root.parent/'dist'/'assets'/prop['file']
    if prop['file'].startswith('lab-'):
        # Older source exports include empty scenes, which Blender 4.5 rejects.
        raw=asset_path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
        document=json.loads(raw[20:20+length]);document['scenes']=[document['scenes'][document.get('scene',0)]];document['scene']=0
        payload=json.dumps(document).encode();payload+=b' '*((-len(payload))%4)
        tail=raw[20+length:]
        asset_path=root/('render-'+asset_path.name)
        asset_path.write_bytes(b'glTF'+struct.pack('<II',2,20+len(payload)+len(tail))+struct.pack('<I',len(payload))+b'JSON'+payload+tail)
    bpy.ops.import_scene.gltf(filepath=str(asset_path))
    imported=set(scene.objects)-before
    roots=[obj for obj in imported if obj.parent not in imported]
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(corner) for obj in imported if obj.type=='MESH' for corner in obj.bound_box]
    low=Vector(tuple(min(v[i] for v in points) for i in range(3)))
    high=Vector(tuple(max(v[i] for v in points) for i in range(3)))
    # Blender imports glTF into Z-up coordinates; convert back to Three.js Y-up.
    axis={'x':0,'y':2,'z':1}[prop.get('axis','y')]
    scale=prop['size']/max(high[axis]-low[axis],.001)
    center=(low+high)/2
    normalize=Matrix.Scale(scale,4)@Matrix.Translation((-center.x,-center.y,-low.z))
    placement=Matrix.Translation((prop['x'],prop['y'],prop['z']))@Matrix.Rotation(prop.get('yaw',0),4,'Y')
    pavilion=Matrix.Translation((-8,0,-18))@Matrix.Diagonal((1.48,1.32,1.48,1))
    for obj in roots:obj.matrix_world=convert@pavilion@placement@convert.inverted()@normalize@obj.matrix_world

sun_data=bpy.data.lights.new('Morning sunlight','SUN');sun_data.energy=2.0;sun_data.angle=.15
sun=bpy.data.objects.new('Morning sunlight',sun_data);scene.collection.objects.link(sun)
sun.rotation_euler=Vector((16,12,-29)).to_track_quat('-Z','Y').to_euler()
for z in [0,18,34,51,72]:
    light_data=bpy.data.lights.new('Forest skylight','AREA');light_data.energy=1900;light_data.shape='DISK';light_data.size=18
    light=bpy.data.objects.new('Forest skylight',light_data);scene.collection.objects.link(light);light.location=(0,z,10)
cam_data=bpy.data.cameras.new('Visitor perspective');cam=bpy.data.objects.new('Visitor perspective',cam_data);scene.collection.objects.link(cam);scene.camera=cam
cam_data.lens=36/(2*math.tan(math.radians(57)/2)*(16/9));cam_data.clip_start=.1;cam_data.clip_end=250
cam.rotation_mode='QUATERNION';previous=None
for index,item in enumerate(data['frames']):
    x,y,z,w=item['quaternion'];q=Quaternion((w,x,y,z));pos=Vector(item['position'])
    world=convert@Matrix.LocRotScale(pos,q,Vector((1,1,1)))
    cam.location=world.to_translation();rotation=world.to_quaternion()
    if previous and previous.dot(rotation)<0:rotation.negate()
    cam.rotation_quaternion=rotation;previous=rotation.copy()
    cam.keyframe_insert('location',frame=index+1);cam.keyframe_insert('rotation_quaternion',frame=index+1)
frames_dir=root/'campus-frames';frames_dir.mkdir(exist_ok=True)
scene.render.filepath=str(frames_dir/'frame-')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'sprout-campus.blend'))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if 'preview' in args:
    for frame in [1,104,181,253,325]:
        scene.frame_set(frame);scene.render.filepath=str(root/f'campus-preview-{frame}.png');bpy.ops.render.render(write_still=True)
elif 'lab-preview' in args:
    scene.render.resolution_x=1440;scene.render.resolution_y=900
    for frame in [90,110,119]:
        scene.frame_set(frame);scene.render.filepath=str(root/f'lab-preview-{frame}.png');bpy.ops.render.render(write_still=True)
    cam.animation_data_clear()
    cam.location=(-7.8,9,2.8)
    cam.rotation_mode='QUATERNION'
    cam.rotation_quaternion=(Vector((-9,20,1.7))-cam.location).to_track_quat('-Z','Y')
    cam.data.lens=24
    scene.render.filepath=str(root/'lab-overview.png');bpy.ops.render.render(write_still=True)
elif 'animate' in args:
    bpy.ops.render.render(animation=True)
