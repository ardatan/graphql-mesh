import { ReactElement } from 'react';
import { ToolsAndLibrariesCards } from '@theguild/components';
import { CapabilitiesSection } from './capabilities-section';
import { ComparisonTable } from './comparison-table';
import { DatasourcesIllustration } from './datasources-illustration';
import { DatasourcesListSection } from './datasources-list-section';
import { ExamplesSection } from './examples-section';
import { FrequentlyAskedQuestions } from './frequently-asked-questions';
import { InfoCardsSection } from './info-cards-section';
import { LandingPageContainer } from './landing-page-container';
import { ManipulateDataSection } from './manipulate-data-section';
import { MeshHero } from './mesh-hero';
import { RunAnywhereSection } from './run-anywhere-section';

export function IndexPage(): ReactElement {
  return (
    <LandingPageContainer>
      <MeshHero className="mx-4 max-sm:mt-2 md:mx-6" />
      <InfoCardsSection />
      <DatasourcesIllustration className="mx-4 md:mx-6" />
      <ExamplesSection />
      <DatasourcesListSection className="mx-4 md:mx-6" />
      <ManipulateDataSection className="mx-4 mt-6 md:mx-6" />
      <ComparisonTable className="mx-4 md:mx-6" />
      <RunAnywhereSection className="mx-4 mt-6 md:mx-6" />
      <CapabilitiesSection className="mx-4 mt-6 md:mx-6" />
      <ToolsAndLibrariesCards className="mx-4 md:mx-6" />
      <FrequentlyAskedQuestions className="mx-4 mt-6 md:mx-6" />
    </LandingPageContainer>
  );
}
