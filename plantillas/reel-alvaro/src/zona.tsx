import React, {createContext, useContext} from 'react';
import {getInputProps} from 'remotion';

// Zona segura de Instagram (lados 100 px, arriba 220, abajo 1500): en un móvil alto Instagram recorta ~56 px por lado y
// arriba quedan la barra del móvil y la cabecera; abajo, en los anuncios, el botón «Ver detalles».
// Cada escena de elementos gráficos (iconos, tarjetas, diagramas) se encoge y se desplaza lo justo para quedar dentro.
// Las escenas y su ajuste los calcula plantillas/reel-alvaro/scripts/zonas.py midiendo un render solo de esa capa
// (props {"stem":"efectos","capa":"lottie"}); el ajuste cambia solo entre escenas, cuando no hay nada en pantalla.
// Los FONDOS a pantalla completa de esos elementos van dentro de <SinZona>: deshace el ajuste y siempre cubren todo el
// plano (si se encogieran con el resto, se vería a Álvaro por los lados).
export type Zona = {a: number; b: number; s: number; tx: number; ty: number; y0?: number; y1?: number};
export const CAPA = (getInputProps() as {capa?: string}).capa;
// capas para los controles: «lottie» = solo elementos con ZonaSegura (para medir su ajuste), «elementos» = todos los
// elementos sin texto, «texto» = solo texto grande, subtítulos y CTA (para comprobar que no se pisan)
export const SIN_TEXTO = CAPA === 'lottie' || CAPA === 'elementos';
const Ajuste = createContext<Zona | null>(null);
export const ZonaSegura: React.FC<{t: number; zonas: Zona[]; children: React.ReactNode}> = ({t, zonas, children}) => {
  if (CAPA === 'texto') return null; // capa de solo texto (control de solapes)
  const z = zonas.find((x) => t >= x.a - 0.12 && t <= x.b + 0.12) ?? null;
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: z ? `translate(${z.tx}px, ${z.ty}px) scale(${z.s})` : undefined}}>
      <Ajuste.Provider value={z}>{children}</Ajuste.Provider>
    </div>
  );
};
export const SinZona: React.FC<{children: React.ReactNode}> = ({children}) => {
  const z = useContext(Ajuste);
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: z ? `scale(${1 / z.s}) translate(${-z.tx}px, ${-z.ty}px)` : undefined}}>
      {children}
    </div>
  );
};

// Hueco libre para el texto grande entre a y b: nunca pisa los elementos de abajo (p. ej. la barra de progreso de un montaje)
// ni los de arriba que estén en pantalla a la vez (cajas medidas por zonas.py). Devuelve [arriba, abajo].
export const hueco = (zonas: Zona[], a: number, b: number, arriba: number, abajo: number): [number, number] => {
  for (const z of zonas) {
    if (z.y0 === undefined || z.y1 === undefined || z.b < a || z.a > b) continue;
    if (z.y0 > 900) abajo = Math.min(abajo, z.y0 - 24);
    else if (z.y1 < 900) arriba = Math.max(arriba, z.y1 + 24);
  }
  return [arriba, abajo];
};
