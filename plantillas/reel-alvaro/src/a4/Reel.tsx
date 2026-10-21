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
import {Chip, Conector, Cruz, Lienzo, OSCURO, ROJO, Destello, IconoTrazado, Particulas, Pulso, aparece, flota} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'deslizar', golpe: 'barrido', impacto: 'rayas', sub: 'deslizar', flecha: 'gira'};

export const DURACION_A4 = 66.76;
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
  [0.5, 1.05, 1.2, 'suave'],
  [1.92, 1.13, 0.16, 'golpe'],
  [3.24, 1.04, 0.6, 'suave'],
  [4.48, 1.16, 0.16, 'golpe'],
  [5.72, 1.04, 0.8, 'suave'],
  [7.6, 1.0, 0.8, 'suave'],
  [15.64, 1.04, 2.0, 'suave'],
  [18.0, 1.08, 0.3, 'golpe'],
  [19.6, 1.16, 0.16, 'golpe'],
  [20.64, 1.05, 0.8, 'suave'],
  [21.88, 1.0, 0, 'corte'],
  [24.68, 1.02, 0, 'corte'],
  [24.75, 1.06, 1.3, 'suave'],
  [26.08, 1.13, 0.16, 'golpe'],
  [27.64, 1.04, 0.6, 'suave'],
  [28.52, 1.1, 0.2, 'golpe'],
  [29.44, 1.04, 0.6, 'suave'],
  [30.56, 1.1, 0.2, 'golpe'],
  [32.12, 1.04, 0.6, 'suave'],
  [33.0, 1.08, 2.4, 'suave'],
  [35.6, 1.04, 0.6, 'suave'],
  [39.4, 1.14, 0.16, 'golpe'],
  [40.16, 1.04, 0.8, 'suave'],
  [42.36, 1.12, 0.2, 'golpe'],
  [43.52, 1.04, 0.4, 'suave'],
  [43.68, 1.12, 0.16, 'golpe'],
  [44.52, 1.0, 0, 'corte'],
  [48.9, 1.0, 0, 'corte'],
  [48.95, 1.04, 1.0, 'suave'],
  [52.2, 1.0, 0, 'corte'],
  [52.25, 1.05, 1.0, 'suave'],
  [53.84, 1.1, 0.3, 'golpe'],
  [55.6, 1.0, 0, 'corte'],
  [58.08, 1.0, 0, 'corte'],
  [58.1, 1.04, 0.8, 'suave'],
  [60.0, 1.13, 0.2, 'golpe'],
  [61.0, 1.04, 0.8, 'suave'],
  [62.0, 1.07, 3.0, 'suave'],
  [65.12, 1.1, 0.5, 'suave'],
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
const IMPACTOS = [1.92, 4.48, 19.6, 39.4];
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
  {src: 'tecnica', a: 21.88, b: 24.68, desde: 1, foco: 0.55},
  {src: 'captacion', a: 44.52, b: 46.8, desde: 3, foco: 0.55},
  {src: 'entrega', a: 46.8, b: 48.9, desde: 1, foco: 0.5},
  {src: 'especialistas', a: 49.92, b: 52.2, desde: 4, foco: 0.5},
  {src: 'empresa', a: 55.6, b: 58.08, desde: 2, foco: 0.5},
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
            <Video src={staticFile(`a4/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
  ia: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
  caja: 'M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2zm0 2.2L5.6 7.4 12 10.6l6.4-3.2L12 4.2zM5 9v7.3l6 3v-7.3L5 9zm14 0l-6 3v7.3l6-3V9z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
};

// 1) Herramientas: los nombres salen como pastillas que caen con muelle (aplastar/estirar y giro que se asienta), flotan,
// y al decir "la gran pregunta" salen despedidas hacia fuera girando, con un destello en el centro
type Pastilla = [string, number, number, number, number]; // texto, entra, x, y, giro
const PASTILLAS: Pastilla[] = [
  ['Claude', 8.32, 300, 190, -6],
  ['Claude Code', 8.88, 770, 180, 5],
  ['ChatGPT', 9.6, 280, 285, 4],
  ['herramientas', 11.56, 790, 285, -4],
  ['automatizaciones', 12.77, 540, 100, -3],
  ['asistentes de voz', 13.72, 330, 375, 3],
  ['chatbots', 14.84, 800, 375, -2],
];
const PastillaTxt: React.FC<{texto: string; t: number; en: number; x: number; y: number; giro: number; sale?: number; fase: number; dx?: number; dy?: number; extraRot?: number}> = ({
  texto, t, en, x, y, giro, sale = 0, fase, dx = 0, dy = 0, extraRot = 0,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, giro * 2.5);
  const fl = flota(t, fase, 5);
  return (
    <div style={{position: 'absolute', left: x, top: y, translate: `calc(-50% + ${dx}px) calc(-50% + ${dy + fl.y}px)`,
      rotate: `${giro + ap.rot + extraRot}deg`, scale: `${ap.sx * fl.s * (1 - 0.3 * sale)} ${ap.sy * fl.s * (1 - 0.3 * sale)}`, opacity: 1 - sale,
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))', background: 'rgba(255,255,255,0.96)', color: '#111', borderRadius: 999, padding: '12px 26px 12px 20px',
      display: 'flex', alignItems: 'center', gap: 12, ...H, fontSize: 40, textShadow: 'none', whiteSpace: 'nowrap', border: `4px solid ${C.amarillo}`}}>
      <span style={{width: 16, height: 16, borderRadius: 8, background: '#e2b100', scale: `${0.8 + 0.25 * Math.abs(Math.sin(t * 4 + fase))}`}} />
      {texto}
    </div>
  );
};
const Pastillas: React.FC<{t: number}> = ({t}) => {
  const fuera = 18.0;
  return (
    <Ventana suave t={t} a={8.2} b={fuera + 0.6}>
      {PASTILLAS.map(([txt, en, x, y, giro], i) => {
        const sale = lim((t - fuera - i * 0.02) / 0.45);
        const s2 = sale * sale;
        const ang = Math.atan2(y - 520, x - 540);
        return <PastillaTxt key={txt} texto={txt} t={t} en={en} x={x} y={y} giro={giro} fase={i} sale={s2} dx={Math.cos(ang) * 900 * s2} dy={Math.sin(ang) * 900 * s2} extraRot={s2 * 120 * (i % 2 ? 1 : -1)} />;
      })}
      <Lienzo>
        {PASTILLAS.map(([txt, en, x, y], i) => <Particulas key={txt} t={t} en={en} x={x} y={y} n={7} radio={120} colores={[C.amarillo, '#ffffff']} dur={14} />)}
        <Destello t={t} en={fuera} x={540} y={240} tam={46} color={C.amarillo} />
        <Particulas t={t} en={fuera} x={540} y={240} n={16} radio={300} />
      </Lienzo>
    </Ventana>
  );
};
// 2) "el objetivo no es acumular herramientas en tu ordenador": las pastillas caen una sobre otra y se amontonan
// (cada una cae con gravedad, rebota al apoyarse y el montón se aplasta un poco con cada golpe)
const MONTON: [string, number, number, number][] = [
  // texto, x, y (apoyada), giro
  ['automatizaciones', 395, 352, -2],
  ['ChatGPT', 795, 350, 4],
  ['asistentes de voz', 420, 284, 3],
  ['Claude', 815, 280, -5],
  ['herramientas', 425, 216, -3],
  ['chatbots', 800, 212, 6],
  ['Claude Code', 590, 146, -4],
];
const Monton: React.FC<{t: number}> = ({t}) => {
  const desde = 53.84, paso = 0.1, b = 55.6;
  return (
    <Ventana suave t={t} a={desde - 0.05} b={b}>
      {MONTON.map(([txt, x, y, giro], i) => {
        const en = desde + i * paso;
        if (t < en) return null;
        const k = t - en;
        const caida = Math.min(1, (k / 0.32) ** 2); // gravedad
        const rebote = k > 0.32 ? Math.exp(-9 * (k - 0.32)) * Math.sin((k - 0.32) * 28) * 12 : 0;
        const yy = -260 + (y + 260) * caida - rebote;
        const aplasta = k > 0.32 ? Math.exp(-10 * (k - 0.32)) * 0.18 : 0;
        return (
          <div key={txt} style={{position: 'absolute', left: x, top: yy, translate: '-50% -50%', rotate: `${giro * caida + (1 - caida) * (i % 2 ? 25 : -25)}deg`,
            scale: `${1 + aplasta} ${1 - aplasta}`, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))', background: 'rgba(255,255,255,0.96)', color: '#111', borderRadius: 999,
            padding: '12px 26px 12px 20px', display: 'flex', alignItems: 'center', gap: 12, ...H, fontSize: 40, textShadow: 'none', whiteSpace: 'nowrap', border: `4px solid ${C.amarillo}`}}>
            <span style={{width: 16, height: 16, borderRadius: 8, background: '#e2b100'}} />
            {txt}
          </div>
        );
      })}
      <Lienzo>
        {MONTON.map(([txt, x, y], i) => <Particulas key={txt} t={t} en={desde + i * paso + 0.32} x={x} y={y + 30} n={6} radio={90} colores={['#ffffff', C.amarillo]} dur={12} />)}
      </Lienzo>
    </Ventana>
  );
};

// 3) Las dos partes de una agencia: "dos cosas" dibuja dos huecos; en ellos caen captar (imán) y entregar (caja).
// Si solo sabes entregar, el imán se apaga y se tacha (y la caja espera con unos puntos que botan);
// si solo sabes vender, se tacha la caja; "un sistema que conecte las dos partes": un engranaje une las dos con flujo
const PARTES = {a: 26.08, b: 43.48, huecos: 26.08, captar: 28.52, entregar: 30.56, sinCaptar: [32.12, 35.6] as [number, number], sinEntregar: [35.6, 40.16] as [number, number], espera: 33.36, sistema: 41.36, conecta: 41.92};
const Iman: React.FC<{t: number; color: string}> = ({t, color}) => (
  <g>
    <path d="M -30 -32 V 4 A 30 30 0 0 0 30 4 V -32" fill="none" stroke={color} strokeWidth={22} />
    <rect x={-41} y={-44} width={22} height={18} fill={ROJO} />
    <rect x={19} y={-44} width={22} height={18} fill={ROJO} />
    {/* líneas de campo que laten */}
    {[0, 1].map((i) => {
      const k = ((t * 1.2 + i * 0.5) % 1);
      return <path key={i} d={`M -${46 + 20 * k} -46 Q 0 -${86 + 26 * k} ${46 + 20 * k} -46`} fill="none" stroke={color} strokeWidth={4} opacity={(1 - k) * 0.6} />;
    })}
  </g>
);
const Parte: React.FC<{t: number; x: number; y: number; en: number; off: [number, number]; tipo: 'captar' | 'entregar'; fase: number}> = ({t, x, y, en, off, tipo, fase}) => {
  const R = 88;
  if (t < en) return null;
  const ap = aparece(t, en, tipo === 'captar' ? -14 : 14);
  const fl = flota(t, fase, 4);
  const apagado = t >= off[0] && t < off[1];
  const tiembla = t > off[0] && t < off[0] + 0.45 ? Math.sin((t - off[0]) * 60) * 7 * (1 - (t - off[0]) / 0.45) : 0;
  const vuelve = t >= off[1] ? aparece(t, off[1], 0) : null;
  const sx = vuelve ? vuelve.sx : ap.sx, sy = vuelve ? vuelve.sy : ap.sy;
  const fondo = apagado ? 'rgba(30,30,36,0.92)' : C.amarillo;
  return (
    <g transform={`translate(${x + tiembla} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={R} color={C.amarillo} />
      <g transform={`scale(${sx * fl.s} ${sy * fl.s}) rotate(${ap.rot})`}>
        <circle r={R} fill={fondo} stroke={apagado ? 'rgba(255,255,255,0.45)' : '#fff'} strokeWidth={6}
          style={{filter: apagado ? 'none' : `drop-shadow(0 0 18px rgba(${GLOW_AMARILLO},0.9))`}} />
        <g opacity={apagado ? 0.45 : 1}>
          {tipo === 'captar' ? <Iman t={t} color={apagado ? '#fff' : '#1b1b20'} /> : <IconoTrazado d={ICONO.caja} t={t} en={en + 2 * F} color={apagado ? '#fff' : '#1b1b20'} size={96} x={-48} y={-48} />}
        </g>
        {apagado && <Cruz t={t} en={off[0]} s={2.2} color={ROJO} />}
      </g>
      <Particulas t={t} en={en} x={0} y={0} n={10} radio={170} />
      {vuelve && <Particulas t={t} en={off[1]} x={0} y={0} n={8} radio={150} />}
    </g>
  );
};
const DosPartes: React.FC<{t: number}> = ({t}) => {
  const {a, b, huecos, captar, entregar, sinCaptar, sinEntregar, espera, sistema, conecta} = PARTES;
  const xs = [300, 780], y = 300;
  const hueco = (x: number, i: number, lleno: number) => {
    const p = 1 - Math.pow(1 - lim((t - huecos - i * 0.12) / 0.45), 3);
    if (t >= lleno || p <= 0) return null;
    return <circle key={i} cx={x} cy={y} r={80 + 4 * Math.sin(t * 5 + i)} fill="rgba(0,0,0,0.25)" stroke="#fff" strokeWidth={5} strokeDasharray="14 12"
      strokeDashoffset={-t * 30} opacity={p} />;
  };
  // la caja espera: tres puntos que botan junto a ella (dependes de que alguien venga a comprarte)
  const esperando = t >= espera && t < sinCaptar[1];
  const gira = (t - sistema) * 90;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {hueco(xs[0], 0, captar)}
        {hueco(xs[1], 1, entregar)}
        <Conector t={t} en={conecta} d={`M ${xs[0] + 96} ${y} L ${540 - 54} ${y}`} color={C.amarillo} dur={0.25} flujo grosor={9} />
        <Conector t={t} en={conecta + 0.12} d={`M ${540 + 54} ${y} L ${xs[1] - 96} ${y}`} color={C.amarillo} dur={0.25} flujo grosor={9} />
        <Parte t={t} x={xs[0]} y={y} en={captar} off={sinCaptar} tipo="captar" fase={0} />
        <Parte t={t} x={xs[1]} y={y} en={entregar} off={sinEntregar} tipo="entregar" fase={1.6} />
        {esperando && (
          <g transform={`translate(${xs[1]} ${y + 128})`} opacity={lim((t - espera) / 0.2)}>
            <rect x={-62} y={-26} width={124} height={52} rx={26} fill={OSCURO} stroke="#fff" strokeWidth={3} />
            {[0, 1, 2].map((i) => <circle key={i} cx={-30 + i * 30} cy={-Math.abs(Math.sin(t * 9 - i * 0.8)) * 9 + 2} r={8} fill="#fff" />)}
          </g>
        )}
        {t >= sistema && (
          <g transform={`translate(540 ${y})`}>
            <g transform={`scale(${aparece(t, sistema, 0).sx} ${aparece(t, sistema, 0).sy})`}>
              <circle r={54} fill={OSCURO} stroke={C.amarillo} strokeWidth={6} />
              <g transform={`rotate(${gira}) translate(-34 -34) scale(2.83)`}><path d={ICONO.engranaje} fill={C.amarillo} /></g>
            </g>
          </g>
        )}
        <Pulso t={t} en={conecta + 0.4} x={xs[0]} y={y} r={92} color={C.amarillo} />
        <Pulso t={t} en={conecta + 0.5} x={xs[1]} y={y} r={92} color={C.amarillo} />
        <Particulas t={t} en={conecta + 0.4} x={540} y={y} n={16} radio={320} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "si ya sabes algo de IA pero quieres entender cómo vender esos servicios": la chispa de la IA lanza una flecha
// que se dibuja hasta una etiqueta de precio que cuelga y se balancea (vender)
const VENDER = {a: 61.6, b: 64.95, ia: 61.88, flecha: 62.84, vender: 63.84};
const DeIAaVender: React.FC<{t: number}> = ({t}) => {
  const {a, b, ia, flecha, vender} = VENDER;
  const ap = aparece(t, vender, 0);
  const vaiven = t >= vender ? 18 * Math.exp(-2.4 * (t - vender)) * Math.cos((t - vender) * 7) + Math.sin(t * 2.2) * 3 : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={ia} d={ICONO.ia} x={300} y={300} r={78} fase={0.4} />
        <Conector t={t} en={flecha} d="M 392 300 C 470 210, 610 210, 676 280" color="#fff" dur={0.45} flujo grosor={8} punta={[676, 280, Math.atan2(280 - 210, 676 - 610)]} />
        {t >= vender && (
          <g transform={`translate(780 200)`}>
            {/* cordel del que cuelga la etiqueta */}
            <circle r={9} fill="#fff" />
            <g transform={`rotate(${vaiven}) scale(${ap.sx} ${ap.sy})`}>
              <line x1={0} y1={0} x2={0} y2={40} stroke="#fff" strokeWidth={4} />
              <path d="M -58 66 L 0 40 L 58 66 L 58 190 Q 58 202 46 202 L -46 202 Q -58 202 -58 190 Z" fill={C.amarillo} stroke="#fff" strokeWidth={5} strokeLinejoin="round"
                style={{filter: `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},0.8))`}} />
              <circle cy={64} r={9} fill="#1b1b20" />
              <text y={160} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={74} fill="#1b1b20">€</text>
            </g>
          </g>
        )}
        <Particulas t={t} en={vender} x={780} y={320} n={12} radio={170} />
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
  {a: 0.0, b: 3.2, top: 60, lineas: [{ws: [['puedes', 0.0], ['aprender', 0.28]], size: 72}, {ws: [['a', 0.68], ['construir', 0.76], ['el', 1.32], ['mejor', 1.52]], size: 72}, {ws: [['agente de ia', 1.92, amarillo]], size: 130, golpe: true}, {ws: [['del', 2.6], ['mundo', 2.84]], size: 84, abajo: true}]},
  // Sin un solo cliente
  {a: 3.24, b: 5.68, top: 1000, lineas: [{ws: [['y', 3.24], ['seguir', 3.48], ['sin', 3.92], ['tener', 4.2]], size: 80}, {ws: [['un solo cliente', 4.48, rosaFuerte]], size: 120, golpe: true}]},
  // La gran pregunta
  {a: 18.64, b: 20.6, top: 980, lineas: [{ws: [['¿ahora', 18.64], ['quién', 19.12]], size: 90}, {ws: [['me compra', 19.44]], size: 120, golpe: true}, {ws: [['esto?', 20.04, amarillo]], size: 150, golpe: true}]},
  // La parte técnica (B-roll)
  {a: 23.36, b: 24.65, top: 260, lineas: [{ws: [['con', 23.36], ['la', 23.52], ['parte', 23.68]], size: 90}, {ws: [['técnica', 24.0, amarillo]], size: 150, golpe: true}]},
  // Dos cosas
  {a: 26.08, b: 27.6, top: 1000, lineas: [{ws: [['dos cosas', 26.08, amarillo]], size: 150, golpe: true}, {ws: [['para', 26.72], ['funcionar', 27.0]], size: 90}]},
  {a: 27.64, b: 29.4, top: 1000, lineas: [{ws: [['la', 27.64], ['primera', 27.84], ['es', 28.36]], size: 80}, {ws: [['captar', 28.52]], size: 130, golpe: true}, {ws: [['clientes', 28.88, amarillo]], size: 130, golpe: true}]},
  {a: 29.44, b: 32.08, top: 1000, lineas: [{ws: [['y', 29.44], ['la', 29.6], ['segunda', 29.72], ['es', 30.32]], size: 80}, {ws: [['entregar bien', 30.56, amarillo]], size: 120, golpe: true}, {ws: [['el', 31.28], ['servicio', 31.4]], size: 90}]},
  // Negocio sostenible
  {a: 38.2, b: 40.12, top: 1000, lineas: [{ws: [['tampoco', 38.2], ['tienes', 38.6]], size: 80}, {ws: [['un', 38.92], ['negocio', 39.04]], size: 90}, {ws: [['sostenible', 39.4, rosaFuerte]], size: 140, golpe: true}]},
  // Las dos partes
  {a: 41.12, b: 43.48, top: 1000, lineas: [{ws: [['un', 41.12], ['sistema', 41.36], ['que', 41.76], ['conecte', 41.92]], size: 80}, {ws: [['las dos partes', 42.36, amarillo]], size: 120, golpe: true}]},
  // ClientesOnline
  {a: 43.52, b: 44.48, top: 1000, lineas: [{ws: [['en', 43.52]], size: 80}, {ws: [['ClientesOnline', 43.68, amarillo]], size: 120, golpe: true}]},
  // Conseguir clientes de forma constante
  {a: 58.88, b: 60.96, top: 1000, lineas: [{ws: [['conseguir', 58.88], ['clientes', 59.4]], size: 90}, {ws: [['de', 59.88], ['forma', 60.0]], size: 80}, {ws: [['constante', 60.32, amarillo]], size: 150, golpe: true}]},
];
// Tramo de las herramientas: las pastillas con los nombres son el texto grande (sin subtítulos encima)
const LISTA: [number, number] = [7.6, 15.62];
const CTA = 65.12;
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
const CLAVE = new Set(['nadie', 'problema', 'técnica', 'entregar', 'vender', 'comprarte', 'captación', 'especialistas', 'herramientas', 'empresa', 'vender']);

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
const DETRAS: [number, number][] = [[0, 3.48]];

export const ReelA4: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A4)} layout="none">
            <Video src={staticFile('a4/a4.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a4/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Pastillas t={t} />
      <Monton t={t} />
      <DosPartes t={t} />
      <DeIAaVender t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}

      {/* Tramo de herramientas: "aprendes sobre / aprendes a conectar / aprendes" arriba, en pequeño (el resto son las pastillas) */}
      {([[7.6, 10.62, [['aprendes', 7.6], ['sobre', 8.04]]], [10.68, 12.3, [['aprendes', 10.68], ['a', 11.12], ['conectar', 11.2]]], [12.32, 15.62, [['aprendes', 12.32]]]] as [number, number, [string, number][]][]).map(([a, b, ws]) => (
        <Ventana key={a} t={t} a={a} b={b}>
          <div style={{position: 'absolute', left: 100, right: 100, top: 1180, display: 'flex', justifyContent: 'center', gap: '0.24em', ...H, fontSize: 80, filter: SOMBRA}}>
            {ws.map(([w, en]) => <Entra estilo={ESTILO.texto} key={w + en} t={t} en={en} sale={b - 0.2}>{w}</Entra>)}
          </div>
        </Ventana>
      ))}

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={DURACION_A4}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={65.12}>haz</Sube>
          <Sube t={t} en={65.44}>clic</Sube>
          <Sube t={t} en={65.76} style={amarillo}>aquí</Sube>
          <Sube t={t} en={66.04} style={amarillo}>debajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 66.2 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 66.2)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 65.12, 65.44, 65.76, 66.04, 7.6, 8.04, 10.68, 11.12, 11.2, 12.32].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.92, -3], ['thud', 4.48, -3],
        ['burbuja2', 8.32, -2], ['burbuja2', 8.88, -2], ['burbuja2', 9.6, -2], ['burbuja2', 11.56, -2], ['burbuja2', 12.77, -2], ['burbuja2', 13.72, -2], ['burbuja2', 14.84, -2],
        ['riser', 18.0, -4], ['reveal', 18.0, -6], ['boom', 19.6, -3], ['pop', 24.0, -3], ['pop', 26.08, -3], ['puntos', 28.52, -7], ['puntos', 30.56, -7],
        ['negativo', 32.12, -5], ['negativo', 35.6, -5], ['thud', 39.4, -3], ['twinkle', 41.92, -6], ['pop', 42.36, -3], ['hit', 43.68, -3],
        ['thud', 54.16, -9], ['thud', 54.36, -9], ['thud', 54.56, -9], ['pop', 60.32, -3],
        ['pop', 61.88, -6], ['swish', 62.84, -10], ['ding', 63.84, -8], ['negativo', 32.24, -8], ['tap', 41.36, -7], ['exito', 42.4, -8], ['pop', 26.08, -8], ['pop', 26.2, -8], ['typing', 33.4, -14],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
