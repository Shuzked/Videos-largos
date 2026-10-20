import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, Impacto, flechaV, Estilo} from '../variantes';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'pop', golpe: 'sello', impacto: 'onda', sub: 'pop', flecha: 'pulso'};

export const DURACION_A2 = 65.0;
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
  [0.6, 1.13, 0.16, 'golpe'],
  [1.56, 1.04, 0.8, 'suave'],
  [3.56, 1.08, 0.3, 'golpe'],
  [4.0, 1.04, 2.5, 'suave'],
  [7.52, 1.14, 0.16, 'golpe'],
  [8.0, 1.03, 0.8, 'suave'],
  [11.32, 1.16, 0.16, 'golpe'],
  [12.24, 1.03, 0.8, 'suave'],
  [13.0, 1.08, 4.6, 'suave'],
  [20.24, 1.0, 0, 'corte'],
  [20.3, 1.06, 1.8, 'suave'],
  [25.36, 1.0, 0, 'corte'],
  [25.5, 1.05, 2.4, 'suave'],
  [28.84, 1.13, 0.16, 'golpe'],
  [37.96, 1.02, 0, 'corte'],
  [38.6, 1.15, 0.16, 'golpe'],
  [39.32, 1.04, 0.8, 'suave'],
  [40.2, 1.08, 3.6, 'suave'],
  [44.0, 1.03, 1.0, 'suave'],
  [47.44, 1.0, 0, 'corte'],
  [47.5, 1.05, 0.4, 'suave'],
  [48.04, 1.08, 0.3, 'golpe'],
  [49.12, 1.11, 0.3, 'golpe'],
  [50.48, 1.14, 0.3, 'golpe'],
  [51.88, 1.04, 0.7, 'suave'],
  [54.08, 1.13, 0.16, 'golpe'],
  [55.04, 1.03, 0.8, 'suave'],
  [56.0, 1.08, 4.0, 'suave'],
  [60.76, 1.03, 0.8, 'suave'],
  [63.48, 1.1, 0.5, 'suave'],
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
const IMPACTOS = [0.6, 7.52, 11.32, 38.6];
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
type B = {src: string; a: number; b: number; etiqueta?: React.ReactNode; desde?: number; foco: number};
const BROLL: B[] = [
  {src: 'duro', a: 9.24, b: 11.32, desde: 2, foco: 0.5},
  {src: 'jornada', a: 17.8, b: 19.08, desde: 3, foco: 0.5},
  {src: 'cansado', a: 19.08, b: 20.24, desde: 5, foco: 0.5},
  {src: 'calendario', a: 22.2, b: 25.36, desde: 1, foco: 0.5},
  {src: 'clinica', a: 29.52, b: 31.16, desde: 2, foco: 0.5},
  {src: 'restaurante', a: 31.16, b: 32.52, desde: 0.5, foco: 0.5},
  {src: 'mensajes', a: 32.52, b: 34.28, desde: 2, foco: 0.17},
  {src: 'papeles', a: 34.28, b: 37.96, desde: 1, foco: 0.5},
  {src: 'ia', a: 45.36, b: 47.44, desde: 2, foco: 0.5},
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
  const left = Math.min(0, Math.max(1080 - ANCHO_BROLL, 540 - focoEn(b, t) * ANCHO_BROLL));
  return (
    <Ventana t={t} a={b.a} b={b.b}>
      <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 45%', scale: iv(t, [b.a, b.b], [1.0, 1.07])}}>
          <Sequence from={fr(b.a)} durationInFrames={fr(b.b - b.a)} layout="none">
            <Video src={staticFile(`a2/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ANCHO_BROLL, height: 1920}} />
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

// Clínica que pierde llamadas: contador circular rojo que se va llenando con las llamadas perdidas
const LlamadasPerdidas: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  const p = iv(t, [a + 0.15, b - 0.35], [0, 1], Easing.bezier(0.33, 0, 0.2, 1));
  const n = Math.round(p * 12);
  const R = 120;
  const per = 2 * Math.PI * R;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 540 - 170, top: 210, overflow: 'visible', filter: SOMBRA}} width={340} height={340}>
        <circle cx={170} cy={170} r={R + 34} fill="rgba(12,12,16,0.72)" />
        <circle cx={170} cy={170} r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={22} />
        <circle cx={170} cy={170} r={R} fill="none" stroke="#ff3b4e" strokeWidth={22} strokeLinecap="round" strokeDasharray={per} strokeDashoffset={per * (1 - p)}
          transform="rotate(-90 170 170)" style={{filter: 'drop-shadow(0 0 14px rgba(255,59,78,0.8))'}} />
        <g transform="translate(170 128) scale(1.6) translate(-12 -12)">
          <path fill="#ff3b4e" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" />
          <path d="M15 3l6 6M21 3l-6 6" stroke="#ff3b4e" strokeWidth={2.2} strokeLinecap="round" />
        </g>
        <text x={170} y={232} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={84} fill="#fff"
          style={{scale: `${1 + 0.12 * Math.max(0, 1 - ((t - a) * 25 % 3) / 3) * (n > 0 ? 1 : 0)}`, transformOrigin: '170px 205px'}}>{n}</text>
      </svg>
    </Ventana>
  );
};

// Restaurante que tarda horas en responder: ventana de chat tipo móvil (lado del cliente) con mensajes que suben,
// doble check gris (sin leer) y un reloj que cuenta el tiempo sin respuesta
const ChatSinResponder: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  const llegadas = [a + 0.15, a + 0.55, a + 0.95];
  const anchos = [0.78, 0.62, 0.7];
  const minutos = Math.round(iv(t, [a + 0.3, b - 0.25], [12, 167], Easing.bezier(0.33, 0, 0.2, 1)));
  const reloj = minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 140, right: 140, top: 190, borderRadius: 44, background: 'rgba(248,248,250,0.96)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', overflow: 'hidden'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '24px 30px', background: '#fff', borderBottom: '2px solid #ececf0'}}>
          <div style={{position: 'relative', width: 78, height: 78, borderRadius: '50%', background: '#f4a261', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <svg width={44} height={44} viewBox="0 0 24 24"><path fill="#fff" d="M8.1 13.3l2.8-2.8L4 3.6a4 4 0 0 0 0 5.6l4.1 4.1zm6.8-1.8c1.5.7 3.7.2 5.3-1.4 1.9-1.9 2.3-4.7.8-6.2-1.5-1.5-4.3-1.1-6.2.8-1.6 1.6-2.1 3.8-1.4 5.3L3.7 19.8l1.4 1.4 6.9-6.9 6.9 6.9 1.4-1.4-6.9-6.9 1.5-1.4z" /></svg>
            <div style={{position: 'absolute', right: 0, top: 2, width: 22, height: 22, borderRadius: '50%', background: '#ff3b30', border: '3px solid #fff'}} />
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 12, flex: 1}}>
            <div style={{height: 22, width: 230, borderRadius: 11, background: '#2b2d31'}} />
            <div style={{height: 16, width: 150, borderRadius: 8, background: '#b9bcc4'}} />
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16, padding: '26px 30px 22px', minHeight: 300}}>
          {llegadas.map((en, k) => {
            const p = iv(t, [en, en + 9 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            return (
              <div key={k} style={{width: `${anchos[k] * 100}%`, opacity: t < en ? 0 : Math.min(1, p * 2), scale: 0.6 + 0.4 * p, translate: `0px ${(1 - p) * 40}px`, transformOrigin: '100% 100%',
                background: '#3478f6', borderRadius: '30px 30px 8px 30px', padding: '20px 24px', display: 'flex', alignItems: 'flex-end', gap: 14}}>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 10}}>
                  <div style={{height: 16, width: '92%', borderRadius: 8, background: 'rgba(255,255,255,0.85)'}} />
                  {k !== 1 && <div style={{height: 16, width: '55%', borderRadius: 8, background: 'rgba(255,255,255,0.6)'}} />}
                </div>
                <svg width={34} height={20} viewBox="0 0 34 20"><path d="M2 11l5 5L18 4M14 14l2 2L28 4" stroke="rgba(255,255,255,0.6)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            );
          })}
        </div>
        <div style={{display: 'flex', justifyContent: 'center', paddingBottom: 26}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px', borderRadius: 999, background: '#ffe9e8', color: '#d62d20', ...H, fontSize: 40, textShadow: 'none',
            opacity: iv(t, [a + 0.25, a + 0.45], [0, 1])}}>
            <svg width={38} height={38} viewBox="0 0 24 24"><circle cx={12} cy={12} r={9.5} fill="none" stroke="#d62d20" strokeWidth={2.4} />
              <line x1={12} y1={12} x2={12 + 6 * Math.sin((t - a) * 8)} y2={12 - 6 * Math.cos((t - a) * 8)} stroke="#d62d20" strokeWidth={2.4} strokeLinecap="round" />
              <line x1={12} y1={12} x2={12 + 4 * Math.sin((t - a) * 0.7)} y2={12 - 4 * Math.cos((t - a) * 0.7)} stroke="#d62d20" strokeWidth={2.4} strokeLinecap="round" /></svg>
            <span style={{fontVariantNumeric: 'tabular-nums'}}>{reloj}</span>
          </div>
        </div>
      </div>
    </Ventana>
  );
};

// "Entender el modelo / adquirir habilidades / aprender a vender": camino de 3 pasos que se va completando
const PASOS = [56.2, 57.36, 59.48];
const Pasos: React.FC<{t: number}> = ({t}) => {
  const x0 = 270;
  const x1 = 810;
  return (
    <Ventana suave t={t} a={55.04} b={60.76}>
      <svg style={{position: 'absolute', left: 0, top: 260, overflow: 'visible', filter: SOMBRA}} width={1080} height={120}>
        <line x1={x0} y1={60} x2={x1} y2={60} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeLinecap="round" />
        {PASOS.map((en, i) => {
          const x = x0 + ((x1 - x0) * i) / 2;
          const lin = i < 2 ? iv(t, [PASOS[i + 1] - 6 * F, PASOS[i + 1]], [0, 1], Easing.bezier(0.65, 0, 0.35, 1)) : 0;
          const on = t >= en;
          const pop = iv(t, [en, en + 6 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          return (
            <g key={i}>
              {i < 2 && <line x1={x} y1={60} x2={x + ((x1 - x0) / 2) * lin} y2={60} stroke={C.amarillo} strokeWidth={6} strokeLinecap="round" />}
              <circle cx={x} cy={60} r={on ? 40 + 6 * pop : 34} fill={on ? C.amarillo : 'rgba(0,0,0,0.45)'} stroke={on ? C.amarillo : 'rgba(255,255,255,0.7)'} strokeWidth={5}
                style={{filter: on ? `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},1))` : 'none'}} />
              <text x={x} y={77} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={46} fill={on ? '#111' : '#fff'}>{i + 1}</text>
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
  {a: 0.04, b: 1.5, top: 80, lineas: [{ws: [['trabajar', 0.04]], size: 80}, {ws: [['diez horas', 0.6, amarillo]], size: 160, golpe: true}, {ws: [['al', 1.16], ['día', 1.32]], size: 90, abajo: true}]},
  {a: 6.84, b: 7.95, top: 130, lineas: [{ws: [['no', 6.84], ['va', 7.2], ['a', 7.4]], size: 80}, {ws: [['cambiar', 7.52, rosaFuerte]], size: 180, golpe: true}]},
  // Trabajar duro (B-roll)
  {a: 9.24, b: 11.25, top: 260, lineas: [{ws: [['trabajar', 9.24]], size: 90}, {ws: [['duro', 9.76]], size: 180, golpe: true}, {ws: [['es', 10.24], ['importante', 10.44, amarillo]], size: 90}]},
  {a: 11.32, b: 12.15, top: 1050, lineas: [{ws: [['muchísimo', 11.32, amarillo]], size: 170, golpe: true}]},
  // Cansado (B-roll)
  {a: 19.08, b: 20.2, top: 260, lineas: [{ws: [['estás', 19.08]], size: 90}, {ws: [['cansado', 19.36]], size: 160, golpe: true}]},
  // Un día, otro día, otra semana (B-roll calendario)
  {a: 22.2, b: 25.3, top: 260, lineas: [{ws: [['y', 22.2], ['así', 22.4], ['un', 22.68], ['día', 22.84]], size: 90}, {ws: [['otro', 23.4], ['día', 23.84]], size: 110}, {ws: [['otra semana', 24.36, amarillo]], size: 130, golpe: true}]},
  // Problemas muy concretos
  {a: 27.92, b: 29.45, top: 1000, lineas: [{ws: [['con', 27.92], ['problemas', 28.08], ['muy', 28.56]], size: 80}, {ws: [['concretos', 28.84, amarillo]], size: 150, golpe: true}]},
  // Tareas manuales (B-roll) → automatizar
  {a: 36.08, b: 37.9, top: 260, lineas: [{ws: [['haciendo', 36.08]], size: 90}, {ws: [['manualmente', 36.56]], size: 130, golpe: true}, {ws: [['tareas', 37.36]], size: 90}]},
  {a: 37.96, b: 39.28, top: 1000, lineas: [{ws: [['que', 37.96], ['se', 38.12], ['podrían', 38.24]], size: 80}, {ws: [['automatizar', 38.6, amarillo]], size: 150, golpe: true}]},
  // Inteligencia artificial (B-roll)
  {a: 45.96, b: 47.4, top: 260, lineas: [{ws: [['inteligencia', 45.96]], size: 120, golpe: true}, {ws: [['artificial', 46.56, amarillo]], size: 120, golpe: true}]},
  // Ninguna locura
  {a: 53.72, b: 54.98, top: 1000, lineas: [{ws: [['ni', 53.72], ['hacer', 53.84]], size: 80}, {ws: [['ninguna', 54.08]], size: 140, golpe: true}, {ws: [['locura', 54.48, rosaFuerte]], size: 140, golpe: true}]},
];
// La lista "aprender a detectar un problema / ofrecer una solución / prestar un servicio" también cuenta como texto grande
const LISTA: [number, number] = [47.44, 51.85];
const CTA = 63.48;
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
const CLAVE = new Set(['problema', 'futuro', 'llamadas', 'mensajes', 'servicios', 'modelo', 'habilidades', 'vender', 'profesional']);

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
const DETRAS: [number, number][] = [[0, 1.8], [6.7, 8.25]];

export const ReelA2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 2);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A2)} layout="none">
            <Video src={staticFile('a2/a2.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a2/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <LlamadasPerdidas t={t} a={29.52} b={31.16} />
      <ChatSinResponder t={t} a={31.9} b={34.28} />
      <Pasos t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(2).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={11.32} x={540} y={1120} />
      <Impacto estilo={ESTILO.impacto} t={t} en={38.6} x={540} y={1180} />
      <Impacto estilo={ESTILO.impacto} t={t} en={54.08} x={540} y={1150} color={C.rosa} />

      {/* Lista: aprender a detectar un problema / ofrecer una solución / prestar un servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 880, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', gap: '0.24em', ...H, fontSize: 66, marginBottom: 6}}>
            <Entra estilo={ESTILO.texto} t={t} en={47.44} sale={LISTA[1]}>aprender</Entra>
            <Entra estilo={ESTILO.texto} t={t} en={48.0} sale={LISTA[1]}>a</Entra>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
            {([['detectar un problema', 48.04], ['ofrecer una solución', 49.12], ['prestar un servicio', 50.48]] as [string, number][]).map(([txt, en]) => (
              <div key={txt} style={{...H, fontSize: 62, lineHeight: 1.05, whiteSpace: 'nowrap', ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>{txt}</div>
            ))}
            <div style={{position: 'relative', width: 700, height: 26, marginTop: 22, borderRadius: 13, background: 'rgba(255,255,255,0.18)', overflow: 'hidden'}}>
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 13, background: C.amarillo, boxShadow: `0 0 18px rgba(${GLOW_AMARILLO},0.9)`,
                width: `${100 * Math.max(...[48.04, 49.12, 50.48].map((en, i) => iv(t, [en, en + 9 * F], [i / 3, (i + 1) / 3], Easing.bezier(0.16, 1, 0.3, 1)) * (t >= en ? 1 : 0)))}%`}} />
              {[1, 2].map((k) => <div key={k} style={{position: 'absolute', left: `${(100 * k) / 3}%`, top: 0, bottom: 0, width: 4, background: 'rgba(0,0,0,0.35)'}} />)}
            </div>
          </div>
        </div>
      </Ventana>

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={DURACION_A2}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={63.48}>haz</Sube>
          <Sube t={t} en={63.8}>clic</Sube>
          <Sube t={t} en={64.16} style={amarillo}>aquí</Sube>
          <Sube t={t} en={64.44} style={amarillo}>debajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 64.6 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 64.6)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="swoosh2" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 63.48, 63.8, 64.16, 64.44].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 0.6, -3], ['pop', 0.84, -4], ['thud', 7.52, -3], ['pop', 9.76, -3], ['boom', 11.32, -4], ['pop', 19.36, -3],
        ['click', 22.84, -4], ['click', 23.84, -4], ['pop', 24.36, -3], ['pop', 28.84, -3], ['negativo', 29.8, -7], ['negativo', 30.3, -7], ['negativo', 30.8, -7],
        ['mensaje', 32.05, -7], ['mensaje', 32.45, -7], ['mensaje', 32.85, -7], ['pop', 36.56, -3], ['riser', 38.6, -3], ['hit', 38.6], ['riserm', 39.32, -4],
        ['pop', 45.96, -3], ['pop', 46.56, -3], ['click', 48.04], ['click', 49.12], ['click', 50.48], ['twinkle', 51.28, -6],
        ['thud', 54.08, -3], ['pop', 54.48, -4], ['ding', 56.2, -6], ['ding', 57.36, -6], ['ding', 59.48, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
