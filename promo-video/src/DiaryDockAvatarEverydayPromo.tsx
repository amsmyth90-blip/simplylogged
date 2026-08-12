import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Video} from '@remotion/media';

const navy = '#082d61';
const avatarFrames = 602;

const AvatarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeToBrand = interpolate(frame, [avatarFrames - 12, avatarFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  return (
    <AbsoluteFill style={{background: '#101318', overflow: 'hidden'}}>
      <Video
        src={staticFile('promo-video/diarydock-avatar-everyday-raw.mp4')}
        objectFit="cover"
        style={{width: '100%', height: '100%'}}
      />
      <AbsoluteFill style={{background: '#f3f6fc', opacity: fadeToBrand}} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const rise = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        background: '#f3f6fc',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 76,
        opacity,
      }}
    >
      <div
        style={{
          translate: `0 ${rise}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Img
          src={staticFile('brand/diarydock-mark.png')}
          style={{width: 250, height: 250, objectFit: 'contain'}}
        />
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            letterSpacing: 8,
            marginTop: 28,
            background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          DIARYDOCK
        </div>
        <div
          style={{
            color: navy,
            fontSize: 68,
            lineHeight: 1.08,
            fontWeight: 880,
            marginTop: 62,
          }}
        >
          Your life, organised.
        </div>
        <div
          style={{
            color: '#3c5680',
            fontSize: 35,
            lineHeight: 1.32,
            marginTop: 30,
          }}
        >
          One secure digital home
          <br />
          for everyday life.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DiaryDockAvatarEverydayPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Sequence durationInFrames={avatarFrames}>
      <AvatarScene />
    </Sequence>
    <Sequence from={avatarFrames} durationInFrames={120}>
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
