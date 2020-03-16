import cryptoJs from 'crypto-js'

export default (v, salt) => JSON.parse(cryptoJs.AES.decrypt(v, salt)
  .toString(cryptoJs.enc.Utf8))
