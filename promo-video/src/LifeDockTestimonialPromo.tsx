import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';

const Caption: React.FC<{children: React.ReactNode; start: number; end: number}> = ({children, start, end}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + 8, end - 8, end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <div style={{position: 'absolute', left: 62, right: 62, bottom: 155, display: 'flex', justifyContent: 'center', opacity}}>
    <div style={{background: 'rgba(4,20,45,.78)', color: 'white', borderRadius: 26, padding: '22px 32px', fontSize: 49, lineHeight: 1.15, fontWeight: 780, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.22)'}}>{children}</div>
  </div>;
};

const FamilyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12, 285, 300], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: fade, overflow: 'hidden', background: navy}}>
    <Video
      src={staticFile('promo-video/mother-daughter-moving-original.mp4')}
      muted
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,20,45,.55), transparent 35%, rgba(4,20,45,.48))'}} />
    <div style={{position: 'absolute', top: 92, left: 60, right: 60, color: 'white'}}>
      <div style={{fontSize: 28, fontWeight: 850, letterSpacing: 3.5, textTransform: 'uppercase'}}>A LifeDock story</div>
      <div style={{fontSize: 69, lineHeight: 1.04, fontWeight: 840, marginTop: 17}}>Peace of mind for the people who matter.</div>
    </div>
    <Caption start={20} end={95}>“If I wasn’t here tomorrow…”</Caption>
    <Caption start={95} end={220}>“Would my daughter know where to find everything?”</Caption>
    <Caption start={220} end={292}>“With LifeDock, she would.”</Caption>
  </AbsoluteFill>;
};

const PromiseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 72, 90], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: 'linear-gradient(150deg,#edf6ff,#f5f0ff)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 80, opacity}}>
    <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 220, height: 220, objectFit: 'contain'}} />
    <div style={{color: navy, fontSize: 78, lineHeight: 1.04, fontWeight: 850, marginTop: 45}}>Everything important.<br/>One safe place.</div>
    <div style={{color: '#48617f', fontSize: 36, lineHeight: 1.35, marginTop: 36}}>For your life today — and reassurance for tomorrow.</div>
  </AbsoluteFill>;
};

export const LifeDockTestimonialPromo: React.FC = () => <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
  <Audio src={staticFile('promo-video/testimonial-ni-voice.mp3')} />
  <Sequence durationInFrames={300}><FamilyScene /></Sequence>
  <Sequence from={300} durationInFrames={90}><PromiseScene /></Sequence>
  <Sequence from={390} durationInFrames={150}>
    <AbsoluteFill style={{background: '#f7f8fb'}}><Img src={staticFile('brand/lifedock-video-end-card.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></AbsoluteFill>
  </Sequence>
</AbsoluteFill>;
