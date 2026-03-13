import { APP_BASE_PATH } from './config.ts'
import { getRuntimeBasePath } from './runtime.ts'

function normalizeBasePath(value) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return ''
  const withoutTrailing = trimmed.replace(/\/+$/, '')
  return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`
}

export const appBasePath = normalizeBasePath(APP_BASE_PATH)

function resolveAppBasePath() {
  return getRuntimeBasePath(appBasePath)
}

export function withAppBasePath(pathname) {
  const resolvedBasePath = resolveAppBasePath()
  if (!pathname) {
    return resolvedBasePath || '/'
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!resolvedBasePath) return normalizedPath
  if (normalizedPath === '/') return `${resolvedBasePath}/`
  return `${resolvedBasePath}${normalizedPath}`
}

export function stripAppBasePath(pathname) {
  const resolvedBasePath = resolveAppBasePath()
  if (!resolvedBasePath) return pathname || '/'
  if (!pathname) return '/'
  if (pathname === resolvedBasePath) return '/'
  if (pathname.startsWith(`${resolvedBasePath}/`)) {
    const stripped = pathname.slice(resolvedBasePath.length)
    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }
  return pathname
}
