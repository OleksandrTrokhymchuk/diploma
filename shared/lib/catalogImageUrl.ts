/** Локальні оптимізовані WebP (public/catalog/photos/), ~12–52 KiB, 640×360. */
const CATEGORY_PHOTO: Record<string, string> = {
  DISTANCE_SENSOR: '/catalog/photos/distance-sensor.webp',
  CAMERA: '/catalog/photos/camera.webp',
  SERVO_DRIVE: '/catalog/photos/servo-drive.webp',
  MANIPULATOR: '/catalog/photos/manipulator.webp',
}

const LEGACY_REMOTE_PREFIXES = [
  'https://upload.wikimedia.org/',
  'http://upload.wikimedia.org/',
]

export function catalogCategoryFallbackImage(category: string) {
  return CATEGORY_PHOTO[category] ?? '/catalog/photos/camera.webp'
}

function isLegacyRemoteCatalogUrl(url: string) {
  return LEGACY_REMOTE_PREFIXES.some((prefix) => url.startsWith(prefix))
}

/** Повертає URL з БД або швидке локальне фото за категорією. */
export function resolveCatalogImageUrl(
  imageUrl: string | null | undefined,
  _sku: string,
  category: string,
): string {
  const trimmed = typeof imageUrl === 'string' ? imageUrl.trim() : ''
  if (!trimmed || isLegacyRemoteCatalogUrl(trimmed)) {
    return catalogCategoryFallbackImage(category)
  }
  if (trimmed.startsWith('/catalog/photos/')) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  return catalogCategoryFallbackImage(category)
}
