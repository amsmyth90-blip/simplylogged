import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';
const blue = '#2f64c5';

const BrandBug: React.FC = () => (
  <div style={{position: 'absolute', top: 78, left: 66, display: 'flex', alignItems: 'center', gap: 16}}>
    <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 62, height: 62, objectFit: 'contain'}} />
    <div style={{color: 'white', fontSize: 30, fontWeight: 900, letterSpacing: 2.5, textShadow: '0 3px 16px rgba(0,0,0,.35)'}}>LIFEDOCK</div>
  </div>
);

const Footage: React.FC<{src: string; children?: React.ReactNode; darken?: number}> = ({src, children, darken = 0.3}) => (
  <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
    <Video src={staticFile(src)} muted objectFit="cover" style={{width: '100%', height: '100%'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(3,18,42,' + darken + '),rgba(3,18,42,.04) 42%,rgba(3,18,42,.62))'}} />
    <BrandBug />
    {children}
  </AbsoluteFill>
);

const CountdownHook: React.FC = () => {
  const frame = useCurrentFrame();
  const seconds = Math.max(7, 10 - Math.floor(frame / 30));
  const progress = interpolate(frame, [0, 120], [1, 0.7], {extrapolateRight: 'clamp'});
  const circumference = 2 * Math.PI * 142;
  const intro = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return (
    <Footage src="promo-video/scene-paperwork.mp4" darken={0.44}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: intro}}>
        <div style={{position: 'relative', width: 330, height: 330, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width="330" height="330" viewBox="0 0 330 330" style={{position: 'absolute', rotate: '-90deg'}}>
            <circle cx="165" cy="165" r="142" fill="rgba(8,45,97,.58)" stroke="rgba(255,255,255,.22)" strokeWidth="18" />
            <circle cx="165" cy="165" r="142" fill="none" stroke="#68d4da" strokeWidth="18" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
          </svg>
          <div style={{color: 'white', fontSize: 176, lineHeight: 1, fontWeight: 900, textShadow: '0 7px 28px rgba(0,0,0,.38)'}}>{seconds}</div>
        </div>
        <div style={{color: 'white', fontSize: 88, lineHeight: 1.04, fontWeight: 900, textAlign: 'center', marginTop: 54, padding: '0 86px', textShadow: '0 5px 24px rgba(0,0,0,.42)'}}>Could you find it?</div>
      </div>
    </Footage>
  );
};

const InfoChallenge: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [['Home insurance', 'Policy document', '🛡️'], ['Dentist details', 'Contact and address', '🦷'], ['Car MOT', 'Renewal date', '🚗']];
  return (
    <Footage src="promo-video/scene-couple.mp4" darken={0.38}>
      <div style={{position: 'absolute', left: 68, right: 68, bottom: 138, display: 'flex', flexDirection: 'column', gap: 22}}>
        {items.map(([title, detail, icon], index) => {
          const start = 8 + index * 18;
          return (
            <div key={title} style={{display: 'flex', alignItems: 'center', gap: 24, padding: '26px 28px', borderRadius: 28, background: 'rgba(255,255,255,.94)', boxShadow: '0 18px 54px rgba(0,0,0,.22)', opacity: interpolate(frame, [start, start + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), translate: interpolate(frame, [start, start + 10], [48, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + 'px 0'}}>
              <div style={{width: 86, height: 86, borderRadius: 24, background: '#eaf2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42}}>{icon}</div>
              <div><div style={{color: navy, fontSize: 43, fontWeight: 880}}>{title}</div><div style={{color: '#58708d', fontSize: 29, marginTop: 5}}>{detail}</div></div>
            </div>
          );
        })}
      </div>
    </Footage>
  );
};

const SnapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [5, 16, 128, 144], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
      <Video src={staticFile('promo-video/scene-document-photo.mp4')} trimBefore={120} muted objectFit="cover" style={{width: '100%', height: '100%'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(3,18,42,.3),rgba(3,18,42,.04) 42%,rgba(3,18,42,.62))'}} />
      <BrandBug />
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 145, color: 'white', fontSize: 92, lineHeight: 1.02, fontWeight: 900, opacity, textShadow: '0 5px 28px rgba(0,0,0,.45)'}}>Snap it once.</div>
    </AbsoluteFill>
  );
};

const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const query = 'Home insurance'.slice(0, Math.floor(interpolate(frame, [18, 82], [0, 14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  const resultOpacity = interpolate(frame, [86, 102], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(155deg,#eef6ff,#f8f2ff)', padding: '105px 70px 90px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}><Img src={staticFile('brand/lifedock-mark.png')} style={{width: 86, height: 86, objectFit: 'contain'}} /><div style={{fontSize: 42, color: navy, fontWeight: 900, letterSpacing: 3}}>LIFEDOCK</div></div>
      <div style={{marginTop: 164, color: navy, fontSize: 84, lineHeight: 1.03, fontWeight: 900}}>Find it<br />in seconds.</div>
      <div style={{marginTop: 78, height: 116, borderRadius: 31, background: 'white', boxShadow: '0 22px 62px rgba(33,73,130,.16)', display: 'flex', alignItems: 'center', padding: '0 34px', gap: 24}}><div style={{fontSize: 48, color: blue}}>⌕</div><div style={{fontSize: 40, color: navy, fontWeight: 740}}>{query}</div><div style={{width: 4, height: 46, background: blue, opacity: frame % 20 < 10 ? 1 : 0}} /></div>
      <div style={{marginTop: 34, borderRadius: 34, background: 'white', padding: '34px 32px', display: 'flex', alignItems: 'center', gap: 26, opacity: resultOpacity, translate: '0 ' + interpolate(frame, [86, 106], [30, 0], {extrapolateRight: 'clamp'}) + 'px', boxShadow: '0 18px 54px rgba(33,73,130,.13)'}}>
        <div style={{width: 94, height: 94, borderRadius: 24, background: '#eaf2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 49}}>📄</div>
        <div style={{flex: 1}}><div style={{fontSize: 39, color: navy, fontWeight: 860}}>Home insurance policy</div><div style={{fontSize: 29, color: '#57708d', marginTop: 8}}>Current policy · Safely stored</div></div>
        <div style={{width: 58, height: 58, borderRadius: 99, background: '#27a878', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900}}>✓</div>
      </div>
    </AbsoluteFill>
  );
};

const ReliefScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Footage src="promo-video/scene-morning.mp4" darken={0.23}>
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 145, color: 'white', fontSize: 86, lineHeight: 1.06, fontWeight: 900, opacity: interpolate(frame, [5, 18], [0, 1], {extrapolateRight: 'clamp'}), textShadow: '0 5px 28px rgba(0,0,0,.42)'}}>Less searching.<br />Less stress.</div>
    </Footage>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  const rise = interpolate(frame, [0, 20], [30, 0], {extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 76, opacity}}>
      <div style={{translate: '0 ' + rise + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 250, height: 250, objectFit: 'contain'}} />
        <div style={{fontSize: 108, fontWeight: 900, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>LIFEDOCK</div>
        <div style={{color: navy, fontSize: 68, lineHeight: 1.08, fontWeight: 880, marginTop: 62}}>Your life, organised.</div>
        <div style={{color: '#3c5680', fontSize: 35, lineHeight: 1.32, marginTop: 30}}>One secure digital home<br />for everyday life.</div>
      </div>
    </AbsoluteFill>
  );
};

export const LifeDockTenSecondChallengePromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Audio src={staticFile('promo-video/lifedock-challenge-countdown.wav')} volume={0.19} />
    <Sequence from={8} durationInFrames={712}><Audio src={staticFile('promo-video/lifedock-ten-second-challenge-emily-ni.mp3')} volume={1} /></Sequence>
    <Sequence durationInFrames={120}><CountdownHook /></Sequence>
    <Sequence from={120} durationInFrames={150}><InfoChallenge /></Sequence>
    <Sequence from={270} durationInFrames={150}><SnapScene /></Sequence>
    <Sequence from={420} durationInFrames={165}><SearchScene /></Sequence>
    <Sequence from={498} durationInFrames={40}><Audio src={staticFile('promo-video/ding.wav')} volume={0.2} /></Sequence>
    <Sequence from={585} durationInFrames={135}><ReliefScene /></Sequence>
    <Sequence from={720} durationInFrames={120}><EndCard /></Sequence>
  </AbsoluteFill>
);
