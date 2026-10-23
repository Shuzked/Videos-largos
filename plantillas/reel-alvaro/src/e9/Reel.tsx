import React from 'react';
import {AbsoluteFill, Easing, Sequence, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '../sinvideo';
import {C, GLOW_AMARILLO, glow, lleno} from '../estilo';
import {F, Son, Sube, iv, Ventana} from '../anim';
import {CAPA, SIN_TEXTO, SinZona, Zona, ZonaSegura, hueco} from '../zona';
import ZONAS from './zonas.json';
import {H, MIN, amarillo} from '../texto';
import {ConTransicion} from '../a1/transicion';
import PALABRAS from './palabras.json';
import CARA from './cara.json';
import ENCUADRE from './encuadre.json';
import {ICONO10} from '../a10/iconos';

import {Entra, golpeV, flechaV, Estilo} from '../variantes';
import {Chip, Check, Conector, Destello, ICONOS, Lienzo, OSCURO, Particulas, Pulso, VERDE, aparece, flota, muelle} from '../lottie';
// Animaciones propias de este reel (no se repiten en otros vídeos): texto "cremallera" (cada palabra se cierra con dos mitades
// que llegan de lados opuestos, como las dos mitades de la pantalla partida), golpe "empuje" y flecha "rastro".
// Los subtítulos y el CTA usan SIEMPRE <Sube> (la animación original). Sin ráfagas ni trazos sobre los títulos.
const ESTILO: Estilo = {texto: 'cremallera', golpe: 'empuje', impacto: 'garabato', sub: 'cremallera', flecha: 'rastro'};

export const DURACION_E9 = 78.32;
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
// Plano medio (Álvaro en la mesa): encuadre algo más cerrado y cara en el tercio superior, con sitio arriba para los gráficos
const BASE = 1.15;
const OBJ_X = 540;
const OBJ_Y = 640;
type K = [number, number, number, 'suave' | 'golpe' | 'corte'];
const ZOOM: K[] = [
  [0, 1.2, 0, 'corte'],
  [0.02, 1.03, 0.36, 'golpe'],
  [0.28, 1.08, 0.25, 'golpe'],
  [1.44, 1.14, 0.18, 'golpe'],
  [2.32, 1.05, 0.3, 'suave'],
  [2.44, 1.12, 0.18, 'golpe'],
  [3.24, 1.04, 0.8, 'suave'],
  [9.24, 1.0, 0, 'corte'],
  [9.26, 1.05, 0.5, 'suave'],
  [9.88, 1.1, 0.3, 'golpe'],
  [10.48, 1.04, 0.8, 'suave'],
  [11.96, 1.08, 0.5, 'suave'],
  [13.56, 1.04, 0.8, 'suave'],
  [15.0, 1.08, 0.5, 'suave'],
  [16.28, 1.04, 0.8, 'suave'],
  [17.88, 1.12, 0.2, 'golpe'],
  [18.8, 1.05, 0.8, 'suave'],
  [20.44, 1.09, 0.5, 'suave'],
  [21.32, 1.05, 0.4, 'suave'],
  [38.34, 1.0, 0, 'corte'],
  [38.36, 1.05, 0.8, 'suave'],
  [39.52, 1.09, 0.5, 'suave'],
  [40.8, 1.04, 1.0, 'suave'],
  [42.64, 1.08, 0.5, 'suave'],
  [44.44, 1.15, 0.18, 'golpe'],
  [45.6, 1.05, 0.8, 'suave'],
  [48.04, 1.09, 0.5, 'suave'],
  [49.2, 1.04, 0.8, 'suave'],
  [52.48, 1.08, 0.6, 'suave'],
  [54.24, 1.04, 0.8, 'suave'],
  [55.56, 1.08, 0.5, 'suave'],
  [56.88, 1.04, 0.8, 'suave'],
  [58.24, 1.08, 0.5, 'suave'],
  [59.88, 1.04, 0.6, 'suave'],
  [60.92, 1.08, 0.5, 'suave'],
  [63.24, 1.13, 0.2, 'golpe'],
  [63.6, 1.05, 0.8, 'suave'],
  [66.24, 1.08, 0.6, 'suave'],
  [67.08, 1.13, 0.18, 'golpe'],
  [68.0, 1.05, 0.8, 'suave'],
  [70.04, 1.08, 0.6, 'suave'],
  [71.56, 1.05, 0.6, 'suave'],
  [72.64, 1.15, 0.18, 'golpe'],
  [73.38, 1.06, 0.6, 'suave'],
  [74.48, 1.04, 1.5, 'suave'],
  [76.08, 1.09, 1.2, 'suave'],
  [77.56, 1.05, 0.7, 'suave'],
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
// Temblor corto en las palabras clave del hook y en los impactos fuertes
const IMPACTOS = [0.28, 1.44, 2.44, 9.88, 17.88, 44.44, 63.24, 67.08, 72.64];
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

const lim = (x: number) => Math.min(1, Math.max(0, x));
const sm2 = (k: number) => k * k * (3 - 2 * k);

// ---------------- Pantalla partida en DIAGONAL: FREELANCER arriba / AGENCIA abajo ----------------
// Las dos mitades entran deslizándose en sentidos opuestos (se cierran como una cremallera) y se asientan con un muelle;
// entre ellas queda una rendija de luz en diagonal. La mitad que no habla está apagada y se enciende cuando se nombra.
type Mitad = {src: string; desde: number};
type Partida = {a: number; b: number; arriba: Mitad; abajo: Mitad; enciendeAbajo: number; atenuaArriba?: boolean; etiquetas?: boolean};
const SPLIT1: Partida = {a: 4.48, b: 9.24, arriba: {src: 'freelancer', desde: 2}, abajo: {src: 'agencia', desde: 5.5}, enciendeAbajo: 7.12};
// "pero ahora imagina otra persona que decide organizar el trabajo de forma diferente": vuelve la pantalla partida;
// arriba el freelancer (modelo válido ✓, en segundo plano) y abajo la otra persona organizando el trabajo en la pizarra
const SPLIT2: Partida = {a: 21.72, b: 26.0, arriba: {src: 'freelancer2', desde: 3}, abajo: {src: 'organiza', desde: 0.5}, enciendeAbajo: 21.72, atenuaArriba: true, etiquetas: true};
const YL = 1060; // altura de la rendija en el borde izquierdo
const YR = 840; // y en el borde derecho
const H_MITAD = 1120;
const ANCHO_MITAD = 1991; // 16:9 a 1120 de alto
const PISTAS = ENCUADRE as unknown as Record<string, [number, number][]>;
const foco = (src: string, k: number) => {
  const p = PISTAS[src];
  if (!p) return 0.5;
  const x = Math.max(0, k) * 5;
  const i = Math.min(p.length - 1, Math.floor(x));
  const j = Math.min(p.length - 1, i + 1);
  return p[i][1] + (p[j][1] - p[i][1]) * (x - i);
};
const ClipMitad: React.FC<{t: number; p: Partida; m: Mitad; top: number; filtro: string}> = ({t, p, m, top, filtro}) => {
  const left = Math.min(0, Math.max(1080 - ANCHO_MITAD, 540 - foco(m.src, t - p.a) * ANCHO_MITAD));
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height: H_MITAD, overflow: 'hidden', filter: filtro}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 35%', scale: iv(t, [p.a, p.b], [1.0, 1.07])}}>
        <Sequence from={fr(p.a)} durationInFrames={fr(p.b - p.a)} layout="none">
          <Video src={staticFile(`e9/broll/${m.src}.mp4`)} muted trimBefore={fr(m.desde)} style={{position: 'absolute', top: 0, left, width: ANCHO_MITAD, height: H_MITAD}} />
        </Sequence>
      </div>
    </div>
  );
};
// Etiqueta (píldora) con el nombre de cada lado, escrita con la fuente de los títulos
const Pildora: React.FC<{t: number; en: number; x: number; y: number; txt: string; ancla: 'start' | 'end'; activa: boolean; check?: number}> = ({t, en, x, y, txt, ancla, activa, check}) => {
  if (t < en) return null;
  const ap = aparece(t, en, ancla === 'start' ? -6 : 6);
  const w = txt.length * 30 + 64;
  const x0 = ancla === 'start' ? x : x - w;
  const fl = flota(t, x / 200, 3);
  return (
    <g transform={`translate(${x0 + w / 2} ${y + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot}) translate(${-w / 2} 0)`} opacity={ap.op}>
      <rect x={0} y={-38} width={w} height={76} rx={38} fill="rgba(12,12,16,0.78)" stroke={activa ? C.amarillo : 'rgba(255,255,255,0.75)'} strokeWidth={4}
        style={{filter: activa ? `drop-shadow(0 0 12px rgba(${GLOW_AMARILLO},0.8))` : 'none'}} />
      <text x={w / 2} y={14} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={40} letterSpacing={2} fill={activa ? C.amarillo : '#fff'}>{txt}</text>
      {check !== undefined && t >= check && (
        <g transform={`translate(${w + 48} 0) scale(${aparece(t, check, 0).sx})`}>
          <circle r={32} fill={VERDE} stroke="#fff" strokeWidth={4} />
          <Check t={t} en={check + 0.05} s={0.62} />
        </g>
      )}
    </g>
  );
};
const PantallaPartida: React.FC<{t: number; p: Partida}> = ({t, p}) => {
  if (t < p.a || t >= p.b) return null;
  const k = t - p.a;
  const m = muelle(t, p.a, 1.6, 6.5);
  const dx = (1 - m) * 1080;
  const g = 9 * sm2(lim((k - 0.15) / 0.35));
  const enc = sm2(lim((t - p.enciendeAbajo) / 0.35));
  const brilloArriba = p.atenuaArriba ? 0.62 : 1 - 0.32 * enc;
  const brilloAbajo = 0.4 + 0.6 * enc;
  const polyArriba = `polygon(-40px -40px, 1120px -40px, 1120px ${YR - g - 8}px, 1080px ${YR - g}px, 0px ${YL - g}px, -40px ${YL - g + 8}px)`;
  const polyAbajo = `polygon(-40px ${YL + g + 8}px, 0px ${YL + g}px, 1080px ${YR + g}px, 1120px ${YR + g - 8}px, 1120px 1960px, -40px 1960px)`;
  // luz que recorre la rendija al abrirse y al encenderse la mitad de abajo
  const cometa = (en: number) => {
    const q = (t - en) / 0.55;
    if (q <= 0 || q >= 1) return null;
    const e = 1 - Math.pow(1 - q, 3);
    const x = -60 + e * 1200;
    const y = YL + ((YR - YL) * x) / 1080;
    return <circle cx={x} cy={y} r={16} fill="#fff" opacity={1 - q * 0.6} style={{filter: `drop-shadow(0 0 18px #fff) drop-shadow(0 0 30px rgba(${GLOW_AMARILLO},0.9))`}} />;
  };
  return (
    <AbsoluteFill style={{background: '#0b0b10', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, clipPath: polyArriba, translate: `${-dx}px 0px`}}>
        <ClipMitad t={t} p={p} m={p.arriba} top={0} filtro={`brightness(${brilloArriba})`} />
        {/* sombra suave arriba para que se lea lo que va encima */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%)'}} />
      </div>
      <div style={{position: 'absolute', inset: 0, clipPath: polyAbajo, translate: `${dx}px 0px`}}>
        <ClipMitad t={t} p={p} m={p.abajo} top={YR - 40} filtro={`brightness(${brilloAbajo}) saturate(${0.55 + 0.45 * enc}) blur(${(1 - enc) * 3}px)`} />
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.5) 100%)'}} />
      </div>
      <Lienzo>
        {/* rendija de luz en diagonal (separa los dos lados; nunca pasa por encima del texto) */}
        <line x1={-40} y1={YL + (YR - YL) * (-40 / 1080)} x2={1120} y2={YL + (YR - YL) * (1120 / 1080)} stroke="rgba(255,255,255,0.85)" strokeWidth={3}
          opacity={lim((k - 0.2) / 0.3)} style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.9))`}} />
        {cometa(p.a + 0.2)}
        {p.enciendeAbajo > p.a + 0.3 && cometa(p.enciendeAbajo)}
        {p.etiquetas && (
          <>
            {/* etiquetas dentro de la zona segura de Instagram (arriba la cabecera, abajo el botón del anuncio y la columna de botones) */}
            <Pildora t={t} en={p.a + 0.3} x={110} y={720} txt="FREELANCER" ancla="start" activa={false} check={p.a + 0.6} />
            <Pildora t={t} en={p.a + 0.55} x={920} y={1290} txt="AGENCIA" ancla="end" activa />
          </>
        )}
      </Lienzo>
    </AbsoluteFill>
  );
};

// ---------------- Elementos Lottie (src/lottie.tsx: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, partículas, reposo vivo) ----------------
// Iconos: Material Icons revisados a ojo en un fotograma antes de usarlos
const ICONO = {
  ...ICONO10,
  clienteNuevo: ICONOS.clienteNuevo,
  lupa: ICONOS.lupa,
  editar: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  ajustes: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  codigo: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  engranaje: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  brujula: 'M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z',
  bombilla: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  vender: 'M9 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm6.08-7.95c.84 1.18.84 2.71 0 3.89l1.68 1.69c2.02-2.02 2.02-5.07 0-7.27l-1.68 1.69zM20.07 2l-1.63 1.63c2.77 3.02 2.77 7.56 0 10.74L20.07 16c3.9-3.89 3.91-9.95 0-14z',
  birrete: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
};

// 1) "la primera persona consigue un cliente, se reúne con él, diseña la solución, la implementa, hace las modificaciones
// y gestiona todo por su cuenta": sobre la cabeza, una persona en el centro y cada tarea entra en su órbita (en perspectiva)
// unida a ELLA por un hilo de luz; al decir "gestiona todo" la órbita se acelera (lo lleva todo a la vez) y al decir
// "perfectamente válido" se calma y la persona recibe un ✓ verde (modelo válido, tono neutral)
const ORBITA = {a: 10.5, b: 21.62, persona: 10.92, tareas: [11.96, 12.64, 13.56, 15.0, 16.28], gestiona: 17.36, cuenta: 18.8, valido: 20.44, valido2: 21.32};
const ICONOS_TAREA = [ICONO.clienteNuevo, ICONO.chat, ICONO.editar, ICONO.herramienta, ICONO.ajustes];
const CX_O = 540, CY_O = 258, RX_O = 360, RY_O = 104;
const velocidad = (t: number) => {
  const {gestiona, cuenta, valido} = ORBITA;
  const sube = sm2(lim((t - gestiona) / 0.5));
  const baja = sm2(lim((t - cuenta - 0.3) / 1.2));
  const calma = sm2(lim((t - valido) / 0.6));
  return 0.42 + 2.2 * sube * (1 - baja) - 0.3 * calma;
};
const giroOrbita = (t: number) => {
  let g = 0;
  for (let x = ORBITA.a; x < t; x += F) g += velocidad(x) * F;
  return g;
};
const Orbita: React.FC<{t: number}> = ({t}) => {
  const {a, b, persona, tareas, gestiona, cuenta, valido, valido2} = ORBITA;
  const giro = giroOrbita(t);
  const fl = flota(t, 0.3, 4);
  const esfuerzo = t >= gestiona && t < cuenta + 0.6 ? 1 + 0.05 * Math.sin((t - gestiona) * 16) : 1;
  const items = tareas.map((en, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / tareas.length + giro;
    const llega = muelle(t, en, 2.2, 6.5);
    // llega desde fuera de la órbita (más lejos en su dirección) y se coloca con muelle
    const r = 1 + (1 - llega) * 0.9;
    const x = CX_O + Math.cos(ang) * RX_O * r;
    const y = CY_O + Math.sin(ang) * RY_O * r + fl.y;
    const prof = (Math.sin(ang) + 1) / 2; // 0 = detrás (arriba), 1 = delante (abajo)
    return {i, en, x, y, prof, esc: 0.78 + 0.26 * prof};
  });
  const pintaTarea = (it: (typeof items)[number]) => {
    if (t < it.en) return null;
    const ap = aparece(t, it.en, 12);
    const r = 54 * it.esc;
    return (
      <g key={it.i} transform={`translate(${it.x} ${it.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`} opacity={(0.55 + 0.45 * it.prof) * ap.op}>
        <circle r={r} fill={C.amarillo} stroke="#fff" strokeWidth={4} />
        <g transform={`translate(${-r * 0.55} ${-r * 0.55}) scale(${(r * 1.1) / 24})`}><path d={ICONOS_TAREA[it.i]} fill="#1b1b20" /></g>
      </g>
    );
  };
  const hilo = (it: (typeof items)[number]) => {
    if (t < it.en) return null;
    const p = 1 - Math.pow(1 - lim((t - it.en - 0.05) / 0.3), 3);
    const x1 = it.x + (CX_O - it.x) * p, y1 = it.y + (CY_O + fl.y - it.y) * p;
    return (
      <g key={`h${it.i}`} opacity={0.35 + 0.5 * it.prof}>
        <line x1={it.x} y1={it.y} x2={x1} y2={y1} stroke={C.amarillo} strokeWidth={4} strokeLinecap="round" />
        {p >= 1 && <line x1={it.x} y1={it.y} x2={CX_O} y2={CY_O + fl.y} stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeDasharray="4 14" strokeDashoffset={-(t - it.en) * 60} />}
      </g>
    );
  };
  const detras = items.filter((it) => it.prof < 0.5);
  const delante = items.filter((it) => it.prof >= 0.5);
  const okAp = aparece(t, valido, 0);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* la órbita (elipse en perspectiva) */}
        <ellipse cx={CX_O} cy={CY_O + fl.y} rx={RX_O} ry={RY_O} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={3} strokeDasharray="10 12"
          opacity={lim((t - persona) / 0.4)} />
        {detras.map(hilo)}
        {detras.map(pintaTarea)}
        <g transform={`translate(${CX_O} ${CY_O + fl.y}) scale(${esfuerzo})`}>
          <Chip t={t} en={persona} d={ICONO.persona} x={0} y={0} r={78} quieto sinRafaga={false} fondo={t >= valido ? '#ffffff' : undefined} />
        </g>
        {delante.map(hilo)}
        {delante.map(pintaTarea)}
        {t >= valido && (
          <g transform={`translate(${CX_O + 66} ${CY_O - 60 + fl.y}) scale(${okAp.sx} ${okAp.sy})`}>
            <circle r={30} fill={VERDE} stroke="#fff" strokeWidth={4} />
            <Check t={t} en={valido + 0.05} s={0.6} />
          </g>
        )}
        <Pulso t={t} en={valido} x={CX_O} y={CY_O + fl.y} r={92} color={VERDE} />
        <Particulas t={t} en={valido} x={CX_O} y={CY_O} n={14} radio={260} colores={[VERDE, '#fff']} />
        <Destello t={t} en={valido2} x={CX_O + 150} y={CY_O - 100} tam={26} color={C.amarillo} />
        <Destello t={t} en={valido2 + 0.12} x={CX_O - 170} y={CY_O - 70} tam={20} />
      </Lienzo>
    </Ventana>
  );
};

// 2) Pantalla completa: la estructura de la AGENCIA como una rueda que se va construyendo alrededor del centro.
// Arriba (lo comercial): identificar necesidades → oferta de servicios → proceso comercial (y entran clientes);
// abajo (la entrega): colabora con especialistas, unidos con conectores con punta y flujo de puntos; al decir
// "entrega técnica" el trabajo vuelve de los especialistas al centro y la agencia recibe un ✓
const RED = {a: 26.0, b: 38.34, cabecera: 26.12, centro: 26.3, necesidades: 26.72, objetivo: 27.4, oferta: 29.52, proceso: 31.76, clientes: 33.36,
  especialistas: [34.84, 35.0, 35.16], entrega: 37.44};
const HX = 540, HY = 790, R_RED = 335;
const sat = (gr: number): [number, number] => [HX + R_RED * Math.cos((gr * Math.PI) / 180), HY + R_RED * Math.sin((gr * Math.PI) / 180)];
const FondoRed: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 120% 80% at 50% 42%, #123a4a 0%, #0a2230 50%, #050f17 100%)'}}>
    <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 2px, transparent 2.5px)', backgroundSize: '44px 44px', backgroundPosition: `${(t * 6) % 44}px ${(t * 9) % 44}px`}} />
    {/* ondas que salen del centro: la estructura "respira" */}
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {[0, 1, 2].map((i) => {
        const f = ((t * 0.35 + i / 3) % 1);
        return <circle key={i} cx={HX} cy={HY} r={120 + f * 620} fill="none" stroke="rgba(254,255,188,0.10)" strokeWidth={3} opacity={1 - f} />;
      })}
    </svg>
  </AbsoluteFill>
);
const Red: React.FC<{t: number}> = ({t}) => {
  const {a, b, cabecera, centro, necesidades, objetivo, oferta, proceso, clientes, especialistas, entrega} = RED;
  if (t < a || t >= b) return null;
  const arriba: {gr: number; en: number; d: string}[] = [
    {gr: -150, en: necesidades, d: ICONO.lupa},
    {gr: -90, en: oferta, d: ICONO.etiqueta},
    {gr: -30, en: proceso, d: ICONO.megafono},
  ];
  const abajo = [{gr: 30, d: ICONO.codigo}, {gr: 90, d: ICONO.ia}, {gr: 150, d: ICONO.engranaje}];
  const brazo = (gr: number, rIni: number, rFin: number) => {
    const u = [Math.cos((gr * Math.PI) / 180), Math.sin((gr * Math.PI) / 180)];
    const x0 = HX + u[0] * rIni, y0 = HY + u[1] * rIni, x1 = HX + u[0] * (R_RED - rFin), y1 = HY + u[1] * (R_RED - rFin);
    return {d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`, punta: [x1, y1, Math.atan2(u[1], u[0])] as [number, number, number], x0, y0, x1, y1};
  };
  const okHub = entrega + 0.6;
  const cab = aparece(t, cabecera, 0);
  return (
    <AbsoluteFill>
      <SinZona><FondoRed t={t} /></SinZona>
      <Lienzo>
        {/* cabecera: el nombre del lado (indicación del cliente) */}
        {t >= cabecera && (
          <g transform={`translate(540 ${215 + flota(t, 0.2, 3).y}) scale(${cab.sx} ${cab.sy})`}>
            <rect x={-185} y={-46} width={370} height={92} rx={46} fill="rgba(12,12,16,0.7)" stroke={C.amarillo} strokeWidth={4} style={{filter: `drop-shadow(0 0 14px rgba(${GLOW_AMARILLO},0.7))`}} />
            <text x={0} y={17} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={48} letterSpacing={3} fill={C.amarillo}>AGENCIA</text>
          </g>
        )}
        {/* brazos comerciales: del centro hacia cada pieza */}
        {arriba.map(({gr, en}, i) => {
          const br = brazo(gr, 124, 78);
          return <Conector key={`c${i}`} t={t} en={en - 0.3} d={br.d} color={C.amarillo} dur={0.3} grosor={7} flujo punta={br.punta} />;
        })}
        {/* brazos de la entrega: del centro a los especialistas */}
        {abajo.map(({gr}, i) => {
          const br = brazo(gr, 124, 78);
          const vuelve = t >= entrega;
          return (
            <g key={`e${i}`}>
              <Conector t={t} en={especialistas[i] - 0.28} d={br.d} color={vuelve ? VERDE : C.amarillo} dur={0.28} grosor={7} flujo={!vuelve} punta={br.punta} />
              {/* el trabajo técnico vuelve al centro: paquetes que viajan de cada especialista a la agencia */}
              {vuelve && [0, 1].map((k) => {
                const q = ((t - entrega - k * 0.32 - i * 0.08) / 0.7);
                if (q <= 0 || q >= 1.6) return null;
                const e = 1 - Math.pow(1 - lim(q), 3);
                const x = br.x1 + (br.x0 - br.x1) * e, y = br.y1 + (br.y0 - br.y1) * e;
                return (
                  <g key={k} transform={`translate(${x} ${y}) scale(${q > 1 ? 1 - (q - 1) / 0.6 : 1})`}>
                    <rect x={-17} y={-17} width={34} height={34} rx={8} fill={VERDE} stroke="#fff" strokeWidth={3} />
                    <g transform="translate(-11 -11) scale(0.92)"><path d={ICONO.caja} fill="#0b2a1e" /></g>
                  </g>
                );
              })}
            </g>
          );
        })}
        {/* anillo que gira alrededor del centro */}
        {t >= centro + 0.2 && (
          <circle cx={HX} cy={HY} r={112} fill="none" stroke={C.amarillo} strokeWidth={5} strokeDasharray="16 18" strokeLinecap="round"
            transform={`rotate(${(t - centro) * 40} ${HX} ${HY})`} opacity={lim((t - centro - 0.2) / 0.3)} />
        )}
        <Chip t={t} en={centro} d={ICONO.edificio} x={HX} y={HY} r={86} fase={0.2} fondo={t >= okHub ? '#ffffff' : undefined} />
        {t >= okHub && (
          <g transform={`translate(${HX + 70} ${HY - 66}) scale(${aparece(t, okHub, 0).sx})`}>
            <circle r={32} fill={VERDE} stroke="#fff" strokeWidth={4} />
            <Check t={t} en={okHub + 0.05} s={0.62} />
          </g>
        )}
        <Particulas t={t} en={okHub} x={HX} y={HY} n={16} radio={300} colores={[VERDE, '#fff']} />
        {/* piezas comerciales */}
        {arriba.map(({gr, en, d}, i) => {
          const [x, y] = sat(gr);
          return <Chip key={`s${i}`} t={t} en={en} d={d} x={x} y={y} r={66} fase={i * 1.1} />;
        })}
        {/* "necesidades empresariales": la lupa encuentra una necesidad (una diana que se marca en un edificio) */}
        {t >= objetivo && (() => {
          const [x, y] = sat(-150);
          const ap = aparece(t, objetivo, 10);
          return (
            <g transform={`translate(${x - 4} ${y - 112 + flota(t, 2, 3).y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
              <circle r={36} fill={OSCURO} stroke="#fff" strokeWidth={3} />
              <g transform="translate(-22 -22) scale(1.83)"><path d={ICONO.diana} fill={C.amarillo} /></g>
            </g>
          );
        })()}
        <Pulso t={t} en={objetivo} x={sat(-150)[0] - 4} y={sat(-150)[1] - 112} r={40} color={C.amarillo} />
        {/* "captar clientes": entra un cliente y se une al proceso comercial */}
        {(() => {
          const [x, y] = sat(-30);
          const cx = x + 10, cy = y - 190;
          return (
            <g>
              <Conector t={t} en={clientes + 0.15} d={`M ${cx} ${cy + 48} L ${x + 4} ${y - 80}`} color="#fff" dur={0.2} grosor={6} flujo punta={[x + 4, y - 80, Math.PI / 2]} />
              <Chip t={t} en={clientes} d={ICONO.clienteNuevo} x={cx} y={cy} r={44} fondo="#ffffff" fase={2.2} />
            </g>
          );
        })()}
        {/* especialistas: personas con su especialidad */}
        {abajo.map(({gr, d}, i) => {
          const [x, y] = sat(gr);
          const en = especialistas[i];
          if (t < en) return null;
          const ap = aparece(t, en + 0.12, 0);
          return (
            <g key={`p${i}`}>
              <Chip t={t} en={en} d={ICONO.persona} x={x} y={y} r={66} fondo="#ffffff" fase={i * 0.9 + 0.4} />
              <g transform={`translate(${x + 48} ${y + 44}) scale(${ap.sx} ${ap.sy})`}>
                <circle r={30} fill={OSCURO} stroke={C.amarillo} strokeWidth={3} />
                <g transform="translate(-18 -18) scale(1.5)"><path d={d} fill={C.amarillo} /></g>
              </g>
            </g>
          );
        })}
      </Lienzo>
    </AbsoluteFill>
  );
};

// 3) "y esa diferencia es especialmente interesante cuando trabajamos con servicios de IA": vuelven los dos lados en
// pequeño (persona / agencia) separados por la rendija de luz diagonal; al decir "IA" cae una chispa de IA en medio
const DIFERENCIA = {a: 45.7, b: 50.78, diferencia: 45.92, interesante: 48.04, ia: 50.3};
const Diferencia: React.FC<{t: number}> = ({t}) => {
  const {a, b, diferencia, interesante, ia} = DIFERENCIA;
  const sep = muelle(t, diferencia, 2, 6.5);
  const y = 268;
  const cae = muelle(t, ia, 2.2, 7);
  const mira = t >= ia ? 1 : 0;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {/* rendija diagonal entre los dos lados */}
        <line x1={540 + 34} y1={y - 120} x2={540 - 34} y2={y + 120} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={lim((t - diferencia) / 0.3) * 0.9 * (1 - lim((t - ia + 0.05) / 0.2))}
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lim((t - diferencia) / 0.35)} style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},1))`}} />
        <g transform={`rotate(${mira * 8 * sm2(lim((t - ia) / 0.3))} ${540 - 60 - 170 * sep} ${y})`}>
          <Chip t={t} en={diferencia} d={ICONO.persona} x={540 - 60 - 170 * sep} y={y} r={64} fondo="#ffffff" fase={0.4} />
        </g>
        <g transform={`rotate(${-mira * 8 * sm2(lim((t - ia) / 0.3))} ${540 + 60 + 170 * sep} ${y})`}>
          <Chip t={t} en={diferencia + 0.12} d={ICONO.edificio} x={540 + 60 + 170 * sep} y={y} r={64} fase={1.3} />
        </g>
        <Destello t={t} en={interesante} x={540} y={y - 130} tam={28} color={C.amarillo} />
        <Destello t={t} en={interesante + 0.15} x={600} y={y + 110} tam={20} />
        {t >= ia && (
          <g transform={`translate(540 ${y - 260 * (1 - cae)})`}>
            <Chip t={t} en={ia} d={ICONO.ia} x={0} y={0} r={50} fondo={OSCURO} color={C.amarillo} quieto />
          </g>
        )}
        <Particulas t={t} en={ia + 0.25} x={540} y={y} n={14} radio={200} />
      </Lienzo>
    </Ventana>
  );
};

// 4) "no necesitas ser el mayor especialista técnico de cada herramienta para dirigir correctamente una agencia":
// salen las herramientas en fila; al decir "dirigir" aparece arriba una brújula que las coordina (hilos con punta hacia cada una)
// y al decir "correctamente" se encienden en ola, como una orquesta bien dirigida
const DIRIGIR = {a: 53.9, b: 56.86, herramientas: 54.0, dirigir: 55.04, correctamente: 55.56};
const XS_HERR = [240, 390, 540, 690, 840];
const ICONOS_HERR = [ICONO.codigo, ICONO.ia, ICONO.chat, ICONO.herramienta, ICONO.engranaje];
const Dirigir: React.FC<{t: number}> = ({t}) => {
  const {a, b, herramientas, dirigir, correctamente} = DIRIGIR;
  const yH = 352, yD = 168;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {XS_HERR.map((x, i) => {
          const dx = x - 540;
          const d = `M ${540 + dx * 0.12} ${yD + 58} C ${540 + dx * 0.3} ${yD + 130}, ${x} ${yH - 130}, ${x} ${yH - 50}`;
          return <Conector key={`h${i}`} t={t} en={dirigir + 0.08 + i * 0.05} d={d} color={C.amarillo} dur={0.25} grosor={5} flujo punta={[x, yH - 50, Math.PI / 2]} />;
        })}
        {XS_HERR.map((x, i) => {
          const en = herramientas + i * 0.09;
          const ola = t >= correctamente ? Math.max(0, Math.sin((t - correctamente) * 6 - i * 0.7)) : 0;
          const encendida = t >= correctamente + i * 0.1;
          return (
            <g key={i} transform={`translate(0 ${-14 * ola})`}>
              <Chip t={t} en={en} d={ICONOS_HERR[i]} x={x} y={yH} r={44} fondo={encendida ? C.amarillo : '#ffffff'} fase={i * 0.8} sinRafaga={i % 2 === 1} />
            </g>
          );
        })}
        <Chip t={t} en={dirigir} d={ICONO.brujula} x={540} y={yD} r={58} fase={0.5} />
        <Particulas t={t} en={correctamente} x={540} y={yH} n={14} radio={360} />
      </Lienzo>
    </Ventana>
  );
};

// 5) "lo que sí necesitas es comprender el servicio, saber venderlo y responsabilizarte de que se entregue bien":
// tres pilares crecen sobre una base (cada uno con su icono) y al decir "bien" cae un tejado encima con un rebote:
// queda una ESTRUCTURA completa
const PILARES = {a: 57.0, b: 63.58, base: 57.1, pilares: [58.24, 59.44, 60.92], entregue: 62.84, bien: 63.24};
const XS_PILAR = [330, 540, 750];
const ICONOS_PILAR = [ICONO.bombilla, ICONO.vender, ICONO.caja];
const Pilares: React.FC<{t: number}> = ({t}) => {
  const {a, b, base, pilares, entregue, bien} = PILARES;
  const yBase = 424, alto = 212;
  const fl = flota(t, 0.6, 3);
  const baseP = 1 - Math.pow(1 - lim((t - base) / 0.45), 3);
  const tejado = muelle(t, bien, 2.6, 7.5);
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        <g transform={`translate(0 ${fl.y})`}>
          {/* base */}
          <rect x={540 - 330 * baseP} y={yBase} width={660 * baseP} height={26} rx={13} fill="#ffffff" style={{filter: `drop-shadow(0 0 10px rgba(${GLOW_AMARILLO},0.6))`}} />
          {pilares.map((en, i) => {
            if (t < en) return null;
            const m = muelle(t, en, 2.4, 7);
            const h = alto * m;
            const x = XS_PILAR[i];
            const ok = i < 2 ? t >= en + 0.3 : t >= entregue;
            const ap = aparece(t, en + 0.12, 10);
            return (
              <g key={i}>
                <rect x={x - 78} y={yBase - h} width={156} height={h} rx={22} fill="rgba(16,16,20,0.82)" stroke={C.amarillo} strokeWidth={5} />
                {t >= en + 0.12 && (
                  <g transform={`translate(${x} ${yBase - alto * 0.62}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
                    <circle r={54} fill={C.amarillo} />
                    <g transform="translate(-31 -31) scale(2.58)"><path d={ICONOS_PILAR[i]} fill="#1b1b20" /></g>
                  </g>
                )}
                {ok && (
                  <g transform={`translate(${x + 50} ${yBase - alto * 0.62 + 44}) scale(${aparece(t, i < 2 ? en + 0.3 : entregue, 0).sx})`}>
                    <circle r={24} fill={VERDE} stroke="#fff" strokeWidth={3} />
                    <Check t={t} en={(i < 2 ? en + 0.3 : entregue) + 0.04} s={0.48} />
                  </g>
                )}
                <Particulas t={t} en={en} x={x} y={yBase - alto} n={8} radio={120} />
              </g>
            );
          })}
          {/* tejado: cae con rebote y deja la estructura completa */}
          {t >= bien && (
            <g transform={`translate(0 ${-150 * (1 - tejado)})`} opacity={lim((t - bien) / 0.08)}>
              <path d={`M ${540 - 300} ${yBase - alto - 8} L 540 ${yBase - alto - 122} L ${540 + 300} ${yBase - alto - 8} Z`} fill={C.amarillo} stroke="#fff" strokeWidth={5} strokeLinejoin="round"
                style={{filter: `drop-shadow(0 0 16px rgba(${GLOW_AMARILLO},0.8))`}} />
            </g>
          )}
        </g>
        <Particulas t={t} en={bien + 0.12} x={540} y={yBase - alto - 20} n={18} radio={360} />
        <Destello t={t} en={bien + 0.2} x={540 + 330} y={yBase - alto - 80} tam={26} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// 6) "he preparado un curso introductorio con 14 clases en las que explico cómo funciona una agencia de IA":
// sale el birrete; al decir "14" sube y reparte 14 fichas (una por clase) que caen en su sitio una tras otra;
// al decir "explico" se encienden en ola y al decir "IA" sale su chispa junto al birrete
const FICHAS = {a: 65.84, b: 71.5, curso: 66.0, catorce: 67.08, explico: 68.52, ia: 70.92};
const Fichas: React.FC<{t: number}> = ({t}) => {
  const {a, b, curso, catorce, explico, ia} = FICHAS;
  const sube = SUAVE(lim((t - catorce + 0.1) / 0.35));
  const by = 268 - 140 * sube;
  const br = 64 - 18 * sube;
  return (
    <Ventana suave t={t} a={a} b={b}>
      <Lienzo>
        {Array.from({length: 14}, (_, k) => {
          const en = catorce + 0.08 + k * 0.05;
          if (t < en) return null;
          const col = k % 7, fila = Math.floor(k / 7);
          const x = 154 + 50 + col * 112, y = 262 + fila * 88;
          const m = muelle(t, en, 2.3, 7);
          const px = 540 + (x - 540) * m, py = by + (y - by) * m;
          const giro = (1 - m) * (col % 2 ? 160 : -160);
          const ola = t >= explico ? Math.max(0, Math.sin((t - explico) * 4.5 - (col + fila * 0.5) * 0.55)) : 0;
          const lleno = ola > 0.55;
          return (
            <g key={k} transform={`translate(${px} ${py - ola * 10}) rotate(${giro}) scale(${0.4 + 0.6 * Math.min(1, m)})`}>
              <rect x={-48} y={-34} width={96} height={68} rx={12} fill={lleno ? C.amarillo : 'rgba(16,16,20,0.88)'} stroke={C.amarillo} strokeWidth={3.5} />
              <path d="M -9 -15 L 15 0 L -9 15 Z" fill={lleno ? '#1b1b20' : '#ffffff'} />
            </g>
          );
        })}
        <g transform={`translate(540 ${by})`}>
          <Chip t={t} en={curso} d={ICONO.birrete} x={0} y={0} r={br} fase={0.6} quieto={t >= catorce} />
        </g>
        <Particulas t={t} en={catorce + 0.6} x={540} y={300} n={16} radio={420} />
        {t >= ia && <Chip t={t} en={ia} d={ICONO.ia} x={540 + 78} y={by - 34} r={30} fondo={OSCURO} color={C.amarillo} quieto sinRafaga />}
        <Destello t={t} en={ia + 0.1} x={540 + 120} y={by - 70} tam={22} color={C.amarillo} />
      </Lienzo>
    </Ventana>
  );
};

// ---------------- Texto: frase entera en grande o entera en subtítulo ----------------
type W = [string, number, number, boolean];
const WS = PALABRAS as W[];
const limpiar = (s: string) => (/^IA[.,]?$/.test(s) ? 'IA' : s.toLowerCase().replace(/[.,:]/g, ''));

// Frases en grande: cada línea con sus palabras y el segundo en que se dicen.
// Las líneas "golpe" entran de golpe (palabra clave); el resto palabra a palabra.
type Pal = [string, number, React.CSSProperties?];
type Linea = {ws: Pal[]; size: number; golpe?: boolean};
type Grande = {a: number; b: number; top: number; lineas: Linea[]};
// Solo frases CORTAS en grande, alternando con frases en subtítulo (el hook va entero en grande)
const GRANDES: Grande[] = [
  // HOOK 1/4 (encima de la cabeza): dos personas pueden vender exactamente
  {a: 0.04, b: 2.32, top: 70, lineas: [{ws: [['dos', 0.04], ['personas', 0.28]], size: 104}, {ws: [['pueden', 0.72], ['vender', 1.08]], size: 84}, {ws: [['exactamente', 1.44, amarillo]], size: 130, golpe: true}]},
  // HOOK 2/4 (debajo de la cara): el mismo servicio de inteligencia artificial (sale antes del corte a la pantalla partida)
  {a: 2.32, b: 4.22, top: 960, lineas: [{ws: [['el mismo', 2.32, amarillo]], size: 150, golpe: true}, {ws: [['servicio', 2.72], ['de', 3.16]], size: 90}, {ws: [['inteligencia', 3.24]], size: 90}, {ws: [['artificial', 3.8]], size: 90}]},
  // HOOK 3/4 (pantalla partida, mitad de arriba, debajo de la barbilla): pero una puede estar trabajando como freelancer;
  // sale justo antes de que se encienda la mitad de abajo
  {a: 4.5, b: 6.88, top: 450, lineas: [{ws: [['pero', 4.5], ['una', 4.8], ['puede', 5.12]], size: 84}, {ws: [['estar', 5.4], ['trabajando', 5.64]], size: 84}, {ws: [['como', 6.16]], size: 84}, {ws: [['freelancer', 6.4, amarillo]], size: 130, golpe: true}]},
  // HOOK 4/4: y la otra construyendo una agencia. Va en el mismo hueco de arriba (el freelancer ya atenuado): en la mitad
  // de abajo el equipo ocupa todo el alto y el texto les taparía la cara
  {a: 7.12, b: 9.0, top: 450, lineas: [{ws: [['y', 7.12], ['la', 7.28], ['otra', 7.52]], size: 84}, {ws: [['construyendo', 7.88], ['una', 8.64]], size: 84}, {ws: [['agencia', 8.84, amarillo]], size: 150, golpe: true}]},
  // Lo que hace es introducir una estructura distinta
  {a: 43.2, b: 45.56, top: 960, lineas: [{ws: [['lo', 43.2], ['que', 43.4], ['hace', 43.52], ['es', 43.68]], size: 84}, {ws: [['introducir', 43.76], ['una', 44.28]], size: 90}, {ws: [['estructura', 44.44]], size: 125, golpe: true}, {ws: [['distinta', 44.92, amarillo]], size: 125, golpe: true}]},
  // Está disponible por 1 €
  {a: 71.56, b: 73.14, top: 960, lineas: [{ws: [['está', 71.56], ['disponible', 71.84]], size: 90}, {ws: [['por', 72.4]], size: 90}, {ws: [['1 €', 72.64, amarillo]], size: 200, golpe: true}]},
];
// CTA (tiempos sílaba a sílaba con la forma de onda): "haz clic aquí abajo ↓", y la frase sigue en subtítulos
const CTA = 73.38;
const CTA_PAL: [string, number][] = [['haz', 73.38], ['clic', 73.56], ['aquí', 73.72], ['abajo', 73.96]];
const CTA_FLECHA = 74.1;
const CTA_FIN = 74.42; // empieza "y descubre cómo empezar…"
const SALIDA = 6 * F;
// Nunca se pisan dos frases grandes (en ninguna zona: al recolocarse por la zona segura pueden acabar en la misma): si la
// siguiente entra antes de que esta acabe de salir, esta sale antes
[...GRANDES].sort((x, y) => x.a - y.a).forEach((g, i, arr) => {
  const n = arr[i + 1];
  // (nunca antes de su última palabra: si no, esa palabra no se vería)
  const ultima = Math.max(...g.lineas.flatMap((l) => l.ws.map((w) => w[1] as number)));
  if (n && n.a < g.b + SALIDA) g.b = Math.max(g.a + 0.3, ultima + 0.2, n.a - SALIDA - 0.02);
});
// palabra dicha mientras está en pantalla un texto grande (su salida no cuenta: esas palabras van en subtítulo, que entra al acabar la salida)
// la frase partida (4,48–9,24) va entera en grande: la palabra "pero" (4,48) entra con la pantalla partida
const tapado = (x: number) => (x >= CTA - 0.01 && x < CTA_FIN) || (x >= SPLIT1.a - 0.01 && x < 9.2) || GRANDES.some((g) => x >= g.a - 0.01 && x < g.b);

// Subtítulos: solo las palabras que no están en grande. Primero se separa por frases (punto, coma, interrogación,
// pausa o titular) y cada frase se reparte en bloques equilibrados de 2-4 palabras que caben en UNA línea.
const MAX_CAR = 18; // ~780 px a 70 px: no llega a la columna de botones de Instagram (x≈930)
const MAX_LARGO = 25; // solo si así se evita un bloque de una palabra (el subtítulo se ajusta para caber en una línea)
// cortes de frase por sentido: "…con servicios / de IA", "…cada herramienta / para dirigir…", "…14 clases / en las que explico…"
const CORTE_FRASE = new Set([48.88, 54.8, 68.0, 32.72, 35.56]);
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
      if (trozo.length > 1 && textoBloque(trozo) > MAX_LARGO) continue;
      const c = coste[i] + 1 + (trozo.length === 1 && n > 1 ? 10 : 0) + (textoBloque(trozo) > MAX_CAR ? 5 : 0) + Math.abs(textoBloque(trozo) - 14) / 20;
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
    if (w[3] || /[,?:]$/.test(w[0]) || !sig || sig[1] - w[2] > 0.3 || tapado(sig[1]) || CORTE_FRASE.has(sig[1])) {
      frases.push(cur);
      cur = [];
    }
  });
  const out: {a: number; b: number; ws: W[]}[] = [];
  frases.flatMap(repartir).forEach((ws) => {
    const ult = ws[ws.length - 1];
    const sig = WS[WS.indexOf(ult) + 1];
    let finB = sig ? Math.min(sig[1], ult[2] + 0.8) : Math.min(DURACION_E9, ult[2] + 0.6);
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
const CLAVE = new Set(['diferencia', 'primera', 'cliente', 'solución', 'implementa', 'modificaciones', 'cuenta', 'válido', 'diferente', 'necesidades', 'oferta', 'comercial', 'clientes',
  'especialistas', 'técnica', 'automáticamente', 'interesante', 'IA', 'especialista', 'herramienta', 'dirigir', 'servicio', 'venderlo', 'bien', 'curso', '14', 'clases', 'descubre', 'negocio']);

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
  if (SIN_TEXTO) return null;
  const hay = (x: number) => BLOQUES.some((bq) => x >= bq.a && x < bq.b);
  const op = Math.max(...[-4, -2, 0, 2, 4].map((d) => (hay(t + d * F) ? 1 - Math.abs(d) / 6 : 0)));
  const bl = BLOQUES.find((x) => t >= x.a && t < x.b);
  return (
    <>
      {op > 0 && <FondoSub opacidad={op} />}
      {bl && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 1390, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '0 0.28em', ...MIN, fontSize: Math.min(70, Math.floor(760 / (textoBloque(bl.ws) * 0.6))), fontWeight: 700, textAlign: 'center', textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
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
// Legibilidad: las líneas de apoyo nunca bajan de 72 px; si no caben, se parten en dos líneas (no se encogen)
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
const FraseGrande: React.FC<{t: number; g: Grande}> = ({t, g}) => SIN_TEXTO ? null : (
  <Ventana t={t} a={g.a} b={g.b + SALIDA}>
    <div style={{position: 'absolute', left: -60, right: -60, top: topSeguro(g.top, g.lineas, g.top < ARRIBA, g.a, g.b + SALIDA) - 60, padding: '60px 90px', background: VELO}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, filter: SOMBRA, ...H}}>
        {g.lineas.flatMap(partir).map((l, li) => {
          const chars = l.ws.map((w) => w[0]).join(' ').length;
          const tam = tamLinea(l, g.top < ARRIBA);
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

const CORTES = [SPLIT1.a, SPLIT1.b, SPLIT2.a, RED.a, RED.b];

export const ReelE9: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camara(t);
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      <ConTransicion frame={frame} cortes={CORTES}>
        {/* Álvaro a cámara: color original, sin filtros */}
        <div style={cam}>
          <Sequence from={0} durationInFrames={fr(DURACION_E9)} layout="none">
            <Video src={staticFile('e9/e9.mp4')} volume={STEM === 'sfx' ? 0 : 1} style={lleno} />
          </Sequence>
        </div>
        {CAPA !== 'lottie' && CAPA !== 'texto' && <PantallaPartida t={t} p={SPLIT1} />}
        {CAPA !== 'lottie' && CAPA !== 'texto' && <PantallaPartida t={t} p={SPLIT2} />}
        <ZonaSegura t={t} zonas={ZONAS}><Red t={t} /></ZonaSegura>
      </ConTransicion>

      {/* Frases en grande (delante) */}
      {GRANDES.map((g) => (
        <FraseGrande key={g.a} t={t} g={g} />
      ))}
      <ZonaSegura t={t} zonas={ZONAS}><Orbita t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Diferencia t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Dirigir t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Pilares t={t} /></ZonaSegura>
      <ZonaSegura t={t} zonas={ZONAS}><Fichas t={t} /></ZonaSegura>
      <Subtitulos t={t} />

      {/* CTA en estilo subtítulo con la flecha en la misma línea, justo después de "abajo" */}
      <Ventana t={t} a={SIN_TEXTO ? 1e9 : CTA} b={CTA_FIN}>
        <FondoSub opacidad={iv(t, [CTA, CTA + 4 * F], [0, 1])} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1390, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', ...MIN, fontSize: 70, fontWeight: 600, textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`}}>
          {CTA_PAL.map(([w, en]) => (
            <Sube key={w} t={t} en={en} style={w === 'abajo' ? amarillo : undefined}>{w}</Sube>
          ))}
          <span style={{display: 'inline-block', marginLeft: 10, fontSize: 76, fontWeight: 900, ...amarillo, opacity: t < CTA_FLECHA ? 0 : 1, ...flechaV(ESTILO.flecha, t, CTA_FLECHA)}}>↓</span>
        </div>
      </Ventana>

      {/* Efectos (banco del cliente): transiciones, impactos y TIC por palabra de subtítulo */}
      {CORTES.map((c) => (
        <Son key={`w${c}`} s="whoosh" en={c} db={-5} />
      ))}
      {[...PALABRAS_VISIBLES, ...CTA_PAL.map(([, en]) => en)].map((a, i) => (
        <Son key={`t${i}`} s="ticw" en={a} db={-3} />
      ))}
      {([
        ['hit', 0.04, -2], ['pop', 0.28, -7], ['boom', 1.44, -4], ['cineboom', 2.32, -5], ['swish', 3.8, -12],
        ['slide2', 4.6, -10], ['boom', 6.4, -5], ['reveal', 7.12, -10], ['cineboom', 8.84, -5],
        ['snap', 9.88, -8],
        ['pop', 10.92, -7], ['pop', 11.96, -8], ['pop', 12.64, -8], ['pop', 13.56, -8], ['pop', 15.0, -8], ['pop', 16.28, -8], ['swoosh3', 17.36, -11], ['exito', 20.44, -9], ['twinkle', 21.32, -11],
        ['confirmar', 22.32, -11],
        ['popup', 26.12, -9], ['pop', 26.3, -7], ['pop', 26.72, -8], ['tings', 27.4, -10], ['pop', 29.52, -8], ['pop', 31.76, -8], ['notif', 33.36, -10],
        ['popup', 34.84, -8], ['popup', 35.0, -9], ['popup', 35.16, -9], ['swish', 37.44, -12], ['exito', 38.04, -9],
        ['boom', 44.44, -4], ['snap', 44.92, -8],
        ['swoosh2', 45.92, -12], ['twinkle', 48.04, -11], ['burbuja', 50.3, -9], ['ding', 50.56, -11],
        ['puntos', 54.0, -10], ['pop', 55.04, -7], ['tings', 55.56, -10],
        ['popup', 58.24, -8], ['popup', 59.44, -8], ['popup', 60.92, -8], ['confirmar', 62.84, -9], ['thud', 63.24, -8], ['exito', 63.36, -10],
        ['pop', 66.0, -7], ['datos', 67.12, -10], ['tings', 68.52, -10], ['twinkle', 70.92, -10],
        ['cineboom', 72.64, -4],
      ] as [string, number, number?][]).map(([s, en, db], i) => (
        <Son key={`s${i}`} s={s} en={en} db={db} />
      ))}
    </AbsoluteFill>
  );
};
