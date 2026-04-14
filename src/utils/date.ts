export function isValidDate(date: string): boolean {
  const digits = date.replace(/\D/g, '')
  if (digits.length !== 8) return false

  const day   = parseInt(digits.slice(0, 2))
  const month = parseInt(digits.slice(2, 4))
  const year  = parseInt(digits.slice(4, 8))

  if (month < 1 || month > 12) return false
  if (day   < 1 || day   > 31) return false
  if (year  < 1900)            return false

  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) return false

  const today     = new Date()
  const inputDate = new Date(year, month - 1, day)
  if (inputDate > today) return false

  return true
}