import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile} from 'remotion';
import {Audio, Video} from '@remotion/media';

const BrandBug: React.FC = () => (
  <div style={{position: 'absolute', top: 58, right: 44, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 999, background: 'rgba(255,255,255,.9)', boxShadow: '0 8px 28px rgba(3,35,73,.18)'}}>
    <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 46, height: 46, objectFit: 'contain'}} />
    <div style={{fontFamily: 'Arial, Helvetica, sans-serif', color: '#082d61', fontSize: 24, fontWeight: 900, letterSpacing: 2}}>DIARYDOCK</div>
  </div>
);

const Footage: React.FC<{trimBefore: number}> = ({trimBefore}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#082d61'}}>
    <Video src={staticFile('promo-video/lifedock-passport-footage-master.mp4')} muted trimBefore={trimBefore} objectFit="cover" style={{width: '100%', height: '100%'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(4,22,50,.08),transparent 65%,rgba(4,22,50,.24))'}} />
    <BrandBug />
  </AbsoluteFill>
);

const EndCard: React.FC = () => (
  <AbsoluteFill style={{background: '#f6f8fc'}}>
    <Img src={staticFile('brand/diarydock-video-end-card.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

export const DiaryDockPassportPromo: React.FC = () => (
  <AbsoluteFill style={{background: '#082d61'}}>
    <Audio src={staticFile('promo-video/calm-ambient-bed.wav')} volume={0.18} />
    <Sequence from={8} durationInFrames={840}><Audio src={staticFile('promo-video/diarydock-passport-michelle-ni.mp3')} volume={1} /></Sequence>
    <Sequence durationInFrames={210}><Footage trimBefore={30} /></Sequence>
    <Sequence from={210} durationInFrames={210}><Footage trimBefore={660} /></Sequence>
    <Sequence from={420} durationInFrames={180}><Footage trimBefore={870} /></Sequence>
    <Sequence from={600} durationInFrames={150}><Footage trimBefore={1140} /></Sequence>
    <Sequence from={750} durationInFrames={150}><EndCard /></Sequence>
  </AbsoluteFill>
);

export const DiaryDockHomeEmergencyPromo: React.FC = () => (
  <AbsoluteFill style={{background: '#082d61'}}>
    <Audio src={staticFile('promo-video/lifedock-paper-bright.wav')} volume={0.15} />
    <Sequence from={8} durationInFrames={820}><Audio src={staticFile('promo-video/diarydock-home-emergency-sheena-ni.mp3')} volume={1} /></Sequence>
    <Sequence durationInFrames={720}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Video src={staticFile('promo-video/lifedock-home-emergency-real-stock-master.mp4')} muted objectFit="cover" style={{width: '100%', height: '100%'}} />
        <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(4,22,50,.08),transparent 65%,rgba(4,22,50,.22))'}} />
        <BrandBug />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={720} durationInFrames={120}><EndCard /></Sequence>
  </AbsoluteFill>
);
