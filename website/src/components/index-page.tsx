import { ReactElement } from 'react';
import { DatasourcesIllustration } from './datasources-illustration';
import { MeshHero } from './mesh-hero';

export function IndexPage(): ReactElement {
  return (
    <div className="flex flex-col">
      <MeshHero className="mx-4 max-sm:mt-2 md:mx-6" />
      <DatasourcesIllustration className="mx-4" />
    </div>
  );
}
