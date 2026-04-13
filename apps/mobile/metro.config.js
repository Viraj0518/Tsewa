const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force single React instance — @expo/cli bundles a canary React that conflicts
const projectRoot = path.resolve(__dirname, '../..');
const singletonModules = ['react', 'react-dom'];

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (singletonModules.includes(moduleName)) {
      return {
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
