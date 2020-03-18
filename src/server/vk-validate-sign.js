import replaceSubstr from '../replace-substr'
import stringifyURLQuery from '../stringify-url-query'
import hashHmacWithBase64 from '../hash-hmac-with-base64'

export default (data, secret) => {
  const { sign } = data

  delete data.sign

  const searchString = stringifyURLQuery(data)
  let signGenerated = replaceSubstr(hashHmacWithBase64('sha256', searchString, secret), { '+': '-', '/': '_' })
    .trimEnd()

  if (signGenerated.endsWith('=')) {
    signGenerated = signGenerated.slice(0, -1)
  }

  return signGenerated === sign
}
