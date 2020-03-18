import wget from 'wget-improved'
import { RichError } from '@noname.team/errors'

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
export default ({
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
    return reject(new RichError(error.message || 'File source is broken', 'ERR_FILE_SOURCE_BROKEN'))
  }

  wget.download(urlParsed.href, to, wgetOptions)
    .on('error', (error) => reject(new RichError(error.message || 'File can not be loaded', 'ERR_FILE_CAN_NOT_BE_LOADED')))
    .on('start', onStart)
    .on('progress', onProgress)
    .on('end', resolve)
})
