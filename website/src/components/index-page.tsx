import { ReactElement, ReactNode } from 'react';
import { ComparisonTable } from './comparison-table';
import { DatasourcesIllustration } from './datasources-illustration';
import { InfoCardsSection } from './info-cards-section';
import { LandingPageContainer } from './landing-page-container';
import { ManipulateDataSection } from './manipulate-data-section';
import { MeshHero } from './mesh-hero';
import { RunAnywhereSection } from './run-anywhere-section';

export function IndexPage({ faq }: { faq?: ReactNode } = {}): ReactElement {
  return (
    <LandingPageContainer>
      <MeshHero className="mx-4 max-sm:mt-2 md:mx-6" />
      <InfoCardsSection />
      <DatasourcesIllustration className="mx-4 md:mx-6" />
      <ManipulateDataSection className="mx-4 mt-6 md:mx-6" />
      <ComparisonTable className="mx-4 md:mx-6" />
      <RunAnywhereSection className="mx-4 mt-6 md:mx-6" />
      {faq}
    </LandingPageContainer>
  );
}
