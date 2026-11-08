SIZ YASAGAN 3D MODELLAR (Unity / Blender / AI)

1) Modelni .glb qilib eksport qiling:
   - Unity: Package Manager -> "glTFast" yoki "UnityGLTF" o'rnating -> Export -> .glb
   - Blender: File > Export > glTF 2.0 (.glb), "Animation" belgisi yoqilgan bo'lsin
   - AI (Meshy, Tripo va h.k.): GLB formatini tanlab yuklab oling (rig + animatsiya bilan bo'lsa yaxshi)
2) .glb faylni shu papkaga (public/models/world/) tashlang.
3) list.json ga qaysi narsa o'rniga ishlatilishini yozing. Masalan:

{
  "terrain": "yer.glb",
  "castle": "qasr.glb",
  "tree": "daraxt.glb",
  "rock": "tosh.glb",
  "sheep": "qoy.glb",
  "villager": "odam.glb",
  "enemy": "dushman1.glb",
  "enemy2": "dushman2.glb",
  "enemy3": "dushman3.glb"
}

NOMLAR:
- Yer: terrain  (o'yin maydoniga 22x22 cho'ziladi, hamma uning tepaliklari ustida yuradi)
- Binolar: house, home, castle, farm, lumber, mine, market, fountain, tower, wall, barracks, guild
- Tabiat: tree, rock
- Hayvonlar: sheep, chicken, rabbit, deer
- Aholi: villager (hammasi), yoki villager-farmer, villager-lumberjack, villager-miner ...
- Askarlar: soldier, archer, knight
- Dushmanlar: bat, wolf, goblin, troll — yoki umumiy enemy, enemy2, enemy3 ... (hujumda navbat bilan ko'paytiriladi)

ANIMATSIYA NOMLARI (modelning ichida shunday so'zlar bo'lsa, o'zi taniydi):
idle, walk, run, attack, die / death, work, cheer.  Animatsiyasiz model ham ishlaydi (sakrab yuradi).
O'lchami avtomatik moslanadi. Bitta fayl 25 MB dan kichik bo'lsin (yaxshisi 1-5 MB).
