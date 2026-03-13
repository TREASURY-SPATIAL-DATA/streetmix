import { appBasePath, withAppBasePath } from './base_path.ts'

export const appURL =
  process.env.APP_DOMAIN === 'localhost'
    ? new URL(
        `${process.env.APP_PROTOCOL}://${process.env.APP_DOMAIN}:${process.env.PORT}`
      )
    : new URL(`${process.env.APP_PROTOCOL}://${process.env.APP_DOMAIN}`)

export const externalAppURL = new URL(
  appBasePath ? `${appBasePath.replace(/^\/+/, '')}/` : '',
  appURL
)

export function externalAppHref(pathname = '/'): string {
  return new URL(withAppBasePath(pathname), appURL).href
}
