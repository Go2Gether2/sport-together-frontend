import type { ApiErrorBody } from './types'

export const API_BASE = '/api/v1'

// Токен только в памяти: по правилам безопасности не кладём его в localStorage.
let token: string | null = null

export function setToken(value: string | null) {
  token = value
}

export function getToken() {
  return token
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }

  /** Мероприятие снято или удалено (410). */
  get isGone() {
    return this.status === 410
  }

  get isUnauthorized() {
    return this.status === 401
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  0: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',
  401: 'Нужно войти в аккаунт.',
  403: 'Недостаточно прав для этого действия.',
  404: 'Не найдено.',
  409: 'Действие сейчас недоступно.',
  410: 'Мероприятие недоступно.',
  422: 'Проверьте заполнение полей.',
}

function fallbackMessage(status: number) {
  return FALLBACK_MESSAGES[status] ?? 'Что-то пошло не так. Попробуйте ещё раз.'
}

type Query = Record<string, string | number | boolean | null | undefined>

export function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

interface RequestOptions {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

async function parseError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | null = null
  try {
    body = (await response.json()) as Partial<ApiErrorBody>
  } catch {
    body = null
  }
  const error = body?.error
  return new ApiError(
    response.status,
    error?.code ?? `http_${response.status}`,
    error?.message || fallbackMessage(response.status),
    error?.fields ?? {},
  )
}

export async function request<T>(
  method: string,
  path: string,
  { query, body, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, 'network', fallbackMessage(0))
  }

  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('DELETE', path, { ...options, body }),
}
