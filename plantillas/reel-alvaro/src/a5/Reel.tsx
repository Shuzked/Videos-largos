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
const ESTILO: Estilo = {texto: 'ola', golpe: 'eco', impacto: 'rombos', sub: 'ola', flecha: 'pendulo'};

// Álvaro hasta "…cómo fue su proceso" (T1), luego el testimonio de Billy (D s) y después el CTA de Álvaro
const FUENTE = 70.25;
const T1 = 64.95;
const D_TESTIMONIO = 18.86;
export const DURACION_A5 = 89.11;
const TESTIMONIO = {a: T1, b: T1 + D_TESTIMONIO};
// tiempo del reel → tiempo del vídeo de Álvaro
const fuente = (t: number) => (t < T1 ? t : t - D_TESTIMONIO);
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
  [0.4, 1.12, 0.18, 'golpe'],
  [1.0, 1.04, 0.8, 'suave'],
  [2.8, 1.07, 0.6, 'suave'],
  [3.44, 1.15, 0.16, 'golpe'],
  [4.2, 1.04, 0.8, 'suave'],
  [5.12, 1.08, 0.4, 'suave'],
  [6.0, 1.04, 0.6, 'suave'],
  [6.96, 1.12, 0.2, 'golpe'],
  [7.7, 1.04, 0.8, 'suave'],
  [8.9, 1.07, 2.5, 'suave'],
  [11.5, 1.04, 1.0, 'suave'],
  [12.9, 1.08, 1.6, 'suave'],
  [14.7, 1.04, 0.8, 'suave'],
  [15.6, 1.07, 1.2, 'suave'],
  [17.0, 1.04, 0.8, 'suave'],
  [19.41, 1.1, 0.25, 'golpe'],
  [20.2, 1.04, 0.8, 'suave'],
  [21.52, 1.08, 0.4, 'suave'],
  [23.54, 1.11, 0.3, 'golpe'],
  [24.6, 1.04, 0.8, 'suave'],
  [25.3, 1.07, 3.0, 'suave'],
  [28.6, 1.04, 0.8, 'suave'],
  [30.1, 1.06, 0.8, 'suave'],
  [32.04, 1.13, 0.2, 'golpe'],
  [32.8, 1.04, 0.8, 'suave'],
  [33.7, 1.05, 0.6, 'suave'],
  [34.61, 1.07, 0.4, 'suave'],
  [35.45, 1.09, 0.4, 'suave'],
  [36.96, 1.11, 0.4, 'suave'],
  [38.42, 1.13, 0.4, 'suave'],
  [39.6, 1.04, 1.0, 'suave'],
  [40.8, 1.07, 1.6, 'suave'],
  [42.66, 1.04, 0.6, 'suave'],
  [43.85, 1.14, 0.2, 'golpe'],
  [44.6, 1.04, 0.6, 'suave'],
  [45.6, 1.13, 0.2, 'golpe'],
  [46.4, 1.04, 0.6, 'suave'],
  [47.84, 1.16, 0.16, 'golpe'],
  [48.6, 1.04, 0.8, 'suave'],
  [51.28, 1.15, 0.16, 'golpe'],
  [52.1, 1.04, 0.8, 'suave'],
  [53.5, 1.07, 1.8, 'suave'],
  [55.66, 1.04, 0.8, 'suave'],
  [56.5, 1.07, 3.0, 'suave'],
  [59.7, 1.04, 0.8, 'suave'],
  [60.6, 1.07, 4.0, 'suave'],
  [64.95, 1.0, 0, 'corte'],
  [83.81, 1.0, 0, 'corte'],
  [83.83, 1.05, 0.8, 'suave'],
  [84.71, 1.08, 2.0, 'suave'],
  [87.53, 1.1, 0.4, 'suave'],
  [88.61, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [0.4, 3.44, 43.85, 47.84];
const SACUDIDA: [number, number][] = [[12, -8], [-9, 6], [5, -3], [-2, 1]];
const camara = (t: number) => {
  const s = BASE * escala(t);
  const [fx, fy] = cara(fuente(t));
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
// Este reel no lleva B-roll: el testimonio es la ruptura visual
const BROLL: B[] = [];
// El testimonio entra y sale con la misma transición que el B-roll
const PANTALLAS: {a: number; b: number}[] = [TESTIMONIO];
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
            <Video src={staticFile(`a5/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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

// Las palabras de Billy (testimonio) van en otro color; Álvaro con el estilo normal
const enIA = (x: number) => x >= T1 - 0.01 && x < T1 + D_TESTIMONIO;
const estiloIA: React.CSSProperties = {color: '#5EE1FF', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('94,225,255', 0.9)}`};

// ---------------- Ilustraciones propias de este reel ----------------
const ICONO = {
  maletin: 'M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2zm4 4V4h-4v2h4z',
  megafono: 'M18 11v2h4v-2h-4zm-2 6.6c1 .7 2.2 1.6 3.2 2.4l.8-1.1c-1-.8-2.2-1.7-3.2-2.4l-.8 1.1zM20 4.4l-.8-1.1c-1 .7-2.2 1.6-3.2 2.4l.8 1.1c1-.8 2.2-1.7 3.2-2.4zM4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.3-.6-2.5-1.5-3.4v6.7c.9-.8 1.5-2 1.5-3.3z',
  chispa: 'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2zm7 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
  birrete: 'M12 3L1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8z',
  lupa: 'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z',
  personas: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z',
  documento: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 13h8v2H8v-2zm0 4h8v2H8v-2z',
  estrella: 'M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z',
};
const Ico: React.FC<{d: string; size: number; color: string}> = ({d, size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink: 0}}><path d={d} fill={color} /></svg>
);

// Trayectoria: 2020 → agencias de marketing → servicios de IA → hoy enseñamos el modelo (trazo con hitos que se encienden)
const TRAYECTO = {a: 16.9, b: 30.0, hitos: [19.41, 21.52, 23.54, 25.28]};
const Trayectoria: React.FC<{t: number}> = ({t}) => {
  const {a, b, hitos} = TRAYECTO;
  const xs = [170, 413, 667, 910];
  const y = 300;
  const iconos = [ICONO.maletin, ICONO.megafono, ICONO.chispa, ICONO.birrete];
  const avance = iv(t, [hitos[0], hitos[1], hitos[2], hitos[3]], [xs[0], xs[1], xs[2], xs[3]], Easing.bezier(0.45, 0, 0.25, 1));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA}} width={1080} height={600}>
        <line x1={xs[0]} y1={y} x2={xs[3]} y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeDasharray="2 14" strokeLinecap="round" />
        {t >= hitos[0] && <line x1={xs[0]} y1={y} x2={avance} y2={y} stroke={C.amarillo} strokeWidth={9} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />}
        {t >= hitos[0] && avance < xs[3] - 1 && <circle cx={avance} cy={y} r={12} fill="#fff" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />}
        {xs.map((x, i) => {
          const en = hitos[i];
          const activo = t >= en;
          const pop = iv(t, [en, en + 10 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          const onda = iv(t, [en, en + 14 * F], [0, 1]);
          const nace = iv(t, [a + i * 0.08, a + i * 0.08 + 9 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${nace * (activo ? 0.8 + 0.2 * pop : 0.72)})`}>
              {activo && onda < 1 && <circle r={64 + onda * 60} fill="none" stroke={C.amarillo} strokeWidth={5} opacity={1 - onda} />}
              <circle r={64} fill={activo ? C.amarillo : 'rgba(0,0,0,0.55)'} stroke={activo ? '#fff' : 'rgba(255,255,255,0.7)'} strokeWidth={activo ? 6 : 4}
                style={{filter: activo ? `drop-shadow(0 0 18px rgba(${GLOW_AMARILLO},1))` : 'none'}} />
              <g transform={`rotate(${(1 - pop) * -30}) translate(-30 -30) scale(2.5)`}><path d={iconos[i]} fill={activo ? '#111' : '#fff'} opacity={activo ? 1 : 0.6} /></g>
            </g>
          );
        })}
      </svg>
    </Ventana>
  );
};

// Hay que aprender a: prospectar / reunirse con negocios / presentar propuestas / entregar un buen servicio (cascada que baja peldaño a peldaño)
const PELDANOS: [string, number, string][] = [
  ['prospectar', 34.61, ICONO.lupa],
  ['reunirse con\nnegocios', 35.45, ICONO.personas],
  ['presentar\npropuestas', 36.96, ICONO.documento],
  ['entregar un\nbuen servicio', 38.42, ICONO.estrella],
];
const Cascada: React.FC<{t: number}> = ({t}) => {
  const tops = [880, 990, 1130, 1270];
  const lefts = [110, 170, 230, 290];
  const sale = iv(t, [LISTA[1], LISTA[1] + SALIDA], [0, 1]);
  return (
    <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
      <div style={{position: 'absolute', left: -60, right: -60, top: 720, height: 760, background: VELO}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 770, display: 'flex', justifyContent: 'center', ...H, fontSize: 62, filter: SOMBRA, opacity: 1 - sale}}>
        {([['hay', 33.7], ['que', 33.77], ['aprender', 33.98], ['a', 34.54]] as [string, number][]).map(([w, en], i) => (
          <span key={i} style={{marginRight: '0.24em'}}><Entra estilo={ESTILO.texto} t={t} en={en}>{w}</Entra></span>
        ))}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA}}>
        {PELDANOS.slice(1).map(([, en], i) => {
          const p = iv(t, [en - 8 * F, en], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
          const x = lefts[i] + 46, y1 = tops[i] + 92, y2 = tops[i + 1] + 46, x2 = lefts[i + 1];
          return p <= 0 ? null : (
            <path key={i} d={`M ${x} ${y1} V ${y2} H ${x2}`} fill="none" stroke={C.amarillo} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
              strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={1 - sale} style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.9))`}} />
          );
        })}
      </svg>
      {PELDANOS.map(([txt, en, ico], i) => {
        if (t < en) return null;
        const p = iv(t, [en, en + 10 * F], [0, 1], Easing.bezier(0.34, 1.4, 0.64, 1));
        const ic = iv(t, [en + 3 * F, en + 12 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
        return (
          <div key={i} style={{position: 'absolute', left: lefts[i], top: tops[i], display: 'flex', alignItems: 'center', gap: 22, filter: SOMBRA,
            translate: `${(1 - p) * -60}px ${-20 * sale}px`, opacity: Math.min(1, p * 2) * (1 - sale)}}>
            <div style={{width: 92, height: 92, borderRadius: 26, background: C.amarillo, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${ic}`,
              boxShadow: `0 0 20px rgba(${GLOW_AMARILLO},0.8)`}}><Ico d={ico} size={52} color="#1b1b20" /></div>
            <span style={{...H, fontSize: 54, lineHeight: 1.0, whiteSpace: 'pre'}}>{txt}</span>
          </div>
        );
      })}
    </Ventana>
  );
};

// Testimonio documental: fragmento auténtico de la videollamada (Billy grande, Álvaro en la ventanita), sin alterar sus palabras
const FondoUI: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 42%, #23283a 0%, #0c0e13 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)', backgroundSize: '64px 64px'}} />
  </AbsoluteFill>
);
const Testimonio: React.FC<{t: number}> = ({t}) => {
  const {a, b} = TESTIMONIO;
  if (t < a || t >= b) return null;
  const p = iv(t, [a, a + 14 * F], [0, 1], Easing.bezier(0.34, 1.3, 0.64, 1));
  const q = iv(t, [a + 0.3, a + 0.3 + 12 * F], [0, 1], Easing.bezier(0.34, 1.45, 0.64, 1));
  const punto = 0.5 + 0.5 * Math.sin((t - a) * 6);
  return (
    <AbsoluteFill>
      <FondoUI />
      <div style={{position: 'absolute', left: 40, width: 1000, top: 520, height: 532, borderRadius: 36, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
        outline: '3px solid rgba(255,255,255,0.14)', scale: `${0.9 + 0.1 * p}`, opacity: Math.min(1, p * 2)}}>
        <Sequence from={fr(a)} durationInFrames={fr(b - a)} layout="none">
          <Video src={staticFile('a5/testimonio-billy.mp4')} muted style={{position: 'absolute', left: 0, top: 0, width: 1000, height: 532}} />
        </Sequence>
        <div style={{position: 'absolute', left: 26, top: 24, width: 22, height: 22, borderRadius: '50%', background: '#ff3b30', opacity: 0.55 + 0.45 * punto, boxShadow: '0 0 12px rgba(255,59,48,0.9)'}} />
      </div>
      <div style={{position: 'absolute', left: 676, width: 340, top: 430, height: 181, borderRadius: 22, overflow: 'hidden', outline: '4px solid #fff', boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
        scale: `${q}`, opacity: Math.min(1, q * 2)}}>
        <Sequence from={fr(a)} durationInFrames={fr(b - a)} layout="none">
          <Video src={staticFile('a5/testimonio-alvaro.mp4')} muted style={{position: 'absolute', left: 0, top: 0, width: 340, height: 181}} />
        </Sequence>
      </div>
    </AbsoluteFill>
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
  // HOOK: "si ves un ANUNCIO" detrás de Álvaro; el resto de la frase delante, abajo
  {a: 0.11, b: 3.12, top: 60, lineas: [{ws: [['si', 0.11], ['ves', 0.14], ['un', 0.28]], size: 80}, {ws: [['anuncio', 0.4, amarillo]], size: 180, golpe: true}, {ws: [['de', 0.79], ['alguien', 0.89], ['enseñando', 1.29]], size: 76, abajo: true}, {ws: [['a', 1.84], ['montar', 1.89], ['un', 2.2], ['negocio', 2.29]], size: 76, abajo: true}, {ws: [['por', 2.64], ['internet', 2.84]], size: 76, abajo: true}]},
  {a: 3.4, b: 5.85, top: 980, lineas: [{ws: [['y', 3.4]], size: 80}, {ws: [['desconfías', 3.44, rosaFuerte]], size: 140, golpe: true}, {ws: [['te', 4.56], ['entiendo', 4.6]], size: 90}, {ws: [['perfectamente', 5.12]], size: 100}]},
  {a: 6.02, b: 7.55, top: 1000, lineas: [{ws: [['yo', 6.02], ['también', 6.17], ['haría', 6.63]], size: 80}, {ws: [['preguntas', 6.96, amarillo]], size: 140, golpe: true}]},
  // El caso de Billy: datos documentados en grande
  {a: 42.66, b: 46.45, top: 960, lineas: [{ws: [['por', 42.66], ['ejemplo', 42.7]], size: 76}, {ws: [['billy', 43.25], ['tardó', 43.55]], size: 84}, {ws: [['7 meses', 43.85, amarillo]], size: 150, golpe: true}, {ws: [['en', 44.45], ['cerrar', 44.61], ['sus', 44.93], ['primeros', 45.12]], size: 76}, {ws: [['4 clientes', 45.6, amarillo]], size: 140, golpe: true}]},
  {a: 46.64, b: 50.18, top: 980, lineas: [{ws: [['en', 46.64], ['ese', 46.86], ['tiempo', 47.12], ['cobró', 47.49]], size: 80}, {ws: [['9.900 €', 47.84, amarillo]], size: 190, golpe: true}, {ws: [['en', 49.24], ['instalaciones', 49.38]], size: 84}]},
  {a: 50.24, b: 55.3, top: 960, lineas: [{ws: [['y', 50.24], ['ahora', 50.36], ['tiene', 50.71]], size: 80}, {ws: [['500 €', 51.28, amarillo]], size: 190, golpe: true}, {ws: [['al', 52.1], ['mes', 52.18], ['de', 52.39], ['mantenimientos', 52.58]], size: 76}, {ws: [['sin', 53.53], ['tener', 53.71], ['que', 54.06]], size: 76}, {ws: [['volver', 54.47], ['a', 54.7], ['vender', 54.77]], size: 76}]},
];
// La cascada "hay que aprender a prospectar / reunirse con negocios / presentar propuestas / entregar un buen servicio" cuenta como texto grande
const LISTA: [number, number] = [33.7, 39.55];
const CTA = 87.53;
const CTA_FIN = DURACION_A5; // "haz clic aquí abajo" hasta el final
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
  }).map((bq) => (bq.a < T1 && bq.b > T1 ? {...bq, b: T1} : bq.a < T1 + D_TESTIMONIO && bq.b > T1 + D_TESTIMONIO ? {...bq, b: T1 + D_TESTIMONIO} : bq)) // ningún subtítulo cruza la entrada o salida del testimonio
    .filter((bq) => bq.b > bq.a + 0.1); // un bloque que se queda sin tiempo no se muestra (ni suena)
})();
const PALABRAS_VISIBLES = BLOQUES.flatMap((bq) => bq.ws.map((w) => w[1]));
const CLAVE = new Set(['promesas', 'explicaciones', 'trabajo', '2020', 'marketing', 'agencia', 'botón', 'cobrar', 'ritmo', 'particular', 'promesa', 'historia', 'proceso', 'alumnos', 'modelo']);

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
const DETRAS: [number, number][] = [[0, 3.4]];

export const ReelA5: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(T1)} layout="none">
            <Video src={staticFile('a5/a5.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
          <Sequence from={fr(T1 + D_TESTIMONIO)} durationInFrames={fr(FUENTE - T1)} layout="none">
            <Video src={staticFile('a5/a5.mp4')} trimBefore={fr(T1)} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a5/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        <Testimonio t={t} />
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={3.44} x={540} y={1180} color={C.rosa} radio={230} />
      <Impacto estilo={ESTILO.impacto} t={t} en={47.84} x={540} y={1250} radio={250} />
      <Impacto estilo={ESTILO.impacto} t={t} en={51.28} x={540} y={1230} radio={250} />
      <Trayectoria t={t} />
      <Cascada t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={87.53}>haz</Sube>
          <Sube t={t} en={87.74}>clic</Sube>
          <Sube t={t} en={88.0}>aquí</Sube>
          <Sube t={t} en={88.61} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 88.81 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 88.81)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="swoosh2" en={c} db={-6} />
      ))}
      {[...PALABRAS_VISIBLES, 87.53, 87.74, 88.0, 88.61].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 0.4, -3], ['thud', 3.44, -4], ['pop', 6.96, -4],
        ['burbuja', 19.41, -8], ['burbuja', 21.52, -8], ['burbuja', 23.54, -8], ['burbuja', 25.28, -8],
        ['snappy', 34.61, -7], ['snappy', 35.45, -7], ['snappy', 36.96, -7], ['snappy', 38.42, -7],
        ['thud', 43.85, -4], ['pop', 45.6, -5], ['cineboom', 47.84, -3], ['boom', 51.28, -3], ['exito', 51.4, -8],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
