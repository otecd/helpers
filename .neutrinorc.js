module.exports = {
  use: [
    ['@neutrinojs/standardjs', {
      eslint: {
        globals: [
          'atob',
          'Blob',
          'FormData',
          'btoa'
        ]
      }
    }],
    [
      '@neutrinojs/library',
      {
        name: 'luna-helpers',
        target: 'node',
        libraryTarget: 'commonjs2',
        babel: {
          presets: [
            ['babel-preset-env', {
              targets: {
                node: '10.0'
              }
            }]
          ],
          'plugins': ['dynamic-import-node']
        }
      }
    ],
    '@neutrinojs/mocha'
  ]
};
