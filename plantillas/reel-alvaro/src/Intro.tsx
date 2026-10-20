import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {C, GLOW_AMARILLO, GRADE, glow, lleno, titular} from './estilo';
import {F, Palabras, Sube, ease, golpe, iv, useT, Ventana} from './anim';
import {FondoMG, H, MIN, amarillo, rgb, rosa} from './texto';
import {Escenas} from './Escenas';
import {Tramos} from './Tramos';
import {Sonidos} from './Sonidos';
import {camara} from './camara';

export const FPS = 25;
export const DURACION = 493.08; // vídeo completo con cortes y estructura

const fr = (s: number) => Math.round(s * FPS);

// Tramos con Álvaro a pantalla completa (lo único que se edita); el resto (pantalla + resultados) no se toca
export const CAMARA: [number, number][] = [
  [0, 86.56],
  [88.2, 89.76],
  [184.64, 204.04],
  [429.16, DURACION],
];
const enCamara = (t: number) => CAMARA.some(([a, b]) => t >= a && t < b);

// Clip de vídeo colocado en la línea de tiempo (segundos)
export const Clip: React.FC<{
  src: string;
  en: number;
  dur: number;
  desde?: number;
  style?: React.CSSProperties;
  sonido?: boolean;
}> = ({src, en, dur, desde = 0, style, sonido}) => (
  <Sequence from={fr(en)} durationInFrames={fr(dur)} layout="none">
    <Video src={staticFile(src)} trimBefore={fr(desde)} muted={!sonido} style={{...lleno, ...style}} />
  </Sequence>
);

// Recorte con alfa de Álvaro (para poner cosas detrás de él)
const Recorte: React.FC<{src: string; en: number; dur: number; desde?: number}> = ({src, en, dur, desde = 0}) => (
  <Sequence from={fr(en)} durationInFrames={fr(dur)} layout="none">
    <OffthreadVideo src={staticFile(src)} transparent muted trimBefore={fr(desde)} style={{...lleno, filter: GRADE}} />
  </Sequence>
);

// Beats 1-3: tarjetas de reel (pequeñas a los lados de Álvaro → comparativa grande)
const Tarjeta: React.FC<{
  t: number;
  left: number;
  width: number;
  entra: number;
  pip: {s: number; x: number; y: number};
  src: string;
  desde: number;
}> = ({t, left, width, entra, pip, src, desde}) => {
  const popS = iv(t, [entra, entra + 6 * F], [pip.s * 0.85, pip.s], ease.pop);
  const g = iv(t, [4.96, 4.96 + 9 * F], [0, 1], ease.inOut);
  return (
    <div
      style={{
        position: 'absolute', left, width, top: 170, height: 600, borderRadius: 22, overflow: 'hidden',
        scale: popS + (1 - popS) * g,
        translate: `${pip.x * (1 - g)}px ${(pip.y - 10) * (1 - g)}px`,
        boxShadow: `0 30px 80px rgba(0,0,0,${0.6 * g}), 0 0 ${50 * g}px rgba(255,255,255,${0.08 * g})`,
      }}
    >
      <Clip src={src} en={entra} dur={7.36 - entra} desde={desde} />
      <div style={{position: 'absolute', inset: 0, border: `3px solid ${C.crema}`, borderRadius: 22}} />
    </div>
  );
};

const Etiqueta: React.FC<{t: number; en: number; left: number; children: React.ReactNode}> = ({t, en, left, children}) => {
  const p = iv(t, [en + 0.06, en + 0.06 + 5 * F], [0, 1], ease.sube);
  return (
    <div
      style={{
        position: 'absolute', left, top: 262, width: 430, textAlign: 'center', fontWeight: 800, fontSize: 30,
        letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: glow('255,255,255', 0.8),
        opacity: p, translate: `0px ${(1 - p) * 24}px`,
      }}
    >
      {children}
    </div>
  );
};

// Letras que caen una a una (1 fotograma de separación)
const Letras: React.FC<{t: number; txt: string; en: number; style?: React.CSSProperties}> = ({t, txt, en, style}) => (
  <span style={{display: 'inline-block', whiteSpace: 'nowrap', ...style}}>
    {txt.split('').map((c, i) => {
      const a = en + i * F;
      const p = iv(t, [a, a + 4 * F], [0, 1], ease.sube);
      return (
        <span key={i} style={{display: 'inline-block', opacity: t < a ? 0 : 1, translate: `0px ${(1 - p) * 70}px`, filter: `blur(${(1 - p) * 8}px)`}}>
          {c}
        </span>
      );
    })}
  </span>
);

// Foto de su cara detrás de él, entra con flash
const FotoDetras: React.FC<{t: number; n: number; en: number; x: number; y: number; w: number; r: number}> = ({t, n, en, x, y, w, r}) => {
  const p = iv(t, [en, en + 7 * F], [0, 1], ease.sube);
  const s = iv(t, [15.84, 16.0], [0, 1], ease.entra);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: w * 1.333, borderRadius: 18, overflow: 'hidden',
        border: `3px solid ${C.crema}`, boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 40px rgba(255,255,255,0.12)',
        opacity: t < en ? 0 : 1 - s, rotate: `${r * (0.4 + 0.6 * p)}deg`, scale: 1.2 - 0.2 * p + 0.12 * s,
        translate: `0px ${(1 - p) * 60}px`, filter: `blur(${(1 - p) * 10 + s * 12}px)`,
      }}
    >
      <Img src={staticFile(`img/foto-${n}.png`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </div>
  );
};

export const Intro: React.FC = () => {
  const t = useT();
  const {s: cs, tx, ty} = camara(t);
  const camaraStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: '0 0', scale: cs, translate: `${tx}px ${ty}px`};
  const cam = enCamara(t);

  return (
    <AbsoluteFill style={{background: '#000', fontFamily: 'Montserrat', color: '#fff', overflow: 'hidden'}}>
      {/* Vídeo completo del usuario (cortes y voz intocables). El etalonaje solo en los planos de cámara */}
      <div style={camaraStyle}>
        <Clip src="completo.mp4" en={0} dur={DURACION} sonido style={{filter: cam ? GRADE : 'none'}} />
      </div>
      {cam && <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.38) 100%)'}} />}

      {/* ===== Beats 1-3: reel original | Álvaro IA, sobre el fondo de motion graphics ===== */}
      <Ventana t={t} a={4.96} b={7.36}>
        <FondoMG t={t} a={4.96} id="r3" opacity={iv(t, [4.96, 4.96 + 6 * F], [0, 1])} />
      </Ventana>
      <Ventana t={t} a={0.56} b={7.36}>
        <Tarjeta t={t} left={118} width={845} entra={0.56} pip={{s: 0.509, x: -230, y: -10}} src="reel-original.mp4" desde={0} />
      </Ventana>
      <Ventana t={t} a={3.84} b={7.36}>
        <Tarjeta t={t} left={1003} width={800} entra={3.84} pip={{s: 0.5375, x: 207, y: -10}} src="reel-alvaro.mp4" desde={3.28} />
      </Ventana>
      <Ventana t={t} a={0.56} b={4.96}>
        <Etiqueta t={t} en={0.56} left={95}>Reel original</Etiqueta>
      </Ventana>
      <Ventana t={t} a={3.84} b={4.96}>
        <Etiqueta t={t} en={3.84} left={1395}>
          Álvaro · <span style={{color: C.amarillo, textShadow: glow(GLOW_AMARILLO)}}>IA</span>
        </Etiqueta>
      </Ventana>
      {([['Mismo', 'estilo', 4.96, 5.76], ['Mismo', 'ritmo', 5.76, 6.64], ['Misma', 'edición', 6.64, 7.36]] as [string, string, number, number][]).map(([a1, a2, a, b]) => (
        <Ventana key={a2} t={t} a={a} b={b}>
          <div style={{...titular, top: 815, fontSize: 96, textShadow: glow(), ...golpe(t, a, b === 7.36 ? 7.16 : undefined)}}>
            {a1}&nbsp;<span style={{color: C.amarillo, textShadow: glow(GLOW_AMARILLO)}}>{a2}</span>
          </div>
        </Ventana>
      ))}

      {/* ===== Beat 4: "EL PROTAGONISTA… SOY YO" detrás de Álvaro, con golpe en "YO" ===== */}
      <Ventana t={t} a={8.88} b={10.88}>
        <div
          style={{
            ...titular, ...H, top: 150, fontSize: 150, gap: 40,
            scale: iv(t, [10.08, 10.08 + 4 * F], [1, 0.62], ease.sube),
            translate: `0px ${iv(t, [10.08, 10.08 + 4 * F], [0, -70], ease.sube)}px`,
            opacity: iv(t, [10.08, 10.08 + 4 * F], [1, 0.4]) * iv(t, [10.36, 10.44], [1, 0]),
            filter: `blur(${iv(t, [10.36, 10.44], [0, 10])}px)`,
          }}
        >
          <Letras t={t} txt="El" en={8.88} />
          <Letras t={t} txt="protagonista" en={8.96} />
        </div>
        {/* SOY: aparece en el centro y desaparece justo cuando llega YO */}
        <div style={{...titular, ...H, top: 230, fontSize: 460, ...golpe(t, 10.08, 10.32)}}>Soy</div>
        {/* YO gigante amarillo + ecos de contorno que se expanden */}
        {[0, 2, 4].map((d) => (
          <div
            key={d}
            style={{
              ...titular, top: 210, fontSize: 660, fontWeight: 900, color: 'transparent', WebkitTextStroke: `4px ${C.amarillo}`,
              opacity: t < 10.4 + d * F ? 0 : iv(t, [10.4 + d * F, 10.4 + (d + 10) * F], [0.8, 0]),
              scale: iv(t, [10.4 + d * F, 10.4 + (d + 10) * F], [1, 1.55], ease.sube),
            }}
          >
            YO
          </div>
        ))}
        <div
          style={{
            ...titular, top: 210, fontSize: 660, fontWeight: 900, ...amarillo,
            textShadow: glow(GLOW_AMARILLO, 1.4),
            opacity: t < 10.4 ? 0 : iv(t, [10.72, 10.88], [1, 0]),
            scale: iv(t, [10.4, 10.4 + 5 * F], [1.6, 1], ease.pop) + iv(t, [10.72, 10.88], [0, 0.3]),
            filter: `blur(${iv(t, [10.4, 10.4 + 4 * F], [14, 0]) + iv(t, [10.72, 10.88], [0, 16])}px)`,
          }}
        >
          YO
        </div>
      </Ventana>

      {/* Recorte de Álvaro por encima de los titulares (hasta que entra el b-roll) */}
      <div style={camaraStyle}>
        <Recorte src="alvaro-recorte-b4.webm" en={7.44} dur={3.44} desde={0.24} />
      </div>
      {/* Flash del golpe de "YO" */}
      <AbsoluteFill style={{background: '#fff', opacity: t >= 10.4 && t < 10.4 + 3 * F ? iv(t, [10.4, 10.4 + 3 * F], [0.55, 0]) : 0}} />

      {/* ===== Beat 5 (10,88-12,56): b-roll de un editor → "NINGÚN EDITOR" tachado ===== */}
      <Ventana t={t} a={10.88} b={12.56}>
        <AbsoluteFill style={{scale: iv(t, [10.88, 12.56], [1.1, 1.0])}}>
          <Clip src="broll-editor.mp4" en={10.88} dur={1.68} desde={5} style={{filter: 'brightness(0.8) saturate(0.9)'}} />
        </AbsoluteFill>
        <AbsoluteFill style={{background: 'rgba(0,0,0,0.25)'}} />
        <AbsoluteFill style={{background: '#ff2a45', mixBlendMode: 'multiply', opacity: t < 11.92 ? 0 : iv(t, [11.92, 12.0, 12.4], [0, 0.55, 0.15])}} />
        <Palabras t={t} ws={[['y', 10.88], ['esto', 11.04], ['no', 11.2], ['lo', 11.28], ['ha', 11.44], ['montado', 11.6]]} sale={11.84} style={{top: 490, ...MIN}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', ...H, fontSize: 230, ...rosa, ...golpe(t, 11.92), textShadow: rgb(t, 11.92, 12, glow('255,177,191'))}}>
          Ningún
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 530, textAlign: 'center', ...H, fontSize: 230, ...golpe(t, 12.24), textShadow: rgb(t, 12.24, 12, glow())}}>
          editor
        </div>
      </Ventana>

      {/* ===== Beat 6b (15,04-16,0): "de mi cara" → las 3 fotos detrás de él, sin texto ===== */}
      <Ventana t={t} a={15.04} b={16.0}>
        <FotoDetras t={t} n={1} en={15.04} x={150} y={200} w={400} r={-8} />
        <FotoDetras t={t} n={3} en={15.2} x={1370} y={200} w={400} r={8} />
        <FotoDetras t={t} n={2} en={15.36} x={1000} y={40} w={330} r={4} />
      </Ventana>
      <div style={camaraStyle}>
        <Recorte src="recorte-fotos.webm" en={15.04} dur={0.96} desde={2.64} />
      </div>

      {/* Beats 7-19 de la intro y tramos de cámara del resto del vídeo */}
      <Escenas t={t} />
      <Tramos t={t} />

      <Sonidos />
    </AbsoluteFill>
  );
};
