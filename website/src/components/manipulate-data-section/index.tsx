import Image from 'next/image';
import { cn, DecorationIsolation, Heading } from '@theguild/components';
import manipulateSectionBlurBackground from './manipulate-section-blur-background.webp';

export function ManipulateDataSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative rounded-3xl bg-green-1000 p-4 pt-6 sm:py-24 md:px-6 lg:px-12 2xl:px-24 md:pt-24 lg:py-[120px]',
        className,
      )}
    >
      <DecorationIsolation className="rounded-3xl">
        <Image
          src={manipulateSectionBlurBackground}
          alt=""
          className="absolute w-full h-full object-cover object-right"
        />
      </DecorationIsolation>
      <Heading as="h3" size="md" className="text-white text-center">
        Manipulate data
      </Heading>
      <p className="mt-4 text-white/80 text-center text-balance">
        Transform and tailor your schema within Mesh to meet specific business requirements
        efficiently.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-8 mt-8 lg:mt-16 xl:[&>*:not(:first-child)]:pl-8 max-sm:[&>*:not(:first-child)]:pt-4 max-sm:divide-y xl:divide-x divide-green-700">
        <ListItem
          title="Naming conventions"
          description="Customize field names within your GraphQL schema using Mesh's flexible naming conventions."
        />
        <ListItem
          title="Modify results"
          description="Refine and adjust query results directly within Mesh to suit precise user needs."
        />
        <ListItem
          title="Alter resolvers"
          description="Incorporate middleware into your resolvers with Mesh, enhancing your GraphQL service's functionality."
        />
        <ListItem
          title="Schema structure"
          description="Employ Mesh to merge types and extend sources, structuring your GraphQL schema optimally."
        />
      </dl>
    </section>
  );
}

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
}
function ListItem({ title, description, ...rest }: ListItemProps) {
  return (
    <div {...rest}>
      <dt className="text-white font-medium">{title}</dt>
      <dd className="text-white/80 block mt-2">{description}</dd>
    </div>
  );
}
