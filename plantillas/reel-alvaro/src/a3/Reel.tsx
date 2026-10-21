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
import {Check, Chip, Conector, Destello, IconoTrazado, Lienzo, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'enfoque', golpe: 'destello', impacto: 'chispas', sub: 'enfoque', flecha: 'desliza'};

export const DURACION_A3 = 70.04;
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
  [0.5, 1.05, 0.8, 'suave'],
  [1.4, 1.12, 0.16, 'golpe'],
  [2.44, 1.0, 0, 'corte'],
  [4.68, 1.02, 0, 'corte'],
  [4.75, 1.08, 1.8, 'suave'],
  [7.72, 1.15, 0.16, 'golpe'],
  [8.64, 1.04, 0.8, 'suave'],
  [9.12, 1.08, 1.0, 'suave'],
  [10.12, 1.04, 0.8, 'suave'],
  [11.2, 1.1, 0.3, 'golpe'],
  [12.12, 1.0, 0, 'corte'],
  [20.56, 1.0, 0, 'corte'],
  [20.6, 1.06, 5.0, 'suave'],
  [27.32, 1.04, 0.6, 'suave'],
  [28.8, 1.15, 0.16, 'golpe'],
  [29.36, 1.05, 0.6, 'suave'],
  [30.04, 1.12, 0.2, 'golpe'],
  [30.76, 1.04, 0.8, 'suave'],
  [33.36, 1.14, 0.16, 'golpe'],
  [34.24, 1.0, 0, 'corte'],
  [37.68, 1.0, 0, 'corte'],
  [37.75, 1.05, 1.4, 'suave'],
  [39.28, 1.07, 0.3, 'golpe'],
  [40.88, 1.1, 0.3, 'golpe'],
  [43.2, 1.13, 0.3, 'golpe'],
  [46.72, 1.04, 0.8, 'suave'],
  [48.12, 1.13, 0.16, 'golpe'],
  [49.0, 1.04, 0.8, 'suave'],
  [50.0, 1.07, 2.4, 'suave'],
  [53.24, 1.12, 0.16, 'golpe'],
  [54.0, 1.05, 0.4, 'suave'],
  [54.64, 1.13, 0.16, 'golpe'],
  [55.44, 1.05, 0.8, 'suave'],
  [56.48, 1.06, 2.0, 'suave'],
  [58.52, 1.0, 0, 'corte'],
  [63.4, 1.0, 0, 'corte'],
  [63.45, 1.06, 4.5, 'suave'],
  [68.2, 1.1, 0.5, 'suave'],
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
const IMPACTOS = [1.76, 7.72, 28.8];
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
  {src: 'recepcionista', a: 2.44, b: 4.68, desde: 0.5, foco: 0.5},
  {src: 'persona', a: 12.12, b: 14.72, desde: 3, foco: 0.5},
  {src: 'dental', a: 14.76, b: 18.2, desde: 2, foco: 0.5},
  {src: 'ia', a: 18.2, b: 20.56, desde: 2, foco: 0.5},
  {src: 'herramientas', a: 34.24, b: 37.68, desde: 1, foco: 0.5},
  {src: 'especialista', a: 58.52, b: 61.24, desde: 1, foco: 0.5},
  {src: 'codigo', a: 61.24, b: 63.4, desde: 1, foco: 0.5, vertical: true},
];
const CORTES = Array.from(new Set(BROLL.flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
const ANCHO_BROLL = 3413; // 16:9 a 1920 de alto

// Encuadre automático (scripts/encuadre.py): pista de foco que sigue al sujeto de cada clip
const PISTAS = ENCUADRE as unknown as Record<string, [number, number][]>;
const focoEn = (b: B, t: number) => {
  const p = PISTAS[b.src];
  if (!p) return b.foco;
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
            <Video src={staticFile(`a3/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
// Sin ráfagas, rayas ni subrayados sobre los títulos: el texto grande entra limpio
const lim = (x: number) => Math.min(1, Math.max(0, x));
const ICONO = {
  telefono: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z',
  ia: ICONO10.ia,
  pregunta: ICONO10.pregunta,
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
  herramienta: ICONO10.herramienta,
  ciclo: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
};

// 1) "suena el teléfono y algunas de esas llamadas se quedan sin responder": la ficha del teléfono tiembla al sonar
// con ondas que salen, el contador de llamadas perdidas salta con cada una y, al decir "sin responder", el teléfono
// se pone en rojo y las llamadas perdidas salen disparadas
const TEL = {a: 4.6, b: 8.6, suena: 4.68, cuenta: 6.44, paso: 0.16, max: 9, rojo: 7.72};
const Telefono: React.FC<{t: number}> = ({t}) => {
  const {a, b, suena, cuenta, paso, max, rojo} = TEL;
  const x = 540, y = 250, R = 82;
  const ap = aparece(t, suena, -16);
  const fl = flota(t, 0.3, 4);
  const n = t < cuenta ? 0 : Math.min(max, Math.floor((t - cuenta) / paso) + 1);
  const tn = cuenta + (n - 1) * paso;
  const salto = n > 0 ? 1 + 0.35 * Math.exp(-10 * (t - tn)) * Math.cos((t - tn) * 30) : 1;
  const enRojo = t >= rojo;
  const vibra = t < rojo + 0.4 ? Math.sin(t * 64) * (enRojo ? 4 : 9) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${x} ${y + fl.y})`}>
          {/* ondas del timbre */}
          {!enRojo && [0, 0.33, 0.66].map((d) => {
            const p = (((t - suena) * 1.5 + d) % 1 + 1) % 1;
            return t >= suena ? <circle key={d} r={R + p * 70} fill="none" stroke={C.amarillo} strokeWidth={6 * (1 - p) + 1} opacity={0.85 * (1 - p)} /> : null;
          })}
          <Pulso t={t} en={rojo} x={0} y={0} r={R} color={ROJO} dur={16} />
          <g transform={`scale(${ap.sx * fl.s} ${ap.sy * fl.s}) rotate(${ap.rot + vibra})`}>
            <circle r={R} fill={enRojo ? ROJO : '#fff'} stroke="#fff" strokeWidth={6} style={{filter: enRojo ? `drop-shadow(0 0 16px ${ROJO})` : 'none'}} />
            <IconoTrazado d={ICONO.telefono} t={t} en={suena + 2 * F} color={enRojo ? '#fff' : '#1b1b20'} size={96} x={-48} y={-48} />
          </g>
          {n > 0 && (
            <g transform={`translate(${R * 0.72} ${-R * 0.72}) scale(${salto})`}>
              <circle r={38} fill={ROJO} stroke="#fff" strokeWidth={5} />
              <text y={16} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={46} fill="#fff">{n}</text>
            </g>
          )}
          {/* las llamadas perdidas salen disparadas a los lados */}
          {Array.from({length: 6}, (_, k) => {
            const u = (t - rojo - k * 0.05) / 0.7;
            if (u < 0 || u > 1) return null;
            const ang = Math.PI + (k / 5) * Math.PI; // abanico hacia arriba
            const e = 1 - Math.pow(1 - u, 3);
            return (
              <g key={k} transform={`translate(${Math.cos(ang) * (R + 150 * e)} ${Math.sin(ang) * (R + 110 * e) + 40 * u * u}) rotate(${u * 160}) scale(${0.55 + 0.25 * Math.sin(u * Math.PI)})`} opacity={1 - u}>
                <circle r={22} fill={ROJO} stroke="#fff" strokeWidth={3} />
                <g transform="translate(-12 -12)"><path d={ICONO.telefono} fill="#fff" /></g>
              </g>
            );
          })}
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 2) "un asistente de IA capaz de contestar el teléfono, responder las preguntas habituales y ayudar a gestionar
// reservas": la ficha de la IA arriba lanza un conector con punta hacia cada tarea cuando se nombra; al decir
// "reservas" el calendario se marca con un ✓
const FLUJO = {a: 20.56, b: 27.3, ia: 20.62, tareas: [21.2, 22.92, 25.96], reserva: 26.64};
const Flujo: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, tareas, reserva} = FLUJO;
  const xs = [230, 540, 850];
  const yIA = 118, yT = 300;
  const icon = [ICONO.telefono, ICONO.pregunta, ICONO.calendario];
  const ok = aparece(t, reserva, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {xs.map((x, i) => {
          // curva desde la IA hasta la parte de arriba de cada tarea; la punta sigue la tangente del final
          const x0 = 540 + (i - 1) * 40, y0 = yIA + 50, x1 = x, y1 = yT - 64;
          // sale en horizontal de la IA y baja en vertical hasta la tarea (la punta entra hacia abajo)
          const cx = x1, cy = y0 + 6;
          const ang = Math.atan2(y1 - cy, x1 - cx);
          return <Conector key={i} t={t} en={tareas[i] - 0.3} d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`} color={C.amarillo} dur={0.3} flujo grosor={6} punta={[x1, y1, ang]} />;
        })}
        {xs.map((x, i) => (
          t < tareas[i] ? <circle key={i} cx={x} cy={yT} r={18 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" opacity={lim((t - a - 0.2 * i) / 0.25)} /> :
            <Chip key={i} t={t} en={tareas[i]} d={icon[i]} x={x} y={yT} r={56} fondo="#fff" fase={i * 1.3} />
        ))}
        <Chip t={t} en={ia} d={ICONO.ia} x={540} y={yIA} r={62} fase={0.5} />
        {t >= reserva && (
          <g transform={`translate(${850 + 42} ${yT - 42}) scale(${ok.sx} ${ok.sy})`}>
            <circle r={24} fill={VERDE} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 10px ${VERDE})`}} />
            <Check t={t} en={reserva + F} s={0.6} />
          </g>
        )}
        <Particulas t={t} en={reserva} x={850} y={yT} n={10} radio={120} colores={[VERDE, '#ffffff']} />
      </Lienzo>
    </Ventana>
  );
};

// 3) "una instalación inicial y una cuota mensual por mantenimiento": la llave (instalación) cae con muelle,
// el "+" se dibuja con dos trazos y la ficha del ciclo (cuota mensual) entra girando y sigue girando sin parar
const COBRO = {a: 52.52, b: 56.44, instalacion: 52.72, mas: 53.96, cuota: 54.32, mantenimiento: 55.44};
const Cobro: React.FC<{t: number}> = ({t}) => {
  const {a, b, instalacion, mas, cuota, mantenimiento} = COBRO;
  const y = 250;
  const m1 = lim((t - mas) / (4 * F)), m2 = lim((t - mas - 2 * F) / (4 * F));
  const giro = (t - cuota) * 140;
  const ap = aparece(t, cuota, 0);
  const fl = flota(t, 1.6, 4);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={instalacion} d={ICONO.herramienta} x={330} y={y} r={74} fase={0.2} />
        {t >= mas && (
          <g stroke="#fff" strokeWidth={14} strokeLinecap="round" style={{filter: `drop-shadow(0 0 8px rgba(255,255,255,0.6))`}}>
            <path d={`M 540 ${y - 34} L 540 ${y + 34}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - m1} />
            <path d={`M 506 ${y} L 574 ${y}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - m2} />
          </g>
        )}
        {t >= cuota && (
          <g transform={`translate(750 ${y + fl.y})`}>
            <Pulso t={t} en={cuota} x={0} y={0} r={74} color={C.amarillo} />
            <Pulso t={t} en={mantenimiento} x={0} y={0} r={74} color={C.amarillo} />
            <g transform={`scale(${ap.sx * fl.s} ${ap.sy * fl.s})`}>
              <circle r={74} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
              <g transform={`rotate(${giro})`}>
                <IconoTrazado d={ICONO.ciclo} t={t} en={cuota + 2 * F} color="#1b1b20" size={88} x={-44} y={-44} />
              </g>
            </g>
            <Particulas t={t} en={cuota} x={0} y={0} n={8} radio={140} />
            <Destello t={t} en={mantenimiento} x={66} y={-66} tam={26} color="#fff" />
          </g>
        )}
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
  // HOOK (detrás de Álvaro)
  {a: 0.04, b: 2.4, top: 70, lineas: [{ws: [['imagínate', 0.04], ['que', 0.8], ['tienes', 0.92], ['una', 1.2]], size: 84, abajo: true}, {ws: [['clínica', 1.4]], size: 150, golpe: true}, {ws: [['dental', 1.76, amarillo]], size: 150, golpe: true}]},
  // Recepcionista (B-roll)
  {a: 2.44, b: 4.6, top: 260, lineas: [{ws: [['cada', 2.44], ['vez', 2.76], ['que', 2.92], ['tu', 3.0]], size: 90}, {ws: [['recepcionista', 3.12]], size: 120, golpe: true}, {ws: [['está', 3.76], ['ocupada', 4.0]], size: 90}]},
  // Sin responder
  {a: 6.96, b: 8.6, top: 1000, lineas: [{ws: [['se', 6.96], ['quedan', 7.28]], size: 80}, {ws: [['sin responder', 7.72, rosaFuerte]], size: 130, golpe: true}]},
  // Reservar una cita (B-roll)
  {a: 13.32, b: 14.7, top: 260, lineas: [{ws: [['que', 13.32], ['quería', 13.44], ['reservar', 13.72]], size: 90}, {ws: [['una cita', 14.16, amarillo]], size: 150, golpe: true}]},
  // Asistente de IA (B-roll)
  {a: 18.2, b: 20.5, top: 260, lineas: [{ws: [['un', 18.2], ['asistente', 18.52], ['de', 19.12]], size: 90}, {ws: [['inteligencia', 19.2]], size: 120, golpe: true}, {ws: [['artificial', 19.76, amarillo]], size: 120, golpe: true}]},
  // Un problema real
  {a: 27.32, b: 29.3, top: 1000, lineas: [{ws: [['estaría', 27.32], ['resolviendo', 27.76]], size: 80}, {ws: [['un', 28.28], ['problema', 28.44]], size: 90}, {ws: [['real', 28.8, amarillo]], size: 200, golpe: true}]},
  // Desde cero
  {a: 32.16, b: 34.15, top: 1000, lineas: [{ws: [['una', 32.16], ['inteligencia', 32.32]], size: 80}, {ws: [['artificial', 32.84]], size: 80}, {ws: [['desde cero', 33.36, rosaFuerte]], size: 140, golpe: true}]},
  // Herramientas (B-roll)
  {a: 34.24, b: 35.5, top: 260, lineas: [{ws: [['existen', 34.24]], size: 90}, {ws: [['herramientas', 34.64, amarillo]], size: 120, golpe: true}]},
  // Agencia de IA
  {a: 46.72, b: 48.95, top: 1000, lineas: [{ws: [['eso', 46.72], ['es', 47.0], ['lo', 47.12], ['que', 47.24]], size: 80}, {ws: [['hace', 47.36], ['una', 47.76]], size: 80}, {ws: [['agencia de ia', 48.12, amarillo]], size: 130, golpe: true}]},
  // Instalación inicial + cuota mensual
  {a: 52.52, b: 53.9, top: 1000, lineas: [{ws: [['una', 52.52], ['instalación', 52.72]], size: 90}, {ws: [['inicial', 53.24, amarillo]], size: 160, golpe: true}]},
  {a: 53.96, b: 56.4, top: 1000, lineas: [{ws: [['y', 53.96], ['una', 54.08], ['cuota', 54.32]], size: 90}, {ws: [['mensual', 54.64, amarillo]], size: 160, golpe: true}, {ws: [['por', 55.24], ['mantenimiento', 55.44]], size: 80}]},
  // Especialista (B-roll)
  {a: 60.04, b: 61.2, top: 260, lineas: [{ws: [['con', 60.04], ['un', 60.16]], size: 90}, {ws: [['especialista', 60.28, amarillo]], size: 120, golpe: true}]},
];
// La lista "qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio" también cuenta como texto grande
const LISTA: [number, number] = [39.28, 46.6];
const CTA = 68.2;
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes en la misma zona: si la siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr.slice(i + 1).find((m) => Math.abs(m.top - g.top) < 300);
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, n.a - SALIDA - 0.02);
});
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
const tapado = (x: number) => x >= CTA - 0.01 || GRANDES.some((g) => x >= g.a - 0.01 && x < g.b) || (x >= LISTA[0] - 0.01 && x < LISTA[1]);

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
const CLAVE = new Set(['teléfono', 'llamadas', 'llamada', 'perdida', 'reservas', 'interesante', 'soluciones', 'servicios', 'técnica']);

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
            <Sube key={`${bl.a}-${i}`} t={t} en={a} style={CLAVE.has(limpiar(w)) ? amarillo : undefined}>
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
const DETRAS: [number, number][] = [[0, 2.68]];

export const ReelA3: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A3)} layout="none">
            <Video src={staticFile('a3/a3.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a3/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Telefono t={t} />
      <Flujo t={t} />
      <Cobro t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}

      {/* Lista: qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 860, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14, width: 800}}>
            {([['qué necesita el negocio', 39.28], ['cómo presentarle tu propuesta', 40.88], ['cómo implementar correctamente el servicio', 43.2]] as [string, number][]).map(([txt, en], i) => {
              // la tarjeta entra de lado con un muelle que se pasa y se asienta; el número salta con aplastar/estirar y gira hasta asentarse
              const p = muelle(t, en, 2.2, 7);
              const e = 1 - Math.pow(1 - lim((t - en) / (8 * F)), 3);
              const sal = iv(t, [LISTA[1] + i * 0.05, LISTA[1] + i * 0.05 + 7 * F], [0, 1], Easing.bezier(0.7, 0, 0.84, 0));
              const num = aparece(t, en + 0.12, 20);
              const fl = flota(t, i * 1.4, 3);
              return (
                <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '20px 28px', borderRadius: 28, background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.28)',
                  opacity: (t < en ? 0 : Math.min(1, e * 2)) * (1 - sal), translate: `${(1 - p) * 260 - sal * 200}px ${fl.y * 0.6}px`, filter: `blur(${(1 - e) * 6}px)`}}>
                  <div style={{width: 64, height: 64, borderRadius: 18, background: C.amarillo, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', ...H, fontSize: 40, textShadow: 'none', flexShrink: 0,
                    scale: `${num.sx} ${num.sy}`, rotate: `${num.rot}deg`, boxShadow: `0 0 ${18 * num.op}px rgba(${GLOW_AMARILLO},0.8)`}}>{i + 1}</div>
                  <span style={{...H, fontSize: 46, lineHeight: 1.08, whiteSpace: 'normal', flex: 1}}>{txt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Ventana>

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={DURACION_A3}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={68.2}>haz</Sube>
          <Sube t={t} en={68.64}>clic</Sube>
          <Sube t={t} en={69.08} style={amarillo}>aquí</Sube>
          <Sube t={t} en={69.4} style={amarillo}>debajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 69.55 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 69.55)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 68.2, 68.64, 69.08, 69.4].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 1.4, -3], ['boom', 1.76, -3], ['pop', 3.12, -3], ['tap', 4.88, -6], ['tap', 5.2, -6], ['tap', 5.52, -6], ['thud', 7.72, -3],
        ['pop', 14.16, -3], ['pop', 19.2, -3], ['pop', 19.76, -3], ['confirmar', 21.2, -2], ['confirmar', 22.92, -2], ['confirmar', 25.96, -2],
        ['boom', 28.8, -4], ['riserm', 29.36, -4], ['hit', 30.04, -2], ['thud', 33.36, -3], ['pop', 34.64, -3],
        ['burbuja', 39.28, -2], ['burbuja', 40.88, -2], ['burbuja', 43.2, -2], ['exito', 45.96, -8], ['pop', 48.12, -3], ['ding', 53.24, -5], ['pop', 54.64, -3], ['pop', 60.28, -3],
        // gráficos Lottie
        ['alerta', 7.72, -10], ['pop', 20.62, -6], ['exito', 26.64, -9], ['pop', 52.72, -6], ['tap', 53.96, -8], ['swish', 54.32, -10], ['twinkle', 55.44, -10],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
