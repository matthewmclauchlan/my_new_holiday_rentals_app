const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  reactStrictMode: true,
  // Enable the Next.js app directory
  experimental: {
    appDir: true,
  },
  // Ensure expo-router is transpiled correctly
  transpilePackages: ['expo-router'],
});
