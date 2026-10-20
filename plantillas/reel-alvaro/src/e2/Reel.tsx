import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

export const DURACION_E2 = 70.12;
const FPS = 25;
const fr = (s: number) => Math.round(s * FPS);
// stem "sfx": se renderiza sin la voz del vídeo (la voz y la música se mezclan y masterizan aparte)
const STEM = (getInputProps() as {stem?: string}).stem;

// ---------------- Cámara: tracking de la cara + zooms con curva ----------------
const PTS = CARA as [number, number, number][];
const cara = (t: number): [number, number] => {
  const x = Math.min(PTS.length - 1, Math.max(0, t * 10));
  const i = Math.floor(x);
  const j = Math.min(PTS.length - 1, i + 1);
  const k = x - i;
  return [PTS[i][1] + (PTS[j][1] - PTS[i][1]) * k, PTS[i][2] + (PTS[j][2] - PTS[i][2]) * k];
};
const SUAVE = Easing.bezier(0.65, 0, 0.35, 1);
const GOLPE = Easing.bezier(0.16, 1, 0.3, 1);
// Encuadre base algo más cerrado que el plano original, para que haya margen de seguimiento
const BASE = 1.12;
// Dónde se mantiene la cara en el encuadre (tercio superior, centrada)
const OBJ_X = 540;
const OBJ_Y = 660;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.03, 0.45, 'golpe'],
  [0.5, 1.05, 0.5, 'suave'],
  [1.04, 1.14, 0.16, 'golpe'],
  [1.84, 1.04, 0.8, 'suave'],
  [3.52, 1.1, 0.3, 'golpe'],
  [4.68, 1.04, 0.6, 'suave'],
  [5.96, 1.1, 0.2, 'golpe'],
  [6.24, 1.03, 0.8, 'suave'],
  [7.0, 1.08, 2.5, 'suave'],
  [9.6, 1.0, 0, 'corte'],
  [14.8, 1.0, 0, 'corte'],
  [14.85, 1.05, 0.7, 'suave'],
  [15.56, 1.12, 0.2, 'golpe'],
  [16.4, 1.04, 2.5, 'suave'],
  [19.76, 1.08, 0.3, 'golpe'],
  [20.76, 1.13, 0.2, 'golpe'],
  [21.6, 1.04, 1.5, 'suave'],
  [23.24, 1.09, 0.3, 'golpe'],
  [24.0, 1.04, 2.0, 'suave'],
  [26.32, 1.08, 0.4, 'golpe'],
  [27.4, 1.0, 0, 'corte'],
  [32.56, 1.0, 0, 'corte'],
  [32.6, 1.05, 1.5, 'suave'],
  [35.0, 1.14, 0.16, 'golpe'],
  [36.0, 1.04, 0.8, 'suave'],
  [37.36, 1.07, 3.0, 'suave'],
  [41.56, 1.13, 0.2, 'golpe'],
  [43.24, 1.04, 0.8, 'suave'],
  [45.56, 1.07, 0.3, 'golpe'],
  [46.92, 1.1, 0.3, 'golpe'],
  [48.96, 1.13, 0.3, 'golpe'],
  [51.92, 1.04, 0.8, 'suave'],
  [55.64, 1.12, 0.2, 'golpe'],
  [56.44, 1.18, 0.16, 'golpe'],
  [57.44, 1.04, 0.8, 'suave'],
  [61.48, 1.2, 0.16, 'golpe'],
  [62.57, 1.05, 0.6, 'suave'],
  [64.0, 1.08, 3.0, 'suave'],
  [68.76, 1.15, 0.2, 'golpe'],
];
const escala = (t: number) => {
  let v = 1;
  for (const [a, s, d, c] of ZOOM) {
    if (t < a) break;
    if (c === 'corte' || d === 0 || t >= a + d) v = s;
    else v = v + (s - v) * (c === 'golpe' ? GOLPE : SUAVE)((t - a) / d);
  }
  return v;
};
// Temblor corto en los impactos fuertes
const IMPACTOS = [1.04, 56.44, 61.48, 68.76];
const SACUDIDA: [number, number][] = [[12, -8], [-9, 6], [5, -3], [-2, 1]];
const camara = (t: number) => {
  const s = BASE * escala(t);
  const [fx, fy] = cara(t);
  let tx = OBJ_X - fx * s;
  let ty = OBJ_Y - fy * s;
  for (const a of IMPACTOS) {
    const k = Math.floor((t - a) * FPS);
    if (k >= 0 && k < SACUDIDA.length) {
      tx += SACUDIDA[k][0];
      ty += SACUDIDA[k][1];
    }
  }
  tx = Math.min(0, Math.max(1080 * (1 - s), tx));
  ty = Math.min(0, Math.max(1920 * (1 - s), ty));
  return {position: 'absolute' as const, inset: 0, transformOrigin: '0 0', scale: s, translate: `${tx}px ${ty}px`};
};

// ---------------- B-roll a pantalla completa, encuadrado en su sujeto ----------------
// foco = posición horizontal (0-1) de lo importante dentro del plano 16:9
type B = {src: string; a: number; b: number; etiqueta?: React.ReactNode; desde?: number; foco: number; vertical?: boolean};
const BROLL: B[] = [
  {src: 'ordenadores', a: 9.6, b: 10.36, desde: 1, foco: 0.5},
  {src: 'codigo', a: 10.36, b: 10.88, desde: 1, foco: 0.5, vertical: true},
  {src: 'matematicas', a: 10.88, b: 12.12, desde: 2, foco: 0.5},
  {src: 'estudiando', a: 12.12, b: 14.8, desde: 1, foco: 0.5},
  {src: 'peluqueria', a: 27.4, b: 32.56, desde: 1, foco: 0.5},
];
const CORTES = Array.from(new Set(BROLL.flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

// Encuadre automático (scripts/encuadre.py): pista de foco que sigue al sujeto de cada clip
const PISTAS = ENCUADRE as unknown as Record<string, [number, number][]>;
const focoEn = (b: B, t: number) => {
  const p = PISTAS[b.src];
  if (!p || b.vertical) return b.foco;
  const x = Math.max(0, t - b.a) * 5;
  const i = Math.min(p.length - 1, Math.floor(x));
  const j = Math.min(p.length - 1, i + 1);
  return p[i][1] + (p[j][1] - p[i][1]) * (x - i);
};
const Broll: React.FC<{t: number; b: B}> = ({t, b}) => {
  const ancho = b.vertical ? 1080 : ANCHO_BROLL;
  const left = Math.min(0, Math.max(1080 - ancho, 540 - focoEn(b, t) * ancho));
  return (
    <Ventana t={t} a={b.a} b={b.b}>
      <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 45%', scale: iv(t, [b.a, b.b], [1.0, 1.07])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`e2/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie ----------------
// Ráfaga de rayos que salen del centro en un impacto
const Rafaga: React.FC<{t: number; en: number; x: number; y: number; color?: string; radio?: number}> = ({t, en, x, y, color = C.amarillo, radio = 260}) => {
  const p = iv(t, [en, en + 12 * F], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
  if (t < en || p >= 1) return null;
  return (
    <svg style={{position: 'absolute', left: x - radio * 1.6, top: y - radio * 1.6, overflow: 'visible'}} width={radio * 3.2} height={radio * 3.2}>
      {Array.from({length: 12}, (_, i) => {
        const ang = (i / 12) * Math.PI * 2 + 0.13;
        const r1 = radio * (0.55 + 0.75 * p);
        const r2 = radio * (0.75 + 0.85 * p);
        const c = radio * 1.6;
        return (
          <line
            key={i}
            x1={c + Math.cos(ang) * r1}
            y1={c + Math.sin(ang) * r1}
            x2={c + Math.cos(ang) * r2}
            y2={c + Math.sin(ang) * r2}
            stroke={color}
            strokeWidth={10 * (1 - p) + 1}
            strokeLinecap="round"
            opacity={1 - p * 0.9}
            style={{filter: `drop-shadow(0 0 10px ${color})`}}
          />
        );
      })}
    </svg>
  );
};

// Círculos que se dibujan y se marcan con ✕ o ✓ trazados
const Marcador: React.FC<{t: number; n: number; a: number; paso: number; color: string; tipo: 'x' | 'v'; top: number; desde: number; hasta: number}> = ({
  t, n, a, paso, color, tipo, top, desde, hasta,
}) => {
  const d = n > 5 ? 82 : 130;
  return (
    <Ventana t={t} a={desde} b={hasta}>
      <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', gap: 12, opacity: iv(t, [hasta - 5 * F, hasta], [1, 0])}}>
        {Array.from({length: n}, (_, i) => {
          const dib = iv(t, [desde + i * 0.04, desde + i * 0.04 + 8 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
          const en = a + i * paso;
          const m = iv(t, [en, en + 6 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          const tr = iv(t, [en + 2 * F, en + 8 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
          const per = Math.PI * (d - 8);
          return (
            <svg key={i} width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{overflow: 'visible', scale: t >= en ? 0.7 + 0.3 * m : 1}}>
              <circle
                cx={d / 2} cy={d / 2} r={d / 2 - 4} fill={t >= en ? color : 'rgba(0,0,0,0.25)'} fillOpacity={t >= en ? 0.9 : 1}
                stroke={t >= en ? color : 'rgba(255,255,255,0.7)'} strokeWidth={4} strokeDasharray={per} strokeDashoffset={per * (1 - dib)}
                style={{filter: t >= en ? `drop-shadow(0 0 14px ${color})` : 'none'}}
              />
              {t >= en &&
                (tipo === 'x' ? (
                  <path d={`M ${d * 0.32} ${d * 0.32} L ${d * 0.68} ${d * 0.68} M ${d * 0.68} ${d * 0.32} L ${d * 0.32} ${d * 0.68}`} stroke="#fff" strokeWidth={d * 0.09} strokeLinecap="round" fill="none" strokeDasharray={d} strokeDashoffset={d * (1 - tr)} />
                ) : (
                  <path d={`M ${d * 0.28} ${d * 0.52} L ${d * 0.44} ${d * 0.68} L ${d * 0.72} ${d * 0.34}`} stroke="#fff" strokeWidth={d * 0.09} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={d} strokeDashoffset={d * (1 - tr)} />
                ))}
            </svg>
          );
        })}
      </div>
    </Ventana>
  );
};

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// DESARROLLAR IA frente a VENDER SOLUCIONES DE IA (lo pide el guion): dos tarjetas; la primera se tacha
const Comparacion: React.FC<{t: number}> = ({t}) => {
  const tarjeta = (x: number, txt: React.ReactNode, en: number, icono: string, tachado?: number) => {
    const p = iv(t, [en, en + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
    const tr = tachado ? iv(t, [tachado, tachado + 7 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1)) : 0;
    const on = t >= en && tr < 1;
    return (
      <div style={{position: 'absolute', left: x, top: 200, width: 410, height: 340, borderRadius: 40, scale: 0.6 + 0.4 * p, opacity: t < en ? 0 : 1 - 0.45 * tr,
        background: on && !tachado ? 'rgba(255,214,10,0.16)' : 'rgba(10,10,14,0.72)', border: `4px solid ${on && !tachado ? C.amarillo : 'rgba(255,255,255,0.35)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, filter: SOMBRA,
        boxShadow: on && !tachado ? `0 0 40px rgba(${GLOW_AMARILLO},0.45)` : 'none'}}>
        <svg width={110} height={110} viewBox="0 0 24 24"><path fill={on && !tachado ? C.amarillo : '#fff'} d={icono} /></svg>
        <div style={{...H, fontSize: 58, lineHeight: 1.0, textAlign: 'center', color: '#fff'}}>{txt}</div>
        {tachado && (
          <svg style={{position: 'absolute', inset: 0}} width={410} height={340}>
            <path d="M 40 40 L 370 300 M 370 40 L 40 300" stroke="#ff3b55" strokeWidth={14} strokeLinecap="round" strokeDasharray={420} strokeDashoffset={420 * (1 - tr)} />
          </svg>
        )}
      </div>
    );
  };
  return (
    <Ventana t={t} a={15.56} b={26.3}>
      {tarjeta(90, <>desarrollar<br />ia</>, 15.56, 'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z', 22.68)}
      {tarjeta(580, <>vender<br /><span style={amarillo}>soluciones</span><br />de ia</>, 20.76, 'M12 2 1 7l11 5 9-4.1V17h2V7L12 2zM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8z')}
      <div style={{position: 'absolute', left: 480, top: 330, width: 120, textAlign: 'center', ...H, fontSize: 50, opacity: iv(t, [20.76, 21.0], [0, 1])}}>vs</div>
    </Ventana>
  );
};

// Mensajes de clientes sin responder: pila de notificaciones tipo móvil (icono de chat, avatar, líneas de mensaje)
// que entran desde arriba y empujan a las anteriores hacia atrás, con contador de no leídos
const AVATARES = ['#f4a261', '#8ecae6', '#e76f51', '#90be6d', '#cdb4db'];
const Burbujas: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  const N = 5;
  const llegadas = Array.from({length: N}, (_, k) => a + 0.1 + k * 0.62);
  const visibles = llegadas.filter((en) => t >= en).length;
  const salida = iv(t, [b - 0.3, b], [0, 1], Easing.bezier(0.55, 0, 1, 0.45));
  return (
    <Ventana t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 110, right: 110, top: 190, height: 460, opacity: 1 - salida, filter: SOMBRA}}>
        {llegadas.map((en, k) => {
          if (t < en) return null;
          const p = iv(t, [en, en + 9 * F], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
          const fondo = visibles - 1 - k; // 0 = la más nueva (delante)
          const y = (1 - p) * -160 + fondo * 46;
          const esc = 1 - fondo * 0.05;
          return (
            <div key={k} style={{position: 'absolute', left: 0, right: 0, top: 0, translate: `0px ${y}px`, scale: esc, opacity: p * (fondo > 3 ? 0 : 1 - fondo * 0.18), zIndex: 10 - fondo,
              height: 190, borderRadius: 40, background: 'rgba(250,250,252,0.95)', boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', gap: 24, padding: '0 30px'}}>
              <div style={{position: 'relative', width: 116, height: 116, flexShrink: 0}}>
                <div style={{width: 116, height: 116, borderRadius: '50%', background: AVATARES[k % AVATARES.length], display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden'}}>
                  <svg width={90} height={90} viewBox="0 0 24 24"><path fill="rgba(255,255,255,0.9)" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-9 2.2-9 5v3h18v-3c0-2.8-4.6-5-9-5z" /></svg>
                </div>
                <div style={{position: 'absolute', right: -6, bottom: -6, width: 50, height: 50, borderRadius: 15, background: '#25d366', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width={30} height={30} viewBox="0 0 24 24"><path fill="#fff" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z" /></svg>
                </div>
              </div>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 14}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                  <div style={{height: 26, width: 190 + (k % 3) * 50, borderRadius: 13, background: '#2b2d31'}} />
                  <div style={{marginLeft: 'auto', height: 20, width: 80, borderRadius: 10, background: '#b9bcc4'}} />
                </div>
                <div style={{height: 20, width: `${90 - (k % 3) * 14}%`, borderRadius: 10, background: '#9a9ea8'}} />
                <div style={{height: 20, width: `${60 - (k % 2) * 16}%`, borderRadius: 10, background: '#c3c6cd'}} />
              </div>
            </div>
          );
        })}
        {visibles > 0 && (
          <div style={{position: 'absolute', right: -26, top: -30, zIndex: 20, minWidth: 82, height: 82, padding: '0 18px', borderRadius: 41, background: '#ff3b30', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...H, fontSize: 46, textShadow: 'none', boxShadow: '0 8px 24px rgba(255,59,48,0.5)',
            scale: iv(t, [llegadas[visibles - 1], llegadas[visibles - 1] + 5 * F], [1.35, 1], Easing.bezier(0.34, 1.56, 0.64, 1))}}>
            {visibles * 3 - 1}
          </div>
        )}
      </div>
    </Ventana>
  );
};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => s.toLowerCase().replace(/[.,]/g, '');

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra con máscara.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
const PEQ = 70; // tamaño de las líneas de apoyo
const rosaFuerte: React.CSSProperties = {...rosa, textShadow: glow('255,177,191', 1.3)};
// Solo frases CORTAS en grande (2-4 palabras, enteras), alternando con frases en subtítulo
const GRANDES: Grande[] = [
  // HOOK (detrás de Álvaro)
  {a: 0.04, b: 1.6, top: 60, lineas: [{ws: [['no', 0.04], ['necesitas', 0.2], ['saber', 0.8]], size: 80}, {ws: [['programar', 1.04, rosaFuerte]], size: 160, golpe: true}]},
  // Montaje: ordenadores, código, matemáticas, personas estudiando (todo en grande)
  {a: 9.6, b: 10.34, top: 260, lineas: [{ws: [['ordenadores', 9.6, amarillo]], size: 130, golpe: true}]},
  {a: 10.36, b: 10.86, top: 260, lineas: [{ws: [['código', 10.36, amarillo]], size: 150, golpe: true}]},
  {a: 10.88, b: 12.1, top: 260, lineas: [{ws: [['matemáticas', 10.88, amarillo]], size: 130, golpe: true}]},
  {a: 11.96, b: 14.78, top: 260, lineas: [{ws: [['y', 11.96], ['personas', 12.12], ['que', 12.56], ['llevan', 12.68]], size: 80}, {ws: [['años', 13.04, amarillo]], size: 150, golpe: true}, {ws: [['estudiando', 13.56], ['tecnología', 14.04]], size: 80}]},
  // Peluquería (B-roll)
  {a: 27.4, b: 28.15, top: 1150, lineas: [{ws: [['una peluquería', 27.4, amarillo]], size: 120, golpe: true}]},
  // Automatizar
  {a: 34.2, b: 35.7, top: 1000, lineas: [{ws: [['pueden', 34.2], ['ayudar', 34.56], ['a', 34.92]], size: 80}, {ws: [['automatizar', 35.0, amarillo]], size: 150, golpe: true}]},
  // Una solución que funcione
  {a: 40.96, b: 43.2, top: 1000, lineas: [{ws: [['quiere', 40.96]], size: 80}, {ws: [['una solución', 41.32, amarillo]], size: 130, golpe: true}, {ws: [['que', 42.2], ['funcione', 42.48]], size: 90}]},
  // Oferta
  {a: 55.2, b: 56.3, top: 1000, lineas: [{ws: [['un', 55.2], ['curso', 55.36]], size: 90}, {ws: [['introductorio', 55.64, amarillo]], size: 130, golpe: true}]},
  {a: 56.32, b: 57.42, top: 980, lineas: [{ws: [['de', 56.32]], size: 80}, {ws: [['14', 56.44, amarillo]], size: 280, golpe: true}, {ws: [['clases', 57.04]], size: 100}]},
  {a: 59.88, b: 62.5, top: 960, lineas: [{ws: [['puedes', 59.88], ['acceder', 60.24]], size: 80}, {ws: [['por', 60.8], ['solo', 61.08]], size: 80}, {ws: [['1 €', 61.48, amarillo]], size: 300, golpe: true}]},
  // Cierre: vuelve al hook
  {a: 67.28, b: 70.1, top: 1000, lineas: [{ws: [['incluso', 67.28], ['si', 68.12], ['ahora', 68.28], ['mismo', 68.48]], size: 80}, {ws: [['no sabes programar', 68.76, rosaFuerte]], size: 110, golpe: true}]},
];
// La lista "entender qué necesita / ofrecerle el servicio adecuado / asegurarte de que se entrega correctamente" también cuenta como texto grande
const LISTA: [number, number] = [45.56, 51.9];
const CTA = 62.57;
const CTA_FIN = 63.9; // tras "haz clic en el botón" sigue en subtítulos
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes en la misma zona: si la siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr.slice(i + 1).find((m) => Math.abs(m.top - g.top) < 300);
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, n.a - SALIDA - 0.02);
});
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
const tapado = (x: number) => (x >= CTA - 0.01 && x < CTA_FIN) || GRANDES.some((g) => x >= g.a - 0.01 && x < g.b) || (x >= LISTA[0] - 0.01 && x < LISTA[1]);

// Subtítulos: solo las palabras que no están en grande, en bloques de hasta 4 que nunca se cruzan con un titular
// Subtítulos: solo las palabras que no están en grande. Primero se separa por frases (punto, coma, interrogación,
// pausa o titular) y cada frase se reparte en bloques equilibrados de 2-4 palabras que caben en UNA línea.
const MAX_CAR = 22;
const textoBloque = (ws: W[]) => ws.map((x) => limpiar(x[0])).join(' ').length;
const repartir = (f: W[]): W[][] => {
  // programación dinámica: menos bloques, sin bloques de 1 palabra si se puede, y largos parecidos
  const n = f.length;
  const coste: number[] = Array(n + 1).fill(Infinity);
  const corte: number[] = Array(n + 1).fill(0);
  coste[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - 4); i < j; i++) {
      const trozo = f.slice(i, j);
      if (trozo.length > 1 && textoBloque(trozo) > MAX_CAR) continue;
      const c = coste[i] + 1 + (trozo.length === 1 && n > 1 ? 10 : 0) + Math.abs(textoBloque(trozo) - 14) / 20;
      if (c < coste[j]) [coste[j], corte[j]] = [c, i];
    }
  }
  const out: W[][] = [];
  for (let j = n; j > 0; j = corte[j]) out.unshift(f.slice(corte[j], j));
  return out;
};
export const BLOQUES: {a: number; b: number; ws: W[]}[] = (() => {
  const frases: W[][] = [];
  let cur: W[] = [];
  WS.forEach((w, i) => {
    if (tapado(w[1])) {
      if (cur.length) frases.push(cur);
      cur = [];
      return;
    }
    cur.push(w);
    const sig = WS[i + 1];
    if (w[3] || /[,?]$/.test(w[0]) || !sig || sig[1] - w[2] > 0.3 || tapado(sig[1])) {
      frases.push(cur);
      cur = [];
    }
  });
  const out: {a: number; b: number; ws: W[]}[] = [];
  frases.flatMap(repartir).forEach((ws) => {
    const ult = ws[ws.length - 1];
    const sig = WS[WS.indexOf(ult) + 1];
    let finB = sig ? Math.min(sig[1], ult[2] + 0.8) : ult[2] + 0.6;
    // si lo siguiente es texto grande, el subtítulo se va antes de que entre
    if (sig && tapado(sig[1])) finB = Math.min(finB, sig[1] - 0.02);
    out.push({a: ws[0][1], b: finB, ws});
  });
  // nunca empezar mientras sale un titular
  return out.map((bq) => {
    const g = GRANDES.find((x) => bq.a >= x.b && bq.a < x.b + SALIDA);
    return g ? {...bq, a: g.b + SALIDA} : bq;
  }).filter((bq) => bq.b > bq.a + 0.1); // un bloque que se queda sin tiempo no se muestra (ni suena)
})();
const PALABRAS_VISIBLES = BLOQUES.flatMap((bq) => bq.ws.map((w) => w[1]));
const CLAVE = new Set(['artificial', 'desarrollar', 'empresa', 'existentes', 'negocio', 'mensajes', 'ocupado', 'programa', 'agencia', 'cero']);

// Sombra difusa detrás de los subtítulos para que se lean sobre cualquier fondo
const FondoSub: React.FC<{opacidad: number}> = ({opacidad}) => (
  <div
    style={{
      position: 'absolute', left: -80, right: -80, top: 1300, height: 300, opacity: opacidad,
      background: 'radial-gradient(ellipse 52% 48% at 50% 50%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
    }}
  />
);

const Subtitulos: React.FC<{t: number}> = ({t}) => {
  const hay = (x: number) => BLOQUES.some((bq) => x >= bq.a && x < bq.b);
  const op = Math.max(...[-4, -2, 0, 2, 4].map((d) => (hay(t + d * F) ? 1 - Math.abs(d) / 6 : 0)));
  const bl = BLOQUES.find((x) => t >= x.a && t < x.b);
  return (
    <>
      {op > 0 && <FondoSub opacidad={op} />}
      {bl && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: 70, fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          {bl.ws.map(([w, a], i) => (
            <Sube key={`${bl.a}-${i}`} t={t} en={a} style={enIA(a) ? estiloIA : CLAVE.has(limpiar(w)) ? amarillo : undefined}>
              {limpiar(w)}
            </Sube>
          ))}
        </div>
      )}
    </>
  );
};

// Frase grande: palabras que entran al ritmo de la voz; la palabra clave entra de golpe
// parte "arriba" = líneas normales; "abajo" = líneas marcadas abajo (van delante, en la zona inferior)
// Legibilidad: las líneas de apoyo nunca bajan de 80 px; si no caben, se parten en dos líneas (no se encogen)
const ANCHO = 880; // ancho útil: ~100 px de margen a cada lado
const FACTOR = 0.68; // ancho medio de un carácter de Montserrat en mayúsculas, en "em"
const MINIMO = 72; // las líneas de apoyo nunca bajan de aquí
const largoTxt = (ws: Pal[]) => ws.map((w) => w[0]).join(' ').length;
const cabe = (ws: Pal[], tam: number) => largoTxt(ws) * FACTOR * tam <= ANCHO;
// Las líneas de titular (>=100 px o de golpe) se quedan enteras; las de apoyo, si no caben a MINIMO, se parten una vez en dos
const partir = (l: Linea): Linea[] => {
  if (l.golpe || l.size >= 100 || l.ws.length < 2) return [l];
  const tam = Math.max(l.size, MINIMO);
  if (cabe(l.ws, MINIMO)) return [{...l, size: tam}];
  let mejor = 1, peor = Infinity;
  for (let i = 1; i < l.ws.length; i++) {
    const largo = Math.max(largoTxt(l.ws.slice(0, i)), largoTxt(l.ws.slice(i)));
    if (largo < peor) [peor, mejor] = [largo, i];
  }
  return [{...l, size: tam, ws: l.ws.slice(0, mejor)}, {...l, size: tam, ws: l.ws.slice(mejor)}];
};
// Velo oscuro suave detrás del texto grande + sombra, para que se lea sobre cualquier fondo
const VELO = 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0) 100%)';
const SOMBRA = 'drop-shadow(0 3px 8px rgba(0,0,0,0.75)) drop-shadow(0 0 2px rgba(0,0,0,0.5))';
const FraseGrande: React.FC<{t: number; g: Grande; parte?: 'arriba' | 'abajo'}> = ({t, g, parte = 'arriba'}) =>
  // sin líneas en esta parte no se pinta nada (ni el velo)
  !g.lineas.some((l) => (parte === 'abajo') === !!l.abajo) ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: (parte === 'abajo' ? 1180 : g.top) - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo).flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = Math.min(l.size, ANCHO / (Math.max(1, chars) * FACTOR));
          return (
            <div key={li} style={{display: 'flex', justifyContent: 'center', gap: '0.24em', fontSize: tam, lineHeight: 1.02, whiteSpace: 'nowrap'}}>
              {l.golpe ? (
                <span style={{display: 'inline-block', ...golpe(t, l.ws[0][1], g.b), ...l.ws[0][2]}}>{l.ws.map((w) => w[0]).join(' ')}</span>
              ) : (
                l.ws.map(([w, en, st], wi) => (
                  <Sube key={wi} t={t} en={en} sale={g.b} style={st}>
                    {w}
                  </Sube>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  </Ventana>
);

// Tramos con letras detrás de la persona: solo mientras hay titular detrás
const DETRAS: [number, number][] = [[0, 1.88]];

export const ReelE2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E2)} layout="none">
            <Video src={staticFile('e2/e2.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e2/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}
      <Comparacion t={t} />
      <Burbujas t={t} a={28.68} b={32.56} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Rafaga t={t} en={1.04} x={540} y={330} color={C.rosa} />
      <Rafaga t={t} en={56.44} x={540} y={1180} radio={220} />
      <Rafaga t={t} en={61.48} x={540} y={1250} radio={240} />

      {/* Lista: qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 860, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
            {([['entender\nqué necesita', 45.56], ['ofrecerle el\nservicio adecuado', 46.92], ['asegurarte de que se\nentrega correctamente', 48.96]] as [string, number][]).map(([txt, en], i) => {
              const tr = iv(t, [en, en + 7 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
              return (
                <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 24, ...golpe(t, en, LISTA[1])}}>
                  <svg width={84} height={84} viewBox="0 0 84 84" style={{overflow: 'visible', flexShrink: 0}}>
                    <circle cx={42} cy={42} r={37} fill={tr >= 1 ? C.amarillo : 'none'} stroke={C.amarillo} strokeWidth={6} strokeDasharray={233} strokeDashoffset={233 * (1 - tr)} />
                    <text x={42} y={58} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={44} fill={tr >= 1 ? '#111' : C.amarillo}>{i + 1}</text>
                  </svg>
                  <span style={{...H, fontSize: 56, lineHeight: 1.0, whiteSpace: 'pre'}}>{txt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Ventana>

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={62.57}>haz</Sube>
          <Sube t={t} en={62.84}>clic</Sube>
          <Sube t={t} en={63.04}>en</Sube>
          <Sube t={t} en={63.16}>el</Sube>
          <Sube t={t} en={63.32} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 63.45 ? 0 : 1, translate: `0px ${Math.abs(Math.sin((t - 63.45) * 7)) * 18}px`}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 62.57, 62.84, 63.04, 63.16, 63.32].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.04, -3], ['pop', 9.6, -3], ['pop', 10.36, -3], ['pop', 10.88, -3], ['pop', 13.04, -3],
        ['popup', 15.56, -4], ['popup', 20.76, -4], ['snap', 22.68, -4], ['popup', 28.78, -7], ['popup', 29.4, -7], ['popup', 30.02, -7], ['popup', 30.64, -7], ['popup', 31.26, -7],
        ['pop', 35.0, -3], ['ding', 41.56, -5], ['click', 45.56], ['click', 46.92], ['click', 48.96], ['pop', 55.64, -3], ['boom', 56.44, -3],
        ['riser', 61.48, -3], ['boom', 61.48, -2], ['twinkle', 61.7, -6], ['thud', 68.76, -3],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
