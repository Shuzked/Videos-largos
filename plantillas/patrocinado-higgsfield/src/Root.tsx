import {Composition} from 'remotion';
import {Kling, DURACION_KLING} from './kling/Kling';

export const RemotionRoot = () => (
  <>
    <Composition id="Kling" component={Kling} width={1920} height={1080} fps={30} durationInFrames={Math.round(DURACION_KLING * 30)} />
  </>
);
