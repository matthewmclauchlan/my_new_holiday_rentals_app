const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  reactStrictMode: true,
  transpilePackages: ['expo-router', 'expo-modules-core', 'expo'],
});