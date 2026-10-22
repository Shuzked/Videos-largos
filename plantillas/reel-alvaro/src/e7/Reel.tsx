import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {CAPA, SIN_TEXTO, Zona, ZonaSegura, hueco} from '../zona';
import ZONAS from './zonas.json';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';
import {ICONO10} from '../a10/iconos';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Chip, Check, Conector, Cruz, Destello, IconoTrazado, Lienzo, OSCURO, Particulas, Pulso, ROJO, VERDE, aparece, estrella, flota, muelle} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos): texto "tiza" (se escribe de izquierda a derecha con un
// temblor de tiza), golpe "balanza" (cae inclinado y se equilibra) y flecha "toc-toc" (dos toques). Los subtítulos y el CTA
// usan SIEMPRE <Sube> (la animación original). Sin ráfagas ni trazos sobre los títulos.
const ESTILO: Estilo = {texto: 'tiza', golpe: 'balanza', impacto: 'garabato', sub: 'tiza', flecha: 'toctoc'};

export const DURACION_E7 = 79.8;
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
  [0.6, 1.07, 0.3, 'golpe'],
  [1.4, 1.13, 0.18, 'golpe'],
  [1.9, 1.05, 0.5, 'suave'],
  [2.6, 1.1, 0.2, 'golpe'],
  [3.12, 1.0, 0, 'corte'],
  [8.9, 1.0, 0, 'corte'],
  [8.92, 1.05, 0.6, 'suave'],
  [9.84, 1.08, 0.3, 'golpe'],
  [10.24, 1.04, 0.4, 'suave'],
  [10.72, 1.14, 0.18, 'golpe'],
  [11.24, 1.0, 0, 'corte'],
  [18.62, 1.0, 0, 'corte'],
  [18.64, 1.05, 0.8, 'suave'],
  [20.16, 1.08, 0.4, 'suave'],
  [22.04, 1.12, 0.2, 'golpe'],
  [22.6, 1.05, 0.6, 'suave'],
  [23.88, 1.09, 0.3, 'golpe'],
  [24.6, 1.05, 0.5, 'suave'],
  [25.32, 1.15, 0.18, 'golpe'],
  [25.94, 1.0, 0, 'corte'],
  [37.68, 1.0, 0, 'corte'],
  [37.72, 1.05, 0.6, 'suave'],
  [38.84, 1.1, 0.3, 'golpe'],
  [39.6, 1.05, 0.6, 'suave'],
  [41.6, 1.09, 0.3, 'golpe'],
  [42.4, 1.05, 0.6, 'suave'],
  [44.56, 1.09, 0.3, 'golpe'],
  [45.3, 1.04, 0.5, 'suave'],
  [46.28, 1.14, 0.18, 'golpe'],
  [47.0, 1.05, 0.8, 'suave'],
  [49.32, 1.07, 0.5, 'suave'],
  [50.88, 1.1, 0.2, 'golpe'],
  [51.6, 1.05, 0.8, 'suave'],
  [54.04, 1.08, 0.6, 'suave'],
  [57.36, 1.1, 0.2, 'golpe'],
  [58.24, 1.04, 0.8, 'suave'],
  [59.64, 1.09, 0.3, 'golpe'],
  [60.6, 1.05, 0.7, 'suave'],
  [61.84, 1.1, 0.3, 'golpe'],
  [62.6, 1.05, 0.8, 'suave'],
  [64.0, 1.09, 0.3, 'golpe'],
  [64.8, 1.04, 0.8, 'suave'],
  [66.8, 1.08, 0.4, 'suave'],
  [68.6, 1.04, 0.8, 'suave'],
  [70.76, 1.09, 0.3, 'golpe'],
  [71.8, 1.13, 0.2, 'golpe'],
  [72.72, 1.05, 0.6, 'suave'],
  [74.28, 1.16, 0.18, 'golpe'],
  [75.0, 1.05, 0.6, 'suave'],
  [77.44, 1.09, 1.0, 'suave'],
  [79.0, 1.05, 0.8, 'suave'],
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
// Temblor corto en cada palabra clave del hook (también sobre el B-roll del montaje) y en los impactos fuertes
const IMPACTOS = [1.4, 2.64, 3.72, 4.76, 6.08, 7.56, 8.2, 10.72, 25.32, 46.28, 74.28];
const SACUDIDA: [number, number][] = [[12, -8], [-9, 6], [5, -3], [-2, 1]];
const sacudida = (t: number): [number, number] => {
  for (const a of IMPACTOS) {
    const k = Math.floor((t - a) * FPS);
    if (k >= 0 && k < SACUDIDA.length) return SACUDIDA[k];
  }
  return [0, 0];
};
const camara = (t: number) => {
  const s = BASE * escala(t);
  const [fx, fy] = cara(t);
  const [dx, dy] = sacudida(t);
  let tx = OBJ_X - fx * s + dx;
  let ty = OBJ_Y - fy * s + dy;
  tx = Math.min(0, Math.max(1080 * (1 - s), tx));
  ty = Math.min(0, Math.max(1920 * (1 - s), ty));
  return {position: 'absolute' as const, inset: 0, transformOrigin: '0 0', scale: s, translate: `${tx}px ${ty}px`};
};

// ---------------- B-roll a pantalla completa, encuadrado en su sujeto ----------------
type B = {src: string; a: number; b: number; desde?: number; foco: number; vertical?: boolean};
// Montaje del hook: "alquilar un local, comprar maquinaria, contratar empleados y hacer una inversión enorme"
const BROLL: B[] = [
  {src: 'local', a: 3.12, b: 4.24, desde: 1.5, foco: 0.5},
  {src: 'maquinaria', a: 4.24, b: 5.52, desde: 1.0, foco: 0.46},
  {src: 'empleados', a: 5.52, b: 6.88, desde: 0.5, foco: 0.51}, // entrevista de trabajo: la entrevistadora centrada
  {src: 'inversion', a: 6.88, b: 8.9, desde: 2.0, foco: 0.55},
];
// Pizarra a pantalla completa: «NEGOCIO FÍSICO» (primera vez) y «AGENCIA DE SERVICIOS» (segunda vez)
const PIZ1 = {a: 11.24, b: 18.62};
const PIZ2 = {a: 25.94, b: 37.68};
const CORTES = Array.from(new Set([...BROLL, PIZ1, PIZ2].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
  const [dx, dy] = sacudida(t);
  return (
    <Ventana t={t} a={b.a} b={b.b}>
      <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 30%', scale: iv(t, [b.a, b.b], [1.03, 1.1]), translate: `${dx}px ${dy}px`}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`e7/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra abajo para que se lean las frases y la línea de progreso */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
const sm = (k: number) => k * k * (3 - 2 * k);
const ICONO = {
  ...ICONO10,
  tienda: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  carrito: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
  bombilla: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  personas: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  campana: 'M2 17h20v2H2zm11.84-9.21c.1-.24.16-.51.16-.79 0-1.1-.9-2-2-2s-2 .9-2 2c0 .28.06.55.16.79C6.25 8.6 3.27 11.93 3 16h18c-.27-4.07-3.25-7.4-7.16-8.21z',
  puzle: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
  reloj: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
};
const SOMBRA_TEXTO = 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))';
// Moneda con el símbolo del euro (fuente de los títulos)
const Moneda: React.FC<{r: number; color?: string}> = ({r, color = C.amarillo}) => (
  <g>
    <circle r={r} fill={color} stroke="#fff" strokeWidth={r * 0.09} />
    <circle r={r * 0.74} fill="none" stroke="rgba(27,27,32,0.25)" strokeWidth={r * 0.06} />
    <text x={0} y={r * 0.36} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={r * 1.05} fill="#1b1b20">€</text>
  </g>
);

// 0) Línea de progreso del montaje (abajo): local, maquinaria, empleados e inversión se van encendiendo en orden;
// en "enorme" todas se ponen en rojo y tiemblan
const PROG = {a: 3.12, b: 8.9, pasos: [3.72, 4.76, 6.08, 7.56], enorme: 8.2};
const Progreso: React.FC<{t: number}> = ({t}) => {
  const {a, b, pasos, enorme} = PROG;
  const xs = [200, 427, 653, 880];
  const y = 1700;
  const rojo = t >= enorme;
  const iconos = [ICONO.tienda, ICONO.engranaje, ICONO.personas];
  // la línea avanza de un paso al siguiente y el cometa llega justo cuando se enciende el siguiente
  const hecho = pasos.filter((p) => t >= p).length;
  let punta = xs[0];
  if (hecho >= xs.length) punta = xs[xs.length - 1];
  else if (hecho > 0) punta = xs[hecho - 1] + (xs[hecho] - xs[hecho - 1]) * sm(lim((t - pasos[hecho - 1]) / (pasos[hecho] - pasos[hecho - 1])));
  const tiembla = rojo ? Math.sin((t - enorme) * 55) * 6 * Math.exp(-(t - enorme) * 3) : 0;
  const colLinea = rojo ? ROJO : C.amarillo;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${tiembla} 0)`}>
          <line x1={xs[0]} y1={y} x2={xs[3]} y2={y} stroke="rgba(255,255,255,0.28)" strokeWidth={8} strokeLinecap="round" strokeDasharray="2 16" />
          {hecho > 0 && <line x1={xs[0]} y1={y} x2={punta} y2={y} stroke={colLinea} strokeWidth={9} strokeLinecap="round" style={{filter: `drop-shadow(0 0 8px ${rojo ? ROJO : `rgba(${GLOW_AMARILLO},0.9)`})`}} />}
          {hecho > 0 && hecho < 4 && <circle cx={punta} cy={y} r={11} fill="#fff" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},1))`}} />}
          {xs.map((x, i) => {
            const on = t >= pasos[i];
            const fl = flota(t, i * 1.1, 3);
            const ap = aparece(t, pasos[i], i % 2 ? 12 : -12);
            const vib = rojo ? Math.sin((t - enorme) * 70 + i) * 8 * Math.exp(-(t - enorme) * 2.5) : 0;
            return (
              <g key={i} transform={`translate(${x} ${y + fl.y}) rotate(${vib})`}>
                {/* hueco que espera su turno */}
                {!on && <circle r={50} fill="rgba(16,16,20,0.55)" stroke="rgba(255,255,255,0.45)" strokeWidth={4} strokeDasharray="10 9" />}
                {on && (
                  <g>
                    <Pulso t={t} en={pasos[i]} x={0} y={0} r={58} color={C.amarillo} />
                    {rojo && <Pulso t={t} en={enorme + i * 0.05} x={0} y={0} r={58} color={ROJO} />}
                    <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                      {i < 3 ? (
                        <g>
                          <circle r={58} fill={rojo ? ROJO : C.amarillo} stroke="#fff" strokeWidth={5} />
                          <IconoTrazado d={iconos[i]} t={t} en={pasos[i] + 2 * F} color={rojo ? '#fff' : '#1b1b20'} size={62} x={-31} y={-31} />
                        </g>
                      ) : (
                        <Moneda r={58} color={rojo ? ROJO : C.amarillo} />
                      )}
                    </g>
                    <Particulas t={t} en={pasos[i]} x={0} y={0} n={8} radio={110} />
                  </g>
                )}
              </g>
            );
          })}
          <Particulas t={t} en={enorme} x={540} y={y} n={16} radio={420} colores={[ROJO, '#fff']} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 1) PIZARRA a pantalla completa con dos columnas: «NEGOCIO FÍSICO» y «AGENCIA DE SERVICIOS».
// Todo se dibuja con tiza (el trazo se dibuja y luego se rellena). Primera vez (tienda física): local, equipamiento,
// productos y comprar → vender. Segunda vez (agencia de servicios): el local y el inventario se borran (no hacen falta)
// y en su lugar aparecen la habilidad que el mercado valora y aprender a venderla. La "cámara" de la pizarra se acerca
// a la fila que se está explicando.
const TIZA = '#f3f0e6';
const TIZA_AM = '#fff3a6';
const TIZA_ROSA = '#ffb8c6';
const TIZA_ROJO = '#ff8f8f';
const COL = [315, 765];
const FILA = [480, 710, 940, 1170];
const P = {
  izq: 12.5, der: 11.6, espacio: 14.24, equipo: 14.8, productos: 16.48, comprar: 17.2, vender: 18.0,
  local: 27.8, publico: 28.68, inventario: 31.2, fuera: 32.0, habilidad: 34.08, mercado: 35.08, aprender: 36.24, venderla: 37.16,
};
// foco de la "cámara" de la pizarra: [segundo, x, y, escala]
const FOCO_PIZ: [number, number, number, number][] = [
  [11.24, 540, 760, 1.0], [12.4, 540, 520, 1.03], [14.1, 315, 560, 1.08], [14.7, 315, 720, 1.08], [16.3, 315, 960, 1.08], [17.05, 315, 1120, 1.08],
  [25.94, 540, 760, 1.0], [27.6, 765, 520, 1.08], [31.0, 765, 940, 1.08], [33.9, 765, 720, 1.08], [36.1, 765, 980, 1.06], [37.1, 600, 800, 1.03],
];
const focoPiz = (t: number) => {
  let v = FOCO_PIZ[0].slice(1) as number[];
  for (const [a, ...q] of FOCO_PIZ) {
    if (t < a) break;
    const k = SUAVE(lim((t - a) / 0.8));
    v = v.map((x, i) => x + (q[i] - x) * k);
  }
  return v;
};

// Tienda dibujada a tiza (toldo de rayas, escaparate y puerta); "fantasma" = solo contorno a trazos
const TOLDO_X = [-120, -80, -40, 0, 40, 80, 120];
const Tienda: React.FC<{t: number; en: number; fantasma?: boolean}> = ({t, en, fantasma}) => {
  const p = 1 - Math.pow(1 - lim((t - en) / 0.6), 3);
  const relleno = lim((t - en - 0.35) / 0.3);
  const trazo = {fill: 'none', stroke: TIZA, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const dib = fantasma ? {strokeDasharray: '14 14', opacity: 0.75} : {pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p};
  return (
    <g>
      {!fantasma && TOLDO_X.slice(0, 6).map((x, i) => (
        <path key={i} d={`M ${x} -50 L ${x + 40} -50 L ${-100 + (i + 1) * 33.3} -100 L ${-100 + i * 33.3} -100 Z`} fill={i % 2 ? TIZA : TIZA_AM} opacity={relleno * (i % 2 ? 0.55 : 0.85)} />
      ))}
      {!fantasma && <path d="M -120 -50 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 Z" fill={TIZA_AM} opacity={relleno * 0.85} />}
      <path d="M -120 -50 L -100 -100 L 100 -100 L 120 -50" {...trazo} {...dib} />
      <path d="M -120 -50 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0 q 20 30 40 0" {...trazo} {...dib} />
      <path d="M -105 -32 L -105 95 L 105 95 L 105 -32" {...trazo} {...dib} />
      <path d="M 30 95 L 30 12 L 85 12 L 85 95" {...trazo} {...dib} />
      <path d="M -85 8 L 10 8 L 10 62 L -85 62 Z M -37.5 8 L -37.5 62" {...trazo} {...dib} />
      {!fantasma && <circle cx={74} cy={56} r={5} fill={TIZA} opacity={relleno} />}
      <path d="M -135 95 L 135 95" {...trazo} {...dib} />
    </g>
  );
};
// Pila de tres cajas que caen una tras otra (con bote) o, en fantasma, a trazos
const Cajas: React.FC<{t: number; en: number; fantasma?: boolean; color?: string}> = ({t, en, fantasma, color = TIZA}) => {
  const pos: [number, number][] = [[-62, 34], [62, 34], [0, -72]];
  return (
    <g>
      {pos.map(([x, y], i) => {
        const e = en + i * 0.12;
        if (t < e) return null;
        const m = muelle(t, e, 2.2, 6.5);
        const v = Math.exp(-6.5 * (t - e)) * Math.sin(2 * Math.PI * 2.2 * (t - e));
        return (
          <g key={i} transform={`translate(${x} ${y - 260 * (1 - m)}) scale(${1 + 0.12 * v} ${1 - 0.12 * v})`} opacity={lim((t - e) / 0.08)}>
            {fantasma ? (
              <path d="M 0 -52 L 52 -26 L 52 30 L 0 56 L -52 30 L -52 -26 Z M -52 -26 L 0 0 L 52 -26 M 0 0 L 0 56" fill="none" stroke={TIZA} strokeWidth={6} strokeDasharray="12 12" strokeLinejoin="round" opacity={0.75} />
            ) : (
              <IconoTrazado d={ICONO.caja} t={t} en={e} color={color} size={112} x={-56} y={-56} grosor={0.9} />
            )}
          </g>
        );
      })}
    </g>
  );
};
// Borrador de pizarra (fieltro + madera)
const Borrador: React.FC = () => (
  <g transform="rotate(-8)">
    <rect x={-70} y={-34} width={140} height={44} rx={10} fill="#8a5a33" stroke="#5e3a1e" strokeWidth={3} />
    <rect x={-70} y={6} width={140} height={26} rx={6} fill="#d8d4ca" />
    <rect x={-60} y={-24} width={120} height={8} rx={4} fill="rgba(255,255,255,0.25)" />
  </g>
);
// Ficha de "no hace falta": círculo rojo de tiza con ✕
const NoHace: React.FC<{t: number; en: number; x: number; y: number}> = ({t, en, x, y}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 16);
  return (
    <g transform={`translate(${x} ${y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={46} color={TIZA_ROJO} />
      <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
        <circle r={46} fill="rgba(255,143,143,0.18)" stroke={TIZA_ROJO} strokeWidth={7} />
        <Cruz t={t} en={en + 2 * F} s={1.05} color={TIZA_ROJO} />
      </g>
    </g>
  );
};

const Pizarra: React.FC<{t: number}> = ({t}) => {
  const en1 = t >= PIZ1.a && t < PIZ1.b;
  const en2 = t >= PIZ2.a && t < PIZ2.b;
  if (!en1 && !en2) return null;
  const [fx, fy, fs] = focoPiz(t);
  const ini = en1 ? PIZ1.a : PIZ2.a;
  const div = 1 - Math.pow(1 - lim((t - ini - 0.1) / 0.6), 3);
  // cabeceras: en la primera vez manda la izquierda; en la segunda, la derecha (la otra se queda a media luz)
  const luzIzq = en1 ? 1 : iv(t, [PIZ2.a, PIZ2.a + 0.6], [1, 0.42]);
  const luzDer = en1 ? 0.32 : iv(t, [PIZ2.a + 0.3, PIZ2.a + 0.9], [0.32, 1]);
  const escribe = (en: number) => lim((t - en) / 0.55);
  // borrado del local: el borrador cruza la tienda fantasma de izquierda a derecha
  const kb = lim((t - P.publico) / 0.55);
  const bx = 600 + 360 * sm(kb);
  const borrando = t >= P.publico && kb < 1;
  // el inventario se esfuma
  const esfuma = lim((t - P.fuera) / 0.25);
  // ondas del megáfono
  const ondas = t >= P.venderla ? (t - P.venderla) : -1;
  return (
    <AbsoluteFill style={{background: '#132219', overflow: 'hidden'}}>
      {/* zona segura de Instagram: toda la pizarra se recoge un 14 % hacia abajo (el borde es del mismo verde y no se nota) */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '540px 1500px', scale: '0.86'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${fx}px ${fy}px`, scale: fs * (1 + 0.006 * Math.sin(t * 1.3))}}>
        {/* pizarra verde con polvo de tiza y manchas de borrado */}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 42%, #2c4c40 0%, #1f382e 55%, #132219 100%)'}} />
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <defs>
            <filter id="tizaE7" filterUnits="userSpaceOnUse" x={-200} y={-200} width={1500} height={2400}>
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 1.4" result="g" />
              <feComposite in="d" in2="g" operator="in" />
            </filter>
            <filter id="polvoE7">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="3" />
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.35" />
            </filter>
            <clipPath id="borradoE7">
              <rect x={borrando || t < P.publico ? bx - 20 : 2000} y={0} width={2000} height={1920} />
            </clipPath>
          </defs>
          <rect x={0} y={0} width={1080} height={1920} filter="url(#polvoE7)" opacity={0.09} />
          <ellipse cx={300} cy={1500} rx={260} ry={60} fill="#fff" opacity={0.035} transform="rotate(-6 300 1500)" />
          <ellipse cx={820} cy={300} rx={200} ry={46} fill="#fff" opacity={0.03} transform="rotate(4 820 300)" />
          {/* separación entre columnas */}
          <path d="M 540 150 L 540 1290" stroke={TIZA} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - div} opacity={0.55} filter="url(#tizaE7)" />

          <g filter="url(#tizaE7)">
            {/* ---- columna izquierda: negocio físico ---- */}
            <g opacity={en2 ? 0.45 : 1}>
              {t >= P.espacio && (() => {
                const ap = aparece(t, P.espacio, -6);
                const fl = flota(t, 0.2, 3);
                return (
                  <g transform={`translate(${COL[0]} ${FILA[0] + fl.y}) scale(${ap.sx * 0.95} ${ap.sy * 0.95}) rotate(${ap.rot})`}>
                    <Tienda t={t} en={P.espacio} />
                  </g>
                );
              })()}
              {t >= P.equipo && (() => {
                const ap = aparece(t, P.equipo, 10);
                const giro = Math.max(0, t - P.equipo - 0.4) * 40;
                return (
                  <g transform={`translate(${COL[0]} ${FILA[1]}) scale(${ap.sx} ${ap.sy})`}>
                    <g transform={`translate(-40 -8) rotate(${giro})`}>
                      <IconoTrazado d={ICONO.engranaje} t={t} en={P.equipo} color={TIZA} size={150} x={-78} y={-75} grosor={0.8} />
                    </g>
                    <g transform={`translate(78 26) rotate(${-giro * 1.6})`}>
                      <IconoTrazado d={ICONO.engranaje} t={t} en={P.equipo + 0.12} color={TIZA_AM} size={86} x={-45} y={-43} grosor={0.9} />
                    </g>
                  </g>
                );
              })()}
              <g transform={`translate(${COL[0]} ${FILA[2] + 10})`}>
                <Cajas t={t} en={P.productos} />
              </g>
              {t >= P.comprar && (() => {
                const ap = aparece(t, P.comprar, -10);
                const fl = flota(t, 1.4, 3);
                return (
                  <g transform={`translate(190 ${FILA[3] + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                    <IconoTrazado d={ICONO.carrito} t={t} en={P.comprar} color={TIZA} size={124} x={-62} y={-62} grosor={0.8} />
                  </g>
                );
              })()}
              <Conector t={t} en={P.vender - 0.25} d={`M 262 ${FILA[3]} L 340 ${FILA[3]}`} color={TIZA_AM} dur={0.25} grosor={7} punta={[340, FILA[3], 0]} />
              {t >= P.vender && (() => {
                const ap = aparece(t, P.vender, 14);
                const vaiven = Math.sin((t - P.vender) * 3) * 8;
                return (
                  <g transform={`translate(420 ${FILA[3]}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot + vaiven})`}>
                    <IconoTrazado d={ICONOS.etiqueta} t={t} en={P.vender} color={TIZA_ROSA} size={104} x={-52} y={-52} grosor={0.8} />
                  </g>
                );
              })()}
            </g>

            {/* ---- columna derecha: agencia de servicios ---- */}
            {en2 && (
              <g>
                {/* el local: tienda fantasma que el borrador se lleva */}
                {t >= P.local && (
                  <g clipPath="url(#borradoE7)">
                    <g transform={`translate(${COL[1]} ${FILA[0]}) scale(${aparece(t, P.local, -6).sx * 0.95} ${aparece(t, P.local, -6).sy * 0.95})`}>
                      <Tienda t={t} en={P.local} fantasma />
                    </g>
                  </g>
                )}
                {t >= P.publico + 0.3 && <ellipse cx={COL[1]} cy={FILA[0] + 10} rx={150 * lim((t - P.publico) / 0.5)} ry={70} fill={TIZA} opacity={0.07} />}
                <NoHace t={t} en={P.publico + 0.5} x={COL[1]} y={FILA[0]} />
                {/* el inventario: cajas fantasma que se esfuman */}
                {esfuma < 1 && (
                  <g transform={`translate(${COL[1]} ${FILA[2] + 10}) scale(${1 - sm(esfuma)}) rotate(${esfuma * 30})`}>
                    <Cajas t={t} en={P.inventario} fantasma />
                  </g>
                )}
                <NoHace t={t} en={P.fuera + 0.2} x={COL[1]} y={FILA[2]} />
                {/* la habilidad: una bombilla que se enciende, con rayos */}
                {t >= P.habilidad && (() => {
                  const ap = aparece(t, P.habilidad, -8);
                  const fl = flota(t, 0.6, 4);
                  const luz = lim((t - P.habilidad - 0.4) / 0.3);
                  return (
                    <g transform={`translate(${COL[1] - 30} ${FILA[1] + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                      {luz > 0 && <circle cx={0} cy={-14} r={70} fill={TIZA_AM} opacity={0.12 + 0.06 * Math.sin(t * 5)} />}
                      {Array.from({length: 7}, (_, i) => {
                        const ang = (-150 + i * 20) * (Math.PI / 180);
                        const r0 = 96, r1 = 118 + 8 * Math.sin(t * 6 + i);
                        return <line key={i} x1={Math.cos(ang) * r0} y1={-14 + Math.sin(ang) * r0} x2={Math.cos(ang) * r1} y2={-14 + Math.sin(ang) * r1} stroke={TIZA_AM} strokeWidth={7} strokeLinecap="round" opacity={luz} />;
                      })}
                      <IconoTrazado d={ICONO.bombilla} t={t} en={P.habilidad} color={TIZA_AM} size={150} x={-75} y={-80} grosor={0.8} />
                    </g>
                  );
                })()}
                {/* que el mercado valore: tres estrellas */}
                {[0, 1, 2].map((i) => {
                  const en = P.mercado + i * 0.14;
                  if (t < en) return null;
                  const ap = aparece(t, en, 20);
                  const fl = flota(t, i, 3);
                  return (
                    <g key={i} transform={`translate(${900} ${FILA[1] - 78 + i * 72 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                      <path d={estrella(28)} fill={TIZA_AM} stroke={TIZA} strokeWidth={3} strokeLinejoin="round" />
                    </g>
                  );
                })}
                {/* aprender a venderla: de la bombilla al megáfono */}
                <Conector t={t} en={P.aprender} d="M 840 790 C 990 860, 990 1030, 815 1090" color={TIZA_AM} dur={0.45} grosor={7} flujo punta={[815, 1090, Math.atan2(60, -175)]} />
                {t >= P.aprender && (() => {
                  const ap = aparece(t, P.aprender + 0.3, 10);
                  const fl = flota(t, 2.1, 3);
                  return (
                    <g transform={`translate(${COL[1] - 40} ${FILA[3] + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                      <IconoTrazado d={ICONO.megafono} t={t} en={P.aprender + 0.3} color={TIZA} size={140} x={-70} y={-70} grosor={0.8} />
                    </g>
                  );
                })()}
                {ondas >= 0 && [0, 1, 2].map((i) => {
                  const k = ((ondas * 1.4 + i / 3) % 1);
                  return <path key={i} d={`M ${830 + k * 90} ${FILA[3] - 50 - k * 30} Q ${860 + k * 110} ${FILA[3]}, ${830 + k * 90} ${FILA[3] + 50 + k * 30}`} fill="none" stroke={TIZA_AM} strokeWidth={7} strokeLinecap="round" opacity={(1 - k) * lim(ondas / 0.2)} />;
                })}
              </g>
            )}
          </g>
          {/* polvo de tiza al borrar y al esfumarse el inventario; brillo al encenderse la bombilla */}
          {borrando && <Particulas t={t} en={P.publico} x={bx} y={FILA[0] + 40} n={12} radio={130} colores={[TIZA, 'rgba(255,255,255,0.6)']} dur={14} />}
          <Particulas t={t} en={P.fuera} x={COL[1]} y={FILA[2]} n={14} radio={170} colores={[TIZA, TIZA_AM]} />
          <Particulas t={t} en={P.habilidad + 0.4} x={COL[1] - 30} y={FILA[1] - 14} n={12} radio={170} colores={[TIZA_AM, '#fff']} />
          <Destello t={t} en={P.mercado + 0.4} x={940} y={FILA[1] - 120} tam={26} color={TIZA_AM} />
          <Particulas t={t} en={P.venderla} x={880} y={FILA[3]} n={10} radio={140} colores={[TIZA_AM, '#fff']} />
          <Particulas t={t} en={P.vender} x={420} y={FILA[3]} n={8} radio={110} colores={[TIZA_ROSA, '#fff']} />
          {/* el borrador */}
          {t >= P.publico - 0.15 && kb < 1 && (
            <g transform={`translate(${t < P.publico ? 600 : bx} ${FILA[0] + 20 + Math.sin(kb * Math.PI * 4) * 22}) scale(${aparece(t, P.publico - 0.15, 0).sx})`}>
              <Borrador />
            </g>
          )}
        </svg>
        {/* cabeceras de las columnas, escritas con tiza */}
        {[['NEGOCIO', 'FÍSICO'], ['AGENCIA DE', 'SERVICIOS']].map((ls, c) => {
          const k = escribe(c === 0 ? P.izq : P.der);
          return (
            <div key={c} style={{position: 'absolute', left: COL[c] - 215, width: 430, top: 175, display: 'flex', flexDirection: 'column', alignItems: 'center', ...H, fontSize: 60, lineHeight: 1.04, color: c === 0 ? TIZA : TIZA_AM, opacity: c === 0 ? luzIzq : luzDer, textShadow: glow(c === 0 ? '255,255,255' : GLOW_AMARILLO, 0.6), filter: 'url(#tizaE7)'}}>
              {ls.map((l, i) => {
                const ki = lim(k * 2 - i);
                return (
                  <div key={i} style={{whiteSpace: 'nowrap', clipPath: `inset(-20% ${100 - ki * 100}% -20% -5%)`, translate: `0 ${(1 - ki) * 6}px`}}>
                    {l}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </div>
      {/* sombra abajo para los subtítulos */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)'}} />
    </AbsoluteFill>
  );
};

// 2) "en lugar de vender productos, tu negocio vende servicios a otras empresas": la caja (producto) gira como una moneda
// y por detrás sale la campanita de servicio; de ella salen tres conectores hasta tres empresas
const SERV = {a: 20.0, b: 23.86, producto: 20.16, gira: 21.76, otras: 22.92, empresas: 23.24};
const Servicios: React.FC<{t: number}> = ({t}) => {
  const {a, b, producto, gira, otras, empresas} = SERV;
  const y = 220;
  const kg = lim((t - gira) / 0.32);
  const sx = Math.abs(Math.cos(kg * Math.PI));
  const dorso = kg >= 0.5;
  const ap = aparece(t, producto, -12);
  const fl = flota(t, 0.3, 4);
  const ys = [115, 225, 335];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {ys.map((yy, i) => (
          <Conector key={i} t={t} en={otras + i * 0.08} d={`M 372 ${y} C 560 ${y}, 600 ${yy}, 788 ${yy}`} color={C.amarillo} dur={0.35} flujo grosor={7} punta={[788, yy, 0]} />
        ))}
        {t >= producto && (
          <g transform={`translate(300 ${y + fl.y}) scale(${ap.sx * Math.max(0.04, sx)} ${ap.sy}) rotate(${ap.rot})`}>
            <Pulso t={t} en={gira + 0.32} x={0} y={0} r={70} color={C.amarillo} />
            <circle r={70} fill={dorso ? C.amarillo : '#fff'} stroke="#fff" strokeWidth={5} />
            {dorso ? (
              <IconoTrazado d={ICONO.campana} t={t} en={gira + 0.16} color="#1b1b20" size={84} x={-42} y={-44} />
            ) : (
              <IconoTrazado d={ICONO.caja} t={t} en={producto + 2 * F} color="#1b1b20" size={80} x={-40} y={-40} />
            )}
          </g>
        )}
        <Particulas t={t} en={gira + 0.32} x={300} y={y} n={12} radio={150} />
        {ys.map((yy, i) => (
          <Chip key={i} t={t} en={empresas + i * 0.1} d={ICONO.edificio} x={840} y={yy} r={48} fondo="#fff" fase={i * 1.2} />
        ))}
      </Lienzo>
    </Ventana>
  );
};

// 3) "aquí entran las agencias de IA: automatizaciones, asistentes virtuales y otras soluciones a negocios":
// la chispa de la IA a la izquierda; de ella salen, uno a uno, los tres servicios; al decir "negocios" los tres
// se conectan con la tienda de la derecha, que se enciende
const AGEN = {a: 38.7, b: 45.9, ia: 38.84, artificial: 39.92, servicios: [41.6, 42.68, 44.56], negocios: 45.24};
const Agencia: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, artificial, servicios, negocios} = AGEN;
  const y = 215;
  const xs = [360, 540, 720];
  const iconos = [ICONO.engranaje, ICONO.auricular, ICONO.puzle];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {servicios.map((en, i) => (
          <Conector key={i} t={t} en={en - 0.2} d={i === 0 ? `M 236 ${y} L 306 ${y}` : `M 220 ${y - 52} C 280 ${y - 140 - i * 20}, ${xs[i] - 90} ${y - 140 - i * 20}, ${xs[i] - 30} ${y - 50}`}
            color={C.amarillo} dur={0.3} flujo grosor={6} />
        ))}
        {servicios.map((en, i) => (
          <Conector key={`n${i}`} t={t} en={negocios - 0.25 + i * 0.06} d={`M ${xs[i] + 20} ${y + 48} C ${xs[i] + 60} ${y + 120}, 780 ${y + 120}, 852 ${y + 46}`} color="#fff" dur={0.3} flujo grosor={5} punta={[852, y + 46, Math.atan2(-74, 72)]} />
        ))}
        <Chip t={t} en={ia} d={ICONO.ia} x={170} y={y} r={64} fase={0.3} />
        <Destello t={t} en={artificial} x={226} y={y - 70} tam={28} color={C.amarillo} />
        <Destello t={t} en={artificial + 0.12} x={108} y={y - 54} tam={20} />
        {servicios.map((en, i) => {
          if (t < en) return null;
          // sale de la chispa y vuela a su sitio con muelle
          const m = muelle(t, en, 2.2, 6.5);
          const x = 170 + (xs[i] - 170) * m;
          return <Chip key={i} t={t} en={en} d={iconos[i]} x={x} y={y} r={54} fondo="#fff" fase={i * 1.3} />;
        })}
        <Chip t={t} en={negocios} d={ICONO.tienda} x={910} y={y} r={62} fondo={C.amarillo} fase={0.9} />
        <Particulas t={t} en={negocios + 0.1} x={910} y={y} n={14} radio={170} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "no significa que no tengas gastos: formación, herramientas, tiempo para captar clientes y recursos para entregar
// bien el trabajo": un tique sale de la ranura a la izquierda y se imprime línea a línea (solo iconos, sin importes);
// al decir "bien" cae un sello verde con ✓
const TIQUE = {a: 50.7, b: 58.1, gastos: 50.88, lineas: [52.04, 53.0, 54.04, 55.84], clientes: 54.92, entregar: 56.92, bien: 57.36};
const Tique: React.FC<{t: number}> = ({t}) => {
  const {a, b, gastos, lineas, clientes, entregar, bien} = TIQUE;
  const x0 = 100, ancho = 246, top = 150;
  const cab = 120, alto = 92;
  const hechas = lineas.filter((l) => t >= l - 0.1).length;
  // largo del papel: crece con muelle cada vez que se imprime una línea
  let largo = cab * muelle(t, gastos, 2.0, 7);
  lineas.forEach((l, i) => {
    largo += alto * muelle(t, l - 0.1, 2.2, 7) * (i < hechas ? 1 : 0);
  });
  largo += 40 * muelle(t, bien - 0.2, 2.2, 7);
  const iconos = [ICONO.libro, ICONO.herramienta, ICONO.reloj, ICONO.caja];
  const zig = Array.from({length: 12}, (_, i) => `L ${x0 + ancho - ((i + 0.5) * ancho) / 12} ${top + largo + 12} L ${x0 + ancho - ((i + 1) * ancho) / 12} ${top + largo}`).join(' ');
  const ranura = aparece(t, gastos - 0.12, 0);
  const sello = aparece(t, bien, -24);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* papel */}
        {t >= gastos && (
          <g>
            <path d={`M ${x0} ${top} L ${x0 + ancho} ${top} L ${x0 + ancho} ${top + largo} ${zig} Z`} fill="#fbfaf5" stroke="#fff" strokeWidth={2} />
            <clipPath id="papelE7"><rect x={x0} y={top} width={ancho} height={largo} /></clipPath>
            <g clipPath="url(#papelE7)">
              {/* cabecera: moneda del euro */}
              <g transform={`translate(${x0 + ancho / 2} ${top + 62})`}>
                <g transform={`scale(${aparece(t, gastos + 0.1, 0).sx})`}><Moneda r={40} /></g>
              </g>
              <line x1={x0 + 18} y1={top + cab - 8} x2={x0 + ancho - 18} y2={top + cab - 8} stroke="#c8c6bd" strokeWidth={3} strokeDasharray="8 7" />
              {lineas.map((l, i) => {
                if (t < l - 0.1) return null;
                const yy = top + cab + i * alto + alto / 2;
                const ap = aparece(t, l, 0);
                return (
                  <g key={i}>
                    <g transform={`translate(${x0 + 46} ${yy}) scale(${ap.sx} ${ap.sy})`}>
                      <IconoTrazado d={iconos[i]} t={t} en={l} color="#1b1b20" size={58} x={-29} y={-29} />
                    </g>
                    {i === 2 && t >= clientes && (
                      <g transform={`translate(${x0 + 100} ${yy}) scale(${aparece(t, clientes, 0).sx})`}>
                        <IconoTrazado d={ICONOS.clienteNuevo} t={t} en={clientes} color="#1b1b20" size={54} x={-27} y={-27} />
                      </g>
                    )}
                    {i === 3 && t >= entregar && (
                      <path d={`M ${x0 + 82} ${yy} L ${x0 + 112} ${yy} M ${x0 + 102} ${yy - 10} L ${x0 + 112} ${yy} L ${x0 + 102} ${yy + 10}`} stroke="#1b1b20" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none"
                        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lim((t - entregar) / 0.2)} />
                    )}
                    {/* puntos y una barra gris en lugar del importe */}
                    <line x1={x0 + (i === 2 ? 130 : i === 3 && t >= entregar ? 124 : 82)} y1={yy + 12} x2={x0 + ancho - 70} y2={yy + 12} stroke="#c8c6bd" strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />
                    <rect x={x0 + ancho - 62} y={yy - 2} width={44 * lim((t - l) / 0.25)} height={18} rx={9} fill="#d8d5cb" />
                  </g>
                );
              })}
            </g>
          </g>
        )}
        {/* ranura de la impresora */}
        {t >= gastos - 0.12 && (
          <g transform={`translate(${x0 + ancho / 2} ${top - 6}) scale(${ranura.sx} ${ranura.sy})`}>
            <rect x={-ancho / 2 - 22} y={-26} width={ancho + 44} height={34} rx={17} fill={OSCURO} stroke="#fff" strokeWidth={4} />
            <rect x={-ancho / 2 - 4} y={-4} width={ancho + 8} height={6} rx={3} fill="#000" />
          </g>
        )}
        {/* sello verde de "bien hecho" */}
        {t >= bien && (
          <g transform={`translate(${x0 + ancho - 30} ${top + largo - 40}) scale(${sello.sx * (1 + 0.6 * Math.exp(-(t - bien) * 14))} ${sello.sy * (1 + 0.6 * Math.exp(-(t - bien) * 14))}) rotate(${-14 + sello.rot})`}>
            <Pulso t={t} en={bien} x={0} y={0} r={46} color={VERDE} />
            <circle r={46} fill={VERDE} stroke="#fff" strokeWidth={5} />
            <Check t={t} en={bien + 0.08} s={1.05} />
          </g>
        )}
        <Particulas t={t} en={bien} x={x0 + ancho - 30} y={top + 520} n={12} radio={150} colores={[VERDE, '#fff']} />
      </Lienzo>
    </Ventana>
  );
};

// 5) "un modelo de servicio, con una estructura diferente a la de muchos negocios tradicionales": una balanza se dibuja;
// en el platillo derecho cae la campanita del servicio (la balanza cede un poco hacia ese lado); al decir "negocios
// tradicionales" en el izquierdo caen la tienda, las cajas y la maquinaria y la balanza se va hacia ese lado con muelle
const BAL = {a: 58.2, b: 64.7, dibuja: 58.3, servicio: 59.64, diferente: 61.84, tradicional: 63.48};
const Balanza: React.FC<{t: number}> = ({t}) => {
  const {a, b, dibuja, servicio, diferente, tradicional} = BAL;
  const cx = 540, py = 120, brazo = 300, cuelga = 120;
  const p = 1 - Math.pow(1 - lim((t - dibuja) / 0.6), 3);
  // inclinación (grados, positivo = baja la izquierda) con muelle en cada carga
  const ang = -7 * muelle(t, servicio + 0.15, 1.6, 4.5) + 21 * muelle(t, tradicional + 0.15, 1.4, 3.8);
  const r = (ang * Math.PI) / 180;
  const [lx, ly] = [cx - brazo * Math.cos(r), py + brazo * Math.sin(r)];
  const [rx, ry] = [cx + brazo * Math.cos(r), py - brazo * Math.sin(r)];
  const plato = (x: number, y: number, carga: React.ReactNode, en: number) => (
    <g>
      <path d={`M ${x} ${y} L ${x - 78} ${y + cuelga} M ${x} ${y} L ${x + 78} ${y + cuelga}`} stroke="#fff" strokeWidth={4} opacity={0.85} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lim((t - en) / 0.35)} />
      <g opacity={lim((t - en - 0.2) / 0.2)}>
        <path d={`M ${x - 96} ${y + cuelga} Q ${x} ${y + cuelga + 52}, ${x + 96} ${y + cuelga} Z`} fill={OSCURO} stroke={C.amarillo} strokeWidth={6} strokeLinejoin="round" />
      </g>
      <g transform={`translate(${x} ${y + cuelga - 4})`}>{carga}</g>
    </g>
  );
  const cae = (en: number, dy: number) => {
    const m = muelle(t, en, 2.2, 6.5);
    return {transform: `translate(0 ${-(1 - m) * 200 + dy})`, opacity: lim((t - en) / 0.1)};
  };
  const pulsoDif = t >= diferente ? Math.exp(-(t - diferente) * 4) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* poste y base */}
        <path d={`M ${cx} ${py} L ${cx} ${py + 230} M ${cx - 70} ${py + 236} L ${cx + 70} ${py + 236}`} stroke="#fff" strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
        {/* brazo */}
        <path d={`M ${lx} ${ly} L ${rx} ${ry}`} stroke={pulsoDif > 0.05 ? C.amarillo : '#fff'} strokeWidth={11 + 5 * pulsoDif} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
          style={{filter: pulsoDif > 0.05 ? `drop-shadow(0 0 ${12 * pulsoDif}px rgba(${GLOW_AMARILLO},1))` : 'none'}} />
        <circle cx={cx} cy={py} r={16 * p} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
        {plato(lx, ly, t >= tradicional ? (
          <g>
            {[[-50, ICONO.tienda, 0], [50, ICONO.caja, 0.12], [0, ICONO.engranaje, 0.24]].map(([dx, d, k], i) => {
              const en = tradicional + (k as number);
              if (t < en) return null;
              const c = cae(en, i === 2 ? -78 : -36);
              return (
                <g key={i} transform={c.transform} opacity={c.opacity}>
                  <g transform={`translate(${dx as number} 0)`}>
                    <circle r={44} fill="#fff" stroke="#fff" strokeWidth={3} />
                    <IconoTrazado d={d as string} t={t} en={en} color="#1b1b20" size={56} x={-28} y={-28} />
                  </g>
                </g>
              );
            })}
          </g>
        ) : null, dibuja + 0.3)}
        {plato(rx, ry, t >= servicio ? (
          <g {...cae(servicio, -42)}>
            <circle r={46} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
            <IconoTrazado d={ICONO.campana} t={t} en={servicio} color="#1b1b20" size={58} x={-29} y={-31} />
          </g>
        ) : null, dibuja + 0.4)}
        <Particulas t={t} en={tradicional + 0.35} x={lx} y={ly + cuelga} n={14} radio={160} />
        <Particulas t={t} en={servicio + 0.2} x={rx} y={ry + cuelga} n={8} radio={110} />
        <Destello t={t} en={diferente} x={cx + 60} y={py - 50} tam={28} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "conocer el funcionamiento de una agencia de IA... he preparado un curso introductorio de 14 clases":
// una lupa recorre dos engranajes que giran (el funcionamiento) y en el centro brilla la IA; al decir "curso" todo se recoge
// en la tarjeta del curso, que al decir "14" se abre en abanico como una mano de cartas (14 clases que se encienden en ola)
const CURSO = {a: 64.9, b: 72.66, conocer: 65.24, funciona: 65.68, agencia: 66.8, curso: 70.76, clases: 71.8};
const Curso: React.FC<{t: number}> = ({t}) => {
  const {a, b, conocer, funciona, agencia, curso, clases} = CURSO;
  const y = 225;
  const recoge = sm(lim((t - curso + 0.25) / 0.3));
  const giro = Math.max(0, t - funciona) * 70;
  const apE = aparece(t, funciona, 12);
  const lupaX = 540 + Math.sin((t - conocer) * 1.6) * 120;
  const lupaY = y - 20 + Math.cos((t - conocer) * 2.1) * 30;
  const apL = aparece(t, conocer, -14);
  const apC = aparece(t, curso, -8);
  const abanico = sm(lim((t - clases) / 0.45));
  const fl = flota(t, 1.2, 4);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {recoge < 1 && t >= funciona && (
          <g transform={`translate(540 ${y + fl.y}) scale(${apE.sx * (1 - recoge)} ${apE.sy * (1 - recoge)})`}>
            <g transform={`translate(-62 10) rotate(${giro})`}>
              <IconoTrazado d={ICONO.engranaje} t={t} en={funciona} color="#fff" size={170} x={-88} y={-85} grosor={0.8} />
            </g>
            <g transform={`translate(84 -54) rotate(${-giro * 1.7})`}>
              <IconoTrazado d={ICONO.engranaje} t={t} en={funciona + 0.12} color={C.amarillo} size={104} x={-54} y={-52} grosor={0.9} />
            </g>
            {t >= agencia && (
              <g transform={`translate(-62 10) scale(${aparece(t, agencia, 0).sx})`}>
                <circle r={34} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
                <IconoTrazado d={ICONO.ia} t={t} en={agencia} color="#1b1b20" size={44} x={-22} y={-22} />
              </g>
            )}
          </g>
        )}
        {recoge < 1 && t >= conocer && (
          <g transform={`translate(${lupaX} ${lupaY}) scale(${apL.sx * (1 - recoge)} ${apL.sy * (1 - recoge)}) rotate(${apL.rot - 20})`}>
            <circle r={78} fill="rgba(255,255,255,0.12)" stroke="#fff" strokeWidth={10} />
            <path d="M -40 -42 A 58 58 0 0 1 22 -54" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
            <path d="M 56 56 L 118 118" stroke="#fff" strokeWidth={22} strokeLinecap="round" />
            <path d="M 56 56 L 118 118" stroke={C.amarillo} strokeWidth={12} strokeLinecap="round" />
          </g>
        )}
        <Destello t={t} en={agencia + 0.1} x={500} y={y - 90} tam={26} color={C.amarillo} />
        {/* tarjeta del curso */}
        {t >= curso && abanico < 1 && (
          <g transform={`translate(540 ${y + fl.y}) scale(${apC.sx * (1 - abanico * 0.4)} ${apC.sy * (1 - abanico * 0.4)}) rotate(${apC.rot})`} opacity={1 - abanico}>
            <rect x={-130} y={-88} width={260} height={176} rx={22} fill={OSCURO} stroke="#fff" strokeWidth={6} />
            <circle r={42} fill={C.amarillo} />
            <IconoTrazado d={ICONO.play} t={t} en={curso + 3 * F} color="#1b1b20" size={52} x={-23} y={-26} />
          </g>
        )}
        {/* 14 clases en abanico */}
        {t >= clases && Array.from({length: 14}, (_, i) => {
          const th = ((-62 + (i * 124) / 13) * abanico * Math.PI) / 180;
          const R = 330;
          const cx = 540 + R * Math.sin(th), cy = 560 - R * Math.cos(th) + fl.y;
          const ola = Math.max(0, Math.sin((t - clases - 0.4) * 5 - i * 0.45));
          const on = ola > 0.55;
          return (
            <g key={i} transform={`translate(${cx} ${cy}) rotate(${(th * 180) / Math.PI}) scale(${0.6 + 0.4 * abanico + 0.08 * ola})`}>
              <rect x={-38} y={-52} width={76} height={104} rx={12} fill={on ? C.amarillo : OSCURO} stroke={C.amarillo} strokeWidth={4} />
              <path d="M -10 -16 L 16 0 L -10 16 Z" fill={on ? '#1b1b20' : '#fff'} />
            </g>
          );
        })}
        <Particulas t={t} en={clases + 0.35} x={540} y={y + 40} n={16} radio={340} />
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
const rosaFuerte: React.CSSProperties = {...rosa, textShadow: glow('255,177,191', 1.3)};
// El hook (una sola frase) va entero en grande: arriba, encima de la cabeza; después, sobre el pecho; y el montaje de
// clips en grande y más abajo (por encima de la línea de progreso, sin tapar caras del B-roll)
const MONTAJE = 1290;
const GRANDES: Grande[] = [
  // Cuando alguien piensa en abrir un negocio,
  {a: 0.04, b: 1.84, top: 60, lineas: [{ws: [['cuando', 0.04], ['alguien', 0.28]], size: 84}, {ws: [['piensa', 0.6], ['en', 0.92], ['abrir', 1.0]], size: 84},
    {ws: [['un negocio', 1.32, amarillo]], size: 130, golpe: true}]},
  // muchas veces se imagina
  {a: 1.84, b: 3.02, top: 960, lineas: [{ws: [['muchas', 1.84], ['veces', 2.24]], size: 90}, {ws: [['se imagina', 2.57, amarillo]], size: 130, golpe: true}]},
  // alquilar un local, comprar maquinaria, contratar empleados y hacer una inversión enorme
  {a: 3.12, b: 4.2, top: MONTAJE, lineas: [{ws: [['alquilar', 3.12], ['un', 3.6]], size: 90}, {ws: [['local', 3.72, amarillo]], size: 160, golpe: true}]},
  {a: 4.24, b: 5.48, top: MONTAJE, lineas: [{ws: [['comprar', 4.24]], size: 90}, {ws: [['maquinaria', 4.76, amarillo]], size: 130, golpe: true}]},
  {a: 5.52, b: 6.84, top: MONTAJE, lineas: [{ws: [['contratar', 5.52]], size: 90}, {ws: [['empleados', 6.08, amarillo]], size: 140, golpe: true}]},
  {a: 6.88, b: 8.86, top: MONTAJE - 90, lineas: [{ws: [['y', 6.88], ['hacer', 7.08], ['una', 7.36]], size: 84}, {ws: [['inversión', 7.56]], size: 130, golpe: true}, {ws: [['enorme', 8.2, rosaFuerte]], size: 160, golpe: true}]},
  // Pero no todos los negocios funcionan así.
  {a: 8.92, b: 11.2, top: 900, lineas: [{ws: [['pero', 8.92], ['no', 9.24], ['todos', 9.4]], size: 84}, {ws: [['los', 9.72], ['negocios', 9.84]], size: 96}, {ws: [['funcionan', 10.24]], size: 104}, {ws: [['así', 10.72, amarillo]], size: 170, golpe: true}]},
  // Cambia completamente la estructura.
  {a: 23.88, b: 25.9, top: 900, lineas: [{ws: [['cambia', 23.88]], size: 90}, {ws: [['completamente', 24.32]], size: 98}, {ws: [['la', 25.16]], size: 84}, {ws: [['estructura', 25.32, amarillo]], size: 128, golpe: true}]},
  // Puedes acceder por solo un euro.
  {a: 72.72, b: 74.76, top: 960, lineas: [{ws: [['puedes', 72.72], ['acceder', 73.08]], size: 84}, {ws: [['por', 73.6], ['solo', 73.92]], size: 90}, {ws: [['1 €', 74.28, amarillo]], size: 190, golpe: true}]},
];
const LISTA: [number, number] = [-10, -10];
const CTA = 75.0;
const CTA_FIN = 76.16; // tras "haz clic aquí abajo ↓" sigue la frase en subtítulos (como en los demás 1E)
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
// Se reparte por lo que ocupa el bloque de verdad (ancho de cada letra de Montserrat Bold medido con la fuente, en "em")
// y no por número de letras: así "de inteligencia artificial" cabe en una línea y nada se sale de los 880 px útiles
const LETRA: Record<string, number> = {a: 0.617, b: 0.69, c: 0.591, d: 0.692, e: 0.631, f: 0.387, g: 0.7, h: 0.691, i: 0.301, j: 0.307, k: 0.655, l: 0.301, m: 1.049, n: 0.691, o: 0.655,
  p: 0.69, q: 0.69, r: 0.431, s: 0.531, t: 0.435, u: 0.687, v: 0.598, w: 0.937, x: 0.595, y: 0.598, z: 0.543, á: 0.617, é: 0.631, í: 0.301, ó: 0.655, ú: 0.687, ñ: 0.691, ü: 0.687,
  I: 0.328, A: 0.766, '1': 0.392, '4': 0.689, '€': 0.811};
const ANCHO_SUB = 740; // no llega a la columna de botones de Instagram (x≈930)
const anchoBloque = (ws: W[]) => ws.reduce((s, x) => s + [...limpiar(x[0])].reduce((u, c) => u + (LETRA[c] ?? 0.65), 0), 0) * 70 + 0.28 * 70 * (ws.length - 1);
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
      if (trozo.length > 1 && anchoBloque(trozo) > ANCHO_SUB) continue;
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
const CLAVE = new Set(['tienda', 'espacio', 'equipamiento', 'productos', 'servicios', 'empresas', 'local', 'inventario', 'habilidad', 'venderla', 'agencias',
  'automatizaciones', 'asistentes', 'soluciones', 'gastos', 'formación', 'herramientas', 'tiempo', 'clientes', 'recursos', 'servicio', 'diferente', 'tradicionales',
  'funcionamiento', 'curso', 'clases', 'negocio']);

// Sombra difusa detrás de los subtítulos para que se lean sobre cualquier fondo
const FondoSub: React.FC<{opacidad: number}> = ({opacidad}) => (
  <div
    style={{
      position: 'absolute', left: -80, right: -80, top: 1300, height: 300, opacity: opacidad,
      background: 'radial-gradient(ellipse 52% 48% at 50% 50%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
    }}
  />
);

// un bloque largo (p. ej. una palabra muy larga) baja un poco de tamaño para no pasar de ~760 px: no llega a la columna de botones
const tamSub = (ws: W[]) => Math.min(70, 760 / (Math.max(1, ws.map((w) => limpiar(w[0])).join(' ').length) * 0.6));
const Subtitulos: React.FC<{t: number}> = ({t}) => {
  if (SIN_TEXTO) return null;
  const hay = (x: number) => BLOQUES.some((bq) => x >= bq.a && x < bq.b);
  const op = Math.max(...[-4, -2, 0, 2, 4].map((d) => (hay(t + d * F) ? 1 - Math.abs(d) / 6 : 0)));
  const bl = BLOQUES.find((x) => t >= x.a && t < x.b);
  return (
    <>
      {op > 0 && <FondoSub opacidad={op} />}
      {bl && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: tamSub(bl.ws), fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
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
const ANCHO = 800; // x 140-940: margen de Instagram a los lados y sin meterse bajo la columna de botones (x≈930) // ancho útil: ~100 px de margen a cada lado
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
// Zona segura de Instagram para el texto grande: x 140-940 (márgenes y columna de botones), nunca por encima de ARRIBA
// (barra del móvil y cabecera) ni por debajo de ABAJO (botón «Ver detalles» de los anuncios). Si un bloque pedía estar más
// arriba, baja y se reduce un 10 %; si se salía por abajo, sube. La palabra de golpe deja margen para su animación de entrada.
const ARRIBA = 230;
const ABAJO = 1480;
const ANCHO_GOLPE = 740;
const tamLinea = (l: Linea, baja: boolean) => Math.min(l.size * (baja ? 0.9 : 1), (l.golpe ? ANCHO_GOLPE : ANCHO) / (Math.max(1, l.ws.map((w) => w[0]).join(' ').length) * FACTOR));
const topSeguro = (top: number, lineas: Linea[], baja: boolean, a = -1, b = -1) => {
  // además, sin pisar los elementos animados que estén en pantalla a la vez (arriba o abajo)
  const [arriba, abajo] = hueco(ZONAS as Zona[], a, b, ARRIBA, ABAJO);
  return Math.max(arriba, Math.min(Math.max(top, arriba), abajo - lineas.flatMap(partir).reduce((s, l) => s + tamLinea(l, baja) * 1.02 + 4, 0)));
};
const FraseGrande: React.FC<{t: number; g: Grande; parte?: 'arriba' | 'abajo'}> = ({t, g, parte = 'arriba'}) =>
  // sin líneas en esta parte no se pinta nada (ni el velo)
  SIN_TEXTO || !g.lineas.some((l) => (parte === 'abajo') === !!l.abajo) ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: topSeguro(parte === 'abajo' ? 1180 : g.top, g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo), g.top < ARRIBA && parte !== 'abajo', g.a, g.b + SALIDA) - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo).flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = tamLinea(l, g.top < ARRIBA && parte !== 'abajo');
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

export const ReelE7: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E7)} layout="none">
            <Video src={staticFile('e7/e7.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frase en grande por encima de la cabeza (si algún día va detrás, su recorte va encima) */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e7/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        {CAPA !== 'lottie' && CAPA !== 'texto' && <Pizarra t={t} />}
      </ConTransicion>

      <ZonaSegura t={t} zonas={ZONAS}><Progreso t={t} /></ZonaSegura>
      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <ZonaSegura t={t} zonas={ZONAS}><Servicios t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Agencia t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Tique t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Balanza t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Curso t={t} /></ZonaSegura>
      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con la flecha en la misma línea (tiempos sílaba a sílaba con la forma de onda) */}
      <Ventana t={t} a={SIN_TEXTO ? 1e9 : CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={75.0}>haz</Sube>
          <Sube t={t} en={75.22}>clic</Sube>
          <Sube t={t} en={75.4}>aquí</Sube>
          <Sube t={t} en={75.6} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 75.72 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 75.72)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 75.0, 75.22, 75.4, 75.6].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 0.6, -8], ['boom', 1.4, -4], ['pop', 2.57, -6],
        ['pop', 3.72, -7], ['thud', 4.76, -6], ['pop', 6.08, -7], ['boom', 7.56, -6], ['cineboom', 8.2, -4], ['negativo', 8.3, -10], ['boom', 10.72, -4],
        ['swish', 11.4, -12], ['swish', 12.92, -11], ['pop', 14.24, -8], ['loading', 14.8, -12], ['tapcorto', 16.5, -9], ['tapcorto', 16.62, -9], ['tapcorto', 16.74, -9], ['pop', 17.2, -8], ['ding', 18.0, -9],
        ['pop', 20.16, -8], ['swoosh2', 21.76, -10], ['ding', 22.08, -8], ['tings', 23.24, -10], ['boom', 25.32, -4],
        ['swish', 27.8, -11], ['swoosh3', 28.68, -9], ['tapcorto', 31.22, -10], ['tapcorto', 31.34, -10], ['tapcorto', 31.46, -10], ['suck', 32.0, -9],
        ['reveal', 34.08, -9], ['twinkle', 35.08, -9], ['swish', 36.24, -10], ['popup', 37.16, -8],
        ['pop', 38.84, -7], ['twinkle', 39.92, -10], ['pop', 41.6, -8], ['pop', 42.68, -8], ['pop', 44.56, -8], ['exito', 45.24, -8],
        ['datos', 50.88, -10], ['tap', 52.04, -9], ['tap', 53.0, -9], ['tap', 54.04, -9], ['pop', 54.92, -9], ['tap', 55.84, -9], ['confirmar', 57.36, -7],
        ['swish', 58.3, -11], ['thud', 59.7, -8], ['ding', 61.84, -10], ['boom', 63.6, -6],
        ['swish', 65.24, -11], ['loading', 65.68, -13], ['pop', 66.8, -8], ['pop', 70.76, -7], ['puntos', 71.8, -10], ['exito', 72.3, -9], ['cineboom', 74.28, -4],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
