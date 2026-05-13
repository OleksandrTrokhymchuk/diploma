import type { UserRole } from '@prisma/client'

declare module 'h3' {
  interface H3EventContext {
    user?: { userId: string; role: UserRole }
  }
}

export {}
