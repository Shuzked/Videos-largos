import React from 'react';
import {AbsoluteFill, Easing, Img, Loop, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo} from '../sinvideo';
import {C, GLOW_AMARILLO, LIMA, glow} from '../estilo';
import {F, Sube, Ventana, golpe, iv} from '../anim';
import {H, LogoHiggsfield, amarillo} from '../texto';
import {Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle} from '../lottie';
import {cabe} from './iconos';
import {Avatar, Bocadillo, Claqueta, Cronometro, Ico, Insignia} from './iconosFlat';
import {Aviso, Fondo, Suave} from './piezas';
import {AbreKling, ComparaA2v2, ComparaB2, CtaBloques, LineaClavado, Plan3, Planeado2, PromptCard, Recap, Storyboard, Transicion16, TresModos, Valioso2} from './v2';
import EDL from './edl.json';

// Vídeo «Kling 4.0 en Higgsfield» (patrocinado). Base: el corte del usuario (25 fps); salida a 30 fps. Todo sale de
// edl.json (bin/montaje.py): segmentos (anuncio del gancho, tramos del corte y los tres resultados enteros), escenas de
// pantalla (dividida con su cámara o la web a pantalla completa, con transformación suave entre ellas), cámara virtual,
// resaltados, pestañas, gráficos y los cambios de escena con la transición del cliente. Sin audio: la mezcla (voz,
// resultados, efectos y música) se hace aparte (bin/mezcla.py).

const FPS = 30;
const fr = (s: number) => Math.round(s * FPS);
const lim = (x: number) => Math.min(1, Math.max(0, x));
const PANEL = 'rgba(14,14,18,0.88)';
const SOMBRA = 'drop-shadow(0 8px 22px rgba(0,0,0,0.7))';
const CHISPA = 'M0 -12 C 1.5 -3, 3 -1.5, 12 0 C 3 1.5, 1.5 3, 0 12 C -1.5 3, -3 1.5, -12 0 C -3 -1.5, -1.5 -3, 0 -12 Z';
const SUAVE = Easing.bezier(0.65, 0, 0.35, 1);
const CURVA = Easing.bezier(0.45, 0, 0.12, 1); // zooms: arrancan suave y se asientan despacio

type Seg = {tipo: 'base' | 'resultado'; ini: number; dur: number; desde?: number; src?: string; modo?: string; creditos?: number; antes?: number};
type Caja = {x: number; y: number; w: number; h: number};
type Foco = {a: number; b: number; r?: number[]; pos?: number[][]; c: string};
type Etq = {en: number; b: number; x: number; y: number; txt: string; arriba: boolean};
type Grafico = {tipo: string; a: number; b: number; [k: string]: unknown};
const D = EDL as unknown as {dur: number; pantalla: number[][]; vc: Caja; bc: Caja; web: Caja; modos: {a: number; b: number; m: string}[];
  camara: {t: number; s: number; x: number; y: number; d: number}[]; acentos: {t: number; a: number}[]; segs: Seg[]; focos: Foco[]; etiquetas: Etq[];
  graficos: Grafico[]; cortes: number[]};
export const DURACION_KLING = D.dur;

// ---------------- cámara virtual: centro y escala con curva; acentos suaves en las palabras clave ----------------
const camara = (t: number): React.CSSProperties => {
  let cx = 960, cy = 540, ls = 0;
  for (const k of D.camara) {
    if (t < k.t) break;
    const p = k.d > 0 ? CURVA(lim((t - k.t) / k.d)) : 1;
    cx += (k.x - cx) * p; cy += (k.y - cy) * p; ls += (Math.log(k.s) - ls) * p;
  }
  let s = Math.exp(ls);
  for (const ac of D.acentos) {  // sube en 0,3 s y se relaja en 1,6 s
    const u = t - ac.t;
    if (u > 0 && u < 2.2) s *= 1 + ac.a * (u < 0.3 ? Easing.out(Easing.cubic)(u / 0.3) : 1 - SUAVE(lim((u - 0.3) / 1.6)));
  }
  s *= 1 + 0.006 * (0.5 + 0.5 * Math.sin(t * 0.42)); // respira, casi imperceptible: nada se queda congelado
  cx = Math.min(1920 - 960 / s, Math.max(960 / s, cx));
  cy = Math.min(1080 - 540 / s, Math.max(540 / s, cy));
  return {position: 'absolute', inset: 0, transformOrigin: '0 0', translate: `${960 - cx * s}px ${540 - cy * s}px`, scale: s};
};

// ---------------- escena de pantalla: dividida (su burbuja + la web, como en el corte) ↔ web a pantalla completa ----------------
const enPantalla = (c: number) => D.pantalla.some(([a, b]) => c >= a - 1e-3 && c < b - 1e-3);
const MEDIA = 0.4; // la transformación dura 0,8 s, centrada en el cambio
const valorModo = (m: string) => (m === 'web' ? 1 : 0);
const modoWeb = (t: number) => {
  for (let i = 0; i < D.modos.length; i++) {
    const s = D.modos[i];
    if (t < s.a - MEDIA || t >= s.b + MEDIA) continue;
    const prev = D.modos[i - 1], next = D.modos[i + 1];
    let v = valorModo(s.m);
    if (t < s.a) { if (prev && Math.abs(prev.b - s.a) < 1e-3) continue; return v; }
    if (t >= s.b) { if (next && Math.abs(next.a - s.b) < 1e-3) continue; return v; }
    if (prev && Math.abs(prev.b - s.a) < 1e-3 && prev.m !== s.m && t < s.a + MEDIA) {
      const pv = valorModo(prev.m); v = pv + (v - pv) * SUAVE(lim((t - (s.a - MEDIA)) / (2 * MEDIA)));
    }
    if (next && Math.abs(next.a - s.b) < 1e-3 && next.m !== s.m && t > s.b - MEDIA) {
      const nv = valorModo(next.m); v = v + (nv - v) * SUAVE(lim((t - (s.b - MEDIA)) / (2 * MEDIA)));
    }
    return v;
  }
  return 0;
};
const mezcla = (A: Caja, B: Caja, m: number): Caja => ({x: A.x + (B.x - A.x) * m, y: A.y + (B.y - A.y) * m, w: A.w + (B.w - A.w) * m, h: A.h + (B.h - A.h) * m});

// recorte del corte (un trozo del fotograma) colocado en un rectángulo de la pantalla
const Recorte: React.FC<{caja: Caja; corte: Caja; radio: number; style?: React.CSSProperties; children?: React.ReactNode; s: Seg}> = ({caja, corte, radio, style, children, s}) => {
  const k = caja.w / corte.w;
  return (
    <div style={{position: 'absolute', left: caja.x, top: caja.y, width: caja.w, height: caja.h, borderRadius: radio, overflow: 'hidden', ...style}}>
      <div style={{position: 'absolute', left: -corte.x * k, top: -corte.y * k, width: 1920, height: 1080, transformOrigin: '0 0', scale: k}}>
        <OffthreadVideo src={staticFile('medios/corte.mp4')} muted trimBefore={fr(s.desde ?? 0)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
        {children}
      </div>
    </div>
  );
};

// pestaña de lo elegido en cada foto de Frames, debajo de la miniatura (coordenadas del corte; se amplía con la ventana)
const Pestanas: React.FC<{t: number}> = ({t}) => (
  <>
    {D.etiquetas.filter((e) => t >= e.en && t < e.b + 0.3).map((e, i) => {
      const ap = aparece(t, e.en, 0);
      const sale = lim((t - e.b) / 0.3);
      return (
        <div key={i} style={{position: 'absolute', left: e.x - 32, width: 64, top: e.y + 22, display: 'flex', justifyContent: 'center',
          scale: `${ap.sx} ${ap.sy}`, opacity: ap.op * (1 - sale), transformOrigin: '50% 0%'}}>
          <div style={{padding: '1.5px 4px', borderRadius: 4, background: LIMA, color: '#111', fontWeight: 900, fontSize: 8.5, letterSpacing: '0.04em', whiteSpace: 'nowrap',
            boxShadow: '0 0 8px rgba(209,254,23,0.7), 0 2px 6px rgba(0,0,0,0.6)'}}>{e.txt}</div>
        </div>
      );
    })}
  </>
);

// resaltado: lo demás se apaga y el control entero se levanta un poco y brilla (sin trazos)
const Focos: React.FC<{t: number; s: Seg; W: Caja}> = ({t, s, W}) => {
  const activos = D.focos.filter((f) => t >= f.a && t < f.b + 0.35);
  if (!activos.length) return null;
  const k = W.w / D.vc.w;
  const vis = Math.max(...activos.map((f) => Math.min(lim((t - f.a) / 0.3), 1 - lim((t - f.b) / 0.35))));
  return (
    <>
      <div style={{position: 'absolute', left: -400, top: -400, width: 2720, height: 1880, background: `rgba(0,0,0,${0.62 * vis})`}} />
      {activos.map((f, i) => {
        let r = f.r ?? [0, 0, 0, 0];
        if (f.pos) for (const p of f.pos) if (t >= p[0]) r = p.slice(1);
        const pad = 3;
        const caja = {x: W.x + (r[0] - pad - D.vc.x) * k, y: W.y + (r[1] - pad - D.vc.y) * k, w: (r[2] + 2 * pad) * k, h: (r[3] + 2 * pad) * k};
        const v = Math.min(lim((t - f.a) / 0.3), 1 - lim((t - f.b) / 0.35));
        const m = muelle(t, f.a, 2.2, 6);
        const late = 0.5 + 0.5 * Math.sin((t - f.a) * 4);
        const col = f.c === 'lima' ? '209,254,23' : '255,255,255';
        return (
          <div key={i} style={{position: 'absolute', left: caja.x, top: caja.y, width: caja.w, height: caja.h, opacity: v, scale: 1 + 0.07 * m,
            filter: `drop-shadow(0 0 ${8 + 6 * late}px rgba(${col},0.95)) drop-shadow(0 0 ${26 + 12 * late}px rgba(${col},0.55)) brightness(${1 + 0.12 * v})`}}>
            <Recorte caja={{x: 0, y: 0, w: caja.w, h: caja.h}} corte={{x: r[0] - pad, y: r[1] - pad, w: r[2] + 2 * pad, h: r[3] + 2 * pad}} radio={9 * k} s={s} />
          </div>
        );
      })}
    </>
  );
};

const Base: React.FC<{s: Seg; t: number}> = ({s, t}) => {
  const c = (s.desde ?? 0) + Math.round((t - s.ini) * 25) / 25;
  const p = enPantalla(c);
  const m = p ? modoWeb(t) : 0;
  const W = mezcla(D.vc, D.web, m);
  const k = W.w / D.vc.w;
  const B = {x: D.bc.x - 620 * m, y: D.bc.y + 40 * m, w: D.bc.w * (1 - 0.12 * m), h: D.bc.h * (1 - 0.12 * m)};
  return (
    <Sequence from={fr(s.ini)} durationInFrames={Math.max(1, fr(s.ini + s.dur) - fr(s.ini))} layout="none">
      {p ? (
        <>
          <Fondo t={t} />
          {m < 0.999 && <Recorte caja={B} corte={D.bc} radio={20} s={s} style={{opacity: 1 - m * 0.6, boxShadow: '0 20px 60px rgba(0,0,0,0.55)'}} />}
          <Recorte caja={W} corte={D.vc} radio={14 * k} s={s} style={{boxShadow: '0 26px 80px rgba(0,0,0,0.7)'}}>
            <Pestanas t={t} />
          </Recorte>
          <Focos t={t} s={s} W={W} />
        </>
      ) : (
        <OffthreadVideo src={staticFile('medios/corte.mp4')} muted trimBefore={fr(s.desde ?? 0)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
      )}
    </Sequence>
  );
};

// ---------------- un resultado entero, a pantalla completa (su audio va en la mezcla) ----------------
const reloj = (s: number) => `0:${String(Math.min(59, Math.floor(s))).padStart(2, '0')}`;
const Resultado: React.FC<{t: number; s: Seg}> = ({t, s}) => {
  const u = t - s.ini;
  if (u < 0 || u >= s.dur) return null;
  const gancho = s.modo === 'gancho';
  const p = lim(u / s.dur);
  // rótulo: grande al empezar y luego se encoge a la esquina (que el vídeo se vea limpio)
  const enc = SUAVE(lim((u - 2.6) / 0.6));
  const et = aparece(t, s.ini + 0.15, -6);
  return (
    <AbsoluteFill>
      <Sequence from={fr(s.ini)} durationInFrames={fr(s.ini + s.dur) - fr(s.ini)} layout="none">
        <OffthreadVideo src={staticFile(s.src!)} muted style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
      </Sequence>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 84%, rgba(0,0,0,0.5) 100%)'}} />
      <div style={{position: 'absolute', left: 100, top: 64, transformOrigin: '0% 0%', scale: `${(1 - 0.38 * enc) * et.sx} ${(1 - 0.38 * enc) * et.sy}`, opacity: et.op, filter: SOMBRA}}>
        <div style={{fontWeight: 800, fontSize: 28, letterSpacing: '0.2em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.6)}}>
          <Sube t={t} en={s.ini + 0.15}>{gancho ? 'KLING 4.0 · HIGGSFIELD' : 'RESULTADO · KLING 4.0'}</Sube>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 8}}>
          <div style={{...H, fontSize: 66}}>{gancho ? 'UN SOLO CLIP' : s.modo}</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '6px 18px 6px 12px', borderRadius: 999, background: LIMA, color: '#111', fontWeight: 900, fontSize: 32}}>
            <svg width={28} height={28} viewBox="-13 -13 26 26"><path d={CHISPA} fill="#111" /></svg>
            {s.creditos}<span style={{fontWeight: 700, fontSize: 24}}>créditos</span>
          </div>
        </div>
      </div>
      {/* barra de tiempo: el clip corre entero, sin cortes */}
      <div style={{position: 'absolute', left: 100, right: 100, top: 1016, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.18)'}}>
        <div style={{width: `${p * 100}%`, height: '100%', borderRadius: 3, background: LIMA, boxShadow: `0 0 12px ${LIMA}`}} />
      </div>
      <div style={{position: 'absolute', right: 100, top: 966, fontWeight: 800, fontSize: 30, fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 8px rgba(0,0,0,0.8)'}}>
        {reloj(u)} <span style={{opacity: 0.6}}>/ {reloj(s.dur)}</span>
      </div>
      {gancho && (
        <div style={{position: 'absolute', left: 100, top: 966, fontWeight: 700, fontSize: 30, letterSpacing: '0.08em', textShadow: '0 2px 8px rgba(0,0,0,0.8)', opacity: iv(u, [1, 1.4], [0, 1])}}>
          30 SEGUNDOS · SIN MONTAR NADA
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------- piezas a cámara ----------------
type Pal = [string, number, string?];
const est = (e?: string) => (e === 'k' ? amarillo : undefined);
const Pecho: React.FC<{t: number; a: number; b: number; top?: number; lineas: {ws: Pal[]; size: number; golpe?: boolean}[]}> = ({t, a, b, top = 700, lineas}) => {
  if (t < a || t >= b + 8 * F) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: top - 70, padding: '70px 0', opacity: iv(t, [a, a + 3 * F], [0, 1]),
      background: 'radial-gradient(ellipse 42% 50% at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)'}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.8))', ...H}}>
        {lineas.map((l, i) => (
          <div key={i} style={{display: 'flex', gap: '0.24em', fontSize: l.size, lineHeight: 1.0, whiteSpace: 'nowrap'}}>
            {l.golpe ? (
              <span style={{display: 'inline-block', ...golpe(t, l.ws[0][1], b), ...est(l.ws[0][2])}}>{l.ws.map((w) => w[0]).join(' ')}</span>
            ) : (
              l.ws.map(([w, en, e], wi) => <Sube key={wi} t={t} en={en} sale={b} style={est(e)}>{w}</Sube>)
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// titular lateral con icono que se dibuja (en el hueco libre a un lado de Álvaro)
const Lateral: React.FC<{t: number; a: number; b: number; lado: 'izq' | 'der'; icono: string; sup: string; txt: string; en: number; supEn: number; abajo?: boolean}> = ({t, a, b, lado, icono, sup, txt, en, supEn, abajo}) => {
  const x = lado === 'der' ? 1330 : 100;
  return (
    <Ventana t={t} a={a} b={b} suave>
      <div style={{position: 'absolute', left: x, width: 490, top: 290, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, filter: SOMBRA}}>
        <Ico tam={230} style={{translate: `0px ${flota(t, x / 400, 5).y}px`}}>
          {icono === 'reloj' ? <Cronometro t={t} en={a + 2 * F} r={80} /> : <Claqueta t={t} en={a + 2 * F} r={88} id={`claq${Math.round(a)}`} />}
        </Ico>
        {!abajo && <div style={{fontWeight: 700, fontSize: 40, textShadow: glow('255,255,255', 0.4)}}><Sube t={t} en={supEn}>{sup}</Sube></div>}
        <div style={{...H, fontSize: cabe(txt, 490, 96, 0.72), ...amarillo, ...golpe(t, en, b - 6 * F)}}>{txt}</div>
        {abajo && <div style={{fontWeight: 700, fontSize: 40, textShadow: glow('255,255,255', 0.4)}}><Sube t={t} en={supEn}>{sup}</Sube></div>}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Particulas t={t} en={en + 2 * F} x={x + 245} y={600} n={12} radio={300} colores={[C.amarillo, '#fff']} />
      </svg>
    </Ventana>
  );
};

// línea de tiempo de 30 s con los 4 fotogramas clave en su sitio y el sello «clavado»
const KF = ['medios/kf/kf1.jpg', 'medios/kf/kf2.jpg', 'medios/kf/kf3.jpg', 'medios/kf/kf4.jpg'];
const SEG_KF = [0, 7, 14, 22];
const MW = 200, MH = 113;
const xMini = (i: number, X0: number, X1: number) => (i === 0 ? X0 - 8 : X0 + ((X1 - X0) * SEG_KF[i]) / 30 - MW / 2);
const LineaTiempo: React.FC<{t: number; a: number; b: number; en: number[]; inicio: number; clavado: number}> = ({t, a, b, en, inicio, clavado}) => {
  const X0 = 300, X1 = 1620, Y = 905;
  const traza = 1 - Math.pow(1 - lim((t - inicio) / 0.6), 3);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.72) 100%)'}} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * traza} y2={Y} stroke="rgba(255,255,255,0.85)" strokeWidth={5} strokeLinecap="round" />
        {[0, 7, 14, 22, 30].map((s) => {
          const x = X0 + ((X1 - X0) * s) / 30;
          return t < inicio + (s / 30) * 0.6 ? null : (
            <g key={s}><line x1={x} y1={Y - 10} x2={x} y2={Y + 10} stroke="#fff" strokeWidth={4} />
              <text x={x} y={Y + 48} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontWeight={700} fontSize={28} fontFamily="Montserrat">{s} s</text></g>
          );
        })}
      </svg>
      {en.map((e, i) => {
        if (t < e) return null;
        const ap = aparece(t, e, (i - 1.5) * 4);
        const w = MW, h = MH;
        return (
          <div key={i} style={{position: 'absolute', left: xMini(i, X0, X1), top: Y - h - 26, width: w, height: h, borderRadius: 14, overflow: 'hidden',
            border: `3px solid ${t >= clavado ? C.amarillo : 'rgba(255,255,255,0.8)'}`, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, transformOrigin: '50% 100%', boxShadow: '0 10px 30px rgba(0,0,0,0.6)'}}>
            <Img src={staticFile(KF[i])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: X1 - 270, top: Y - 290, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 26px', borderRadius: 999, background: C.amarillo, color: '#141418',
        fontWeight: 900, fontSize: 44, ...golpe(t, clavado, b - 6 * F), rotate: '-6deg', boxShadow: `0 0 24px rgba(${GLOW_AMARILLO},0.7)`}}>
        <Ico tam={46}><Insignia t={t} en={clavado + 3 * F} r={21} bien rafaga={false} /></Ico>CLAVADO
      </div>
    </Ventana>
  );
};

const Patrocinio: React.FC<{t: number; a: number; b: number; en: number; logo: number}> = ({t, a, b, en, logo}) => (
  <Ventana t={t} a={a} b={b} suave>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 40% 30% at 50% 82%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
      <div style={{fontWeight: 700, fontSize: 34, letterSpacing: '0.18em', textShadow: glow('255,255,255', 0.4)}}><Sube t={t} en={en}>COLABORACIÓN PAGADA</Sube></div>
      <div style={{...golpe(t, logo)}}><LogoHiggsfield w={540} /></div>
    </div>
  </Ventana>
);

// B-roll a pantalla completa (MediaKit), rotulado como ejemplo de Higgsfield
const Broll: React.FC<{t: number; a: number; b: number; src: string; desde: number; etiqueta: string; sub: string}> = ({t, a, b, src, desde, etiqueta, sub}) => {
  if (t < a || t >= b) return null;
  return (
    <AbsoluteFill>
      <Sequence from={fr(a)} durationInFrames={fr(b) - fr(a)} layout="none">
        <OffthreadVideo src={staticFile(src)} muted trimBefore={fr(desde)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', scale: iv(t, [a, b], [1.0, 1.05])}} />
      </Sequence>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 72%, rgba(0,0,0,0.6) 100%)'}} />
      <div style={{position: 'absolute', left: 100, top: 950, display: 'flex', alignItems: 'center', gap: 16, ...golpe(t, a + 4 * F)}}>
        <div style={{padding: '8px 20px', borderRadius: 10, background: LIMA, color: '#111', fontWeight: 900, fontSize: 30, letterSpacing: '0.06em'}}>{etiqueta}</div>
        <div style={{fontWeight: 700, fontSize: 30, textShadow: '0 2px 8px rgba(0,0,0,0.8)'}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// duración máxima por clip: Kling 3.0 (15 s) frente a Kling 4.0 (30 s), ×2
const Duracion: React.FC<{t: number; a: number; b: number; en4: number; enx2: number; en3: number; en15: number}> = ({t, a, b, en4, enx2, en3, en15}) => {
  const X = 1300, W = 520;
  const b4 = 1 - Math.pow(1 - lim((t - en4) / 0.7), 3);
  const b3 = 1 - Math.pow(1 - lim((t - en3) / 0.5), 3);
  const barra = (y: number, k: number, max: number, nombre: string, seg: string, segEn: number, color: string, op: number) => (
    <div style={{position: 'absolute', left: X, top: y, width: W, opacity: op}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12}}>
        <span style={{fontWeight: 800, fontSize: 40, textShadow: glow('255,255,255', 0.35)}}>{nombre}</span>
        <span style={{...H, fontSize: 58, color, ...golpe(t, segEn)}}>{seg}</span>
      </div>
      <div style={{height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
        <div style={{width: `${k * max * 100}%`, height: '100%', borderRadius: 17, background: color, boxShadow: `0 0 18px ${color}`}} />
      </div>
    </div>
  );
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 30% 45% at 82% 50%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)'}} />
      <div style={{position: 'absolute', left: X, width: W, top: 300, fontWeight: 800, fontSize: 30, letterSpacing: '0.16em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.6)}}>
        <Sube t={t} en={a}>MÁXIMO POR CLIP</Sube>
      </div>
      {barra(380, b4, 1, 'Kling 4.0', '30 s', en4 + 0.5, C.amarillo, lim((t - en4) / 0.15))}
      {barra(560, b3, 0.5, 'Kling 3.0', '15 s', en15, 'rgba(255,255,255,0.75)', lim((t - en3) / 0.15))}
      <div style={{position: 'absolute', left: X + W - 160, top: 700, ...H, fontSize: 120, ...amarillo, ...golpe(t, enx2), rotate: '-8deg'}}>×2</div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Particulas t={t} en={enx2 + 2 * F} x={X + W - 90} y={760} n={12} radio={220} colores={[C.amarillo, '#fff']} />
      </svg>
    </Ventana>
  );
};

// pastilla de créditos: lo que costaba (tachado) y lo que cuesta ahora
const PastillaCreditos: React.FC<{t: number; a: number; b: number; antes: number; ahora: number; en: number; x: number; y: number}> = ({t, a, b, antes, ahora, en, x, y}) => {
  if (t < a || t >= b) return null;
  const ap = aparece(t, en, -6);
  const fl = flota(t, x / 300, 4);
  const sale = lim((t - (b - 0.25)) / 0.25);
  return (
    <div style={{position: 'absolute', left: x, top: y + fl.y, opacity: ap.op * (1 - sale), scale: `${ap.sx} ${ap.sy}`, transformOrigin: '0% 50%', filter: SOMBRA}}>
      <div style={{fontWeight: 700, fontSize: 28, letterSpacing: '0.12em', marginBottom: 10, whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.9)'}}>EL BOTÓN TE DICE LO QUE CUESTA</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '12px 32px 12px 22px', borderRadius: 999, background: LIMA, color: '#111', boxShadow: `0 0 26px rgba(209,254,23,0.5)`}}>
        <svg width={46} height={46} viewBox="-13 -13 26 26"><path d={CHISPA} fill="#111" transform={`scale(${1 + 0.08 * Math.sin((t - en) * 5)})`} /></svg>
        <span style={{fontWeight: 800, fontSize: 44, textDecoration: 'line-through', opacity: 0.5}}>{antes}</span>
        <span style={{fontWeight: 900, fontSize: 64}}>{ahora}</span>
        <span style={{fontWeight: 800, fontSize: 38}}>créditos</span>
      </div>
    </div>
  );
};

// lista que se escribe sola: número en círculo + título y línea secundaria; el punto activo brilla
const Lista: React.FC<{t: number; a: number; b: number; x: number; y: number; w: number; paso: number; titulo: string; tituloEn: number; items: [string, string, number][]}> = ({t, a, b, x, y, w, paso, titulo, tituloEn, items}) => {
  let activo = -1;
  items.forEach(([, , en], i) => { if (t >= en) activo = i; });
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 34% 60% at 18% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)'}} />
      <div style={{position: 'absolute', left: x, top: y - 90, fontWeight: 800, fontSize: 34, letterSpacing: '0.16em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.6)}}>
        <Sube t={t} en={tituloEn}>{titulo}</Sube>
      </div>
      {items.map(([txt, sub, en], i) => {
        if (t < en) return null;
        const ap = aparece(t, en, -4);
        const on = i === activo;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y + i * paso, width: w, display: 'flex', alignItems: 'center', gap: 22, opacity: (on ? 1 : 0.55) * ap.op,
            scale: `${ap.sx} ${ap.sy}`, transformOrigin: '0% 50%', filter: SOMBRA}}>
            <div style={{flex: 'none', width: 88, height: 88, borderRadius: 44, border: `5px solid ${C.amarillo}`, background: on ? C.amarillo : 'rgba(14,14,18,0.7)',
              color: on ? '#141418' : C.amarillo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 48, boxShadow: on ? `0 0 22px rgba(${GLOW_AMARILLO},0.8)` : 'none'}}>{i + 1}</div>
            <div>
              <div style={{fontWeight: 900, fontSize: cabe(txt, w - 120, 54, 0.62), lineHeight: 1.05, textShadow: on ? glow(GLOW_AMARILLO, 0.5) : glow('255,255,255', 0.3), color: on ? C.amarillo : '#fff'}}>{txt}</div>
              <div style={{fontWeight: 600, fontSize: cabe(sub, w - 120, 34, 0.55), color: 'rgba(255,255,255,0.85)', marginTop: 4, whiteSpace: 'nowrap'}}>{sub}</div>
            </div>
          </div>
        );
      })}
    </Ventana>
  );
};

// «lo que planeé» → «lo que salió»
const Planeado: React.FC<{t: number; a: number; b: number; en1: number; en2: number}> = ({t, a, b, en1, en2}) => {
  const fl = flota(t, 1.2, 5);
  const p = lim((t - en1 - 0.25) / 0.5);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 30% 45% at 82% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)'}} />
      <div style={{position: 'absolute', left: 1330, width: 490, top: 330 + fl.y, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, filter: SOMBRA}}>
        <div style={{...H, fontSize: 70, ...golpe(t, en1)}}>LO QUE PLANEÉ</div>
        <svg width={60} height={110} viewBox="0 0 60 110" style={{overflow: 'visible'}}>
          <line x1={30} y1={4} x2={30} y2={4 + 84 * p} stroke={C.amarillo} strokeWidth={7} strokeLinecap="round" />
          {p > 0.95 && <path d="M12 72 L30 96 L48 72" fill="none" stroke={C.amarillo} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <div style={{...H, fontSize: 70, ...amarillo, ...golpe(t, en2)}}>LO QUE SALIÓ</div>
      </div>
    </Ventana>
  );
};

// los 4 fotogramas clave: aparecen al nombrarlos (dos a cada lado) y al final bajan a su sitio en la línea de 30 s
const Fotogramas: React.FC<{t: number; a: number; b: number; titulo: number; en: number[]; ia: number; linea: number; textos: string[]}> = ({t, a, b, titulo, en, ia, linea, textos}) => {
  const POS = [[100, 240], [1330, 240], [100, 560], [1330, 560]];
  const W = 490, Hh = 276;
  const X0 = 300, X1 = 1620, Y = 905;
  const baja = SUAVE(lim((t - linea) / 0.8));
  const traza = 1 - Math.pow(1 - lim((t - linea - 0.4) / 0.6), 3);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: `rgba(0,0,0,${0.25 + 0.2 * baja})`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 90, textAlign: 'center', ...H, fontSize: 64, ...golpe(t, titulo)}}>
        MIS <span style={amarillo}>4</span> FOTOGRAMAS CLAVE
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 168, textAlign: 'center', fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,0.85)', opacity: 1 - baja}}>
        <Sube t={t} en={ia}>(las generé antes con IA)</Sube>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: baja}}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * traza} y2={Y} stroke="rgba(255,255,255,0.85)" strokeWidth={5} strokeLinecap="round" />
        {[0, 7, 14, 22, 30].map((s) => {
          const x = X0 + ((X1 - X0) * s) / 30;
          return <g key={s}><line x1={x} y1={Y - 10} x2={x} y2={Y + 10} stroke="#fff" strokeWidth={4} /><text x={x} y={Y + 48} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontWeight={700} fontSize={28} fontFamily="Montserrat">{s} s</text></g>;
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 670, textAlign: 'center', fontWeight: 800, fontSize: 46, opacity: baja, textShadow: glow('255,255,255', 0.4)}}>
        <Sube t={t} en={linea + 0.6}>¿llega a cada momento, en orden y a tiempo?</Sube>
      </div>
      {en.map((e, i) => {
        if (t < e) return null;
        const ap = aparece(t, e, i % 2 ? 5 : -5);
        const fl = flota(t, i * 1.3, 4);
        const [x, y] = POS[i];
        const w2 = MW, h2 = MH;
        const xs = xMini(i, X0, X1);
        const ys = Y - h2 - 26;
        const xx = x + (xs - x) * baja, yy = y + fl.y * (1 - baja) + (ys - y) * baja, ww = W + (w2 - W) * baja, hh = Hh + (h2 - Hh) * baja;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: xx, top: yy, width: ww, height: hh, borderRadius: 18, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.85)',
              scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot * (1 - baja)}deg`, opacity: ap.op, boxShadow: '0 16px 44px rgba(0,0,0,0.6)'}}>
              <Img src={staticFile(KF[i])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              <div style={{position: 'absolute', left: 14, top: 12, width: 54 - 20 * baja, height: 54 - 20 * baja, borderRadius: 30, background: C.amarillo, color: '#141418',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 32 - 12 * baja}}>{i + 1}</div>
            </div>
            <div style={{position: 'absolute', left: x, width: W, top: y + Hh + 10 + fl.y, textAlign: 'center', fontWeight: 700, fontSize: 32, opacity: (1 - baja) * ap.op, textShadow: '0 2px 10px rgba(0,0,0,0.9)'}}>
              {textos[i]}
            </div>
          </React.Fragment>
        );
      })}
    </Ventana>
  );
};

// traducción del prompt (una línea) en la franja de abajo
const PromptEs: React.FC<{t: number; a: number; b: number; txt: string; etiqueta: string}> = ({t, a, b, txt, etiqueta}) => {
  if (t < a || t >= b) return null;
  const op = iv(t, [a, a + 6 * F, b - 6 * F, b], [0, 1, 1, 0]);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 948, display: 'flex', justifyContent: 'center', opacity: op}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '14px 30px', borderRadius: 18, background: 'rgba(14,14,18,0.9)', border: '2px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', maxWidth: 1720}}>
        <span style={{flex: 'none', padding: '4px 12px', borderRadius: 8, background: LIMA, color: '#111', fontWeight: 900, fontSize: 22, letterSpacing: '0.08em'}}>{etiqueta}</span>
        <span style={{fontWeight: 600, fontSize: cabe(txt, 1360, 34, 0.5), whiteSpace: 'nowrap'}}><Sube t={t} en={a}>{txt}</Sube></span>
      </div>
    </div>
  );
};

// «lo que más cuesta»: foto del producto + foto del modelo = el anuncio
const Valioso: React.FC<{t: number; a: number; b: number; enProd: number; enModelo: number; enAnuncio: number; enValioso: number}> = ({t, a, b, enProd, enModelo, enAnuncio, enValioso}) => {
  const tile = (en: number, x: number, w: number, h: number, hijo: React.ReactNode, txt: string) => {
    if (t < en) return null;
    const ap = aparece(t, en, 0);
    const fl = flota(t, x / 200, 4);
    return (
      <div style={{position: 'absolute', left: x, top: 420 - h / 2 + fl.y, width: w, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op}}>
        <div style={{width: w, height: h, borderRadius: 18, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.85)', boxShadow: '0 14px 40px rgba(0,0,0,0.6)'}}>{hijo}</div>
        <div style={{marginTop: 10, textAlign: 'center', fontWeight: 700, fontSize: 28, textShadow: '0 2px 8px rgba(0,0,0,0.9)'}}>{txt}</div>
      </div>
    );
  };
  const signo = (en: number, x: number, s: string) => (t < en ? null : <div style={{position: 'absolute', left: x, top: 380, ...H, fontSize: 80, ...amarillo, ...golpe(t, en)}}>{s}</div>);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <div style={{position: 'absolute', left: 840, top: 230, width: 1040, height: 560, borderRadius: 28, background: 'rgba(10,10,14,0.82)', border: '2px solid rgba(255,255,255,0.12)'}} />
      {tile(enProd, 880, 220, 220, <Img src={staticFile('medios/kf/frasco.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />, 'foto del producto')}
      {signo(enModelo, 1118, '+')}
      {tile(enModelo, 1180, 180, 240, <Img src={staticFile('medios/kf/foto3.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />, 'foto del modelo')}
      {signo(enAnuncio, 1378, '=')}
      {tile(enAnuncio, 1440, 400, 225, (
        <Sequence from={fr(enAnuncio)} layout="none"><Loop durationInFrames={fr(8)}><OffthreadVideo src={staticFile('medios/r3.mp4')} muted trimBefore={fr(4)} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></Loop></Sequence>
      ), 'el anuncio')}
      <div style={{position: 'absolute', left: 840, width: 1040, top: 640, textAlign: 'center', ...H, fontSize: 82, ...golpe(t, enValioso, b - 6 * F)}}>
        LO MÁS <span style={amarillo}>VALIOSO</span>
      </div>
    </Ventana>
  );
};

// nota corta de lo que comenta (✓ bien / ✗ mal), en la franja de abajo
const Nota: React.FC<{t: number; a: number; b: number; texto: string; tono: string; en: number}> = ({t, a, b, texto, tono, en}) => {
  if (t < a || t >= b) return null;
  const bueno = tono === 'bueno';
  const ap = aparece(t, en, bueno ? -4 : 4);
  const sale = lim((t - (b - 0.25)) / 0.25);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 952, display: 'flex', justifyContent: 'center', opacity: ap.op * (1 - sale)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px 12px 16px', borderRadius: 999, background: 'rgba(14,14,18,0.9)', border: `2px solid ${bueno ? VERDE : ROJO}`,
        scale: `${ap.sx} ${ap.sy}`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'}}>
        <Ico tam={50}><Insignia t={t} en={en + 3 * F} r={23} bien={bueno} /></Ico>
        <span style={{fontWeight: 700, fontSize: 34}}>{texto}</span>
      </div>
    </div>
  );
};

// marco de vídeo/imagen con su rótulo encima
const Panel: React.FC<{x: number; y: number; w: number; h: number; etiqueta: string; color?: string; children: React.ReactNode}> = ({x, y, w, h, etiqueta, color = '#fff', children}) => (
  <>
    <div style={{position: 'absolute', left: x, top: y - 54, width: w, fontWeight: 800, fontSize: 30, letterSpacing: '0.1em', color, textShadow: glow(color === '#fff' ? '255,255,255' : GLOW_AMARILLO, 0.4)}}>{etiqueta}</div>
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 20, overflow: 'hidden', border: `3px solid ${color === '#fff' ? 'rgba(255,255,255,0.8)' : C.amarillo}`,
      boxShadow: '0 18px 50px rgba(0,0,0,0.6)'}}>{children}</div>
  </>
);
const Sello: React.FC<{t: number; en: number; x: number; y: number; txt?: string}> = ({t, en, x, y, txt = 'CLAVADO'}) =>
  t < en ? null : (
    <div style={{position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 26px', borderRadius: 999, background: C.amarillo, color: '#141418',
      fontWeight: 900, fontSize: 46, ...golpe(t, en), rotate: '-6deg', boxShadow: `0 0 24px rgba(${GLOW_AMARILLO},0.7)`}}>
      <Ico tam={46}><Insignia t={t} en={en + 3 * F} r={21} bien rafaga={false} /></Ico>{txt}
    </div>
  );

// A2: lo planeado (fotograma clave) al lado de lo generado (ese tramo del anuncio), al ritmo de lo que dice
const SEGS_A2 = [[0, 7], [7, 14], [14, 22], [22, 30]];
const ComparaA2: React.FC<{t: number; a: number; b: number; en: number[]; clavado: number[]; ia: number}> = ({t, a, b, en, clavado, ia}) => {
  if (t < a || t >= b) return null;
  let i = 0;
  en.forEach((e, k) => { if (t >= e) i = k; });
  const [s0, s1] = SEGS_A2[i];
  const W = 820, Hh = (W * 9) / 16, Y = 270;
  const cambio = aparece(t, en[i], 0);
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', ...H, fontSize: 60}}>
        LO QUE <span>PLANEÉ</span> <span style={{opacity: 0.5}}>vs</span> LO QUE <span style={amarillo}>SALIÓ</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', gap: 14}}>
        {en.map((e, k) => (
          <div key={k} style={{width: k === i ? 54 : 18, height: 18, borderRadius: 9, background: k <= i && t >= e ? C.amarillo : 'rgba(255,255,255,0.25)'}} />
        ))}
      </div>
      <div style={{position: 'absolute', inset: 0, opacity: cambio.op, scale: 0.96 + 0.04 * cambio.sx}}>
        <Panel x={110} y={Y} w={W} h={Hh} etiqueta={`FOTOGRAMA CLAVE ${i + 1}`}>
          <Img src={staticFile(KF[i])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Panel>
        <Panel x={1920 - 110 - W} y={Y} w={W} h={Hh} etiqueta={`KLING 4.0 · SEGUNDO ${s0}–${s1}`} color={C.amarillo}>
          {en.map((e, k) => (
            <Sequence key={k} from={fr(e)} durationInFrames={Math.max(1, fr(k + 1 < en.length ? en[k + 1] : b) - fr(e))} layout="none">
              <Loop durationInFrames={fr(SEGS_A2[k][1] - SEGS_A2[k][0])}>
                <OffthreadVideo src={staticFile('medios/r2.mp4')} muted trimBefore={fr(SEGS_A2[k][0])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </Loop>
            </Sequence>
          ))}
        </Panel>
      </div>
      <Sello t={t} en={clavado[i]} x={850} y={Y + Hh + 40} />
      {i === 1 && <Aviso t={t} a={ia} b={en[2] - 0.2} texto="Generé las fotos con IA: con fotos reales del producto, el vídeo mejoraría" x={960} y={1000} />}
    </AbsoluteFill>
  );
};

// «estoy clonado»: titular arriba y lo que va señalando de su cara
const Clonado: React.FC<{t: number; a: number; b: number; en: number[]; textos: string[]}> = ({t, a, b, en, textos}) => (
  <Ventana t={t} a={a} b={b} suave>
    <div style={{position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center', ...H, fontSize: 84, ...amarillo, ...golpe(t, en[0], b - 6 * F)}}>{textos[0]}</div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 952, display: 'flex', justifyContent: 'center', gap: 22}}>
      {textos.slice(1).map((tx, k) => {
        const e = en[k + 1];
        if (t < e) return null;
        const ap = aparece(t, e, 0);
        return (
          <div key={k} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 26px 10px 14px', borderRadius: 999, background: 'rgba(14,14,18,0.9)', border: `2px solid ${C.amarillo}`,
            scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, fontWeight: 700, fontSize: 32}}>
            <Ico tam={36}><Insignia t={t} en={e + 3 * F} r={16} bien /></Ico>{tx}
          </div>
        );
      })}
    </div>
  </Ventana>
);

// B: las fotos que le subió (3 suyas + el frasco) al lado del resultado
const ComparaB: React.FC<{t: number; a: number; b: number; en: number; producto: number}> = ({t, a, b, en, producto}) => {
  if (t < a || t >= b) return null;
  const fotos = ['medios/kf/foto1.jpg', 'medios/kf/foto2.jpg', 'medios/kf/foto3.jpg', 'medios/kf/frasco.jpg'];
  const W = 900, Hh = (W * 9) / 16;
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', ...H, fontSize: 60}}>
        CON ESTAS <span style={amarillo}>4 FOTOS</span>
      </div>
      <div style={{position: 'absolute', left: 110, top: 220, fontWeight: 800, fontSize: 30, letterSpacing: '0.1em'}}>LO QUE LE DI</div>
      {fotos.map((f, k) => {
        const e = (k < 3 ? en : producto) + k * 0.12;
        if (t < Math.min(e, a + 0.3 + k * 0.1)) return null;
        const ap = aparece(t, Math.min(e, a + 0.3 + k * 0.1), (k - 1.5) * 4);
        const x = 110 + (k % 2) * 380, y = 280 + Math.floor(k / 2) * 370;
        const on = k === 3 && t >= producto;
        return (
          <div key={k} style={{position: 'absolute', left: x, top: y, width: 350, height: 340, borderRadius: 18, overflow: 'hidden', border: `3px solid ${on ? C.amarillo : 'rgba(255,255,255,0.8)'}`,
            scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, boxShadow: on ? `0 0 26px rgba(${GLOW_AMARILLO},0.6)` : '0 14px 40px rgba(0,0,0,0.6)'}}>
            <Img src={staticFile(f)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%'}} />
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={`M 880 600 L ${880 + 34 * lim((t - a - 0.6) / 0.4)} 600`} stroke={C.amarillo} strokeWidth={8} strokeLinecap="round" />
      </svg>
      <Panel x={1920 - 110 - W} y={330} w={W} h={Hh} etiqueta="LO QUE SALIÓ · KLING 4.0 REFERENCES" color={C.amarillo}>
        <Sequence from={fr(a)} layout="none"><Loop durationInFrames={fr(15)}><OffthreadVideo src={staticFile('medios/r3.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} /></Loop></Sequence>
      </Panel>
    </AbsoluteFill>
  );
};

// el cliente escribe: «¿no podrías ponerme en una terraza de día?»
const Cliente: React.FC<{t: number; a: number; b: number; en: number; escribe: number; rodaje: number}> = ({t, a, b, en, escribe, rodaje}) => {
  const texto = 'Me encanta… pero ¿no podrías ponerme en una terraza de día?';
  const n = Math.floor(lim((t - escribe) / 2.6) * texto.length);
  const ap = aparece(t, en, 5);
  const fl = flota(t, 0.7, 5);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 32% 50% at 80% 45%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)'}} />
      <div style={{position: 'absolute', left: 1250, top: 300 + fl.y, width: 570, padding: '28px 30px', borderRadius: 28, background: PANEL, border: '2px solid rgba(255,255,255,0.14)',
        scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot}deg`, transformOrigin: '100% 0%', boxShadow: '0 18px 50px rgba(0,0,0,0.6)', opacity: ap.op}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16}}>
          <Ico tam={58}><Avatar t={t} en={en + 4 * F} r={27} fondo="#8ab4ff" id="avCliente" /></Ico>
          <div style={{fontWeight: 800, fontSize: 30}}>Cliente</div>
          <div style={{marginLeft: 'auto', fontWeight: 600, fontSize: 24, color: 'rgba(255,255,255,0.55)'}}>{t < escribe + 2.6 ? 'escribiendo…' : 'ahora'}</div>
        </div>
        <div style={{padding: '18px 22px', borderRadius: '6px 22px 22px 22px', background: 'rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 38, lineHeight: 1.28, minHeight: 100}}>
          {t < escribe ? (
            <span style={{letterSpacing: '0.2em', opacity: 0.7}}>{'•••'.slice(0, 1 + (Math.floor(t * 4) % 3))}</span>
          ) : texto.slice(0, n)}
        </div>
      </div>
      <div style={{position: 'absolute', left: 1250, width: 570, top: 640, display: 'flex', justifyContent: 'center'}}>
        {t >= rodaje && (
          <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 26px 10px 14px', borderRadius: 999, background: 'rgba(14,14,18,0.9)', border: `2px solid ${ROJO}`,
            fontWeight: 700, fontSize: 32, ...golpe(t, rodaje)}}>
            <Ico tam={36}><Insignia t={t} en={rodaje + 3 * F} r={16} bien={false} /></Ico>antes: repetir todo el rodaje
          </div>
        )}
      </div>
    </Ventana>
  );
};

// C: antes y después del Edit, sincronizados (mismo movimiento, solo cambia el fondo)
const ComparaC: React.FC<{t: number; a: number; b: number; en: number}> = ({t, a, b, en}) => {
  if (t < a || t >= b) return null;
  const W = 820, Hh = (W * 9) / 16, Y = 260;
  const vid = (src: string) => (
    <Sequence from={fr(en)} layout="none"><Loop durationInFrames={fr(15)}><OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} /></Loop></Sequence>
  );
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', ...H, fontSize: 60}}>
        SOLO CAMBIA <span style={amarillo}>EL FONDO</span>
      </div>
      <Panel x={110} y={Y} w={W} h={Hh} etiqueta="ANTES · EL VÍDEO DE REFERENCES">{vid('medios/r3.mp4')}</Panel>
      <Panel x={1920 - 110 - W} y={Y} w={W} h={Hh} etiqueta="DESPUÉS · KLING 4.0 EDIT VIDEO" color={C.amarillo}>{vid('medios/r4.mp4')}</Panel>
      <div style={{position: 'absolute', left: 0, right: 0, top: Y + Hh + 60, textAlign: 'center', fontWeight: 700, fontSize: 40, textShadow: glow('255,255,255', 0.3)}}>
        <Sube t={t} en={a + 4.6}>mismo movimiento, misma cámara, misma ropa y mismo frasco</Sube>
      </div>
    </AbsoluteFill>
  );
};

// tarjeta de capítulo
const Capitulo: React.FC<{t: number; a: number; b: number; num: string; titulo: string; en: number}> = ({t, a, b, num, titulo, en}) => {
  if (t < a || t >= b) return null;
  const linea = 1 - Math.pow(1 - lim((t - a - 2 * F) / 0.45), 3);
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontWeight: 800, fontSize: 40, letterSpacing: '0.3em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.7)}}>
        <Sube t={t} en={a}>{num}</Sube>
      </div>
      <div style={{position: 'absolute', left: 960 - 330 * linea, width: 660 * linea, top: 450, height: 4, borderRadius: 2, background: C.amarillo, boxShadow: `0 0 14px rgba(${GLOW_AMARILLO},0.8)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 480, textAlign: 'center', ...H, fontSize: 150, ...golpe(t, en, b - 6 * F)}}>{titulo}</div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Particulas t={t} en={en + 2 * F} x={960} y={560} n={16} radio={520} colores={[C.amarillo, '#fff']} />
      </svg>
    </AbsoluteFill>
  );
};

// veredicto: fichas ✓ / ✗ apiladas a la derecha
const Fichas: React.FC<{t: number; a: number; b: number; x: number; items: [string, string, string, number][]}> = ({t, a, b, x, items}) => (
  <Ventana t={t} a={a} b={b} suave>
    <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.62) 76%, rgba(0,0,0,0.7) 100%)'}} />
    <div style={{position: 'absolute', left: x, top: 190, fontWeight: 800, fontSize: 32, letterSpacing: '0.16em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.6)}}>
      <Sube t={t} en={a}>MI VEREDICTO</Sube>
    </div>
    {items.map(([txt, sub, tono, en], i) => {
      if (t < en) return null;
      const bueno = tono === 'bueno';
      const ap = aparece(t, en, 6);
      const fl = flota(t, i, 3);
      return (
        <div key={i} style={{position: 'absolute', left: x, top: 250 + i * 175 + fl.y, width: 480, height: 150, borderRadius: 24, background: PANEL, border: `2px solid ${bueno ? 'rgba(46,229,157,0.6)' : 'rgba(255,77,94,0.6)'}`,
          display: 'flex', alignItems: 'center', gap: 20, padding: '0 22px', boxSizing: 'border-box', scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot}deg`, opacity: ap.op, boxShadow: '0 14px 40px rgba(0,0,0,0.55)'}}>
          <Ico tam={76}><Insignia t={t} en={en + 3 * F} r={34} bien={bueno} /></Ico>
          <div style={{minWidth: 0}}>
            <div style={{fontWeight: 900, fontSize: cabe(txt, 340, 40, 0.6), whiteSpace: 'nowrap'}}>{txt}</div>
            <div style={{fontWeight: 600, fontSize: cabe(sub, 340, 27, 0.52), color: 'rgba(255,255,255,0.8)', marginTop: 4, whiteSpace: 'nowrap'}}>{sub}</div>
          </div>
        </div>
      );
    })}
  </Ventana>
);

// tarjeta con B-roll del MediaKit (cambia de clip al ritmo de la lista)
const TarjetaBroll: React.FC<{t: number; a: number; b: number; x: number; y: number; w: number; srcs: string[]; cambios: number[]; etiqueta: string}> = ({t, a, b, x, y, w, srcs, cambios, etiqueta}) => {
  const h = (w * 9) / 16;
  const ap = aparece(t, a, 5);
  const fl = flota(t, 2, 5);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <div style={{position: 'absolute', left: x, top: y + fl.y, width: w, height: h, borderRadius: 22, overflow: 'hidden', border: `3px solid ${C.amarillo}`,
        boxShadow: `0 18px 50px rgba(0,0,0,0.6), 0 0 26px rgba(${GLOW_AMARILLO},0.35)`, scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot}deg`}}>
        {srcs.map((s, k) => (
          <Sequence key={k} from={fr(cambios[k])} durationInFrames={Math.max(1, fr(k + 1 < cambios.length ? cambios[k + 1] : b) - fr(cambios[k]))} layout="none">
            <OffthreadVideo src={staticFile(s)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </Sequence>
        ))}
      </div>
      <div style={{position: 'absolute', left: x, top: y + h + 18 + fl.y, padding: '6px 16px', borderRadius: 8, background: LIMA, color: '#111', fontWeight: 900, fontSize: 24, letterSpacing: '0.06em'}}>{etiqueta}</div>
    </Ventana>
  );
};

// CTA en estilo subtítulo con la flecha en la misma línea
const Cta: React.FC<{t: number; a: number; b: number; ws: [string, number][]; flecha: number}> = ({t, a, b, ws, flecha}) =>
  t < a || t >= b ? null : (
    <>
      <div style={{position: 'absolute', left: 260, right: 260, top: 830, height: 220, opacity: iv(t, [a, a + 4 * F, b - 4 * F, b], [0, 1, 1, 0]),
        background: 'radial-gradient(ellipse 50% 46% at 50% 50%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 100%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', fontWeight: 700, fontSize: 58,
        textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
        {ws.map(([w, en], i) => <Sube key={i} t={t} en={en} style={i === ws.length - 1 ? amarillo : undefined}>{w}</Sube>)}
        <span style={{display: 'inline-block', marginLeft: 8, fontSize: 64, fontWeight: 900, ...amarillo, opacity: t < flecha ? 0 : 1,
          translate: `0px ${t < flecha ? 0 : Math.sin((t - flecha) * 7) * 6}px`, ...(t >= flecha ? golpe(t, flecha) : {})}}>↓</span>
      </div>
    </>
  );

// comentario de YouTube (en nuestro estilo) que se escribe solo
const Comentario: React.FC<{t: number; a: number; b: number; texto: string; escribe: number}> = ({t, a, b, texto, escribe}) => {
  const ap = aparece(t, a, 6);
  const fl = flota(t, 1.3, 5);
  const n = Math.floor(lim((t - escribe) / (texto.length * 0.05)) * texto.length);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <div style={{position: 'absolute', left: 1300, top: 250 + fl.y, width: 500, padding: '30px 32px', borderRadius: 28, background: PANEL, border: '2px solid rgba(255,255,255,0.14)',
        scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot}deg`, transformOrigin: '0% 0%', boxShadow: '0 18px 50px rgba(0,0,0,0.6)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14}}>
          <Ico tam={56}><Avatar t={t} en={a + 4 * F} r={26} id="avTu" /></Ico>
          <div style={{fontWeight: 800, fontSize: 28}}>@tú</div>
          <Ico tam={44} style={{marginLeft: 'auto'}}><Bocadillo t={t} en={a + 6 * F} r={19} escribe={t < escribe + texto.length * 0.05} /></Ico>
        </div>
        <div style={{fontWeight: 600, fontSize: 46, lineHeight: 1.25, minHeight: 116}}>
          {texto.slice(0, n)}<span style={{opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: C.amarillo}}>|</span>
        </div>
      </div>
    </Ventana>
  );
};


// espera de la generación: chip «generando…» con un arco que se dibuja y gira (arriba, encima de la ventana de la web)
const Generando: React.FC<{t: number; a: number; b: number; en: number}> = ({t, a, b, en}) => {
  if (t < a || t >= b) return null;
  const ap = aparece(t, en, -4);
  const sale = lim((t - (b - 0.25)) / 0.25);
  const u = t - en;
  const largo = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(u * 3.2));
  const puntos = '...'.slice(0, 1 + (Math.floor(u * 3) % 3));
  return (
    <div style={{position: 'absolute', left: 860, top: 118, opacity: ap.op * (1 - sale), scale: `${ap.sx} ${ap.sy}`, transformOrigin: '0% 50%'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '10px 26px 10px 14px', borderRadius: 999, background: 'rgba(14,14,18,0.92)',
        border: `2px solid ${LIMA}`, boxShadow: `0 0 20px rgba(209,254,23,0.35), 0 10px 30px rgba(0,0,0,0.6)`}}>
        <svg width={40} height={40} viewBox="-20 -20 40 40">
          <circle r={14} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
          <circle r={14} fill="none" stroke={LIMA} strokeWidth={5} strokeLinecap="round" pathLength={1}
            strokeDasharray={`${largo} 1`} transform={`rotate(${u * 300 - 90})`} />
        </svg>
        <span style={{fontWeight: 800, fontSize: 32, letterSpacing: '0.08em', minWidth: 230}}>GENERANDO{puntos}</span>
      </div>
    </div>
  );
};

const PANTALLA = ['broll', 'storyboard', 'valioso2', 'compara_a2v2', 'compara_b2', 'compara_c', 'capitulo', 'recap'];
const Grafico: React.FC<{t: number; g: Grafico}> = ({t, g}) => {
  const p = g as never;
  switch (g.tipo) {
    case 'lateral': return <Lateral {...(p as React.ComponentProps<typeof Lateral>)} t={t} />;
    case 'linea_clavado': return <LineaClavado {...(p as React.ComponentProps<typeof LineaClavado>)} t={t} />;
    case 'patrocinio': return <Patrocinio {...(p as React.ComponentProps<typeof Patrocinio>)} t={t} />;
    case 'broll': return <Broll {...(p as React.ComponentProps<typeof Broll>)} t={t} />;
    case 'duracion': return <Duracion {...(p as React.ComponentProps<typeof Duracion>)} t={t} />;
    case 'pecho': return <Pecho {...(p as React.ComponentProps<typeof Pecho>)} t={t} />;
    case 'plan3': return <Plan3 {...(p as React.ComponentProps<typeof Plan3>)} t={t} />;
    case 'planeado2': return <Planeado2 {...(p as React.ComponentProps<typeof Planeado2>)} t={t} />;
    case 'storyboard': return <Storyboard {...(p as React.ComponentProps<typeof Storyboard>)} t={t} />;
    case 'prompt_card': return <PromptCard {...(p as React.ComponentProps<typeof PromptCard>)} t={t} />;
    case 'aviso': return <Aviso {...(p as React.ComponentProps<typeof Aviso>)} t={t} />;
    case 'valioso2': return <Valioso2 {...(p as React.ComponentProps<typeof Valioso2>)} t={t} />;
    case 'nota': return <Nota {...(p as React.ComponentProps<typeof Nota>)} t={t} />;
    case 'compara_a2v2': return <ComparaA2v2 {...(p as React.ComponentProps<typeof ComparaA2v2>)} t={t} />;
    case 'clonado': return <Clonado {...(p as React.ComponentProps<typeof Clonado>)} t={t} />;
    case 'compara_b2': return <ComparaB2 {...(p as React.ComponentProps<typeof ComparaB2>)} t={t} />;
    case 'cliente': return <Cliente {...(p as React.ComponentProps<typeof Cliente>)} t={t} />;
    case 'compara_c': return <ComparaC {...(p as React.ComponentProps<typeof ComparaC>)} t={t} />;
    case 'capitulo': return <Capitulo {...(p as React.ComponentProps<typeof Capitulo>)} t={t} />;
    case 'fichas': return <Fichas {...(p as React.ComponentProps<typeof Fichas>)} t={t} />;
    case 'recap': return <Recap {...(p as React.ComponentProps<typeof Recap>)} t={t} />;
    case 'tres_modos': return <TresModos {...(p as React.ComponentProps<typeof TresModos>)} t={t} />;
    case 'abre_kling': return <AbreKling {...(p as React.ComponentProps<typeof AbreKling>)} t={t} />;
    case 'cta_bloques': return <CtaBloques {...(p as React.ComponentProps<typeof CtaBloques>)} t={t} />;
    case 'comentario': return <Comentario {...(p as React.ComponentProps<typeof Comentario>)} t={t} />;
    default: return null;
  }
};

export const Kling: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  // la transición del cliente está medida a 25 fps: se indexa por tiempo para que dure lo mismo
  const frame25 = Math.floor(t * 25 + 1e-6);
  const visibles = D.segs.filter((s) => t >= s.ini - 0.5 && t < s.ini + s.dur + 0.5);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <Transicion16 frame25={frame25} cortes={D.cortes}>
        <div style={camara(t)}>
          {visibles.filter((s) => s.tipo === 'base').map((s) => <Base key={s.ini} s={s} t={t} />)}
        </div>
        {visibles.filter((s) => s.tipo === 'resultado').map((s) => <Resultado key={s.ini} t={t} s={s} />)}
        {D.graficos.filter((g) => PANTALLA.includes(g.tipo)).map((g, i) => <Grafico key={`p${i}`} t={t} g={g} />)}
      </Transicion16>
      {D.graficos.filter((g) => !PANTALLA.includes(g.tipo)).map((g, i) => <Grafico key={`g${i}`} t={t} g={g} />)}
    </AbsoluteFill>
  );
};
