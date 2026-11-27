import { ReactElement, ReactNode } from 'react';
import { InfoCardsSection } from './info-cards-section';
import { LandingPageContainer } from './landing-page-container';
import { MeshHero } from './mesh-hero';

export function IndexPage({ faq }: { faq?: ReactNode } = {}): ReactElement {
  return (
    <LandingPageContainer>
      <MeshHero className="mx-4 max-sm:mt-2 md:mx-6" />
      <InfoCardsSection />
      {faq}
    </LandingPageContainer>
  );
}
