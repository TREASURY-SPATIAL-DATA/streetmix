import clone from 'just-clone'

import store from '~/src/store'
import { trimStreetData } from '~/src/streets/data_model.js'
import { getStreetImage } from '~/src/streets/image.js'

type CaptureOptions = {
  transparentSky?: boolean
  labels?: boolean
  streetName?: boolean
  watermark?: boolean
  scale?: number
  locale?: string
}

type StreetmixSnapshot = {
  streetId: string | null
  namespacedId: number | null
  creatorId: string | null
  name: string | null
  width: number | null
  segmentCount: number
  street: ReturnType<typeof trimStreetData>
}

type TreasuryStreetmixBridge = {
  isReady: () => boolean
  getSnapshot: () => StreetmixSnapshot
  capturePngDataUrl: (options?: CaptureOptions) => string
}

declare global {
  interface Window {
    __TREASURY_STREETMIX__?: TreasuryStreetmixBridge
  }
}

const BRIDGE_READY_EVENT = 'treasury:streetmix:ready'
const BRIDGE_UPDATE_EVENT = 'treasury:streetmix:update'

function buildSnapshot(): StreetmixSnapshot {
  const state = store.getState()
  const street = trimStreetData(state.street)

  return {
    streetId: state.street.id ?? null,
    namespacedId: state.street.namespacedId ?? null,
    creatorId: state.street.creatorId ?? null,
    name: state.street.name ?? null,
    width: typeof state.street.width === 'number' ? state.street.width : null,
    segmentCount: Array.isArray(street.segments) ? street.segments.length : 0,
    street,
  }
}

function capturePngDataUrl(options: CaptureOptions = {}): string {
  const state = store.getState()
  const locale = options.locale ?? state.locale.locale ?? 'en'
  const canvas = getStreetImage(
    clone(state.street),
    Boolean(options.transparentSky),
    options.labels ?? false,
    options.streetName ?? false,
    options.scale ?? 1.5,
    options.watermark ?? false,
    locale
  )

  return canvas.toDataURL('image/png')
}

export function installTreasuryBridge(): void {
  if (typeof window === 'undefined') return

  const bridge: TreasuryStreetmixBridge = {
    isReady: () => Boolean(store.getState().app.everythingLoaded),
    getSnapshot: () => buildSnapshot(),
    capturePngDataUrl: (options) => capturePngDataUrl(options),
  }

  window.__TREASURY_STREETMIX__ = bridge

  const emitUpdate = () => {
    window.dispatchEvent(
      new CustomEvent(BRIDGE_UPDATE_EVENT, {
        detail: buildSnapshot(),
      })
    )
  }

  let previousSignature = ''
  store.subscribe(() => {
    const snapshot = buildSnapshot()
    const nextSignature = JSON.stringify({
      id: snapshot.streetId,
      namespacedId: snapshot.namespacedId,
      name: snapshot.name,
      width: snapshot.width,
      segments: snapshot.street.segments,
      loaded: store.getState().app.everythingLoaded,
    })

    if (nextSignature === previousSignature) return
    previousSignature = nextSignature
    emitUpdate()
  })

  window.dispatchEvent(new CustomEvent(BRIDGE_READY_EVENT))
  emitUpdate()
}
