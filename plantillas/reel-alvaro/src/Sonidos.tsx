import React from 'react';
import {Son} from './anim';
import {MONTAJE} from './Escenas';

// Banco de sonidos del usuario, colocado por el golpe (pico) de cada sonido
const S: [string, number, number?][] = [
  // Beats 1-3
  ['pop', 0.56], ['pop', 3.84], ['whoosh', 4.96], ['tic', 5.76], ['tic', 6.64], ['whoosh', 7.36, -3],
  // Beat 4: protagonista
  ['whoosh', 8.88, -2], ['snap', 10.08], ['riserm', 10.4], ['boom', 10.4], ['thud', 10.4, -4],
  // Beat 5: b-roll + ningún editor
  ['whoosh', 10.88], ['hit', 11.92], ['tic', 12.24], 
  // Beat 6: Claude + fotos
  ['pop', 12.96], ['shutter', 13.6], ['shutter', 13.84], ['shutter', 14.4], ['pop', 15.04], ['pop', 15.2], ['pop', 15.36], ['whoosh', 15.92, -3],
  // Beat 7
  ['whoosh', 16.0], ['whoosh', 18.08, -2], ['twinkle', 19.44],
  // Beat 8: montaje (clic en cada corte)
  ['whoosh', 20.8], ...MONTAJE.slice(1).map(([a]) => ['click', a] as [string, number]), ['ding', 23.84, -2], ['whoosh', 26.0, -3],
  // Beats 9-11
  ['whoosh', 27.44], ['pop', 28.08], ['whoosh', 31.36], ['pop', 32.8], ['whoosh', 34.32, -3], ['boom', 35.68], ['whoosh', 36.4], ['riser', 38.08], ['hit', 38.08],
  // Beats 12-13
  ['whoosh', 40.36], ['pop', 42.72], ['tic', 44.96], ['tic', 45.68], ['tic', 46.32], ['riser', 47.28], ['boom', 47.28],
  // Beat 14
  ['whoosh', 47.92], ['whoosh', 51.6, -2], ['whoosh', 53.8], ['click', 53.84], ['click', 54.56], ['click', 55.2], ['pop', 56.72], ['whoosh', 58.16, -3],
  // Beats 16-17
  ['whoosh', 60.88], ['tic', 62.8], ['tic', 64.63], ['tic', 66.47], ['pop', 68.87], ['tic', 71.35], ['tic', 73.03],
  // Beats 18-19
  ['whoosh', 75.27], ['pop', 75.67], ['pop', 75.83], ['loading', 76.31], ['snap', 77.75], ['switch', 79.43], ['click', 81.75], ['suck', 84.95], ['boom', 84.95], ['tic', 85.83], ['whoosh', 86.3, -2],
  // Outro: resumen y enlace
  ['whoosh', 472.44], ['click', 473.72], ['click', 475.0], ['click', 476.28], ['click', 477.8], ['pop', 480.04], ['twinkle', 482.2], ['ding', 486.1, -2],
];

export const Sonidos: React.FC = () => (
  <>
    {S.map(([s, en, db], i) => (
      <Son key={i} s={s} en={en} db={db} />
    ))}
    {/* teclado de fondo bajo el montaje del proceso */}
    <Son s="typing" en={20.8 + 30 - 30} dur={5.0} />
  </>
);
