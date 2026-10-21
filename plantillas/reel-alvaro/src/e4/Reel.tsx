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
import {Chip, Conector, Cruz, Destello, ICONOS, IconoTrazado, Interrogante, Lienzo, Particulas, Pulso, ROJO, VERDE, OSCURO, aparece, estrella, flota, muelle} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'espaciado', golpe: 'tinta', impacto: 'halo', sub: 'espaciado', flecha: 'vibra'};

export const DURACION_E4 = 75.44;
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
  [1.76, 1.12, 0.2, 'golpe'],
  [2.64, 1.04, 0.6, 'suave'],
  [4.08, 1.06, 1.0, 'suave'],
  [5.28, 1.15, 0.16, 'golpe'],
  [6.2, 1.04, 1.0, 'suave'],
  [7.72, 1.06, 2.0, 'suave'],
  [9.92, 1.0, 0, 'corte'],
  [13.56, 1.0, 0, 'corte'],
  [13.6, 1.05, 1.2, 'suave'],
  [14.88, 1.0, 0, 'corte'],
  [16.92, 1.0, 0, 'corte'],
  [16.96, 1.06, 0.6, 'suave'],
  [17.68, 1.14, 0.16, 'golpe'],
  [18.16, 1.04, 0.8, 'suave'],
  [20.6, 1.1, 0.2, 'golpe'],
  [21.04, 1.13, 0.2, 'golpe'],
  [21.84, 1.04, 0.8, 'suave'],
  [23.0, 1.07, 3.0, 'suave'],
  [26.88, 1.16, 0.16, 'golpe'],
  [27.2, 1.04, 0.8, 'suave'],
  [29.52, 1.07, 0.3, 'golpe'],
  [32.16, 1.1, 0.3, 'golpe'],
  [33.96, 1.13, 0.3, 'golpe'],
  [35.56, 1.04, 0.8, 'suave'],
  [36.5, 1.08, 3.0, 'suave'],
  [39.56, 1.04, 0.8, 'suave'],
  [42.8, 1.12, 0.2, 'golpe'],
  [43.6, 1.04, 0.8, 'suave'],
  [46.32, 1.07, 2.5, 'suave'],
  [49.52, 1.13, 0.2, 'golpe'],
  [50.32, 1.04, 0.8, 'suave'],
  [52.8, 1.1, 0.3, 'golpe'],
  [53.6, 1.04, 0.8, 'suave'],
  [55.72, 1.18, 0.16, 'golpe'],
  [56.7, 1.04, 0.8, 'suave'],
  [61.56, 1.2, 0.16, 'golpe'],
  [62.56, 1.04, 0.8, 'suave'],
  [63.5, 1.07, 4.0, 'suave'],
  [68.36, 1.12, 0.2, 'golpe'],
  [69.0, 1.04, 0.8, 'suave'],
  [70.48, 1.08, 0.5, 'suave'],
  [71.7, 1.05, 3.7, 'suave'],
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
const IMPACTOS = [5.28, 26.88, 55.72, 61.56];
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
  {src: 'videos', a: 9.92, b: 10.68, desde: 2, foco: 0.5},
  {src: 'formaciones', a: 10.68, b: 12.04, desde: 1, foco: 0.5},
  {src: 'herramientas', a: 12.04, b: 13.56, desde: 2, foco: 0.42},
  {src: 'cliente', a: 14.88, b: 16.92, desde: 6, foco: 0.5},
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
            <Video src={staticFile(`e4/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
  ...ICONO10,
  lupa: ICONOS.lupa,
  codigo: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  engranaje: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
  chatVacio: 'M4 4h16v12H7l-3 3V4z',
  grafica: 'M5 19h14v2H3V3h2v16zm2-2V9h3v8H7zm5 0V5h3v12h-3zm5 0v-6h3v6h-3z',
  correo: 'M3 5h18v14H3V5zm2 2v.5l7 4.5 7-4.5V7H5zm0 3v7h14v-7l-7 4.5L5 10z',
  telefono: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z',
  check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  reloj: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4l3.5 2.1-.8 1.3L11 13V7h2v5.4z',
  calendario: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9z',
  bombilla: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
};
const ORO = '#ffd34d';

// Grupo de fichas y conectores en la franja de encima de la cabeza (y ≈ 100-380), con entrada y salida suaves
type Ficha = {en: number; d: string; x: number; y: number; r?: number; fondo?: string; color?: string};
type Enlace = {en: number; d: string; color?: string; punta?: [number, number, number]};
const Grupo: React.FC<{t: number; a: number; b: number; fichas?: Ficha[]; enlaces?: Enlace[]; children?: React.ReactNode}> = ({t, a, b, fichas = [], enlaces = [], children}) => (
  <Ventana suave t={t} a={a} b={b}>
    <Lienzo>
      {enlaces.map((e, i) => (
        <Conector key={i} t={t} en={e.en} d={e.d} color={e.color ?? 'rgba(255,255,255,0.8)'} dur={0.35} flujo grosor={6} punta={e.punta} />
      ))}
      {fichas.map((f, i) => (
        <Chip key={i} t={t} en={f.en} d={f.d} x={f.x} y={f.y} r={f.r ?? 60} fondo={f.fondo} color={f.color} fase={i * 1.3} />
      ))}
      {children}
    </Lienzo>
  </Ventana>
);

// Montón de monedas que caen una a una con muelle y se apilan (sin símbolos: el importe ya lo dice el texto)
const Monedas: React.FC<{t: number; en: number; x: number; y: number; n?: number}> = ({t, en, x, y, n = 3}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const e = en + i * 0.1;
      if (t < e) return null;
      const m = muelle(t, e, 2.6, 7);
      const yy = y - i * 22 - (1 - m) * 160;
      return (
        <g key={i} transform={`translate(${x} ${yy})`}>
          <ellipse cx={0} cy={10} rx={58} ry={20} fill="#c99a12" />
          <ellipse cx={0} cy={0} rx={58} ry={20} fill={ORO} stroke="#fff" strokeWidth={3} />
          <ellipse cx={0} cy={0} rx={38} ry={12} fill="none" stroke="#c99a12" strokeWidth={4} />
        </g>
      );
    })}
    <Particulas t={t} en={en + (n - 1) * 0.1 + 0.12} x={x} y={y - (n - 1) * 22} n={10} radio={120} colores={[ORO, '#ffffff']} />
  </g>
);

// 0) Montaje (B-roll): progreso abajo con los tres pasos (vídeos → formaciones → herramientas)
const PASOS = [{en: 9.92, d: ICONO.play}, {en: 10.68, d: ICONO.libro}, {en: 12.04, d: ICONO.herramienta}];
const Progreso: React.FC<{t: number}> = ({t}) => {
  const xs = [330, 540, 750];
  return (
    <Ventana suave t={t} a={9.92} b={13.56}>
      <Lienzo>
        {xs.slice(0, 2).map((x, i) => (
          <Conector key={i} t={t} en={PASOS[i + 1].en - 0.25} d={`M ${x + 58} 1690 L ${xs[i + 1] - 58} 1690`} color="rgba(255,255,255,0.7)" dur={0.25} flujo grosor={6} />
        ))}
        {PASOS.map((p, i) => {
          const activo = t >= p.en && (i === PASOS.length - 1 || t < PASOS[i + 1].en);
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

// 1) "no sabe qué hacer": interrogaciones grandes alrededor de la cabeza
const NoSabe: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={17.3} b={18.12}>
    <Lienzo>
      <Interrogante t={t} en={17.62} x={290} y={235} s={1.15} />
      <Interrogante t={t} en={17.74} x={790} y={205} s={1.5} color={ROJO} fase={1.2} />
      <Interrogante t={t} en={17.86} x={850} y={420} s={0.95} fase={2.4} />
    </Lienzo>
  </Ventana>
);

// 2) "montar una empresa no consiste solamente en consumir información": la empresa a un lado, el conector se corta
// con una ✕ roja y al otro lado caen tarjetas de contenido (vídeos y apuntes) que se amontonan
const EmpresaInfo: React.FC<{t: number}> = ({t}) => {
  const empresa = 18.96, no = 19.4, consumir = 20.6, info = 21.04;
  const tiembla = t > no + 0.15 && t < no + 0.6 ? Math.sin((t - no) * 60) * 5 * (1 - (t - no - 0.15) / 0.45) : 0;
  return (
    <Grupo t={t} a={18.6} b={21.82} fichas={[{en: empresa, d: ICONO.edificio, x: 290, y: 235, r: 66}]}>
      <Conector t={t} en={no - 0.1} d="M 372 235 L 690 235" color="rgba(255,255,255,0.6)" dur={0.3} grosor={6} />
      {t >= no + 0.12 && (
        <g transform={`translate(${531 + tiembla} 235)`}>
          {(() => {
            const e = aparece(t, no + 0.12, 15);
            return (
              <g transform={`scale(${e.sx} ${e.sy}) rotate(${e.rot})`}>
                <circle r={36} fill={ROJO} stroke="#fff" strokeWidth={4} />
                <Cruz t={t} en={no + 0.16} s={0.85} />
              </g>
            );
          })()}
          <Pulso t={t} en={no + 0.12} x={0} y={0} r={38} color={ROJO} />
        </g>
      )}
      {[0, 1, 2].map((i) => {
        const en = consumir + i * 0.13;
        if (t < en) return null;
        const m = muelle(t, en, 2.5, 6.5);
        const abre = muelle(t, info, 2.2, 6);
        const rot = (i - 1) * 9 * (t >= info ? abre : 0) + (1 - m) * (i % 2 ? 25 : -25);
        const x = 800 + (i - 1) * 26 * (t >= info ? abre : 0.3), y = 235 - i * 10 - (1 - m) * 220;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <rect x={-62} y={-78} width={124} height={156} rx={16} fill={i === 2 ? C.amarillo : '#f4f4f6'} stroke="#fff" strokeWidth={3} />
            {i === 2 ? (
              <path d="M -16 -26 L 22 0 L -16 26 Z" fill="#1b1b20" />
            ) : (
              [0, 1, 2, 3].map((k) => <rect key={k} x={-42} y={-46 + k * 26} width={[84, 64, 76, 50][k]} height={10} rx={5} fill="#b8b8c2" />)
            )}
          </g>
        );
      })}
      <Particulas t={t} en={info} x={800} y={215} n={9} radio={130} />
    </Grupo>
  );
};

// 3) "aprender a resolver un problema por el que otra persona está dispuesta a pagar": una llave inglesa, un nudo rojo que se
// dibuja (el problema) y que al resolverlo se desenreda en una línea verde que llega a la persona; al decir "pagar" caen monedas
const NUDO = {herramienta: 22.96, problema: 23.56, desata: 24.12, persona: 24.8, pagar: 26.88};
const Nudo: React.FC<{t: number}> = ({t}) => {
  const {herramienta, problema, desata, persona, pagar} = NUDO;
  const dib = 1 - Math.pow(1 - lim((t - problema) / 0.5), 3);
  const k = 1 - (1 - Math.pow(1 - lim((t - desata) / 0.7), 3)); // 1 = enredado, 0 = recto
  const N = 90;
  const pts = Array.from({length: N + 1}, (_, i) => {
    const u = i / N;
    const x = 410 + 270 * u + Math.sin(u * Math.PI * 8) * 46 * k;
    const y = 235 + Math.cos(u * Math.PI * 8) * 52 * k * Math.sin(u * Math.PI);
    return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const col = k > 0.5 ? ROJO : VERDE;
  const llega = lim((t - desata - 0.7) / 0.3);
  return (
    <Grupo t={t} a={22.7} b={27.6} fichas={[{en: herramienta, d: ICONO.herramienta, x: 300, y: 235, r: 58}, {en: persona, d: ICONO.persona, x: 790, y: 235, r: 62, fondo: '#fff'}]}>
      {t >= problema && (
        <g style={{filter: `drop-shadow(0 0 10px ${col})`}}>
          <path d={pts} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - dib} />
        </g>
      )}
      {llega > 0 && llega < 1 && <circle cx={410 + 270 * llega} cy={235} r={11} fill="#fff" />}
      <Pulso t={t} en={desata + 0.7} x={680} y={235} r={30} color={VERDE} />
      <Monedas t={t} en={pagar} x={790} y={140} />
    </Grupo>
  );
};

// 4) "en el caso de las agencias de IA": la agencia cae con un muelle y le salta la chispa de la IA
const AgenciaIA: React.FC<{t: number}> = ({t}) => (
  <Grupo t={t} a={27.62} b={29.45} fichas={[{en: 27.88, d: ICONO.edificio, x: 540, y: 225, r: 74}, {en: 28.4, d: ICONO.ia, x: 618, y: 150, r: 40}]}>
    {t >= 27.88 && (
      <g transform={`translate(540 225) rotate(${(t - 27.88) * 45})`}>
        <circle r={98} fill="none" stroke={C.amarillo} strokeWidth={4} strokeDasharray="10 14" opacity={lim((t - 27.88) / 0.3) * 0.9} />
      </g>
    )}
  </Grupo>
);

// 5) "no se trata de convertirte en un experto absoluto de todas las herramientas": tú en el centro, te ponen una estrella de
// experto y te rodea un enjambre de herramientas que gira; la ficha tiembla por la sobrecarga
const HERRAMIENTAS = [ICONO.codigo, ICONO.engranaje, ICONO.chatVacio, ICONO.grafica, ICONO.correo, ICONO.telefono];
const Enjambre: React.FC<{t: number}> = ({t}) => {
  const tu = 36.2, experto = 37.36, todas = 38.44;
  const giro = (t - todas) * 0.9;
  const tiembla = t > todas + 0.3 && t < 39.3 ? Math.sin(t * 55) * 4 : 0;
  const est = aparece(t, experto, 30);
  return (
    <Grupo t={t} a={35.9} b={39.5}>
      {HERRAMIENTAS.map((d, i) => {
        const en = todas + i * 0.07;
        if (t < en) return null;
        const m = muelle(t, en, 2.3, 6.5);
        const ang = (i / HERRAMIENTAS.length) * Math.PI * 2 + giro;
        const x = 540 + Math.cos(ang) * 330 * m, y = 240 + Math.sin(ang) * 125 * m;
        const e = aparece(t, en, 20);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${e.sx * 1.15} ${e.sy * 1.15}) rotate(${e.rot})`}>
            <rect x={-40} y={-40} width={80} height={80} rx={22} fill={OSCURO} stroke="#fff" strokeWidth={4} />
            <IconoTrazado d={d} t={t} en={en + 0.06} color="#fff" size={44} x={-22} y={-22} />
          </g>
        );
      })}
      <g transform={`translate(${tiembla} 0)`}>
        <Chip t={t} en={tu} d={ICONO.persona} x={540} y={240} r={68} fondo="#fff" />
        {t >= experto && (
          <g transform={`translate(${540 + 52} ${240 - 52}) scale(${est.sx} ${est.sy}) rotate(${est.rot + Math.sin(t * 3) * 6})`}>
            <path d={estrella(30)} fill={ORO} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
          </g>
        )}
        <Destello t={t} en={experto + 0.1} x={540 + 90} y={240 - 90} tam={22} color={C.amarillo} />
      </g>
    </Grupo>
  );
};

// 6) "comprender el modelo": negocio → agencia → solución, con flechas que se dibujan y un flujo de puntos al "empezar"
const Modelo: React.FC<{t: number}> = ({t}) => (
  <Grupo t={t} a={39.8} b={42.76}
    fichas={[{en: 40.12, d: ICONO.edificio, x: 250, y: 235, r: 58, fondo: '#fff'}, {en: 40.84, d: ICONO.engranaje, x: 540, y: 235, r: 64}, {en: 41.08, d: ICONO.check, x: 830, y: 235, r: 58, fondo: VERDE, color: '#fff'}]}
    enlaces={[{en: 40.5, d: 'M 318 235 L 466 235', punta: [466, 235, 0]}, {en: 41.0, d: 'M 614 235 L 762 235', punta: [762, 235, 0]}]}
  />
);

// 7) "habilidades comerciales y técnicas": la etiqueta (vender) y el código (técnica), unidas por un +
const Habilidades: React.FC<{t: number}> = ({t}) => {
  const mas = aparece(t, 44.2, 45);
  return (
    <Grupo t={t} a={42.9} b={45.6} fichas={[{en: 43.36, d: ICONO.etiqueta, x: 370, y: 235, r: 64}, {en: 44.4, d: ICONO.codigo, x: 710, y: 235, r: 64}]}>
      {t >= 44.2 && (
        <g transform={`translate(540 235) scale(${mas.sx} ${mas.sy}) rotate(${mas.rot})`}>
          <path d="M -22 0 H 22 M 0 -22 V 22" stroke="#fff" strokeWidth={11} strokeLinecap="round" />
        </g>
      )}
    </Grupo>
  );
};

// 8) "antes de invertir más tiempo o dinero": un reloj cuya aguja corre y un montón de monedas
const Inversion: React.FC<{t: number}> = ({t}) => {
  const tiempo = 51.8, dinero = 52.36;
  const ap = aparece(t, tiempo, -12);
  return (
    <Grupo t={t} a={51.5} b={52.78}>
      {t >= tiempo && (
        <g transform={`translate(380 235) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          <circle r={70} fill={OSCURO} stroke={C.amarillo} strokeWidth={8} />
          {Array.from({length: 12}, (_, i) => <line key={i} x1={0} y1={-54} x2={0} y2={-44} stroke="#fff" strokeWidth={4} strokeLinecap="round" transform={`rotate(${i * 30})`} />)}
          <line x1={0} y1={0} x2={0} y2={-46} stroke="#fff" strokeWidth={7} strokeLinecap="round" transform={`rotate(${(t - tiempo) * 600})`} />
          <line x1={0} y1={0} x2={0} y2={-30} stroke={C.amarillo} strokeWidth={7} strokeLinecap="round" transform={`rotate(${(t - tiempo) * 50})`} />
          <circle r={8} fill={C.amarillo} />
        </g>
      )}
      <Pulso t={t} en={tiempo} x={380} y={235} r={72} color={C.amarillo} />
      <Monedas t={t} en={dinero} x={700} y={270} />
    </Grupo>
  );
};

// 9) "que tengas claro en qué consiste este negocio": la bombilla se dibuja apagada y se enciende al decir "claro"
const Bombilla: React.FC<{t: number}> = ({t}) => {
  const en = 52.84, claro = 53.28;
  const ap = aparece(t, en, 10);
  const luz = lim((t - claro) / 0.2);
  const fl = flota(t, 0.7, 4);
  return (
    <Ventana suave t={t} a={52.8} b={55.45}>
      <Lienzo>
        <g transform={`translate(540 ${225 + fl.y})`}>
          {luz > 0 && <circle r={95 + 8 * Math.sin(t * 6)} fill={`rgba(255,240,140,${0.28 * luz})`} style={{filter: 'blur(14px)'}} />}
          <g transform={`scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
            <g transform="translate(-75 -80) scale(6.25)">
              <path d={ICONO.bombilla} fill={luz > 0 ? '#fff6a8' : 'rgba(255,255,255,0.15)'} stroke="#fff" strokeWidth={0.6} style={{filter: luz > 0 ? `drop-shadow(0 0 3px rgba(${GLOW_AMARILLO},1))` : 'none'}} />
            </g>
          </g>
        </g>
        <Pulso t={t} en={claro} x={540} y={215} r={80} color={C.amarillo} dur={16} />
        <Particulas t={t} en={claro} x={540} y={215} n={12} radio={190} />
        <Destello t={t} en={claro + 0.1} x={630} y={140} tam={26} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 10) "son 14 clases": catorce fichas de clase que se encienden en cascada
const Catorce: React.FC<{t: number}> = ({t}) => (
  <Ventana suave t={t} a={55.5} b={56.66}>
    <Lienzo>
      {Array.from({length: 14}, (_, i) => {
        const en = 55.72 + i * 0.035;
        if (t < en - 0.15) return null;
        const e = aparece(t, en - 0.15, 0);
        const on = t >= en + 0.25;
        const x = 249 + (i % 7) * 97, y = 175 + Math.floor(i / 7) * 112;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${e.sx} ${e.sy})`}>
            <rect x={-38} y={-42} width={76} height={84} rx={16} fill={on ? C.amarillo : OSCURO} stroke="#fff" strokeWidth={4} style={{filter: on ? `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.8))` : 'none'}} />
            <path d="M -9 -14 L 15 0 L -9 14 Z" fill={on ? '#1b1b20' : '#fff'} />
          </g>
        );
      })}
    </Lienzo>
  </Ventana>
);

// 11) "el funcionamiento de una agencia de IA": dos engranajes que encajan y giran, y salta la chispa de la IA
const Engranajes: React.FC<{t: number}> = ({t}) => {
  const en = 57.68, ia = 59.08;
  const a1 = aparece(t, en, 0), a2 = aparece(t, en + 0.15, 0);
  const g = (t - en) * 70;
  return (
    <Ventana suave t={t} a={57.4} b={59.95}>
      <Lienzo>
        {t >= en && (
          <g transform={`translate(475 235) scale(${a1.sx * 7} ${a1.sy * 7}) rotate(${g}) translate(-13 -12)`}>
            <path d={ICONO.engranaje} fill={C.amarillo} stroke="#fff" strokeWidth={0.5} />
          </g>
        )}
        {t >= en + 0.15 && (
          <g transform={`translate(602 292) scale(${a2.sx * 5} ${a2.sy * 5}) rotate(${-g * 1.4 + 15}) translate(-13 -12)`}>
            <path d={ICONO.engranaje} fill="#fff" stroke="#fff" strokeWidth={0.5} />
          </g>
        )}
        <Chip t={t} en={ia} d={ICONO.ia} x={700} y={150} r={42} fase={0.4} />
      </Lienzo>
    </Ventana>
  );
};

// 12) "puedes acceder": un candado que se abre (el arco sube y gira) con un pulso y chispas
const Candado: React.FC<{t: number}> = ({t}) => {
  const en = 60.16, abre = 60.6;
  const ap = aparece(t, en, -10);
  const m = muelle(t, abre, 2.2, 6);
  const fl = flota(t, 0.2, 4);
  return (
    <Ventana suave t={t} a={60.0} b={62.55}>
      <Lienzo>
        <g transform={`translate(540 ${250 + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          <g transform={`translate(38 ${-28 - 26 * m}) rotate(${-32 * m}) translate(-38 0)`}>
            <path d="M -38 0 V -34 A 38 38 0 0 1 38 -34 V 0" fill="none" stroke="#fff" strokeWidth={16} strokeLinecap="round" />
          </g>
          <rect x={-64} y={-34} width={128} height={104} rx={20} fill={t >= abre ? C.amarillo : OSCURO} stroke="#fff" strokeWidth={5} />
          <circle cx={0} cy={6} r={12} fill={t >= abre ? '#1b1b20' : '#fff'} />
          <rect x={-5} y={10} width={10} height={26} rx={5} fill={t >= abre ? '#1b1b20' : '#fff'} />
        </g>
        <Pulso t={t} en={abre} x={540} y={265} r={80} color={C.amarillo} />
        <Particulas t={t} en={abre} x={540} y={240} n={12} radio={170} />
      </Lienzo>
    </Ventana>
  );
};

// 13) "el programa de mentoría y acompañamiento": formación (libro) y acompañamiento (auriculares), unidos por un flujo
const Mentoria: React.FC<{t: number}> = ({t}) => (
  <Grupo t={t} a={64.1} b={67.3} fichas={[{en: 64.36, d: ICONO.libro, x: 360, y: 235, r: 64}, {en: 65.48, d: ICONO.auricular, x: 720, y: 235, r: 64}]}
    enlaces={[{en: 65.2, d: 'M 434 235 C 500 170, 580 170, 646 235'}]} />
);

// 14) "reservar una consultoría gratuita": el calendario cae y se marca con un ✓ verde
const Reserva: React.FC<{t: number}> = ({t}) => {
  const ok = 68.36;
  const e = aparece(t, ok, 20);
  return (
    <Grupo t={t} a={67.3} b={69.95} fichas={[{en: 67.44, d: ICONO.calendario, x: 540, y: 235, r: 72}]}>
      {t >= ok && (
        <g transform={`translate(600 180) scale(${e.sx} ${e.sy}) rotate(${e.rot})`}>
          <circle r={32} fill={VERDE} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 10px ${VERDE})`}} />
          <g transform="scale(0.8)"><path d="M -20 2 L -6 16 L 22 -14" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
        </g>
      )}
      <Particulas t={t} en={ok} x={600} y={180} n={9} radio={100} colores={[VERDE, '#ffffff']} />
      <Destello t={t} en={69.0} x={460} y={150} tam={24} color={C.amarillo} />
    </Grupo>
  );
};

// 15) "decide si este modelo encaja contigo": dos piezas de puzle que se acercan y encajan, con un pulso al encajar
const Puzle: React.FC<{t: number}> = ({t}) => {
  const en = 73.6, encaja = 74.44;
  const m = muelle(t, encaja - 0.3, 2, 6.5);
  const ap = aparece(t, en, 0);
  const xl = 330 + (485 - 330) * m, xr = 750 + (595 - 750) * m;
  const unido = t >= encaja + 0.1;
  const IZQ = 'M -55 -55 H 55 V -20 A 22 22 0 1 1 55 20 V 55 H -55 Z';
  const DER = 'M -55 -55 H 55 V 55 H -55 V 20 A 22 22 0 1 0 -55 -20 Z';
  return (
    <Ventana suave t={t} a={73.4} b={DURACION_E4}>
      <Lienzo>
        <g transform={`translate(${xl} 235) scale(${ap.sx} ${ap.sy}) rotate(${(1 - m) * -12})`}>
          <path d={IZQ} fill={unido ? VERDE : C.amarillo} stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
        </g>
        <g transform={`translate(${xr} 235) scale(${ap.sx} ${ap.sy}) rotate(${(1 - m) * 12})`}>
          <path d={DER} fill={unido ? VERDE : '#fff'} stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
        </g>
        <Pulso t={t} en={encaja + 0.1} x={540} y={235} r={90} color={VERDE} dur={16} />
        <Particulas t={t} en={encaja + 0.1} x={540} y={235} n={14} radio={200} colores={[VERDE, '#ffffff', C.amarillo]} />
      </Lienzo>
    </Ventana>
  );
};

const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// Iconos de la lista-ruta: entender (lupa), ofrecer (megáfono), entregar (caja)
const ICONOS_RUTA = [ICONO.lupa, ICONO.megafono, ICONO.caja];
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
  {a: 0.08, b: 2.62, top: 60, lineas: [{ws: [['voy', 0.08], ['a', 0.28], ['decir', 0.36], ['algo', 0.64], ['que', 0.92]], size: 72}, {ws: [['probablemente', 1.04]], size: 84}, {ws: [['no debería decirte', 1.64, rosaFuerte]], size: 110, golpe: true}]},
  // Comprar otro curso no significa...
  {a: 4.08, b: 7.7, top: 980, lineas: [{ws: [['comprar', 4.08], ['otro', 4.6], ['curso', 4.88]], size: 90}, {ws: [['no significa', 5.28, amarillo]], size: 130, golpe: true}, {ws: [['que', 6.2], ['vayas', 6.32], ['a', 6.72], ['montar', 6.76]], size: 80}, {ws: [['un', 7.16], ['negocio', 7.28]], size: 80}]},
  // Montaje: viendo vídeos, comprando formaciones, aprendiendo herramientas nuevas (todo en grande)
  {a: 9.92, b: 10.66, top: 260, lineas: [{ws: [['viendo', 9.92]], size: 100}, {ws: [['vídeos', 10.28, amarillo]], size: 150, golpe: true}]},
  {a: 10.68, b: 12.0, top: 260, lineas: [{ws: [['comprando', 10.68]], size: 100}, {ws: [['formaciones', 11.24, amarillo]], size: 140, golpe: true}]},
  {a: 11.92, b: 13.54, top: 260, lineas: [{ws: [['y', 11.92], ['aprendiendo', 12.04]], size: 100}, {ws: [['herramientas', 12.64, amarillo]], size: 130, golpe: true}, {ws: [['nuevas', 13.2]], size: 100}]},
  // Un posible cliente (B-roll)
  {a: 14.88, b: 16.9, top: 1150, lineas: [{ws: [['ponerse', 14.88], ['delante', 15.36], ['de', 15.68]], size: 80}, {ws: [['un posible cliente', 15.76, amarillo]], size: 110, golpe: true}]},
  {a: 16.96, b: 18.1, top: 1000, lineas: [{ws: [['no', 16.96], ['sabe', 17.32]], size: 90}, {ws: [['qué hacer', 17.68, rosaFuerte]], size: 150, golpe: true}]},
  // Consumir información / dispuesta a pagar
  {a: 20.6, b: 21.82, top: 1000, lineas: [{ws: [['consumir', 20.6]], size: 120, golpe: true}, {ws: [['información', 21.04, rosaFuerte]], size: 130, golpe: true}]},
  {a: 24.12, b: 27.15, top: 980, lineas: [{ws: [['por', 24.12], ['el', 24.32], ['que', 24.48], ['otra', 24.56], ['persona', 24.8]], size: 72}, {ws: [['está', 25.48], ['dispuesta', 25.96], ['a', 26.72]], size: 80}, {ws: [['pagar', 26.88, amarillo]], size: 190, golpe: true}]},
  // Habilidades
  {a: 42.8, b: 45.0, top: 1000, lineas: [{ws: [['habilidades', 42.8, amarillo]], size: 130, golpe: true}, {ws: [['comerciales', 43.36], ['y', 44.2], ['técnicas', 44.4]], size: 80}]},
  // Formación introductoria / tengas claro
  {a: 48.88, b: 50.3, top: 1000, lineas: [{ws: [['una', 48.88], ['formación', 49.04]], size: 90}, {ws: [['introductoria', 49.52, amarillo]], size: 130, golpe: true}]},
  {a: 52.8, b: 55.45, top: 1000, lineas: [{ws: [['tengas claro', 52.8, amarillo]], size: 120, golpe: true}, {ws: [['en', 53.68], ['qué', 53.96], ['consiste', 54.16]], size: 80}, {ws: [['este', 54.8], ['negocio', 55.0]], size: 80}]},
  // Oferta
  {a: 55.52, b: 56.65, top: 980, lineas: [{ws: [['son', 55.52]], size: 80}, {ws: [['14', 55.72, amarillo]], size: 280, golpe: true}, {ws: [['clases', 56.16]], size: 100}]},
  {a: 60.16, b: 62.55, top: 960, lineas: [{ws: [['puedes', 60.16], ['acceder', 60.52]], size: 80}, {ws: [['por', 60.92], ['solo', 61.16]], size: 80}, {ws: [['1 €', 61.56, amarillo]], size: 300, golpe: true}]},
  {a: 67.44, b: 69.95, top: 1000, lineas: [{ws: [['reservar', 67.44], ['una', 68.04]], size: 80}, {ws: [['consultoría', 68.36, amarillo]], size: 120, golpe: true}, {ws: [['gratuita', 69.0, amarillo]], size: 120, golpe: true}]},
];
// La lista "entender qué automatizaciones necesitan los negocios / cómo puedes ofrecerlas / cómo organizar su entrega" también cuenta como texto grande
const LISTA: [number, number] = [29.52, 35.5];
const CTA = 70.48;
const CTA_FIN = 71.66; // tras "haz clic en el botón" sigue en subtítulos
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
const CLAVE = new Set(['curso', 'años', 'empresa', 'problema', 'experto', 'modelo', 'mentoría', 'acompañamiento', 'contenido', 'contigo']);

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
const DETRAS: [number, number][] = [[0, 2.9]];

export const ReelE4: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E4)} layout="none">
            <Video src={staticFile('e4/e4.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('e4/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <Progreso t={t} />
      <NoSabe t={t} />
      <EmpresaInfo t={t} />
      <Nudo t={t} />
      <AgenciaIA t={t} />
      <Enjambre t={t} />
      <Modelo t={t} />
      <Habilidades t={t} />
      <Inversion t={t} />
      <Bombilla t={t} />
      <Catorce t={t} />
      <Engranajes t={t} />
      <Candado t={t} />
      <Mentoria t={t} />
      <Reserva t={t} />
      <Puzle t={t} />

      {/* Lista en forma de ruta vertical: un trazo que se dibuja de hito en hito (entender → ofrecer → entregar) */}
      <Ventana t={t} a={LISTA[0]} b={LISTA[1] + SALIDA}>
        <div style={{position: 'absolute', left: -60, right: -60, top: 800, height: 560, background: VELO}} />
        <div style={{position: 'absolute', left: 100, width: 860, top: 860, height: 440, filter: SOMBRA}}>
          {(() => {
            const ITEMS: [string, number, number, number][] = [['entender qué\nautomatizaciones\nnecesitan los negocios', 29.52, 0, 162], ['cómo puedes\nofrecerlas', 32.16, 200, 108], ['cómo organizar\nsu entrega', 33.96, 346, 108]];
            const cy = ITEMS.map(([, , top, h]) => top + h / 2);
            const baja = iv(t, [ITEMS[1][1] - 9 * F, ITEMS[1][1], ITEMS[2][1] - 9 * F, ITEMS[2][1]], [cy[0], cy[1], cy[1], cy[2]], Easing.bezier(0.45, 0, 0.25, 1));
            return (
              <>
                <svg width={92} height={440} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                  <line x1={46} y1={cy[0]} x2={46} y2={cy[2]} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeDasharray="2 14" strokeLinecap="round" />
                  <line x1={46} y1={cy[0]} x2={46} y2={baja} stroke={C.amarillo} strokeWidth={8} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />
                  {baja > cy[0] + 1 && baja < cy[2] - 1 && Math.abs(baja - cy[1]) > 1 && <circle cx={46} cy={baja} r={12} fill="#fff" style={{filter: `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},1))`}} />}
                  {ITEMS.map(([, en], i) => {
                    if (t < en) return null;
                    const e = aparece(t, en, -18);
                    const fl = flota(t, i * 1.4, 3);
                    return (
                      <g key={i}>
                        <Pulso t={t} en={en} x={46} y={cy[i]} r={46} color={C.amarillo} />
                        <g transform={`translate(46 ${cy[i] + fl.y}) scale(${e.sx * fl.s} ${e.sy * fl.s}) rotate(${e.rot})`}>
                          <circle r={44} fill={C.amarillo} stroke="#fff" strokeWidth={4} style={{filter: `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.9))`}} />
                          <IconoTrazado d={ICONOS_RUTA[i]} t={t} en={en + 2 * F} color="#1b1b20" size={50} x={-25} y={-25} />
                        </g>
                        <Particulas t={t} en={en} x={46} y={cy[i]} n={8} radio={90} />
                      </g>
                    );
                  })}
                </svg>
                {ITEMS.map(([txt, en, top, h]) => {
                  const tx = iv(t, [en + 2 * F, en + 11 * F], [0, 1], Easing.bezier(0.16, 1, 0.3, 1));
                  if (t < en) return null;
                  return (
                    <div key={txt} style={{position: 'absolute', left: 124, top, height: h, display: 'flex', alignItems: 'center', ...H, fontSize: 50, lineHeight: 1.02, whiteSpace: 'pre',
                      clipPath: `inset(-10% ${(1 - tx) * 100}% -10% -5%)`, translate: `${(1 - muelle(t, en + 2 * F, 2.4, 7)) * -36}px 0px`}}>{txt}</div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </Ventana>

      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={70.48}>haz</Sube>
          <Sube t={t} en={70.72}>clic</Sube>
          <Sube t={t} en={70.96}>en</Sube>
          <Sube t={t} en={71.04}>el</Sube>
          <Sube t={t} en={71.16} style={amarillo}>botón</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 71.3 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 71.3)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 70.48, 70.72, 70.96, 71.04, 71.16].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['thud', 1.64, -4], ['tings', 29.52, -8], ['tings', 32.16, -8], ['tings', 33.96, -8], ['boom', 5.28, -3], ['pop', 10.28, -4], ['pop', 11.24, -4], ['pop', 12.64, -4], ['pop', 15.76, -4], ['thud', 17.68, -4],
        ['pop', 20.6, -4], ['pop', 21.04, -4], ['boom', 26.88, -4], ['click', 29.52], ['click', 32.16], ['click', 33.96], ['pop', 42.8, -4], ['pop', 49.52, -4],
        ['pop', 17.62, -8], ['negativo', 17.74, -8], ['pop', 18.96, -7], ['snap', 19.52, -8], ['swish', 20.6, -11], ['pop', 22.96, -7], ['alerta', 23.56, -11], ['reveal', 24.12, -10],
        ['pop', 24.8, -7], ['tings', 26.95, -10], ['pop', 27.88, -7], ['twinkle', 28.4, -10], ['pop', 36.2, -7], ['ding', 37.36, -11], ['burbuja', 38.44, -9],
        ['pop', 40.12, -8], ['pop', 40.84, -8], ['pop', 41.08, -8], ['datos', 41.84, -12], ['pop', 43.36, -7], ['pop', 44.4, -7], ['tap', 51.8, -8], ['tings', 52.4, -10],
        ['interruptor', 53.28, -8], ['datos', 55.62, -11], ['snap', 57.68, -9], ['twinkle', 59.08, -10], ['click', 60.6, -6], ['pop', 64.36, -7], ['pop', 65.48, -7],
        ['pop', 67.44, -7], ['confirmar', 68.36, -9], ['snap', 74.44, -6], ['exito', 74.6, -10], ['pop', 9.92, -7],
        ['ding', 52.8, -6], ['boom', 55.72, -3], ['riser', 61.56, -3], ['boom', 61.56, -2], ['twinkle', 61.8, -6], ['pop', 68.36, -4],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
