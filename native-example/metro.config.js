const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..')];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];
const nativePackages = [
  'react', 'react-native', 'react-native-reanimated', 'react-native-worklets',
  'react-native-svg', '@shopify/react-native-skia', 'svg-path-properties',
];
config.resolver.resolveRequest = (context, name, platform) => {
  // Shared files live beside the browser preview. Keep their native runtime
  // imports on this app's versions while allowing nested package dependencies.
  const native = nativePackages.some(pkg => name === pkg || name.startsWith(pkg + '/'));
  return context.resolveRequest(native ? {
    ...context,
    originModulePath: path.join(__dirname, 'index.js'),
  } : context, name, platform);
};
module.exports = config;
