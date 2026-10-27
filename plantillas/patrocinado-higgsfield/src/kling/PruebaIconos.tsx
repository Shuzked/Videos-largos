import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Avatar, Bocadillo, Claqueta, Cronometro, Insignia} from './iconosFlat';

// Hoja de prueba de los iconos (revisarlos antes de usarlos): cada uno entra a los 0,1 s
export const PruebaIconos: React.FC = () => {
  const t = useCurrentFrame() / 30;
  const fila = [
    ['cronómetro', <Cronometro t={t} en={0.1} r={90} />],
    ['claqueta', <Claqueta t={t} en={0.1} r={90} id="pq" />],
    ['bien', <Insignia t={t} en={0.1} r={70} bien />],
    ['mal', <Insignia t={t} en={0.1} r={70} bien={false} />],
    ['avatar', <Avatar t={t} en={0.1} r={70} id="pa" />],
    ['cliente', <Avatar t={t} en={0.1} r={70} fondo="#8ab4ff" id="pb" />],
    ['bocadillo', <Bocadillo t={t} en={0.1} r={70} />],
  ] as const;
  return (
    <AbsoluteFill style={{background: '#26262c', fontFamily: 'Montserrat', color: '#fff'}}>
      <svg width={1920} height={1080} style={{overflow: 'visible'}}>
        {fila.map(([n, ic], i) => (
          <g key={n} transform={`translate(${170 + (i % 4) * 520} ${300 + Math.floor(i / 4) * 460})`}>
            {ic}
            <text y={190} textAnchor="middle" fill="#fff" fontSize={34} fontWeight={700}>{n}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
