import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile} from 'remotion';
import {Video} from '@remotion/media';

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
    <div style={{color: navy, fontSize: 72, lineHeight: 1.06, fontWeight: 850, marginTop: 42}}>Everything important.<br />Remembered for you.</div>
    <div style={{color: '#48617f', fontSize: 36, lineHeight: 1.4, marginTop: 38}}>Guardian keeps track of what matters,<br />so you don&apos;t have to.</div>
  </AbsoluteFill>
);

const EndCard: React.FC = () => (
  <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 72}}>
    <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 260, height: 260, objectFit: 'contain'}} />
    <div style={{fontSize: 112, fontWeight: 850, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>DIARYDOCK</div>
    <div style={{color: navy, fontSize: 62, lineHeight: 1.1, fontWeight: 850, marginTop: 66}}>Your life.<br />Organised.</div>
    <div style={{background: '#2f64c5', color: 'white', borderRadius: 999, padding: '22px 46px', fontSize: 34, fontWeight: 750, marginTop: 76}}>Start your DiaryDock today.</div>
  </AbsoluteFill>
);

export const DiaryDockFamilyDadOrganisedPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Sequence durationInFrames={450}>
      <CharacterShot src="promo-video/family-dad-organised-final.mp4" />
    </Sequence>

    <Sequence from={450} durationInFrames={120}>
      <PromiseCard />
    </Sequence>
    <Sequence from={570} durationInFrames={150}>
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
