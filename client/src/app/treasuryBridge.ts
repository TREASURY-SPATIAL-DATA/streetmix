import clone from 'just-clone'

import store from '~/src/store'
import { segmentsChanged } from '~/src/store/actions/street.js'
import { setInfoBubbleMouseInside } from '~/src/store/slices/infoBubble.js'
import { saveStreetName, updateStreetData } from '~/src/store/slices/street.js'
import { setActiveSegment } from '~/src/store/slices/ui.js'
import { trimStreetData } from '~/src/streets/data_model.js'
import { getStreetImage } from '~/src/streets/image.js'
import { prepareTreasuryStreet } from './treasuryStreet.js'

import type { TreasuryStreetInput } from './treasuryStreet.js'

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
  loadStreet: (street: TreasuryStreetInput) => boolean
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

/**
 * Replaces the current street's segments, width and (when given) name through
 * Streetmix's own store actions, so the change is one undo step, is redrawn,
 * gets width warnings and is saved like any user edit. Returns `false` (and
 * changes nothing) before the app has loaded or when the input is unreadable.
 */
export function loadTreasuryStreet(input: unknown): boolean {
  const state = store.getState()
  if (!state.app.everythingLoaded) return false

  const prepared = prepareTreasuryStreet(input, state.street.units)
  if (prepared === null) return false

  // Rename first: `createNewUndoIfNecessary` skips the undo step for any save
  // whose name differs from the last street, so a rename in the same save as
  // the segment swap would make the swap impossible to undo.
  if (prepared.name !== undefined && prepared.name !== state.street.name) {
    store.dispatch(saveStreetName(prepared.name, true))
  }

  store.dispatch(setActiveSegment(null))
  store.dispatch(setInfoBubbleMouseInside(false))
  store.dispatch(
    updateStreetData({ segments: prepared.segments, width: prepared.width })
  )
  // Recalculates occupied/remaining width + warnings, then saves and records
  // the undo step against the street as it was before this call.
  void store.dispatch(segmentsChanged())

  return true
}

export function installTreasuryBridge(): void {
  if (typeof window === 'undefined') return

  const bridge: TreasuryStreetmixBridge = {
    isReady: () => Boolean(store.getState().app.everythingLoaded),
    getSnapshot: () => buildSnapshot(),
    capturePngDataUrl: (options) => capturePngDataUrl(options),
    loadStreet: (street) => loadTreasuryStreet(street),
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
