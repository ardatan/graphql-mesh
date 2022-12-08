import { uppercase } from './uppercase.js';
import { lowercase } from './lowercase.js';
import { titlecase } from './title.js';

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
