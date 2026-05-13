import type { UserRole } from '../app/generated/prisma/client'

declare module 'h3' {
  interface H3EventContext {
    user?: { userId: string; role: UserRole }
  }
}

export {}
