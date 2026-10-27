import React from 'react';
import {F} from '../anim';
import {LIMA} from '../estilo';
import {Check, Cruz, Particulas, Pulso, ROJO, VERDE, aparece} from '../lottie';

// Iconos planos estilo Flaticon (dos tonos + brillo) con animación estilo Lottie: entran con muelle (aplastar/estirar y
// giro que se asienta), sus piezas se mueven (la aguja barre, la claqueta golpea, el ✓ se traza…) y sueltan pulso y
// ráfaga. Todos van centrados en (0,0) dentro de un <svg>; <Ico> los mete en un <svg> para usarlos en HTML.
const lim = (x: number) => Math.min(1, Math.max(0, x));
const OSC = '#16161b';
const LIMA_OSC = '#94b80c';
const BRILLO = 'rgba(255,255,255,0.35)';

export const Ico: React.FC<{tam: number; style?: React.CSSProperties; children: React.ReactNode}> = ({tam, style, children}) => (
  <svg width={tam} height={tam} viewBox={`${-tam / 2} ${-tam / 2} ${tam} ${tam}`} style={{overflow: 'visible', flex: 'none', ...style}}>
    {children}
  </svg>
);

// ✓ / ✗ en un círculo verde o rojo con borde inferior más oscuro y brillo; el símbolo se traza
export const Insignia: React.FC<{t: number; en: number; r: number; bien: boolean; rafaga?: boolean}> = ({t, en, r, bien, rafaga = true}) => {
  if (t < en) return null;
  const ap = aparece(t, en, bien ? -12 : 12);
  const base = bien ? VERDE : ROJO;
  const sombra = bien ? '#17a06d' : '#c22c3c';
  return (
    <g>
      <Pulso t={t} en={en + 4 * F} x={0} y={0} r={r} color={base} />
      <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
        <circle r={r} fill={sombra} />
        <circle r={r * 0.9} cy={-r * 0.06} fill={base} />
        <ellipse cx={-r * 0.36} cy={-r * 0.42} rx={r * 0.26} ry={r * 0.13} fill={BRILLO} transform={`rotate(-35 ${-r * 0.36} ${-r * 0.42})`} />
        <g transform={`translate(0 ${-r * 0.04})`}>
          {bien ? <Check t={t} en={en + 3 * F} s={r / 40} color="#fff" /> : <Cruz t={t} en={en + 3 * F} s={r / 34} color="#fff" />}
        </g>
      </g>
      {rafaga && <Particulas t={t} en={en + 3 * F} x={0} y={0} n={8} radio={r * 2.3} colores={[base, '#ffffff']} dur={14} />}
    </g>
  );
};

// cronómetro: cuerpo lima, esfera oscura; la aguja barre media vuelta (30 s de 60) dejando una cuña de color
export const Cronometro: React.FC<{t: number; en: number; r: number; vuelta?: number}> = ({t, en, r, vuelta = 0.5}) => {
  if (t < en) return null;
  const ap = aparece(t, en, -10);
  const k = t - en;
  const fin = 1.15;
  const barrido = 1 - Math.pow(1 - lim((k - 0.25) / (fin - 0.25)), 3);
  const ang = barrido * vuelta * 360;
  const a = ((ang - 90) * Math.PI) / 180;
  const R = r * 0.74;
  const cuña = barrido > 0.001
    ? `M 0 0 L 0 ${-R} A ${R} ${R} 0 ${ang > 180 ? 1 : 0} 1 ${Math.cos(a) * R} ${Math.sin(a) * R} Z`
    : '';
  const tic = k > fin ? Math.max(0, 1 - (k - fin) / 0.3) : 0; // destello al llegar
  return (
    <g>
      <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
        {/* botones */}
        <rect x={-r * 0.09} y={-r * 1.2} width={r * 0.18} height={r * 0.25} fill={OSC} />
        <rect x={-r * 0.26} y={-r * 1.38} width={r * 0.52} height={r * 0.2} rx={r * 0.08} fill={LIMA_OSC} />
        <rect x={-r * 0.26} y={-r * 1.38} width={r * 0.52} height={r * 0.12} rx={r * 0.06} fill={LIMA} />
        <g transform="rotate(42)"><rect x={-r * 0.1} y={-r * 1.2} width={r * 0.2} height={r * 0.24} rx={r * 0.05} fill={OSC} /></g>
        {/* cuerpo y esfera */}
        <circle r={r} fill={LIMA_OSC} />
        <circle r={r * 0.94} cy={-r * 0.05} fill={LIMA} />
        <circle r={R + r * 0.04} fill="#0d0d10" />
        <circle r={R} fill={OSC} />
        {cuña && <path d={cuña} fill={LIMA} opacity={0.32 + 0.3 * tic} />}
        {Array.from({length: 12}, (_, i) => {
          const g = (i / 12) * Math.PI * 2;
          const largo = i % 3 === 0 ? 0.2 : 0.11;
          return <line key={i} x1={Math.sin(g) * R * (0.92 - largo)} y1={-Math.cos(g) * R * (0.92 - largo)} x2={Math.sin(g) * R * 0.92} y2={-Math.cos(g) * R * 0.92}
            stroke="#fff" strokeOpacity={i % 3 === 0 ? 0.95 : 0.5} strokeWidth={r * (i % 3 === 0 ? 0.06 : 0.04)} strokeLinecap="round" />;
        })}
        <line x1={0} y1={0} x2={Math.cos(a) * R * 0.82} y2={Math.sin(a) * R * 0.82} stroke="#fff" strokeWidth={r * 0.075} strokeLinecap="round" />
        <circle r={r * 0.1} fill={LIMA} />
        <ellipse cx={-r * 0.5} cy={-r * 0.62} rx={r * 0.22} ry={r * 0.1} fill={BRILLO} transform={`rotate(-40 ${-r * 0.5} ${-r * 0.62})`} />
      </g>
      <Pulso t={t} en={en + fin} x={0} y={0} r={r} color={LIMA} />
      <Particulas t={t} en={en + fin} x={0} y={0} n={10} radio={r * 2.2} colores={[LIMA, '#ffffff']} dur={16} />
    </g>
  );
};

// claqueta: la barra se abre y da el golpe (ráfaga y pulso en el golpe)
export const Claqueta: React.FC<{t: number; en: number; r: number; id: string}> = ({t, en, r, id}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 8);
  const k = t - en;
  const golpe = 0.72;
  const abre = k < 0.2 ? 0 : k < 0.45 ? (k - 0.2) / 0.25 : k < golpe ? 1 : 0;
  const rebote = k >= golpe ? Math.exp(-(k - golpe) * 14) * Math.sin((k - golpe) * 40) * 4 : 0;
  const giro = -30 * (1 - Math.pow(1 - abre, 2)) + rebote;
  const W = r * 1.9, x0 = -W / 2, hB = r * 0.26;
  const yBarra = -r * 0.42;
  const rayas = (y: number, h: number, desfase: number) =>
    Array.from({length: 7}, (_, i) => {
      const w = W / 6, x = x0 + i * w - desfase;
      return i % 2 ? null : <path key={i} d={`M ${x} ${y} L ${x + w} ${y} L ${x + w - h * 0.7} ${y + h} L ${x - h * 0.7} ${y + h} Z`} fill="#fff" />;
    });
  const sacude = k >= golpe ? Math.exp(-(k - golpe) * 10) * Math.sin((k - golpe) * 60) * r * 0.03 : 0;
  return (
    <g>
      <defs>
        <clipPath id={`${id}a`}><rect x={x0} y={yBarra} width={W} height={hB} rx={r * 0.05} /></clipPath>
        <clipPath id={`${id}b`}><rect x={x0} y={yBarra - hB - r * 0.02} width={W} height={hB} rx={r * 0.05} /></clipPath>
      </defs>
      <g transform={`translate(${sacude} 0) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
        {/* cuerpo */}
        <rect x={x0} y={yBarra + hB * 0.6} width={W} height={r * 1.18} rx={r * 0.1} fill="#0d0d10" />
        <rect x={x0} y={yBarra + hB * 0.6} width={W} height={r * 1.1} rx={r * 0.1} fill="#2a2a31" />
        {[0.38, 0.62].map((f, i) => (
          <rect key={i} x={x0 + r * 0.16} y={yBarra + hB + r * f} width={W * (i ? 0.45 : 0.7)} height={r * 0.08} rx={r * 0.04} fill="#fff" opacity={0.35} />
        ))}
        <circle cx={x0 + W - r * 0.28} cy={yBarra + hB + r * 0.5} r={r * 0.11} fill={LIMA} />
        {/* barra fija */}
        <rect x={x0} y={yBarra} width={W} height={hB} rx={r * 0.05} fill={OSC} />
        <g clipPath={`url(#${id}a)`}>{rayas(yBarra, hB, 0)}</g>
        {/* barra que golpea (bisagra a la izquierda) */}
        <g transform={`rotate(${giro} ${x0} ${yBarra})`}>
          <rect x={x0} y={yBarra - hB - r * 0.02} width={W} height={hB} rx={r * 0.05} fill={OSC} />
          <g clipPath={`url(#${id}b)`}>{rayas(yBarra - hB - r * 0.02, hB, W / 12)}</g>
        </g>
        <circle cx={x0 + r * 0.06} cy={yBarra} r={r * 0.07} fill={LIMA} />
      </g>
      <Pulso t={t} en={en + golpe} x={0} y={yBarra} r={r * 0.9} color={LIMA} />
      <Particulas t={t} en={en + golpe} x={x0 + W * 0.85} y={yBarra} n={10} radio={r * 1.8} colores={[LIMA, '#ffffff']} dur={14} />
    </g>
  );
};

// avatar: silueta en dos tonos sobre un círculo de color
export const Avatar: React.FC<{t: number; en: number; r: number; fondo?: string; id: string}> = ({t, en, r, fondo = LIMA, id}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 10);
  return (
    <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
      <defs><clipPath id={id}><circle r={r} /></clipPath></defs>
      <circle r={r} fill={fondo} />
      <ellipse cx={-r * 0.45} cy={-r * 0.55} rx={r * 0.3} ry={r * 0.14} fill={BRILLO} transform={`rotate(-35 ${-r * 0.45} ${-r * 0.55})`} />
      <g clipPath={`url(#${id})`}>
        <path d={`M ${-r * 0.82} ${r * 1.05} C ${-r * 0.8} ${r * 0.38}, ${-r * 0.42} ${r * 0.24}, 0 ${r * 0.24} C ${r * 0.42} ${r * 0.24}, ${r * 0.8} ${r * 0.38}, ${r * 0.82} ${r * 1.05} Z`} fill={OSC} />
        <path d={`M 0 ${r * 0.24} C ${r * 0.42} ${r * 0.24}, ${r * 0.8} ${r * 0.38}, ${r * 0.82} ${r * 1.05} L 0 ${r * 1.05} Z`} fill="#000" opacity={0.25} />
        <circle cy={-r * 0.18} r={r * 0.36} fill={OSC} />
        <path d={`M 0 ${-r * 0.54} A ${r * 0.36} ${r * 0.36} 0 0 1 0 ${r * 0.18} Z`} fill="#000" opacity={0.25} />
      </g>
      <circle r={r} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={r * 0.08} />
    </g>
  );
};

// bocadillo con los tres puntos de «escribiendo» (saltan en cadena)
export const Bocadillo: React.FC<{t: number; en: number; r: number; escribe?: boolean}> = ({t, en, r, escribe = true}) => {
  if (t < en) return null;
  const ap = aparece(t, en, -8);
  const k = t - en;
  return (
    <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
      <path d={`M ${-r} ${-r * 0.55} Q ${-r} ${-r * 0.85} ${-r * 0.7} ${-r * 0.85} L ${r * 0.7} ${-r * 0.85} Q ${r} ${-r * 0.85} ${r} ${-r * 0.55} L ${r} ${r * 0.25} Q ${r} ${r * 0.55} ${r * 0.7} ${r * 0.55} L ${-r * 0.15} ${r * 0.55} L ${-r * 0.55} ${r * 0.95} L ${-r * 0.5} ${r * 0.55} L ${-r * 0.7} ${r * 0.55} Q ${-r} ${r * 0.55} ${-r} ${r * 0.25} Z`}
        fill="#fff" />
      <path d={`M ${-r} ${r * 0.1} L ${r} ${r * 0.1} L ${r} ${r * 0.25} Q ${r} ${r * 0.55} ${r * 0.7} ${r * 0.55} L ${-r * 0.7} ${r * 0.55} Q ${-r} ${r * 0.55} ${-r} ${r * 0.25} Z`} fill="#000" opacity={0.08} />
      {[-0.42, 0, 0.42].map((x, i) => {
        const s = escribe ? Math.max(0, Math.sin(k * 8 - i * 0.9)) : 0;
        return <circle key={i} cx={x * r} cy={-r * 0.15 - s * r * 0.16} r={r * 0.13} fill={OSC} />;
      })}
    </g>
  );
};
