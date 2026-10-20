import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {H, amarillo} from './texto';
import {Entra, golpeV, Impacto, EstiloTexto, EstiloGolpe, EstiloImpacto} from './variantes';

// Catálogo para revisar las variantes: cada una ocupa 2 s (entra en 0.2 s, sale en 1.5 s)
const TX: EstiloTexto[] = ['mascara', 'pop', 'enfoque', 'deslizar', 'maquina', 'giro', 'caida', 'espaciado'];
const GO: EstiloGolpe[] = ['muelle', 'sello', 'destello', 'barrido', 'glitch', 'zoom', 'rebote', 'tinta'];
const IM: EstiloImpacto[] = ['rayos', 'onda', 'chispas', 'rayas', 'cuadros', 'circulos', 'confeti', 'halo'];
export const DURACION_CAT = 16;
export const Catalogo: React.FC = () => {
  const t = useCurrentFrame() / 25;
  const k = Math.min(7, Math.floor(t / 2));
  const b = k * 2;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 35%, #3b3f48 0%, #121318 70%)', fontFamily: 'Montserrat', color: '#fff'}}>
      <div style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', ...H, fontSize: 40, opacity: 0.6}}>{`${TX[k]} · ${GO[k]} · ${IM[k]}`}</div>
      <div style={{position: 'absolute', top: 500, left: 100, right: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, ...H}}>
        <div style={{display: 'flex', gap: '0.24em', fontSize: 84}}>
          {['esto', 'es', 'una', 'prueba'].map((w, i) => (
            <Entra key={w} t={t} en={b + 0.2 + i * 0.15} sale={b + 1.5} estilo={TX[k]}>{w}</Entra>
          ))}
        </div>
        <span style={{display: 'inline-block', fontSize: 170, ...amarillo, ...golpeV(GO[k], t, b + 0.85, b + 1.5)}}>clave</span>
      </div>
      <Impacto t={t} en={b + 0.85} x={540} y={800} estilo={IM[k]} />
      <div style={{position: 'absolute', top: 1390, left: 100, right: 100, display: 'flex', justifyContent: 'center', gap: '0.28em', ...H, fontSize: 70, fontWeight: 700}}>
        {['subtítulos', 'de', 'prueba'].map((w, i) => (
          <Entra key={w} t={t} en={b + 0.3 + i * 0.2} sale={b + 1.6} estilo={TX[k]}>{w}</Entra>
        ))}
      </div>
    </AbsoluteFill>
  );
};
