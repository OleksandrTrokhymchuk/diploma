import { getAppSession } from '../../utils/session'
import { normalizeApiError } from '../../utils/apiError'

export default defineEventHandler(async (event) => {
  try {
    const session = await getAppSession(event)
    session.destroy()
    await session.save()
    return { ok: true }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося завершити сесію')
  }
})
