import fs from 'fs'
import crypto from 'crypto'
import wget from 'wget-improved'
import sharp from 'sharp'
import { RichError } from '@noname.team/errors'
import { stringifyURLQuery, replaceSubstr } from './index'
import { error_codes as errorCodes } from './const.json'

export const hashHmacWithBase64 = (algo = 'sha256', v, k) => crypto.createHmac(algo, k)
  .update(v)
  .digest()
  .toString('base64')

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

export const checkSignature = (data, sig, keyPath) => {
  const key = fs.readFileSync(keyPath)

  return crypto.createVerify('SHA1')
    .update(data)
    .verify(key, sig, 'base64')
}

/**
 * Download a file by URL
 * @param {Object} params
 * @param {!String} params.url - is source URL
 * @param {!String} params.to - is target path
 * @param {?Function} [params.onStart] - helper method that is firing on start of downloading
 * @param {?Function} [params.onProgress] - helper method that is firing multiple times while downloading
 * @param {?Object} [params.wgetOptions] - wget-improved options
 * @return {Promise<Object, RichError>} - resolves when everything is ok. Reject errors if file source is broken or if file can't be loaded
 */
export const downloadFileByURL = ({
  url,
  to,
  onStart = fileSize => fileSize,
  onProgress = progress => progress,
  wgetOptions = {}
}) => new Promise((resolve, reject) => {
  let urlParsed

  try {
    urlParsed = new URL(url)
  } catch (error) {
    return reject(new RichError(error.message || 'File source is broken', errorCodes.ERR_FILE_SOURCE_BROKEN))
  }

  wget.download(urlParsed.href, to, wgetOptions)
    .on('error', (error) => reject(new RichError(error.message || 'File can not be loaded', errorCodes.ERR_FILE_CAN_NOT_BE_LOADED)))
    .on('start', onStart)
    .on('progress', onProgress)
    .on('end', resolve)
})

/**
 * Validate a file as exactly image file
 * @param {!String} imagePath - is image path
 * @return {Promise<undefined, RichError>} - resolves when everything is ok. Reject error if file is not an image
 */
export const validateImageFile = async (imagePath) => {
  try {
    await sharp(imagePath)
  } catch (error) {
    throw new RichError('Provided file is not an image', errorCodes.ERR_FILE_IS_NOT_IMAGE)
  }
}

export default {
  hashHmacWithBase64,
  validateVkSign,
  checkSignature,
  downloadFileByURL,
  validateImageFile
}
