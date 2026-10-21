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

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Destello, IconoTrazado, Particulas, Pulso, aparece, flota, muelle, puntaFlecha, Interrogante} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// (sin ráfagas ni trazos sobre los títulos: el cliente pidió quitar las líneas)
const ESTILO: Estilo = {texto: 'bisagra', golpe: 'marcador', impacto: 'garabato', sub: 'bisagra', flecha: 'resorte'};

export const DURACION_A8 = 74.68;
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
// Plano abierto (cuerpo entero con la pizarra al lado): encuadre base más cerrado, de la cabeza a los muslos
const BASE = 1.22;
// La cara algo a la izquierda para que la pizarra de tiza siga viéndose a su derecha
const OBJ_X = 430;
const OBJ_Y = 600;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.03, 0.36, 'golpe'],
  [0.96, 1.12, 0.18, 'golpe'],
  [1.6, 1.04, 0.8, 'suave'],
  [3.0, 1.09, 0.25, 'golpe'],
  [3.8, 1.04, 0.8, 'suave'],
  [5.2, 1.07, 2.0, 'suave'],
  [7.68, 1.15, 0.16, 'golpe'],
  [8.5, 1.06, 0.6, 'suave'],
  [9.16, 1.0, 0, 'corte'],
  [18.24, 1.0, 0, 'corte'],
  [18.26, 1.05, 0.8, 'suave'],
  [20.4, 1.14, 0.18, 'golpe'],
  [21.04, 1.0, 0, 'corte'],
  [30.44, 1.0, 0, 'corte'],
  [30.46, 1.04, 1.5, 'suave'],
  [33.08, 1.09, 0.4, 'golpe'],
  [34.28, 1.0, 0, 'corte'],
  [42.68, 1.0, 0, 'corte'],
  [42.7, 1.05, 0.6, 'suave'],
  [43.76, 1.13, 0.18, 'golpe'],
  [44.36, 1.0, 0, 'corte'],
  [47.74, 1.0, 0, 'corte'],
  [47.76, 1.05, 2.0, 'suave'],
  [50.36, 1.1, 0.3, 'golpe'],
  [51.2, 1.05, 1.0, 'suave'],
  [52.36, 1.08, 1.0, 'suave'],
  [53.88, 1.0, 0, 'corte'],
  [56.7, 1.0, 0, 'corte'],
  [56.72, 1.05, 0.8, 'suave'],
  [57.36, 1.09, 0.25, 'golpe'],
  [58.24, 1.12, 0.25, 'golpe'],
  [59.2, 1.05, 1.0, 'suave'],
  [60.8, 1.08, 1.5, 'suave'],
  [61.96, 1.12, 0.25, 'golpe'],
  [62.8, 1.0, 0, 'corte'],
  [67.46, 1.0, 0, 'corte'],
  [67.48, 1.05, 1.0, 'suave'],
  [69.52, 1.08, 1.5, 'suave'],
  [71.8, 1.05, 0.6, 'suave'],
  [72.66, 1.1, 0.4, 'suave'],
  [73.7, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [0.96, 7.68, 20.4, 43.76];
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
type B = {src: string; a: number; b: number; desde?: number; foco: number; vertical?: boolean};
const BROLL: B[] = [
  {src: 'agencia', a: 9.16, b: 11.36, desde: 1, foco: 0.3},
  {src: 'contrata', a: 11.36, b: 13.96, desde: 1, foco: 0.45},
  {src: 'magia', a: 44.36, b: 47.74, desde: 2, foco: 0.55},
  {src: 'suscripcion', a: 53.88, b: 56.7, desde: 1, foco: 0.49},
  // montaje "identificar servicios / ofrecerlos a empresas / organizar su entrega" (frases en grande + barra de progreso)
  {src: 'identificar', a: 62.8, b: 64.68, desde: 0.5, foco: 0.42},
  {src: 'ofrecer', a: 64.68, b: 65.96, desde: 1, foco: 0.66}, // encuadre fijo: el presentador junto al rotafolio
  {src: 'organizar', a: 65.96, b: 67.46, desde: 1, foco: 0.6},
];
// Pizarra digital a pantalla completa (columnas INSTALACIÓN / MANTENIMIENTO), con la misma transición que el B-roll
const PIZARRA = [{a: 13.96, b: 18.24}, {a: 21.04, b: 30.44}, {a: 34.28, b: 42.68}];
const CORTES = Array.from(new Set([...BROLL, ...PIZARRA].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
            <Video src={staticFile(`a8/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.6) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};
const lim = (x: number) => Math.min(1, Math.max(0, x));
const SOMBRA_ICONOS = 'drop-shadow(0 3px 10px rgba(0,0,0,0.75))';

// ✓ de "hasta aquí, perfecto": el aro se dibuja, el visto se traza con un latigazo y salta una ráfaga
const Visto: React.FC<{t: number; en: number; a: number; b: number; top: number}> = ({t, en, a, b, top}) => {
  const d = 150, per = Math.PI * (d - 10);
  const aro = lim((t - a) / (9 * F));
  const ap = aparece(t, en, 10);
  const tr = lim((t - en - 2 * F) / (6 * F));
  const fl = flota(t, 1, 4);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 540 - 150, top, overflow: 'visible', filter: SOMBRA_ICONOS}} width={300} height={300}>
        <g transform={`translate(150 ${150 + fl.y}) scale(${t >= en ? ap.sx : 0.92} ${t >= en ? ap.sy : 0.92}) rotate(${ap.rot})`}>
          <circle r={d / 2 - 5} fill={t >= en ? VERDE : 'rgba(0,0,0,0.3)'} stroke={t >= en ? VERDE : 'rgba(255,255,255,0.8)'} strokeWidth={6}
            strokeDasharray={per} strokeDashoffset={per * (1 - aro)} transform="rotate(-90)" style={{filter: t >= en ? `drop-shadow(0 0 16px ${VERDE})` : 'none'}} />
          {t >= en && <path d="M -32 2 L -10 24 L 34 -22" stroke="#fff" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tr} />}
        </g>
        <Pulso t={t} en={en} x={150} y={150} r={80} color={VERDE} />
        <Particulas t={t} en={en} x={150} y={150} n={12} radio={140} colores={[VERDE, '#ffffff', C.amarillo]} />
      </svg>
    </Ventana>
  );
};

// ---------------- Ilustraciones propias de este reel: pizarra de tiza INSTALACIÓN / MANTENIMIENTO ----------------
const ICONO = {
  instalar: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
  ciclo: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  lupa: ICONOS.lupa,
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  factura: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 5v2h6V7H9zm0 4v2h6v-2H9z',
  llave: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  ojo: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  mejora: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
  chispa: 'M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2zm7 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
};
const TIZA = '#f2efe6';
const VERDE = '#2ee59d';
// Filtro "tiza": bordes ligeramente irregulares, como escritos con tiza
const FiltroTiza: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id="tiza8">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={8} result="ruido" />
      <feDisplacementMap in="SourceGraphic" in2="ruido" scale={3.2} />
    </filter>
  </svg>
);
type Ficha = {d: string; en: number};
const IZQ: Ficha[] = [{d: ICONO.lupa, en: 14.16}, {d: ICONO.engranaje, en: 15.32}, {d: ICONO.factura, en: 16.84}];
const DER: Ficha[] = [{d: ICONO.llave, en: 22.8}, {d: ICONO.ciclo, en: 23.72}, {d: ICONO.ojo, en: 24.64}, {d: ICONO.mejora, en: 25.68}];
const MENSUAL = 29.8; // "el mantenimiento mensual"
const PARTE1 = 35.4; // "una primera parte"
const OTRA = 38.36; // "y otra parte"
const SEGUIR = 39.92; // "seguir prestando un servicio"
// Ficha de la pizarra: el marco se dibuja con tiza, la ficha sale con muelle (aplastar/estirar), el icono se traza y se rellena,
// salta una ráfaga de polvo de tiza y después flota y respira
const FichaIcono: React.FC<{t: number; f: Ficha; i: number; activa: boolean; anima: boolean}> = ({t, f, i, activa, anima}) => {
  if (anima && t < f.en) return <div style={{width: 170, height: 170}} />;
  const ap = anima ? aparece(t, f.en, 9) : {sx: 1, sy: 1, rot: 0, op: 1};
  const marco = anima ? lim((t - f.en) / (9 * F)) : 1;
  const fl = flota(t, i * 1.3, activa ? 5 : 2.5);
  const col = activa ? C.amarillo : TIZA;
  return (
    <svg width={170} height={170} viewBox="0 0 150 150" style={{overflow: 'visible', opacity: (activa ? 1 : 0.55) * ap.op,
      transform: `translateY(${fl.y}px) scale(${ap.sx * fl.s}, ${ap.sy * fl.s}) rotate(${ap.rot}deg)`}}>
      <rect x={8} y={8} width={134} height={134} rx={30} fill={activa ? `rgba(${GLOW_AMARILLO},0.12)` : 'rgba(255,255,255,0.04)'} stroke={col} strokeWidth={5}
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - marco} style={{filter: activa ? `url(#tiza8) drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.6))` : 'url(#tiza8)'}} />
      {anima ? <IconoTrazado d={f.d} t={t} en={f.en + 2 * F} color={col} size={74} x={38} y={38} /> : <g transform="translate(38 38) scale(3.08)"><path d={f.d} fill={col} /></g>}
      {anima && <Pulso t={t} en={f.en} x={75} y={75} r={68} color={col} />}
      {anima && <Particulas t={t} en={f.en} x={75} y={75} n={9} radio={115} colores={[C.amarillo, TIZA]} />}
    </svg>
  );
};
const Columna: React.FC<{t: number; t0: number; lado: number; left: number; titulo: string; icono: string; fichas: Ficha[]; activa: boolean; anima: boolean; brillo: number; gira?: number; extra?: React.ReactNode}> = ({
  t, t0, lado, left, titulo, icono, fichas, activa, anima, brillo, gira = 0, extra,
}) => {
  // entra deslizando desde su lado con muelle; el título se escribe de izquierda a derecha
  const m = muelle(t, t0 + (lado > 0 ? 0.08 : 0), 2.2, 7);
  const escribe = lim((t - t0 - 0.25) / 0.45);
  const respira = 0.85 + 0.15 * Math.sin(t * 4);
  return (
    <div style={{position: 'absolute', left, top: 250, width: 430, height: 700, borderRadius: 36, padding: '32px 20px',
      background: `rgba(255,255,255,${0.03 + 0.05 * brillo})`, border: `3px solid rgba(${activa ? GLOW_AMARILLO : '242,239,230'},${activa ? 0.55 + 0.45 * brillo : 0.22})`,
      boxShadow: brillo > 0 ? `0 0 ${40 * brillo * respira}px rgba(${GLOW_AMARILLO},${0.35 * brillo})` : 'none',
      translate: `${(1 - m) * lado * 160}px 0px`, opacity: lim(m * 1.6), scale: `${1 + 0.03 * brillo}`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, height: 70, whiteSpace: 'nowrap', clipPath: `inset(-10% ${(1 - escribe) * 100}% -10% -5%)`}}>
        <svg width={44} height={44} viewBox="0 0 24 24" style={{rotate: `${gira}deg`, flexShrink: 0}}><path d={icono} fill={activa ? C.amarillo : TIZA} /></svg>
        <span style={{...H, fontSize: 35, letterSpacing: '0.02em', color: activa ? C.amarillo : TIZA, textShadow: activa ? glow(GLOW_AMARILLO, 0.8) : 'none', filter: 'url(#tiza8)'}}>{titulo}</span>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 170px)', gap: 28, marginTop: 40}}>
        {fichas.map((f, i) => <FichaIcono key={i} t={t} f={f} i={i + (lado > 0 ? 4 : 0)} activa={activa} anima={anima} />)}
      </div>
      {extra}
    </div>
  );
};
// Flecha de "una parte" → "otra parte": se dibuja con un cometa en la punta y la punta sale con muelle al llegar
const FLECHA_P3: [number, number, number, number, number, number, number, number] = [330, 975, 420, 1050, 660, 1050, 750, 975];
const enBezier = (k: number) => {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = FLECHA_P3;
  const u = 1 - k;
  return [u * u * u * x0 + 3 * u * u * k * x1 + 3 * u * k * k * x2 + k * k * k * x3, u * u * u * y0 + 3 * u * u * k * y1 + 3 * u * k * k * y2 + k * k * k * y3];
};
const Pizarra: React.FC<{t: number}> = ({t}) => {
  const fase = PIZARRA.findIndex((p) => t >= p.a && t < p.b);
  if (fase < 0) return null;
  const {a} = PIZARRA[fase];
  const raya = lim((t - a - 0.15) / 0.5);
  // fase 0: se rellena INSTALACIÓN; fase 1: se rellena MANTENIMIENTO; fase 2: una parte → otra parte
  const brilloIzq = fase === 2 ? iv(t, [PARTE1 - 0.1, PARTE1 + 0.3, OTRA - 0.2, OTRA + 0.2], [0, 1, 1, 0.25]) : 0;
  const brilloDer = fase === 2 ? iv(t, [OTRA, OTRA + 0.4], [0, 1]) : fase === 1 ? iv(t, [MENSUAL - 1.2, MENSUAL - 0.8], [0, 0.8]) : 0;
  const giro = fase === 2 && t > SEGUIR ? (t - SEGUIR) * 160 : fase === 1 && t > MENSUAL - 1.16 ? (t - MENSUAL + 1.16) * 90 : 0;
  const flecha = fase === 2 ? lim((t - OTRA + 0.15) / 0.5) : 0;
  const fe = 1 - Math.pow(1 - flecha, 3);
  const [cx, cy] = enBezier(fe);
  const ang = Math.atan2(FLECHA_P3[7] - FLECHA_P3[5], FLECHA_P3[6] - FLECHA_P3[4]);
  const punta = aparece(t, OTRA + 0.35, 0);
  const cal = fase === 1 ? aparece(t, MENSUAL, 0) : null;
  const kcal = t - MENSUAL;
  return (
    <AbsoluteFill>
      <FiltroTiza />
      {/* pizarra: verde pizarra oscuro con polvo de tiza */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 95% 70% at 50% 38%, #2a3631 0%, #18201c 62%, #0f1412 100%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 30% 9% at 30% 16%, rgba(255,255,255,0.05), transparent), radial-gradient(ellipse 26% 8% at 72% 84%, rgba(255,255,255,0.045), transparent), radial-gradient(ellipse 40% 10% at 60% 52%, rgba(255,255,255,0.03), transparent)'}} />
      <div style={{position: 'absolute', inset: 34, borderRadius: 30, border: '3px solid rgba(255,255,255,0.07)'}} />
      <Columna t={t} t0={a} lado={-1} left={100} titulo="INSTALACIÓN" icono={ICONO.instalar} fichas={IZQ} activa={fase === 0 || brilloIzq > 0.3} anima={fase === 0} brillo={brilloIzq} />
      <Columna t={t} t0={a} lado={1} left={550} titulo="MANTENIMIENTO" icono={ICONO.ciclo} fichas={fase === 0 ? [] : DER} activa={fase >= 1 && (fase === 1 || brilloDer > 0.3)} anima={fase === 1} brillo={brilloDer} gira={giro}
        extra={fase === 0 ? (
          // la incógnita: una interrogación grande dibujada (gancho que se traza + punto con muelle) que bota y se balancea
          // esperando a "¿qué ocurre después?"
          <svg width={260} height={300} style={{marginTop: 50, overflow: 'visible', opacity: 0.85, translate: `0px ${-Math.abs(Math.sin(t * 3.2)) * 16}px`}}>
            <Interrogante t={t} en={a + 0.35} x={130} y={160} s={1.8} color={TIZA} />
          </svg>
        ) : cal && kcal > 0 ? (
          // calendario "mensual": sale con muelle y se balancea como un colgante
          <svg width={120} height={120} viewBox="0 0 24 24" style={{position: 'absolute', right: -20, top: -150, overflow: 'visible', transformOrigin: '50% 0%',
            transform: `scale(${cal.sx}, ${cal.sy}) rotate(${22 * Math.exp(-3 * kcal) * Math.sin(kcal * 11)}deg)`, filter: `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.9))`}}>
            <circle cx={12} cy={12} r={11.5} fill={C.amarillo} />
            <g transform="translate(5 5) scale(0.58)"><path d={ICONO.calendario} fill="#1b1b20" /></g>
          </svg>
        ) : null} />
      {/* raya de tiza entre columnas (con polvo al terminar) y flecha "una parte" → "otra parte" */}
      <svg width={1080} height={1100} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d="M 540 270 L 541 930" stroke={TIZA} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - raya} opacity={0.35} style={{filter: 'url(#tiza8)'}} />
        <Particulas t={t} en={a + 0.65} x={541} y={930} n={6} radio={50} colores={[TIZA, '#cfd8d3']} />
        {flecha > 0 && (
          <g style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.9))`}}>
            <path d={`M ${FLECHA_P3[0]} ${FLECHA_P3[1]} C ${FLECHA_P3[2]} ${FLECHA_P3[3]}, ${FLECHA_P3[4]} ${FLECHA_P3[5]}, ${FLECHA_P3[6]} ${FLECHA_P3[7]}`} fill="none" stroke={C.amarillo} strokeWidth={9} strokeLinecap="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - fe} />
            {flecha < 1 && <circle cx={cx} cy={cy} r={11} fill="#fff" />}
            {t >= OTRA + 0.35 && (
              <g transform={`translate(${FLECHA_P3[6]} ${FLECHA_P3[7]}) scale(${punta.sx} ${punta.sy}) translate(${-FLECHA_P3[6]} ${-FLECHA_P3[7]})`}>
                <path d={puntaFlecha(FLECHA_P3[6] + Math.cos(ang) * 8, FLECHA_P3[7] + Math.sin(ang) * 8, ang, 30, 20)} fill="none" stroke={C.amarillo} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
            <Particulas t={t} en={OTRA + 0.35} x={FLECHA_P3[6]} y={FLECHA_P3[7]} n={8} radio={70} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// "aportar valor de forma continua": un ciclo que se dibuja en el sentido en que gira (la punta siempre va por delante),
// con un cometa en la punta mientras se dibuja, puntos que orbitan y el valor (destello) que salta en el centro
const CICLO = {a: 50.2, b: 53.3, valor: 50.8, continua: 51.56};
const R_CICLO = 108;
const Ciclo: React.FC<{t: number}> = ({t}) => {
  const {a, b, valor, continua} = CICLO;
  const dib = 1 - Math.pow(1 - lim((t - a) / 0.7), 3);
  const fin = (-90 + 300 * dib) * (Math.PI / 180); // ángulo del final del arco (sentido horario en pantalla)
  const ex = 130 + Math.cos(fin) * R_CICLO, ey = 130 + Math.sin(fin) * R_CICLO;
  const tang = fin + Math.PI / 2; // dirección de avance en sentido horario
  const giro = (t - a) * 55 + Math.max(0, t - continua) * 150;
  const v = aparece(t, valor, 25);
  const punta = aparece(t, a + 0.7, 0);
  const fl = flota(t, 2, 5);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 540 - 130, top: 130 + fl.y, overflow: 'visible', filter: SOMBRA_ICONOS}} width={260} height={260}>
        <g transform={`rotate(${giro} 130 130)`} style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}}>
          <path d={`M 130 ${130 - R_CICLO} A ${R_CICLO} ${R_CICLO} 0 ${dib > 0.5 ? 1 : 0} 1 ${ex} ${ey}`} fill="none" stroke={C.amarillo} strokeWidth={14} strokeLinecap="round" />
          {dib < 1 && <circle cx={ex} cy={ey} r={12} fill="#fff" />}
          {t >= a + 0.7 && (
            <g transform={`translate(${ex} ${ey}) scale(${punta.sx} ${punta.sy}) translate(${-ex} ${-ey})`}>
              <path d={puntaFlecha(ex + Math.cos(tang) * 12, ey + Math.sin(tang) * 12, tang, 30, 24)} fill="none" stroke={C.amarillo} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          {t >= a + 0.7 && [0, 1, 2].map((k) => {
            const g = ((t - a) * 2.4 + k * 2.1) % (Math.PI * 2);
            return <circle key={k} cx={130 + Math.cos(g) * (R_CICLO + 26)} cy={130 + Math.sin(g) * (R_CICLO + 26)} r={6} fill="#fff" opacity={0.85} />;
          })}
        </g>
        {t >= valor && (
          <g transform={`translate(130 130) scale(${v.sx} ${v.sy}) rotate(${v.rot + Math.sin(t * 3) * 6})`}>
            <g transform="translate(-48 -48) scale(4)"><path d={ICONO.chispa} fill="#fff" /></g>
          </g>
        )}
        <Particulas t={t} en={valor} x={130} y={130} n={12} radio={150} />
        <Destello t={t} en={continua} x={238} y={40} tam={26} color={C.amarillo} />
        <Destello t={t} en={continua + 0.3} x={20} y={210} tam={20} />
        <Destello t={t} en={continua + 0.6} x={232} y={226} tam={18} color={C.amarillo} />
      </svg>
    </Ventana>
  );
};

// "este modelo de instalación más mantenimiento": las dos piezas saltan con muelle, cada una con su órbita punteada,
// el "+" gira hasta su sitio y una chispa viaja de una pieza a la otra
const MODELO = {a: 56.72, b: 59.7, instalacion: 57.36, mas: 58.04, mantenimiento: 58.24};
const Modelo: React.FC<{t: number}> = ({t}) => {
  const {a, b, instalacion, mas, mantenimiento} = MODELO;
  const pieza = (en: number, d: string, x: number, gira: boolean, fase: number) => {
    if (t < en) return null;
    const ap = aparece(t, en, -18);
    const fl = flota(t, fase, 5);
    return (
      <g transform={`translate(${x} ${130 + fl.y})`}>
        <g transform={`rotate(${(t - en) * 40})`}>
          <circle r={118} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={4} strokeDasharray="6 16" opacity={lim((t - en) / 0.4)} />
        </g>
        <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          <circle r={96} fill="rgba(16,16,20,0.82)" stroke={C.amarillo} strokeWidth={7} style={{filter: `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.7))`}} />
          <g transform={`rotate(${gira ? (t - en) * 120 : 0})`}><IconoTrazado d={d} t={t} en={en + 2 * F} color={C.amarillo} size={96} x={-48} y={-48} /></g>
        </g>
        <Particulas t={t} en={en} x={0} y={0} n={10} radio={150} />
      </g>
    );
  };
  const m = muelle(t, mas, 2.4, 6);
  const viaje = lim((t - mantenimiento - 0.35) / 0.6);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 110, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={260}>
        {pieza(instalacion, ICONO.instalar, 330, false, 0)}
        {t >= mas && (
          <g transform={`translate(540 130) scale(${m}) rotate(${(1 - m) * 90})`}>
            <path d="M -30 0 H 30 M 0 -30 V 30" stroke="#fff" strokeWidth={14} strokeLinecap="round" />
          </g>
        )}
        {pieza(mantenimiento, ICONO.ciclo, 750, true, 1.6)}
        {viaje > 0 && viaje < 1 && <circle cx={330 + 420 * viaje} cy={130 - Math.sin(viaje * Math.PI) * 70} r={10} fill={C.amarillo} style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},1))`}} />}
        <Destello t={t} en={mantenimiento + 0.95} x={750} y={130} tam={30} />
      </svg>
    </Ventana>
  );
};

// Barra de progreso del montaje final (identificar → ofrecer → organizar): cada paso salta con muelle y lanza un pulso;
// la barra se llena con un cometa brillante en la punta
const MONTAJE = [{a: 62.8, b: 64.68}, {a: 64.68, b: 65.96}, {a: 65.96, b: 67.46}];
const Progreso: React.FC<{t: number}> = ({t}) => {
  const ini = MONTAJE[0].a, fin = MONTAJE[MONTAJE.length - 1].b;
  const x0 = 150, ancho = 780, tramo = (ancho - 2 * 22) / 3;
  return (
    <Ventana suave t={t} a={ini} b={fin}>
      <svg style={{position: 'absolute', left: 0, top: 1690, overflow: 'visible', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))'}} width={1080} height={80}>
        {MONTAJE.map((m, i) => {
          const xa = x0 + i * (tramo + 22);
          const lleno = lim((t - m.a) / (m.b - m.a));
          const ap = aparece(t, m.a, 0);
          return (
            <g key={i}>
              <rect x={xa} y={34} width={tramo} height={12} rx={6} fill="rgba(255,255,255,0.28)" />
              <rect x={xa} y={34} width={tramo * lleno} height={12} rx={6} fill={C.amarillo} style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.9))`}} />
              {lleno > 0 && lleno < 1 && <circle cx={xa + tramo * lleno} cy={40} r={9} fill="#fff" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},1))`}} />}
              <Pulso t={t} en={m.a} x={xa} y={40} r={18} color={C.amarillo} />
              <g transform={`translate(${xa} 40) scale(${t >= m.a ? 0.7 + 0.3 * ap.sx : 0.7} ${t >= m.a ? 0.7 + 0.3 * ap.sy : 0.7})`}>
                <circle r={17} fill={t >= m.a ? C.amarillo : 'rgba(255,255,255,0.5)'} stroke="#fff" strokeWidth={4} />
              </g>
            </g>
          );
        })}
      </svg>
    </Ventana>
  );
};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => (/^ClientesOnline/.test(s) ? 'ClientesOnline' : s.toLowerCase().replace(/[.,]/g, ''));

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
// Solo frases CORTAS en grande, alternando con frases en subtítulo. En la pizarra y en el montaje final, todas las frases van en grande.
const GRANDES: Grande[] = [
  // HOOK (detrás de Álvaro): hay una diferencia enorme entre venderle un servicio una vez a una empresa
  {a: 0.04, b: 3.98, top: 60, lineas: [{ws: [['hay', 0.04], ['una', 0.24], ['diferencia', 0.44]], size: 80}, {ws: [['enorme', 0.96, amarillo]], size: 190, golpe: true},
    {ws: [['entre', 1.48], ['venderle', 1.84]], size: 76, abajo: true}, {ws: [['un', 2.32], ['servicio', 2.48]], size: 76, abajo: true}, {ws: [['una vez', 3.0, amarillo]], size: 120, golpe: true, abajo: true}, {ws: [['a', 3.4], ['una', 3.48], ['empresa', 3.68]], size: 76, abajo: true}]},
  // ...y conseguir que esta empresa quiera seguir trabajando contigo todos los meses
  {a: 4.24, b: 5.98, top: 980, lineas: [{ws: [['y', 4.24], ['conseguir', 4.44], ['que', 5.0]], size: 84}, {ws: [['esta', 5.2], ['empresa', 5.44]], size: 90}]},
  {a: 6.0, b: 9.0, top: 960, lineas: [{ws: [['quiera', 6.0], ['seguir', 6.4]], size: 84}, {ws: [['trabajando', 6.68]], size: 84}, {ws: [['contigo', 7.16]], size: 84}, {ws: [['todos los meses', 7.68, amarillo]], size: 140, golpe: true}]},
  // Pizarra 1: tú analizas lo que necesita, preparas la solución y cobras por instalarla
  {a: 13.96, b: 15.28, top: 1090, lineas: [{ws: [['tú', 13.96], ['analizas', 14.16]], size: 84}, {ws: [['lo', 14.6], ['que', 14.72], ['necesita', 14.8]], size: 84}]},
  {a: 15.32, b: 16.56, top: 1090, lineas: [{ws: [['preparas', 15.32]], size: 84}, {ws: [['la solución', 15.76, amarillo]], size: 120, golpe: true}]},
  {a: 16.6, b: 18.0, top: 1090, lineas: [{ws: [['y', 16.6], ['cobras', 16.84], ['por', 17.4]], size: 84}, {ws: [['instalarla', 17.56, amarillo]], size: 130, golpe: true}]},
  // ¿Pero qué ocurre después?
  {a: 19.32, b: 20.8, top: 960, lineas: [{ws: [['¿pero', 19.32], ['qué', 19.88], ['ocurre', 20.04]], size: 84}, {ws: [['después?', 20.4, amarillo]], size: 170, golpe: true}]},
  // Pizarra 2: esa automatización puede necesitar mantenimiento, actualizaciones, supervisión o mejoras. Y ahí aparece un segundo servicio, el mantenimiento mensual
  {a: 21.04, b: 22.76, top: 1090, lineas: [{ws: [['esa', 21.04], ['automatización', 21.28]], size: 80}, {ws: [['puede', 22.04], ['necesitar', 22.28]], size: 84}]},
  {a: 22.8, b: 26.28, top: 1060, lineas: [{ws: [['mantenimiento', 22.8]], size: 84}, {ws: [['actualizaciones', 23.72]], size: 84}, {ws: [['supervisión', 24.64]], size: 84}, {ws: [['o', 25.52], ['mejoras', 25.68, amarillo]], size: 90}]},
  {a: 26.32, b: 28.4, top: 1090, lineas: [{ws: [['y', 26.32], ['ahí', 26.44], ['aparece', 26.64]], size: 84}, {ws: [['un', 27.12], ['segundo', 27.36], ['servicio', 27.76]], size: 84}]},
  {a: 28.44, b: 30.2, top: 1090, lineas: [{ws: [['el', 28.44]], size: 84}, {ws: [['mantenimiento', 28.64, amarillo]], size: 130, golpe: true}, {ws: [['mensual', 29.8, amarillo]], size: 130, golpe: true}]},
  // Pizarra 3: puedes tener una primera parte del proyecto que es la implementación y otra parte que consiste en seguir prestando un servicio a ese cliente
  {a: 34.28, b: 36.4, top: 1090, lineas: [{ws: [['puedes', 34.28], ['tener', 34.6]], size: 80}, {ws: [['una', 34.88], ['primera', 35.1], ['parte', 35.4, amarillo]], size: 90}, {ws: [['del', 35.64], ['proyecto', 35.8]], size: 80}]},
  {a: 36.44, b: 38.16, top: 1090, lineas: [{ws: [['que', 36.44], ['es', 36.56], ['la', 36.72]], size: 84}, {ws: [['implementación', 36.92, amarillo]], size: 130, golpe: true}]},
  {a: 38.2, b: 39.88, top: 1090, lineas: [{ws: [['y', 38.2], ['otra', 38.36], ['parte', 38.64, amarillo]], size: 90}, {ws: [['que', 39.08], ['consiste', 39.24], ['en', 39.8]], size: 80}]},
  {a: 39.92, b: 42.44, top: 1090, lineas: [{ws: [['seguir', 39.92], ['prestando', 40.44]], size: 84}, {ws: [['un servicio', 40.96, amarillo]], size: 120, golpe: true}, {ws: [['a', 41.8], ['ese', 41.96], ['cliente', 42.2]], size: 84}]},
  // Eso sí, hay algo importante
  {a: 42.72, b: 44.1, top: 960, lineas: [{ws: [['eso', 42.72], ['sí', 43.04]], size: 84}, {ws: [['hay', 43.36], ['algo', 43.56]], size: 84}, {ws: [['importante', 43.76, amarillo]], size: 140, golpe: true}]},
  // Montaje final (B-roll, texto abajo: las caras están arriba)
  {a: 62.8, b: 64.6, top: 1150, lineas: [{ws: [['aprendes', 62.8], ['a', 63.32]], size: 80}, {ws: [['identificar', 63.4, amarillo]], size: 120, golpe: true}, {ws: [['servicios', 63.92]], size: 100}]},
  {a: 64.68, b: 65.9, top: 1150, lineas: [{ws: [['ofrecerlos', 64.68, amarillo]], size: 120, golpe: true}, {ws: [['a', 65.32], ['empresas', 65.4]], size: 90}]},
  {a: 65.96, b: 67.2, top: 1150, lineas: [{ws: [['y organizar', 65.96, amarillo]], size: 120, golpe: true}, {ws: [['su', 66.8], ['entrega', 67.0]], size: 90}]},
];
const LISTA: [number, number] = [-10, -10];
const CTA = 72.66;
const CTA_FIN = DURACION_A8; // "haz clic aquí abajo" hasta el final
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
const CLAVE = new Set(['agencia', 'automatización', 'perfecto', 'interesante', 'inteligencia', 'artificial', 'recurrencia', 'magia', 'valor', 'continua', 'suscripción', 'instalación', 'mantenimiento', 'método', 'ClientesOnline', 'recurrentes']);

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
const DETRAS: [number, number][] = [[0, 4.24]];

export const ReelA8: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A8)} layout="none">
            <Video src={staticFile('a8/a8.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a8/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        <Pizarra t={t} />
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Visto t={t} en={18.72} a={18.42} b={19.3} top={150} />
      <Ciclo t={t} />
      <Modelo t={t} />
      <Progreso t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={72.66}>haz</Sube>
          <Sube t={t} en={73.02}>clic</Sube>
          <Sube t={t} en={73.42}>aquí</Sube>
          <Sube t={t} en={73.7} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 73.9 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 73.9)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 72.66, 73.02, 73.42, 73.7].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 0.96, -3], ['pop', 3.0, -4], ['risercorto', 7.1, -8], ['cineboom', 7.68, -3],
        ['bloop', 14.16, -6], ['bloop', 15.32, -6], ['bloop', 16.84, -6], ['confirmar', 17.56, -7],
        ['ding', 18.72, -8], ['boom', 20.4, -3],
        ['tic', 22.8, -6], ['tic', 23.72, -6], ['tic', 24.64, -6], ['tic', 25.68, -6], ['exito', 29.8, -7],
        ['pop', 35.4, -6], ['pop', 36.92, -5], ['swoosh2', 38.2, -9], ['pop', 38.64, -6], ['loading', 39.92, -10],
        ['cineboom', 43.76, -4], ['twinkle', 44.9, -7], ['reveal', 50.2, -9], ['pop', 50.8, -6],
        ['pop', 57.36, -5], ['snap', 58.04, -7], ['pop', 58.24, -5], ['puntos', 61.96, -8],
        ['snap', 63.4, -6], ['snap', 64.68, -6], ['snap', 65.96, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
