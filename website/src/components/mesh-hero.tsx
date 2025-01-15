import Image from 'next/image';
import {
  CallToAction,
  CheckIcon,
  cn,
  DecorationIsolation,
  GitHubIcon,
  Heading,
  MeshIcon,
} from '@theguild/components';
import { HeroContainer, HeroContainerProps, HeroFeatures, HeroLinks } from './hero';

export function MeshHero(props: HeroContainerProps) {
  return (
    <HeroContainer {...props} className={cn('mx-4 max-sm:mt-2 md:mx-6', props.className)}>
      <MeshDecorations />
      <MeshLogoStylized />
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
        <CallToAction
          variant="secondary"
          target="_blank"
          href="https://github.com/ardatan/graphql-mesh"
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

/**
 * This is inlined here for Safari, because it renders .svg in <img> tags in a blurry way.
 */
function MeshLogoStylized(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={96}
      height={96}
      viewBox="0 0 96 96"
      fill="none"
      {...props}
    >
      <g filter="url(#filter0_b_817_5593)">
        <rect width={96} height={96} rx={24} fill="url(#paint0_linear_817_5593)" />
        <rect
          x={0.5}
          y={0.5}
          width={95}
          height={95}
          rx={23.5}
          stroke="url(#paint1_linear_817_5593)"
        />
        <mask id="a" fill="#fff">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M66.913 29.776l7.085 7.084H74v22.28l-7.085 7.085-.69.69L59.14 74H36.86l-7.084-7.085-.691-.69L22 59.14V36.86l7.083-7.084.69-.691L36.858 22h22.28l7.084 7.085.691.69zM33.826 66.222h28.346a4.05 4.05 0 004.05-4.051V33.826a4.05 4.05 0 00-4.05-4.05H33.826a4.05 4.05 0 00-4.05 4.05v28.346a4.05 4.05 0 004.05 4.05zm2.955-11.017V40.792a4.05 4.05 0 014.051-4.051h14.334a4.05 4.05 0 014.05 4.05v14.415a4.05 4.05 0 01-4.05 4.051H40.832a4.05 4.05 0 01-4.05-4.05zm14.66-3.724v-6.966h-6.884v6.966h6.884z"
          />
        </mask>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M66.913 29.776l7.085 7.084H74v22.28l-7.085 7.085-.69.69L59.14 74H36.86l-7.084-7.085-.691-.69L22 59.14V36.86l7.083-7.084.69-.691L36.858 22h22.28l7.084 7.085.691.69zM33.826 66.222h28.346a4.05 4.05 0 004.05-4.051V33.826a4.05 4.05 0 00-4.05-4.05H33.826a4.05 4.05 0 00-4.05 4.05v28.346a4.05 4.05 0 004.05 4.05zm2.955-11.017V40.792a4.05 4.05 0 014.051-4.051h14.334a4.05 4.05 0 014.05 4.05v14.415a4.05 4.05 0 01-4.05 4.051H40.832a4.05 4.05 0 01-4.05-4.05zm14.66-3.724v-6.966h-6.884v6.966h6.884z"
          fill="url(#paint2_linear_817_5593)"
        />
        <path
          d="M73.998 36.86l-.354.354.147.146h.207v-.5zm-7.085-7.084l-.353.353.353-.354zM74 36.86h.5v-.5H74v.5zm0 22.28l.354.353.146-.146v-.207H74zm-7.085 7.085l.354.353-.354-.353zm-.69.69l.353.354-.353-.354zM59.14 74v.5h.207l.146-.146L59.14 74zm-22.28 0l-.353.354.146.146h.207V74zm-7.084-7.085l.353-.353-.354.353zm-.691-.69l-.354.353.354-.353zM22 59.14h-.5v.207l.146.146.354-.353zm0-22.28l-.354-.353-.146.146v.207h.5zm7.083-7.084l-.354-.354.354.354zM36.858 22v-.5h-.207l-.146.146.353.354zm22.28 0l.353-.354-.146-.146h-.207v.5zm7.084 7.085l.354-.354-.353.354zm-14.78 15.431h.5v-.5h-.5v.5zm0 6.966v.5h.5v-.5h-.5zm-6.885-6.966v-.5h-.5v.5h.5zm0 6.966h-.5v.5h.5v-.5zM74.35 36.507l-7.084-7.085-.707.707 7.084 7.085.707-.707zM74 36.36h-.002v1H74v-1zm.5 22.78V36.86h-1v22.28h1zm-7.231 7.438l7.085-7.085-.708-.707-7.084 7.085.707.707zm-.69.69l.69-.69-.707-.707-.691.69.707.708zm-7.086 7.086l7.085-7.085-.707-.707-7.085 7.084.707.708zM36.86 74.5h22.28v-1H36.86v1zm-7.438-7.231l7.085 7.085.707-.708-7.085-7.084-.707.707zm-.69-.69l.69.69.707-.707-.69-.691-.708.707zm-7.086-7.086l7.085 7.085.707-.707-7.084-7.085-.708.707zM21.5 36.86v22.28h1V36.86h-1zm7.23-7.438l-7.084 7.085.708.707 7.082-7.085-.707-.707zm.69-.69l-.69.69.706.707.691-.69-.707-.708zm7.085-7.086l-7.085 7.085.707.707 7.085-7.084-.707-.708zm22.633-.146h-22.28v1h22.28v-1zm7.438 7.231l-7.085-7.085-.707.708 7.085 7.084.707-.707zm.69.69l-.69-.69-.707.707.69.691.708-.707zm-5.094 36.301H33.826v1h28.346v-1zm3.55-3.55a3.55 3.55 0 01-3.55 3.55v1a4.55 4.55 0 004.55-4.55h-1zm0-28.346v28.346h1V33.826h-1zm-3.55-3.55a3.55 3.55 0 013.55 3.55h1a4.55 4.55 0 00-4.55-4.55v1zm-28.346 0h28.346v-1H33.826v1zm-3.55 3.55a3.55 3.55 0 013.55-3.55v-1a4.55 4.55 0 00-4.55 4.55h1zm0 28.346V33.826h-1v28.346h1zm3.55 3.55a3.55 3.55 0 01-3.55-3.55h-1a4.55 4.55 0 004.55 4.55v-1zm2.455-24.93v14.414h1V40.792h-1zm4.551-4.551a4.55 4.55 0 00-4.55 4.55h1a3.55 3.55 0 013.55-3.55v-1zm14.334 0H40.832v1h14.334v-1zm4.55 4.55a4.55 4.55 0 00-4.55-4.55v1a3.55 3.55 0 013.55 3.55h1zm0 14.415V40.792h-1v14.414h1zm-4.55 4.551a4.55 4.55 0 004.55-4.55h-1a3.55 3.55 0 01-3.55 3.55v1zm-14.334 0h14.334v-1H40.832v1zm-4.55-4.55a4.55 4.55 0 004.55 4.55v-1a3.55 3.55 0 01-3.55-3.55h-1zm14.66-10.69v6.965h1v-6.966h-1zm-6.385.5h6.884v-1h-6.884v1zm.5 6.465v-6.966h-1v6.966h1zm6.384-.5h-6.884v1h6.884v-1z"
          fill="url(#paint3_linear_817_5593)"
          mask="url(#a)"
        />
      </g>
      <defs>
        <filter
          id="filter0_b_817_5593"
          x={-8}
          y={-8}
          width={112}
          height={112}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feGaussianBlur in="BackgroundImageFix" stdDeviation={4} />
          <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_817_5593" />
          <feBlend in="SourceGraphic" in2="effect1_backgroundBlur_817_5593" result="shape" />
        </filter>
        <linearGradient
          id="paint0_linear_817_5593"
          x1={0}
          y1={0}
          x2={96}
          y2={96}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B736A" />
          <stop offset={1} stopColor="#15433C" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_817_5593"
          x1={0}
          y1={0}
          x2={96}
          y2={96}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity={0.8} />
          <stop offset={1} stopColor="#fff" stopOpacity={0.4} />
        </linearGradient>
        <linearGradient
          id="paint2_linear_817_5593"
          x1={22}
          y1={22}
          x2={73.998}
          y2={73.998}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A7D5CA" />
          <stop offset={1} stopColor="#86B6C1" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_817_5593"
          x1={22}
          y1={22}
          x2={74}
          y2={74}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity={0.4} />
          <stop offset={1} stopColor="#fff" stopOpacity={0.1} />
        </linearGradient>
      </defs>
    </svg>
  );
}
