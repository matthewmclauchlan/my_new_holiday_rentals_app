const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  reactStrictMode: true,
  transpilePackages: ['expo-router', 'expo-modules-core', 'expo'],
  webpack: (config, { isServer }) => {
    // Ensure .mjs is in the list of extensions to resolve
    config.resolve.extensions.push('.mjs');

    // Add a rule to properly handle .mjs files in node_modules
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });
    return config;
  },
});
