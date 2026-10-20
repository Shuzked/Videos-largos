import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import React from 'react';

const pesos: [string, string][] = [
  ['400', 'Regular'],
  ['500', 'Medium'],
  ['700', 'Bold'],
  ['800', 'ExtraBold'],
  ['900', 'Black'],
];
for (const [weight, nombre] of pesos) {
  loadFont({family: 'Montserrat', url: staticFile(`fonts/Montserrat-${nombre}.ttf`), weight});
}

export const C = {
  amarillo: '#feffbc',
  brillo: '#ffff5f',
  rosa: '#ffb1bf',
  crema: '#fffdea',
  grafico: '#1d1d1f',
  degradado: 'linear-gradient(135deg, #634125 0%, #522a2a 40%, #451330 75%, #31132f 100%)',
  oscuro: 'radial-gradient(circle at 50% 40%, #2a2a2e 0%, #1d1d1f 60%, #151517 100%)',
};

// Etalonaje ligero de la cámara (contraste, saturación, un punto cálido)
export const GRADE = 'contrast(1.12) saturate(0.96) sepia(0.04) brightness(0.93)';

export const lleno: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'};

export const titular: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  fontWeight: 900,
  textTransform: 'uppercase',
  lineHeight: 0.92,
  letterSpacing: '-0.01em',
  whiteSpace: 'nowrap',
};

// Halo de luz alrededor del texto (como en los ejemplos: blanco brillante con resplandor suave)
export const glow = (rgb = '255,255,255', k = 1) =>
  `0 0 8px rgba(${rgb},${0.6 * k}), 0 0 28px rgba(${rgb},${0.45 * k}), 0 0 80px rgba(${rgb},${0.25 * k})`;
export const GLOW_AMARILLO = '254,255,140';
export const LIMA = '#D1FE17';
