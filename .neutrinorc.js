const library = require('@neutrinojs/library')

module.exports = {
  options: {
    mains: {
      'base64-to-blob': 'base64-to-blob',
      'decrypt-aes': 'decrypt-aes',
      'encrypt-aes': 'encrypt-aes',
      'get-age': 'get-age',
      'get-num-description': 'get-num-description',
      'hash-hmac-with-base64': 'hash-hmac-with-base64',
      index: 'index',
      md5: 'md5',
      'parse-url-query': 'parse-url-query',
      'replace-substr': 'replace-substr',
      sha1: 'sha1',
      'stringify-url-query': 'stringify-url-query',
      'vk-format-birth-date': 'vk-format-birth-date',
      'client/index': 'client/index',
      'client/vk': 'client/vk',
      'server/download-file-by-url': 'server/download-file-by-url',
      'server/index': 'server/index',
      'server/request': 'server/request',
      'server/validate-image-file': 'server/validate-image-file',
      'server/validate-sha1-signature': 'server/validate-sha1-signature',
      'server/vk-validate-sign': 'server/vk-validate-sign'
    }
  },
  use: [
    library({
      name: 'Helpers',
      target: 'node',
      targets: {
        node: '12'
      },
      externals: {
        whitelist: ['@noname.team/errors']
      }
    }),
    (neutrino) => {
      if (process.env.NODE_ENV === 'production') {
        neutrino.config.optimization
          .minimizer('terser')
          .use(require.resolve('terser-webpack-plugin'), [{
            sourceMap: false,
            terserOptions: {
              compress: { drop_console: true }
            }
          }])
      }
    }
  ]
}
