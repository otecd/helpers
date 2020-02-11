import vkConnect from '@vkontakte/vk-connect'
import vkConnectMock from '@vkontakte/vk-connect-mock'
import fetch from 'isomorphic-unfetch'
import { RichError } from '@noname.team/errors'
import { error_codes as errorCodes } from './const.json'
import {
  unescapeHtmlChars,
  unescapeHtmlCharsFromVkUserData,
  base64toBlob
} from './index'

export const getVkToken = async ({
  appId,
  scopeList = [],
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  let result

  try {
    result = await vkC.sendPromise('VKWebAppGetAuthToken', { app_id: appId, scope: scopeList.join() })
  } catch (error) {
    if (typeof error === 'object') {
      if (error.error_data && error.error_data.error_code && error.error_data.error_code === 4) {
        throw new RichError('Недостаточно прав для получения токена', errorCodes.ERR_VK_TOKEN_SCOPE_DENIED)
      }
    }
    throw new RichError('Ошибка во время получения токена', errorCodes.ERR_VK_TOKEN_OBTAINING_FAILURE)
  }

  if (scopeList.length && (!result.scope || result.scope.split(',').length < scopeList.length)) {
    throw new RichError('Недостаточно прав для получения токена', errorCodes.ERR_VK_TOKEN_SCOPE_DENIED)
  }

  return result.access_token
}

export const searchVkCountries = async ({
  vkToken,
  value,
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  const getCountriesResponse = await vkC.sendPromise('VKWebAppCallAPIMethod', {
    method: 'database.getCountries',
    params: {
      need_all: 1,
      count: 1000,
      v: '5.103',
      lang: 'ru',
      access_token: vkToken
    }
  })

  return getCountriesResponse.response.items
    .filter(c => c.title.toLowerCase()
      .startsWith(value))
    .map(({ id, title }) => ({ value: unescapeHtmlChars(title), vkFieldId: id }))
}

export const searchVkCities = async ({
  vkToken,
  value,
  vkCountryId,
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  const getCitiesResponse = await vkC.sendPromise('VKWebAppCallAPIMethod', {
    method: 'database.getCities',
    params: {
      country_id: vkCountryId,
      q: value,
      need_all: 1,
      count: 1000,
      v: '5.103',
      lang: 'ru',
      access_token: vkToken
    }
  })

  return getCitiesResponse.response.items.map(({
    id,
    title,
    region
  }) => ({
    value: unescapeHtmlChars(title),
    vkFieldId: id,
    region: unescapeHtmlChars(region)
  }))
}

export const executeVkApiMethods = async ({
  vkToken,
  vkCountryIds,
  vkCityIds,
  vkUserIds,
  vkGroupsOfUserId,
  vkPhotosOfUserId,
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  const entityReducer = [(r, c) => ({ ...r, [c.id]: unescapeHtmlChars(c.title) }), {}]
  const photosMapper = ({ sizes }) => {
    let currentSize = { height: 0 }

    sizes.forEach((s) => {
      if (s.height >= currentSize.height && s.height <= 1000) {
        currentSize = s
      }
    })

    return currentSize.url
  }
  const executeResponse = await vkC.sendPromise('VKWebAppCallAPIMethod', {
    method: 'execute',
    params: {
      code: `
        return {
          ${vkCountryIds ? `
            countries: API.database.getCountriesById({
              country_ids: '${vkCountryIds.join(',')}',
              v: '5.103'
            }),
          ` : ''}
          ${vkCityIds ? `
            cities: API.database.getCitiesById({
              city_ids: '${vkCityIds.join(',')}',
              v: '5.103'
            }),
          ` : ''}
          ${vkUserIds ? `
            users: API.users.get({
              user_ids: '${vkUserIds.join(',')}',
              fields: 'timezone,about,sex,city,country,bdate,photo_200,photo_max_orig',
              v: '5.103'
            }),
          ` : ''}
          ${vkGroupsOfUserId ? `
            groups: API.groups.get({
              user_id: ${vkGroupsOfUserId},
              v: '5.103'
            }),
          ` : ''}
        };
      `,
      access_token: vkToken,
      lang: 'ru',
      v: '5.103'
    }
  })
  if (vkPhotosOfUserId) {
    executeResponse.response.photos = await new Promise((resolve, reject) => {
      setTimeout(async () => {
        let vkApiPhotosData

        try {
          vkApiPhotosData = await vkC.sendPromise('VKWebAppCallAPIMethod', {
            method: 'photos.get',
            params: {
              owner_id: vkPhotosOfUserId,
              album_id: 'profile',
              rev: 1,
              count: 10,
              v: '5.103',
              lang: 'ru',
              access_token: vkToken
            }
          })
        } catch (error) {
          if (error.error_data && !error.error_data.error_reason) {
            return error.error_data.error_code === 30
              ? resolve({ items: [] })
              : reject(new RichError(error.error_data.error_msg, errorCodes.ERR_VK_API_PHOTOS_GET_FAILED))
          }
          if (error.error_data && error.error_data.error_reason) {
            return error.error_data.error_reason.error_code === 30
              ? resolve({ items: [] })
              : reject(new RichError(error.error_data.error_reason.error_msg, errorCodes.ERR_VK_API_PHOTOS_GET_FAILED))
          }
          return reject(new RichError('Ошибка при получении фотографий из VK', errorCodes.ERR_VK_API_PHOTOS_GET_FAILED))
        }

        return resolve(vkApiPhotosData.response)
      }, 1000)
    })
  }

  return {
    vkCountriesById: vkCountryIds && (executeResponse.response.countries || []).reduce(...entityReducer),
    vkCitiesById: vkCityIds && (executeResponse.response.cities || []).reduce(...entityReducer),
    vkUsers: vkUserIds && (executeResponse.response.users || []).map(unescapeHtmlCharsFromVkUserData),
    vkGroups: vkGroupsOfUserId && ((executeResponse.response.groups || {}).items || []),
    vkPhotos: vkPhotosOfUserId && ((executeResponse.response.photos || {}).items || []).map(photosMapper)
  }
}

export const getVkImagesNativeViewer = ({
  images,
  startIndex,
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect

  return vkC.sendPromise('VKWebAppShowImages', { images, start_index: startIndex })
}

export const getInitialVkUserData = async ({ isMock, lang = 'ru' }) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  const result = await vkC.sendPromise('VKWebAppGetUserInfo', {
    params: { lang }
  })

  return unescapeHtmlCharsFromVkUserData(result)
}

export const repostToVkStories = async ({
  vkToken,
  file,
  type,
  link = { type: '', url: '' },
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  const method = { photo: 'stories.getPhotoUploadServer', video: 'stories.getVideoUploadServer' }

  if (!file || !type) {
    throw new RichError('Пропущены необходимые параметры', errorCodes.ERR_REQUIRED_ARGUMENT_MISSED)
  }

  if (typeof (file) === 'string' && (file.includes('http'))) {
    const response = await fetch(file, {
      method: 'GET',
      mode: 'no-cors'
    })
    const buffer = await response.arrayBuffer()
    const image = btoa((new Uint8Array(buffer)).reduce((data, byte) => data + String.fromCharCode(byte), ''))

    if (!image) {
      throw new RichError('Ошибка во время загрузки файла', errorCodes.ERR_FILE_CAN_NOT_BE_LOADED)
    } else {
      return repostToVkStories({ vkToken, file: base64toBlob(image), type, link })
    }
  }

  const { response } = await vkC.sendPromise('VKWebAppCallAPIMethod', {
    method: method[type],
    params: {
      v: '5.103',
      access_token: vkToken,
      add_to_news: 1,
      link_text: link.type,
      link_url: link.url
    }
  })
  const body = new FormData()
  const fileName = { photo: 'story.jpg', video: 'story.mp4' }

  body.append('file', file, fileName[type])

  return fetch(response.upload_url, {
    method: 'POST',
    mode: 'no-cors',
    body
  })
}

export const repostToVkWall = ({
  message,
  attachments,
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect

  return vkC.sendPromise('VKWebAppShowWallPostBox', {
    message,
    attachments,
    v: '5.103',
    close_comments: 1
  })
}

export const askForVkNotificationsSending = async ({ isMock }) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  let result

  try {
    result = await vkC.sendPromise('VKWebAppAllowNotifications', {})
  } catch (error) {
    result = { result: false }
  }

  return result
}

export const openVkPayWindow = async ({
  amount,
  description,
  appId,
  sign,
  merchantId,
  merchantData,
  merchantSign,
  orderId,
  ts,
  isMock
}) => {
  const vkC = isMock ? vkConnectMock : vkConnect
  const action = 'pay-to-service'
  let result

  try {
    ({ result } = await vkC.sendPromise('VKWebAppOpenPayForm', {
      app_id: appId,
      action,
      params: {
        amount,
        description,
        action,
        merchant_id: merchantId,
        version: 2,
        sign,
        data: {
          currency: 'RUB',
          merchant_data: merchantData,
          merchant_sign: merchantSign,
          order_id: orderId,
          ts
        }
      }
    }))
  } catch (error) {
    throw new RichError(error.message || 'Ошибка при проведении платежа', errorCodes.ERR_VK_PAY_PAYMENT_ABORTED)
  }

  if (!result.status) {
    throw new RichError('Ошибка при проведении платежа', errorCodes.ERR_VK_PAY_PAYMENT_ABORTED)
  }

  return true
}

export default {
  getVkToken,
  searchVkCountries,
  searchVkCities,
  executeVkApiMethods,
  getVkImagesNativeViewer,
  getInitialVkUserData,
  repostToVkStories,
  repostToVkWall,
  askForVkNotificationsSending,
  openVkPayWindow
}
