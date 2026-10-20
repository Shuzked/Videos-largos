import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, GLOW_AMARILLO, glow} from './estilo';
import {F, golpe, iv} from './anim';

// ---------- Estilos de texto (referencias: titular blanco con halo + línea secundaria fina) ----------
export const H: React.CSSProperties = {
  fontWeight: 900,
  textTransform: 'uppercase',
  lineHeight: 0.92,
  letterSpacing: '-0.015em',
  textShadow: glow(),
  whiteSpace: 'nowrap',
};
export const SUB: React.CSSProperties = {fontWeight: 500, fontSize: 60, letterSpacing: '-0.01em', textShadow: glow('255,255,255', 0.55)};
export const MIN: React.CSSProperties = {fontWeight: 500, fontSize: 72, letterSpacing: '-0.01em', textShadow: glow('255,255,255', 0.5)};
export const amarillo: React.CSSProperties = {color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 1.1)};
export const rosa: React.CSSProperties = {color: C.rosa, textShadow: glow('255,177,191', 1)};
export const LOGO_GLOW = 'drop-shadow(0 0 14px rgba(209,254,23,0.55)) drop-shadow(0 0 46px rgba(209,254,23,0.3))';
export const CLAUDE_GLOW = 'drop-shadow(0 0 12px rgba(255,255,255,0.45)) drop-shadow(0 0 40px rgba(217,119,87,0.35))';

// Logos reales
export const LogoHiggsfield: React.FC<{w: number; style?: React.CSSProperties}> = ({w, style}) => (
  <Img src={staticFile('logos/higgsfield-logo.svg')} style={{width: w, filter: LOGO_GLOW, ...style}} />
);
export const IconoHiggsfield: React.FC<{w: number; style?: React.CSSProperties}> = ({w, style}) => (
  <Img src={staticFile('logos/higgsfield-icono.svg')} style={{width: w, height: w, filter: LOGO_GLOW, ...style}} />
);
export const LogoClaude: React.FC<{w: number; style?: React.CSSProperties}> = ({w, style}) => (
  <Img src={staticFile('logos/claude-logo-blanco.svg')} style={{width: w, filter: CLAUDE_GLOW, ...style}} />
);
export const IconoClaude: React.FC<{w: number; style?: React.CSSProperties}> = ({w, style}) => (
  <Img src={staticFile('logos/claude-icono.svg')} style={{width: w, filter: 'drop-shadow(0 0 24px rgba(217,119,87,0.7))', ...style}} />
);

// Oscurece la cámara (viñeta + degradado inferior) para que el halo del texto destaque
export const Oscuro: React.FC<{t: number; a: number; b: number; fuerza?: number}> = ({t, a, b, fuerza = 1}) => (
  <AbsoluteFill
    style={{
      opacity: fuerza * Math.min(iv(t, [a, a + 4 * F], [0, 1]), iv(t, [b - 4 * F, b], [1, 0])),
      background:
        'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
    }}
  />
);

// Texto plano de un nodo (para medir frases)
const textoDe = (n: React.ReactNode): string =>
  typeof n === 'string' || typeof n === 'number'
    ? String(n)
    : Array.isArray(n)
      ? n.map(textoDe).join('')
      : React.isValidElement(n)
        ? textoDe((n.props as {children?: React.ReactNode}).children)
        : '';

// Palabras-golpe que se sustituyen en el mismo sitio
export const Rotativo: React.FC<{
  t: number;
  items: [React.ReactNode, number][];
  fin: number;
  top: number;
  size: number;
  style?: React.CSSProperties;
}> = ({t, items, fin, top, size, style}) => {
  let i = -1;
  items.forEach(([, en], k) => {
    if (t >= en) i = k;
  });
  if (i < 0 || t >= fin + 5 * F) return null;
  // Ajusta el tamaño para que la frase quepa en el ancho seguro (Montserrat Black ≈ 0,78 em por letra)
  const letras = textoDe(items[i][0]).length;
  const tam = letras ? Math.min(size, 1720 / (letras * 0.78)) : size;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: top + (size - tam) * 0.5, textAlign: 'center', ...H, fontSize: tam, ...golpe(t, items[i][1], i === items.length - 1 ? fin : undefined), ...style}}>
      {items[i][0]}
    </div>
  );
};

// Grano animado sutil (ruido), cambia cada fotograma
export const Ruido: React.FC<{id: string; opacidad?: number}> = ({id, opacidad = 0.12}) => {
  const f = useCurrentFrame() % 8;
  return (
    <AbsoluteFill style={{opacity: opacidad, mixBlendMode: 'overlay'}}>
      <svg width="100%" height="100%">
        <filter id={`${id}-${f}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f + 1} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id}-${f})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Fondo de motion graphics: negro cálido con un foco de luz que deriva despacio + grano
export const FondoMG: React.FC<{t: number; a: number; id: string; opacity?: number}> = ({t, a, id, opacity = 1}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, #1c1c20 0%, #0e0e10 65%, #030303 100%)', opacity}}>
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.07), transparent 45%)',
        translate: `${Math.sin((t - a) * 0.6) * 220}px ${Math.cos((t - a) * 0.45) * 90 - 60}px`,
      }}
    />
    <Ruido id={id} />
  </AbsoluteFill>
);

// Rayo de aberración RGB durante 2 fotogramas
export const rgb = (t: number, en: number, px = 10, base = 'none') =>
  t >= en && t < en + 2 * F ? `-${px}px 0 0 rgba(255,40,60,0.85), ${px}px 0 0 rgba(40,230,255,0.85)` : base;
