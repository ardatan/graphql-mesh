import Head from 'next/head';
import { getMeshSDK, ListPetsQuery } from '../.mesh';
import styles from '../styles/Home.module.css';

export default function Home(props: { petsData: ListPetsQuery }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Pets</h1>
        <ul className={styles.list}>
          {props.petsData?.findPetsByStatus?.map((pet, i) => <li key={`pet_${i}`}>{pet.name}</li>)}
        </ul>
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  const sdk = getMeshSDK();
  return {
    props: {
      petsData: await sdk.ListPets(),
    },
  };
}
