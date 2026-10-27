import React from 'react';
import {staticFile} from 'remotion';
import {FiltroRGB} from '../a1/transicion';

// Transición calcada de los cortes del usuario (29,28 s y 1:14,92 de su vídeo), fotograma a fotograma:
// el último fotograma saliente con separación RGB; el plano entrante llega ampliado (~1,1×), girado en perspectiva
// (la izquierda más cerca) y con los bordes curvados como una lente gran angular, con RGB fuerte durante 2 fotogramas;
// en los 2 siguientes se endereza y en otros 3 desaparece el RGB. Índice 0 = primer fotograma entrante.
// k = curvatura de barril; el zoom s cubre siempre la curvatura y el giro para que nunca se vean bordes.
type Estado = {gy: number; s: number; k: number; rgb: number; blur: number};
const PERFIL: Record<number, Estado> = {
  [-1]: {gy: 0, s: 1.0, k: 0, rgb: 8, blur: 0.8},
  0: {gy: 5, s: 1.13, k: 0.04, rgb: 14, blur: 1.4},
  1: {gy: 4, s: 1.11, k: 0.035, rgb: 12, blur: 1.1},
  2: {gy: 1.5, s: 1.045, k: 0.015, rgb: 8, blur: 0.6},
  3: {gy: 0.5, s: 1.015, k: 0.005, rgb: 5, blur: 0.3},
  4: {gy: 0, s: 1.004, k: 0, rgb: 3, blur: 0},
  5: {gy: 0, s: 1.0, k: 0, rgb: 1, blur: 0},
};
const NADA: Estado = {gy: 0, s: 1, k: 0, rgb: 0, blur: 0};

// Un corte puede ser solo de entrada (el saliente ya lleva su propia transición) o solo de salida (el entrante es un
// corte del propio usuario, que ya trae la suya): así nunca se duplica.
export type Corte = number | {t: number; solo?: 'entrada' | 'salida'}; // objeto = sin whoosh propio

export const estadoUsuario = (frame: number, cortes: Corte[], fps = 25): Estado | null => {
  for (const c of cortes) {
    const tc = typeof c === 'number' ? c : c.t;
    const k = frame - Math.round(tc * fps);
    if (!PERFIL[k]) continue;
    if (typeof c !== 'number' && ((c.solo === 'entrada' && k < 0) || (c.solo === 'salida' && k >= 0))) continue;
    return PERFIL[k];
  }
  return null;
};

// Lente de barril: mapa de desplazamiento fijo (public/medios/barril.png) escalado según la curvatura del fotograma
const FiltroBarril: React.FC<{k: number}> = ({k}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id={`barril-${k}`} filterUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080} colorInterpolationFilters="sRGB">
      <feImage href={staticFile('medios/barril.png')} x={0} y={0} width={1920} height={1080} preserveAspectRatio="none" result="mapa" />
      <feDisplacementMap in="SourceGraphic" in2="mapa" scale={4800 * k} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export const TransicionUsuario: React.FC<{frame: number; cortes: Corte[]; fondo?: string; children: React.ReactNode}> = ({frame, cortes, fondo = '#050506', children}) => {
  const e = estadoUsuario(frame, cortes) ?? NADA;
  const filtros = [e.k > 0 ? `url(#barril-${e.k})` : '', e.rgb > 0 ? `url(#rgb-${e.rgb})` : '', e.blur > 0 ? `blur(${e.blur}px)` : ''].filter(Boolean).join(' ');
  return (
    <div style={{position: 'absolute', inset: 0, background: e.gy ? fondo : undefined, perspective: 1700, overflow: 'hidden'}}>
      <FiltroRGB px={e.rgb} />
      {e.k > 0 && <FiltroBarril k={e.k} />}
      <div style={{position: 'absolute', inset: 0, transform: `rotateY(${e.gy}deg) scale(${e.s})`, transformOrigin: '50% 50%', filter: filtros || 'none'}}>
        {children}
      </div>
    </div>
  );
};
