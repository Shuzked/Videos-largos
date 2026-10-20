import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig, Sequence} from 'remotion';
import {Audio} from '@remotion/media';
import {staticFile} from 'remotion';

export const F = 1 / 25; // un fotograma, en segundos

export const ease = {
  pop: Easing.out(Easing.back(2)),
  pop2: Easing.out(Easing.back(1.6)),
  sube: Easing.out(Easing.poly(4)),
  inOut: Easing.inOut(Easing.poly(3)),
  entra: Easing.poly(2),
  lineal: Easing.linear,
};

// Interpolación por tiempo (segundos) con clamp
export const iv = (
  t: number,
  tiempos: number[],
  valores: number[],
  easing: (n: number) => number = Easing.linear,
) =>
  interpolate(t, tiempos, valores, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

// Tiempo global en segundos
export const useT = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};

// Curvas tipo Lottie
const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EXPO_IN = Easing.bezier(0.7, 0, 0.84, 0);
const SPRING = Easing.bezier(0.34, 1.56, 0.64, 1); // pasa un poco y se asienta

// Texto que entra con máscara: sube desde debajo de su línea (7 fotogramas, expo out) y sale hacia arriba por la misma máscara.
// La máscara solo existe mientras se mueve, para no recortar el halo del texto en reposo.
export const Sube: React.FC<{
  t: number;
  en: number;
  dist?: number;
  sale?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({t, en, sale, style, children}) => {
  const p = iv(t, [en, en + 7 * F], [0, 1], EXPO_OUT);
  const s = sale === undefined ? 0 : iv(t, [sale, sale + 6 * F], [0, 1], EXPO_IN);
  const moviendo = (p > 0 && p < 1) || s > 0;
  return (
    <span
      style={{
        display: 'inline-block',
        overflow: moviendo ? 'hidden' : 'visible',
        padding: '0.18em 0.12em 0.1em',
        margin: '-0.18em -0.12em -0.1em',
        verticalAlign: 'bottom',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          opacity: t < en || s >= 1 ? 0 : 1,
          translate: `0px ${(1 - p) * 110 - s * 110}%`,
          rotate: `${(1 - p) * 5}deg`,
          filter: `blur(${(1 - p) * 3}px)`,
          transformOrigin: '0% 100%',
          ...style,
        }}
      >
        {children}
      </span>
    </span>
  );
};

// Pop con rebote corto (6 fotogramas)
export const pop = (t: number, en: number, desde = 0.6) => ({
  opacity: t < en ? 0 : 1,
  scale: iv(t, [en, en + 6 * F], [desde, 1], ease.pop),
});

// Efecto de sonido colocado en el segundo `en`
export const Sfx: React.FC<{src: string; en: number; dur: number; vol: number}> = ({src, en, dur, vol}) => (
  <Sequence from={Math.round(en * 25)} durationInFrames={Math.round(dur * 25)} layout="none">
    <Audio src={staticFile(`sfx/${src}.mp3`)} volume={vol} />
  </Sequence>
);

// Banco de sonidos del usuario: pk = segundo del golpe dentro del archivo, peak = pico en dBFS
const SB: Record<string, {pk: number; dur: number; peak: number; desde?: number; obj?: number}> = {
  whoosh: {pk: 0.51, dur: 1.2, peak: -4, obj: -19},
  slide: {pk: 2.61, dur: 3.0, peak: -12, obj: -20},
  pop: {pk: 0.03, dur: 0.6, peak: -2.9, obj: -18},
  popup: {pk: 0.16, dur: 0.45, peak: -6.1, desde: 0.1},
  click: {pk: 0.01, dur: 0.25, peak: 0, obj: -19},
  glassy: {pk: 0.01, dur: 0.2, peak: -17.4},
  tic: {pk: 0.25, dur: 0.5, peak: 0, obj: -16},
  ticw: {pk: 0.25, dur: 0.3, peak: 0, desde: 0.22, obj: -22}, // TIC de cada palabra de subtítulo
  hit: {pk: 0.6, dur: 1.8, peak: 0, obj: -13},
  boom: {pk: 0.05, dur: 2.5, peak: -7.8, obj: -12},
  thud: {pk: 0.13, dur: 3, peak: -2, obj: -14},
  riser: {pk: 0.75, dur: 0.85, peak: -6.2, obj: -18},
  riserm: {pk: 1.9, dur: 2.0, peak: -10.1, obj: -18},
  suck: {pk: 8.75, dur: 2.9, peak: -7, desde: 6.0, obj: -18},
  snap: {pk: 0.18, dur: 1.2, peak: 0, obj: -17},
  shutter: {pk: 0.56, dur: 0.45, peak: -3, desde: 0.5, obj: -16},
  typing: {pk: 30, dur: 5, peak: -17, desde: 30, obj: -26},
  mouse: {pk: 0.1, dur: 0.2, peak: -1.6, obj: -18},
  switch: {pk: 0.08, dur: 1.5, peak: -1, obj: -14},
  loading: {pk: 0.2, dur: 2, peak: -16.9, obj: -20},
  twinkle: {pk: 0.02, dur: 1.6, peak: -10.8, obj: -19},
  ding: {pk: 0.03, dur: 1.2, peak: -13, obj: -18},
};
export const Son: React.FC<{s: string; en: number; db?: number; dur?: number}> = ({s, en, db = 0, dur}) => {
  const k = SB[s];
  const desde = k.desde ?? 0;
  const inicio = Math.max(0, en - (k.pk - desde));
  const vol = Math.pow(10, ((k.obj ?? -17) + db - k.peak) / 20);
  return (
    <Sequence from={Math.round(inicio * 25)} durationInFrames={Math.round((dur ?? k.dur) * 25)} layout="none">
      <Audio src={staticFile(`sb/${s}.mp3`)} volume={vol} trimBefore={Math.round(desde * 25)} />
    </Sequence>
  );
};

// Muestra a sus hijos solo entre a y b (segundos)
export const Ventana: React.FC<{t: number; a: number; b: number; children: React.ReactNode}> = ({t, a, b, children}) =>
  t >= a && t < b ? <>{children}</> : null;

// Frase en minúsculas palabra a palabra, cada una en su tiempo hablado (estilo "de marketing")
export const Palabras: React.FC<{
  t: number;
  ws: [string, number][];
  sale?: number;
  style?: React.CSSProperties;
  palabra?: (w: string) => React.CSSProperties | undefined;
}> = ({t, ws, sale, style, palabra}) => (
  <div style={{position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.26em', whiteSpace: 'nowrap', ...style}}>
    {ws.map(([w, en], i) => (
      <React.Fragment key={i}>
        <Sube t={t} en={en} dist={22} sale={sale} style={palabra?.(w)}>
          {w}
        </Sube>
        <Son s="ticw" en={en} />
      </React.Fragment>
    ))}
  </div>
);

// Palabra-golpe estilo Lottie: escala con muelle (pasa y se asienta), el tracking se cierra y el desenfoque se limpia;
// sale encogiendo y subiendo con fundido en 6 fotogramas
export const golpe = (t: number, en: number, sale?: number) => {
  const p = Math.min(1, Math.max(0, (t - en) / (10 * F)));
  const e = EXPO_OUT(p);
  const s = sale === undefined ? 0 : iv(t, [sale, sale + 6 * F], [0, 1], EXPO_IN);
  return {
    opacity: t < en ? 0 : Math.min(1, (t - en) / (2 * F)) * (1 - s),
    scale: 0.72 + 0.28 * SPRING(p) - 0.08 * s,
    filter: `blur(${(1 - e) * 6 + s * 8}px)`,
    letterSpacing: `${0.12 * (1 - e) - 0.015}em`,
    translate: `0px ${-30 * s}px`,
  };
};
