import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {H, MIN, amarillo} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';
import {ICONO10 as ICONO} from './iconos';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Destello, IconoTrazado, Particulas, Pulso, aparece, flota, muelle, puntaFlecha} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'iman', golpe: 'cartel', impacto: 'garabato', sub: 'iman', flecha: 'tiron'};

export const DURACION_A10 = 73.04;
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
// Plano abierto (Álvaro en la mesa): encuadre base más cerrado para que la cara quede grande y haya sitio arriba para los gráficos
const BASE = 1.18;
const OBJ_X = 540;
const OBJ_Y = 620;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.03, 0.36, 'golpe'],
  [0.48, 1.09, 0.25, 'golpe'],
  [1.84, 1.04, 0.8, 'suave'],
  [3.2, 1.12, 0.2, 'golpe'],
  [3.9, 1.05, 0.4, 'suave'],
  [4.4, 1.1, 0.2, 'golpe'],
  [4.88, 1.04, 0.6, 'suave'],
  [6.0, 1.14, 0.18, 'golpe'],
  [7.0, 1.05, 0.8, 'suave'],
  [9.04, 1.09, 0.3, 'golpe'],
  [10.0, 1.04, 1.2, 'suave'],
  [12.96, 1.12, 0.2, 'golpe'],
  [13.6, 1.05, 0.8, 'suave'],
  [16.0, 1.08, 1.5, 'suave'],
  [18.96, 1.11, 0.25, 'golpe'],
  [19.8, 1.05, 0.8, 'suave'],
  [21.6, 1.09, 0.3, 'golpe'],
  [22.4, 1.04, 0.6, 'suave'],
  [23.52, 1.12, 0.25, 'golpe'],
  [24.4, 1.06, 0.6, 'suave'],
  [25.36, 1.14, 0.18, 'golpe'],
  [26.2, 1.05, 0.8, 'suave'],
  [28.08, 1.11, 0.25, 'golpe'],
  [29.0, 1.05, 0.8, 'suave'],
  [30.88, 1.1, 0.3, 'golpe'],
  [32.24, 1.0, 0, 'corte'],
  [37.24, 1.0, 0, 'corte'],
  [37.26, 1.05, 0.6, 'suave'],
  [38.36, 1.14, 0.18, 'golpe'],
  [39.0, 1.05, 0.8, 'suave'],
  [40.92, 1.09, 0.3, 'golpe'],
  [41.8, 1.05, 0.8, 'suave'],
  [43.52, 1.08, 0.3, 'golpe'],
  [44.32, 1.11, 0.3, 'golpe'],
  [45.6, 1.0, 0, 'corte'],
  [49.92, 1.0, 0, 'corte'],
  [49.94, 1.05, 0.6, 'suave'],
  [51.32, 1.15, 0.18, 'golpe'],
  [52.0, 1.0, 0, 'corte'],
  [57.32, 1.0, 0, 'corte'],
  [57.34, 1.05, 0.8, 'suave'],
  [59.6, 1.09, 0.6, 'suave'],
  [61.8, 1.04, 0.6, 'suave'],
  [63.44, 1.11, 0.25, 'golpe'],
  [64.3, 1.05, 0.8, 'suave'],
  [66.32, 1.09, 0.4, 'suave'],
  [67.72, 1.05, 0.8, 'suave'],
  [69.44, 1.09, 0.6, 'suave'],
  [71.84, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [0.48, 3.2, 4.4, 6.0, 25.36, 51.32];
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
type B = {src: string; a: number; b: number; desde?: number; foco: number; vertical?: boolean};
const BROLL: B[] = [
  // "incluso puedes apoyarte en expertos para implementar determinadas soluciones" (encuadre fijo en el experto que explica)
  {src: 'expertos', a: 45.6, b: 49.92, desde: 0.5, foco: 0.6},
  // "que el alumno tenga herramientas y ayuda para hacer el trabajo que necesita hacer"
  {src: 'alumno', a: 52.0, b: 57.32, desde: 1, foco: 0.6},
];
// Recorrido por la plataforma a pantalla completa (maqueta genérica, sin datos reales), con la misma transición que el B-roll
const PLAT = {a: 32.24, b: 37.24, modulos: 32.7, clases: 33.96, llamadas: 34.36, soporte: 34.8, directo: 35.32, semana: 36.08};
const CORTES = Array.from(new Set([...BROLL, PLAT].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

const PISTAS = ENCUADRE as unknown as Record<string, [number, number][]>;
const focoEn = (b: B, t: number) => {
  const p = PISTAS[b.src];
  if (!p || b.vertical) return b.foco;
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
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 25%', scale: iv(t, [b.a, b.b], [1.0, 1.06])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`a10/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.62) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
const ROJO = '#ff4d5e';
const VERDE = '#2ee59d';
const OSCURO = 'rgba(16,16,20,0.9)';
const SOMBRA_ICONOS = 'drop-shadow(0 3px 10px rgba(0,0,0,0.75))';
// Lienzo SVG a tamaño del vídeo (las coordenadas de los gráficos son las del fotograma 1080x1920)
const Lienzo: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA_ICONOS}}>
    {children}
  </svg>
);
// Ficha redonda con icono: sale con muelle (aplastar/estirar y un giro que se asienta), el icono se traza y se rellena,
// lanza un pulso y una ráfaga de partículas, y después flota
const Chip: React.FC<{t: number; en: number; d: string; x: number; y: number; r?: number; color?: string; fondo?: string; fase?: number; quieto?: boolean; sinRafaga?: boolean}> = ({
  t, en, d, x, y, r = 62, color = '#1b1b20', fondo = C.amarillo, fase = 0, quieto, sinRafaga,
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
      {!sinRafaga && <Particulas t={t} en={en} x={0} y={0} n={8} radio={r * 1.9} colores={[fondo.startsWith('rgba') || fondo === '#fff' ? C.amarillo : fondo, '#ffffff']} />}
    </g>
  );
};
// Conector que se dibuja con un cometa en la punta y, ya dibujado, deja correr puntos por él (flujo)
const Conector: React.FC<{t: number; en: number; d: string; color?: string; dur?: number; flujo?: boolean; grosor?: number}> = ({t, en, d, color = '#fff', dur = 0.45, flujo, grosor = 7}) => {
  const p = 1 - Math.pow(1 - lim((t - en) / dur), 3);
  if (p <= 0) return null;
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      {flujo && p >= 1 && <path d={d} fill="none" stroke="#fff" strokeWidth={grosor} strokeLinecap="round" pathLength={1} strokeDasharray="0.03 0.12" strokeDashoffset={-(t - en) * 0.6} opacity={0.9} />}
    </g>
  );
};
// ✓ que se traza (para fichas que se resuelven)
const Check: React.FC<{t: number; en: number; s?: number; color?: string}> = ({t, en, s = 1, color = '#fff'}) => {
  const p = lim((t - en) / (6 * F));
  if (p <= 0) return null;
  return <path d={`M ${-24 * s} ${2 * s} L ${-7 * s} ${19 * s} L ${26 * s} ${-16 * s}`} stroke={color} strokeWidth={11 * s} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />;
};
// Estrella de cinco puntas
const estrella = (r: number) =>
  Array.from({length: 10}, (_, i) => {
    const g = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'} ${(Math.cos(g) * rr).toFixed(1)} ${(Math.sin(g) * rr).toFixed(1)}`;
  }).join(' ') + ' Z';

// Interrogación grande y legible (no un icono pequeño): el gancho se dibuja con un trazo grueso, el punto cae con un muelle,
// toda la interrogación sale con aplastar/estirar y un giro que se asienta, lanza un pulso y después se balancea en reposo.
// Lleva un contorno oscuro debajo para leerse sobre cualquier fondo.
const GANCHO = 'M -27 -34 C -27 -70, 27 -70, 27 -34 C 27 -10, 0 -6, 0 20';
const Interrogante: React.FC<{t: number; en: number; x: number; y: number; s?: number; color?: string; fase?: number}> = ({t, en, x, y, s = 1, color = '#fff', fase = 0}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 18);
  const traza = 1 - Math.pow(1 - lim((t - en) / (7 * F)), 3);
  const punto = muelle(t, en + 5 * F, 3, 8);
  const fl = flota(t, fase, 5);
  const vaiven = Math.sin(t * 3.1 + fase) * 7;
  const halo = color === '#fff' ? '255,255,255' : '255,77,94';
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={-10 * s} r={50 * s} color={color} />
      <g transform={`scale(${ap.sx * s * fl.s} ${ap.sy * s * fl.s}) rotate(${ap.rot + vaiven})`}>
        <g style={{filter: `drop-shadow(0 0 10px rgba(${halo},0.75))`}}>
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
      <Particulas t={t} en={en + 5 * F} x={0} y={0} n={8} radio={95 * s} colores={[color, C.amarillo]} />
    </g>
  );
};

// 1) "¿qué pasa cuando tienes un problema y no sabes resolverlo?": sale un bocadillo, dentro se dibuja un lío
// (el problema) y al decir "resolverlo" salta una interrogación roja y el bocadillo tiembla
const ENREDO = {a: 5.2, b: 7.84, burbuja: 5.36, lio: 6.0, duda: 7.12};
const LIO = 'M -130 34 C -110 -70, -10 -64, -40 6 S 40 82, 62 2 S 6 -82, 28 -48 S 140 -24, 104 40 S -6 74, -58 -18 S 18 -76, 124 -58';
const Enredo: React.FC<{t: number}> = ({t}) => {
  const {a, b, burbuja, lio, duda} = ENREDO;
  const ap = aparece(t, burbuja, -8);
  const fl = flota(t, 0, 5);
  const traza = 1 - Math.pow(1 - lim((t - lio) / 0.95), 2);
  const tiembla = t > duda && t < duda + 0.5 ? Math.sin((t - duda) * 60) * 7 * (1 - (t - duda) / 0.5) : 0;
  if (t < burbuja) return null;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${540 + tiembla} ${205 + fl.y})`}>
          <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
            <path d="M -150 -112 H 150 A 26 26 0 0 1 176 -86 V 66 A 26 26 0 0 1 150 92 H 34 L -6 136 L -12 92 H -150 A 26 26 0 0 1 -176 66 V -86 A 26 26 0 0 1 -150 -112 Z"
              fill={OSCURO} stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
            <path d={LIO} fill="none" stroke={C.amarillo} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traza}
              style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.7))`}} />
          </g>
          <Interrogante t={t} en={duda} x={176} y={-96} s={1.15} color={ROJO} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 2) "las mejores clases del mundo... pero al ponerlo en práctica aparecen dudas": una tarjeta de vídeo con estrellas,
// que al decir "práctica" se da la vuelta (portátil: el trabajo real) y al decir "dudas" le saltan interrogaciones alrededor
const CLASES = {a: 8.6, b: 14.1, tarjeta: 8.72, estrellas: 9.04, mundo: 9.56, practica: 11.76, dudas: [12.24, 12.96, 13.08]};
const ClasesDudas: React.FC<{t: number}> = ({t}) => {
  const {a, b, tarjeta, estrellas, mundo, practica, dudas} = CLASES;
  const ap = aparece(t, tarjeta, 6);
  const fl = flota(t, 1, 4);
  const giro = lim((t - practica) / 0.42);
  const cx = Math.cos(Math.PI * Easing.bezier(0.65, 0, 0.35, 1)(giro));
  const detras = cx < 0;
  const tiembla = t > dudas[1] && t < dudas[1] + 0.5 ? Math.sin((t - dudas[1]) * 64) * 6 * (1 - (t - dudas[1]) / 0.5) : 0;
  const barra = ((t - tarjeta) / 2.2) % 1;
  const apagaEstrellas = 1 - lim((t - practica) / 0.3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${540 + tiembla} ${190 + fl.y})`}>
          <g transform={`scale(${ap.sx * Math.max(0.02, Math.abs(cx))} ${ap.sy}) rotate(${ap.rot})`}>
            <rect x={-160} y={-95} width={320} height={190} rx={26} fill={OSCURO} stroke={detras ? C.amarillo : '#fff'} strokeWidth={6} />
            {!detras ? (
              <g>
                <circle r={46} fill={C.amarillo} />
                <IconoTrazado d={ICONO.play} t={t} en={tarjeta + 3 * F} color="#1b1b20" size={56} x={-25} y={-28} />
                <rect x={-128} y={64} width={256} height={9} rx={4.5} fill="rgba(255,255,255,0.22)" />
                <rect x={-128} y={64} width={256 * barra} height={9} rx={4.5} fill={C.amarillo} />
              </g>
            ) : (
              <g transform="scale(-1 1)">
                <IconoTrazado d={ICONOS.portatil} t={t} en={practica + 0.21} color="#fff" size={124} x={-62} y={-66} />
              </g>
            )}
          </g>
          {Array.from({length: 5}, (_, i) => {
            const en = estrellas + i * 0.09;
            if (t < en) return null;
            const e = aparece(t, en, 25);
            return (
              <g key={i} transform={`translate(${(i - 2) * 58} 136) scale(${e.sx} ${e.sy}) rotate(${e.rot})`} opacity={apagaEstrellas}>
                <path d={estrella(22)} fill={C.amarillo} stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
              </g>
            );
          })}
          <Destello t={t} en={mundo} x={-150} y={128} tam={22} color={C.amarillo} />
          <Destello t={t} en={mundo + 0.08} x={150} y={128} tam={18} />
        </g>
        {([[290, 175, 1.25, '#fff'], [800, 160, 1.6, ROJO], [840, 355, 1.0, '#fff']] as [number, number, number, string][]).map(([x, y, e, col], i) => (
          <Interrogante key={i} t={t} en={dudas[i]} x={x} y={y} s={e} color={col} fase={i * 1.7} />
        ))}
      </Lienzo>
    </Ventana>
  );
};

// 3) Las cuatro situaciones (propuesta, prospección, pregunta técnica, entrega) aparecen como fichas con una alerta;
// al decir "acompañamiento" cae en el centro una ficha amarilla que las aparta, se conecta con todas y al decir
// "marcar diferencias" las va resolviendo una a una (se ponen en verde con un ✓)
const OBST = {a: 14.1, b: 26.0, pasos: [14.44, 16.16, 18.76, 21.4], hub: 23.52, lineas: 23.86, bien: 25.36};
const ICON_OBST = [ICONO.documento, ICONO.diana, ICONO.pregunta, ICONO.caja];
const X0 = [255, 445, 635, 825];
const X1 = [168, 340, 740, 912];
const Obstaculos: React.FC<{t: number}> = ({t}) => {
  const {a, b, pasos, hub, lineas, bien} = OBST;
  const aparta = muelle(t, hub, 2.2, 6.5);
  const y = 196;
  const giroAro = (t - hub) * 40;
  const conexiones = [
    `M ${540 - 70} ${y - 26} Q 330 ${y - 150} ${X1[0] + 30} ${y - 50}`,
    `M ${540 - 74} ${y} L ${X1[1] + 54} ${y}`,
    `M ${540 + 74} ${y} L ${X1[2] - 54} ${y}`,
    `M ${540 + 70} ${y - 26} Q 750 ${y - 150} ${X1[3] - 30} ${y - 50}`,
  ];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {conexiones.map((d, i) => (
          <Conector key={i} t={t} en={lineas + i * 0.08} d={d} color={t >= bien + i * 0.1 ? VERDE : C.amarillo} dur={0.35} flujo grosor={6} />
        ))}
        {pasos.map((en, i) => {
          if (t < en) return null;
          const x = X0[i] + (X1[i] - X0[i]) * aparta;
          const resuelta = t >= bien + i * 0.1;
          const ap = aparece(t, en, 12);
          const fl = flota(t, i * 1.3, 4);
          const sacude = t > en && t < en + 0.45 ? Math.sin((t - en) * 55) * 5 * (1 - (t - en) / 0.45) : 0;
          const alerta = aparece(t, en + 0.14, 0);
          const sinAlerta = 1 - lim((t - bien - i * 0.1) / 0.15);
          const cambio = aparece(t, bien + i * 0.1, 0);
          return (
            <g key={i} transform={`translate(${x + sacude} ${y + fl.y})`}>
              <Pulso t={t} en={en} x={0} y={0} r={56} color="#fff" />
              <g transform={`scale(${(resuelta ? cambio.sx : ap.sx) * fl.s} ${(resuelta ? cambio.sy : ap.sy) * fl.s}) rotate(${ap.rot})`}>
                <circle r={56} fill={resuelta ? VERDE : '#fff'} stroke="#fff" strokeWidth={5} style={{filter: resuelta ? `drop-shadow(0 0 14px ${VERDE})` : 'none'}} />
                {resuelta ? <Check t={t} en={bien + i * 0.1 + 2 * F} s={1.1} /> : <IconoTrazado d={ICON_OBST[i]} t={t} en={en + 2 * F} color="#1b1b20" size={62} x={-31} y={-31} />}
              </g>
              {t >= en + 0.14 && sinAlerta > 0 && (
                <g transform={`translate(40 -42) scale(${alerta.sx * sinAlerta} ${alerta.sy * sinAlerta})`}>
                  <circle r={17} fill={ROJO} stroke="#fff" strokeWidth={3} />
                  <rect x={-2.5} y={-10} width={5} height={12} rx={2.5} fill="#fff" />
                  <circle cy={7} r={3} fill="#fff" />
                </g>
              )}
              <Particulas t={t} en={bien + i * 0.1} x={0} y={0} n={9} radio={110} colores={[VERDE, '#ffffff']} />
            </g>
          );
        })}
        {t >= hub && (
          <g transform={`translate(540 ${y})`}>
            <g transform={`rotate(${giroAro})`}>
              <circle r={92} fill="none" stroke={C.amarillo} strokeWidth={4} strokeDasharray="10 14" opacity={lim((t - hub) / 0.3) * 0.9} />
            </g>
          </g>
        )}
        <Chip t={t} en={hub} d={ICONO.auricular} x={540} y={y} r={72} fase={0.6} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "un programa de 18 meses para aprender a construir una agencia de servicios de IA": un anillo de 18 tramos que se
// enciende tramo a tramo; en el centro el calendario se convierte en un edificio (la agencia) y salta la chispa de la IA
const PROG = {a: 27.2, b: 32.24, segs: 27.52, fin: 28.92, agencia: 30.56, ia: 31.84};
const CALENDARIO = 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z';
const Programa: React.FC<{t: number}> = ({t}) => {
  const {a, b, segs, fin, agencia, ia} = PROG;
  const R = 116;
  const ap = aparece(t, a, -10);
  const fl = flota(t, 2, 4);
  const arco = (g0: number, g1: number) => {
    const p = (g: number) => `${(Math.cos((g * Math.PI) / 180) * R).toFixed(1)} ${(Math.sin((g * Math.PI) / 180) * R).toFixed(1)}`;
    return `M ${p(g0)} A ${R} ${R} 0 0 1 ${p(g1)}`;
  };
  const cambia = aparece(t, agencia, 0);
  const orbita = ((t - fin) * 140 - 90) * (Math.PI / 180);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(540 ${236 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          <circle r={R + 28} fill={OSCURO} stroke="#fff" strokeWidth={5} />
          {Array.from({length: 18}, (_, i) => {
            const g0 = -90 + i * 20 + 2.5, g1 = -90 + (i + 1) * 20 - 2.5;
            const en = segs + (i * (fin - segs)) / 17;
            const p = lim((t - en) / (3 * F));
            return (
              <g key={i}>
                <path d={arco(g0, g1)} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={20} strokeLinecap="butt" />
                {p > 0 && <path d={arco(g0, g1)} fill="none" stroke={C.amarillo} strokeWidth={20 + 6 * (1 - p)} strokeLinecap="butt" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
                  style={{filter: `drop-shadow(0 0 6px rgba(${GLOW_AMARILLO},0.8))`}} />}
              </g>
            );
          })}
          {t >= fin && <circle cx={Math.cos(orbita) * R} cy={Math.sin(orbita) * R} r={9} fill="#fff" />}
          {t < agencia ? (
            <IconoTrazado d={CALENDARIO} t={t} en={a + 0.15} color="#fff" size={96} x={-48} y={-48} />
          ) : (
            <g transform={`scale(${cambia.sx} ${cambia.sy})`}>
              <IconoTrazado d={ICONO.edificio} t={t} en={agencia} color={C.amarillo} size={104} x={-52} y={-54} />
            </g>
          )}
          <Particulas t={t} en={fin} x={0} y={0} n={14} radio={200} />
        </g>
        <Chip t={t} en={ia} d={ICONO.ia} x={540 + 108} y={236 - 108} r={40} fase={1} />
      </Lienzo>
    </Ventana>
  );
};

// 5) Recorrido por la plataforma (maqueta genérica: barras en lugar de textos, ningún dato real de alumnos):
// módulos que caen en la barra lateral y se marcan, el reproductor de clases, la llamada de soporte en directo
// (cuadrícula de participantes, el que habla con ondas) y la semana de lunes a viernes que se enciende día a día
const FondoPlataforma: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 100% 70% at 50% 30%, #23263a 0%, #14151d 62%, #0b0b10 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.045) 2px, transparent 2px)',
      backgroundSize: '64px 64px', backgroundPosition: `0px ${(t * 14) % 64}px`}} />
  </AbsoluteFill>
);
const Barra: React.FC<{x: number; y: number; w: number; h?: number; o?: number}> = ({x, y, w, h = 14, o = 0.22}) => <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={`rgba(255,255,255,${o})`} />;
const TONOS = ['#3b4767', '#4a3b5e', '#2f5a54', '#5a4536'];
const Plataforma: React.FC<{t: number}> = ({t}) => {
  const {a, b, modulos, clases, llamadas, soporte, directo, semana} = PLAT;
  if (t < a || t >= b) return null;
  const v = muelle(t, a, 1.9, 6.5);
  const W = 900, Hh = 900;
  const reproductor = aparece(t, clases, 0);
  const rejilla = lim((t - llamadas) / 0.25);
  const habla = (i: number) => (i === 0 ? 1 : 0);
  return (
    <AbsoluteFill>
      <FondoPlataforma t={t} />
      <div style={{position: 'absolute', left: 90, top: 180, width: W, height: Hh, translate: `0px ${(1 - v) * 90}px`, scale: `${0.9 + 0.1 * v}`, opacity: lim((t - a) / 0.2)}}>
        <svg width={W} height={Hh} style={{overflow: 'visible', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.6))'}}>
          <rect width={W} height={Hh} rx={34} fill="rgba(24,26,36,0.97)" stroke="rgba(255,255,255,0.16)" strokeWidth={3} />
          {/* barra superior de la ventana */}
          <path d={`M 0 34 A 34 34 0 0 1 34 0 H ${W - 34} A 34 34 0 0 1 ${W} 34 V 66 H 0 Z`} fill="rgba(255,255,255,0.05)" />
          {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <circle key={c} cx={40 + i * 30} cy={33} r={10} fill={c} />)}
          <Barra x={300} y={22} w={300} h={22} o={0.1} />
          {/* barra lateral: módulos */}
          <line x1={262} y1={66} x2={262} y2={Hh - 150} stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
          {Array.from({length: 6}, (_, i) => {
            const en = modulos + i * 0.08;
            const m = muelle(t, en, 2.4, 7);
            if (t < en) return null;
            const hecho = modulos + 0.55 + i * 0.14;
            return (
              <g key={i} transform={`translate(${(1 - m) * -60} ${96 + i * 70})`} opacity={lim((t - en) / 0.12)}>
                <rect x={22} y={0} width={220} height={54} rx={14} fill={i === 0 ? 'rgba(254,255,188,0.12)' : 'rgba(255,255,255,0.04)'} />
                <circle cx={50} cy={27} r={14} fill={i < 3 && t >= hecho ? VERDE : 'rgba(255,255,255,0.18)'} />
                {i < 3 && <g transform="translate(50 27) scale(0.42)"><Check t={t} en={hecho} /></g>}
                <Barra x={76} y={14} w={[130, 110, 140, 96, 120, 104][i]} h={12} o={0.32} />
                <Barra x={76} y={33} w={[80, 96, 70, 88, 60, 90][i]} h={8} o={0.14} />
              </g>
            );
          })}
          {/* zona principal: clases → llamada de soporte en directo */}
          <g transform={`translate(${290 + 290} ${100 + 160}) scale(${reproductor.sx} ${reproductor.sy}) translate(-290 -160)`}>
            {t >= clases && (
              <g>
                <rect width={580} height={320} rx={22} fill="#1f2433" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
                <g opacity={1 - rejilla}>
                  <rect width={580} height={320} rx={22} fill="url(#degReproductor)" />
                  <circle cx={290} cy={150} r={48} fill={C.amarillo} />
                  <IconoTrazado d={ICONO.play} t={t} en={clases + 3 * F} color="#1b1b20" size={60} x={262} y={120} />
                  <rect x={30} y={284} width={520} height={10} rx={5} fill="rgba(255,255,255,0.2)" />
                  <rect x={30} y={284} width={520 * lim((t - clases) / 1.6)} height={10} rx={5} fill={C.amarillo} />
                </g>
                {rejilla > 0 &&
                  [0, 1, 2, 3].map((i) => {
                    const tx = (i % 2) * 292 + 6, ty = Math.floor(i / 2) * 162 + 6;
                    const e = aparece(t, llamadas + i * 0.07, 0);
                    const onda = habla(i) * (t > llamadas + 0.3 ? 1 : 0);
                    return (
                      <g key={i} transform={`translate(${tx + 137} ${ty + 74}) scale(${e.sx} ${e.sy}) translate(${-137} ${-74})`}>
                        <rect width={274} height={148} rx={16} fill={TONOS[i]} stroke={onda ? C.amarillo : 'rgba(255,255,255,0.1)'} strokeWidth={onda ? 5 + 2 * Math.abs(Math.sin(t * 9)) : 2} />
                        <circle cx={137} cy={66} r={38} fill="rgba(255,255,255,0.16)" />
                        <g transform="translate(113 42) scale(2)"><path d={ICONO.persona} fill="rgba(255,255,255,0.85)" /></g>
                        {onda > 0 && Array.from({length: 5}, (_, k) => {
                          const h = 8 + 16 * Math.abs(Math.sin(t * 11 + k * 1.3));
                          return <rect key={k} x={110 + k * 12} y={128 - h / 2} width={7} height={h} rx={3.5} fill={C.amarillo} />;
                        })}
                      </g>
                    );
                  })}
                {/* soporte: auriculares sobre quien atiende */}
                {t >= soporte && (
                  <g transform="translate(262 22)">
                    <Chip t={t} en={soporte} d={ICONO.auricular} x={0} y={0} r={30} quieto sinRafaga />
                  </g>
                )}
                {/* en directo: punto rojo que late */}
                {t >= directo && (
                  <g transform="translate(560 22)">
                    <circle r={13 * aparece(t, directo, 0).sx} fill={ROJO} style={{filter: `drop-shadow(0 0 10px ${ROJO})`}} />
                    {[0, 0.7, 1.4].map((d) => <Pulso key={d} t={t} en={directo + d} x={0} y={0} r={14} color={ROJO} dur={16} />)}
                  </g>
                )}
              </g>
            )}
          </g>
          <defs>
            <linearGradient id="degReproductor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#30384f" />
              <stop offset="1" stopColor="#1a1d2a" />
            </linearGradient>
          </defs>
          {/* textos de la clase (barras) y materiales */}
          {t >= clases + 0.2 && (
            <g opacity={lim((t - clases - 0.2) / 0.2)}>
              <Barra x={290} y={448} w={360} h={18} o={0.3} />
              <Barra x={290} y={480} w={250} h={12} o={0.14} />
              {[0, 1, 2].map((i) => {
                const e = aparece(t, clases + 0.35 + i * 0.1, 0);
                return (
                  <g key={i} transform={`translate(${290 + i * 198 + 89} ${520 + 70}) scale(${e.sx} ${e.sy}) translate(-89 -70)`}>
                    <rect width={178} height={140} rx={16} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
                    <g transform="translate(20 22) scale(1.6)"><path d={ICONO.documento} fill={i === 0 ? C.amarillo : 'rgba(255,255,255,0.6)'} /></g>
                    <Barra x={76} y={30} w={80} h={10} o={0.28} />
                    <Barra x={76} y={50} w={60} h={8} o={0.14} />
                    <Barra x={20} y={100} w={138} h={8} o={0.12} />
                  </g>
                );
              })}
            </g>
          )}
          {/* semana: de lunes a viernes */}
          {t >= semana - 0.3 && (
            <g transform={`translate(${(W - (7 * 104 + 6 * 14)) / 2} ${Hh - 104})`}>
              {Array.from({length: 7}, (_, i) => {
                const e = aparece(t, semana - 0.3 + i * 0.03, 0);
                const enc = i < 5 ? semana + i * 0.18 : 99;
                const on = t >= enc;
                const golpe = on ? aparece(t, enc, 0) : {sx: 1, sy: 1};
                return (
                  <g key={i} transform={`translate(${i * 118 + 52} 28) scale(${e.sx * (on ? golpe.sx : 1)} ${e.sy * (on ? golpe.sy : 1)})`}>
                    <rect x={-52} y={-28} width={104} height={56} rx={28} fill={on ? C.amarillo : i < 5 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
                      stroke={i < 5 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'} strokeWidth={2} style={{filter: on ? `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},0.8))` : 'none'}} />
                    <circle r={7} fill={on ? '#1b1b20' : 'rgba(255,255,255,0.3)'} />
                  </g>
                );
              })}
              <Particulas t={t} en={semana + 4 * 0.18} x={4 * 118 + 52} y={28} n={10} radio={110} />
            </g>
          )}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// 6) "tenemos tutores por WhatsApp": conversación que se escribe sola (burbujas con barras, sin textos reales),
// el tutor aparece con su ficha y contesta
const CHAT = {a: 37.24, b: 38.84, mio: 37.36, escribe: 37.5, tutor: 37.72, otro: 38.36};
const VERDE_CHAT = '#25c76a';
const Burbuja: React.FC<{t: number; en: number; x: number; y: number; w: number; h: number; lado: number; fondo: string; barras: number[]; o: number}> = ({t, en, x, y, w, h, lado, fondo, barras, o}) => {
  if (t < en) return null;
  const e = aparece(t, en, lado * 6);
  const ox = lado < 0 ? x : x + w;
  return (
    <g transform={`translate(${ox} ${y + h}) scale(${e.sx} ${e.sy}) rotate(${e.rot}) translate(${-ox} ${-(y + h)})`}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={fondo} />
      <path d={lado < 0 ? `M ${x + 4} ${y + h - 22} L ${x - 14} ${y + h + 4} L ${x + 28} ${y + h - 4} Z` : `M ${x + w - 4} ${y + h - 22} L ${x + w + 14} ${y + h + 4} L ${x + w - 28} ${y + h - 4} Z`} fill={fondo} />
      {barras.map((bw, i) => <rect key={i} x={x + 22} y={y + 18 + i * 22} width={bw} height={11} rx={5.5} fill={`rgba(${o ? '255,255,255' : '0,0,0'},${o ? 0.8 : 0.28})`} />)}
    </g>
  );
};
const Chat: React.FC<{t: number}> = ({t}) => {
  const {a, b, mio, escribe, tutor, otro} = CHAT;
  const fl = flota(t, 0.3, 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <Burbuja t={t} en={mio} x={250} y={66} w={330} h={72} lado={-1} fondo="rgba(255,255,255,0.94)" barras={[250, 170]} o={0} />
          {/* "escribiendo...": tres puntos que botan */}
          {t >= escribe && t < tutor && (
            <g transform="translate(650 196)">
              <rect x={-58} y={-30} width={116} height={60} rx={30} fill={VERDE_CHAT} />
              {[0, 1, 2].map((i) => <circle key={i} cx={-26 + i * 26} cy={-Math.abs(Math.sin(t * 12 - i * 0.9)) * 8} r={8} fill="#fff" />)}
            </g>
          )}
          <Burbuja t={t} en={tutor} x={430} y={164} w={380} h={74} lado={1} fondo={VERDE_CHAT} barras={[290, 200]} o={1} />
          <Burbuja t={t} en={otro} x={500} y={258} w={310} h={52} lado={1} fondo={VERDE_CHAT} barras={[200]} o={1} />
          {t >= otro + 0.2 && (
            <g transform="translate(772 300)" opacity={lim((t - otro - 0.2) / 0.15)}>
              <path d="M -16 -6 L -10 0 L 0 -12 M -6 -6 L 0 0 L 10 -12" stroke="#bff7ff" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
        <Chip t={t} en={tutor} d={ICONO.persona} x={880} y={200} r={46} fase={0.4} />
      </Lienzo>
    </Ventana>
  );
};

// 7) "especialistas en inteligencia artificial, ventas y marketing": una línea de equipo se dibuja y en ella caen
// tres especialistas, cada uno con su insignia (chispa de IA, etiqueta de ventas, megáfono de marketing)
const ESPEC = {a: 38.84, b: 42.24, linea: 38.9, quienes: [39.64, 40.92, 41.64]};
const Especialistas: React.FC<{t: number}> = ({t}) => {
  const {a, b, linea, quienes} = ESPEC;
  const xs = [270, 540, 810];
  const ins = [ICONO.ia, ICONO.etiqueta, ICONO.megafono];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Conector t={t} en={linea} d="M 190 210 L 890 210" color="rgba(255,255,255,0.55)" dur={0.5} flujo grosor={5} />
        {xs.map((x, i) => {
          const en = quienes[i];
          if (t < en) return <circle key={i} cx={x} cy={210} r={16 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" opacity={lim((t - linea - 0.2 * i) / 0.2)} />;
          const ins2 = aparece(t, en + 0.18, 20);
          const fl = flota(t, i * 1.4, 4);
          return (
            <g key={i}>
              <Chip t={t} en={en} d={ICONO.persona} x={x} y={210} r={64} fondo="#fff" fase={i * 1.4} />
              {t >= en + 0.18 && (
                <g transform={`translate(${x + 48} ${210 + 46 + fl.y}) scale(${ins2.sx} ${ins2.sy}) rotate(${ins2.rot})`}>
                  <circle r={30} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
                  <IconoTrazado d={ins[i]} t={t} en={en + 0.24} color="#1b1b20" size={34} x={-17} y={-17} />
                </g>
              )}
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 8) "recursos para trabajar la captación y la entrega": un abanico de plantillas sale del montón; al decir "captación"
// aparece un imán que atrae dos, y al decir "entrega" una caja que se queda con las otras dos
const RECURSOS = {a: 42.24, b: 45.6, abanico: 42.32, captacion: 43.52, entrega: 44.32};
const Hoja: React.FC<{x: number; y: number; rot: number; s: number; o: number; destaca?: boolean}> = ({x, y, rot, s, o, destaca}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <path d="M -55 -72 H 30 L 55 -47 V 72 H -55 Z" fill="#f4f4f6" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
    <path d="M 30 -72 V -47 H 55" fill="#d9d9e0" />
    <rect x={-38} y={-44} width={52} height={10} rx={5} fill={destaca ? '#e2b100' : '#9a9aa6'} />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={-38} y={-18 + i * 20} width={[76, 64, 72, 48][i]} height={8} rx={4} fill="#c3c3cc" />)}
  </g>
);
const Iman: React.FC<{t: number; en: number; x: number; y: number}> = ({t, en, x, y}) => {
  if (t < en) return null;
  const e = aparece(t, en, -16);
  const fl = flota(t, 2.2, 4);
  // el imán tira: se inclina hacia las hojas mientras las atrae
  const tira = Math.sin(lim((t - en - 0.1) / 0.6) * Math.PI) * 10;
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={62} color={C.amarillo} />
      <g transform={`scale(${e.sx} ${e.sy}) rotate(${e.rot + tira})`}>
        <circle r={62} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
        <path d="M -24 -26 V 2 A 24 24 0 0 0 24 2 V -26" fill="none" stroke="#1b1b20" strokeWidth={17} />
        <rect x={-32.5} y={-34} width={17} height={14} fill={ROJO} />
        <rect x={15.5} y={-34} width={17} height={14} fill={ROJO} />
      </g>
    </g>
  );
};
const Recursos: React.FC<{t: number}> = ({t}) => {
  const {a, b, abanico, captacion, entrega} = RECURSOS;
  const destinos: [number, number, number][] = [[226, 205, captacion + 0.12], [226, 205, captacion + 0.24], [854, 205, entrega + 0.12], [854, 205, entrega + 0.24]];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {[0, 1, 2, 3].map((i) => {
          const en = abanico + i * 0.07;
          if (t < en) return null;
          const m = muelle(t, en, 2.4, 6.5);
          const bx = 540 + (i - 1.5) * 64 * m, by = 205 + Math.abs(i - 1.5) * 14 * m;
          const rot = (i - 1.5) * 13 * m;
          const [dx, dy, sale] = destinos[i];
          const k = lim((t - sale) / 0.42);
          const e = k * k * (3 - 2 * k);
          // vuelan en arco hacia el imán o la caja, giran y se encogen al entrar
          const x = bx + (dx - bx) * e, y = by + (dy - by) * e - Math.sin(e * Math.PI) * 90;
          return <Hoja key={i} x={x} y={y} rot={rot + e * (dx < 540 ? -200 : 200)} s={(1 - 0.75 * e) * (0.4 + 0.6 * lim((t - en) / 0.12))} o={1 - lim((k - 0.85) / 0.15)} destaca={i === 0} />;
        })}
        <Iman t={t} en={captacion} x={226} y={205} />
        <Particulas t={t} en={captacion + 0.62} x={226} y={205} n={9} radio={120} />
        <Chip t={t} en={entrega} d={ICONO.caja} x={854} y={205} r={62} fase={0.8} />
        <Particulas t={t} en={entrega + 0.62} x={854} y={205} n={9} radio={120} />
      </Lienzo>
    </Ventana>
  );
};

// 9) "todo esto tiene un objetivo": la diana se dibuja anillo a anillo y una flecha entra en arco y se clava en el centro
// (la punta siempre orientada según la trayectoria), la diana se sacude y la flecha vibra hasta quedarse quieta
const DIANA = {a: 49.96, b: 51.96, anillos: 50.02, sale: 50.98, clava: 51.32};
const Diana: React.FC<{t: number}> = ({t}) => {
  const {a, b, anillos, sale, clava} = DIANA;
  const cx = 540, cy = 212;
  const fl = flota(t, 0.2, 3);
  const k = lim((t - sale) / (clava - sale));
  const e = k * k; // acelera hasta clavarse
  // trayectoria: curva cuadrática desde arriba a la izquierda hasta el centro
  const P0 = [130, 40], P1 = [300, -60], P2 = [cx, cy];
  const bz = (u: number) => [(1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
  const der = (u: number) => [2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1])];
  const [px, py] = bz(e);
  const [vx, vy] = der(Math.max(0.001, e));
  const angVuelo = Math.atan2(vy, vx);
  const dentro = t >= clava;
  const vibra = dentro ? 7 * Math.exp(-6 * (t - clava)) * Math.sin((t - clava) * 2 * Math.PI * 4) : 0;
  const ang = (dentro ? Math.atan2(der(1)[1], der(1)[0]) : angVuelo) + (vibra * Math.PI) / 180;
  const sacude = dentro && t < clava + 0.4 ? Math.sin((t - clava) * 70) * 6 * (1 - (t - clava) / 0.4) : 0;
  const largo = 170;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const tx = dentro ? cx : px, ty = dentro ? cy : py;
  const colaX = tx - ux * largo, colaY = ty - uy * largo;
  const anillos3: [number, string, number][] = [[104, '#fff', 0], [70, C.amarillo, 0.12], [36, ROJO, 0.24]];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${sacude} ${fl.y})`}>
          {anillos3.map(([r, col, d], i) => {
            const ap = aparece(t, anillos + d, 0);
            if (t < anillos + d) return null;
            return (
              <g key={i} transform={`translate(${cx} ${cy}) scale(${ap.sx} ${ap.sy})`}>
                <circle r={r} fill={i === 2 ? ROJO : OSCURO} stroke={col} strokeWidth={i === 2 ? 4 : 12} />
              </g>
            );
          })}
          <Pulso t={t} en={clava} x={cx} y={cy} r={60} color={C.amarillo} dur={16} />
          <Particulas t={t} en={clava} x={cx} y={cy} n={14} radio={190} colores={[C.amarillo, '#ffffff', ROJO]} />
          {t >= sale && (
            <g>
              <line x1={colaX} y1={colaY} x2={tx - ux * 20} y2={ty - uy * 20} stroke="#fff" strokeWidth={9} strokeLinecap="round" />
              {/* plumas de la cola */}
              {[-1, 1].map((l) => (
                <path key={l} d={`M ${colaX + ux * 34} ${colaY + uy * 34} L ${colaX - uy * 20 * l + ux * 4} ${colaY + ux * 20 * l + uy * 4} L ${colaX - uy * 20 * l - ux * 18} ${colaY + ux * 20 * l - uy * 18} L ${colaX + ux * 10} ${colaY + uy * 10} Z`} fill={C.amarillo} />
              ))}
              <path d={puntaFlecha(tx, ty, ang, 34, 20) + ' Z'} fill="#fff" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
            </g>
          )}
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 10) "una estructura de formación y acompañamiento durante el proceso": se dibuja un camino con hitos, a los lados
// salen formación (libro) y acompañamiento (auriculares) y al decir "durante el proceso" un punto lo recorre encendiendo los hitos
const CAMINO = {a: 63.2, b: 66.84, dibuja: 63.44, formacion: 64.04, acompana: 64.68, recorre: 65.6, llega: 66.5};
const SEG: [number, number][][] = [
  [[150, 300], [290, 116], [410, 336], [540, 232]],
  [[540, 232], [670, 128], [800, 300], [930, 196]],
];
const enCamino = (u: number): [number, number] => {
  const s = Math.min(1, Math.max(0, u)) * 2;
  const [p0, p1, p2, p3] = SEG[Math.min(1, Math.floor(s))];
  const v = s >= 2 ? 1 : s - Math.floor(s);
  const w = 1 - v;
  return [w * w * w * p0[0] + 3 * w * w * v * p1[0] + 3 * w * v * v * p2[0] + v * v * v * p3[0], w * w * w * p0[1] + 3 * w * w * v * p1[1] + 3 * w * v * v * p2[1] + v * v * v * p3[1]];
};
const Camino: React.FC<{t: number}> = ({t}) => {
  const {a, b, dibuja, formacion, acompana, recorre, llega} = CAMINO;
  const d = `M ${SEG[0][0].join(' ')} C ${SEG[0].slice(1).map((p) => p.join(' ')).join(', ')} C ${SEG[1].slice(1).map((p) => p.join(' ')).join(', ')}`;
  const p = 1 - Math.pow(1 - lim((t - dibuja) / 0.7), 3);
  const u = lim((t - recorre) / (llega - recorre));
  const uu = u * u * (3 - 2 * u);
  const [qx, qy] = enCamino(uu);
  const hitos = [0, 0.33, 0.66, 1];
  const fl = flota(t, 1.1, 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <path d={d} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={26} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
          <path d={d} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeDasharray="18 16" opacity={p >= 1 ? 0.9 : 0} />
          {u > 0 && <path d={d} fill="none" stroke={C.amarillo} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={`${uu} 1`} style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.9))`}} />}
          {hitos.map((h, i) => {
            const en = dibuja + h * 0.7;
            if (t < en) return null;
            const e = aparece(t, en, 0);
            const [hx, hy] = enCamino(h);
            const on = uu >= h - 0.001 && u > 0;
            return (
              <g key={i} transform={`translate(${hx} ${hy}) scale(${e.sx} ${e.sy})`}>
                <circle r={17} fill={on ? C.amarillo : OSCURO} stroke="#fff" strokeWidth={5} />
              </g>
            );
          })}
          {u > 0 && u < 1 && <circle cx={qx} cy={qy} r={15} fill="#fff" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />}
          <Destello t={t} en={llega} x={930} y={196} tam={34} color={C.amarillo} />
          <Particulas t={t} en={llega} x={930} y={196} n={12} radio={140} />
          <Conector t={t} en={formacion + 0.1} d="M 330 150 L 330 200" color="rgba(255,255,255,0.6)" dur={0.25} grosor={4} />
          <Conector t={t} en={acompana + 0.1} d="M 742 130 L 742 178" color="rgba(255,255,255,0.6)" dur={0.25} grosor={4} />
        </g>
        <Chip t={t} en={formacion} d={ICONO.libro} x={330} y={98} r={52} fase={0.5} />
        <Chip t={t} en={acompana} d={ICONO.auricular} x={742} y={78} r={52} fase={1.9} />
      </Lienzo>
    </Ventana>
  );
};

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => (/^ClientesOnline/.test(s) ? 'ClientesOnline' : s.toLowerCase().replace(/[.,:]/g, ''));

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
// Solo frases CORTAS en grande, alternando con frases en subtítulo (el hook va entero en grande, en tres tarjetas)
const GRANDES: Grande[] = [
  // HOOK (encima de la cabeza de Álvaro): hay una pregunta que deberías hacerte
  {a: 0.04, b: 1.84, top: 60, lineas: [{ws: [['hay', 0.04], ['una', 0.28]], size: 84}, {ws: [['pregunta', 0.48, amarillo]], size: 150, golpe: true},
    {ws: [['que', 0.92], ['deberías', 1.04], ['hacerte', 1.48]], size: 80, abajo: true}]},
  // antes de entrar en cualquier mentoría
  {a: 1.84, b: 3.62, top: 960, lineas: [{ws: [['antes', 1.84], ['de', 2.12], ['entrar', 2.28]], size: 84}, {ws: [['en', 2.64], ['cualquier', 2.76]], size: 84}, {ws: [['mentoría', 3.2, amarillo]], size: 140, golpe: true}]},
  // para montar un negocio (arriba, ya delante de Álvaro)
  {a: 3.64, b: 4.86, top: 110, lineas: [{ws: [['para', 3.64], ['montar', 3.92]], size: 84}, {ws: [['un negocio', 4.24, amarillo]], size: 130, golpe: true}]},
  // De lunes a viernes (en la pantalla de la plataforma)
  {a: 35.88, b: 37.1, top: 1150, lineas: [{ws: [['de', 35.88], ['lunes', 36.08]], size: 100}, {ws: [['a viernes', 36.6, amarillo]], size: 140, golpe: true}]},
  // Tenemos tutores por WhatsApp
  {a: 37.28, b: 38.8, top: 960, lineas: [{ws: [['tenemos', 37.28], ['tutores', 37.72]], size: 96}, {ws: [['por', 38.16]], size: 84}, {ws: [['whatsapp', 38.36, amarillo]], size: 140, golpe: true}]},
  // Todo esto tiene un objetivo
  {a: 49.96, b: 51.74, top: 960, lineas: [{ws: [['todo', 49.96], ['esto', 50.4], ['tiene', 50.8]], size: 90}, {ws: [['un objetivo', 51.16, amarillo]], size: 140, golpe: true}]},
];
const LISTA: [number, number] = [-10, -10];
const CTA = 71.03;
const CTA_FIN = DURACION_A10; // "haz clic aquí abajo" hasta el final
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
      if (trozo.length > 1 && textoBloque(trozo) > MAX_CAR) continue;
      const c = coste[i] + 1 + (trozo.length === 1 && n > 1 ? 10 : 0) + Math.abs(textoBloque(trozo) - 14) / 20;
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
    if (w[3] || /[,?:]$/.test(w[0]) || !sig || sig[1] - w[2] > 0.3 || tapado(sig[1])) {
      frases.push(cur);
      cur = [];
    }
  });
  const out: {a: number; b: number; ws: W[]}[] = [];
  frases.flatMap(repartir).forEach((ws) => {
    const ult = ws[ws.length - 1];
    const sig = WS[WS.indexOf(ult) + 1];
    let finB = sig ? Math.min(sig[1], ult[2] + 0.8) : ult[2] + 0.6;
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
const CLAVE = new Set(['problema', 'clases', 'dudas', 'propuesta', 'prospección', 'técnica', 'entrega', 'acompañamiento', 'diferencias', 'programa', 'meses', 'agencia', 'módulos', 'directo',
  'especialistas', 'recursos', 'captación', 'expertos', 'herramientas', 'ayuda', 'estructura', 'formación']);

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
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: 70, fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
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

// Tramos con letras detrás de la persona: solo mientras hay titular detrás
const DETRAS: [number, number][] = []; // el hook va por encima de la cabeza: no hace falta recorte

export const ReelA10: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A10)} layout="none">
            <Video src={staticFile('a10/a10.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frase en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a10/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        <Plataforma t={t} />
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Enredo t={t} />
      <ClasesDudas t={t} />
      <Obstaculos t={t} />
      <Programa t={t} />
      <Chat t={t} />
      <Especialistas t={t} />
      <Recursos t={t} />
      <Diana t={t} />
      <Camino t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha (tiempos sílaba a sílaba con la forma de onda) */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={71.03}>haz</Sube>
          <Sube t={t} en={71.32}>clic</Sube>
          <Sube t={t} en={71.6}>aquí</Sube>
          <Sube t={t} en={71.84} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 72.04 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 72.04)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 71.03, 71.32, 71.6, 71.84].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 0.48, -5], ['boom', 3.2, -3], ['cineboom', 4.24, -4],
        ['burbuja', 5.36, -7], ['risercorto', 6.0, -9], ['alerta', 7.12, -8],
        ['pop', 8.72, -6], ['twinkle', 9.04, -9], ['snap', 11.76, -7], ['pop', 12.24, -6], ['negativo', 12.96, -6], ['pop', 13.12, -7],
        ['pop', 14.44, -6], ['pop', 16.16, -6], ['pop', 18.76, -6], ['pop', 21.4, -6], ['cineboom', 23.52, -5], ['exito', 25.36, -7],
        ['datos', 27.52, -10], ['reveal', 30.56, -8], ['ding', 31.84, -9],
        ['datos', 32.7, -10], ['pop', 33.96, -6], ['notif', 34.36, -8], ['tap', 34.8, -7], ['beep', 35.32, -12], ['tapcorto', 36.08, -8], ['tapcorto', 36.44, -8], ['boom', 36.6, -4],
        ['mensaje', 37.36, -8], ['typing', 37.5, -12], ['mensaje', 37.72, -8], ['cineboom', 38.36, -5],
        ['pop', 39.64, -6], ['pop', 40.92, -6], ['pop', 41.64, -6],
        ['swish', 42.32, -10], ['suck', 43.6, -9], ['pop', 44.32, -6], ['suck', 44.4, -10],
        ['risersharp', 50.9, -11], ['boom', 51.32, -3],
        ['datos', 63.44, -10], ['pop', 64.04, -6], ['pop', 64.68, -6], ['exito', 66.5, -8],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
