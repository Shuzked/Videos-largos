import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {CAPA, SinZona, ZonaSegura} from '../zona';
import ZONAS from './zonas.json';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';
import {ICONO10} from '../a10/iconos';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Chip, Check, Conector, Destello, IconoTrazado, Lienzo, OSCURO, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle, puntaFlecha} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos): texto "robot" (sube a saltos, como una máquina),
// golpe "ensambla" (se monta como una pieza) y flecha "pistón". Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original).
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'robot', golpe: 'ensambla', impacto: 'garabato', sub: 'robot', flecha: 'piston'};

export const DURACION_E6 = 66.04;
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
  [0.68, 1.08, 0.25, 'golpe'],
  [1.48, 1.14, 0.18, 'golpe'],
  [2.0, 1.06, 0.5, 'suave'],
  [2.56, 1.0, 0, 'corte'],
  [6.56, 1.0, 0, 'corte'],
  [6.58, 1.05, 0.8, 'suave'],
  [8.12, 1.09, 0.4, 'golpe'],
  [8.8, 1.04, 0.8, 'suave'],
  [10.48, 1.1, 0.3, 'golpe'],
  [11.3, 1.05, 0.6, 'suave'],
  [12.66, 1.0, 0, 'corte'],
  [19.14, 1.0, 0, 'corte'],
  [19.16, 1.05, 0.6, 'suave'],
  [22.4, 1.14, 0.18, 'golpe'],
  [23.2, 1.05, 0.8, 'suave'],
  [25.32, 1.09, 0.4, 'golpe'],
  [26.4, 1.05, 0.6, 'suave'],
  [27.84, 1.13, 0.18, 'golpe'],
  [28.52, 1.0, 0, 'corte'],
  [34.54, 1.0, 0, 'corte'],
  [34.56, 1.05, 0.5, 'suave'],
  [35.96, 1.14, 0.18, 'golpe'],
  [36.9, 1.05, 0.6, 'suave'],
  [38.36, 1.09, 0.3, 'golpe'],
  [39.4, 1.05, 0.6, 'suave'],
  [40.24, 1.09, 0.3, 'golpe'],
  [41.4, 1.05, 0.6, 'suave'],
  [43.04, 1.09, 0.3, 'golpe'],
  [44.0, 1.05, 0.8, 'suave'],
  [46.0, 1.14, 0.18, 'golpe'],
  [46.8, 1.05, 0.6, 'suave'],
  [48.16, 1.1, 0.4, 'suave'],
  [49.56, 1.04, 0.8, 'suave'],
  [52.64, 1.09, 0.4, 'suave'],
  [55.12, 1.12, 0.25, 'golpe'],
  [56.16, 1.05, 0.5, 'suave'],
  [57.84, 1.15, 0.18, 'golpe'],
  [58.76, 1.06, 0.5, 'suave'],
  [59.54, 1.1, 0.3, 'golpe'],
  [60.4, 1.05, 1.2, 'suave'],
  [63.0, 1.09, 1.2, 'suave'],
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
const IMPACTOS = [0.68, 1.48, 27.84, 35.96, 57.84];
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
  // "hay un modelo de negocio que consiste precisamente en ayudar a empresas a implementar ese tipo de soluciones"
  {src: 'reunion', a: 28.52, b: 34.54, desde: 1, foco: 0.6},
];
// Sketch de pantalla partida (arriba Álvaro, abajo el empleado repitiendo lo mismo) y recorrido por las ventanas del proceso manual
const PARTIDA = {a: 2.56, b: 6.56};
const PROCESO = {a: 12.66, b: 19.14};
const CORTES = Array.from(new Set([...BROLL, PARTIDA, PROCESO].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 30%', scale: iv(t, [b.a, b.b], [1.0, 1.06])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`e6/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
const ICONO = {
  ...ICONO10,
  copiar: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  pegar: 'M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
  datos: 'M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z',
  ficha: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  correo: 'M3 5h18v14H3V5zm2 2v.5l7 4.5 7-4.5V7H5zm0 3v7h14v-7l-7 4.5L5 10z',
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
};
const SOMBRA_TEXTO = 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))';
// Tecla de teclado con su letra (fuente de los títulos): se hunde al pulsarla
const Tecla: React.FC<{x: number; y: number; w: number; letra: string; pulsada: number; on?: boolean}> = ({x, y, w, letra, pulsada, on}) => (
  <g transform={`translate(${x} ${y + pulsada * 7})`}>
    <rect x={-w / 2} y={-34 + 8 - pulsada * 7} width={w} height={68} rx={14} fill="#1b1b22" />
    <rect x={-w / 2} y={-34} width={w} height={60} rx={14} fill={on ? C.amarillo : '#f2f2f5'} stroke="#fff" strokeWidth={2} />
    <text x={0} y={7} textAnchor="middle" fontFamily="Montserrat" fontWeight={800} fontSize={letra.length > 1 ? 24 : 32} fill="#1b1b20">{letra}</text>
  </g>
);
// Atajo de teclado (CTRL + letra) que se pulsa en los tiempos dados
const Atajo: React.FC<{t: number; x: number; y: number; pulsos: [number, string][]; en: number}> = ({t, x, y, pulsos, en}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 8);
  const ult = [...pulsos].reverse().find(([p]) => t >= p);
  const k = ult ? t - ult[0] : 9;
  const pulsada = k < 0.12 ? Math.sin((k / 0.12) * Math.PI) : 0;
  const letra = ult ? ult[1] : pulsos[0][1];
  return (
    <g transform={`translate(${x} ${y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`} style={{filter: SOMBRA_TEXTO}}>
      <Tecla x={-62} y={0} w={110} letra="CTRL" pulsada={pulsada} />
      <text x={6} y={10} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={34} fill="#fff">+</text>
      <Tecla x={66} y={0} w={74} letra={letra} pulsada={pulsada} on={pulsada > 0.2} />
    </g>
  );
};
// Reloj que corre (las agujas giran deprisa entre a y b)
const Reloj: React.FC<{t: number; en: number; a: number; b: number; x: number; y: number; r: number; vueltas: number}> = ({t, en, a, b, x, y, r, vueltas}) => {
  if (t < en) return null;
  const ap = aparece(t, en, -10);
  const k = lim((t - a) / (b - a));
  const e = k * k * (3 - 2 * k);
  const min = e * vueltas * 360 + (t - en) * 30, hora = e * vueltas * 30 + 240;
  const tiembla = k > 0 && k < 1 ? Math.sin(t * 70) * 3 : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot + tiembla})`} style={{filter: SOMBRA_TEXTO}}>
      {[-1, 1].map((l) => <circle key={l} cx={l * r * 0.62} cy={-r * 0.95} r={r * 0.24} fill={C.amarillo} stroke="#fff" strokeWidth={3} />)}
      <circle r={r} fill={OSCURO} stroke={C.amarillo} strokeWidth={7} />
      {Array.from({length: 12}, (_, i) => <line key={i} x1={0} y1={-r + 6} x2={0} y2={-r + 16} stroke="#fff" strokeWidth={4} strokeLinecap="round" transform={`rotate(${i * 30})`} />)}
      <line x1={0} y1={0} x2={0} y2={-r * 0.48} stroke="#fff" strokeWidth={7} strokeLinecap="round" transform={`rotate(${hora})`} />
      <line x1={0} y1={0} x2={0} y2={-r * 0.74} stroke={C.amarillo} strokeWidth={5} strokeLinecap="round" transform={`rotate(${min})`} />
      <circle r={7} fill={C.amarillo} />
    </g>
  );
};

// 0) HOOK en pantalla partida: arriba Álvaro, abajo "una persona haciendo esto": el empleado repite el mismo gesto en bucle
// (saltos de montaje, como un robot), CTRL+C / CTRL+V se pulsan sin parar, el contador sube y el reloj corre 8 horas
const PULSOS: [number, string][] = Array.from({length: 10}, (_, i) => [2.72 + i * 0.38, i % 2 ? 'V' : 'C'] as [number, string]);
const Partida: React.FC<{t: number}> = ({t}) => {
  const {a, b} = PARTIDA;
  if (t < a || t >= b) return null;
  const s = BASE * 1.02;
  const [fx, fy] = cara(t);
  const tx = Math.min(0, Math.max(1080 * (1 - s), 540 - fx * s));
  const ty = Math.min(0, Math.max(960 - 1920 * s, 470 - fy * s));
  const anchoClip = 1707; // 16:9 a 960 de alto
  const veces = PULSOS.filter(([p, l]) => l === 'V' && t >= p).length;
  const vecesAp = aparece(t, PULSOS[1][0], 0);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 960, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', scale: s, translate: `${tx}px ${ty}px`}}>
          <Sequence from={fr(a)} durationInFrames={fr(b - a)} layout="none">
            <Video src={staticFile('e6/e6.mp4')} muted volume={0} trimBefore={fr(a)} style={lleno} />
          </Sequence>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 960, width: 1080, height: 960, overflow: 'hidden'}}>
        {/* el mismo trozo de 0,76 s una y otra vez: el empleado "en bucle" */}
        {Array.from({length: 6}, (_, i) => (
          <Sequence key={i} from={fr(a + i * 0.76)} durationInFrames={fr(0.76)} layout="none">
            <Video src={staticFile('e6/broll/oficina.mp4')} muted trimBefore={fr(3.1)} style={{position: 'absolute', top: 0, left: 540 - 0.5 * anchoClip, width: anchoClip, height: 960}} />
          </Sequence>
        ))}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
      </div>
      {/* separación entre las dos mitades */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 955, height: 10, background: C.amarillo, boxShadow: `0 0 18px rgba(${GLOW_AMARILLO},0.9)`, transformOrigin: '0% 50%', scale: `${lim((t - a) / 0.3)} 1`}} />
      <Lienzo>
        <Reloj t={t} en={a + 0.12} a={2.8} b={3.84} x={170} y={1085} r={62} vueltas={8} />
        <Atajo t={t} x={850} y={1060} pulsos={PULSOS} en={a + 0.1} />
        {t >= PULSOS[1][0] && (
          <g transform={`translate(850 1140) scale(${vecesAp.sx} ${vecesAp.sy})`} style={{filter: SOMBRA_TEXTO}}>
            <rect x={-62} y={-26} width={124} height={50} rx={25} fill={ROJO} stroke="#fff" strokeWidth={3} />
            <text x={0} y={11} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={30} fill="#fff">{`×${veces * 37}`}</text>
          </g>
        )}
        <Particulas t={t} en={3.84} x={170} y={1085} n={10} radio={110} />
      </Lienzo>
    </AbsoluteFill>
  );
};

// 1) "muchas veces llevan años utilizando los mismos sistemas": un monitor viejo con telarañas; al decir "llevan años"
// las hojas del calendario salen volando una tras otra, y al decir "mismos sistemas" una flecha da vueltas alrededor
const VIEJO = {a: 8.9, b: 12.64, monitor: 9.28, anos: 10.04, mismos: 11.6};
const Viejo: React.FC<{t: number}> = ({t}) => {
  const {a, b, monitor, anos, mismos} = VIEJO;
  const ap = aparece(t, monitor, -8);
  const fl = flota(t, 0.7, 4);
  const tela = lim((t - monitor - 0.3) / 0.5);
  const giro = (t - mismos) * 160;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(470 ${215 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          {/* monitor de tubo */}
          <rect x={-130} y={-105} width={260} height={190} rx={22} fill="#d9d2bd" stroke="#fff" strokeWidth={5} />
          <rect x={-104} y={-82} width={208} height={140} rx={16} fill="#1e2a22" />
          <rect x={-90} y={-66} width={60} height={9} rx={4} fill="#6dff9b" opacity={0.6 + 0.4 * Math.sin(t * 9)} />
          <rect x={-90} y={-48} width={110} height={9} rx={4} fill="#6dff9b" opacity={0.35} />
          <rect x={-90} y={-30} width={84} height={9} rx={4} fill="#6dff9b" opacity={0.35} />
          <path d="M -40 85 L -56 120 L 56 120 L 40 85 Z" fill="#c9c1aa" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
          {/* telaraña en la esquina */}
          <g stroke="rgba(255,255,255,0.85)" strokeWidth={2.5} fill="none" opacity={tela}>
            <path d="M -130 -60 L -84 -105 M -130 -105 L -96 -71 M -130 -82 L -110 -105" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tela} />
            <path d="M -122 -76 Q -112 -84 -104 -97 M -116 -64 Q -100 -78 -90 -97" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tela} />
          </g>
        </g>
        {/* calendario: las hojas salen volando (los años pasan) */}
        <g transform={`translate(720 ${200 + fl.y})`}>
          {t >= anos - 0.2 && (
            <g transform={`scale(${aparece(t, anos - 0.2, 10).sx} ${aparece(t, anos - 0.2, 10).sy})`}>
              <rect x={-62} y={-64} width={124} height={130} rx={16} fill="#fff" stroke="#fff" strokeWidth={4} />
              <rect x={-62} y={-64} width={124} height={36} rx={16} fill={ROJO} />
              {[-30, 0, 30].map((dx) => <rect key={dx} x={dx - 9} y={-10} width={18} height={14} rx={3} fill="#c8c8d0" />)}
              {[-30, 0, 30].map((dx) => <rect key={dx} x={dx - 9} y={18} width={18} height={14} rx={3} fill="#c8c8d0" />)}
            </g>
          )}
          {Array.from({length: 7}, (_, i) => {
            const en = anos + i * 0.12;
            const k = (t - en) / 0.7;
            if (k <= 0 || k >= 1) return null;
            return (
              <g key={i} transform={`translate(${k * (120 + i * 14)} ${-k * 140 + k * k * 120}) rotate(${k * (200 + i * 30)}) scale(${1 - k * 0.5})`} opacity={1 - k}>
                <rect x={-62} y={-64} width={124} height={130} rx={16} fill="#f5f5f7" />
                <rect x={-62} y={-64} width={124} height={36} rx={16} fill={ROJO} />
              </g>
            );
          })}
        </g>
        {/* los mismos sistemas: una flecha que da vueltas alrededor del monitor */}
        {t >= mismos && (
          <g transform={`translate(470 ${215 + fl.y}) rotate(${giro})`}>
            <Conector t={t} en={mismos} d="M 0 -170 A 170 170 0 1 1 -120 -120" color={C.amarillo} dur={0.45} grosor={8} punta={[-120, -120, -Math.PI / 4]} />
          </g>
        )}
      </Lienzo>
    </Ventana>
  );
};

// 2) Recorrido del proceso manual a pantalla completa (maqueta genérica, sin datos reales):
// llega una consulta al chat → busca los datos en la tabla → los copia (CTRL+C) → los mete en otro programa (CTRL+V)
// → y repite el proceso: una flecha cierra el bucle y todo vuelve a empezar cada vez más rápido, con un contador
const FondoProceso: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 100% 70% at 50% 30%, #12343a 0%, #0c1a1f 62%, #070b0d 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2px)', backgroundSize: '40px 40px', backgroundPosition: `0px ${(t * 12) % 40}px`}} />
  </AbsoluteFill>
);
const Barra: React.FC<{x: number; y: number; w: number; h?: number; o?: number; color?: string}> = ({x, y, w, h = 14, o = 0.22, color}) => <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={color ?? `rgba(255,255,255,${o})`} />;
const VentanaUI: React.FC<{t: number; en: number; y: number; h: number; icono: string; color: string; activa: boolean; children: React.ReactNode}> = ({t, en, y, h, icono, color, activa, children}) => {
  if (t < en) return null;
  const m = muelle(t, en, 2.2, 7);
  return (
    <g transform={`translate(0 ${(1 - m) * 60})`} opacity={lim((t - en) / 0.15)}>
      <rect x={90} y={y} width={900} height={h} rx={28} fill="rgba(20,24,30,0.96)" stroke={activa ? color : 'rgba(255,255,255,0.14)'} strokeWidth={activa ? 5 : 3}
        style={{filter: activa ? `drop-shadow(0 0 16px ${color})` : 'drop-shadow(0 10px 24px rgba(0,0,0,0.5))'}} />
      <rect x={90} y={y} width={900} height={60} rx={28} fill="rgba(255,255,255,0.05)" />
      {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <circle key={c} cx={128 + i * 28} cy={y + 30} r={9} fill={c} />)}
      <g transform={`translate(${940 - 18} ${y + 12}) scale(1.5)`}><path d={icono} fill={color} /></g>
      {children}
    </g>
  );
};
const Cursor: React.FC<{x: number; y: number; clic: number}> = ({x, y, clic}) => (
  <g transform={`translate(${x} ${y}) scale(${1 - 0.15 * clic})`} style={{filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))'}}>
    <path d="M 0 0 L 0 44 L 11 33 L 19 52 L 27 48 L 19 30 L 34 30 Z" fill="#fff" stroke="#111" strokeWidth={3} strokeLinejoin="round" />
  </g>
);
// una vuelta del proceso: tiempos relativos al inicio (vel = 1 la primera vez; después cada vez más rápido)
const VUELTA = {consulta: 0.94, busca: 2.06, fila: 2.62, copia: 3.38, vuela: 4.06, pega: 4.62, repite: 5.46};
const Proceso: React.FC<{t: number}> = ({t}) => {
  const {a, b} = PROCESO;
  if (t < a || t >= b) return null;
  // vuelta 0 a velocidad real; desde "repite" (18.12) las vueltas se repiten cada vez más deprisa
  const inicioRep = a + VUELTA.repite;
  const reps = t < inicioRep ? 0 : 1 + Math.floor(Math.log2(1 + (t - inicioRep) / 0.5));
  const t0 = reps === 0 ? a : inicioRep + 0.5 * (Math.pow(2, reps - 1) - 1);
  const vel = reps === 0 ? 1 : Math.pow(2, reps) * 1.6;
  const r = (t - t0) * vel; // tiempo dentro de la vuelta actual
  const en = (k: keyof typeof VUELTA) => r >= VUELTA[k] * (reps === 0 ? 1 : 0.55);
  const kk = (k: keyof typeof VUELTA, d = 0.3) => lim((r - VUELTA[k] * (reps === 0 ? 1 : 0.55)) / d);
  // posiciones del cursor por fases
  const P = {inicio: [700, 1300], msg: [420, 300], buscar: [640, 640], fila: [560, 780], campo: [520, 1110]};
  const seg = (p: number[], q: number[], k: number) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const sm = (k: number) => k * k * (3 - 2 * k);
  let cur = P.inicio;
  if (en('consulta')) cur = seg(P.inicio, P.msg, sm(kk('consulta', 0.4)));
  if (en('busca')) cur = seg(P.msg, P.buscar, sm(kk('busca', 0.35)));
  if (en('fila')) cur = seg(P.buscar, P.fila, sm(kk('fila', 0.3)));
  if (en('vuela')) cur = seg(P.fila, P.campo, sm(kk('vuela', 0.5)));
  const clic = (k: keyof typeof VUELTA) => {
    const x = r - VUELTA[k] * (reps === 0 ? 1 : 0.55) - 0.35;
    return x > 0 && x < 0.15 ? Math.sin((x / 0.15) * Math.PI) : 0;
  };
  const clics = Math.max(clic('consulta'), clic('busca'), clic('fila'), clic('pega'));
  // la fila copiada vuela en arco hasta el formulario
  const vu = sm(kk('vuela', 0.5));
  const gx = 560 + (520 - 560) * vu, gy = 780 + (1110 - 780) * vu - Math.sin(vu * Math.PI) * 120;
  const veces = reps + (en('pega') ? 1 : 0);
  return (
    <AbsoluteFill>
      <SinZona><FondoProceso t={t} /></SinZona>
      <Lienzo>
        {/* chat: llega la consulta */}
        <VentanaUI t={t} en={a + 0.05} y={150} h={330} icono={ICONO.chat} color={C.amarillo} activa={en('consulta') && !en('busca')}>
          {en('consulta') && (
            <g transform={`translate(160 ${250}) scale(${aparece(t, t0 + VUELTA.consulta / (reps === 0 ? 1 : vel / 0.55), 0).sx})`}>
              <rect x={0} y={0} width={520} height={110} rx={26} fill="rgba(255,255,255,0.92)" />
              <Barra x={28} y={28} w={380} h={16} color="rgba(0,0,0,0.3)" />
              <Barra x={28} y={60} w={260} h={14} color="rgba(0,0,0,0.18)" />
            </g>
          )}
          {en('consulta') && <circle cx={720} cy={265} r={16} fill={ROJO} />}
        </VentanaUI>
        {/* tabla de datos: busca y marca la fila */}
        <VentanaUI t={t} en={a + 0.12} y={520} h={360} icono={ICONO.datos} color={C.amarillo} activa={en('busca') && !en('vuela')}>
          <rect x={130} y={600} width={600} height={46} rx={23} fill="rgba(255,255,255,0.08)" stroke={en('busca') ? C.amarillo : 'rgba(255,255,255,0.15)'} strokeWidth={3} />
          <g transform="translate(146 609) scale(1.2)"><path d={ICONOS.lupa} fill={en('busca') ? C.amarillo : 'rgba(255,255,255,0.5)'} /></g>
          {en('busca') && <Barra x={190} y={616} w={300 * kk('busca', 0.5)} h={14} o={0.5} />}
          {Array.from({length: 4}, (_, i) => {
            const marca = i === 2 && en('fila');
            return (
              <g key={i}>
                <rect x={130} y={670 + i * 50} width={820} height={40} rx={12} fill={marca ? 'rgba(254,255,188,0.9)' : 'rgba(255,255,255,0.04)'} />
                <Barra x={150} y={683 + i * 50} w={140} h={13} color={marca ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.22)'} />
                <Barra x={330} y={683 + i * 50} w={220} h={13} color={marca ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.14)'} />
                <Barra x={600} y={683 + i * 50} w={120} h={13} color={marca ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.14)'} />
              </g>
            );
          })}
        </VentanaUI>
        {/* el otro programa: un formulario que se rellena */}
        <VentanaUI t={t} en={a + 0.2} y={920} h={330} icono={ICONO.ficha} color={VERDE} activa={en('pega')}>
          {[0, 1, 2].map((i) => {
            const lleno = en('pega') && kk('pega', 0.15 + i * 0.12) >= 1;
            return (
              <g key={i}>
                <Barra x={130} y={1010 + i * 72} w={110} h={12} o={0.25} />
                <rect x={260} y={996 + i * 72} width={560} height={46} rx={14} fill={lleno ? 'rgba(46,229,157,0.18)' : 'rgba(255,255,255,0.06)'} stroke={lleno ? VERDE : 'rgba(255,255,255,0.15)'} strokeWidth={3} />
                {lleno && <Barra x={280} y={1012 + i * 72} w={[300, 220, 260][i]} h={14} o={0.7} />}
              </g>
            );
          })}
        </VentanaUI>
        {/* la fila copiada viajando */}
        {en('copia') && !en('pega') && (
          <g transform={`translate(${gx} ${gy}) rotate(${vu * -8}) scale(${1 - 0.25 * vu})`} style={{filter: `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.8))`}}>
            <rect x={-290} y={-22} width={580} height={44} rx={14} fill={C.amarillo} />
            <Barra x={-270} y={-6} w={140} h={13} color="rgba(0,0,0,0.35)" />
            <Barra x={-100} y={-6} w={220} h={13} color="rgba(0,0,0,0.25)" />
          </g>
        )}
        {/* atajos */}
        {reps === 0 && en('copia') && !en('vuela') && <Atajo t={t} x={820} y={840} pulsos={[[a + VUELTA.copia + 0.05, 'C']]} en={a + VUELTA.copia} />}
        {reps === 0 && en('pega') && <Atajo t={t} x={820} y={1270} pulsos={[[a + VUELTA.pega + 0.05, 'V']]} en={a + VUELTA.pega} />}
        <Cursor x={cur[0]} y={cur[1]} clic={clics} />
        {/* y repite el proceso: la flecha cierra el bucle y el contador sube */}
        {t >= a + VUELTA.repite - 0.2 && (
          <g>
            <Conector t={t} en={a + VUELTA.repite - 0.2} d="M 1010 1080 C 1070 1080, 1070 320, 1000 320" color={C.amarillo} dur={0.4} grosor={9} flujo punta={[1000, 320, Math.PI]} />
            <g transform={`translate(905 120) scale(${aparece(t, a + VUELTA.repite, 0).sx} ${aparece(t, a + VUELTA.repite, 0).sy})`} style={{filter: SOMBRA_TEXTO}}>
              <rect x={-70} y={-28} width={140} height={56} rx={28} fill={ROJO} stroke="#fff" strokeWidth={3} />
              <text x={0} y={12} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={34} fill="#fff">{`×${veces}`}</text>
            </g>
          </g>
        )}
      </Lienzo>
    </AbsoluteFill>
  );
};

// 3) "imagina que buena parte de esas tareas se pudieran automatizar... herramientas de inteligencia artificial":
// las cuatro tareas aparecen con una mano (trabajo manual); al decir "automatizar" cae la IA en el centro, una cinta las une
// con flujo y se van poniendo en verde; al decir "herramientas" las herramientas de IA giran en órbita alrededor de la chispa
const AUTO = {a: 19.3, b: 27.16, tareas: [19.44, 20.24, 20.56, 21.24], ia: 22.4, verde: 22.7, recoge: 24.3, herramientas: 25.32, artificial: 26.44};
const Automatiza: React.FC<{t: number}> = ({t}) => {
  const {a, b, tareas, ia, verde, recoge, herramientas, artificial} = AUTO;
  const xs = [190, 370, 710, 890];
  const iconos = [ICONO.chat, ICONOS.lupa, ICONO.copiar, ICONO.pegar];
  const y = 215;
  const junta = sm2(lim((t - recoge) / 0.5));
  const orbita = ((t - herramientas) * 60 * Math.PI) / 180;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {t >= ia + 0.15 && junta < 1 && (
          <g opacity={1 - junta}>
            <Conector t={t} en={ia + 0.15} d={`M ${xs[0]} ${y} L ${xs[3]} ${y}`} color={C.amarillo} dur={0.35} flujo grosor={8} />
          </g>
        )}
        {tareas.map((en, i) => {
          if (t < en) return null;
          const x = xs[i] + (540 - xs[i]) * junta;
          const ok = t >= verde + i * 0.1;
          const ap = aparece(t, en, 12);
          const fl = flota(t, i, 4);
          const s = 1 - junta;
          return (
            <g key={i} transform={`translate(${x} ${y + fl.y}) scale(${ap.sx * s} ${ap.sy * s})`}>
              <Pulso t={t} en={en} x={0} y={0} r={56} color="#fff" />
              <circle r={56} fill={ok ? VERDE : '#fff'} stroke="#fff" strokeWidth={5} style={{filter: ok ? `drop-shadow(0 0 12px ${VERDE})` : 'none'}} />
              <IconoTrazado d={iconos[i]} t={t} en={en + 2 * F} color={ok ? '#fff' : '#1b1b20'} size={58} x={-29} y={-29} />
              {ok && <Particulas t={t} en={verde + i * 0.1} x={0} y={0} n={8} radio={100} colores={[VERDE, '#fff']} />}
            </g>
          );
        })}
        <Chip t={t} en={ia} d={ICONO.ia} x={540} y={y} r={74} fase={0.4} />
        {t >= herramientas && [ICONO.correo, ICONO.calendario, ICONO.documento, ICONO.chat].map((d, i) => {
          const g = orbita + (i * Math.PI) / 2;
          const ox = 540 + Math.cos(g) * 175, oy = y + Math.sin(g) * 95;
          const e = aparece(t, herramientas + i * 0.1, 0);
          return (
            <g key={i} transform={`translate(${ox} ${oy}) scale(${e.sx} ${e.sy})`}>
              <circle r={36} fill={OSCURO} stroke={C.amarillo} strokeWidth={4} />
              <g transform="translate(-18 -18) scale(1.5)"><path d={d} fill="#fff" /></g>
            </g>
          );
        })}
        <Destello t={t} en={artificial} x={540 + 90} y={y - 80} tam={30} color={C.amarillo} />
        <Destello t={t} en={artificial + 0.1} x={540 - 95} y={y - 60} tam={22} />
      </Lienzo>
    </Ventana>
  );
};
const sm2 = (k: number) => k * k * (3 - 2 * k);

// 4) "tu trabajo consiste en entender qué necesita una empresa, identificar una herramienta y organizar la prestación del servicio":
// tres fichas en fila que se encienden al decirse, unidas por conectores con punta; al decir "servicio" laten las tres y sale un ✓
const TRABAJO = {a: 37.9, b: 45.4, pasos: [38.36, 40.24, 43.04], empresa: 39.68, servicio: 44.88};
const Trabajo: React.FC<{t: number}> = ({t}) => {
  const {a, b, pasos, empresa, servicio} = TRABAJO;
  const xs = [220, 540, 860];
  const y = 200;
  const iconos = [ICONOS.lupa, ICONO.herramienta, ICONO.engranaje];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {[0, 1].map((i) => (
          <Conector key={i} t={t} en={pasos[i + 1] - 0.3} d={`M ${xs[i] + 70} ${y} L ${xs[i + 1] - 74} ${y}`} color={C.amarillo} dur={0.3} flujo grosor={7} punta={[xs[i + 1] - 74, y, 0]} />
        ))}
        {pasos.map((en, i) => (
          <g key={i}>
            <Chip t={t} en={en} d={iconos[i]} x={xs[i]} y={y} r={66} fondo={t >= servicio ? C.amarillo : '#fff'} fase={i * 1.3} />
            <Pulso t={t} en={servicio + i * 0.08} x={xs[i]} y={y} r={70} color={C.amarillo} />
          </g>
        ))}
        {/* la empresa que hay que entender: un edificio que sale junto a la lupa */}
        <Chip t={t} en={empresa} d={ICONO.edificio} x={xs[0] + 58} y={y + 64} r={30} fondo={OSCURO} color="#fff" quieto sinRafaga />
        {t >= servicio + 0.2 && (
          <g transform={`translate(${xs[2] + 62} ${y - 62})`}>
            <circle r={26 * aparece(t, servicio + 0.2, 0).sx} fill={VERDE} stroke="#fff" strokeWidth={3} />
            <g transform="scale(0.55)"><Check t={t} en={servicio + 0.26} /></g>
          </g>
        )}
        <Particulas t={t} en={servicio} x={540} y={y} n={14} radio={300} />
      </Lienzo>
    </Ventana>
  );
};

// 5) "es aplicar tecnología a procesos empresariales": la chispa de la IA lanza un rayo de puntos hasta el edificio,
// que se enciende ventana a ventana
const APLICA = {a: 46.62, b: 49.52, ia: 46.76, rayo: 47.2, procesos: 48.16};
const Aplica: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, rayo, procesos} = APLICA;
  const y = 210;
  const ventanas = Array.from({length: 9}, (_, i) => [-36 + (i % 3) * 36, -50 + Math.floor(i / 3) * 40]);
  const apE = aparece(t, ia + 0.1, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={ia} d={ICONO.ia} x={290} y={y} r={66} fase={0.2} />
        <Conector t={t} en={rayo} d={`M 362 ${y} C 470 ${y - 90}, 620 ${y - 90}, 700 ${y - 10}`} color={C.amarillo} dur={0.45} flujo grosor={8} punta={[700, y - 10, Math.atan2(80, 80)]} />
        {t >= ia + 0.1 && (
          <g transform={`translate(800 ${y + 10}) scale(${apE.sx} ${apE.sy})`}>
            <rect x={-80} y={-100} width={160} height={190} rx={14} fill={OSCURO} stroke="#fff" strokeWidth={5} />
            {ventanas.map(([vx, vy], i) => {
              const on = t >= procesos + i * 0.06;
              return <rect key={i} x={vx - 14} y={vy - 14} width={28} height={26} rx={5} fill={on ? C.amarillo : 'rgba(255,255,255,0.15)'} style={{filter: on ? `drop-shadow(0 0 6px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />;
            })}
            <rect x={-18} y={52} width={36} height={38} rx={6} fill="rgba(255,255,255,0.25)" />
          </g>
        )}
        <Particulas t={t} en={procesos + 0.5} x={800} y={y} n={12} radio={150} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "he preparado un curso de introducción... con 14 clases": la tarjeta del curso se abre en 14 clases que se encienden en cascada
const CURSO = {a: 52.3, b: 56.1, curso: 52.64, clases: 55.12};
const Curso: React.FC<{t: number}> = ({t}) => {
  const {a, b, curso, clases} = CURSO;
  const ap = aparece(t, curso, -6);
  const abre = sm2(lim((t - clases + 0.25) / 0.35));
  const fl = flota(t, 1.2, 4);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {abre < 1 && (
          <g transform={`translate(540 ${205 + fl.y}) scale(${ap.sx * (1 - abre)} ${ap.sy * (1 - abre)}) rotate(${ap.rot})`}>
            <rect x={-150} y={-90} width={300} height={180} rx={24} fill={OSCURO} stroke="#fff" strokeWidth={6} />
            <circle r={44} fill={C.amarillo} />
            <IconoTrazado d={ICONO.play} t={t} en={curso + 3 * F} color="#1b1b20" size={54} x={-24} y={-27} />
          </g>
        )}
        {Array.from({length: 14}, (_, i) => {
          const en = clases + i * 0.04;
          if (t < en) return null;
          const e = aparece(t, en, 0);
          const cx = 540 + ((i % 7) - 3) * 118, cy = 160 + Math.floor(i / 7) * 96 + fl.y;
          const brillo = Math.max(0, Math.sin((t - clases) * 4 - (i % 7) * 0.5));
          return (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${e.sx} ${e.sy})`}>
              <rect x={-50} y={-36} width={100} height={72} rx={14} fill={brillo > 0.6 ? C.amarillo : OSCURO} stroke={C.amarillo} strokeWidth={4} />
              <path d="M -9 -14 L 15 0 L -9 14 Z" fill={brillo > 0.6 ? '#1b1b20' : '#fff'} />
            </g>
          );
        })}
        <Particulas t={t} en={clases + 0.6} x={540} y={210} n={16} radio={320} />
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
  // HOOK (detrás de Álvaro): imagina que contratas a una persona
  {a: 0.04, b: 1.86, top: 70, lineas: [{ws: [['imagina', 0.04], ['que', 0.52]], size: 84}, {ws: [['contratas', 0.68]], size: 110},
    {ws: [['a', 1.2], ['una', 1.32]], size: 84, abajo: true}, {ws: [['persona', 1.48, amarillo]], size: 150, golpe: true, abajo: true}]},
  // para que haga esto (en la línea de la pantalla partida)
  {a: 1.88, b: 2.78, top: 760, lineas: [{ws: [['para', 1.88], ['que', 2.16], ['haga', 2.28]], size: 90}, {ws: [['esto', 2.56, amarillo]], size: 160, golpe: true}]},
  // durante ocho horas (abajo, sobre la mesa del empleado; no tapa su cara)
  {a: 2.8, b: 3.82, top: 1420, lineas: [{ws: [['durante', 2.8]], size: 90}, {ws: [['ocho horas', 3.2, rosaFuerte]], size: 140, golpe: true}]},
  // Y aquí viene lo interesante
  {a: 27.2, b: 28.48, top: 960, lineas: [{ws: [['y', 27.2], ['aquí', 27.28], ['viene', 27.48], ['lo', 27.72]], size: 84}, {ws: [['interesante', 27.84, amarillo]], size: 140, golpe: true}]},
  // Se llama agencia de servicios de IA
  {a: 34.56, b: 36.92, top: 960, lineas: [{ws: [['se', 34.56], ['llama', 34.76]], size: 84}, {ws: [['agencia', 35.24], ['de', 35.84]], size: 100}, {ws: [['servicios de IA', 35.96, amarillo]], size: 120, golpe: true}]},
  // No es ciencia ficción
  {a: 45.44, b: 46.58, top: 960, lineas: [{ws: [['no', 45.44], ['es', 45.56]], size: 90}, {ws: [['ciencia ficción', 45.68, rosaFuerte]], size: 130, golpe: true}]},
  // Puedes acceder a él por solo un euro
  {a: 56.16, b: 58.74, top: 960, lineas: [{ws: [['puedes', 56.16], ['acceder', 56.48], ['a', 56.92], ['él', 57.0]], size: 84}, {ws: [['por', 57.16], ['solo', 57.4]], size: 90}, {ws: [['1 €', 57.84, amarillo]], size: 190, golpe: true}]},
];
const LISTA: [number, number] = [-10, -10];
const CTA = 58.8;
const CTA_FIN = 60.06; // tras "haz clic aquí abajo ↓" sigue la frase en subtítulos (como en los demás 1E)
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
const MAX_CAR = 20; // ~780 px a 70 px: no llega a la columna de botones de Instagram (x≈930)
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
const CLAVE = new Set(['empresas', 'procesos', 'sistemas', 'consulta', 'datos', 'copia', 'programa', 'proceso', 'automatizar', 'herramientas', 'modelo', 'soluciones', 'entender', 'identificar', 'organizar', 'servicio', 'tecnología', 'curso', 'clases', 'automatizaciones', 'servicios']);

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
  if (CAPA === 'lottie') return null;
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
const topSeguro = (top: number, lineas: Linea[], baja: boolean) =>
  Math.max(ARRIBA, Math.min(Math.max(top, ARRIBA), ABAJO - lineas.flatMap(partir).reduce((s, l) => s + tamLinea(l, baja) * 1.02 + 4, 0)));
const FraseGrande: React.FC<{t: number; g: Grande; parte?: 'arriba' | 'abajo'}> = ({t, g, parte = 'arriba'}) =>
  // sin líneas en esta parte no se pinta nada (ni el velo)
  CAPA === 'lottie' || !g.lineas.some((l) => (parte === 'abajo') === !!l.abajo) ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: topSeguro(parte === 'abajo' ? 1180 : g.top, g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo), g.top < ARRIBA && parte !== 'abajo') - 60, padding: '60px 90px', background: VELO}}>
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

export const ReelE6: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E6)} layout="none">
            <Video src={staticFile('e6/e6.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frase en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e6/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {CAPA !== 'lottie' && <Partida t={t} />}
        <ZonaSegura t={t} zonas={ZONAS}><Proceso t={t} /></ZonaSegura>
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
      <ZonaSegura t={t} zonas={ZONAS}><Viejo t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Automatiza t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Trabajo t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Aplica t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Curso t={t} /></ZonaSegura>
      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha (tiempos sílaba a sílaba con la forma de onda) */}
      <Ventana t={t} a={CAPA === 'lottie' ? 1e9 : CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={58.8}>haz</Sube>
          <Sube t={t} en={59.08}>clic</Sube>
          <Sube t={t} en={59.32}>aquí</Sube>
          <Sube t={t} en={59.54} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 59.66 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 59.66)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 58.8, 59.08, 59.32, 59.54].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {PULSOS.map(([p], i) => (
        <Son key={`k${i}`} s="click" en={p} db={-14} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 0.68, -6], ['boom', 1.48, -4], ['cineboom', 2.56, -5], ['loading', 2.8, -12], ['boom', 3.2, -4], ['negativo', 6.24, -9],
        ['pop', 9.28, -8], ['swish', 10.04, -11], ['loading', 11.6, -12],
        ['notif', 13.6, -8], ['typing', 14.72, -12], ['click', 15.28, -9], ['snap', 16.04, -8], ['swish', 16.72, -10], ['pop', 17.28, -8], ['swoosh2', 17.92, -10], ['tapcorto', 18.4, -11], ['tapcorto', 18.7, -11], ['tapcorto', 18.9, -11],
        ['pop', 19.44, -8], ['pop', 20.24, -8], ['pop', 20.56, -8], ['pop', 21.24, -8], ['cineboom', 22.4, -6], ['exito', 22.75, -9], ['twinkle', 25.32, -10], ['ding', 26.44, -9],
        ['boom', 27.84, -4], ['cineboom', 35.96, -5],
        ['pop', 38.36, -7], ['pop', 39.68, -9], ['pop', 40.24, -7], ['pop', 43.04, -7], ['exito', 44.88, -8],
        ['boom', 45.68, -5], ['swish', 47.2, -10], ['ding', 48.16, -8],
        ['pop', 52.64, -7], ['puntos', 55.12, -10], ['exito', 55.7, -9], ['cineboom', 57.84, -4],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
