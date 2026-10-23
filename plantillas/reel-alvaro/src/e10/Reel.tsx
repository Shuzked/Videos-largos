import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {CAPA, SIN_TEXTO, Zona, ZonaSegura, hueco} from '../zona';
import ZONAS from './zonas.json';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import {ICONO10} from '../a10/iconos';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {Check, Chip, Conector, Cruz, Destello, IconoTrazado, Lienzo, OSCURO, Particulas, Pulso, VERDE, aparece, flota, muelle} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos): texto "criba" (cae con un vaivén que se calma, como por un tamiz),
// golpe "naipe" (la palabra se da la vuelta como una carta que se descubre) y flecha "radar" (onda de luz que se expande).
// Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original). Sin ráfagas ni trazos sobre los títulos.
const ESTILO: Estilo = {texto: 'criba', golpe: 'naipe', impacto: 'garabato', sub: 'criba', flecha: 'radar'};

export const DURACION_E10 = 82.64;
const FPS = 25;
const fr = (s: number) => Math.round(s * FPS);
// stem "sfx": se renderiza sin la voz del vídeo (la voz y la música se mezclan y masterizan aparte)
const STEM = (getInputProps() as {stem?: string}).stem;

// ---------------- Cámara: tracking de la cara + zooms con curva (plano fijo a cámara) ----------------
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
// Álvaro sentado a la mesa: la cara algo por debajo del tercio superior, para dejar arriba (fondo oscuro) el sitio de los gráficos
const BASE = 1.12;
const OBJ_X = 540;
const OBJ_Y = 700;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.0, 0.36, 'golpe'],
  [0.6, 1.06, 0.25, 'golpe'],
  [1.4, 1.02, 0.6, 'suave'],
  [3.32, 1.05, 0.3, 'golpe'],
  [3.92, 1.08, 0.2, 'golpe'],
  [4.7, 1.03, 0.6, 'suave'],
  [6.64, 1.08, 0.2, 'golpe'],
  [7.52, 1.12, 0.2, 'golpe'],
  [8.3, 1.03, 0.8, 'suave'],
  [11.0, 1.07, 1.2, 'suave'],
  [13.68, 1.12, 0.2, 'golpe'],
  [14.6, 1.03, 0.8, 'suave'],
  [16.0, 1.07, 1.0, 'suave'],
  [20.04, 1.12, 0.2, 'golpe'],
  [20.76, 1.02, 0.5, 'golpe'],
  [22.0, 1.06, 1.5, 'suave'],
  [24.68, 1.03, 1.0, 'suave'],
  [27.2, 1.08, 1.2, 'suave'],
  [30.8, 1.04, 0.8, 'suave'],
  [33.04, 1.09, 0.3, 'golpe'],
  [34.2, 1.04, 1.0, 'suave'],
  [36.0, 1.08, 0.8, 'suave'],
  [38.4, 1.13, 0.2, 'golpe'],
  [39.4, 1.04, 0.8, 'suave'],
  [40.52, 1.09, 0.25, 'golpe'],
  [41.6, 1.04, 0.9, 'suave'],
  [44.0, 1.08, 0.3, 'golpe'],
  [45.0, 1.03, 1.5, 'suave'],
  [47.56, 1.07, 1.2, 'suave'],
  [49.08, 1.11, 0.25, 'golpe'],
  [50.0, 1.04, 1.0, 'suave'],
  [51.52, 1.1, 0.25, 'golpe'],
  [52.2, 1.03, 1.0, 'suave'],
  [53.2, 1.09, 0.3, 'golpe'],
  [54.2, 1.04, 1.5, 'suave'],
  [57.0, 1.08, 1.4, 'suave'],
  [58.52, 1.12, 0.2, 'golpe'],
  [59.4, 1.04, 0.6, 'suave'],
  [61.0, 1.13, 0.2, 'golpe'],
  [61.6, 1.04, 0.8, 'suave'],
  [63.32, 1.08, 1.4, 'suave'],
  [65.0, 1.12, 0.25, 'golpe'],
  [66.0, 1.03, 1.0, 'suave'],
  [68.44, 1.07, 1.0, 'suave'],
  [69.72, 1.11, 0.25, 'golpe'],
  [70.4, 1.04, 1.0, 'suave'],
  [72.88, 1.08, 1.0, 'suave'],
  [74.3, 1.03, 1.2, 'suave'],
  [76.36, 1.07, 1.0, 'suave'],
  [77.92, 1.12, 0.25, 'golpe'],
  [78.9, 1.04, 0.6, 'suave'],
  [79.76, 1.1, 0.25, 'golpe'],
  [80.3, 1.04, 1.0, 'suave'],
  [81.6, 1.1, 0.25, 'golpe'],
  [82.2, 1.06, 0.4, 'suave'],
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
// Temblor corto en las palabras clave del hook y en los impactos fuertes
const IMPACTOS = [0.6, 3.92, 6.64, 7.52, 13.68, 20.04, 38.4, 61.0];
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

// Sin B-roll: plano fijo de Álvaro mirando a cámara (indicación del cliente); no hay cortes
const CORTES: number[] = [];

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
const sm2 = (k: number) => k * k * (3 - 2 * k);
// Iconos: Material Icons revisados a ojo en un fotograma antes de usarlos
const ICONO = {
  ...ICONO10,
  sofa: 'M21 10c-1.1 0-2 .9-2 2v3H5v-3c0-1.1-.9-2-2-2s-2 .9-2 2v5c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2zm-3-5H6c-1.1 0-2 .9-2 2v2.15c1.16.41 2 1.52 2 2.83V14h12v-2.03c0-1.3.84-2.4 2-2.82V7c0-1.1-.9-2-2-2z',
  robot: 'M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z',
  maletin: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
  bandera: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  reloj: 'M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z',
  cumplir: 'M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.22l1.44-1.44A9.9 9.9 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39l-1.61 1.61z',
  calendario: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  regalo: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
  birrete: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
};
const ROSA_SUAVE = '#ff8a95';
const TINTA = '#1b1b20';

// Rótulo «PARA QUIÉN NO ES» / «PARA QUIÉN ES»: una placa que se da la vuelta como una carta (el mismo objeto cambia de lado)
const Rotulo: React.FC<{t: number; en: number; y: number; inicial: 'no' | 'es'; flip?: number; marca?: number}> = ({t, en, y, inicial, flip, marca}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 0);
  const fl = flota(t, 0.4, 3);
  let lado = inicial;
  let sx = 1;
  let brillo = 0;
  if (flip !== undefined && t >= flip) {
    const m = muelle(t, flip, 1.7, 6.5);
    sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * m)));
    if (m >= 0.5) lado = inicial === 'no' ? 'es' : 'no';
    brillo = Math.exp(-4 * (t - flip)) * 0.8;
  }
  const txt = lado === 'no' ? 'PARA QUIÉN NO ES' : 'PARA QUIÉN ES';
  const col = lado === 'no' ? ROSA_SUAVE : VERDE;
  const ancho = 128 + txt.length * 31.5;
  const x0 = -ancho / 2;
  const enMarca = flip !== undefined && t >= flip ? flip + 0.25 : en + 0.3;
  const late = marca !== undefined && t >= marca ? 1 + 0.07 * Math.sin((t - marca) * 16) * Math.exp(-(t - marca) * 4) : 1;
  return (
    <g transform={`translate(540 ${y + fl.y}) scale(${ap.sx * sx * fl.s * late} ${ap.sy * fl.s * late})`} opacity={ap.op}>
      <rect x={x0} y={-52} width={ancho} height={104} rx={52} fill={OSCURO} stroke={col} strokeWidth={5}
        style={{filter: `drop-shadow(0 0 ${14 + 30 * brillo}px ${col})`}} />
      <g transform={`translate(${x0 + 56} 0)`}>
        <circle r={34} fill={col} />
        {lado === 'no' ? <Cruz t={t} en={enMarca} s={0.72} color={TINTA} /> : <Check t={t} en={enMarca} s={0.62} color={TINTA} />}
      </g>
      <text x={x0 + 108} y={17} fontFamily="Montserrat" fontWeight={900} fontSize={48} fill="#fff">{txt}</text>
    </g>
  );
};

// Placa de "no encaja": tarjeta con su icono; al decir "no es para ti"/"tampoco" le sale una ✕ rosa suave
// y se aparta con suavidad (se inclina, baja un poco y se apaga), sin dramatismo
const TarjetaNo: React.FC<{t: number; en: number; x: number; y: number; d: string; marca: number; fuera: number; children?: React.ReactNode}> = ({
  t, en, x, y, d, marca, fuera, children,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 8);
  const fl = flota(t, x / 200, 4);
  const aparta = sm2(lim((t - marca - 0.35) / 0.5));
  const vuela = sm2(lim((t - fuera) / 0.45));
  const op = ap.op * (1 - 0.5 * aparta) * (1 - vuela);
  const badge = aparece(t, marca, 20);
  return (
    <g transform={`translate(${x} ${y + fl.y + 26 * aparta + 260 * vuela}) rotate(${(x < 540 ? -6 : 6) * aparta + (x < 540 ? -14 : 14) * vuela}) scale(${ap.sx} ${ap.sy})`} opacity={op}>
      <rect x={-170} y={-100} width={340} height={200} rx={30} fill={OSCURO} stroke="rgba(255,255,255,0.85)" strokeWidth={4} />
      <IconoTrazado d={d} t={t} en={en + 0.1} color="#fff" size={136} x={-68} y={-78} />
      {children}
      {t >= marca && (
        <g transform={`translate(150 -84) scale(${badge.sx} ${badge.sy}) rotate(${badge.rot})`}>
          <circle r={36} fill={ROSA_SUAVE} stroke="#fff" strokeWidth={4} />
          <Cruz t={t} en={marca + 0.05} s={0.72} color={TINTA} />
        </g>
      )}
    </g>
  );
};

// 1) PARA QUIÉN NO ES / PARA QUIÉN ES (8,72–39,7): la placa del rótulo se queda arriba y, en "ahora bien", se da la vuelta.
// Dos tarjetas que no encajan (sofá: ganar dinero sin hacer nada; robot que trae clientes solo) se apartan;
// después tres huecos se van llenando con los requisitos (negocio de servicios, herramientas de IA, parte comercial y entrega)
// y, en "un buen punto de partida", se juntan en una bandera
const CRIT = {
  a: 8.72, b: 39.7, rotulo: 8.76, flip: 20.76,
  n1: 9.2, nada: 12.64, n1x: 13.68, n2: 14.8, clientes: 17.24, n2x: 20.04,
  huecos: 21.1, e1: 23.36, e1ok: 23.92, e2: 27.2, e2ia: 28.36, e2ok: 30.16, e3: 33.04, e3b: 33.68, e3c: 36.0, e3ok: 36.44, junta: 37.86, partida: 38.4,
};
const X3 = [250, 540, 830];
const Y3 = 300;
const Criterios: React.FC<{t: number}> = ({t}) => {
  const c = CRIT;
  const junta = sm2(lim((t - c.junta) / 0.45));
  const hueco = (i: number) => {
    const en = c.huecos + i * 0.1;
    if (t < en) return null;
    const ap = aparece(t, en, 0);
    return <circle key={`h${i}`} cx={X3[i]} cy={Y3} r={70 * ap.sx} fill="rgba(16,16,20,0.55)" stroke="rgba(255,255,255,0.55)" strokeWidth={4} strokeDasharray="12 12" strokeDashoffset={-t * 30} />;
  };
  const ok = (i: number, en: number) => {
    if (t < en) return null;
    const ap = aparece(t, en, 16);
    return (
      <g key={`ok${i}`}>
        <Pulso t={t} en={en} x={X3[i] + 54} y={Y3 - 54} r={28} color={VERDE} />
        <g transform={`translate(${X3[i] + 54} ${Y3 - 54}) scale(${ap.sx} ${ap.sy})`}>
          <circle r={28} fill={VERDE} stroke="#fff" strokeWidth={4} />
          <Check t={t} en={en + 0.04} s={0.5} color={TINTA} />
        </g>
        <Particulas t={t} en={en} x={X3[i] + 54} y={Y3 - 54} n={7} radio={70} colores={[VERDE, '#fff']} />
      </g>
    );
  };
  // los requisitos se juntan hacia el centro y dejan paso a la bandera
  const junto = (i: number, nodo: React.ReactNode) => {
    const dx = (540 - X3[i]) * junta;
    const s = 1 - 0.75 * junta;
    return <g key={`j${i}`} opacity={1 - junta} transform={`translate(${dx} 0) translate(${X3[i]} ${Y3}) scale(${s}) translate(${-X3[i]} ${-Y3})`}>{nodo}</g>;
  };
  // gotas de "clientes" que llegan solas al robot por una cinta de puntos (lo que NO es)
  const gota = (k: number) => {
    const en = c.clientes + k * 0.32;
    const p = sm2(lim((t - en) / 0.55));
    if (t < en || t >= c.flip) return null;
    const x = 166 - 104 * p;
    return (
      <g key={`g${k}`} transform={`translate(${x} ${52 - 8 * Math.sin(p * Math.PI)})`} opacity={lim((t - en) / 0.1) * (1 - 0.6 * p)}>
        <circle r={25} fill={C.amarillo} stroke="#fff" strokeWidth={3} />
        <g transform="translate(-15 -15) scale(1.25)"><path d={ICONO.persona} fill={TINTA} /></g>
      </g>
    );
  };
  return (
    <Ventana suave t={t} a={c.a} b={c.b}>
      <Lienzo>
        <Rotulo t={t} en={c.rotulo} y={120} inicial="no" flip={c.flip} />
        {/* lo que NO es */}
        <TarjetaNo t={t} en={c.n1} x={290} y={Y3} d={ICONO.sofa} marca={c.n1x} fuera={c.flip}>
          {/* zzz que suben del sofá */}
          {[0, 1, 2].map((k) => {
            const en = c.nada + k * 0.18;
            if (t < en) return null;
            const ciclo = ((t - en) / 1.6) % 1;
            const s = (0.55 + k * 0.18) * Math.min(1, (t - en) / 0.2);
            return (
              <path key={k} transform={`translate(${80 + k * 26 + 8 * Math.sin(ciclo * 6)} ${-44 - k * 26 - ciclo * 26}) scale(${s * 1.25})`} d="M -10 -10 L 10 -10 L -10 10 L 10 10"
                fill="none" stroke={C.amarillo} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={1 - ciclo * 0.7} />
            );
          })}
        </TarjetaNo>
        <TarjetaNo t={t} en={c.n2} x={790} y={Y3} d={ICONO.robot} marca={c.n2x} fuera={c.flip + 0.08}>
          <path d="M 60 52 L 166 52" stroke="rgba(255,255,255,0.4)" strokeWidth={4} strokeDasharray="4 10" strokeLinecap="round" opacity={t >= c.clientes ? 1 : 0} />
          {[0, 1, 2].map(gota)}
        </TarjetaNo>
        {/* lo que SÍ es */}
        {t >= c.flip && [0, 1, 2].map((i) => junto(i, hueco(i)))}
        {junto(0, <Chip key="c1" t={t} en={c.e1} d={ICONO.maletin} x={X3[0]} y={Y3} r={70} fase={0.2} />)}
        {junto(0, ok(0, c.e1ok))}
        {junto(1, <Chip key="c2" t={t} en={c.e2} d={ICONO.herramienta} x={X3[1]} y={Y3} r={70} fase={1.1} />)}
        {t >= c.e2ia && junto(1, <Chip key="c2b" t={t} en={c.e2ia} d={ICONO.ia} x={X3[1] - 56} y={Y3 + 52} r={30} fondo={OSCURO} color={C.amarillo} quieto sinRafaga />)}
        {junto(1, ok(1, c.e2ok))}
        {/* tercer requisito: comercial → hablar con clientes → entrega (el icono cambia al ritmo de la voz) */}
        {t >= c.e3 && t < c.e3b && junto(2, <Chip key="c3a" t={t} en={c.e3} d={ICONO.megafono} x={X3[2]} y={Y3} r={70} fase={2} />)}
        {t >= c.e3b && t < c.e3c && junto(2, <Chip key="c3b" t={t} en={c.e3b} d={ICONO.chat} x={X3[2]} y={Y3} r={70} fase={2} sinRafaga />)}
        {t >= c.e3c && junto(2, <Chip key="c3c" t={t} en={c.e3c} d={ICONO.caja} x={X3[2]} y={Y3} r={70} fase={2} sinRafaga />)}
        {junto(2, ok(2, c.e3ok))}
        {/* "un buen punto de partida": la bandera */}
        <Chip t={t} en={c.partida} d={ICONO.bandera} x={540} y={Y3} r={82} fondo={VERDE} color="#fff" fase={0.7} />
        <Destello t={t} en={c.partida + 0.15} x={640} y={Y3 - 90} tam={30} color={C.amarillo} />
        <Destello t={t} en={c.partida + 0.25} x={440} y={Y3 - 60} tam={22} />
      </Lienzo>
    </Ventana>
  );
};

// 2) "una agencia de IA no es simplemente abrir una herramienta y esperar que lleguen clientes": la herramienta se abre
// (el icono se despliega en una ventana) y al lado un reloj de arena se va volteando; entre ambos, tres puntos de espera
const HERR = {a: 40.0, b: 44.0, app: 40.1, abrir: 41.32, esperar: 42.48, lleguen: 43.04};
const Herramienta: React.FC<{t: number}> = ({t}) => {
  const {a, b, app, abrir, esperar, lleguen} = HERR;
  const abre = muelle(t, abrir, 2.2, 6.5);
  const fl = flota(t, 0.3, 4);
  const giros = t >= esperar ? Math.floor((t - esperar) / 0.7) + muelle(t, esperar + Math.floor((t - esperar) / 0.7) * 0.7, 2.4, 7) : 0;
  const apR = aparece(t, esperar, 12);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          {t < abrir ? (
            <Chip t={t} en={app} d={ICONO.herramienta} x={380} y={280} r={66} fase={0.3} />
          ) : (
            <g transform={`translate(380 280) scale(${0.3 + 0.7 * abre})`}>
              <rect x={-200} y={-125} width={400} height={250} rx={26} fill={OSCURO} stroke="#fff" strokeWidth={5} />
              <rect x={-200} y={-125} width={400} height={50} rx={26} fill="rgba(255,255,255,0.12)" />
              {[0, 1, 2].map((k) => <circle key={k} cx={-168 + k * 28} cy={-100} r={8} fill={k === 0 ? ROSA_SUAVE : k === 1 ? C.amarillo : VERDE} />)}
              {[0, 1, 2].map((k) => {
                const p = lim((t - abrir - 0.2 - k * 0.1) / 0.3);
                return <rect key={k} x={-160} y={-40 + k * 50} width={[300, 220, 260][k] * p} height={20} rx={10} fill="rgba(255,255,255,0.28)" />;
              })}
            </g>
          )}
          {t >= abrir && <Particulas t={t} en={abrir} x={380} y={280} n={10} radio={230} />}
          {/* tres puntos de espera */}
          {t >= lleguen && [0, 1, 2].map((k) => {
            const ap = aparece(t, lleguen + k * 0.08, 0);
            const late = 0.55 + 0.45 * Math.max(0, Math.sin((t - lleguen) * 6 - k * 0.9));
            return <circle key={k} cx={628 + k * 34} cy={280} r={10 * ap.sx} fill="#fff" opacity={late} />;
          })}
          {/* reloj de arena que se voltea */}
          {t >= esperar && (
            <g transform={`translate(830 280) scale(${apR.sx} ${apR.sy}) rotate(${giros * 180})`}>
              <circle r={70} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
              <g transform="translate(-40 -40) scale(3.33)"><path d={ICONO.reloj} fill={TINTA} /></g>
            </g>
          )}
          <Pulso t={t} en={esperar} x={830} y={280} r={70} color={C.amarillo} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 3) "necesitas entender qué vendes, a quién se lo vendes, por qué esa empresa debería contratarte y cómo vas a cumplir":
// cuatro pilares suben del suelo uno a uno (cada uno con su icono) y, en "servicio", el tejado cae encima y la agencia queda en pie
const PIL = {a: 44.0, b: 52.4, tejado: 44.1, pasos: [45.12, 46.16, 47.16, 50.2], cae: 51.52};
const XP = [270, 450, 630, 810];
const ICP = [ICONO.etiqueta, ICONO.diana, ICONO.edificio, ICONO.cumplir];
const Pilares: React.FC<{t: number}> = ({t}) => {
  const {a, b, tejado, pasos, cae} = PIL;
  const suelo = 1 - Math.pow(1 - lim((t - tejado) / 0.5), 3);
  const baja = muelle(t, cae, 2.2, 7);
  const tejY = t < cae ? -70 + Math.sin(t * 2.2) * 6 : -70 * (1 - baja);
  const asentado = t >= cae;
  const fl = flota(t, 0.9, 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          {/* suelo */}
          <path d="M 160 412 L 920 412" stroke="#fff" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - suelo} />
          {/* tejado: primero flota en trazo discontinuo; al decir "servicio" cae con un muelle y se rellena */}
          {t >= tejado && (
            <g transform={`translate(0 ${tejY})`} opacity={lim((t - tejado) / 0.3)}>
              <path d="M 170 196 L 540 92 L 910 196 Z" fill={asentado ? 'rgba(16,16,20,0.92)' : 'rgba(16,16,20,0.35)'} stroke={asentado ? C.amarillo : 'rgba(255,255,255,0.7)'} strokeWidth={6}
                strokeLinejoin="round" strokeDasharray={asentado ? undefined : '16 12'} style={{filter: asentado ? `drop-shadow(0 0 16px ${C.amarillo})` : 'none'}} />
              <g transform="translate(518 128) scale(1.85)"><path d={ICONO.edificio} fill={asentado ? C.amarillo : 'rgba(255,255,255,0.6)'} /></g>
            </g>
          )}
          {/* pilares */}
          {pasos.map((en, i) => {
            if (t < en) return null;
            const sube = muelle(t, en, 2.3, 6.5);
            const h = 200 * sube;
            const x = XP[i];
            return (
              <g key={i}>
                <rect x={x - 34} y={408 - h} width={68} height={h} rx={10} fill="rgba(16,16,20,0.92)" stroke="#fff" strokeWidth={4} />
                <Chip t={t} en={en + 0.12} d={ICP[i]} x={x} y={300} r={44} fase={i} quieto sinRafaga />
                <Particulas t={t} en={en} x={x} y={404} n={6} radio={60} />
              </g>
            );
          })}
          {asentado && <Particulas t={t} en={cae + 0.08} x={540} y={200} n={18} radio={330} />}
          <Destello t={t} en={cae + 0.2} x={540} y={70} tam={30} color={C.amarillo} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 4) "un curso introductorio de 14 clases": el birrete y una escalera de catorce peldaños que se levantan uno a uno
// mientras lo dice (el último justo en "14") y se encienden en ola en "clases" (cada clase, un paso)
const ESC = {a: 57.3, b: 59.36, curso: 57.48, primero: 57.62, catorce: 58.52, clases: 59.0};
const Escalera: React.FC<{t: number}> = ({t}) => {
  const {a, b, curso, primero, catorce, clases} = ESC;
  const paso = (catorce - primero) / 13;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={curso} d={ICONO.birrete} x={175} y={320} r={62} fase={0.4} />
        {Array.from({length: 14}, (_, i) => {
          const en = primero + i * paso;
          if (t < en) return null;
          const sube = muelle(t, en, 2.8, 8);
          const h = (44 + i * 15) * sube;
          const x = 262 + i * 46;
          const ola = t >= clases ? Math.max(0, Math.sin((t - clases) * 9 - i * 0.55)) : 0;
          return (
            <g key={i}>
              <rect x={x} y={404 - h} width={42} height={h} rx={6} fill={ola > 0.5 ? C.amarillo : 'rgba(16,16,20,0.92)'} stroke="#fff" strokeWidth={3} />
              <rect x={x} y={404 - h} width={42} height={7} rx={3} fill={C.amarillo} />
            </g>
          );
        })}
        <Pulso t={t} en={catorce} x={882} y={180} r={40} color={C.amarillo} />
        <Particulas t={t} en={catorce} x={882} y={180} n={12} radio={150} />
        <Destello t={t} en={clases} x={900} y={140} tam={26} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 5) "después de comprarlo podrás reservar una consultoría gratuita para conocer nuestro programa de mentoría":
// una ficha de reserva con tres horas; al decir "reservar" se marca una (✓), en "gratuita" salta el regalo y,
// en "mentoría", un conector la une con el mentor; al "seguir profundizando" giran a su alrededor libro, chat y diana
const RES = {a: 66.6, b: 73.7, ficha: 66.7, reservar: 68.44, gratuita: 69.72, conocer: 70.36, mentoria: 71.52, profundizar: 72.88};
const Reserva: React.FC<{t: number}> = ({t}) => {
  const {a, b, ficha, reservar, gratuita, conocer, mentoria, profundizar} = RES;
  const ap = aparece(t, ficha, -6);
  const fl = flota(t, 0.2, 4);
  const marcada = t >= reservar;
  const apM = aparece(t, reservar, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {t >= ficha && (
          <g transform={`translate(330 ${270 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
            <rect x={-200} y={-135} width={400} height={270} rx={28} fill={OSCURO} stroke="#fff" strokeWidth={5} />
            <g transform="translate(-172 -118) scale(2)"><path d={ICONO.calendario} fill={C.amarillo} /></g>
            <rect x={-104} y={-104} width={180} height={16} rx={8} fill="rgba(255,255,255,0.45)" />
            {[0, 1, 2].map((k) => {
              const yy = -40 + k * 58;
              const sel = k === 1 && marcada;
              return (
                <g key={k} transform={sel ? `translate(0 ${yy}) scale(${0.92 + 0.08 * apM.sx}) translate(0 ${-yy})` : undefined}>
                  <rect x={-168} y={yy - 21} width={336} height={42} rx={21} fill={sel ? C.amarillo : 'rgba(255,255,255,0.12)'} />
                  <rect x={-146} y={yy - 7} width={[90, 110, 80][k]} height={14} rx={7} fill={sel ? TINTA : 'rgba(255,255,255,0.4)'} />
                  {sel && <g transform={`translate(138 ${yy})`}><Check t={t} en={reservar + 0.08} s={0.45} color={TINTA} /></g>}
                </g>
              );
            })}
            <Pulso t={t} en={reservar} x={0} y={18} r={60} color={C.amarillo} />
          </g>
        )}
        {/* "gratuita": el regalo salta en la esquina de la ficha */}
        <Chip t={t} en={gratuita} d={ICONO.regalo} x={520} y={150} r={42} fondo={VERDE} color="#fff" fase={1.3} />
        {/* conector hacia el mentor */}
        <Conector t={t} en={conocer} d="M 540 300 C 610 380, 680 380, 738 312" color={C.amarillo} dur={0.5} flujo grosor={7} punta={[738, 312, -0.86]} />
        <Chip t={t} en={mentoria} d={ICONO.persona} x={820} y={262} r={76} fase={0.8} />
        {t >= mentoria && <Chip t={t} en={mentoria + 0.15} d={ICONO.birrete} x={872} y={200} r={30} fondo={OSCURO} color={C.amarillo} quieto sinRafaga />}
        {/* profundizar: tres fichas pequeñas orbitan alrededor del mentor */}
        {[ICONO.libro, ICONO.chat, ICONO.diana].map((d, k) => {
          const en = profundizar + k * 0.1;
          if (t < en) return null;
          const g = (t - profundizar) * 1.6 + (k * 2 * Math.PI) / 3;
          const e = aparece(t, en, 0);
          const x = 820 + Math.cos(g) * 128;
          const y = 262 + Math.sin(g) * 70;
          return (
            <g key={k} transform={`translate(${x} ${y}) scale(${e.sx} ${e.sy})`}>
              <circle r={28} fill={C.amarillo} stroke="#fff" strokeWidth={3} />
              <g transform="translate(-16 -16) scale(1.33)"><path d={d} fill={TINTA} /></g>
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 6) "y estás dispuesto a tomártelo en serio": vuelve la placa «PARA QUIÉN ES» y late en "serio"
const VUELTA = {a: 77.2, b: 78.9, en: 77.3, serio: 78.52};
const Vuelta: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={VUELTA.a} b={VUELTA.b}>
    <Lienzo>
      <Rotulo t={t} en={VUELTA.en} y={250} inicial="es" marca={VUELTA.serio} />
      <Particulas t={t} en={VUELTA.serio} x={540} y={250} n={16} radio={360} colores={[VERDE, '#fff']} />
      <Destello t={t} en={VUELTA.serio + 0.1} x={860} y={190} tam={28} color={C.amarillo} />
    </Lienzo>
  </Ventana>
);

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => (/^IA[.,]?$/.test(s) ? 'IA' : s.toLowerCase().replace(/[.,:]/g, ''));

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
// Todo el texto grande va arriba, sobre el fondo oscuro (la camiseta blanca no deja leer letras blancas a la altura del pecho)
const rosaFuerte: React.CSSProperties = {...rosa, textShadow: glow('255,177,191', 1.3)};
const GRANDES: Grande[] = [
  // HOOK 1/3: he preparado un curso sobre cómo funcionan
  {a: 0.04, b: 1.98, top: 66, lineas: [{ws: [['he', 0.04], ['preparado', 0.16]], size: 80}, {ws: [['un curso', 0.6, amarillo]], size: 160, golpe: true}, {ws: [['sobre', 1.0], ['cómo', 1.32], ['funcionan', 1.56]], size: 80}]},
  // HOOK 2/3: las agencias de inteligencia artificial por 1 €
  {a: 2.24, b: 4.6, top: 56, lineas: [{ws: [['las', 2.24], ['agencias', 2.3], ['de', 2.64]], size: 76}, {ws: [['inteligencia', 2.76]], size: 88}, {ws: [['artificial', 3.32]], size: 88}, {ws: [['por 1 €', 3.92, amarillo]], size: 140, golpe: true}]},
  // HOOK 3/3: quiero explicarte para quién es y para quién no
  {a: 5.84, b: 8.68, top: 1000, lineas: [{ws: [['quiero', 5.84], ['explicarte', 6.08]], size: 80}, {ws: [['para quién es', 6.64, amarillo]], size: 120, golpe: true}, {ws: [['y para quién no', 7.52, rosaFuerte]], size: 120, golpe: true}]},
  // que puedes conseguir por solo 1 €
  {a: 59.5, b: 61.48, top: 1000, lineas: [{ws: [['que', 59.5], ['puedes', 59.6], ['conseguir', 59.88]], size: 80}, {ws: [['por', 60.4], ['solo', 60.64]], size: 96}, {ws: [['1 €', 61.0, amarillo]], size: 180, golpe: true}]},
];
const LISTA: [number, number] = [-10, -10];
// CTA (tiempos sílaba a sílaba con la forma de onda): "haz clic aquí abajo ↓", y la frase sigue en subtítulos
const CTA = 78.9;
const CTA_PAL: [string, number][] = [['haz', 78.96], ['clic', 79.24], ['aquí', 79.52], ['abajo', 79.76]];
const CTA_FLECHA = 79.92;
const CTA_FIN = 80.26; // empieza "y accede al curso por 1 €"
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes (en ninguna zona: al recolocarse por la zona segura pueden acabar en la misma): si la
// siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr[i + 1];
  // (nunca antes de su última palabra: si no, esa palabra no se vería)
  const ultima = Math.max(...g.lineas.flatMap((l) => l.ws.map((w) => w[1] as number)));
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, ultima + 0.2, n.a - SALIDA - 0.02);
});
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
const tapado = (x: number) => (x >= CTA - 0.01 && x < CTA_FIN) || GRANDES.some((g) => x >= g.a - 0.2 && x < g.b) || (x >= LISTA[0] - 0.01 && x < LISTA[1]);

// Subtítulos: solo las palabras que no están en grande. Primero se separa por frases (punto, coma, interrogación,
// pausa o titular) y cada frase se reparte en bloques equilibrados de 2-4 palabras que caben en UNA línea.
const MAX_CAR = 18; // ~780 px a 70 px: no llega a la columna de botones de Instagram (x≈930)
const MAX_LARGO = 25; // solo si así se evita un bloque de una palabra (el subtítulo se ajusta para caber en una línea)
// cortes de frase por sentido: "si lo que quieres es / descubrir una forma / de ganar dinero / sin hacer / absolutamente nada",
// "un sistema automático / que te consiga clientes", "inteligencia artificial / para resolver problemas…", "y cómo vamos a cumplir…"
const CORTE_FRASE = new Set<number>([9.92, 10.88, 11.6, 11.96, 15.44, 16.52, 17.84, 19.04, 22.0, 23.2, 25.84, 26.72, 28.96, 30.8, 32.08, 32.64, 35.12, 35.76, 36.32, 38.32, 40.52, 50.0, 51.24, 68.88, 70.16, 74.24, 75.4, 76.96]);
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
      if (trozo.length > 1 && textoBloque(trozo) > MAX_LARGO) continue;
      const c = coste[i] + 1 + (trozo.length === 1 && n > 1 ? 10 : 0) + (textoBloque(trozo) > MAX_CAR ? 5 : 0) + Math.abs(textoBloque(trozo) - 14) / 20;
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
    if (w[3] || /[,?:]$/.test(w[0]) || !sig || sig[1] - w[2] > 0.3 || tapado(sig[1]) || CORTE_FRASE.has(sig[1])) {
      frases.push(cur);
      cur = [];
    }
  });
  const out: {a: number; b: number; ws: W[]}[] = [];
  frases.flatMap(repartir).forEach((ws) => {
    const ult = ws[ws.length - 1];
    const sig = WS[WS.indexOf(ult) + 1];
    let finB = sig ? Math.min(sig[1], ult[2] + 0.8) : Math.min(DURACION_E10, ult[2] + 0.6);
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
const CLAVE = new Set(['compres', 'nada', 'automático', 'esfuerzo', 'servicios', 'herramientas', 'empresas', 'comercial', 'entrega', 'partida', 'herramienta', 'vendes', 'contratarte', 'servicio', 'entiendas', 'curso', '14', 'clases', 'funcionamiento', 'resultados', 'consultoría', 'gratuita', 'mentoría', 'serio', '1 €']);

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
  if (SIN_TEXTO) return null;
  const hay = (x: number) => BLOQUES.some((bq) => x >= bq.a && x < bq.b);
  const op = Math.max(...[-4, -2, 0, 2, 4].map((d) => (hay(t + d * F) ? 1 - Math.abs(d) / 6 : 0)));
  const bl = BLOQUES.find((x) => t >= x.a && t < x.b);
  return (
    <>
      {op > 0 && <FondoSub opacidad={op} />}
      {bl && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: Math.min(70, Math.floor(760 / (textoBloque(bl.ws) * 0.6))), fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
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
// Legibilidad: las líneas de apoyo nunca bajan de 72 px; si no caben, se parten en dos líneas (no se encogen)
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
const topSeguro = (top: number, lineas: Linea[], baja: boolean, a = -1, b = -1) => {
  // además, sin pisar los elementos animados que estén en pantalla a la vez (arriba o abajo)
  const [arriba, abajo] = hueco(ZONAS as Zona[], a, b, ARRIBA, ABAJO);
  return Math.max(arriba, Math.min(Math.max(top, arriba), abajo - lineas.flatMap(partir).reduce((s, l) => s + tamLinea(l, baja) * 1.02 + 4, 0)));
};
const FraseGrande: React.FC<{t: number; g: Grande}> = ({t, g}) => SIN_TEXTO ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: topSeguro(g.top, g.lineas, g.top < ARRIBA, g.a, g.b + SALIDA) - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = tamLinea(l, g.top < ARRIBA);
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

// Tramos con letras detrás de la persona: solo mientras hay titular detrás (su recorte del chroma va encima)
const DETRAS: [number, number][] = []; // el hook va por encima de la cabeza: no hace falta recorte

export const ReelE10: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 3);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E10)} layout="none">
            <Video src={staticFile('e10/e10.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande sobre la cabeza, sobre el fondo oscuro (no tapan la cara) */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e10/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
      </ConTransicion>

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(3).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      {/* key por fotograma: cada gráfico se monta de nuevo en cada fotograma (en el render de vídeo Chrome dejaba restos
          de los fotogramas anteriores —anillos y estelas— al mover y encoger fichas dentro del SVG con sombra) */}
      <ZonaSegura t={t} zonas={ZONAS}><Criterios key={`cr${frame}`} t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Herramienta key={`he${frame}`} t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Pilares key={`pi${frame}`} t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Escalera key={`es${frame}`} t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Reserva key={`re${frame}`} t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Vuelta key={`vu${frame}`} t={t} /></ZonaSegura>
      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con la flecha en la misma línea, justo después de "abajo" */}
      <Ventana t={t} a={SIN_TEXTO ? 1e9 : CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          {CTA_PAL.map(([w, en]) => (
            <Sube key={w} t={t} en={en} style={w === 'abajo' ? amarillo : undefined}>{w}</Sube>
          ))}
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < CTA_FLECHA ? 0 : 1, ...flechaV(ESTILO.flecha, t, CTA_FLECHA)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): impactos, gráficos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, ...CTA_PAL.map(([, en]) => en)].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        // hook
        ['hit', 0.04, -2], ['pop', 0.6, -6], ['swish', 2.24, -11], ['cineboom', 3.92, -4], ['swoosh2', 5.84, -11], ['boom', 6.64, -5], ['snappy', 7.52, -6],
        // para quién no es
        ['reveal', 8.76, -10], ['popup', 9.2, -8], ['burbuja', 12.64, -10], ['negativo', 13.68, -10], ['popup', 14.8, -8], ['datos', 15.96, -12], ['burbuja2', 17.24, -10], ['negativo', 20.04, -10],
        // ahora bien: la placa se da la vuelta
        ['swoosh3', 20.76, -8], ['exito', 21.0, -10],
        // para quién es
        ['popup', 23.36, -8], ['confirmar', 23.92, -9], ['popup', 27.2, -8], ['pop', 28.36, -10], ['confirmar', 30.16, -9],
        ['popup', 33.04, -8], ['tap', 33.68, -9], ['tap', 36.0, -9], ['confirmar', 36.44, -9], ['swish', 37.86, -12], ['exito', 38.4, -8], ['twinkle', 38.6, -10],
        // herramienta
        ['pop', 40.1, -9], ['slide2', 41.32, -10], ['popup', 42.48, -9], ['tings', 43.04, -12],
        // pilares
        ['swoosh2', 44.1, -12], ['popup', 45.12, -8], ['popup', 46.16, -8], ['popup', 47.16, -8], ['popup', 50.2, -8], ['thud', 51.52, -8], ['twinkle', 51.72, -10],
        // 14 clases
        ['pop', 57.48, -8], ['puntos', 57.62, -11], ['popup', 58.52, -9], ['ding', 59.0, -10],
        ['cineboom', 61.0, -4],
        // reserva y mentoría
        ['reveal', 66.7, -11], ['tap', 68.44, -6], ['confirmar', 68.52, -9], ['pop', 69.72, -8], ['swish', 70.36, -12], ['exito', 71.52, -9], ['twinkle', 72.88, -10],
        // tomártelo en serio
        ['reveal', 77.3, -11], ['exito', 78.52, -9],
        ['ding', 81.6, -10],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
