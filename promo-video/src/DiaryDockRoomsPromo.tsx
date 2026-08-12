import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

const navy = '#092f63';
const ink = '#173b68';
const muted = '#627693';

type Room = {name: string; label: string; detail: string; icon: string; colour: string; tint: string};

const rooms: Room[] = [
  {name: 'Garage', label: 'Vehicle records', detail: 'MOT and insurance', icon: '🚗', colour: '#3478d4', tint: '#e8f2ff'},
  {name: 'Bedroom', label: 'Health details', detail: 'Important information', icon: '♡', colour: '#a25bb2', tint: '#f8eafa'},
  {name: 'Office', label: 'Legal documents', detail: 'Protected and organised', icon: '▤', colour: '#5269cc', tint: '#eceeff'},
  {name: 'Garden', label: 'Pet records', detail: 'Care details close by', icon: '🐾', colour: '#31966f', tint: '#e7f7ef'},
  {name: 'Attic', label: 'Family memories', detail: 'Saved for the future', icon: '✦', colour: '#dc8b35', tint: '#fff2df'},
];

const BrandHeader: React.FC = () => (
  <div style={{position: 'absolute', top: 64, left: 60, right: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
      <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 62, height: 62, objectFit: 'contain'}} />
      <div style={{fontSize: 29, color: navy, fontWeight: 900, letterSpacing: 2.8}}>DIARYDOCK</div>
    </div>
    <div style={{fontSize: 25, color: muted, fontWeight: 700}}>YOUR DIGITAL HOME</div>
  </div>
);

const HouseOutline: React.FC<{opacity?: number}> = ({opacity = 1}) => (
  <svg viewBox="0 0 1000 1250" style={{position: 'absolute', width: 980, height: 1270, left: 50, top: 300, opacity}}>
    <path d="M90 535 L500 155 L910 535 L910 1110 Q910 1150 870 1150 L130 1150 Q90 1150 90 1110 Z" fill="rgba(255,255,255,.64)" stroke="rgba(56,104,172,.20)" strokeWidth="8" strokeLinejoin="round" />
    <path d="M50 545 L500 125 L950 545" fill="none" stroke="rgba(47,100,197,.22)" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({frame, fps, config: {damping: 18, stiffness: 95}});
  const line = interpolate(frame, [15, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(155deg,#f7fbff 0%,#eef3ff 50%,#faf4ff 100%)', overflow: 'hidden'}}>
      <BrandHeader />
      <div style={{position: 'absolute', width: 730, height: 730, borderRadius: 999, background: 'rgba(101,206,209,.14)', top: 480, left: 175, filter: 'blur(18px)', scale: 0.8 + entrance * 0.2}} />
      <HouseOutline opacity={line} />
      <div style={{position: 'absolute', left: 76, right: 76, top: 190, textAlign: 'center', opacity: entrance, translate: '0 ' + (34 - entrance * 34) + 'px'}}>
        <div style={{fontSize: 84, lineHeight: 1.02, color: navy, fontWeight: 900}}>Your life already<br />has rooms.</div>
        <div style={{fontSize: 38, color: muted, marginTop: 30, fontWeight: 650}}>Now your information can too.</div>
      </div>
      <div style={{position: 'absolute', left: 260, right: 260, top: 760, height: 350, borderRadius: '180px 180px 34px 34px', border: '10px solid rgba(47,100,197,.22)', background: 'rgba(255,255,255,.58)', opacity: line}}>
        <div style={{position: 'absolute', left: '50%', top: 85, width: 110, height: 255, translate: '-50% 0', borderRadius: '58px 58px 12px 12px', background: 'linear-gradient(180deg,#5e8dd6,#315fae)'}} />
      </div>
    </AbsoluteFill>
  );
};

const RoomCard: React.FC<{room: Room; index: number; active: boolean; frame: number}> = ({room, index, active, frame}) => {
  const reveal = interpolate(frame, [index * 4, index * 4 + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const x = index % 2;
  const y = Math.floor(index / 2);
  const isLast = index === 4;
  return (
    <div style={{position: 'absolute', left: isLast ? 245 : 58 + x * 486, top: 510 + y * 300, width: isLast ? 590 : 430, height: 240, borderRadius: 36, background: active ? 'white' : 'rgba(255,255,255,.66)', border: '5px solid ' + (active ? room.colour : 'rgba(111,143,185,.13)'), boxShadow: active ? '0 28px 70px ' + room.colour + '35' : '0 13px 35px rgba(34,72,122,.08)', opacity: reveal, scale: active ? 1.035 : 0.96, translate: '0 ' + (28 - reveal * 28) + 'px', padding: '28px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 19}}>
        <div style={{width: 74, height: 74, borderRadius: 23, display: 'flex', alignItems: 'center', justifyContent: 'center', background: room.tint, color: room.colour, fontSize: room.icon === '♡' ? 54 : 38, fontWeight: 900}}>{room.icon}</div>
        <div style={{fontSize: 37, color: ink, fontWeight: 900}}>{room.name}</div>
      </div>
      <div>
        <div style={{fontSize: 27, color: active ? room.colour : muted, fontWeight: 850}}>{room.label}</div>
        <div style={{fontSize: 23, color: muted, marginTop: 5}}>{room.detail}</div>
      </div>
    </div>
  );
};

const RoomTourScene: React.FC<{activeIndex: number}> = ({activeIndex}) => {
  const frame = useCurrentFrame();
  const room = rooms[activeIndex];
  const entrance = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(155deg,#f7fbff,#f1f5fd 58%,#fbf5ff)', overflow: 'hidden'}}>
      <BrandHeader />
      <HouseOutline opacity={0.36} />
      <div style={{position: 'absolute', top: 165, left: 64, right: 64, opacity: entrance, translate: '0 ' + (25 - entrance * 25) + 'px'}}>
        <div style={{fontSize: 25, color: room.colour, fontWeight: 900, letterSpacing: 3.5}}>A PLACE FOR EVERYTHING</div>
        <div style={{fontSize: 74, lineHeight: 1.04, color: navy, fontWeight: 900, marginTop: 18}}>{room.name}</div>
        <div style={{fontSize: 37, color: muted, marginTop: 14, fontWeight: 650}}>{room.detail}</div>
      </div>
      {rooms.map((item, index) => <RoomCard key={item.name} room={item} index={index} active={index === activeIndex} frame={frame} />)}
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 92, display: 'flex', gap: 12}}>
        {rooms.map((item, index) => <div key={item.name} style={{height: 8, borderRadius: 99, flex: 1, background: index <= activeIndex ? item.colour : '#dce4ef'}} />)}
      </div>
    </AbsoluteFill>
  );
};

const OverviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 16, stiffness: 95}});
  return (
    <AbsoluteFill style={{background: 'linear-gradient(155deg,#eef7ff,#f4f0ff)', overflow: 'hidden'}}>
      <BrandHeader />
      <HouseOutline opacity={0.62} />
      <div style={{position: 'absolute', top: 170, left: 68, right: 68, textAlign: 'center', opacity: pop, translate: '0 ' + (32 - pop * 32) + 'px'}}>
        <div style={{fontSize: 77, color: navy, fontWeight: 900, lineHeight: 1.04}}>Everything has<br />a place.</div>
        <div style={{fontSize: 36, color: muted, marginTop: 27, fontWeight: 650}}>So everyone knows where to look.</div>
      </div>
      <div style={{position: 'absolute', top: 635, left: 135, right: 135, padding: '48px 46px', borderRadius: 48, background: 'rgba(255,255,255,.92)', boxShadow: '0 30px 90px rgba(29,67,121,.15)', scale: 0.9 + pop * 0.1}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}>
          {rooms.map((room, i) => (
            <div key={room.name} style={{gridColumn: i === 4 ? '1 / 3' : undefined, height: 124, borderRadius: 30, background: room.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, color: room.colour, fontSize: 31, fontWeight: 900}}>
              <span style={{fontSize: 34}}>{room.icon}</span>{room.name}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  const rise = interpolate(frame, [0, 20], [30, 0], {extrapolateRight: 'clamp', easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <AbsoluteFill style={{background: '#f3f6fc', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 76, opacity}}>
      <div style={{translate: '0 ' + rise + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Img src={staticFile('brand/diarydock-mark.png')} style={{width: 250, height: 250, objectFit: 'contain'}} />
        <div style={{fontSize: 108, fontWeight: 900, letterSpacing: 8, marginTop: 28, background: 'linear-gradient(90deg,#06336d,#477dd1,#8a62e8)', WebkitBackgroundClip: 'text', color: 'transparent'}}>DIARYDOCK</div>
        <div style={{color: navy, fontSize: 68, lineHeight: 1.08, fontWeight: 880, marginTop: 62}}>Your life, organised.</div>
        <div style={{color: '#3c5680', fontSize: 35, lineHeight: 1.32, marginTop: 30}}>One secure digital home<br />for everyday life.</div>
      </div>
    </AbsoluteFill>
  );
};

export const DiaryDockRoomsPromo: React.FC = () => (
  <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: '#f3f6fc'}}>
    <Audio src={staticFile('promo-video/diarydock-rooms-home-tour.wav')} volume={0.2} />
    <Sequence from={8} durationInFrames={742}><Audio src={staticFile('promo-video/diarydock-rooms-laura-ni.mp3')} volume={1} /></Sequence>
    <Sequence durationInFrames={90}><IntroScene /></Sequence>
    <Sequence from={90} durationInFrames={120}><RoomTourScene activeIndex={0} /></Sequence>
    <Sequence from={210} durationInFrames={105}><RoomTourScene activeIndex={1} /></Sequence>
    <Sequence from={315} durationInFrames={105}><RoomTourScene activeIndex={2} /></Sequence>
    <Sequence from={420} durationInFrames={105}><RoomTourScene activeIndex={3} /></Sequence>
    <Sequence from={525} durationInFrames={105}><RoomTourScene activeIndex={4} /></Sequence>
    <Sequence from={630} durationInFrames={150}><OverviewScene /></Sequence>
    <Sequence from={780} durationInFrames={120}><EndCard /></Sequence>
  </AbsoluteFill>
);
