import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {Chip, Conector, Cruz, Destello, Exclamacion, IconoTrazado, Lienzo, OSCURO, Particulas, Pulso, ROJO, aparece, flota} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'caida', golpe: 'rebote', impacto: 'confeti', sub: 'caida', flecha: 'balanceo'};

export const DURACION_E3 = 73.1;
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
// Encuadre base algo más cerrado que el plano original, para que haya margen de seguimiento
const BASE = 1.12;
// Dónde se mantiene la cara en el encuadre (tercio superior, centrada)
const OBJ_X = 540;
const OBJ_Y = 660;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.03, 0.45, 'golpe'],
  [0.5, 1.05, 1.5, 'suave'],
  [2.76, 1.14, 0.16, 'golpe'],
  [3.52, 1.04, 0.8, 'suave'],
  [5.56, 1.06, 1.5, 'suave'],
  [7.84, 1.14, 0.16, 'golpe'],
  [8.6, 1.04, 0.5, 'suave'],
  [9.16, 1.0, 0, 'corte'],
  [24.4, 1.0, 0, 'corte'],
  [24.5, 1.05, 1.0, 'suave'],
  [25.2, 1.1, 0.2, 'golpe'],
  [26.0, 1.04, 1.6, 'suave'],
  [28.36, 1.0, 0, 'corte'],
  [29.6, 1.0, 0, 'corte'],
  [29.65, 1.05, 3.0, 'suave'],
  [34.84, 1.1, 0.3, 'golpe'],
  [35.52, 1.04, 0.8, 'suave'],
  [37.4, 1.1, 0.3, 'golpe'],
  [38.64, 1.04, 0.8, 'suave'],
  [39.4, 1.0, 0, 'corte'],
  [45.6, 1.0, 0, 'corte'],
  [45.65, 1.05, 1.0, 'suave'],
  [47.16, 1.07, 0.3, 'golpe'],
  [50.6, 1.1, 0.3, 'golpe'],
  [52.16, 1.13, 0.3, 'golpe'],
  [54.2, 1.0, 0, 'corte'],
  [56.7, 1.0, 0, 'corte'],
  [56.75, 1.05, 2.0, 'suave'],
  [63.72, 1.13, 0.2, 'golpe'],
  [64.48, 1.18, 0.16, 'golpe'],
  [65.44, 1.04, 0.6, 'suave'],
  [66.72, 1.2, 0.16, 'golpe'],
  [67.32, 1.05, 0.6, 'suave'],
  [68.2, 1.08, 4.5, 'suave'],
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
// Temblor corto en los impactos fuertes
const IMPACTOS = [2.76, 7.84, 64.48, 66.72];
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
// foco = posición horizontal (0-1) de lo importante dentro del plano 16:9
type B = {src: string; a: number; b: number; etiqueta?: React.ReactNode; desde?: number; foco: number; vertical?: boolean};
const BROLL: B[] = [
  {src: 'peluqueria', a: 9.16, b: 14.84, desde: 0.5, foco: 0.3},
  {src: 'clinica', a: 14.84, b: 18.8, desde: 1, foco: 0.5},
  {src: 'restaurante', a: 18.8, b: 24.4, desde: 2, foco: 0.5},
  {src: 'ciudad', a: 25.6, b: 28.36, desde: 4, foco: 0.5},
  {src: 'multinacional', a: 39.4, b: 42.36, desde: 1, foco: 0.5},
  {src: 'cercanas', a: 42.36, b: 45.6, desde: 2, foco: 0.5},
  {src: 'comercial', a: 54.2, b: 56.7, desde: 2, foco: 0.5},
];
const CORTES = Array.from(new Set(BROLL.flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

// Encuadre automático (scripts/encuadre.py): pista de foco que sigue al sujeto de cada clip
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
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 45%', scale: iv(t, [b.a, b.b], [1.0, 1.07])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`e3/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
const ICONO = {
  // Material "event_available": cita en la agenda
  cita: 'M16.53 11.06L15.47 10l-4.88 4.88-2.12-2.12-1.06 1.06L10.59 17l5.94-5.94zM19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
  telefono: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z',
  // Material "sms": mensaje con puntos (preguntas, consultas)
  mensaje: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z',
  // Material "store": negocio de barrio
  tienda: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  ia: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  edificio: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
};

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// Tarjeta de tarea (cita, llamada, consulta): cae con muelle, aplasta al tocar y se queda balanceándose; el icono se dibuja
const Tarea: React.FC<{t: number; en: number; x: number; y: number; d: string; giro: number; prof: number; alerta?: boolean}> = ({t, en, x, y, d, giro, prof, alerta}) => {
  if (t < en - 0.25) return null;
  const k = lim((t - (en - 0.25)) / 0.25);
  const caida = (1 - k * k) * -380;
  const ap = t >= en ? aparece(t, en, giro * 2) : {sx: 0.94, sy: 1.08, rot: giro * 3, op: 1};
  const vaiven = t >= en ? Math.sin(t * 2.4 + en) * 1.2 : 0;
  const esc = 1 - prof * 0.07;
  return (
    <g transform={`translate(${x} ${y + caida - prof * 50}) scale(${ap.sx * esc} ${ap.sy * esc}) rotate(${ap.rot + giro * 0.5 + vaiven})`} opacity={lim(k * 3) * (1 - prof * 0.12)}>
      <rect x={-310} y={-72} width={620} height={144} rx={34} fill={`rgb(${250 - prof * 22},${250 - prof * 22},${252 - prof * 20})`} />
      <rect x={-310} y={-72} width={16} height={144} rx={8} fill={C.amarillo} />
      <rect x={-262} y={-46} width={92} height={92} rx={26} fill="#1b1b20" />
      <IconoTrazado d={d} t={t} en={en + 0.04} color={C.amarillo} size={58} x={-245} y={-29} />
      <rect x={-140} y={-24} width={330} height={22} rx={11} fill="#2b2d31" />
      <rect x={-140} y={14} width={210} height={16} rx={8} fill="#b9bcc4" />
      {alerta && <circle cx={262} cy={0} r={14 + 2 * Math.sin(t * 8)} fill={ROJO} />}
    </g>
  );
};

// 1) Peluquería: "gestionar citas, atender llamadas y responder preguntas" — las tareas caen una encima de otra,
// el contador rojo salta con cada una (pulso) y al acumularse sale una exclamación grande (no da abasto)
const PILA = {a: 10.32, b: 14.84, tareas: [11.32, 11.68, 12.8], agobio: 13.36};
const Pila: React.FC<{t: number}> = ({t}) => {
  const {a, b, tareas, agobio} = PILA;
  const iconos = [ICONO.cita, ICONO.telefono, ICONO.mensaje];
  const llegadas = tareas.filter((en) => t >= en).length;
  const ultima = llegadas ? tareas[llegadas - 1] : a;
  const tiembla = llegadas ? Math.sin((t - ultima) * 40) * 4 * Math.exp(-(t - ultima) * 6) : 0;
  const cnt = aparece(t, ultima, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${tiembla} 0)`}>
          {tareas.map((en, i) => (
            <Tarea key={i} t={t} en={en} x={540} y={330} d={iconos[i]} giro={[-3, 2.5, -1.5][i]} prof={Math.max(0, llegadas - 1 - i)} alerta={i === llegadas - 1} />
          ))}
          {llegadas > 0 && (
            <g transform="translate(838 248)">
              <Pulso t={t} en={ultima} x={0} y={0} r={40} color={ROJO} />
              <g transform={`scale(${cnt.sx} ${cnt.sy})`}>
                <circle r={40} fill={ROJO} stroke="#fff" strokeWidth={5} style={{filter: `drop-shadow(0 0 12px ${ROJO})`}} />
                <text x={0} y={14} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={40} fill="#fff">{llegadas}</text>
              </g>
            </g>
          )}
        </g>
        <Exclamacion t={t} en={agobio} x={210} y={200} s={1.25} />
      </Lienzo>
    </Ventana>
  );
};

// 2) Clínica: "exactamente el mismo tipo de problema" — las tres fichas de la peluquería vuelven a aparecer a la vez (es lo mismo)
const MISMO = {a: 16.9, b: 18.8, mismo: 17.84};
// 3) Restaurante: "reservas, cancelaciones y consultas constantemente" — una ficha por palabra; al decir "constantemente" laten sin parar
const RESTAURANTE = {a: 20.5, b: 24.4, fichas: [20.76, 21.44, 22.48], siempre: 23.2};
// cx = centro de la fila (en la clínica va a la izquierda para no tapar la cara del médico)
const Fichas: React.FC<{t: number; a: number; b: number; ens: number[]; iconos: string[]; fondos: string[]; colores: string[]; late?: number; cx?: number}> = ({t, a, b, ens, iconos, fondos, colores, late, cx = 540}) => (
  <Ventana suave t={t} a={a} b={b}>
    <Lienzo>
      {ens.map((en, i) => {
        const x = cx + (i - 1) * 200;
        const latido = late !== undefined && t > late ? 1 + 0.08 * Math.max(0, Math.sin((t - late) * 9 - i * 1.2)) : 1;
        return (
          <g key={i} transform={`translate(${x} 250) scale(${latido}) translate(${-x} -250)`}>
            <Chip t={t} en={en} d={iconos[i]} x={x} y={250} r={70} fondo={fondos[i]} color={colores[i]} fase={i * 1.3} />
          </g>
        );
      })}
      {late !== undefined && [0, 1, 2].map((i) => <Pulso key={i} t={t} en={late + i * 0.35} x={cx + (i - 1) * 200} y={250} r={70} color={C.amarillo} />)}
    </Lienzo>
  </Ventana>
);
// la cancelación: una cita con un ✕ rojo encima (se dibuja)
const Cancelacion: React.FC<{t: number; en: number}> = ({t, en}) =>
  t >= en + 0.2 ? (
    <Lienzo>
      <g transform={`translate(${540 + 46} ${250 - 46}) scale(${aparece(t, en + 0.2, 0).sx} ${aparece(t, en + 0.2, 0).sy})`}>
        <circle r={26} fill={ROJO} stroke="#fff" strokeWidth={4} />
        <Cruz t={t} en={en + 0.24} s={0.55} />
      </g>
    </Lienzo>
  ) : null;

// 4) "Están en tu barrio": un plano de calles se dibuja, el punto azul (tú) late y caen chinchetas de negocios;
// al decir "automatizaciones" sale la IA en el centro y lanza conexiones con flujo a cada negocio, que se encienden con una chispa
const PINES: [number, number, number, string][] = [
  [28.36, 300, 170, C.rosa], [28.9, 640, 150, '#5EE1FF'], [29.2, 430, 300, C.amarillo], [29.72, 790, 290, '#9be564'], [30.2, 210, 300, '#ffffff'],
];
const BARRIO = {a: 28.16, b: 35.4, ia: 32.36, conexiones: 32.52, herramientas: 33.72};
const Barrio: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, conexiones, herramientas} = BARRIO;
  const ap = aparece(t, a, 0);
  const dib = 1 - Math.pow(1 - lim((t - a - 0.05) / 0.7), 3);
  const fl = flota(t, 0.7, 3);
  const calles: [number, number, number, number, number][] = [[120, 230, 960, 250, 26], [120, 360, 960, 340, 20], [330, 110, 360, 400, 22], [600, 110, 570, 400, 26], [820, 110, 850, 400, 20]];
  const cx = 540, cy = 250;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(540 ${255 + fl.y}) scale(${ap.sx} ${ap.sy}) translate(-540 -255)`}>
          <rect x={110} y={100} width={860} height={310} rx={40} fill="rgba(20,22,28,0.86)" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
          <clipPath id="planoE3"><rect x={110} y={100} width={860} height={310} rx={40} /></clipPath>
          <g clipPath="url(#planoE3)">
            {calles.map(([x1, y1, x2, y2, w], i) => (
              <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * dib} y2={y1 + (y2 - y1) * dib} stroke="rgba(255,255,255,0.22)" strokeWidth={w} strokeLinecap="round" />
            ))}
            {/* conexiones de la IA a cada negocio */}
            {PINES.map(([, x, y], i) => (
              <Conector key={i} t={t} en={conexiones + i * 0.1} d={`M ${cx} ${cy} Q ${(cx + x) / 2} ${Math.min(cy, y) - 70} ${x} ${y - 52}`} color={C.amarillo} dur={0.35} flujo grosor={5} />
            ))}
          </g>
          {/* tú estás aquí */}
          {[0, 0.9, 1.8].map((d) => <Pulso key={d} t={t} en={a + 0.4 + d + Math.floor(Math.max(0, t - a - 0.4 - d) / 2.7) * 2.7} x={cx} y={cy} r={16} color="#5EE1FF" dur={22} />)}
          <circle cx={cx} cy={cy} r={12} fill="#5EE1FF" stroke="#fff" strokeWidth={4} opacity={dib} />
          {PINES.map(([en, x, y, col], i) => {
            if (t < en - 0.2) return null;
            const k = lim((t - (en - 0.2)) / 0.2);
            const caida = (1 - k * k) * -150;
            const e = t >= en ? aparece(t, en, 0) : {sx: 0.85, sy: 1.15, rot: 0, op: 1};
            const enc = t >= conexiones + i * 0.1 + 0.35;
            return (
              <g key={i}>
                <ellipse cx={x} cy={y + 4} rx={16 * k} ry={6 * k} fill="rgba(0,0,0,0.4)" />
                <g transform={`translate(${x} ${y + caida}) scale(${e.sx} ${e.sy})`} opacity={lim(k * 3)}>
                  <path d="M0 0 C -26 -34 -30 -48 -30 -60 A 30 30 0 1 1 30 -60 C 30 -48 26 -34 0 0 Z" fill={col} stroke="#111" strokeWidth={3} style={{filter: enc ? `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
                  <g transform="translate(-15 -75) scale(1.25)"><path d={ICONO.tienda} fill="#111" /></g>
                </g>
                {enc && (
                  <g transform={`translate(${x + 26} ${y - 92}) scale(${aparece(t, conexiones + i * 0.1 + 0.35, 0).sx})`}>
                    <circle r={18} fill={C.amarillo} stroke="#fff" strokeWidth={3} />
                    <g transform="translate(-11 -11) scale(0.92)"><path d={ICONO.ia} fill="#1b1b20" /></g>
                  </g>
                )}
              </g>
            );
          })}
          <Chip t={t} en={ia} d={ICONO.ia} x={cx} y={cy} r={40} fondo={C.amarillo} quieto />
          <Particulas t={t} en={herramientas} x={cx} y={cy} n={14} radio={220} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 5) "cómo funciona una agencia de IA y cómo se empieza a construir": tres engranajes caen, encajan y empiezan a girar engranados;
// en el del centro se enciende la chispa de la IA
const ENGRANAJES = {a: 57.4, b: 62.5, caen: [57.6, 57.84, 58.0], ia: 58.92, construir: 60.52};
const Engranajes: React.FC<{t: number}> = ({t}) => {
  const {a, b, caen, ia, construir} = ENGRANAJES;
  const fl = flota(t, 1.8, 3);
  const gira = Math.max(0, t - caen[2]) * 90;
  const ruedas: [number, number, number, number][] = [[400, 274, 100, 1], [540, 210, 130, -1], [680, 274, 100, 1]];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          {ruedas.map(([x, y, r, s], i) => {
            const en = caen[i];
            if (t < en - 0.25) return null;
            const k = lim((t - (en - 0.25)) / 0.25);
            const e = t >= en ? aparece(t, en, 0) : {sx: 0.9, sy: 1.1, rot: 0, op: 1};
            const esc = (r * 2) / 24;
            return (
              <g key={i} transform={`translate(${x} ${y + (1 - k * k) * -260}) scale(${e.sx} ${e.sy})`} opacity={lim(k * 3)}>
                <g transform={`rotate(${s * gira * (130 / r) + i * 12}) scale(${esc}) translate(-13 -12)`}>
                  <path d={ICONO.engranaje} fill={i === 1 ? C.amarillo : '#fff'} stroke="rgba(0,0,0,0.35)" strokeWidth={0.4} />
                </g>
              </g>
            );
          })}
          {caen.map((en, i) => <Particulas key={i} t={t} en={en} x={ruedas[i][0]} y={ruedas[i][1]} n={7} radio={110} />)}
          {t >= ia && (
            <g transform={`translate(540 210) scale(${aparece(t, ia, 0).sx} ${aparece(t, ia, 0).sy})`}>
              <circle r={34} fill="#1b1b20" stroke="#fff" strokeWidth={4} />
              <IconoTrazado d={ICONO.ia} t={t} en={ia + 0.04} color={C.amarillo} size={44} x={-22} y={-22} />
            </g>
          )}
          <Pulso t={t} en={ia} x={540} y={210} r={60} color={C.amarillo} />
          <Destello t={t} en={construir} x={300} y={170} tam={24} color={C.amarillo} />
          <Destello t={t} en={construir + 0.12} x={820} y={190} tam={20} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 6) "cómo funciona un negocio que vende soluciones de inteligencia artificial a empresas": la IA a la izquierda, una flecha con flujo
// lleva la solución (paquete) hasta las empresas a la derecha, que se encienden al llegar
const VENDE = {a: 68.1, b: 73.06, ia: 68.8, vende: 70.12, solucion: 70.4, empresas: 72.32};
const Vende: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, vende, solucion, empresas} = VENDE;
  const fl = flota(t, 2.6, 3);
  const k = lim((t - solucion) / (empresas - solucion));
  const e = k * k * (3 - 2 * k);
  const P0 = [330, 230], P1 = [540, 100], P2 = [740, 230];
  const px = (1 - e) * (1 - e) * P0[0] + 2 * (1 - e) * e * P1[0] + e * e * P2[0];
  const py = (1 - e) * (1 - e) * P0[1] + 2 * (1 - e) * e * P1[1] + e * e * P2[1];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <Chip t={t} en={ia} d={ICONO.ia} x={240} y={240} r={66} fondo={OSCURO} color={C.amarillo} quieto />
          <Conector t={t} en={vende} d="M 312 200 Q 540 70 762 200" color="rgba(255,255,255,0.75)" dur={0.4} flujo grosor={6} punta={[762, 200, Math.atan2(200 - 70, 762 - 540)]} />
          {t >= solucion && k < 1 && (
            <g transform={`translate(${px} ${py}) rotate(${(1 - e) * -30})`}>
              <rect x={-30} y={-30} width={60} height={60} rx={14} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
              <g transform="translate(-16 -16) scale(1.33)"><path d={ICONO.ia} fill="#1b1b20" /></g>
            </g>
          )}
          <Chip t={t} en={vende + 0.2} d={ICONO.edificio} x={840} y={240} r={66} fondo={t >= empresas ? C.amarillo : '#fff'} quieto />
          <Pulso t={t} en={empresas} x={840} y={240} r={70} color={C.amarillo} />
          <Particulas t={t} en={empresas} x={840} y={240} n={12} radio={150} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => s.toLowerCase().replace(/[.,]/g, '');

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra con máscara.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
const PEQ = 70; // tamaño de las líneas de apoyo
const rosaFuerte: React.CSSProperties = {...rosa, textShadow: glow('255,177,191', 1.3)};
// Solo frases CORTAS en grande (2-4 palabras, enteras), alternando con frases en subtítulo
const GRANDES: Grande[] = [
  // HOOK: primera frase delante (abajo); segunda detrás de Álvaro
  {a: 0.04, b: 3.45, top: 980, lineas: [{ws: [['voy', 0.04], ['a', 0.28], ['enseñar', 0.32], ['dónde', 0.76]], size: 72}, {ws: [['podrías', 1.12], ['encontrar', 1.6]], size: 80}, {ws: [['tus primeros', 2.12]], size: 110, golpe: true}, {ws: [['clientes', 2.76, amarillo]], size: 160, golpe: true}]},
  {a: 5.56, b: 9.1, top: 60, lineas: [{ws: [['y', 5.56], ['probablemente', 5.76], ['pases', 6.44]], size: 84, abajo: true}, {ws: [['por', 6.72], ['delante', 6.92], ['de', 7.28], ['ellos', 7.4]], size: 84, abajo: true}, {ws: [['todos los', 7.84]], size: 120, golpe: true}, {ws: [['días', 8.6, amarillo]], size: 170, golpe: true}]},
  // Peluquería / clínica / restaurante (B-roll)
  {a: 9.16, b: 10.3, top: 1150, lineas: [{ws: [['mira', 9.16], ['esta', 9.48]], size: 90}, {ws: [['peluquería', 9.68, amarillo]], size: 130, golpe: true}]},
  {a: 14.88, b: 16.7, top: 260, lineas: [{ws: [['ahora', 14.88], ['mira', 15.28], ['aquella', 15.6]], size: 90}, {ws: [['clínica', 16.16, amarillo]], size: 150, golpe: true}]},
  {a: 18.84, b: 20.35, top: 260, lineas: [{ws: [['y', 18.84], ['aquel', 19.0]], size: 90}, {ws: [['restaurante', 19.28, amarillo]], size: 140, golpe: true}]},
  // Están en tu barrio
  {a: 28.36, b: 29.6, top: 1000, lineas: [{ws: [['están', 28.36], ['en', 28.88]], size: 90}, {ws: [['tu barrio', 29.04, amarillo]], size: 160, golpe: true}]},
  // Multinacional / cercanas (B-roll)
  {a: 40.6, b: 42.34, top: 1150, lineas: [{ws: [['en', 40.6], ['venderle', 40.72], ['a', 41.32], ['una', 41.48]], size: 80}, {ws: [['multinacional', 41.68, rosaFuerte]], size: 130, golpe: true}]},
  {a: 44.44, b: 45.6, top: 1150, lineas: [{ws: [['mucho', 44.44], ['más', 44.84]], size: 90}, {ws: [['cercanas', 45.04, amarillo]], size: 150, golpe: true}]},
  // La parte comercial (B-roll)
  {a: 54.2, b: 56.7, top: 1150, lineas: [{ws: [['ahí', 54.2], ['está', 54.72], ['la', 55.04], ['parte', 55.16]], size: 80}, {ws: [['comercial', 55.48, amarillo]], size: 150, golpe: true}, {ws: [['del', 56.04], ['negocio', 56.24]], size: 80}]},
  // Oferta
  {a: 63.12, b: 64.4, top: 1000, lineas: [{ws: [['una', 63.12], ['formación', 63.28]], size: 90}, {ws: [['introductoria', 63.72, amarillo]], size: 130, golpe: true}]},
  {a: 64.36, b: 65.4, top: 980, lineas: [{ws: [['de', 64.36]], size: 80}, {ws: [['14', 64.48, amarillo]], size: 280, golpe: true}, {ws: [['clases', 64.96]], size: 100}]},
  {a: 65.44, b: 67.25, top: 960, lineas: [{ws: [['la', 65.44], ['puedes', 65.6], ['conseguir', 65.88]], size: 80}, {ws: [['por', 66.44]], size: 80}, {ws: [['1 €', 66.72, amarillo]], size: 300, golpe: true}]},
];
// La lista "detectar los problemas / hablar con los responsables / presentar una propuesta útil" también cuenta como texto grande
const LISTA: [number, number] = [47.16, 54.1];
const CTA = 67.32;
const CTA_FIN = 68.1; // tras "pulsa el botón" sigue en subtítulos
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes en la misma zona: si la siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr.slice(i + 1).find((m) => Math.abs(m.top - g.top) < 300);
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, n.a - SALIDA - 0.02);
});
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
const tapado = (x: number) => (x >= CTA - 0.01 && x < CTA_FIN) || GRANDES.some((g) => x >= g.a - 0.01 && x < g.b) || (x >= LISTA[0] - 0.01 && x < LISTA[1]);

// Subtítulos: solo las palabras que no están en grande, en bloques de hasta 4 que nunca se cruzan con un titular
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
    if (w[3] || /[,?]$/.test(w[0]) || !sig || sig[1] - w[2] > 0.3 || tapado(sig[1])) {
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
const CLAVE = new Set(['clientes', 'normales', 'ciudad', 'procesos', 'automatizaciones', 'modelo', 'necesidades', 'servicios', 'empresas']);

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
// Legibilidad: las líneas de apoyo nunca bajan de 80 px; si no caben, se parten en dos líneas (no se encogen)
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
const DETRAS: [number, number][] = [[5.4, 9.16]];

export const ReelE3: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(1, 2);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E3)} layout="none">
            <Video src={staticFile('e3/e3.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e3/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}
      <Pila t={t} />
      <Fichas t={t} a={MISMO.a} b={MISMO.b} ens={[MISMO.mismo - 0.08, MISMO.mismo, MISMO.mismo + 0.08]} iconos={[ICONO.cita, ICONO.telefono, ICONO.mensaje]} fondos={['#fff', '#fff', '#fff']} colores={['#1b1b20', '#1b1b20', '#1b1b20']} cx={400} />
      <Fichas t={t} a={RESTAURANTE.a} b={RESTAURANTE.b} ens={RESTAURANTE.fichas} iconos={[ICONO.cita, ICONO.cita, ICONO.mensaje]} fondos={['#fff', '#fff', '#fff']} colores={['#1b1b20', '#1b1b20', '#1b1b20']} late={RESTAURANTE.siempre} />
      {t >= RESTAURANTE.a && t < RESTAURANTE.b && <Cancelacion t={t} en={RESTAURANTE.fichas[1]} />}
      <Barrio t={t} />
      <Engranajes t={t} />
      <Vende t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.filter((_, i) => i !== 1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}

      {/* Lista: qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 860, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
            {([['detectar\nlos problemas', 47.16], ['hablar con\nlos responsables', 50.6], ['presentar una\npropuesta útil', 52.16]] as [string, number][]).map(([txt, en], i) => {
              const tr = iv(t, [en, en + 7 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
              return (
                <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 24, ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>
                  <svg width={84} height={84} viewBox="0 0 84 84" style={{overflow: 'visible', flexShrink: 0}}>
                    <Pulso t={t} en={en + 3 * F} x={42} y={42} r={40} color={C.amarillo} />
                    <g transform={`translate(42 42) scale(${tr >= 1 ? aparece(t, en + 6 * F, 0).sx : 1} ${tr >= 1 ? aparece(t, en + 6 * F, 0).sy : 1}) translate(-42 -42)`}>
                      <circle cx={42} cy={42} r={37} fill={tr >= 1 ? C.amarillo : 'none'} stroke={C.amarillo} strokeWidth={6} strokeDasharray={233} strokeDashoffset={233 * (1 - tr)} transform="rotate(-90 42 42)" />
                      <text x={42} y={58} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={44} fill={tr >= 1 ? '#111' : C.amarillo}>{i + 1}</text>
                    </g>
                    <Particulas t={t} en={en + 6 * F} x={42} y={42} n={8} radio={80} />
                  </svg>
                  <span style={{...H, fontSize: 62, lineHeight: 1.0, whiteSpace: 'pre'}}>{txt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Ventana>

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={67.32}>pulsa</Sube>
          <Sube t={t} en={67.64}>el</Sube>
          <Sube t={t} en={67.76} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 67.9 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 67.9)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 67.32, 67.64, 67.76].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 2.12, -3], ['thud', 7.84, -3], ['pop', 9.68, -3], ['notif', 11.32, -6], ['notif', 11.68, -6], ['notif', 12.8, -6], ['alerta', 13.4, -9],
        ['pop', 16.16, -3], ['pop', 19.28, -3], ['popup', 28.36, -6], ['popup', 28.9, -6], ['popup', 29.2, -6], ['popup', 29.72, -6], ['popup', 30.2, -6], ['boom', 29.04, -4],
        ['thud', 41.68, -3], ['pop', 45.04, -3], ['click', 47.16], ['click', 50.6], ['click', 52.16], ['hit', 55.48, -3], ['pop', 63.72, -3], ['boom', 64.48, -3],
        ['riser', 66.72, -3], ['boom', 66.72, -2], ['twinkle', 66.95, -6],
        ['popup', 17.76, -8], ['popup', 17.84, -8], ['popup', 17.92, -8], ['pop', 20.76, -6], ['negativo', 21.44, -8], ['pop', 22.48, -6], ['tings', 23.2, -12],
        ['reveal', 32.36, -8], ['datos', 32.52, -11], ['twinkle', 33.72, -9],
        ['thud', 57.6, -9], ['thud', 57.84, -9], ['thud', 58.0, -9], ['ding', 58.92, -9],
        ['pop', 68.8, -7], ['swish', 70.12, -10], ['confirmar', 72.32, -8],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
