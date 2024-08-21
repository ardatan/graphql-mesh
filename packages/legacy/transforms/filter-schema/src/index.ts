import type { YamlConfig } from '@graphql-mesh/types';
import BareFilter from './bareFilter.js';
import WrapFilter from './wrapFilter.js';

interface FilterTransformConstructor {
  new (options: { config: YamlConfig.FilterSchemaTransform }): BareFilter | WrapFilter;
}

export default (function FilterTransform(options: { config: YamlConfig.FilterSchemaTransform }) {
  if (Array.isArray(options.config)) {
    return new WrapFilter({
      ...options,
      config: {
        mode: 'wrap',
        filters: options.config,
      },
    });
  }

  return options.config.mode === 'bare' ? new BareFilter(options) : new WrapFilter(options);
} as unknown as FilterTransformConstructor);
