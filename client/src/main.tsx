/**
 * Streetmix
 *
 */
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/browser'

// Fonts
import '@fontsource-variable/manrope'
import '@fontsource-variable/overpass'
import '@fontsource-variable/rubik'
import '@fontsource-variable/rubik/wght-italic.css'

// Stylesheets
import 'leaflet/dist/leaflet.css'
import '~/styles/styles.css'

// Redux
import store from '~/src/store'

// Main object
import { initialize } from '~/src/app/initialization.js'
import { App } from '~/src/app/App.js'
import { installTreasuryBridge } from '~/src/app/treasuryBridge.js'
import { getRuntimeHostname, isEmbeddedRuntime } from '~/src/app/runtime.ts'

// Error tracking
// Load this before all other modules. Only load when run in production.
if (
  getRuntimeHostname() === 'streetmix.net' ||
  getRuntimeHostname() === 'www.streetmix.net'
) {
  Sentry.init({
    dsn: 'https://fac2c23600414d2fb78c128cdbdeaf6f@sentry.io/82756',
    allowUrls: [/streetmix\.net/, /www\.streetmix\.net/],
  })
}

const ensureEmbeddedContainer = (): HTMLElement | null => {
  if (!isEmbeddedRuntime()) return null

  let container = document.getElementById('react-app')
  if (container) return container

  let parkingRoot = document.getElementById('treasury-streetmix-inline-parking')
  if (!parkingRoot) {
    parkingRoot = document.createElement('div')
    parkingRoot.id = 'treasury-streetmix-inline-parking'
    parkingRoot.style.position = 'fixed'
    parkingRoot.style.left = '-200vw'
    parkingRoot.style.top = '-200vh'
    parkingRoot.style.width = '1px'
    parkingRoot.style.height = '1px'
    parkingRoot.style.overflow = 'hidden'
    parkingRoot.style.opacity = '0'
    parkingRoot.style.pointerEvents = 'none'
    parkingRoot.style.zIndex = '-1'
    document.body.appendChild(parkingRoot)
  }

  let hostRoot = document.getElementById('treasury-streetmix-inline-host')
  if (!hostRoot) {
    hostRoot = document.createElement('div')
    hostRoot.id = 'treasury-streetmix-inline-host'
    hostRoot.style.position = 'absolute'
    hostRoot.style.inset = '0'
    hostRoot.style.width = '100%'
    hostRoot.style.height = '100%'
    hostRoot.style.overflow = 'hidden'
    hostRoot.style.background = '#d7e4f0'

    const svgRoot = document.createElement('div')
    svgRoot.id = 'svg'
    svgRoot.style.display = 'none'

    container = document.createElement('div')
    container.id = 'react-app'
    container.className = 'app'
    container.style.position = 'absolute'
    container.style.inset = '0'

    hostRoot.appendChild(svgRoot)
    hostRoot.appendChild(container)
    parkingRoot.appendChild(hostRoot)
  } else {
    container = hostRoot.querySelector('#react-app') as HTMLElement | null
  }

  return container
}

// Mount React components
const container =
  document.getElementById('react-app') ?? ensureEmbeddedContainer()
if (!container) throw new Error('no element to mount to')

const root = createRoot(container)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

installTreasuryBridge()
initialize()
