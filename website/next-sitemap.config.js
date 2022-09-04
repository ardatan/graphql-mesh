/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://the-guild.dev/graphql/mesh',
  generateRobotsTxt: true, // (optional)
};
