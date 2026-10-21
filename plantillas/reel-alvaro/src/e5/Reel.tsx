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

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {Check, Chip, Conector, Cruz, Destello, ICONOS, IconoTrazado, Interrogante, Lienzo, Particulas, Pulso, ROJO, VERDE, OSCURO, aparece, flota, muelle} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'estela', golpe: 'neon', impacto: 'estrella', sub: 'estela', flecha: 'elastica'};

export const DURACION_E5 = 67.12;
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
  [0.5, 1.05, 1.6, 'suave'],
  [2.76, 1.12, 0.2, 'golpe'],
  [3.4, 1.04, 0.6, 'suave'],
  [4.4, 1.16, 0.16, 'golpe'],
  [5.3, 1.04, 0.8, 'suave'],
  [6.0, 1.08, 2.5, 'suave'],
  [9.04, 1.04, 1.0, 'suave'],
  [10.44, 1.07, 1.5, 'suave'],
  [12.4, 1.15, 0.16, 'golpe'],
  [13.1, 1.04, 0.8, 'suave'],
  [14.4, 1.08, 1.8, 'suave'],
  [16.2, 1.0, 0, 'corte'],
  [24.46, 1.0, 0, 'corte'],
  [24.48, 1.05, 0.6, 'suave'],
  [25.32, 1.16, 0.16, 'golpe'],
  [26.3, 1.04, 0.8, 'suave'],
  [27.0, 1.07, 3.0, 'suave'],
  [30.44, 1.04, 0.8, 'suave'],
  [31.5, 1.08, 3.5, 'suave'],
  [35.5, 1.04, 1.0, 'suave'],
  [36.5, 1.08, 3.4, 'suave'],
  [40.64, 1.05, 0.5, 'suave'],
  [41.24, 1.13, 0.2, 'golpe'],
  [42.0, 1.04, 0.8, 'suave'],
  [43.8, 1.11, 0.25, 'golpe'],
  [44.6, 1.04, 0.8, 'suave'],
  [46.88, 1.12, 0.2, 'golpe'],
  [47.7, 1.04, 0.8, 'suave'],
  [48.5, 1.07, 2.5, 'suave'],
  [51.28, 1.04, 0.8, 'suave'],
  [52.8, 1.16, 0.16, 'golpe'],
  [53.5, 1.04, 0.8, 'suave'],
  [55.48, 1.12, 0.2, 'golpe'],
  [56.6, 1.04, 0.8, 'suave'],
  [57.5, 1.07, 3.0, 'suave'],
  [61.0, 1.05, 1.5, 'suave'],
  [63.72, 1.09, 0.4, 'suave'],
  [64.7, 1.04, 0.6, 'suave'],
  [65.88, 1.2, 0.16, 'golpe'],
  [66.5, 1.08, 0.6, 'suave'],
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
const IMPACTOS = [2.76, 4.4, 12.4, 25.32, 52.8, 65.88];
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
  {src: 'empresas', a: 16.2, b: 19.72, desde: 1, foco: 0.5},
  {src: 'voz', a: 19.72, b: 21.52, desde: 1, foco: 0.5},
  {src: 'whatsapp', a: 21.52, b: 22.72, desde: 2, foco: 0.5},
  {src: 'chatbots', a: 22.72, b: 23.4, desde: 2, foco: 0.5},
  {src: 'automatizaciones', a: 23.4, b: 24.46, desde: 2, foco: 0.5},
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
            <Video src={staticFile(`e5/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
// Sin ráfagas ni trazos sobre los títulos: todos los gráficos van en la franja de encima de la cabeza (o abajo en el montaje)
const lim = (x: number) => Math.min(1, Math.max(0, x));
const ICONO = {
  ...ICONO10,
  lupa: ICONOS.lupa,
  codigo: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
  // Material Icons: mic, smart_toy, pie_chart
  mic: 'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
  robot: 'M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z',
  quesito: 'M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z',
};
// Insignia redonda que sale con muelle (✓, ✕ o un icono) pegada a otra ficha
const Insignia: React.FC<{t: number; en: number; x: number; y: number; r?: number; fondo: string; children: React.ReactNode}> = ({t, en, x, y, r = 30, fondo, children}) => {
  if (t < en) return null;
  const e = aparece(t, en, 18);
  return (
    <g transform={`translate(${x} ${y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={r} color={fondo} />
      <g transform={`scale(${e.sx} ${e.sy}) rotate(${e.rot})`}>
        <circle r={r} fill={fondo} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 10px ${fondo})`}} />
        {children}
      </g>
    </g>
  );
};
// Tarjeta de curso (vídeo con barras de texto, sin textos inventados)
const TarjetaCurso: React.FC<{t: number; en: number; x: number; y: number; w?: number; h?: number; luz?: number[]}> = ({t, en, x, y, w = 300, h = 176, luz = []}) => {
  if (t < en) return null;
  const e = aparece(t, en, 6);
  const fl = flota(t, 0.8, 4);
  const anchos = [150, 120, 92];
  return (
    <g transform={`translate(${x} ${y + fl.y}) scale(${e.sx} ${e.sy}) rotate(${e.rot})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={24} fill={OSCURO} stroke="#fff" strokeWidth={5} />
      <circle cx={-w / 2 + 64} cy={0} r={36} fill={C.amarillo} />
      <IconoTrazado d={ICONO.play} t={t} en={en + 2 * F} color="#1b1b20" size={44} x={-w / 2 + 42} y={-22} />
      {anchos.map((a, i) => (
        <rect key={i} x={-w / 2 + 116} y={-38 + i * 30} width={a * (w / 300)} height={13} rx={6.5} fill={(luz[i] ?? 0) > 0.5 ? C.amarillo : 'rgba(255,255,255,0.35)'} />
      ))}
    </g>
  );
};

// 1) "quiero enseñarte exactamente qué es antes de que decidas comprarlo": la tarjeta del curso y una lupa que la recorre
// iluminando sus líneas; al decir "decidas" se marca con un ✓
const EXAMEN = {a: 5.4, b: 9.0, tarjeta: 5.56, lupa: 6.0, decide: 8.12};
const Examen: React.FC<{t: number}> = ({t}) => {
  const {a, b, tarjeta, lupa, decide} = EXAMEN;
  const k = Math.max(0, t - lupa);
  // la lupa recorre solo las líneas de texto (no tapa el botón de reproducir)
  const lx = 560 + 120 * (0.5 - 0.5 * Math.cos(k * 2.3));
  const ly = 214 + Math.sin(k * 4.6) * 14;
  const luz = [0, 1, 2].map((i) => (t > lupa + 0.25 + i * 0.3 ? 1 : 0));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <TarjetaCurso t={t} en={tarjeta} x={540} y={226} luz={luz} />
        <Chip t={t} en={lupa} d={ICONO.lupa} x={lx} y={ly} r={42} quieto />
        <Insignia t={t} en={decide} x={672} y={150} fondo={VERDE}>
          <Check t={t} en={decide + 2 * F} s={0.75} />
        </Insignia>
        <Particulas t={t} en={decide} x={672} y={150} n={8} radio={90} colores={[VERDE, '#ffffff']} />
      </Lienzo>
    </Ventana>
  );
};

// 2) "no es una formación para hacerte programador": la ficha de código cae, y al decir "programador" le salta una ✕ roja y tiembla
const NOPROG = {a: 11.6, b: 13.3, ficha: 11.76, cruz: 12.4};
const NoProgramador: React.FC<{t: number}> = ({t}) => {
  const {a, b, ficha, cruz} = NOPROG;
  const tiembla = t > cruz && t < cruz + 0.45 ? Math.sin((t - cruz) * 62) * 7 * (1 - (t - cruz) / 0.45) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${tiembla} 0)`}>
          <Chip t={t} en={ficha} d={ICONO.codigo} x={540} y={232} r={70} fondo="#fff" />
          <Insignia t={t} en={cruz} x={598} y={174} r={32} fondo={ROJO}>
            <Cruz t={t} en={cruz + 2 * F} s={0.62} />
          </Insignia>
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 3) "una introducción a un modelo de negocio que consiste en vender servicios de IA a empresas": el libro (introducción)
// se aparta, una flecha con flujo lleva a la empresa y salta la chispa de la IA
const MODELO = {a: 13.3, b: 16.2, libro: 13.44, modelo: 14.4, negocio: 14.88, ia: 15.52};
const Modelo: React.FC<{t: number}> = ({t}) => {
  const {a, b, libro, modelo, negocio, ia} = MODELO;
  const m = muelle(t, modelo, 2.2, 6.5);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Conector t={t} en={modelo + 0.15} d="M 372 232 L 690 232" color="rgba(255,255,255,0.85)" dur={0.4} flujo grosor={6} punta={[690, 232, 0]} />
        <Chip t={t} en={libro} d={ICONO.libro} x={540 - 240 * m} y={232} r={64} />
        <Chip t={t} en={negocio} d={ICONO.edificio} x={780} y={232} r={66} fondo="#fff" fase={1} />
        <Chip t={t} en={ia} d={ICONO.ia} x={842} y={168} r={34} fase={2} />
      </Lienzo>
    </Ventana>
  );
};

// 4) Montaje (B-roll): progreso abajo con los cuatro servicios (voz → WhatsApp → chatbots → automatizaciones)
const PASOS5 = [{en: 19.72, d: ICONO.mic}, {en: 21.52, d: ICONO.chat}, {en: 22.72, d: ICONO.robot}, {en: 23.4, d: ICONO.engranaje}];
const Progreso: React.FC<{t: number}> = ({t}) => {
  const xs = [255, 445, 635, 825];
  return (
    <Ventana suave t={t} a={19.72} b={24.46}>
      <Lienzo>
        {xs.slice(0, 3).map((x, i) => (
          <Conector key={i} t={t} en={PASOS5[i + 1].en - 0.22} d={`M ${x + 58} 1690 L ${xs[i + 1] - 58} 1690`} color="rgba(255,255,255,0.7)" dur={0.22} flujo grosor={6} />
        ))}
        {PASOS5.map((p, i) => {
          const activo = t >= p.en && (i === PASOS5.length - 1 || t < PASOS5[i + 1].en);
          return t < p.en ? (
            <circle key={i} cx={xs[i]} cy={1690} r={18 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" />
          ) : (
            <Chip key={i} t={t} en={p.en} d={p.d} x={xs[i]} y={1690} r={activo ? 56 : 44} fondo={activo ? C.amarillo : '#fff'} fase={i} />
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 5) "el curso contiene 14 clases": catorce fichas de lección caen en cascada (dos filas de siete), destellan al llegar
// y una ola de luz las recorre al decir "ayudarte"
const LECCIONES = {a: 24.6, b: 27.9, en: 25.32, ola: 27.28};
const Lecciones: React.FC<{t: number}> = ({t}) => {
  const {a, b, en, ola} = LECCIONES;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {Array.from({length: 14}, (_, i) => {
          const ei = en + i * 0.045;
          if (t < ei) return null;
          const e = aparece(t, ei, (i % 2 ? 1 : -1) * 7);
          const m = muelle(t, ei, 2.6, 7);
          const flash = lim(1 - (t - ei) / 0.4);
          const onda = Math.exp(-Math.pow((t - ola) * 6 - (i % 7) * 0.9, 2));
          const x = 540 + ((i % 7) - 3) * 104, y = 172 + Math.floor(i / 7) * 112 - (1 - m) * 60;
          const fl = flota(t, i * 0.7, 3);
          const lleno = flash > 0.3 || onda > 0.5;
          return (
            <g key={i} transform={`translate(${x} ${y + fl.y - onda * 12}) scale(${e.sx * (1 + 0.08 * onda)} ${e.sy * (1 + 0.08 * onda)}) rotate(${e.rot})`}>
              <rect x={-42} y={-46} width={84} height={92} rx={20} fill={lleno ? C.amarillo : OSCURO} stroke={C.amarillo} strokeWidth={4}
                style={{filter: lleno ? `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
              <path d="M -10 -15 L 15 0 L -10 15 Z" fill={lleno ? '#1b1b20' : C.amarillo} />
            </g>
          );
        })}
        <Particulas t={t} en={en + 13 * 0.045 + 0.1} x={540} y={228} n={14} radio={360} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "comprender cómo funciona este tipo de agencia": la agencia con dos engranajes que encajan y giran a su lado
const FUNCIONA = {a: 27.92, b: 30.3, agencia: 28.0, gira: 28.96};
const Funciona: React.FC<{t: number}> = ({t}) => {
  const {a, b, agencia, gira} = FUNCIONA;
  const g = Math.max(0, t - gira) * 90;
  const e1 = aparece(t, gira, 0), e2 = aparece(t, gira + 0.12, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {t >= gira && (
          <g transform={`translate(330 200) scale(${e1.sx * 5.4} ${e1.sy * 5.4}) rotate(${g}) translate(-13 -12)`}>
            <path d={ICONO.engranaje} fill={C.amarillo} stroke="#fff" strokeWidth={0.5} />
          </g>
        )}
        {t >= gira + 0.12 && (
          <g transform={`translate(${330 + 82} ${200 + 66}) scale(${e2.sx * 3.8} ${e2.sy * 3.8}) rotate(${-g * 1.4 + 12}) translate(-13 -12)`}>
            <path d={ICONO.engranaje} fill="#fff" stroke="#fff" strokeWidth={0.5} />
          </g>
        )}
        <Conector t={t} en={gira + 0.2} d="M 470 236 L 612 236" color="rgba(255,255,255,0.8)" dur={0.3} flujo grosor={6} punta={[612, 236, 0]} />
        <Chip t={t} en={agencia} d={ICONO.edificio} x={700} y={236} r={70} fase={0.5} />
      </Lienzo>
    </Ventana>
  );
};

// 7) Tres preguntas: tarjetas con una interrogación dibujada que giran y descubren la respuesta en icono
// (el problema que resuelves, la empresa que lo necesita, las áreas del negocio)
const PREGUNTAS: [number, number, string][] = [[30.44, 30.96, ICONO.herramienta], [32.28, 32.88, ICONO.edificio], [35.16, 35.52, ICONO.quesito]];
const Preguntas: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={30.3} b={40.3}>
    <Lienzo>
      {PREGUNTAS.map(([en, gira, d], i) => {
        if (t < en) return null;
        const x = 290 + i * 250, y = 236;
        const ap = aparece(t, en, (i - 1) * 12);
        const k = lim((t - gira) / 0.42);
        const cx = Math.cos(Math.PI * Easing.bezier(0.65, 0, 0.35, 1)(k));
        const detras = cx < 0;
        const fl = flota(t, i * 1.6, 5);
        return (
          <g key={i}>
            <g transform={`translate(${x} ${y + fl.y}) scale(${ap.sx * Math.max(0.02, Math.abs(cx))} ${ap.sy}) rotate(${ap.rot})`}>
              <rect x={-88} y={-103} width={176} height={206} rx={28} fill={detras ? C.amarillo : OSCURO} stroke={detras ? '#fff' : 'rgba(255,255,255,0.9)'} strokeWidth={5}
                style={{filter: detras ? `drop-shadow(0 0 18px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
              {detras ? (
                <g transform="scale(-1 1)">
                  <IconoTrazado d={d} t={t} en={gira + 0.21} color="#1b1b20" size={104} x={-52} y={-52} />
                </g>
              ) : (
                <Interrogante t={t} en={en + 3 * F} x={0} y={4} s={1.05} fase={i} />
              )}
            </g>
            <Pulso t={t} en={gira + 0.42} x={x} y={y} r={96} color={C.amarillo} />
            <Particulas t={t} en={gira + 0.42} x={x} y={y} n={9} radio={130} />
          </g>
        );
      })}
    </Lienzo>
  </Ventana>
);

// 8) "comprar este curso no significa que automáticamente vayas a conseguir clientes": del curso sale una flecha hacia los
// clientes, pero al decir "automáticamente" la corta una ✕ roja y los clientes quedan apagados
const NOAUTO = {a: 41.9, b: 45.95, curso: 42.36, flecha: 43.2, cruz: 43.8, clientes: 45.12};
const NoAutomatico: React.FC<{t: number}> = ({t}) => {
  const {a, b, curso, flecha, cruz, clientes} = NOAUTO;
  const tiembla = t > cruz && t < cruz + 0.4 ? Math.sin((t - cruz) * 60) * 6 * (1 - (t - cruz) / 0.4) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <TarjetaCurso t={t} en={curso} x={290} y={232} w={220} h={140} />
        <Conector t={t} en={flecha} d="M 410 232 L 690 232" color={t >= cruz ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)'} dur={0.5} grosor={6} punta={[690, 232, 0]} />
        <g transform={`translate(${tiembla} 0)`}>
          <Insignia t={t} en={cruz} x={550} y={232} r={34} fondo={ROJO}>
            <Cruz t={t} en={cruz + 2 * F} s={0.66} />
          </Insignia>
        </g>
        {[[790, 196], [866, 262], [770, 290]].map(([x, y], i) => (
          <g key={i} opacity={0.55}>
            <Chip t={t} en={clientes + i * 0.08} d={ICONO.persona} x={x} y={y} r={38} fondo="rgba(80,80,90,0.95)" color="#fff" fase={i} sinRafaga />
          </g>
        ))}
      </Lienzo>
    </Ventana>
  );
};

// 9) "para conocer el modelo y decidir si quieres seguir aprendiendo": la lupa (conocer) y, al decir "decidir", el camino se
// divide en dos; la rama de "seguir aprendiendo" se enciende y lleva al libro
const DECIDE = {a: 47.72, b: 51.1, conocer: 48.0, decidir: 49.2, otra: 49.6, seguir: 50.32};
const Decidir: React.FC<{t: number}> = ({t}) => {
  const {a, b, conocer, decidir, otra, seguir} = DECIDE;
  const izq = 'M 540 268 C 540 210, 410 196, 350 170';
  const der = 'M 540 268 C 540 210, 670 196, 730 170';
  const encendida = t >= seguir;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Conector t={t} en={decidir} d={izq} color="rgba(255,255,255,0.45)" dur={0.4} grosor={7} punta={[350, 170, Math.atan2(170 - 196, 350 - 410)]} />
        <Conector t={t} en={decidir + 0.08} d={der} color={encendida ? C.amarillo : 'rgba(255,255,255,0.85)'} dur={0.4} flujo={encendida} grosor={7} punta={[730, 170, Math.atan2(170 - 196, 730 - 670)]} />
        {t >= otra && (
          <g transform={`translate(296 146) scale(${aparece(t, otra, 0).sx})`}>
            <circle r={30} fill="rgba(40,40,46,0.9)" stroke="rgba(255,255,255,0.5)" strokeWidth={4} strokeDasharray="8 8" />
          </g>
        )}
        <Chip t={t} en={conocer} d={ICONO.lupa} x={540} y={300} r={48} fondo="#fff" />
        <Chip t={t} en={seguir} d={ICONO.libro} x={792} y={140} r={56} fase={0.7} />
      </Lienzo>
    </Ventana>
  );
};

// 10) "el precio de acceso es de 1 €": la etiqueta cae colgando de su hilo con un muelle, se balancea y el "1 €" entra de golpe
const ETIQUETA = {a: 51.4, b: 53.54, precio: 52.8};
const Etiqueta: React.FC<{t: number}> = ({t}) => {
  const {a, b, precio} = ETIQUETA;
  const cae = muelle(t, a + 0.04, 1.7, 5.2);
  const k = Math.max(0, t - a), kp = t - precio;
  const balanceo = 15 * Math.exp(-k * 2.4) * Math.sin(k * 7.5) + (kp > 0 ? 8 * Math.exp(-kp * 4) * Math.sin(kp * 15) : 0);
  const hilo = lim((t - a) / 0.3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(540 ${1232 - (1 - cae) * 780}) rotate(${balanceo})`}>
          <line x1={0} y1={-34} x2={0} y2={-34 + 86 * hilo} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
          <path d="M -150 0 L 150 0 L 230 80 L 230 300 Q 230 320 210 320 L -210 320 Q -230 320 -230 300 L -230 80 Z" fill={C.amarillo} stroke="#fff" strokeWidth={6} strokeLinejoin="round"
            style={{filter: `drop-shadow(0 0 26px rgba(${GLOW_AMARILLO},0.85))`}} />
          <circle cx={0} cy={52} r={16} fill="#1b1b20" stroke="#fff" strokeWidth={4} />
          <text x={0} y={250} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={170} fill="#111" style={golpeV(ESTILO.golpe, t, precio, b - 6 * F) as React.CSSProperties}>1 €</text>
        </g>
        <Destello t={t} en={precio + 0.1} x={792} y={1318} tam={30} color="#fff" />
      </Lienzo>
    </Ventana>
  );
};

// 11) "reservar una consultoría gratuita en la que también podrás conocer nuestra mentoría completa": el calendario cae,
// se marca con ✓ al decir "gratuita", se aparta y una flecha con flujo lleva a la mentoría (auriculares + libro)
const CONSULTA = {a: 54.4, b: 58.95, cal: 54.64, gratis: 56.08, mueve: 56.9, mentoria: 58.36};
const Consultoria: React.FC<{t: number}> = ({t}) => {
  const {a, b, cal, gratis, mueve, mentoria} = CONSULTA;
  const m = muelle(t, mueve, 2.2, 6.5);
  const cx = 540 - 230 * m;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Conector t={t} en={mueve + 0.25} d="M 392 232 L 676 232" color="rgba(255,255,255,0.85)" dur={0.45} flujo grosor={6} punta={[676, 232, 0]} />
        <Chip t={t} en={cal} d={ICONO.calendario} x={cx} y={232} r={68} fondo="#fff" />
        <Insignia t={t} en={gratis} x={cx + 50} y={182} fondo={VERDE}>
          <Check t={t} en={gratis + 2 * F} s={0.72} />
        </Insignia>
        <Particulas t={t} en={gratis} x={cx + 50} y={182} n={8} radio={90} colores={[VERDE, '#ffffff']} />
        <Chip t={t} en={mentoria} d={ICONO.auricular} x={770} y={232} r={68} fase={1.1} />
        <Chip t={t} en={mentoria + 0.18} d={ICONO.libro} x={826} y={290} r={32} fondo="#fff" fase={2} sinRafaga />
      </Lienzo>
    </Ventana>
  );
};

// 12) "si te interesa profundizar, si quieres descubrir el modelo de negocio de las agencias de IA": tres capas apiladas que
// se separan y una lupa que baja a través de ellas iluminándolas; al fondo salta la chispa de la IA
const CAPAS = {a: 59.3, b: 63.7, capas: 59.5, profundo: 60.0, baja: 61.04, ia: 63.24};
const Capas: React.FC<{t: number}> = ({t}) => {
  const {a, b, capas, profundo, baja, ia} = CAPAS;
  const sep = muelle(t, profundo, 2.0, 6);
  const u = lim((t - baja) / 1.6);
  const uu = u * u * (3 - 2 * u);
  const ly = 110 + 210 * uu;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {[0, 1, 2].map((i) => {
          const en = capas + i * 0.1;
          if (t < en) return null;
          const e = aparece(t, en, 0);
          const y = 230 + (i - 1) * (26 + 58 * sep);
          const lit = ly > y - 30;
          const fl = flota(t, i * 1.1, 3);
          return (
            <g key={i} transform={`translate(540 ${y + fl.y}) scale(${e.sx} ${e.sy})`}>
              <path d="M -170 0 L 0 -52 L 170 0 L 0 52 Z" fill={lit ? C.amarillo : OSCURO} stroke={lit ? '#fff' : C.amarillo} strokeWidth={5} strokeLinejoin="round"
                style={{filter: lit ? `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} opacity={0.96} />
            </g>
          );
        })}
        <Chip t={t} en={profundo} d={ICONO.lupa} x={676} y={ly} r={46} quieto />
        <Chip t={t} en={ia} d={ICONO.ia} x={540} y={316} r={40} />
      </Lienzo>
    </Ventana>
  );
};

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

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
  {a: 0.04, b: 3.96, top: 60, lineas: [{ws: [['he', 0.04], ['preparado', 0.2], ['un', 0.68], ['curso', 0.84]], size: 76}, {ws: [['de', 1.2], ['introducción', 1.32]], size: 76}, {ws: [['a', 1.96], ['las', 2.04], ['agencias', 2.24], ['de', 2.64]], size: 76}, {ws: [['inteligencia', 2.76, amarillo]], size: 118, golpe: true}, {ws: [['artificial', 3.32, amarillo]], size: 118, golpe: true}]},
  // ...por 1 €
  {a: 4.04, b: 5.2, top: 980, lineas: [{ws: [['por', 4.04]], size: 90}, {ws: [['1 €', 4.4, amarillo]], size: 300, golpe: true}]},
  // No es una formación para hacerte programador
  {a: 10.44, b: 13.05, top: 980, lineas: [{ws: [['es', 10.44], ['que', 10.56], ['no', 10.68], ['es', 10.84]], size: 80}, {ws: [['una', 10.96], ['formación', 11.16]], size: 90}, {ws: [['para', 11.76], ['hacerte', 12.0]], size: 80}, {ws: [['programador', 12.4, rosaFuerte]], size: 130, golpe: true}]},
  // Montaje de B-roll: todo en grande (la frase exacta)
  {a: 19.72, b: 21.5, top: 1150, lineas: [{ws: [['por', 19.72], ['ejemplo', 19.88]], size: 80}, {ws: [['asistentes', 20.4, amarillo]], size: 130, golpe: true}, {ws: [['de', 21.0], ['voz', 21.12]], size: 100}]},
  {a: 21.52, b: 22.7, top: 1150, lineas: [{ws: [['agentes', 21.52], ['de', 21.96]], size: 90}, {ws: [['WhatsApp', 22.08, amarillo]], size: 140, golpe: true}]},
  {a: 22.72, b: 23.38, top: 1150, lineas: [{ws: [['chatbots', 22.72, amarillo]], size: 160, golpe: true}]},
  {a: 23.4, b: 24.44, top: 1150, lineas: [{ws: [['y', 23.4]], size: 90}, {ws: [['automatizaciones', 23.52, amarillo]], size: 120, golpe: true}]},
  // 14 clases
  {a: 24.48, b: 26.25, top: 980, lineas: [{ws: [['el', 24.48], ['curso', 24.68], ['contiene', 24.92]], size: 80}, {ws: [['14', 25.32, amarillo]], size: 280, golpe: true}, {ws: [['clases', 25.8]], size: 100}]},
  // Quiero que tengas algo claro
  {a: 40.64, b: 41.85, top: 1000, lineas: [{ws: [['quiero', 40.64], ['que', 40.84], ['tengas', 40.92]], size: 80}, {ws: [['algo claro', 41.24, amarillo]], size: 140, golpe: true}]},
  // Formación introductoria
  {a: 46.08, b: 47.72, top: 1000, lineas: [{ws: [['es', 46.08], ['una', 46.24], ['formación', 46.36]], size: 90}, {ws: [['introductoria', 46.88, amarillo]], size: 130, golpe: true}]},
  // El precio de acceso es de 1 € (el "1 €" va en la etiqueta)
  {a: 51.28, b: 53.3, top: 900, lineas: [{ws: [['el', 51.28], ['precio', 51.48], ['de', 51.76], ['acceso', 51.88]], size: 80}, {ws: [['es', 52.44], ['de', 52.64]], size: 80}]},
  // Consultoría gratuita
  {a: 54.28, b: 56.62, top: 1000, lineas: [{ws: [['podrás', 54.28], ['reservar', 54.64], ['una', 55.2]], size: 80}, {ws: [['consultoría', 55.48, amarillo]], size: 120, golpe: true}, {ws: [['gratuita', 56.08, amarillo]], size: 120, golpe: true}]},
  // Cierre: accede al curso por 1 €
  {a: 64.64, b: 66.9, top: 960, lineas: [{ws: [['y', 64.64], ['accede', 64.72], ['al', 65.08], ['curso', 65.24]], size: 80}, {ws: [['por', 65.68]], size: 90}, {ws: [['1 €', 65.88, amarillo]], size: 300, golpe: true}]},
];
// Este reel no tiene lista en grande
const LISTA: [number, number] = [-10, -10];
const CTA = 63.72;
const CTA_FIN = 64.62; // tras "pulsa el botón" va el cierre en grande
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
const CLAVE = new Set(['exactamente', 'negocio', 'empresas', 'agencia', 'problema', 'servicios', 'profesional', 'automáticamente', 'clientes', 'modelo', 'mentoría', 'profundizar']);

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
const DETRAS: [number, number][] = [[0, 4.25]];

export const ReelE5: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E5)} layout="none">
            <Video src={staticFile('e5/e5.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e5/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <Examen t={t} />
      <NoProgramador t={t} />
      <Modelo t={t} />
      <Progreso t={t} />
      <Lecciones t={t} />
      <Funciona t={t} />
      <Preguntas t={t} />
      <NoAutomatico t={t} />
      <Decidir t={t} />
      <Etiqueta t={t} />
      <Consultoria t={t} />
      <Capas t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={63.72}>pulsa</Sube>
          <Sube t={t} en={64.16}>el</Sube>
          <Sube t={t} en={64.24} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 64.36 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 64.36)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 63.72, 64.16, 64.24].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['risercorto', 2.2, -7], ['boom', 2.76, -4], ['cineboom', 4.4, -3], ['thud', 12.4, -4],
        ['pop', 20.4, -4], ['pop', 22.08, -4], ['pop', 22.72, -4], ['pop', 23.52, -4],
        ['boom', 25.32, -3], ['datos', 25.34, -9],
        ['snappy', 30.44, -7], ['reveal', 30.96, -7], ['snappy', 32.28, -7], ['reveal', 32.88, -7], ['snappy', 35.16, -7], ['reveal', 35.52, -7],
        ['thud', 41.24, -4], ['pop', 46.88, -4], ['swish', 51.5, -8], ['boom', 52.8, -3], ['exito', 52.9, -8], ['confirmar', 55.48, -6],
        ['risersharp', 65.0, -6], ['boom', 65.88, -2], ['twinkle', 66.1, -6],
        ['pop', 5.56, -8], ['swish', 6.0, -12], ['confirmar', 8.12, -10], ['pop', 11.76, -8], ['negativo', 12.42, -10],
        ['pop', 13.44, -8], ['swish', 14.55, -12], ['pop', 14.88, -8], ['twinkle', 15.52, -11],
        ['tap', 19.72, -10], ['tap', 21.52, -10], ['tap', 22.72, -10], ['tap', 23.4, -10], ['twinkle', 27.28, -11],
        ['pop', 28.0, -8], ['snap', 28.96, -9], ['pop', 42.36, -8], ['swish', 43.2, -12], ['negativo', 43.8, -10], ['pop', 45.12, -9],
        ['pop', 48.0, -8], ['swish', 49.2, -11], ['pop', 50.32, -7], ['twinkle', 50.4, -11], ['ding', 52.86, -12],
        ['pop', 54.64, -8], ['ding', 56.08, -10], ['swish', 56.95, -12], ['pop', 58.36, -8],
        ['pop', 59.5, -8], ['suck', 60.0, -10], ['swish', 61.04, -12], ['twinkle', 63.24, -10],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
