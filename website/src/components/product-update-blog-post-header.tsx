import type { ReactElement } from 'react';
import { format } from 'date-fns';
import { Anchor } from '@theguild/components';
import { authors } from '../authors';
import { SocialAvatar } from './social-avatar';

type Meta = {
  authors: string[];
  date: string;
  title: string;
  description: string;
};

const Authors = ({ meta }: { meta: Meta }): ReactElement => {
  const date = meta.date ? new Date(meta.date) : new Date();

  if (meta.authors.length === 1) {
    const author = authors[meta.authors[0]];
    return (
      <div className="my-5 flex flex-row items-center justify-center">
        <Anchor href={author.link} title={author.name}>
          <SocialAvatar author={author} />
        </Anchor>
        <div className="ml-2.5 flex flex-col">
          <Anchor href={author.link} title={author.name} className="font-semibold text-[#777]">
            {author.name}
          </Anchor>
          <time
            dateTime={date.toISOString()}
            title={`Posted ${format(date, 'EEEE, LLL do y')}`}
            className="text-xs text-[#777]"
          >
            {format(date, 'EEEE, LLL do y')}
          </time>
        </div>
      </div>
    );
  }
  return (
    <>
      <time
        dateTime={date.toISOString()}
        title={`Posted ${format(date, 'EEEE, LLL do y')}`}
        className="mt-5 block text-center text-xs text-[#777]"
      >
        {format(date, 'EEEE, LLL do y')}
      </time>
      <div className="my-5 flex flex-wrap justify-center gap-5">
        {meta.authors.map(authorId => {
          const author = authors[authorId];
          return (
            <div key={authorId}>
              <Anchor href={author.link} title={author.name} className="font-semibold text-[#777]">
                <SocialAvatar author={author} />
                <span className="ml-2.5 text-sm">{author.name}</span>
              </Anchor>
            </div>
          );
        })}
      </div>
    </>
  );
};

export const ProductUpdateBlogPostHeader = ({ meta }: { meta: Meta }): ReactElement => {
  return (
    <>
      <h1>{meta.title}</h1>
      <Authors meta={meta} />
    </>
  );
};
