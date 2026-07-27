import React from 'react';
import {AbsoluteFill, Img, Sequence, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';
const blue = '#2f64c5';

const BrandBug: React.FC = () => (
  <div style={{position: 'absolute', top: 84, left: 72, display: 'flex', alignItems: 'center', gap: 16}}>
    <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 62, height: 62, objectFit: 'contain'}} />
    <div style={{color: 'white', fontSize: 30, fontWeight: 850, letterSpacing: 2.4, textShadow: '0 3px 14px rgba(0,0,0,.35)'}}>LIFEDOCK</div>
  </div>
);

const Footage: React.FC<{src: string; headline?: string}> = ({src, headline}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
      <Video src={staticFile(src)} muted objectFit="cover" style={{width: '100%', height: '100%'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(3,18,42,.18),transparent 42%,rgba(3,18,42,.58))'}} />
      <BrandBug />
      {headline ? (
        <div style={{position: 'absolute', left: 80, right: 80, bottom: 145, color: 'white', fontSize: 88, lineHeight: 1.02, fontWeight: 880, letterSpacing: -2, opacity: interpolate(frame, [4, 16], [0, 1], {extrapolateRight: 'clamp'}), translate: `0 ${interpolate(frame, [4, 16], [35, 0], {extrapolateRight: 'clamp'})}px`, textShadow: '0 5px 28px rgba(0,0,0,.42)'}}>
          {headline}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = 'Home insurance'.slice(0, Math.max(0, Math.floor(interpolate(frame, [18, 78], [0, 14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))));
  const cardOpacity = interpolate(frame, [80, 96], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(150deg,#edf6ff,#f5f0ff)', padding: '110px 70px 90px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 86, height: 86, objectFit: 'contain'}} />
        <div style={{fontSize: 42, color: navy, fontWeight: 900, letterSpacing: 3}}>LIFEDOCK</div>
      </div>
      <div style={{marginTop: 150, color: navy, fontSize: 78, lineHeight: 1.04, fontWeight: 880}}>Find what matters.<br />Right when you need it.</div>
      <div style={{marginTop: 74, height: 112, borderRadius: 30, background: 'white', boxShadow: '0 22px 62px rgba(33,73,130,.16)', display: 'flex', alignItems: 'center', padding: '0 34px', gap: 24}}>
        <div style={{fontSize: 48, color: blue}}>⌕</div>
        <div style={{fontSize: 40, color: typed ? navy : '#8ca0b8', fontWeight: 720}}>{typed || 'Search LifeDock'}</div>
        <div style={{width: 4, height: 46, background: blue, opacity: frame % 20 < 10 ? 1 : 0}} />
      </div>
      <div style={{marginTop: 30, borderRadius: 34, background: 'white', padding: '34px 32px', display: 'flex', alignItems: 'center', gap: 26, opacity: cardOpacity, translate: `0 ${interpolate(frame, [80, 100], [24, 0], {extrapolateRight: 'clamp'})}px`, boxShadow: '0 18px 54px rgba(33,73,130,.13)'}}>
        <div style={{width: 94, height: 94, borderRadius: 24, background: '#eaf2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 49}}>📄</div>
        <div style={{flex: 1}}>
          <div style={{fontSize: 39, color: navy, fontWeight: 840}}>Home insurance policy</div>
          <div style={{fontSize: 29, color: '#57708d', marginTop: 8}}>Current policy · Safely stored</div>
        </div>
        <div style={{width: 58, height: 58, borderRadius: 99, background: '#27a878', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900}}>✓</div>
      </div>
    </AbsoluteFill>
  );
};

const Categories: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    ['Policies', 'Protected and easy to find', '🛡️'],
    ['Warranties', 'Receipts and cover details', '✓'],
    ['Important dates', 'Remembered for you', '📅'],
  ];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(155deg,#082d61,#174b8d)', padding: '115px 76px', color: 'white'}}>
      <div style={{fontSize: 78, lineHeight: 1.04, fontWeight: 880}}>Your everyday life.<br />All together.</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 28, marginTop: 82}}>
        {items.map(([title, subtitle, icon], index) => {
          const start = 14 + index * 14;
          return (
            <div key={title} style={{display: 'flex', alignItems: 'center', gap: 28, background: 'rgba(255,255,255,.11)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 32, padding: '30px 32px', opacity: interpolate(frame, [start, start + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), translate: `${interpolate(frame, [start, start + 10], [44, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px 0`}}>
              <div style={{width: 94, height: 94, flex: '0 0 auto', borderRadius: 26, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44}}>{icon}</div>
              <div>
                <div style={{fontSize: 43, fontWeight: 850}}>{title}</div>
                <div style={{fontSize: 29, color: '#cbdcf1', marginTop: 6}}>{subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 74, opacity}}>
      <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 250, height: 250, objectFit: 'contain'}} />
      <div style={{fontSize: 110, fontWeight: 900, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>LIFEDOCK</div>
      <div style={{color: navy, fontSize: 62, lineHeight: 1.08, fontWeight: 880, marginTop: 68}}>Your life, organised.</div>
      <div style={{color: '#3c5680', fontSize: 35, lineHeight: 1.32, marginTop: 30}}>One secure digital home<br />for everyday life.</div>
    </AbsoluteFill>
  );
};

export const LifeDockFoundItPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Audio src={staticFile('promo-video/lifedock-found-it-upbeat.wav')} volume={0.18} />
    <Sequence from={12} durationInFrames={680}>
      <Audio src={staticFile('promo-video/lifedock-found-it-gerry-ni.mp3')} volume={1} />
    </Sequence>
    <Sequence durationInFrames={135}><Footage src="promo-video/scene-paperwork.mp4" headline="Where did I put it?" /></Sequence>
    <Sequence from={135} durationInFrames={195}><SearchScene /></Sequence>
    <Sequence from={330} durationInFrames={135}><Footage src="promo-video/scene-couple.mp4" headline="Found in seconds." /></Sequence>
    <Sequence from={465} durationInFrames={150}><Categories /></Sequence>
    <Sequence from={615} durationInFrames={135}><EndCard /></Sequence>
  </AbsoluteFill>
);
