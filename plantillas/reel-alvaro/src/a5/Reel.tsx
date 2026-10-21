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
import {Chip, Conector, Cruz, Interrogante, Lienzo, OSCURO, ROJO, ICONOS, Destello, IconoTrazado, Particulas, Pulso, aparece, flota, muelle, puntaFlecha} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'ola', golpe: 'eco', impacto: 'rombos', sub: 'ola', flecha: 'pendulo'};

// Álvaro hasta "…cómo fue su proceso" (T1), luego el testimonio de Billy (D s) y después el CTA de Álvaro
const FUENTE = 70.25;
const T1 = 65.2; // en el silencio tras "proceso" (la palabra termina en 65,14 y "Si quieres" empieza en 65,28)
const D_TESTIMONIO = 18.86;
export const DURACION_A5 = 89.11;
const TESTIMONIO = {a: T1, b: T1 + D_TESTIMONIO};
// tiempo del reel → tiempo del vídeo de Álvaro
const fuente = (t: number) => (t < T1 ? t : t - D_TESTIMONIO);
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
  [0.02, 1.03, 0.36, 'golpe'],
  [0.4, 1.12, 0.18, 'golpe'],
  [1.0, 1.04, 0.8, 'suave'],
  [2.8, 1.07, 0.6, 'suave'],
  [3.44, 1.15, 0.16, 'golpe'],
  [4.2, 1.04, 0.8, 'suave'],
  [5.12, 1.08, 0.4, 'suave'],
  [6.0, 1.04, 0.6, 'suave'],
  [6.96, 1.12, 0.2, 'golpe'],
  [7.7, 1.04, 0.8, 'suave'],
  [8.9, 1.07, 2.5, 'suave'],
  [11.5, 1.04, 1.0, 'suave'],
  [12.9, 1.08, 1.6, 'suave'],
  [14.7, 1.04, 0.8, 'suave'],
  [15.6, 1.07, 1.2, 'suave'],
  [17.0, 1.04, 0.8, 'suave'],
  [19.41, 1.1, 0.25, 'golpe'],
  [20.2, 1.04, 0.8, 'suave'],
  [21.52, 1.08, 0.4, 'suave'],
  [23.54, 1.11, 0.3, 'golpe'],
  [24.6, 1.04, 0.8, 'suave'],
  [25.3, 1.07, 3.0, 'suave'],
  [28.6, 1.04, 0.8, 'suave'],
  [30.1, 1.06, 0.8, 'suave'],
  [32.04, 1.13, 0.2, 'golpe'],
  [32.8, 1.04, 0.8, 'suave'],
  [33.7, 1.05, 0.6, 'suave'],
  [34.61, 1.07, 0.4, 'suave'],
  [35.45, 1.09, 0.4, 'suave'],
  [36.96, 1.11, 0.4, 'suave'],
  [38.42, 1.13, 0.4, 'suave'],
  [39.6, 1.04, 1.0, 'suave'],
  [40.8, 1.07, 1.6, 'suave'],
  [42.66, 1.04, 0.6, 'suave'],
  [43.85, 1.14, 0.2, 'golpe'],
  [44.6, 1.04, 0.6, 'suave'],
  [45.6, 1.13, 0.2, 'golpe'],
  [46.4, 1.04, 0.6, 'suave'],
  [47.84, 1.16, 0.16, 'golpe'],
  [48.6, 1.04, 0.8, 'suave'],
  [51.28, 1.15, 0.16, 'golpe'],
  [52.1, 1.04, 0.8, 'suave'],
  [53.5, 1.07, 1.8, 'suave'],
  [55.66, 1.04, 0.8, 'suave'],
  [56.5, 1.07, 3.0, 'suave'],
  [59.7, 1.04, 0.8, 'suave'],
  [60.6, 1.07, 4.0, 'suave'],
  [65.2, 1.0, 0, 'corte'],
  [84.06, 1.0, 0, 'corte'],
  [84.08, 1.05, 0.8, 'suave'],
  [84.71, 1.08, 2.0, 'suave'],
  [87.45, 1.1, 0.4, 'suave'],
  [88.36, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [0.4, 3.44, 43.85, 47.84];
const SACUDIDA: [number, number][] = [[12, -8], [-9, 6], [5, -3], [-2, 1]];
const camara = (t: number) => {
  const s = BASE * escala(t);
  const [fx, fy] = cara(fuente(t));
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
// Este reel no lleva B-roll: el testimonio es la ruptura visual
const BROLL: B[] = [];
// El testimonio entra y sale con la misma transición que el B-roll
const PANTALLAS: {a: number; b: number}[] = [TESTIMONIO];
const CORTES = Array.from(new Set([...BROLL, ...PANTALLAS].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
            <Video src={staticFile(`a5/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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

// Las palabras de Billy (testimonio) van en otro color; Álvaro con el estilo normal
const enIA = (x: number) => x >= T1 - 0.01 && x < T1 + D_TESTIMONIO;
const estiloIA: React.CSSProperties = {color: '#5EE1FF', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('94,225,255', 0.9)}`};

// Iconos 24x24 (Material Icons / revisados en PruebaIconos)
const ICONO = {
  maletin: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
  megafono: ICONOS.megafono,
  chispa: 'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2zm7 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
  birrete: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
  lupa: ICONOS.lupa,
  personas: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  documento: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  estrella: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z',
  auricular: 'M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h4v1h-7v2h6c1.66 0 3-1.34 3-3V10c0-4.97-4.03-9-9-9z',
};
const ORO = '#ffd34d';

// 0) "yo también haría preguntas": tres interrogaciones grandes que saltan sobre la cabeza
const Preguntas: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={6.85} b={8.2}>
    <Lienzo>
      <Interrogante t={t} en={6.96} x={250} y={250} s={1.2} fase={0} />
      <Interrogante t={t} en={7.04} x={540} y={140} s={1.55} color={ROJO} fase={1.3} />
      <Interrogante t={t} en={7.12} x={830} y={250} s={1.2} fase={2.6} />
    </Lienzo>
  </Ventana>
);

// 1) "demasiadas promesas y muy pocas explicaciones sobre el trabajo que realmente hay detrás": bocadillos de promesas
// (destellos) que se amontonan; una explicación pequeña y apagada; al decir "trabajo" aparecen engranajes detrás
// y en "detrás" los bocadillos revientan uno a uno y dejan ver el trabajo real
const PROMESAS = {a: 8.75, b: 14.6, promesas: 8.89, explicacion: 10.68, trabajo: 12.06, revienta: 12.96};
const BOCADILLOS: [number, number, number][] = [[205, 285, -8], [370, 173, 6], [710, 173, -6], [875, 285, 8], [540, 118, 0]];
const Bocadillo: React.FC<{t: number; en: number; x: number; y: number; giro: number; revienta: number; fase: number}> = ({t, en, x, y, giro, revienta, fase}) => {
  if (t < en) return null;
  const k = lim((t - revienta) / 0.16);
  if (k >= 1) return <Particulas t={t} en={revienta} x={x} y={y} n={9} radio={110} colores={['#ffffff', C.amarillo]} dur={14} />;
  const ap = aparece(t, en, giro * 2);
  const fl = flota(t, fase, 5);
  const latido = 1 + 0.05 * Math.sin(t * 7 + fase);
  return (
    <g transform={`translate(${x} ${y + fl.y}) rotate(${giro + ap.rot}) scale(${ap.sx * latido * (1 + 0.5 * k)} ${ap.sy * latido * (1 + 0.5 * k)})`} opacity={1 - k}>
      <path d="M -74 -46 H 74 A 20 20 0 0 1 94 -26 V 26 A 20 20 0 0 1 74 46 H -10 L -34 72 L -32 46 H -74 A 20 20 0 0 1 -94 26 V -26 A 20 20 0 0 1 -74 -46 Z" fill="#fff" stroke={C.amarillo} strokeWidth={5} strokeLinejoin="round" />
      <IconoTrazado d={ICONO.chispa} t={t} en={en + 2 * F} color="#e2b100" size={52} x={-60} y={-26} />
      <IconoTrazado d={ICONO.estrella} t={t} en={en + 4 * F} color="#e2b100" size={44} x={10} y={-22} />
    </g>
  );
};
const Promesas: React.FC<{t: number}> = ({t}) => {
  const {a, b, promesas, explicacion, trabajo, revienta} = PROMESAS;
  const engr = aparece(t, trabajo, 0);
  const g1 = (t - trabajo) * 80;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* el trabajo de detrás: dos engranajes que engranan */}
        {t >= trabajo && (
          <g transform={`translate(540 230) scale(${engr.sx} ${engr.sy})`}>
            <circle r={150} fill={OSCURO} stroke="#fff" strokeWidth={5} />
            <g transform={`translate(-42 18) rotate(${g1}) translate(-66 -66) scale(5.5)`}><path d={ICONO.engranaje} fill={C.amarillo} /></g>
            <g transform={`translate(62 -46) rotate(${-g1 * 1.6 + 18}) translate(-40 -40) scale(3.33)`}><path d={ICONO.engranaje} fill="#fff" /></g>
          </g>
        )}
        <Particulas t={t} en={trabajo} x={540} y={230} n={12} radio={240} />
        {/* muy pocas explicaciones: una sola hoja pequeña y apagada */}
        {t >= explicacion && t < trabajo && (
          <g transform={`translate(540 300) scale(${aparece(t, explicacion, 0).sx * 0.8})`} opacity={0.75}>
            <circle r={44} fill="rgba(40,40,46,0.92)" stroke="rgba(255,255,255,0.55)" strokeWidth={4} />
            <IconoTrazado d={ICONO.documento} t={t} en={explicacion + 2 * F} color="rgba(255,255,255,0.8)" size={50} x={-25} y={-25} />
          </g>
        )}
        {BOCADILLOS.map(([x, y, giro], i) => (
          <Bocadillo key={i} t={t} en={promesas + i * 0.13} x={x} y={y} giro={giro} revienta={revienta + i * 0.09} fase={i * 1.3} />
        ))}
      </Lienzo>
    </Ventana>
  );
};

// 2) Trayectoria: 2020 → agencias de marketing → servicios de IA → hoy enseñamos el modelo. Los huecos laten, el camino se
// dibuja con un cometa hasta cada hito y cada hito salta con su icono trazado; al final salen las personas que lo aprenden
const TRAYECTO = {a: 16.9, b: 30.0, hitos: [19.41, 21.52, 23.54, 25.28], personas: 26.81};
const Trayectoria: React.FC<{t: number}> = ({t}) => {
  const {a, b, hitos, personas} = TRAYECTO;
  const xs = [170, 413, 667, 910];
  const y = 300;
  const iconos = [ICONO.maletin, ICONO.megafono, ICONO.chispa, ICONO.birrete];
  const fl = flota(t, 0.7, 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <line x1={xs[0]} y1={y} x2={xs[3]} y2={y} stroke="rgba(255,255,255,0.28)" strokeWidth={6} strokeDasharray="2 14" strokeLinecap="round" />
          {xs.slice(0, 3).map((x, i) => {
            const en = hitos[i + 1] - 0.55;
            const p = 1 - Math.pow(1 - lim((t - en) / 0.55), 3);
            if (p <= 0 || t < hitos[0]) return null;
            const x2 = x + 66 + (xs[i + 1] - 66 - x - 66) * p;
            return (
              <g key={i}>
                <line x1={x + 66} y1={y} x2={x2} y2={y} stroke={C.amarillo} strokeWidth={9} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />
                {p < 1 && <circle cx={x2} cy={y} r={12} fill="#fff" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />}
                {p >= 1 && <line x1={x + 66} y1={y} x2={x2} y2={y} stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeDasharray="4 22" strokeDashoffset={-(t - en) * 60} opacity={0.8} />}
              </g>
            );
          })}
          {xs.map((x, i) => {
            const en = hitos[i];
            if (t >= en) return null;
            const nace = aparece(t, a + i * 0.1, 0);
            return <circle key={i} cx={x} cy={y} r={(48 + 4 * Math.sin(t * 4 + i)) * nace.sx} fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.7)" strokeWidth={4} strokeDasharray="10 9" />;
          })}
        </g>
        {xs.map((x, i) => <Chip key={i} t={t} en={hitos[i]} d={iconos[i]} x={x} y={y + fl.y} r={64} fase={i * 1.1} quieto />)}
        {/* "a personas que quieren crear su propia agencia": salen tres alumnos del último hito */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <Conector t={t} en={personas + i * 0.12} d={`M 910 ${y + 66} Q ${910 - 40 + i * 20} ${y + 120} ${780 + i * 85} ${y + 160}`} color="rgba(255,255,255,0.7)" dur={0.3} grosor={4} />
            <Chip t={t} en={personas + 0.25 + i * 0.12} d={ICONO.persona} x={780 + i * 85} y={y + 190} r={36} fondo="#fff" fase={i * 1.7} />
          </g>
        ))}
      </Lienzo>
    </Ventana>
  );
};

// 3) "esto no consiste en darle un botón y empezar a cobrar": un botón rojo enorme, el cursor llega y lo pulsa (el botón
// se aplasta y rebota), sale una moneda… y una ✕ roja lo tacha: no funciona así
const BOTON = {a: 30.3, b: 33.66, boton: 30.39, cursor: 31.3, pulsa: 32.04, moneda: 32.71, no: 33.0};
const Boton: React.FC<{t: number}> = ({t}) => {
  const {a, b, boton, cursor, pulsa, moneda, no} = BOTON;
  const ap = aparece(t, boton, 0);
  const k = t - pulsa;
  const aplasta = k > 0 && k < 0.5 ? Math.exp(-7 * k) * Math.cos(k * 30) * 0.35 : 0;
  // el cursor llega desde la derecha y baja a pulsar
  const llega = 1 - Math.pow(1 - lim((t - cursor) / 0.6), 3);
  const baja = k > -0.12 && k < 0.25 ? Math.sin(lim((k + 0.12) / 0.37) * Math.PI) * 14 : 0;
  const cx = 860 - (860 - 590) * llega, cy = 120 + (230 - 120) * llega + baja;
  const mon = aparece(t, moneda, 0);
  const sube = lim((t - moneda) / 0.5);
  const tiembla = t > no && t < no + 0.45 ? Math.sin((t - no) * 60) * 7 * (1 - (t - no) / 0.45) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${540 + tiembla} 300) scale(${ap.sx} ${ap.sy})`}>
          <rect x={-150} y={10} width={300} height={70} rx={24} fill={OSCURO} stroke="#fff" strokeWidth={5} />
          <g transform={`translate(0 14) scale(${1 + aplasta * 0.4} ${1 - aplasta})`}>
            <path d="M -110 0 A 110 86 0 0 1 110 0 Z" fill={ROJO} stroke="#fff" strokeWidth={5} style={{filter: `drop-shadow(0 0 14px ${ROJO})`}} />
            <ellipse cx={-40} cy={-46} rx={26} ry={12} fill="rgba(255,255,255,0.45)" />
          </g>
          {t >= moneda && (
            <g transform={`translate(0 ${-60 - 110 * sube}) scale(${mon.sx} ${mon.sy}) rotate(${(t - moneda) * 260})`} opacity={1 - lim((t - no) / 0.3) * 0.7}>
              <circle r={42} fill={ORO} stroke="#fff" strokeWidth={5} />
              <text y={18} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={50} fill="#7a5600">€</text>
            </g>
          )}
          {t >= no && <g transform="translate(0 -10)"><Cruz t={t} en={no} s={4.2} color={ROJO} /></g>}
        </g>
        <Pulso t={t} en={pulsa} x={540} y={300} r={130} color={ROJO} />
        {t >= cursor && (
          <g transform={`translate(${cx} ${cy}) rotate(-12)`}>
            <path d="M 0 0 L 0 62 L 16 47 L 28 74 L 40 68 L 28 42 L 50 42 Z" fill="#fff" stroke="#1b1b20" strokeWidth={5} strokeLinejoin="round" />
          </g>
        )}
      </Lienzo>
    </Ventana>
  );
};

// 4) "Y tampoco todo el mundo avanza al mismo ritmo": tres carriles; cada punto corre a su velocidad dejando estela
// y estalla al llegar a la meta
const RITMO = {a: 39.9, b: 42.6, sale: 40.02, durs: [1.0, 1.7, 2.45]};
const Ritmo: React.FC<{t: number}> = ({t}) => {
  const {a, b, sale, durs} = RITMO;
  const x0 = 170, x1 = 900;
  const cols = [C.amarillo, '#ffffff', C.rosa];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g>
          <line x1={x1 + 20} y1={90} x2={x1 + 20} y2={330} stroke="#fff" strokeWidth={6} strokeDasharray="12 10" opacity={0.85} />
          {[0, 1, 2].map((i) => {
            const y = 130 + i * 90;
            const dib = lim((t - a - i * 0.08) / 0.3);
            const p = lim((t - sale) / durs[i]);
            const e = 1 - Math.pow(1 - p, 2);
            const x = x0 + (x1 - x0) * e;
            return (
              <g key={i}>
                <line x1={x0} y1={y} x2={x0 + (x1 - x0) * dib} y2={y} stroke="rgba(255,255,255,0.22)" strokeWidth={16} strokeLinecap="round" />
                {t >= sale && <line x1={x0} y1={y} x2={x} y2={y} stroke={cols[i]} strokeWidth={16} strokeLinecap="round" opacity={0.85} style={{filter: `drop-shadow(0 0 10px ${cols[i]})`}} />}
                {t >= sale && <circle cx={x} cy={y} r={20 + (p < 1 ? 2 * Math.sin(t * 30) : 0)} fill="#fff" stroke={cols[i]} strokeWidth={6} />}
                <Pulso t={t} en={sale + durs[i]} x={x1} y={y} r={26} color={cols[i]} />
                <Particulas t={t} en={sale + durs[i]} x={x1} y={y} n={8} radio={80} colores={[cols[i], '#ffffff']} />
              </g>
            );
          })}
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 5) El caso de Billy (solo lo que él cuenta, sin inventar nada):
// a) "7 meses en cerrar sus primeros 4 clientes": siete meses que se encienden y cuatro clientes que caen en los últimos
const MESES = {a: 43.6, b: 46.55, meses: 43.85, clientes: 45.6};
const Meses: React.FC<{t: number}> = ({t}) => {
  const {a, b, meses, clientes} = MESES;
  const xs = Array.from({length: 7}, (_, i) => 210 + i * 110);
  const y = 290;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <line x1={xs[0]} y1={y} x2={xs[6]} y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeLinecap="round" />
        {xs.map((x, i) => {
          const en = meses + i * 0.07;
          const on = t >= en;
          const e = on ? aparece(t, en, 0) : aparece(t, a + i * 0.03, 0);
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${e.sx} ${e.sy})`}>
              <circle r={30} fill={on ? C.amarillo : 'rgba(0,0,0,0.45)'} stroke="#fff" strokeWidth={4} style={{filter: on ? `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
              <circle r={8} fill={on ? '#1b1b20' : 'rgba(255,255,255,0.5)'} />
            </g>
          );
        })}
        {[3, 4, 5, 6].map((m, i) => {
          const en = clientes + i * 0.1;
          if (t < en) return null;
          const k = t - en;
          const caida = Math.min(1, (k / 0.28) ** 2);
          const rebote = k > 0.28 ? Math.exp(-9 * (k - 0.28)) * Math.sin((k - 0.28) * 26) * 10 : 0;
          const cy = -60 + (y - 110 + 60) * caida - rebote;
          return (
            <g key={m}>
              <line x1={xs[m]} y1={cy + 40} x2={xs[m]} y2={y - 30} stroke="#fff" strokeWidth={4} opacity={caida >= 1 ? 0.7 : 0} />
              <g transform={`translate(${xs[m]} ${cy})`}>
                <circle r={42} fill="#fff" stroke={C.amarillo} strokeWidth={5} />
                <g transform="translate(-24 -24) scale(2)"><path d={ICONO.persona} fill="#1b1b20" /></g>
              </g>
              <Particulas t={t} en={en + 0.28} x={xs[m]} y={y - 110} n={7} radio={80} />
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};
// b) "En ese tiempo cobró 9.900 € en instalaciones": las monedas caen y se apilan con un rebote
const MONEDAS = {a: 47.6, b: 50.2, en: 47.84};
const Monedas: React.FC<{t: number}> = ({t}) => {
  const {a, b, en} = MONEDAS;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {Array.from({length: 6}, (_, i) => {
          const e0 = en + i * 0.09;
          if (t < e0) return null;
          const k = t - e0;
          const caida = Math.min(1, (k / 0.3) ** 2);
          const yb = 340 - i * 30;
          const yy = -80 + (yb + 80) * caida - (k > 0.3 ? Math.exp(-10 * (k - 0.3)) * Math.sin((k - 0.3) * 30) * 8 : 0);
          const x = 540 + Math.sin(i * 2.1) * 10;
          return (
            <g key={i} transform={`translate(${x} ${yy})`}>
              <ellipse cy={10} rx={96} ry={26} fill="#b98900" stroke="#fff" strokeWidth={4} />
              <ellipse rx={96} ry={26} fill={ORO} stroke="#fff" strokeWidth={4} />
              <text y={11} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={30} fill="#7a5600">€</text>
            </g>
          );
        })}
        <Destello t={t} en={en + 0.6} x={650} y={170} tam={30} color={C.amarillo} />
        <Particulas t={t} en={en + 0.75} x={540} y={200} n={14} radio={220} colores={[ORO, '#ffffff']} />
      </Lienzo>
    </Ventana>
  );
};
// c) "y ahora tiene 500 € al mes de mantenimientos sin tener que volver a vender": una moneda en el centro de un ciclo
// (flecha circular que se dibuja con la punta en la tangente y gira) y los meses que se van encendiendo uno tras otro
const CICLO = {a: 50.9, b: 55.4, aparece: 51.28, mes: 52.18};
const Ciclo: React.FC<{t: number}> = ({t}) => {
  const {a, b, aparece: en, mes} = CICLO;
  const cx = 540, cy = 230, R = 130;
  const ap = aparece(t, en, 0);
  const dib = 1 - Math.pow(1 - lim((t - en - 0.1) / 0.7), 3);
  const g0 = -90, barrido = 300 * dib;
  const g1 = g0 + barrido;
  const p = (g: number) => [cx + Math.cos((g * Math.PI) / 180) * R, cy + Math.sin((g * Math.PI) / 180) * R];
  const [x0, y0] = p(g0), [x1, y1] = p(g1);
  const giro = t > en + 0.8 ? (t - en - 0.8) * 40 : 0;
  const fin = ((g1 + 90) * Math.PI) / 180; // tangente en el final (sentido horario)
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`rotate(${giro} ${cx} ${cy})`}>
          {dib > 0 && <path d={`M ${x0} ${y0} A ${R} ${R} 0 ${barrido > 180 ? 1 : 0} 1 ${x1} ${y1}`} fill="none" stroke={C.amarillo} strokeWidth={14} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />}
          {dib >= 1 && <path d={puntaFlecha(x1, y1, fin, 34, 24)} fill="none" stroke={C.amarillo} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />}
          {/* doce meses alrededor: se encienden uno detrás de otro, en bucle */}
          {Array.from({length: 12}, (_, i) => {
            const g = (-90 + i * 30) * (Math.PI / 180);
            const on = t >= mes && Math.floor((t - mes) * 8) % 12 === i;
            return <circle key={i} cx={cx + Math.cos(g) * (R + 34)} cy={cy + Math.sin(g) * (R + 34)} r={on ? 11 : 6} fill={on ? '#fff' : 'rgba(255,255,255,0.4)'} opacity={lim((t - en - i * 0.03) / 0.2)} />;
          })}
        </g>
        <g transform={`translate(${cx} ${cy}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          <circle r={80} fill={ORO} stroke="#fff" strokeWidth={6} style={{filter: `drop-shadow(0 0 18px ${ORO})`}} />
          <circle r={62} fill="none" stroke="#b98900" strokeWidth={4} />
          <text y={30} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={84} fill="#7a5600">€</text>
        </g>
        <Pulso t={t} en={mes} x={cx} y={cy} r={90} color={ORO} />
        <Particulas t={t} en={en} x={cx} y={cy} n={14} radio={230} colores={[ORO, '#ffffff']} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "me gustaría que escucharas directamente su historia": unos auriculares de los que salen ondas de sonido
const ESCUCHA = {a: 61.3, b: 65.16, en: 61.47, historia: 63.18};
const Escucha: React.FC<{t: number}> = ({t}) => {
  const {a, b, en, historia} = ESCUCHA;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {t >= en + 0.2 && [-1, 1].map((l) =>
          [0, 1, 2].map((i) => {
            const k = ((t - en) * 1.3 + i / 3) % 1;
            const r = 90 + k * 110;
            return <path key={`${l}${i}`} d={`M ${540 + l * r * 0.62} ${250 - r * 0.78} A ${r} ${r} 0 0 ${l > 0 ? 1 : 0} ${540 + l * r * 0.62} ${250 + r * 0.78}`} fill="none" stroke={t >= historia ? C.amarillo : '#fff'} strokeWidth={8} strokeLinecap="round" opacity={(1 - k) * 0.9} />;
          }),
        )}
        <Chip t={t} en={en} d={ICONO.auricular} x={540} y={250} r={80} fase={0.5} />
      </Lienzo>
    </Ventana>
  );
};

// 7) Hay que aprender a: prospectar / reunirse con negocios / presentar propuestas / entregar un buen servicio
// (cascada que baja peldaño a peldaño: cada ficha salta con su icono trazado y un conector con flujo lleva a la siguiente)
const PELDANOS: [string, number, string][] = [
  ['prospectar', 34.61, ICONO.lupa],
  ['reunirse con\nnegocios', 35.45, ICONO.personas],
  ['presentar\npropuestas', 36.96, ICONO.documento],
  ['entregar un\nbuen servicio', 38.42, ICONO.estrella],
];
const Cascada: React.FC<{t: number}> = ({t}) => {
  const tops = [1030, 1140, 1270, 1400];
  const lefts = [110, 170, 230, 290];
  const sale = iv(t, [LISTA[1], LISTA[1] + SALIDA], [0, 1]);
  return (
    <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
      <div style={{position: 'absolute', left: -60, right: -60, top: 860, height: 760, background: VELO, opacity: 1 - sale}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 920, display: 'flex', justifyContent: 'center', ...H, fontSize: 62, filter: SOMBRA, opacity: 1 - sale}}>
        {([['hay', 33.7], ['que', 33.77], ['aprender', 33.98], ['a', 34.54]] as [string, number][]).map(([w, en], i) => (
          <span key={i} style={{marginRight: '0.24em'}}><Entra estilo={ESTILO.texto} t={t} en={en}>{w}</Entra></span>
        ))}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA, opacity: 1 - sale}}>
        {PELDANOS.slice(1).map(([, en], i) => {
          const x = lefts[i] + 46, y1 = tops[i] + 92, y2 = tops[i + 1] + 46, x2 = lefts[i + 1] - 8;
          return <Conector key={i} t={t} en={en - 0.32} d={`M ${x} ${y1} V ${y2 - 16} Q ${x} ${y2} ${x + 16} ${y2} H ${x2}`} color={C.amarillo} dur={0.3} flujo grosor={6} punta={[x2, y2, 0]} />;
        })}
        {PELDANOS.map(([, en, ico], i) => {
          if (t < en) return null;
          const ap = aparece(t, en, -10);
          return (
            <g key={i} transform={`translate(${lefts[i] + 46} ${tops[i] + 46})`}>
              <Pulso t={t} en={en} x={0} y={0} r={50} color={C.amarillo} />
              <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                <rect x={-46} y={-46} width={92} height={92} rx={26} fill={C.amarillo} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},0.8))`}} />
                <IconoTrazado d={ico} t={t} en={en + 2 * F} color="#1b1b20" size={54} x={-27} y={-27} />
              </g>
              <Particulas t={t} en={en} x={0} y={0} n={7} radio={90} />
            </g>
          );
        })}
      </svg>
      {PELDANOS.map(([txt, en], i) => {
        if (t < en) return null;
        const m = muelle(t, en + 0.05, 2.4, 7);
        return (
          <div key={i} style={{position: 'absolute', left: lefts[i] + 114, top: tops[i] + 46, translate: `${(1 - m) * -50}px calc(-50% + ${-20 * sale}px)`,
            opacity: lim((t - en) / 0.15) * (1 - sale), filter: SOMBRA, ...H, fontSize: 54, lineHeight: 1.0, whiteSpace: 'pre'}}>
            {txt}
          </div>
        );
      })}
    </Ventana>
  );
};

// Testimonio documental: fragmento auténtico de la videollamada (Billy grande, Álvaro en la ventanita), sin alterar sus palabras
const FondoUI: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 42%, #23283a 0%, #0c0e13 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)', backgroundSize: '64px 64px'}} />
  </AbsoluteFill>
);
const Testimonio: React.FC<{t: number}> = ({t}) => {
  const {a, b} = TESTIMONIO;
  if (t < a || t >= b) return null;
  const p = iv(t, [a, a + 14 * F], [0, 1], Easing.bezier(0.34, 1.3, 0.64, 1));
  const q = iv(t, [a + 0.3, a + 0.3 + 12 * F], [0, 1], Easing.bezier(0.34, 1.45, 0.64, 1));
  const punto = 0.5 + 0.5 * Math.sin((t - a) * 6);
  return (
    <AbsoluteFill>
      <FondoUI />
      <div style={{position: 'absolute', left: 40, width: 1000, top: 520, height: 532, borderRadius: 36, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
        outline: '3px solid rgba(255,255,255,0.14)', scale: `${0.9 + 0.1 * p}`, opacity: Math.min(1, p * 2)}}>
        <Sequence from={fr(a)} durationInFrames={fr(b - a)} layout="none">
          <Video src={staticFile('a5/testimonio-billy.mp4')} muted style={{position: 'absolute', left: 0, top: 0, width: 1000, height: 532}} />
        </Sequence>
        <div style={{position: 'absolute', left: 26, top: 24, width: 22, height: 22, borderRadius: '50%', background: '#ff3b30', opacity: 0.55 + 0.45 * punto, boxShadow: '0 0 12px rgba(255,59,48,0.9)'}} />
      </div>
      <div style={{position: 'absolute', left: 676, width: 340, top: 430, height: 181, borderRadius: 22, overflow: 'hidden', outline: '4px solid #fff', boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
        scale: `${q}`, opacity: Math.min(1, q * 2)}}>
        <Sequence from={fr(a)} durationInFrames={fr(b - a)} layout="none">
          <Video src={staticFile('a5/testimonio-alvaro.mp4')} muted style={{position: 'absolute', left: 0, top: 0, width: 340, height: 181}} />
        </Sequence>
      </div>
    </AbsoluteFill>
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
  // HOOK: "si ves un ANUNCIO" detrás de Álvaro; el resto de la frase delante, abajo
  {a: 0.11, b: 3.12, top: 60, lineas: [{ws: [['si', 0.11], ['ves', 0.14], ['un', 0.28]], size: 80}, {ws: [['anuncio', 0.4, amarillo]], size: 180, golpe: true}, {ws: [['de', 0.79], ['alguien', 0.89], ['enseñando', 1.29]], size: 76, abajo: true}, {ws: [['a', 1.84], ['montar', 1.89], ['un', 2.2], ['negocio', 2.29]], size: 76, abajo: true}, {ws: [['por', 2.64], ['internet', 2.84]], size: 76, abajo: true}]},
  {a: 3.4, b: 5.85, top: 980, lineas: [{ws: [['y', 3.4]], size: 80}, {ws: [['desconfías', 3.44, rosaFuerte]], size: 140, golpe: true}, {ws: [['te', 4.56], ['entiendo', 4.6]], size: 90}, {ws: [['perfectamente', 5.12]], size: 100}]},
  {a: 6.02, b: 7.55, top: 1000, lineas: [{ws: [['yo', 6.02], ['también', 6.17], ['haría', 6.63]], size: 80}, {ws: [['preguntas', 6.96, amarillo]], size: 140, golpe: true}]},
  // El caso de Billy: datos documentados en grande
  {a: 42.66, b: 46.45, top: 960, lineas: [{ws: [['por', 42.66], ['ejemplo', 42.7]], size: 76}, {ws: [['billy', 43.25], ['tardó', 43.55]], size: 84}, {ws: [['7 meses', 43.85, amarillo]], size: 150, golpe: true}, {ws: [['en', 44.45], ['cerrar', 44.61], ['sus', 44.93], ['primeros', 45.12]], size: 76}, {ws: [['4 clientes', 45.6, amarillo]], size: 140, golpe: true}]},
  {a: 46.64, b: 50.18, top: 980, lineas: [{ws: [['en', 46.64], ['ese', 46.86], ['tiempo', 47.12], ['cobró', 47.49]], size: 80}, {ws: [['9.900 €', 47.84, amarillo]], size: 190, golpe: true}, {ws: [['en', 49.24], ['instalaciones', 49.38]], size: 84}]},
  {a: 50.24, b: 55.3, top: 960, lineas: [{ws: [['y', 50.24], ['ahora', 50.36], ['tiene', 50.71]], size: 80}, {ws: [['500 €', 51.28, amarillo]], size: 190, golpe: true}, {ws: [['al', 52.1], ['mes', 52.18], ['de', 52.39], ['mantenimientos', 52.58]], size: 76}, {ws: [['sin', 53.53], ['tener', 53.71], ['que', 54.06]], size: 76}, {ws: [['volver', 54.47], ['a', 54.7], ['vender', 54.77]], size: 76}]},
];
// La cascada "hay que aprender a prospectar / reunirse con negocios / presentar propuestas / entregar un buen servicio" cuenta como texto grande
const LISTA: [number, number] = [33.7, 39.55];
const CTA = 87.45;
const CTA_FIN = DURACION_A5; // "haz clic aquí abajo" hasta el final
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
  }).map((bq) => (bq.a < T1 && bq.b > T1 ? {...bq, b: T1} : bq.a < T1 + D_TESTIMONIO && bq.b > T1 + D_TESTIMONIO ? {...bq, b: T1 + D_TESTIMONIO} : bq)) // ningún subtítulo cruza la entrada o salida del testimonio
    .filter((bq) => bq.b > bq.a + 0.1); // un bloque que se queda sin tiempo no se muestra (ni suena)
})();
const PALABRAS_VISIBLES = BLOQUES.flatMap((bq) => bq.ws.map((w) => w[1]));
const CLAVE = new Set(['promesas', 'explicaciones', 'trabajo', '2020', 'marketing', 'agencia', 'botón', 'cobrar', 'ritmo', 'particular', 'promesa', 'historia', 'proceso', 'alumnos', 'modelo']);

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
const DETRAS: [number, number][] = [[0, 3.4]];

export const ReelA5: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(T1)} layout="none">
            <Video src={staticFile('a5/a5.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
          <Sequence from={fr(T1 + D_TESTIMONIO)} durationInFrames={fr(FUENTE - T1)} layout="none">
            <Video src={staticFile('a5/a5.mp4')} trimBefore={fr(T1)} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a5/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        <Testimonio t={t} />
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Preguntas t={t} />
      <Promesas t={t} />
      <Trayectoria t={t} />
      <Boton t={t} />
      <Cascada t={t} />
      <Ritmo t={t} />
      <Meses t={t} />
      <Monedas t={t} />
      <Ciclo t={t} />
      <Escucha t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={87.45}>haz</Sube>
          <Sube t={t} en={87.76}>clic</Sube>
          <Sube t={t} en={88.14}>aquí</Sube>
          <Sube t={t} en={88.36} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 88.56 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 88.56)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 87.45, 87.76, 88.14, 88.36].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 0.4, -3], ['thud', 3.44, -4], ['pop', 6.96, -4],
        ['burbuja', 19.41, -8], ['burbuja', 21.52, -8], ['burbuja', 23.54, -8], ['burbuja', 25.28, -8],
        ['snappy', 34.61, -7], ['snappy', 35.45, -7], ['snappy', 36.96, -7], ['snappy', 38.42, -7],
        ['thud', 43.85, -4], ['pop', 45.6, -5], ['cineboom', 47.84, -3], ['boom', 51.28, -3], ['exito', 51.4, -8],
        ['pop', 7.12, -8], ['burbuja2', 8.89, -9], ['burbuja2', 9.15, -9], ['burbuja2', 9.41, -9], ['loading', 12.06, -12], ['snap', 12.96, -9], ['snap', 13.14, -9],
        ['pop', 30.39, -7], ['click', 32.04, -4], ['tings', 32.71, -9], ['negativo', 33.0, -7],
        ['swish', 40.02, -11], ['tap', 41.02, -9], ['tap', 41.72, -9], ['tapcorto', 43.85, -10], ['tapcorto', 44.1, -10], ['thud', 45.88, -10], ['thud', 46.08, -10],
        ['tings', 48.1, -9], ['loading', 52.18, -13], ['pop', 61.47, -7],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
