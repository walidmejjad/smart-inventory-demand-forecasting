const countFormatter = new Intl.NumberFormat('en-GB')
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' })
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

export const dashboardTimeZone = dateFormatter.resolvedOptions().timeZone
export function formatCount(value: number) { return countFormatter.format(value) }

/** Keep decimal-string money exact, including values larger than Number.MAX_SAFE_INTEGER. */
export function formatAmount(value: string) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match?.[2]) return '—'
  return `${match[1]}${countFormatter.format(BigInt(match[2]))}.${(match[3] ?? '').padEnd(2, '0')}`
}

export function formatSaleDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: 'Date unavailable', time: '' }
  return { date: dateFormatter.format(date), time: timeFormatter.format(date) }
}

export function formatCheckedTime(value: Date) { return timeFormatter.format(value) }
