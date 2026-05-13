export function parsePage(value: unknown, fallback = 1): number {
  const raw = typeof value === 'string' ? value.trim() : ''
  const parsed = Number.parseInt(raw || String(fallback), 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback
}

export function parsePageSize(value: unknown, fallback: number, max: number): number {
  const parsed = parsePage(value, fallback)
  return Math.min(Math.max(parsed, 1), max)
}
