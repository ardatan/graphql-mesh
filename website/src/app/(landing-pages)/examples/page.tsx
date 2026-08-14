import { ExamplesSandbox } from '../../../components/examples-sandbox';

export const metadata = {
  title: 'Examples',
  description: 'Examples of Mesh usage',
};

export default function ExamplesPage() {
  return (
    <div className="flex min-h-[calc(100vh-var(--nextra-navbar-height))] flex-col">
      <ExamplesSandbox />
    </div>
  );
}
