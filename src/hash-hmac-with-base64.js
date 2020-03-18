import crypto from 'crypto'

export default (algo = 'sha256', v, k) => crypto.createHmac(algo, k)
  .update(v)
  .digest()
  .toString('base64')
