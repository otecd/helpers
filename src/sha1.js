import crypto from 'crypto'

export default v => crypto.createHash('sha1')
  .update(v, 'binary')
  .digest('hex')
