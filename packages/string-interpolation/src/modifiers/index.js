import { lowercase } from './lowercase.js';
import { pathHead } from './path_head.js';
import { pathRest } from './path_rest.js';
import { titlecase } from './title.js';
import { uppercase } from './uppercase.js';

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
  {
    key: 'path_head',
    transform: pathHead,
  },
  {
    key: 'path_rest',
    transform: pathRest,
  },
];
