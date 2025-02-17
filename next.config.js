const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  reactStrictMode: true,
  transpilePackages: ['expo-router', 'expo-modules-core', 'expo'],
  webpack: (config, { isServer }) => {
    // Add a rule to properly handle .mjs files in node_modules
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    return config;
  },
});
