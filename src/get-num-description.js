export default (n, textForms) => {
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
