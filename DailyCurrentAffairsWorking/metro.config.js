const { getDefaultConfig } = require('expo/metro-config');

// Use Expo's default Metro config and enable inlineRequires for faster startup
const defaultConfig = getDefaultConfig(__dirname);

// Ensure transformer options exist and enable inlineRequires which defers
// requiring modules until they're actually needed. This reduces startup time.
defaultConfig.transformer = defaultConfig.transformer || {};
defaultConfig.transformer.getTransformOptions = async () => ({
	transform: {
		experimentalImportSupport: false,
		inlineRequires: true,
	},
});

module.exports = defaultConfig;
