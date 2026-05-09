const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve packages from both example and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// PERMANENT FIX: Block these packages from being resolved from root node_modules
// This prevents duplicate instances when the library has them as devDependencies
const packagesToBlock = [
  'react',
  'react-native',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-worklets',
  '@shopify/react-native-skia',
];

// Create regex patterns to block these packages from monorepo root node_modules
const blockPatterns = packagesToBlock.map((pkg) => {
  const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedRoot = monorepoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedRoot}/node_modules/${escapedPkg}/.*`);
});

// Use the blockList from the default config structure
config.resolver.blockList = blockPatterns;

// Ensure critical packages resolve from example's node_modules
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated': path.resolve(
    projectRoot,
    'node_modules/react-native-reanimated'
  ),
  'react-native-gesture-handler': path.resolve(
    projectRoot,
    'node_modules/react-native-gesture-handler'
  ),
  'react-native-worklets': path.resolve(
    projectRoot,
    'node_modules/react-native-worklets'
  ),
  '@shopify/react-native-skia': path.resolve(
    projectRoot,
    'node_modules/@shopify/react-native-skia'
  ),
  'chess.js': path.resolve(monorepoRoot, 'node_modules/chess.js'),
};

module.exports = config;
