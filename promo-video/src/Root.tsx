import React from 'react';
import {Composition} from 'remotion';
import {LifeDockPromo} from './LifeDockPromo';
import {LifeDockCapturePromo} from './LifeDockCapturePromo';
import {LifeDockTestimonialPromo} from './LifeDockTestimonialPromo';
import {LifeDockFamilyFinal} from './LifeDockFamilyFinal';
import {LifeDockDentistPromo} from './LifeDockDentistPromo';
import {LifeDockPaperClutterPromo} from './LifeDockPaperClutterPromo';
import {LifeDockFoundItPromo} from './LifeDockFoundItPromo';
import {LifeDockThingsThatMatterPromo} from './LifeDockThingsThatMatterPromo';
import {LifeDockFamilyDadOrganisedPromo} from './LifeDockFamilyDadOrganisedPromo';
import {LifeDockAvatarEverydayPromo} from './LifeDockAvatarEverydayPromo';
import {LifeDockTenSecondChallengePromo} from './LifeDockTenSecondChallengePromo';
import {LifeDockRoomsPromo} from './LifeDockRoomsPromo';
import {DiaryDockHomeEmergencyPromo, DiaryDockPassportPromo} from './DiaryDockAdditionalPromos';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DiaryDockPromo"
      component={LifeDockPromo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockCapturePromo"
      component={LifeDockCapturePromo}
      durationInFrames={780}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockTestimonialPromo"
      component={LifeDockTestimonialPromo}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockFamilyFinal"
      component={LifeDockFamilyFinal}
      durationInFrames={277}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockDentistPromo"
      component={LifeDockDentistPromo}
      durationInFrames={918}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockPaperClutterPromo"
      component={LifeDockPaperClutterPromo}
      durationInFrames={810}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockThingsThatMatterPromo"
      component={LifeDockThingsThatMatterPromo}
      durationInFrames={1080}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockFamilyDadOrganisedPromo"
      component={LifeDockFamilyDadOrganisedPromo}
      durationInFrames={720}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockFoundItPromo"
      component={LifeDockFoundItPromo}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockAvatarEverydayPromo"
      component={LifeDockAvatarEverydayPromo}
      durationInFrames={722}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockTenSecondChallengePromo"
      component={LifeDockTenSecondChallengePromo}
      durationInFrames={840}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockRoomsPromo"
      component={LifeDockRoomsPromo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockPassportPromo"
      component={DiaryDockPassportPromo}
      durationInFrames={900}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="DiaryDockHomeEmergencyPromo"
      component={DiaryDockHomeEmergencyPromo}
      durationInFrames={840}
      fps={30}
      width={720}
      height={1280}
    />
  </>
);
