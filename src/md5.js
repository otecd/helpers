import crypto from 'crypto'

export default v => crypto.createHash('md5')
  .update(typeof v === 'string' ? v : JSON.stringify(v))
  .digest('hex')
