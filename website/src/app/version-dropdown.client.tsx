'use client';

import type { FC } from 'react';
import { addBasePath } from 'next/dist/client/add-base-path';
import { usePathname } from 'next/navigation';
import { VersionDropdown as VD } from '@theguild/components';

export const VersionDropdown: FC = () => {
  const segment = usePathname().split('/', 2)[1];
  const currentVersion = segment === 'docs' ? 'v0' : segment === 'v2' ? 'v2' : 'v1';

  return (
    <VD
      currentVersion={currentVersion}
      chevronPosition="right"
      versions={[
        { label: 'Mesh v2 docs (draft)', href: addBasePath('/v2'), value: 'v2' },
        { label: 'Mesh v1 docs', href: addBasePath('/v1'), value: 'v1' },
        { label: 'Mesh v0 docs', href: addBasePath('/docs'), value: 'v0' },
      ]}
    />
  );
};
