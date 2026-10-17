import { nanoid } from 'nanoid'
import { getSegmentVariantInfo } from '@streetmix/parts'

import { getElevationValue } from '~/src/segments/elevation.js'
import { getVariantInfo } from '~/src/segments/variant_utils.js'
import {
  MAX_CUSTOM_STREET_WIDTH,
  MIN_CUSTOM_STREET_WIDTH,
} from '~/src/streets/constants.js'

import type { SliceItem, UnitsSetting } from '@streetmix/types'

/**
 * Street accepted by the Treasury bridge's `loadStreet`. This is the
 * server-transmission shape of Streetmix schema 34 (`trimStreetData`):
 * widths and elevations are METRES. Only `segments` is required; every other
 * field falls back to a Streetmix default.
 */
export type TreasuryStreetInput = {
  schemaVersion?: number
  name?: string | null
  /** Street width in metres; defaults to the sum of the segment widths. */
  width?: number
  segments: Array<{
    id?: string
    type: string
    variantString?: string
    /** metres */
    width: number
    /** metres; defaults to the variant's own deck elevation */
    elevation?: number
    elevationChanged?: boolean
    slope?: { on?: boolean }
    label?: string
  }>
}

export type PreparedTreasuryStreet = {
  segments: SliceItem[]
  width: number
  /** `undefined` leaves the current street name untouched. */
  name: string | null | undefined
}

/**
 * Oldest schema whose segment widths AND elevations are both metres
 * (schema 30 moved widths to metric, 33 made elevation a metric value). The
 * bridge does not run server-side schema migrations, so anything older is
 * rejected rather than misread.
 */
export const TREASURY_MIN_SCHEMA_VERSION = 34

const MAX_SEGMENTS = 200

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function roundMetres(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Validates and normalizes a Treasury street into the slice items Streetmix
 * keeps in its store (adds ids, `variant`, `warnings`, `slope`). Returns
 * `null` when the input cannot be read safely; nothing is partially applied.
 */
export function prepareTreasuryStreet(
  input: unknown,
  units: UnitsSetting
): PreparedTreasuryStreet | null {
  if (!isRecord(input) || !Array.isArray(input.segments)) return null

  const schemaVersion = finite(input.schemaVersion)
  if (
    input.schemaVersion !== undefined &&
    (schemaVersion === undefined || schemaVersion < TREASURY_MIN_SCHEMA_VERSION)
  ) {
    return null
  }

  if (input.segments.length === 0 || input.segments.length > MAX_SEGMENTS) {
    return null
  }

  const usedIds = new Set<string>()
  const segments: SliceItem[] = []

  for (const raw of input.segments as unknown[]) {
    if (!isRecord(raw)) return null

    const type = typeof raw.type === 'string' ? raw.type.trim() : ''
    const width = finite(raw.width)
    if (type === '' || width === undefined || width <= 0) return null

    const variantString =
      typeof raw.variantString === 'string' ? raw.variantString : ''

    let id = typeof raw.id === 'string' ? raw.id : ''
    if (id === '' || usedIds.has(id)) id = nanoid()
    usedIds.add(id)

    const variantInfo = getSegmentVariantInfo(type, variantString)
    const elevation =
      finite(raw.elevation) ??
      getElevationValue(
        'elevation' in variantInfo ? variantInfo.elevation : undefined,
        units
      )

    const slice: SliceItem = {
      id,
      type,
      variantString,
      variant: getVariantInfo(type, variantString),
      width: roundMetres(width),
      elevation: roundMetres(elevation),
      slope: {
        on: isRecord(raw.slope) && raw.slope.on === true,
        values: [],
      },
      warnings: [false],
    }

    if (raw.elevationChanged === true) slice.elevationChanged = true
    if (typeof raw.label === 'string' && raw.label !== '') {
      slice.label = raw.label
    }

    segments.push(slice)
  }

  const occupied = segments.reduce((sum, slice) => sum + slice.width, 0)
  const requestedWidth = finite(input.width)
  const width = roundMetres(
    Math.min(
      MAX_CUSTOM_STREET_WIDTH,
      Math.max(
        MIN_CUSTOM_STREET_WIDTH,
        requestedWidth !== undefined && requestedWidth > 0
          ? requestedWidth
          : occupied
      )
    )
  )

  let name: string | null | undefined
  if (typeof input.name === 'string' || input.name === null) {
    name = input.name
  }

  return { segments, width, name }
}
