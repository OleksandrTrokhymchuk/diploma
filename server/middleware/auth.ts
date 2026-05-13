import { getAppSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  try {
    const session = await getAppSession(event)
    if (session.userId && session.role) {
      event.context.user = { userId: session.userId, role: session.role }
    }
  } catch {
    // недійсна або прострочена сесія — обробляємо як гостя
  }
})
