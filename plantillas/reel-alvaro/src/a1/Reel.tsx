import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from './transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Check, Chip, Conector, Cruz, Destello, IconoTrazado, Interrogante, Lienzo, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
const ESTILO: Estilo = {texto: 'mascara', golpe: 'muelle', impacto: 'rayos', sub: 'mascara', flecha: 'bote'};

export const DURACION_A1 = 68.08;
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
  [0.5, 1.05, 0.9, 'suave'],
  [1.44, 1.12, 0.16, 'golpe'],
  [3.12, 1.04, 0.6, 'suave'],
  [6.68, 1.1, 0.6, 'suave'],
  [8.52, 1.0, 0, 'corte'],
  [8.6, 1.05, 2.0, 'suave'],
  [17.84, 1.0, 0, 'corte'],
  [18.0, 1.05, 2.0, 'suave'],
  [20.28, 1.14, 0.16, 'golpe'],
  [22.44, 1.0, 0, 'corte'],
  [24.72, 1.06, 0, 'corte'],
  [25.12, 1.14, 0.16, 'golpe'],
  [32.68, 1.02, 0, 'corte'],
  [32.9, 1.1, 1.4, 'suave'],
  [36.8, 1.18, 0.16, 'golpe'],
  [37.72, 1.04, 0.7, 'suave'],
  [42.08, 1.0, 0, 'corte'],
  [42.2, 1.05, 2.4, 'suave'],
  [46.72, 1.13, 0.16, 'golpe'],
  [49.4, 1.03, 0.7, 'suave'],
  [56.4, 1.0, 0, 'corte'],
  [56.5, 1.05, 1.0, 'suave'],
  [59.24, 1.08, 0.3, 'golpe'],
  [60.36, 1.11, 0.3, 'golpe'],
  [61.0, 1.14, 0.3, 'golpe'],
  [63.64, 1.04, 0.7, 'suave'],
  [66.44, 1.1, 0.5, 'suave'],
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
const IMPACTOS = [1.44, 3.76, 7.8, 36.8];
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
  {src: 'estudies', a: 10.6, b: 11.44, etiqueta: 'estudia', desde: 2, foco: 0.42},
  {src: 'notas', a: 11.44, b: 12.6, etiqueta: <>saca buenas<br />notas</>, desde: 3, foco: 0.58},
  {src: 'trabajo', a: 12.6, b: 14.2, etiqueta: <>trabajo<br />estable</>, desde: 2, foco: 0.4},
  {src: 'sueldo', a: 14.2, b: 15.56, etiqueta: <>cobra tu<br />sueldo</>, desde: 3, foco: 0.62},
  {src: 'finde', a: 15.56, b: 17.84, etiqueta: <>espera al<br /><span style={amarillo}>finde</span></>, desde: 2, foco: 0.5},
  {src: 'empresariales', a: 22.44, b: 24.72, etiqueta: 'empresariales', desde: 2, foco: 0.8},
  {src: 'dejar', a: 26.12, b: 27.8, etiqueta: <>dejar la<br />universidad</>, desde: 2, foco: 0.58},
  {src: 'agencia', a: 27.8, b: 30.68, etiqueta: <>mi propia<br /><span style={amarillo}>agencia</span></>, desde: 2, foco: 0.45},
  {src: 'reunion', a: 30.68, b: 32.68, etiqueta: '10 negocios', desde: 2, foco: 0.35},
  {src: 'clientes', a: 40.12, b: 42.08, etiqueta: <><span style={amarillo}>3</span> clientes</>, desde: 1, foco: 0.5},
  {src: 'ia', a: 52.64, b: 56.4, etiqueta: <>inteligencia<br /><span style={amarillo}>artificial</span></>, desde: 2, foco: 0.6},
];
const CORTES = Array.from(new Set([8.52, 42.08, 56.4, ...BROLL.flatMap((b) => [b.a, b.b])])).sort((x, y) => x - y);
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
            <Video src={staticFile(`a1/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ANCHO_BROLL, height: 1920}} />
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
  libro: ICONO10.libro,
  estrella: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  maletin: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
  euro: 'M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15l1-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15l1-2H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3l-1 2h4.06c-.04.33-.06.66-.06 1s.02.67.06 1H3l-1 2h4.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77c-1.13.98-2.6 1.57-4.22 1.57z',
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
  tienda: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  persona: ICONO10.persona,
  edificio: ICONO10.edificio,
  portatil: ICONOS.portatil,
};

// 1) "el plan de siempre" (montaje): una línea de cinco pasos abajo; cada paso salta con su icono cuando entra su plano,
// el conector se dibuja con flujo de puntos y, al decir "semana", una ola recorre todos los pasos (la rutina de siempre)
const PASOS = [
  {en: 10.6, d: ICONO.libro},
  {en: 11.44, d: ICONO.estrella},
  {en: 12.6, d: ICONO.maletin},
  {en: 14.2, d: ICONO.euro},
  {en: 15.56, d: ICONO.calendario},
];
const PLAN = {a: 10.6, b: 17.84, ola: 17.0};
const XS_PLAN = [170, 355, 540, 725, 910];
const Plan: React.FC<{t: number}> = ({t}) => {
  const y = 1610;
  return (
    <Ventana suave t={t} a={PLAN.a} b={PLAN.b}>
      <Lienzo>
        {XS_PLAN.slice(0, 4).map((x, i) => (
          <Conector key={i} t={t} en={PASOS[i + 1].en - 0.28} d={`M ${x + 50} ${y} L ${XS_PLAN[i + 1] - 50} ${y}`} color="rgba(255,255,255,0.75)" dur={0.28} flujo grosor={6} />
        ))}
        {PASOS.map((p, i) => {
          const activo = t >= p.en && (i === PASOS.length - 1 ? t < PLAN.ola : t < PASOS[i + 1].en);
          const ola = Math.exp(-6 * Math.max(0, t - PLAN.ola - i * 0.09)) * (t > PLAN.ola + i * 0.09 ? Math.sin((t - PLAN.ola - i * 0.09) * 18) : 0);
          if (t < p.en) return <circle key={i} cx={XS_PLAN[i]} cy={y} r={14 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" />;
          return (
            <g key={i} transform={`translate(0 ${-26 * ola})`}>
              <Chip t={t} en={p.en} d={p.d} x={XS_PLAN[i]} y={y} r={activo ? 56 : 44} fondo={activo ? C.amarillo : '#fff'} fase={i} />
            </g>
          );
        })}
        <Destello t={t} en={PLAN.ola + 0.36} x={XS_PLAN[4] + 48} y={y - 50} tam={26} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 2) "y ojo, que no tiene nada de malo. ¿Pero qué pasa si tú no quieres eso?": sale un ✓ verde (no tiene nada de malo);
// al decir "qué pasa" se aparta encogiéndose y salta una interrogación grande
const DUDA = {a: 18.7, b: 21.96, bien: 18.92, aparta: 20.28, pregunta: 20.76};
const DudaPlan: React.FC<{t: number}> = ({t}) => {
  const {a, b, bien, aparta, pregunta} = DUDA;
  const ap = aparece(t, bien, 10);
  const m = muelle(t, aparta, 2.2, 6.5);
  const fl = flota(t, 0.3, 4);
  const x = 540 - 230 * m, s = 1 - 0.3 * m;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {t >= bien && (
          <g transform={`translate(${x} ${235 + fl.y}) scale(${ap.sx * s} ${ap.sy * s}) rotate(${ap.rot})`} opacity={1 - 0.35 * m}>
            <circle r={74} fill={VERDE} stroke="#fff" strokeWidth={6} style={{filter: `drop-shadow(0 0 16px ${VERDE})`}} />
            <Check t={t} en={bien + 2 * F} s={1.5} />
          </g>
        )}
        <Pulso t={t} en={bien} x={540} y={235} r={78} color={VERDE} />
        <Particulas t={t} en={bien} x={540} y={235} n={10} radio={150} colores={[VERDE, '#ffffff']} />
        <Interrogante t={t} en={pregunta} x={640} y={240} s={1.75} color="#fff" fase={0.4} />
      </Lienzo>
    </Ventana>
  );
};

// 3) "me reuní con diez negocios y los diez me dijeron que no": diez tiendas caen en dos filas; una a una se ponen
// en rojo con una ✕ que se traza, y al decir "no" toda la cuadrícula se sacude
const DIEZ = {a: 32.68, b: 36.1, caen: 32.72, cruces: 33.0, paso: 0.1, no: 34.08};
const DiezNo: React.FC<{t: number}> = ({t}) => {
  const {a, b, caen, cruces, paso, no} = DIEZ;
  const xs = [200, 370, 540, 710, 880];
  const tiembla = t > no && t < no + 0.5 ? Math.sin((t - no) * 64) * 9 * (1 - (t - no) / 0.5) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${tiembla} 0)`}>
          {Array.from({length: 10}, (_, i) => {
            const en = caen + i * 0.03;
            if (t < en) return null;
            const x = xs[i % 5], y = i < 5 ? 160 : 300;
            const ap = aparece(t, en, i % 2 ? 10 : -10);
            const fl = flota(t, i * 0.7, 3);
            const cae = 1 - muelle(t, en, 2.2, 6.5);
            const no1 = cruces + i * paso;
            const rojo = t >= no1;
            const golpe = rojo ? aparece(t, no1, 0) : {sx: 1, sy: 1};
            const sacude = t > no1 && t < no1 + 0.3 ? Math.sin((t - no1) * 70) * 5 * (1 - (t - no1) / 0.3) : 0;
            return (
              <g key={i} transform={`translate(${x + sacude} ${y + fl.y - 70 * cae})`}>
                <g transform={`scale(${ap.sx * (rojo ? 0.85 + 0.15 * golpe.sx : 1)} ${ap.sy * (rojo ? 0.85 + 0.15 * golpe.sy : 1)}) rotate(${ap.rot})`}>
                  <circle r={52} fill={rojo ? ROJO : '#fff'} stroke="#fff" strokeWidth={5} style={{filter: rojo ? `drop-shadow(0 0 12px ${ROJO})` : 'none'}} />
                  {rojo ? <Cruz t={t} en={no1} s={1.05} /> : <IconoTrazado d={ICONO.tienda} t={t} en={en + 2 * F} color="#1b1b20" size={58} x={-29} y={-30} />}
                </g>
                <Particulas t={t} en={no1} x={0} y={0} n={6} radio={80} colores={[ROJO, '#ffffff']} dur={14} />
              </g>
            );
          })}
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 4) "en las siguientes tres reuniones conseguí mis primeros tres clientes": tres personas que saltan y se encienden en verde con un ✓
const TRES = {a: 38.5, b: 40.12, salen: 38.72, si: 39.52};
const TresSi: React.FC<{t: number}> = ({t}) => {
  const {a, b, salen, si} = TRES;
  const xs = [320, 540, 760];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {xs.map((x, i) => {
          const en = salen + i * 0.1;
          if (t < en) return null;
          const ok = si + i * 0.2;
          const verde = t >= ok;
          const ap = aparece(t, en, 12);
          const cambio = verde ? aparece(t, ok, 0) : {sx: 1, sy: 1, rot: 0};
          const fl = flota(t, i * 1.3, 4);
          return (
            <g key={i} transform={`translate(${x} ${230 + fl.y})`}>
              <Pulso t={t} en={ok} x={0} y={0} r={66} color={VERDE} />
              <g transform={`scale(${ap.sx * (verde ? 0.8 + 0.2 * cambio.sx : 1)} ${ap.sy * (verde ? 0.8 + 0.2 * cambio.sy : 1)}) rotate(${ap.rot})`}>
                <circle r={66} fill={verde ? VERDE : '#fff'} stroke="#fff" strokeWidth={5} style={{filter: verde ? `drop-shadow(0 0 14px ${VERDE})` : 'none'}} />
                <IconoTrazado d={ICONO.persona} t={t} en={en + 2 * F} color={verde ? '#fff' : '#1b1b20'} size={72} x={-36} y={-38} />
              </g>
              {verde && (
                <g transform={`translate(46 -46) scale(${cambio.sx} ${cambio.sy})`}>
                  <circle r={24} fill="#fff" />
                  <Check t={t} en={ok + F} s={0.62} color={VERDE} />
                </g>
              )}
              <Particulas t={t} en={ok} x={0} y={0} n={9} radio={120} colores={[VERDE, '#ffffff', C.amarillo]} />
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 5) "descubrí que existían otras maneras de construir una carrera profesional": del punto de partida sale el camino de siempre
// (recto, apagado, hacia el maletín) y al decir "otras maneras" se abren dos caminos nuevos que se dibujan con flujo;
// al decir "carrera profesional" un punto los recorre y la meta se enciende
const MANERAS = {a: 45.3, b: 49.3, siempre: 45.5, otras: 46.72, maneras: 47.08, recorre: 47.6, llega: 48.4};
const CAM_IZQ: [number, number][] = [[540, 330], [540, 230], [270, 270], [235, 150]];
const CAM_DER: [number, number][] = [[540, 330], [540, 230], [810, 270], [845, 150]];
const bez = (p: [number, number][], u: number): [number, number] => {
  const w = 1 - u;
  return [w * w * w * p[0][0] + 3 * w * w * u * p[1][0] + 3 * w * u * u * p[2][0] + u * u * u * p[3][0], w * w * w * p[0][1] + 3 * w * w * u * p[1][1] + 3 * w * u * u * p[2][1] + u * u * u * p[3][1]];
};
const dCam = (p: [number, number][]) => `M ${p[0].join(' ')} C ${p.slice(1).map((q) => q.join(' ')).join(', ')}`;
const OtrasManeras: React.FC<{t: number}> = ({t}) => {
  const {a, b, siempre, otras, maneras, recorre, llega} = MANERAS;
  const u = lim((t - recorre) / (llega - recorre));
  const uu = u * u * (3 - 2 * u);
  const [qx, qy] = bez(CAM_DER, uu);
  const inicio = aparece(t, a + 0.05, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* el camino de siempre: recto y apagado */}
        <Conector t={t} en={siempre} d="M 540 330 L 540 165" color="rgba(255,255,255,0.35)" dur={0.4} grosor={8} />
        <Chip t={t} en={siempre + 0.35} d={ICONO.maletin} x={540} y={120} r={44} fondo="rgba(60,60,66,0.95)" color="rgba(255,255,255,0.75)" sinRafaga />
        {/* los caminos nuevos */}
        <Conector t={t} en={otras} d={dCam(CAM_IZQ)} color={C.amarillo} dur={0.4} flujo grosor={8} />
        <Conector t={t} en={maneras} d={dCam(CAM_DER)} color={C.amarillo} dur={0.4} flujo grosor={8} />
        <Chip t={t} en={otras + 0.35} d={ICONO.edificio} x={235} y={140} r={56} fase={0.5} />
        <Chip t={t} en={maneras + 0.35} d={ICONO.portatil} x={845} y={140} r={56} fase={1.7} />
        {u > 0 && u < 1 && <circle cx={qx} cy={qy} r={14} fill="#fff" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />}
        <Pulso t={t} en={llega} x={845} y={140} r={60} color={C.amarillo} />
        <Destello t={t} en={llega} x={905} y={86} tam={30} color={C.amarillo} />
        <Particulas t={t} en={llega} x={845} y={140} n={12} radio={150} />
        {/* punto de partida */}
        <g transform={`translate(540 330) scale(${inicio.sx} ${inicio.sy})`}>
          <circle r={17} fill="#fff" stroke={C.amarillo} strokeWidth={5} />
        </g>
      </Lienzo>
    </Ventana>
  );
};

// Viñeta de la lista (captar clientes / vender / entregar soluciones): bola verde que salta con muelle y un ✓ que se traza
const Vineta: React.FC<{t: number; en: number}> = ({t, en}) => {
  const ap = aparece(t, en, 12);
  return (
    <svg width={76} height={76} style={{overflow: 'visible', flexShrink: 0}}>
      <g transform="translate(38 38)">
        <Pulso t={t} en={en} x={0} y={0} r={32} color={VERDE} />
        {t >= en && (
          <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
            <circle r={32} fill={VERDE} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 10px ${VERDE})`}} />
            <Check t={t} en={en + 2 * F} s={0.72} />
          </g>
        )}
        <Particulas t={t} en={en} x={0} y={0} n={7} radio={70} colores={[VERDE, '#ffffff']} dur={14} />
      </g>
    </svg>
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
  {a: 1.44, b: 1.68, top: 260, lineas: [{ws: [['miedo', 1.44, rosaFuerte]], size: 260, golpe: true}]},
  {a: 3.12, b: 4.15, top: 130, lineas: [{ws: [['y', 3.12], ['no', 3.32], ['era', 3.52]], size: 80}, {ws: [['fracasar', 3.76]], size: 180, golpe: true}]},
  {a: 7.0, b: 8.3, top: 130, lineas: [{ws: [['que', 7.0], ['yo', 7.2], ['no', 7.4], ['había', 7.56]], size: 80}, {ws: [['elegido', 7.8, amarillo]], size: 180, golpe: true}]},
  // Montaje "el plan de siempre" (B-roll): alterna grande / subtítulo
  {a: 10.6, b: 11.2, top: 280, lineas: [{ws: [['que', 10.6], ['estudies', 10.76]], size: 130}]},
  {a: 11.28, b: 12.4, top: 260, lineas: [{ws: [['que', 11.28], ['saques', 11.44]], size: 120}, {ws: [['buenas', 11.72], ['notas', 12.08, amarillo]], size: 120}]},
  {a: 12.48, b: 14.1, top: 260, lineas: [{ws: [['que', 12.48], ['encuentres', 12.6]], size: 110}, {ws: [['un', 13.08], ['trabajo', 13.24], ['estable', 13.6, amarillo]], size: 110}]},
  {a: 14.2, b: 15.48, top: 260, lineas: [{ws: [['que', 14.2], ['cobres', 14.36]], size: 120}, {ws: [['tu', 14.8], ['sueldo', 15.0, amarillo]], size: 120}]},
  {a: 15.56, b: 17.6, top: 260, lineas: [{ws: [['y', 15.56], ['que', 15.8], ['esperes', 15.92]], size: 110}, {ws: [['al', 16.48], ['fin', 16.68], ['de', 16.88]], size: 110}, {ws: [['semana', 17.0, amarillo]], size: 140, golpe: true}]},
  {a: 22.0, b: 23.45, top: 260, lineas: [{ws: [['yo', 22.0], ['estaba', 22.16], ['estudiando', 22.44]], size: 80}, {ws: [['empresariales', 22.84]], size: 120, golpe: true}]},
  // 21 años
  {a: 24.76, b: 25.9, top: 1000, lineas: [{ws: [['tenía', 24.76]], size: 80}, {ws: [['21', 25.12, amarillo]], size: 300, golpe: true}, {ws: [['años', 25.6]], size: 80}]},
  // Los diez me dijeron que NO (con el marcador encima)
  {a: 32.48, b: 34.3, top: 1000, lineas: [{ws: [['y', 32.48], ['los', 32.68], ['diez', 33.0]], size: 80}, {ws: [['me', 33.44], ['dijeron', 33.6], ['que', 34.0]], size: 80}, {ws: [['no', 34.08, rosaFuerte]], size: 230, golpe: true}]},
  // Pero seguí
  {a: 36.4, b: 37.55, top: 300, lineas: [{ws: [['pero', 36.4], ['seguí', 36.8, amarillo]], size: 170}]},
  // 3 clientes (B-roll)
  {a: 39.52, b: 41.85, top: 1150, lineas: [{ws: [['conseguí', 39.52], ['mis', 39.92], ['primeros', 40.12]], size: 80}, {ws: [['3', 40.64, amarillo], ['clientes', 41.2]], size: 140}]},
  // Otras maneras
  {a: 46.0, b: 47.4, top: 1000, lineas: [{ws: [['que', 46.0], ['existían', 46.16]], size: 80}, {ws: [['otras', 46.72]], size: 130, golpe: true}, {ws: [['maneras', 47.08, amarillo]], size: 130, golpe: true}]},
  // Inteligencia artificial (B-roll)
  {a: 53.84, b: 56.2, top: 230, lineas: [
    {ws: [['a', 53.84], ['implementar', 54.0]], size: 80},
    {ws: [['inteligencia', 54.72]], size: 120, golpe: true},
    {ws: [['artificial', 55.52, amarillo]], size: 120, golpe: true},
  ]},
];
// La lista "captar clientes / vender / entregar soluciones que aporten valor" también cuenta como texto grande
const LISTA: [number, number] = [59.24, 63.5];
const CTA = 66.44;
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
const CLAVE = new Set(['servicios', 'profesional', 'valor', 'malo', 'oportunidades']);

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
const DETRAS: [number, number][] = [[1.36, 1.96], [3.0, 4.45], [6.88, 8.52]];

// "Error" rojo en "miedo": la imagen se tiñe de rojo de golpe con glitch y vuelve en ~8 fotogramas
const MIEDO_T = 1.44;
const ROJO_FLASH: Record<number, number> = {0: 0.85, 1: 0.75, 2: 0.15, 3: 0.6, 4: 0.35, 5: 0.15, 6: 0.06};
const ErrorRojo: React.FC<{frame: number}> = ({frame}) => {
  const o = ROJO_FLASH[frame - Math.round(MIEDO_T * FPS)];
  if (!o) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: '#ff1020', mixBlendMode: 'multiply', opacity: o}} />
      <AbsoluteFill style={{background: '#ff2030', mixBlendMode: 'screen', opacity: o * 0.35}} />
    </AbsoluteFill>
  );
};

export const ReelA1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 3);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={[...CORTES, MIEDO_T]}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A1)} layout="none">
            <Video src={staticFile('a1/a1.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a1/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Plan t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(3).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <DudaPlan t={t} />
      <DiezNo t={t} />
      <TresSi t={t} />
      <OtrasManeras t={t} />

      {/* Lista: captar clientes / vender / entregar soluciones que aporten valor */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 900, padding: '60px 170px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: VELO, filter: SOMBRA}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12}}>
          {([['captar clientes', 59.24], ['vender', 60.36], ['entregar\nsoluciones', 61.0]] as [string, number][]).map(([txt, en]) => {
            return (
              <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 22, ...golpeV(ESTILO.golpe, t, en, LISTA[1])}}>
                <Vineta t={t} en={en} />
                <span style={{...H, fontSize: 72, lineHeight: 1.0, whiteSpace: 'pre'}}>{txt}</span>
              </div>
            );
          })}
          </div>
          <div style={{display: 'flex', gap: '0.24em', ...H, fontSize: 66, marginTop: 8}}>
            <Entra estilo={ESTILO.texto} t={t} en={62.16} sale={LISTA[1]}>que</Entra>
            <Entra estilo={ESTILO.texto} t={t} en={62.36} sale={LISTA[1]}>aporten</Entra>
            <Entra estilo={ESTILO.texto} t={t} en={62.96} sale={LISTA[1]} style={amarillo}>valor</Entra>
          </div>
        </div>
      </Ventana>

      <Subtitulos t={t} />
      <ErrorRojo frame={frame} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={DURACION_A1}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={66.44}>haz</Sube>
          <Sube t={t} en={66.76}>clic</Sube>
          <Sube t={t} en={66.96} style={amarillo}>aquí</Sube>
          <Sube t={t} en={67.16} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 67.3 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 67.3)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 66.44, 66.76, 66.96, 67.16].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.44], ['switch', 1.44, -4], ['boom', 3.76, -6], ['pop', 3.76, -2], ['pop', 6.68, -2], ['pop', 10.6, -4], ['pop', 11.44, -4], ['pop', 12.6, -4], ['pop', 14.2, -4], ['twinkle', 17.0, -6],
        ['hit', 20.76, -2], ['pop', 22.84, -3], ['boom', 25.12, -4], ['pop', 26.76, -3], ['pop', 29.4, -3], ['pop', 31.64, -3], ['riser', 33.0, -2], ['thud', 34.08, -3],
        ['riserm', 36.8, -2], ['hit', 36.8], ['ding', 39.52, -3], ['pop', 40.64, -3], ['pop', 46.72], ['pop', 47.08, -3], ['pop', 54.72, -3], ['pop', 55.52, -3],
        ['pop', 57.6], ['click', 59.24], ['click', 60.36], ['click', 61.0], ['twinkle', 62.96, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
