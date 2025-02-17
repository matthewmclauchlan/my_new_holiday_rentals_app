const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  transpilePackages: ['expo-router'],
});
