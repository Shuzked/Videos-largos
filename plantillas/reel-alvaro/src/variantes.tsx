import React from 'react';
import {Easing} from 'remotion';
import {F, iv} from './anim';
import {C, GLOW_AMARILLO} from './estilo';

// Variantes de animación: cada reel usa una combinación distinta para que no se repitan entre vídeos.
// Todas siguen el mismo lenguaje Lottie (curvas expo/muelle, entradas y salidas suaves) pero con un movimiento propio.

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EXPO_IN = Easing.bezier(0.7, 0, 0.84, 0);
const MUELLE = Easing.bezier(0.34, 1.56, 0.64, 1);
const SUAVE = Easing.bezier(0.65, 0, 0.35, 1);
// rebote amortiguado (cae, rebota dos veces y se asienta)
const REBOTE = (x: number) => {
  if (x >= 1) return 1;
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

export type EstiloTexto = 'mascara' | 'pop' | 'enfoque' | 'deslizar' | 'maquina' | 'giro' | 'caida' | 'espaciado' | 'estela' | 'tecla' | 'rodar' | 'ola' | 'bisagra' | 'persiana' | 'iman' | 'robot' | 'tiza' | 'engranaje';
export type EstiloGolpe = 'muelle' | 'sello' | 'destello' | 'barrido' | 'glitch' | 'zoom' | 'rebote' | 'tinta' | 'neon' | 'contorno' | 'cortina' | 'eco' | 'marcador' | 'latigo' | 'cartel' | 'ensambla' | 'balanza' | 'pulso';
export type EstiloImpacto = 'rayos' | 'onda' | 'chispas' | 'rayas' | 'cuadros' | 'circulos' | 'confeti' | 'halo' | 'estrella' | 'serpentinas' | 'polvo' | 'rombos' | 'garabato';
export type Estilo = {texto: EstiloTexto; golpe: EstiloGolpe; impacto: EstiloImpacto; sub: EstiloTexto; flecha: 'bote' | 'pulso' | 'desliza' | 'gira' | 'latido' | 'cae' | 'balanceo' | 'vibra' | 'elastica' | 'voltea' | 'salto' | 'pendulo' | 'resorte' | 'escalon' | 'tiron' | 'piston' | 'toctoc' | 'goteo'};

// ---------------- Entrada palabra a palabra ----------------
// Sustituye a <Sube>: misma API (en = segundo en que se dice; sale = segundo en que empieza a irse).
export const Entra: React.FC<{t: number; en: number; sale?: number; estilo: EstiloTexto; style?: React.CSSProperties; children: React.ReactNode}> = ({
  t, en, sale, estilo, style, children,
}) => {
  const dur = estilo === 'maquina' ? 4 : estilo === 'caida' ? 12 : 8;
  const p = iv(t, [en, en + dur * F], [0, 1]);
  const s = sale === undefined ? 0 : iv(t, [sale, sale + 6 * F], [0, 1], EXPO_IN);
  const visible = t >= en && s < 1;
  const caja: React.CSSProperties = {display: 'inline-block', verticalAlign: 'bottom'};
  let anim: React.CSSProperties = {};
  let mascara = false;
  const e = EXPO_OUT(p);
  switch (estilo) {
    case 'mascara':
      mascara = (p > 0 && p < 1) || s > 0;
      anim = {translate: `0px ${(1 - e) * 110 - s * 110}%`, rotate: `${(1 - e) * 5}deg`, filter: `blur(${(1 - e) * 3}px)`, transformOrigin: '0% 100%'};
      break;
    case 'pop':
      anim = {scale: Math.max(0, MUELLE(p)) * (1 - 0.3 * s), opacity: Math.min(1, p * 3) * (1 - s), transformOrigin: '50% 80%'};
      break;
    case 'enfoque':
      anim = {opacity: Math.min(1, p * 1.6) * (1 - s), filter: `blur(${(1 - e) * 14 + s * 10}px)`, scale: 1.25 - 0.25 * e + 0.1 * s};
      break;
    case 'deslizar':
      anim = {translate: `${(1 - e) * -70 + s * 60}px 0px`, transform: `skewX(${(1 - e) * -16}deg)`, opacity: Math.min(1, p * 2) * (1 - s)};
      break;
    case 'maquina': {
      // letra a letra con cursor
      const txt = typeof children === 'string' ? children : '';
      if (txt) {
        const n = Math.round(txt.length * Math.min(1, (t - en) / (txt.length * 1.2 * F)));
        return (
          <span style={{...caja, opacity: 1 - s, ...style}}>
            <span>{txt.slice(0, Math.max(0, n))}</span>
            <span style={{opacity: 0}}>{txt.slice(Math.max(0, n))}</span>
          </span>
        );
      }
      anim = {opacity: p > 0 ? 1 - s : 0};
      break;
    }
    case 'giro':
      anim = {transform: `perspective(600px) rotateX(${(1 - e) * -95 + s * 95}deg)`, transformOrigin: '50% 100%', opacity: Math.min(1, p * 2.5) * (1 - s)};
      break;
    case 'caida':
      anim = {translate: `0px ${(1 - REBOTE(p)) * -55 + s * 30}px`, opacity: Math.min(1, p * 3) * (1 - s)};
      break;
    case 'espaciado':
      anim = {scale: `${1 + (1 - e) * 0.45} 1`, opacity: Math.min(1, p * 1.5) * (1 - s), filter: `blur(${(1 - e) * 4 + s * 4}px)`};
      break;
    case 'ola':
      // crece desde la base como una ola (estirada en vertical que se asienta con un pequeño rebote)
      anim = {scale: `${0.9 + 0.1 * e} ${Math.max(0.05, MUELLE(p))}`, transform: `skewX(${(1 - e) * 10}deg)`, opacity: Math.min(1, p * 3) * (1 - s), transformOrigin: '50% 100%', translate: `0px ${-s * 24}px`};
      break;
    case 'rodar':
      // entra rodando desde la derecha y se frena en su sitio
      anim = {translate: `${(1 - e) * 70 + s * -40}px 0px`, rotate: `${(1 - e) * 28}deg`, opacity: Math.min(1, p * 2.5) * (1 - s), transformOrigin: '50% 70%'};
      break;
    case 'tecla':
      // se hunde como una tecla al pulsarla: baja, se aplasta un poco y rebota a su sitio
      anim = {translate: `0px ${Math.sin(Math.min(1, p) * Math.PI) * 10 - s * 24}px`, scale: `${1 + 0.06 * Math.sin(p * Math.PI)} ${1 - 0.12 * Math.sin(p * Math.PI)}`,
        opacity: Math.min(1, p * 4) * (1 - s), transformOrigin: '50% 100%'};
      break;
    case 'persiana':
      // baja desde arriba detrás de una máscara (como una persiana que se abre) y se asienta con un pequeño rebote
      mascara = (p > 0 && p < 1) || s > 0;
      anim = {translate: `0px ${(1 - MUELLE(p)) * -100 + s * 100}%`, opacity: Math.min(1, p * 3) * (1 - s * 0.5)};
      break;
    case 'bisagra':
      // gira desde el borde izquierdo como una tarjeta que se abre y se asienta con un pequeño rebote
      anim = {transform: `perspective(700px) rotateY(${(1 - MUELLE(p)) * -80 + s * 70}deg)`, transformOrigin: '0% 50%', opacity: Math.min(1, p * 2.5) * (1 - s)};
      break;
    case 'iman': {
      // la atrae un imán: llega desde arriba a la derecha algo más grande, se pasa un poco y se asienta con un muelle amortiguado
      const k = Math.max(0, t - en);
      const m = 1 - Math.exp(-7.5 * k) * Math.cos(2 * Math.PI * 2.8 * k);
      anim = {translate: `${(1 - m) * 46}px ${(1 - m) * -58 - s * 26}px`, scale: 1 + (1 - m) * 0.32 - 0.05 * s, filter: `blur(${(1 - e) * 4 + s * 6}px)`,
        opacity: Math.min(1, p * 3) * (1 - s), transformOrigin: '0% 100%'};
      break;
    }
    case 'robot': {
      // movimiento de robot: sube a saltos (4 pasos cuantizados) con un pequeño temblor mecánico al encajar
      const pasos = Math.min(1, Math.floor(e * 4 + 0.001) / 4);
      const encaja = p >= 1 ? 0 : (Math.floor((t - en) * 25) % 2) * 1.5;
      anim = {translate: `${encaja}px ${(1 - pasos) * 46 - s * 30}px`, opacity: (pasos > 0 ? 1 : 0) * (1 - s)};
      break;
    }
    case 'tiza':
      // se escribe como con tiza en una pizarra: se revela de izquierda a derecha con un leve temblor del trazo
      mascara = false;
      anim = {clipPath: `inset(-20% ${(1 - e) * 100}% -20% -5%)`, rotate: `${(1 - e) * -1.5}deg`, translate: `${p < 1 ? Math.sin((t - en) * 60) * 0.8 : 0}px ${-s * 26}px`, opacity: 1 - s};
      break;
    case 'engranaje': {
      // entra girando como un engranaje que encaja: media vuelta con muelle y un clic al encajar
      const m = 1 - Math.exp(-7 * Math.max(0, t - en)) * Math.cos(2 * Math.PI * 2.2 * Math.max(0, t - en));
      anim = {rotate: `${(1 - m) * -140}deg`, scale: 0.55 + 0.45 * Math.min(1.1, m) - 0.06 * s, opacity: Math.min(1, p * 3) * (1 - s), transformOrigin: '50% 55%'};
      break;
    }
    case 'estela':
      // sube desde abajo dejando un rastro de luz (copias que se desvanecen) y se asienta
      anim = {translate: `0px ${(1 - e) * 46 - s * 30}px`, opacity: Math.min(1, p * 2.2) * (1 - s),
        ...(p < 1 ? {textShadow: `0 ${(1 - e) * 26}px 0 rgba(255,255,255,${0.32 * (1 - e)}), 0 ${(1 - e) * 52}px 2px rgba(255,255,255,${0.14 * (1 - e)})`} : {})};
      break;
  }
  return (
    <span style={{...caja, overflow: mascara ? 'hidden' : 'visible', padding: '0.18em 0.12em 0.1em', margin: '-0.18em -0.12em -0.1em'}}>
      <span style={{display: 'inline-block', opacity: visible ? 1 : 0, ...anim, ...style, ...(anim.opacity !== undefined ? {opacity: visible ? (anim.opacity as number) : 0} : {})}}>
        {children}
      </span>
    </span>
  );
};

// ---------------- Golpe de la palabra clave ----------------
// Devuelve el estilo de la palabra clave (entra de golpe y se asienta). Las variantes con color usan el del propio texto.
export const golpeV = (estilo: EstiloGolpe, t: number, en: number, sale?: number): React.CSSProperties => {
  const p = Math.min(1, Math.max(0, (t - en) / (10 * F)));
  const e = EXPO_OUT(p);
  const s = sale === undefined ? 0 : iv(t, [sale, sale + 6 * F], [0, 1], EXPO_IN);
  const op = t < en ? 0 : Math.min(1, (t - en) / (2 * F)) * (1 - s);
  switch (estilo) {
    case 'muelle':
      return {opacity: op, scale: 0.72 + 0.28 * MUELLE(p) - 0.08 * s, filter: `blur(${(1 - e) * 6 + s * 8}px)`, letterSpacing: `${0.12 * (1 - e) - 0.015}em`, translate: `0px ${-30 * s}px`};
    case 'sello': {
      // cae como un sello: grande y girado, golpea, pequeño temblor y se queda
      const q = Math.min(1, Math.max(0, (t - en) / (6 * F)));
      const tiembla = t >= en + 6 * F && t < en + 12 * F ? Math.sin((t - en) * 90) * 3 * (1 - (t - en - 6 * F) / (6 * F)) : 0;
      return {opacity: op, scale: 1.45 - 0.45 * EXPO_IN(q) - 0.1 * s, rotate: `${-7 + 7 * EXPO_IN(q) + tiembla * 0.4}deg`, translate: `${tiembla}px ${-20 * s}px`};
    }
    case 'destello':
      return {opacity: op, scale: 0.9 + 0.1 * e - 0.06 * s, filter: `brightness(${1 + 1.6 * (1 - e)}) blur(${(1 - e) * 4 + s * 8}px)`};
    case 'barrido':
      // aparece de izquierda a derecha detrás de una franja de color que se retira
      return {opacity: t < en ? 0 : 1 - s, clipPath: `inset(-20% ${(1 - e) * 100}% -20% -5%)`, translate: `0px ${-20 * s}px`};
    case 'glitch': {
      const q = Math.min(1, Math.max(0, (t - en) / (9 * F)));
      const k = Math.floor((t - en) * 25);
      const j = q < 1 ? ((k * 37) % 7) - 3 : 0;
      return {opacity: op, translate: `${j * 6 * (1 - q)}px ${-20 * s}px`, textShadow: q < 1 ? `${8 * (1 - q)}px 0 rgba(255,40,80,0.9), ${-8 * (1 - q)}px 0 rgba(40,220,255,0.9)` : undefined, clipPath: q < 0.5 && k % 2 ? 'inset(10% 0 35% 0)' : undefined};
    }
    case 'zoom':
      return {opacity: op, scale: 2.4 - 1.4 * e - 0.1 * s, filter: `blur(${(1 - e) * 10 + s * 8}px)`};
    case 'rebote': {
      const q = Math.min(1, Math.max(0, (t - en) / (14 * F)));
      // aplastar y estirar (squash & stretch) desde la base, con rebote amortiguado
      return {opacity: op, scale: `${(1 + 0.3 * (1 - REBOTE(q))) * (1 - 0.06 * s)} ${Math.max(0.05, REBOTE(q)) * (1 - 0.06 * s)}`, transformOrigin: '50% 90%', translate: `0px ${-30 * s}px`};
    }
    case 'eco': {
      // entra con dos ecos detrás que se van recogiendo hasta fundirse con la palabra
      const q = Math.min(1, Math.max(0, (t - en) / (12 * F)));
      const r = 1 - EXPO_OUT(q);
      return {opacity: op, scale: 1.12 - 0.12 * EXPO_OUT(q) - 0.06 * s, translate: `0px ${-20 * s}px`,
        textShadow: r > 0.01 ? `0 ${-34 * r}px 0 rgba(255,255,255,${0.35 * r}), 0 ${-68 * r}px 0 rgba(255,255,255,${0.15 * r})` : undefined};
    }
    case 'cortina': {
      // se abre desde la línea central hacia arriba y abajo, con un pequeño estirón vertical que se asienta
      const q = Math.min(1, Math.max(0, (t - en) / (10 * F)));
      const abre = EXPO_OUT(q);
      return {opacity: t < en ? 0 : 1 - s, clipPath: `inset(${(1 - abre) * 50}% -5% ${(1 - abre) * 50}% -5%)`, scale: `1 ${1 + 0.18 * Math.sin(q * Math.PI)}`, translate: `0px ${-20 * s}px`};
    }
    case 'contorno': {
      // primero se dibuja el contorno y después se rellena de abajo arriba como un líquido
      const q = Math.min(1, Math.max(0, (t - en) / (13 * F)));
      const relleno = EXPO_OUT(Math.max(0, (q - 0.35) / 0.65));
      return {opacity: op, scale: 1.08 - 0.08 * EXPO_OUT(q) - 0.06 * s, WebkitTextStroke: `${3 * (1 - relleno)}px currentColor`,
        backgroundImage: `linear-gradient(0deg, currentColor ${relleno * 100}%, transparent ${relleno * 100}%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text',
        WebkitTextFillColor: relleno >= 1 ? undefined : 'transparent', translate: `0px ${-20 * s}px`} as React.CSSProperties;
    }
    case 'neon': {
      // se enciende como un rótulo de neón: dos parpadeos rápidos y queda encendido con un pico de brillo
      const k = Math.floor((t - en) * 25);
      const parpadeo = [1, 0.15, 1, 1, 0.35, 1];
      const f = k >= 0 && k < parpadeo.length ? parpadeo[k] : 1;
      const brillo = 1 + 0.9 * Math.max(0, 1 - (t - en) / (12 * F));
      return {opacity: (t < en ? 0 : f) * (1 - s), scale: 1.06 - 0.06 * e - 0.06 * s, filter: `brightness(${brillo}) blur(${s * 8}px)`, translate: `0px ${-20 * s}px`};
    }
    case 'latigo': {
      // entra de lado como un latigazo: muy inclinada y desenfocada en horizontal, se pasa un poco y vuelve a su sitio
      const q = Math.min(1, Math.max(0, (t - en) / (11 * F)));
      const m = MUELLE(q);
      return {opacity: op, translate: `${(1 - m) * -140}px ${-20 * s}px`, transform: `skewX(${(1 - EXPO_OUT(q)) * -24}deg)`,
        filter: `blur(${(1 - EXPO_OUT(q)) * 7 + s * 8}px)`, scale: 1 - 0.06 * s};
    }
    case 'marcador': {
      // entra con un muelle desde la base y una leve inclinación que se endereza (sin líneas ni subrayados)
      const q = Math.min(1, Math.max(0, (t - en) / (12 * F)));
      return {opacity: op, scale: 0.84 + 0.16 * MUELLE(Math.min(1, q * 1.5)) - 0.06 * s, rotate: `${(1 - EXPO_OUT(q)) * -4}deg`, transformOrigin: '50% 90%', translate: `0px ${-20 * s}px`};
    }
    case 'cartel': {
      // cae como un cartel colgado de un punto por encima: baja con muelle y se balancea hasta quedarse quieto
      const k = Math.max(0, t - en);
      const cae = 1 - Math.exp(-8 * k) * Math.cos(2 * Math.PI * 2.4 * k);
      const vaiven = 9 * Math.exp(-3.6 * k) * Math.cos(2 * Math.PI * 1.5 * k);
      return {opacity: op, translate: `0px ${(1 - cae) * -90 - 20 * s}px`, rotate: `${vaiven}deg`, transformOrigin: '50% -80%', scale: 1 - 0.06 * s};
    }
    case 'ensambla': {
      // se ensambla como una pieza: entra aplastada y ancha, se estira en vertical con un muelle y encaja con un pequeño golpe
      // (nunca se queda como una línea fina: el cliente no quiere líneas sobre los títulos)
      const q = Math.min(1, Math.max(0, (t - en) / (11 * F)));
      const m = MUELLE(q);
      const encaja = q >= 1 ? 0 : Math.sin(q * Math.PI * 3) * (1 - q) * 0.04;
      return {opacity: op, scale: `${(1.25 - 0.25 * m + encaja) * (1 - 0.06 * s)} ${(0.55 + 0.45 * m - encaja) * (1 - 0.06 * s)}`, transformOrigin: '50% 80%', translate: `0px ${-20 * s}px`};
    }
    case 'balanza': {
      // cae desde arriba inclinada como el plato de una balanza y oscila hasta quedar nivelada
      const k = Math.max(0, t - en);
      const cae = 1 - Math.exp(-9 * k) * Math.cos(2 * Math.PI * 2 * k);
      const osc = 11 * Math.exp(-4.2 * k) * Math.cos(2 * Math.PI * 1.7 * k);
      return {opacity: op, translate: `0px ${(1 - cae) * -60 - 20 * s}px`, rotate: `${osc}deg`, transformOrigin: '50% 100%', scale: 1 - 0.06 * s};
    }
    case 'pulso': {
      // late como un corazón al entrar (dos latidos que se apagan) con un destello de brillo
      const k = Math.max(0, t - en);
      const lat = Math.exp(-5 * k) * Math.max(0, Math.sin(k * Math.PI * 5));
      return {opacity: op, scale: 0.8 + 0.2 * e + 0.22 * lat - 0.06 * s, filter: `brightness(${1 + 0.8 * lat}) blur(${s * 8}px)`, translate: `0px ${-20 * s}px`};
    }
    case 'tinta':
      // se revela de abajo arriba como tinta que sube, con ligera inclinación que se endereza
      return {opacity: t < en ? 0 : 1 - s, clipPath: `inset(${(1 - e) * 100}% -5% -20% -5%)`, transform: `skewX(${(1 - e) * -8}deg)`, translate: `0px ${-24 * s}px`};
  }
};

// ---------------- Ráfaga de impacto ----------------
export const Impacto: React.FC<{t: number; en: number; x: number; y: number; estilo: EstiloImpacto; color?: string; radio?: number}> = ({
  t, en, x, y, estilo, color = C.amarillo, radio = 260,
}) => {
  const dur = estilo === 'confeti' ? 22 : estilo === 'halo' ? 16 : estilo === 'garabato' ? 20 : 13;
  const p = iv(t, [en, en + dur * F], [0, 1], EXPO_OUT);
  if (t < en || p >= 1) return null;
  const c = radio * 1.8;
  const svg = (hijos: React.ReactNode) => (
    <svg style={{position: 'absolute', left: x - c, top: y - c, overflow: 'visible'}} width={c * 2} height={c * 2}>
      {hijos}
    </svg>
  );
  const sombra = {filter: `drop-shadow(0 0 10px ${color})`};
  switch (estilo) {
    case 'rayos':
      return svg(Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.13;
        const r1 = radio * (0.55 + 0.75 * p);
        const r2 = radio * (0.75 + 0.85 * p);
        return <line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2} stroke={color} strokeWidth={10 * (1 - p) + 1} strokeLinecap="round" opacity={1 - p * 0.9} style={sombra} />;
      }));
    case 'onda':
      return svg(<>
        <circle cx={c} cy={c} r={radio * (0.3 + 1.1 * p)} fill="none" stroke={color} strokeWidth={18 * (1 - p) + 1} opacity={1 - p} style={sombra} />
        <circle cx={c} cy={c} r={radio * (0.15 + 0.8 * iv(t, [en + 3 * F, en + 16 * F], [0, 1], EXPO_OUT))} fill="none" stroke="#fff" strokeWidth={6 * (1 - p) + 0.5} opacity={0.8 * (1 - p)} />
      </>);
    case 'chispas':
      return svg(Array.from({length: 9}, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + 0.4;
        const r = radio * (0.4 + 0.9 * p) * (i % 2 ? 0.8 : 1.05);
        const sz = (i % 3 === 0 ? 34 : 22) * (1 - p * 0.7);
        const cx = c + Math.cos(a) * r;
        const cy = c + Math.sin(a) * r;
        return <path key={i} transform={`translate(${cx} ${cy}) rotate(${p * 90})`} d={`M0 ${-sz} C ${sz * 0.12} ${-sz * 0.12} ${sz * 0.12} ${-sz * 0.12} ${sz} 0 C ${sz * 0.12} ${sz * 0.12} ${sz * 0.12} ${sz * 0.12} 0 ${sz} C ${-sz * 0.12} ${sz * 0.12} ${-sz * 0.12} ${sz * 0.12} ${-sz} 0 C ${-sz * 0.12} ${-sz * 0.12} ${-sz * 0.12} ${-sz * 0.12} 0 ${-sz} Z`} fill={i % 3 ? color : '#fff'} opacity={1 - p} style={sombra} />;
      }));
    case 'rayas':
      return svg(Array.from({length: 16}, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r1 = radio * (0.35 + 1.0 * p);
        const r2 = r1 + radio * 0.35 * (1 - p);
        return <line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2} stroke={color} strokeWidth={5} strokeDasharray="10 8" strokeLinecap="round" opacity={1 - p} />;
      }));
    case 'cuadros':
      return svg(Array.from({length: 14}, (_, i) => {
        const a = ((i * 137.5) % 360) * (Math.PI / 180);
        const r = radio * (0.3 + 1.1 * p) * (0.6 + ((i * 7) % 5) / 8);
        const sz = (8 + ((i * 3) % 4) * 6) * (1 - p * 0.6);
        return <rect key={i} x={c + Math.cos(a) * r - sz / 2} y={c + Math.sin(a) * r - sz / 2} width={sz} height={sz} fill={i % 4 === 0 ? '#5EE1FF' : color} opacity={(1 - p) * (Math.floor((t - en) * 25 + i) % 3 === 0 ? 0.4 : 1)} />;
      }));
    case 'circulos':
      return svg([0, 1, 2].map((k) => {
        const q = iv(t, [en + k * 2 * F, en + (k * 2 + 11) * F], [0, 1], EXPO_OUT);
        return <circle key={k} cx={c} cy={c} r={radio * (0.25 + (0.5 + k * 0.3) * q)} fill="none" stroke={k === 1 ? '#fff' : color} strokeWidth={7 * (1 - q) + 1} opacity={(1 - q) * (q > 0 ? 1 : 0)} />;
      }));
    case 'confeti':
      return svg(Array.from({length: 22}, (_, i) => {
        const a = ((i * 97) % 360) * (Math.PI / 180);
        const v = radio * (0.7 + ((i * 13) % 7) / 6);
        const cx = c + Math.cos(a) * v * EXPO_OUT(p);
        const cy = c + Math.sin(a) * v * EXPO_OUT(p) + 220 * p * p; // caen por gravedad
        const cols = [color, '#ff7eb6', '#5EE1FF', '#ffffff', '#9be564'];
        return <rect key={i} x={cx - 7} y={cy - 4} width={14} height={8} rx={2} fill={cols[i % 5]} transform={`rotate(${(i * 40 + p * 720) % 360} ${cx} ${cy})`} opacity={1 - Math.max(0, p - 0.6) / 0.4} />;
      }));
    case 'rombos':
      return svg([0, 1, 2].map((k) => {
        const q = iv(t, [en + k * 2 * F, en + (k * 2 + 12) * F], [0, 1], EXPO_OUT);
        const l = radio * (0.3 + (0.7 + k * 0.25) * q);
        return <rect key={k} x={c - l} y={c - l} width={l * 2} height={l * 2} rx={l * 0.18} fill="none" stroke={k === 1 ? '#fff' : color} strokeWidth={8 * (1 - q) + 1}
          transform={`rotate(${45 + q * (k % 2 ? 20 : -20)} ${c} ${c})`} opacity={(1 - q) * (q > 0 ? 1 : 0)} style={sombra} />;
      }));
    case 'polvo':
      return svg(Array.from({length: 18}, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + (i % 2) * 0.17;
        const v = radio * (0.45 + 0.75 * p) * (0.85 + ((i * 7) % 5) / 14);
        const rr = (10 + ((i * 5) % 4) * 6) * (1 - p * 0.5);
        return <circle key={i} cx={c + Math.cos(a) * v} cy={c + Math.sin(a) * v} r={rr} fill={i % 4 === 0 ? '#fff' : color} opacity={(1 - p) * 0.85} />;
      }));
    case 'serpentinas':
      return svg(Array.from({length: 8}, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = radio * (0.35 + 1.0 * p);
        const giro = (i % 2 ? 1 : -1) * 0.9;
        const x1 = c + Math.cos(a) * radio * 0.3, y1 = c + Math.sin(a) * radio * 0.3;
        const x2 = c + Math.cos(a) * r, y2 = c + Math.sin(a) * r;
        const cx = c + Math.cos(a + giro) * r * 0.75, cy = c + Math.sin(a + giro) * r * 0.75;
        const largo = radio * 1.6;
        return <path key={i} d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={i % 3 === 0 ? '#fff' : color} strokeWidth={8 * (1 - p) + 1.5} strokeLinecap="round"
          strokeDasharray={`${largo * 0.45} ${largo}`} strokeDashoffset={-largo * 0.55 * p} opacity={1 - p} style={sombra} />;
      }));
    case 'estrella': {
      const pts = Array.from({length: 16}, (_, i) => {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const r = radio * (0.35 + 0.9 * p) * (i % 2 ? 0.55 : 1);
        return `${c + Math.cos(a) * r},${c + Math.sin(a) * r}`;
      }).join(' ');
      return svg(<g transform={`rotate(${p * 40} ${c} ${c})`}>
        <polygon points={pts} fill={color} fillOpacity={0.18 * (1 - p)} stroke={color} strokeWidth={9 * (1 - p) + 1} strokeLinejoin="round" opacity={1 - p} style={sombra} />
        <circle cx={c} cy={c} r={radio * 0.2 * (1 - p)} fill="#fff" opacity={1 - p} />
      </g>);
    }
    case 'garabato': {
      // trazos de énfasis a mano a los dos lados de la palabra (x, y = centro de la palabra; radio = media anchura):
      // tres rayitas que salen hacia fuera y arriba, se dibujan con un pequeño latigazo y se borran
      const dib = iv(t, [en, en + 7 * F], [0, 1], EXPO_OUT);
      const borra = iv(t, [en + 9 * F, en + dur * F], [0, 1]);
      return svg([-1, 1].flatMap((lado) => [-0.5, 0, 0.5].map((k, i) => {
        const ang = (lado < 0 ? Math.PI : 0) - lado * (0.55 + k * 0.62);
        const x0 = c + lado * (radio + 18), y0 = c - radio * 0.12;
        const r1 = 16 + 40 * borra, r2 = 16 + 64 * dib;
        return <line key={`${lado}${i}`} x1={x0 + Math.cos(ang) * r1} y1={y0 + Math.sin(ang) * r1} x2={x0 + Math.cos(ang) * r2} y2={y0 + Math.sin(ang) * r2}
          stroke={color} strokeWidth={9} strokeLinecap="round" opacity={1 - borra} style={sombra} />;
      })));
    }
    case 'halo':
      return svg(<>
        <defs>
          <radialGradient id={`halo${Math.round(en * 100)}`}>
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={radio * (0.6 + 0.6 * p)} fill={`url(#halo${Math.round(en * 100)})`} opacity={Math.sin(p * Math.PI)} />
      </>);
  }
};

// ---------------- Flecha del CTA ----------------
export const flechaV = (estilo: Estilo['flecha'], t: number, desde: number): React.CSSProperties => {
  const k = t - desde;
  if (k < 0) return {opacity: 0};
  switch (estilo) {
    case 'bote':
      return {translate: `0px ${Math.abs(Math.sin(k * 7)) * 18}px`};
    case 'pulso':
      return {scale: 1 + 0.18 * Math.abs(Math.sin(k * 5)), translate: '0px 4px'};
    case 'desliza':
      return {translate: `0px ${((k * 1.6) % 1) * 26}px`, opacity: 1 - ((k * 1.6) % 1) * 0.6};
    case 'gira':
      return {rotate: `${Math.sin(k * 6) * 12}deg`, translate: `0px ${Math.abs(Math.sin(k * 6)) * 10}px`};
    case 'latido': {
      const f = k % 1;
      return {scale: 1 + 0.2 * Math.max(0, Math.sin(f * Math.PI * 4)) * (f < 0.5 ? 1 : 0)};
    }
    case 'cae':
      return {translate: `0px ${-30 + ((k * 1.3) % 1) * 40}px`, opacity: Math.min(1, ((k * 1.3) % 1) * 4) * (1 - ((k * 1.3) % 1) * 0.5)};
    case 'balanceo':
      return {translate: `${Math.sin(k * 4) * 10}px ${Math.abs(Math.cos(k * 4)) * 8}px`};
    case 'vibra':
      return {translate: `0px ${(Math.floor(k * 25) % 2) * 5 + Math.abs(Math.sin(k * 3)) * 12}px`};
    case 'pendulo':
      return {rotate: `${Math.sin(k * 5) * 16}deg`, transformOrigin: '50% -40%'};
    case 'salto': {
      const f = (k * 1.2) % 1;
      const h = f < 0.5 ? Math.sin((f / 0.5) * Math.PI) : 0;
      const aplasta = f >= 0.5 && f < 0.62 ? Math.sin(((f - 0.5) / 0.12) * Math.PI) : 0;
      return {translate: `0px ${-h * 16}px`, scale: `${1 + 0.18 * aplasta} ${1 - 0.18 * aplasta}`, transformOrigin: '50% 100%'};
    }
    case 'voltea': {
      const f = (k * 0.9) % 1;
      const g = f < 0.4 ? Math.sin((f / 0.4) * Math.PI) : 0;
      return {transform: `perspective(300px) rotateX(${(f < 0.4 ? f / 0.4 : 0) * 360}deg)`, translate: `0px ${g * 8}px`};
    }
    case 'escalon': {
      // baja a saltos, como escalones (tres pasos y vuelve arriba)
      const f = (k * 1.5) % 1;
      const paso = Math.floor(f * 3);
      const dentro = (f * 3) % 1;
      return {translate: `0px ${(paso + EXPO_OUT(Math.min(1, dentro * 3))) * 9 - 9}px`, opacity: f > 0.92 ? 1 - (f - 0.92) / 0.08 : 1};
    }
    case 'resorte': {
      // cae y rebota como un muelle que se va calmando; repite cada 1,4 s
      const f = (k / 1.4) % 1;
      return {translate: `0px ${Math.sin(f * Math.PI * 6) * 16 * Math.exp(-f * 5)}px`, scale: `1 ${1 + 0.12 * Math.sin(f * Math.PI * 6) * Math.exp(-f * 5)}`, transformOrigin: '50% 0%'};
    }
    case 'toctoc': {
      // dos golpecitos rápidos hacia abajo (toc-toc) y una pausa; cada 1,3 s
      const f = (k / 1.3) % 1;
      const g = (x: number) => (x > 0 && x < 0.1 ? Math.sin((x / 0.1) * Math.PI) : 0);
      return {translate: `0px ${(g(f) + g(f - 0.14)) * 14}px`};
    }
    case 'goteo': {
      // baja despacio como una gota que se alarga y vuelve arriba de golpe, apareciendo de nuevo
      const f = (k / 1.4) % 1;
      return {translate: `0px ${f * 22}px`, scale: `1 ${1 + 0.18 * f}`, opacity: f > 0.85 ? 1 - (f - 0.85) / 0.15 : Math.min(1, f * 8), transformOrigin: '50% 0%'};
    }
    case 'piston': {
      // como un pistón: baja recto y rápido, se para en seco con una vibración corta y sube despacio; cada 1,2 s
      const f = (k / 1.2) % 1;
      const baja = f < 0.12 ? f / 0.12 : f < 0.5 ? 1 : 1 - (f - 0.5) / 0.5;
      const vib = f >= 0.12 && f < 0.24 ? Math.sin((f - 0.12) * 260) * 2.5 * (1 - (f - 0.12) / 0.12) : 0;
      return {translate: `0px ${baja * 16 + vib}px`};
    }
    case 'tiron': {
      // cada 1,3 s: se recoge un poco hacia arriba (anticipación), baja de un tirón estirándose y vuelve con un muelle
      const f = (k / 1.3) % 1;
      const sube = f < 0.18 ? Math.sin((f / 0.18) * Math.PI / 2) : 0;
      const g = f >= 0.18 ? f - 0.18 : 0;
      const baja = f >= 0.18 ? 22 * Math.exp(-6 * g) * Math.cos(2 * Math.PI * 2.2 * g) : 0;
      return {translate: `0px ${-6 * sube + baja}px`, scale: `${1 - 0.008 * baja} ${1 + 0.012 * Math.max(0, baja)}`, transformOrigin: '50% 0%'};
    }
    case 'elastica': {
      const f = (k * 1.4) % 1;
      const estira = Math.sin(Math.min(1, f / 0.35) * Math.PI);
      return {scale: `${1 - 0.15 * estira} ${1 + 0.4 * estira}`, transformOrigin: '50% 0%', translate: `0px ${estira * 10}px`};
    }
  }
};

export {EXPO_OUT, EXPO_IN, MUELLE, SUAVE, REBOTE, GLOW_AMARILLO};
