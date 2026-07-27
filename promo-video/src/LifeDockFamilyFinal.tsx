import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';

const StoryCaption: React.FC<{children: React.ReactNode; from: number; to: number}> = ({children, from, to}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + 7, to - 7, to], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'absolute', left: 58, right: 58, bottom: 130, display: 'flex', justifyContent: 'center', opacity}}>
      <div style={{background: 'rgba(4,20,45,.82)', color: 'white', borderRadius: 24, padding: '20px 30px', fontSize: 47, lineHeight: 1.16, fontWeight: 760, textAlign: 'center', boxShadow: '0 12px 38px rgba(0,0,0,.24)'}}>
        {children}
      </div>
    </div>
  );
};

const SpeakingShot: React.FC<{startFrom?: number; playbackRate?: number}> = ({startFrom = 0, playbackRate = 1}) => (
  <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
    <Video
      src={staticFile('promo-video/elderly-mother-heygen-lipsync-clean.mp4')}
      muted
      trimBefore={startFrom}
      playbackRate={playbackRate}
      objectFit="cover"
      style={{width: '100%', height: '100%'}}
    />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,20,45,.30), transparent 32%, rgba(4,20,45,.42))'}} />
  </AbsoluteFill>
);

const NaturalFamilyShot: React.FC<{startFrom?: number}> = ({startFrom = 0}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 60], [1.01, 1.055], {extrapolateRight: 'clamp'});
  const translateY = interpolate(frame, [0, 60], [0, -10], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
      <Img
        src={staticFile('promo-video/mother-daughter-source.png')}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `translateY(${translateY}px) scale(${scale})`}}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,20,45,.18), transparent 38%, rgba(4,20,45,.32))'}} />
      <div style={{position: 'absolute', top: 95, left: 58, right: 58, color: 'white', textShadow: '0 3px 15px rgba(0,0,0,.35)'}}>
        <div style={{fontSize: 28, fontWeight: 850, letterSpacing: 3.2, textTransform: 'uppercase'}}>A LifeDock story</div>
      </div>
    </AbsoluteFill>
  );
};

const PromiseCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 105, 120], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(150deg,#edf6ff,#f5f0ff)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 76, opacity}}>
      <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 205, height: 205, objectFit: 'contain'}} />
      <div style={{color: navy, fontSize: 76, lineHeight: 1.04, fontWeight: 850, marginTop: 42}}>Everything important.<br />One safe place.</div>
      <div style={{color: '#48617f', fontSize: 35, lineHeight: 1.35, marginTop: 34}}>A digital home for your life today,<br />with reassurance for tomorrow.</div>
    </AbsoluteFill>
  );
};

export const LifeDockFamilyFinal: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Audio src={staticFile('promo-video/lifedock-family-warm.wav')} volume={0.19} />
    <Sequence durationInFrames={210}><SpeakingShot /></Sequence>
    <Sequence durationInFrames={210}><Audio src={staticFile('promo-video/testimonial-ni-voice.mp3')} volume={1} /></Sequence>

    <Sequence from={210} durationInFrames={120}><PromiseCard /></Sequence>
    <Sequence from={330} durationInFrames={150}>
      <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 72}}>
        <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 260, height: 260, objectFit: 'contain'}} />
        <div style={{fontSize: 112, fontWeight: 850, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>LIFEDOCK</div>
        <div style={{color: navy, fontSize: 52, lineHeight: 1.18, fontWeight: 800, marginTop: 70}}>Your digital home for everyday life.</div>
        <div style={{color: '#3c5680', fontSize: 34, lineHeight: 1.3, marginTop: 26, letterSpacing: 1.2}}>Organised. Protected. In one place.</div>
        <div style={{background: '#2f64c5', color: 'white', borderRadius: 999, padding: '22px 46px', fontSize: 34, fontWeight: 750, marginTop: 76}}>For today and whatever comes next.</div>
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>
);
