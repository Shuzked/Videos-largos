import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {CAPA, SinZona, ZonaSegura} from '../zona';
import ZONAS from './zonas.json';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Check, Conector, Destello, IconoTrazado, Particulas, Pulso, ROJO, SOMBRA_ICONOS, VERDE, aparece, flota, muelle} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
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

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
// velocidad aproximada de un muelle (para aplastar/estirar mientras se asienta)
const vel = (t: number, en: number, frec: number, amort: number) => (t > en ? Math.exp(-amort * (t - en)) * Math.sin(2 * Math.PI * frec * (t - en)) : 0);

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// ---------------- Ilustraciones propias de este reel ----------------
const ICONO = {
  hoja: 'M3 3h18v18H3V3zm2 2v4h6V5H5zm8 0v4h6V5h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6zm-8 6v2h6v-2H5zm8 0v2h6v-2h-6z',
  usuario: ICONO10.persona,
  correo: 'M3 5h18v14H3V5zm2 2v.5l7 4.5 7-4.5V7H5zm0 3v7h14v-7l-7 4.5L5 10z',
  carpeta: 'M10 4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z',
  chat: 'M4 4h16v12H7l-3 3V4z',
  responder: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
  ia: ICONO10.ia,
  lupa: ICONOS.lupa,
  lapiz: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  oferta: ICONO10.etiqueta,
  micro: 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
};
const Ico: React.FC<{d: string; size: number; color: string}> = ({d, size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink: 0}}><path d={d} fill={color} /></svg>
);
// Icono que se dibuja y se rellena dentro de un hueco HTML (para las pantallas)
const IcoTrazado: React.FC<{d: string; t: number; en: number; size: number; color: string}> = ({d, t, en, size, color}) => (
  <svg width={size} height={size} style={{flexShrink: 0, overflow: 'visible'}}><IconoTrazado d={d} t={t} en={en} color={color} size={size} /></svg>
);
const Barra: React.FC<{w: number | string; h?: number; color?: string}> = ({w, h = 16, color = '#c9ccd4'}) => (
  <div style={{height: h, width: w, borderRadius: h / 2, background: color, flexShrink: 0}} />
);

// Fondo de "pantalla" para los ejemplos de tareas (no es la cámara: aquí sí hay fondo propio)
const FondoUI: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 38%, #222838 0%, #0d0f14 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)',
      backgroundSize: '64px 64px', backgroundPosition: `0px ${(t * 12) % 64}px`}} />
  </AbsoluteFill>
);
// Ventana de aplicación genérica (sin marcas): entra con muelle (aplastar/estirar que se asienta); el icono de la app se dibuja
const Marco: React.FC<{t: number; en: number; top: number; alto: number; color: string; icono: string; children: React.ReactNode}> = ({t, en, top, alto, color, icono, children}) => {
  const m = muelle(t, en, 2.1, 7);
  const v = vel(t, en, 2.1, 7);
  const s = 0.86 + 0.14 * m;
  const ic = aparece(t, en + 0.15, 20);
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top, height: alto, borderRadius: 34, background: '#f6f7f9', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
      opacity: lim((t - en) / 0.16), scale: `${s * (1 + 0.04 * v)} ${s * (1 - 0.04 * v)}`, translate: `0px ${(1 - m) * 70}px`}}>
      <div style={{height: 80, background: '#fff', borderBottom: '2px solid #e6e8ee', display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px'}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: '50%', background: c}} />)}
        <div style={{marginLeft: 16, width: 48, height: 48, borderRadius: 13, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${ic.sx} ${ic.sy}`, rotate: `${ic.rot}deg`}}>
          <IcoTrazado d={icono} t={t} en={en + 0.2} size={30} color="#fff" />
        </div>
        <div style={{width: 220 * lim((t - en - 0.2) / 0.3)}}><Barra w="100%" h={18} color="#2b2d31" /></div>
      </div>
      {children}
    </div>
  );
};

// 1) "copiando datos de una herramienta a otra": hoja de cálculo → ficha de cliente, celda a celda.
// La celda se ilumina con un pulso, salta con un muelle, viaja en arco con estela y al caer en el campo lo rellena con una ráfaga
const COPIAS = [13.75, 14.55, 15.25];
const PantallaCopiar: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t >= b) return null;
  const celda = (r: number): [number, number] => [90 + 225 * 1.5, 200 + 80 + 56 + r * 76 + 38];
  const campo = (i: number): [number, number] => [430, 920 + 80 + 34 + i * 102 + 24 + 30];
  const anchos = [0.7, 0.5, 0.82, 0.6, 0.45, 0.75];
  const vuelo = (c0: number, i: number, p: number): [number, number] => {
    const [x1, y1] = celda(i);
    const [x2, y2] = campo(i);
    const cx = (x1 + x2) / 2 + 260, cy = (y1 + y2) / 2;
    return [(1 - p) * (1 - p) * x1 + 2 * (1 - p) * p * cx + p * p * x2, (1 - p) * (1 - p) * y1 + 2 * (1 - p) * p * cy + p * p * y2];
  };
  return (
    <AbsoluteFill>
      <Marco t={t} en={a} top={200} alto={620} color="#1f9d55" icono={ICONO.hoja}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)'}}>
          {Array.from({length: 4}, (_, c) => (
            <div key={`h${c}`} style={{height: 56, background: '#e3f4ea', borderRight: '2px solid #d5e9dc', borderBottom: '2px solid #cfe3d6', display: 'flex', alignItems: 'center', padding: '0 20px'}}><Barra w="55%" h={14} color="#1f9d55" /></div>
          ))}
          {Array.from({length: 24}, (_, k) => {
            const r = Math.floor(k / 4), c = k % 4;
            const copia = c === 1 && r < 3 ? COPIAS[r] : -1;
            const brillo = copia > 0 ? iv(t, [copia - 0.18, copia, copia + 0.5], [0, 1, 0.35]) : 0;
            // las celdas aparecen en cascada
            const en = a + 0.25 + (r * 4 + c) * 0.012;
            return (
              <div key={k} style={{height: 76, borderRight: '2px solid #eceef2', borderBottom: '2px solid #eceef2', display: 'flex', alignItems: 'center', padding: '0 20px',
                background: brillo > 0 ? `rgba(${GLOW_AMARILLO},${0.35 * brillo})` : '#fff', outline: brillo > 0.05 ? `4px solid rgba(255,214,10,${brillo})` : 'none', outlineOffset: -4}}>
                <div style={{width: `${anchos[(r + c) % 6] * 100 * lim((t - en) / 0.2)}%`}}><Barra w="100%" h={14} color={c === 0 ? '#2b2d31' : '#b9bdc7'} /></div>
              </div>
            );
          })}
        </div>
      </Marco>
      <Marco t={t} en={a + 0.12} top={920} alto={430} color="#3478f6" icono={ICONO.usuario}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 0, padding: '34px 40px 0'}}>
          {[0, 1, 2].map((i) => {
            const lleno = iv(t, [COPIAS[i] + 0.42, COPIAS[i] + 0.62], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
            const golpe = vel(t, COPIAS[i] + 0.42, 3, 9);
            return (
              <div key={i} style={{height: 102, display: 'flex', flexDirection: 'column', gap: 10}}>
                <Barra w={[150, 120, 180][i]} h={14} color="#8b909c" />
                <div style={{height: 60, borderRadius: 14, border: `3px solid ${lleno > 0 ? '#3478f6' : '#d7dae2'}`, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px',
                  scale: `${1 + 0.04 * golpe} ${1 - 0.06 * golpe}`, boxShadow: lleno > 0 ? `0 0 ${18 * (1 - lleno) + 4}px rgba(52,120,246,${0.6 - 0.4 * lleno})` : 'none'}}>
                  <div style={{width: `${lleno * [55, 40, 62][i]}%`}}><Barra w="100%" h={16} color="#2b2d31" /></div>
                </div>
              </div>
            );
          })}
        </div>
      </Marco>
      {/* la celda copiada salta, viaja en arco con estela y el cursor, y cae en el campo */}
      {COPIAS.map((c0, i) => {
        const p = iv(t, [c0, c0 + 0.42], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
        if (t < c0 - 0.06 || t > c0 + 0.62) return null;
        const salto = aparece(t, c0 - 0.06, 8);
        const sale = iv(t, [c0 + 0.42, c0 + 0.62], [1, 0]);
        const [x, y] = vuelo(c0, i, p);
        return (
          <React.Fragment key={i}>
            {[0.18, 0.12, 0.06].map((d, k) => {
              if (p - d <= 0 || p >= 1) return null;
              const [gx, gy] = vuelo(c0, i, p - d);
              return <div key={k} style={{position: 'absolute', left: gx - 95, top: gy - 26, width: 190, height: 52, borderRadius: 14, background: C.amarillo, opacity: 0.14 * (k + 1)}} />;
            })}
            <div style={{position: 'absolute', left: x - 95, top: y - 26, width: 190, height: 52, borderRadius: 14, background: C.amarillo, boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 24px rgba(${GLOW_AMARILLO},0.8)`,
              display: 'flex', alignItems: 'center', padding: '0 18px', opacity: sale, scale: `${salto.sx * (1 + 0.12 * Math.sin(p * Math.PI))} ${salto.sy * (1 + 0.12 * Math.sin(p * Math.PI))}`, rotate: `${salto.rot + Math.sin(p * Math.PI) * 6}deg`}}>
              <Barra w="70%" h={14} color="#1b1b20" />
              <svg width={44} height={44} viewBox="0 0 24 24" style={{position: 'absolute', right: -30, bottom: -34}}><path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#111" strokeWidth={1.5} strokeLinejoin="round" /></svg>
            </div>
          </React.Fragment>
        );
      })}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {COPIAS.map((c0, i) => {
          const [cx, cy] = celda(i);
          const [fx, fy] = campo(i);
          return (
            <g key={i}>
              <Pulso t={t} en={c0 - 0.12} x={cx} y={cy} r={60} color="#ffd60a" />
              <Particulas t={t} en={c0 + 0.42} x={fx} y={fy} n={10} radio={110} colores={['#3478f6', C.amarillo]} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// 2) "respondiendo las mismas preguntas": bandeja con el mismo correo repetido (todos con la misma interrogación)
// que entra con muelle uno tras otro; después sale la misma respuesta en cada uno (la flecha de responder se dibuja y salta)
const PantallaBandeja: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t >= b) return null;
  const avatares = ['#f4a261', '#2a9d8f', '#e76f51', '#8e7dbe', '#e9c46a', '#5aa9e6', '#ef476f'];
  return (
    <AbsoluteFill>
      <Marco t={t} en={a} top={200} alto={1150} color="#e8603c" icono={ICONO.correo}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          {avatares.map((col, i) => {
            const llega = a + 0.09 + i * 0.16;
            const m = muelle(t, llega, 2.4, 7);
            const resp = a + 1.24 + i * 0.12;
            const r = aparece(t, resp, -25);
            const q = aparece(t, llega + 0.12, 15);
            if (t < llega) return <div key={i} style={{height: 152}} />;
            return (
              <div key={i} style={{height: 152, display: 'flex', alignItems: 'center', gap: 24, padding: '0 34px', borderBottom: '2px solid #eceef2',
                background: t >= resp ? '#fffbe6' : '#fff', translate: `${(1 - m) * 260}px 0px`, opacity: lim((t - llega) / 0.12)}}>
                <div style={{width: 16, height: 16, borderRadius: '50%', background: '#3478f6', opacity: t >= resp ? 0 : 1, scale: `${1 + 0.25 * Math.abs(Math.sin((t - llega) * 6))}`}} />
                <div style={{width: 84, height: 84, borderRadius: '50%', background: col, flexShrink: 0}} />
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 14}}>
                  <Barra w={[190, 240, 170, 210, 230, 160, 200][i]} h={18} color="#2b2d31" />
                  <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                    <Barra w={330} h={15} color="#a9adb8" />
                    <div style={{width: 58, height: 58, borderRadius: '50%', background: '#e8603c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...H, fontSize: 40, textShadow: 'none',
                      scale: `${q.sx} ${q.sy}`, rotate: `${q.rot}deg`, boxShadow: '0 4px 10px rgba(0,0,0,0.25)'}}>?</div>
                  </div>
                </div>
                <div style={{width: 76, height: 76, borderRadius: '50%', background: C.amarillo, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${r.sx} ${r.sy}`, rotate: `${r.rot}deg`,
                  opacity: t >= resp ? 1 : 0, boxShadow: `0 0 20px rgba(${GLOW_AMARILLO},0.8)`}}>
                  {t >= resp && <IcoTrazado d={ICONO.responder} t={t} en={resp + 0.06} size={44} color="#1b1b20" />}
                </div>
              </div>
            );
          })}
        </div>
      </Marco>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {avatares.map((_, i) => (
          <Particulas key={i} t={t} en={a + 1.24 + i * 0.12} x={918} y={356 + i * 152} n={8} radio={80} colores={[C.amarillo, '#ffffff']} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// 3) Rutina en bucle: las tareas dan vueltas en una cinta (cada una con un reloj que corre: tiempo perdido);
// llega la IA (sale con muelle, pulso y ráfaga) y, al automatizar, la cinta se acelera y cada tarea que pasa por ella
// se resuelve: se pone en amarillo, el reloj se convierte en un ✓ que se dibuja y salta una ráfaga
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
const TAREAS = [ICONO.hoja, ICONO.correo, ICONO.carpeta, ICONO.usuario, ICONO.chat];
const recorrido = (x: number) => 230 * (x - BUCLE.a) + Math.max(0, x - BUCLE.auto) * 260; // se acelera al automatizar
const U_IA = PISTA.L + (Math.PI * PISTA.r) / 2; // la IA está en el extremo derecho de la cinta
const hechaEn = (j: number, x: number) => {
  const o = (j * PERIMETRO) / TAREAS.length;
  return x > BUCLE.auto && Math.floor((recorrido(x) + o - U_IA) / PERIMETRO) - Math.floor((recorrido(BUCLE.auto) + o - U_IA) / PERIMETRO) > 0;
};
// momento en que se resuelve cada tarea (primer fotograma en que ya ha pasado por la IA)
const RESUELTA = TAREAS.map((_, j) => {
  for (let f = Math.round(BUCLE.auto * 25); f <= Math.round(BUCLE.b * 25); f++) if (hechaEn(j, f / 25)) return f / 25;
  return 999;
});
const Bucle: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, auto} = BUCLE;
  const {x0, L, r, cy} = PISTA;
  const d = recorrido(t);
  const forma = `M ${x0} ${cy - r} H ${x0 + L} A ${r} ${r} 0 0 1 ${x0 + L} ${cy + r} H ${x0} A ${r} ${r} 0 0 1 ${x0} ${cy - r} Z`;
  const traza = 1 - Math.pow(1 - lim((t - a) / 0.7), 3);
  const nodo = aparece(t, ia, 20);
  const brillo = t > ia ? 0.5 + 0.5 * Math.sin((t - ia) * 7) : 0;
  const giro = (t - ia) * 50 + Math.max(0, t - auto) * 220;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={600}>
        <path d={forma} fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.22)" strokeWidth={22} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza} />
        {traza >= 1 && <path d={forma} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={5} strokeDasharray="4 18" strokeLinecap="round" strokeDashoffset={-d} />}
        {t >= ia && (
          <g transform={`translate(${x0 + L + r} ${cy})`}>
            <Pulso t={t} en={ia} x={0} y={0} r={70} color={C.amarillo} dur={18} />
            {RESUELTA.map((rt, j) => <Pulso key={j} t={t} en={rt} x={0} y={0} r={66} color="#ffffff" dur={12} />)}
            <g transform={`scale(${nodo.sx} ${nodo.sy}) rotate(${nodo.rot})`}>
              <circle r={80 + 16 * brillo} fill={`rgba(${GLOW_AMARILLO},${0.12 + 0.1 * brillo})`} />
              <circle r={64} fill={C.amarillo} stroke="#fff" strokeWidth={6} style={{filter: `drop-shadow(0 0 ${18 + 14 * brillo}px rgba(${GLOW_AMARILLO},1))`}} />
              <g transform={`rotate(${giro})`}>
                <IconoTrazado d={ICONO.ia} t={t} en={ia + 3 * F} color="#1b1b20" size={70} x={-35} y={-35} />
              </g>
            </g>
            <Particulas t={t} en={ia} x={0} y={0} n={12} radio={150} />
            <Destello t={t} en={auto} x={-40} y={-70} tam={30} color={C.amarillo} />
            <Destello t={t} en={auto + 0.1} x={50} y={60} tam={22} />
          </g>
        )}
        {TAREAS.map((ico, j) => {
          const o = (j * PERIMETRO) / TAREAS.length;
          const hecha = t >= RESUELTA[j];
          const [x, y] = enPista(d + o);
          const en = a + 0.25 + j * 0.12;
          if (t < en) return null;
          const ap = aparece(t, en, 12);
          const cambio = hecha ? aparece(t, RESUELTA[j], 0) : {sx: 1, sy: 1};
          const reloj = (t - a) * 300 + j * 70;
          return (
            <g key={j} transform={`translate(${x} ${y}) scale(${ap.sx * cambio.sx} ${ap.sy * cambio.sy}) rotate(${ap.rot})`}>
              <rect x={-52} y={-52} width={104} height={104} rx={26} fill={hecha ? C.amarillo : '#f6f7f9'} stroke={hecha ? '#fff' : 'rgba(0,0,0,0.15)'} strokeWidth={4}
                style={{filter: hecha ? `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
              <IconoTrazado d={ico} t={t} en={en + 2 * F} color="#1b1b20" size={54} x={-27} y={-27} />
              <g transform="translate(38 -40)">
                <circle r={21} fill={hecha ? VERDE : ROJO} stroke="#fff" strokeWidth={3} />
                {hecha ? (
                  <g transform="scale(0.5)"><Check t={t} en={RESUELTA[j] + 2 * F} /></g>
                ) : (
                  <g stroke="#fff" strokeWidth={3.5} strokeLinecap="round">
                    <circle r={11} fill="none" />
                    <line x1={0} y1={0} x2={0} y2={-8} transform={`rotate(${reloj})`} />
                    <line x1={0} y1={0} x2={5} y2={0} transform={`rotate(${reloj / 12})`} />
                  </g>
                )}
              </g>
            </g>
          );
        })}
        {RESUELTA.map((rt, j) => <Particulas key={j} t={t} en={rt} x={x0 + L + r} y={cy} n={9} radio={130} colores={[VERDE, C.amarillo, '#ffffff']} />)}
      </svg>
    </Ventana>
  );
};

// 4) Detectar → diseñar → ofrecer: tres píldoras en zigzag que entran con muelle desde su lado (el icono se dibuja con pulso
// y ráfaga) unidas por flechas que se dibujan con flujo y punta en la tangente del final
const PASOS: {txt: string; en: number; ico: string; left?: number; right?: number; top: number}[] = [
  {txt: 'detectar una\nnecesidad', en: 53.6, ico: ICONO.lupa, left: 100, top: 0},
  {txt: 'diseñar una\nsolución', en: 55.2, ico: ICONO.lapiz, right: 100, top: 196},
  {txt: 'ofrecerla a un negocio\nque pueda beneficiarse\nde ella', en: 56.64, ico: ICONO.oferta, left: 100, top: 392},
];
const Zigzag: React.FC<{t: number}> = ({t}) => {
  const sale = iv(t, [LISTA[1], LISTA[1] + SALIDA], [0, 1]);
  return (
    <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
      <div style={{position: 'absolute', left: -60, right: -60, top: 700, height: 760, background: VELO, opacity: 1 - sale}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, height: 620, filter: SOMBRA}}>
        <svg width={1080} height={620} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - sale, filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.9))`}}>
          <Conector t={t} en={PASOS[1].en - 9 * F} dur={8 * F} d="M 400 150 C 400 186, 640 160, 660 194" color={C.amarillo} flujo punta={[660, 194, Math.atan2(194 - 160, 660 - 640)]} />
          <Conector t={t} en={PASOS[2].en - 9 * F} dur={8 * F} d="M 660 346 C 660 382, 420 356, 400 390" color={C.amarillo} flujo punta={[400, 390, Math.atan2(390 - 356, 400 - 420)]} />
        </svg>
        {PASOS.map((s, i) => {
          if (t < s.en) return null;
          const m = muelle(t, s.en, 2.2, 6.5);
          const v = vel(t, s.en, 2.2, 6.5);
          const ic = aparece(t, s.en + 3 * F, -30);
          const lado = s.left !== undefined ? -1 : 1;
          const fl = flota(t, i * 1.3, 3);
          return (
            <div key={i} style={{position: 'absolute', top: s.top + fl.y, left: s.left, right: s.right, display: 'flex', alignItems: 'center', gap: 22, padding: '18px 34px 18px 18px',
              borderRadius: 44, background: 'rgba(16,16,20,0.78)', border: `4px solid ${C.amarillo}`, boxShadow: `0 0 24px rgba(${GLOW_AMARILLO},0.35)`,
              translate: `${(1 - m) * 160 * lado}px ${-20 * sale}px`, opacity: lim((t - s.en) / 0.15) * (1 - sale), scale: `${(0.9 + 0.1 * m) * (1 + 0.05 * v)} ${(0.9 + 0.1 * m) * (1 - 0.05 * v)}`,
              transformOrigin: lado < 0 ? '0% 50%' : '100% 50%'}}>
              <svg width={84} height={84} style={{overflow: 'visible', flexShrink: 0}}>
                <Pulso t={t} en={s.en + 3 * F} x={42} y={42} r={42} color={C.amarillo} />
                <g transform={`translate(42 42) scale(${ic.sx} ${ic.sy}) rotate(${ic.rot})`}>
                  <circle r={42} fill={C.amarillo} />
                  <IconoTrazado d={s.ico} t={t} en={s.en + 5 * F} color="#1b1b20" size={48} x={-24} y={-24} />
                </g>
                <Particulas t={t} en={s.en + 3 * F} x={42} y={42} n={8} radio={90} />
              </svg>
              <span style={{...H, fontSize: 48, lineHeight: 1.04, whiteSpace: 'pre'}}>{s.txt}</span>
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

// 5) Soluciones existentes (chat, voz, automatización) que caen con muelle y se aplastan al tocar fondo,
// se juntan con un tirón, el servicio las envuelve con un marco que se dibuja y salta el lazo de la IA
const BLOQUES_A6 = {a: 65.7, b: 70.1, caen: [65.95, 66.25, 66.51], juntan: 67.47, envuelve: 68.75};
const Bloques: React.FC<{t: number}> = ({t}) => {
  const {a, b, caen, juntan, envuelve} = BLOQUES_A6;
  const j = muelle(t, juntan, 2.4, 7);
  const xs = [345, 540, 735].map((x) => 540 + (x - 540) * (1 - 0.16 * j));
  const marco = iv(t, [envuelve, envuelve + 14 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
  const lazo = aparece(t, envuelve + 0.35, 15);
  const respira = t > envuelve ? 1 + 0.015 * Math.sin((t - envuelve) * 5) : 1;
  const iconos = [ICONO.chat, ICONO.micro, ICONO.engranaje];
  const unido = t >= juntan + 0.15;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={600}>
        {marco > 0 && (
          <g transform={`translate(540 280) scale(${respira}) translate(-540 -280)`}>
            <rect x={540 - 290} y={170} width={580} height={220} rx={46} fill={`rgba(${GLOW_AMARILLO},${0.1 * marco})`} stroke={C.amarillo} strokeWidth={8} pathLength={1}
              strokeDasharray="1 1" strokeDashoffset={1 - marco} style={{filter: `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},0.9))`}} />
          </g>
        )}
        {iconos.map((d, i) => {
          if (t < caen[i]) return null;
          const m = muelle(t, caen[i], 2.3, 6.5);
          const v = vel(t, caen[i], 2.3, 6.5);
          const fl = unido ? flota(t, i * 1.2, 3) : {y: 0, s: 1};
          return (
            <g key={i} transform={`translate(${xs[i]} ${280 - (1 - m) * 320 + fl.y}) scale(${1 + 0.14 * v} ${1 - 0.14 * v}) rotate(${(1 - m) * (i - 1) * 25})`}>
              <rect x={-74} y={-74} width={148} height={148} rx={34} fill="rgba(20,20,26,0.9)" stroke={unido ? C.amarillo : '#fff'} strokeWidth={5}
                style={{filter: unido ? `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},0.8))` : 'none'}} />
              <IconoTrazado d={d} t={t} en={caen[i] + 3 * F} color={unido ? C.amarillo : '#fff'} size={76} x={-38} y={-38} />
            </g>
          );
        })}
        {caen.map((c, i) => <Pulso key={i} t={t} en={c + 0.18} x={[345, 540, 735][i]} y={280} r={80} color="#ffffff" />)}
        <Particulas t={t} en={juntan + 0.1} x={540} y={280} n={14} radio={320} />
        {t >= envuelve + 0.35 && (
          <g transform={`translate(540 170) scale(${lazo.sx} ${lazo.sy}) rotate(${lazo.rot})`}>
            <rect x={-50} y={-32} width={100} height={64} rx={32} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
            <IconoTrazado d={ICONO.ia} t={t} en={envuelve + 0.42} color="#1b1b20" size={40} x={-20} y={-20} />
          </g>
        )}
        <Destello t={t} en={envuelve + 0.5} x={540 + 300} y={170} tam={30} color={C.amarillo} />
        <Destello t={t} en={envuelve + 0.6} x={540 - 300} y={390} tam={24} />
        <Particulas t={t} en={envuelve + 0.35} x={540} y={170} n={10} radio={140} />
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
  // (zona segura de Instagram: arriba no cabe entre la cabecera y la cabeza de Álvaro → va delante, sobre el torso, sin recorte)
  {a: 0.0, b: 3.8, top: 940, lineas: [{ws: [['hay', 0.0], ['negocios', 0.32], ['que', 0.8]], size: 80}, {ws: [['están', 1.04], ['perdiendo', 1.28]], size: 80}, {ws: [['horas', 1.84, amarillo]], size: 190, golpe: true}, {ws: [['de', 2.16], ['trabajo', 2.32]], size: 90}, {ws: [['todas', 2.88], ['las', 3.2], ['semanas', 3.36]], size: 80}]},
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
const MAX_CAR = 20; // ~780 px a 70 px: no llega a la columna de botones de Instagram (x≈930)
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
  if (CAPA === 'lottie') return null;
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
const ANCHO = 800; // x 140-940: margen de Instagram a los lados y sin meterse bajo la columna de botones (x≈930) // ancho útil: ~100 px de margen a cada lado
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
// Zona segura de Instagram para el texto grande: x 140-940 (márgenes y columna de botones), nunca por encima de ARRIBA
// (barra del móvil y cabecera) ni por debajo de ABAJO (botón «Ver detalles» de los anuncios). Si un bloque pedía estar más
// arriba, baja y se reduce un 10 %; si se salía por abajo, sube. La palabra de golpe deja margen para su animación de entrada.
const ARRIBA = 230;
const ABAJO = 1480;
const ANCHO_GOLPE = 740;
const tamLinea = (l: Linea, baja: boolean) => Math.min(l.size * (baja ? 0.9 : 1), (l.golpe ? ANCHO_GOLPE : ANCHO) / (Math.max(1, l.ws.map((w) => w[0]).join(' ').length) * FACTOR));
const topSeguro = (top: number, lineas: Linea[], baja: boolean) =>
  Math.max(ARRIBA, Math.min(Math.max(top, ARRIBA), ABAJO - lineas.flatMap(partir).reduce((s, l) => s + tamLinea(l, baja) * 1.02 + 4, 0)));
const FraseGrande: React.FC<{t: number; g: Grande; parte?: 'arriba' | 'abajo'}> = ({t, g, parte = 'arriba'}) =>
  // sin líneas en esta parte no se pinta nada (ni el velo)
  CAPA === 'lottie' || !g.lineas.some((l) => (parte === 'abajo') === !!l.abajo) ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: topSeguro(parte === 'abajo' ? 1180 : g.top, g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo), g.top < ARRIBA && parte !== 'abajo') - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo).flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = tamLinea(l, g.top < ARRIBA && parte !== 'abajo');
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
const DETRAS: [number, number][] = []; // el hook va delante, sobre el torso: no hace falta recorte

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
        {/* el fondo de las pantallas va aparte: para la zona segura se encogen las ventanas, no el fondo */}
        {PANTALLAS.some((p) => t >= p.a && t < p.b) && <SinZona><FondoUI t={t} /></SinZona>}
        <ZonaSegura t={t} zonas={ZONAS}><PantallaCopiar t={t} a={PANTALLAS[0].a} b={PANTALLAS[0].b} /></ZonaSegura>
        <ZonaSegura t={t} zonas={ZONAS}><PantallaBandeja t={t} a={PANTALLAS[1].a} b={PANTALLAS[1].b} /></ZonaSegura>
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <ZonaSegura t={t} zonas={ZONAS}><Bucle t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Zigzag t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Bloques t={t} /></ZonaSegura>
      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CAPA === 'lottie' ? 1e9 : CTA} b={CTA_FIN}>
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
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
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
