const path = require('path');
const pak = require('../package.json');

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            // For development, we want to alias the library to the source
            [pak.name]: path.join(__dirname, '..', pak.source),
          },
        },
      ],
      // Worklets plugin is needed for the aliased library source code
      // (Expo's auto-config only handles node_modules)
      'react-native-worklets/plugin',
    ],
  };
};
