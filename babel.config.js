module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: process.versions.node.split('.')[0] } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-explicit-resource-management',
    '@babel/plugin-syntax-top-level-await',
  ],
};
