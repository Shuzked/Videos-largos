import {Easing} from 'remotion';
import CARA from './cara.json';

// Posición de la cara (seguimiento a 10 fps, ya suavizado) — por defecto el centro del encuadre
const PTS = CARA as [number, number, number][];
export const cara = (t: number): [number, number] => {
  let lo = 0;
  let hi = PTS.length - 1;
  if (t < PTS[0][0] || t > PTS[hi][0] + 0.2) return [990, 470];
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (PTS[m][0] <= t) lo = m;
    else hi = m;
  }
  const [t0, x0, y0] = PTS[lo];
  const [t1, x1, y1] = PTS[hi];
  // entre tramos (salto de tiempo grande) no se interpola
  if (t1 - t0 > 0.5) return [x0, y0];
  const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
};

// Curvas: "suave" = ease in-out largo y limpio; "golpe" = entrada rápida que frena (expo out)
const SUAVE = Easing.bezier(0.65, 0, 0.35, 1);
const GOLPE = Easing.bezier(0.16, 1, 0.3, 1);

// Fotogramas clave de zoom: [segundo, escala, duración de la transición, curva]
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  // Intro
  [0, 1.0, 0, 'corte'],
  [7.2, 1.12, 0.5, 'suave'],
  [10.4, 1.24, 0.12, 'golpe'],
  [10.88, 1.0, 0, 'corte'],
  [12.56, 1.0, 0, 'corte'],
  [12.6, 1.05, 3.3, 'suave'],
  [16.0, 1.08, 4.6, 'suave'],
  [25.84, 1.1, 0.4, 'golpe'],
  [26.9, 1.03, 0.5, 'suave'],
  [38.72, 1.0, 0, 'corte'],
  [38.8, 1.07, 1.8, 'suave'],
  [58.16, 1.0, 0, 'corte'],
  [58.3, 1.14, 0.6, 'suave'],
  [60.6, 1.0, 0.6, 'suave'],
  [62.8, 1.12, 0.45, 'suave'],
  [64.63, 1.04, 0.5, 'suave'],
  [66.47, 1.14, 0.45, 'suave'],
  [68.87, 1.04, 0.5, 'suave'],
  [71.35, 1.12, 0.45, 'suave'],
  [73.03, 1.06, 0.5, 'suave'],
  [75.27, 1.0, 0, 'corte'],
  [86.56, 1.0, 0, 'corte'], // tarjeta de Instagram y pantalla: sin zoom
  // Resto del vídeo: sin zooms salvo el encuadre del resumen (472,44-483,4)
  [184.64, 1.0, 0, 'corte'],
];

const escala = (t: number) => {
  let v = 1;
  for (const [a, s, d, c] of ZOOM) {
    if (t < a) break;
    if (c === 'corte' || d === 0 || t >= a + d) {
      v = s;
    } else {
      const e = (c === 'golpe' ? GOLPE : SUAVE)((t - a) / d);
      v = v + (s - v) * e;
    }
  }
  return v;
};

// Temblor de 4 fotogramas en el golpe de "YO"
const TEMBLOR: [number, number][] = [[16, -9], [-12, 7], [7, -4], [-3, 2]];

// Transformación de cámara: zoom centrado en la cara, encuadre especial del resumen y límites para no ver bordes
export const camara = (t: number) => {
  const s0 = escala(t);
  const [fx, fy] = cara(t);
  let tx = fx * (1 - s0);
  let ty = fy * (1 - s0);
  let s = s0;
  // Resumen (472,44-483,4): Álvaro a la derecha, a 1,3×
  if (t >= 472.44 && t < 483.4) {
    const r = SUAVE(Math.min(1, (t - 472.44) / 0.5));
    s = s0 + (1.3 - s0) * r;
    tx = tx + (960 * (1 - 1.3) + 288 + 0 - tx) * r;
    ty = ty + (324 * (1 - 1.3) - ty) * r;
  }
  const k = Math.floor((t - 10.4) * 25);
  const [sx, sy] = k >= 0 && k < TEMBLOR.length ? TEMBLOR[k] : [0, 0];
  // nunca enseñar bordes: el encuadre escalado siempre cubre 1920×1080
  tx = Math.min(0, Math.max(1920 * (1 - s), tx + sx));
  ty = Math.min(0, Math.max(1080 * (1 - s), ty + sy));
  return {s, tx, ty};
};
