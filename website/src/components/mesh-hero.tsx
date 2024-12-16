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

// TODO: We'll add more package managers later.
function InstallButton() {
  return (
    <CallToAction
      variant="secondary-inverted"
      href="/docs/getting-started"
      className="font-mono font-medium"
    >
      npm i graphql-mesh
      <CopyIcon className="size-6" />
    </CallToAction>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="24" viewBox="0 0 25 24" {...props}>
      <path
        d="M7.9999 6.6V3.9C7.9999 3.66131 8.09472 3.43239 8.26351 3.2636C8.43229 3.09482 8.66121 3 8.8999 3H19.6999C19.9386 3 20.1675 3.09482 20.3363 3.2636C20.5051 3.43239 20.5999 3.66131 20.5999 3.9V16.5C20.5999 16.7387 20.5051 16.9676 20.3363 17.1364C20.1675 17.3052 19.9386 17.4 19.6999 17.4H16.9999V20.1C16.9999 20.5968 16.5949 21 16.0936 21H5.3062C5.18752 21.0007 5.06986 20.978 4.95999 20.9331C4.85012 20.8882 4.75021 20.822 4.666 20.7384C4.58178 20.6547 4.51492 20.5553 4.46925 20.4457C4.42359 20.3362 4.40002 20.2187 4.3999 20.1L4.4026 7.5C4.4026 7.0032 4.8076 6.6 5.3089 6.6H7.9999ZM6.2026 8.4L6.1999 19.2H15.1999V8.4H6.2026ZM9.7999 6.6H16.9999V15.6H18.7999V4.8H9.7999V6.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
