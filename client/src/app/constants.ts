import { withAppBasePath } from './basePath.js'

export const JUST_SIGNED_IN_PATH = withAppBasePath('/services/auth/just-signed-in')

// New street template params
export const STREET_TEMPLATES = {
  DEFAULT: 'default',
  EMPTY: 'empty',
  COPY: 'copy',
  HARBORWALK: 'harborwalk',
  COASTAL_ROAD: 'coastal_road',
  BEACH: 'beach',
  STROAD: 'stroad',
}

// Path segments
export const URL_NEW_STREET = withAppBasePath('/new')
export const URL_GLOBAL_GALLERY = withAppBasePath('/gallery')
export const URL_ERROR = withAppBasePath('/error')
export const URL_HELP = withAppBasePath('/help')
export const URL_SURVEY_FINISHED = withAppBasePath('/survey-finished')

// Error fragments that occur after /error/
export const URL_ERROR_NO_TWITTER_REQUEST_TOKEN = 'no-twitter-request-token'
export const URL_ERROR_NO_TWITTER_ACCESS_TOKEN = 'no-twitter-access-token'
export const URL_ERROR_NO_ACCESS_TOKEN = 'no-access-token'
export const URL_ERROR_AUTHENTICATION_API_PROBLEM = 'authentication-api-problem'
export const URL_ERROR_ACCESS_DENIED = 'access-denied'

// Since URLs like “streetmix.net/new” are reserved, but we still want
// @new to be able to use Streetmix, we prefix any reserved URLs with ~
export const RESERVED_URLS = [
  withAppBasePath('/services'),
  URL_NEW_STREET,
  URL_GLOBAL_GALLERY,
  URL_ERROR,
  URL_HELP,
  URL_SURVEY_FINISHED,
  withAppBasePath('/streets'),
  withAppBasePath('/terms-of-service'),
  withAppBasePath('/privacy-policy'),
  withAppBasePath('/map'),
  withAppBasePath('/survey'),
]

export const URL_RESERVED_PREFIX = '~'

// Color modes
export const COLOR_MODE_LIGHT = 'light'
export const COLOR_MODE_DARK = 'dark'
export const COLOR_MODE_AUTO = 'auto'

export type ColorModes = 'light' | 'dark' | 'auto'
