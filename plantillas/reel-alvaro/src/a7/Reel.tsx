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
const ESTILO: Estilo = {texto: 'rodar', golpe: 'cortina', impacto: 'polvo', sub: 'rodar', flecha: 'salto'};

export const DURACION_A7 = 76.24;
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
  [0.02, 1.03, 0.36, 'golpe'],
  [0.39, 1.13, 0.18, 'golpe'],
  [1.0, 1.04, 0.8, 'suave'],
  [2.9, 1.07, 0.8, 'suave'],
  [4.61, 1.12, 0.2, 'golpe'],
  [5.3, 1.04, 0.8, 'suave'],
  [7.25, 1.16, 0.16, 'golpe'],
  [7.98, 1.06, 0.3, 'golpe'],
  [8.96, 1.1, 0.3, 'golpe'],
  [10.03, 1.13, 0.3, 'golpe'],
  [12.07, 1.18, 0.16, 'golpe'],
  [12.6, 1.0, 0, 'corte'],
  [15.95, 1.0, 0, 'corte'],
  [15.97, 1.05, 1.5, 'suave'],
  [17.5, 1.08, 2.5, 'suave'],
  [20.2, 1.04, 0.8, 'suave'],
  [21.0, 1.07, 2.0, 'suave'],
  [23.24, 1.04, 0.8, 'suave'],
  [25.18, 1.08, 0.4, 'suave'],
  [26.5, 1.11, 0.25, 'golpe'],
  [27.3, 1.04, 0.8, 'suave'],
  [30.36, 1.07, 1.0, 'suave'],
  [33.2, 1.11, 0.25, 'golpe'],
  [34.0, 1.04, 0.8, 'suave'],
  [35.3, 1.07, 2.5, 'suave'],
  [38.22, 1.04, 0.6, 'suave'],
  [39.28, 1.1, 0.25, 'golpe'],
  [40.1, 1.04, 0.8, 'suave'],
  [43.23, 1.16, 0.16, 'golpe'],
  [44.0, 1.04, 0.8, 'suave'],
  [45.7, 1.11, 0.25, 'golpe'],
  [46.5, 1.04, 0.6, 'suave'],
  [47.68, 1.0, 0, 'corte'],
  [50.95, 1.0, 0, 'corte'],
  [50.97, 1.05, 0.8, 'suave'],
  [52.75, 1.1, 0.3, 'golpe'],
  [53.6, 1.04, 0.8, 'suave'],
  [55.06, 1.07, 3.0, 'suave'],
  [58.5, 1.04, 0.8, 'suave'],
  [60.46, 1.0, 0, 'corte'],
  [63.9, 1.0, 0, 'corte'],
  [63.92, 1.05, 0.8, 'suave'],
  [65.55, 1.1, 0.3, 'golpe'],
  [66.4, 1.04, 0.8, 'suave'],
  [66.94, 1.08, 1.5, 'suave'],
  [69.67, 1.04, 0.8, 'suave'],
  [70.5, 1.07, 3.5, 'suave'],
  [74.52, 1.1, 0.4, 'suave'],
  [75.04, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [0.39, 7.25, 12.07, 43.23];
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
  {src: 'universidad', a: 12.6, b: 15.95, desde: 1, foco: 0.5},
  {src: 'negocios', a: 47.68, b: 50.95, desde: 2, foco: 0.5},
  {src: 'captacion', a: 60.46, b: 62.13, desde: 2, foco: 0.5},
  {src: 'entrega', a: 62.13, b: 63.9, desde: 2, foco: 0.5},
];
// Este reel no lleva pantallas de ejemplo
const PANTALLAS: {a: number; b: number}[] = [];
const CORTES = Array.from(new Set([...BROLL, ...PANTALLAS].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
            <Video src={staticFile(`a7/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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

// ---------------- Ilustraciones propias de este reel (pocos efectos: solo refuerzan los datos 10 / 10 / 3) ----------------
const ICONO = {
  tienda: 'M4 4h16l1.5 5a3 3 0 0 1-5.5 1.7A3 3 0 0 1 12 12a3 3 0 0 1-4-1.3A3 3 0 0 1 2.5 9L4 4zm1 9.5V20h5v-4h4v4h5v-6.5a4.6 4.6 0 0 1-3-.6 4.9 4.9 0 0 1-4 .9 4.9 4.9 0 0 1-4-.9 4.6 4.6 0 0 1-3 .6z',
  reunion: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z',
  cruz: 'M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z',
  check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  apreton: 'M12.2 5.6l-4.7 4.6a1.4 1.4 0 0 0 2 2l2.8-2.7 6.4 6.3 1.6-1.6a2 2 0 0 0 0-2.8l-4.6-4.6a3 3 0 0 0-3.5-.2zM2 9.4l3.6-3.6a2 2 0 0 1 2.8 0l.7.7-3 3a3.4 3.4 0 0 0 4.8 4.8l2.4-2.4 5.3 5.3-.9.9a2 2 0 0 1-2.8 0l-.4-.4-.4.4a2 2 0 0 1-2.8 0L2 12.2a2 2 0 0 1 0-2.8z',
};
const ROJO = '#ff4d5e';
const VERDE = '#2ee59d';

// Diez fichas que cambian de estado: 10 negocios → 10 reuniones → 10 noes (cada una se tacha con un sello al decir "que no")
const DIEZ = {a: 7.9, b: 12.6, negocios: 7.98, reuniones: 8.96, noes: 10.92, fin: 12.07};
const Diez: React.FC<{t: number}> = ({t}) => {
  const {a, b, negocios, reuniones, noes, fin} = DIEZ;
  const paso = (fin - noes) / 9;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 165, display: 'flex', justifyContent: 'center', filter: SOMBRA}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 118px)', gap: 18, perspective: 900}}>
          {Array.from({length: 10}, (_, i) => {
            const nace = iv(t, [negocios + i * 0.05, negocios + i * 0.05 + 9 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            const giro = iv(t, [reuniones + i * 0.04, reuniones + i * 0.04 + 8 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
            const sello = noes + i * paso;
            const s = iv(t, [sello, sello + 6 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            const tachada = t >= sello;
            const icono = giro < 0.5 ? ICONO.tienda : ICONO.reunion;
            const temblor = tachada && t < sello + 6 * F ? Math.sin((t - sello) * 80) * 4 * (1 - (t - sello) / (6 * F)) : 0;
            return (
              <div key={i} style={{position: 'relative', width: 118, height: 118, borderRadius: 28, opacity: t < negocios + i * 0.05 ? 0 : Math.min(1, nace * 2),
                scale: `${Math.max(0, nace)}`, transform: `rotateY(${Math.sin(giro * Math.PI) * 90}deg)`, translate: `${temblor}px 0px`,
                background: tachada ? 'rgba(60,8,14,0.85)' : 'rgba(18,18,22,0.82)', border: `4px solid ${tachada ? ROJO : 'rgba(255,255,255,0.85)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: tachada ? `0 0 22px rgba(255,77,94,0.6)` : 'none'}}>
                <svg width={60} height={60} viewBox="0 0 24 24" style={{opacity: tachada ? 0.35 : 1}}><path d={icono} fill="#fff" /></svg>
                {tachada && (
                  <svg width={118} height={118} viewBox="0 0 24 24" style={{position: 'absolute', inset: 0, scale: `${1.6 - 0.6 * s}`, opacity: Math.min(1, s * 2)}}>
                    <path d={ICONO.cruz} fill={ROJO} transform="translate(3.6 3.6) scale(0.7)" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Ventana>
  );
};

// Marcador: las 10 reuniones con "no" y después las 3 siguientes que se convierten en los 3 primeros clientes
const MARCADOR = {a: 38.22, b: 44.2, siguientes: 40.23, clientes: 43.23};
const Marcador3: React.FC<{t: number}> = ({t}) => {
  const {a, b, siguientes, clientes} = MARCADOR;
  const flecha = iv(t, [siguientes - 0.2, siguientes + 0.1], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 190, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26, filter: SOMBRA}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 76px)', gap: 12}}>
          {Array.from({length: 10}, (_, i) => {
            const p = iv(t, [a + i * 0.03, a + i * 0.03 + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            return (
              <div key={i} style={{width: 76, height: 76, borderRadius: 20, background: 'rgba(60,8,14,0.85)', border: `3px solid ${ROJO}`, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${p}`}}>
                <svg width={44} height={44} viewBox="0 0 24 24"><path d={ICONO.cruz} fill={ROJO} /></svg>
              </div>
            );
          })}
        </div>
        <svg width={64} height={40} viewBox="0 0 64 40" style={{overflow: 'visible', opacity: flecha > 0 ? 1 : 0}}>
          <path d="M4 20 H 52 M 40 8 L 56 20 L 40 32" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - flecha} />
        </svg>
        <div style={{display: 'flex', gap: 14}}>
          {[0, 1, 2].map((i) => {
            const aparece = siguientes + i * 0.1;
            const p = iv(t, [aparece, aparece + 9 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            const g = iv(t, [clientes + i * 0.08, clientes + i * 0.08 + 7 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            const verde = t >= clientes + i * 0.08;
            return (
              <div key={i} style={{position: 'relative', width: 96, height: 96, borderRadius: 24, opacity: t < aparece ? 0 : 1, scale: `${p * (1 + 0.12 * Math.sin(g * Math.PI))}`,
                background: verde ? 'rgba(8,48,32,0.9)' : 'rgba(18,18,22,0.82)', border: `4px solid ${verde ? VERDE : 'rgba(255,255,255,0.85)'}`,
                boxShadow: verde ? `0 0 ${16 + 16 * g}px rgba(46,229,157,0.75)` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width={54} height={54} viewBox="0 0 24 24"><path d={verde ? ICONO.check : ICONO.reunion} fill={verde ? VERDE : '#fff'} /></svg>
              </div>
            );
          })}
        </div>
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
  {a: 0.0, b: 3.58, top: 60, lineas: [{ws: [['si', 0.0], ['te', 0.13], ['da', 0.26]], size: 80}, {ws: [['miedo', 0.39, rosaFuerte]], size: 190, golpe: true}, {ws: [['llamar', 0.71], ['a', 1.1], ['una', 1.16], ['empresa', 1.36]], size: 76, abajo: true}, {ws: [['para', 1.81], ['venderle', 2.07], ['algo', 2.58]], size: 76, abajo: true}, {ws: [['escucha', 2.9, amarillo], ['esto', 3.36, amarillo]], size: 100, abajo: true}]},
  // Mis primeras 10 reuniones como emprendedor terminaron en 10 noes
  {a: 3.84, b: 7.86, top: 960, lineas: [{ws: [['mis', 3.84], ['primeras', 4.05]], size: 80}, {ws: [['10 reuniones', 4.61, amarillo]], size: 120, golpe: true}, {ws: [['como', 5.37], ['emprendedor', 5.65]], size: 76}, {ws: [['terminaron', 6.42], ['en', 7.11]], size: 76}, {ws: [['10 noes', 7.25, rosaFuerte]], size: 170, golpe: true}]},
  // 10 negocios. 10 reuniones. Y 10 personas diciéndome que no.
  {a: 7.98, b: 8.94, top: 1000, lineas: [{ws: [['10', 7.98, amarillo]], size: 260, golpe: true}, {ws: [['negocios', 8.16]], size: 110}]},
  {a: 8.96, b: 9.92, top: 1000, lineas: [{ws: [['10', 8.96, amarillo]], size: 260, golpe: true}, {ws: [['reuniones', 9.14]], size: 110}]},
  {a: 9.94, b: 12.5, top: 1000, lineas: [{ws: [['y', 9.94], ['10', 10.03, rosa], ['personas', 10.2]], size: 100}, {ws: [['diciéndome', 10.92], ['que', 11.81]], size: 80}, {ws: [['no', 12.07, rosaFuerte]], size: 220, golpe: true}]},
  // Después de aquellas 10 reuniones, las 3 siguientes terminaron convirtiéndose en mis primeros 3 clientes
  {a: 38.22, b: 40.0, top: 980, lineas: [{ws: [['después', 38.22], ['de', 38.66], ['aquellas', 38.78]], size: 76}, {ws: [['10 reuniones', 39.28, rosaFuerte]], size: 120, golpe: true}]},
  {a: 40.04, b: 43.92, top: 960, lineas: [{ws: [['las', 40.04], ['3', 40.23, amarillo], ['siguientes', 40.29]], size: 84}, {ws: [['terminaron', 40.91]], size: 80}, {ws: [['convirtiéndose', 41.54], ['en', 42.42]], size: 76}, {ws: [['mis', 42.54], ['primeros', 42.73]], size: 80}, {ws: [['3 clientes', 43.23, amarillo]], size: 150, golpe: true}]},
];
// Este reel no tiene lista en grande
const LISTA: [number, number] = [-10, -10];
const CTA = 74.52;
const CTA_FIN = DURACION_A7; // "haz clic aquí abajo" hasta el final
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
const CLAVE = new Set(['universidad', 'agencia', 'vender', 'convencer', 'problema', 'solución', 'mágica', 'rechazos', 'emprendimiento', 'captación', 'entrega', 'tecnología', 'comercial']);

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
const DETRAS: [number, number][] = [[0, 4.0]];

export const ReelA7: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A7)} layout="none">
            <Video src={staticFile('a7/a7.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a7/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Impacto estilo={ESTILO.impacto} t={t} en={7.25} x={540} y={1460} color={C.rosa} radio={230} />
      <Impacto estilo={ESTILO.impacto} t={t} en={12.07} x={540} y={1430} color={C.rosa} radio={240} />
      <Impacto estilo={ESTILO.impacto} t={t} en={43.23} x={540} y={1500} radio={240} />
      <Diez t={t} />
      <Marcador3 t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={74.52}>haz</Sube>
          <Sube t={t} en={74.74}>clic</Sube>
          <Sube t={t} en={75.04}>aquí</Sube>
          <Sube t={t} en={75.34} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 75.55 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 75.55)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 74.52, 74.74, 75.04, 75.34].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 0.39, -3], ['risercorto', 6.6, -7], ['cineboom', 7.25, -3],
        ['pop', 7.98, -4], ['snap', 8.96, -5], ['pop', 10.03, -5],
        ['tapcorto', 10.92, -10], ['tapcorto', 11.05, -10], ['tapcorto', 11.18, -10], ['tapcorto', 11.31, -10], ['tapcorto', 11.44, -10], ['tapcorto', 11.57, -10], ['tapcorto', 11.69, -10], ['tapcorto', 11.82, -10], ['tapcorto', 11.94, -10], ['negativo', 12.07, -5],
        ['reveal', 38.22, -8], ['puntos', 40.23, -8], ['boom', 43.23, -3], ['exito', 43.3, -7], ['pop', 45.7, -5], ['pop', 52.75, -6], ['pop', 65.55, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
