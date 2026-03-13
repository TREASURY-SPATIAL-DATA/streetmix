type TreasuryStreetmixEmbedConfig = {
  enabled?: boolean
  pathname?: string
  search?: string
  hash?: string
  basePath?: string
}

declare global {
  interface Window {
    __TREASURY_STREETMIX_EMBED__?: TreasuryStreetmixEmbedConfig
  }
}

const normalizePathname = (pathname?: string): string => {
  if (!pathname) return '/'
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

const normalizeSearch = (search?: string): string => {
  if (!search) return ''
  return search.startsWith('?') ? search : `?${search}`
}

const normalizeHash = (hash?: string): string => {
  if (!hash) return ''
  return hash.startsWith('#') ? hash : `#${hash}`
}

export function getEmbedConfig(): TreasuryStreetmixEmbedConfig | null {
  if (typeof window === 'undefined') return null
  return window.__TREASURY_STREETMIX_EMBED__ ?? null
}

export function isEmbeddedRuntime(): boolean {
  const config = getEmbedConfig()
  if (!config) return false
  if (typeof config.enabled === 'boolean') return config.enabled
  return true
}

export function getRuntimeUrl(): URL {
  const currentUrl = new URL(window.location.href)
  const config = getEmbedConfig()

  if (!isEmbeddedRuntime() || !config) {
    return currentUrl
  }

  currentUrl.pathname = normalizePathname(config.pathname)
  currentUrl.search = normalizeSearch(config.search)
  currentUrl.hash = normalizeHash(config.hash)
  return currentUrl
}

export function getRuntimeOrigin(): string {
  return getRuntimeUrl().origin
}

export function getRuntimeHostname(): string {
  return getRuntimeUrl().hostname
}

export function getRuntimeHref(): string {
  return getRuntimeUrl().href
}

export function getRuntimeSearchParams(): URLSearchParams {
  return getRuntimeUrl().searchParams
}

export function getRuntimeBasePath(buildTimeBasePath: string): string {
  const config = getEmbedConfig()
  if (!config?.basePath) return buildTimeBasePath

  const trimmed = config.basePath.trim()
  if (!trimmed || trimmed === '/') return ''

  const withoutTrailing = trimmed.replace(/\/+$/, '')
  return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`
}

export function replaceRuntimeUrl(nextUrl: string): void {
  if (!isEmbeddedRuntime()) {
    window.history.replaceState(null, '', nextUrl)
    return
  }

  const resolved = new URL(nextUrl, window.location.origin)
  const nextConfig = {
    ...(getEmbedConfig() ?? {}),
    enabled: true,
    pathname: resolved.pathname,
    search: resolved.search,
    hash: resolved.hash,
  }

  window.__TREASURY_STREETMIX_EMBED__ = nextConfig
  window.dispatchEvent(
    new CustomEvent('treasury:streetmix:runtime-url-change', {
      detail: { href: resolved.href },
    })
  )
}

export function pushRuntimeUrl(nextUrl: string): void {
  if (!isEmbeddedRuntime()) {
    window.history.pushState(null, '', nextUrl)
    return
  }

  replaceRuntimeUrl(nextUrl)
}
