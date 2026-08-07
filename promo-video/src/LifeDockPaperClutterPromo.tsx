import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const navy = '#082d61';

const FilmShot: React.FC<{src: string; startFrom?: number; landscapeInPortrait?: boolean; playbackRate?: number; zoom?: number}> = ({
  src,
  startFrom = 0,
  landscapeInPortrait = false,
  playbackRate = 1,
  zoom = 1,
}) => (
  <AbsoluteFill style={{background: navy, overflow: 'hidden'}}>
    <Video
      src={staticFile(src)}
      trimBefore={startFrom}
      playbackRate={playbackRate}
      muted
      objectFit="cover"
      style={{
        width: '100%',
        height: '100%',
        objectPosition: landscapeInPortrait ? '48% center' : 'center',
        scale: zoom,
        transformOrigin: 'bottom center',
      }}
    />
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(4,20,45,.10),transparent 56%,rgba(4,20,45,.30))'}} />
    <div style={{position: 'absolute', top: 74, left: 58, display: 'flex', alignItems: 'center', gap: 16}}>
      <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 62, height: 62, objectFit: 'contain'}} />
      <div style={{color: 'white', fontSize: 30, fontWeight: 850, letterSpacing: 2.6, textShadow: '0 3px 14px rgba(0,0,0,.35)'}}>DIARYDOCK</div>
    </div>
  </AbsoluteFill>
);

const AppointmentCreated: React.FC = () => {
  const frame = useCurrentFrame();
  const cardOpacity = interpolate(frame, [0, 10, 80, 89], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardScale = interpolate(frame, [0, 14], [0.93, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const checkScale = interpolate(frame, [22, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: 'linear-gradient(150deg,#eaf6ff 0%,#f7f2ff 58%,#eef8f4 100%)', padding: '112px 70px', fontFamily: 'Arial, Helvetica, sans-serif'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 88, height: 88, objectFit: 'contain'}} />
        <div style={{fontSize: 42, color: navy, fontWeight: 850, letterSpacing: 3}}>DIARYDOCK</div>
      </div>

      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: '100%', background: 'white', borderRadius: 40, padding: '62px 52px', boxShadow: '0 28px 80px rgba(24,66,122,.17)', opacity: cardOpacity, scale: cardScale}}>
          <div style={{width: 132, height: 132, borderRadius: 999, margin: '0 auto', background: 'linear-gradient(135deg,#2f77cf,#7968e8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 76, fontWeight: 900, scale: checkScale}}>✓</div>
          <div style={{textAlign: 'center', color: navy, fontSize: 69, lineHeight: 1.04, fontWeight: 880, marginTop: 40}}>Appointment<br />created</div>
          <div style={{height: 2, background: '#e7edf6', margin: '48px 0'}} />
          <div style={{display: 'flex', gap: 26, alignItems: 'center'}}>
            <div style={{width: 116, height: 116, borderRadius: 26, background: '#eaf2ff', color: '#2f64c5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{fontSize: 25, fontWeight: 800}}>OCT</div>
              <div style={{fontSize: 48, lineHeight: 1, fontWeight: 900}}>14</div>
            </div>
            <div style={{flex: 1}}>
              <div style={{color: navy, fontSize: 39, fontWeight: 820}}>Family appointment</div>
              <div style={{color: '#516985', fontSize: 31, marginTop: 10}}>10:30 AM · Details safely stored</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{textAlign: 'center', color: '#48617f', fontSize: 34, lineHeight: 1.3, fontWeight: 650}}>From letter to calendar<br />in one quick photo.</div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const rise = interpolate(frame, [0, 18], [34, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 72, opacity}}>
      <div style={{translate: `0 ${rise}px`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 250, height: 250, objectFit: 'contain'}} />
        <div style={{fontSize: 110, fontWeight: 850, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>DIARYDOCK</div>
        <div style={{color: navy, fontSize: 62, lineHeight: 1.08, fontWeight: 850, marginTop: 66}}>No paper clutter.<br />No missed dates.</div>
        <div style={{color: '#3c5680', fontSize: 36, lineHeight: 1.32, marginTop: 34}}>Your digital home<br />for everyday life.</div>
        <div style={{background: '#2f64c5', color: 'white', borderRadius: 999, padding: '22px 46px', fontSize: 33, fontWeight: 780, marginTop: 68}}>Snap it. Store it. Done.</div>
      </div>
    </AbsoluteFill>
  );
};

export const LifeDockPaperClutterPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
    <Audio src={staticFile('promo-video/lifedock-paper-bright.wav')} volume={0.18} />
    <Audio src={staticFile('promo-video/diarydock-paper-clutter-sheena-ni.mp3')} volume={1} />

    <Sequence durationInFrames={30}>
      <FilmShot src="promo-video/paper-addressed-arrival.mp4" startFrom={15} />
    </Sequence>
    <Sequence from={30} durationInFrames={30}>
      <FilmShot src="promo-video/paper-small-pickup.mp4" playbackRate={0.6} />
    </Sequence>
    <Sequence from={60} durationInFrames={120}>
      <FilmShot src="promo-video/paper-small-pickup.mp4" startFrom={60} playbackRate={1.5} />
    </Sequence>
    <Sequence from={180} durationInFrames={45}>
      <FilmShot src="promo-video/paper-addressed-open.mp4" startFrom={15} playbackRate={0.9} />
    </Sequence>
    <Sequence from={225} durationInFrames={240}>
      <FilmShot src="promo-video/paper-scan-recycle.mp4" playbackRate={0.875} />
    </Sequence>
    <Sequence from={443} durationInFrames={35}>
      <Audio src={staticFile('promo-video/shutter-modern.wav')} volume={0.4} />
    </Sequence>
    <Sequence from={465} durationInFrames={90}>
      <AppointmentCreated />
    </Sequence>
    <Sequence from={497} durationInFrames={80}>
      <Audio src={staticFile('promo-video/ding.wav')} volume={0.28} />
    </Sequence>
    <Sequence from={555} durationInFrames={105}>
      <FilmShot src="promo-video/paper-scan-recycle.mp4" startFrom={240} playbackRate={0.55} />
    </Sequence>
    <Sequence from={660} durationInFrames={150}>
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);
