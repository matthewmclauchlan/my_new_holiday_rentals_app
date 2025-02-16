// next.config.js
const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  projectRoot: __dirname,
  // Optionally, you can specify a custom output directory:
  // distDir: '.next',
});
