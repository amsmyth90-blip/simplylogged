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

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LifeDockPromo"
      component={LifeDockPromo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockCapturePromo"
      component={LifeDockCapturePromo}
      durationInFrames={780}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockTestimonialPromo"
      component={LifeDockTestimonialPromo}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockFamilyFinal"
      component={LifeDockFamilyFinal}
      durationInFrames={480}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockDentistPromo"
      component={LifeDockDentistPromo}
      durationInFrames={918}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockPaperClutterPromo"
      component={LifeDockPaperClutterPromo}
      durationInFrames={810}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockThingsThatMatterPromo"
      component={LifeDockThingsThatMatterPromo}
      durationInFrames={1080}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockFamilyDadOrganisedPromo"
      component={LifeDockFamilyDadOrganisedPromo}
      durationInFrames={720}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockFoundItPromo"
      component={LifeDockFoundItPromo}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockAvatarEverydayPromo"
      component={LifeDockAvatarEverydayPromo}
      durationInFrames={722}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockTenSecondChallengePromo"
      component={LifeDockTenSecondChallengePromo}
      durationInFrames={840}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LifeDockRoomsPromo"
      component={LifeDockRoomsPromo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
