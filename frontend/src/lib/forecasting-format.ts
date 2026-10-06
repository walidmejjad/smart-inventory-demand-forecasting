import { formatSaleDate } from '@/lib/dashboard-format'
const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
export function formatForecastNumber(value: number) { return number.format(value) }
// API dates are calendar days. UTC noon keeps the shared Paris formatter on that day.
export function formatForecastDate(value: string) { return formatSaleDate(`${value}T12:00:00Z`).date }
export function modelLabel(value: string) { return value === 'RandomForestRegressor' ? 'Random Forest Regressor' : value }
