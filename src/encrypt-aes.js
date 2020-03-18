import cryptoJs from 'crypto-js'

export default (v, salt) => cryptoJs.AES.encrypt(typeof v === 'string' ? v : JSON.stringify(v), salt)
  .toString()
