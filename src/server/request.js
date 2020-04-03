import https from 'https'
import { HttpError } from '@noname.team/errors'

/**
 * make a request
 * @param {!String} url - requested url
 * @param {Object} options - nodejs http request options
 * @return {Promise<any, HttpError>} - resolves with response body. Throws HttpError if any error
 */
export default (url = 'https://google.com', options = {}) => new Promise((resolve, reject) => {
  const {
    data = '',
    method = 'GET',
    headers = {},
    noParse
  } = options

  delete options.data
  delete options.method
  delete options.noParse

  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (data) {
    headers['Content-Length'] = data.length
  }

  const req = https.request(url, Object.assign({}, options, { method, headers }), (res) => {
    let body = ''

    res.on('data', (chunk) => {
      body = body + chunk
    })
    res.on('end', () => {
      if (res.statusCode >= 400) {
        reject(new HttpError(res.statusCode))
      } else {
        resolve(noParse ? body : JSON.parse(body))
      }
    })
  })

  req.on('error', () => reject(new HttpError()))
  data && req.write(data)
  req.end()
})
