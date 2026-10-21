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
import {Check, Chip, Conector, Cruz, Destello, IconoTrazado, Lienzo, OSCURO, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'giro', golpe: 'zoom', impacto: 'circulos', sub: 'giro', flecha: 'cae'};

export const DURACION_E2 = 70.12;
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
  [1.04, 1.14, 0.16, 'golpe'],
  [1.84, 1.04, 0.8, 'suave'],
  [3.52, 1.1, 0.3, 'golpe'],
  [4.68, 1.04, 0.6, 'suave'],
  [5.96, 1.1, 0.2, 'golpe'],
  [6.24, 1.03, 0.8, 'suave'],
  [7.0, 1.08, 2.5, 'suave'],
  [9.6, 1.0, 0, 'corte'],
  [14.8, 1.0, 0, 'corte'],
  [14.85, 1.05, 0.7, 'suave'],
  [15.56, 1.12, 0.2, 'golpe'],
  [16.4, 1.04, 2.5, 'suave'],
  [19.76, 1.08, 0.3, 'golpe'],
  [20.76, 1.13, 0.2, 'golpe'],
  [21.6, 1.04, 1.5, 'suave'],
  [23.24, 1.09, 0.3, 'golpe'],
  [24.0, 1.04, 2.0, 'suave'],
  [26.32, 1.08, 0.4, 'golpe'],
  [27.4, 1.0, 0, 'corte'],
  [32.56, 1.0, 0, 'corte'],
  [32.6, 1.05, 1.5, 'suave'],
  [35.0, 1.14, 0.16, 'golpe'],
  [36.0, 1.04, 0.8, 'suave'],
  [37.36, 1.07, 3.0, 'suave'],
  [41.56, 1.13, 0.2, 'golpe'],
  [43.24, 1.04, 0.8, 'suave'],
  [45.56, 1.07, 0.3, 'golpe'],
  [46.92, 1.1, 0.3, 'golpe'],
  [48.96, 1.13, 0.3, 'golpe'],
  [51.92, 1.04, 0.8, 'suave'],
  [55.64, 1.12, 0.2, 'golpe'],
  [56.44, 1.18, 0.16, 'golpe'],
  [57.44, 1.04, 0.8, 'suave'],
  [61.48, 1.2, 0.16, 'golpe'],
  [62.57, 1.05, 0.6, 'suave'],
  [64.0, 1.08, 3.0, 'suave'],
  [68.76, 1.15, 0.2, 'golpe'],
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
const IMPACTOS = [1.04, 56.44, 61.48, 68.76];
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
  {src: 'ordenadores', a: 9.6, b: 10.36, desde: 1, foco: 0.5},
  {src: 'codigo', a: 10.36, b: 10.88, desde: 3, foco: 0.5},
  {src: 'matematicas', a: 10.88, b: 12.12, desde: 2, foco: 0.5},
  {src: 'estudiando', a: 12.12, b: 14.8, desde: 1, foco: 0.5},
  {src: 'peluqueria', a: 27.4, b: 32.56, desde: 1, foco: 0.5, vertical: true},
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
            <Video src={staticFile(`e2/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z',
  codigo: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  // Material "extension": piezas que encajan (herramientas existentes)
  pieza: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
  // Material "store": el negocio
  tienda: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  chat: 'M4 4h16v12H7l-3 3V4z',
  ia: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
};
const VERDE_CHAT = '#25c76a';

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// 0) "cuando la gente escucha inteligencia artificial, automáticamente piensa en…": un bocadillo de pensamiento sale de la cabeza
// (las burbujitas suben una a una), dentro se dibuja la chispa de la IA y al decir "piensa" los puntos laten (está pensando)
const PIENSA = {a: 6.9, b: 9.6, burbuja: 7.24, ia: 7.5, piensa: 9.2};
const Pensamiento: React.FC<{t: number}> = ({t}) => {
  const {a, b, burbuja, ia, piensa} = PIENSA;
  const ap = aparece(t, burbuja, -6);
  const fl = flota(t, 0.4, 5);
  const nube = 'M -150 30 C -190 30, -196 -36, -150 -44 C -150 -96, -70 -112, -36 -80 C -6 -124, 80 -118, 92 -70 C 150 -84, 190 -24, 150 14 C 176 54, 120 86, 80 64 C 50 100, -40 100, -64 66 C -110 92, -170 70, -150 30 Z';
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* burbujitas que suben de la cabeza a la nube */}
        {[[600, 392, 13, 0], [630, 352, 19, 0.1], [668, 304, 25, 0.2]].map(([x, y, r, d], i) => {
          const e = aparece(t, a + d, 0);
          if (t < a + d) return null;
          return <circle key={i} cx={x} cy={y + fl.y * 0.5} r={r * e.sx} fill={OSCURO} stroke="#fff" strokeWidth={4} />;
        })}
        <g transform={`translate(560 ${190 + fl.y})`}>
          <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
            {t >= burbuja && <path d={nube} fill={OSCURO} stroke="#fff" strokeWidth={6} strokeLinejoin="round" />}
            <g transform={`translate(${-40} ${-28 + Math.sin(t * 3) * 3})`}>
              <IconoTrazado d={ICONO.ia} t={t} en={ia} color={C.amarillo} size={80} x={-40} y={-40} />
            </g>
            {[0, 1, 2].map((i) => {
              const late = t > piensa ? Math.abs(Math.sin((t - piensa) * 9 - i * 0.8)) : 0;
              return t >= ia + 0.3 + i * 0.08 ? <circle key={i} cx={46 + i * 30} cy={-14 - late * 12} r={9} fill="#fff" /> : null;
            })}
          </g>
        </g>
        <Destello t={t} en={ia + 0.35} x={480} y={128} tam={20} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 1) DESARROLLAR IA frente a VENDER SOLUCIONES DE IA (lo pide el guion): dos tarjetas que caen con muelle.
// La de la izquierda escribe código desde cero; al decir "herramientas existentes" pierde (se encoge, se apaga y le sale un ✕ rojo,
// sin tachar el texto) y a la derecha llegan volando tres herramientas que encajan en la pieza; al decir "negocio" sale el ✓ verde
const COMPARA = {a: 15.4, b: 26.3, izq: 15.56, cero: 18.44, der: 20.76, existentes: 22.68, negocio: 25.6};
const Tarjeta: React.FC<{t: number; en: number; left: number; activa: boolean; pierde: number; children: React.ReactNode}> = ({t, en, left, activa, pierde, children}) => {
  if (t < en) return null;
  const ap = aparece(t, en, left < 540 ? -8 : 8);
  const fl = flota(t, left / 300, 4);
  const respira = 0.8 + 0.2 * Math.sin(t * 4);
  return (
    <div style={{position: 'absolute', left, top: 96 + fl.y, width: 390, height: 300, borderRadius: 36, transformOrigin: '50% 100%',
      transform: `scale(${ap.sx * (1 - 0.1 * pierde)}, ${ap.sy * (1 - 0.1 * pierde)}) rotate(${ap.rot - 4 * pierde}deg)`, opacity: Math.min(1, ap.op * 2) * (1 - 0.45 * pierde),
      background: activa ? 'rgba(254,255,188,0.13)' : 'rgba(12,12,16,0.82)', border: `5px solid ${activa ? C.amarillo : 'rgba(255,255,255,0.4)'}`,
      boxShadow: activa ? `0 0 ${44 * respira}px rgba(${GLOW_AMARILLO},0.5)` : '0 14px 40px rgba(0,0,0,0.5)', filter: pierde > 0 ? `saturate(${1 - pierde})` : undefined}}>
      {children}
    </div>
  );
};
const Comparacion: React.FC<{t: number}> = ({t}) => {
  const {a, b, izq, cero, der, existentes, negocio} = COMPARA;
  const pierde = lim((t - existentes) / 0.45);
  const vs = aparece(t, der + 0.15, 20);
  // código que se escribe solo en la tarjeta izquierda: líneas que crecen una a una con cursor que parpadea
  const lineas = [120, 200, 150, 230, 90];
  const escritas = lim((t - (izq + 0.6)) / (cero - izq)) * lineas.length;
  const herramientas = [ICONO.ia, ICONO.chat, ICONO.engranaje];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Tarjeta t={t} en={izq} left={100} activa={t < der} pierde={pierde}>
        <svg width={390} height={300} style={{position: 'absolute', left: -5, top: -5, overflow: 'visible'}}>
          <IconoTrazado d={ICONO.codigo} t={t} en={izq + 2 * F} color={t < der ? C.amarillo : '#fff'} size={84} x={153} y={18} />
          {lineas.map((w, i) => {
            const k = lim(escritas - i);
            return k > 0 ? <rect key={i} x={70 + (i % 2) * 26} y={228 + i * 13} width={w * k * 0.85} height={8} rx={4} fill={i % 3 === 1 ? C.amarillo : 'rgba(255,255,255,0.55)'} /> : null;
          })}
          {escritas < lineas.length && Math.floor(t * 4) % 2 === 0 && <rect x={70 + (Math.floor(escritas) % 2) * 26 + lineas[Math.min(4, Math.floor(escritas))] * lim(escritas % 1) * 0.85 + 6} y={226 + Math.min(4, Math.floor(escritas)) * 13} width={5} height={12} fill={C.amarillo} />}
        </svg>
        <div style={{position: 'absolute', left: 0, right: 0, top: 112, textAlign: 'center', ...H, fontSize: 46, lineHeight: 1.0}}>desarrollar<br />ia</div>
      </Tarjeta>
      <Tarjeta t={t} en={der} left={590} activa={t >= der} pierde={0}>
        <svg width={390} height={300} style={{position: 'absolute', left: -5, top: -5, overflow: 'visible'}}>
          <g transform={`translate(195 62) rotate(${t > existentes + 0.5 && t < existentes + 0.9 ? Math.sin((t - existentes - 0.5) * 40) * 6 : 0})`}>
            <IconoTrazado d={ICONO.pieza} t={t} en={der + 2 * F} color={C.amarillo} size={84} x={-42} y={-42} />
          </g>
          {/* tres herramientas que ya existen llegan volando en arco y encajan en la pieza */}
          {herramientas.map((d, i) => {
            const en = existentes + i * 0.12;
            if (t < en) return null;
            const k = lim((t - en) / 0.45);
            const e = k * k * (3 - 2 * k);
            const x0 = [-70, 195, 460][i], y0 = [80, -60, 80][i];
            const x = x0 + (195 - x0) * e, y = y0 + (62 - y0) * e - Math.sin(e * Math.PI) * 90;
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${1 - 0.7 * e}) rotate(${(1 - e) * 200})`} opacity={1 - lim((k - 0.9) / 0.1)}>
                <circle r={34} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
                <g transform="translate(-18 -18) scale(1.5)"><path d={d} fill="#1b1b20" /></g>
              </g>
            );
          })}
          <Particulas t={t} en={existentes + 0.6} x={195} y={62} n={12} radio={120} />
        </svg>
        <div style={{position: 'absolute', left: 0, right: 0, top: 112, textAlign: 'center', ...H, fontSize: 46, lineHeight: 1.0}}>vender<br /><span style={amarillo}>soluciones</span><br />de ia</div>
      </Tarjeta>
      <Lienzo>
        {t >= der + 0.15 && (
          <g transform={`translate(540 ${246}) scale(${vs.sx} ${vs.sy}) rotate(${vs.rot})`}>
            <circle r={48} fill={OSCURO} stroke="#fff" strokeWidth={5} />
            <text x={0} y={16} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={44} fill="#fff">VS</text>
          </g>
        )}
        {/* la de la izquierda pierde: ✕ rojo en su esquina (no tacha el texto) */}
        {t >= existentes + 0.1 && (
          <g transform={`translate(478 110)`}>
            <Pulso t={t} en={existentes + 0.1} x={0} y={0} r={42} color={ROJO} />
            <g transform={`scale(${aparece(t, existentes + 0.1, 12).sx} ${aparece(t, existentes + 0.1, 12).sy})`}>
              <circle r={42} fill={ROJO} stroke="#fff" strokeWidth={5} />
              <Cruz t={t} en={existentes + 0.16} s={0.95} />
            </g>
          </g>
        )}
        {/* y la de la derecha gana: ✓ verde al decir "negocio" */}
        {t >= negocio && (
          <g transform={`translate(968 110)`}>
            <Pulso t={t} en={negocio} x={0} y={0} r={46} color={VERDE} />
            <g transform={`scale(${aparece(t, negocio, -12).sx} ${aparece(t, negocio, -12).sy})`}>
              <circle r={46} fill={VERDE} stroke="#fff" strokeWidth={5} style={{filter: `drop-shadow(0 0 14px ${VERDE})`}} />
              <Check t={t} en={negocio + 2 * F} s={1} />
            </g>
            <Particulas t={t} en={negocio} x={0} y={0} n={12} radio={130} colores={[VERDE, '#ffffff', C.amarillo]} />
          </g>
        )}
      </Lienzo>
    </Ventana>
  );
};

// 2) Mensajes de clientes sin responder (sobre la peluquería): las notificaciones caen con muelle, aplastan al llegar y empujan
// a las anteriores hacia atrás; el contador rojo salta con cada una (pulso) y la pila tiembla
const AVATARES = ['#f4a261', '#8ecae6', '#e76f51', '#90be6d', '#cdb4db'];
const MENSAJES = {a: 28.6, b: 32.56};
const Mensajes: React.FC<{t: number}> = ({t}) => {
  const {a, b} = MENSAJES;
  const N = 5;
  const llegadas = Array.from({length: N}, (_, k) => a + 0.18 + k * 0.62);
  const visibles = llegadas.filter((en) => t >= en).length;
  const ultima = visibles > 0 ? llegadas[visibles - 1] : 0;
  const tiembla = visibles > 0 && t - ultima < 0.35 ? Math.sin((t - ultima) * 60) * 5 * (1 - (t - ultima) / 0.35) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${tiembla} 0)`}>
          {llegadas.map((en, k) => {
            if (t < en) return null;
            const m = muelle(t, en, 2.4, 7);
            const ap = aparece(t, en, 0);
            const fondo = visibles - 1 - k; // 0 = la más nueva (delante)
            if (fondo > 3) return null;
            const y = 210 + (1 - m) * -170 + fondo * 46;
            const esc = 1 - fondo * 0.05;
            return (
              <g key={k} transform={`translate(540 ${y + 85}) scale(${esc * (fondo === 0 ? ap.sx : 1)} ${esc * (fondo === 0 ? ap.sy : 1)}) translate(-430 -85)`} opacity={(1 - fondo * 0.2) * lim((t - en) / 0.1)}>
                <rect width={860} height={170} rx={38} fill="rgba(250,250,252,0.97)" />
                <circle cx={95} cy={85} r={56} fill={AVATARES[k % AVATARES.length]} />
                <IconoTrazado d={ICONO.persona} t={t} en={en + 0.05} color="rgba(255,255,255,0.95)" size={84} x={53} y={41} />
                <g transform="translate(140 128)">
                  <rect x={-24} y={-24} width={48} height={48} rx={14} fill={VERDE_CHAT} stroke="#fff" strokeWidth={3} />
                  <g transform="translate(-14 -14) scale(1.17)"><path d={ICONO.chat} fill="#fff" /></g>
                </g>
                <rect x={180} y={38} width={190 + (k % 3) * 50} height={24} rx={12} fill="#2b2d31" />
                <rect x={700} y={40} width={110} height={18} rx={9} fill="#b9bcc4" />
                <rect x={180} y={80} width={560 - (k % 3) * 80} height={18} rx={9} fill="#9a9ea8" />
                <rect x={180} y={114} width={380 - (k % 2) * 90} height={18} rx={9} fill="#c3c6cd" />
              </g>
            );
          })}
          {visibles > 0 && (
            <g transform="translate(948 196)">
              <Pulso t={t} en={ultima} x={0} y={0} r={46} color={ROJO} />
              <g transform={`scale(${aparece(t, ultima, 0).sx} ${aparece(t, ultima, 0).sy})`}>
                <circle r={46} fill={ROJO} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 12px ${ROJO})`}} />
                <text x={0} y={16} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={44} fill="#fff">{visibles * 3 - 1}</text>
              </g>
            </g>
          )}
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 3) "soluciones de IA que pueden ayudar a automatizar parte de esas respuestas": llega el mensaje de un cliente, aparece la IA,
// escribe (tres puntos) y contesta sola; llega otro y vuelve a contestar (doble ✓)
const AUTO = {a: 32.6, b: 37.3, msg1: 32.7, ia: 33.76, escribe: 34.5, resp1: 35.0, msg2: 35.72, resp2: 36.48};
const Bocadillo: React.FC<{t: number; en: number; x: number; y: number; w: number; lado: number; fondo: string; barras: number[]; claro: boolean}> = ({t, en, x, y, w, lado, fondo, barras, claro}) => {
  if (t < en) return null;
  const e = aparece(t, en, lado * 6);
  const h = 30 + barras.length * 20;
  const ox = lado < 0 ? x : x + w;
  return (
    <g transform={`translate(${ox} ${y + h}) scale(${e.sx} ${e.sy}) rotate(${e.rot}) translate(${-ox} ${-(y + h)})`}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={fondo} />
      <path d={lado < 0 ? `M ${x + 4} ${y + h - 22} L ${x - 14} ${y + h + 4} L ${x + 28} ${y + h - 4} Z` : `M ${x + w - 4} ${y + h - 22} L ${x + w + 14} ${y + h + 4} L ${x + w - 28} ${y + h - 4} Z`} fill={fondo} />
      {barras.map((bw, i) => <rect key={i} x={x + 22} y={y + 16 + i * 20} width={bw} height={10} rx={5} fill={claro ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.85)'} />)}
    </g>
  );
};
const Automatiza: React.FC<{t: number}> = ({t}) => {
  const {a, b, msg1, ia, escribe, resp1, msg2, resp2} = AUTO;
  const fl = flota(t, 0.9, 3);
  const doble = (en: number, x: number, y: number) =>
    t >= en + 0.2 ? (
      <path d={`M ${x - 16} ${y - 6} L ${x - 10} ${y} L ${x} ${y - 12} M ${x - 6} ${y - 6} L ${x} ${y} L ${x + 10} ${y - 12}`} stroke="#bff7ff" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={lim((t - en - 0.2) / 0.15)} />
    ) : null;
  const escribiendo = (desde: number, hasta: number, x: number, y: number) =>
    t >= desde && t < hasta ? (
      <g transform={`translate(${x} ${y})`}>
        <rect x={-54} y={-26} width={108} height={52} rx={26} fill={C.amarillo} />
        {[0, 1, 2].map((i) => <circle key={i} cx={-24 + i * 24} cy={-Math.abs(Math.sin(t * 12 - i * 0.9)) * 7} r={7} fill="#1b1b20" />)}
      </g>
    ) : null;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <Bocadillo t={t} en={msg1} x={130} y={84} w={380} lado={-1} fondo="rgba(255,255,255,0.95)" barras={[300, 190]} claro />
          {escribiendo(escribe, resp1, 760, 200)}
          <Bocadillo t={t} en={resp1} x={470} y={168} w={340} lado={1} fondo={C.amarillo} barras={[260, 170]} claro />
          {doble(resp1, 790, 230)}
          <Bocadillo t={t} en={msg2} x={130} y={246} w={300} lado={-1} fondo="rgba(255,255,255,0.95)" barras={[220]} claro />
          {escribiendo(msg2 + 0.25, resp2, 760, 322)}
          <Bocadillo t={t} en={resp2} x={530} y={300} w={280} lado={1} fondo={C.amarillo} barras={[200]} claro />
          {doble(resp2, 790, 342)}
        </g>
        {/* la IA: contesta ella (late cada vez que responde) */}
        <Chip t={t} en={ia} d={ICONO.ia} x={920} y={196} r={50} fondo={OSCURO} color={C.amarillo} fase={0.5} />
        <Pulso t={t} en={resp1} x={920} y={196} r={50} color={C.amarillo} />
        <Pulso t={t} en={resp2} x={920} y={196} r={50} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "el negocio no tiene por qué saber cómo se programa todo eso; quiere una solución que funcione": aparece el negocio,
// el código cae dentro de una caja que se cierra (no tiene que verlo), la caja le entrega la solución con una flecha y al decir
// "funcione" el negocio se pone en verde con un ✓
const CAJA = {a: 37.3, b: 43.2, negocio: 37.56, codigo: 39.8, cierra: 40.28, entrega: 41.32, funciona: 42.48};
const Caja: React.FC<{t: number}> = ({t}) => {
  const {a, b, negocio, codigo, cierra, entrega, funciona} = CAJA;
  const fl = flota(t, 1.6, 3);
  const tapa = t < cierra ? -118 : -118 * (1 - muelle(t, cierra, 2.8, 8));
  const cae = lim((t - (cierra - 0.12)) / 0.2);
  const golpeCaja = t > cierra + 0.12 && t < cierra + 0.5 ? Math.sin((t - cierra - 0.12) * 50) * 4 * (1 - (t - cierra - 0.12) / 0.38) : 0;
  const cajaAp = aparece(t, codigo - 0.25, 0);
  const ok = t >= funciona;
  const apOk = aparece(t, funciona, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          {/* el negocio */}
          <g transform="translate(250 230)">
            {ok && <Pulso t={t} en={funciona} x={0} y={0} r={76} color={VERDE} />}
            <g transform={`scale(${ok ? apOk.sx : 1} ${ok ? apOk.sy : 1})`}>
              <Chip t={t} en={negocio} d={ICONO.tienda} x={0} y={0} r={76} fondo={ok ? VERDE : '#fff'} color={ok ? '#fff' : '#1b1b20'} quieto />
            </g>
            {ok && (
              <g transform="translate(58 -58)">
                <circle r={26 * apOk.sx} fill={VERDE} stroke="#fff" strokeWidth={4} />
                <Check t={t} en={funciona + 2 * F} s={0.5} />
              </g>
            )}
            <Particulas t={t} en={funciona} x={0} y={0} n={12} radio={140} colores={[VERDE, '#ffffff', C.amarillo]} />
          </g>
          {/* la caja donde cae el código */}
          {t >= codigo - 0.25 && (
            <g transform={`translate(${780 + golpeCaja} 240) scale(${1.3 * cajaAp.sx} ${1.3 * cajaAp.sy})`}>
              {t < cierra + 0.1 && (
                <g transform={`translate(0 ${-70 + cae * 70}) scale(${1 - 0.6 * cae})`}>
                  <Chip t={t} en={codigo} d={ICONO.codigo} x={0} y={0} r={48} fondo="#fff" quieto sinRafaga />
                </g>
              )}
              <rect x={-84} y={-20} width={168} height={104} rx={14} fill={OSCURO} stroke="#fff" strokeWidth={6} />
              <rect x={-30} y={18} width={60} height={12} rx={6} fill="rgba(255,255,255,0.35)" />
              <g transform={`translate(-90 -20) rotate(${tapa})`}>
                <rect x={0} y={-22} width={180} height={24} rx={10} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
              </g>
              <Particulas t={t} en={cierra + 0.1} x={0} y={-20} n={8} radio={110} colores={['#ffffff', C.amarillo]} />
            </g>
          )}
          {/* la solución llega al negocio */}
          <Conector t={t} en={entrega} d="M 660 210 C 560 110, 440 110, 350 196" color={C.amarillo} dur={0.4} flujo punta={[350, 196, Math.atan2(196 - 110, 350 - 440)]} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 5) "un curso introductorio de 14 clases": catorce píldoras que se encienden una a una (dos filas de siete) y después las recorre un brillo
const CLASES14 = {a: 56.3, b: 59.86, enciende: 56.44, fin: 57.1};
const Clases: React.FC<{t: number}> = ({t}) => {
  const {a, b, enciende, fin} = CLASES14;
  const fl = flota(t, 2.2, 3);
  const brillo = ((t - fin) * 0.8) % 1.4;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          {Array.from({length: 14}, (_, i) => {
            const fila = Math.floor(i / 7), col = i % 7;
            const x = 540 + (col - 3) * 112, y = 170 + fila * 80;
            const en = enciende + (i * (fin - enciende)) / 13;
            const on = t >= en;
            const e = aparece(t, a + i * 0.015, 0);
            const g = on ? aparece(t, en, 0) : {sx: 1, sy: 1};
            const luz = t > fin ? Math.max(0, 1 - Math.abs(brillo * 7 - col - fila * 0.5) / 1.2) : 0;
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${e.sx * g.sx} ${e.sy * g.sy})`}>
                <rect x={-46} y={-26} width={92} height={52} rx={26} fill={on ? C.amarillo : 'rgba(16,16,20,0.75)'} stroke="#fff" strokeWidth={4}
                  style={{filter: on ? `drop-shadow(0 0 ${8 + 14 * luz}px rgba(${GLOW_AMARILLO},${0.6 + 0.4 * luz}))` : 'none'}} />
                {on && <path d="M -8 -12 L 12 0 L -8 12 Z" fill="#1b1b20" />}
              </g>
            );
          })}
          <Particulas t={t} en={fin} x={540 + 3 * 112} y={250} n={12} radio={140} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 6) "empieza a aprender cómo se construye este tipo de negocio": tres bloques caen, aplastan al tocar y se apilan; arriba sale la agencia
const CONSTRUYE = {a: 64.0, b: 67.2, bloques: [64.68, 65.52, 65.9], tejado: 66.3};
const Construye: React.FC<{t: number}> = ({t}) => {
  const {a, b, bloques, tejado} = CONSTRUYE;
  const fl = flota(t, 0.2, 3);
  const pos: [number, number, string][] = [[460, 330, '#fff'], [620, 330, '#fff'], [540, 238, C.amarillo]];
  const techo = aparece(t, tejado, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          <line x1={360} y1={384} x2={720} y2={384} stroke="rgba(255,255,255,0.45)" strokeWidth={5} strokeLinecap="round" opacity={lim((t - a) / 0.3)} />
          {pos.map(([x, y, col], i) => {
            const en = bloques[i];
            if (t < en - 0.3) return null;
            const k = lim((t - (en - 0.3)) / 0.3);
            const caida = (1 - k * k) * -260;
            const toca = t >= en;
            const ap = toca ? aparece(t, en, 0) : {sx: 0.9, sy: 1.12, rot: 0};
            return (
              <g key={i} transform={`translate(${x} ${y + caida}) scale(${toca ? ap.sx : 0.92} ${toca ? ap.sy : 1.1})`} opacity={lim(k * 3)}>
                <rect x={-76} y={-46} width={152} height={92} rx={14} fill={col === '#fff' ? OSCURO : C.amarillo} stroke="#fff" strokeWidth={6} />
                <rect x={-50} y={-14} width={100} height={10} rx={5} fill={col === '#fff' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
                <rect x={-50} y={6} width={64} height={10} rx={5} fill={col === '#fff' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'} />
              </g>
            );
          })}
          {bloques.map((en, i) => <Particulas key={i} t={t} en={en} x={pos[i][0]} y={pos[i][1] + 46} n={7} radio={90} colores={['#ffffff', C.amarillo]} dur={14} />)}
          {t >= tejado && (
            <g transform={`translate(540 150) scale(${techo.sx} ${techo.sy}) rotate(${techo.rot})`}>
              <path d="M -100 30 L 0 -40 L 100 30 Z" fill={C.amarillo} stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
            </g>
          )}
          <Destello t={t} en={tejado + 0.1} x={540} y={92} tam={30} color={C.amarillo} />
          <Destello t={t} en={tejado + 0.2} x={660} y={150} tam={20} />
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
  // HOOK (detrás de Álvaro)
  {a: 0.04, b: 1.6, top: 60, lineas: [{ws: [['no', 0.04], ['necesitas', 0.2], ['saber', 0.8]], size: 80}, {ws: [['programar', 1.04, rosaFuerte]], size: 160, golpe: true}]},
  // Montaje: ordenadores, código, matemáticas, personas estudiando (todo en grande)
  {a: 9.6, b: 10.34, top: 260, lineas: [{ws: [['ordenadores', 9.6, amarillo]], size: 130, golpe: true}]},
  {a: 10.36, b: 10.86, top: 260, lineas: [{ws: [['código', 10.36, amarillo]], size: 150, golpe: true}]},
  {a: 10.88, b: 12.1, top: 260, lineas: [{ws: [['matemáticas', 10.88, amarillo]], size: 130, golpe: true}]},
  {a: 11.96, b: 14.78, top: 260, lineas: [{ws: [['y', 11.96], ['personas', 12.12], ['que', 12.56], ['llevan', 12.68]], size: 80}, {ws: [['años', 13.04, amarillo]], size: 150, golpe: true}, {ws: [['estudiando', 13.56], ['tecnología', 14.04]], size: 80}]},
  // Peluquería (B-roll)
  {a: 27.4, b: 28.15, top: 1150, lineas: [{ws: [['una peluquería', 27.4, amarillo]], size: 120, golpe: true}]},
  // Automatizar
  {a: 34.2, b: 35.7, top: 1000, lineas: [{ws: [['pueden', 34.2], ['ayudar', 34.56], ['a', 34.92]], size: 80}, {ws: [['automatizar', 35.0, amarillo]], size: 150, golpe: true}]},
  // Una solución que funcione
  {a: 40.96, b: 43.2, top: 1000, lineas: [{ws: [['quiere', 40.96]], size: 80}, {ws: [['una solución', 41.32, amarillo]], size: 130, golpe: true}, {ws: [['que', 42.2], ['funcione', 42.48]], size: 90}]},
  // Oferta
  {a: 55.2, b: 56.3, top: 1000, lineas: [{ws: [['un', 55.2], ['curso', 55.36]], size: 90}, {ws: [['introductorio', 55.64, amarillo]], size: 130, golpe: true}]},
  {a: 56.32, b: 57.42, top: 980, lineas: [{ws: [['de', 56.32]], size: 80}, {ws: [['14', 56.44, amarillo]], size: 280, golpe: true}, {ws: [['clases', 57.04]], size: 100}]},
  {a: 59.88, b: 62.5, top: 960, lineas: [{ws: [['puedes', 59.88], ['acceder', 60.24]], size: 80}, {ws: [['por', 60.8], ['solo', 61.08]], size: 80}, {ws: [['1 €', 61.48, amarillo]], size: 300, golpe: true}]},
  // Cierre: vuelve al hook
  {a: 67.28, b: 70.1, top: 1000, lineas: [{ws: [['incluso', 67.28], ['si', 68.12], ['ahora', 68.28], ['mismo', 68.48]], size: 80}, {ws: [['no sabes programar', 68.76, rosaFuerte]], size: 110, golpe: true}]},
];
// La lista "entender qué necesita / ofrecerle el servicio adecuado / asegurarte de que se entrega correctamente" también cuenta como texto grande
const LISTA: [number, number] = [45.56, 51.9];
const CTA = 62.57;
const CTA_FIN = 63.9; // tras "haz clic en el botón" sigue en subtítulos
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
const CLAVE = new Set(['artificial', 'desarrollar', 'empresa', 'existentes', 'negocio', 'mensajes', 'ocupado', 'programa', 'agencia', 'cero']);

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
const DETRAS: [number, number][] = [[0, 1.88]];

export const ReelE2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E2)} layout="none">
            <Video src={staticFile('e2/e2.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e2/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Pensamiento t={t} />
      <Comparacion t={t} />
      <Mensajes t={t} />
      <Automatiza t={t} />
      <Caja t={t} />
      <Clases t={t} />
      <Construye t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}

      {/* Lista: qué necesita el negocio / cómo presentarle tu propuesta / cómo implementar correctamente el servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 860, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
            {([['entender\nqué necesita', 45.56], ['ofrecerle el\nservicio adecuado', 46.92], ['asegurarte de que se\nentrega correctamente', 48.96]] as [string, number][]).map(([txt, en], i) => {
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
          <Sube t={t} en={62.57}>haz</Sube>
          <Sube t={t} en={62.84}>clic</Sube>
          <Sube t={t} en={63.04}>en</Sube>
          <Sube t={t} en={63.16}>el</Sube>
          <Sube t={t} en={63.32} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 63.45 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 63.45)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 62.57, 62.84, 63.04, 63.16, 63.32].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.04, -3], ['pop', 9.6, -3], ['pop', 10.36, -3], ['pop', 10.88, -3], ['pop', 13.04, -3],
        ['popup', 15.56, -4], ['popup', 20.76, -4], ['snap', 22.68, -4], ['popup', 28.78, -7], ['popup', 29.4, -7], ['popup', 30.02, -7], ['popup', 30.64, -7], ['popup', 31.26, -7],
        ['pop', 35.0, -3], ['ding', 41.56, -5], ['click', 45.56], ['click', 46.92], ['click', 48.96], ['pop', 55.64, -3], ['boom', 56.44, -3],
        ['riser', 61.48, -3], ['boom', 61.48, -2], ['twinkle', 61.7, -6], ['thud', 68.76, -3],
        ['burbuja', 7.24, -8], ['twinkle', 7.6, -10], ['tapcorto', 18.44, -10], ['suck', 22.78, -9], ['confirmar', 25.6, -8],
        ['mensaje', 32.7, -8], ['notif', 33.76, -9], ['typing', 34.5, -13], ['mensaje', 35.0, -8], ['mensaje', 35.72, -9], ['mensaje', 36.48, -9],
        ['pop', 37.56, -6], ['pop', 39.8, -7], ['thud', 40.3, -6], ['swish', 41.32, -10], ['confirmar', 42.48, -8],
        ['datos', 56.5, -12], ['thud', 64.68, -8], ['thud', 65.52, -8], ['thud', 65.9, -8], ['twinkle', 66.4, -9],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
