import sharp from 'sharp'
import { RichError } from '@noname.team/errors'

/**
 * Validate a file as exactly image file
 * @param {!String} imagePath - is image path
 * @return {Promise<undefined, RichError>} - resolves when everything is ok. Reject error if file is not an image
 */
export default async (imagePath) => {
  try {
    await sharp(imagePath)
  } catch (error) {
    throw new RichError('Provided file is not an image', 'ERR_FILE_IS_NOT_IMAGE')
  }
}
