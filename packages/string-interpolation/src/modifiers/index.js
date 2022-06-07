import { uppercase } from './uppercase';
import { lowercase } from './lowercase';
import { titlecase } from './title';

export const defaultModifiers = [
  {
    key: 'uppercase',
    transform: uppercase,
  },
  {
    key: 'lowercase',
    transform: lowercase,
  },
  {
    key: 'title',
    transform: titlecase,
  },
];
