const guildConfig = require('@theguild/prettier-config');
module.exports = {
  ...guildConfig,
  overrides: [{ files: '*.json', options: { trailingComma: 'none' } }, ...guildConfig.overrides],
};
