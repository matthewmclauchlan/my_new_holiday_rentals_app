// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.extraNodeModules = {
  "@": path.resolve(__dirname),
};

module.exports = defaultConfig;
