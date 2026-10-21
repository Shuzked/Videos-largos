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

// ---------------- Piezas comunes de los reels nuevos (A9/A10): úsalas en todos los gráficos ----------------
const C_AMARILLO = '#feffbc';
export const ROJO = '#ff4d5e';
export const VERDE = '#2ee59d';
export const OSCURO = 'rgba(16,16,20,0.9)';
export const SOMBRA_ICONOS = 'drop-shadow(0 3px 10px rgba(0,0,0,0.75))';

// Lienzo SVG a tamaño del vídeo (coordenadas del fotograma 1080x1920)
export const Lienzo: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA_ICONOS}}>
    {children}
  </svg>
);

// Ficha redonda con icono: sale con muelle (aplastar/estirar y giro que se asienta), el icono se traza y se rellena,
// lanza un pulso y una ráfaga de partículas, y después flota
export const Chip: React.FC<{t: number; en: number; d: string; x: number; y: number; r?: number; color?: string; fondo?: string; fase?: number; quieto?: boolean; sinRafaga?: boolean}> = ({
  t, en, d, x, y, r = 62, color = '#1b1b20', fondo = C_AMARILLO, fase = 0, quieto, sinRafaga,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 14);
  const fl = quieto ? {y: 0, s: 1} : flota(t, fase, 4);
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={r} color={fondo.startsWith('rgba') ? '#fff' : fondo} />
      <g transform={`scale(${ap.sx * fl.s} ${ap.sy * fl.s}) rotate(${ap.rot})`}>
        <circle r={r} fill={fondo} stroke="#fff" strokeWidth={5} />
        <IconoTrazado d={d} t={t} en={en + 2 * F} color={color} size={r * 1.1} x={-r * 0.55} y={-r * 0.55} />
      </g>
      {!sinRafaga && <Particulas t={t} en={en} x={0} y={0} n={8} radio={r * 1.9} colores={[fondo.startsWith('rgba') || fondo === '#fff' ? C_AMARILLO : fondo, '#ffffff']} />}
    </g>
  );
};

// Conector que se dibuja (curva de salida rápida) y, ya dibujado, deja correr puntos por él (flujo).
// punta = [x, y, ángulo] para rematarlo con una punta de flecha orientada (usa la tangente del final del trazo)
export const Conector: React.FC<{t: number; en: number; d: string; color?: string; dur?: number; flujo?: boolean; grosor?: number; punta?: [number, number, number]}> = ({
  t, en, d, color = '#fff', dur = 0.45, flujo, grosor = 7, punta,
}) => {
  const p = 1 - Math.pow(1 - lim((t - en) / dur), 3);
  if (p <= 0) return null;
  const ap = aparece(t, en + dur, 0);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      {flujo && p >= 1 && <path d={d} fill="none" stroke="#fff" strokeWidth={grosor} strokeLinecap="round" pathLength={1} strokeDasharray="0.03 0.12" strokeDashoffset={-(t - en) * 0.6} opacity={0.9} />}
      {punta && p >= 1 && (
        <g transform={`translate(${punta[0]} ${punta[1]}) scale(${ap.sx} ${ap.sy}) translate(${-punta[0]} ${-punta[1]})`}>
          <path d={puntaFlecha(punta[0], punta[1], punta[2], 26, 18)} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

// ✓ que se traza
export const Check: React.FC<{t: number; en: number; s?: number; color?: string}> = ({t, en, s = 1, color = '#fff'}) => {
  const p = lim((t - en) / (6 * F));
  if (p <= 0) return null;
  return <path d={`M ${-24 * s} ${2 * s} L ${-7 * s} ${19 * s} L ${26 * s} ${-16 * s}`} stroke={color} strokeWidth={11 * s} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />;
};

// ✕ que se traza (dos trazos seguidos)
export const Cruz: React.FC<{t: number; en: number; s?: number; color?: string}> = ({t, en, s = 1, color = '#fff'}) => {
  const p1 = lim((t - en) / (4 * F)), p2 = lim((t - en - 3 * F) / (4 * F));
  if (p1 <= 0) return null;
  return (
    <g stroke={color} strokeWidth={11 * s} strokeLinecap="round" fill="none">
      <path d={`M ${-18 * s} ${-18 * s} L ${18 * s} ${18 * s}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p1} />
      {p2 > 0 && <path d={`M ${18 * s} ${-18 * s} L ${-18 * s} ${18 * s}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p2} />}
    </g>
  );
};

// Estrella de cinco puntas (path centrado en 0,0)
export const estrella = (r: number) =>
  Array.from({length: 10}, (_, i) => {
    const g = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'} ${(Math.cos(g) * rr).toFixed(1)} ${(Math.sin(g) * rr).toFixed(1)}`;
  }).join(' ') + ' Z';

// Interrogación grande y legible (nunca un icono pequeño): el gancho se dibuja con trazo grueso, el punto cae con un muelle,
// sale con aplastar/estirar y un giro que se asienta, lanza un pulso y se balancea en reposo. Contorno oscuro para leerse sobre cualquier fondo.
const GANCHO = 'M -27 -34 C -27 -70, 27 -70, 27 -34 C 27 -10, 0 -6, 0 20';
export const Interrogante: React.FC<{t: number; en: number; x: number; y: number; s?: number; color?: string; fase?: number}> = ({t, en, x, y, s = 1, color = '#fff', fase = 0}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 18);
  const traza = 1 - Math.pow(1 - lim((t - en) / (7 * F)), 3);
  const punto = muelle(t, en + 5 * F, 3, 8);
  const fl = flota(t, fase, 5);
  const vaiven = Math.sin(t * 3.1 + fase) * 7;
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={-10 * s} r={50 * s} color={color} />
      <g transform={`scale(${ap.sx * s * fl.s} ${ap.sy * s * fl.s}) rotate(${ap.rot + vaiven})`}>
        <g style={{filter: `drop-shadow(0 0 10px ${color})`}}>
          <path d={GANCHO} fill="none" stroke="rgba(10,10,14,0.85)" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza} />
          <path d={GANCHO} fill="none" stroke={color} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza} />
          {punto > 0 && (
            <g transform={`translate(0 ${46 - (1 - punto) * 26}) scale(${Math.max(0, punto)})`}>
              <circle r={15} fill="rgba(10,10,14,0.85)" />
              <circle r={10.5} fill={color} />
            </g>
          )}
        </g>
      </g>
      <Particulas t={t} en={en + 5 * F} x={0} y={0} n={8} radio={95 * s} colores={[color, C_AMARILLO]} />
    </g>
  );
};

// Exclamación grande y legible (alerta), mismo lenguaje que Interrogante
export const Exclamacion: React.FC<{t: number; en: number; x: number; y: number; s?: number; color?: string; fase?: number}> = ({t, en, x, y, s = 1, color = ROJO, fase = 0}) => {
  if (t < en) return null;
  const ap = aparece(t, en, -14);
  const traza = 1 - Math.pow(1 - lim((t - en) / (6 * F)), 3);
  const punto = muelle(t, en + 4 * F, 3, 8);
  const fl = flota(t, fase, 5);
  const vaiven = Math.sin(t * 3.4 + fase) * 6;
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={-6 * s} r={46 * s} color={color} />
      <g transform={`scale(${ap.sx * s * fl.s} ${ap.sy * s * fl.s}) rotate(${ap.rot + vaiven})`}>
        <g style={{filter: `drop-shadow(0 0 10px ${color})`}}>
          <path d="M 0 -62 L 0 16" fill="none" stroke="rgba(10,10,14,0.85)" strokeWidth={30} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza} />
          <path d="M 0 -62 L 0 16" fill="none" stroke={color} strokeWidth={19} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza} />
          {punto > 0 && (
            <g transform={`translate(0 ${44 - (1 - punto) * 24}) scale(${Math.max(0, punto)})`}>
              <circle r={15} fill="rgba(10,10,14,0.85)" />
              <circle r={10.5} fill={color} />
            </g>
          )}
        </g>
      </g>
      <Particulas t={t} en={en + 4 * F} x={0} y={0} n={8} radio={90 * s} colores={[color, C_AMARILLO]} />
    </g>
  );
};
