import Image from 'next/image';
import {
  CallToAction,
  CheckIcon,
  DecorationIsolation,
  GitHubIcon,
  Heading,
  MeshIcon,
} from '@theguild/components';
import { HeroContainer, HeroFeatures, HeroLinks } from './hero';
import { InstallButton } from './install-button';
import meshHeroBadge from './mesh-hero-badge.svg';

export function MeshHero() {
  return (
    <HeroContainer className="mx-4 max-sm:mt-2 md:mx-6">
      <MeshDecorations />
      <Image priority src={meshHeroBadge} alt="" width="96" height="96" />
      <Heading as="h1" size="xl" className="mx-auto max-w-3xl text-balance text-center">
        GraphQL Mesh
      </Heading>
      <p className="mx-auto w-[512px] max-w-[80%] text-balance text-center leading-6 text-green-800">
        Unify your API landscape with Mesh’s federated architecture, integrating any API service
        into a cohesive graph.
      </p>
      <HeroFeatures>
        <li>
          <CheckIcon className="text-green-800" />
          Compose any API
        </li>
        <li>
          <CheckIcon className="text-green-800" />
          Granular field access
        </li>
        <li>
          <CheckIcon className="text-green-800" />
          Works with any schema registry
        </li>
      </HeroFeatures>
      <HeroLinks>
        <CallToAction variant="primary-inverted" href="/v1/getting-started">
          Get started
        </CallToAction>
        <InstallButton />
        <CallToAction
          variant="tertiary"
          href="https://github.com/dotansimha/graphql-code-generator"
        >
          <GitHubIcon className="size-6" />
          GitHub
        </CallToAction>
      </HeroLinks>
    </HeroContainer>
  );
}

function MeshDecorations() {
  return (
    <DecorationIsolation className="-z-10">
      <MeshIcon className="absolute left-[-200px] top-[calc(50%-200px)] size-[400px] [&>g]:fill-[url(#mesh-hero-gradient)] [&>g]:stroke-white/10 [&>g]:stroke-[0.1px]" />
      <MeshIcon className="absolute size-[640px] bottom-[-327px] right-[-316px] [&>g]:fill-[url(#mesh-hero-gradient)] [&>g]:stroke-white/10 [&>g]:stroke-[0.1px] max-md:hidden" />
      <svg>
        <defs>
          <linearGradient id="mesh-hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="11.66%" stopColor="rgba(255, 255, 255, 0.10)" />
            <stop offset="74.87%" stopColor="rgba(255, 255, 255, 0.30)" />
          </linearGradient>
        </defs>
      </svg>
    </DecorationIsolation>
  );
}
