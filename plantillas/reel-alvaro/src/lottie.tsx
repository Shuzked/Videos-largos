import React from 'react';
import {F} from './anim';

// Animación estilo Lottie para los elementos gráficos de los reels (iconos, fichas, flechas, marcadores).
// Reglas: nada entra ni sale de golpe; anticipación antes del gesto, sobrepaso con muelle amortiguado al llegar,
// aplastar/estirar en los botes, movimiento secundario (partículas, destellos) y un pequeño movimiento en reposo.

const lim = (x: number) => Math.min(1, Math.max(0, x));

// Muelle amortiguado 0 → 1 con sobrepaso (frecuencia en oscilaciones por segundo, amortiguación por segundo)
export const muelle = (t: number, en: number, frec = 2.6, amort = 7): number => {
  const k = t - en;
  if (k <= 0) return 0;
  return 1 - Math.exp(-amort * k) * Math.cos(2 * Math.PI * frec * k);
};

// Aparición con anticipación: encoge un poco antes, sale con muelle y se asienta. Devuelve escala x/y (aplastar/estirar) y giro.
export const aparece = (t: number, en: number, giro = 0) => {
  const k = t - en;
  if (k < -3 * F) return {sx: 0, sy: 0, rot: 0, op: 0};
  if (k < 0) {
    // anticipación: el hueco "respira" hacia dentro justo antes de aparecer
    return {sx: 0, sy: 0, rot: 0, op: 0};
  }
  const m = muelle(t, en, 2.4, 6.5);
  const v = Math.exp(-6.5 * k) * Math.sin(2 * Math.PI * 2.4 * k); // velocidad aproximada del muelle → deformación
  return {sx: m * (1 + 0.16 * v), sy: m * (1 - 0.16 * v), rot: giro * (1 - lim(k / 0.5)) * Math.cos(k * 12), op: lim(k / (3 * F))};
};

// Salida suave: encoge y se desvanece (0 = visible, 1 = fuera)
export const sale = (t: number, b: number, dur = 7) => lim((t - (b - dur * F)) / (dur * F));

// Movimiento en reposo: flota y respira un poco para que nada se quede congelado
export const flota = (t: number, fase = 0, amp = 6) => ({y: Math.sin(t * 2.1 + fase) * amp, s: 1 + Math.sin(t * 3.3 + fase * 1.7) * 0.015});

// Icono que se dibuja con el trazo y después se rellena (paths de 24x24)
export const IconoTrazado: React.FC<{d: string; t: number; en: number; color: string; size: number; x?: number; y?: number; grosor?: number}> = ({
  d, t, en, color, size, x = 0, y = 0, grosor = 1.1,
}) => {
  const trazo = lim((t - en) / (9 * F));
  const relleno = lim((t - en - 5 * F) / (6 * F));
  if (t < en) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 24})`}>
      <path d={d} fill={color} fillOpacity={relleno} stroke={color} strokeWidth={grosor} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - trazo} />
    </g>
  );
};

// Ráfaga de partículas (puntos y destellos) que salen de un punto, frenan y caen un poco; determinista
export const Particulas: React.FC<{t: number; en: number; x: number; y: number; n?: number; radio?: number; colores?: string[]; dur?: number}> = ({
  t, en, x, y, n = 10, radio = 120, colores = ['#ffd60a', '#ffffff'], dur = 18,
}) => {
  const k = (t - en) / (dur * F);
  if (k <= 0 || k >= 1) return null;
  const e = 1 - Math.pow(1 - k, 3);
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const ang = (i / n) * Math.PI * 2 + ((i * 37) % 11) * 0.06;
        const v = radio * (0.65 + ((i * 53) % 7) / 14);
        const px = x + Math.cos(ang) * v * e;
        const py = y + Math.sin(ang) * v * e + 40 * k * k;
        const r = (i % 3 === 0 ? 7 : 4.5) * (1 - k * 0.8);
        return i % 4 === 0 ? (
          <path key={i} transform={`translate(${px} ${py}) rotate(${k * 180}) scale(${r / 6})`} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" fill={colores[0]} opacity={1 - k} />
        ) : (
          <circle key={i} cx={px} cy={py} r={r} fill={colores[i % colores.length]} opacity={(1 - k) * 0.95} />
        );
      })}
    </g>
  );
};

// Anillo que se expande y se desvanece (pulso al activarse algo)
export const Pulso: React.FC<{t: number; en: number; x: number; y: number; r: number; color: string; dur?: number}> = ({t, en, x, y, r, color, dur = 14}) => {
  const k = (t - en) / (dur * F);
  if (k <= 0 || k >= 1) return null;
  const e = 1 - Math.pow(1 - k, 3);
  return <circle cx={x} cy={y} r={r * (1 + 0.6 * e)} fill="none" stroke={color} strokeWidth={6 * (1 - k) + 1} opacity={1 - k} />;
};

// Destello de cuatro puntas que aparece, gira y se apaga
export const Destello: React.FC<{t: number; en: number; x: number; y: number; tam?: number; color?: string}> = ({t, en, x, y, tam = 26, color = '#fff'}) => {
  const k = (t - en) / (14 * F);
  if (k <= 0 || k >= 1) return null;
  const s = Math.sin(k * Math.PI);
  return <path transform={`translate(${x} ${y}) rotate(${k * 90}) scale(${(tam / 12) * s})`} d="M0 -12 L2.6 -2.6 L12 0 L2.6 2.6 L0 12 L-2.6 2.6 L-12 0 L-2.6 -2.6 Z" fill={color} />;
};

// Punta de flecha orientada según la tangente al final de un trazo (para que nunca apunte al revés)
export const puntaFlecha = (x: number, y: number, ang: number, largo = 26, ancho = 18) => {
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const bx = x - ux * largo, by = y - uy * largo;
  return `M ${bx - uy * ancho} ${by + ux * ancho} L ${x} ${y} L ${bx + uy * ancho} ${by - ux * ancho}`;
};

// Iconos 24x24 revisados a ojo (hoja PruebaIconos): usar estos en lugar de dibujarlos a mano
export const ICONOS = {
  lupa: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  clienteNuevo: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  portatil: 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
  megafono: 'M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z',
  etiqueta: 'M21.41 11.41l-8.83-8.83c-.37-.37-.88-.58-1.41-.58H4c-1.1 0-2 .9-2 2v7.17c0 .53.21 1.04.59 1.41l8.83 8.83c.78.78 2.05.78 2.83 0l7.17-7.17c.78-.78.78-2.04-.01-2.83zM6.5 8C5.67 8 5 7.33 5 6.5S5.67 5 6.5 5 8 5.67 8 6.5 7.33 8 6.5 8z',
};
