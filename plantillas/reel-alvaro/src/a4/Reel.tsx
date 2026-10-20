import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';

export const DURACION_A4 = 66.76;
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
  [0.5, 1.05, 1.2, 'suave'],
  [1.92, 1.13, 0.16, 'golpe'],
  [3.24, 1.04, 0.6, 'suave'],
  [4.48, 1.16, 0.16, 'golpe'],
  [5.72, 1.04, 0.8, 'suave'],
  [7.6, 1.0, 0.8, 'suave'],
  [15.64, 1.04, 2.0, 'suave'],
  [18.0, 1.08, 0.3, 'golpe'],
  [19.6, 1.16, 0.16, 'golpe'],
  [20.64, 1.05, 0.8, 'suave'],
  [21.88, 1.0, 0, 'corte'],
  [24.68, 1.02, 0, 'corte'],
  [24.75, 1.06, 1.3, 'suave'],
  [26.08, 1.13, 0.16, 'golpe'],
  [27.64, 1.04, 0.6, 'suave'],
  [28.52, 1.1, 0.2, 'golpe'],
  [29.44, 1.04, 0.6, 'suave'],
  [30.56, 1.1, 0.2, 'golpe'],
  [32.12, 1.04, 0.6, 'suave'],
  [33.0, 1.08, 2.4, 'suave'],
  [35.6, 1.04, 0.6, 'suave'],
  [39.4, 1.14, 0.16, 'golpe'],
  [40.16, 1.04, 0.8, 'suave'],
  [42.36, 1.12, 0.2, 'golpe'],
  [43.52, 1.04, 0.4, 'suave'],
  [43.68, 1.12, 0.16, 'golpe'],
  [44.52, 1.0, 0, 'corte'],
  [48.9, 1.0, 0, 'corte'],
  [48.95, 1.04, 1.0, 'suave'],
  [52.2, 1.0, 0, 'corte'],
  [52.25, 1.05, 1.0, 'suave'],
  [53.84, 1.1, 0.3, 'golpe'],
  [55.6, 1.0, 0, 'corte'],
  [58.08, 1.0, 0, 'corte'],
  [58.1, 1.04, 0.8, 'suave'],
  [60.0, 1.13, 0.2, 'golpe'],
  [61.0, 1.04, 0.8, 'suave'],
  [62.0, 1.07, 3.0, 'suave'],
  [65.12, 1.1, 0.5, 'suave'],
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
const IMPACTOS = [1.92, 4.48, 19.6, 39.4];
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
  {src: 'tecnica', a: 21.88, b: 24.68, desde: 1, foco: 0.55},
  {src: 'captacion', a: 44.52, b: 46.8, desde: 3, foco: 0.55},
  {src: 'entrega', a: 46.8, b: 48.9, desde: 1, foco: 0.5},
  {src: 'especialistas', a: 49.92, b: 52.2, desde: 4, foco: 0.5},
  {src: 'empresa', a: 55.6, b: 58.08, desde: 2, foco: 0.5},
];
const CORTES = Array.from(new Set(BROLL.flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

const Broll: React.FC<{t: number; b: B}> = ({t, b}) => {
  const ancho = b.vertical ? 1080 : ANCHO_BROLL;
  const left = Math.min(0, Math.max(1080 - ancho, 540 - b.foco * ancho));
  return (
    <Ventana t={t} a={b.a} b={b.b}>
      <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 45%', scale: iv(t, [b.a, b.b], [1.0, 1.07])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`a4/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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

// Nombres de herramientas que se van amontonando alrededor de Álvaro y luego saltan por los aires
type Chip = [string, number, number, number, number]; // texto, entra, x, y, giro
const CHIPS: Chip[] = [
  ['Claude', 8.32, 250, 300, -6],
  ['Claude Code', 8.88, 810, 260, 5],
  ['ChatGPT', 9.6, 230, 470, 4],
  ['herramientas', 11.56, 830, 430, -4],
  ['automatizaciones', 12.77, 330, 640, -3],
  ['asistentes de voz', 13.72, 770, 610, 4],
  ['chatbots', 14.84, 540, 200, -2],
];
const Pastillas: React.FC<{t: number; desde: number; fuera: number; retraso?: number}> = ({t, desde, fuera, retraso = 0}) => (
  <Ventana t={t} a={desde} b={fuera + 0.6}>
    {CHIPS.map(([txt, en0, x, y, giro], i) => {
      const en = retraso ? desde + i * retraso : en0;
      const p = iv(t, [en, en + 7 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
      const sale = iv(t, [fuera + i * 0.02, fuera + i * 0.02 + 0.45], [0, 1], Easing.bezier(0.55, 0, 1, 0.45));
      const ang = Math.atan2(y - 660, x - 540);
      const flota = Math.sin(t * 2 + i) * 6;
      return (
        <div key={txt} style={{position: 'absolute', left: x, top: y, translate: `calc(-50% + ${Math.cos(ang) * 900 * sale}px) calc(-50% + ${Math.sin(ang) * 900 * sale + flota}px)`,
          rotate: `${giro + sale * 90}deg`, scale: t < en ? 0 : p * (1 - 0.3 * sale), opacity: 1 - sale, filter: SOMBRA,
          background: 'rgba(255,255,255,0.95)', color: '#111', borderRadius: 999, padding: '16px 34px', ...H, fontSize: 50, textShadow: 'none', whiteSpace: 'nowrap'}}>
          {txt}
        </div>
      );
    })}
  </Ventana>
);

// Las dos partes de una agencia: captar clientes (imán) y entregar el servicio (caja). Se encienden, se tachan y se conectan.
const ICONO_CAPTAR = 'M3 7v6a9 9 0 0 0 18 0V7h-5v6a4 4 0 0 1-8 0V7H3zm0-5v4h5V2H3zm13 0v4h5V2h-5z';
const ICONO_ENTREGAR = 'M12 2 3 6.5v11L12 22l9-4.5v-11L12 2zm0 2.2 6.3 3.1L12 10.5 5.7 7.3 12 4.2zM5 9l6 3v7.6l-6-3V9zm8 10.6V12l6-3v7.6l-6 3z';
const DosPartes: React.FC<{t: number}> = ({t}) => {
  const icono = (cx: number, d: string, en: number, tachado: [number, number][]) => {
    const pop = iv(t, [en, en + 7 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
    const on = t >= en;
    const tach = tachado.find(([a, b]) => t >= a && t < b);
    const tr = tach ? iv(t, [tach[0], tach[0] + 6 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1)) : 0;
    const apagado = !!tach;
    return (
      <g transform={`translate(${cx} 110) scale(${on ? 0.7 + 0.3 * pop : 0.7})`} opacity={on ? (apagado ? 0.45 : 1) : 0.5}>
        <circle r={95} fill={on && !apagado ? C.amarillo : 'rgba(0,0,0,0.5)'} stroke={on ? C.amarillo : 'rgba(255,255,255,0.7)'} strokeWidth={6}
          style={{filter: on && !apagado ? `drop-shadow(0 0 18px rgba(${GLOW_AMARILLO},1))` : 'none'}} />
        <g transform="translate(-50 -50) scale(4.17)"><path d={d} fill={on && !apagado ? '#111' : '#fff'} /></g>
        {tach && <path d="M -70 -70 L 70 70 M 70 -70 L -70 70" stroke="#ff3b55" strokeWidth={16} strokeLinecap="round" strokeDasharray={200} strokeDashoffset={200 * (1 - tr)} />}
      </g>
    );
  };
  const enlace = iv(t, [41.92, 41.92 + 10 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
  return (
    <Ventana t={t} a={26.08} b={43.48}>
      <svg style={{position: 'absolute', left: 0, top: 230, overflow: 'visible', filter: SOMBRA}} width={1080} height={220}>
        <line x1={420} y1={110} x2={420 + 240 * enlace} y2={110} stroke={C.amarillo} strokeWidth={10} strokeLinecap="round" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />
        {icono(330, ICONO_CAPTAR, 28.52, [[32.12, 35.6]])}
        {icono(750, ICONO_ENTREGAR, 30.56, [[35.6, 40.16]])}
      </svg>
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
  {a: 0.28, b: 3.2, top: 70, lineas: [{ws: [['aprender', 0.28], ['a', 0.68], ['construir', 0.76], ['el', 1.32], ['mejor', 1.52]], size: 72}, {ws: [['agente de ia', 1.92, amarillo]], size: 130, golpe: true}, {ws: [['del', 2.6], ['mundo', 2.84]], size: 84, abajo: true}]},
  // Sin un solo cliente
  {a: 3.24, b: 5.68, top: 1000, lineas: [{ws: [['y', 3.24], ['seguir', 3.48], ['sin', 3.92], ['tener', 4.2]], size: 80}, {ws: [['un solo cliente', 4.48, rosaFuerte]], size: 120, golpe: true}]},
  // La gran pregunta
  {a: 18.64, b: 20.6, top: 980, lineas: [{ws: [['¿ahora', 18.64], ['quién', 19.12]], size: 90}, {ws: [['me compra', 19.44]], size: 120, golpe: true}, {ws: [['esto?', 20.04, amarillo]], size: 150, golpe: true}]},
  // La parte técnica (B-roll)
  {a: 23.36, b: 24.65, top: 260, lineas: [{ws: [['con', 23.36], ['la', 23.52], ['parte', 23.68]], size: 90}, {ws: [['técnica', 24.0, amarillo]], size: 150, golpe: true}]},
  // Dos cosas
  {a: 26.08, b: 27.6, top: 1000, lineas: [{ws: [['dos cosas', 26.08, amarillo]], size: 150, golpe: true}, {ws: [['para', 26.72], ['funcionar', 27.0]], size: 90}]},
  {a: 27.64, b: 29.4, top: 1000, lineas: [{ws: [['la', 27.64], ['primera', 27.84], ['es', 28.36]], size: 80}, {ws: [['captar', 28.52]], size: 130, golpe: true}, {ws: [['clientes', 28.88, amarillo]], size: 130, golpe: true}]},
  {a: 29.44, b: 32.08, top: 1000, lineas: [{ws: [['y', 29.44], ['la', 29.6], ['segunda', 29.72], ['es', 30.32]], size: 80}, {ws: [['entregar bien', 30.56, amarillo]], size: 120, golpe: true}, {ws: [['el', 31.28], ['servicio', 31.4]], size: 90}]},
  // Negocio sostenible
  {a: 38.2, b: 40.12, top: 1000, lineas: [{ws: [['tampoco', 38.2], ['tienes', 38.6]], size: 80}, {ws: [['un', 38.92], ['negocio', 39.04]], size: 90}, {ws: [['sostenible', 39.4, rosaFuerte]], size: 140, golpe: true}]},
  // Las dos partes
  {a: 41.12, b: 43.48, top: 1000, lineas: [{ws: [['un', 41.12], ['sistema', 41.36], ['que', 41.76], ['conecte', 41.92]], size: 80}, {ws: [['las dos partes', 42.36, amarillo]], size: 120, golpe: true}]},
  // ClientesOnline
  {a: 43.52, b: 44.48, top: 1000, lineas: [{ws: [['en', 43.52]], size: 80}, {ws: [['ClientesOnline', 43.68, amarillo]], size: 120, golpe: true}]},
  // Conseguir clientes de forma constante
  {a: 58.88, b: 60.96, top: 1000, lineas: [{ws: [['conseguir', 58.88], ['clientes', 59.4]], size: 90}, {ws: [['de', 59.88], ['forma', 60.0]], size: 80}, {ws: [['constante', 60.32, amarillo]], size: 150, golpe: true}]},
];
// Tramo de las herramientas: las pastillas con los nombres son el texto grande (sin subtítulos encima)
const LISTA: [number, number] = [7.6, 15.62];
const CTA = 65.12;
const SALIDA = 6 * F;
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
const tapado = (x: number) => x >= CTA - 0.01 || GRANDES.some((g) => x >= g.a - 0.01 && x < g.b) || (x >= LISTA[0] - 0.01 && x < LISTA[1]);

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
const CLAVE = new Set(['nadie', 'problema', 'técnica', 'entregar', 'vender', 'comprarte', 'captación', 'especialistas', 'herramientas', 'empresa', 'vender']);

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
            <Sube key={`${bl.a}-${i}`} t={t} en={a} style={CLAVE.has(limpiar(w)) ? amarillo : undefined}>
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
const DETRAS: [number, number][] = [[0, 3.48]];

export const ReelA4: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A4)} layout="none">
            <Video src={staticFile('a4/a4.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a4/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Pastillas t={t} desde={8.32} fuera={18.0} />
      <Pastillas t={t} desde={53.84} fuera={55.6} retraso={0.1} />
      <DosPartes t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Rafaga t={t} en={4.48} x={540} y={1150} color={C.rosa} />
      <Rafaga t={t} en={20.04} x={540} y={1250} />
      <Rafaga t={t} en={43.68} x={540} y={1100} />

      {/* Tramo de herramientas: "aprendes sobre / aprendes a conectar / aprendes" arriba, en pequeño (el resto son las pastillas) */}
      {([[7.6, 10.62, [['aprendes', 7.6], ['sobre', 8.04]]], [10.68, 12.3, [['aprendes', 10.68], ['a', 11.12], ['conectar', 11.2]]], [12.32, 15.62, [['aprendes', 12.32]]]] as [number, number, [string, number][]][]).map(([a, b, ws]) => (
        <Ventana key={a} t={t} a={a} b={b}>
          <div style={{position: 'absolute', left: 100, right: 100, top: 1180, display: 'flex', justifyContent: 'center', gap: '0.24em', ...H, fontSize: 80, filter: SOMBRA}}>
            {ws.map(([w, en]) => <Sube key={w + en} t={t} en={en} sale={b - 0.2}>{w}</Sube>)}
          </div>
        </Ventana>
      ))}

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={DURACION_A4}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={65.12}>haz</Sube>
          <Sube t={t} en={65.44}>clic</Sube>
          <Sube t={t} en={65.76} style={amarillo}>aquí</Sube>
          <Sube t={t} en={66.04} style={amarillo}>debajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 66.2 ? 0 : 1, translate: `0px ${Math.abs(Math.sin((t - 66.2) * 7)) * 18}px`}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 65.12, 65.44, 65.76, 66.04, 7.6, 8.04, 10.68, 11.12, 11.2, 12.32].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.92, -3], ['thud', 4.48, -3],
        ['popup', 8.32, -5], ['popup', 8.88, -5], ['popup', 9.6, -5], ['popup', 11.56, -5], ['popup', 12.77, -5], ['popup', 13.72, -5], ['popup', 14.84, -5],
        ['riser', 18.0, -4], ['whoosh', 18.0, -2], ['boom', 19.6, -3], ['pop', 24.0, -3], ['pop', 26.08, -3], ['ding', 28.52, -5], ['ding', 30.56, -5],
        ['snap', 32.12, -4], ['snap', 35.6, -4], ['thud', 39.4, -3], ['twinkle', 41.92, -6], ['pop', 42.36, -3], ['hit', 43.68, -3],
        ['popup', 53.84, -6], ['popup', 54.04, -6], ['popup', 54.24, -6], ['whoosh', 55.6, -3], ['pop', 60.32, -3],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
