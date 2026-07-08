import guildConfig from '@theguild/prettier-config';

export default {
  ...guildConfig,
  overrides: [
    { files: '*.json', options: { trailingComma: 'none' } },
    ...guildConfig.overrides,
    {
      files: '*.mdx',
      options: {
        plugins: ['prettier-plugin-sh', 'prettier-plugin-pkg'],
        importOrder: [],
      },
    },
  ],
  importOrderParserPlugins: ['explicitResourceManagement', ...guildConfig.importOrderParserPlugins],
};
