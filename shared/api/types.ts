/** Тіло POST `/api/ai/chat` (поле `_requestId` лише для уникнення кешу useFetch). */
export interface ChatApiBody {
  message: string
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
