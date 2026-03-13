import { APP_BASE_PATH } from './config.ts'

function normalizeBasePath(value) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return ''
  const withoutTrailing = trimmed.replace(/\/+$/, '')
  return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`
}

export const appBasePath = normalizeBasePath(APP_BASE_PATH)

export function withAppBasePath(pathname) {
  if (!pathname) {
    return appBasePath || '/'
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!appBasePath) return normalizedPath
  if (normalizedPath === '/') return `${appBasePath}/`
  return `${appBasePath}${normalizedPath}`
}

export function stripAppBasePath(pathname) {
  if (!appBasePath) return pathname || '/'
  if (!pathname) return '/'
  if (pathname === appBasePath) return '/'
  if (pathname.startsWith(`${appBasePath}/`)) {
    const stripped = pathname.slice(appBasePath.length)
    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }
  return pathname
}
