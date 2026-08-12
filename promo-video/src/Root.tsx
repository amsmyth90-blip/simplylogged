import React from 'react';
import {Composition} from 'remotion';
import {DiaryDockPromo} from './DiaryDockPromo';
import {DiaryDockCapturePromo} from './DiaryDockCapturePromo';
import {DiaryDockTestimonialPromo} from './DiaryDockTestimonialPromo';
import {DiaryDockFamilyFinal} from './DiaryDockFamilyFinal';
import {DiaryDockDentistPromo} from './DiaryDockDentistPromo';
import {DiaryDockPaperClutterPromo} from './DiaryDockPaperClutterPromo';
import {DiaryDockFoundItPromo} from './DiaryDockFoundItPromo';
import {DiaryDockThingsThatMatterPromo} from './DiaryDockThingsThatMatterPromo';
import {DiaryDockFamilyDadOrganisedPromo} from './DiaryDockFamilyDadOrganisedPromo';
import {DiaryDockAvatarEverydayPromo} from './DiaryDockAvatarEverydayPromo';
import {DiaryDockTenSecondChallengePromo} from './DiaryDockTenSecondChallengePromo';
import {DiaryDockRoomsPromo} from './DiaryDockRoomsPromo';
import {DiaryDockHomeEmergencyPromo, DiaryDockPassportPromo} from './DiaryDockAdditionalPromos';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DiaryDockPromo"
      component={DiaryDockPromo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockCapturePromo"
      component={DiaryDockCapturePromo}
      durationInFrames={780}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockTestimonialPromo"
      component={DiaryDockTestimonialPromo}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockFamilyFinal"
      component={DiaryDockFamilyFinal}
      durationInFrames={277}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockDentistPromo"
      component={DiaryDockDentistPromo}
      durationInFrames={918}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockPaperClutterPromo"
      component={DiaryDockPaperClutterPromo}
      durationInFrames={810}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockThingsThatMatterPromo"
      component={DiaryDockThingsThatMatterPromo}
      durationInFrames={1080}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockFamilyDadOrganisedPromo"
      component={DiaryDockFamilyDadOrganisedPromo}
      durationInFrames={720}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockFoundItPromo"
      component={DiaryDockFoundItPromo}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockAvatarEverydayPromo"
      component={DiaryDockAvatarEverydayPromo}
      durationInFrames={722}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockTenSecondChallengePromo"
      component={DiaryDockTenSecondChallengePromo}
      durationInFrames={840}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DiaryDockRoomsPromo"
      component={DiaryDockRoomsPromo}
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
