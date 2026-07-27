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
import {Audio, Video} from '@remotion/media';

const ink = '#18302d';
const moss = '#557c64';
const cream = '#f6f1e7';

const PhotoScene: React.FC<{
  video: string;
  eyebrow: string;
  headline: string;
  children: React.ReactNode;
}> = ({video, eyebrow, headline, children}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 15, 185, 210], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const move = interpolate(frame, [0, 210], [-20, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });
  return (
    <AbsoluteFill style={{opacity: fade, backgroundColor: ink}}>
      <Video
        src={staticFile(video)}
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          scale: 1.07,
          translate: `0 ${move}px`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(17,35,33,.7) 0%, rgba(17,35,33,.04) 37%, rgba(17,35,33,.02) 55%, rgba(17,35,33,.78) 100%)',
        }}
      />
      <div style={{position: 'absolute', top: 132, left: 82, right: 82}}>
        <div style={{fontSize: 32, fontWeight: 700, color: '#d9e5d6', letterSpacing: 2.5, textTransform: 'uppercase'}}>
          {eyebrow}
        </div>
        <div style={{fontSize: 86, lineHeight: 1.04, fontWeight: 750, color: 'white', marginTop: 20, letterSpacing: -3}}>
          {headline}
        </div>
      </div>
      <div style={{position: 'absolute', left: 82, right: 82, bottom: 128}}>{children}</div>
    </AbsoluteFill>
  );
};

const AppCard: React.FC<{icon: string; title: string; detail: string; accent?: string}> = ({icon, title, detail, accent = moss}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [18, 42], [70, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  const opacity = interpolate(frame, [15, 35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{opacity, translate: `0 ${enter}px`, background: 'rgba(255,255,255,.93)', borderRadius: 42, padding: '32px 34px', display: 'flex', gap: 24, alignItems: 'center', boxShadow: '0 22px 70px rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.7)'}}>
      <div style={{width: 78, height: 78, borderRadius: 24, background: accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, flexShrink: 0}}>{icon}</div>
      <div>
        <div style={{fontSize: 39, fontWeight: 760, color: ink, lineHeight: 1.1}}>{title}</div>
        <div style={{fontSize: 29, color: '#536460', marginTop: 8, lineHeight: 1.25}}>{detail}</div>
      </div>
    </div>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(frame, [0, 30], [.97, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <AbsoluteFill style={{background: '#f7f8fb', opacity, overflow: 'hidden'}}>
      <Img
        src={staticFile('brand/lifedock-video-end-card.png')}
        style={{width: '100%', height: '100%', objectFit: 'cover', scale}}
      />
    </AbsoluteFill>
  );
};

export const LifeDockPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: ink}}>
    <Audio src={staticFile('promo-video/amy-final-voice-isolated.mp3')} volume={1} />
    <Sequence durationInFrames={210}>
      <PhotoScene video="promo-video/scene-morning.mp4" eyebrow="Life is full of details" headline="Keep today running smoothly.">
        <AppCard icon="✓" title="Boiler service" detail="Today at 10:30 · Kitchen" accent="#c4784b" />
      </PhotoScene>
    </Sequence>
    <Sequence from={210} durationInFrames={210}>
      <PhotoScene video="promo-video/scene-paperwork.mp4" eyebrow="Documents. Reminders. Household details." headline="One digital home for it all.">
        <AppCard icon="▤" title="Home insurance" detail="Stored safely · Updated today" />
      </PhotoScene>
    </Sequence>
    <Sequence from={420} durationInFrames={210}>
      <PhotoScene video="promo-video/scene-couple.mp4" eyebrow="And if tomorrow changed everything..." headline="They would know what to do.">
        <AppCard icon="⌂" title="This week" detail="3 household tasks · Shared" accent="#4c7a83" />
      </PhotoScene>
    </Sequence>
    <Sequence from={630} durationInFrames={270}>
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
