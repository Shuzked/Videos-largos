import React from 'react';
import {C, GLOW_AMARILLO} from '../estilo';
import {F} from '../anim';
import {IconoTrazado, Particulas, Pulso, aparece, flota} from '../lottie';

// Icono estilo Lottie (para usar dentro de un <svg>): insignia redonda cuyo aro se dibuja con un cometa en la punta,
// el fondo entra con muelle (aplastar/estirar), el icono se traza y se rellena, ráfaga + pulso al completarse y una
// micro-animación propia en reposo (el reloj corre, el sonido emite ondas, el foco destella, la cámara graba…).
export type TipoIcono = 'reloj' | 'formato' | 'hd' | 'sonido' | 'estrella' | 'persona' | 'lugar' | 'foco' | 'camara' | 'equipo' | 'percha' | 'casa' | 'chat' | 'otro';
const lim = (x: number) => Math.min(1, Math.max(0, x));

export const IconoLottie: React.FC<{t: number; en: number; d: string; x: number; y: number; r: number; tipo?: TipoIcono; color?: string; fase?: number}> = ({
  t, en, d, x, y, r, tipo = 'otro', color = C.amarillo, fase = 0,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 10);
  const fl = flota(t, fase, r * 0.05);
  const aro = 1 - Math.pow(1 - lim((t - en) / (10 * F)), 3);
  const fin = en + 10 * F;
  const ang = -Math.PI / 2 + aro * Math.PI * 2;
  const k = t - fin; // tiempo desde que se completó
  const tam = r * 1.1;
  // micro-animaciones en reposo
  const extra = (() => {
    if (k < 0) return null;
    switch (tipo) {
      case 'reloj': {
        const a = k * 300;
        return <line x1={0} y1={0} x2={Math.sin((a * Math.PI) / 180) * r * 0.42} y2={-Math.cos((a * Math.PI) / 180) * r * 0.42} stroke="#141418" strokeWidth={r * 0.07} strokeLinecap="round" />;
      }
      case 'sonido':
        return (
          <g>
            {[0, 1].map((i) => {
              const p = ((k * 1.3 + i * 0.5) % 1);
              return <circle key={i} r={r * (0.9 + p * 0.55)} fill="none" stroke={color} strokeWidth={3} opacity={(1 - p) * 0.8} />;
            })}
          </g>
        );
      case 'foco':
      case 'estrella': {
        const rot = tipo === 'estrella' ? k * 40 : 0;
        return (
          <g transform={`rotate(${rot})`}>
            {Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const v = 0.5 + 0.5 * Math.sin(k * 6 + i);
              return <line key={i} x1={Math.cos(a) * r * 1.12} y1={Math.sin(a) * r * 1.12} x2={Math.cos(a) * r * (1.25 + 0.12 * v)} y2={Math.sin(a) * r * (1.25 + 0.12 * v)} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.4 + 0.6 * v} />;
            })}
          </g>
        );
      }
      case 'camara':
        return <circle cx={r * 0.62} cy={-r * 0.62} r={r * 0.14} fill="#ff4d5e" opacity={Math.floor(k * 2) % 2 ? 1 : 0.25} style={{filter: 'drop-shadow(0 0 6px #ff4d5e)'}} />;
      default:
        return null;
    }
  })();
  const salto = k > 0 ? Math.max(0, Math.sin(k * 3.2)) * Math.exp(-((k % 2.2) * 2)) * 0.06 : 0; // pequeño latido periódico
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      {/* halo */}
      <circle r={r * 1.18} fill={`rgba(${GLOW_AMARILLO},0.10)`} opacity={aro} />
      <g transform={`scale(${ap.sx * (1 + salto)} ${ap.sy * (1 + salto)}) rotate(${ap.rot})`}>
        <circle r={r} fill="#141418" />
        <circle r={r} fill="url(#brilloIcono)" opacity={0.9} />
        <circle r={r * 0.94} fill="none" stroke={color} strokeWidth={r * 0.08} strokeLinecap="round" pathLength={1} strokeDasharray={`${aro} 1`} transform="rotate(-90)" style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.7))`}} />
        {aro < 1 && <circle cx={Math.cos(ang) * r * 0.94} cy={Math.sin(ang) * r * 0.94} r={r * 0.09} fill="#fff" style={{filter: 'drop-shadow(0 0 10px #fff)'}} />}
        {extra}
        <IconoTrazado d={d} t={t} en={en + 3 * F} color={color} size={tam} x={-tam / 2} y={-tam / 2} grosor={1.3} />
      </g>
      <Pulso t={t} en={fin} x={0} y={0} r={r * 1.05} color={color} />
    </g>
  );
};

// Degradado del fondo de las insignias (poner una vez dentro de cada <svg> que use IconoLottie)
export const DefsIconos: React.FC = () => (
  <defs>
    <radialGradient id="brilloIcono" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
      <stop offset="60%" stopColor="rgba(255,255,255,0.03)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
    </radialGradient>
  </defs>
);

// Tamaño de letra para que un texto quepa en un ancho (Montserrat Black/ExtraBold ≈ 0,66 em por carácter en mayúsculas)
export const cabe = (txt: string, ancho: number, max: number, k = 0.8) => Math.min(max, ancho / (Math.max(1, txt.length) * k));
