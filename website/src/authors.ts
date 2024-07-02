type Author = {
  name: string;
  link: `https://${string}`;
  github?: string;
  twitter?: string;
};

export const authors: Record<string, Author> = {
  tuvalsimha: {
    name: 'Tuval Simha',
    link: 'https://twitter.com/SimhaTuval',
    github: 'TuvalSimha',
  },
};
