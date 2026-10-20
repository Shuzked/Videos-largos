import {Composition} from 'remotion';
import {Intro, DURACION, FPS} from './Intro';
import {ReelA1, DURACION_A1} from './a1/Reel';
import {ReelA2, DURACION_A2} from './a2/Reel';
import {ReelA3, DURACION_A3} from './a3/Reel';
import {ReelA4, DURACION_A4} from './a4/Reel';
import {ReelE1, DURACION_E1} from './e1/Reel';
import {ReelE2, DURACION_E2} from './e2/Reel';

export const RemotionRoot = () => (
  <>
  <Composition
    id="Intro"
    component={Intro}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={Math.round(DURACION * FPS)}
  />
  <Composition id="ReelA1" component={ReelA1} width={1080} height={1920} fps={25} durationInFrames={Math.round(DURACION_A1 * 25)} />
  <Composition id="ReelA2" component={ReelA2} width={1080} height={1920} fps={25} durationInFrames={Math.round(DURACION_A2 * 25)} />
  <Composition id="ReelA3" component={ReelA3} width={1080} height={1920} fps={25} durationInFrames={Math.round(DURACION_A3 * 25)} />
  <Composition id="ReelA4" component={ReelA4} width={1080} height={1920} fps={25} durationInFrames={Math.round(DURACION_A4 * 25)} />
  <Composition id="ReelE1" component={ReelE1} width={1080} height={1920} fps={25} durationInFrames={Math.round(DURACION_E1 * 25)} />
  <Composition id="ReelE2" component={ReelE2} width={1080} height={1920} fps={25} durationInFrames={Math.round(DURACION_E2 * 25)} />
  </>
);
