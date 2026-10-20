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

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// "Están en tu barrio": plano de calles que se dibuja y chinchetas que caen (peluquería, clínica, restaurante)
const PINES: [number, number, number, string][] = [
  [28.36, 300, 150, C.rosa], [28.9, 560, 250, '#5EE1FF'], [29.2, 420, 330, C.amarillo], [29.72, 690, 140, '#9be564'], [30.2, 230, 300, '#ffffff'],
];
const Barrio: React.FC<{t: number}> = ({t}) => {
  const a = 28.36;
  const dib = iv(t, [a - 0.2, a + 0.6], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
  const pop = iv(t, [a - 0.2, a + 0.2], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  return (
    <Ventana suave t={t} a={a - 0.2} b={35.4}>
      <div style={{position: 'absolute', left: 120, top: 190, width: 840, height: 440, borderRadius: 44, overflow: 'hidden', background: 'rgba(20,22,28,0.82)',
        border: '2px solid rgba(255,255,255,0.2)', scale: 0.85 + 0.15 * pop, opacity: pop, filter: SOMBRA}}>
        <svg width={840} height={440}>
          {[[0, 120, 840, 160], [0, 330, 840, 300], [180, 0, 260, 440], [520, 0, 470, 440], [700, 0, 760, 440]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * dib} y2={y1 + (y2 - y1) * dib} stroke="rgba(255,255,255,0.28)" strokeWidth={i % 2 ? 22 : 30} strokeLinecap="round" />
          ))}
          <circle cx={420} cy={225} r={18 + 6 * Math.abs(Math.sin(t * 3))} fill="rgba(94,225,255,0.35)" />
          <circle cx={420} cy={225} r={11} fill="#5EE1FF" stroke="#fff" strokeWidth={4} opacity={dib} />
          {PINES.map(([en, x, y, col], i) => {
            const c = iv(t, [en, en + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
            if (t < en) return null;
            return (
              <g key={i} transform={`translate(${x} ${y - (1 - c) * 120}) scale(${0.6 + 0.4 * c})`} opacity={Math.min(1, c * 2)}>
                <ellipse cx={0} cy={4} rx={16 * c} ry={6 * c} fill="rgba(0,0,0,0.35)" />
                <path d="M0 0 C -26 -34 -30 -48 -30 -60 A 30 30 0 1 1 30 -60 C 30 -48 26 -34 0 0 Z" fill={col} stroke="#111" strokeWidth={3} />
                <circle cx={0} cy={-60} r={11} fill="#111" />
              </g>
            );
          })}
        </svg>
      </div>
    </Ventana>
  );
};

// Ilustración: tareas pendientes de la peluquería que se apilan (citas, llamadas, preguntas); solo iconos, el texto va en subtítulo
const NODOS: [number, string][] = [
  [11.32, 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9zm5.2 7.6L7.7 14l1.4-1.4 1.1 1.1 3.9-3.9 1.4 1.4-5.3 5.4z'],
  [11.68, 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z'],
  [12.8, 'M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm4 5v2h2V9H8zm4 0v2h2V9h-2zm4 0v2h2V9h-2z'],
];
const PILA = {a: 10.32, b: 14.84, top: 170};
const Pila: React.FC<{t: number}> = ({t}) => {
  const {a, b, top} = PILA;
  const llegadas = NODOS.filter(([en]) => t >= en).length;
  const ultimo = llegadas ? NODOS[llegadas - 1][0] : a;
  const temblor = llegadas ? Math.sin((t - ultimo) * 38) * 3.5 * Math.exp(-(t - ultimo) * 5) : 0;
  const badge = iv(t, [ultimo, ultimo + 7 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 0, right: 0, top, height: 420, filter: SOMBRA, rotate: `${temblor * 0.3}deg`}}>
        {NODOS.map(([en, d], i) => {
          if (t < en) return null;
          const cae = iv(t, [en, en + 10 * F], [0, 1], Easing.bezier(0.22, 1.25, 0.36, 1));
          const encima = llegadas - 1 - i; // 0 = la última que ha caído
          const hund = iv(t, [NODOS[Math.min(i + encima, 2)][0], NODOS[Math.min(i + encima, 2)][0] + 8 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
          const prof = encima > 0 ? encima - 1 + hund : 0;
          const giro = [-4, 3, -2][i];
          return (
            <div key={i} style={{position: 'absolute', left: 230, width: 620, top: 150 - prof * 52, height: 150, borderRadius: 34,
              background: `rgba(${255 - prof * 22},${255 - prof * 22},${255 - prof * 20},0.97)`, boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
              translate: `0px ${(1 - cae) * -420}px`, rotate: `${giro * (1 - cae) * 4 + giro * 0.5}deg`, scale: `${1 - prof * 0.07}`, opacity: Math.min(1, cae * 3),
              display: 'flex', alignItems: 'center', gap: 28, padding: '0 34px', zIndex: 10 + i, overflow: 'hidden'}}>
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: C.amarillo}} />
              <div style={{width: 92, height: 92, borderRadius: 26, background: '#1b1b20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 10}}>
                <svg width={54} height={54} viewBox="0 0 24 24"><path d={d} fill={C.amarillo} /></svg>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 16, flex: 1}}>
                <div style={{height: 22, width: '78%', borderRadius: 11, background: '#2b2d31'}} />
                <div style={{height: 16, width: '52%', borderRadius: 8, background: '#b9bcc4'}} />
              </div>
              <div style={{width: 26, height: 26, borderRadius: '50%', background: '#ff3b30', boxShadow: '0 0 0 6px rgba(255,59,48,0.2)', flexShrink: 0}} />
            </div>
          );
        })}
        {llegadas > 0 && (
          <div style={{position: 'absolute', left: 806, top: 128 - 52 * Math.max(0, llegadas - 1) * 0 , width: 74, height: 74, borderRadius: '50%', background: '#ff3b30', border: '6px solid #fff', zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...H, fontSize: 40, textShadow: 'none', color: '#fff', scale: `${0.4 + 0.6 * badge}`}}>{llegadas}</div>
        )}
      </div>
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
      <Barrio t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.filter((_, i) => i !== 1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Impacto estilo={ESTILO.impacto} t={t} en={2.12} x={540} y={1250} />
      <Impacto estilo={ESTILO.impacto} t={t} en={64.48} x={540} y={1180} radio={220} />
      <Impacto estilo={ESTILO.impacto} t={t} en={66.72} x={540} y={1250} radio={240} />

      {/* Lista: qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 860, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
            {([['detectar\nlos problemas', 47.16], ['hablar con\nlos responsables', 50.6], ['presentar una\npropuesta útil', 52.16]] as [string, number][]).map(([txt, en], i) => {
              const tr = iv(t, [en, en + 7 * F], [0, 1], Easing.bezier(0.65, 0, 0.35, 1));
              return (
                <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 24, ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>
                  <svg width={84} height={84} viewBox="0 0 84 84" style={{overflow: 'visible', flexShrink: 0}}>
                    <circle cx={42} cy={42} r={37} fill={tr >= 1 ? C.amarillo : 'none'} stroke={C.amarillo} strokeWidth={6} strokeDasharray={233} strokeDashoffset={233 * (1 - tr)} />
                    <text x={42} y={58} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={44} fill={tr >= 1 ? '#111' : C.amarillo}>{i + 1}</text>
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
        <Son key={`w${c}`} s="swoosh2" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 67.32, 67.64, 67.76].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 2.12, -3], ['thud', 7.84, -3], ['pop', 9.68, -3], ['notif', 11.32, -6], ['notif', 11.68, -6], ['notif', 12.8, -6], ['alerta', 13.4, -9],
        ['pop', 16.16, -3], ['pop', 19.28, -3], ['popup', 28.36, -6], ['popup', 28.9, -6], ['popup', 29.2, -6], ['popup', 29.72, -6], ['popup', 30.2, -6], ['boom', 29.04, -4],
        ['thud', 41.68, -3], ['pop', 45.04, -3], ['click', 47.16], ['click', 50.6], ['click', 52.16], ['hit', 55.48, -3], ['pop', 63.72, -3], ['boom', 64.48, -3],
        ['riser', 66.72, -3], ['boom', 66.72, -2], ['twinkle', 66.95, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
