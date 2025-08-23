const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable TypeScript support
config.resolver.assetExts.push('ts', 'tsx');

module.exports = config;
