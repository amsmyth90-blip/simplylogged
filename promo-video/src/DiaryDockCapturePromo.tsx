import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';

const navy = '#0a2f67';
const blue = '#2f65c5';
const pale = '#f4f7fc';

const CaptureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14, 280, 300], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>
    <Video src={staticFile('promo-video/scene-document-photo.mp4')} muted objectFit="cover" style={{width: '100%', height: '100%', scale: 1.1}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,25,55,.72), transparent 48%, rgba(6,25,55,.75))'}} />
    <div style={{position: 'absolute', top: 130, left: 74, right: 74, color: 'white'}}>
      <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase'}}>See it. Snap it.</div>
      <div style={{fontSize: 82, lineHeight: 1.03, fontWeight: 800, marginTop: 18}}>DiaryDock does the organising.</div>
    </div>
    <div style={{position: 'absolute', bottom: 120, left: 74, right: 74, color: 'white', fontSize: 36, fontWeight: 650}}>Take a photo of an important document.</div>
  </AbsoluteFill>;
};

const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const phoneEnter = spring({frame, fps, config: {damping: 18, stiffness: 110}});
  const found = spring({frame: frame - 52, fps, config: {damping: 15, stiffness: 120}});
  const event = spring({frame: frame - 105, fps, config: {damping: 16, stiffness: 115}});
  const pulse = interpolate(frame % 45, [0, 22, 45], [1, 1.035, 1], {easing: Easing.inOut(Easing.ease)});
  return <AbsoluteFill style={{background: 'linear-gradient(155deg, #eef5ff 0%, #f8f5ff 52%, #edf9f8 100%)', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{position: 'absolute', top: 105, left: 70, right: 70, textAlign: 'center'}}>
      <div style={{fontSize: 31, color: blue, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase'}}>DiaryDock found the important date</div>
      <div style={{fontSize: 70, color: navy, fontWeight: 820, marginTop: 18, lineHeight: 1.05}}>Your reminder is ready.</div>
    </div>
    <div style={{width: 820, height: 1120, borderRadius: 76, background: '#0d1d36', padding: 20, boxShadow: '0 35px 90px rgba(29,54,98,.26)', transform: `translateY(${(1 - phoneEnter) * 100}px) scale(${.92 + phoneEnter * .08})`, opacity: phoneEnter}}>
      <div style={{height: '100%', borderRadius: 58, overflow: 'hidden', background: pale, position: 'relative'}}>
        <div style={{height: 126, background: 'white', display: 'flex', alignItems: 'center', padding: '0 42px', gap: 20, borderBottom: '1px solid #dce5f1'}}>
          <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 70, height: 70, objectFit: 'contain'}} />
          <div><div style={{fontSize: 31, fontWeight: 820, color: navy}}>DiaryDock</div><div style={{fontSize: 21, color: '#6a7890'}}>Your digital home</div></div>
        </div>
        <div style={{padding: '44px 42px'}}>
          <div style={{opacity: found, transform: `translateY(${(1 - found) * 25}px)`, background: 'white', borderRadius: 32, padding: 34, boxShadow: '0 15px 45px rgba(37,74,126,.12)'}}>
            <div style={{fontSize: 24, color: '#65748b', fontWeight: 700}}>DOCUMENT CAPTURED</div>
            <div style={{fontSize: 42, color: '#17243c', fontWeight: 820, marginTop: 15}}>Home insurance</div>
            <div style={{display: 'flex', marginTop: 28, gap: 18}}><div style={{fontSize: 42}}>📅</div><div><div style={{fontSize: 23, color: '#728097'}}>Renewal date</div><div style={{fontSize: 30, color: navy, fontWeight: 780}}>15 August 2026</div></div></div>
          </div>
          <div style={{opacity: event, transform: `translateY(${(1 - event) * 30}px) scale(${pulse})`, marginTop: 34, background: blue, color: 'white', borderRadius: 32, padding: 34, boxShadow: '0 18px 50px rgba(47,101,197,.28)'}}>
            <div style={{fontSize: 24, opacity: .8, fontWeight: 750}}>CALENDAR REMINDER CREATED</div>
            <div style={{fontSize: 38, fontWeight: 820, marginTop: 13}}>Renew home insurance</div>
            <div style={{fontSize: 27, marginTop: 12, opacity: .9}}>15 August · 9:00 AM</div>
          </div>
        </div>
        <div style={{position: 'absolute', left: 42, right: 42, bottom: 45, display: 'flex', justifyContent: 'space-around', color: '#74839a', fontSize: 22, fontWeight: 700}}><span>Home</span><span style={{color: blue}}>Calendar</span><span>Vault</span><span>Family</span></div>
      </div>
    </div>
  </AbsoluteFill>;
};

const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: '#f7f8fb', opacity}}><Img src={staticFile('brand/diarydock-video-end-card.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></AbsoluteFill>;
};

export const DiaryDockCapturePromo: React.FC = () => <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: navy}}>
  <Sequence durationInFrames={300}><CaptureScene /></Sequence>
  <Sequence from={300} durationInFrames={300}><CalendarScene /></Sequence>
  <Sequence from={600} durationInFrames={180}><EndScene /></Sequence>
</AbsoluteFill>;
