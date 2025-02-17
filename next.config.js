const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  reactStrictMode: true,
  transpilePackages: ['expo-router', 'expo-modules-core', 'expo'],
  webpack: (config, { isServer }) => {
    // Ensure .mjs is resolved
    config.resolve.extensions.push('.mjs');

    // Rule to handle .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });

    // Rule to transpile expo modules (if they are not already)
    config.module.rules.push({
      test: /\.[jt]sx?$/,
      include: /node_modules[\\\/](expo-router|expo-modules-core|expo)[\\\/]/,
      use: {
        loader: 'babel-loader',
        options: {
          // You can adjust these presets/plugins if needed
          presets: ['next/babel'],
        },
      },
    });

    return config;
  },
});
