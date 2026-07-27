import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';

const SceneShot: React.FC<{src: string; startFrom?: number; playbackRate?: number; zoom?: number; showBadge?: boolean}> = ({
  src,
  startFrom = 0,
  playbackRate = 1,
  zoom = 1,
  showBadge = true,
}) => (
  <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
    <Video
      src={staticFile(src)}
      trimBefore={startFrom}
      playbackRate={playbackRate}
      muted
      objectFit="cover"
      style={{width: '100%', height: '100%', scale: zoom, transformOrigin: 'center'}}
    />
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(4,20,45,.14),transparent 46%,rgba(4,20,45,.38))'}} />
    {showBadge && (
      <div style={{position: 'absolute', top: 74, left: 58, display: 'flex', alignItems: 'center', gap: 16}}>
        <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 62, height: 62, objectFit: 'contain'}} />
        <div style={{color: 'white', fontSize: 30, fontWeight: 850, letterSpacing: 2.6, textShadow: '0 3px 14px rgba(0,0,0,.35)'}}>LIFEDOCK</div>
      </div>
    )}
  </AbsoluteFill>
);

const StoryCaption: React.FC<{children: React.ReactNode; from: number; to: number}> = ({children, from, to}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + 8, to - 8, to], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'absolute', left: 58, right: 58, bottom: 140, display: 'flex', justifyContent: 'center', opacity}}>
      <div style={{background: 'rgba(4,20,45,.82)', color: 'white', borderRadius: 24, padding: '20px 30px', fontSize: 44, lineHeight: 1.2, fontWeight: 720, textAlign: 'center', boxShadow: '0 12px 38px rgba(0,0,0,.24)'}}>
        {children}
      </div>
    </div>
  );
};

const GuardianGlowShot: React.FC = () => {
  const frame = useCurrentFrame();
  // motivated colour ramp: cool white -> warm amber, mirrors the phone's on-screen turn
  const warmth = interpolate(frame, [0, 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const glowOpacity = interpolate(frame, [10, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const textOpacity = interpolate(frame, [50, 62, 100, 112], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(8,45,97,${1 - warmth * 0.3}), rgba(30,20,10,${0.2 + warmth * 0.4}))`, overflow: 'hidden'}}>
      <Video
        src={staticFile('promo-video/things-phone-glow.mp4')}
        muted
        objectFit="cover"
        style={{width: '100%', height: '100%', filter: `saturate(${1 + warmth * 0.2})`}}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 55%, rgba(255,186,110,${glowOpacity * 0.35}), transparent 60%)`,
        }}
      />
      <div style={{position: 'absolute', bottom: 200, left: 0, right: 0, textAlign: 'center', opacity: textOpacity}}>
        <div style={{display: 'inline-block', color: 'white', fontSize: 40, fontWeight: 600, letterSpacing: 1, fontStyle: 'italic', textShadow: '0 3px 16px rgba(0,0,0,.4)'}}>
          Guardian is here.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  const rise = interpolate(frame, [0, 20], [34, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 72, opacity}}>
      <div style={{translate: `0 ${rise}px`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Img src={staticFile('brand/lifedock-mark.png')} style={{width: 250, height: 250, objectFit: 'contain'}} />
        <div style={{fontSize: 108, fontWeight: 850, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>LIFEDOCK</div>
        <div style={{color: navy, fontSize: 70, lineHeight: 1.08, fontWeight: 850, marginTop: 60}}>Your life.<br />Organised.</div>
      </div>
    </AbsoluteFill>
  );
};

export const LifeDockThingsThatMatterPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    {/* Reusing the existing warm bed as a placeholder; swap in a dedicated sparse-piano cue once composed */}
    <Audio src={staticFile('promo-video/lifedock-family-warm.wav')} volume={0.16} />
    {/* Neil's narration - drop the ElevenLabs "Neil - Calming and Melodic" render in at this path */}
    <Audio src={staticFile('promo-video/things-that-matter-voice-neil.mp3')} volume={1} />

    {/* 0:00-0:03 - cold open, rain on the window, no VO */}
    <Sequence durationInFrames={90}>
      <SceneShot src="promo-video/things-rain-window.mp4" showBadge={false} />
    </Sequence>

    {/* 0:03-0:08 - the drawer full of things we promise never to forget */}
    <Sequence from={90} durationInFrames={150}>
      <SceneShot src="promo-video/things-drawer-search.mp4" />
      <StoryCaption from={90} to={240}>There are things in life we promise ourselves we&apos;ll never forget.</StoryCaption>
    </Sequence>

    {/* 0:08-0:14 - quick montage: photograph / child's hand / leash / medicine bottle */}
    <Sequence from={240} durationInFrames={45}>
      <SceneShot src="promo-video/things-photograph.mp4" zoom={1.04} />
    </Sequence>
    <Sequence from={285} durationInFrames={45}>
      <SceneShot src="promo-video/things-child-hand.mp4" zoom={1.04} />
    </Sequence>
    <Sequence from={330} durationInFrames={45}>
      <SceneShot src="promo-video/things-leash-hallway.mp4" />
    </Sequence>
    <Sequence from={375} durationInFrames={45}>
      <SceneShot src="promo-video/things-medicine-bottle.mp4" zoom={1.05} />
      <StoryCaption from={240} to={420}>Where the deed is kept. What medication she takes. The vet&apos;s number... saved somewhere, we hope.</StoryCaption>
    </Sequence>

    {/* 0:14-0:17 - life doesn't wait for a good time to ask */}
    <Sequence from={420} durationInFrames={90}>
      <SceneShot src="promo-video/things-phone-ringing.mp4" />
      <StoryCaption from={420} to={510}>Life doesn&apos;t wait for a good time to ask.</StoryCaption>
    </Sequence>

    {/* 0:17-0:21 - the warm turn: Guardian arrives as light, not an app */}
    <Sequence from={510} durationInFrames={120}>
      <GuardianGlowShot />
      <StoryCaption from={510} to={630}>But what if something remembered, so you didn&apos;t have to?</StoryCaption>
    </Sequence>
    <Sequence from={563} durationInFrames={40}>
      <Audio src={staticFile('promo-video/ding.wav')} volume={0.22} />
    </Sequence>

    {/* 0:21-0:25 - the exhale */}
    <Sequence from={630} durationInFrames={120}>
      <SceneShot src="promo-video/things-exhale.mp4" />
      <StoryCaption from={630} to={750}>Meet Guardian. The quiet intelligence behind LifeDock.</StoryCaption>
    </Sequence>

    {/* 0:25-0:29 - golden hour, family, belonging */}
    <Sequence from={750} durationInFrames={120}>
      <SceneShot src="promo-video/things-family-kitchen.mp4" />
      <StoryCaption from={750} to={870}>A home for your documents, your family, your history - held safely. Always within reach.</StoryCaption>
    </Sequence>

    {/* 0:29-0:31 - the closing door, safety, quiet finality */}
    <Sequence from={870} durationInFrames={60}>
      <SceneShot src="promo-video/things-closing-door.mp4" showBadge={false} />
    </Sequence>

    {/* 0:31-0:36 - logo reveal and closing line */}
    <Sequence from={930} durationInFrames={150}>
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
