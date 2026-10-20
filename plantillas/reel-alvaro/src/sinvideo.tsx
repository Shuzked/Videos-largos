import React from 'react';
import {OffthreadVideo as OV, getInputProps} from 'remotion';
import {Video as V} from '@remotion/media';

// stem "efectos": render solo de audio de los efectos; los vídeos (todos mudos en ese stem) no se cargan para que vaya rápido
const EFECTOS = (getInputProps() as {stem?: string}).stem === 'efectos';
export const Video: typeof V = ((p: React.ComponentProps<typeof V>) => (EFECTOS ? null : <V {...p} />)) as typeof V;
export const OffthreadVideo: typeof OV = ((p: React.ComponentProps<typeof OV>) => (EFECTOS ? null : <OV {...p} />)) as typeof OV;
