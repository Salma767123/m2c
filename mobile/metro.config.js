const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
 
const config = getDefaultConfig(__dirname);

// Configure resolver to handle axios and other ESM packages properly
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'cjs', 'js', 'jsx', 'json', 'ts', 'tsx'],
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['require', 'import', 'react-native'],
  resolveRequest: (context, moduleName, platform) => {
    // Handle axios module resolution issues
    if (moduleName.includes('AxiosURLSearchParams')) {
      const axiosPath = path.resolve(__dirname, 'node_modules/axios/lib/helpers/AxiosURLSearchParams.js');
      return {
        filePath: axiosPath,
        type: 'sourceFile',
      };
    }
    
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });