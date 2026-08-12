import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';

const CharacterShot: React.FC<{src: string}> = ({src}) => (
  <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
    <Video src={staticFile(src)} objectFit="cover" style={{width: '100%', height: '100%'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(4,20,45,.12),transparent 45%,rgba(4,20,45,.30))'}} />
  </AbsoluteFill>
);

const PromiseCard: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(150deg,#edf6ff,#f5f0ff)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 76}}>
    <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 210, height: 210, objectFit: 'contain'}} />
    <div style={{color: navy, fontSize: 72, lineHeight: 1.06, fontWeight: 850, marginTop: 42}}>Family life moves fast.<br />DiaryDock keeps up.</div>
    <div style={{color: '#48617f', fontSize: 36, lineHeight: 1.4, marginTop: 38}}>Appointments, addresses and important details,<br />together in one secure place.</div>
  </AbsoluteFill>
);

const EndCard: React.FC = () => (
  <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 72}}>
    <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 260, height: 260, objectFit: 'contain'}} />
    <div style={{fontSize: 112, fontWeight: 850, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>DIARYDOCK</div>
    <div style={{color: navy, fontSize: 52, lineHeight: 1.18, fontWeight: 800, marginTop: 70}}>Your digital home, for everyday life.</div>
    <div style={{color: '#3c5680', fontSize: 34, marginTop: 28}}>Organised. Protected. In one place.</div>
    <div style={{background: '#2f64c5', color: 'white', borderRadius: 999, padding: '22px 46px', fontSize: 34, fontWeight: 750, marginTop: 76}}>For today and whatever comes next.</div>
  </AbsoluteFill>
);

export const DiaryDockDentistPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Audio src={staticFile('promo-video/diarydock-dentist-light.wav')} volume={0.17} />
    <Sequence durationInFrames={72}><CharacterShot src="promo-video/dentist-mum-1.mp4" /></Sequence>
    <Sequence from={72} durationInFrames={95}><CharacterShot src="promo-video/dentist-dad-1-v3.mp4" /></Sequence>
    <Sequence from={167} durationInFrames={90}><CharacterShot src="promo-video/dentist-mum-2.mp4" /></Sequence>
    <Sequence from={257} durationInFrames={192}><CharacterShot src="promo-video/dentist-dad-2-v3.mp4" /></Sequence>
    <Sequence from={449} durationInFrames={54}><CharacterShot src="promo-video/dentist-mum-3.mp4" /></Sequence>
    <Sequence from={503} durationInFrames={145}><CharacterShot src="promo-video/dentist-dad-3-v3.mp4" /></Sequence>

    <Sequence from={648} durationInFrames={120}><PromiseCard /></Sequence>
    <Sequence from={768} durationInFrames={150}><EndCard /></Sequence>
  </AbsoluteFill>
);
