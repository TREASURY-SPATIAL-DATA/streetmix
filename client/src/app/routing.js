import { URL_NEW_STREET } from './constants'
import Authenticate from './auth0'
import { withAppBasePath } from './basePath.js'
import {
  getRuntimeOrigin,
  isEmbeddedRuntime,
  replaceRuntimeUrl,
} from './runtime.ts'
import { processUrl } from './page_url.ts'
import { processMode } from './mode.js'

const AUTH0_SIGN_IN_CALLBACK_URL = new URL(
  withAppBasePath('/services/auth/sign-in-callback'),
  getRuntimeOrigin()
).href

function applyEmbeddedNavigation(url, replace = false) {
  const resolved = new URL(url, getRuntimeOrigin())
  if (replace) {
    replaceRuntimeUrl(resolved.href)
  } else {
    replaceRuntimeUrl(resolved.href)
  }
  processUrl()
  processMode()
}

export function goReload() {
  if (isEmbeddedRuntime()) {
    processUrl()
    processMode()
    return
  }
  window.location.reload()
}

export function goHome() {
  if (isEmbeddedRuntime()) {
    applyEmbeddedNavigation(withAppBasePath('/'), true)
    return
  }
  window.location.href = withAppBasePath('/')
}

export function goNewStreet(sameWindow) {
  if (isEmbeddedRuntime()) {
    applyEmbeddedNavigation(URL_NEW_STREET, sameWindow)
    return
  }
  if (sameWindow) {
    window.location.replace(URL_NEW_STREET)
  } else {
    window.location.href = URL_NEW_STREET
  }
}

export function goTwitterSignIn() {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    connection: 'twitter',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL,
  })
}

export function goFacebookSignIn() {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    connection: 'facebook',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL,
  })
}

export function goGoogleSignIn() {
  const auth0 = Authenticate()
  auth0.authorize({
    responseType: 'code',
    connection: 'google-oauth2',
    redirectUri: AUTH0_SIGN_IN_CALLBACK_URL,
  })
}

export function goEmailSignIn(email, callback) {
  const auth0 = Authenticate()
  auth0.passwordlessStart(
    {
      send: 'link',
      email,
      connection: 'email',
      authParams: {
        redirectUri: AUTH0_SIGN_IN_CALLBACK_URL,
        responseType: 'code',
      },
    },
    (err, res) => {
      callback(err, res)
    }
  )
}
