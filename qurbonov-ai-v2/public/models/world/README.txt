O'ZINGIZ YASAGAN 3D MODELLAR (ixtiyoriy)

1) Blender yoki Unity'da model yasang va .glb qilib eksport qiling
   (Unity: "UnityGLTF" yoki "glTFast" paketi bilan; Blender: File > Export > glTF 2.0 (.glb)).
2) .glb faylni shu papkaga (public/models/world/) tashlang.
3) list.json ichiga qaysi narsa o'rniga qo'yilishini yozing, masalan:

{
  "house": "uy.glb",
  "castle": "qasr.glb",
  "tree": "daraxt.glb",
  "rock": "tosh.glb"
}

Nomlar: house, castle, farm, lumber, mine, market, fountain, tower, wall, barracks, guild, tree, rock.
O'lchami katakka avtomatik moslanadi. Bitta fayl 25 MB dan kichik bo'lsin (yaxshisi 1-3 MB).
