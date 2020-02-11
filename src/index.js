import { AllHtmlEntities } from 'html-entities'

const entities = new AllHtmlEntities()

export const parseURLQuery = (str) => {
  if (typeof str !== 'string' || !str.length) {
    return {}
  }

  const s = str.split('&')
  const query = {}
  let bit
  let first
  let second

  for (let i = 0; i < s.length; i++) {
    bit = s[i].split('=')
    first = decodeURIComponent(bit[0])

    if (first.length && (first.startsWith('vk_') || first === 'sign')) {
      second = decodeURIComponent(bit[1])
      if (typeof query[first] === 'undefined') {
        query[first] = second
      } else if (Array.isArray(query[first])) {
        query[first].push(second)
      } else {
        query[first] = [query[first], second]
      }
    }
  }

  return query
}

export const stringifyURLQuery = (params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((r, k) => ({ ...r, [k]: params[k] }), {})
  const searchParameters = new URLSearchParams()

  Object.keys(sortedParams)
    .forEach((parameterName) => {
      searchParameters.append(parameterName, sortedParams[parameterName])
    })

  return searchParameters.toString()
}

export const replaceSubstr = (...args) => {
  let [s, p, r] = args || []

  return !!s && {
    2: () => {
      for (const i in p) {
        s = replaceSubstr(s, i, p[i])
      }
      return s
    },
    3: () => s.replace(new RegExp(`[${p}]`, 'g'), r),
    0: () => false
  }[args.length]()
}

export const unescapeHtmlChars = (v = '') => entities.decode(v)

export const unescapeHtmlCharsFromVkGeoData = d => ({
  ...d,
  title: d.title ? unescapeHtmlChars(d.title) : d.title
})

export const unescapeHtmlCharsFromVkUserData = d => ({
  ...d,
  first_name: d.first_name ? unescapeHtmlChars(d.first_name) : d.first_name,
  last_name: d.last_name ? unescapeHtmlChars(d.last_name) : d.last_name,
  city: typeof d.city === 'object' ? unescapeHtmlCharsFromVkGeoData(d.city) : d.city,
  country: typeof d.country === 'object' ? unescapeHtmlCharsFromVkGeoData(d.country) : d.country
})

export const getNumDescription = (n, textForms) => {
  const num = Math.abs(n) % 100
  const num1 = num % 10

  if (num > 10 && num < 20) {
    return textForms[2]
  }
  if (num1 > 1 && num1 < 5) {
    return textForms[1]
  }
  if (num1 === 1) {
    return textForms[0]
  }
  return textForms[2]
}

export const getAgeDescription = n => getNumDescription(n, ['год', 'года', 'лет'])

export const getAge = birthDate => Math.trunc((new Date() - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 365.245))

export const formatVkBirthDate = (vkBDate) => {
  if (!vkBDate) {
    return new Date(2001, 0)
  }

  const parts = vkBDate.split('.')
    .map(v => +v)

  parts[1] -= 1

  let birthDate = new Date(parts[2] || 2001, parts[1], parts[0])
  const minBirthDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365.245 * 120)

  if (birthDate < minBirthDate) {
    birthDate = new Date(minBirthDate.getFullYear(), parts[1], parts[0])
  }

  return birthDate
}

export const addRequestPagination = ({ limit = 20, offset = 0 } = {}) => `limit=${limit}&offset=${offset}`

export const base64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)
    const byteNumbers = new Array(slice.length)

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }

  return new Blob(byteArrays, { type: contentType })
}

export default {
  parseURLQuery,
  stringifyURLQuery,
  replaceSubstr,
  unescapeHtmlChars,
  unescapeHtmlCharsFromVkGeoData,
  unescapeHtmlCharsFromVkUserData,
  getNumDescription,
  getAgeDescription,
  getAge,
  formatVkBirthDate,
  addRequestPagination,
  base64toBlob
}
