import { PropsWithChildren, ReactElement } from 'react';
import Image from 'next/image';
import {
  FiAlertTriangle,
  FiArrowRightCircle,
  FiCheckCircle,
  FiCloudLightning,
  FiFastForward,
  FiGithub,
  FiLink,
  FiMoreHorizontal,
  FiTarget,
  FiUserCheck,
} from 'react-icons/fi';
import { Anchor, Mermaid } from '@theguild/components';
import GraphQLLogo from '../../public/assets/graphql-logo.svg';
import MeshExampleLogo from '../../public/assets/mesh-example.png';
import OpenSourceLogo from '../../public/assets/open-source.svg';

const ButtonLink = ({ children, ...props }: React.ComponentProps<typeof Anchor>) => {
  return (
    <Anchor
      {...props}
      className={`inline-block bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 text-gray-600 px-6 py-3 rounded-lg font-medium shadow-sm ${
        props.className || ''
      }`}
    >
      {children}
    </Anchor>
  );
};

function Hero() {
  return (
    <div className="w-full">
      <div className="py-20 sm:py-24 lg:py-32 my-6">
        <h1 className="max-w-screen-md mx-auto font-extrabold text-5xl sm:text-5xl lg:text-6xl text-center bg-gradient-to-r from-cyan-400 to-sky-500 dark:from-cyan-400 dark:to-sky-600 bg-clip-text text-transparent">
          GraphQL Mesh
        </h1>
        <p className="max-w-screen-sm mx-auto mt-6 text-2xl text-gray-600 text-center dark:text-gray-400">
          The Graph of Everything
        </p>
        <p className="max-w-screen-sm mx-auto text-2xl text-gray-600 text-center dark:text-gray-400">
          Federated architecture for any API service
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <ButtonLink href="/docs">Documentation</ButtonLink>
          <ButtonLink className="hidden lg:block" href="/examples">
            Examples
          </ButtonLink>
          <ButtonLink
            className="flex flex-row gap-2 items-center"
            href="https://github.com/urigo/graphql-mesh"
          >
            <FiGithub /> GitHub
          </ButtonLink>
          {/* TODO: this button causes hydration error */}
          {/* <ButtonLink href="https://www.npmjs.com/package/@graphql-mesh/cli">
            <NPMBadge name="@graphql-mesh/cli" />
          </ButtonLink> */}
        </div>
      </div>
    </div>
  );
}

const FeatureWrapperClass = `
  w-full py-24
  odd:bg-gray-50
  odd:dark:bg-gray-900
  even:bg-white
  even:dark:bg-black
`;

const gradients: [string, string][] = [
  ['#ff9472', '#f2709c'],
  ['#4776e6', '#8e54e9'],
  ['#f857a6', '#ff5858'],
  ['#4AC29A', '#BDFFF3'],
  ['#00c6ff', '#0072ff'],
];

const Highlight = {
  Root: 'flex flex-row md:flex-col lg:flex-row flex-1 gap-6',
  Icon: 'w-16 h-16 text-teal-700 flex-shrink-0 flex items-center',
  Content: 'flex flex-col text-black dark:text-white',
  Title: 'text-xl font-semibold',
  Description: 'text-gray-600 dark:text-gray-400',
};

function pickGradient(i: number) {
  const gradient = gradients[i % gradients.length];

  if (!gradient) {
    throw new Error('No gradient found');
  }

  return gradient;
}
function FeatureWrapper({ children }: PropsWithChildren) {
  return <div className={FeatureWrapperClass}>{children}</div>;
}

function Feature(
  props: PropsWithChildren<{
    title: string;
    description: React.ReactNode;
    highlights?: Array<{
      title: string;
      description: React.ReactNode;
      icon?: React.ReactNode;
    }>;
    image?: string | React.ReactNode;
    gradient: number;
    flipped?: boolean;
  }>,
) {
  const { title, description, children, image, gradient, flipped } = props;
  const [start, end] = pickGradient(gradient);

  return (
    <FeatureWrapper>
      <div className="container box-border px-6 mx-auto flex flex-col gap-y-24">
        <div
          className={`flex flex-col gap-24 md:gap-12 lg:gap-24 justify-center items-stretch ${
            flipped ? 'md:flex-row-reverse' : 'md:flex-row'
          }`}
        >
          <div
            className={`flex flex-col gap-4 w-full md:w-2/5 lg:w-1/3 flex-shrink-0 ${
              image ? '' : 'items-center'
            }`}
          >
            <h2
              className={`font-semibold text-5xl bg-clip-text text-transparent dark:text-transparent leading-normal ${
                image ? '' : 'text-center'
              }`}
              style={{
                backgroundImage: `linear-gradient(-70deg, ${end}, ${start})`,
              }}
            >
              {title}
            </h2>
            <div className="text-lg text-gray-600 dark:text-gray-400 leading-7">{description}</div>
          </div>
          {image && (
            <div
              className="rounded-3xl overflow-hidden p-8 flex-grow flex flex-col justify-center items-stretch relative"
              style={{
                backgroundImage: `linear-gradient(70deg, ${start}, ${end})`,
              }}
            >
              {typeof image === 'string' ? (
                <Image src={image} className="rounded-xl" layout="responsive" alt={title} />
              ) : (
                image
              )}
            </div>
          )}
        </div>
        {children}
      </div>
    </FeatureWrapper>
  );
}

function FeatureHighlights(props: {
  textColor?: string;
  highlights?: Array<{
    title: string;
    description: React.ReactNode;
    icon?: React.ReactNode;
    link?: string;
  }>;
}) {
  const { highlights, textColor } = props;

  return Array.isArray(highlights) && highlights.length > 0 ? (
    <>
      {highlights.map(({ title, description, icon, link }, i) => (
        <Anchor href={link || '#'} key={i}>
          <div className={Highlight.Root}>
            {icon && <div className={Highlight.Icon}>{icon}</div>}
            <div className={Highlight.Content}>
              <h3
                className={Highlight.Title + (icon ? '' : ' text-lg')}
                style={textColor ? { color: textColor } : {}}
              >
                {title}
              </h3>
              <p className={Highlight.Description + (icon ? '' : ' text-sm')}>{description}</p>
            </div>
          </div>
        </Anchor>
      ))}
    </>
  ) : null;
}

const datasources: Array<string> = [
  'OpenAPI/Swagger',
  'oData',
  'gRPC',
  'MongoDB',
  'Postgres',
  'SOAP',
  'MySQL',
  'JSON Schema',
  'Postgraphile',
  'Neo4j',
  'SQLite',
  '& More...',
];

const deployableEnvs = [
  {
    name: 'Node.js',
    href: '/docs/getting-started/deploy-mesh-gateway#deploy-mesh-with-mesh-start-on-nodejs',
  },
  {
    name: 'Vercel',
    href: '/docs/getting-started/deploy-mesh-gateway#deploy-mesh-on-vercel-with-nextjs-api-routes',
  },
  {
    name: 'Cloudflare Workers',
    href: '/docs/getting-started/deploy-mesh-gateway#deploy-mesh-on-cloudflare-workers',
  },
  {
    name: 'Apache OpenWhisk',
    href: '/docs/getting-started/deploy-mesh-gateway#deploy-mesh-on-apache-openwhisk',
  },
  {
    name: 'Express',
    href: '/docs/getting-started/deploy-mesh-gateway#mesh-as-an-express-route',
  },
  {
    name: 'Even as a frontend app',
    href: '/docs/guides/mesh-sdk',
  },
  {
    name: 'Koa',
    href: '/docs/getting-started/deploy-mesh-gateway#mesh-as-an-koa-route',
  },
  {
    name: 'SvelteKit',
    href: '/docs/getting-started/deploy-mesh-gateway#mesh-and-sveltekit',
  },
  {
    name: 'And more...',
    href: '/docs/getting-started/deploy-mesh-gateway',
  },
  {
    name: 'Fastify',
    href: '/docs/getting-started/deploy-mesh-gateway#mesh-as-an-fastify-route',
  },
  {
    name: 'Docker',
    href: '/docs/getting-started/deploy-mesh-gateway#mesh-and-docker',
  },
];

export function IndexPage(): ReactElement {
  return (
    <div className="flex flex-col">
      <div className={FeatureWrapperClass}>
        <Hero />
      </div>
      <Feature
        title="Query anything, run anywhere."
        description={
          <div className="space-y-2">
            <p>
              Mesh is a framework that helps shape and build an executable GraphQL schema from
              multiple data sources.
            </p>
          </div>
        }
        gradient={0}
      >
        <div className="flex flex-col md:flex-row gap-12 justify-between">
          <FeatureHighlights
            highlights={[
              {
                title: 'GraphQL as a Query Language',
                description:
                  'Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running gateway server, or any other bottleneck.',
                icon: (
                  <Image
                    src={GraphQLLogo}
                    loading="eager"
                    placeholder="empty"
                    alt="GraphQL Logo"
                    className="w-full h-full"
                  />
                ),
              },
              {
                title: 'OmniGraph',
                description: 'GraphQL Mesh compose sources as a single GraphQL schema',
                icon: (
                  <Image
                    src={MeshExampleLogo}
                    loading="eager"
                    placeholder="empty"
                    alt="GraphQL Mesh Logo"
                    className="w-full h-full"
                  />
                ),
              },
              {
                title: 'Open Source',
                description:
                  'GraphQL Mesh is free and open-source, and been built with the community. You can contribute, extend and have your custom logic easily.',
                icon: (
                  <Image
                    src={OpenSourceLogo}
                    loading="eager"
                    placeholder="empty"
                    alt="Open Source Logo"
                    className="w-full h-full"
                    style={{ background: '#fff' }}
                  />
                ),
              },
            ]}
          />
        </div>
      </Feature>
      <Feature
        title="Query anything"
        description={
          <div className="space-y-2">
            <p>Using source handlers, you can consume any API in GraphQL Mesh</p>
          </div>
        }
        gradient={1}
      >
        <div className="flex flex-wrap lg:w-4/5 sm:mx-auto sm:mb-2 -mx-2">
          {datasources.map((datasource, i) => (
            <div className="p-2 sm:w-1/2 md:w-1/3 w-full" key={i}>
              <div className="bg-gray-100 dark:bg-gray-800 rounded flex p-4 h-full items-center">
                <FiCheckCircle className="text-indigo-500 w-6 h-6 flex-shrink-0 mr-4" />
                <span className="title-font font-medium text-black dark:text-white">
                  {datasource}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Feature>
      <Feature
        title="Connect datasources"
        description={
          <div className="flex flex-col gap-y-12">
            <div>
              <p>Work with services that aren't GraphQL as if they were.</p>
            </div>
            <div className="flex flex-col gap-y-12">
              <FeatureHighlights
                highlights={[
                  {
                    title: 'Automatically create',
                    description: 'type-safe GraphQL APIs from any datasource',
                    icon: <FiArrowRightCircle size={36} />,
                  },
                  {
                    title: 'Extend datasource',
                    description: 'with the data from another - fully type safe',
                    icon: <FiLink size={36} />,
                  },
                  {
                    title: 'Mock, cache and transform',
                    description: 'your entire schema',
                    icon: <FiTarget size={36} />,
                  },
                ]}
              />
            </div>
          </div>
        }
        image={
          <Mermaid
            chart={`
              graph TD;
                subgraph client [" "]
                  mobile(Mobile App)
                  web(Web App)
                  node(Node.js Client)
                end

                mobile(Mobile App)--->mesh
                web(Web App)--->mesh
                node(Node.js Client)--->mesh

                mesh(Mesh Gateway GraphQL API)

                mesh--->rest(Books REST API)
                mesh--->grpc(Authors gRPC API)
                mesh--->stores(Stores GraphQL API)

                subgraph api [" "]
                  rest(Books REST API)
                  grpc(Authors gRPC API)
                  stores(Stores GraphQL API)
                end
            `}
          />
        }
        gradient={2}
      />
      <div className={FeatureWrapperClass}>
        <div className="container box-border px-6 mx-auto flex flex-col gap-y-24">
          <div className="text-center">
            <h2
              className="font-semibold text-5xl mb-6 bg-clip-text text-transparent dark:text-transparent leading-normal"
              style={{
                backgroundImage: `linear-gradient(-70deg, ${gradients[3][1]}, ${gradients[3][0]})`,
              }}
            >
              Manipulate data
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-7">
              Easily transform your schema
            </p>
          </div>
          <div className="max-w-screen-lg px-6 box-border mx-auto grid grid-cols-2 gap-12">
            <FeatureHighlights
              textColor={gradients[3][0]}
              highlights={[
                {
                  title: 'Naming conventions',
                  description: 'Rename fields, change casings, add pre/suffixes',
                },
                {
                  title: 'Modify results',
                  description: 'Filter, sort, replace and more',
                },
                {
                  title: 'Alter resolvers',
                  description: 'Add middleware to your existing resolvers',
                },
                {
                  title: 'Schema structure',
                  description: 'Type merging, encapsulate, extend sources',
                },
              ]}
            />
          </div>
        </div>
      </div>
      <Feature
        title="Extend with plugins"
        description={
          <div className="flex flex-col gap-y-12">
            <div>
              <p>Extend your gateway's capabilities with the plugins</p>
            </div>
            <div className="flex flex-col gap-y-12">
              <FeatureHighlights
                highlights={[
                  {
                    title: 'Response Caching',
                    description: 'Add caching to your GraphQL service easily',
                    link: '/docs/plugins/response-caching',
                    icon: <FiCloudLightning size={36} />,
                  },
                  {
                    title: 'Monitoring & Tracing',
                    description:
                      'Monitor your service with built-in support for Prometheus, NewRelic, Sentry, StatD and OpenTelemetry',
                    link: '/docs/guides/monitoring-and-tracing',
                    icon: <FiAlertTriangle size={36} />,
                  },
                  {
                    title: 'Enhanced Security',
                    description:
                      'Authentication (Basic/JWT/Auth0/...), authorization, rate-limit and more.',
                    link: '/docs/guides/auth0',
                    icon: <FiUserCheck size={36} />,
                  },
                  {
                    title: 'And much more!',
                    link: '/docs/plugins/plugins-introduction',
                    description: 'Mocking, caching, live queries...',
                    icon: <FiMoreHorizontal size={36} />,
                  },
                ]}
              />
            </div>
          </div>
        }
        gradient={4}
      />
      <Feature
        title="Run anywhere"
        description={
          <div className="space-y-2">
            <p>
              Thanks to{' '}
              <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API">Fetch</a>, it can
              run on any <i>JavaScript</i> runtime.
            </p>
          </div>
        }
        gradient={0}
      >
        <div className="flex flex-wrap lg:w-4/5 sm:mx-auto sm:mb-2 -mx-2">
          {deployableEnvs.map((env, i) => (
            <div className="p-2 sm:w-1/2 md:w-1/3 w-full" key={i}>
              <Anchor href={env.href}>
                <div className="bg-gray-100 dark:bg-gray-800 rounded flex p-4 h-full items-center gap-2">
                  <FiFastForward
                    className="w-6 h-6 flex-shrink-0 mr-4"
                    style={{ stroke: pickGradient(0)[0] }}
                  />
                  <span className="title-font font-medium text-black dark:text-white">
                    {env.name}
                  </span>
                </div>
              </Anchor>
            </div>
          ))}
        </div>
      </Feature>
    </div>
  );
}
