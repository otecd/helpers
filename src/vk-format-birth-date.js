export default (vkBDate) => {
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
