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
import {ICONOS, Check, Chip, Conector, IconoTrazado, Lienzo, OSCURO, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle, puntaFlecha} from '../lottie';
import {ICONO10} from '../a10/iconos';
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

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
// Sin ráfagas, rayas ni subrayados sobre los títulos: el texto grande entra limpio
const lim = (x: number) => Math.min(1, Math.max(0, x));
const ICONO = {
  bandera: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
  edificio: ICONO10.edificio,
  herramienta: ICONO10.herramienta,
  bombilla: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  etiqueta: ICONO10.etiqueta,
  lupa: ICONOS.lupa,
  caja: ICONO10.caja,
  llamadaPerdida: 'M6.5 5.5L12 11l7-7-1-1-6 6-4.5-4.5H11V3H5v6h1.5V5.5zm17.21 11.17C20.66 13.78 16.54 12 12 12 7.46 12 3.34 13.78.29 16.67c-.18.18-.29.43-.29.71s.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9v-3.1c1.45-.48 3-.73 4.6-.73 1.6 0 3.15.25 4.6.72v3.1c0 .39.23.74.56.9.98.49 1.87 1.12 2.67 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71s-.12-.52-.3-.7z',
};

// 1) "esforzarte para conseguir algo y esforzarte únicamente para llegar a final de mes": a la izquierda una flecha que
// sube hasta una bandera (conseguir algo); a la derecha una flecha que da vueltas sin parar alrededor del calendario (fin de mes)
const ESFUERZO = {a: 13.2, b: 17.8, sube: 14.04, bandera: 14.24, rueda: 15.28, mes: 17.16};
const Esfuerzo: React.FC<{t: number}> = ({t}) => {
  const {a, b, sube, bandera, rueda, mes} = ESFUERZO;
  // subida en escalones hacia la bandera
  const dSube = 'M 150 350 L 230 350 L 230 290 L 310 290 L 310 230 L 380 230 L 380 175';
  const pSube = lim((t - sube) / 0.45);
  const giro = (t - rueda) * 260;
  const R = 92;
  const ap = aparece(t, rueda, 0);
  const vuelta = 1 - Math.pow(1 - lim((t - rueda) / 0.45), 3);
  const g1 = ((giro - 90) * Math.PI) / 180;
  const ex = 760 + Math.cos(g1) * R, ey = 240 + Math.sin(g1) * R;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <path d={dSube} fill="none" stroke={C.amarillo} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - (1 - Math.pow(1 - pSube, 3))}
          style={{filter: `drop-shadow(0 0 8px rgba(${GLOW_AMARILLO},0.8))`}} />
        {pSube >= 1 && <path d={puntaFlecha(380, 172, -Math.PI / 2, 26, 18)} fill="none" stroke={C.amarillo} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />}
        <Chip t={t} en={bandera} d={ICONO.bandera} x={380} y={120} r={52} fase={0.4} />
        {t >= rueda && (
          <g>
            <g transform={`translate(760 240) scale(${ap.sx} ${ap.sy})`}>
              <circle r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={10} />
              <g transform={`rotate(${giro})`}>
                <circle r={R} fill="none" stroke={ROJO} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * R * 0.72 * vuelta} ${2 * Math.PI * R}`} transform="rotate(-90)"
                  style={{filter: `drop-shadow(0 0 8px ${ROJO})`}} />
              </g>
            </g>
            {vuelta >= 1 && <path d={puntaFlecha(ex, ey, g1 + Math.PI / 2 + (giro > 0 ? 0 : Math.PI), 24, 17)} fill="none" stroke={ROJO} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"
              transform={`rotate(${0.72 * 360 - 360} 760 240)`} />}
          </g>
        )}
        <Chip t={t} en={rueda + 0.1} d={ICONO.calendario} x={760} y={240} r={54} fondo="#fff" quieto />
        <Pulso t={t} en={mes} x={760} y={240} r={60} color={ROJO} />
      </Lienzo>
    </Ventana>
  );
};

// 2) "parece que no te queda tiempo para nada": un reloj de arena cae con muelle, la arena se vacía a toda prisa
// y al decir "nada" queda vacío, se pone en rojo y tiembla
const ARENA = {a: 20.3, b: 22.15, sale: 20.6, vacia: 21.8};
const RelojArena: React.FC<{t: number}> = ({t}) => {
  const {a, b, sale, vacia} = ARENA;
  const ap = aparece(t, sale, -14);
  const fl = flota(t, 1, 4);
  const q = lim((t - sale - 0.1) / (vacia - sale - 0.1));
  const rojo = t >= vacia;
  const tiembla = rojo && t < vacia + 0.4 ? Math.sin((t - vacia) * 70) * 7 * (1 - (t - vacia) / 0.4) : 0;
  const col = rojo ? ROJO : C.amarillo;
  // arena de arriba (se vacía) y de abajo (se llena); hilo que cae
  const arriba = 1 - q, abajo = q;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${540 + tiembla} ${230 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot + tiembla * 0.6})`}>
          <rect x={-86} y={-128} width={172} height={22} rx={11} fill="#fff" />
          <rect x={-86} y={106} width={172} height={22} rx={11} fill="#fff" />
          <path d="M -66 -106 L 66 -106 C 66 -40, 12 -18, 12 0 C 12 18, 66 40, 66 106 L -66 106 C -66 40, -12 18, -12 0 C -12 -18, -66 -40, -66 -106 Z" fill={OSCURO} stroke="#fff" strokeWidth={6} />
          <clipPath id="arenaArriba"><path d="M -60 -100 L 60 -100 C 60 -40, 8 -18, 8 0 L -8 0 C -8 -18, -60 -40, -60 -100 Z" /></clipPath>
          <clipPath id="arenaAbajo"><path d="M -8 0 C -8 18, -60 40, -60 100 L 60 100 C 60 40, 8 18, 8 0 Z" /></clipPath>
          <rect x={-70} y={-100 + 100 * (1 - arriba)} width={140} height={100} fill={col} clipPath="url(#arenaArriba)" style={{filter: `drop-shadow(0 0 6px ${col})`}} />
          <rect x={-70} y={100 - 100 * abajo} width={140} height={100} fill={col} clipPath="url(#arenaAbajo)" />
          {q > 0 && q < 1 && <rect x={-3} y={-4} width={6} height={100 - 100 * abajo + 4} fill={col} />}
        </g>
        <Particulas t={t} en={vacia} x={540} y={230} n={10} radio={150} colores={[ROJO, '#ffffff']} />
      </Lienzo>
    </Ventana>
  );
};

// 3) "hay empresas que necesitan ayuda": tres empresas caen arriba y al decir "ayuda" les salta una alerta;
// después ("contratar servicios que les ayuden a resolver esos problemas") baja la ficha del servicio,
// se conecta con las tres y las alertas se convierten en ✓
const XS_EMP = [250, 540, 830];
const YS_EMP = [180, 125, 180];
const EMPRESAS = {a: 26.2, b: 29.5, salen: 26.44, ayuda: 27.6};
const RESOLVER = {a: 39.4, b: 45.3, salen: 39.72, servicio: 41.04, lineas: 41.4, resuelve: 42.68};
const Empresa: React.FC<{t: number; i: number; en: number; alerta: number; resuelta?: number}> = ({t, i, en, alerta, resuelta = 999}) => {
  if (t < en) return null;
  const ap = aparece(t, en, i % 2 ? 12 : -12);
  const fl = flota(t, i * 1.2, 4);
  const ok = t >= resuelta;
  const b2 = aparece(t, ok ? resuelta : alerta, 0);
  const sacude = t > alerta && t < alerta + 0.4 && !ok ? Math.sin((t - alerta) * 60) * 5 * (1 - (t - alerta) / 0.4) : 0;
  return (
    <g transform={`translate(${XS_EMP[i] + sacude} ${YS_EMP[i]}) translate(0 ${fl.y})`}>
      <Pulso t={t} en={en} x={0} y={0} r={60} color="#fff" />
      <g transform={`scale(${ap.sx * fl.s} ${ap.sy * fl.s}) rotate(${ap.rot})`}>
        <circle r={60} fill="#fff" stroke="#fff" strokeWidth={5} />
        <IconoTrazado d={ICONO.edificio} t={t} en={en + 2 * F} color="#1b1b20" size={66} x={-33} y={-34} />
      </g>
      {t >= alerta && (
        <g transform={`translate(46 -46) scale(${b2.sx} ${b2.sy})`}>
          <circle r={25} fill={ok ? VERDE : ROJO} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 10px ${ok ? VERDE : ROJO})`}} />
          {ok ? <Check t={t} en={resuelta + F} s={0.62} /> : (
            <g>
              <rect x={-3.5} y={-14} width={7} height={17} rx={3.5} fill="#fff" />
              <circle cy={9} r={4} fill="#fff" />
            </g>
          )}
        </g>
      )}
      <Particulas t={t} en={resuelta} x={0} y={0} n={9} radio={110} colores={[VERDE, '#ffffff']} />
    </g>
  );
};
const EmpresasAyuda: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={EMPRESAS.a} b={EMPRESAS.b}>
    <Lienzo>
      {XS_EMP.map((_, i) => <Empresa key={i} t={t} i={i} en={EMPRESAS.salen + i * 0.1} alerta={EMPRESAS.ayuda + i * 0.08} />)}
    </Lienzo>
  </Ventana>
);
const Resolver: React.FC<{t: number}> = ({t}) => {
  const {a, b, salen, servicio, lineas, resuelve} = RESOLVER;
  const cae = muelle(t, servicio, 2.2, 6.5);
  // la ficha del servicio cae desde arriba con muelle y se queda debajo de las empresas (sin tocar la cabeza)
  const sy = 300 - (1 - cae) * 60;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {[0, 2].map((i, k) => (
          <Conector key={i} t={t} en={lineas + k * 0.1} d={`M ${540 + (i === 0 ? -50 : 50)} 300 Q ${i === 0 ? 380 : 700} 300 ${XS_EMP[i] + (i === 0 ? 30 : -30)} ${YS_EMP[i] + 52}`} color={C.amarillo} dur={0.35} flujo grosor={6} />
        ))}
        <Conector t={t} en={lineas + 0.05} d={`M 540 ${300 - 56} L 540 ${YS_EMP[1] + 64}`} color={C.amarillo} dur={0.3} flujo grosor={6} />
        {XS_EMP.map((_, i) => <Empresa key={i} t={t} i={i} en={salen + i * 0.1} alerta={salen + 0.2 + i * 0.1} resuelta={resuelve + i * 0.14} />)}
        <Chip t={t} en={servicio} d={ICONO.herramienta} x={540} y={sy} r={52} fase={0.8} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "una clínica que pierde llamadas": el anillo se llena de rojo llamada a llamada, el contador salta con cada una
// y de cada llamada perdida sale disparada una ficha roja (abajo, para no tapar la cara del B-roll)
const PERDIDAS = {a: 29.52, b: 31.16, n: 12};
const LlamadasPerdidas: React.FC<{t: number}> = ({t}) => {
  const {a, b, n: N} = PERDIDAS;
  const t0 = a + 0.15, dur = b - a - 0.5;
  const p = lim((t - t0) / dur);
  const n = Math.min(N, Math.floor(p * N + 1e-6));
  const R = 96;
  const per = 2 * Math.PI * R;
  const cx = 540, cy = 1650;
  const ap = aparece(t, a, 0);
  const tn = t0 + (n / N) * dur;
  const salto = n > 0 ? Math.exp(-9 * (t - tn)) * Math.sin((t - tn) * 30) * 0.18 : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${cx} ${cy}) scale(${ap.sx} ${ap.sy})`}>
          <circle r={R + 30} fill={OSCURO} stroke="#fff" strokeWidth={5} />
          <circle r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={18} />
          <circle r={R} fill="none" stroke={ROJO} strokeWidth={18} strokeLinecap="round" strokeDasharray={per} strokeDashoffset={per * (1 - p)} transform="rotate(-90)"
            style={{filter: `drop-shadow(0 0 12px ${ROJO})`}} />
          <g transform="translate(-24 -66) scale(2)"><path d={ICONO.llamadaPerdida} fill={ROJO} /></g>
          <text y={50} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={76} fill="#fff" transform={`scale(${1 + salto})`}>{n}</text>
        </g>
        {Array.from({length: N}, (_, k) => {
          const tk = t0 + ((k + 1) / N) * dur;
          const u = (t - tk) / 0.6;
          if (u < 0 || u > 1) return null;
          const ang = -Math.PI / 2 + ((k + 1) / N) * Math.PI * 2;
          const e = 1 - Math.pow(1 - u, 3);
          const x = cx + Math.cos(ang) * (R + 30 + 90 * e), y = cy + Math.sin(ang) * (R + 30 + 90 * e);
          return (
            <g key={k} transform={`translate(${x} ${y}) scale(${0.6 + 0.4 * Math.sin(u * Math.PI)})`} opacity={1 - u}>
              <circle r={18} fill={ROJO} stroke="#fff" strokeWidth={3} />
              <g transform="translate(-10 -10) scale(0.84)"><path d={ICONO.llamadaPerdida} fill="#fff" /></g>
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 5) "un restaurante que tarda horas en responder mensajes": chat del lado del cliente; los mensajes saltan con muelle,
// el doble check se traza en gris (sin leer) y el reloj de espera corre y se sacude al pasar de hora
const ChatSinResponder: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  const llegadas = [a + 0.15, a + 0.55, a + 0.95];
  const anchos = [0.78, 0.62, 0.7];
  const minutos = Math.round(iv(t, [a + 0.3, b - 0.25], [12, 167], Easing.bezier(0.33, 0, 0.2, 1)));
  const reloj = minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
  const v = muelle(t, a, 2, 6.5);
  const pill = aparece(t, a + 0.3, 0);
  const tiembla = Math.sin(t * 40) * 3 * Math.max(0, Math.sin((t - a) * 2.5));
  return (
    <Ventana suave t={t} a={a} b={b}>
      <div style={{position: 'absolute', left: 140, right: 140, top: 190, borderRadius: 44, background: 'rgba(248,248,250,0.96)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', overflow: 'hidden',
        translate: `0px ${(1 - v) * 120}px`, scale: `${0.88 + 0.12 * v}`, transformOrigin: '50% 100%'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '24px 30px', background: '#fff', borderBottom: '2px solid #ececf0'}}>
          <div style={{position: 'relative', width: 78, height: 78, borderRadius: '50%', background: '#f4a261', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <svg width={44} height={44} viewBox="0 0 24 24"><path fill="#fff" d="M8.1 13.3l2.8-2.8L4 3.6a4 4 0 0 0 0 5.6l4.1 4.1zm6.8-1.8c1.5.7 3.7.2 5.3-1.4 1.9-1.9 2.3-4.7.8-6.2-1.5-1.5-4.3-1.1-6.2.8-1.6 1.6-2.1 3.8-1.4 5.3L3.7 19.8l1.4 1.4 6.9-6.9 6.9 6.9 1.4-1.4-6.9-6.9 1.5-1.4z" /></svg>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 12, flex: 1}}>
            <div style={{height: 22, width: 230, borderRadius: 11, background: '#2b2d31'}} />
            <div style={{height: 16, width: 150, borderRadius: 8, background: '#b9bcc4'}} />
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16, padding: '26px 30px 22px', minHeight: 300}}>
          {llegadas.map((en, k) => {
            const e = aparece(t, en, 4);
            const tick = lim((t - en - 0.2) / 0.25);
            return (
              <div key={k} style={{width: `${anchos[k] * 100}%`, opacity: t < en ? 0 : e.op, scale: `${e.sx} ${e.sy}`, rotate: `${e.rot}deg`, transformOrigin: '100% 100%',
                background: '#3478f6', borderRadius: '30px 30px 8px 30px', padding: '20px 24px', display: 'flex', alignItems: 'flex-end', gap: 14}}>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 10}}>
                  <div style={{height: 16, width: '92%', borderRadius: 8, background: 'rgba(255,255,255,0.85)'}} />
                  {k !== 1 && <div style={{height: 16, width: '55%', borderRadius: 8, background: 'rgba(255,255,255,0.6)'}} />}
                </div>
                <svg width={34} height={20} viewBox="0 0 34 20"><path d="M2 11l5 5L18 4M14 14l2 2L28 4" stroke="rgba(255,255,255,0.6)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"
                  pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tick} /></svg>
              </div>
            );
          })}
        </div>
        <div style={{display: 'flex', justifyContent: 'center', paddingBottom: 26}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px', borderRadius: 999, background: '#ffe9e8', color: '#d62d20', ...H, fontSize: 40, textShadow: 'none',
            opacity: t < a + 0.3 ? 0 : 1, scale: `${pill.sx} ${pill.sy}`, translate: `${tiembla}px 0px`}}>
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

// 6) "entender el modelo, adquirir habilidades y aprender a vender": tres fichas (bombilla, herramienta, etiqueta)
// unidas por conectores que se dibujan con flujo de puntos; cada una salta al decirse
const PASOS = [56.2, 57.36, 59.48];
const ICON_PASOS = [ICONO.bombilla, ICONO.herramienta, ICONO.etiqueta];
const Pasos: React.FC<{t: number}> = ({t}) => {
  const xs = [270, 540, 810];
  const y = 230;
  return (
    <Ventana suave t={t} a={55.6} b={60.76}>
      <Lienzo>
        {[0, 1].map((i) => (
          <Conector key={i} t={t} en={PASOS[i + 1] - 0.3} d={`M ${xs[i] + 66} ${y} L ${xs[i + 1] - 66} ${y}`} color={C.amarillo} dur={0.3} flujo grosor={7}
            punta={[xs[i + 1] - 66, y, 0]} />
        ))}
        {PASOS.map((en, i) => (
          t < en ? <circle key={i} cx={xs[i]} cy={y} r={18 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" /> :
            <Chip key={i} t={t} en={en} d={ICON_PASOS[i]} x={xs[i]} y={y} r={i === PASOS.filter((p) => t >= p).length - 1 ? 64 : 54} fondo={i === PASOS.filter((p) => t >= p).length - 1 ? C.amarillo : '#fff'} fase={i} />
        ))}
      </Lienzo>
    </Ventana>
  );
};

// Viñeta de la lista (detectar un problema / ofrecer una solución / prestar un servicio): ficha con icono que salta con muelle
const Vineta: React.FC<{t: number; en: number; d: string}> = ({t, en, d}) => (
  <svg width={84} height={84} style={{overflow: 'visible', flexShrink: 0}}>
    <Chip t={t} en={en} d={d} x={42} y={42} r={36} fase={en} sinRafaga />
  </svg>
);

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
  {a: 6.84, b: 7.95, top: 130, lineas: [{ws: [['no', 6.84], ['va', 7.2], ['a', 7.4]], size: 80}, {ws: [['cambiar', 7.52, rosaFuerte]], size: 140, golpe: true}]},
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
      <Esfuerzo t={t} />
      <RelojArena t={t} />
      <EmpresasAyuda t={t} />
      <LlamadasPerdidas t={t} />
      <ChatSinResponder t={t} a={31.9} b={34.28} />
      <Resolver t={t} />
      <Pasos t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(2).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}

      {/* Lista: aprender a detectar un problema / ofrecer una solución / prestar un servicio */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 880, padding: '60px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', gap: '0.24em', ...H, fontSize: 66, marginBottom: 6}}>
            <Entra estilo={ESTILO.texto} t={t} en={47.44} sale={LISTA[1]}>aprender</Entra>
            <Entra estilo={ESTILO.texto} t={t} en={48.0} sale={LISTA[1]}>a</Entra>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10}}>
            {([['detectar un problema', 48.04, ICONO.lupa], ['ofrecer una solución', 49.12, ICONO.bombilla], ['prestar un servicio', 50.48, ICONO.caja]] as [string, number, string][]).map(([txt, en, d]) => (
              <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 20, ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>
                <Vineta t={t} en={en} d={d} />
                <div style={{...H, fontSize: 60, lineHeight: 1.05, whiteSpace: 'nowrap'}}>{txt}</div>
              </div>
            ))}
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
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
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
        // gráficos Lottie
        ['swish', 14.04, -10], ['pop', 14.24, -6], ['loading', 15.28, -11], ['negativo', 17.16, -8], ['pop', 20.6, -6], ['alerta', 21.8, -9],
        ['pop', 26.44, -7], ['alerta', 27.6, -9], ['pop', 39.72, -7], ['pop', 41.04, -5], ['exito', 42.68, -8],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
