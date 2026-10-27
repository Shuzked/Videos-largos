import React from 'react';
import {AbsoluteFill, Easing, Img, Loop, Sequence, staticFile} from 'remotion';
import {OffthreadVideo} from '../sinvideo';
import {C, GLOW_AMARILLO, glow} from '../estilo';
import {F, Son, Sube, iv, golpe} from '../anim';
import {H, Ruido, amarillo} from '../texto';
import {Destello, IconoTrazado, Particulas, Pulso, ROJO, VERDE, aparece, flota, muelle} from '../lottie';

// Piezas del vídeo «9 IAs de vídeo, el mismo prompt» (16:9, coordenadas del fotograma 1920x1080), en el lenguaje Lottie
// del cliente: muelles con sobrepaso, aplastar/estirar, trazos que se dibujan, ráfagas al activarse y reposo vivo.

const FPS = 25;
const fr = (s: number) => Math.round(s * FPS);
const lim = (x: number) => Math.min(1, Math.max(0, x));
const PANEL = 'rgba(14,14,18,0.9)';
const SOMBRA = 'drop-shadow(0 6px 18px rgba(0,0,0,0.7))';
const LIMA = '#D1FE17'; // acento de Higgsfield (botón Generate)

export type Modelo = {n: number; nombre: string; creditos: number};
export const MODELOS: Modelo[] = [
  {n: 1, nombre: 'MiniMax H3', creditos: 20},
  {n: 2, nombre: 'Kling 3.0', creditos: 25},
  {n: 3, nombre: 'Wan 3.0', creditos: 35},
  {n: 4, nombre: 'Gemini Omni Flash 1.1', creditos: 45},
  {n: 5, nombre: 'Grok Imagine 1.5', creditos: 80},
  {n: 6, nombre: 'FLUX.3 Video', creditos: 80},
  {n: 7, nombre: 'Seedance 2.0', creditos: 120},
  {n: 8, nombre: 'Kling 4.0', creditos: 10},
  {n: 9, nombre: 'Seedance 2.5', creditos: 160},
];
export const clipDe = (n: number) => `medios/res/r${n}.mp4`;
export const DUR_CLIP = 10.04;

// Iconos (Material Icons, 24x24)
export const ICONO = {
  reloj: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  formato: 'M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z',
  hd: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm2-6h4c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-4V9zm1.5 4.5h2v-3h-2v3z',
  sonido: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  estrella: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  trofeo: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
};

// Destello de cuatro puntas de los créditos (como el ✦ de la web)
const CHISPA = 'M0 -12 C 1.5 -3, 3 -1.5, 12 0 C 3 1.5, 1.5 3, 0 12 C -1.5 3, -3 1.5, -12 0 C -3 -1.5, -1.5 -3, 0 -12 Z';

// Fundido + escala con rebote al entrar y fundido al salir (como <Ventana suave>), con el origen donde se ancla el gráfico
export const Suave: React.FC<{t: number; a: number; b: number; origen?: string; children: React.ReactNode}> = ({t, a, b, origen = '50% 50%', children}) => {
  if (t < a || t >= b) return null;
  const entra = iv(t, [a, a + 9 * F], [0, 1], Easing.bezier(0.34, 1.56, 0.64, 1));
  const sale = iv(t, [b - 8 * F, b], [0, 1], Easing.bezier(0.55, 0, 1, 0.45));
  return (
    <AbsoluteFill style={{opacity: iv(t, [a, a + 6 * F], [0, 1]) * (1 - sale), scale: 0.9 + 0.1 * entra - 0.08 * sale, transformOrigin: origen}}>
      {children}
    </AbsoluteFill>
  );
};

// Fondo de motion graphics: negro cálido con un foco que deriva despacio
export const Fondo: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #1d1d21 0%, #0f0f12 62%, #050506 100%)'}}>
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06), transparent 45%)', translate: `${Math.sin(t * 0.5) * 260}px ${Math.cos(t * 0.4) * 110 - 40}px`}} />
    {/* grano de película suave: que el fondo no se vea plano ni «digital» */}
    <Ruido id="granoFondo" opacidad={0.09} />
  </AbsoluteFill>
);

// Vídeo de un resultado en un marco redondeado (sin recortar: siempre entero, a su tamaño 16:9)
const Marco: React.FC<{n: number; desde: number; dur: number; w: number; x: number; y: number; mudo?: boolean; vol?: number; radio?: number; ini?: number}> = ({n, desde, dur, w, x, y, mudo = true, vol = 1, radio = 24, ini = 0}) => (
  <Sequence from={fr(desde)} durationInFrames={fr(dur)} layout="none">
    <div style={{position: 'absolute', left: x, top: y, width: w, height: (w * 9) / 16, borderRadius: radio, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,0.65)', outline: '3px solid rgba(255,255,255,0.16)'}}>
      {mudo ? (
        // vista previa muda: en bucle, para que nunca se quede congelada en el último fotograma
        <Loop durationInFrames={250}>
          <OffthreadVideo src={staticFile(clipDe(n))} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
      ) : (
        <OffthreadVideo src={staticFile(clipDe(n))} volume={vol} trimBefore={fr(ini)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      )}
    </div>
  </Sequence>
);

// ---------- GANCHO: cuadrícula 3x3 con los 9 resultados a la vez (sin nombres): cada celda entra con muelle, en diagonal ----------
export const Cuadricula: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t >= b) return null;
  const W = 600, G = 18, X0 = (1920 - 3 * W - 2 * G) / 2, Y0 = (1080 - 3 * ((W * 9) / 16) - 2 * G) / 2;
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      {MODELOS.map((m, i) => {
        const fila = Math.floor(i / 3), col = i % 3;
        const en = a + (fila + col) * 3 * F;
        const ap = aparece(t, en, (col - 1) * 6);
        const fl = flota(t, i * 0.9, 3);
        const x = X0 + col * (W + G), y = Y0 + fila * ((W * 9) / 16 + G);
        return (
          <div key={m.n} style={{position: 'absolute', inset: 0, scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot}deg`, translate: `0px ${fl.y}px`, opacity: ap.op, transformOrigin: `${x + W / 2}px ${y + (W * 9) / 32}px`}}>
            <Marco n={m.n} desde={a} dur={b - a} w={W} x={x} y={y} radio={16} />
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      </svg>
    </AbsoluteFill>
  );
};

// ---------- GANCHO: 1 s de cada resultado seguido, a pantalla completa (sin nombres), con destello en cada cambio ----------
export const Rafaga: React.FC<{t: number; a: number; paso?: number; orden?: number[]}> = ({t, a, paso = 1, orden = [1, 2, 3, 4, 5, 6, 7, 8, 9]}) => {
  const k = Math.floor((t - a) / paso);
  if (t < a || k >= orden.length) return null;
  const local = t - a - k * paso;
  return (
    <AbsoluteFill>
      {orden.map((n, i) => (
        <Sequence key={n} from={fr(a + i * paso)} durationInFrames={fr(paso)} layout="none">
          <div style={{position: 'absolute', inset: 0, scale: 1.04 + 0.05 * local / paso}}>
            <OffthreadVideo src={staticFile(clipDe(n))} muted trimBefore={fr(4.5)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        </Sequence>
      ))}
      <AbsoluteFill style={{background: '#fff', opacity: 0.55 * Math.max(0, 1 - local / (3 * F))}} />
    </AbsoluteFill>
  );
};

// ---------- Rótulo grande del modelo al elegirlo: «Nombre · X créditos» (a la derecha, sin tapar el selector) ----------
export const RotuloModelo: React.FC<{t: number; a: number; b: number; n: number; x?: number; y?: number}> = ({t, a, b, n, x = 1180, y = 420}) => {
  if (t < a || t >= b) return null;
  const m = MODELOS[n - 1];
  const ap = aparece(t, a, -10);
  const fl = flota(t, n, 4);
  const cred = aparece(t, a + 7 * F, 14);
  const tam = Math.min(112, 1260 / (m.nombre.length * 0.68));
  return (
    <Suave t={t} a={a} b={b} origen={`${(x / 1920) * 100}% ${(y / 1080) * 100}%`}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 40% 34% at ${(x / 1920) * 100}% ${(y / 1080) * 100}%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 100%)`}} />
      <div style={{position: 'absolute', left: x - 700, width: 1400, top: y - 120 + fl.y, display: 'flex', flexDirection: 'column', alignItems: 'center', filter: SOMBRA}}>
        <div style={{fontWeight: 800, fontSize: 30, letterSpacing: '0.24em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.6)}}>
          <Sube t={t} en={a}>{`MODELO ${n} DE 9`}</Sube>
        </div>
        <div style={{...H, fontSize: tam, scale: `${ap.sx} ${ap.sy}`, ...golpe(t, a + 2 * F, b - 6 * F)}}>{m.nombre}</div>
        <div style={{marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 28px 10px 18px', borderRadius: 999, background: LIMA, color: '#111',
          scale: `${cred.sx} ${cred.sy}`, rotate: `${cred.rot}deg`, opacity: cred.op, boxShadow: '0 8px 24px rgba(0,0,0,0.5)'}}>
          <svg width={44} height={44} viewBox="-13 -13 26 26"><path d={CHISPA} fill="#111" transform={`rotate(${(t - a) * 40})`} /></svg>
          <span style={{fontWeight: 900, fontSize: 52, letterSpacing: '-0.01em'}}>{m.creditos} créditos</span>
        </div>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Pulso t={t} en={a + 7 * F} x={x} y={y + 130} r={120} color={LIMA} />
        <Particulas t={t} en={a + 7 * F} x={x} y={y + 130} n={12} radio={260} colores={[LIMA, '#fff']} />
      </svg>
    </Suave>
  );
};

// ---------- Resultado: el clip ENTERO, ampliado, con su audio original y el nombre del modelo encima; barra de progreso de 10 s ----------
// off: segundos del clip que ya se han visto en la pantalla de Álvaro (el inserto sigue desde ahí, sin volver a empezar)
export const Resultado: React.FC<{t: number; a: number; n: number; intento?: string; sinSalida?: boolean; off?: number}> = ({t, a, n, intento, sinSalida, off = 0}) => {
  const b = a + DUR_CLIP - off;
  if (t < a - 0.4 || t >= b + 0.4) return null;
  const m = MODELOS[n - 1];
  const W = 1500, X = (1920 - W) / 2, Y = 150, Hh = (W * 9) / 16; // dentro de los márgenes (la barra acaba en y≈1016)
  const entra = muelle(t, a - 0.4, 2.2, 7);
  const sale = sinSalida ? 0 : iv(t, [b, b + 0.4], [0, 1], Easing.bezier(0.55, 0, 1, 0.45));
  const p = lim((t - a + off) / DUR_CLIP);
  const et = aparece(t, a - 0.2, -8);
  return (
    <AbsoluteFill style={{opacity: lim((t - a + 0.4) / 0.2) * (1 - sale)}}>
      <Fondo t={t} />
      <div style={{position: 'absolute', inset: 0, scale: 0.86 + 0.14 * entra - 0.06 * sale, transformOrigin: '50% 55%'}}>
        <Marco n={n} desde={a} dur={DUR_CLIP - off} w={W} x={X} y={Y} mudo={false} ini={off} />
        {/* barra de progreso del clip */}
        <div style={{position: 'absolute', left: X, top: Y + Hh + 14, width: W, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.15)'}}>
          <div style={{width: `${p * 100}%`, height: '100%', borderRadius: 4, background: LIMA, boxShadow: `0 0 12px ${LIMA}`}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: X, top: 62, display: 'flex', alignItems: 'center', gap: 18, scale: `${et.sx} ${et.sy}`, transformOrigin: '0% 50%', opacity: et.op}}>
        <div style={{...H, fontSize: 64}}>{m.nombre}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '6px 18px 6px 12px', borderRadius: 999, background: LIMA, color: '#111', fontWeight: 900, fontSize: 32}}>
          <svg width={28} height={28} viewBox="-13 -13 26 26"><path d={CHISPA} fill="#111" /></svg>
          {m.creditos}
        </div>
        {intento && <div style={{fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.75)'}}>{intento}</div>}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Nota: arco que se dibuja hasta la nota, número que cuenta de 0 a la nota y «/10»; color según la nota ----------
export const Nota: React.FC<{t: number; a: number; b: number; nota: number; n?: number; x?: number; y?: number}> = ({t, a, b, nota, n, x = 1560, y = 560}) => {
  if (t < a || t >= b) return null;
  const color = nota >= 8 ? VERDE : nota >= 5 ? C.amarillo : ROJO;
  const rgb = nota >= 8 ? '46,229,157' : nota >= 5 ? GLOW_AMARILLO : '255,77,94';
  const R = 150;
  const traza = 1 - Math.pow(1 - lim((t - a - 4 * F) / 0.8), 3);
  const valor = Math.round(nota * traza * 10) / 10;
  const ap = aparece(t, a, 12);
  const fl = flota(t, 2, 4);
  const fin = a + 4 * F + 0.8;
  return (
    <Suave t={t} a={a} b={b} origen={`${(x / 1920) * 100}% ${(y / 1080) * 100}%`}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible', filter: SOMBRA}}>
        <g transform={`translate(${x} ${y + fl.y}) scale(${ap.sx} ${ap.sy}) rotate(${ap.rot})`}>
          <circle r={R + 26} fill={PANEL} />
          <circle r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={22} />
          <circle r={R} fill="none" stroke={color} strokeWidth={22} strokeLinecap="round" transform="rotate(-90)" pathLength={1}
            strokeDasharray={`${(nota / 10) * traza} 1`} style={{filter: `drop-shadow(0 0 10px rgba(${rgb},0.8))`}} />
        </g>
        <Pulso t={t} en={fin} x={x} y={y} r={R + 26} color={color} />
        <Particulas t={t} en={fin} x={x} y={y} n={14} radio={300} colores={[color, '#fff']} />
        <Destello t={t} en={fin + 2 * F} x={x + 120} y={y - 130} tam={30} color={color} />
      </svg>
      <div style={{position: 'absolute', left: x - 200, width: 400, top: y - 92 + fl.y, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'baseline'}}>
          <span style={{...H, fontSize: Number.isInteger(nota) ? 150 : 112, color, textShadow: glow(rgb, 1), ...(t >= fin ? golpe(t, fin) : {})}}>{Number.isInteger(nota) ? Math.round(valor) : valor.toFixed(1).replace('.', ',')}</span>
          <span style={{fontWeight: 800, fontSize: 56, marginLeft: 6, textShadow: glow('255,255,255', 0.4)}}>/10</span>
        </div>
      </div>
      {/* qué modelo es y lo que cuesta: nombre encima del arco y los créditos debajo */}
      {n !== undefined && (
        <>
          <div style={{position: 'absolute', left: x - 400, width: 800, top: y - R - 120 + fl.y, textAlign: 'center', ...H, fontSize: Math.min(64, 760 / (MODELOS[n - 1].nombre.length * 0.68))}}>
            <Sube t={t} en={a}>{MODELOS[n - 1].nombre}</Sube>
          </div>
          <div style={{position: 'absolute', left: x - 200, width: 400, top: y + R + 44 + fl.y, display: 'flex', justifyContent: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '6px 20px 6px 12px', borderRadius: 999, background: LIMA, color: '#111', fontWeight: 900, fontSize: 32, ...golpe(t, a + 3 * F)}}>
              <svg width={28} height={28} viewBox="-13 -13 26 26"><path d={CHISPA} fill="#111" /></svg>
              {MODELOS[n - 1].creditos} créditos
            </div>
          </div>
        </>
      )}
    </Suave>
  );
};

// ---------- El prompt en grande: panel oscuro con el texto en inglés; la frase que Álvaro está traduciendo se ilumina ----------
export const Prompt: React.FC<{t: number; a: number; b: number; frases: [string, number][]}> = ({t, a, b, frases}) => {
  if (t < a || t >= b) return null;
  let activa = -1;
  frases.forEach(([, en], i) => { if (t >= en) activa = i; });
  const ap = muelle(t, a, 1.6, 7);
  return (
    <Suave t={t} a={a} b={b}>
      <AbsoluteFill style={{background: 'rgba(0,0,0,0.55)'}} />
      <div style={{position: 'absolute', left: 170, right: 170, top: 90, padding: '40px 56px 46px', borderRadius: 32, background: PANEL, border: '2px solid rgba(255,255,255,0.14)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.6)', clipPath: `inset(0 ${100 - ap * 100}% 0 0 round 32px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20}}>
          <svg width={40} height={40} viewBox="-13 -13 26 26"><path d={CHISPA} fill={LIMA} /></svg>
          <div style={{fontWeight: 800, fontSize: 30, letterSpacing: '0.22em', color: LIMA}}>PROMPT</div>
        </div>
        <div style={{fontWeight: 500, fontSize: 40, lineHeight: 1.42, letterSpacing: '-0.005em'}}>
          {frases.map(([txt], i) => (
            <span key={i} style={{color: i === activa ? C.amarillo : i < activa ? '#fff' : 'rgba(255,255,255,0.62)', textShadow: i === activa ? glow(GLOW_AMARILLO, 0.7) : 'none'}}>
              {txt}{' '}
            </span>
          ))}
        </div>
      </div>
    </Suave>
  );
};

// ---------- Reglas: cuatro fichas (10 s · 16:9 · 1080p · audio) que salen al decirlas y la ficha «nota del 1 al 10» ----------
export const Reglas: React.FC<{t: number; a: number; b: number; en: number[]; nota?: number}> = ({t, a, b, en, nota}) => {
  if (t < a || t >= b) return null;
  const fichas: [string, string][] = [[ICONO.reloj, '10 s'], [ICONO.formato, '16:9'], [ICONO.hd, '1080p'], [ICONO.sonido, 'audio']];
  const W = 330, G = 34, X0 = (1920 - 4 * W - 3 * G) / 2, Y = 300;
  return (
    <Suave t={t} a={a} b={b}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 62% 55% at 50% 45%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.1) 100%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', ...H, fontSize: 66}}>
        <Sube t={t} en={a}>mismos ajustes para todos</Sube>
      </div>
      {fichas.map(([d, txt], i) => {
        const e = en[i] ?? a + i * 0.4;
        if (t < e) return null;
        const ap = aparece(t, e, (i - 1.5) * 8);
        const fl = flota(t, i * 1.3, 4);
        const x = X0 + i * (W + G);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: Y + fl.y, width: W, height: 230, borderRadius: 30, background: PANEL, border: '2px solid rgba(255,255,255,0.16)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, scale: `${ap.sx} ${ap.sy}`, rotate: `${ap.rot}deg`, boxShadow: '0 14px 40px rgba(0,0,0,0.55)'}}>
            <svg width={96} height={96} viewBox="0 0 96 96" style={{overflow: 'visible'}}>
              <IconoTrazado d={d} t={t} en={e + 2 * F} color={C.amarillo} size={96} />
            </svg>
            <div style={{...H, fontSize: 64}}>{txt}</div>
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {fichas.map((_, i) => (en[i] !== undefined ? <Particulas key={i} t={t} en={en[i]} x={X0 + i * (W + G) + W / 2} y={Y + 115} n={8} radio={190} colores={[C.amarillo, '#fff']} /> : null))}
      </svg>
      {nota !== undefined && t >= nota && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', justifyContent: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '16px 40px', borderRadius: 999, background: C.amarillo, color: '#141418',
            ...golpe(t, nota)}}>
            <svg width={52} height={52} viewBox="0 0 24 24"><path d={ICONO.estrella} fill="#141418" /></svg>
            <span style={{fontWeight: 900, fontSize: 60, textTransform: 'uppercase'}}>nota del 1 al 10</span>
          </div>
        </div>
      )}
    </Suave>
  );
};

// ---------- Podio: suben los cajones (3.º, 2.º, ganador) con el clip de cada uno encima y su nota; confeti para el ganador ----------
export const Podio: React.FC<{t: number; a: number; b: number; puestos: {n: number; nota: number; en: number}[]}> = ({t, a, b, puestos}) => {
  if (t < a || t >= b) return null;
  // 1.º en el centro (más alto), 2.º a la izquierda, 3.º a la derecha; el clip va encima de su cajón y el nombre y la nota encima del clip
  const pos = [{x: 960, alto: 250, W: 560}, {x: 420, alto: 180, W: 450}, {x: 1500, alto: 130, W: 450}];
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      {puestos.map((p, k) => {
        const lugar = 2 - k; // los puestos llegan en orden 3.º, 2.º, 1.º
        const P = pos[lugar];
        if (t < p.en) return null;
        const sube = muelle(t, p.en, 1.6, 6.5);
        const m = MODELOS[p.n - 1];
        const yBase = 1080 - P.alto * sube;
        const ap = aparece(t, p.en + 6 * F, lugar === 0 ? 0 : lugar === 1 ? -6 : 6);
        const hClip = (P.W * 9) / 16;
        const yClip = yBase - 24 - hClip;
        const color = lugar === 0 ? C.amarillo : lugar === 1 ? '#d9dde3' : '#e0a46b';
        return (
          <React.Fragment key={p.n}>
            <div style={{position: 'absolute', left: P.x - P.W / 2 - 24, width: P.W + 48, top: yBase, height: P.alto + 40, borderRadius: '22px 22px 0 0',
              background: `linear-gradient(180deg, ${color} 0%, rgba(40,40,46,0.95) 150%)`, boxShadow: '0 -8px 40px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center'}}>
              <div style={{...H, fontSize: 100, color: '#141418', textShadow: 'none', marginTop: 16}}>{lugar + 1}</div>
            </div>
            <div style={{position: 'absolute', inset: 0, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, transformOrigin: `${P.x}px ${yBase}px`}}>
              <Marco n={p.n} desde={p.en} dur={b - p.en} w={P.W} x={P.x - P.W / 2} y={yClip} radio={18} />
              <div style={{position: 'absolute', left: P.x - 400, width: 800, top: yClip - (lugar === 0 ? 112 : 96), textAlign: 'center'}}>
                <div style={{...H, fontSize: lugar === 0 ? 54 : 42}}>{m.nombre}</div>
                <div style={{fontWeight: 800, fontSize: lugar === 0 ? 40 : 34, color, textShadow: glow(lugar === 0 ? GLOW_AMARILLO : '255,255,255', 0.5)}}>{String(p.nota).replace('.', ',')}/10</div>
              </div>
            </div>
            <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              {lugar === 0 && <Particulas t={t} en={p.en + 6 * F} x={P.x} y={yClip + hClip / 2} n={lugar === 0 ? 22 : 10} radio={lugar === 0 ? 520 : 260} colores={[color, '#fff', LIMA]} dur={lugar === 0 ? 30 : 18} />}
              {lugar === 0 && <Destello t={t} en={p.en + 10 * F} x={P.x + 300} y={yClip - 60} tam={40} color={C.amarillo} />}
              {lugar === 0 && t >= p.en + 8 * F && (
                <g transform={`translate(${P.x} ${yClip - 160}) scale(${aparece(t, p.en + 8 * F, 14).sx})`}>
                  <IconoTrazado d={ICONO.trofeo} t={t} en={p.en + 8 * F} color={C.amarillo} size={80} x={-40} y={-40} />
                </g>
              )}
            </svg>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Pantalla partida: dos versiones del mismo modelo, una a cada lado, con su nombre y la línea que las separa ----------
export const Partida: React.FC<{t: number; a: number; b: number; izq: number; der: number}> = ({t, a, b, izq, der}) => {
  if (t < a || t >= b) return null;
  const W = 900, Y = 250;
  const linea = 1 - Math.pow(1 - lim((t - a) / 0.5), 3);
  const lado = (n: number, x: number, en: number) => {
    const ap = aparece(t, en, 0);
    const m = MODELOS[n - 1];
    return (
      <div style={{position: 'absolute', inset: 0, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, transformOrigin: `${x + W / 2}px ${Y + 250}px`}}>
        <Marco n={n} desde={a} dur={b - a} w={W} x={x} y={Y} radio={20} />
        <div style={{position: 'absolute', left: x, width: W, top: Y - 100, textAlign: 'center', ...H, fontSize: 58}}>{m.nombre}</div>
        <div style={{position: 'absolute', left: x, width: W, top: Y + (W * 9) / 16 + 22, textAlign: 'center', fontWeight: 800, fontSize: 36, color: LIMA}}>{m.creditos} créditos</div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      {lado(izq, 40, a)}
      {lado(der, 980, a + 3 * F)}
      <div style={{position: 'absolute', left: 958, width: 4, top: 540 - 380 * linea, height: 760 * linea, background: 'rgba(255,255,255,0.5)', borderRadius: 2}} />
      <div style={{position: 'absolute', left: 900, width: 120, top: 480, textAlign: 'center', ...H, fontSize: 60, ...amarillo, ...golpe(t, a + 6 * F)}}>VS</div>
    </AbsoluteFill>
  );
};

// ---------- Cierre: banner oficial a pantalla completa con un zoom lento ----------
export const Banner: React.FC<{t: number; a: number; b: number}> = ({t, a, b}) => {
  if (t < a || t >= b) return null;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Img src={staticFile('medios/banner.png')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: iv(t, [a, b], [1.0, 1.05])}} />
    </AbsoluteFill>
  );
};

// ---------- Rótulo pequeño (aclaraciones, p. ej. la mejora automática de prompt de Kling 3.0) ----------
export const Aviso: React.FC<{t: number; a: number; b: number; texto: string; x?: number; y?: number}> = ({t, a, b, texto, x = 960, y = 1010}) => (
  <Suave t={t} a={a} b={b} origen={`${(x / 1920) * 100}% ${(y / 1080) * 100}%`}>
    <div style={{position: 'absolute', left: x - 800, width: 1600, top: y - 30, display: 'flex', justifyContent: 'center'}}>
      <div style={{padding: '10px 26px', borderRadius: 14, background: PANEL, border: '2px solid rgba(255,255,255,0.16)', fontWeight: 600, fontSize: 30, display: 'flex', alignItems: 'center', gap: 12}}>
        <span style={{width: 12, height: 12, borderRadius: 6, background: C.amarillo, boxShadow: `0 0 10px ${C.amarillo}`}} />
        {texto}
      </div>
    </div>
  </Suave>
);

// ---------- Nota de Kling 3.0 (obligatoria por guion): pestaña que sale del propio bloque de la captura, alineada con su
// borde derecho y con el mismo marco blanco y esquinas, como si fuera parte de la ventana. Sale de debajo del bloque, el
// interruptor se enciende solo (con chispas) y un brillo la cruza. x = borde derecho; y = borde del bloque al que se pega;
// ancla 'debajo' (pegada bajo el bloque) o 'dentro' (en la esquina inferior derecha, por dentro).
export const NotaKling: React.FC<{t: number; a: number; b: number; x: number; y: number; ancla?: 'debajo' | 'dentro'}> = ({t, a, b, x, y, ancla = 'debajo'}) => {
  if (t < a || t >= b) return null;
  const W = 520;
  const e = muelle(t, a, 2.4, 9);
  const s = iv(t, [b - 8 * F, b], [0, 1], Easing.bezier(0.55, 0, 1, 0.45));
  const on = lim((t - a - 0.55) / (5 * F));
  const onE = Easing.bezier(0.34, 1.56, 0.64, 1)(on);
  const brillo = lim((t - a - 0.9) / 0.7);
  const ws: [string, number][] = [['mejora', 0.15], ['automática', 0.22], ['de', 0.29], ['prompt', 0.33]];
  const debajo = ancla === 'debajo';
  // sale deslizándose desde el borde del bloque (por debajo de él), sin escalar: como una pestaña de la interfaz
  const desliza = (1 - e + s) * (debajo ? -40 : 40);
  return (
    <div style={{position: 'absolute', left: x - W, width: W, ...(debajo ? {top: y + 12} : {bottom: 1080 - y + 16}), overflow: 'hidden', borderRadius: 16}}>
      <div style={{position: 'relative', translate: `0px ${desliza}px`, opacity: lim((t - a) / (3 * F)) * (1 - s), borderRadius: 16, overflow: 'hidden', padding: '12px 20px 14px', boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #17171c 0%, #0e0e11 100%)', border: '3px solid rgba(255,255,255,0.92)', boxShadow: '0 18px 50px rgba(0,0,0,0.6)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 22, color: '#fff'}}>
          <svg width={20} height={20} viewBox="-13 -13 26 26"><path d={CHISPA} fill={LIMA} /></svg>
          <Sube t={t} en={a + 0.08}>Kling 3.0:</Sube>
        </div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4}}>
          <div style={{fontWeight: 700, fontSize: 26, color: '#fff', whiteSpace: 'nowrap'}}>
            {ws.map(([w, d], i) => <React.Fragment key={i}><Sube t={t} en={a + d}>{w}</Sube>{' '}</React.Fragment>)}
          </div>
          <div style={{position: 'relative', flex: 'none', width: 58, height: 30, borderRadius: 15, background: on > 0.5 ? LIMA : 'rgba(255,255,255,0.18)', boxShadow: on > 0.5 ? `0 0 14px ${LIMA}` : 'none'}}>
            <div style={{position: 'absolute', top: 3, left: 3 + 28 * onE, width: 24, height: 24, borderRadius: 12, background: on > 0.5 ? '#111' : '#fff'}} />
          </div>
        </div>
        <div style={{fontWeight: 600, fontSize: 20, color: 'rgba(255,255,255,0.62)', marginTop: 3}}>
          <Sube t={t} en={a + 0.62}>activada</Sube> <Sube t={t} en={a + 0.7}>por</Sube> <Sube t={t} en={a + 0.76}>defecto</Sube>
        </div>
        {brillo > 0 && brillo < 1 && (
          <div style={{position: 'absolute', top: -40, bottom: -40, width: 90, left: -120 + (W + 240) * brillo, rotate: '18deg',
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)'}} />
        )}
        <svg width={W} height={120} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <Particulas t={t} en={a + 0.55 + 3 * F} x={W - 52} y={56} n={8} radio={60} colores={[LIMA, '#fff']} />
        </svg>
      </div>
      <Son s="click" en={a + 0.6} db={-14} />
    </div>
  );
};
