import { GoogleGenerativeAI } from '@google/generative-ai'
import type { H3Event } from 'h3'

/** Основна модель за замовчуванням (підтримується API v1beta). */
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'

/** Легша модель з окремою квотою — fallback при 429/503 або недоступній основній. */
export const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite'

export const GEMINI_OVERLOADED_MESSAGE =
  'Сервіс аналітики тимчасово перевантажений. Спробуйте через 30 секунд'

export class GeminiServiceExhaustedError extends Error {
  constructor(message = GEMINI_OVERLOADED_MESSAGE) {
    super(message)
    this.name = 'GeminiServiceExhaustedError'
  }
}

export function resolveGeminiApiKey(event?: H3Event): string {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const fromConfig =
    typeof config.geminiApiKey === 'string' ? config.geminiApiKey.trim() : ''
  if (fromConfig) return fromConfig
  return (
    process.env.NUXT_GEMINI_API_KEY?.trim()
    || process.env.GEMINI_API_KEY?.trim()
    || ''
  )
}

export function resolveGeminiModel(event?: H3Event): string {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const fromConfig =
    typeof config.geminiModel === 'string' ? config.geminiModel.trim() : ''
  if (fromConfig) return fromConfig
  return process.env.NUXT_GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL
}

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 6) return ''
  if (error == null) return ''
  if (error instanceof Error) {
    return `${error.message} ${error.cause ? collectErrorText(error.cause, depth + 1) : ''}`
  }
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error).slice(0, 2000)
    } catch {
      return ''
    }
  }
  return String(error)
}

function getNestedHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as Record<string, unknown>
  if (typeof e.status === 'number') return e.status
  if (typeof e.statusCode === 'number') return e.statusCode
  const nested = e.error
  if (nested && typeof nested === 'object') {
    const code = (nested as { code?: unknown }).code
    if (typeof code === 'number') return code
  }
  const response = e.response as Record<string, unknown> | undefined
  if (response && typeof response.status === 'number') return response.status
  return undefined
}

export function isGeminiModelNotFoundError(error: unknown): boolean {
  const status = getNestedHttpStatus(error)
  if (status === 404) return true
  const blob = collectErrorText(error).toLowerCase()
  return blob.includes('is not found') || blob.includes('not supported for generatecontent')
}

/** Помилки, при яких варто перейти на fallback-модель. */
export function isGeminiRetryableError(error: unknown): boolean {
  const status = getNestedHttpStatus(error)
  if (status === 429 || status === 503) return true
  const blob = collectErrorText(error).toLowerCase()
  if (blob.includes('"code":429') || blob.includes('"code":503')) return true
  if (blob.includes('quota exceeded')) return true
  if (blob.includes('resource_exhausted')) return true
  if (blob.includes('too many requests')) return true
  if (blob.includes('rate limit')) return true
  if (blob.includes('service unavailable')) return true
  if (blob.includes('unavailable')) return true
  if (blob.includes('503')) return true
  if (blob.includes('429')) return true
  return false
}

function shouldFallbackGeminiError(error: unknown): boolean {
  return isGeminiRetryableError(error) || isGeminiModelNotFoundError(error)
}

type GenerateGeminiContentOptions = {
  apiKey: string
  model: string
  prompt: string
  systemInstruction?: string
}

async function callGeminiModel(options: GenerateGeminiContentOptions): Promise<string> {
  const genAI = new GoogleGenerativeAI(options.apiKey)
  const model = genAI.getGenerativeModel({
    model: options.model,
    ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
  })
  const result = await model.generateContent(options.prompt)
  return result.response.text()
}

function buildModelChain(primaryModel: string): string[] {
  const fallbacks = [GEMINI_FALLBACK_MODEL, GEMINI_DEFAULT_MODEL]
  return [...new Set([primaryModel, ...fallbacks])]
}

/**
 * Генерує відповідь Gemini з автоматичним fallback при 429/503 або недоступній моделі.
 */
export async function generateGeminiContent(
  options: GenerateGeminiContentOptions,
): Promise<string> {
  const { apiKey, model: primaryModel, prompt, systemInstruction } = options
  const models = buildModelChain(primaryModel)
  let lastError: unknown

  for (let i = 0; i < models.length; i++) {
    const model = models[i]!
    try {
      return await callGeminiModel({ apiKey, model, prompt, systemInstruction })
    } catch (error: unknown) {
      lastError = error
      const nextModel = models[i + 1]
      if (nextModel && shouldFallbackGeminiError(error)) {
        const reason = isGeminiModelNotFoundError(error)
          ? `model ${model} unavailable`
          : 'rate limits'
        console.warn(
          `Fallback triggered: switching to ${nextModel} due to ${reason}`,
        )
        continue
      }
      if (shouldFallbackGeminiError(error)) {
        throw new GeminiServiceExhaustedError()
      }
      throw error
    }
  }

  if (lastError && shouldFallbackGeminiError(lastError)) {
    throw new GeminiServiceExhaustedError()
  }
  throw lastError
}
