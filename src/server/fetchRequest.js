import request from './request'

export default async (url, options = {}) => {
  const res = await request(url, { ...options })

  return JSON.parse(res)
}
