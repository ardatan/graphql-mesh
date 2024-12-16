import guildConfig from '@theguild/prettier-config';

export default {
  ...guildConfig,
  overrides: [{ files: '*.json', options: { trailingComma: 'none' } }, ...guildConfig.overrides],
  importOrderParserPlugins: ['explicitResourceManagement', ...guildConfig.importOrderParserPlugins],
};
