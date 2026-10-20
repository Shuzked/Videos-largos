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

import {Entra, golpeV, Impacto, flechaV, Estilo} from '../variantes';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'espaciado', golpe: 'tinta', impacto: 'halo', sub: 'espaciado', flecha: 'vibra'};

export const DURACION_E4 = 75.44;
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
  [1.76, 1.12, 0.2, 'golpe'],
  [2.64, 1.04, 0.6, 'suave'],
  [4.08, 1.06, 1.0, 'suave'],
  [5.28, 1.15, 0.16, 'golpe'],
  [6.2, 1.04, 1.0, 'suave'],
  [7.72, 1.06, 2.0, 'suave'],
  [9.92, 1.0, 0, 'corte'],
  [13.56, 1.0, 0, 'corte'],
  [13.6, 1.05, 1.2, 'suave'],
  [14.88, 1.0, 0, 'corte'],
  [16.92, 1.0, 0, 'corte'],
  [16.96, 1.06, 0.6, 'suave'],
  [17.68, 1.14, 0.16, 'golpe'],
  [18.16, 1.04, 0.8, 'suave'],
  [20.6, 1.1, 0.2, 'golpe'],
  [21.04, 1.13, 0.2, 'golpe'],
  [21.84, 1.04, 0.8, 'suave'],
  [23.0, 1.07, 3.0, 'suave'],
  [26.88, 1.16, 0.16, 'golpe'],
  [27.2, 1.04, 0.8, 'suave'],
  [29.52, 1.07, 0.3, 'golpe'],
  [32.16, 1.1, 0.3, 'golpe'],
  [33.96, 1.13, 0.3, 'golpe'],
  [35.56, 1.04, 0.8, 'suave'],
  [36.5, 1.08, 3.0, 'suave'],
  [39.56, 1.04, 0.8, 'suave'],
  [42.8, 1.12, 0.2, 'golpe'],
  [43.6, 1.04, 0.8, 'suave'],
  [46.32, 1.07, 2.5, 'suave'],
  [49.52, 1.13, 0.2, 'golpe'],
  [50.32, 1.04, 0.8, 'suave'],
  [52.8, 1.1, 0.3, 'golpe'],
  [53.6, 1.04, 0.8, 'suave'],
  [55.72, 1.18, 0.16, 'golpe'],
  [56.7, 1.04, 0.8, 'suave'],
  [61.56, 1.2, 0.16, 'golpe'],
  [62.56, 1.04, 0.8, 'suave'],
  [63.5, 1.07, 4.0, 'suave'],
  [68.36, 1.12, 0.2, 'golpe'],
  [69.0, 1.04, 0.8, 'suave'],
  [70.48, 1.08, 0.5, 'suave'],
  [71.7, 1.05, 3.7, 'suave'],
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
const IMPACTOS = [5.28, 26.88, 55.72, 61.56];
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
  {src: 'videos', a: 9.92, b: 10.68, desde: 2, foco: 0.5},
  {src: 'formaciones', a: 10.68, b: 12.04, desde: 1, foco: 0.5},
  {src: 'herramientas', a: 12.04, b: 13.56, desde: 2, foco: 0.5},
  {src: 'cliente', a: 14.88, b: 16.92, desde: 6, foco: 0.5},
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
            <Video src={staticFile(`e4/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
    <Ventana suave t={t} a={desde} b={hasta}>
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

// Iconos de la lista-ruta: entender (lupa), ofrecer (megáfono), entregar (paquete)
const ICONOS_RUTA = [
  'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z',
  'M18 11v2h4v-2h-4zm-2 6.6c1 .7 2.2 1.6 3.2 2.4l.8-1.1c-1-.8-2.2-1.7-3.2-2.4l-.8 1.1zM20 4.4l-.8-1.1c-1 .7-2.2 1.6-3.2 2.4l.8 1.1c1-.8 2.2-1.7 3.2-2.4zM4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.3-.6-2.5-1.5-3.4v6.7c.9-.8 1.5-2 1.5-3.3z',
  'M20 7l-8-4-8 4v10l8 4 8-4V7zm-8-1.8L17.5 8 12 10.8 6.5 8 12 5.2zM6 9.6l5 2.5v6.6l-5-2.5V9.6zm7 9.1v-6.6l5-2.5v6.6l-5 2.5z',
];
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
  {a: 0.08, b: 2.62, top: 60, lineas: [{ws: [['voy', 0.08], ['a', 0.28], ['decir', 0.36], ['algo', 0.64], ['que', 0.92]], size: 72}, {ws: [['probablemente', 1.04]], size: 84}, {ws: [['no debería decirte', 1.64, rosaFuerte]], size: 110, golpe: true}]},
  // Comprar otro curso no significa...
  {a: 4.08, b: 7.7, top: 980, lineas: [{ws: [['comprar', 4.08], ['otro', 4.6], ['curso', 4.88]], size: 90}, {ws: [['no significa', 5.28, amarillo]], size: 130, golpe: true}, {ws: [['que', 6.2], ['vayas', 6.32], ['a', 6.72], ['montar', 6.76]], size: 80}, {ws: [['un', 7.16], ['negocio', 7.28]], size: 80}]},
  // Montaje: viendo vídeos, comprando formaciones, aprendiendo herramientas nuevas (todo en grande)
  {a: 9.92, b: 10.66, top: 260, lineas: [{ws: [['viendo', 9.92]], size: 100}, {ws: [['vídeos', 10.28, amarillo]], size: 150, golpe: true}]},
  {a: 10.68, b: 12.0, top: 260, lineas: [{ws: [['comprando', 10.68]], size: 100}, {ws: [['formaciones', 11.24, amarillo]], size: 140, golpe: true}]},
  {a: 11.92, b: 13.54, top: 260, lineas: [{ws: [['y', 11.92], ['aprendiendo', 12.04]], size: 100}, {ws: [['herramientas', 12.64, amarillo]], size: 130, golpe: true}, {ws: [['nuevas', 13.2]], size: 100}]},
  // Un posible cliente (B-roll)
  {a: 14.88, b: 16.9, top: 1150, lineas: [{ws: [['ponerse', 14.88], ['delante', 15.36], ['de', 15.68]], size: 80}, {ws: [['un posible cliente', 15.76, amarillo]], size: 110, golpe: true}]},
  {a: 16.96, b: 18.1, top: 1000, lineas: [{ws: [['no', 16.96], ['sabe', 17.32]], size: 90}, {ws: [['qué hacer', 17.68, rosaFuerte]], size: 150, golpe: true}]},
  // Consumir información / dispuesta a pagar
  {a: 20.6, b: 21.82, top: 1000, lineas: [{ws: [['consumir', 20.6]], size: 120, golpe: true}, {ws: [['información', 21.04, rosaFuerte]], size: 130, golpe: true}]},
  {a: 24.12, b: 27.15, top: 980, lineas: [{ws: [['por', 24.12], ['el', 24.32], ['que', 24.48], ['otra', 24.56], ['persona', 24.8]], size: 72}, {ws: [['está', 25.48], ['dispuesta', 25.96], ['a', 26.72]], size: 80}, {ws: [['pagar', 26.88, amarillo]], size: 190, golpe: true}]},
  // Habilidades
  {a: 42.8, b: 45.0, top: 1000, lineas: [{ws: [['habilidades', 42.8, amarillo]], size: 130, golpe: true}, {ws: [['comerciales', 43.36], ['y', 44.2], ['técnicas', 44.4]], size: 80}]},
  // Formación introductoria / tengas claro
  {a: 48.88, b: 50.3, top: 1000, lineas: [{ws: [['una', 48.88], ['formación', 49.04]], size: 90}, {ws: [['introductoria', 49.52, amarillo]], size: 130, golpe: true}]},
  {a: 52.8, b: 55.45, top: 1000, lineas: [{ws: [['tengas claro', 52.8, amarillo]], size: 120, golpe: true}, {ws: [['en', 53.68], ['qué', 53.96], ['consiste', 54.16]], size: 80}, {ws: [['este', 54.8], ['negocio', 55.0]], size: 80}]},
  // Oferta
  {a: 55.52, b: 56.65, top: 980, lineas: [{ws: [['son', 55.52]], size: 80}, {ws: [['14', 55.72, amarillo]], size: 280, golpe: true}, {ws: [['clases', 56.16]], size: 100}]},
  {a: 60.16, b: 62.55, top: 960, lineas: [{ws: [['puedes', 60.16], ['acceder', 60.52]], size: 80}, {ws: [['por', 60.92], ['solo', 61.16]], size: 80}, {ws: [['1 €', 61.56, amarillo]], size: 300, golpe: true}]},
  {a: 67.44, b: 69.95, top: 1000, lineas: [{ws: [['reservar', 67.44], ['una', 68.04]], size: 80}, {ws: [['consultoría', 68.36, amarillo]], size: 120, golpe: true}, {ws: [['gratuita', 69.0, amarillo]], size: 120, golpe: true}]},
];
// La lista "entender qué automatizaciones necesitan los negocios / cómo puedes ofrecerlas / cómo organizar su entrega" también cuenta como texto grande
const LISTA: [number, number] = [29.52, 35.5];
const CTA = 70.48;
const CTA_FIN = 71.66; // tras "haz clic en el botón" sigue en subtítulos
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
const CLAVE = new Set(['curso', 'años', 'empresa', 'problema', 'experto', 'modelo', 'mentoría', 'acompañamiento', 'contenido', 'contigo']);

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
                <span style={{display: 'inline-block', ...golpeV(ESTILO.golpe, t, l.ws[0][1], g.b), ...l.ws[0][2]}}>{l.ws.map((w) => w[0]).join(' ')}</span>
              ) : (
                l.ws.map(([w, en, st], wi) => (
                  <Entra estilo={ESTILO.texto} key={wi} t={t} en={en} sale={g.b} style={st}>
                    {w}
                  </Entra>
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
const DETRAS: [number, number][] = [[0, 2.9]];

export const ReelE4: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E4)} layout="none">
            <Video src={staticFile('e4/e4.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e4/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={5.28} x={540} y={1180} />
      <Impacto estilo={ESTILO.impacto} t={t} en={26.88} x={540} y={1260} radio={220} />
      <Impacto estilo={ESTILO.impacto} t={t} en={61.56} x={540} y={1250} radio={240} />

      {/* Lista en forma de ruta vertical: un trazo que se dibuja de hito en hito (entender → ofrecer → entregar) */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 800, height: 560, background: VELO}} />
        <div style={{position: 'absolute', left: 110, width: 860, top: 860, height: 440, filter: SOMBRA}}>
          {(() => {
            const ITEMS: [string, number, number, number][] = [['entender qué\nautomatizaciones\nnecesitan los negocios', 29.52, 0, 162], ['cómo puedes\nofrecerlas', 32.16, 200, 108], ['cómo organizar\nsu entrega', 33.96, 346, 108]];
            const cy = ITEMS.map(([, , top, h]) => top + h / 2);
            const baja = iv(t, [ITEMS[1][1] - 9 * F, ITEMS[1][1], ITEMS[2][1] - 9 * F, ITEMS[2][1]], [cy[0], cy[1], cy[1], cy[2]], Easing.bezier(0.45, 0, 0.25, 1));
            return (
              <>
                <svg width={92} height={440} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                  <line x1={46} y1={cy[0]} x2={46} y2={cy[2]} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeDasharray="2 14" strokeLinecap="round" />
                  <line x1={46} y1={cy[0]} x2={46} y2={baja} stroke={C.amarillo} strokeWidth={8} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />
                  {baja > cy[0] + 1 && baja < cy[2] - 1 && Math.abs(baja - cy[1]) > 1 && <circle cx={46} cy={baja} r={12} fill="#fff" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />}
                </svg>
                {ITEMS.map(([txt, en, top, h], i) => {
                  const pop = iv(t, [en, en + 10 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
                  const onda = iv(t, [en, en + 14 * F], [0, 1]);
                  const tx = iv(t, [en + 2 * F, en + 11 * F], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
                  if (t < en) return null;
                  return (
                    <React.Fragment key={txt}>
                      <svg width={92} height={92} viewBox="-46 -46 92 92" style={{position: 'absolute', left: 0, top: cy[i] - 46, overflow: 'visible'}}>
                        {onda < 1 && <circle r={44 + onda * 50} fill="none" stroke={C.amarillo} strokeWidth={5} opacity={1 - onda} />}
                        <g transform={`scale(${pop}) rotate(${(1 - pop) * -50})`}>
                          <circle r={44} fill={C.amarillo} style={{filter: `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},1))`}} />
                          <g transform="translate(-24 -24) scale(2)"><path d={ICONOS_RUTA[i]} fill="#111" /></g>
                        </g>
                      </svg>
                      <div style={{position: 'absolute', left: 124, top, height: h, display: 'flex', alignItems: 'center', ...H, fontSize: 54, lineHeight: 1.0, whiteSpace: 'pre',
                        clipPath: `inset(0 ${(1 - tx) * 100}% 0 0)`, translate: `${(1 - tx) * -30}px 0px`}}>{txt}</div>
                    </React.Fragment>
                  );
                })}
              </>
            );
          })()}
        </div>
      </Ventana>

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={70.48}>haz</Sube>
          <Sube t={t} en={70.72}>clic</Sube>
          <Sube t={t} en={70.96}>en</Sube>
          <Sube t={t} en={71.04}>el</Sube>
          <Sube t={t} en={71.16} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 71.3 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 71.3)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="slide2" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 70.48, 70.72, 70.96, 71.04, 71.16].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['thud', 1.64, -4], ['tings', 29.52, -8], ['tings', 32.16, -8], ['tings', 33.96, -8], ['boom', 5.28, -3], ['pop', 10.28, -4], ['pop', 11.24, -4], ['pop', 12.64, -4], ['pop', 15.76, -4], ['thud', 17.68, -4],
        ['pop', 20.6, -4], ['pop', 21.04, -4], ['boom', 26.88, -4], ['click', 29.52], ['click', 32.16], ['click', 33.96], ['pop', 42.8, -4], ['pop', 49.52, -4],
        ['ding', 52.8, -6], ['boom', 55.72, -3], ['riser', 61.56, -3], ['boom', 61.56, -2], ['twinkle', 61.8, -6], ['pop', 68.36, -4],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
