# Render de comprobación de un .glb: blender -b --factory-startup --python preview.py -- in.glb out.png
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# separar la bota a un lado para verla
for o in objs:
    if o.name.startswith('BootModel'): o.location.x += 0.16
mn = Vector((1e9, 1e9, 1e9)); mx = -mn
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
ctr = (mn + mx) / 2; size = (mx - mn).length
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
cam.location = ctr + Vector((0.35, -0.9, 0.25)) * size * float(a[2] if len(a) > 2 else 1.7)
d = ctr - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = cam
for loc, e in [((1, -1, 2), 4), ((-2, 1, 1), 2)]:
    l = bpy.data.objects.new('l', bpy.data.lights.new('l', 'SUN')); l.data.energy = e
    l.rotation_euler = (Vector(loc)).to_track_quat('Z', 'Y').to_euler(); bpy.context.collection.objects.link(l)
w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.6, 0.62, 0.66, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
s = bpy.context.scene; s.render.engine = 'CYCLES'; s.cycles.samples = 24; s.cycles.device = 'CPU'
s.render.resolution_x, s.render.resolution_y = 900, 640; s.render.filepath = out
bpy.ops.render.render(write_still=True)
