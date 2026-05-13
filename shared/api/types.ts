/** Тіло POST `/api/ai/chat` (поле `_requestId` лише для уникнення кешу useFetch). */
export interface ChatApiBody {
  message: string
  currentUrl?: string
  contextId?: string
  _requestId?: number
}

export interface ChatApiResponse {
  reply: string
}

export interface ComponentStockHistoryItem {
  id: string
  changeAmount: number
  balanceAfter: number
  reason: 'REPLENISHMENT' | 'ORDER' | 'WRITE_OFF'
  reasonNote: string | null
  createdAt: string
}

export interface ComponentListItem {
  id: string
  sku: string
  name: string
  category: 'DISTANCE_SENSOR' | 'CAMERA' | 'SERVO_DRIVE' | 'MANIPULATOR'
  manufacturer: string
  model: string
  description: string
  unitPrice: string
  quantityOnHand: number
  minStockLevel: number
  createdAt: string
  updatedAt: string
  stockHistory: ComponentStockHistoryItem[]
}

export interface ComponentsApiResponse {
  items: ComponentListItem[]
  total: number
}

export type ProductCategory = 'DISTANCE_SENSOR' | 'CAMERA' | 'SERVO_DRIVE' | 'MANIPULATOR'
export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'name_asc'

export interface ProductListItem {
  id: string
  sku: string
  name: string
  category: ProductCategory
  manufacturer: string
  description: string
  unitPrice: number
  minStockLevel: number
  currentStock: number
  imageUrl: string | null
}

export interface ProductsApiResponse {
  items: ProductListItem[]
  total: number
  page: number
  pageSize: number
  categories: ProductCategory[]
  manufacturers: string[]
}

export type UserRole = 'ADMIN' | 'WORKER'
export type StockReason = 'REPLENISHMENT' | 'ORDER' | 'WRITE_OFF'

/** Публічні поля поточного користувача (без секретів). */
export interface PublicUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface AdminUserListItem extends PublicUser {
  createdAt: string
}

export type TrendPointReason = StockReason | 'BASELINE' | 'SNAPSHOT'

export interface ProductTrendPoint {
  date: string
  balanceAfter: number
  reason: TrendPointReason
  reasonNote: string | null
}

export interface ProductStockHistoryItem {
  id: string
  changeAmount: number
  balanceAfter: number
  reason: StockReason
  reasonNote: string | null
  createdAt: string
  user: Pick<PublicUser, 'id' | 'email' | 'firstName' | 'lastName'> | null
}

export interface ProductDetails {
  id: string
  sku: string
  name: string
  category: ProductCategory
  manufacturer: string
  model: string
  description: string
  /** Ключ — назва характеристики, значення — текст (з БД JSON). */
  specs: Record<string, string> | null
  imageUrl: string | null
  unitPrice: number
  minStockLevel: number
  currentStock: number
  stockHistory: ProductStockHistoryItem[]
  stockTrend: ProductTrendPoint[]
}

export interface ProductScoutResponse {
  available: boolean
  insight: string
}

export interface InventoryListItem {
  id: string
  sku: string
  name: string
  currentStock: number
  minStockLevel: number
  trendPoints: number[]
}

export interface InventoryListResponse {
  items: InventoryListItem[]
  total: number
  page: number
  pageSize: number
}

export interface ReplenishmentRequestLine {
  productId: string
  sku: string
  name: string
  cartQuantity: number
  currentStock: number
  minStockLevel: number
  recommendedOrderQty: number
}

export interface ReplenishmentRequestItem {
  id: string
  createdAt: string
  user: Pick<PublicUser, 'id' | 'email' | 'firstName' | 'lastName'> | null
  lines: ReplenishmentRequestLine[]
}

export interface ProductPatchBody {
  name?: string
  description?: string
  unitPrice?: number
  specs?: Record<string, string> | null
}
