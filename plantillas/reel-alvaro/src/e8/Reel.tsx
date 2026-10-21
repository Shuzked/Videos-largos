import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';
import {ICONO10} from '../a10/iconos';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {Chip, Check, Conector, Destello, Lienzo, OSCURO, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos): texto "engranaje" (entra girando y encaja),
// golpe "pulso" y flecha "goteo". Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original).
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'engranaje', golpe: 'pulso', impacto: 'garabato', sub: 'engranaje', flecha: 'goteo'};

export const DURACION_E8 = 70.96;
const FPS = 25;
const fr = (s: number) => Math.round(s * FPS);
// stem "sfx": se renderiza sin la voz del vídeo (la voz y la música se mezclan y masterizan aparte)
const STEM = (getInputProps() as {stem?: string}).stem;

// ---------------- Cámara: tracking de la cara + zooms con curva ----------------
const PTS = CARA as [number, number, number][];
const cara = (t: number): [number, number] => {
  const x = Math.min(PTS.length - 1, Math.max(0, t * 10));
  const i = Math.floor(x);
  const j = Math.min(PTS.length - 1, i + 1);
  const k = x - i;
  return [PTS[i][1] + (PTS[j][1] - PTS[i][1]) * k, PTS[i][2] + (PTS[j][2] - PTS[i][2]) * k];
};
const SUAVE = Easing.bezier(0.65, 0, 0.35, 1);
const GOLPE = Easing.bezier(0.16, 1, 0.3, 1);
// Plano medio (Álvaro en la mesa): encuadre algo más cerrado y cara en el tercio superior, con sitio arriba para los gráficos
const BASE = 1.15;
const OBJ_X = 540;
const OBJ_Y = 640;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.03, 0.36, 'golpe'],
  [0.6, 1.09, 0.25, 'golpe'],
  [1.48, 1.14, 0.18, 'golpe'],
  [2.32, 1.05, 0.5, 'suave'],
  [3.84, 1.1, 0.3, 'golpe'],
  [4.44, 1.04, 0.4, 'suave'],
  [5.08, 1.15, 0.18, 'golpe'],
  [5.72, 1.04, 0.8, 'suave'],
  [6.8, 1.09, 0.4, 'golpe'],
  [8.16, 1.03, 0.8, 'suave'],
  [9.84, 1.08, 0.5, 'suave'],
  [10.8, 1.0, 0, 'corte'],
  [13.48, 1.0, 0, 'corte'],
  [13.5, 1.05, 0.8, 'suave'],
  [16.48, 1.1, 0.4, 'golpe'],
  [17.56, 1.04, 0.5, 'suave'],
  [18.68, 1.14, 0.18, 'golpe'],
  [19.4, 1.05, 0.8, 'suave'],
  [21.44, 1.1, 0.3, 'golpe'],
  [22.2, 1.05, 1.2, 'suave'],
  [25.76, 1.09, 0.6, 'suave'],
  [27.08, 1.04, 1.0, 'suave'],
  [28.72, 1.0, 0, 'corte'],
  [37.92, 1.0, 0, 'corte'],
  [37.94, 1.05, 0.6, 'suave'],
  [40.16, 1.09, 0.3, 'golpe'],
  [41.0, 1.05, 0.8, 'suave'],
  [42.8, 1.15, 0.18, 'golpe'],
  [43.6, 1.04, 0.8, 'suave'],
  [45.68, 1.09, 0.4, 'golpe'],
  [46.9, 1.05, 0.8, 'suave'],
  [48.44, 1.1, 0.4, 'suave'],
  [49.68, 1.0, 0, 'corte'],
  [53.16, 1.0, 0, 'corte'],
  [53.18, 1.05, 0.8, 'suave'],
  [55.44, 1.09, 0.5, 'suave'],
  [56.96, 1.04, 0.6, 'suave'],
  [58.52, 1.13, 0.2, 'golpe'],
  [59.4, 1.05, 0.6, 'suave'],
  [61.12, 1.08, 0.6, 'suave'],
  [62.2, 1.15, 0.18, 'golpe'],
  [62.83, 1.06, 0.6, 'suave'],
  [64.08, 1.04, 1.5, 'suave'],
  [67.36, 1.09, 1.2, 'suave'],
  [69.2, 1.05, 1.4, 'suave'],
];
const escala = (t: number) => {
  let v = 1;
  for (const [a, s, d, c] of ZOOM) {
    if (t < a) break;
    if (c === 'corte' || d === 0 || t >= a + d) v = s;
    else v = v + (s - v) * (c === 'golpe' ? GOLPE : SUAVE)((t - a) / d);
  }
  return v;
};
// Temblor corto en las palabras clave del hook y en los impactos fuertes
const IMPACTOS = [0.6, 1.48, 2.0, 5.08, 18.68, 42.8, 62.2];
const SACUDIDA: [number, number][] = [[12, -8], [-9, 6], [5, -3], [-2, 1]];
const camara = (t: number) => {
  const s = BASE * escala(t);
  const [fx, fy] = cara(t);
  let tx = OBJ_X - fx * s;
  let ty = OBJ_Y - fy * s;
  for (const a of IMPACTOS) {
    const k = Math.floor((t - a) * FPS);
    if (k >= 0 && k < SACUDIDA.length) {
      tx += SACUDIDA[k][0];
      ty += SACUDIDA[k][1];
    }
  }
  tx = Math.min(0, Math.max(1080 * (1 - s), tx));
  ty = Math.min(0, Math.max(1920 * (1 - s), ty));
  return {position: 'absolute' as const, inset: 0, transformOrigin: '0 0', scale: s, translate: `${tx}px ${ty}px`};
};

// ---------------- B-roll a pantalla completa, encuadrado en su sujeto ----------------
type B = {src: string; a: number; b: number; desde?: number; foco: number; vertical?: boolean; fijo?: boolean};
const BROLL: B[] = [
  // "para automatizar parte de su atención al cliente"
  {src: 'atencion', a: 10.8, b: 13.48, desde: 1, foco: 0.53},
  // "así es como una relación comercial puede tener continuidad"
  // (encuadre fijo: así entran las dos caras, él firmando y ella sonriendo)
  {src: 'relacion', a: 49.68, b: 53.16, desde: 2, foco: 0.6, fijo: true},
];
// Diagrama a pantalla completa: INSTALAR → SUPERVISAR → ACTUALIZAR → MEJORAR (el mantenimiento como un ciclo)
const DIAGRAMA = {a: 28.72, b: 37.92, pasos: [28.86, 29.3, 29.76, 30.22], servicio: 31.04, mantenimiento: 31.68, unicamente: 35.56, puntuales: 37.28};
const CORTES = Array.from(new Set([...BROLL, DIAGRAMA].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

const PISTAS = ENCUADRE as unknown as Record<string, [number, number][]>;
const focoEn = (b: B, t: number) => {
  const p = PISTAS[b.src];
  if (!p || b.vertical || b.fijo) return b.foco;
  const x = Math.max(0, t - b.a) * 5;
  const i = Math.min(p.length - 1, Math.floor(x));
  const j = Math.min(p.length - 1, i + 1);
  return p[i][1] + (p[j][1] - p[i][1]) * (x - i);
};
const Broll: React.FC<{t: number; b: B}> = ({t, b}) => {
  const ancho = b.vertical ? 1080 : ANCHO_BROLL;
  const left = Math.min(0, Math.max(1080 - ancho, 540 - focoEn(b, t) * ancho));
  return (
    <Ventana t={t} a={b.a} b={b.b}>
      <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 30%', scale: iv(t, [b.a, b.b], [1.0, 1.06])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`e8/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra abajo solo para que se lean los subtítulos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.62) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
const sm2 = (k: number) => k * k * (3 - 2 * k);
// Iconos: Material Icons revisados a ojo en una hoja de prueba antes de usarlos
const ICONO = {
  ...ICONO10,
  bombilla: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  renovar: 'M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z',
  bifurca: 'M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z',
  bicho: 'M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z',
  pieza: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
  velocimetro: 'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
  actualizar: 'M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58s9.14-3.47 12.65 0L21 3v7.12zM12.5 8v4.25l3.5 2.08-.72 1.21L11 13V8h1.5z',
  mejorar: 'M16 18v2H8v-2h8zM11 7.99V16h2V7.99h3L12 4 8 7.99h3z',
  encender: 'M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z',
  mensual: 'M21 12V6c0-1.1-.9-2-2-2h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V10h14v2h2zm-5.36 8a3.504 3.504 0 0 0 6.36-2c0-1.93-1.57-3.5-3.5-3.5-.95 0-1.82.38-2.45 1H17v1.5h-4v-4h1.5v1.43A4.977 4.977 0 0 1 18.5 13c2.76 0 5 2.24 5 5s-2.24 5-5 5c-2.42 0-4.44-1.72-4.9-4h1.54z',
  birrete: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
};
const SOMBRA_TEXTO = 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))';

// Interrogación escrita con la fuente de los títulos (Montserrat Black), con contorno oscuro y glow como los titulares.
// Entra con muelle (aplastar/estirar y un giro que se asienta) y después se balancea un poco.
const SignoFuente: React.FC<{t: number; en: number; x: number; y: number; tam: number; color?: string; giro?: number; fase?: number}> = ({
  t, en, x, y, tam, color = '#fff', giro = 12, fase = 0,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, giro);
  const fl = flota(t, fase, 5);
  const vaiven = Math.sin(t * 2.6 + fase) * 5 * lim((t - en) / 0.5);
  const rgb = color === ROJO ? '255,77,94' : color === C.amarillo ? GLOW_AMARILLO : '255,255,255';
  return (
    <g transform={`translate(${x} ${y + fl.y}) scale(${ap.sx * fl.s} ${ap.sy * fl.s}) rotate(${ap.rot + vaiven})`}>
      <text x={0} y={tam * 0.36} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={tam} fill={color}
        stroke="rgba(10,10,14,0.72)" strokeWidth={tam * 0.07} strokeLinejoin="round" paintOrder="stroke"
        style={{filter: `drop-shadow(0 0 ${tam * 0.05}px rgba(${rgb},0.85)) drop-shadow(0 0 ${tam * 0.16}px rgba(${rgb},0.45))`}}>
        ?
      </text>
    </g>
  );
};

// 1) "la respuesta es más sencilla de lo que parece": sobre la cabeza salta una interrogación (fuente de los títulos);
// al decir "sencilla" se encoge girando y en su sitio sale una bombilla que se enciende con rayos que se dibujan
const IDEA = {a: 5.94, b: 8.14, duda: 5.96, sencilla: 6.8, parece: 7.76};
const Idea: React.FC<{t: number}> = ({t}) => {
  const {a, b, duda, sencilla, parece} = IDEA;
  const y = 275;
  const fuera = sm2(lim((t - sencilla + 0.1) / 0.22));
  const ap = aparece(t, sencilla + 0.06, -10);
  const fl = flota(t, 0.5, 5);
  const luz = sm2(lim((t - sencilla - 0.25) / 0.3));
  const late = t >= parece ? 1 + 0.06 * Math.sin((t - parece) * 18) * Math.exp(-(t - parece) * 4) : 1;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {fuera < 1 && (
          <g transform={`translate(540 ${y}) rotate(${fuera * 200}) scale(${1 - fuera}) translate(-540 ${-y})`}>
            <SignoFuente t={t} en={duda} x={540} y={y} tam={290} color={C.amarillo} />
          </g>
        )}
        {t >= sencilla + 0.06 && (
          <g transform={`translate(540 ${y + fl.y}) scale(${ap.sx * fl.s * late} ${ap.sy * fl.s * late}) rotate(${ap.rot})`}>
            {/* halo de luz */}
            <circle cx={0} cy={-25} r={110} fill={C.amarillo} opacity={0.32 * luz} style={{filter: 'blur(24px)'}} />
            {/* rayos que se dibujan desde el cristal */}
            {Array.from({length: 7}, (_, i) => {
              const g = ((-90 + (i - 3) * 26) * Math.PI) / 180;
              const r1 = 124, r2 = 124 + 54 * luz;
              return luz > 0 ? <line key={i} x1={Math.cos(g) * r1} y1={Math.sin(g) * r1 - 25} x2={Math.cos(g) * r2} y2={Math.sin(g) * r2 - 25} stroke={C.amarillo} strokeWidth={10} strokeLinecap="round" /> : null;
            })}
            <g transform="translate(-102 -102) scale(8.5)">
              <path d={ICONO.bombilla} fill={luz > 0.5 ? C.amarillo : '#dcdce2'} stroke="rgba(10,10,14,0.6)" strokeWidth={0.5} />
            </g>
          </g>
        )}
        <Particulas t={t} en={sencilla + 0.3} x={540} y={y - 21} n={14} radio={210} />
        <Destello t={t} en={sencilla + 0.4} x={540 + 150} y={y - 110} tam={30} color={C.amarillo} />
        <Destello t={t} en={sencilla + 0.5} x={540 - 160} y={y - 70} tam={22} />
      </Lienzo>
    </Ventana>
  );
};

// 2) "vamos a imaginar que una empresa contrata un sistema": un bocadillo de pensamiento se dibuja sobre la cabeza;
// dentro sale la empresa, cae el contrato con un sello ✓ y aparece el sistema de IA, unidos por conectores
const CONTRATA = {a: 8.5, b: 10.76, imagina: 8.56, empresa: 9.44, contrata: 9.84, sistema: 10.44};
const Contrata: React.FC<{t: number}> = ({t}) => {
  const {a, b, imagina, empresa, contrata, sistema} = CONTRATA;
  const y = 245;
  const traza = 1 - Math.pow(1 - lim((t - imagina) / 0.6), 3);
  const relleno = lim((t - imagina - 0.3) / 0.4);
  const cae = muelle(t, contrata, 2.2, 6.5);
  const apB = aparece(t, contrata + 0.3, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* bocadillo de pensamiento */}
        <rect x={150} y={108} width={780} height={276} rx={120} fill={`rgba(16,16,20,${0.62 * relleno})`} stroke="rgba(255,255,255,0.9)" strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza} />
        {[[668, 412, 16], [700, 446, 10]].map(([cx, cy, r], i) => {
          const e = aparece(t, imagina + 0.5 + i * 0.1, 0);
          return <circle key={i} cx={cx} cy={cy} r={r * e.sx} fill="rgba(16,16,20,0.62)" stroke="#fff" strokeWidth={4} />;
        })}
        <Chip t={t} en={empresa} d={ICONO.edificio} x={300} y={y} r={62} fase={0.2} />
        <Conector t={t} en={contrata + 0.1} d={`M 372 ${y} L 470 ${y}`} color={C.amarillo} dur={0.25} flujo grosor={7} punta={[470, y, 0]} />
        {/* el contrato cae desde arriba girando y se asienta */}
        {t >= contrata && (
          <g transform={`translate(540 ${y - 150 * (1 - cae)}) rotate(${(1 - cae) * -25})`} opacity={lim((t - contrata) / 0.1)}>
            <rect x={-56} y={-72} width={112} height={144} rx={14} fill="#fff" stroke="#fff" strokeWidth={4} />
            {[-38, -14, 10].map((dy, i) => <rect key={i} x={-36} y={dy} width={i === 2 ? 46 : 72} height={10} rx={5} fill="#c8c8d0" />)}
            <path d="M -34 46 q 10 -14 18 0 t 18 0" stroke="#1b1b20" strokeWidth={4} fill="none" strokeLinecap="round" />
            {t >= contrata + 0.3 && (
              <g transform={`translate(38 44) scale(${apB.sx} ${apB.sy})`}>
                <circle r={28} fill={VERDE} stroke="#fff" strokeWidth={4} />
                <Check t={t} en={contrata + 0.36} s={0.6} />
              </g>
            )}
          </g>
        )}
        <Conector t={t} en={sistema - 0.2} d={`M 610 ${y} L 708 ${y}`} color={C.amarillo} dur={0.25} flujo grosor={7} punta={[708, y, 0]} />
        <Chip t={t} en={sistema} d={ICONO.ia} x={780} y={y} r={62} fase={1.1} />
      </Lienzo>
    </Ventana>
  );
};

// 3) "preparas la solución, la configuras, la pruebas y empieza a funcionar": un panel se dibuja (preparas),
// sus reguladores se colocan con muelle (configuras), las luces de prueba parpadean y se ponen en verde (pruebas)
// y el interruptor se enciende: el borde brilla en verde y salen las respuestas del chat (funcionar)
const INSTALA = {a: 13.5, b: 17.54, prepara: 13.52, configura: 14.92, prueba: 15.84, funciona: 16.48, funcionar: 16.96};
const Instala: React.FC<{t: number}> = ({t}) => {
  const {a, b, prepara, configura, prueba, funciona, funcionar} = INSTALA;
  const traza = 1 - Math.pow(1 - lim((t - prepara) / 0.55), 3);
  const relleno = lim((t - prepara - 0.35) / 0.35);
  const on = muelle(t, funciona, 2.4, 7);
  const encendido = t >= funciona + 0.1;
  const fl = flota(t, 0.3, 4);
  const metas = [470, 330, 520];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <rect x={170} y={112} width={740} height={276} rx={34} fill={`rgba(16,16,20,${0.9 * relleno})`}
            stroke={encendido ? VERDE : '#fff'} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza}
            style={{filter: encendido ? `drop-shadow(0 0 18px ${VERDE})` : 'none'}} />
          {/* reguladores */}
          {metas.map((meta, i) => {
            const en = prepara + 0.5 + i * 0.08;
            if (t < en) return null;
            const ap = aparece(t, en, 0);
            const kx = 250 + (meta - 250) * muelle(t, configura + i * 0.15, 2.2, 6);
            const ok = t >= configura + i * 0.15;
            const yy = 180 + i * 72;
            return (
              <g key={i} opacity={ap.op}>
                <rect x={240} y={yy - 7} width={320} height={14} rx={7} fill="rgba(255,255,255,0.18)" />
                <rect x={240} y={yy - 7} width={Math.max(0, kx - 240)} height={14} rx={7} fill={ok ? C.amarillo : 'rgba(255,255,255,0.35)'} />
                <circle cx={kx} cy={yy} r={20 * ap.sx} fill={ok ? C.amarillo : '#fff'} stroke="#1b1b20" strokeWidth={4} />
              </g>
            );
          })}
          <rect x={608} y={150} width={4} height={200} rx={2} fill="rgba(255,255,255,0.14)" opacity={relleno} />
          {/* luces de prueba */}
          {[0, 1, 2].map((i) => {
            const en = prepara + 0.6 + i * 0.08;
            if (t < en) return null;
            const ap = aparece(t, en, 0);
            const prob = t >= prueba + i * 0.12;
            const verde = t >= prueba + 0.5 + i * 0.1;
            const parpadeo = prob && !verde ? (Math.sin((t - prueba) * 40 + i) > 0 ? C.amarillo : 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.18)';
            const cx = 680 + i * 80;
            return (
              <g key={i}>
                <circle cx={cx} cy={190} r={24 * ap.sx} fill={verde ? VERDE : parpadeo} stroke="#fff" strokeWidth={3} style={{filter: verde ? `drop-shadow(0 0 10px ${VERDE})` : 'none'}} />
                <Particulas t={t} en={prueba + 0.5 + i * 0.1} x={cx} y={190} n={6} radio={60} colores={[VERDE, '#fff']} />
              </g>
            );
          })}
          {/* interruptor: se enciende con muelle */}
          {t >= prepara + 0.7 && (
            <g transform={`translate(760 310) scale(${aparece(t, prepara + 0.7, 0).sx})`}>
              <rect x={-92} y={-38} width={184} height={76} rx={38} fill={encendido ? VERDE : 'rgba(255,255,255,0.18)'} stroke="#fff" strokeWidth={4} />
              <g transform={`translate(${-46 + 92 * on} 0)`}>
                <circle r={30} fill="#fff" />
                <g transform="translate(-17 -17) scale(1.42)"><path d={ICONO.encender} fill={encendido ? VERDE : '#1b1b20'} /></g>
              </g>
            </g>
          )}
          <Pulso t={t} en={funciona + 0.1} x={760} y={310} r={92} color={VERDE} />
          {/* empieza a funcionar: respuestas del chat que salen del panel */}
          {[0, 1, 2].map((i) => {
            const en = funcionar + i * 0.14;
            if (t < en) return null;
            const ap = aparece(t, en, 8);
            const cx = 300 + i * 150, cy = 108;
            return (
              <g key={i} transform={`translate(${cx} ${cy + flota(t, i, 3).y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                <rect x={-58} y={-30} width={116} height={52} rx={20} fill="#fff" />
                <path d="M -30 20 L -40 38 L -14 22 Z" fill="#fff" />
                <rect x={-38} y={-14} width={76} height={9} rx={4} fill="#c8c8d0" />
                <rect x={-38} y={2} width={46} height={9} rx={4} fill="#c8c8d0" />
              </g>
            );
          })}
          <Particulas t={t} en={funciona + 0.1} x={760} y={310} n={12} radio={170} colores={[VERDE, '#fff']} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 4) "con el tiempo la empresa puede necesitar cambios": una línea de tiempo sale de la empresa y un marcador avanza por ella;
// en cada cambio que se nombra brota una ficha (actualizar, adaptar a procesos, revisar errores, incorporar funciones)
const CAMBIOS = {a: 19.4, b: 28.66, tiempo: 19.88, empresa: 20.32, cambios: 21.44, items: [22.08, 23.52, 25.76, 27.08], errores: 26.28};
const XS_CAMBIO = [330, 500, 670, 840];
const Cambios: React.FC<{t: number}> = ({t}) => {
  const {a, b, tiempo, empresa, cambios, items, errores} = CAMBIOS;
  const yr = 335;
  // el marcador llega a cada ficha justo cuando se nombra
  const tramos: [number, number][] = [[tiempo, 222], [items[0], XS_CAMBIO[0]], [items[1], XS_CAMBIO[1]], [items[2], XS_CAMBIO[2]], [items[3], XS_CAMBIO[3]], [b, 880]];
  let mx = 222;
  for (let i = 0; i < tramos.length - 1; i++) {
    const [t0, x0] = tramos[i], [t1, x1] = tramos[i + 1];
    if (t >= t0) mx = x0 + (x1 - x0) * SUAVE(lim((t - t0) / Math.min(0.6, t1 - t0)));
  }
  const iconos = [ICONO.renovar, ICONO.bifurca, ICONO.bicho, ICONO.pieza];
  const avance = 1 - Math.pow(1 - lim((t - tiempo) / 0.7), 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Conector t={t} en={tiempo} d={`M 222 ${yr} L 930 ${yr}`} color="rgba(255,255,255,0.9)" dur={0.7} grosor={8} punta={[930, yr, 0]} />
        {/* marcas de los meses que van pasando */}
        {Array.from({length: 8}, (_, k) => {
          const x = 260 + k * 82;
          const visible = 222 + avance * 708 >= x;
          return visible ? <circle key={k} cx={x} cy={yr} r={6} fill={mx >= x ? C.amarillo : 'rgba(255,255,255,0.6)'} /> : null;
        })}
        <Chip t={t} en={empresa} d={ICONO.edificio} x={172} y={yr} r={46} fase={0.4} />
        {items.map((en, i) => {
          const x = XS_CAMBIO[i];
          const tiembla = i === 2 && t > errores && t < errores + 0.5 ? Math.sin((t - errores) * 60) * 6 * (1 - (t - errores) / 0.5) : 0;
          return (
            <g key={i}>
              <Conector t={t} en={en - 0.06} d={`M ${x} ${yr - 12} L ${x} ${190 + 60}`} color={C.amarillo} dur={0.18} grosor={6} />
              <g transform={`rotate(${tiembla} ${x} 190)`}>
                <Chip t={t} en={en} d={iconos[i]} x={x} y={190} r={58} fondo={i === 2 && t < errores + 0.5 ? ROJO : undefined} color={i === 2 && t < errores + 0.5 ? '#fff' : undefined} fase={i * 1.1} />
              </g>
            </g>
          );
        })}
        {t >= tiempo + 0.2 && (
          <g>
            <circle cx={mx} cy={yr} r={16} fill={C.amarillo} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />
            <Pulso t={t} en={cambios} x={mx} y={yr} r={30} color={C.amarillo} />
          </g>
        )}
        <Destello t={t} en={cambios} x={mx + 40} y={yr - 46} tam={24} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 5) Diagrama a pantalla completa: las cuatro etapas caen en cascada unidas por conectores; al decir "mantenimiento"
// un bucle une MEJORAR con SUPERVISAR y gira (el servicio continuo); al decir "únicamente" solo queda encendido INSTALAR
// (la instalación puntual) y al decir "puntuales" vuelve a encenderse todo el ciclo
const ETAPAS: {txt: string; d: string}[] = [
  {txt: 'INSTALAR', d: ICONO.herramienta},
  {txt: 'SUPERVISAR', d: ICONO.velocimetro},
  {txt: 'ACTUALIZAR', d: ICONO.actualizar},
  {txt: 'MEJORAR', d: ICONO.mejorar},
];
const YS_ETAPA = [400, 630, 860, 1090];
const FondoDiagrama: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 110% 75% at 50% 35%, #2a1d5c 0%, #140f33 55%, #08071a 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.045) 2px, transparent 2px)', backgroundSize: '60px 60px', backgroundPosition: `0px ${(t * 10) % 60}px`}} />
    <AbsoluteFill style={{background: `radial-gradient(circle 420px at ${540 + Math.sin(t * 0.6) * 220}px ${700 + Math.cos(t * 0.5) * 260}px, rgba(254,255,188,0.10), rgba(254,255,188,0) 70%)`}} />
  </AbsoluteFill>
);
const Diagrama: React.FC<{t: number}> = ({t}) => {
  const {a, b, pasos, servicio, mantenimiento, unicamente, puntuales} = DIAGRAMA;
  if (t < a || t >= b) return null;
  const apaga = sm2(lim((t - unicamente) / 0.3)) * (1 - sm2(lim((t - puntuales - 0.15) / 0.3)));
  const ciclo = t >= mantenimiento;
  const ap = aparece(t, mantenimiento, 0);
  return (
    <AbsoluteFill>
      <FondoDiagrama t={t} />
      <Lienzo>
        {/* conectores entre etapas */}
        {[0, 1, 2].map((i) => (
          <g key={i} opacity={i === 0 ? 1 : 1 - 0.72 * apaga}>
            <Conector t={t} en={pasos[i + 1] - 0.22} d={`M 200 ${YS_ETAPA[i] + 58} L 200 ${YS_ETAPA[i + 1] - 62}`} color={C.amarillo} dur={0.2} grosor={7} flujo={ciclo} punta={[200, YS_ETAPA[i + 1] - 62, Math.PI / 2]} />
          </g>
        ))}
        {/* bucle del mantenimiento: de MEJORAR vuelve a SUPERVISAR */}
        <g opacity={1 - 0.72 * apaga}>
          <Conector t={t} en={servicio} d={`M 828 ${YS_ETAPA[3]} C 955 ${YS_ETAPA[3]}, 955 ${YS_ETAPA[1]}, 828 ${YS_ETAPA[1]}`} color={C.amarillo} dur={0.6} grosor={9} flujo={ciclo} punta={[828, YS_ETAPA[1], Math.PI]} />
          {ciclo && (
            <g transform={`translate(923 ${YS_ETAPA[2]}) scale(${ap.sx} ${ap.sy})`}>
              <Pulso t={t} en={mantenimiento} x={0} y={0} r={42} color={C.amarillo} />
              <circle r={42} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
              <g transform={`rotate(${(t - mantenimiento) * 140}) translate(-26 -26) scale(2.17)`}><path d={ICONO.renovar} fill="#1b1b20" /></g>
            </g>
          )}
        </g>
        <Particulas t={t} en={mantenimiento} x={923} y={YS_ETAPA[2]} n={12} radio={160} />
        {ETAPAS.map(({txt, d}, i) => {
          const en = pasos[i];
          if (t < en) return null;
          const y = YS_ETAPA[i];
          const m = muelle(t, en, 2.2, 7);
          const rev = 1 - Math.pow(1 - lim((t - en - 0.08) / 0.35), 3);
          const enCiclo = i > 0 && ciclo && apaga < 0.5;
          const solo = i === 0 && apaga > 0.5;
          const borde = enCiclo || solo ? C.amarillo : 'rgba(255,255,255,0.28)';
          // al quedarse sola, la instalación late una vez (sin anillos sobre el texto)
          const late = solo ? 1 + 0.05 * Math.sin((t - unicamente) * 14) * Math.exp(-(t - unicamente) * 3) : 1;
          return (
            <g key={i} transform={`translate(${(1 - m) * -70} 0) translate(470 ${y}) scale(${late}) translate(-470 ${-y})`} opacity={lim((t - en) / 0.15) * (i === 0 ? 1 : 1 - 0.72 * apaga)}>
              <rect x={120} y={y - 68} width={700} height={136} rx={68} fill={enCiclo || solo ? 'rgba(254,255,188,0.12)' : 'rgba(255,255,255,0.07)'} stroke={borde} strokeWidth={4}
                style={{filter: enCiclo || solo ? `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.7))` : 'none'}} />
              <Chip t={t} en={en} d={d} x={200} y={y} r={50} fase={i * 0.9} quieto />
              <clipPath id={`e8-etapa-${i}`}>
                <rect x={268} y={y - 60} width={560 * rev} height={120} />
              </clipPath>
              <text clipPath={`url(#e8-etapa-${i})`} x={282 - (1 - rev) * 30} y={y + 23} fontFamily="Montserrat" fontWeight={900} fontSize={64} fill="#fff"
                style={{filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))'}}>
                {txt}
              </text>
              {/* la instalación ya está hecha: ✓ */}
              {i === 0 && t >= pasos[1] && (
                <g transform={`translate(770 ${y}) scale(${aparece(t, pasos[1], 0).sx})`}>
                  <circle r={28} fill={VERDE} stroke="#fff" strokeWidth={4} />
                  <Check t={t} en={pasos[1] + 0.06} s={0.6} />
                </g>
              )}
            </g>
          );
        })}
        <Particulas t={t} en={puntuales + 0.2} x={540} y={YS_ETAPA[2]} n={16} radio={380} />
      </Lienzo>
    </AbsoluteFill>
  );
};

// 6) "también existe la posibilidad de ofrecer soporte y mejoras continuadas": un infinito se dibuja sobre la cabeza;
// en un lazo sale el soporte (auricular) y en el otro las mejoras; al decir "continuadas" un cometa recorre el infinito sin parar
const SOPORTE = {a: 38.6, b: 42.24, posibilidad: 38.8, soporte: 40.16, mejoras: 40.96, continuadas: 41.52};
const lem = (s: number): [number, number] => {
  const d = 1 + Math.sin(s) ** 2;
  return [540 + (300 * Math.cos(s)) / d, 240 + (300 * Math.sin(s) * Math.cos(s)) / d];
};
const INFINITO = Array.from({length: 121}, (_, i) => lem(Math.PI / 2 + (i / 120) * 2 * Math.PI))
  .map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const Soporte: React.FC<{t: number}> = ({t}) => {
  const {a, b, posibilidad, soporte, mejoras, continuadas} = SOPORTE;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <path d={INFINITO} fill="none" stroke="rgba(16,16,20,0.55)" strokeWidth={22} strokeLinejoin="round" opacity={lim((t - posibilidad) / 0.3)} />
        <Conector t={t} en={posibilidad} d={INFINITO} color={C.amarillo} dur={0.9} grosor={9} />
        {/* cometa que recorre el infinito */}
        {t >= continuadas && Array.from({length: 7}, (_, k) => {
          const [x, y] = lem(Math.PI / 2 + (t - continuadas) * 3.4 - k * 0.07);
          return <circle key={k} cx={x} cy={y} r={14 - k * 1.7} fill={k === 0 ? '#fff' : C.amarillo} opacity={1 - k * 0.12} style={{filter: k === 0 ? `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},1))` : 'none'}} />;
        })}
        <Chip t={t} en={soporte} d={ICONO.auricular} x={360} y={240} r={58} fase={0.3} />
        <Chip t={t} en={mejoras} d={ICONO.mejorar} x={720} y={240} r={58} fase={1.4} />
        <Destello t={t} en={continuadas + 0.1} x={540} y={150} tam={28} color={C.amarillo} />
        <Destello t={t} en={continuadas + 0.25} x={880} y={320} tam={22} />
        <Particulas t={t} en={continuadas} x={540} y={240} n={14} radio={320} />
      </Lienzo>
    </Ventana>
  );
};

// 7) "la cuota mensual debe corresponder a un servicio real, con responsabilidades claras y valor para el negocio":
// SIN dinero: el calendario que se repite cada mes se une con una ficha de servicio cuyas tareas se van marcando ✓,
// y al decir "negocio" la empresa recibe el valor (sale la empresa con un brillo verde)
const CUOTA = {a: 43.66, b: 49.64, cuota: 43.72, servicio: 45.68, checks: [46.92, 47.8, 48.44], negocio: 49.24};
const Cuota: React.FC<{t: number}> = ({t}) => {
  const {a, b, cuota, servicio, checks, negocio} = CUOTA;
  const ap = aparece(t, servicio, -5);
  const fl = flota(t, 0.8, 4);
  const filas = [ICONO.persona, ICONO.documento, ICONO.diana];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* anillo que gira alrededor del calendario: se repite cada mes */}
        {t >= cuota + 0.2 && (
          <circle cx={230} cy={240} r={92} fill="none" stroke={C.amarillo} strokeWidth={5} strokeDasharray="14 16" strokeLinecap="round"
            transform={`rotate(${(t - cuota) * 50} 230 240)`} opacity={lim((t - cuota - 0.2) / 0.3)} />
        )}
        <Chip t={t} en={cuota} d={ICONO.mensual} x={230} y={240} r={70} fase={0.2} />
        <Conector t={t} en={servicio - 0.1} d="M 330 240 L 410 240" color={C.amarillo} dur={0.25} flujo grosor={8} punta={[410, 240, 0]} />
        {t >= servicio && (
          <g transform={`translate(660 ${240 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
            <rect x={-235} y={-132} width={470} height={264} rx={30} fill={OSCURO} stroke="#fff" strokeWidth={5} />
            {filas.map((d, i) => {
              const yy = -78 + i * 78;
              const ok = t >= checks[i];
              const e = aparece(t, checks[i], 0);
              return (
                <g key={i} opacity={lim((t - servicio - 0.15 - i * 0.08) / 0.15)}>
                  <circle cx={-180} cy={yy} r={28} fill={ok ? C.amarillo : 'rgba(255,255,255,0.12)'} />
                  <g transform={`translate(${-180 - 17} ${yy - 17}) scale(1.42)`}><path d={d} fill={ok ? '#1b1b20' : '#fff'} /></g>
                  <rect x={-132} y={yy - 16} width={[210, 170, 230][i]} height={13} rx={6} fill={ok ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)'} />
                  <rect x={-132} y={yy + 6} width={[130, 110, 150][i]} height={11} rx={5} fill="rgba(255,255,255,0.14)" />
                  <rect x={150} y={yy - 25} width={50} height={50} rx={12} fill={ok ? VERDE : 'rgba(255,255,255,0.08)'} stroke={ok ? '#fff' : 'rgba(255,255,255,0.4)'} strokeWidth={3}
                    transform={ok ? `translate(175 ${yy}) scale(${e.sx} ${e.sy}) translate(-175 ${-yy})` : undefined} />
                  {ok && <g transform={`translate(175 ${yy})`}><Check t={t} en={checks[i] + 0.04} s={0.55} /></g>}
                </g>
              );
            })}
          </g>
        )}
        {checks.map((c, i) => <Particulas key={i} t={t} en={c} x={835} y={162 + i * 78} n={6} radio={70} colores={[VERDE, '#fff']} />)}
        <Chip t={t} en={negocio} d={ICONO.edificio} x={880} y={402} r={44} fondo={VERDE} color="#fff" fase={2} />
      </Lienzo>
    </Ventana>
  );
};

// 8) "tengo una formación introductoria de 14 clases sobre agencias de IA": sale el birrete y, al decir "14", una tira
// de película se despliega en arco sobre la cabeza con 14 fotogramas que se encienden en ola; al decir "IA" sale su chispa
const FORMACION = {a: 56.84, b: 61.06, formacion: 56.96, clases: 58.52, onda: 59.08, ia: 60.88};
const CX_ARCO = 540, CY_ARCO = 470, R_ARCO = 330;
const punto = (g: number): [number, number] => [CX_ARCO + R_ARCO * Math.cos((g * Math.PI) / 180), CY_ARCO + R_ARCO * Math.sin((g * Math.PI) / 180)];
const Formacion: React.FC<{t: number}> = ({t}) => {
  const {a, b, formacion, clases, onda, ia} = FORMACION;
  const [x0, y0] = punto(-168), [x1, y1] = punto(-12);
  const arco = `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R_ARCO} ${R_ARCO} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  const despliega = 1 - Math.pow(1 - lim((t - clases + 0.15) / 0.5), 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {t >= clases - 0.15 && (
          <g>
            <path d={arco} fill="none" stroke="rgba(16,16,20,0.9)" strokeWidth={78} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - despliega} />
            {[-30, 30].map((dr) => {
              const [p0x, p0y] = [CX_ARCO + (R_ARCO + dr) * Math.cos((-168 * Math.PI) / 180), CY_ARCO + (R_ARCO + dr) * Math.sin((-168 * Math.PI) / 180)];
              const [p1x, p1y] = [CX_ARCO + (R_ARCO + dr) * Math.cos((-12 * Math.PI) / 180), CY_ARCO + (R_ARCO + dr) * Math.sin((-12 * Math.PI) / 180)];
              return <path key={dr} d={`M ${p0x.toFixed(1)} ${p0y.toFixed(1)} A ${R_ARCO + dr} ${R_ARCO + dr} 0 0 1 ${p1x.toFixed(1)} ${p1y.toFixed(1)}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={7} strokeDasharray="7 11" opacity={despliega >= 1 ? 1 : 0} />;
            })}
          </g>
        )}
        {Array.from({length: 14}, (_, k) => {
          const en = clases + 0.05 + k * 0.035;
          if (t < en) return null;
          const g = -160 + (k * 140) / 13;
          const [x, y] = punto(g);
          const e = aparece(t, en, 0);
          const brillo = t >= onda ? Math.max(0, Math.sin((t - onda) * 5 - k * 0.45)) : 0;
          const lleno = brillo > 0.6;
          return (
            <g key={k} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${g + 90}) scale(${e.sx} ${e.sy})`}>
              <rect x={-26} y={-20} width={52} height={40} rx={7} fill={lleno ? C.amarillo : '#2a2a33'} stroke={C.amarillo} strokeWidth={3} />
              <path d="M -6 -10 L 10 0 L -6 10 Z" fill={lleno ? '#1b1b20' : '#fff'} />
            </g>
          );
        })}
        <Chip t={t} en={formacion} d={ICONO.birrete} x={540} y={292} r={64} fase={0.6} />
        <Chip t={t} en={ia} d={ICONO.ia} x={632} y={226} r={34} fondo={OSCURO} color={C.amarillo} quieto sinRafaga />
        <Pulso t={t} en={ia} x={632} y={226} r={38} color={C.amarillo} />
        <Particulas t={t} en={clases + 0.5} x={540} y={200} n={16} radio={340} />
      </Lienzo>
    </Ventana>
  );
};

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => (/^IA[.,]?$/.test(s) ? 'IA' : s.toLowerCase().replace(/[.,:]/g, ''));

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
// Solo frases CORTAS en grande, alternando con frases en subtítulo (el hook va entero en grande, en tres tarjetas)
const rosaFuerte: React.CSSProperties = {...rosa, textShadow: glow('255,177,191', 1.3)};
const GRANDES: Grande[] = [
  // HOOK 1/3 (encima de la cabeza y abajo): ¿por qué iba a pagarte una empresa todos los meses
  {a: 0.04, b: 2.32, top: 70, lineas: [{ws: [['¿por', 0.04], ['qué', 0.24], ['iba', 0.32], ['a', 0.52]], size: 84}, {ws: [['pagarte', 0.6, amarillo]], size: 140, golpe: true},
    {ws: [['una', 0.92], ['empresa', 1.12]], size: 84, abajo: true}, {ws: [['todos', 1.48], ['los', 1.84]], size: 100, abajo: true}, {ws: [['meses', 2.0, rosaFuerte]], size: 170, golpe: true, abajo: true}]},
  // HOOK 2/3: por una solución de inteligencia artificial
  {a: 2.32, b: 4.44, top: 960, lineas: [{ws: [['por', 2.32], ['una', 2.56], ['solución', 2.72]], size: 84}, {ws: [['de', 3.16], ['inteligencia', 3.24]], size: 100}, {ws: [['artificial', 3.84, amarillo]], size: 140, golpe: true}]},
  // HOOK 3/3 (encima de la cabeza): que ya le has instalado?
  {a: 4.44, b: 5.7, top: 70, lineas: [{ws: [['que', 4.44], ['ya', 4.6], ['le', 4.76], ['has', 4.92]], size: 90}, {ws: [['instalado?', 5.08, rosaFuerte]], size: 140, golpe: true}]},
  // Hasta aquí has hecho la instalación
  {a: 17.56, b: 19.34, top: 960, lineas: [{ws: [['hasta', 17.56], ['aquí', 17.88]], size: 90}, {ws: [['has', 18.16], ['hecho', 18.36], ['la', 18.52]], size: 90}, {ws: [['instalación', 18.68, amarillo]], size: 140, golpe: true}]},
  // pero tienes que hacerlo bien
  {a: 42.28, b: 43.5, top: 960, lineas: [{ws: [['pero', 42.28], ['tienes', 42.44], ['que', 42.72]], size: 90}, {ws: [['hacerlo bien', 42.8, amarillo]], size: 140, golpe: true}]},
  // Puedes acceder por un euro
  {a: 61.12, b: 62.6, top: 960, lineas: [{ws: [['puedes', 61.12], ['acceder', 61.48]], size: 90}, {ws: [['por', 62.0]], size: 90}, {ws: [['1 €', 62.2, amarillo]], size: 200, golpe: true}]},
];
const LISTA: [number, number] = [-10, -10];
// CTA (tiempos sílaba a sílaba con la forma de onda): "haz clic aquí debajo ↓", y la frase sigue en subtítulos
const CTA = 62.83;
const CTA_PAL: [string, number][] = [['haz', 62.83], ['clic', 63.05], ['aquí', 63.2], ['debajo', 63.38]];
const CTA_FLECHA = 63.5;
const CTA_FIN = 63.92; // empieza "y conoce cómo se plantea…"
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes en la misma zona: si la siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr.slice(i + 1).find((m) => Math.abs(m.top - g.top) < 300);
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, n.a - SALIDA - 0.02);
});
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
const tapado = (x: number) => (x >= CTA - 0.01 && x < CTA_FIN) || GRANDES.some((g) => x >= g.a - 0.01 && x < g.b) || (x >= LISTA[0] - 0.01 && x < LISTA[1]);

// Subtítulos: solo las palabras que no están en grande. Primero se separa por frases (punto, coma, interrogación,
// pausa o titular) y cada frase se reparte en bloques equilibrados de 2-4 palabras que caben en UNA línea.
const MAX_CAR = 22;
const MAX_LARGO = 25; // solo si así se evita un bloque de una palabra (el subtítulo se ajusta para caber en una línea)
// cortes de frase por sentido: "…inteligencia artificial / no hablamos únicamente…", "…tipo de negocio / desde los servicios… / hasta su funcionamiento comercial"
const CORTE_FRASE = new Set([35.08, 66.84, 68.76]);
const textoBloque = (ws: W[]) => ws.map((x) => limpiar(x[0])).join(' ').length;
const repartir = (f: W[]): W[][] => {
  // programación dinámica: menos bloques, sin bloques de 1 palabra si se puede, y largos parecidos
  const n = f.length;
  const coste: number[] = Array(n + 1).fill(Infinity);
  const corte: number[] = Array(n + 1).fill(0);
  coste[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - 4); i < j; i++) {
      const trozo = f.slice(i, j);
      if (trozo.length > 1 && textoBloque(trozo) > MAX_LARGO) continue;
      const c = coste[i] + 1 + (trozo.length === 1 && n > 1 ? 10 : 0) + (textoBloque(trozo) > MAX_CAR ? 5 : 0) + Math.abs(textoBloque(trozo) - 14) / 20;
      if (c < coste[j]) [coste[j], corte[j]] = [c, i];
    }
  }
  const out: W[][] = [];
  for (let j = n; j > 0; j = corte[j]) out.unshift(f.slice(corte[j], j));
  return out;
};
export const BLOQUES: {a: number; b: number; ws: W[]}[] = (() => {
  const frases: W[][] = [];
  let cur: W[] = [];
  WS.forEach((w, i) => {
    if (tapado(w[1])) {
      if (cur.length) frases.push(cur);
      cur = [];
      return;
    }
    cur.push(w);
    const sig = WS[i + 1];
    if (w[3] || /[,?:]$/.test(w[0]) || !sig || sig[1] - w[2] > 0.3 || tapado(sig[1]) || CORTE_FRASE.has(sig[1])) {
      frases.push(cur);
      cur = [];
    }
  });
  const out: {a: number; b: number; ws: W[]}[] = [];
  frases.flatMap(repartir).forEach((ws) => {
    const ult = ws[ws.length - 1];
    const sig = WS[WS.indexOf(ult) + 1];
    let finB = sig ? Math.min(sig[1], ult[2] + 0.8) : Math.min(DURACION_E8, ult[2] + 0.6);
    // si lo siguiente es texto grande, el subtítulo se va antes de que entre
    if (sig && tapado(sig[1])) finB = Math.min(finB, sig[1] - 0.02);
    out.push({a: ws[0][1], b: finB, ws});
  });
  // nunca empezar mientras sale un titular
  return out.map((bq) => {
    const g = GRANDES.find((x) => bq.a >= x.b && bq.a < x.b + SALIDA);
    return g ? {...bq, a: g.b + SALIDA} : bq;
  }).filter((bq) => bq.b > bq.a + 0.1); // un bloque que se queda sin tiempo no se muestra (ni suena)
})();
const PALABRAS_VISIBLES = BLOQUES.flatMap((bq) => bq.ws.map((w) => w[1]));
const CLAVE = new Set(['respuesta', 'sencilla', 'sistema', 'automatizar', 'cliente', 'configuras', 'pruebas', 'funcionar', 'cambios', 'respuestas', 'procesos', 'errores', 'funcionalidades', 'mantenimiento', 'agencias', 'instalaciones', 'soporte', 'mejoras', 'cuota', 'real', 'valor', 'relación', 'continuidad', 'formación', '14', 'clases', 'negocio', 'comercial']);

// Sombra difusa detrás de los subtítulos para que se lean sobre cualquier fondo
const FondoSub: React.FC<{opacidad: number}> = ({opacidad}) => (
  <div
    style={{
      position: 'absolute', left: -80, right: -80, top: 1300, height: 300, opacity: opacidad,
      background: 'radial-gradient(ellipse 52% 48% at 50% 50%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
    }}
  />
);

const Subtitulos: React.FC<{t: number}> = ({t}) => {
  const hay = (x: number) => BLOQUES.some((bq) => x >= bq.a && x < bq.b);
  const op = Math.max(...[-4, -2, 0, 2, 4].map((d) => (hay(t + d * F) ? 1 - Math.abs(d) / 6 : 0)));
  const bl = BLOQUES.find((x) => t >= x.a && t < x.b);
  return (
    <>
      {op > 0 && <FondoSub opacidad={op} />}
      {bl && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: Math.min(70, Math.floor(880 / (textoBloque(bl.ws) * 0.56))), fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          {bl.ws.map(([w, a], i) => (
            <Sube key={`${bl.a}-${i}`} t={t} en={a} style={enIA(a) ? estiloIA : CLAVE.has(limpiar(w)) ? amarillo : undefined}>
              {limpiar(w)}
            </Sube>
          ))}
        </div>
      )}
    </>
  );
};

// Frase grande: palabras que entran al ritmo de la voz; la palabra clave entra de golpe
// parte "arriba" = líneas normales; "abajo" = líneas marcadas abajo (van delante, en la zona inferior)
// Legibilidad: las líneas de apoyo nunca bajan de 72 px; si no caben, se parten en dos líneas (no se encogen)
const ANCHO = 880; // ancho útil: ~100 px de margen a cada lado
const FACTOR = 0.68; // ancho medio de un carácter de Montserrat en mayúsculas, en "em"
const MINIMO = 72; // las líneas de apoyo nunca bajan de aquí
const largoTxt = (ws: Pal[]) => ws.map((w) => w[0]).join(' ').length;
const cabe = (ws: Pal[], tam: number) => largoTxt(ws) * FACTOR * tam <= ANCHO;
// Las líneas de titular (>=100 px o de golpe) se quedan enteras; las de apoyo, si no caben a MINIMO, se parten una vez en dos
const partir = (l: Linea): Linea[] => {
  if (l.golpe || l.size >= 100 || l.ws.length < 2) return [l];
  const tam = Math.max(l.size, MINIMO);
  if (cabe(l.ws, MINIMO)) return [{...l, size: tam}];
  let mejor = 1, peor = Infinity;
  for (let i = 1; i < l.ws.length; i++) {
    const largo = Math.max(largoTxt(l.ws.slice(0, i)), largoTxt(l.ws.slice(i)));
    if (largo < peor) [peor, mejor] = [largo, i];
  }
  return [{...l, size: tam, ws: l.ws.slice(0, mejor)}, {...l, size: tam, ws: l.ws.slice(mejor)}];
};
// Velo oscuro suave detrás del texto grande + sombra, para que se lea sobre cualquier fondo
const VELO = 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0) 100%)';
const SOMBRA = 'drop-shadow(0 3px 8px rgba(0,0,0,0.75)) drop-shadow(0 0 2px rgba(0,0,0,0.5))';
const FraseGrande: React.FC<{t: number; g: Grande; parte?: 'arriba' | 'abajo'}> = ({t, g, parte = 'arriba'}) =>
  // sin líneas en esta parte no se pinta nada (ni el velo)
  !g.lineas.some((l) => (parte === 'abajo') === !!l.abajo) ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: (parte === 'abajo' ? 1180 : g.top) - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo).flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = Math.min(l.size, ANCHO / (Math.max(1, chars) * FACTOR));
          return (
            <div key={li} style={{display: 'flex', justifyContent: 'center', gap: '0.24em', fontSize: tam, lineHeight: 1.02, whiteSpace: 'nowrap'}}>
              {l.golpe ? (
                <span style={{display: 'inline-block', ...golpeV(ESTILO.golpe, t, l.ws[0][1], g.b), ...l.ws[0][2]}}>{l.ws.map((w) => w[0]).join(' ')}</span>
              ) : (
                l.ws.map(([w, en, st], wi) => (
                  <Entra estilo={ESTILO.texto} key={wi} t={t} en={en} sale={g.b} style={st}>
                    {w}
                  </Entra>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  </Ventana>
);

export const ReelE8: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E8)} layout="none">
            <Video src={staticFile('e8/e8.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: la frase va por encima de la cabeza y abajo, sin tapar la cara (no hace falta recorte) */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <Diagrama t={t} />
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Idea t={t} />
      <Contrata t={t} />
      <Instala t={t} />
      <Cambios t={t} />
      <Soporte t={t} />
      <Cuota t={t} />
      <Formacion t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con la flecha en la misma línea, justo después de "debajo" */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          {CTA_PAL.map(([w, en]) => (
            <Sube key={w} t={t} en={en} style={w === 'debajo' ? amarillo : undefined}>{w}</Sube>
          ))}
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < CTA_FLECHA ? 0 : 1, ...flechaV(ESTILO.flecha, t, CTA_FLECHA)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, ...CTA_PAL.map(([, en]) => en)].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 0.6, -6], ['boom', 2.0, -4], ['swish', 2.32, -11], ['cineboom', 3.84, -5], ['boom', 5.08, -4],
        ['pop', 5.96, -8], ['snap', 6.8, -8], ['twinkle', 7.0, -10],
        ['burbuja', 8.6, -10], ['pop', 9.44, -8], ['swish', 9.84, -11], ['confirmar', 10.14, -9], ['pop', 10.44, -8],
        ['reveal', 13.52, -10], ['slide2', 14.92, -10], ['beep', 15.84, -13], ['beep', 15.96, -13], ['beep', 16.08, -13], ['interruptor', 16.48, -8], ['exito', 16.62, -9], ['mensaje', 16.96, -10],
        ['cineboom', 18.68, -5],
        ['swoosh3', 19.88, -11], ['pop', 20.32, -8], ['notif', 21.44, -9], ['pop', 22.08, -7], ['pop', 23.52, -7], ['pop', 25.76, -7], ['pop', 27.08, -7],
        ['popup', 28.86, -8], ['popup', 29.3, -8], ['popup', 29.76, -8], ['popup', 30.22, -8], ['swish', 31.04, -10], ['exito', 31.68, -8], ['thud', 35.56, -10], ['tings', 37.48, -10],
        ['swoosh2', 38.8, -11], ['pop', 40.16, -7], ['pop', 40.96, -7], ['twinkle', 41.52, -9],
        ['boom', 42.8, -4],
        ['pop', 43.72, -8], ['swish', 45.58, -11], ['confirmar', 46.92, -10], ['confirmar', 47.8, -10], ['confirmar', 48.44, -10], ['ding', 49.24, -9],
        ['pop', 56.96, -7], ['puntos', 58.52, -10], ['exito', 59.08, -9], ['pop', 60.88, -9],
        ['cineboom', 62.2, -4],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
