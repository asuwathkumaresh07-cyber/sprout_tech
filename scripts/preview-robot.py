"""Render and inspect the downloaded robot with its authored idle animation."""
import bpy, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'dist/assets/bake3d-robot-animated.glb'))
scene=bpy.context.scene
print('ROBOT CLIPS:',[(action.name,tuple(action.frame_range)) for action in bpy.data.actions],flush=True)
for obj in scene.objects:
    if obj.type=='ARMATURE':
        idle=next((a for a in bpy.data.actions if 'idle' in a.name.lower()),None)
        if idle:
            obj.animation_data_create();obj.animation_data.action=idle
            if idle.slots:obj.animation_data.action_slot=idle.slots[0]
scene.frame_set(12);bpy.context.view_layer.update()
points=[obj.matrix_world@Vector(corner) for obj in scene.objects if obj.type=='MESH' for corner in obj.bound_box]
low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
center=(low+high)/2;height=high.z-low.z
print('ROBOT HEIGHT:',height,flush=True)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,low.z-.01))
floor=bpy.context.object;mat=bpy.data.materials.new('Studio');mat.diffuse_color=(.045,.075,.065,1);floor.data.materials.append(mat)
for name,position,power,color,size in [
    ('Key',(3,-4,5),1100,(1,.92,.8),4),
    ('Fill',(-3,-1,3),800,(.67,1,.87),3),
    ('Rim',(1,3,4),1400,(.85,.94,1),3)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.shape='DISK';light.size=size
    obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=position;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.17,.15,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
cam_data=bpy.data.cameras.new('Robot portrait');cam=bpy.data.objects.new('Robot portrait',cam_data);scene.collection.objects.link(cam);scene.camera=cam
cam.location=center+Vector((height*1.35,-height*2.7,height*.55));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.lens=52
scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=24
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(root/'outputs/imported-robot-preview.png');bpy.ops.render.render(write_still=True)
