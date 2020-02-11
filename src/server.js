import { hashHmacWithBase64 } from '@noname.team/crypto'
import { stringifyURLQuery, replaceSubstr } from './index'

export const validateVkSign = (data, secret) => {
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

export default {
  validateVkSign
}
