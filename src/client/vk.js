import vkBridge from '@vkontakte/vk-bridge'
import vkBridgeMock from '@vkontakte/vk-bridge-mock'
import fetch from 'isomorphic-unfetch'
import { AllHtmlEntities } from 'html-entities'
import { RichError } from '@noname.team/errors'
import base64toBlob from '../base64-to-blob'

export default class Vk {
  constructor ({
    isMock,
    apiVersion = '5.103',
    lang = 'ru'
  } = {}) {
    this.bridge = isMock ? vkBridgeMock : vkBridge
    this.apiVersion = apiVersion
    this.lang = lang
    this.entities = new AllHtmlEntities()
    this.unescapeHtmlCharsFromVkUserData = d => ({
      ...d,
      first_name: d.first_name ? this.entities.decode(d.first_name) : d.first_name,
      last_name: d.last_name ? this.entities.decode(d.last_name) : d.last_name,
      city: typeof d.city === 'object' && d.city.title ? { ...d.city, title: this.entities.decode(d.city.title) } : d.city,
      country: typeof d.country === 'object' && d.country.title ? { ...d.country, title: this.entities.decode(d.country.title) } : d.country
    })
  }

  async getToken ({ appId, scopeList = [] }) {
    let result

    try {
      result = await this.bridge.sendPromise('VKWebAppGetAuthToken', { app_id: appId, scope: scopeList.join() })
    } catch (error) {
      if (typeof error === 'object') {
        if (error.error_data && error.error_data.error_code && error.error_data.error_code === 4) {
          throw new RichError('Недостаточно прав для получения токена', 'ERR_VK_TOKEN_SCOPE_DENIED')
        }
      }
      throw new RichError('Ошибка во время получения токена', 'ERR_VK_TOKEN_OBTAINING_FAILURE')
    }

    if (scopeList.length && (!result.scope || result.scope.split(',').length < scopeList.length)) {
      throw new RichError('Недостаточно прав для получения токена', 'ERR_VK_TOKEN_SCOPE_DENIED')
    }

    return result.access_token
  }

  async searchCountries ({ vkToken, value }) {
    const getCountriesResponse = await this.bridge.sendPromise('VKWebAppCallAPIMethod', {
      method: 'database.getCountries',
      params: {
        need_all: 1,
        count: 1000,
        v: this.apiVersion,
        lang: this.lang,
        access_token: vkToken
      }
    })

    return getCountriesResponse.response.items
      .filter(c => c.title.toLowerCase()
        .startsWith(value))
      .map(({ id, title = '' }) => ({ value: this.entities.decode(title), vkFieldId: id }))
  }

  async searchCities ({
    vkToken,
    value,
    vkCountryId
  }) {
    const getCitiesResponse = await this.bridge.sendPromise('VKWebAppCallAPIMethod', {
      method: 'database.getCities',
      params: {
        country_id: vkCountryId,
        q: value,
        need_all: 1,
        count: 1000,
        v: this.apiVersion,
        lang: this.lang,
        access_token: vkToken
      }
    })

    return getCitiesResponse.response.items.map(({
      id,
      title = '',
      region = ''
    }) => ({
      value: this.entities.decode(title),
      vkFieldId: id,
      region: this.entities.decode(region)
    }))
  }

  async executeApiMethods ({
    vkToken,
    vkCountryIds,
    vkCityIds,
    vkUserIds,
    vkGroupsOfUserId,
    vkPhotosOfUserId
  }) {
    const entityReducer = [(r, c) => ({ ...r, [c.id]: this.entities.decode(c.title || '') }), {}]
    const photosMapper = ({ sizes }) => {
      let currentSize = { height: 0 }

      sizes.forEach((s) => {
        if (s.height >= currentSize.height && s.height <= 1000) {
          currentSize = s
        }
      })

      return currentSize.url
    }
    const executeResponse = await this.bridge.sendPromise('VKWebAppCallAPIMethod', {
      method: 'execute',
      params: {
        code: `
          return {
            ${vkCountryIds ? `
              countries: API.database.getCountriesById({
                country_ids: '${vkCountryIds.join(',')}',
                v: '${this.apiVersion}'
              }),
            ` : ''}
            ${vkCityIds ? `
              cities: API.database.getCitiesById({
                city_ids: '${vkCityIds.join(',')}',
                v: '${this.apiVersion}'
              }),
            ` : ''}
            ${vkUserIds ? `
              users: API.users.get({
                user_ids: '${vkUserIds.join(',')}',
                fields: 'timezone,about,sex,city,country,bdate,photo_200,photo_max_orig',
                v: '${this.apiVersion}'
              }),
            ` : ''}
            ${vkGroupsOfUserId ? `
              groups: API.groups.get({
                user_id: ${vkGroupsOfUserId},
                v: '${this.apiVersion}'
              }),
            ` : ''}
          };
        `,
        v: this.apiVersion,
        lang: this.lang,
        access_token: vkToken
      }
    })

    if (vkPhotosOfUserId) {
      executeResponse.response.photos = await new Promise((resolve, reject) => {
        setTimeout(async () => {
          let vkApiPhotosData

          try {
            vkApiPhotosData = await this.bridge.sendPromise('VKWebAppCallAPIMethod', {
              method: 'photos.get',
              params: {
                owner_id: vkPhotosOfUserId,
                album_id: 'profile',
                rev: 1,
                count: 10,
                v: this.apiVersion,
                lang: this.lang,
                access_token: vkToken
              }
            })
          } catch (error) {
            if (error.error_data && !error.error_data.error_reason) {
              return error.error_data.error_code === 30
                ? resolve({ items: [] })
                : reject(new RichError(error.error_data.error_msg, 'ERR_VK_API_PHOTOS_GET_FAILED'))
            }
            if (error.error_data && error.error_data.error_reason) {
              return error.error_data.error_reason.error_code === 30
                ? resolve({ items: [] })
                : reject(new RichError(error.error_data.error_reason.error_msg, 'ERR_VK_API_PHOTOS_GET_FAILED'))
            }
            return reject(new RichError('Ошибка при получении фотографий из VK', 'ERR_VK_API_PHOTOS_GET_FAILED'))
          }

          return resolve(vkApiPhotosData.response)
        }, 1000)
      })
    }

    return {
      vkCountriesById: vkCountryIds && (executeResponse.response.countries || []).reduce(...entityReducer),
      vkCitiesById: vkCityIds && (executeResponse.response.cities || []).reduce(...entityReducer),
      vkUsers: vkUserIds && (executeResponse.response.users || []).map(this.unescapeHtmlCharsFromVkUserData),
      vkGroups: vkGroupsOfUserId && ((executeResponse.response.groups || {}).items || []),
      vkPhotos: vkPhotosOfUserId && ((executeResponse.response.photos || {}).items || []).map(photosMapper)
    }
  }

  getImagesNativeViewer ({ images, startIndex }) {
    return this.bridge.sendPromise('VKWebAppShowImages', { images, start_index: startIndex })
  }

  async getInitialUserData () {
    const result = await this.bridge.sendPromise('VKWebAppGetUserInfo', {
      params: { lang: this.lang }
    })

    return this.unescapeHtmlCharsFromVkUserData(result)
  }

  async repostToStories ({
    vkToken,
    file,
    type,
    link = { type: '', url: '' }
  }) {
    const method = { photo: 'stories.getPhotoUploadServer', video: 'stories.getVideoUploadServer' }

    if (!file || !type) {
      throw new RichError('Пропущены необходимые параметры', 'ERR_REQUIRED_ARGUMENT_MISSED')
    }

    if (typeof (file) === 'string' && (file.includes('http'))) {
      const response = await fetch(file, { method: 'GET', mode: 'no-cors' })
      const buffer = await response.arrayBuffer()
      const image = btoa((new Uint8Array(buffer)).reduce((data, byte) => data + String.fromCharCode(byte), ''))

      if (!image) {
        throw new RichError('Ошибка во время загрузки файла', 'ERR_FILE_CAN_NOT_BE_LOADED')
      } else {
        return this.repostToStories({ vkToken, file: base64toBlob(image), type, link })
      }
    }

    const { response } = await this.bridge.sendPromise('VKWebAppCallAPIMethod', {
      method: method[type],
      params: {
        add_to_news: 1,
        link_text: link.type,
        link_url: link.url,
        v: this.apiVersion,
        lang: this.lang,
        access_token: vkToken
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

  repostToWall ({ message, attachments }) {
    return this.bridge.sendPromise('VKWebAppShowWallPostBox', {
      message,
      attachments,
      close_comments: 1,
      v: this.apiVersion,
      lang: this.lang
    })
  }

  async askForNotificationsSending () {
    let result

    try {
      result = await this.bridge.sendPromise('VKWebAppAllowNotifications', {})
    } catch (error) {
      result = { result: false }
    }

    return result
  }

  async showStoryBox ({
    backgroundType,
    attachmentText,
    attachmentType,
    attachmentUrl,
    url,
    locked
  }) {
    let result

    try {
      ({ result } = await this.bridge.sendPromise('VKWebAppShowStoryBox', {
        background_type: backgroundType,
        attachment: {
          text: attachmentText,
          type: attachmentType,
          url: attachmentUrl
        },
        url,
        locked: locked
      }))
    } catch (error) {
      throw new RichError(error.message || 'Ошибка при открытие редактора историй', 'ERR_VK_OPEN_STORY_BOX_ABORTED')
    }

    if (!result.status) {
      throw new RichError('Ошибка при открытие редактора историй', 'ERR_VK_OPEN_STORY_BOX_ABORTED')
    }

    return true
  }

  async pay ({
    amount,
    description,
    appId,
    sign,
    merchantId,
    merchantData,
    merchantSign,
    orderId,
    ts
  }) {
    const action = 'pay-to-service'
    let result

    try {
      ({ result } = await this.bridge.sendPromise('VKWebAppOpenPayForm', {
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
      throw new RichError(error.message || 'Ошибка при проведении платежа', 'ERR_VK_PAY_PAYMENT_ABORTED')
    }

    if (!result.status) {
      throw new RichError('Ошибка при проведении платежа', 'ERR_VK_PAY_PAYMENT_ABORTED')
    }

    return true
  }
}
