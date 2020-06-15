import React, { useState } from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';
import Button from '../components/ui/Button';
import Link from '@docusaurus/Link';
import LiveDemo from '../components/live-demo';

const features = [
  {
    title: <>GraphQL as a Query Language</>,
    imageUrl: 'img/GraphQL_Logo.svg',
    description: (
      <>
        Use GraphQL as a query language to fetch data from your data-sources directly, without the need for a running
        gateway server, or any other bottleneck.
      </>
    ),
  },
  {
    title: <>Any Data Source</>,
    imageUrl: 'img/mesh-example.png',
    description: (
      <>
        With GraphQL Mesh, you can use GraphQL query language to fetch from (almost) any data source, without changing
        the source or modify it's code.
      </>
    ),
  },

  {
    title: <>Open Source</>,
    imageUrl: 'img/open-source.svg',
    description: (
      <>
        GraphQL Mesh is free and open-source, and been built with the community. You can contribute, extend and have
        your custom logic easily.
      </>
    ),
  },
];

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const [showLiveDemo, setShowLiveDemo] = useState(false);
  return (
    <Layout title={`GraphQL Mesh`} description="">
      <header className={styles.header}>
        <div className={styles.bannerVideoContainer}>
          <video className={styles.bannerVideo} width="100%" height="100%" playsInline={true} autoPlay={true} muted={true} loop={true}>
            <source src="/video/medium_1200X345.webm" type="video/webm" />
            <source src="/video/medium_1200X345.mp4" type="video/mp4" />
          </video>
        </div>
        <img className={styles.npmBadge}
          alt="npm"
          src="https://img.shields.io/npm/v/@graphql-mesh/runtime?color=%231BCBE2&label=stable&style=for-the-badge"
        />
        <div className={styles.buttons}>
        <Button onClick={() => setShowLiveDemo(true)}>
          Try it out Live
        </Button>
        <Link to={`/docs/getting-started/introduction`}>
          <Button>
            View Docs
          </Button>
        </Link>
        </div>
      </header>
      { showLiveDemo && <div className={styles.liveDemo}>
        <a id="live-demo" />
        <LiveDemo />
      </div> }
      <main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;
