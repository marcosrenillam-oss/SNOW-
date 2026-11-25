# Cabeza de avatar estilo animación (ojos grandes, gorro con pompón, gafas sobre el gorro).
# Uso: blender --background --factory-startup --python tools/blender/avatar.py -- assets/models/avatar.glb
# Coordenadas Blender: la cara mira hacia -Y, Z arriba. Origen = base del cráneo (unión con el cuello).
import bpy, bmesh, math, sys
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=0.5, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return m
M = {
    'Skin': mat('Skin', (0.78, 0.5, 0.38), 0.55), 'EyeWhite': mat('EyeWhite', (0.92, 0.92, 0.95), 0.12),
    'Iris': mat('Iris', (0.16, 0.32, 0.55), 0.15), 'Pupil': mat('Pupil', (0.01, 0.01, 0.012), 0.1),
    'Glint': mat('Glint', (1, 1, 1), 0.1, 0, 2.0), 'Hair': mat('Hair', (0.12, 0.06, 0.03), 0.55),
    'Mouth': mat('Mouth', (0.35, 0.06, 0.07), 0.5), 'Blush': mat('Blush', (0.85, 0.35, 0.32), 0.6),
    'Beanie': mat('Beanie', (0.7, 0.05, 0.08), 0.9), 'Pompom': mat('Pompom', (0.9, 0.9, 0.9), 0.95),
    'GoggleFrame': mat('GoggleFrame', (0.02, 0.02, 0.025), 0.4), 'Lens': mat('Lens', (0.9, 0.45, 0.1), 0.05, 0.9),
}

def add(o, material):
    o.data.materials.clear(); o.data.materials.append(M[material]); return o

def sphere(name, r, loc, scale=(1, 1, 1), material='Skin', seg=48, rings=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    for p in o.data.polygons: p.use_smooth = True
    return add(o, material)

def torus(name, R, r, loc, rot=(0, 0, 0), material='Skin', arc=None, maj=64, mino=16, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mino, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    if arc:  # deja sólo un arco del toro
        bm = bmesh.new(); bm.from_mesh(o.data)
        c = Vector(loc)
        kill = []
        for v in bm.verts:
            d = o.matrix_world.inverted() @ (o.matrix_world @ v.co)
            a = math.atan2(v.co.z - 0 if False else (v.co - (o.matrix_world.inverted() @ c)).z, (v.co - (o.matrix_world.inverted() @ c)).x)
        bm.free()
    for p in o.data.polygons: p.use_smooth = True
    return add(o, material)

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); objs[0].name = name
    return objs[0]

def subsurf(o, lv=1):
    m = o.modifiers.new('s', 'SUBSURF'); m.levels = lv; m.render_levels = lv
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='s')
    for p in o.data.polygons: p.use_smooth = True

# ---------- Cabeza (metaballs: cráneo + mejillas + barbilla) ----------
mb = bpy.data.metaballs.new('HeadMB'); mb.resolution = 0.006; mb.threshold = 0.32
mbo = bpy.data.objects.new('HeadMB', mb); bpy.context.collection.objects.link(mbo)
def ball(x, y, z, r, sx, sy, sz, stiff=2.0):
    e = mb.elements.new(); e.type = 'ELLIPSOID'; e.co = (x, y, z); e.radius = r; e.size_x, e.size_y, e.size_z = sx, sy, sz; e.stiffness = stiff
ball(0, 0.0, 0.085, 0.12, 1.0, 1.02, 0.95)      # cráneo
ball(0, -0.025, 0.035, 0.1, 0.92, 0.82, 0.8)    # mejillas
ball(0, -0.045, 0.0, 0.065, 0.7, 0.6, 0.55)     # barbilla
bpy.context.view_layer.objects.active = mbo; mbo.select_set(True)
bpy.ops.object.convert(target='MESH')
head = bpy.context.active_object; head.name = 'Head'
head.scale = (1.28, 1.1, 1.12); bpy.ops.object.transform_apply(scale=True)
m = head.modifiers.new('d', 'DECIMATE'); m.ratio = 0.18
bpy.ops.object.modifier_apply(modifier='d')
subsurf(head, 1); add(head, 'Skin')

# ---------- Ojos grandes ----------
parts = [head]
for sx in (-1, 1):
    ex, ey, ez = sx * 0.046, -0.094, 0.088
    eye = sphere('eye', 0.031, (ex, ey, ez), (1.0, 0.72, 1.22), 'EyeWhite', 40, 24)
    iris = sphere('iris', 0.021, (ex - sx * 0.003, ey - 0.017, ez - 0.004), (1, 0.42, 1.12), 'Iris', 32, 20)
    pupil = sphere('pupil', 0.012, (ex - sx * 0.003, ey - 0.0235, ez - 0.004), (1, 0.32, 1.15), 'Pupil', 24, 16)
    glint = sphere('glint', 0.0055, (ex + sx * 0.004, ey - 0.028, ez + 0.01), (1, 0.5, 1), 'Glint', 16, 12)
    glint2 = sphere('glint', 0.0026, (ex - sx * 0.008, ey - 0.0275, ez - 0.011), (1, 0.5, 1), 'Glint', 12, 8)
    # párpado superior (piel) que cubre el ojo un poco
    lid = sphere('lid', 0.034, (ex, ey + 0.002, ez + 0.003), (1.04, 0.76, 1.22), 'Skin', 40, 24)
    bm = bmesh.new(); bm.from_mesh(lid.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < ez + 0.022], context='VERTS')
    bm.to_mesh(lid.data); bm.free()
    sol = lid.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.002
    bpy.context.view_layer.objects.active = lid; bpy.ops.object.modifier_apply(modifier='sol')
    # ceja
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0042, depth=0.038, location=(ex, ey - 0.014, ez + 0.05), rotation=(0, math.pi / 2 + sx * 0.25, sx * 0.15))
    brow = bpy.context.active_object; add(brow, 'Hair')
    for p in brow.data.polygons: p.use_smooth = True
    blush = sphere('blush', 0.011, (sx * 0.064, -0.099, 0.042), (1.25, 0.1, 0.7), 'Blush', 24, 16)
    ear = sphere('ear', 0.02, (sx * 0.112, -0.005, 0.07), (0.45, 0.8, 1.15), 'Skin', 24, 16)
    parts += [eye, iris, pupil, glint, glint2, lid, brow, blush, ear]

nose = sphere('nose', 0.015, (0, -0.118, 0.052), (1.0, 0.9, 0.85), 'Skin', 32, 20)
# sonrisa: arco de toro
bpy.ops.mesh.primitive_torus_add(major_radius=0.026, minor_radius=0.0042, major_segments=48, minor_segments=10, location=(0, -0.108, 0.028), rotation=(math.pi / 2, 0, 0))
smile = bpy.context.active_object; smile.name = 'smile'
bm = bmesh.new(); bm.from_mesh(smile.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -0.006], context='VERTS')   # deja la mitad de abajo (sonrisa)
bm.to_mesh(smile.data); bm.free(); add(smile, 'Mouth')
for p in smile.data.polygons: p.use_smooth = True
smile.scale = (1, 1, 0.75); bpy.context.view_layer.objects.active = smile; bpy.ops.object.transform_apply(scale=True)
parts += [nose, smile]

# ---------- Pelo (flequillo y patillas bajo el gorro) ----------
hair = []
for i in range(9):
    t = (i - 4) / 4
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.02, radius2=0.002, depth=0.06, location=(t * 0.08, -0.1 + abs(t) * 0.035, 0.142 - abs(t) * 0.012), rotation=(math.radians(155 - abs(t) * 25), t * 0.45, t * 0.25))
    c = bpy.context.active_object; add(c, 'Hair'); hair.append(c)
for sx in (-1, 1):
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.02, radius2=0.002, depth=0.06, location=(sx * 0.1, -0.03, 0.1), rotation=(math.pi, sx * 0.2, 0))
    c = bpy.context.active_object; add(c, 'Hair'); hair.append(c)
hairO = join(hair, 'Hair')
subsurf(hairO, 1)

# ---------- Gorro de lana con pompón ----------
beanie = sphere('Beanie', 0.119, (0, 0.004, 0.14), (1.0, 1.06, 1.08), 'Beanie', 48, 32)
bm = bmesh.new(); bm.from_mesh(beanie.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0.15], context='VERTS')
bm.to_mesh(beanie.data); bm.free()
sol = beanie.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.006
bpy.context.view_layer.objects.active = beanie; bpy.ops.object.modifier_apply(modifier='sol')
cuff = torus('cuff', 0.113, 0.015, (0, 0.004, 0.153), (0, 0, 0), 'Beanie', None, 64, 16, (1, 1.06, 1.25))
pom = sphere('Pompom', 0.038, (0, 0.004, 0.268), (1, 1, 0.9), 'Pompom', 32, 20)
bm = bmesh.new(); bm.from_mesh(pom.data)
for v in bm.verts: v.co += v.normal * (math.sin(v.co.x * 900) * math.sin(v.co.y * 870) * math.sin(v.co.z * 910)) * 0.004
bm.to_mesh(pom.data); bm.free()
beanieO = join([beanie, cuff], 'Beanie')

# ---------- Gafas sobre el gorro ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.114, depth=0.04, location=(0, 0.004, 0.198), end_fill_type='NOTHING')
fr = bpy.context.active_object; fr.scale = (1, 1.05, 1); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(fr.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -0.055], context='VERTS')
bm.to_mesh(fr.data); bm.free()
sol = fr.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.012
bpy.context.view_layer.objects.active = fr; bpy.ops.object.modifier_apply(modifier='sol')
add(fr, 'GoggleFrame'); fr.name = 'Goggles'
for p in fr.data.polygons: p.use_smooth = True
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.1185, depth=0.028, location=(0, 0.004, 0.198), end_fill_type='NOTHING')
ln = bpy.context.active_object; ln.scale = (1, 1.05, 1); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(ln.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -0.07], context='VERTS')
bm.to_mesh(ln.data); bm.free(); add(ln, 'Lens'); ln.name = 'Lens'
for p in ln.data.polygons: p.use_smooth = True
strap = torus('Strap', 0.112, 0.006, (0, 0.004, 0.198), (0, 0, 0), 'GoggleFrame', None, 64, 10, (1, 1.06, 1.6))

face = join(parts, 'Face')

bpy.ops.object.select_all(action='SELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH' and o.name not in ('Head',):
        d = o.modifiers.new('dd', 'DECIMATE'); d.ratio = 0.5
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dd')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_texcoords=False)
print('EXPORTED', out)
