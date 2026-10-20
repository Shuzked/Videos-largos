import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from './transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, Impacto, flechaV, Estilo} from '../variantes';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'mascara', golpe: 'muelle', impacto: 'rayos', sub: 'mascara', flecha: 'bote'};

export const DURACION_A1 = 68.08;
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
  [0.5, 1.05, 0.9, 'suave'],
  [1.44, 1.12, 0.16, 'golpe'],
  [3.12, 1.04, 0.6, 'suave'],
  [6.68, 1.1, 0.6, 'suave'],
  [8.52, 1.0, 0, 'corte'],
  [8.6, 1.05, 2.0, 'suave'],
  [17.84, 1.0, 0, 'corte'],
  [18.0, 1.05, 2.0, 'suave'],
  [20.28, 1.14, 0.16, 'golpe'],
  [22.44, 1.0, 0, 'corte'],
  [24.72, 1.06, 0, 'corte'],
  [25.12, 1.14, 0.16, 'golpe'],
  [32.68, 1.02, 0, 'corte'],
  [32.9, 1.1, 1.4, 'suave'],
  [36.8, 1.18, 0.16, 'golpe'],
  [37.72, 1.04, 0.7, 'suave'],
  [42.08, 1.0, 0, 'corte'],
  [42.2, 1.05, 2.4, 'suave'],
  [46.72, 1.13, 0.16, 'golpe'],
  [49.4, 1.03, 0.7, 'suave'],
  [56.4, 1.0, 0, 'corte'],
  [56.5, 1.05, 1.0, 'suave'],
  [59.24, 1.08, 0.3, 'golpe'],
  [60.36, 1.11, 0.3, 'golpe'],
  [61.0, 1.14, 0.3, 'golpe'],
  [63.64, 1.04, 0.7, 'suave'],
  [66.44, 1.1, 0.5, 'suave'],
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
const IMPACTOS = [1.44, 3.76, 7.8, 36.8];
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
type B = {src: string; a: number; b: number; etiqueta?: React.ReactNode; desde?: number; foco: number};
const BROLL: B[] = [
  {src: 'estudies', a: 10.6, b: 11.44, etiqueta: 'estudia', desde: 2, foco: 0.42},
  {src: 'notas', a: 11.44, b: 12.6, etiqueta: <>saca buenas<br />notas</>, desde: 3, foco: 0.58},
  {src: 'trabajo', a: 12.6, b: 14.2, etiqueta: <>trabajo<br />estable</>, desde: 2, foco: 0.4},
  {src: 'sueldo', a: 14.2, b: 15.56, etiqueta: <>cobra tu<br />sueldo</>, desde: 3, foco: 0.62},
  {src: 'finde', a: 15.56, b: 17.84, etiqueta: <>espera al<br /><span style={amarillo}>finde</span></>, desde: 2, foco: 0.5},
  {src: 'empresariales', a: 22.44, b: 24.72, etiqueta: 'empresariales', desde: 2, foco: 0.8},
  {src: 'dejar', a: 26.12, b: 27.8, etiqueta: <>dejar la<br />universidad</>, desde: 2, foco: 0.58},
  {src: 'agencia', a: 27.8, b: 30.68, etiqueta: <>mi propia<br /><span style={amarillo}>agencia</span></>, desde: 2, foco: 0.45},
  {src: 'reunion', a: 30.68, b: 32.68, etiqueta: '10 negocios', desde: 2, foco: 0.35},
  {src: 'clientes', a: 40.12, b: 42.08, etiqueta: <><span style={amarillo}>3</span> clientes</>, desde: 1, foco: 0.5},
  {src: 'ia', a: 52.64, b: 56.4, etiqueta: <>inteligencia<br /><span style={amarillo}>artificial</span></>, desde: 2, foco: 0.6},
];
const CORTES = Array.from(new Set([8.52, 42.08, 56.4, ...BROLL.flatMap((b) => [b.a, b.b])])).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

// Encuadre automático (scripts/encuadre.py): pista de foco que sigue al sujeto de cada clip
const PISTAS = ENCUADRE as unknown as Record<string, [number, number][]>;
const focoEn = (b: B, t: number) => {
  const p = PISTAS[b.src];
  if (!p) return b.foco;
  const x = Math.max(0, t - b.a) * 5;
  const i = Math.min(p.length - 1, Math.floor(x));
  const j = Math.min(p.length - 1, i + 1);
  return p[i][1] + (p[j][1] - p[i][1]) * (x - i);
};
const Broll: React.FC<{t: number; b: B}> = ({t, b}) => {
  const left = Math.min(0, Math.max(1080 - ANCHO_BROLL, 540 - focoEn(b, t) * ANCHO_BROLL));
  return (
    <Ventana t={t} a={b.a} b={b.b}>
      <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 45%', scale: iv(t, [b.a, b.b], [1.0, 1.07])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`a1/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ANCHO_BROLL, height: 1920}} />
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

// Subrayado a mano que se dibuja bajo un titular
const Subrayado: React.FC<{t: number; en: number; top: number; ancho: number; color?: string}> = ({t, en, top, ancho, color = C.amarillo}) => {
  const p = iv(t, [en, en + 9 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
  const largo = ancho * 1.15;
  return (
    <svg style={{position: 'absolute', left: 540 - ancho / 2, top, overflow: 'visible', opacity: t < en ? 0 : 1}} width={ancho} height={40}>
      <path
        d={`M 4 26 C ${ancho * 0.3} 8, ${ancho * 0.65} 34, ${ancho - 4} 12`}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={largo}
        strokeDashoffset={largo * (1 - p)}
        style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},0.8))`}}
      />
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

// "El plan de siempre": camino de 5 nodos que se va completando durante el montaje
const Camino: React.FC<{t: number}> = ({t}) => {
  const pasos = BROLL.slice(0, 5);
  const x0 = 170;
  const x1 = 910;
  const top = 1560;
  return (
    <Ventana suave t={t} a={pasos[0].a} b={pasos[4].b}>
      <svg style={{position: 'absolute', left: 0, top: top - 40, overflow: 'visible'}} width={1080} height={80}>
        <line x1={x0} y1={40} x2={x1} y2={40} stroke="rgba(255,255,255,0.25)" strokeWidth={5} strokeLinecap="round" />
        {pasos.map((p, i) => {
          const xa = x0 + ((x1 - x0) * i) / 4;
          const xb = x0 + ((x1 - x0) * (i + 1)) / 4;
          const lin = i < 4 ? iv(t, [pasos[i + 1].a - 6 * F, pasos[i + 1].a], [0, 1], Easing.bezier(0.65, 0, 0.35, 1)) : 0;
          const on = t >= p.a;
          const actual = on && t < p.b;
          const pop = iv(t, [p.a, p.a + 6 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          return (
            <g key={p.src}>
              {i < 4 && <line x1={xa} y1={40} x2={xa + (xb - xa) * lin} y2={40} stroke={C.amarillo} strokeWidth={5} strokeLinecap="round" />}
              <circle
                cx={xa} cy={40} r={on ? 13 + 5 * pop * (actual ? 1 : 0.4) : 10}
                fill={on ? C.amarillo : '#111'} stroke={on ? C.amarillo : 'rgba(255,255,255,0.6)'} strokeWidth={4}
                style={{filter: actual ? `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},1))` : 'none'}}
              />
            </g>
          );
        })}
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
  {a: 1.44, b: 1.68, top: 260, lineas: [{ws: [['miedo', 1.44, rosaFuerte]], size: 260, golpe: true}]},
  {a: 3.12, b: 4.15, top: 130, lineas: [{ws: [['y', 3.12], ['no', 3.32], ['era', 3.52]], size: 80}, {ws: [['fracasar', 3.76]], size: 180, golpe: true}]},
  {a: 7.0, b: 8.3, top: 130, lineas: [{ws: [['que', 7.0], ['yo', 7.2], ['no', 7.4], ['había', 7.56]], size: 80}, {ws: [['elegido', 7.8, amarillo]], size: 180, golpe: true}]},
  // Montaje "el plan de siempre" (B-roll): alterna grande / subtítulo
  {a: 10.6, b: 11.2, top: 280, lineas: [{ws: [['que', 10.6], ['estudies', 10.76]], size: 130}]},
  {a: 11.28, b: 12.4, top: 260, lineas: [{ws: [['que', 11.28], ['saques', 11.44]], size: 120}, {ws: [['buenas', 11.72], ['notas', 12.08, amarillo]], size: 120}]},
  {a: 12.48, b: 14.1, top: 260, lineas: [{ws: [['que', 12.48], ['encuentres', 12.6]], size: 110}, {ws: [['un', 13.08], ['trabajo', 13.24], ['estable', 13.6, amarillo]], size: 110}]},
  {a: 14.2, b: 15.48, top: 260, lineas: [{ws: [['que', 14.2], ['cobres', 14.36]], size: 120}, {ws: [['tu', 14.8], ['sueldo', 15.0, amarillo]], size: 120}]},
  {a: 15.56, b: 17.6, top: 260, lineas: [{ws: [['y', 15.56], ['que', 15.8], ['esperes', 15.92]], size: 110}, {ws: [['al', 16.48], ['fin', 16.68], ['de', 16.88]], size: 110}, {ws: [['semana', 17.0, amarillo]], size: 140, golpe: true}]},
  {a: 22.0, b: 23.45, top: 260, lineas: [{ws: [['yo', 22.0], ['estaba', 22.16], ['estudiando', 22.44]], size: 80}, {ws: [['empresariales', 22.84]], size: 120, golpe: true}]},
  // 21 años
  {a: 24.76, b: 25.9, top: 1000, lineas: [{ws: [['tenía', 24.76]], size: 80}, {ws: [['21', 25.12, amarillo]], size: 300, golpe: true}, {ws: [['años', 25.6]], size: 80}]},
  // Los diez me dijeron que NO (con el marcador encima)
  {a: 32.48, b: 34.3, top: 1000, lineas: [{ws: [['y', 32.48], ['los', 32.68], ['diez', 33.0]], size: 80}, {ws: [['me', 33.44], ['dijeron', 33.6], ['que', 34.0]], size: 80}, {ws: [['no', 34.08, rosaFuerte]], size: 230, golpe: true}]},
  // Pero seguí
  {a: 36.4, b: 37.55, top: 300, lineas: [{ws: [['pero', 36.4], ['seguí', 36.8, amarillo]], size: 170}]},
  // 3 clientes (B-roll)
  {a: 39.52, b: 41.85, top: 1150, lineas: [{ws: [['conseguí', 39.52], ['mis', 39.92], ['primeros', 40.12]], size: 80}, {ws: [['3', 40.64, amarillo], ['clientes', 41.2]], size: 140}]},
  // Otras maneras
  {a: 46.0, b: 47.4, top: 1000, lineas: [{ws: [['que', 46.0], ['existían', 46.16]], size: 80}, {ws: [['otras', 46.72]], size: 130, golpe: true}, {ws: [['maneras', 47.08, amarillo]], size: 130, golpe: true}]},
  // Inteligencia artificial (B-roll)
  {a: 53.84, b: 56.2, top: 230, lineas: [
    {ws: [['a', 53.84], ['implementar', 54.0]], size: 80},
    {ws: [['inteligencia', 54.72]], size: 120, golpe: true},
    {ws: [['artificial', 55.52, amarillo]], size: 120, golpe: true},
  ]},
];
// La lista "captar clientes / vender / entregar soluciones que aporten valor" también cuenta como texto grande
const LISTA: [number, number] = [59.24, 63.5];
const CTA = 66.44;
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes en la misma zona: si la siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr.slice(i + 1).find((m) => Math.abs(m.top - g.top) < 300);
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, n.a - SALIDA - 0.02);
});
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
const CLAVE = new Set(['servicios', 'profesional', 'valor', 'malo', 'oportunidades']);

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
const DETRAS: [number, number][] = [[1.36, 1.96], [3.0, 4.45], [6.88, 8.52]];

// "Error" rojo en "miedo": la imagen se tiñe de rojo de golpe con glitch y vuelve en ~8 fotogramas
const MIEDO_T = 1.44;
const ROJO: Record<number, number> = {0: 0.85, 1: 0.75, 2: 0.15, 3: 0.6, 4: 0.35, 5: 0.15, 6: 0.06};
const ErrorRojo: React.FC<{frame: number}> = ({frame}) => {
  const o = ROJO[frame - Math.round(MIEDO_T * FPS)];
  if (!o) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: '#ff1020', mixBlendMode: 'multiply', opacity: o}} />
      <AbsoluteFill style={{background: '#ff2030', mixBlendMode: 'screen', opacity: o * 0.35}} />
    </AbsoluteFill>
  );
};

export const ReelA1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 3);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={[...CORTES, MIEDO_T]}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A1)} layout="none">
            <Video src={staticFile('a1/a1.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a1/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Impacto estilo={ESTILO.impacto} t={t} en={3.76} x={540} y={330} color={C.rosa} />
      <Camino t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(3).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={25.12} x={540} y={1250} radio={200} />
      <Impacto estilo={ESTILO.impacto} t={t} en={36.8} x={540} y={385} />
      <Marcador t={t} n={10} a={33.0} paso={0.1} color="#ff3b55" tipo="x" top={300} desde={32.48} hasta={34.3} />
      <Marcador t={t} n={3} a={39.52} paso={0.2} color="#3ddc84" tipo="v" top={260} desde={38.72} hasta={40.12} />

      {/* Lista: captar clientes / vender / entregar soluciones que aporten valor */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 900, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12}}>
          {([['captar clientes', 59.24], ['vender', 60.36], ['entregar\nsoluciones', 61.0]] as [string, number][]).map(([txt, en]) => {
            const tr = iv(t, [en, en + 7 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
            return (
              <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 22, ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>
                <svg width={70} height={70} viewBox="0 0 70 70" style={{overflow: 'visible'}}>
                  <circle cx={35} cy={35} r={31} fill="none" stroke={C.amarillo} strokeWidth={5} strokeDasharray={195} strokeDashoffset={195 * (1 - tr)} />
                  <path d="M 21 37 L 31 47 L 50 25" stroke={C.amarillo} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={50} strokeDashoffset={50 * (1 - iv(t, [en + 4 * F, en + 10 * F], [0, 1]))} />
                </svg>
                <span style={{...H, fontSize: 72, lineHeight: 1.0, whiteSpace: 'pre'}}>{txt}</span>
              </div>
            );
          })}
          </div>
          <div style={{display: 'flex', gap: '0.24em', ...H, fontSize: 66, marginTop: 8}}>
            <Entra estilo={ESTILO.texto} t={t} en={62.16} sale={LISTA[1]}>que</Entra>
            <Entra estilo={ESTILO.texto} t={t} en={62.36} sale={LISTA[1]}>aporten</Entra>
            <Entra estilo={ESTILO.texto} t={t} en={62.96} sale={LISTA[1]} style={amarillo}>valor</Entra>
          </div>
        </div>
      </Ventana>

      <Subtitulos t={t} />
      <ErrorRojo frame={frame} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={DURACION_A1}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={66.44}>haz</Sube>
          <Sube t={t} en={66.76}>clic</Sube>
          <Sube t={t} en={66.96} style={amarillo}>aquí</Sube>
          <Sube t={t} en={67.16} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 67.3 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 67.3)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 66.44, 66.76, 66.96, 67.16].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.44], ['switch', 1.44, -4], ['boom', 3.76, -6], ['pop', 3.76, -2], ['pop', 6.68, -2], ['pop', 10.6, -4], ['pop', 11.44, -4], ['pop', 12.6, -4], ['pop', 14.2, -4], ['twinkle', 17.0, -6],
        ['hit', 20.76, -2], ['pop', 22.84, -3], ['boom', 25.12, -4], ['pop', 26.76, -3], ['pop', 29.4, -3], ['pop', 31.64, -3], ['riser', 33.0, -2], ['thud', 34.08, -3],
        ['riserm', 36.8, -2], ['hit', 36.8], ['ding', 39.52, -3], ['pop', 40.64, -3], ['pop', 46.72], ['pop', 47.08, -3], ['pop', 54.72, -3], ['pop', 55.52, -3],
        ['pop', 57.6], ['click', 59.24], ['click', 60.36], ['click', 61.0], ['twinkle', 62.96, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
