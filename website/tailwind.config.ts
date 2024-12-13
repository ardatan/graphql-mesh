import guildConfig from '@theguild/tailwind-config';

export default {
  ...guildConfig,
  content: [...guildConfig.content, 'theme.config.tsx'],
};
