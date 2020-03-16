import fs from 'fs'
import crypto from 'crypto'

export default (data, sig, keyPath) => {
  const key = fs.readFileSync(keyPath)

  return crypto.createVerify('SHA1')
    .update(data)
    .verify(key, sig, 'base64')
}
