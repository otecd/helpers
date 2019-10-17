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
export const getAge = birthDate => Math.trunc((new Date() - birthDate) / (1000 * 60 * 60 * 24 * 365.245))

export default {
  parseURLQuery,
  stringifyURLQuery,
  replaceSubstr,
  unescapeHtmlChars,
  getNumDescription,
  getAge
}
