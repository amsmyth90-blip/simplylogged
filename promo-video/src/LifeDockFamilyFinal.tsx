import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';
const speakerFrames = 187;
const transitionFrames = 12;

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, transitionFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: '#f3f6fc', opacity}}>
      <Img
        src={staticFile('brand/diarydock-video-end-card.png')}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </AbsoluteFill>
  );
};

export const LifeDockFamilyFinal: React.FC = () => (
  <AbsoluteFill style={{background: navy}}>
    <Audio src={staticFile('promo-video/lifedock-family-warm.wav')} volume={0.15} />

    <Sequence durationInFrames={speakerFrames}>
      <Video
        src={staticFile('promo-video/diarydock-woman-60-brit-madam-lipsync.mp4')}
        objectFit="cover"
        style={{width: '100%', height: '100%'}}
      />
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(4,20,45,.06), transparent 45%, rgba(4,20,45,.15))',
        }}
      />
    </Sequence>

    <Sequence from={speakerFrames - transitionFrames} durationInFrames={102}>
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
