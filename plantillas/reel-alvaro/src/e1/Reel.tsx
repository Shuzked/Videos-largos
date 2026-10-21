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
import {Destello, IconoTrazado, Particulas, Pulso, aparece, flota, muelle, Chip, Conector, Check, Exclamacion, Lienzo, ROJO, VERDE, OSCURO} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
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

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
const lim = (x: number) => Math.min(1, Math.max(0, x));
// Iconos 24x24 (Material Icons y rutas ya revisadas)
const ICONO = {
  telefono: 'M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z',
  cita: 'M16.53 11.06L15.47 10l-4.88 4.88-2.12-2.12-1.06 1.06L10.59 17l5.94-5.94zM19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
  tienda: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  chat: ICONO10.chat,
  persona: ICONO10.persona,
  ia: ICONO10.ia,
  play: ICONO10.play,
  herramienta: ICONO10.herramienta,
  diana: ICONO10.diana,
  etiqueta: ICONO10.etiqueta,
};

// Voz del asistente durante la llamada: sus subtítulos van en otro color (sin rótulos ni nombres)
const VOZ_IA: [number, number][] = [[5.12, 8.0], [10.85, 14.42], [15.76, 18.82]];
const enIA = (x: number) => VOZ_IA.some(([a, b]) => x >= a - 0.01 && x < b);
const IA_COLOR = '#5EE1FF';
const estiloIA: React.CSSProperties = {color: IA_COLOR, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('94,225,255', 0.9)}`};

// 1) Llamada en curso: la tarjeta sale con muelle (aplastar/estirar), el teléfono se dibuja y lanza ondas cada segundo,
// la onda de voz se mueve con quien habla (azul cuando habla el asistente) y el cronómetro corre
const LLAMADA: [number, number] = [5.0, 18.84];
const Llamada: React.FC<{t: number}> = ({t}) => {
  const [a, b] = LLAMADA;
  const ap = aparece(t, a, 0);
  const habla = WS.some((w) => t >= w[1] && t < w[2]);
  const ia = enIA(t);
  const seg = Math.max(0, Math.floor(t - a));
  const fl = flota(t, 0.4, 3);
  const verde = '#2fd36b';
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(540 ${285 + fl.y}) scale(${ap.sx} ${ap.sy})`}>
          <rect x={-400} y={-86} width={800} height={172} rx={46} fill={OSCURO} stroke={ia ? IA_COLOR : 'rgba(255,255,255,0.75)'} strokeWidth={4}
            style={{filter: ia ? `drop-shadow(0 0 16px ${IA_COLOR})` : 'none'}} />
          <g transform="translate(-316 0)">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((k) => <Pulso key={k} t={t} en={a + 0.3 + k} x={0} y={0} r={50} color={verde} dur={20} />)}
            <circle r={50} fill={verde} />
            <g transform={`rotate(${Math.sin(t * 18) * (t - a < 0.8 ? 12 : 3)})`}>
              <IconoTrazado d={ICONO.telefono} t={t} en={a + 0.1} color="#fff" size={58} x={-29} y={-29} />
            </g>
          </g>
          {Array.from({length: 22}, (_, i) => {
            const amp = habla ? 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + i * 1.7) * Math.cos(t * 7.3 + i * 0.6)) : 0.1;
            const h = amp * 96 * lim((t - a - 0.2 - i * 0.015) / 0.2);
            return <rect key={i} x={-232 + i * 21} y={-h / 2} width={13} height={Math.max(4, h)} rx={6.5} fill={ia ? IA_COLOR : '#fff'} opacity={0.92} />;
          })}
          <text x={360} y={16} textAnchor="end" style={{fontFamily: 'Montserrat', fontWeight: 800, fontSize: 44, fontVariantNumeric: 'tabular-nums'}} fill="#fff">{`0:${String(seg).padStart(2, '0')}`}</text>
        </g>
      </Lienzo>
    </Ventana>
  );
};

// 2) "puede responder preguntas, atender llamadas y ayudar a gestionar citas dependiendo de cómo esté configurado":
// núcleo de IA con sus capacidades en órbita (salen con muelle, el icono se dibuja, ráfaga al llegar);
// al decir "configurado" la onda del núcleo se convierte en un engranaje que gira
const NODOS: [number, string][] = [[22.88, ICONO.chat], [24.04, ICONO.telefono], [25.96, ICONO.cita]];
const ORBITA = {a: 22.56, b: 29.0, cx: 540, cy: 255, rx: 370, ry: 70, config: 27.2};
const Orbita: React.FC<{t: number}> = ({t}) => {
  const {a, b, cx, cy, rx, ry, config} = ORBITA;
  const nace = aparece(t, a, 0);
  const giro = (t - a) * 0.42;
  const engranaje = lim((t - config) / 0.3);
  const sats = NODOS.map(([en, d], i) => {
    // fase elegida para que al decir "configurado" ningún satélite pase por delante del núcleo (se ve el engranaje)
    const ang = -Math.PI / 2 + giro + (i * 2 * Math.PI) / 3 + (2 * Math.PI) / 3;
    const sale = muelle(t, en, 2.2, 6.5);
    const x = cx + Math.cos(ang) * rx * sale;
    const y = cy + Math.sin(ang) * ry * sale;
    const prof = (Math.sin(ang) + 1) / 2; // 0 detrás, 1 delante
    return {en, d, x, y, sale, prof, esc: 0.7 + 0.3 * prof};
  });
  const ondas = Array.from({length: 7}, (_, k) => 10 + 22 * Math.abs(Math.sin(t * 7.5 + k * 0.9)) * (1 - engranaje));
  const satEl = (s: (typeof sats)[number], i: number) => {
    if (t < s.en) return null;
    const e = aparece(t, s.en, 16);
    const pulso = t > config ? 0.5 + 0.5 * Math.sin((t - config) * 9 - i * 1.4) : 0;
    return (
      <g key={i} transform={`translate(${s.x} ${s.y})`} opacity={0.6 + 0.4 * s.prof}>
        <Pulso t={t} en={s.en} x={0} y={0} r={70 * s.esc} color={C.amarillo} />
        <g transform={`scale(${s.esc * e.sx} ${s.esc * e.sy}) rotate(${e.rot})`}>
          <rect x={-68} y={-68} width={136} height={136} rx={40} fill={OSCURO} stroke={C.amarillo} strokeWidth={5 + 3 * pulso}
            style={{filter: `drop-shadow(0 0 ${10 + 14 * pulso}px rgba(${GLOW_AMARILLO},0.9))`}} />
          <IconoTrazado d={s.d} t={t} en={s.en + 2 * F} color={C.amarillo} size={72} x={-36} y={-36} />
        </g>
        <Particulas t={t} en={s.en + 0.15} x={0} y={0} n={8} radio={110} />
      </g>
    );
  };
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <ellipse cx={cx} cy={cy} rx={rx * Math.max(0, nace.sx)} ry={ry * Math.max(0, nace.sy)} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="3 16" strokeLinecap="round"
          strokeDashoffset={-(t - a) * 60} />
        {sats.map((s, i) => t >= s.en && (
          <line key={`l${i}`} x1={cx} y1={cy} x2={s.x} y2={s.y} stroke={C.amarillo} strokeWidth={4} opacity={0.5 * Math.min(1, s.sale)} strokeDasharray="10 12" strokeDashoffset={(t - s.en) * -90} />
        ))}
        {sats.map((s, i) => (s.prof < 0.5 ? satEl(s, i) : null))}
        <g transform={`translate(${cx} ${cy}) scale(${nace.sx} ${nace.sy})`}>
          <circle r={118 + 10 * Math.sin(t * 4)} fill={`rgba(${GLOW_AMARILLO},0.12)`} />
          <circle r={92} fill="#141418" stroke={C.amarillo} strokeWidth={7} style={{filter: `drop-shadow(0 0 22px rgba(${GLOW_AMARILLO},1))`}} />
          <g transform={`rotate(${(t - a) * 140})`}><circle r={106} fill="none" stroke={C.amarillo} strokeWidth={4} strokeDasharray="60 40 10 40" opacity={0.8} /></g>
          <g opacity={1 - engranaje}>
            {ondas.map((h, k) => <rect key={k} x={-57 + k * 17} y={-h / 2} width={10} height={h} rx={5} fill={C.amarillo} />)}
          </g>
          {t >= config && (
            <g transform={`scale(${aparece(t, config, 0).sx}) rotate(${(t - config) * 120})`}>
              <path fill={C.amarillo} d="M-8-58h16l4 14a46 46 0 0 1 12 5l13-7 11 11-7 13a46 46 0 0 1 5 12l14 4v16l-14 4a46 46 0 0 1-5 12l7 13-11 11-13-7a46 46 0 0 1-12 5l-4 14h-16l-4-14a46 46 0 0 1-12-5l-13 7-11-11 7-13a46 46 0 0 1-5-12l-14-4v-16l14-4a46 46 0 0 1 5-12l-7-13 11-11 13 7a46 46 0 0 1 12-5zM0-22a22 22 0 1 0 0 44 22 22 0 1 0 0-44z" />
            </g>
          )}
        </g>
        <Particulas t={t} en={config} x={cx} y={cy} n={12} radio={190} />
        {sats.map((s, i) => (s.prof >= 0.5 ? satEl(s, i) : null))}
      </Lienzo>
    </Ventana>
  );
};

// 3) "lo interesante no es simplemente la tecnología, es que hay negocios que necesitan servicios como este":
// la IA aparece sola, se aparta y salen tres negocios con su alerta; las flechas con flujo los conectan y se ponen en verde
const NEGOCIOS = {a: 30.3, b: 34.76, tecnologia: 30.56, aparta: 31.36, negocios: 32.44, servicios: 33.6, este: 34.3};
const Negocios: React.FC<{t: number}> = ({t}) => {
  const {a, b, tecnologia, aparta, negocios, servicios, este} = NEGOCIOS;
  const m = muelle(t, aparta, 2.2, 6.5);
  const ix = 540 + (250 - 540) * m;
  const ys = [130, 250, 370];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {ys.map((y, i) => (
          <Conector key={i} t={t} en={servicios + i * 0.1} d={`M ${ix + 76} 250 C ${ix + 200} 250, 600 ${y}, ${780 - 64} ${y}`} color={t >= este ? VERDE : C.amarillo} dur={0.35} flujo grosor={6}
            punta={[780 - 64, y, Math.atan2(y - y, 780 - 64 - 600)]} />
        ))}
        <g transform={`translate(${ix - 540} 0)`}>
          <Chip t={t} en={tecnologia} d={ICONO.ia} x={540} y={250} r={76} fase={0.3} />
        </g>
        {ys.map((y, i) => {
          const en = negocios + i * 0.1;
          const ok = t >= este + i * 0.08;
          return (
            <g key={i}>
              <Chip t={t} en={en} d={ICONO.tienda} x={845} y={y} r={56} fondo={ok ? VERDE : '#fff'} color={ok ? '#fff' : '#1b1b20'} fase={i * 1.2} />
              {t >= en + 0.12 && (
                <g transform={`translate(${893} ${y - 44})`}>
                  <circle r={17 * aparece(t, en + 0.12, 0).sx} fill={ok ? '#fff' : ROJO} stroke="#fff" strokeWidth={3} />
                  {ok ? <Check t={t} en={este + i * 0.08} s={0.38} color={VERDE} /> : <><rect x={-2.5} y={-10} width={5} height={12} rx={2.5} fill="#fff" /><circle cy={7} r={3} fill="#fff" /></>}
                </g>
              )}
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 4) "tú puedes aprender a ofrecerles soluciones basadas en IA para ayudarles a resolver esos problemas":
// tú → la solución de IA → el negocio con el problema (exclamación), que se resuelve en verde con un ✓
const PUENTE = {a: 40.25, b: 46.3, tu: 40.2, soluciones: 41.76, negocio: 44.2, resolver: 45.12};
const Puente: React.FC<{t: number}> = ({t}) => {
  const {a, b, tu, soluciones, negocio, resolver} = PUENTE;
  const ok = t >= resolver;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={tu + 0.06} d={ICONO.persona} x={230} y={260} r={62} fondo="#fff" fase={0} />
        <Conector t={t} en={soluciones - 0.3} d="M 304 260 L 450 260" dur={0.28} flujo punta={[450, 260, 0]} />
        <Chip t={t} en={soluciones} d={ICONO.ia} x={540} y={260} r={74} fase={1} />
        <Conector t={t} en={negocio - 0.25} d="M 626 260 L 772 260" color={ok ? VERDE : C.amarillo} dur={0.28} flujo punta={[772, 260, 0]} />
        <Chip t={t} en={negocio} d={ICONO.tienda} x={850} y={260} r={62} fondo={ok ? VERDE : '#fff'} color={ok ? '#fff' : '#1b1b20'} fase={2} />
        {!ok && <Exclamacion t={t} en={negocio + 0.12} x={850} y={128} s={0.8} color={ROJO} />}
        {ok && (
          <g transform="translate(898 212)">
            <circle r={24 * aparece(t, resolver, 0).sx} fill="#fff" stroke={VERDE} strokeWidth={4} />
            <Check t={t} en={resolver + 0.06} s={0.55} color={VERDE} />
          </g>
        )}
        <Particulas t={t} en={resolver} x={850} y={260} n={12} radio={140} colores={[VERDE, '#ffffff', C.amarillo]} />
      </Lienzo>
    </Ventana>
  );
};

// 5) "por eso he preparado un curso introductorio… son 14 clases": la tarjeta del curso sale con el play que se dibuja;
// al decir "14" se reparte en catorce clases (dos filas de siete) que se van completando mientras explica el modelo
const CURSO = {a: 59.0, b: 68.4, tarjeta: 59.2, catorce: 63.36, completa: 64.64, fin: 67.8};
const Curso: React.FC<{t: number}> = ({t}) => {
  const {a, b, tarjeta, catorce, completa, fin} = CURSO;
  const ap = aparece(t, tarjeta, 8);
  const sale = lim((t - catorce + 0.1) / 0.25);
  const fl = flota(t, 0.6, 4);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {sale < 1 && (
          <g transform={`translate(540 ${230 + fl.y}) scale(${ap.sx * (1 - 0.6 * sale)} ${ap.sy * (1 - 0.6 * sale)}) rotate(${ap.rot})`} opacity={1 - sale}>
            {/* tres tarjetas de lección en abanico detrás */}
            {[-1, 1].map((l) => <rect key={l} x={-150} y={-92} width={300} height={184} rx={26} fill="rgba(30,32,42,0.9)" stroke="rgba(255,255,255,0.35)" strokeWidth={3}
              transform={`rotate(${l * 9 * lim((t - tarjeta - 0.15) / 0.3)}) translate(${l * 26} 6)`} />)}
            <rect x={-160} y={-98} width={320} height={196} rx={28} fill={OSCURO} stroke="#fff" strokeWidth={6} />
            <circle r={48} fill={C.amarillo} />
            <IconoTrazado d={ICONO.play} t={t} en={tarjeta + 3 * F} color="#1b1b20" size={60} x={-32} y={-30} />
            <rect x={-128} y={66} width={256} height={9} rx={4.5} fill="rgba(255,255,255,0.22)" />
            <rect x={-128} y={66} width={256 * (((t - tarjeta) / 2) % 1)} height={9} rx={4.5} fill={C.amarillo} />
          </g>
        )}
        {Array.from({length: 14}, (_, i) => {
          const en = catorce + i * 0.035;
          if (t < en) return null;
          const x = 540 + ((i % 7) - 3) * 92, y = 196 + Math.floor(i / 7) * 92;
          const e = aparece(t, en, 12);
          const hecha = t >= completa + (i * (fin - completa)) / 13;
          const f2 = flota(t, i * 0.5, 3);
          return (
            <g key={i} transform={`translate(${x} ${y + f2.y}) scale(${e.sx} ${e.sy}) rotate(${e.rot})`}>
              <rect x={-36} y={-36} width={72} height={72} rx={18} fill={hecha ? C.amarillo : OSCURO} stroke={hecha ? '#fff' : 'rgba(255,255,255,0.8)'} strokeWidth={4}
                style={{filter: hecha ? `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.8))` : 'none'}} />
              {hecha ? <Check t={t} en={completa + (i * (fin - completa)) / 13} s={0.62} color="#1b1b20" /> : <path d="M -8 -12 L 12 0 L -8 12 Z" fill="#fff" />}
            </g>
          );
        })}
        <Particulas t={t} en={catorce} x={540} y={242} n={16} radio={330} />
        <Destello t={t} en={fin + 0.15} x={540 + 3 * 92 + 30} y={170} tam={28} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "lo que necesitas es conocer las herramientas, aprender a identificar oportunidades y comprender cómo se venden":
// tres fichas sobre la cabeza que se encienden una a una (el icono se dibuja), unidas por conectores con flujo;
// al decir "servicios" laten las tres a la vez con una ráfaga
const LISTA3 = {a: 50.56, b: 58.5, pasos: [51.68, 53.68, 55.4], todas: 57.92};
const Lista: React.FC<{t: number}> = ({t}) => {
  const {a, b, pasos, todas} = LISTA3;
  const xs = [300, 540, 780];
  const y = 250;
  const ds = [ICONO.herramienta, ICONO.diana, ICONO.etiqueta];
  const late = t > todas ? 1 + 0.08 * Math.exp(-4 * (t - todas)) * Math.sin((t - todas) * 22) : 1;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {[0, 1].map((i) => (
          <Conector key={i} t={t} en={pasos[i + 1] - 0.3} d={`M ${xs[i] + 68} ${y} L ${xs[i + 1] - 68} ${y}`} color={C.amarillo} dur={0.3} flujo grosor={6} punta={[xs[i + 1] - 68, y, 0]} />
        ))}
        {xs.map((x, i) =>
          t < pasos[i] ? (
            <circle key={i} cx={x} cy={y} r={18 + 3 * Math.sin(t * 4 + i)} fill="rgba(255,255,255,0.35)" />
          ) : (
            <g key={i} transform={`translate(${x} ${y}) scale(${late}) translate(${-x} ${-y})`}>
              <Chip t={t} en={pasos[i]} d={ds[i]} x={x} y={y} r={62} fase={i * 1.3} />
            </g>
          ),
        )}
        {xs.map((x, i) => <Pulso key={i} t={t} en={todas + i * 0.06} x={x} y={y} r={66} color={C.amarillo} />)}
        <Particulas t={t} en={todas} x={540} y={y} n={16} radio={330} />
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
  // Lo que necesitas es conocer las herramientas / y aprender a identificar oportunidades / y comprender cómo se venden estos servicios
  // (la frase entera en grande, en tres tarjetas seguidas; arriba se encienden las tres fichas)
  {a: 50.56, b: 53.0, top: 940, lineas: [{ws: [['lo', 50.56], ['que', 50.72], ['necesitas', 50.84], ['es', 51.48]], size: 80}, {ws: [['conocer', 51.68], ['las', 52.08]], size: 84}, {ws: [['herramientas', 52.28, amarillo]], size: 120, golpe: true}]},
  {a: 53.04, b: 55.2, top: 940, lineas: [{ws: [['y', 53.04], ['aprender', 53.16], ['a', 53.6]], size: 84}, {ws: [['identificar', 53.68]], size: 100}, {ws: [['oportunidades', 54.28, amarillo]], size: 110, golpe: true}]},
  {a: 55.28, b: 58.5, top: 940, lineas: [{ws: [['y', 55.28], ['comprender', 55.4]], size: 84}, {ws: [['cómo', 56.04], ['se', 56.64], ['venden', 56.92], ['estos', 57.48]], size: 84}, {ws: [['servicios', 57.92, amarillo]], size: 120, golpe: true}]},
  // Curso introductorio
  {a: 59.64, b: 61.05, top: 1000, lineas: [{ws: [['un', 59.64], ['curso', 59.8]], size: 90}, {ws: [['introductorio', 60.08, amarillo]], size: 130, golpe: true}]},
  // 14 clases
  {a: 63.04, b: 64.25, top: 980, lineas: [{ws: [['son', 63.04]], size: 80}, {ws: [['14', 63.36, amarillo]], size: 280, golpe: true}, {ws: [['clases', 63.88]], size: 100}]},
  // 1 €
  {a: 68.48, b: 71.2, top: 960, lineas: [{ws: [['y', 68.48], ['puedes', 68.48], ['acceder', 68.76]], size: 80}, {ws: [['por', 69.2], ['tan', 69.44], ['solo', 69.64]], size: 80}, {ws: [['1 €', 70.12, amarillo]], size: 300, golpe: true}]},
];
const LISTA: [number, number] = [-10, -10];
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
      <Negocios t={t} />
      <Puente t={t} />
      <Curso t={t} />

      {/* Resto de frases en grande (delante) */}
      {GRANDES.slice(1).map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}

      <Lista t={t} />

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
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 71.24, 71.72, 71.84].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 1.0, -3], ['thud', 4.24, -3], ['popup', 5.0, -5], ['pop', 21.2, -3], ['pop', 21.8, -3],
        ['reveal', 22.56, -8], ['bloop', 22.88, -5], ['bloop', 24.04, -5], ['bloop', 25.96, -5], ['interruptor', 27.2, -6], ['hit', 29.2, -3], ['pop', 35.16, -3], ['pop', 35.88, -3], ['pop', 37.84, -3], ['thud', 47.4, -3],
        ['pop', 30.56, -7], ['swish', 31.36, -11], ['pop', 32.44, -7], ['datos', 33.6, -11], ['exito', 34.3, -9],
        ['pop', 40.26, -7], ['pop', 41.76, -6], ['alerta', 44.32, -10], ['exito', 45.12, -8],
        ['pop', 51.68, -6], ['pop', 53.68, -6], ['pop', 55.4, -6], ['exito', 57.92, -9], ['pop', 59.2, -6], ['pop', 60.08, -3], ['boom', 63.36, -3], ['puntos', 63.42, -9], ['twinkle', 67.95, -10],
        ['riser', 70.12, -3], ['boom', 70.12, -2], ['twinkle', 70.4, -6],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
