const library = require('@neutrinojs/library')

module.exports = {
  options: {
    output: 'for',
    mains: {
      index: 'index',
      client: 'client',
      server: 'server'
    }
  },
  use: [
    library({
      name: 'Helpers',
      target: 'node'
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
