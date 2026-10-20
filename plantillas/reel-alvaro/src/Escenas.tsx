import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, GLOW_AMARILLO, LIMA, glow, lleno} from './estilo';
import {F, Palabras, Sube, ease, golpe, iv, Ventana} from './anim';
import {FondoMG, H, IconoClaude, IconoHiggsfield, LogoClaude, LogoHiggsfield, MIN, Oscuro, Rotativo, SUB, amarillo, rosa} from './texto';
import {Clip} from './Intro';

// Beat 8: montaje rápido del proceso (planos completos del vídeo: Álvaro a la izquierda, pantalla a la derecha)
const CAMBIO14 = 51.6; // "construye"
const B14 = 53.8; // el siguiente plano entra en "su ritmo"

export const MONTAJE: [number, number][] = [
  [20.8, 98], // elegir la referencia en Katana
  [21.44, 104], // conectar el MCP
  [22.24, 152], // subir las 3 fotos
  [23.12, 182], // el prompt a Claude
  [23.84, 208], // análisis de los cortes
  [24.48, 310], // plano generado
  [25.04, 412], // resultado final
];
const FIN_MONTAJE = 26.0; // cubre el corte de cámara de 26,00

// Foto de su cara a pantalla completa, con destello de flash al entrar
const Foto: React.FC<{t: number; n: number; en: number}> = ({t, n, en}) => (
  <AbsoluteFill>
    <Img src={staticFile(`img/foto-${n}.png`)} style={{...lleno, filter: 'blur(36px) brightness(0.45)', scale: 1.2}} />
    <Img
      src={staticFile(`img/foto-${n}.png`)}
      style={{position: 'absolute', left: 585, top: 40, width: 750, height: 1000, objectFit: 'cover', scale: iv(t, [en, en + 0.6], [1.06, 1], ease.sube), boxShadow: '0 30px 80px rgba(0,0,0,0.6)'}}
    />
    <AbsoluteFill style={{background: '#fff', opacity: iv(t, [en, en + 3 * F], [0.9, 0])}} />
  </AbsoluteFill>
);

export const Escenas: React.FC<{t: number}> = ({t}) => (
  <>
    {/* ===== Beat 6 (12,56-16,0): "le di a Claude tres imágenes mías de mi cara" ===== */}
    <Ventana t={t} a={12.56} b={13.6}>
      <Oscuro t={t} a={12.56} b={13.6} fuerza={0.7} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22}}>
        <Palabras t={t} ws={[['le', 12.56], ['di', 12.72], ['a', 12.88]]} style={{position: 'relative', left: 'auto', right: 'auto', ...MIN}} />
        <div style={{...golpe(t, 12.96), marginTop: 6}}>
          <LogoClaude w={300} />
        </div>
      </div>
    </Ventana>
    <Ventana t={t} a={13.6} b={15.04}>
      <Foto t={t} n={1} en={13.6} />
      {t >= 13.84 && <Foto t={t} n={3} en={13.84} />}
      {t >= 14.4 && <Foto t={t} n={2} en={14.4} />}
      <div style={{position: 'absolute', left: 0, right: 0, top: 930, textAlign: 'center', ...MIN, fontSize: 56}}>
        {t >= 14.4 ? '3 / 3' : t >= 13.84 ? '2 / 3' : '1 / 3'}
      </div>
    </Ventana>

    {/* ===== Beat 7 (16,0-20,8): Claude dirige, Higgsfield crea ===== */}
    <Ventana t={t} a={16.0} b={20.8}>
      <Oscuro t={t} a={16.0} b={20.8} />
      <Ventana t={t} a={16.0} b={18.08}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 650, display: 'flex', justifyContent: 'center', ...golpe(t, 16.0)}}>
          <LogoClaude w={820} />
        </div>
        <Palabras t={t} ws={[['dirigió', 16.32], ['el', 17.12], ['montaje', 17.28]]} style={{top: 880, ...SUB}} />
      </Ventana>
      <Ventana t={t} a={18.08} b={20.8}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', ...golpe(t, 18.08, 20.6)}}>
          <LogoHiggsfield w={1000} />
        </div>
        <Palabras
          t={t}
          ws={[['hizo', 18.96], ['la', 19.28], ['magia', 19.44], ['de', 19.92], ['la', 20.0], ['creación', 20.16]]}
          sale={20.6}
          style={{top: 900, ...SUB}}
          palabra={(w) => (w === 'magia' ? amarillo : undefined)}
        />
      </Ventana>
    </Ventana>

    {/* ===== Beat 8 (20,8-25,84): "te enseño el proceso de inicio a fin" → 7 cortes del proceso real ===== */}
    <Ventana t={t} a={20.8} b={FIN_MONTAJE}>
      {/* un solo zoom lento y constante para todo el montaje */}
      <AbsoluteFill style={{scale: iv(t, [20.8, FIN_MONTAJE], [1.0, 1.06]), filter: `brightness(${t >= 23.12 ? 0.55 : 0.8})`}}>
        {MONTAJE.map(([a, src], i) => {
          const b = i + 1 < MONTAJE.length ? MONTAJE[i + 1][0] : FIN_MONTAJE;
          return (
            <Ventana key={a} t={t} a={a} b={b}>
              <Clip src="completo.mp4" en={a} dur={b - a} desde={src} />
            </Ventana>
          );
        })}
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', ...H, fontSize: 160}}>
        <Sube t={t} en={23.12} dist={70} sale={25.82}>De inicio</Sube>
        <br />
        <Sube t={t} en={23.84} dist={70} sale={25.82}>
          a <span style={amarillo}>fin</span>
        </Sube>
      </div>
      {/* Barra de progreso del proceso, con una marca por corte */}
      <div style={{position: 'absolute', left: 160, right: 160, top: 1000, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.18)'}}>
        <div style={{width: `${iv(t, [20.8, FIN_MONTAJE], [0, 100])}%`, height: '100%', borderRadius: 3, background: C.amarillo, boxShadow: glow(GLOW_AMARILLO, 1)}} />
        {MONTAJE.map(([a]) => (
          <div key={a} style={{position: 'absolute', top: -7, left: `${((a - 20.8) / (FIN_MONTAJE - 20.8)) * 100}%`, width: 3, height: 20, background: t >= a ? C.amarillo : 'rgba(255,255,255,0.4)'}} />
        ))}
      </div>
    </Ventana>

    {/* ===== Beat 9 (27,44-31,36): B-roll oscuro + texto en minúsculas centrado ===== */}
    <Ventana t={t} a={27.44} b={31.36}>
      <AbsoluteFill style={{scale: iv(t, [27.44, 31.36], [1, 1.08])}}>
        <Clip src="stock/coverr-man-scrolling-through-his-instagram-feed-4477.mp4" en={27.44} dur={3.92} desde={2} style={{filter: 'brightness(0.42) saturate(0.8)'}} />
      </AbsoluteFill>
      <Ventana t={t} a={27.44} b={28.72}>
        <Palabras t={t} ws={[['no', 27.6], ['es', 27.68], ['solo', 27.76], ['un', 28.0], ['juguete', 28.08]]} style={{top: 490, ...MIN}} palabra={(w) => (w === 'juguete' ? rosa : undefined)} />
      </Ventana>
      <Ventana t={t} a={28.72} b={31.36}>
        <Palabras t={t} ws={[['para', 28.72], ['hacer', 28.96], ['formatos', 29.44], ['de', 30.0], ['vídeo', 30.16], ['divertidos', 30.56]]} sale={31.2} style={{top: 490, ...MIN}} />
      </Ventana>
    </Ventana>

    {/* ===== Beat 10 (31,36-36,4): un servicio para empresas → dinero ===== */}
    <Ventana t={t} a={31.36} b={36.4}>
      <AbsoluteFill style={{scale: t < 34.32 ? iv(t, [31.36, 34.32], [1.05, 1.12]) : iv(t, [34.32, 36.4], [1.12, 1.02])}}>
        <Clip src="stock/46755-720.mp4" en={31.36} dur={2.96} desde={1} style={{filter: 'brightness(0.45)'}} />
        <Clip src="stock/coverr-a-man-counting-money-9403.mp4" en={34.32} dur={2.08} desde={3} style={{filter: 'brightness(0.45)'}} />
      </AbsoluteFill>
      <Ventana t={t} a={31.36} b={32.8}>
        <Palabras t={t} ws={[['sino', 31.36], ['que', 31.68], ['puede', 31.84], ['ser', 32.24]]} style={{top: 490, ...MIN}} />
      </Ventana>
      <Ventana t={t} a={32.8} b={34.32}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', ...H, fontSize: 200, ...golpe(t, 32.8)}}>un servicio</div>
        <Palabras t={t} ws={[['que', 33.36], ['vendas', 33.6], ['a', 34.08]]} style={{top: 590, ...SUB}} />
      </Ventana>
      <Ventana t={t} a={34.32} b={36.4}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', ...H, fontSize: 220, ...golpe(t, 34.32, 36.22)}}>empresas</div>
        <Palabras
          t={t}
          ws={[['y', 34.8], ['que', 34.96], ['puedas', 35.12], ['ganar', 35.44], ['dinero', 35.68], ['con', 35.92], ['él', 36.08]]}
          sale={36.22}
          style={{top: 600, ...SUB, alignItems: 'baseline'}}
          palabra={(w) => (w === 'dinero' ? {...amarillo, fontWeight: 900, fontSize: '1.45em', textShadow: glow(GLOW_AMARILLO, 1.5)} : undefined)}
        />
      </Ventana>
    </Ventana>

    {/* ===== Beat 11 (36,4-38,72): la herramienta: Higgsfield Katana ===== */}
    <Ventana t={t} a={36.4} b={38.72}>
      <AbsoluteFill style={{scale: iv(t, [36.4, 38.72], [1, 1.1])}}>
        <Clip src="katana-web.mp4" en={36.4} dur={2.32} style={{filter: 'brightness(0.4) blur(2px)'}} />
      </AbsoluteFill>
      <Palabras t={t} ws={[['la', 36.4], ['herramienta', 36.56], ['se', 36.96], ['llama', 37.04]]} sale={38.5} style={{top: 300, ...SUB}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center', ...golpe(t, 37.04)}}>
        <LogoHiggsfield w={760} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 610, textAlign: 'center', ...H, fontSize: 230, ...golpe(t, 38.08)}}>Katana</div>
    </Ventana>

    {/* ===== Beats 12-13 (40,6-47,92): cualquier clip viral es una plantilla ===== */}
    <Ventana t={t} a={40.36} b={47.92}>
      <AbsoluteFill style={{scale: iv(t, [40.36, 47.92], [1, 1.06]), translate: `0px ${iv(t, [40.36, 47.92], [0, -40])}px`}}>
        <Clip src="presets.mp4" en={40.36} dur={7.56} style={{filter: 'brightness(0.3) saturate(0.85)'}} />
      </AbsoluteFill>
      <Ventana t={t} a={40.36} b={43.6}>
        <Palabras t={t} ws={[['cualquier', 40.64], ['clip', 41.12], ['viral', 41.52]]} sale={43.36} style={{top: 340, ...MIN}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 480, textAlign: 'center', ...H, fontSize: 150, ...golpe(t, 42.24, 43.36)}}>
          es una <span style={amarillo}>{t >= 42.72 ? 'plantilla' : ''}</span>
        </div>
      </Ventana>
      <Ventana t={t} a={43.44} b={44.96}>
        <Palabras t={t} ws={[['alguien', 43.44], ['ya', 43.84], ['ha', 44.0], ['demostrado', 44.08], ['que', 44.56]]} style={{top: 490, ...MIN}} />
      </Ventana>
      <Rotativo t={t} top={420} size={210} fin={47.8} items={[['esos cortes', 44.96], ['esa música', 45.68], ['esa velocidad', 46.32], [<>son <span style={amarillo}>virales</span></>, 47.04]]} />
      <AbsoluteFill style={{background: '#fff', opacity: t < 47.28 ? 0 : iv(t, [47.28, 47.28 + 3 * F], [0.5, 0])}} />
    </Ventana>

    {/* ===== Beat 14a (47,92-53,8): primero el reel original en grande ("lo que ya ha funcionado") → pasa al suyo ("uno igual") ===== */}
    <Ventana t={t} a={47.92} b={B14}>
      <FondoMG t={t} a={47.92} id="r14" />
      {([['reel-original.mp4', 47.92, -1], ['reel-alvaro.mp4', CAMBIO14, 1]] as [string, number, number][]).map(([src, a, lado]) => {
        const entra = iv(t, [a, a + 7 * F], [0, 1], ease.sube);
        const sale = lado < 0 ? iv(t, [CAMBIO14, CAMBIO14 + 10 * F], [0, 1], ease.inOut) : 0;
        const llega = lado > 0 ? iv(t, [CAMBIO14, CAMBIO14 + 10 * F], [0, 1], ease.inOut) : 1;
        if (t < a && lado > 0) return null;
        return (
          <div
            key={src}
            style={{
              position: 'absolute', left: 424, top: 70, width: 1071, height: 760, borderRadius: 24, overflow: 'hidden',
              border: `3px solid ${C.crema}`, boxShadow: '0 40px 90px rgba(0,0,0,0.65), 0 0 50px rgba(255,255,255,0.08)',
              opacity: lado < 0 ? entra * (1 - sale) : llega,
              scale: lado < 0 ? 0.9 + 0.1 * entra - 0.06 * sale : 0.94 + 0.06 * llega,
              translate: `${lado < 0 ? -500 * sale : 500 * (1 - llega)}px 0px`,
            }}
          >
            <Clip src={src} en={a} dur={B14 - a} desde={7.4 + (a - 47.92)} />
          </div>
        );
      })}
      <Palabras t={t} ws={[['lo', 49.84], ['que', 50.08], ['ya', 50.24], ['ha', 50.48], ['funcionado', 50.64]]} sale={CAMBIO14 - 0.1} style={{top: 875, ...SUB}} />
      <Palabras t={t} ws={[['uno', 52.4], ['igual', 52.96]]} sale={B14 - 0.24} style={{top: 875, ...SUB}} palabra={(w) => (w === 'igual' ? amarillo : undefined)} />
    </Ventana>

    {/* ===== Beat 14b (53,0-58,16): su ritmo, su música, sus cortes… con tu cara ===== */}
    <Ventana t={t} a={B14} b={58.16}>
      <AbsoluteFill style={{background: '#0d1418', overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: -80, filter: 'blur(30px) brightness(0.5)'}}>
          <Clip src="reel-coche.mp4" en={B14} dur={58.16 - B14} />
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute', left: 679, top: 40, width: 562, height: 1000, borderRadius: 26, overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,255,255,0.12)',
          scale: iv(t, [B14, B14 + 7 * F], [0.85, 1], ease.sube), translate: `0px ${iv(t, [B14, B14 + 7 * F], [80, 0], ease.sube)}px`,
        }}
      >
        <Clip src="reel-coche.mp4" en={B14} dur={58.16 - B14} />
      </div>
      <div style={{position: 'absolute', right: 1290, top: 300, textAlign: 'right', ...H, fontSize: 92, lineHeight: 1.15}}>
        <Sube t={t} en={53.84} dist={40}>su ritmo</Sube>
        <br />
        <Sube t={t} en={54.56} dist={40}>su música</Sube>
        <br />
        <Sube t={t} en={55.2} dist={40}>sus cortes</Sube>
      </div>
      <div style={{position: 'absolute', left: 1300, top: 380, ...H, fontSize: 100}}>
        <Sube t={t} en={56.56} dist={60}>con tu</Sube>
        <br />
        <Sube t={t} en={56.72} dist={60} style={amarillo}>cara</Sube>
      </div>
      <Palabras t={t} ws={[['o', 57.04], ['con', 57.2], ['tu', 57.36], ['producto', 57.6]]} style={{top: 600, left: 1300, right: 'auto', justifyContent: 'flex-start', ...SUB, fontSize: 52}} />
    </Ventana>

    {/* ===== Beats 16-17 (60,88-75,27): sobre la cámara, verbos-golpe ===== */}
    <Ventana t={t} a={60.88} b={75.27}>
      <Oscuro t={t} a={60.88} b={75.27} />
      <Ventana t={t} a={60.88} b={62.8}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 650, display: 'flex', justifyContent: 'center', ...golpe(t, 60.88)}}>
          <LogoClaude w={820} />
        </div>
        <Palabras t={t} ws={[['hace', 61.52], ['de', 61.84], ['director', 62.0]]} style={{top: 880, ...SUB}} palabra={(w) => (w === 'director' ? amarillo : undefined)} />
      </Ventana>
      <Rotativo t={t} top={680} size={200} fin={68.7} items={[['analiza', 62.8], ['planifica', 64.63], ['resuelve', 66.47]]} />
      <Ventana t={t} a={62.8} b={68.87}>
        <Palabras t={t} ws={t < 64.63 ? [['la', 63.36], ['referencia', 63.52]] : t < 66.47 ? [['cada', 65.35], ['corte', 65.59]] : [['cómo', 67.19], ['establecer', 67.51], ['cada', 68.23], ['plano', 68.47]]} sale={68.7} style={{top: 880, ...SUB}} />
      </Ventana>
      <Ventana t={t} a={68.87} b={71.35}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center', ...golpe(t, 68.87)}}>
          <LogoHiggsfield w={900} />
        </div>
        <Palabras t={t} ws={[['es', 69.91], ['el', 70.07], ['motor', 70.15], ['de', 70.55], ['vídeo', 70.79]]} style={{top: 900, ...SUB}} palabra={(w) => (w === 'motor' ? {color: LIMA, textShadow: glow('209,254,23', 1)} : undefined)} />
      </Ventana>
      <Rotativo t={t} top={680} size={200} fin={75.1} items={[['genera', 71.35], ['monta', 73.03]]} />
      <Ventana t={t} a={71.35} b={75.27}>
        <Palabras t={t} ws={t < 73.03 ? [['lo', 71.83], ['que', 72.07], ['falta', 72.23]] : [['el', 73.67], ['resultado', 73.99], ['final', 74.63]]} sale={75.1} style={{top: 880, ...SUB}} />
      </Ventana>
    </Ventana>

    {/* ===== Beats 18-19 (75,27-86,56): las dos piezas conectadas por MCP → HIGGSFIELD MCP ===== */}
    <Ventana t={t} a={75.27} b={86.56}>
      <FondoMG t={t} a={75.27} id="r18" opacity={iv(t, [75.27, 75.27 + 4 * F], [0, 1])} />
      <div style={{position: 'absolute', left: 300, top: 420, ...golpe(t, 75.67, 84.07)}}>
        <IconoClaude w={240} />
      </div>
      <div style={{position: 'absolute', left: 1380, top: 400, ...golpe(t, 75.83, 84.07)}}>
        <IconoHiggsfield w={240} style={{borderRadius: 48}} />
      </div>
      {/* Cable de luz que se dibuja al "conectan" y se carga de energía en "enchufe" */}
      <div
        style={{
          position: 'absolute', left: 580, width: 760, top: 516, height: 8, borderRadius: 4, transformOrigin: '0 50%',
          background: `linear-gradient(90deg, #fff, ${t >= 79.43 ? LIMA : '#fff'})`,
          boxShadow: t >= 79.43 ? '0 0 18px rgba(209,254,23,0.8), 0 0 50px rgba(209,254,23,0.4)' : glow(),
          scale: `${iv(t, [76.31, 76.31 + 12 * F], [0, 1], ease.inOut)} 1`,
          opacity: iv(t, [84.07, 84.07 + 5 * F], [1, 0]),
        }}
      />
      {t >= 79.43 && t < 84.07 && (
        <div
          style={{
            position: 'absolute', top: 504, width: 32, height: 32, borderRadius: 16, background: '#fff',
            boxShadow: '0 0 24px #fff, 0 0 60px rgba(209,254,23,0.9)',
            left: 580 + (((t - 79.43) / 0.9) % 1) * 760 - 16,
          }}
        />
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', ...H, fontSize: 170, ...golpe(t, 77.75, 84.07)}}>MCP</div>
      <Ventana t={t} a={78.47} b={80.95}>
        <Palabras t={t} ws={[['es', 78.63], ['como', 78.71], ['un', 79.27], ['enchufe', 79.43]]} style={{top: 680, ...MIN}} palabra={(w) => (w === 'enchufe' ? {color: LIMA, textShadow: glow('209,254,23', 1)} : undefined)} />
      </Ventana>
      <Ventana t={t} a={80.95} b={84.2}>
        <Palabras t={t} ws={[['Claude', 80.95], ['usa', 81.75], ['herramientas', 82.39], ['externas', 83.27]]} sale={84.0} style={{top: 680, ...MIN}} />
      </Ventana>
      {/* HIGGSFIELD MCP: zoom con desenfoque que muere en negro justo cuando entra la tarjeta de Instagram (86,56) */}
      <AbsoluteFill
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 50,
          opacity: t < 84.95 ? 0 : iv(t, [86.24, 86.52], [1, 0]),
          scale: iv(t, [86.24, 86.52], [1, 2.2], ease.entra), filter: `blur(${iv(t, [86.24, 86.52], [0, 20])}px)`,
        }}
      >
        <div style={golpe(t, 84.95)}>
          <LogoHiggsfield w={980} />
        </div>
        <div style={{...H, fontSize: 190, marginTop: -10, ...golpe(t, 85.83)}}>MCP</div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#000', opacity: iv(t, [86.24, 86.52], [0, 1])}} />
    </Ventana>
  </>
);
