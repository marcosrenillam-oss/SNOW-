# Modelado de la fijación y la bota en Blender (modo sin pantalla).
# Uso: blender --background --factory-startup --python tools/blender/binding.py -- assets/models/binding.glb
# Coordenadas Blender: X = ancho, -Y = puntera, +Y = talón, Z = arriba (glTF lo pasa a Y-arriba).
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m
M = {n: mat(n, c, r, mt) for n, c, r, mt in [
    ('Frame', (0.03, 0.03, 0.035), 0.62, 0), ('High', (0.025, 0.025, 0.03), 0.55, 0), ('Strap', (0.04, 0.04, 0.045), 0.8, 0),
    ('Pad', (0.07, 0.07, 0.08), 0.9, 0), ('Metal', (0.6, 0.62, 0.65), 0.35, 1), ('Disc', (0.05, 0.05, 0.06), 0.5, 0.4),
    ('Screw', (0.55, 0.56, 0.58), 0.3, 1), ('Boot', (0.06, 0.065, 0.075), 0.7, 0), ('Sole', (0.02, 0.02, 0.022), 0.9, 0),
    ('Lace', (0.015, 0.015, 0.018), 0.8, 0), ('Accent', (0.8, 0.1, 0.15), 0.6, 0)]}

def obj_from_bm(bm, name, material, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(M[material]); o.location = loc
    return o

def mod(o, kind, **kw):
    m = o.modifiers.new(kind, kind)
    for k, v in kw.items(): setattr(m, k, v)
    return m

def apply_all(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def smooth(o, angle=40):
    for p in o.data.polygons: p.use_smooth = True
    mod(o, 'WEIGHTED_NORMAL', keep_sharp=True)
    apply_all(o)

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name; objs[0].data.name = name
    return objs[0]

def boolean_cut(target, cutter):
    m = target.modifiers.new('bool', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = cutter; m.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier='bool')
    bpy.data.objects.remove(cutter, do_unlink=True)

def box(name, size, loc, material, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(M[material])
    if bevel: mod(o, 'BEVEL', width=bevel, segments=3, limit_method='ANGLE'); apply_all(o)
    return o

def cyl(name, r, depth, loc, material, verts=48, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.data.materials.append(M[material])
    if bevel: mod(o, 'BEVEL', width=bevel, segments=3, limit_method='ANGLE'); apply_all(o)
    return o

# ---------- Disco y tornillos ----------
disc = cyl('Disc', 0.062, 0.008, (0, 0, 0.004), 'Disc', 64, bevel=0.0018)
groove = bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.0022, location=(0, 0, 0.0082))
g = bpy.context.active_object; boolean_cut(disc, g)
for i in range(36):  # marcas de grados
    a = i / 36 * math.tau
    c = box('tick', (0.0012, 0.006, 0.003), (math.cos(a) * 0.056, math.sin(a) * 0.056, 0.0085), 'Disc', rot=(0, 0, a + math.pi / 2))
    boolean_cut(disc, c)
smooth(disc)
screws = []
for i in range(4):
    a = i * math.pi / 2 + math.pi / 4
    s = cyl('s', 0.0075, 0.004, (math.cos(a) * 0.035, math.sin(a) * 0.035, 0.0095), 'Screw', 24, bevel=0.0012)
    hexo = cyl('h', 0.0034, 0.004, (math.cos(a) * 0.035, math.sin(a) * 0.035, 0.0112), 'Screw', 6)
    boolean_cut(s, hexo)
    screws.append(s)
screwsO = join(screws, 'Screws'); smooth(screwsO)
disc.location = (0, 0, 0)

# ---------- Base: placa + laterales calados + heelcup ----------
bm = bmesh.new()
W, L, R = 0.054, 0.13, 0.04
pts = []
for cx, cy, a0 in [(W - R, -L + R, -90), (W - R, L - R, 0), (-W + R, L - R, 90), (-W + R, -L + R, 180)]:
    for k in range(9):
        a = math.radians(a0 + k * 90 / 8)
        pts.append((cx + math.cos(a) * R, cy + math.sin(a) * R))
vs = [bm.verts.new((x, y, 0.018)) for x, y in pts]
f = bm.faces.new(vs)
ext = bmesh.ops.extrude_face_region(bm, geom=[f])
bmesh.ops.translate(bm, verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, 0.012))
plate = obj_from_bm(bm, 'Plate', 'Frame')
mod(plate, 'BEVEL', width=0.003, segments=3); apply_all(plate)
# ventana central de la placa
win = box('win', (0.05, 0.09, 0.05), (0, 0.02, 0.03), 'Frame', bevel=0.008); boolean_cut(plate, win)

walls = []
for sx in (-1, 1):
    bm = bmesh.new()
    prof = [(-0.09, 0.02), (-0.09, 0.034), (-0.03, 0.042), (0.03, 0.062), (0.08, 0.092), (0.125, 0.098), (0.13, 0.02)]
    vs = [bm.verts.new((sx * 0.056, y, z)) for y, z in prof]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)], vec=(sx * 0.008, 0, 0))
    w = obj_from_bm(bm, 'Wall', 'Frame')
    mod(w, 'BEVEL', width=0.0022, segments=3, limit_method='ANGLE'); apply_all(w)
    for cy, cz, s in [(0.03, 0.042, 0.013), (0.075, 0.06, 0.016)]:
        c = cyl('hole', s, 0.04, (sx * 0.06, cy, cz), 'Frame', 24, rot=(0, math.pi / 2, 0)); c.scale = (1, 1.6, 1)
        bpy.context.view_layer.objects.active = c; bpy.ops.object.transform_apply(scale=True)
        boolean_cut(w, c)
    walls.append(w)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.06, depth=0.08, location=(0, 0.105, 0.062))
cup = bpy.context.active_object; cup.name = 'Cup'
bm = bmesh.new(); bm.from_mesh(cup.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < 0.002], context='VERTS')
bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES')
bm.to_mesh(cup.data); bm.free()
cup.data.materials.append(M['Frame'])
mod(cup, 'SOLIDIFY', thickness=0.007, offset=1); mod(cup, 'BEVEL', width=0.002, segments=2, limit_method='ANGLE'); apply_all(cup)
# nervios del heelcup
ribs = []
for i in range(5):
    a = math.radians(-60 + i * 30)
    ribs.append(box('rib', (0.004, 0.006, 0.05), (math.sin(a) * 0.067, 0.105 + math.cos(a) * 0.067, 0.06), 'Frame', bevel=0.0012, rot=(0, 0, -a)))
frame = join([plate, *walls, cup, *ribs], 'Frame')
smooth(frame)

# ---------- Highback: concha con grosor y ranuras ----------
bm = bmesh.new()
S, V = 36, 22
R0, R1, H, A = 0.06, 0.052, 0.235, math.pi - 0.3
grid = []
for j in range(V + 1):
    row = []
    for i in range(S + 1):
        u = i / S; k = (u - 0.5) * 2
        hmax = H * (1 - 0.42 * k ** 4 - 0.1 * k * k)
        z = (j / V) * hmax
        r = R0 + (R1 - R0) * (z / H)
        a = (u - 0.5) * A
        row.append(bm.verts.new((math.sin(a) * r, math.cos(a) * r, z)))
    grid.append(row)
for j in range(V):
    for i in range(S):
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
hb = obj_from_bm(bm, 'Highback', 'High')
mod(hb, 'SOLIDIFY', thickness=0.0065, offset=0)
apply_all(hb)
for i in (-1, 0, 1):
    a = i * 0.34
    c = box('slot', (0.009, 0.05, 0.075), (math.sin(a) * 0.058, math.cos(a) * 0.058, 0.12 + abs(i) * 0.01), 'High', bevel=0.003, rot=(0, 0, -a))
    boolean_cut(hb, c)
# lomo central
spine = box('spine', (0.026, 0.008, 0.16), (0, 0.063, 0.1), 'High', bevel=0.003)
hb = join([hb, spine], 'Highback')
mod(hb, 'BEVEL', width=0.0015, segments=2, limit_method='ANGLE'); apply_all(hb)
smooth(hb)
hb.location = (0, 0.06, 0.06)
# la geometría estaba centrada en el origen: el objeto se coloca en su sitio (0, talón, altura)

# ---------- Straps (barrido de sección redondeada) ----------
def sweep(name, path, width, thick, material, segs=40):
    bm = bmesh.new()
    def pt(t):
        n = len(path) - 1; f = t * n; i = min(int(f), n - 1); u = f - i
        a, b = Vector(path[i]), Vector(path[i + 1]); return a.lerp(b, u)
    K = 12
    rings = []
    for s in range(segs + 1):
        t = s / segs
        p = pt(t); tan = (pt(min(1, t + 0.01)) - pt(max(0, t - 0.01))).normalized()
        side = Vector((0, 1, 0)); nrm = tan.cross(side).normalized()
        ring = []
        for k in range(K):
            a = k / K * math.tau
            # sección: rectángulo redondeado (superelipse)
            cx = math.copysign(abs(math.cos(a)) ** 0.35, math.cos(a)); cy = math.copysign(abs(math.sin(a)) ** 0.6, math.sin(a))
            ring.append(bm.verts.new(p + side * (cx * width / 2) + nrm * (cy * thick / 2)))
        rings.append(ring)
    for s in range(segs):
        for k in range(K):
            bm.faces.new((rings[s][k], rings[s][(k + 1) % K], rings[s + 1][(k + 1) % K], rings[s + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    o = obj_from_bm(bm, name, material); smooth(o); return o

def arch(w, h, n=24, z0=0.0):
    return [(math.cos(math.pi * (1 - i / n)) * w, 0, z0 + math.sin(math.pi * i / n) ** 0.85 * h) for i in range(n + 1)]

ank = sweep('AnkleStrap', arch(0.058, 0.09), 0.052, 0.014, 'Strap')
pad = sweep('AnklePad', [(x * 0.93, y, z - 0.007) for x, y, z in arch(0.058, 0.09)[3:-3]], 0.044, 0.01, 'Pad')
buckle = box('Buckle', (0.016, 0.028, 0.05), (0.064, 0, 0.03), 'Metal', bevel=0.003, rot=(0, 0.35, 0))
lever = box('Lever', (0.006, 0.02, 0.05), (0.07, 0, 0.05), 'Metal', bevel=0.002, rot=(0, 0.55, 0))
ladder = box('Ladder', (0.006, 0.016, 0.06), (-0.062, 0, 0.026), 'Frame', bevel=0.0015, rot=(0, -0.3, 0))
teeth = [box('tooth', (0.0035, 0.018, 0.0025), (-0.0655 + 0.0, 0, 0.004 + i * 0.008), 'Frame', rot=(0, -0.3, 0)) for i in range(6)]
ankle = join([ank, pad, buckle, lever, ladder, *teeth], 'Ankle')
ankle.location = (0, 0.045, 0.075)

toes = sweep('ToeStrap', arch(0.054, 0.055), 0.034, 0.011, 'Strap')
tbuckle = box('TBuckle', (0.012, 0.022, 0.035), (0.058, 0, 0.018), 'Metal', bevel=0.002, rot=(0, 0.3, 0))
toe = join([toes, tbuckle], 'Toe')
toe.location = (0, -0.088, 0.035)

# ---------- Bota (metaballs → malla orgánica) ----------
mb = bpy.data.metaballs.new('BootMB'); mb.resolution = 0.005; mb.render_resolution = 0.005; mb.threshold = 0.35
mbo = bpy.data.objects.new('BootMB', mb); bpy.context.collection.objects.link(mbo)
def ball(x, y, z, r, sx=1, sy=1, sz=1):
    e = mb.elements.new(); e.type = 'ELLIPSOID'; e.co = (x, y, z); e.radius = r
    e.size_x, e.size_y, e.size_z = sx, sy, sz; e.stiffness = 1.2
# pie: de la puntera al talón (bolas solapadas) + caña + lengüeta
for i in range(9):
    t = i / 8
    y = -0.125 + t * 0.235
    ball(0, y, 0.055 + 0.02 * t, 0.064, 0.98 + 0.06 * math.sin(t * math.pi), 1.0, 0.72 + t * 0.2)
for i in range(6):
    t = i / 5
    ball(0, 0.07 - t * 0.02, 0.1 + t * 0.13, 0.066, 1.0, 1.0, 0.85)
for i in range(4):  # lengüeta / empeine
    t = i / 3
    ball(0, -0.02 + t * 0.03, 0.11 + t * 0.11, 0.045, 0.75, 0.9, 0.9)
bpy.context.view_layer.objects.active = mbo; mbo.select_set(True)
bpy.ops.object.convert(target='MESH')
boot = bpy.context.active_object; boot.name = 'Boot'
boot.data.materials.append(M['Boot']); boot.data.materials.append(M['Lace'])
mod(boot, 'DECIMATE', ratio=0.35); apply_all(boot)
# zona de cordones: franja delantera del empeine y la lengüeta
for p in boot.data.polygons:
    c = p.center
    pass
smooth(boot)
sole = box('Sole', (0.118, 0.31, 0.028), (0, -0.005, 0.02), 'Sole', bevel=0.012)
for i in range(9):
    tread = box('tread', (0.12, 0.006, 0.01), (0, -0.13 + i * 0.032, 0.008), 'Sole')
    boolean_cut(sole, tread)
collar = bpy.ops.mesh.primitive_torus_add(major_radius=0.058, minor_radius=0.016, location=(0, 0.05, 0.262))
col = bpy.context.active_object; col.name = 'Collar'; col.data.materials.append(M['Accent'])
smooth(sole); smooth(col)
bpy.data.objects.remove(col, do_unlink=True)
bootAll = join([boot, sole], 'BootModel')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
                          export_yup=True, export_normals=True, export_materials='EXPORT', export_texcoords=False)
print('EXPORTED', out)
