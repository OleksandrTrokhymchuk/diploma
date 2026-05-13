import type { ProductCategory, UserRole } from '~/shared/api/types'

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  MANIPULATOR: 'Маніпулятор',
  CAMERA: 'Камера',
  SERVO_DRIVE: 'Сервопривід',
  DISTANCE_SENSOR: 'Датчик відстані',
}

export function formatProductCategory(category: string): string {
  return CATEGORY_LABELS[category as ProductCategory] ?? category.replaceAll('_', ' ')
}

export function formatUserRole(role: UserRole | string): string {
  if (role === 'ADMIN') return 'Адміністратор'
  if (role === 'WORKER') return 'Працівник'
  return String(role)
}

export function formatStockReason(reason: string): string {
  const map: Record<string, string> = {
    REPLENISHMENT: 'Поповнення',
    ORDER: 'Замовлення',
    WRITE_OFF: 'Списання',
    BASELINE: 'Початок періоду',
    SNAPSHOT: 'Поточний знімок',
  }
  return map[reason] ?? reason
}

export function formatUsdPrice(amount: number): string {
  return `${amount.toFixed(2)} дол. США`
}
