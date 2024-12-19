import type { Config } from 'tailwindcss';
import guildConfig from '@theguild/tailwind-config';

const config: Config = {
  ...guildConfig,
  content: [...guildConfig.content, 'theme.config.tsx'],
  theme: {
    ...guildConfig.theme,
    extend: {
      colors: {
        ...guildConfig.theme.extend.colors,
        primary: guildConfig.theme.extend.colors['hive-yellow'],
      },
    },
  },
};

export default config;
