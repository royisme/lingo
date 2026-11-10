import React from 'react'
import { Composition, Still } from 'remotion'
import { Hero, SLOT } from './Hero'
import { HERO } from './langs'
import { Read, Remember, Social, Write } from './Stills'

export const Root: React.FC = () => (
  <>
    <Composition id="Hero" component={Hero} durationInFrames={SLOT * HERO.length} fps={30} width={1280} height={720} />
    <Still id="Social" component={Social} width={1280} height={640} />
    <Still id="Read" component={Read} width={1280} height={760} />
    <Still id="Write" component={Write} width={1280} height={760} />
    <Still id="Remember" component={Remember} width={1280} height={640} />
  </>
)
