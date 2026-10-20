import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, Impacto, flechaV, Estilo, MUELLE} from '../variantes';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'maquina', golpe: 'glitch', impacto: 'cuadros', sub: 'maquina', flecha: 'latido'};

export const DURACION_E1 = 77.56;
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
  [0.5, 1.05, 0.5, 'suave'],
  [1.0, 1.12, 0.16, 'golpe'],
  [1.72, 1.04, 0.8, 'suave'],
  [4.24, 1.16, 0.16, 'golpe'],
  [5.12, 1.06, 0.6, 'suave'],
  [5.8, 1.12, 13.0, 'suave'],
  [18.84, 1.04, 0.6, 'suave'],
  [21.2, 1.12, 0.16, 'golpe'],
  [22.56, 1.04, 0.6, 'suave'],
  [22.88, 1.06, 0.3, 'golpe'],
  [24.04, 1.09, 0.3, 'golpe'],
  [25.96, 1.12, 0.3, 'golpe'],
  [27.2, 1.04, 0.8, 'suave'],
  [29.2, 1.1, 0.2, 'golpe'],
  [30.0, 1.04, 0.8, 'suave'],
  [31.36, 1.11, 0.2, 'golpe'],
  [32.2, 1.04, 1.0, 'suave'],
  [34.8, 1.0, 0, 'corte'],
  [40.18, 1.0, 0, 'corte'],
  [40.25, 1.07, 4.0, 'suave'],
  [46.32, 1.0, 0, 'corte'],
  [48.0, 1.0, 0, 'corte'],
  [48.05, 1.05, 1.2, 'suave'],
  [50.56, 1.04, 0.6, 'suave'],
  [51.68, 1.07, 0.3, 'golpe'],
  [53.68, 1.1, 0.3, 'golpe'],
  [56.04, 1.13, 0.3, 'golpe'],
  [58.56, 1.04, 0.8, 'suave'],
  [60.08, 1.13, 0.2, 'golpe'],
  [61.0, 1.04, 0.8, 'suave'],
  [63.36, 1.18, 0.16, 'golpe'],
  [64.28, 1.04, 0.8, 'suave'],
  [65.5, 1.08, 2.8, 'suave'],
  [70.12, 1.2, 0.16, 'golpe'],
  [71.24, 1.05, 0.8, 'suave'],
  [72.4, 1.08, 5.0, 'suave'],
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
const IMPACTOS = [1.0, 4.24, 63.36, 70.12];
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
  {src: 'dental', a: 34.8, b: 35.88, desde: 2, foco: 0.5},
  {src: 'peluqueria', a: 35.88, b: 36.76, desde: 2, foco: 0.55},
  {src: 'empresa', a: 36.76, b: 40.18, desde: 0.5, foco: 0.55},
  {src: 'codigo', a: 46.32, b: 48.0, desde: 1, foco: 0.5},
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
            <Video src={staticFile(`e1/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie ----------------
// Ráfaga de rayos que salen del centro en un impacto
const Rafaga: React.FC<{t: number; en: number; x: number; y: number; color?: string; radio?: number}> = ({t, en, x, y, color = C.amarillo, radio = 260}) => {
  const p = iv(t, [en, en + 12 * F], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
  if (t < en || p >= 1) return null;
  return (
    <svg style={{position: 'absolute', left: x - radio * 1.6, top: y - radio * 1.6, overflow: 'visible'}} width={radio * 3.2} height={radio * 3.2}>
      {Array.from({length: 12}, (_, i) => {
        const ang = (i / 12) * Math.PI * 2 + 0.13;
        const r1 = radio * (0.55 + 0.75 * p);
        const r2 = radio * (0.75 + 0.85 * p);
        const c = radio * 1.6;
        return (
          <line
            key={i}
            x1={c + Math.cos(ang) * r1}
            y1={c + Math.sin(ang) * r1}
            x2={c + Math.cos(ang) * r2}
            y2={c + Math.sin(ang) * r2}
            stroke={color}
            strokeWidth={10 * (1 - p) + 1}
            strokeLinecap="round"
            opacity={1 - p * 0.9}
            style={{filter: `drop-shadow(0 0 10px ${color})`}}
          />
        );
      })}
    </svg>
  );
};

// Círculos que se dibujan y se marcan con ✕ o ✓ trazados
const Marcador: React.FC<{t: number; n: number; a: number; paso: number; color: string; tipo: 'x' | 'v'; top: number; desde: number; hasta: number}> = ({
  t, n, a, paso, color, tipo, top, desde, hasta,
}) => {
  const d = n > 5 ? 82 : 130;
  return (
    <Ventana suave t={t} a={desde} b={hasta}>
      <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', gap: 12, opacity: iv(t, [hasta - 5 * F, hasta], [1, 0])}}>
        {Array.from({length: n}, (_, i) => {
          const dib = iv(t, [desde + i * 0.04, desde + i * 0.04 + 8 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
          const en = a + i * paso;
          const m = iv(t, [en, en + 6 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          const tr = iv(t, [en + 2 * F, en + 8 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
          const per = Math.PI * (d - 8);
          return (
            <svg key={i} width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{overflow: 'visible', scale: t >= en ? 0.7 + 0.3 * m : 1}}>
              <circle
                cx={d / 2} cy={d / 2} r={d / 2 - 4} fill={t >= en ? color : 'rgba(0,0,0,0.25)'} fillOpacity={t >= en ? 0.9 : 1}
                stroke={t >= en ? color : 'rgba(255,255,255,0.7)'} strokeWidth={4} strokeDasharray={per} strokeDashoffset={per * (1 - dib)}
                style={{filter: t >= en ? `drop-shadow(0 0 14px ${color})` : 'none'}}
              />
              {t >= en &&
                (tipo === 'x' ? (
                  <path d={`M ${d * 0.32} ${d * 0.32} L ${d * 0.68} ${d * 0.68} M ${d * 0.68} ${d * 0.32} L ${d * 0.32} ${d * 0.68}`} stroke="#fff" strokeWidth={d * 0.09} strokeLinecap="round" fill="none" strokeDasharray={d} strokeDashoffset={d * (1 - tr)} />
                ) : (
                  <path d={`M ${d * 0.28} ${d * 0.52} L ${d * 0.44} ${d * 0.68} L ${d * 0.72} ${d * 0.34}`} stroke="#fff" strokeWidth={d * 0.09} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={d} strokeDashoffset={d * (1 - tr)} />
                ))}
            </svg>
          );
        })}
      </div>
    </Ventana>
  );
};

// Voz del asistente durante la llamada: sus subtítulos van en otro color (sin rótulos ni nombres)
const VOZ_IA: [number, number][] = [[5.12, 8.0], [10.85, 14.42], [15.76, 18.82]];
const enIA = (x: number) => VOZ_IA.some(([a, b]) => x >= a - 0.01 && x < b);
const IA_COLOR = '#5EE1FF';
const estiloIA: React.CSSProperties = {color: IA_COLOR, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('94,225,255', 0.9)}`};
// Tarjeta de llamada en curso: icono que late, cronómetro y onda de voz (color según quién habla)
const LLAMADA: [number, number] = [5.0, 18.84];
const Llamada: React.FC<{t: number}> = ({t}) => {
  const [a, b] = LLAMADA;
  const pop = iv(t, [a, a + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  const habla = WS.some((w) => t >= w[1] && t < w[2]);
  const ia = enIA(t);
  const seg = Math.max(0, Math.floor(t - a));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 140, right: 140, top: 200, height: 170, borderRadius: 40, background: 'rgba(18,18,22,0.78)', border: '2px solid rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', gap: 28, padding: '0 36px', scale: 0.8 + 0.2 * pop, opacity: pop, filter: SOMBRA}}>
        <div style={{width: 96, height: 96, borderRadius: '50%', background: '#2fd36b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 0 0 ${8 + 8 * Math.abs(Math.sin(t * 3))}px rgba(47,211,107,0.25)`}}>
          <svg width={54} height={54} viewBox="0 0 24 24"><path fill="#fff" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" /></svg>
        </div>
        <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 7, height: 100}}>
          {Array.from({length: 22}, (_, i) => {
            const amp = habla ? 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + i * 1.7) * Math.cos(t * 7.3 + i * 0.6)) : 0.08;
            return <div key={i} style={{flex: 1, height: `${amp * 100}%`, borderRadius: 6, background: ia ? IA_COLOR : '#fff', opacity: 0.9}} />;
          })}
        </div>
        <div style={{...H, fontSize: 44, textShadow: 'none', color: '#fff', fontVariantNumeric: 'tabular-nums'}}>{`0:${String(seg).padStart(2, '0')}`}</div>
      </div>
    </Ventana>
  );
};

// Ilustración: núcleo de IA con sus capacidades en órbita (preguntas, llamadas, citas); solo iconos, el texto va en subtítulo
const NODOS: [number, string][] = [
  [22.88, 'M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm4 5v2h2V9H8zm4 0v2h2V9h-2zm4 0v2h2V9h-2z'],
  [24.04, 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z'],
  [25.96, 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9zm5.2 7.6L7.7 14l1.4-1.4 1.1 1.1 3.9-3.9 1.4 1.4-5.3 5.4z'],
];
const ORBITA = {a: 22.56, b: 29.0, cx: 540, cy: 255, rx: 370, ry: 70, config: 27.2};
const Orbita: React.FC<{t: number}> = ({t}) => {
  const {a, b, cx, cy, rx, ry, config} = ORBITA;
  const nace = iv(t, [a, a + 10 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  const giro = (t - a) * 0.42;
  const engranaje = iv(t, [config, config + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  const sats = NODOS.map(([en, d], i) => {
    const ang = -Math.PI / 2 + giro + (i * 2 * Math.PI) / 3 + Math.PI / 3;
    const sale = iv(t, [en, en + 11 * F], [0, 1], MUELLE);
    const x = cx + Math.cos(ang) * rx * sale;
    const y = cy + Math.sin(ang) * ry * sale;
    const prof = (Math.sin(ang) + 1) / 2; // 0 detrás, 1 delante
    return {en, d, x, y, sale, prof, esc: (0.7 + 0.3 * prof) * Math.min(1, sale * 1.4)};
  });
  const ondas = Array.from({length: 7}, (_, k) => 10 + 22 * Math.abs(Math.sin(t * 7.5 + k * 0.9)) * (1 - engranaje));
  const satEl = (s: (typeof sats)[number], i: number) => {
    if (t < s.en) return null;
    const flash = iv(t, [s.en + 8 * F, s.en + 18 * F], [1, 0]);
    const pulso = t > config ? 0.5 + 0.5 * Math.sin((t - config) * 9 - i * 1.4) : 0;
    return (
      <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.esc})`} opacity={0.55 + 0.45 * s.prof}>
        {flash > 0 && <circle r={70 + (1 - flash) * 60} fill="none" stroke={C.amarillo} strokeWidth={5} opacity={flash} />}
        <rect x={-68} y={-68} width={136} height={136} rx={40} fill="rgba(18,18,22,0.82)" stroke={C.amarillo} strokeWidth={5 + 3 * pulso}
          style={{filter: `drop-shadow(0 0 ${10 + 14 * pulso}px rgba(${GLOW_AMARILLO},0.9))`}} />
        <g transform="translate(-36 -36) scale(3)"><path d={s.d} fill={C.amarillo} /></g>
      </g>
    );
  };
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: SOMBRA}} width={1080} height={700}>
        <ellipse cx={cx} cy={cy} rx={rx * nace} ry={ry * nace} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="3 16" strokeLinecap="round"
          strokeDashoffset={-(t - a) * 60} />
        {sats.map((s, i) => t >= s.en && (
          <line key={`l${i}`} x1={cx} y1={cy} x2={s.x} y2={s.y} stroke={C.amarillo} strokeWidth={4} opacity={0.5 * s.sale} strokeDasharray="10 12" strokeDashoffset={(t - s.en) * -90} />
        ))}
        {sats.map((s, i) => (s.prof < 0.5 ? satEl(s, i) : null))}
        <g transform={`translate(${cx} ${cy}) scale(${nace})`}>
          <circle r={118 + 10 * Math.sin(t * 4)} fill={`rgba(${GLOW_AMARILLO},0.12)`} />
          <circle r={92} fill="#141418" stroke={C.amarillo} strokeWidth={7} style={{filter: `drop-shadow(0 0 22px rgba(${GLOW_AMARILLO},1))`}} />
          <g transform={`rotate(${(t - a) * 140})`}><circle r={106} fill="none" stroke={C.amarillo} strokeWidth={4} strokeDasharray="60 40 10 40" opacity={0.8} /></g>
          <g opacity={1 - engranaje}>
            {ondas.map((h, k) => <rect key={k} x={-57 + k * 17} y={-h / 2} width={10} height={h} rx={5} fill={C.amarillo} />)}
          </g>
          <g opacity={engranaje} transform={`scale(${0.6 + 0.4 * engranaje}) rotate(${(t - config) * 120})`}>
            <path fill={C.amarillo} d="M-8-58h16l4 14a46 46 0 0 1 12 5l13-7 11 11-7 13a46 46 0 0 1 5 12l14 4v16l-14 4a46 46 0 0 1-5 12l7 13-11 11-13-7a46 46 0 0 1-12 5l-4 14h-16l-4-14a46 46 0 0 1-12-5l-13 7-11-11 7-13a46 46 0 0 1-5-12l-14-4v-16l14-4a46 46 0 0 1 5-12l-7-13 11-11 13 7a46 46 0 0 1 12-5zM0-22a22 22 0 1 0 0 44 22 22 0 1 0 0-44z" />
          </g>
        </g>
        {sats.map((s, i) => (s.prof >= 0.5 ? satEl(s, i) : null))}
      </svg>
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
  {a: 0.04, b: 1.7, top: 60, lineas: [{ws: [['quiero', 0.04], ['que', 0.36], ['escuches', 0.52]], size: 80}, {ws: [['esta llamada', 1.0, amarillo]], size: 140, golpe: true}]},
  // No es una persona
  {a: 3.76, b: 5.08, top: 1000, lineas: [{ws: [['no', 3.76], ['es', 4.08]], size: 90}, {ws: [['una persona', 4.24, rosaFuerte]], size: 140, golpe: true}]},
  // Asistente de IA
  {a: 20.24, b: 22.5, top: 1000, lineas: [{ws: [['un', 20.24], ['asistente', 20.44], ['de', 21.08]], size: 80}, {ws: [['inteligencia', 21.2]], size: 120, golpe: true}, {ws: [['artificial', 21.8, amarillo]], size: 120, golpe: true}]},
  // Clínica / peluquería / empresa (B-roll)
  {a: 34.8, b: 35.86, top: 1250, lineas: [{ws: [['piensa', 34.8], ['en', 35.08]], size: 90}, {ws: [['una clínica', 35.16, amarillo]], size: 130, golpe: true}]},
  {a: 35.88, b: 36.74, top: 260, lineas: [{ws: [['una peluquería', 35.88, amarillo]], size: 120, golpe: true}]},
  {a: 36.76, b: 40.16, top: 1150, lineas: [{ws: [['una', 36.76], ['empresa', 36.96], ['que', 37.36], ['recibe', 37.48]], size: 80}, {ws: [['constantemente', 37.84, amarillo]], size: 120, golpe: true}, {ws: [['llamadas', 38.92], ['de', 39.4], ['clientes', 39.56]], size: 80}]},
  // No necesitas ser programador (B-roll)
  {a: 46.32, b: 47.98, top: 260, lineas: [{ws: [['y', 46.32], ['no', 46.44], ['necesitas', 46.56], ['ser', 47.16]], size: 80}, {ws: [['programador', 47.4, rosaFuerte]], size: 130, golpe: true}]},
  // Curso introductorio
  {a: 59.64, b: 61.05, top: 1000, lineas: [{ws: [['un', 59.64], ['curso', 59.8]], size: 90}, {ws: [['introductorio', 60.08, amarillo]], size: 130, golpe: true}]},
  // 14 clases
  {a: 63.04, b: 64.25, top: 980, lineas: [{ws: [['son', 63.04]], size: 80}, {ws: [['14', 63.36, amarillo]], size: 280, golpe: true}, {ws: [['clases', 63.88]], size: 100}]},
  // 1 €
  {a: 68.48, b: 71.2, top: 960, lineas: [{ws: [['y', 68.48], ['puedes', 68.48], ['acceder', 68.76]], size: 80}, {ws: [['por', 69.2], ['tan', 69.44], ['solo', 69.64]], size: 80}, {ws: [['1 €', 70.12, amarillo]], size: 300, golpe: true}]},
];
// La lista "conocer las herramientas / aprender a identificar oportunidades / comprender cómo se venden estos servicios" también cuenta como texto grande
const LISTA: [number, number] = [51.68, 58.5];
const CTA = 71.24;
const CTA_FIN = 72.4; // tras "pulsa el botón" sigue en subtítulos
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
const CLAVE = new Set(['llamada', 'teléfono', 'tecnología', 'negocios', 'servicios', 'soluciones', 'modelo', 'contenido', 'dentro']);

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
const DETRAS: [number, number][] = [[0, 1.98]];

export const ReelE1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E1)} layout="none">
            <Video src={staticFile('e1/e1.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e1/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Llamada t={t} />
      <Orbita t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={4.24} x={540} y={1130} color={C.rosa} />
      <Impacto estilo={ESTILO.impacto} t={t} en={63.36} x={540} y={1180} radio={220} />
      <Impacto estilo={ESTILO.impacto} t={t} en={70.12} x={540} y={1250} radio={240} />

      {/* Lista: qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 860, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
            {([['conocer las\nherramientas', 51.68, 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z'],
              ['aprender a identificar\noportunidades', 53.16, 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z'],
              ['comprender cómo se\nvenden estos servicios', 55.28, 'M12.2 5.6l-4.7 4.6a1.4 1.4 0 0 0 2 2l2.8-2.7 6.4 6.3 1.6-1.6a2 2 0 0 0 0-2.8l-4.6-4.6a3 3 0 0 0-3.5-.2zM2 9.4l3.6-3.6a2 2 0 0 1 2.8 0l.7.7-3 3a3.4 3.4 0 0 0 4.8 4.8l2.4-2.4 5.3 5.3-.9.9a2 2 0 0 1-2.8 0l-.4-.4-.4.4a2 2 0 0 1-2.8 0L2 12.2a2 2 0 0 1 0-2.8z']] as [string, number, string][]).map(([txt, en, ico]) => {
              const tr = iv(t, [en, en + 9 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
              const ic = iv(t, [en + 5 * F, en + 13 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
              return (
                <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 26, ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>
                  <svg width={92} height={92} viewBox="-46 -46 92 92" style={{overflow: 'visible', flexShrink: 0}}>
                    <polygon points="0,-42 36.4,-21 36.4,21 0,42 -36.4,21 -36.4,-21" fill={`rgba(${GLOW_AMARILLO},${0.18 * tr})`} stroke={C.amarillo} strokeWidth={6} strokeLinejoin="round"
                      strokeDasharray={252} strokeDashoffset={252 * (1 - tr)} transform={`rotate(${(1 - tr) * -60})`} style={{filter: `drop-shadow(0 0 ${12 * tr}px rgba(${GLOW_AMARILLO},0.9))`}} />
                    <g transform={`scale(${ic * 1.75}) translate(-12 -12)`}><path d={ico} fill={C.amarillo} /></g>
                  </svg>
                  <span style={{...H, fontSize: 56, lineHeight: 1.0, whiteSpace: 'pre'}}>{txt}</span>
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
          <Sube t={t} en={71.24}>pulsa</Sube>
          <Sube t={t} en={71.72}>el</Sube>
          <Sube t={t} en={71.84} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 71.95 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 71.95)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="swoosh3" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 71.24, 71.72, 71.84].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.0, -3], ['thud', 4.24, -3], ['popup', 5.0, -5], ['pop', 21.2, -3], ['pop', 21.8, -3],
        ['reveal', 22.56, -8], ['bloop', 22.88, -5], ['bloop', 24.04, -5], ['bloop', 25.96, -5], ['interruptor', 27.2, -6], ['hit', 29.2, -3], ['pop', 35.16, -3], ['pop', 35.88, -3], ['pop', 37.84, -3], ['thud', 47.4, -3],
        ['click', 51.68], ['click', 53.16], ['click', 55.28], ['pop', 60.08, -3], ['boom', 63.36, -3], ['riser', 70.12, -3], ['boom', 70.12, -2], ['twinkle', 70.4, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
