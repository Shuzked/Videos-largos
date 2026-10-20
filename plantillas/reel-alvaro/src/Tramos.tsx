import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, GLOW_AMARILLO, glow} from './estilo';
import {F, Son, Sube, ease, iv, Ventana} from './anim';
import {H, SUB, amarillo} from './texto';

// Paso del resumen: número en contorno amarillo + texto en minúsculas, separado por una línea fina que se dibuja.
// El paso activo rellena su número y brilla; los anteriores se quedan atenuados.
const Paso: React.FC<{t: number; n: number; en: number; sig: number; top: number; children: React.ReactNode}> = ({t, n, en, sig, top, children}) => {
  const activo = t >= en && t < sig;
  const linea = iv(t, [en, en + 10 * F], [0, 1], ease.inOut);
  const num = iv(t, [en, en + 8 * F], [0, 1], ease.pop);
  return (
    <div style={{position: 'absolute', left: 110, top, width: 720, opacity: t < en ? 0 : activo ? 1 : 0.45}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 30, height: 140}}>
        <span
          style={{
            display: 'inline-block', width: 120, fontWeight: 900, fontSize: 104, lineHeight: 1, scale: 0.6 + 0.4 * num,
            color: activo ? C.amarillo : 'transparent', WebkitTextStroke: `3px ${C.amarillo}`,
            textShadow: activo ? glow(GLOW_AMARILLO, 1.1) : 'none',
          }}
        >
          {n}
        </span>
        <Sube t={t} en={en + 2 * F} style={{...SUB, fontSize: 54, whiteSpace: 'nowrap'}}>{children}</Sube>
      </div>
      <div style={{height: 2, background: 'rgba(255,255,255,0.22)', transformOrigin: '0 50%', scale: `${linea} 1`}} />
    </div>
  );
};

// Del resto del vídeo solo se edita el resumen del outro y el aviso del enlace
export const Tramos: React.FC<{t: number}> = ({t}) => (
  <>
      {/* Resumen en 4 pasos: Álvaro a la derecha, degradado negro y tarjetas a la izquierda */}
      <Ventana t={t} a={472.44} b={483.4}>
        <AbsoluteFill
          style={{
            background: 'linear-gradient(90deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.82) 34%, rgba(0,0,0,0.35) 52%, rgba(0,0,0,0) 64%)',
            opacity: iv(t, [472.44, 472.44 + 6 * F], [0, 1]),
          }}
        />
        <div style={{opacity: iv(t, [479.9, 480.1], [1, 0]), filter: `blur(${iv(t, [479.9, 480.1], [0, 10])}px)`}}>
          <Paso t={t} n={1} en={473.72} sig={475.0} top={170}>una idea de vídeo</Paso>
          <Paso t={t} n={2} en={475.0} sig={476.28} top={360}>un pequeño edit</Paso>
          <Paso t={t} n={3} en={476.28} sig={477.8} top={550}>se lo pasas a Claude</Paso>
          <Paso t={t} n={4} en={477.8} sig={480.0} top={740}>qué quieres sustituir</Paso>
        </div>
        <div style={{position: 'absolute', left: 110, top: 380, ...H, fontSize: 120, lineHeight: 1.0}}>
          <Sube t={t} en={480.04} dist={60} sale={483.2}>un anuncio</Sube>
          <br />
          <Sube t={t} en={482.2} dist={60} sale={483.2} style={amarillo}>de máxima</Sube>
          <br />
          <Sube t={t} en={482.2} dist={60} sale={483.2} style={amarillo}>calidad</Sube>
        </div>
      </Ventana>

      {/* "Tenéis el enlace para probar Katana aquí debajo" */}
      <Ventana t={t} a={485.88} b={490.2}>
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)', opacity: Math.min(iv(t, [485.88, 486.04], [0, 1]), iv(t, [489.9, 490.2], [1, 0]))}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center'}}>
          <Sube t={t} en={485.88} sale={489.9} style={{...SUB, fontSize: 64}}>enlace aquí debajo</Sube>
          <div style={{display: 'inline-block', marginLeft: 22, fontSize: 70, fontWeight: 900, ...amarillo, opacity: t < 486.1 ? 0 : iv(t, [489.9, 490.1], [1, 0]), translate: `0px ${Math.abs(Math.sin((t - 486.1) * 6)) * 14}px`}}>↓</div>
        </div>
      </Ventana>
  </>
);
