import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, Impacto, flechaV, Estilo} from '../variantes';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'estela', golpe: 'neon', impacto: 'estrella', sub: 'estela', flecha: 'elastica'};

export const DURACION_E5 = 67.12;
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
  [0.5, 1.05, 1.6, 'suave'],
  [2.76, 1.12, 0.2, 'golpe'],
  [3.4, 1.04, 0.6, 'suave'],
  [4.4, 1.16, 0.16, 'golpe'],
  [5.3, 1.04, 0.8, 'suave'],
  [6.0, 1.08, 2.5, 'suave'],
  [9.04, 1.04, 1.0, 'suave'],
  [10.44, 1.07, 1.5, 'suave'],
  [12.4, 1.15, 0.16, 'golpe'],
  [13.1, 1.04, 0.8, 'suave'],
  [14.4, 1.08, 1.8, 'suave'],
  [16.2, 1.0, 0, 'corte'],
  [24.46, 1.0, 0, 'corte'],
  [24.48, 1.05, 0.6, 'suave'],
  [25.32, 1.16, 0.16, 'golpe'],
  [26.3, 1.04, 0.8, 'suave'],
  [27.0, 1.07, 3.0, 'suave'],
  [30.44, 1.04, 0.8, 'suave'],
  [31.5, 1.08, 3.5, 'suave'],
  [35.5, 1.04, 1.0, 'suave'],
  [36.5, 1.08, 3.4, 'suave'],
  [40.64, 1.05, 0.5, 'suave'],
  [41.24, 1.13, 0.2, 'golpe'],
  [42.0, 1.04, 0.8, 'suave'],
  [43.8, 1.11, 0.25, 'golpe'],
  [44.6, 1.04, 0.8, 'suave'],
  [46.88, 1.12, 0.2, 'golpe'],
  [47.7, 1.04, 0.8, 'suave'],
  [48.5, 1.07, 2.5, 'suave'],
  [51.28, 1.04, 0.8, 'suave'],
  [52.8, 1.16, 0.16, 'golpe'],
  [53.5, 1.04, 0.8, 'suave'],
  [55.48, 1.12, 0.2, 'golpe'],
  [56.6, 1.04, 0.8, 'suave'],
  [57.5, 1.07, 3.0, 'suave'],
  [61.0, 1.05, 1.5, 'suave'],
  [63.72, 1.09, 0.4, 'suave'],
  [64.7, 1.04, 0.6, 'suave'],
  [65.88, 1.2, 0.16, 'golpe'],
  [66.5, 1.08, 0.6, 'suave'],
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
const IMPACTOS = [2.76, 4.4, 12.4, 25.32, 52.8, 65.88];
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
  {src: 'empresas', a: 16.2, b: 19.72, desde: 1, foco: 0.5},
  {src: 'voz', a: 19.72, b: 21.52, desde: 1, foco: 0.5},
  {src: 'whatsapp', a: 21.52, b: 22.72, desde: 2, foco: 0.5},
  {src: 'chatbots', a: 22.72, b: 23.4, desde: 2, foco: 0.5},
  {src: 'automatizaciones', a: 23.4, b: 24.46, desde: 2, foco: 0.5},
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
            <Video src={staticFile(`e5/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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

// ---------------- Ilustraciones propias de este reel ----------------
// 14 clases: catorce fichas de lección que se encienden en cascada (sin títulos inventados)
const LECCIONES = {a: 25.2, b: 27.9, en: 25.32};
const Lecciones: React.FC<{t: number}> = ({t}) => {
  const {a, b, en} = LECCIONES;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 176, top: 170, width: 728, display: 'grid', gridTemplateColumns: 'repeat(7, 92px)', gap: 14, filter: SOMBRA}}>
        {Array.from({length: 14}, (_, i) => {
          const ei = en + i * 0.045;
          const pop = iv(t, [ei, ei + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          const flash = iv(t, [ei, ei + 10 * F], [1, 0]);
          const ola = t > en + 0.8 ? Math.sin((t - en) * 5 - i * 0.45) * 0.04 : 0;
          return (
            <div key={i} style={{width: 92, height: 92, borderRadius: 24, background: `rgba(${GLOW_AMARILLO},${0.15 + 0.85 * flash})`, border: `4px solid ${C.amarillo}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${Math.max(0, pop) * (1 + ola)}`, opacity: t < ei ? 0 : 1,
              boxShadow: `0 0 ${8 + 22 * flash}px rgba(${GLOW_AMARILLO},${0.5 + 0.5 * flash})`, backdropFilter: 'blur(6px)'}}>
              <svg width={44} height={44} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill={flash > 0.5 ? '#111' : C.amarillo} /></svg>
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

// Tres preguntas: tarjetas con "?" que giran en 3D y descubren la respuesta en icono
const PREGUNTAS: [number, number, string][] = [
  [30.44, 30.96, 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z'],
  [32.28, 32.88, 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z'],
  [35.16, 35.52, 'M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z'],
];
const Preguntas: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={30.3} b={40.3}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 160, display: 'flex', justifyContent: 'center', gap: 44, perspective: 1200, filter: SOMBRA}}>
      {PREGUNTAS.map(([aparece, gira, ico], i) => {
        const entra = iv(t, [aparece, aparece + 10 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
        const giro = iv(t, [gira, gira + 12 * F], [0, 1], Easing.bezier(0.34, 1.45, 0.64, 1));
        const flota = Math.sin((t - aparece) * 2.4 + i) * 6;
        const cara: React.CSSProperties = {position: 'absolute', inset: 0, borderRadius: 30, backfaceVisibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'};
        return (
          <div key={i} style={{position: 'relative', width: 170, height: 200, opacity: t < aparece ? 0 : Math.min(1, entra * 2), scale: `${0.5 + 0.5 * entra}`,
            translate: `0px ${(1 - entra) * 60 + flota}px`, transformStyle: 'preserve-3d', transform: `rotateY(${giro * 180}deg)`}}>
            <div style={{...cara, background: 'rgba(18,18,22,0.85)', border: '4px solid rgba(255,255,255,0.85)', ...H, fontSize: 120, color: '#fff', textShadow: glow('255,255,255', 0.6)}}>?</div>
            <div style={{...cara, background: C.amarillo, transform: 'rotateY(180deg)', boxShadow: `0 0 34px rgba(${GLOW_AMARILLO},0.9)`}}>
              <svg width={96} height={96} viewBox="0 0 24 24"><path d={ico} fill="#111" /></svg>
            </div>
          </div>
        );
      })}
    </div>
  </Ventana>
);

// Precio: etiqueta que cae colgando de un hilo, se balancea y el "1 €" se enciende al decirlo
const ETIQUETA = {a: 51.4, b: 53.54, precio: 52.8};
const Etiqueta: React.FC<{t: number}> = ({t}) => {
  const {a, b, precio} = ETIQUETA;
  const cae = iv(t, [a, a + 12 * F], [0, 1], Easing.bezier(0.34, 1.4, 0.64, 1));
  const k = t - a;
  const kp = t - precio;
  const balanceo = 16 * Math.exp(-k * 2.6) * Math.sin(k * 8) + (kp > 0 ? 9 * Math.exp(-kp * 4) * Math.sin(kp * 15) : 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA}} width={1080} height={1920}>
        <g transform={`translate(540 ${1090 - (1 - cae) * 700}) rotate(${balanceo})`}>
          <line x1={0} y1={-140} x2={0} y2={52} stroke="#fff" strokeWidth={4} />
          <path d="M -150 0 L 150 0 L 230 80 L 230 300 Q 230 320 210 320 L -210 320 Q -230 320 -230 300 L -230 80 Z" fill={C.amarillo} stroke="#fff" strokeWidth={6} strokeLinejoin="round"
            style={{filter: `drop-shadow(0 0 26px rgba(${GLOW_AMARILLO},0.85))`}} />
          <circle cx={0} cy={52} r={16} fill="#1b1b20" stroke="#fff" strokeWidth={4} />
          <text x={0} y={250} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={170} fill="#111" style={golpeV(ESTILO.golpe, t, precio, b - 6 * F) as React.CSSProperties}>1 €</text>
        </g>
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
  {a: 0.04, b: 3.96, top: 60, lineas: [{ws: [['he', 0.04], ['preparado', 0.2], ['un', 0.68], ['curso', 0.84]], size: 76}, {ws: [['de', 1.2], ['introducción', 1.32]], size: 76}, {ws: [['a', 1.96], ['las', 2.04], ['agencias', 2.24], ['de', 2.64]], size: 76}, {ws: [['inteligencia', 2.76, amarillo]], size: 118, golpe: true}, {ws: [['artificial', 3.32, amarillo]], size: 118, golpe: true}]},
  // ...por 1 €
  {a: 4.04, b: 5.2, top: 980, lineas: [{ws: [['por', 4.04]], size: 90}, {ws: [['1 €', 4.4, amarillo]], size: 300, golpe: true}]},
  // No es una formación para hacerte programador
  {a: 10.44, b: 13.05, top: 980, lineas: [{ws: [['es', 10.44], ['que', 10.56], ['no', 10.68], ['es', 10.84]], size: 80}, {ws: [['una', 10.96], ['formación', 11.16]], size: 90}, {ws: [['para', 11.76], ['hacerte', 12.0]], size: 80}, {ws: [['programador', 12.4, rosaFuerte]], size: 130, golpe: true}]},
  // Montaje de B-roll: todo en grande (la frase exacta)
  {a: 19.72, b: 21.5, top: 1150, lineas: [{ws: [['por', 19.72], ['ejemplo', 19.88]], size: 80}, {ws: [['asistentes', 20.4, amarillo]], size: 130, golpe: true}, {ws: [['de', 21.0], ['voz', 21.12]], size: 100}]},
  {a: 21.52, b: 22.7, top: 1150, lineas: [{ws: [['agentes', 21.52], ['de', 21.96]], size: 90}, {ws: [['WhatsApp', 22.08, amarillo]], size: 140, golpe: true}]},
  {a: 22.72, b: 23.38, top: 1150, lineas: [{ws: [['chatbots', 22.72, amarillo]], size: 160, golpe: true}]},
  {a: 23.4, b: 24.44, top: 1150, lineas: [{ws: [['y', 23.4]], size: 90}, {ws: [['automatizaciones', 23.52, amarillo]], size: 120, golpe: true}]},
  // 14 clases
  {a: 24.48, b: 26.25, top: 980, lineas: [{ws: [['el', 24.48], ['curso', 24.68], ['contiene', 24.92]], size: 80}, {ws: [['14', 25.32, amarillo]], size: 280, golpe: true}, {ws: [['clases', 25.8]], size: 100}]},
  // Quiero que tengas algo claro
  {a: 40.64, b: 41.85, top: 1000, lineas: [{ws: [['quiero', 40.64], ['que', 40.84], ['tengas', 40.92]], size: 80}, {ws: [['algo claro', 41.24, amarillo]], size: 140, golpe: true}]},
  // Formación introductoria
  {a: 46.08, b: 47.72, top: 1000, lineas: [{ws: [['es', 46.08], ['una', 46.24], ['formación', 46.36]], size: 90}, {ws: [['introductoria', 46.88, amarillo]], size: 130, golpe: true}]},
  // El precio de acceso es de 1 € (el "1 €" va en la etiqueta)
  {a: 51.28, b: 53.3, top: 900, lineas: [{ws: [['el', 51.28], ['precio', 51.48], ['de', 51.76], ['acceso', 51.88]], size: 80}, {ws: [['es', 52.44], ['de', 52.64]], size: 80}]},
  // Consultoría gratuita
  {a: 54.28, b: 56.62, top: 1000, lineas: [{ws: [['podrás', 54.28], ['reservar', 54.64], ['una', 55.2]], size: 80}, {ws: [['consultoría', 55.48, amarillo]], size: 120, golpe: true}, {ws: [['gratuita', 56.08, amarillo]], size: 120, golpe: true}]},
  // Cierre: accede al curso por 1 €
  {a: 64.64, b: 66.9, top: 960, lineas: [{ws: [['y', 64.64], ['accede', 64.72], ['al', 65.08], ['curso', 65.24]], size: 80}, {ws: [['por', 65.68]], size: 90}, {ws: [['1 €', 65.88, amarillo]], size: 300, golpe: true}]},
];
// Este reel no tiene lista en grande
const LISTA: [number, number] = [-10, -10];
const CTA = 63.72;
const CTA_FIN = 64.62; // tras "pulsa el botón" va el cierre en grande
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
const CLAVE = new Set(['exactamente', 'negocio', 'empresas', 'agencia', 'problema', 'servicios', 'profesional', 'automáticamente', 'clientes', 'modelo', 'mentoría', 'profundizar']);

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
const DETRAS: [number, number][] = [[0, 4.25]];

export const ReelE5: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E5)} layout="none">
            <Video src={staticFile('e5/e5.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e5/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Impacto estilo={ESTILO.impacto} t={t} en={4.4} x={540} y={1200} radio={240} />
      <Impacto estilo={ESTILO.impacto} t={t} en={12.4} x={540} y={1300} color={C.rosa} />
      <Impacto estilo={ESTILO.impacto} t={t} en={25.32} x={540} y={1200} radio={230} />
      <Impacto estilo={ESTILO.impacto} t={t} en={52.8} x={540} y={1300} radio={260} />
      <Impacto estilo={ESTILO.impacto} t={t} en={65.88} x={540} y={1250} radio={260} />
      <Lecciones t={t} />
      <Preguntas t={t} />
      <Etiqueta t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={63.72}>pulsa</Sube>
          <Sube t={t} en={64.16}>el</Sube>
          <Sube t={t} en={64.24} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 64.36 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 64.36)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="slide" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 63.72, 64.16, 64.24].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['risercorto', 2.2, -7], ['boom', 2.76, -4], ['cineboom', 4.4, -3], ['thud', 12.4, -4],
        ['pop', 20.4, -4], ['pop', 22.08, -4], ['pop', 22.72, -4], ['pop', 23.52, -4],
        ['boom', 25.32, -3], ['datos', 25.34, -9],
        ['snappy', 30.44, -7], ['reveal', 30.96, -7], ['snappy', 32.28, -7], ['reveal', 32.88, -7], ['snappy', 35.16, -7], ['reveal', 35.52, -7],
        ['thud', 41.24, -4], ['pop', 46.88, -4], ['swish', 51.5, -8], ['boom', 52.8, -3], ['exito', 52.9, -8], ['confirmar', 55.48, -6],
        ['risersharp', 65.0, -6], ['boom', 65.88, -2], ['twinkle', 66.1, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
