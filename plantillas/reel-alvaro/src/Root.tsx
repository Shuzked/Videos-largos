import {Composition} from 'remotion';
import {Intro, DURACION, FPS} from './Intro';
import {ReelA1, DURACION_A1} from './a1/Reel';

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
  </>
);
