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
const ESTILO: Estilo = {texto: 'tecla', golpe: 'contorno', impacto: 'serpentinas', sub: 'tecla', flecha: 'voltea'};

export const DURACION_A6 = 77.4;
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
  [0.5, 1.05, 1.3, 'suave'],
  [1.84, 1.14, 0.18, 'golpe'],
  [2.6, 1.04, 0.7, 'suave'],
  [3.84, 1.07, 1.8, 'suave'],
  [5.92, 1.16, 0.16, 'golpe'],
  [6.7, 1.04, 0.8, 'suave'],
  [7.68, 1.1, 0.25, 'golpe'],
  [8.4, 1.04, 1.0, 'suave'],
  [9.4, 1.07, 1.2, 'suave'],
  [10.64, 1.0, 0, 'corte'],
  [12.0, 1.0, 0, 'corte'],
  [12.02, 1.06, 1.4, 'suave'],
  [25.34, 1.0, 0, 'corte'],
  [25.36, 1.05, 0.8, 'suave'],
  [26.8, 1.08, 3.0, 'suave'],
  [29.8, 1.04, 0.8, 'suave'],
  [30.6, 1.07, 2.4, 'suave'],
  [33.76, 1.11, 0.25, 'golpe'],
  [34.6, 1.04, 0.8, 'suave'],
  [36.56, 1.1, 0.25, 'golpe'],
  [37.4, 1.04, 1.0, 'suave'],
  [39.12, 1.06, 0.6, 'suave'],
  [40.24, 1.15, 0.16, 'golpe'],
  [41.0, 1.04, 0.8, 'suave'],
  [43.52, 1.1, 0.25, 'golpe'],
  [44.4, 1.04, 0.8, 'suave'],
  [46.72, 1.11, 0.25, 'golpe'],
  [47.6, 1.04, 0.8, 'suave'],
  [48.72, 1.07, 2.6, 'suave'],
  [51.76, 1.11, 0.25, 'golpe'],
  [52.6, 1.04, 0.8, 'suave'],
  [53.6, 1.05, 0.5, 'suave'],
  [55.2, 1.07, 0.4, 'suave'],
  [56.64, 1.09, 0.4, 'suave'],
  [58.4, 1.04, 1.2, 'suave'],
  [60.24, 1.07, 2.5, 'suave'],
  [64.0, 1.13, 0.2, 'golpe'],
  [64.8, 1.04, 0.8, 'suave'],
  [66.0, 1.07, 2.5, 'suave'],
  [68.75, 1.1, 0.4, 'suave'],
  [70.0, 1.04, 0.8, 'suave'],
  [71.0, 1.07, 4.0, 'suave'],
  [75.95, 1.1, 0.5, 'suave'],
  [76.75, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [1.84, 5.92, 24.8, 40.24];
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
  {src: 'empresa', a: 10.64, b: 12.0, desde: 2, foco: 0.5},
  {src: 'organizando', a: 18.24, b: 19.92, desde: 1, foco: 0.5},
  {src: 'mano', a: 19.92, b: 23.15, desde: 1, foco: 0.5},
  {src: 'tiempo', a: 23.15, b: 25.34, desde: 1, foco: 0.5},
];
// Pantallas de ejemplo (hoja de cálculo, bandeja de correo) a pantalla completa, con la misma transición que el B-roll
const PANTALLAS = [{a: 13.52, b: 16.06}, {a: 16.06, b: 18.24}];
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
            <Video src={staticFile(`a6/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
const ICONO = {
  hoja: 'M3 3h18v18H3V3zm2 2v4h6V5H5zm8 0v4h6V5h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6zm-8 6v2h6v-2H5zm8 0v2h6v-2h-6z',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z',
  correo: 'M3 5h18v14H3V5zm2 2v.5l7 4.5 7-4.5V7H5zm0 3v7h14v-7l-7 4.5L5 10z',
  carpeta: 'M10 4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z',
  chat: 'M4 4h16v12H7l-3 3V4z',
  responder: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
  chispa: 'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2zm7 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
  lupa: 'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z',
  regla: 'M3 17.2V21h3.8l11-11-3.8-3.8-11 11zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8L20.7 7z',
  mano: 'M12.2 5.6l-4.7 4.6a1.4 1.4 0 0 0 2 2l2.8-2.7 6.4 6.3 1.6-1.6a2 2 0 0 0 0-2.8l-4.6-4.6a3 3 0 0 0-3.5-.2zM2 9.4l3.6-3.6a2 2 0 0 1 2.8 0l.7.7-3 3a3.4 3.4 0 0 0 4.8 4.8l2.4-2.4 5.3 5.3-.9.9a2 2 0 0 1-2.8 0l-.4-.4-.4.4a2 2 0 0 1-2.8 0L2 12.2a2 2 0 0 1 0-2.8z',
  micro: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  reloj: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4l3.5 2.1-.8 1.3L11 13V7h2v5.4z',
};
const Ico: React.FC<{d: string; size: number; color: string}> = ({d, size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink: 0}}><path d={d} fill={color} /></svg>
);
const Barra: React.FC<{w: number | string; h?: number; color?: string}> = ({w, h = 16, color = '#c9ccd4'}) => (
  <div style={{height: h, width: w, borderRadius: h / 2, background: color, flexShrink: 0}} />
);

// Fondo de "pantalla" para los ejemplos de tareas (no es la cámara: aquí sí hay fondo propio)
const FondoUI: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 38%, #222838 0%, #0d0f14 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)', backgroundSize: '64px 64px'}} />
  </AbsoluteFill>
);
// Ventana de aplicación genérica (sin marcas): barra con semáforo, icono y título en esqueleto
const Marco: React.FC<{t: number; en: number; top: number; alto: number; color: string; icono: string; children: React.ReactNode}> = ({t, en, top, alto, color, icono, children}) => {
  const p = iv(t, [en, en + 12 * F], [0, 1], Easing.bezier(0.34, 1.4, 0.64, 1));
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top, height: alto, borderRadius: 34, background: '#f6f7f9', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
      opacity: Math.min(1, p * 2), scale: `${0.86 + 0.14 * p}`, translate: `0px ${(1 - p) * 70}px`}}>
      <div style={{height: 80, background: '#fff', borderBottom: '2px solid #e6e8ee', display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px'}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: '50%', background: c}} />)}
        <div style={{marginLeft: 16, width: 48, height: 48, borderRadius: 13, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ico d={icono} size={30} color="#fff" /></div>
        <Barra w={220} h={18} color="#2b2d31" />
      </div>
      {children}
    </div>
  );
};

// 1) "copiando datos de una herramienta a otra": hoja de cálculo → ficha de cliente, celda a celda
const COPIAS = [13.75, 14.55, 15.25];
const PantallaCopiar: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t >= b) return null;
  const celda = (r: number): [number, number] => [90 + 225 * 1.5, 200 + 80 + 56 + r * 76 + 38];
  const campo = (i: number): [number, number] => [430, 920 + 80 + 34 + i * 102 + 24 + 30];
  const anchos = [0.7, 0.5, 0.82, 0.6, 0.45, 0.75];
  return (
    <AbsoluteFill>
      <FondoUI />
      <Marco t={t} en={a} top={200} alto={620} color="#1f9d55" icono={ICONO.hoja}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)'}}>
          {Array.from({length: 4}, (_, c) => (
            <div key={`h${c}`} style={{height: 56, background: '#e3f4ea', borderRight: '2px solid #d5e9dc', borderBottom: '2px solid #cfe3d6', display: 'flex', alignItems: 'center', padding: '0 20px'}}><Barra w="55%" h={14} color="#1f9d55" /></div>
          ))}
          {Array.from({length: 24}, (_, k) => {
            const r = Math.floor(k / 4), c = k % 4;
            const copia = COPIAS.findIndex((x) => x !== undefined) >= 0 && c === 1 && r < 3 ? COPIAS[r] : -1;
            const brillo = copia > 0 ? iv(t, [copia - 0.18, copia, copia + 0.5], [0, 1, 0.35]) : 0;
            return (
              <div key={k} style={{height: 76, borderRight: '2px solid #eceef2', borderBottom: '2px solid #eceef2', display: 'flex', alignItems: 'center', padding: '0 20px',
                background: brillo > 0 ? `rgba(${GLOW_AMARILLO},${0.35 * brillo})` : '#fff', outline: brillo > 0.05 ? `4px solid rgba(255,214,10,${brillo})` : 'none', outlineOffset: -4}}>
                <Barra w={`${anchos[(r + c) % 6] * 100}%`} h={14} color={c === 0 ? '#2b2d31' : '#b9bdc7'} />
              </div>
            );
          })}
        </div>
      </Marco>
      <Marco t={t} en={a + 0.12} top={920} alto={430} color="#3478f6" icono={ICONO.usuario}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 0, padding: '34px 40px 0'}}>
          {[0, 1, 2].map((i) => {
            const lleno = iv(t, [COPIAS[i] + 0.42, COPIAS[i] + 0.62], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
            return (
              <div key={i} style={{height: 102, display: 'flex', flexDirection: 'column', gap: 10}}>
                <Barra w={[150, 120, 180][i]} h={14} color="#8b909c" />
                <div style={{height: 60, borderRadius: 14, border: `3px solid ${lleno > 0 ? '#3478f6' : '#d7dae2'}`, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px'}}>
                  <div style={{width: `${lleno * [55, 40, 62][i]}%`}}><Barra w="100%" h={16} color="#2b2d31" /></div>
                </div>
              </div>
            );
          })}
        </div>
      </Marco>
      {/* la celda copiada viaja de una herramienta a otra con el cursor */}
      {COPIAS.map((c0, i) => {
        const p = iv(t, [c0, c0 + 0.42], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
        if (t < c0 || t > c0 + 0.62) return null;
        const [x1, y1] = celda(i);
        const [x2, y2] = campo(i);
        const cx = (x1 + x2) / 2 + 260, cy = (y1 + y2) / 2;
        const x = (1 - p) * (1 - p) * x1 + 2 * (1 - p) * p * cx + p * p * x2;
        const y = (1 - p) * (1 - p) * y1 + 2 * (1 - p) * p * cy + p * p * y2;
        const sale = iv(t, [c0 + 0.42, c0 + 0.62], [1, 0]);
        return (
          <div key={i} style={{position: 'absolute', left: x - 95, top: y - 26, width: 190, height: 52, borderRadius: 14, background: C.amarillo, boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 24px rgba(${GLOW_AMARILLO},0.8)`,
            display: 'flex', alignItems: 'center', padding: '0 18px', opacity: sale, scale: `${1 + 0.12 * Math.sin(p * Math.PI)}`, rotate: `${Math.sin(p * Math.PI) * 6}deg`}}>
            <Barra w="70%" h={14} color="#1b1b20" />
            <svg width={44} height={44} viewBox="0 0 24 24" style={{position: 'absolute', right: -30, bottom: -34}}><path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#111" strokeWidth={1.5} strokeLinejoin="round" /></svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 2) "respondiendo las mismas preguntas": bandeja con el mismo correo repetido y la misma respuesta
const PantallaBandeja: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t >= b) return null;
  const avatares = ['#f4a261', '#2a9d8f', '#e76f51', '#8e7dbe', '#e9c46a', '#5aa9e6', '#ef476f'];
  return (
    <AbsoluteFill>
      <FondoUI />
      <Marco t={t} en={a} top={200} alto={1150} color="#e8603c" icono={ICONO.correo}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          {avatares.map((col, i) => {
            const llega = a + 0.09 + i * 0.16;
            const p = iv(t, [llega, llega + 9 * F], [0, 1], Easing.bezier(0.34, 1.4, 0.64, 1));
            const resp = a + 1.24 + i * 0.12;
            const r = iv(t, [resp, resp + 7 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            if (t < llega) return <div key={i} style={{height: 152}} />;
            return (
              <div key={i} style={{height: 152, display: 'flex', alignItems: 'center', gap: 24, padding: '0 34px', borderBottom: '2px solid #eceef2',
                background: r > 0 ? '#fffbe6' : '#fff', translate: `${(1 - p) * 220}px 0px`, opacity: Math.min(1, p * 2)}}>
                <div style={{width: 16, height: 16, borderRadius: '50%', background: '#3478f6', opacity: 1 - r}} />
                <div style={{width: 84, height: 84, borderRadius: '50%', background: col, flexShrink: 0}} />
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 14}}>
                  <Barra w={[190, 240, 170, 210, 230, 160, 200][i]} h={18} color="#2b2d31" />
                  <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
                    <Barra w={360} h={15} color="#a9adb8" />
                    <div style={{width: 40, height: 40, borderRadius: '50%', background: '#2b2d31', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...H, fontSize: 26, textShadow: 'none'}}>?</div>
                  </div>
                </div>
                <div style={{width: 76, height: 76, borderRadius: '50%', background: C.amarillo, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${r}`, opacity: r > 0 ? 1 : 0,
                  boxShadow: `0 0 20px rgba(${GLOW_AMARILLO},0.8)`}}><Ico d={ICONO.responder} size={42} color="#1b1b20" /></div>
              </div>
            );
          })}
        </div>
      </Marco>
    </AbsoluteFill>
  );
};

// 3) Rutina en bucle: las tareas dan vueltas en una cinta (tiempo perdido); llega la IA y las va resolviendo
const BUCLE = {a: 26.6, b: 38.95, ia: 33.76, auto: 36.56};
const PISTA = {x0: 285, L: 510, r: 100, cy: 280};
const PERIMETRO = 2 * PISTA.L + 2 * Math.PI * PISTA.r;
const enPista = (u: number): [number, number] => {
  const {x0, L, r, cy} = PISTA;
  let v = ((u % PERIMETRO) + PERIMETRO) % PERIMETRO;
  if (v < L) return [x0 + v, cy - r];
  v -= L;
  if (v < Math.PI * r) { const g = -Math.PI / 2 + v / r; return [x0 + L + r * Math.cos(g), cy + r * Math.sin(g)]; }
  v -= Math.PI * r;
  if (v < L) return [x0 + L - v, cy + r];
  v -= L;
  const g = Math.PI / 2 + v / r;
  return [x0 + r * Math.cos(g), cy + r * Math.sin(g)];
};
const Bucle: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, auto} = BUCLE;
  const {x0, L, r, cy} = PISTA;
  const rec = (x: number) => 230 * (x - a) + Math.max(0, x - auto) * 260; // recorrido: se acelera al automatizar
  const d = rec(t);
  const uIA = L + (Math.PI * r) / 2; // la IA se coloca en el extremo derecho de la cinta
  const tareas = [ICONO.hoja, ICONO.correo, ICONO.carpeta, ICONO.usuario, ICONO.chat];
  const nodo = iv(t, [ia, ia + 12 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  const pulso = t > ia ? 0.5 + 0.5 * Math.sin((t - ia) * 7) : 0;
  const forma = `M ${x0} ${cy - r} H ${x0 + L} A ${r} ${r} 0 0 1 ${x0 + L} ${cy + r} H ${x0} A ${r} ${r} 0 0 1 ${x0} ${cy - r} Z`;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA}} width={1080} height={600}>
        <path d={forma} fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.4)" strokeWidth={5} strokeDasharray="4 18" strokeLinecap="round" strokeDashoffset={-d} />
        {t >= ia && (
          <g transform={`translate(${x0 + L + r} ${cy}) scale(${nodo})`}>
            <circle r={78 + 18 * pulso} fill={`rgba(${GLOW_AMARILLO},${0.12 + 0.1 * pulso})`} />
            <circle r={64} fill={C.amarillo} stroke="#fff" strokeWidth={6} style={{filter: `drop-shadow(0 0 ${18 + 14 * pulso}px rgba(${GLOW_AMARILLO},1))`}} />
            <g transform={`rotate(${(t - ia) * 60}) translate(-27 -27) scale(2.25)`}><path d={ICONO.chispa} fill="#1b1b20" /></g>
          </g>
        )}
        {tareas.map((ico, j) => {
          const o = (j * PERIMETRO) / tareas.length;
          const u = d + o;
          const uAuto = rec(auto) + o;
          const hecha = t > auto && Math.floor((u - uIA) / PERIMETRO) - Math.floor((uAuto - uIA) / PERIMETRO) > 0;
          const [x, y] = enPista(u);
          const entra = iv(t, [a + j * 0.08, a + j * 0.08 + 10 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          return (
            <g key={j} transform={`translate(${x} ${y}) scale(${entra})`}>
              <rect x={-52} y={-52} width={104} height={104} rx={26} fill={hecha ? C.amarillo : '#f6f7f9'} stroke={hecha ? '#fff' : 'rgba(0,0,0,0.15)'} strokeWidth={4}
                style={{filter: hecha ? `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
              <g transform="translate(-27 -27) scale(2.25)"><path d={ico} fill="#1b1b20" /></g>
              <g transform="translate(36 -38)">
                <circle r={20} fill={hecha ? '#22c55e' : '#ff3b30'} stroke="#fff" strokeWidth={3} />
                <g transform="translate(-13 -13) scale(1.08)"><path d={hecha ? ICONO.check : ICONO.reloj} fill="#fff" /></g>
              </g>
            </g>
          );
        })}
      </svg>
    </Ventana>
  );
};

// 4) Detectar → diseñar → ofrecer: tres píldoras en zigzag unidas por flechas que se dibujan
const PASOS: {txt: string; en: number; ico: string; left?: number; right?: number; top: number}[] = [
  {txt: 'detectar una\nnecesidad', en: 53.6, ico: ICONO.lupa, left: 100, top: 0},
  {txt: 'diseñar una\nsolución', en: 55.2, ico: ICONO.regla, right: 100, top: 196},
  {txt: 'ofrecerla a un negocio\nque pueda beneficiarse\nde ella', en: 56.64, ico: ICONO.mano, left: 100, top: 392},
];
const Zigzag: React.FC<{t: number}> = ({t}) => {
  const flecha = (d: string, en: number) => {
    const p = iv(t, [en - 9 * F, en - 1 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
    return p <= 0 ? null : (
      <g>
        <path d={d} fill="none" stroke={C.amarillo} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
          style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.9))`}} />
      </g>
    );
  };
  return (
    <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
      <div style={{position: 'absolute', left: -60, right: -60, top: 700, height: 760, background: VELO}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, height: 620, filter: SOMBRA}}>
        <svg width={1080} height={620} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {flecha('M 400 150 C 400 186, 640 160, 660 194', PASOS[1].en)}
          {flecha('M 660 346 C 660 382, 420 356, 400 390', PASOS[2].en)}
        </svg>
        {PASOS.map((s, i) => {
          if (t < s.en) return null;
          const p = iv(t, [s.en, s.en + 11 * F], [0, 1], Easing.bezier(0.34, 1.4, 0.64, 1));
          const ic = iv(t, [s.en + 3 * F, s.en + 12 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          const sale = iv(t, [LISTA[1], LISTA[1] + SALIDA], [0, 1]);
          const lado = s.left !== undefined ? -1 : 1;
          return (
            <div key={i} style={{position: 'absolute', top: s.top, left: s.left, right: s.right, display: 'flex', alignItems: 'center', gap: 22, padding: '18px 34px 18px 18px',
              borderRadius: 44, background: 'rgba(16,16,20,0.78)', border: `4px solid ${C.amarillo}`, boxShadow: `0 0 24px rgba(${GLOW_AMARILLO},0.35)`,
              translate: `${(1 - p) * 160 * lado}px ${-20 * sale}px`, opacity: Math.min(1, p * 2) * (1 - sale), scale: `${0.9 + 0.1 * p}`}}>
              <div style={{width: 84, height: 84, borderRadius: '50%', background: C.amarillo, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, scale: `${ic}`, rotate: `${(1 - ic) * -90}deg`}}>
                <Ico d={s.ico} size={46} color="#1b1b20" />
              </div>
              <span style={{...H, fontSize: 48, lineHeight: 1.04, whiteSpace: 'pre'}}>{s.txt}</span>
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

// 5) Soluciones existentes que encajan como piezas y un servicio que las envuelve
const BLOQUES_A6 = {a: 65.7, b: 70.1, caen: [65.95, 66.25, 66.51], juntan: 67.47, envuelve: 68.75};
const Bloques: React.FC<{t: number}> = ({t}) => {
  const {a, b, caen, juntan, envuelve} = BLOQUES_A6;
  const j = iv(t, [juntan, juntan + 10 * F], [0, 1], Easing.bezier(0.34, 1.3, 0.64, 1));
  const xs = [345, 540, 735].map((x) => 540 + (x - 540) * (1 - 0.16 * j));
  const marco = iv(t, [envuelve, envuelve + 14 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
  const lazo = iv(t, [envuelve + 0.35, envuelve + 0.35 + 10 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  const iconos = [ICONO.chat, ICONO.micro, ICONO.engranaje];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA}} width={1080} height={600}>
        {marco > 0 && (
          <rect x={540 - 290} y={170} width={580} height={220} rx={46} fill={`rgba(${GLOW_AMARILLO},${0.1 * marco})`} stroke={C.amarillo} strokeWidth={8} pathLength={1}
            strokeDasharray="1 1" strokeDashoffset={1 - marco} style={{filter: `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},0.9))`}} />
        )}
        {iconos.map((d, i) => {
          const p = iv(t, [caen[i], caen[i] + 12 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          if (t < caen[i]) return null;
          const unido = j > 0.5;
          return (
            <g key={i} transform={`translate(${xs[i]} ${280 - (1 - p) * 320}) rotate(${(1 - p) * (i - 1) * 25})`}>
              <rect x={-74} y={-74} width={148} height={148} rx={34} fill="rgba(20,20,26,0.88)" stroke={unido ? C.amarillo : '#fff'} strokeWidth={5} />
              <g transform="translate(-36 -36) scale(3)"><path d={d} fill={unido ? C.amarillo : '#fff'} /></g>
            </g>
          );
        })}
        {lazo > 0 && (
          <g transform={`translate(540 170) scale(${lazo})`}>
            <rect x={-46} y={-30} width={92} height={60} rx={30} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
            <g transform="translate(-17 -17) scale(1.42)"><path d={ICONO.chispa} fill="#1b1b20" /></g>
          </g>
        )}
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
  {a: 0.0, b: 3.8, top: 60, lineas: [{ws: [['hay', 0.0], ['negocios', 0.32], ['que', 0.8]], size: 80}, {ws: [['están', 1.04], ['perdiendo', 1.28]], size: 80}, {ws: [['horas', 1.84, amarillo]], size: 190, golpe: true}, {ws: [['de', 2.16], ['trabajo', 2.32]], size: 90}, {ws: [['todas', 2.88], ['las', 3.2], ['semanas', 3.36]], size: 80}]},
  // ...por tareas que hoy se podrían automatizar
  {a: 3.84, b: 6.62, top: 980, lineas: [{ws: [['por', 3.84], ['tareas', 4.08], ['que', 4.64]], size: 80}, {ws: [['hoy', 4.88], ['se', 5.2], ['podrían', 5.36]], size: 80}, {ws: [['automatizar', 5.92, amarillo]], size: 130, golpe: true}]},
  // Piensa en cualquier empresa (B-roll: texto abajo, las caras están arriba)
  {a: 10.64, b: 11.98, top: 1150, lineas: [{ws: [['piensa', 10.64], ['en', 11.04]], size: 90}, {ws: [['cualquier', 11.12, amarillo]], size: 130, golpe: true}, {ws: [['empresa', 11.52]], size: 110}]},
  // Son tareas que consumen tiempo (B-roll)
  {a: 23.2, b: 25.32, top: 1150, lineas: [{ws: [['son', 23.2], ['tareas', 23.44], ['que', 23.92]], size: 80}, {ws: [['consumen', 24.08, amarillo]], size: 130, golpe: true}, {ws: [['tiempo', 24.8, rosaFuerte]], size: 150, golpe: true}]},
  // Y aquí viene lo interesante
  {a: 39.12, b: 40.92, top: 1000, lineas: [{ws: [['y', 39.12], ['aquí', 39.36], ['viene', 39.68], ['lo', 40.0]], size: 80}, {ws: [['interesante', 40.24, amarillo]], size: 120, golpe: true}]},
];
// La lista "detectar una necesidad / diseñar una solución / ofrecerla a un negocio que pueda beneficiarse de ella" también cuenta como texto grande
const LISTA: [number, number] = [53.6, 60.12];
const CTA = 75.95;
const CTA_FIN = DURACION_A6; // "haz clic aquí debajo" hasta el final
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
const CLAVE = new Set(['oportunidad', 'herramientas', 'automatizar', 'inventar', 'problema', 'agencia', 'cero', 'servicio', 'modelo', 'mano', 'acostumbrado']);

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
const DETRAS: [number, number][] = [[0, 4.05]];

export const ReelA6: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A6)} layout="none">
            <Video src={staticFile('a6/a6.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a6/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        <PantallaCopiar t={t} a={PANTALLAS[0].a} b={PANTALLAS[0].b} />
        <PantallaBandeja t={t} a={PANTALLAS[1].a} b={PANTALLAS[1].b} />
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={5.92} x={540} y={1200} radio={240} />
      <Impacto estilo={ESTILO.impacto} t={t} en={11.12} x={540} y={1300} />
      <Impacto estilo={ESTILO.impacto} t={t} en={24.8} x={540} y={1420} color={C.rosa} />
      <Impacto estilo={ESTILO.impacto} t={t} en={40.24} x={540} y={1180} radio={240} />
      <Bucle t={t} />
      <Zigzag t={t} />
      <Bloques t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={75.95}>haz</Sube>
          <Sube t={t} en={76.19}>clic</Sube>
          <Sube t={t} en={76.51}>aquí</Sube>
          <Sube t={t} en={76.75} style={amarillo}>debajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 76.95 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 76.95)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="suck" en={c} db={-6} />
      ))}
      {[...PALABRAS_VISIBLES, 75.95, 76.19, 76.51, 76.75].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.84, -3], ['risercorto', 5.2, -7], ['cineboom', 5.92, -3], ['pop', 11.12, -4],
        ['click', 13.75, -4], ['mouse', 14.2, -8], ['click', 14.55, -4], ['click', 15.25, -4],
        ['notif', 16.15, -9], ['notif', 16.47, -9], ['notif', 16.79, -9], ['notif', 17.11, -9], ['tapcorto', 17.3, -8], ['tapcorto', 17.54, -8], ['tapcorto', 17.78, -8],
        ['thud', 24.08, -4], ['boom', 24.8, -3], ['loading', 26.7, -12], ['swell', 33.5, -8], ['twinkle', 33.8, -7],
        ['exito', 36.7, -9], ['confirmar', 37.3, -9], ['pop', 40.24, -4],
        ['snap', 53.6, -6], ['snap', 55.2, -6], ['snap', 56.64, -6],
        ['tapcorto', 65.95, -6], ['tapcorto', 66.25, -6], ['tapcorto', 66.51, -6], ['reveal', 68.75, -7],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
