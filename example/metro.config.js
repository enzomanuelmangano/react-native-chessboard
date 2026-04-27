const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force these packages to resolve from example/node_modules only
// This prevents duplicate React instances
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated': path.resolve(projectRoot, 'node_modules/react-native-reanimated'),
  'react-native-gesture-handler': path.resolve(projectRoot, 'node_modules/react-native-gesture-handler'),
  'react-native-worklets': path.resolve(projectRoot, 'node_modules/react-native-worklets'),
  '@shopify/react-native-skia': path.resolve(projectRoot, 'node_modules/@shopify/react-native-skia'),
};

// Force Metro to resolve peer dependencies from node_modules
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
