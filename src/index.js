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

export default {
  parseURLQuery,
  stringifyURLQuery,
  replaceSubstr
}
