import React from 'react';

// Transición calcada del ejemplo del cliente (12 fotogramas, el corte entre el 3 y el 4).
// Medida fotograma a fotograma: zoom, desplazamiento, separación RGB (px a 1080 de ancho corto) y desenfoque.
// Índice 0 = primer fotograma del plano entrante.
const PERFIL: Record<number, {s: number; dx: number; dy: number; rgb: number; blur: number}> = {
  [-3]: {s: 1.0, dx: -1, dy: 1, rgb: 1, blur: 0.6},
  [-2]: {s: 1.0, dx: -2, dy: 1, rgb: 4, blur: 0.6},
  [-1]: {s: 1.014, dx: -20, dy: -5, rgb: 9, blur: 1.8},
  0: {s: 1.031, dx: -26, dy: -14, rgb: 16, blur: 2.2},
  1: {s: 1.03, dx: -24, dy: -12, rgb: 16, blur: 2.2},
  2: {s: 1.012, dx: -7, dy: -4, rgb: 12, blur: 2.0},
  3: {s: 1.004, dx: -1, dy: -1, rgb: 8, blur: 2.0},
  4: {s: 1.003, dx: 0, dy: 0, rgb: 5, blur: 1.8},
  5: {s: 1.003, dx: -1, dy: -2, rgb: 3, blur: 1.5},
  6: {s: 1.0, dx: 1, dy: 1, rgb: 1, blur: 0.6},
  7: {s: 1.0, dx: 0, dy: 0, rgb: 1, blur: 0.3},
};

export const estadoTransicion = (frame: number, cortes: number[], fps = 25) => {
  for (const c of cortes) {
    const k = frame - Math.round(c * fps);
    if (PERFIL[k]) return PERFIL[k];
  }
  return null;
};

// Filtro SVG de separación de canales: rojo a la derecha, azul a la izquierda
export const FiltroRGB: React.FC<{px: number}> = ({px}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id={`rgb-${px}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={px} dy={0} result="r2" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={-px} dy={0} result="b2" />
      <feBlend in="r2" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b2" mode="screen" />
    </filter>
  </svg>
);

// Envuelve las capas de vídeo y les aplica la transición cuando toca (misma estructura siempre, para no remontar los vídeos)
export const ConTransicion: React.FC<{frame: number; cortes: number[]; children: React.ReactNode}> = ({frame, cortes, children}) => {
  const e = estadoTransicion(frame, cortes) ?? {s: 1, dx: 0, dy: 0, rgb: 0, blur: 0};
  return (
    <>
      <FiltroRGB px={e.rgb} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // zoom extra para que el desplazamiento y el desenfoque nunca dejen ver bordes negros
          scale: Math.max(e.s, 1 + (2 * Math.max(Math.abs(e.dx) / 1080, Math.abs(e.dy) / 1920)) + (e.blur > 0 ? (3 * e.blur) / 540 : 0)),
          translate: `${e.dx}px ${e.dy}px`,
          filter: e.rgb > 0 || e.blur > 0 ? `url(#rgb-${e.rgb}) blur(${e.blur}px)` : 'none',
        }}
      >
        {children}
      </div>
    </>
  );
};
