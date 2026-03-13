const normalizeBasePath = (value?: string | null): string => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return ''
  const withoutTrailing = trimmed.replace(/\/+$/, '')
  return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`
}

export const appBasePath = normalizeBasePath(process.env.APP_BASE_PATH)

export function withAppBasePath(pathname: string): string {
  if (!pathname) {
    return appBasePath || '/'
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!appBasePath) return normalizedPath
  if (normalizedPath === '/') return `${appBasePath}/`
  return `${appBasePath}${normalizedPath}`
}

export function appRouteVariants(pathname: string): string[] {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!appBasePath) return [normalizedPath]
  return [normalizedPath, withAppBasePath(normalizedPath)]
}
