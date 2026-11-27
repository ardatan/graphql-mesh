import { ReactElement, ReactNode } from 'react';
import { ToolsAndLibrariesCards } from '@theguild/components';
import { CapabilitiesSection } from './capabilities-section';
import { ComparisonTable } from './comparison-table';
import { InfoCardsSection } from './info-cards-section';
import { LandingPageContainer } from './landing-page-container';
import { MeshHero } from './mesh-hero';
import { RunAnywhereSection } from './run-anywhere-section';

export function IndexPage({ faq }: { faq?: ReactNode } = {}): ReactElement {
  return (
    <LandingPageContainer>
      <MeshHero className="mx-4 max-sm:mt-2 md:mx-6" />
      <InfoCardsSection />
      {/* Live examples sandbox still shows Mesh v0 -- re-enable when updated for v2 */}
      <ComparisonTable className="mx-4 md:mx-6" />
      <RunAnywhereSection className="mx-4 mt-6 md:mx-6" />
      <CapabilitiesSection className="mx-4 mt-6 md:mx-6" />
      <ToolsAndLibrariesCards className="mx-4 md:mx-6" />
      {faq}
    </LandingPageContainer>
  );
}
