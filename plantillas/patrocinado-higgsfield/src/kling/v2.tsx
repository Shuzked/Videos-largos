import React from 'react';
import {AbsoluteFill, Easing, Img, Loop, Sequence, staticFile} from 'remotion';
import {OffthreadVideo} from '../sinvideo';
import {C, GLOW_AMARILLO, LIMA, glow} from '../estilo';
import {F, Sube, Ventana, golpe, iv} from '../anim';
import {H, IconoHiggsfield, LogoHiggsfield, amarillo} from '../texto';
import {Conector, Particulas, Pulso, aparece, flota, puntaFlecha} from '../lottie';
import {FiltroRGB, estadoTransicion} from '../a1/transicion';
import {Fondo} from './piezas';
import {Ico, Insignia} from './iconosFlat';
import {cabe} from './iconos';
import EDL from './edl.json';

// Piezas de la versión 2 del vídeo de Kling: transición del ejemplo del cliente, recorte en vivo de su cámara y las
// escenas rehechas (línea del «clavado», plan con los recursos del vídeo, fotogramas clave, prompt entero, «lo más
// valioso», comparativas A2 y B, el servicio y la outro).

const FPS = 30;
const fr = (s: number) => Math.round(s * FPS);
const lim = (x: number) => Math.min(1, Math.max(0, x));
const SUAVE = Easing.bezier(0.45, 0, 0.12, 1);
const SOMBRA = 'drop-shadow(0 10px 26px rgba(0,0,0,0.7))';
const PANEL = 'rgba(14,14,18,0.9)';
const KF = [1, 2, 3, 4].map((i) => `medios/kf/kf${i}.jpg`);
const MF = [1, 2, 3, 4].map((i) => `medios/kf/m${i}.jpg`);
const FOTOS = ['medios/kf/foto1.jpg', 'medios/kf/foto2.jpg', 'medios/kf/foto3.jpg', 'medios/kf/frasco.jpg'];
type Seg = {tipo: string; ini: number; dur: number; desde?: number};
const SEGS = (EDL as unknown as {segs: Seg[]}).segs;
const reloj = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}${s % 1 > 0.01 ? ',' + Math.round((s % 1) * 10) : ''}`;
const entra = (t: number, en: number, d = 0.6) => SUAVE(lim((t - en) / d));

// ---------------- transición del ejemplo del cliente (12 fotogramas, 25 fps) en 16:9 ----------------
export const Transicion16: React.FC<{frame25: number; cortes: number[]; children: React.ReactNode}> = ({frame25, cortes, children}) => {
  const e = estadoTransicion(frame25, cortes, 25) ?? {s: 1, dx: 0, dy: 0, rgb: 0, blur: 0};
  const s = Math.max(e.s, 1 + 2 * Math.max(Math.abs(e.dx) / 1920, Math.abs(e.dy) / 1080) + (e.blur > 0 ? (3 * e.blur) / 540 : 0));
  return (
    <>
      <FiltroRGB px={e.rgb} />
      <div style={{position: 'absolute', inset: 0, scale: s, translate: `${e.dx}px ${e.dy}px`, filter: e.rgb > 0 || e.blur > 0 ? `url(#rgb-${e.rgb}) blur(${e.blur}px)` : 'none'}}>
        {children}
      </div>
    </>
  );
};

// ---------------- su cámara en vivo: la burbuja del corte, recortada (solo en los tramos de pantalla) ----------------
const BUR = {x: 22, y: 151, w: 478, h: 779};
export const CamVivo: React.FC<{t: number; x: number; y: number; w: number; radio?: number; style?: React.CSSProperties}> = ({t, x, y, w, radio = 26, style}) => {
  const s = SEGS.find((g) => g.tipo === 'base' && t >= g.ini && t < g.ini + g.dur);
  if (!s) return null;
  const k = w / BUR.w;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: BUR.h * k, borderRadius: radio, overflow: 'hidden', ...style}}>
      <Sequence from={fr(s.ini)} durationInFrames={Math.max(1, fr(s.ini + s.dur) - fr(s.ini))} layout="none">
        <OffthreadVideo src={staticFile('medios/corte.mp4')} muted trimBefore={fr(s.desde ?? 0)}
          style={{position: 'absolute', left: -BUR.x * k, top: -BUR.y * k, width: 1920 * k, height: 1080 * k}} />
      </Sequence>
    </div>
  );
};

// vídeo en bucle desde un instante (para las miniaturas)
const Clip: React.FC<{src: string; en: number; desde?: number; dur: number; style?: React.CSSProperties}> = ({src, en, desde = 0, dur, style}) => (
  <Sequence from={fr(en)} layout="none">
    <Loop durationInFrames={fr(dur)}>
      <OffthreadVideo src={staticFile(src)} muted trimBefore={fr(desde)} style={{width: '100%', height: '100%', objectFit: 'cover', ...style}} />
    </Loop>
  </Sequence>
);

const Etiqueta: React.FC<{txt: string; color?: string; fondo?: string; style?: React.CSSProperties}> = ({txt, color = '#111', fondo = LIMA, style}) => (
  <span style={{display: 'inline-block', padding: '5px 13px', borderRadius: 8, background: fondo, color, fontWeight: 900, fontSize: 22, letterSpacing: '0.08em', whiteSpace: 'nowrap', ...style}}>{txt}</span>
);

// ---------------- 0:41 · «lo ha hecho clavado»: los 4 fotogramas clave se clavan en su segundo exacto del anuncio ----------------
export const LineaClavado: React.FC<{t: number; a: number; b: number; en: number[]; inicio: number; clavado: number; match: number[]}> = ({t, a, b, en, inicio, clavado, match}) => {
  const X0 = 210, X1 = 1710, YT = 868, HT = 70;
  const N = 12, WF = (X1 - X0) / N;
  const tira = entra(t, inicio, 0.8);
  const BARRIDO = 0.9;
  const cabezal = lim((t - clavado) / BARRIDO);
  const xc = X0 + (X1 - X0) * SUAVE(cabezal);
  const CW = 180, CH = 101, SEP = 14;
  const xcards: number[] = [];
  match.forEach((m, i) => {
    const xp = X0 + ((X1 - X0) * m) / 30;
    xcards.push(Math.min(X1 - CW, Math.max(X0, xp - CW / 2, i ? xcards[i - 1] + CW + SEP : X0)));
  });
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 48%, rgba(0,0,0,0.78) 100%)'}} />
      {/* tira de fotogramas del anuncio (0-30 s) */}
      <div style={{position: 'absolute', left: X0, top: YT, width: (X1 - X0) * tira, height: HT, overflow: 'hidden', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'}}>
        <div style={{display: 'flex', width: X1 - X0}}>
          {Array.from({length: N}, (_, i) => (
            <Img key={i} src={staticFile(`medios/tira/t${String(i).padStart(2, '0')}.jpg`)} style={{width: WF, height: HT, objectFit: 'cover', borderRight: '2px solid #0b0b0e'}} />
          ))}
        </div>
      </div>
      {[0, 10, 20, 30].map((s) => (
        <div key={s} style={{position: 'absolute', left: X0 + ((X1 - X0) * s) / 30 - 40, width: 80, top: YT + HT + 8, textAlign: 'center', fontWeight: 700, fontSize: 24,
          color: 'rgba(255,255,255,0.75)', opacity: tira}}>{s} s</div>
      ))}
      {/* fotogramas clave, cada uno sobre su segundo */}
      {match.map((m, i) => {
        if (t < en[i]) return null;
        const ap = aparece(t, en[i], (i - 1.5) * 3);
        const xp = X0 + ((X1 - X0) * m) / 30;
        const xcard = xcards[i];
        const pasa = clavado + (BARRIDO * m) / 30;
        const ok = t >= pasa;
        const flash = ok ? Math.max(0, 1 - (t - pasa) / 0.35) : 0;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: xp - 1.5, top: YT - 34, width: 3, height: 34 + HT, background: ok ? LIMA : 'rgba(255,255,255,0.7)', opacity: ap.op,
              boxShadow: ok ? `0 0 12px ${LIMA}` : 'none'}} />
            <div style={{position: 'absolute', left: xcard, top: YT - 34 - CH, width: CW, height: CH, borderRadius: 12, overflow: 'hidden', transformOrigin: '50% 100%',
              scale: `${ap.sx * (1 + 0.06 * flash)} ${ap.sy * (1 + 0.06 * flash)}`, opacity: ap.op,
              border: `3px solid ${ok ? LIMA : 'rgba(255,255,255,0.85)'}`, boxShadow: ok ? `0 0 ${18 + 30 * flash}px rgba(209,254,23,${0.45 + 0.4 * flash})` : '0 10px 26px rgba(0,0,0,0.6)'}}>
              <Img src={staticFile(KF[i])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              <div style={{position: 'absolute', left: 8, bottom: 7, padding: '2px 9px', borderRadius: 6, background: ok ? LIMA : 'rgba(10,10,12,0.85)', color: ok ? '#111' : '#fff',
                fontWeight: 900, fontSize: 19, fontVariantNumeric: 'tabular-nums'}}>{reloj(m)}</div>
            </div>
          </React.Fragment>
        );
      })}
      {/* cabezal que recorre los 30 s */}
      {t >= clavado && (
        <div style={{position: 'absolute', left: xc - 2, top: YT - 12, width: 4, height: HT + 24, borderRadius: 2, background: '#fff', opacity: 1 - lim((t - clavado - BARRIDO) / 0.4),
          boxShadow: '0 0 14px #fff, 0 0 30px rgba(209,254,23,0.8)'}} />
      )}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {match.map((m, i) => <Pulso key={i} t={t} en={clavado + (BARRIDO * m) / 30} x={X0 + ((X1 - X0) * m) / 30} y={YT + HT / 2} r={36} color={LIMA} />)}
      </svg>
    </Ventana>
  );
};

// ---------------- el plan en 3 pasos, con los recursos de cada paso ----------------
const MediaPaso: React.FC<{t: number; tipo: string; en: number}> = ({t, tipo, en}) => {
  if (tipo === 'frames') {
    const i = Math.floor(Math.max(0, t - en) / 0.75) % 4;
    return (
      <>
        {KF.map((k, j) => <Img key={j} src={staticFile(k)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: j === i ? 1 : 0}} />)}
        <div style={{position: 'absolute', right: 8, bottom: 6, display: 'flex', gap: 5}}>
          {KF.map((_, j) => <div key={j} style={{width: 9, height: 9, borderRadius: 5, background: j === i ? LIMA : 'rgba(255,255,255,0.5)'}} />)}
        </div>
      </>
    );
  }
  if (tipo === 'references') {
    const p = entra(t, en + 1.4, 0.5);
    return (
      <>
        <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, opacity: 1 - p}}>
          {FOTOS.map((f, j) => <Img key={j} src={staticFile(f)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%'}} />)}
        </div>
        {t >= en + 1.2 && <div style={{position: 'absolute', inset: 0, opacity: p}}><Clip src="medios/r3.mp4" en={en + 1.2} desde={2} dur={9} /></div>}
      </>
    );
  }
  // edit: el mismo plano con el fondo cambiado; la cortinilla va y viene
  const k = 0.5 + 0.45 * Math.sin((t - en) * 1.6 - Math.PI / 2);
  return (
    <>
      <div style={{position: 'absolute', inset: 0}}><Clip src="medios/r3.mp4" en={en} desde={3} dur={8} /></div>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${k * 100}%)`}}><Clip src="medios/r4.mp4" en={en} desde={3} dur={8} /></div>
      <div style={{position: 'absolute', top: 0, bottom: 0, left: `${k * 100}%`, width: 3, marginLeft: -1.5, background: '#fff', boxShadow: '0 0 10px #fff'}} />
    </>
  );
};
export const Plan3: React.FC<{t: number; a: number; b: number; tituloEn: number; items: [string, string, number, string][]}> = ({t, a, b, tituloEn, items}) => {
  let activo = -1;
  items.forEach(([, , en], i) => { if (t >= en) activo = i; });
  const X = 100, Y0 = 250, PASO = 205, MW = 280, MH = 158;
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 36% 70% at 16% 52%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 100%)'}} />
      <div style={{position: 'absolute', left: X, top: Y0 - 78, fontWeight: 800, fontSize: 32, letterSpacing: '0.18em', color: C.amarillo, textShadow: glow(GLOW_AMARILLO, 0.6)}}>
        <Sube t={t} en={tituloEn}>EL PLAN · 3 PASOS</Sube>
      </div>
      {items.map(([txt, sub, en, tipo], i) => {
        if (t < en) return null;
        const ap = aparece(t, en, -5);
        const on = i === activo;
        const fl = flota(t, i * 1.4, 3);
        return (
          <div key={i} style={{position: 'absolute', left: X, top: Y0 + i * PASO + fl.y, display: 'flex', alignItems: 'center', gap: 22, opacity: ap.op * (on ? 1 : 0.6),
            scale: `${ap.sx * (on ? 1 : 0.94)} ${ap.sy * (on ? 1 : 0.94)}`, transformOrigin: '0% 50%', filter: SOMBRA}}>
            <div style={{position: 'relative', width: MW, height: MH, borderRadius: 16, overflow: 'hidden', border: `3px solid ${on ? LIMA : 'rgba(255,255,255,0.6)'}`,
              boxShadow: on ? '0 0 26px rgba(209,254,23,0.45)' : 'none', background: '#000'}}>
              <MediaPaso t={t} tipo={tipo} en={en} />
              <div style={{position: 'absolute', left: 10, top: 9, width: 40, height: 40, borderRadius: 20, background: on ? LIMA : 'rgba(10,10,12,0.85)', color: on ? '#111' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24}}>{i + 1}</div>
            </div>
            <div style={{width: 260}}>
              <div style={{fontWeight: 900, fontSize: 44, lineHeight: 1.0, color: on ? C.amarillo : '#fff', textShadow: on ? glow(GLOW_AMARILLO, 0.5) : glow('255,255,255', 0.3), whiteSpace: 'nowrap'}}>{txt}</div>
              <div style={{fontWeight: 600, fontSize: 28, lineHeight: 1.2, color: 'rgba(255,255,255,0.88)', marginTop: 8}}>{sub}</div>
            </div>
          </div>
        );
      })}
    </Ventana>
  );
};

// ---------------- «lo que planeé y lo que salió»: el fotograma clave 3 y su momento del anuncio ----------------
export const Planeado2: React.FC<{t: number; a: number; b: number; en1: number; en2: number}> = ({t, a, b, en1, en2}) => {
  const W = 430, Hh = 243, X = 1380;
  const tarjeta = (en: number, y: number, src: string, txt: string, color: string, giro: number) => {
    if (t < en) return null;
    const ap = aparece(t, en, giro);
    const fl = flota(t, y / 100, 4);
    return (
      <div style={{position: 'absolute', left: X, top: y + fl.y, width: W, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, filter: SOMBRA}}>
        <div style={{fontWeight: 900, fontSize: 34, color, textShadow: glow(color === '#fff' ? '255,255,255' : GLOW_AMARILLO, 0.5), marginBottom: 10}}>{txt}</div>
        <div style={{width: W, height: Hh, borderRadius: 16, overflow: 'hidden', border: `3px solid ${color === '#fff' ? 'rgba(255,255,255,0.85)' : C.amarillo}`}}>
          <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      </div>
    );
  };
  const p = entra(t, en2 - 0.25, 0.35);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 30% 60% at 84% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)'}} />
      {tarjeta(en1, 170, KF[2], 'LO QUE PLANEÉ', '#fff', -4)}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line x1={X + W / 2} y1={478} x2={X + W / 2} y2={478 + 44 * p} stroke={C.amarillo} strokeWidth={7} strokeLinecap="round" />
        {p >= 1 && <path d={puntaFlecha(X + W / 2, 522, Math.PI / 2, 22, 16)} fill="none" stroke={C.amarillo} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {tarjeta(en2, 560, MF[2], 'LO QUE SALIÓ', C.amarillo, 4)}
    </Ventana>
  );
};

// ---------------- mis 4 fotogramas clave: escena propia, como un storyboard ----------------
export const Storyboard: React.FC<{t: number; a: number; b: number; titulo: number; sub: number; en: number[]; ia: number; linea: number; orden: number; tiempo: number; textos: string[]}> = ({
  t, a, b, titulo, sub, en, ia, linea, orden, tiempo, textos,
}) => {
  if (t < a || t >= b) return null;
  // ranuras de la fila de abajo y héroe arriba
  const SW = 340, SH = 192, GAP = 30, SX0 = (1920 - (4 * SW + 3 * GAP)) / 2;
  const subir = SUAVE(lim((t - (ia - 0.3)) / 0.9));
  const SY = 742 + (430 - 742) * subir;
  const HW = 853, HH = 480, HX = (1920 - HW) / 2, HY = 150;
  // en la línea de tiempo: cada fotograma en su tramo del prompt (0-7, 7-14, 14-22, 22-30)
  const X0 = 200, X1 = 1720, TRAMOS = [[0, 7], [7, 14], [14, 22], [22, 30]], LW = 300, LH = 169, LY = 640;
  const xs = (s: number) => X0 + ((X1 - X0) * s) / 30;
  const enLinea = SUAVE(lim((t - linea) / 1.0));
  const actual = en.reduce((k, e, i) => (t >= e ? i : k), -1);
  const titulo2 = entra(t, en[0] - 0.4, 0.6);
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      {/* rejilla fina de storyboard y luz cálida */}
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '60px 60px', opacity: 0.8}} />
      <AbsoluteFill style={{background: `radial-gradient(circle at ${50 + 18 * Math.sin(t * 0.3)}% 40%, rgba(255,170,60,0.10), transparent 45%)`}} />
      {/* título: grande al principio, luego arriba a la izquierda */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 380 - 310 * titulo2, textAlign: 'center', transformOrigin: '50% 0%', scale: 1 - 0.45 * titulo2}}>
        <div style={{...H, fontSize: 104, ...golpe(t, titulo)}}>MIS <span style={amarillo}>4</span> FOTOGRAMAS CLAVE</div>
        <div style={{fontWeight: 700, fontSize: 44, marginTop: 10, color: 'rgba(255,255,255,0.9)', opacity: 1 - titulo2}}>
          <Sube t={t} en={sub}>los momentos que el anuncio tiene que tocar sí o sí</Sube>
        </div>
      </div>
      {/* ranuras vacías */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{position: 'absolute', left: SX0 + i * (SW + GAP), top: SY, width: SW, height: SH, borderRadius: 14, border: '2px dashed rgba(255,255,255,0.25)',
          opacity: entra(t, sub, 0.5) * (1 - subir), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 60, color: 'rgba(255,255,255,0.15)'}}>{i + 1}</div>
      ))}
      {/* cada fotograma: entra en grande arriba (giro 3D), y al nombrar el siguiente baja a su ranura; al final, a su tramo de la línea */}
      {en.map((e, i) => {
        if (t < e) return null;
        const vuelta = SUAVE(lim((t - e) / 0.7));
        const baja = SUAVE(lim((t - (i + 1 < en.length ? en[i + 1] - 0.15 : ia - 0.6)) / 0.7));
        const sx = SX0 + i * (SW + GAP), sy = SY;
        const lx = (xs(TRAMOS[i][0]) + xs(TRAMOS[i][1])) / 2 - LW / 2;
        let x = HX + (sx - HX) * baja, y = HY + (sy - HY) * baja, w = HW + (SW - HW) * baja, h = HH + (SH - HH) * baja;
        x = x + (lx - x) * enLinea; y = y + (LY - y) * enLinea; w = w + (LW - w) * enLinea; h = h + (LH - h) * enLinea;
        const barrido = lim((t - e - 0.35) / 0.8);
        const on = i === actual && baja < 0.5;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: w, height: h, perspective: 1400}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', transform: `rotateY(${(1 - vuelta) * 80}deg)`, opacity: lim((t - e) / 0.12),
              border: `${on ? 4 : 3}px solid ${on ? LIMA : 'rgba(255,255,255,0.85)'}`, boxShadow: on ? '0 0 40px rgba(209,254,23,0.35), 0 26px 60px rgba(0,0,0,0.7)' : '0 16px 40px rgba(0,0,0,0.6)'}}>
              <Img src={staticFile(KF[i])} style={{width: '100%', height: '100%', objectFit: 'cover', scale: 1.04 - 0.04 * lim((t - e) / 6)}} />
              {barrido > 0 && barrido < 1 && (
                <div style={{position: 'absolute', top: 0, bottom: 0, left: `${-30 + 140 * barrido}%`, width: '22%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', transform: 'skewX(-18deg)'}} />
              )}
              <div style={{position: 'absolute', left: 12, top: 10, width: 44 + 16 * (1 - baja), height: 44 + 16 * (1 - baja), borderRadius: 40, background: LIMA, color: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 26 + 12 * (1 - baja)}}>{i + 1}</div>
              {t >= ia && (
                <div style={{position: 'absolute', right: 10, top: 10, opacity: entra(t, ia + i * 0.12, 0.35)}}><Etiqueta txt="IA" fondo="rgba(10,10,12,0.85)" color="#fff" style={{fontSize: 18}} /></div>
              )}
            </div>
            {/* pie: qué pasa en ese momento (en grande mientras lo nombra) */}
            <div style={{position: 'absolute', left: 0, right: 0, top: h + 14, textAlign: 'center', fontWeight: 800, fontSize: 40 - 14 * Math.max(baja, enLinea),
              textShadow: '0 2px 12px rgba(0,0,0,0.9)', opacity: lim((t - e - 0.3) / 0.3) * (1 - enLinea)}}>{textos[i]}</div>
          </div>
        );
      })}
      {/* línea de 30 s con los tramos del prompt */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: enLinea}}>
        <line x1={X0} y1={LY + LH + 40} x2={X0 + (X1 - X0) * enLinea} y2={LY + LH + 40} stroke="rgba(255,255,255,0.85)" strokeWidth={5} strokeLinecap="round" />
        {[0, 7, 14, 22, 30].map((s) => (
          <g key={s}><line x1={xs(s)} y1={LY + LH + 28} x2={xs(s)} y2={LY + LH + 52} stroke="#fff" strokeWidth={4} />
            <text x={xs(s)} y={LY + LH + 92} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontWeight={700} fontSize={30} fontFamily="Montserrat">{s} s</text></g>
        ))}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: enLinea}}>
        <div style={{...H, fontSize: 78, lineHeight: 1.1}}>
          <span style={{display: 'inline-block', ...golpe(t, linea + 0.3)}}>¿LLEGA A CADA MOMENTO,</span><br />
          <span style={{display: 'inline-block', ...golpe(t, orden)}}>EN <span style={amarillo}>ORDEN</span></span>{' '}
          <span style={{display: 'inline-block', ...golpe(t, tiempo)}}>Y <span style={amarillo}>A TIEMPO?</span></span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- prompt traducido entero (lo que va leyendo, resaltado) ----------------
export const PromptCard: React.FC<{t: number; a: number; b: number; etiqueta: string; partes: [string, number][]; fin: number}> = ({t, a, b, etiqueta, partes, fin}) => {
  let activo = -1;
  partes.forEach(([, en], i) => { if (t >= en) activo = i; });
  if (t >= fin) activo = -1;
  const largo = partes.reduce((n, [p]) => n + p.length, 0);
  const fs = largo > 500 ? 29 : largo > 300 ? 32 : 36;
  const ap = aparece(t, a, 3);
  return (
    <Ventana t={t} a={a} b={b} suave>
      <div style={{position: 'absolute', left: 1060, top: 150, width: 760, padding: '26px 30px 30px', borderRadius: 26, background: 'rgba(12,12,16,0.94)', border: '2px solid rgba(255,255,255,0.14)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.7)', scale: `${ap.sx} ${ap.sy}`, transformOrigin: '100% 0%'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18}}>
          <Etiqueta txt={etiqueta} />
          <span style={{fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em'}}>TRADUCIDO AL ESPAÑOL</span>
        </div>
        {partes.map(([p, en], i) => {
          const on = i === activo;
          return (
            <div key={i} style={{display: 'flex', gap: 14, marginTop: i ? 12 : 0}}>
              <div style={{flex: 'none', width: 5, borderRadius: 3, background: on ? LIMA : 'transparent', boxShadow: on ? `0 0 10px ${LIMA}` : 'none'}} />
              <div style={{fontWeight: on ? 700 : 600, fontSize: fs, lineHeight: 1.32, color: activo < 0 || on ? '#fff' : 'rgba(255,255,255,0.5)'}}>{p}</div>
            </div>
          );
        })}
      </div>
    </Ventana>
  );
};

// ---------------- «lo que más cuesta dinero»: escena propia a pantalla completa ----------------
export const Valioso2: React.FC<{t: number; a: number; b: number; enTitulo: number; enProd: number; enModelo: number; enAnuncio: number; enValioso: number; listo: number}> = ({
  t, a, b, enTitulo, enProd, enModelo, enAnuncio, enValioso, listo,
}) => {
  if (t < a || t >= b) return null;
  const tile = (en: number, x: number, w: number, h: number, hijo: React.ReactNode, txt: string) => {
    if (t < en) return null;
    const ap = aparece(t, en, 0);
    const fl = flota(t, x / 200, 4);
    return (
      <div style={{position: 'absolute', left: x, top: 560 - h / 2 + fl.y, width: w, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, filter: SOMBRA}}>
        <div style={{position: 'relative', width: w, height: h, borderRadius: 22, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.85)'}}>{hijo}</div>
        <div style={{marginTop: 14, textAlign: 'center', fontWeight: 800, fontSize: 32, textShadow: '0 2px 10px rgba(0,0,0,0.9)'}}>{txt}</div>
      </div>
    );
  };
  const signo = (en: number, x: number, s: string) => (t < en ? null : <div style={{position: 'absolute', left: x - 40, width: 80, top: 500, textAlign: 'center', ...H, fontSize: 96, ...amarillo, ...golpe(t, en)}}>{s}</div>);
  const gen = t < listo;
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 55% 45% at 50% 55%, rgba(209,254,23,0.06), transparent 70%)`}} />
      {/* las dos generaciones siguen en marcha */}
      <div style={{position: 'absolute', right: 100, top: 70, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px 10px 14px', borderRadius: 999, background: PANEL,
        border: `2px solid ${LIMA}`, opacity: entra(t, a + 0.2, 0.4)}}>
        <svg width={36} height={36} viewBox="-18 -18 36 36">
          <circle r={13} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
          {gen ? <circle r={13} fill="none" stroke={LIMA} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${0.3 + 0.25 * Math.sin(t * 3)} 1`} transform={`rotate(${t * 300})`} />
            : <circle r={13} fill={LIMA} />}
          {!gen && <path d="M -6 0 L -2 5 L 7 -5" fill="none" stroke="#111" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <span style={{fontWeight: 800, fontSize: 28, letterSpacing: '0.06em'}}>{gen ? `GENERANDO${'...'.slice(0, 1 + (Math.floor(t * 3) % 3))}` : 'LISTO'}</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center'}}>
        <div style={{...H, fontSize: 74, ...golpe(t, enTitulo)}}>LO QUE MÁS <span style={amarillo}>CUESTA DINERO</span></div>
      </div>
      {tile(enProd, 140, 340, 340, <Img src={staticFile(FOTOS[3])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />, 'foto del producto')}
      {signo(enModelo, 552, '+')}
      {tile(enModelo, 625, 260, 346, <Img src={staticFile(FOTOS[2])} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%'}} />, 'foto de un modelo')}
      {signo(enAnuncio, 960, '=')}
      {tile(enAnuncio, 1040, 740, 416, <Clip src="medios/r3.mp4" en={enAnuncio} desde={1} dur={12} />, 'un anuncio con su producto')}
      <div style={{position: 'absolute', left: 0, right: 0, top: 860, textAlign: 'center', ...H, fontSize: 96, ...golpe(t, enValioso)}}>
        LO MÁS <span style={amarillo}>VALIOSO</span>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Particulas t={t} en={enValioso + 2 * F} x={960} y={910} n={16} radio={520} colores={[C.amarillo, '#fff']} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------- A2: lo planeado vs lo generado, con su cara; el vídeo se congela en el fotograma que coincide ----------------
export const ComparaA2v2: React.FC<{t: number; a: number; b: number; en: number[]; clavado: number[]; match: number[]; ia: number; iaFin: number}> = ({t, a, b, en, clavado, match, ia, iaFin}) => {
  if (t < a || t >= b) return null;
  let i = 0;
  en.forEach((e, k) => { if (t >= e) i = k; });
  const entradas = en.map((e, k) => (k === 0 ? Math.min(e, a + 0.35) : e)); // el primero ya está al empezar la escena
  const X = 560, Y = 210, W = 1260, Hh = (W * 9) / 16;
  const c = clavado[i], m = match[i];
  const lead = Math.min(2.2, Math.max(0, c - en[i] - 0.4), m);  // el vídeo corre hasta llegar justo al fotograma
  const juega = t >= c - lead && t < c;
  const congelado = t >= c;
  const desde = Math.max(0, m - lead);
  // cortinilla foto | vídeo: entra al clavarlo y va y viene despacio
  const k0 = SUAVE(lim((t - c) / 0.9));
  const k = congelado ? 1 - k0 + k0 * (0.5 + 0.38 * Math.sin((t - c - 0.9) * 0.9)) : 1;
  const camIn = entra(t, a, 0.6);
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: X, width: W, top: 70, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
        <div style={{...H, fontSize: 56}}>LO QUE PLANEÉ <span style={{opacity: 0.45}}>vs</span> LO QUE <span style={amarillo}>SALIÓ</span></div>
        <div style={{display: 'flex', gap: 10}}>
          {en.map((e, j) => <div key={j} style={{width: j === i ? 46 : 16, height: 16, borderRadius: 8, background: j < i || (j === i && congelado) ? LIMA : j === i ? '#fff' : 'rgba(255,255,255,0.25)'}} />)}
        </div>
      </div>
      {/* su cámara, en vivo */}
      <CamVivo t={t} x={100} y={210 + 30 * (1 - camIn)} w={410} style={{opacity: camIn, border: '3px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)'}} />
      {/* escenario de la comparativa */}
      <div key={i} style={{position: 'absolute', left: X, top: Y, width: W, height: Hh, borderRadius: 22, overflow: 'hidden', border: `3px solid ${congelado ? LIMA : 'rgba(255,255,255,0.85)'}`,
        boxShadow: congelado ? '0 0 40px rgba(209,254,23,0.3), 0 24px 70px rgba(0,0,0,0.7)' : '0 24px 70px rgba(0,0,0,0.7)', opacity: entra(t, entradas[i], 0.3)}}>
        {/* debajo, el anuncio: corre hasta el fotograma que coincide y se queda ahí */}
        {juega && (
          <Sequence from={fr(c - lead)} durationInFrames={Math.max(1, fr(c) - fr(c - lead))} layout="none">
            <OffthreadVideo src={staticFile('medios/r2.mp4')} muted trimBefore={Math.round(desde * 30)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
          </Sequence>
        )}
        {congelado && <Img src={staticFile(MF[i])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />}
        {/* encima, la foto planeada (a la izquierda de la cortinilla) */}
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`, opacity: juega ? 1 - lim((t - (c - lead)) / 0.3) : 1}}>
          <Img src={staticFile(KF[i])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
        {congelado && (
          <>
            <div style={{position: 'absolute', top: 0, bottom: 0, left: `${k * 100}%`, width: 4, marginLeft: -2, background: '#fff', boxShadow: '0 0 16px #fff'}} />
            <div style={{position: 'absolute', top: '50%', left: `${k * 100}%`, width: 56, height: 56, margin: '-28px 0 0 -28px', borderRadius: 28, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.5)'}}>
              <svg width={34} height={20} viewBox="0 0 34 20"><path d="M 11 3 L 3 10 L 11 17 M 23 3 L 31 10 L 23 17" fill="none" stroke="#141418" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </>
        )}
        <div style={{position: 'absolute', left: 18, top: 16}}><Etiqueta txt={`FOTOGRAMA CLAVE ${i + 1}`} fondo="rgba(10,10,12,0.85)" color="#fff" /></div>
        <div style={{position: 'absolute', right: 18, top: 16, opacity: juega || congelado ? 1 : 0}}>
          <Etiqueta txt={congelado ? `ANUNCIO · ${reloj(m)}` : 'ANUNCIO'} />
        </div>
      </div>
      {/* pie: dónde cae en los 30 s */}
      <div style={{position: 'absolute', left: X, width: W, top: Y + Hh + 26, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.16)'}}>
        {match.map((mm, j) => (
          <div key={j} style={{position: 'absolute', left: `${(mm / 30) * 100}%`, top: -7, width: 22, height: 22, marginLeft: -11, borderRadius: 11,
            background: j < i || (j === i && congelado) ? LIMA : j === i ? '#fff' : 'rgba(255,255,255,0.35)', boxShadow: j === i && congelado ? `0 0 14px ${LIMA}` : 'none'}} />
        ))}
      </div>
      {t >= ia && t < iaFin && (
        <div style={{position: 'absolute', left: 100, right: 100, top: 972, display: 'flex', justifyContent: 'center', opacity: iv(t, [ia, ia + 0.3, iaFin - 0.3, iaFin], [0, 1, 1, 0])}}>
          <div style={{padding: '12px 28px', borderRadius: 999, background: PANEL, border: '2px solid rgba(255,255,255,0.18)', fontWeight: 700, fontSize: 31, whiteSpace: 'nowrap'}}>
            Generé las fotos con IA: con fotos reales del producto, el vídeo mejoraría
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------- B: las 4 fotos → Kling 4.0 → el anuncio, todo centrado ----------------
export const ComparaB2: React.FC<{t: number; a: number; b: number; en: number; clavado: number; producto: number; creado: number}> = ({t, a, b, en, clavado, producto, creado}) => {
  if (t < a || t >= b) return null;
  const CY = 590;
  const FW = 200, GAP = 18, GX = 440 - FW - GAP / 2, GY = CY - FW - GAP / 2;  // grupo de fotos centrado en x 440
  const NX = 960, NR = 86;
  const PW = 600, PH = 338, PX = 1480 - PW / 2, PY = CY - PH / 2;
  const salida = [NX + NR, CY], llegada = [PX, CY];
  const fotos = FOTOS.map((f, k) => ({f, x: GX + (k % 2) * (FW + GAP), y: GY + Math.floor(k / 2) * (FW + GAP)}));
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center', ...H, fontSize: 70, ...golpe(t, a + 0.15)}}>
        CON ESTAS <span style={amarillo}>4 FOTOS</span>
      </div>
      <div style={{position: 'absolute', left: 440 - 300, width: 600, top: GY - 70, textAlign: 'center', fontWeight: 800, fontSize: 32, letterSpacing: '0.14em', opacity: entra(t, en, 0.4)}}>LO QUE LE DI</div>
      <div style={{position: 'absolute', left: 1480 - 300, width: 600, top: GY - 70, textAlign: 'center', fontWeight: 800, fontSize: 32, letterSpacing: '0.14em', color: C.amarillo,
        textShadow: glow(GLOW_AMARILLO, 0.5), opacity: entra(t, creado, 0.4)}}>LO QUE SALIÓ</div>
      {fotos.map(({f, x, y}, k) => {
        const e = en + k * 0.12;
        if (t < e) return null;
        const ap = aparece(t, e, (k - 1.5) * 4);
        const on = k === 3 && t >= producto;
        return (
          <div key={k} style={{position: 'absolute', left: x, top: y, width: FW, height: FW, borderRadius: 18, overflow: 'hidden', scale: `${ap.sx * (on ? 1.06 : 1)} ${ap.sy * (on ? 1.06 : 1)}`,
            opacity: ap.op, border: `3px solid ${on ? LIMA : 'rgba(255,255,255,0.85)'}`, boxShadow: on ? '0 0 30px rgba(209,254,23,0.55)' : '0 14px 40px rgba(0,0,0,0.6)'}}>
            <Img src={staticFile(f)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%'}} />
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {/* de cada foto al nodo */}
        {fotos.map(({x, y}, k) => {
          const x0 = x + FW, y0 = y + FW / 2;
          const d = `M ${x0} ${y0} C ${x0 + 120} ${y0}, ${NX - NR - 120} ${CY}, ${NX - NR} ${CY}`;
          return <Conector key={k} t={t} en={clavado + k * 0.1} d={d} color={k === 3 && t >= producto ? LIMA : 'rgba(255,255,255,0.75)'} grosor={4} flujo />;
        })}
        {/* del nodo al anuncio, recto y en el centro del hueco */}
        <Conector t={t} en={creado} d={`M ${salida[0]} ${CY} L ${llegada[0] - 6} ${CY}`} color={LIMA} grosor={6} flujo punta={[llegada[0] - 6, CY, 0]} />
        <Pulso t={t} en={clavado + 0.5} x={NX} y={CY} r={NR} color={LIMA} />
        <Particulas t={t} en={creado + 0.45} x={1480} y={CY} n={14} radio={380} colores={[LIMA, '#fff']} />
      </svg>
      {/* nodo Kling 4.0 */}
      {t >= en + 0.3 && (() => {
        const ap = aparece(t, en + 0.3, 0);
        return (
          <div style={{position: 'absolute', left: NX - NR, top: CY - NR, width: 2 * NR, height: 2 * NR, borderRadius: NR, background: '#121216', border: `4px solid ${LIMA}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${ap.sx} ${ap.sy}`, opacity: ap.op,
            boxShadow: `0 0 ${30 + 20 * Math.sin(t * 3)}px rgba(209,254,23,0.4)`}}>
            <IconoHiggsfield w={92} />
          </div>
        );
      })()}
      <div style={{position: 'absolute', left: NX - 160, width: 320, top: CY + NR + 18, textAlign: 'center', fontWeight: 800, fontSize: 28, opacity: entra(t, en + 0.4, 0.4)}}>
        Kling 4.0 · References
      </div>
      {t >= creado && (
        <div style={{position: 'absolute', left: PX, top: PY, width: PW, height: PH, borderRadius: 20, overflow: 'hidden', border: `3px solid ${C.amarillo}`,
          boxShadow: '0 0 30px rgba(254,255,188,0.25), 0 20px 60px rgba(0,0,0,0.6)', scale: aparece(t, creado + 0.35, 0).sx, opacity: aparece(t, creado + 0.35, 0).op}}>
          <Clip src="medios/r3.mp4" en={creado} dur={15} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------- el servicio: repaso de lo que ha hecho, paso a paso, con ejemplos de Higgsfield debajo ----------------
export const Recap: React.FC<{t: number; a: number; b: number; enTitulo: number; en: number[]; editas: number; ejemplos: number}> = ({t, a, b, enTitulo, en, editas, ejemplos}) => {
  if (t < a || t >= b) return null;
  const CW = 380, CH = 214, GAP = 65, X0 = (1920 - (4 * CW + 3 * GAP)) / 2, Y = 300;
  const pasos: [string, string, React.ReactNode][] = [
    ['TE PASA SU PRODUCTO', 'una foto, y ya está', <Img key="p" src={staticFile(FOTOS[3])} style={{width: '100%', height: '100%', objectFit: 'cover'}} />],
    ['FRAMES', 'le planificas el anuncio', <MediaPaso key="f" t={t} tipo="frames" en={en[1]} />],
    ['REFERENCES', 'metes a su modelo', <MediaPaso key="r" t={t} tipo="references" en={en[2]} />],
    ['EDIT VIDEO', 'cambios sin repetir nada', <MediaPaso key="e" t={t} tipo="edit" en={en[3]} />],
  ];
  const activo = en.reduce((k, e, i) => (t >= e ? i : k), -1);
  return (
    <AbsoluteFill>
      <Fondo t={t} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', ...H, fontSize: 84, ...golpe(t, enTitulo)}}>
        ESTO ES <span style={amarillo}>EL SERVICIO</span>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {[1, 2, 3].map((k) => {
          const x0 = X0 + k * (CW + GAP) - GAP + 8, x1 = X0 + k * (CW + GAP) - 10;
          return <Conector key={k} t={t} en={en[k] - 0.25} d={`M ${x0} ${Y + CH / 2} L ${x1} ${Y + CH / 2}`} color={LIMA} grosor={5} flujo punta={[x1, Y + CH / 2, 0]} dur={0.3} />;
        })}
      </svg>
      {pasos.map(([tit, sub, media], k) => {
        if (t < en[k]) return null;
        const ap = aparece(t, en[k], (k - 1.5) * 3);
        const on = k === activo || (k === 3 && t >= editas);
        return (
          <div key={k} style={{position: 'absolute', left: X0 + k * (CW + GAP), top: Y, width: CW, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op, transformOrigin: '50% 30%'}}>
            <div style={{position: 'relative', width: CW, height: CH, borderRadius: 18, overflow: 'hidden', background: '#000', border: `3px solid ${on ? LIMA : 'rgba(255,255,255,0.75)'}`,
              boxShadow: on ? '0 0 34px rgba(209,254,23,0.4)' : '0 16px 40px rgba(0,0,0,0.6)'}}>
              {media}
              <div style={{position: 'absolute', left: 10, top: 9, width: 40, height: 40, borderRadius: 20, background: LIMA, color: '#111', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 900, fontSize: 24}}>{k + 1}</div>
            </div>
            <div style={{marginTop: 16, textAlign: 'center', fontWeight: 900, fontSize: 34, color: on ? C.amarillo : '#fff', textShadow: on ? glow(GLOW_AMARILLO, 0.5) : 'none'}}>{tit}</div>
            <div style={{textAlign: 'center', fontWeight: 600, fontSize: 28, color: 'rgba(255,255,255,0.85)', marginTop: 4}}>{sub}</div>
          </div>
        );
      })}
      {/* ejemplos de Higgsfield (MediaKit, anuncios de producto) */}
      {t >= ejemplos && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 760, opacity: entra(t, ejemplos, 0.6)}}>
          <div style={{textAlign: 'center', marginBottom: 16}}><Etiqueta txt="EJEMPLOS DE HIGGSFIELD" /></div>
          <div style={{display: 'flex', justifyContent: 'center', gap: 24}}>
            {['pack_01_ledmask', 'pack_10_projector', 'pack_07_earbuds'].map((n, k) => (
              <div key={n} style={{position: 'relative', width: 300, height: 169, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)', opacity: 0.92}}>
                <Clip src={`medios/mk/${n}.mp4`} en={ejemplos} desde={k * 3} dur={9} />
              </div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------- outro ----------------
// «tienes los tres modos en un mismo sitio»: tres tarjetas con su resultado que se juntan en una sola, la de Higgsfield
export const TresModos: React.FC<{t: number; a: number; b: number; en: number; sitio: number}> = ({t, a, b, en, sitio}) => {
  const modos: [string, string, number][] = [['FRAMES', 'medios/r2.mp4', 8], ['REFERENCES', 'medios/r3.mp4', 3], ['EDIT VIDEO', 'medios/r4.mp4', 3]];
  const junta = SUAVE(lim((t - sitio) / 0.6));
  const W = 400, Hh = 225, X = 1360, Y = 300;
  return (
    <Ventana t={t} a={a} b={b} suave>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 30% 55% at 82% 45%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)'}} />
      {modos.map(([n, src, d], k) => {
        const e = en - 0.35 + k * 0.18;
        if (t < e) return null;
        const ap = aparece(t, e, (k - 1) * 8);
        const abanico = (k - 1) * (1 - junta);
        return (
          <div key={k} style={{position: 'absolute', left: X - 40 + abanico * 40, top: Y + abanico * 150 + 30, width: W, height: Hh, borderRadius: 18, overflow: 'hidden',
            rotate: `${abanico * 7}deg`, scale: `${ap.sx} ${ap.sy}`, opacity: ap.op * (k === 1 ? 1 : 1 - 0.85 * junta), border: '3px solid rgba(255,255,255,0.85)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.6)', zIndex: k === 1 ? 2 : 1}}>
            <Clip src={src} en={e} desde={d} dur={6} />
            <div style={{position: 'absolute', left: 10, bottom: 9}}><Etiqueta txt={n} /></div>
          </div>
        );
      })}
      {t >= sitio && (
        <div style={{position: 'absolute', left: X - 40, top: Y + 30 + Hh + 24, width: W, display: 'flex', justifyContent: 'center', ...golpe(t, sitio + 0.2)}}>
          <LogoHiggsfield w={300} />
        </div>
      )}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Particulas t={t} en={sitio + 0.5} x={X - 40 + W / 2} y={Y + 30 + Hh / 2} n={14} radio={300} colores={[LIMA, '#fff']} />
      </svg>
    </Ventana>
  );
};

// «abre Kling 4.0 en Higgsfield»: el rótulo de Kling cae y debajo se dibuja el logo de Higgsfield con un barrido de luz
export const AbreKling: React.FC<{t: number; a: number; b: number; enAbre: number; enKling: number; enHiggs: number}> = ({t, a, b, enAbre, enKling, enHiggs}) => {
  if (t < a || t >= b + 8 * F) return null;
  const barrido = lim((t - enHiggs - 0.3) / 0.9);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 600, padding: '50px 0', opacity: iv(t, [a, a + 3 * F, b - 4 * F, b], [0, 1, 1, 0]),
      background: 'radial-gradient(ellipse 40% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)'}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.8))'}}>
        <div style={{...H, fontSize: 64}}><Sube t={t} en={enAbre}>abre</Sube></div>
        <div style={{...H, fontSize: 138, lineHeight: 1, ...amarillo, ...golpe(t, enKling)}}>KLING 4.0</div>
        <div style={{position: 'relative', marginTop: 10, overflow: 'hidden', ...golpe(t, enHiggs)}}>
          <LogoHiggsfield w={420} />
          {barrido > 0 && barrido < 1 && (
            <div style={{position: 'absolute', top: 0, bottom: 0, left: `${-30 + 140 * barrido}%`, width: '25%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)', transform: 'skewX(-20deg)'}} />
          )}
        </div>
      </div>
    </div>
  );
};

// CTA en estilo subtítulo (bloques de 2-4 palabras, una línea) con la flecha justo después de «descripción»
export const CtaBloques: React.FC<{t: number; a: number; b: number; bloques: {a: number; b: number; ws: [string, number][]; flecha?: number}[]}> = ({t, a, b, bloques}) => {
  if (t < a || t >= b) return null;
  const bl = bloques.find((x) => t >= x.a && t < x.b);
  return (
    <>
      <div style={{position: 'absolute', left: 260, right: 260, top: 830, height: 220, opacity: iv(t, [a, a + 4 * F, b - 4 * F, b], [0, 1, 1, 0]),
        background: 'radial-gradient(ellipse 50% 46% at 50% 50%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 100%)'}} />
      {bl && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 900, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.28em', fontWeight: 700, fontSize: 60,
          textShadow: `0 2px 10px rgba(0,0,0,0.9), ${glow('255,255,255', 0.45)}`, whiteSpace: 'nowrap'}}>
          {bl.ws.map(([w, en], i) => <Sube key={`${bl.a}-${i}`} t={t} en={en}>{w}</Sube>)}
          {bl.flecha !== undefined && (
            <span style={{display: 'inline-block', marginLeft: 6, fontSize: 64, fontWeight: 900, ...amarillo, opacity: t < bl.flecha ? 0 : 1,
              translate: `0px ${t < bl.flecha ? 0 : Math.sin((t - bl.flecha) * 7) * 6}px`}}>↓</span>
          )}
        </div>
      )}
    </>
  );
};
