# Montaje del vídeo «Kling 4.0 en Higgsfield» (patrocinado). La base es el corte del usuario (Video cortado.mp4, 25 fps,
# subido el 27/10 a las 14:34); el vídeo final (30 fps) es:
#   anuncio de 30 s entero con su sonido (gancho) → corte del usuario → [resultado Frames entero] → corte → [resultado
#   References] → corte → [resultado Edit] → corte hasta el final.
# Los resultados sustituyen los tramos en que Álvaro los mira en el navegador. Tras cada resultado se vuelve a la escena con
# su cámara. En los tramos de pantalla se alterna la escena dividida (su burbuja + la web, como en el corte) con la web a
# pantalla completa cuando maneja la web o lee; el paso de una a otra es una transformación suave (sin transición). La
# transición del ejemplo del cliente (12 fotogramas, a1/transicion.tsx) va solo en los cambios de escena.
# Encima: cámara virtual con zooms suaves y con curva, resaltados (el botón entero con glow y el resto atenuado),
# rótulos, el prompt traducido entero, comparativas A2/B/C rehechas, escenas a pantalla completa (fotogramas clave, «lo
# más valioso», el servicio) y la outro.
# Todo el texto en seg. del CORTE (c) y se pasa a tiempo de salida con T().
# Salida: remotion/src/kling/edl.json (imagen) y plan_audio.json (voz, resultados, efectos y música para la mezcla).
import json, math
R = "/home/user/videos-largos/trabajo/kling4"
FPS = 30
fr = lambda t: round(round(t * FPS) / FPS, 4)

DUR = {"r2": 30.042, "r3": 15.042, "r4": 15.042}
CORTE_FIN = 524.12
# (desde, hasta) del corte en cada tramo de base; entre medias, los resultados
BASES = [(0.0, 200.78), (224.43, 309.98), (324.63, 402.54), (416.83, CORTE_FIN)]
INSERTOS = [("r2", "FRAMES", 30, 120), ("r3", "REFERENCES", 15, 60), ("r4", "EDIT VIDEO", 15, 75)]

segs, mapa = [], []
t = 0.0
segs.append(dict(tipo="resultado", src="medios/r2.mp4", ini=0.0, dur=DUR["r2"], modo="gancho", creditos=30, antes=120))
t = fr(DUR["r2"])
limites = [t]  # bordes de los resultados (cambios de escena)
for i, (a, b) in enumerate(BASES):
    segs.append(dict(tipo="base", ini=t, dur=fr(b - a), desde=a))
    mapa.append((a, b, t))
    t = fr(t + (b - a))
    if i < len(INSERTOS):
        k, modo, cred, antes = INSERTOS[i]
        limites.append(t)
        segs.append(dict(tipo="resultado", src=f"medios/{k}.mp4", ini=t, dur=DUR[k], modo=modo, creditos=cred, antes=antes))
        t = fr(t + DUR[k])
        limites.append(t)
DURACION = t

def T(c):
    """segundo del corte → segundo del vídeo final (999 = «nunca»)"""
    if c >= 900: return 99999.0
    for a, b, t0 in mapa:
        if a - 1e-6 <= c <= b + 1e-6: return round(t0 + c - a, 3)
    raise ValueError(f"{c} cae en un inserto")

# ---------------- geometría de la escena de pantalla (coordenadas del corte nuevo, sin barra del navegador) ----------------
VC = dict(x=518, y=192, w=1381, h=699)   # ventana del navegador en el corte (con su borde blanco)
BC = dict(x=17, y=146, w=488, h=789)     # burbuja de la cámara en el corte
KW = 1840 / VC["w"]
WEB = dict(x=40, y=round((1080 - VC["h"] * KW) / 2, 2), w=1840, h=round(VC["h"] * KW, 2))  # la ventana a pantalla completa
PANT = json.load(open(f"{R}/trans/pantalla.json"))  # tramos en que el corte enseña la pantalla (burbuja + web)

# modo de cada tramo de pantalla: «web» (maneja la web o lee: la web a pantalla completa) o «dividida» (habla: su burbuja y la
# web, como en el corte). Lo que no está en la lista va dividido. Los cambios entre tramos contiguos se transforman.
MODOS_C = [(34.0, 45.08, "web"),
           (105.36, 106.4, "dividida"), (106.4, 141.7, "web"), (141.7, 147.9, "dividida"), (147.9, 175.3, "web"),
           (175.3, 180.45, "dividida"), (180.45, 186.3, "web"),
           (224.43, 256.3, "dividida"), (295.1, 309.98, "dividida"),
           (324.63, 357.0, "dividida"), (368.18, 378.9, "dividida"), (378.9, 402.54, "web"),
           (435.7, 492.92, "dividida")]
modos = [dict(a=T(a), b=T(b), m=m) for a, b, m in MODOS_C]

# ---------------- cámara virtual: (c, escala, x, y, duración) → centro de la vista en coordenadas de pantalla ----------------
web_x = lambda x: WEB["x"] + (x - VC["x"]) * KW
web_y = lambda y: WEB["y"] + (y - VC["y"]) * KW
CARA = (960, 400)  # su cara en los planos de cámara
camara, acentos = [], []
def cam(c, s, x, y, d):
    camara.append(dict(t=T(c), s=s, x=round(x, 1), y=round(y, 1), d=d))
def web(c, s, ex, ey, d=0.9):
    """zoom a un control de la web (ex, ey del corte): el panel de la izquierda queda pegado al borde con aire"""
    x = WEB["x"] - 18 + 960 / s if ex < 800 else web_x(ex)
    cam(c, s, x, web_y(ey), d)
def reposo(c, d=0.8):
    cam(c, 1.0, 960, 540, d)
# planos de cámara: un empuje lento y con curva a lo largo de cada tramo (alternando acercar / alejar) + acentos suaves
TRAMOS_CAM = [(0.0, 22.46), (27.62, 34.0), (45.08, 51.4), (51.4, 66.36), (66.36, 71.72), (492.92, 495.3), (508.5, CORTE_FIN)]
for i, (a, b) in enumerate(TRAMOS_CAM):
    s0, s1 = (1.0, 1.065) if i % 2 == 0 else (1.065, 1.01)
    cx = 905 if (a, b) == (51.4, 66.36) else 1010 if (a, b) == (66.36, 71.72) else CARA[0]  # deja hueco a los gráficos
    cam(a, s0, cx, CARA[1], 0)
    cam(a + 0.04, s1, cx, CARA[1], round(b - a - 0.1, 2))
for c in [1.70, 4.31, 11.71, 18.67, 30.31, 50.43, 51.40, 494.5, 509.11, 512.19, 520.12]:
    acentos.append(dict(t=T(c), a=0.035))
# tarjeta de Instagram del usuario y escenas de pantalla
cam(71.72, 1.0, 960, 540, 0)
cam(34.0, 1.0, 960, 540, 0); web(37.3, 1.75, 647, 386); web(41.0, 1.6, 646, 783); reposo(44.6, 0.45)
cam(105.36, 1.0, 960, 540, 0)
web(107.6, 1.5, 650, 455, 1.0); web(115.3, 1.8, 646, 776); web(123.8, 1.9, 646, 600); reposo(141.0, 0.7)
web(148.5, 1.8, 646, 840); reposo(154.0, 0.6); web(155.2, 1.7, 650, 400, 1.0); reposo(161.4, 0.7)
web(162.6, 1.6, 646, 800); reposo(167.6, 0.7); web(169.6, 1.5, 650, 440, 1.0); reposo(174.6, 0.7)
web(180.9, 1.8, 646, 840)
cam(224.43, 1.0, 960, 540, 0)
cam(295.1, 1.0, 960, 540, 0); cam(324.63, 1.0, 960, 540, 0); cam(368.18, 1.0, 960, 540, 0)
web(380.6, 1.5, 650, 440, 1.0); web(386.6, 1.8, 646, 650); web(395.0, 1.8, 646, 840); reposo(399.6, 0.8)
cam(435.7, 1.0, 960, 540, 0); cam(492.92, 1.0, CARA[0], CARA[1], 0)
camara.sort(key=lambda k: k["t"])
for k0, k1 in zip(camara, camara[1:]):  # sin solaparse: cada paso acaba antes de que empiece el siguiente
    if k0["t"] + k0["d"] > k1["t"]: k0["d"] = round(max(0.0, k1["t"] - k0["t"] - 0.02), 3)

# ---------------- resaltados: el control entero brilla y lo demás se apaga (coordenadas del corte) ----------------
BOTON = lambda y: [538, y, 216, 32]
focos = [
    dict(a=37.72, b=39.05, r=[541, 371, 78, 31], c="blanco"), dict(a=39.11, b=39.85, r=[622, 371, 56, 31], c="blanco"),
    dict(a=39.87, b=41.1, r=[683, 371, 70, 31], c="blanco"),
    dict(a=41.26, b=44.95, pos=[[41.26] + BOTON(786), [43.8] + BOTON(742), [44.8] + BOTON(824)], c="lima"),
    dict(a=117.98, b=121.3, r=[538, 735, 105, 37], c="blanco"), dict(a=118.89, b=121.3, r=[649, 735, 106, 37], c="blanco"),
    dict(a=121.34, b=123.9, r=[538, 780, 217, 37], c="blanco"),
    dict(a=150.7, b=154.0, r=BOTON(824), c="lima"), dict(a=165.46, b=167.5, r=BOTON(824), c="lima"),
    dict(a=180.9, b=186.2, r=BOTON(824), c="lima"), dict(a=395.38, b=399.5, r=BOTON(824), c="lima"),
]
for f in focos:
    f["a"], f["b"] = T(f["a"]), T(f["b"])
    if "pos" in f: f["pos"] = [[T(p[0])] + p[1:] for p in f["pos"]]

# pestañas de lo que se ha elegido en cada foto de Frames (centro de cada miniatura, corte)
etiquetas = [dict(en=157.85, x=624, y=443, txt="START", arriba=True), dict(en=158.39, x=670, y=443, txt="MIDDLE", arriba=True),
             dict(en=159.28, x=716, y=443, txt="MIDDLE", arriba=True), dict(en=160.45, x=578, y=489, txt="END", arriba=False)]
for e in etiquetas: e["en"], e["b"] = T(e["en"]), T(167.7)

# ---------------- gráficos ----------------
G = []
TIEMPOS = {"logo", "escribe", "flecha", "producto", "ia", "linea", "clavado", "cambios", "supEn", "tituloEn", "inicio", "rodaje", "sub",
           "orden", "tiempo", "listo", "creado", "sitio", "editas", "ejemplos", "fin", "iaFin", "match"}
def _conv(q, v):
    """pasa a tiempo de salida los campos de tiempo (los «en…», listas de tiempos, ítems, partes y palabras)"""
    if q in ("items",): return [it[:2] + [T(it[2])] + it[3:] for it in v]
    if q in ("partes",): return [[p[0], T(p[1])] for p in v]
    if q in ("bloques",): return [dict(b, a=T(b["a"]), b=T(b["b"]), ws=[[w[0], T(w[1])] for w in b["ws"]], **({"flecha": T(b["flecha"])} if "flecha" in b else {})) for b in v]
    if q in ("lineas",): return [dict(l, ws=[[w[0], T(w[1])] + w[2:] for w in l["ws"]]) for l in v]
    if q in ("ws",): return [[w[0], T(w[1])] + w[2:] for w in v]
    if q == "match": return v
    if q.startswith("en") or q in TIEMPOS or (q == "titulo" and isinstance(v, (int, float))):
        if isinstance(v, (int, float)): return T(v)
        if isinstance(v, list): return [T(x) for x in v]
    return v
def g(tipo, a, b, **k):
    G.append(dict(tipo=tipo, a=T(a), b=T(b), **{q: _conv(q, v) for q, v in k.items()}))

MATCH = [0.0, 5.583, 21.667, 30.0]  # segundo del anuncio que coincide con cada fotograma clave (correlación 0,994-0,999)
PROMPT_FRAMES = [
    ("Anuncio de perfume de lujo de 30 segundos, en una sola toma continua, lento y elegante.", 124.26),
    ("0-7 s: una caja negra mate cerrada, a oscuras, sobre una mesa de mármol, con un hilo de luz dorada en el borde.", 129.74),
    ("7-14 s: una mano levanta despacio la tapa, sale una luz dorada cálida y aparece el frasco de cristal ámbar con el grabado AMBREVIA.", 137.74),
    ("14-22 s: el frasco sube por el aire a cámara lenta entre una bruma fina de perfume y gotas; la cámara gira despacio a su alrededor.", 999),
    ("22-30 s: el frasco se posa suavemente en el mármol y la cámara se acerca hasta el plano final, con contraluz dorado y reflejos suaves. "
     "Sin personas salvo la mano. Sin más textos ni logos.", 999),
]
PROMPT_REFS = [("El hombre de las fotos (misma cara, pelo rizado oscuro y barba corta, camiseta negra), de pie en un estudio oscuro y "
                "elegante con luz dorada cálida, coge de una mesa de mármol el frasco de perfume de cristal ámbar con el grabado AMBREVIA, "
                "se echa perfume una vez en la muñeca, lo huele, mira a cámara y sonríe con seguridad. Acercamiento lento de cámara, luz "
                "de cine, piel realista. Un solo plano.", 174.9)]
PROMPT_EDIT = [("Cambia solo el fondo: sustituye el estudio oscuro por una azotea soleada a la hora dorada, con el skyline de la ciudad "
                "detrás. Mantén exactamente igual al hombre, su ropa, el frasco de perfume, sus movimientos y el movimiento de cámara.", 389.0)]

# 1 · intro a cámara
g("lateral", 0.7, 3.62, lado="der", icono="reloj", sup="un anuncio de", txt="30 SEGUNDOS", en=1.52, supEn=0.71)
g("lateral", 3.7, 6.2, lado="izq", icono="clip", sup="sin montar nada", txt="UN SOLO CLIP", en=3.88, supEn=4.74, abajo=True)
g("linea_clavado", 6.3, 12.38, en=[8.22, 8.94, 9.65, 10.19], inicio=7.06, clavado=11.71, match=MATCH)
g("patrocinio", 17.76, 22.4, en=18.67, logo=20.05)
g("broll", 22.46, 27.62, src="medios/mk/cmp02.mp4", desde=0.0, etiqueta="EJEMPLOS DE HIGGSFIELD", sub="Seedance 2.5 vs Kling 4.0")
g("duracion", 27.62, 33.96, en4=27.78, enx2=30.31, en3=31.2, en15=33.66)
g("pecho", 48.3, 51.3, lineas=[dict(ws=[["un", 48.36], ["anuncio", 48.5], ["de", 48.98], ["producto", 49.12]], size=78),
                               dict(ws=[["PARA UN CLIENTE", 50.43, "k"]], size=118, golpe=True)])
g("plan3", 51.4, 66.2, tituloEn=51.4, items=[["Frames", "qué pasa en cada momento", 53.28, "frames"],
                                             ["References", "una persona real + el producto", 57.6, "references"],
                                             ["Edit video", "el cambio que pide el cliente", 61.58, "edit"]])
g("planeado2", 66.36, 70.45, en1=68.22, en2=69.11)
g("storyboard", 73.44, 105.36, titulo=74.35, sub=76.18, en=[79.42, 83.34, 86.74, 90.86], ia=96.06, linea=98.5, orden=103.06, tiempo=103.86,
  textos=["Caja cerrada, a oscuras", "Una mano abre la tapa y entra la luz", "El frasco en el aire, entre bruma y gotas", "Plano final sobre el mármol"])
# 2 · configuración de Frames y References (pantalla)
g("prompt_card", 124.3, 147.9, etiqueta="PROMPT · FRAMES", partes=PROMPT_FRAMES, fin=141.74)
g("aviso", 154.2, 157.0, texto="La primera vez lo lancé en otro modo por error → lo repito en Frames")
g("prompt_card", 174.9, 180.4, etiqueta="PROMPT · REFERENCES", partes=PROMPT_REFS, fin=999)
g("valioso2", 186.3, 200.78, enTitulo=187.56, enProd=190.7, enModelo=193.56, enAnuncio=195.36, enValioso=198.48, listo=199.28)
# 3 · reacción a Frames (escena con su cámara) y comparativa A2
g("nota", 225.9, 235.2, texto="La mano: el color no es del todo humano", tono="malo", en=226.37)
g("nota", 236.9, 241.0, texto="La caja se abre un poco rara", tono="malo", en=237.4)
g("nota", 243.6, 249.2, texto="Un instante en que las letras fallan", tono="malo", en=244.58)
g("nota", 250.6, 256.2, texto="Se ajusta muchísimo a las fotos y al movimiento", tono="bueno", en=251.64)
g("compara_a2v2", 256.3, 295.1, en=[259.55, 265.09, 289.53, 293.02], clavado=[262.42, 272.35, 291.73, 293.67], match=MATCH,
  ia=277.6, iaFin=288.8)
# 4 · reacción a References
g("nota", 327.6, 333.8, texto="Las manos: lo único que se nota un poco", tono="malo", en=327.99)
g("nota", 335.6, 340.5, texto="El tapón aparece solo en el frasco", tono="malo", en=336.2)
g("clonado", 345.2, 357.0, en=[347.85, 350.21, 351.39, 353.3], textos=["ESTOY CLONADO", "las arruguitas", "el remolino de las cejas", "el pelo de la barba"])
g("compara_b2", 357.0, 368.18, en=358.91, clavado=361.35, producto=363.94, creado=365.32)
g("cliente", 368.2, 378.8, en=369.98, escribe=372.33, rodaje=377.52)
g("prompt_card", 389.0, 395.3, etiqueta="PROMPT · EDIT VIDEO", partes=PROMPT_EDIT, fin=999)
# 5 · reacción a Edit y veredicto
g("compara_c", 416.83, 434.5, en=417.0)
g("capitulo", 434.5, 435.7, num="MI OPINIÓN", titulo="VEREDICTO", en=434.62)
g("fichas", 436.2, 492.8, x=1350, items=[["Hace lo que le pides", "lo ha clavado", 436.24, "bueno"], ["Le falta realismo", "aún no es el resultado final", 440.63, "malo"],
                                          ["Primeras tomas y mockups", "y luego, un modelo hiperrealista", 473.02, "bueno"], ["15 créditos", "el coste es irrisorio", 488.78, "bueno"]])
# 6 · el negocio (recap del servicio) y el cierre
g("pecho", 493.2, 495.3, lineas=[dict(ws=[["si", 493.3], ["estás", 493.43], ["montando", 493.77], ["una", 494.3]], size=70), dict(ws=[["AGENCIA DE IA", 494.5, "k"]], size=128, golpe=True)])
g("recap", 495.3, 508.5, enTitulo=495.45, en=[497.37, 499.63, 502.37, 505.1], editas=507.3, ejemplos=497.9)
g("tres_modos", 508.5, 511.85, en=509.11, sitio=510.34)
g("pecho", 508.6, 511.75, lineas=[dict(ws=[["TRES MODOS", 509.11]], size=104, golpe=True), dict(ws=[["en", 509.73], ["un", 509.87], ["mismo", 510.0], ["sitio", 510.34, "k"]], size=80)])
g("abre_kling", 511.85, 515.62, enAbre=511.91, enKling=512.19, enHiggs=512.87)
g("cta_bloques", 515.7, 518.72, bloques=[dict(a=515.7, b=516.66, ws=[["tienes", 515.74], ["el", 516.15], ["enlace", 516.28]]),
                                         dict(a=516.66, b=517.62, ws=[["en", 516.69], ["el", 516.83], ["primer", 516.97], ["link", 517.38]]),
                                         dict(a=517.62, b=518.72, ws=[["de", 517.65], ["la", 517.78], ["descripción", 517.92]], flecha=518.15)])
g("comentario", 518.8, 524.1, texto="Yo haría un anuncio de…", escribe=519.4)
g("pecho", 520.0, 522.5, top=660, lineas=[dict(ws=[["¿QUÉ ANUNCIO", 520.12]], size=96, golpe=True), dict(ws=[["HARÍAS", 520.93], ["TÚ?", 521.42, "k"]], size=120)])
for x in G:  # los ítems de las fichas llevan [txt, sub, en, tono]
    if x["tipo"] == "fichas": x["items"] = [[it[0], it[1], it[3], it[2]] for it in x["items"]]

# ---------------- cambios de escena: aquí, y solo aquí, la transición del ejemplo del cliente ----------------
# (la tarjeta de Instagram ya entra con la transición del propio corte, en 71,72-71,84)
PANTALLA_COMPLETA = ("broll", "storyboard", "valioso2", "compara_a2v2", "compara_b2", "compara_c", "capitulo", "recap")
cortes = set(limites) | {T(34.0), T(45.08), T(492.92)}
for x in G:
    if x["tipo"] in PANTALLA_COMPLETA: cortes |= {x["a"], x["b"]}
cortes = sorted(round(c, 3) for c in cortes)
dedup = []
for c in cortes:  # dos cambios casi a la vez (p. ej. el final de una escena y el inicio de la siguiente) son uno solo
    if dedup and c - dedup[-1] < 0.25: continue
    dedup.append(c)
cortes = dedup

edl = dict(dur=DURACION, fps=FPS, pantalla=PANT, vc=VC, bc=BC, web=WEB, modos=modos, camara=camara, acentos=acentos, segs=segs,
           focos=focos, etiquetas=etiquetas, graficos=G, cortes=cortes)
json.dump(edl, open(f"{R}/remotion/src/kling/edl.json", "w"), ensure_ascii=False, indent=0)

# ---------------- audio ----------------
voz = [dict(desde=s["desde"], dur=s["dur"], ini=s["ini"]) for s in segs if s["tipo"] == "base"]
res = [dict(src=s["src"].replace("medios/", ""), ini=s["ini"], dur=s["dur"]) for s in segs if s["tipo"] == "resultado"]
# sin música encima de los resultados ni de las comparativas (llevan los resultados)
mudos = [(s["ini"] - 0.3, s["ini"] + s["dur"] + 0.3) for s in segs if s["tipo"] == "resultado"] + \
        [(x["a"] - 0.3, x["b"] + 0.3) for x in G if x["tipo"].startswith("compara")]
sfx = [dict(s="whoosh", en=c, db=-5) for c in cortes]
sfx += [dict(s="tap", en=f["a"], db=-20) for f in focos]
sfx += [dict(s="tap", en=e["en"], db=-22) for e in etiquetas]
for x in G:
    tp = x["tipo"]
    if tp == "lateral": sfx.append(dict(s="hit", en=x["en"], db=-12))
    elif tp == "linea_clavado": sfx += [dict(s="pop", en=e, db=-16) for e in x["en"]] + [dict(s="swish", en=x["clavado"], db=-16)] + \
                                       [dict(s="ding", en=round(x["clavado"] + 0.9 * m / 30, 3), db=-19) for m in x["match"]]
    elif tp == "patrocinio": sfx.append(dict(s="reveal", en=x["logo"], db=-14))
    elif tp == "duracion": sfx += [dict(s="swish", en=x["en4"], db=-16), dict(s="hit", en=x["enx2"], db=-12), dict(s="pop", en=x["en3"], db=-16)]
    elif tp == "plan3": sfx += [dict(s="ding", en=it[2], db=-16) for it in x["items"]]
    elif tp == "planeado2": sfx += [dict(s="pop", en=x["en1"], db=-14), dict(s="pop", en=x["en2"], db=-14)]
    elif tp == "storyboard": sfx += [dict(s="hit", en=x["titulo"], db=-14)] + [dict(s="pop", en=e, db=-14) for e in x["en"]] + [dict(s="swish", en=x["linea"], db=-16)]
    elif tp == "prompt_card": sfx.append(dict(s="popup", en=x["a"], db=-18))
    elif tp == "aviso": sfx.append(dict(s="popup", en=x["a"], db=-16))
    elif tp == "valioso2": sfx += [dict(s="pop", en=x[k], db=-14) for k in ("enProd", "enModelo", "enAnuncio")] + [dict(s="hit", en=x["enValioso"], db=-12), dict(s="exito", en=x["listo"], db=-18)]
    elif tp == "nota": sfx.append(dict(s="negativo" if x["tono"] == "malo" else "confirmar", en=x["en"], db=-16))
    elif tp == "compara_a2v2": sfx += [dict(s="swish", en=e, db=-16) for e in x["en"]] + [dict(s="shutter", en=c, db=-16) for c in x["clavado"]]
    elif tp == "clonado": sfx += [dict(s="pop", en=e, db=-16) for e in x["en"]]
    elif tp == "compara_b2": sfx += [dict(s="pop", en=x["en"], db=-14), dict(s="swish", en=x["clavado"], db=-16), dict(s="pop", en=x["producto"], db=-14), dict(s="hit", en=x["creado"], db=-14)]
    elif tp == "cliente": sfx.append(dict(s="mensaje", en=x["en"], db=-12))
    elif tp == "capitulo": sfx.append(dict(s="hit", en=x["en"], db=-10))
    elif tp == "fichas": sfx += [dict(s="pop", en=it[3], db=-14) for it in x["items"]]
    elif tp == "pecho": sfx += [dict(s="hit", en=l["ws"][0][1], db=-12) for l in x["lineas"] if l.get("golpe")]
    elif tp == "recap": sfx += [dict(s="pop", en=e, db=-14) for e in x["en"]]
    elif tp == "tres_modos": sfx += [dict(s="hit", en=x["sitio"], db=-14)]
    elif tp == "abre_kling": sfx.append(dict(s="reveal", en=x["enHiggs"], db=-16))
    elif tp == "cta_bloques": sfx.append(dict(s="pop", en=x["bloques"][-1]["flecha"], db=-12))
    elif tp == "comentario": sfx.append(dict(s="popup", en=x["a"], db=-14))
# música: «Beyond» en la intro a cámara (tras el gancho) y «Project» en el resto; fuera bajo resultados y comparativas
musica = [dict(pista="beyond", ini=T(0.0), fin=T(104.6)), dict(pista="project", ini=T(104.6), fin=DURACION)]
json.dump(dict(dur=DURACION, voz=voz, resultados=res, mudos=mudos, sfx=sorted(sfx, key=lambda s: s["en"]), musica=musica), open(f"{R}/plan_audio.json", "w"), indent=0)
print(f"DURACIÓN {DURACION:.2f} s ({int(DURACION // 60)}:{DURACION % 60:04.1f})  gráficos {len(G)}  cámara {len(camara)}  focos {len(focos)}  cortes {len(cortes)}  sfx {len(sfx)}")
print("cortes", cortes)
