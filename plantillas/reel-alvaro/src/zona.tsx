import React from 'react';
import {getInputProps} from 'remotion';

// Zona segura de Instagram (lados 100 px, arriba 220, abajo 1500): en un móvil alto Instagram recorta ~56 px por lado y
// arriba quedan la barra del móvil y la cabecera; abajo, en los anuncios, el botón «Ver detalles».
// Cada escena de elementos gráficos (iconos, tarjetas, diagramas) se encoge y se desplaza lo justo para quedar dentro.
// Las escenas y su ajuste los calcula plantillas/reel-alvaro/scripts/zonas.py midiendo un render solo de esa capa
// (props {"stem":"efectos","capa":"lottie"}); el ajuste cambia solo entre escenas, cuando no hay nada en pantalla.
export type Zona = {a: number; b: number; s: number; tx: number; ty: number};
export const CAPA = (getInputProps() as {capa?: string}).capa;
export const ZonaSegura: React.FC<{t: number; zonas: Zona[]; children: React.ReactNode}> = ({t, zonas, children}) => {
  const z = zonas.find((x) => t >= x.a - 0.12 && t <= x.b + 0.12);
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: z ? `translate(${z.tx}px, ${z.ty}px) scale(${z.s})` : undefined}}>
      {children}
    </div>
  );
};
