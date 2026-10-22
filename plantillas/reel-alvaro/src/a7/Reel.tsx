import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {OffthreadVideo, Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, ease, golpe, iv, Ventana} from '../anim';
import {CAPA, SIN_TEXTO, Zona, ZonaSegura, hueco} from '../zona';
import ZONAS from './zonas.json';
import {H, MIN, amarillo, rosa} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {ICONOS, Destello, IconoTrazado, Particulas, Pulso, aparece, flota, Chip, Conector, Check, Cruz, Exclamacion, Lienzo, estrella, ROJO, VERDE, OSCURO} from '../lottie';
import {ICONO10} from '../a10/iconos';
// Animaciones propias de este reel (no se repiten en otros vídeos). Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original)
// Sin ráfagas ni trazos sobre los títulos (el cliente no quiere líneas encima del texto)
const ESTILO: Estilo = {texto: 'rodar', golpe: 'cortina', impacto: 'polvo', sub: 'rodar', flecha: 'salto'};

export const DURACION_A7 = 76.24;
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
  [0.39, 1.13, 0.18, 'golpe'],
  [1.0, 1.04, 0.8, 'suave'],
  [2.9, 1.07, 0.8, 'suave'],
  [4.61, 1.12, 0.2, 'golpe'],
  [5.3, 1.04, 0.8, 'suave'],
  [7.25, 1.16, 0.16, 'golpe'],
  [7.98, 1.06, 0.3, 'golpe'],
  [8.96, 1.1, 0.3, 'golpe'],
  [10.03, 1.13, 0.3, 'golpe'],
  [12.07, 1.18, 0.16, 'golpe'],
  [12.6, 1.0, 0, 'corte'],
  [15.95, 1.0, 0, 'corte'],
  [15.97, 1.05, 1.5, 'suave'],
  [17.5, 1.08, 2.5, 'suave'],
  [20.2, 1.04, 0.8, 'suave'],
  [21.0, 1.07, 2.0, 'suave'],
  [23.24, 1.04, 0.8, 'suave'],
  [25.18, 1.08, 0.4, 'suave'],
  [26.5, 1.11, 0.25, 'golpe'],
  [27.3, 1.04, 0.8, 'suave'],
  [30.36, 1.07, 1.0, 'suave'],
  [33.2, 1.11, 0.25, 'golpe'],
  [34.0, 1.04, 0.8, 'suave'],
  [35.3, 1.07, 2.5, 'suave'],
  [38.22, 1.04, 0.6, 'suave'],
  [39.28, 1.1, 0.25, 'golpe'],
  [40.1, 1.04, 0.8, 'suave'],
  [43.23, 1.16, 0.16, 'golpe'],
  [44.0, 1.04, 0.8, 'suave'],
  [45.7, 1.11, 0.25, 'golpe'],
  [46.5, 1.04, 0.6, 'suave'],
  [47.68, 1.0, 0, 'corte'],
  [50.95, 1.0, 0, 'corte'],
  [50.97, 1.05, 0.8, 'suave'],
  [52.75, 1.1, 0.3, 'golpe'],
  [53.6, 1.04, 0.8, 'suave'],
  [55.06, 1.07, 3.0, 'suave'],
  [58.5, 1.04, 0.8, 'suave'],
  [60.46, 1.0, 0, 'corte'],
  [63.9, 1.0, 0, 'corte'],
  [63.92, 1.05, 0.8, 'suave'],
  [65.55, 1.1, 0.3, 'golpe'],
  [66.4, 1.04, 0.8, 'suave'],
  [66.94, 1.08, 1.5, 'suave'],
  [69.67, 1.04, 0.8, 'suave'],
  [70.5, 1.07, 3.5, 'suave'],
  [74.52, 1.1, 0.4, 'suave'],
  [75.04, 1.13, 0.2, 'golpe'],
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
const IMPACTOS = [0.39, 7.25, 12.07, 43.23];
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
  {src: 'universidad', a: 12.6, b: 15.95, desde: 1, foco: 0.5},
  {src: 'negocios', a: 47.68, b: 50.95, desde: 2, foco: 0.5},
  {src: 'captacion', a: 60.46, b: 62.13, desde: 2, foco: 0.5},
  {src: 'entrega', a: 62.13, b: 63.9, desde: 2, foco: 0.5},
];
// Este reel no lleva pantallas de ejemplo
const PANTALLAS: {a: number; b: number}[] = [];
const CORTES = Array.from(new Set([...BROLL, ...PANTALLAS].flatMap((b) => [b.a, b.b]))).sort((x, y) => x - y);
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
            <Video src={staticFile(`a7/broll/${b.src}.mp4`)} muted trimBefore={fr(b.desde ?? 0)} style={{position: 'absolute', top: 0, left, width: ancho, height: 1920}} />
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
const enIA = (_x: number) => false;
const estiloIA: React.CSSProperties = {};

// Iconos 24x24 (Material Icons y rutas ya revisadas)
const ICONO = {
  tienda: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  reunion: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  carpeta: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 8h-8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z',
  mejora: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  chat: ICONO10.chat,
  persona: ICONO10.persona,
  edificio: ICONO10.edificio,
  ia: ICONO10.ia,
  documento: ICONO10.documento,
  libro: ICONO10.libro,
  etiqueta: ICONOS.etiqueta,
  megafono: ICONOS.megafono,
  lupa: ICONOS.lupa,
};
// Ficha cuadrada (como las de las 10 reuniones): sale con muelle, el icono se traza, puede girar y marcarse
const Ficha: React.FC<{t: number; en: number; x: number; y: number; lado: number; d: string; borde?: string; fondo?: string; icono?: string; giro?: number; fase?: number; opac?: number}> = ({
  t, en, x, y, lado, d, borde = '#fff', fondo = OSCURO, icono = '#fff', giro = 1, fase = 0, opac = 1,
}) => {
  if (t < en) return null;
  const ap = aparece(t, en, 10);
  const fl = flota(t, fase, 3);
  return (
    <g transform={`translate(${x} ${y + fl.y}) scale(${ap.sx * giro * fl.s} ${ap.sy * fl.s}) rotate(${ap.rot})`} opacity={opac}>
      <rect x={-lado / 2} y={-lado / 2} width={lado} height={lado} rx={lado * 0.24} fill={fondo} stroke={borde} strokeWidth={4} />
      <IconoTrazado d={d} t={t} en={en + 2 * F} color={icono} size={lado * 0.52} x={-lado * 0.26} y={-lado * 0.26} />
    </g>
  );
};

// 1) "10 negocios, 10 reuniones y 10 personas diciéndome que no": diez fichas de negocio que caen con muelle,
// giran como cartas y se convierten en reuniones, y al decir "diciéndome que no" se van marcando en rojo con una ✕ que se dibuja
const DIEZ = {a: 7.9, b: 12.6, negocios: 7.98, reuniones: 8.96, noes: 10.92, fin: 12.07};
const Diez: React.FC<{t: number}> = ({t}) => {
  const {a, b, negocios, reuniones, noes, fin} = DIEZ;
  const paso = (fin - noes) / 9;
  const golpeFin = t > fin && t < fin + 0.5 ? Math.sin((t - fin) * 70) * 7 * (1 - (t - fin) / 0.5) : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(${golpeFin} 0)`}>
          {Array.from({length: 10}, (_, i) => {
            const x = 540 + ((i % 5) - 2) * 142, y = 168 + Math.floor(i / 5) * 140;
            const en = negocios + i * 0.05;
            const k = lim((t - reuniones - i * 0.04) / 0.32);
            const giro = Math.cos(Math.PI * k);
            const sello = noes + i * paso;
            const roja = t >= sello;
            const tiembla = roja && t < sello + 0.3 ? Math.sin((t - sello) * 80) * 5 * (1 - (t - sello) / 0.3) : 0;
            return (
              <g key={i} transform={`translate(${tiembla} 0)`}>
                <Ficha t={t} en={en} x={x} y={y} lado={112} d={k < 0.5 ? ICONO.tienda : ICONO.reunion} giro={Math.max(0.04, Math.abs(giro))}
                  borde={roja ? ROJO : '#fff'} fondo={roja ? 'rgba(70,10,18,0.92)' : OSCURO} icono={roja ? 'rgba(255,255,255,0.35)' : '#fff'} fase={i * 0.7} />
                {roja && (
                  <g transform={`translate(${x} ${y + flota(t, i * 0.7, 3).y})`}>
                    <g style={{filter: `drop-shadow(0 0 8px ${ROJO})`}}><Cruz t={t} en={sello} s={1.15} color={ROJO} /></g>
                    <Pulso t={t} en={sello} x={0} y={0} r={58} color={ROJO} dur={10} />
                  </g>
                )}
              </g>
            );
          })}
        </g>
        <Particulas t={t} en={fin} x={540} y={238} n={16} radio={330} colores={[ROJO, '#ffffff']} />
      </Lienzo>
    </Ventana>
  );
};

// 2) "no tenía una cartera de clientes ni una trayectoria empresarial detrás": la carpeta de clientes sale vacía
// (tres huecos punteados que giran sin nadie dentro) y una gráfica de trayectoria intenta subir pero se queda plana
const VACIO = {a: 16.2, b: 19.95, cartera: 16.86, clientes: 17.4, trayectoria: 18.18, detras: 19.5};
const Vacio: React.FC<{t: number}> = ({t}) => {
  const {a, b, cartera, clientes, trayectoria, detras} = VACIO;
  const panel = aparece(t, trayectoria, 0);
  const ejes = lim((t - trayectoria - 0.1) / 0.3);
  // la línea intenta subir y vuelve a caer: se queda pegada abajo
  const intento = lim((t - trayectoria - 0.35) / 0.9);
  const sube = Math.sin(lim((t - trayectoria - 0.5) / 0.6) * Math.PI) * 40;
  const fl = flota(t, 1.2, 3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={cartera} d={ICONO.carpeta} x={330} y={295} r={66} fondo="#fff" fase={0.3} />
        {/* tres huecos de cliente vacíos: contorno punteado que gira y una silueta apenas visible */}
        {[[188, 200], [330, 140], [472, 200]].map(([x, y], i) => {
          const en = clientes + i * 0.1;
          if (t < en) return null;
          const e = aparece(t, en, 0);
          const fl = flota(t, i * 1.3, 4);
          return (
            <g key={i} transform={`translate(${x} ${y + fl.y}) scale(${e.sx} ${e.sy})`}>
              <circle r={40} fill="rgba(0,0,0,0.45)" />
              <g transform={`rotate(${(t - en) * 50 * (i % 2 ? -1 : 1)})`}><circle r={40} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={4} strokeDasharray="9 9" /></g>
              <g transform="translate(-22 -22) scale(1.83)"><path d={ICONO.persona} fill="rgba(255,255,255,0.18)" /></g>
            </g>
          );
        })}
        {t >= trayectoria && (
          <g transform={`translate(745 ${270 + fl.y}) scale(${panel.sx} ${panel.sy})`}>
            <rect x={-150} y={-100} width={300} height={200} rx={24} fill={OSCURO} stroke="#fff" strokeWidth={5} />
            <path d="M -110 -66 L -110 66 L 116 66" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ejes} />
            <path d={`M -100 52 L -40 ${52 - sube * 0.5} L 20 ${52 - sube} L 100 52`} fill="none" stroke={t > detras ? ROJO : C.amarillo} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - intento} style={{filter: `drop-shadow(0 0 6px ${t > detras ? ROJO : C.amarillo})`}} />
          </g>
        )}
      </Lienzo>
    </Ventana>
  );
};

// 3) "lo que tenía que hacer era aprender a vender un servicio": del libro (aprender) sale una flecha a la etiqueta (vender)
const VENDER = {a: 21.3, b: 23.1, aprender: 21.45, vender: 21.98};
const Vender: React.FC<{t: number}> = ({t}) => {
  const {a, b, aprender, vender} = VENDER;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={aprender} d={ICONO.libro} x={370} y={240} r={60} fondo="#fff" fase={0} />
        <Conector t={t} en={aprender + 0.18} d="M 445 240 L 625 240" dur={0.3} flujo punta={[625, 240, 0]} />
        <Chip t={t} en={vender} d={ICONO.etiqueta} x={710} y={240} r={70} fase={1.2} />
        <Destello t={t} en={vender + 0.15} x={770} y={175} tam={26} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "vender no consiste en convencer a cualquiera de que compre algo que no necesita": un megáfono lanza ondas
// a una fila de personas cualquiera; al decir "no necesita" todas niegan con la cabeza y el megáfono se marca en rojo
const CONVENCER = {a: 26.3, b: 29.95, megafono: 26.5, gente: 27.24, compre: 28.34, no: 29.29};
const Convencer: React.FC<{t: number}> = ({t}) => {
  const {a, b, megafono, gente, compre, no} = CONVENCER;
  const xs = [560, 650, 740, 830, 920];
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={megafono} d={ICONO.megafono} x={235} y={240} r={70} fondo={t >= no ? ROJO : C.amarillo} color={t >= no ? '#fff' : '#1b1b20'} fase={0.4} />
        {/* ondas que salen del megáfono hacia la gente */}
        {t >= megafono + 0.2 && t < no &&
          [0, 1, 2].map((i) => {
            const f = ((t - megafono) * 1.6 + i / 3) % 1;
            const r = 40 + f * 170;
            return <path key={i} d={`M ${310 + r * 0.3} ${240 - r * 0.55} A ${r} ${r} 0 0 1 ${310 + r * 0.3} ${240 + r * 0.55}`} fill="none" stroke={C.amarillo} strokeWidth={6} strokeLinecap="round" opacity={(1 - f) * 0.9} />;
          })}
        {xs.map((x, i) => {
          const en = gente + i * 0.06;
          const niega = t >= no ? Math.sin((t - no - i * 0.04) * 22) * 14 * Math.exp(-3 * Math.max(0, t - no)) : 0;
          return (
            <g key={i} transform={`rotate(${niega} ${x} 240)`}>
              <Chip t={t} en={en} d={ICONO.persona} x={x} y={240} r={38} fondo={t >= no ? 'rgba(255,255,255,0.55)' : '#fff'} fase={i * 0.9} sinRafaga />
            </g>
          );
        })}
        {/* lo que intenta colocar: una caja que vuela hacia ellos y rebota */}
        {t >= compre && (() => {
          const k = lim((t - compre) / 0.5);
          const vuelta = t >= no ? lim((t - no) / 0.45) : 0;
          const x = 320 + (640 - 320) * k - (640 - 320) * vuelta, y = 240 - Math.sin(k * Math.PI) * 110 + vuelta * 40;
          return (
            <g transform={`translate(${x} ${y}) rotate(${k * 200 - vuelta * 260})`} opacity={1 - lim((vuelta - 0.7) / 0.3)}>
              <rect x={-26} y={-26} width={52} height={52} rx={12} fill={C.amarillo} stroke="#fff" strokeWidth={3} />
              <g transform="translate(-15 -15) scale(1.25)"><path d={ICONO10.caja} fill="#1b1b20" /></g>
            </g>
          );
        })()}
        {t >= no + 0.12 && (
          <g transform="translate(290 182)">
            <circle r={26 * aparece(t, no + 0.12, 0).sx} fill={ROJO} stroke="#fff" strokeWidth={4} />
            <Cruz t={t} en={no + 0.16} s={0.55} />
          </g>
        )}
      </Lienzo>
    </Ventana>
  );
};

// 5) "encontrar negocios que tengan un problema que puedas resolver, y entender cómo presentarles esa solución":
// una lupa recorre una fila de negocios, en uno salta la exclamación (el problema), se pone verde con un ✓ al decir
// "resolver" y le llega una propuesta (documento) con una flecha al decir "presentarles"
const BUSCAR = {a: 30.9, b: 37.9, negocios: 31.11, barre: 31.45, problema: 33.2, resolver: 34.47, presentar: 36.3, solucion: 37.29};
const BUSCAR_X = [235, 425, 615, 805];
const Buscar: React.FC<{t: number}> = ({t}) => {
  const {a, b, negocios, barre, problema, resolver, presentar, solucion} = BUSCAR;
  const y = 270;
  // la lupa pasa por las tiendas y se detiene en la tercera
  const k = lim((t - barre) / (problema - 0.15 - barre));
  const ks = k * k * (3 - 2 * k);
  const lx = BUSCAR_X[0] + (BUSCAR_X[2] - BUSCAR_X[0]) * ks + Math.sin(k * Math.PI * 3) * 30 * (1 - k);
  const fuera = lim((t - problema) / 0.3);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {BUSCAR_X.map((x, i) => {
          const elegida = i === 2;
          const bien = elegida && t >= resolver;
          const atenua = t >= problema && !elegida ? 0.45 : 1;
          return (
            <g key={i}>
              <Ficha t={t} en={negocios + i * 0.08} x={x} y={y} lado={118} d={ICONO.tienda} fase={i}
                borde={bien ? VERDE : elegida && t >= problema ? ROJO : '#fff'} fondo={bien ? 'rgba(10,60,40,0.92)' : OSCURO} opac={atenua} />
              {bien && (
                <g transform={`translate(${x + 48} ${y + 46})`}>
                  <circle r={26 * aparece(t, resolver, 0).sx} fill={VERDE} stroke="#fff" strokeWidth={4} />
                  <Check t={t} en={resolver + 0.06} s={0.6} />
                </g>
              )}
            </g>
          );
        })}
        <Particulas t={t} en={resolver} x={BUSCAR_X[2]} y={y} n={12} radio={150} colores={[VERDE, '#ffffff']} />
        {t >= barre - 0.2 && fuera < 1 && (
          <g transform={`translate(${lx} ${y - 120 + Math.sin(t * 6) * 6}) scale(${aparece(t, barre - 0.2, 0).sx * (1 - fuera)})`}>
            <circle r={54} fill={C.amarillo} stroke="#fff" strokeWidth={5} />
            <g transform="translate(-34 -34) scale(2.83)"><path d={ICONO.lupa} fill="#1b1b20" /></g>
          </g>
        )}
        <Exclamacion t={t} en={problema} x={BUSCAR_X[2]} y={y - 135} s={0.95} color={ROJO} />
        {/* la propuesta llega con una flecha que baja en curva hasta el negocio */}
        <Chip t={t} en={presentar} d={ICONO.documento} x={880} y={120} r={52} fondo="#fff" fase={0.6} />
        <Conector t={t} en={presentar + 0.2} d={`M 845 165 Q 770 200 ${BUSCAR_X[2] + 68} ${y - 40}`} color={C.amarillo} dur={0.35} flujo
          punta={[BUSCAR_X[2] + 68, y - 40, Math.atan2(y - 40 - 200, BUSCAR_X[2] + 68 - 770)]} />
        <Destello t={t} en={solucion} x={BUSCAR_X[2]} y={y - 70} tam={30} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "después de aquellas 10 reuniones, las 3 siguientes terminaron convirtiéndose en mis primeros 3 clientes":
// las diez reuniones con ✕, una flecha que se dibuja y tres reuniones nuevas que al decir "clientes" se vuelven verdes con ✓
const MARCADOR = {a: 38.22, b: 44.2, siguientes: 40.23, clientes: 43.23};
const Marcador3: React.FC<{t: number}> = ({t}) => {
  const {a, b, siguientes, clientes} = MARCADOR;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {Array.from({length: 10}, (_, i) => {
          const x = 152 + (i % 5) * 70, y = 190 + Math.floor(i / 5) * 72;
          const en = a + 0.1 + i * 0.04;
          return (
            <g key={i}>
              <Ficha t={t} en={en} x={x} y={y} lado={60} d={ICONO.reunion} borde={ROJO} fondo="rgba(70,10,18,0.92)" icono="rgba(255,255,255,0.3)" fase={i * 0.6} />
              {t >= en + 0.15 && <g transform={`translate(${x} ${y + flota(t, i * 0.6, 3).y})`}><Cruz t={t} en={en + 0.15} s={0.62} color={ROJO} /></g>}
            </g>
          );
        })}
        <Conector t={t} en={siguientes - 0.25} d="M 500 226 L 612 226" dur={0.3} flujo punta={[612, 226, 0]} />
        {[690, 810, 930].map((x, i) => {
          const en = siguientes + i * 0.1;
          const ok = clientes + i * 0.08;
          const verde = t >= ok;
          const g = aparece(t, ok, 0);
          return (
            <g key={i}>
              <g transform={verde ? `translate(${x} 226) scale(${1 + 0.22 * Math.exp(-6 * (t - ok)) * Math.sin((t - ok) * 20)}) translate(${-x} -226)` : undefined}>
                <Ficha t={t} en={en} x={x} y={226} lado={98} d={verde ? ICONO.persona : ICONO.reunion} borde={verde ? VERDE : '#fff'} fondo={verde ? 'rgba(10,60,40,0.92)' : OSCURO} fase={i * 1.1} />
              </g>
              {verde && (
                <g transform={`translate(${x + 38} 264)`}>
                  <circle r={22 * g.sx} fill={VERDE} stroke="#fff" strokeWidth={3} />
                  <Check t={t} en={ok + 0.06} s={0.5} />
                </g>
              )}
              <Particulas t={t} en={ok} x={x} y={226} n={9} radio={110} colores={[VERDE, '#ffffff', C.amarillo]} />
            </g>
          );
        })}
      </Lienzo>
    </Ventana>
  );
};

// 7) "pero eso no significa que exista una fórmula mágica": la varita se dibuja, su estrella chisporrotea al decir
// "fórmula"… y al decir "mágica" se apaga, se cae y las chispas se desvanecen (no hay magia)
const VARITA = {a: 44.3, b: 47.66, varita: 44.48, estrella: 45.18, formula: 45.7, magica: 46.11};
const Varita: React.FC<{t: number}> = ({t}) => {
  const {a, b, varita, estrella: est, formula, magica} = VARITA;
  const dibuja = lim((t - varita) / 0.35);
  const cae = t > magica ? 1 - Math.exp(-4 * (t - magica)) * Math.cos((t - magica) * 9) : 0;
  const ang = -40 + cae * 75;
  const apaga = lim((t - magica) / 0.35);
  const col = apaga > 0.5 ? 'rgba(200,200,210,0.85)' : C.amarillo;
  const e = aparece(t, est, 30);
  const fl = flota(t, 0.8, 4);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(470 ${330 + fl.y}) rotate(${ang})`}>
          <line x1={0} y1={0} x2={230 * dibuja} y2={0} stroke="#fff" strokeWidth={14} strokeLinecap="round" />
          <line x1={0} y1={0} x2={60 * dibuja} y2={0} stroke="#1b1b20" strokeWidth={14} strokeLinecap="round" />
          {t >= est && (
            <g transform={`translate(246 0) rotate(${(t - est) * 90 * (1 - apaga)}) scale(${e.sx * (1 - 0.25 * apaga)} ${e.sy * (1 - 0.25 * apaga)})`}>
              <path d={estrella(46)} fill={col} stroke="#fff" strokeWidth={4} strokeLinejoin="round" style={{filter: apaga < 0.5 ? `drop-shadow(0 0 14px ${C.amarillo})` : 'none'}} />
            </g>
          )}
        </g>
        <Particulas t={t} en={formula} x={650} y={180} n={14} radio={170} />
        <Destello t={t} en={est + 0.1} x={720} y={120} tam={22} color={C.amarillo} />
        <Destello t={t} en={formula} x={600} y={110} tam={30} color="#fff" />
        <Destello t={t} en={formula + 0.12} x={760} y={230} tam={20} color={C.amarillo} />
        {/* chispas que se apagan y caen */}
        {t > magica &&
          Array.from({length: 6}, (_, i) => {
            const k = t - magica;
            const x = 600 + i * 34, y = 150 + k * k * 600 + i * 6;
            return <circle key={i} cx={x} cy={y} r={6} fill="rgba(220,220,230,0.8)" opacity={1 - lim(k / 0.9)} />;
          })}
      </Lienzo>
    </Ventana>
  );
};

// 8) "y esa sigue siendo una parte fundamental del emprendimiento": el ciclo hablar → rechazos → mejorar,
// con flechas curvas que se dibujan en el sentido de la marcha y un punto que da vueltas
const CICLO = {a: 51.0, b: 54.3, aparece: 51.18, flechas: 51.7, fundamental: 52.75};
const CICLO_R = 122;
const Ciclo: React.FC<{t: number}> = ({t}) => {
  const {a, b, aparece: en0, flechas, fundamental} = CICLO;
  const cx = 540, cy = 238;
  const angs = [-90, 30, 150];
  const iconos = [ICONO.chat, ICONO10.persona, ICONO.mejora];
  const fondos = ['#fff', ROJO, VERDE];
  const pto = (g: number, r = CICLO_R): [number, number] => [cx + Math.cos((g * Math.PI) / 180) * r, cy + Math.sin((g * Math.PI) / 180) * r];
  const giro = (t - flechas) * 70;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {angs.map((g, i) => {
          const g0 = g + 30, g1 = g + 120 - 30;
          const [x0, y0] = pto(g0), [x1, y1] = pto(g1);
          const tang = ((g1 + 90) * Math.PI) / 180;
          return <Conector key={i} t={t} en={flechas + i * 0.12} d={`M ${x0} ${y0} A ${CICLO_R} ${CICLO_R} 0 0 1 ${x1} ${y1}`} color={C.amarillo} dur={0.3} grosor={6} punta={[x1, y1, tang]} />;
        })}
        {t >= flechas + 0.5 && (() => {
          const [px, py] = pto(-90 + giro);
          return <circle cx={px} cy={py} r={9} fill="#fff" style={{filter: `drop-shadow(0 0 8px ${C.amarillo})`}} />;
        })()}
        {angs.map((g, i) => {
          const [x, y] = pto(g);
          return i === 1 ? (
            <g key={i}>
              <Chip t={t} en={en0 + i * 0.15} d={iconos[i]} x={x} y={y} r={48} fondo={ROJO} color="#fff" fase={i} />
              {t >= en0 + i * 0.15 + 0.1 && <g transform={`translate(${x + 34} ${y - 34})`}><circle r={18} fill="#fff" /><Cruz t={t} en={en0 + i * 0.15 + 0.12} s={0.42} color={ROJO} /></g>}
            </g>
          ) : (
            <Chip key={i} t={t} en={en0 + i * 0.15} d={iconos[i]} x={x} y={y} r={48} fondo={fondos[i]} color={i === 2 ? '#fff' : '#1b1b20'} fase={i} />
          );
        })}
        <Pulso t={t} en={fundamental} x={cx} y={cy} r={CICLO_R} color={C.amarillo} dur={16} />
        <Destello t={t} en={fundamental} x={cx} y={cy} tam={34} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 9) "hoy enseñamos a personas a montar agencias de servicios de inteligencia artificial": persona → agencia → IA,
// unidas por flechas que se dibujan con flujo
const ENSENA = {a: 55.6, b: 60.4, persona: 55.83, agencia: 56.84, ia: 58.08};
const Ensena: React.FC<{t: number}> = ({t}) => {
  const {a, b, persona, agencia, ia} = ENSENA;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={persona} d={ICONO.persona} x={250} y={240} r={60} fondo="#fff" fase={0} />
        <Conector t={t} en={agencia - 0.3} d="M 322 240 L 462 240" dur={0.28} flujo punta={[462, 240, 0]} />
        <Chip t={t} en={agencia} d={ICONO.edificio} x={540} y={240} r={70} fase={0.9} />
        <Conector t={t} en={ia - 0.3} d="M 622 240 L 762 240" dur={0.28} flujo punta={[762, 240, 0]} />
        <Chip t={t} en={ia} d={ICONO.ia} x={835} y={240} r={60} fase={1.8} />
        <Destello t={t} en={ia + 0.2} x={890} y={180} tam={24} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 10) "de poco sirve tener una buena tecnología si no sabes explicar por qué una empresa debería contratarla":
// la tecnología y la empresa están desconectadas (línea punteada que tiembla); al decir "explicar" aparece el
// bocadillo en medio, las une con flechas y al decir "contratarla" la empresa se pone verde con un ✓
const TECNO = {a: 64.6, b: 69.6, tecnologia: 65.55, no: 66.33, explicar: 66.94, empresa: 68.2, contratar: 68.87};
const Tecnologia: React.FC<{t: number}> = ({t}) => {
  const {a, b, tecnologia, no, explicar, empresa, contratar} = TECNO;
  const corte = t >= no && t < explicar;
  const ok = t >= contratar;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <Chip t={t} en={tecnologia} d={ICONO.ia} x={235} y={240} r={64} fase={0} />
        {t >= no && t < explicar + 0.2 && (
          <path d="M 310 240 L 770 240" fill="none" stroke={ROJO} strokeWidth={6} strokeDasharray="14 14" strokeDashoffset={-(t - no) * 40}
            opacity={(1 - lim((t - explicar) / 0.2)) * (corte ? 0.9 : 0)} transform={`translate(0 ${Math.sin(t * 40) * 3})`} />
        )}
        <Chip t={t} en={explicar} d={ICONO.chat} x={540} y={240} r={62} fondo="#fff" fase={1} />
        <Conector t={t} en={explicar + 0.2} d="M 305 240 L 465 240" color={C.amarillo} dur={0.3} flujo punta={[465, 240, 0]} />
        <Conector t={t} en={empresa - 0.1} d="M 608 240 L 768 240" color={ok ? VERDE : C.amarillo} dur={0.3} flujo punta={[768, 240, 0]} />
        <Chip t={t} en={empresa} d={ICONO.edificio} x={845} y={240} r={64} fondo={ok ? VERDE : '#fff'} color={ok ? '#fff' : '#1b1b20'} fase={2} />
        {ok && (
          <g transform="translate(893 192)">
            <circle r={24 * aparece(t, contratar, 0).sx} fill={VERDE} stroke="#fff" strokeWidth={4} />
            <Check t={t} en={contratar + 0.06} s={0.55} />
          </g>
        )}
        <Particulas t={t} en={contratar} x={845} y={240} n={12} radio={140} colores={[VERDE, '#ffffff', C.amarillo]} />
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
  {a: 0.0, b: 3.58, top: 60, lineas: [{ws: [['si', 0.0], ['te', 0.13], ['da', 0.26]], size: 80}, {ws: [['miedo', 0.39, rosaFuerte]], size: 190, golpe: true}, {ws: [['llamar', 0.71], ['a', 1.1], ['una', 1.16], ['empresa', 1.36]], size: 76, abajo: true}, {ws: [['para', 1.81], ['venderle', 2.07], ['algo', 2.58]], size: 76, abajo: true}, {ws: [['escucha', 2.9, amarillo], ['esto', 3.36, amarillo]], size: 100, abajo: true}]},
  // Mis primeras 10 reuniones como emprendedor terminaron en 10 noes
  {a: 3.84, b: 7.86, top: 960, lineas: [{ws: [['mis', 3.84], ['primeras', 4.05]], size: 80}, {ws: [['10 reuniones', 4.61, amarillo]], size: 120, golpe: true}, {ws: [['como', 5.37], ['emprendedor', 5.65]], size: 76}, {ws: [['terminaron', 6.42], ['en', 7.11]], size: 76}, {ws: [['10 noes', 7.25, rosaFuerte]], size: 170, golpe: true}]},
  // 10 negocios. 10 reuniones. Y 10 personas diciéndome que no.
  {a: 7.98, b: 8.94, top: 1000, lineas: [{ws: [['10', 7.98, amarillo]], size: 260, golpe: true}, {ws: [['negocios', 8.16]], size: 110}]},
  {a: 8.96, b: 9.92, top: 1000, lineas: [{ws: [['10', 8.96, amarillo]], size: 260, golpe: true}, {ws: [['reuniones', 9.14]], size: 110}]},
  {a: 9.94, b: 12.5, top: 1000, lineas: [{ws: [['y', 9.94], ['10', 10.03, rosa], ['personas', 10.2]], size: 100}, {ws: [['diciéndome', 10.92], ['que', 11.81]], size: 80}, {ws: [['no', 12.07, rosaFuerte]], size: 220, golpe: true}]},
  // Después de aquellas 10 reuniones, las 3 siguientes terminaron convirtiéndose en mis primeros 3 clientes
  {a: 38.22, b: 40.0, top: 980, lineas: [{ws: [['después', 38.22], ['de', 38.66], ['aquellas', 38.78]], size: 76}, {ws: [['10 reuniones', 39.28, rosaFuerte]], size: 120, golpe: true}]},
  {a: 40.04, b: 43.92, top: 960, lineas: [{ws: [['las', 40.04], ['3', 40.23, amarillo], ['siguientes', 40.29]], size: 84}, {ws: [['terminaron', 40.91]], size: 80}, {ws: [['convirtiéndose', 41.54], ['en', 42.42]], size: 76}, {ws: [['mis', 42.54], ['primeros', 42.73]], size: 80}, {ws: [['3 clientes', 43.23, amarillo]], size: 150, golpe: true}]},
];
// Este reel no tiene lista en grande
const LISTA: [number, number] = [-10, -10];
const CTA = 74.52;
const CTA_FIN = DURACION_A7; // "haz clic aquí abajo" hasta el final
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
const MAX_CAR = 18; // ~780 px a 70 px: no llega a la columna de botones de Instagram (x≈930)
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
const CLAVE = new Set(['universidad', 'agencia', 'vender', 'convencer', 'problema', 'solución', 'mágica', 'rechazos', 'emprendimiento', 'captación', 'entrega', 'tecnología', 'comercial']);

// Sombra difusa detrás de los subtítulos para que se lean sobre cualquier fondo
const FondoSub: React.FC<{opacidad: number}> = ({opacidad}) => (
  <div
    style={{
      position: 'absolute', left: -80, right: -80, top: 1300, height: 300, opacity: opacidad,
      background: 'radial-gradient(ellipse 52% 48% at 50% 50%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
    }}
  />
);

// un bloque largo (p. ej. una palabra muy larga) baja un poco de tamaño para no pasar de ~760 px: no llega a la columna de botones
const tamSub = (ws: W[]) => Math.min(70, 760 / (Math.max(1, ws.map((w) => limpiar(w[0])).join(' ').length) * 0.6));
const Subtitulos: React.FC<{t: number}> = ({t}) => {
  if (SIN_TEXTO) return null;
  const hay = (x: number) => BLOQUES.some((bq) => x >= bq.a && x < bq.b);
  const op = Math.max(...[-4, -2, 0, 2, 4].map((d) => (hay(t + d * F) ? 1 - Math.abs(d) / 6 : 0)));
  const bl = BLOQUES.find((x) => t >= x.a && t < x.b);
  return (
    <>
      {op > 0 && <FondoSub opacidad={op} />}
      {bl && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: tamSub(bl.ws), fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
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
const ANCHO = 800; // x 140-940: margen de Instagram a los lados y sin meterse bajo la columna de botones (x≈930) // ancho útil: ~100 px de margen a cada lado
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
// Zona segura de Instagram para el texto grande: x 140-940 (márgenes y columna de botones), nunca por encima de ARRIBA
// (barra del móvil y cabecera) ni por debajo de ABAJO (botón «Ver detalles» de los anuncios). Si un bloque pedía estar más
// arriba, baja y se reduce un 10 %; si se salía por abajo, sube. La palabra de golpe deja margen para su animación de entrada.
const ARRIBA = 230;
const ABAJO = 1480;
const ANCHO_GOLPE = 740;
const tamLinea = (l: Linea, baja: boolean) => Math.min(l.size * (baja ? 0.9 : 1), (l.golpe ? ANCHO_GOLPE : ANCHO) / (Math.max(1, l.ws.map((w) => w[0]).join(' ').length) * FACTOR));
const topSeguro = (top: number, lineas: Linea[], baja: boolean, a = -1, b = -1) => {
  // además, sin pisar los elementos animados que estén en pantalla a la vez (arriba o abajo)
  const [arriba, abajo] = hueco(ZONAS as Zona[], a, b, ARRIBA, ABAJO);
  return Math.max(arriba, Math.min(Math.max(top, arriba), abajo - lineas.flatMap(partir).reduce((s, l) => s + tamLinea(l, baja) * 1.02 + 4, 0)));
};
const FraseGrande: React.FC<{t: number; g: Grande; parte?: 'arriba' | 'abajo'}> = ({t, g, parte = 'arriba'}) =>
  // sin líneas en esta parte no se pinta nada (ni el velo)
  SIN_TEXTO || !g.lineas.some((l) => (parte === 'abajo') === !!l.abajo) ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: topSeguro(parte === 'abajo' ? 1180 : g.top, g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo), g.top < ARRIBA && parte !== 'abajo', g.a, g.b + SALIDA) - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.filter((l) => (parte === 'abajo') === !!l.abajo).flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = tamLinea(l, g.top < ARRIBA && parte !== 'abajo');
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
const DETRAS: [number, number][] = [[0, 4.0]];

export const ReelA7: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  const hook = GRANDES.slice(0, 1);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_A7)} layout="none">
            <Video src={staticFile('a7/a7.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {/* HOOK: frases en grande detrás de Álvaro + su recorte (chroma) encima */}
        {hook.map((g) => (
          <FraseGrande key={g.a} t={t} g={g} />
        ))}
        <div style={cam}>
          {DETRAS.map(([a, b]) => (
            <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)} layout="none">
              <OffthreadVideo src={staticFile('a7/recorte-hook.webm')} transparent muted trimBefore={fr(a)} style={lleno} />
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
      <ZonaSegura t={t} zonas={ZONAS}><Diez t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Vacio t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Vender t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Convencer t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Buscar t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Marcador3 t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Varita t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Ciclo t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Ensena t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Tecnologia t={t} /></ZonaSegura>
      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con flecha */}
      <Ventana t={t} a={SIN_TEXTO ? 1e9 : CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          <Sube t={t} en={74.52}>haz</Sube>
          <Sube t={t} en={74.74}>clic</Sube>
          <Sube t={t} en={75.04}>aquí</Sube>
          <Sube t={t} en={75.34} style={amarillo}>abajo</Sube>
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < 75.55 ? 0 : 1, ...flechaV(ESTILO.flecha, t, 75.55)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, 74.52, 74.74, 75.04, 75.34].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['boom', 0.39, -3], ['risercorto', 6.6, -7], ['cineboom', 7.25, -3],
        ['pop', 7.98, -4], ['snap', 8.96, -5], ['pop', 10.03, -5],
        ['tapcorto', 10.92, -10], ['tapcorto', 11.05, -10], ['tapcorto', 11.18, -10], ['tapcorto', 11.31, -10], ['tapcorto', 11.44, -10], ['tapcorto', 11.57, -10], ['tapcorto', 11.69, -10], ['tapcorto', 11.82, -10], ['tapcorto', 11.94, -10], ['negativo', 12.07, -5],
        ['pop', 16.86, -7], ['bloop', 17.4, -10], ['datos', 18.18, -11], ['negativo', 19.5, -9],
        ['pop', 21.45, -7], ['pop', 21.98, -6], ['pop', 26.5, -7], ['burbuja', 27.24, -10], ['swish', 28.34, -10], ['negativo', 29.29, -7],
        ['pop', 31.11, -7], ['swish', 31.45, -11], ['alerta', 33.2, -9], ['exito', 34.47, -8], ['pop', 36.3, -7], ['twinkle', 37.29, -10],
        ['reveal', 38.22, -8], ['puntos', 40.23, -8], ['boom', 43.23, -3], ['exito', 43.3, -7], ['twinkle', 45.18, -9], ['pop', 45.7, -5], ['thud', 46.11, -8],
        ['pop', 51.18, -7], ['pop', 52.75, -6], ['pop', 55.83, -7], ['pop', 56.84, -7], ['pop', 58.08, -7], ['pop', 65.55, -6], ['pop', 66.94, -7], ['pop', 68.2, -7], ['ding', 68.87, -8],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
