import { ReactElement } from 'react';
import dynamic from 'next/dynamic';

export const LiveDemo = dynamic(() => import('./live-demo').then(mod => mod.LiveDemo), {
  ssr: false,
});

export function ExamplesPage(): ReactElement {
  return <LiveDemo className="hidden lg:block mt-12" />;
}
