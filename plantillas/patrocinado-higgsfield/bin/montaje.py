# Montaje del vídeo «Kling 4.0 en Higgsfield» (patrocinado). La base es el corte del usuario (Video cortado.mp4, 25 fps);
# el vídeo final (30 fps) es:
#   anuncio de 30 s entero con su sonido (gancho) → corte del usuario → [resultado Frames entero] → corte → [resultado
#   References] → corte → [resultado Edit] → corte hasta el final.
# Los resultados sustituyen los tramos en que Álvaro los mira en el navegador (el corte va justo después de su última
# palabra y vuelve justo antes de la siguiente). Encima: zooms a la web, anillos, rótulos, traducción de los prompts,
# comparativas lo planeado / lo generado (A2, B, C), B-roll del MediaKit rotulado «Ejemplos de Higgsfield», difuminado de
# la barra del navegador (marcadores y extensiones de terceros) y la tapa de macOS (otra herramienta: la comparativa A2).
# Todo el texto en seg. del CORTE (c) y se pasa a tiempo de salida con T().
# Salida: remotion/src/kling/edl.json (imagen) y plan_audio.json (voz, resultados, efectos y música para la mezcla).
import json, os
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
cortes = [t]
for i, (a, b) in enumerate(BASES):
    segs.append(dict(tipo="base", ini=t, dur=fr(b - a), desde=a))
    mapa.append((a, b, t))
    t = fr(t + (b - a))
    if i < len(INSERTOS):
        k, modo, cred, antes = INSERTOS[i]
        cortes.append(t)
        segs.append(dict(tipo="resultado", src=f"medios/{k}.mp4", ini=t, dur=DUR[k], modo=modo, creditos=cred, antes=antes))
        t = fr(t + DUR[k])
        cortes.append(t)
DURACION = t

def T(c):
    """segundo del corte → segundo del vídeo final"""
    for a, b, t0 in mapa:
        if a - 1e-6 <= c <= b + 1e-6: return round(t0 + c - a, 3)
    raise ValueError(f"{c} cae en un inserto")

# ---------------- zooms a la web: (c, escala, foco x px, foco y px, duración del paso) ----------------
Z = [(34.0, 1, 960, 540, 0), (37.45, 1.85, 648, 426, 0.45), (41.1, 1.85, 645, 842, 0.45), (44.98, 1, 960, 540, 0),
     (115.6, 1.9, 645, 815, 0.5), (124.0, 2.05, 640, 645, 0.5), (141.6, 1.55, 645, 660, 0.6), (147.7, 1.9, 645, 880, 0.5),
     (154.0, 1, 960, 540, 0.4), (157.3, 1.75, 655, 380, 0.45), (161.5, 1, 960, 540, 0.4), (162.9, 1.8, 645, 830, 0.45),
     (167.4, 1, 960, 540, 0.4), (172.3, 1.75, 660, 480, 0.5), (176.2, 1, 960, 540, 0.5), (180.5, 1.9, 645, 880, 0.45),
     (186.3, 1, 960, 540, 0.5), (224.43, 1, 960, 540, 0), (386.9, 1.8, 645, 690, 0.5), (395.5, 1.9, 645, 880, 0.45),
     (399.5, 1, 960, 540, 0.4)]
# Corte nuevo (14:34): sin la barra del navegador y la web 40 px más arriba (DY). En los tramos de pantalla va la web sola,
# sin la burbuja de cámara: la ventana del corte (VENTANA) se amplía a 1840 px de ancho, centrada sobre el fondo del vídeo.
# Las coordenadas de esta lista son las del corte antiguo (y + 40); el foco se pasa a la pantalla. En los zooms al panel
# de la izquierda el foco se ancla al borde izquierdo de la ventana, para que el panel no se salga.
DY = -40
VENTANA = dict(x=521, y=196, w=1375, h=690)
K = 1840 / VENTANA["w"]; SX = 40; SY = (1080 - VENTANA["h"] * K) / 2
pant_x = lambda x: SX + (x - VENTANA["x"]) * K
pant_y = lambda y: SY + (y + DY - VENTANA["y"]) * K
def foco(s, x, y):
    if s <= 1: return 0.5, 0.5
    fx = SX if 600 <= x <= 700 else pant_x(x)
    return round(fx / 1920, 4), round(min(1080, max(0, pant_y(y))) / 1080, 4)
zooms = [[T(c), s, *foco(s, x, y), d] for c, s, x, y, d in Z]

# ---------------- anillos sobre la web (coordenadas del corte; se amplían con el zoom) ----------------
BOTON = lambda y: [538, y + DY, 216, 32]
anillos = [
    dict(a=37.72, b=39.05, r=[541, 371, 78, 31]), dict(a=39.11, b=39.85, r=[622, 371, 56, 31]), dict(a=39.87, b=41.1, r=[683, 371, 70, 31]),
    dict(a=41.26, b=45.0, pos=[[41.26] + BOTON(826), [43.8] + BOTON(782), [44.8] + BOTON(864)]),
    dict(a=117.98, b=121.3, r=[538, 735, 105, 37]), dict(a=118.89, b=121.3, r=[649, 735, 106, 37]), dict(a=121.34, b=124.0, r=[538, 780, 217, 37]),
    dict(a=150.7, b=154.0, r=BOTON(864)), dict(a=180.9, b=186.3, r=BOTON(864)), dict(a=395.74, b=399.5, r=BOTON(864)),
]
for an in anillos:
    an["a"], an["b"] = T(an["a"]), T(an["b"])
    if "pos" in an: an["pos"] = [[T(p[0])] + p[1:] for p in an["pos"]]

# ---------------- tramos de pantalla del corte (trans/pantalla.json: bordes blancos de la burbuja y la ventana) ----------------
# el corte nuevo ya no lleva la barra del navegador: no hace falta difuminar nada
dif = []
PANT = json.load(open(f"{R}/trans/pantalla.json"))

# ---------------- gráficos ----------------
G = []
TIEMPOS = {"logo", "escribe", "flecha", "producto", "ia", "linea", "clavado", "cambios", "supEn", "tituloEn", "inicio", "rodaje"}
def _conv(q, v):
    """pasa a tiempo de salida los campos de tiempo (los «en…», listas de tiempos, ítems y palabras)"""
    if q in ("items",): return [it[:-1] + [T(it[-1])] for it in v]
    if q in ("lineas",): return [dict(l, ws=[[w[0], T(w[1])] + w[2:] for w in l["ws"]]) for l in v]
    if q in ("ws",): return [[w[0], T(w[1])] + w[2:] for w in v]
    if q.startswith("en") or q in TIEMPOS or (q == "titulo" and isinstance(v, (int, float))):
        if isinstance(v, (int, float)): return T(v)
        if isinstance(v, list): return [T(x) for x in v]
    return v
def g(tipo, a, b, **k):
    G.append(dict(tipo=tipo, a=T(a), b=T(b), **{q: _conv(q, v) for q, v in k.items()}))

# gancho: lo pone el propio segmento «resultado» (contador de 30 s, un solo clip)
# 1 · intro a cámara
g("lateral", 0.7, 3.62, lado="der", icono="reloj", sup="un anuncio de", txt="30 SEGUNDOS", en=1.52, supEn=0.71)
g("lateral", 3.7, 6.2, lado="izq", icono="clip", sup="sin montar nada", txt="UN SOLO CLIP", en=3.88, supEn=4.74, abajo=True)
g("linea_tiempo", 6.3, 12.38, en=[8.22, 8.94, 9.65, 10.19], inicio=7.06, clavado=11.71)
g("patrocinio", 17.76, 22.4, en=18.67, logo=20.05)
g("broll", 22.46, 27.62, src="medios/mk/cmp02.mp4", desde=0.0, etiqueta="EJEMPLOS DE HIGGSFIELD", sub="Seedance 2.5 vs Kling 4.0")
g("duracion", 27.62, 33.96, en4=27.78, enx2=30.31, en3=31.2, en15=33.66)
g("pastilla_creditos", 42.4, 47.05, antes=120, ahora=30, en=43.24, x=1000, y=760)
g("pecho", 48.3, 51.3, lineas=[dict(ws=[["un", 48.36], ["anuncio", 48.5], ["de", 48.98], ["producto", 49.12]], size=78),
                               dict(ws=[["PARA UN CLIENTE", 50.43, "k"]], size=118, golpe=True)])
g("lista", 51.4, 66.2, x=110, y=300, w=560, paso=170, titulo="EL PLAN · 3 PASOS", tituloEn=51.4,
  items=[["Frames", "qué pasa en cada momento", 53.28], ["References", "una persona real + el producto", 57.6],
         ["Edit", "el cambio que pide el cliente", 61.58]])
g("planeado", 66.36, 71.9, en1=68.22, en2=69.11)
g("fotogramas", 73.44, 105.0, titulo=74.35, en=[79.42, 83.34, 86.74, 90.94], ia=97.11, linea=99.6,
  textos=["Caja cerrada, a oscuras", "Se abre la tapa y entra la luz", "El frasco en el aire", "Plano final sobre el mármol"])
# 2 · configuración de Frames (pantalla)
for a, b, txt in [(124.3, 129.7, "Anuncio de perfume de lujo de 30 s, en una sola toma, lento y elegante"),
                  (129.74, 137.7, "0–7 s: caja negra cerrada, a oscuras, sobre mármol, con un hilo de luz dorada"),
                  (137.74, 141.7, "7–14 s: una mano abre la tapa, sale luz dorada y aparece el frasco AMBREVIA"),
                  (141.74, 144.9, "14–22 s: el frasco sube a cámara lenta entre bruma y gotas; la cámara lo rodea"),
                  (144.9, 147.9, "22–30 s: el frasco se posa en el mármol y la cámara se acerca al plano final")]:
    g("prompt_es", a, b, txt=txt, etiqueta="PROMPT · FRAMES")
g("pastilla_creditos", 150.7, 154.0, antes=120, ahora=30, en=150.7, x=1000, y=820)
g("aviso", 154.2, 157.3, texto="La primera vez lo lancé en otro modo por error → lo repito en Frames")
for a, b, txt in [(174.9, 180.4, "El hombre de las fotos coge el frasco, se perfuma, lo huele y sonríe a cámara")]:
    g("prompt_es", a, b, txt=txt, etiqueta="PROMPT · REFERENCES")
g("pastilla_creditos", 180.9, 186.3, antes=60, ahora=15, en=180.9, x=1000, y=820)
g("generando", 186.8, 199.28, en=186.8)  # a 199,28 aparece el resultado en la web
g("valioso", 189.2, 200.7, enProd=192.26, enModelo=193.56, enAnuncio=195.36, enValioso=198.48)
# 3 · reacción a Frames
g("nota", 225.0, 232.6, texto="La mano: el color no es del todo humano", tono="malo", en=225.6)
g("nota", 241.6, 249.3, texto="Un instante en que las letras fallan", tono="malo", en=243.4)
g("nota", 249.5, 256.4, texto="Se ajusta muchísimo a las fotos y al movimiento", tono="bueno", en=250.5)
g("compara_a2", 256.3, 295.1, en=[259.55, 265.09, 289.53, 293.02], clavado=[262.42, 272.35, 291.73, 293.67], ia=278.2)
# 4 · reacción a References
g("nota", 327.9, 333.8, texto="Las manos: lo único que se nota un poco", tono="malo", en=328.4)
g("nota", 335.9, 340.5, texto="El tapón aparece solo en el frasco", tono="malo", en=336.4)
g("clonado", 345.2, 357.0, en=[347.85, 350.21, 351.39, 353.3], textos=["ESTOY CLONADO", "las arruguitas", "el remolino de las cejas", "el pelo de la barba"])
g("compara_b", 357.0, 368.18, en=359.68, producto=363.94)
g("cliente", 368.2, 378.8, en=369.98, escribe=372.33, rodaje=377.52)
g("prompt_es", 389.0, 395.3, txt="Cambia solo el fondo: una azotea al atardecer con la ciudad detrás", etiqueta="PROMPT · EDIT VIDEO")
g("pastilla_creditos", 395.74, 399.5, antes=75, ahora=15, en=395.74, x=1000, y=820)
# 5 · reacción a Edit
g("compara_c", 416.83, 434.5, en=417.0)
g("capitulo", 434.5, 435.7, num="MI OPINIÓN", titulo="VEREDICTO", en=434.62)
g("fichas", 436.2, 492.8, x=1350, items=[["Hace lo que le pides", "lo ha clavado", "bueno", 436.24], ["Le falta realismo", "aún no es el resultado final", "malo", 440.63],
                                          ["Primeras tomas y mockups", "y luego, un modelo hiperrealista", "bueno", 473.02], ["15 créditos", "el coste es irrisorio", "bueno", 488.78]])
# 6 · el negocio y el cierre (a cámara)
g("pecho", 493.2, 497.2, lineas=[dict(ws=[["si", 493.3], ["estás", 493.43], ["montando", 493.77], ["una", 494.3]], size=70), dict(ws=[["AGENCIA DE IA", 494.5, "k"]], size=128, golpe=True)])
g("lista", 497.3, 508.4, x=110, y=250, w=600, paso=160, titulo="ESTO ES EL SERVICIO", tituloEn=497.3,
  items=[["Te pasa su producto", "una foto, y ya está", 498.23], ["Frames", "le planificas el anuncio", 499.63], ["References", "metes a su modelo", 502.37],
         ["Edit", "cambios sin repetir nada", 505.9]])
g("tarjeta_broll", 497.3, 508.4, x=1290, y=250, w=520, srcs=["medios/mk/pack_01_ledmask.mp4", "medios/mk/pack_10_projector.mp4", "medios/mk/pack_07_earbuds.mp4"],
  cambios=[497.3, 501.3, 504.9], etiqueta="EJEMPLOS DE HIGGSFIELD")
g("pecho", 508.6, 511.75, lineas=[dict(ws=[["TRES MODOS", 509.11]], size=104, golpe=True), dict(ws=[["en", 509.73], ["un", 509.87], ["mismo", 510.0], ["sitio", 510.34, "k"]], size=80)])
g("pecho", 511.85, 515.6, lineas=[dict(ws=[["abre", 511.91]], size=72), dict(ws=[["KLING 4.0", 512.19, "k"]], size=130, golpe=True), dict(ws=[["en", 512.73], ["Higgsfield", 512.87]], size=72)])
g("cta", 515.7, 518.7, ws=[["el", 516.15], ["enlace,", 516.28], ["en", 516.69], ["la", 517.78], ["descripción", 517.92]], flecha=518.15)
g("comentario", 518.8, 524.1, texto="Yo haría un anuncio de…", escribe=519.4)
g("pecho", 520.0, 523.6, top=660, lineas=[dict(ws=[["¿QUÉ ANUNCIO", 520.12]], size=96, golpe=True), dict(ws=[["HARÍAS", 520.93], ["TÚ?", 521.42, "k"]], size=120)])

# los gráficos de pantalla completa (comparativas, B-roll, capítulo) entran y salen con la transición del usuario
for x in G:
    if x["tipo"] in ("compara_a2", "compara_b", "compara_c", "broll", "capitulo"):
        cortes += [x["a"], x["b"]]
cortes = sorted(set(round(c, 3) for c in cortes))

edl = dict(dur=DURACION, fps=FPS, pantalla=PANT, ventana=dict(VENTANA, k=K, sx=SX, sy=SY), segs=segs, zooms=zooms, anillos=anillos, difuminados=dif, graficos=G, cortes=cortes)
json.dump(edl, open(f"{R}/remotion/src/kling/edl.json", "w"), ensure_ascii=False, indent=0)

# ---------------- audio ----------------
voz = [dict(desde=s["desde"], dur=s["dur"], ini=s["ini"]) for s in segs if s["tipo"] == "base"]
res = [dict(src=s["src"].replace("medios/", ""), ini=s["ini"], dur=s["dur"]) for s in segs if s["tipo"] == "resultado"]
# sin música encima de los resultados ni de las comparativas (llevan los resultados)
mudos = [(s["ini"] - 0.3, s["ini"] + s["dur"] + 0.3) for s in segs if s["tipo"] == "resultado"] + \
        [(x["a"] - 0.3, x["b"] + 0.3) for x in G if x["tipo"].startswith("compara")]
sfx = [dict(s="whoosh", en=c, db=-5) for c in cortes]
for x in G:
    tp = x["tipo"]
    if tp == "lateral": sfx.append(dict(s="hit", en=x["en"], db=-12))
    elif tp == "linea_tiempo": sfx += [dict(s="pop", en=e, db=-16) for e in x["en"]] + [dict(s="exito", en=x["clavado"], db=-14)]
    elif tp == "patrocinio": sfx.append(dict(s="reveal", en=x["logo"], db=-14))
    elif tp == "duracion": sfx += [dict(s="swish", en=x["en4"], db=-16), dict(s="hit", en=x["enx2"], db=-12), dict(s="pop", en=x["en3"], db=-16)]
    elif tp == "pastilla_creditos": sfx.append(dict(s="pop", en=x["en"], db=-12))
    elif tp in ("lista",): sfx += [dict(s="ding", en=it[-1], db=-16) for it in x["items"]]
    elif tp == "planeado": sfx += [dict(s="pop", en=x["en1"], db=-14), dict(s="pop", en=x["en2"], db=-14)]
    elif tp == "fotogramas": sfx += [dict(s="pop", en=e, db=-14) for e in x["en"]] + [dict(s="swish", en=x["linea"], db=-16)]
    elif tp == "prompt_es": sfx.append(dict(s="tap", en=x["a"], db=-20))
    elif tp == "aviso": sfx.append(dict(s="popup", en=x["a"], db=-16))
    elif tp == "valioso": sfx += [dict(s="pop", en=x[k], db=-14) for k in ("enProd", "enModelo", "enAnuncio")] + [dict(s="hit", en=x["enValioso"], db=-12)]
    elif tp == "nota": sfx.append(dict(s="negativo" if x["tono"] == "malo" else "confirmar", en=x["en"], db=-16))
    elif tp == "compara_a2": sfx += [dict(s="swish", en=e, db=-16) for e in x["en"]] + [dict(s="exito", en=c, db=-16) for c in x["clavado"][:1]]
    elif tp == "clonado": sfx += [dict(s="pop", en=e, db=-16) for e in x["en"]]
    elif tp == "cliente": sfx.append(dict(s="mensaje", en=x["en"], db=-12))
    elif tp == "capitulo": sfx += [dict(s="hit", en=x["en"], db=-10)]
    elif tp == "fichas": sfx += [dict(s="pop", en=it[-1], db=-14) for it in x["items"]]
    elif tp == "pecho": sfx += [dict(s="hit", en=l["ws"][0][1], db=-12) for l in x["lineas"] if l.get("golpe")]
    elif tp == "cta": sfx.append(dict(s="pop", en=x["flecha"], db=-12))
    elif tp == "comentario": sfx.append(dict(s="popup", en=x["a"], db=-14))
# música: «Beyond» en la intro a cámara (tras el gancho) y «Project» en el resto; fuera bajo resultados y comparativas
musica = [dict(pista="beyond", ini=T(0.0), fin=T(104.6)), dict(pista="project", ini=T(104.6), fin=DURACION)]
json.dump(dict(dur=DURACION, voz=voz, resultados=res, mudos=mudos, sfx=sfx, musica=musica), open(f"{R}/plan_audio.json", "w"), indent=0)
print(f"DURACIÓN {DURACION:.2f} s ({int(DURACION // 60)}:{DURACION % 60:04.1f})  gráficos {len(G)}  zooms {len(zooms)}  cortes {len(cortes)}  sfx {len(sfx)}")
