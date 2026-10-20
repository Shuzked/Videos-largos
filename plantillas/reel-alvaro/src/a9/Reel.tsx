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
import {ICONOS, Destello, IconoTrazado, Particulas, Pulso, aparece, flota, muelle, puntaFlecha} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'persiana', golpe: 'latigo', impacto: 'garabato', sub: 'persiana', flecha: 'escalon'};

export const DURACION_A9 = 70.32;
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
  [0.84, 1.08, 0.3, 'golpe'],
  [2.16, 1.15, 0.18, 'golpe'],
  [3.3, 1.04, 0.8, 'suave'],
  [4.36, 1.08, 1.2, 'suave'],
  [6.92, 1.15, 0.16, 'golpe'],
  [7.9, 1.05, 0.8, 'suave'],
  [8.88, 1.09, 0.3, 'golpe'],
  [9.8, 1.05, 1.5, 'suave'],
  [12.16, 1.0, 0, 'corte'],
  [17.88, 1.0, 0, 'corte'],
  [17.9, 1.05, 1.5, 'suave'],
  [19.72, 1.08, 1.0, 'suave'],
  [21.52, 1.12, 0.3, 'golpe'],
  [22.3, 1.04, 0.3, 'suave'],
  [23.0, 1.15, 0.16, 'golpe'],
  [23.6, 1.05, 0.8, 'suave'],
  [26.04, 1.1, 0.3, 'golpe'],
  [27.0, 1.04, 0.8, 'suave'],
  [29.28, 1.09, 0.3, 'golpe'],
  [29.96, 1.05, 0.5, 'suave'],
  [30.76, 1.14, 0.18, 'golpe'],
  [31.6, 1.04, 0.8, 'suave'],
  [33.12, 1.08, 1.0, 'suave'],
  [36.08, 1.05, 0.6, 'suave'],
  [36.68, 1.1, 0.3, 'golpe'],
  [37.44, 1.0, 0, 'corte'],
  [47.9, 1.0, 0, 'corte'],
  [47.92, 1.05, 0.8, 'suave'],
  [49.92, 1.09, 0.6, 'suave'],
  [50.84, 1.12, 0.25, 'golpe'],
  [51.4, 1.05, 0.6, 'suave'],
  [52.72, 1.15, 0.16, 'golpe'],
  [53.6, 1.05, 0.8, 'suave'],
  [54.88, 1.08, 1.2, 'suave'],
  [56.16, 1.0, 0, 'corte'],
  [60.66, 1.0, 0, 'corte'],
  [60.68, 1.05, 0.8, 'suave'],
  [61.36, 1.09, 0.3, 'golpe'],
  [62.52, 1.05, 0.6, 'suave'],
  [64.4, 1.1, 0.3, 'golpe'],
  [65.3, 1.05, 0.8, 'suave'],
  [66.88, 1.08, 1.0, 'suave'],
  [68.52, 1.1, 0.4, 'suave'],
  [69.5, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [2.16, 6.92, 23.0, 30.76, 52.72];
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
  // montaje del ciclo del freelancer: consigue un cliente / hace todo el trabajo / busca el siguiente / vuelve a hacerlo todo
  {src: 'cliente', a: 12.16, b: 13.6, desde: 5.6, foco: 0.6},
  {src: 'trabajo', a: 13.6, b: 14.8, desde: 0.5, foco: 0.54},
  {src: 'llamada', a: 14.8, b: 16.24, desde: 1, foco: 0.7},
  {src: 'agotado', a: 16.24, b: 17.88, desde: 1, foco: 0.45},
  // "con soluciones preparadas y la posibilidad de apoyarte en expertos para la entrega" (encuadre fijo: pantallas y equipo)
  {src: 'expertos', a: 56.16, b: 60.66, desde: 2, foco: 0.45},
];
// Pizarra comparativa a pantalla completa (FREELANCER / AGENCIA), con la misma transición que el B-roll
const COMPARA = {a: 37.44, b: 47.9, personal: 39.56, agencia: 41.96, especialistas: 44.64, implementar: 45.72};
const CORTES = Array.from(new Set([...BROLL, COMPARA].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
            <Video src={staticFile(`a9/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
          </Sequence>
        </div>
        {/* sombra arriba y abajo solo para que se lean los textos */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.62) 100%)'}} />
      </AbsoluteFill>
    </Ventana>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
const ICONO = {
  persona: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z',
  clienteNuevo: ICONOS.clienteNuevo,
  portatil: ICONOS.portatil,
  telefono: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z',
  megafono: ICONOS.megafono,
  etiqueta: ICONOS.etiqueta,
  caja: 'M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2zm0 2.2L5.6 7.4 12 10.6l6.4-3.2L12 4.2zM5 9v7.3l6 3v-7.3L5 9zm14 0l-6 3v7.3l6-3V9z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  codigo: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  chat: 'M4 4h16v12H7l-3 3V4z',
  grafica: 'M5 19h14v2H3V3h2v16zm2-2V9h3v8H7zm5 0V5h3v12h-3zm5 0v-6h3v6h-3z',
  correo: 'M3 5h18v14H3V5zm2 2v.5l7 4.5 7-4.5V7H5zm0 3v7h14v-7l-7 4.5L5 10z',
};
const ROJO = '#ff4d5e';
const VERDE = '#2ee59d';
const SOMBRA_ICONOS = 'drop-shadow(0 3px 10px rgba(0,0,0,0.75))';
// Ficha redonda con icono: sale con muelle (aplastar/estirar y un giro que se asienta), el icono se traza y se rellena,
// lanza un pulso y una ráfaga de partículas, y después flota
const Chip: React.FC<{t: number; en: number; d: string; x: number; y: number; r?: number; color?: string; fondo?: string; fase?: number; quieto?: boolean}> = ({
  t, en, d, x, y, r = 62, color = '#1b1b20', fondo = C.amarillo, fase = 0, quieto,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 14);
  const fl = quieto ? {y: 0, s: 1} : flota(t, fase, 4);
  return (
    <g transform={`translate(${x} ${y + fl.y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={r} color={fondo === '#fff' ? '#fff' : fondo} />
      <g transform={`scale(${ap.sx * fl.s} ${ap.sy * fl.s}) rotate(${ap.rot})`}>
        <circle r={r} fill={fondo} stroke="#fff" strokeWidth={5} />
        <IconoTrazado d={d} t={t} en={en + 2 * F} color={color} size={r * 1.1} x={-r * 0.55} y={-r * 0.55} />
      </g>
      <Particulas t={t} en={en} x={0} y={0} n={8} radio={r * 1.9} colores={[fondo === '#fff' ? C.amarillo : fondo, '#ffffff']} />
    </g>
  );
};
// Conector que se dibuja con un cometa en la punta y, ya dibujado, deja correr puntos por él (flujo)
const Conector: React.FC<{t: number; en: number; d: string; color?: string; dur?: number; flujo?: boolean; punta?: [number, number, number]}> = ({t, en, d, color = '#fff', dur = 0.45, flujo, punta}) => {
  const p = 1 - Math.pow(1 - lim((t - en) / dur), 3);
  if (p <= 0) return null;
  const ap = aparece(t, en + dur, 0);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      {flujo && p >= 1 && <path d={d} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="0.03 0.12" strokeDashoffset={-(t - en) * 0.6} opacity={0.9} />}
      {punta && p >= 1 && (
        <g transform={`translate(${punta[0]} ${punta[1]}) scale(${ap.sx} ${ap.sy}) translate(${-punta[0]} ${-punta[1]})`}>
          <path d={puntaFlecha(punta[0], punta[1], punta[2], 26, 18)} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

// 1) Montaje del ciclo: cuatro pasos que saltan al decirse, conectores con flujo y una flecha que vuelve al principio (se repite)
const PASOS9 = [{en: 12.16, d: ICONO.clienteNuevo}, {en: 13.6, d: ICONO.portatil}, {en: 14.8, d: ICONO.telefono}, {en: 16.24, d: ICONO.portatil}];
const CicloFreelance: React.FC<{t: number}> = ({t}) => {
  const a = 12.16, b = 17.88;
  const xs = [255, 445, 635, 825];
  const vuelta = 1 - Math.pow(1 - lim((t - 16.3) / 0.7), 3);
  // la flecha de vuelta: de la última ficha a la primera por debajo (la punta mira hacia arriba, al llegar)
  const ret = 'M 825 132 C 825 220, 255 220, 255 132';
  const cometa = (k: number) => {
    const u = 1 - k;
    return [u * u * u * 825 + 3 * u * u * k * 825 + 3 * u * k * k * 255 + k * k * k * 255, u * u * u * 132 + 3 * u * u * k * 220 + 3 * u * k * k * 220 + k * k * k * 132];
  };
  const [qx, qy] = cometa(vuelta);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 1600, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={260}>
        {xs.slice(0, 3).map((x, i) => (
          <Conector key={i} t={t} en={PASOS9[i + 1].en - 0.25} d={`M ${x + 58} 70 L ${xs[i + 1] - 58} 70`} color="rgba(255,255,255,0.7)" dur={0.25} flujo />
        ))}
        {vuelta > 0 && (
          <g style={{filter: `drop-shadow(0 0 8px ${ROJO})`}}>
            <path d={ret} fill="none" stroke={ROJO} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - vuelta} />
            {vuelta < 1 && <circle cx={qx} cy={qy} r={10} fill="#fff" />}
            {vuelta >= 1 && <path d={puntaFlecha(255, 124, -Math.PI / 2, 24, 18)} fill="none" stroke={ROJO} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        )}
        {PASOS9.map((p, i) => {
          const activo = t >= p.en && (i === PASOS9.length - 1 || t < PASOS9[i + 1].en);
          return t < p.en ? (
            <circle key={i} cx={xs[i]} cy={70} r={18 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" />
          ) : (
            <Chip key={i} t={t} en={p.en} d={p.d} x={xs[i]} y={70} r={activo ? 58 : 46} fondo={activo ? C.amarillo : '#fff'} fase={i} />
          );
        })}
      </svg>
    </Ventana>
  );
};

// 2) "no tiene suficientes horas": un reloj despertador que tiembla, la aguja corre, se llena y salta en rojo al decir "horas"
const RELOJ = {a: 20.6, b: 22.5, horas: 22.2};
const Reloj: React.FC<{t: number}> = ({t}) => {
  const {a, b, horas} = RELOJ;
  const ap = aparece(t, a, -12);
  const ang = (t - a) * 720;
  const rojo = lim((t - horas + 0.3) / 0.3);
  const lleno = lim((t - a) / (horas - a));
  const col = rojo > 0.5 ? ROJO : C.amarillo;
  const r = 96;
  const tiembla = Math.sin(t * 70) * (2 + 5 * rojo);
  const salto = t > horas ? Math.exp(-5 * (t - horas)) * Math.sin((t - horas) * 30) * 0.12 : 0;
  const arco = (f: number) => {
    const g = -Math.PI / 2 + f * Math.PI * 2 * 0.999;
    return `M 0 ${-r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${Math.cos(g) * r} ${Math.sin(g) * r} L 0 0 Z`;
  };
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 540 - 150, top: 120, overflow: 'visible', filter: SOMBRA_ICONOS}} width={300} height={300}>
        <g transform={`translate(150 150) scale(${ap.sx * (1 + salto)} ${ap.sy * (1 - salto)}) rotate(${ap.rot + tiembla})`}>
          {/* campanas del despertador */}
          {[-1, 1].map((l) => <circle key={l} cx={l * 70} cy={-92} r={26} fill={col} stroke="#fff" strokeWidth={4} />)}
          <circle r={r + 14} fill="rgba(16,16,20,0.9)" stroke={col} strokeWidth={8} style={{filter: `drop-shadow(0 0 12px ${col})`}} />
          <path d={arco(lleno)} fill={col} opacity={0.35} />
          {Array.from({length: 12}, (_, i) => (
            <line key={i} x1={0} y1={-r + 4} x2={0} y2={-r + 18} stroke="#fff" strokeWidth={5} strokeLinecap="round" transform={`rotate(${i * 30})`} />
          ))}
          <line x1={0} y1={0} x2={0} y2={-r + 26} stroke="#fff" strokeWidth={8} strokeLinecap="round" transform={`rotate(${ang})`} />
          <circle r={10} fill={col} />
        </g>
        <Particulas t={t} en={horas} x={150} y={150} n={12} radio={170} colores={[ROJO, '#ffffff']} />
      </svg>
    </Ventana>
  );
};

// 3) "la captación y la entrega dependen de la misma persona": dos fichas lanzan flechas con flujo que acaban en una sola persona,
// que se pone en rojo y tiembla por la sobrecarga
const CONVERGE = {a: 23.52, b: 26.95, captacion: 23.8, entrega: 24.68, persona: 26.04};
const Converge: React.FC<{t: number}> = ({t}) => {
  const {a, b, captacion, entrega, persona} = CONVERGE;
  const tiembla = t > persona && t < persona + 0.6 ? Math.sin((t - persona) * 70) * 6 * (1 - (t - persona) / 0.6) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 110, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={400}>
        <Chip t={t} en={captacion} d={ICONO.megafono} x={290} y={90} fase={0} />
        <Chip t={t} en={entrega} d={ICONO.caja} x={790} y={90} fase={1.5} />
        <Conector t={t} en={captacion + 0.3} d="M 345 140 Q 420 250 470 272" flujo punta={[470, 272, Math.atan2(272 - 250, 470 - 420)]} />
        <Conector t={t} en={entrega + 0.3} d="M 735 140 Q 660 250 610 272" flujo punta={[610, 272, Math.atan2(272 - 250, 610 - 660)]} />
        <g transform={`translate(${tiembla} 0)`}>
          <Chip t={t} en={persona} d={ICONO.persona} x={540} y={300} r={74} fondo={ROJO} color="#fff" quieto />
        </g>
      </svg>
    </Ventana>
  );
};

// 4) "una agencia tiene dos patas": la plataforma cae y rebota, las patas crecen con un estirón; la primera, la segunda y las dos se encienden
const PATAS = {a: 27.0, b: 37.3, dos: 29.28, patas: 29.56, primera: 29.96, segunda: 31.88, ambas: 36.08};
const Patas: React.FC<{t: number}> = ({t}) => {
  const {a, b, dos, patas, primera, segunda, ambas} = PATAS;
  const cae = muelle(t, a + 0.15, 1.8, 6);
  const luz = (on: boolean) => (on ? C.amarillo : 'rgba(255,255,255,0.92)');
  const l1 = t >= ambas || (t >= primera && t < segunda);
  const l2 = t >= ambas || (t >= segunda && t < ambas);
  const fl = flota(t, 0.5, 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 110 + fl.y, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={380}>
        {[[350, dos, l1, ICONO.megafono, primera], [730, patas, l2, ICONO.caja, segunda]].map(([x, en, on, d, enciende], i) => {
          const p = muelle(t, en as number, 2.2, 6);
          if (t < (en as number)) return null;
          return (
            <g key={i}>
              <rect x={(x as number) - 22 * (2 - p)} y={96} width={44 * (2 - p)} height={170 * p} rx={22} fill={luz(on as boolean)} style={{filter: on ? `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
              {p > 0.6 && <Chip t={t} en={(en as number) + 0.15} d={d as string} x={x as number} y={300} r={50} fondo={on ? C.amarillo : '#fff'} fase={i * 2} />}
              <Pulso t={t} en={enciende as number} x={x as number} y={300} r={56} color={C.amarillo} />
            </g>
          );
        })}
        <g transform={`translate(540 ${70 - (1 - cae) * 160})`}>
          <rect x={-260} y={-26} width={520} height={52} rx={26} fill="rgba(16,16,20,0.9)" stroke="#fff" strokeWidth={6} />
          <g transform={`rotate(${(t - a) * 60}) translate(-22 -22) scale(1.83)`}><path d={ICONO.engranaje} fill={C.amarillo} /></g>
        </g>
        <Particulas t={t} en={ambas} x={540} y={70} n={14} radio={260} />
      </svg>
    </Ventana>
  );
};

// 5) Pizarra comparativa: FREELANCER (todo depende de ti) frente a AGENCIA (procesos + equipo)
const TAREAS = [ICONO.engranaje, ICONO.codigo, ICONO.chat, ICONO.grafica, ICONO.correo, ICONO.telefono];
const FondoPizarra: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 95% 70% at 50% 36%, #232838 0%, #12141b 64%, #0b0c10 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2px)', backgroundSize: '44px 44px'}} />
  </AbsoluteFill>
);
const Tarjeta: React.FC<{t: number; t0: number; lado: number; left: number; titulo: string; sub: string; activa: boolean; color: string; children: React.ReactNode}> = ({
  t, t0, lado, left, titulo, sub, activa, color, children,
}) => {
  const m = muelle(t, t0 + (lado > 0 ? 0.1 : 0), 2.2, 7);
  const escribe = lim((t - t0 - 0.25) / 0.45);
  const respira = 0.8 + 0.2 * Math.sin(t * 4);
  return (
    <div style={{position: 'absolute', left, top: 220, width: 430, height: 760, borderRadius: 38, background: activa ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
      border: `4px solid ${activa ? color : 'rgba(255,255,255,0.18)'}`, boxShadow: activa ? `0 0 ${34 * respira}px ${color}66` : 'none', opacity: (activa ? 1 : 0.6) * lim(m * 1.6), overflow: 'hidden',
      translate: `${(1 - m) * lado * 170}px 0px`, scale: `${activa ? 1.02 : 0.98}`}}>
      <div style={{padding: '28px 0 0', textAlign: 'center', clipPath: `inset(-10% ${(1 - escribe) * 100}% -10% -5%)`}}>
        <div style={{...H, fontSize: 46, color: activa ? color : '#fff'}}>{titulo}</div>
        <div style={{...H, fontSize: 28, marginTop: 6, color: '#fff', opacity: 0.85}}>{sub}</div>
      </div>
      {children}
    </div>
  );
};
const Comparativa: React.FC<{t: number}> = ({t}) => {
  const {a, b, personal, agencia, especialistas, implementar} = COMPARA;
  if (t < a || t >= b) return null;
  const izq = t < agencia;
  // izquierda: todas las tareas caen sobre una sola persona (y tiembla al decir "personalmente")
  const tiembla = t > personal && t < agencia ? Math.sin((t - personal) * 40) * 4 : 0;
  return (
    <AbsoluteFill>
      <FondoPizarra />
      <Tarjeta t={t} t0={a} lado={-1} left={100} titulo="FREELANCER" sub="TODO DEPENDE DE TI" activa={izq} color={rosa.color as string}>
        <svg width={430} height={600} style={{position: 'absolute', left: 0, top: 150, overflow: 'visible'}}>
          {TAREAS.map((d, i) => {
            const en = a + 0.3 + i * 0.22;
            const ang = -Math.PI / 2 + ((i - 2.5) / 6) * Math.PI * 1.3;
            const p = muelle(t, en, 2.3, 6.5);
            if (t < en) return null;
            const fl = flota(t, i, 3);
            const x = 215 + Math.cos(ang) * 150 * p, y = 330 + Math.sin(ang) * 150 * p + fl.y;
            return (
              <g key={i}>
                <line x1={215} y1={330} x2={x} y2={y} stroke="rgba(255,255,255,0.35)" strokeWidth={4} />
                <g transform={`translate(${x} ${y}) rotate(${(1 - lim((t - en) / 0.5)) * 30 * (i % 2 ? 1 : -1)})`}>
                  <rect x={-38} y={-38} width={76} height={76} rx={20} fill="rgba(16,16,20,0.9)" stroke="#fff" strokeWidth={4} />
                  <IconoTrazado d={d} t={t} en={en + 0.1} color="#fff" size={40} x={-20} y={-20} />
                </g>
              </g>
            );
          })}
          <g transform={`translate(${215 + tiembla} 330)`}>
            <circle r={66} fill={t > personal ? ROJO : 'rgba(255,255,255,0.9)'} stroke="#fff" strokeWidth={5} style={{filter: t > personal ? `drop-shadow(0 0 16px ${ROJO})` : 'none'}} />
            <g transform="translate(-36 -36) scale(3)"><path d={ICONO.persona} fill={t > personal ? '#fff' : '#1b1b20'} /></g>
          </g>
          <Pulso t={t} en={personal} x={215} y={330} r={70} color={ROJO} />
        </svg>
      </Tarjeta>
      <Tarjeta t={t} t0={a} lado={1} left={550} titulo="AGENCIA" sub="PROCESOS + EQUIPO" activa={!izq} color={C.amarillo}>
        <svg width={430} height={600} style={{position: 'absolute', left: 0, top: 150, overflow: 'visible'}}>
          {/* tú sigues al frente: coordinas y respondes de la entrega */}
          <g transform={`translate(215 ${110 + (izq ? 0 : flota(t, 0, 4).y)})`}>
            <circle r={60} fill={C.amarillo} stroke="#fff" strokeWidth={5} style={{filter: !izq ? `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},0.9))` : 'none'}} />
            <g transform="translate(-33 -33) scale(2.75)"><path d={ICONO.persona} fill="#1b1b20" /></g>
          </g>
          {/* proceso: conectores con flujo que bajan a los especialistas; cada uno recibe una tarea concreta para implementarla */}
          {[90, 215, 340].map((x, i) => {
            const en = especialistas + i * 0.14;
            const vuela = 1 - Math.pow(1 - lim((t - implementar - i * 0.15) / 0.55), 3);
            const tx = 215 + (x - 215) * vuela, ty = 110 + (470 - 110) * vuela - Math.sin(vuela * Math.PI) * 60;
            return (
              <g key={i}>
                <Conector t={t} en={en - 0.25} d={`M 215 175 C 215 240, ${x} 240, ${x} 300`} color={C.amarillo} dur={0.3} flujo />
                <Chip t={t} en={en} d={ICONO.persona} x={x} y={360} r={52} fondo="rgba(16,16,20,0.9)" color="#fff" fase={i} />
                {t >= implementar + i * 0.15 && (
                  <g transform={`translate(${tx} ${ty}) rotate(${(1 - vuela) * 180}) scale(${0.7 + 0.3 * vuela})`}>
                    <rect x={-30} y={-30} width={60} height={60} rx={16} fill={C.amarillo} />
                    <g transform="translate(-17 -17) scale(1.42)"><path d={TAREAS[i]} fill="#1b1b20" /></g>
                  </g>
                )}
                <Particulas t={t} en={implementar + i * 0.15 + 0.55} x={x} y={470} n={7} radio={70} />
              </g>
            );
          })}
        </svg>
      </Tarjeta>
    </AbsoluteFill>
  );
};

// 6) "tu responsabilidad sigue siendo que el servicio se entregue bien": el aro se dibuja y el ✓ se traza con una ráfaga
const Bien: React.FC<{t: number}> = ({t}) => {
  const en = 50.84, a = 50.5, b = 51.3;
  const d = 150, per = Math.PI * (d - 10);
  const aro = lim((t - a) / (9 * F));
  const ap = aparece(t, en, 10);
  const tr = lim((t - en - 2 * F) / (6 * F));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 540 - 150, top: 140, overflow: 'visible', filter: SOMBRA_ICONOS}} width={300} height={300}>
        <g transform={`translate(150 150) scale(${t >= en ? ap.sx : 0.92} ${t >= en ? ap.sy : 0.92}) rotate(${ap.rot})`}>
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

// 7) "aprender a gestionar una agencia es tan importante como aprender a vender": balanza con física de muelle
// (primero pesa gestionar, al decir "tan importante como" se equilibra oscilando, y al llegar "vender" rebota y queda nivelada)
const BALANZA = {a: 60.68, b: 65.7, gestionar: 61.36, igual: 62.52, vender: 64.4};
const Balanza: React.FC<{t: number}> = ({t}) => {
  const {a, b, gestionar, igual, vender} = BALANZA;
  const osc = (t0: number, de: number, a1: number) => a1 + (de - a1) * Math.exp(-4 * (t - t0)) * Math.cos((t - t0) * 11);
  const inc = t < gestionar ? 0 : t < igual ? osc(gestionar, 0, -12) : t < vender ? osc(igual, -12, 0) : osc(vender, 6, 0);
  const brazo = muelle(t, a, 2, 7);
  const ap = aparece(t, a, 0);
  const plato = (lado: number, d: string, en: number, fase: number) => {
    const gx = lado * 200 * Math.cos((inc * Math.PI) / 180), gy = lado * 200 * Math.sin((inc * Math.PI) / 180);
    const balanceo = Math.sin(t * 3 + fase) * 3 - inc * 0.4;
    return (
      <g transform={`translate(${gx} ${gy}) rotate(${balanceo})`}>
        <line x1={0} y1={0} x2={0} y2={70} stroke="#fff" strokeWidth={4} />
        <path d="M -80 70 Q 0 120 80 70 Z" fill="rgba(16,16,20,0.85)" stroke="#fff" strokeWidth={5} />
        <Chip t={t} en={en} d={d} x={0} y={30} r={44} quieto />
      </g>
    );
  };
  return (
    <Ventana suave t={t} a={a} b={b}>
      <svg style={{position: 'absolute', left: 0, top: 120, overflow: 'visible', filter: SOMBRA_ICONOS}} width={1080} height={360}>
        <g transform={`translate(540 90) scale(${ap.sx} ${ap.sy})`}>
          <path d="M -34 230 L 34 230 L 0 0 Z" fill="rgba(16,16,20,0.85)" stroke="#fff" strokeWidth={5} />
          <g transform={`rotate(${inc}) scale(${brazo} 1)`}>
            <rect x={-215} y={-7} width={430} height={14} rx={7} fill="#fff" />
          </g>
          <circle r={14} fill={C.amarillo} />
          {brazo > 0.9 && plato(-1, ICONO.engranaje, gestionar, 0)}
          {brazo > 0.9 && plato(1, ICONO.etiqueta, vender, 1.4)}
        </g>
        <Destello t={t} en={igual + 0.4} x={540} y={60} tam={28} color={C.amarillo} />
      </svg>
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
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean; abajo?: boolean; estilo?: React.CSSProperties};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
const rosaFuerte: React.CSSProperties = {...rosa, textShadow: glow('255,177,191', 1.3)};
// Solo frases CORTAS en grande, alternando con frases en subtítulo. En el montaje y en la pizarra, todas las frases van en grande.
const GRANDES: Grande[] = [
  // HOOK (detrás de Álvaro): si montas una agencia y absolutamente todo depende de ti
  {a: 0.04, b: 3.3, top: 60, lineas: [{ws: [['si', 0.04], ['montas', 0.24]], size: 84}, {ws: [['una', 0.64], ['agencia', 0.84]], size: 100},
    {ws: [['y', 1.24], ['absolutamente', 1.36]], size: 80, abajo: true}, {ws: [['todo', 2.16, amarillo]], size: 150, golpe: true, abajo: true}, {ws: [['depende', 2.6], ['de', 2.96], ['ti', 3.12]], size: 90, abajo: true}]},
  // Has creado otro trabajo
  {a: 6.08, b: 7.8, top: 960, lineas: [{ws: [['has', 6.08], ['creado', 6.32]], size: 96}, {ws: [['otro trabajo', 6.92, rosaFuerte]], size: 150, golpe: true}]},
  // Montaje del ciclo (B-roll, texto abajo: las caras están arriba)
  {a: 12.16, b: 13.56, top: 1150, lineas: [{ws: [['consigue', 12.16]], size: 96}, {ws: [['un cliente', 12.68, amarillo]], size: 130, golpe: true}]},
  {a: 13.6, b: 14.76, top: 1150, lineas: [{ws: [['hace', 13.6], ['todo', 13.92]], size: 96}, {ws: [['el trabajo', 14.12, amarillo]], size: 130, golpe: true}]},
  {a: 14.8, b: 16.2, top: 1150, lineas: [{ws: [['busca', 14.8], ['el', 15.12]], size: 90}, {ws: [['siguiente', 15.2, amarillo]], size: 130, golpe: true}, {ws: [['cliente', 15.52]], size: 110}]},
  {a: 16.24, b: 17.7, top: 1150, lineas: [{ws: [['vuelve', 16.24], ['a', 16.72], ['hacer', 16.8]], size: 90}, {ws: [['todo', 17.04], ['el', 17.28]], size: 100}, {ws: [['trabajo', 17.44, rosaFuerte]], size: 140, golpe: true}]},
  // ¿Cuál es el problema?
  {a: 22.52, b: 23.5, top: 960, lineas: [{ws: [['¿cuál', 22.52], ['es', 22.76], ['el', 22.88]], size: 90}, {ws: [['problema?', 23.0, rosaFuerte]], size: 150, golpe: true}]},
  // La primera es conseguir clientes
  {a: 29.96, b: 31.84, top: 960, lineas: [{ws: [['la', 29.96], ['primera', 30.12], ['es', 30.64]], size: 90}, {ws: [['conseguir', 30.76, amarillo]], size: 130, golpe: true}, {ws: [['clientes', 31.24]], size: 110}]},
  // Pizarra: pero no necesariamente tienes que ejecutar personalmente cada tarea técnica. En una agencia de inteligencia artificial
  // puedes apoyarte en especialistas para implementar determinadas soluciones.
  {a: 37.44, b: 39.5, top: 1080, lineas: [{ws: [['pero', 37.44], ['no', 37.72]], size: 84}, {ws: [['necesariamente', 37.84]], size: 90}, {ws: [['tienes', 38.6], ['que', 38.92], ['ejecutar', 39.04]], size: 84}]},
  {a: 39.56, b: 41.9, top: 1080, lineas: [{ws: [['personalmente', 39.56, rosaFuerte]], size: 120, golpe: true}, {ws: [['cada', 40.64], ['tarea', 41.04], ['técnica', 41.44]], size: 84}]},
  {a: 41.96, b: 43.8, top: 1080, lineas: [{ws: [['en', 41.96], ['una', 42.16], ['agencia', 42.28]], size: 84}, {ws: [['de', 42.6], ['inteligencia', 42.68]], size: 84}, {ws: [['artificial', 43.16]], size: 96}]},
  {a: 43.84, b: 45.5, top: 1080, lineas: [{ws: [['puedes', 43.84], ['apoyarte', 44.16], ['en', 44.56]], size: 84}, {ws: [['especialistas', 44.64, amarillo]], size: 120, golpe: true}]},
  {a: 45.52, b: 47.6, top: 1080, lineas: [{ws: [['para', 45.52], ['implementar', 45.72]], size: 84}, {ws: [['determinadas', 46.48]], size: 90}, {ws: [['soluciones', 47.32]], size: 100}]},
  // Lo que cambia es cómo organizas el trabajo
  {a: 51.24, b: 53.84, top: 960, lineas: [{ws: [['lo', 51.24], ['que', 51.44], ['cambia', 51.6], ['es', 52.04]], size: 84}, {ws: [['cómo', 52.32]], size: 100}, {ws: [['organizas', 52.72, amarillo]], size: 140, golpe: true}, {ws: [['el', 53.24], ['trabajo', 53.44]], size: 90}]},
];
const LISTA: [number, number] = [-10, -10];
const CTA = 68.52;
const CTA_FIN = DURACION_A9; // "haz clic aquí abajo" hasta el final
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
const CLAVE = new Set(['agencia', 'empresa', 'errores', 'horas', 'captación', 'entrega', 'persona', 'patas', 'servicios', 'importantes', 'responsabilidad', 'bien', 'programa', 'expertos', 'gestionar', 'vender', 'sistema']);

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
const DETRAS: [number, number][] = [[0, 3.6]];

export const ReelA9: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A9)} layout="none">
            <Video src={staticFile('a9/a9.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a9/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
            </Sequence>
          ))}
        </div>
        {BROLL.map((b) => (
          <Broll key={b.src} t={t} b={b} />
        ))}
        <Comparativa t={t} />
      </ConTransicion>

      {hook.map((g) => (
        <FraseGrande key={`ab${g.a}`} t={t} g={g} parte="abajo" />
      ))}

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <CicloFreelance t={t} />
      <Reloj t={t} />
      <Converge t={t} />
      <Patas t={t} />
      <Bien t={t} />
      <Balanza t={t} />

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={68.52}>haz</Sube>
          <Sube t={t} en={68.84}>clic</Sube>
          <Sube t={t} en={69.22}>aquí</Sube>
          <Sube t={t} en={69.5} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 69.7 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 69.7)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 68.52, 68.84, 69.22, 69.5].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 0.84, -5], ['boom', 2.16, -3], ['risercorto', 6.3, -8], ['cineboom', 6.92, -3],
        ['pop', 12.68, -5], ['pop', 13.92, -5], ['pop', 15.2, -5], ['negativo', 17.44, -6],
        ['loading', 20.6, -10], ['alerta', 22.2, -8], ['boom', 23.0, -3],
        ['pop', 23.8, -6], ['pop', 24.68, -6], ['negativo', 26.04, -7],
        ['pop', 29.28, -6], ['pop', 29.56, -6], ['cineboom', 30.76, -4], ['exito', 36.68, -8],
        ['datos', 37.7, -10], ['negativo', 39.56, -7], ['pop', 44.64, -6], ['exito', 45.72, -7],
        ['ding', 50.84, -8], ['boom', 52.72, -3],
        ['pop', 61.36, -6], ['tap', 62.52, -7], ['pop', 64.4, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
