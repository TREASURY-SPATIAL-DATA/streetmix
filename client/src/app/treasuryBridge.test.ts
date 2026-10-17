import { vi, type Mock } from 'vitest'

import store from '~/src/store'
import { segmentsChanged } from '~/src/store/actions/street.js'
import { SETTINGS_UNITS_METRIC } from '~/src/users/constants.js'
import { installTreasuryBridge, loadTreasuryStreet } from './treasuryBridge.js'
import {
  prepareTreasuryStreet,
  TREASURY_MIN_SCHEMA_VERSION,
} from './treasuryStreet.js'

vi.mock('~/src/store', () => ({
  default: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}))

vi.mock('~/src/store/actions/street.js', () => ({
  segmentsChanged: vi.fn(() => ({ type: 'test/segmentsChanged' })),
}))

// Canvas rendering is not under test here.
vi.mock('~/src/streets/image.js', () => ({
  getStreetImage: vi.fn(),
}))

// Shape the reverse map in Composer's streetmix-mode-kit emits.
const COMPOSER_STREET = {
  schemaVersion: 34,
  width: 12.4,
  segments: [
    {
      type: 'sidewalk',
      variantString: 'normal',
      width: 3,
      elevation: 0.15,
    },
    {
      type: 'drive-lane',
      variantString: 'inbound|car',
      width: 3.2,
      elevation: 0,
    },
    {
      type: 'bus-lane',
      variantString: 'outbound|colored|typical',
      width: 3.2,
      elevation: 0,
    },
    {
      type: 'sidewalk',
      variantString: 'normal',
      width: 3,
      elevation: 0.15,
    },
  ],
}

function mockState(overrides: Record<string, unknown> = {}) {
  ;(store.getState as Mock).mockReturnValue({
    app: { everythingLoaded: true },
    locale: { locale: 'en' },
    street: {
      id: 'abc',
      name: 'Old name',
      units: SETTINGS_UNITS_METRIC,
      width: 20,
      segments: [],
    },
    ...overrides,
  })
}

function dispatchedTypes(): string[] {
  return (store.dispatch as Mock).mock.calls.map(([action]) => action.type)
}

describe('prepareTreasuryStreet', () => {
  it('normalizes a schema-34 street into store slice items', () => {
    const prepared = prepareTreasuryStreet(
      COMPOSER_STREET,
      SETTINGS_UNITS_METRIC
    )

    expect(prepared).not.toBeNull()
    expect(prepared?.width).toBe(12.4)
    expect(prepared?.name).toBeUndefined()
    expect(prepared?.segments).toHaveLength(4)

    const [sidewalk, drive] = prepared!.segments
    expect(sidewalk).toMatchObject({
      type: 'sidewalk',
      variantString: 'normal',
      variant: { 'sidewalk-density': 'normal' },
      width: 3,
      elevation: 0.15,
      slope: { on: false, values: [] },
      warnings: [false],
    })
    expect(drive.variant).toEqual({
      direction: 'inbound',
      'car-type': 'car',
    })
    expect(typeof sidewalk.id).toBe('string')
    expect(sidewalk.id).not.toBe('')

    // Every slice gets a distinct id.
    const ids = new Set(prepared!.segments.map((s) => s.id))
    expect(ids.size).toBe(4)
  })

  it('keeps given ids unless they repeat', () => {
    const prepared = prepareTreasuryStreet(
      {
        segments: [
          { id: 'a', type: 'sidewalk', variantString: 'normal', width: 3 },
          { id: 'a', type: 'sidewalk', variantString: 'normal', width: 3 },
        ],
      },
      SETTINGS_UNITS_METRIC
    )

    expect(prepared?.segments[0].id).toBe('a')
    expect(prepared?.segments[1].id).not.toBe('a')
  })

  it('defaults street width to the occupied width and elevation to the variant deck', () => {
    const prepared = prepareTreasuryStreet(
      {
        segments: [
          { type: 'sidewalk', variantString: 'normal', width: 3.5 },
          { type: 'drive-lane', variantString: 'inbound|car', width: 3.3 },
        ],
      },
      SETTINGS_UNITS_METRIC
    )

    expect(prepared?.width).toBe(6.8)
    expect(prepared?.segments[0].elevation).toBeGreaterThan(0)
    expect(prepared?.segments[1].elevation).toBe(0)
  })

  it('clamps street width to the Streetmix custom-width range', () => {
    const narrow = prepareTreasuryStreet(
      { segments: [{ type: 'sidewalk', variantString: 'normal', width: 1 }] },
      SETTINGS_UNITS_METRIC
    )
    const wide = prepareTreasuryStreet(
      { width: 500, segments: COMPOSER_STREET.segments },
      SETTINGS_UNITS_METRIC
    )

    expect(narrow?.width).toBe(3)
    expect(wide?.width).toBe(120)
  })

  it('passes a name through, including null', () => {
    expect(
      prepareTreasuryStreet(
        { ...COMPOSER_STREET, name: 'Main St' },
        SETTINGS_UNITS_METRIC
      )?.name
    ).toBe('Main St')
    expect(
      prepareTreasuryStreet(
        { ...COMPOSER_STREET, name: null },
        SETTINGS_UNITS_METRIC
      )?.name
    ).toBeNull()
  })

  it.each([
    ['null', null],
    ['a string', 'street'],
    ['no segments', { width: 10 }],
    ['empty segments', { segments: [] }],
    [
      'an older schema',
      { ...COMPOSER_STREET, schemaVersion: TREASURY_MIN_SCHEMA_VERSION - 1 },
    ],
    ['a missing type', { segments: [{ width: 3 }] }],
    ['a zero width', { segments: [{ type: 'sidewalk', width: 0 }] }],
    ['a non-numeric width', { segments: [{ type: 'sidewalk', width: '3' }] }],
    ['a non-object segment', { segments: [42] }],
  ])('rejects %s', (_label, input) => {
    expect(prepareTreasuryStreet(input, SETTINGS_UNITS_METRIC)).toBeNull()
  })
})

describe('loadTreasuryStreet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState()
  })

  it('returns false and dispatches nothing before the app has loaded', () => {
    mockState({ app: { everythingLoaded: false } })

    expect(loadTreasuryStreet(COMPOSER_STREET)).toBe(false)
    expect(store.dispatch).not.toHaveBeenCalled()
  })

  it('returns false and dispatches nothing for unreadable input', () => {
    expect(loadTreasuryStreet({ segments: 'nope' })).toBe(false)
    expect(store.dispatch).not.toHaveBeenCalled()
  })

  it('replaces segments + width through store actions, then recalculates', () => {
    expect(loadTreasuryStreet(COMPOSER_STREET)).toBe(true)

    expect(dispatchedTypes()).toEqual([
      'ui/setActiveSegment',
      'infoBubble/setInfoBubbleMouseInside',
      'street/updateStreetData',
      'test/segmentsChanged',
    ])
    expect(segmentsChanged).toHaveBeenCalledTimes(1)

    const update = (store.dispatch as Mock).mock.calls[2][0]
    expect(update.payload.width).toBe(12.4)
    expect(update.payload.segments).toHaveLength(4)
    expect(update.payload).not.toHaveProperty('name')
  })

  it('renames before swapping segments so the swap stays one undo step', () => {
    expect(loadTreasuryStreet({ ...COMPOSER_STREET, name: 'New name' })).toBe(
      true
    )

    const types = dispatchedTypes()
    expect(types[0]).toBe('street/saveStreetName')
    expect(types.indexOf('street/saveStreetName')).toBeLessThan(
      types.indexOf('street/updateStreetData')
    )
    expect((store.dispatch as Mock).mock.calls[0][0].payload).toEqual({
      streetName: 'New name',
      userUpdated: true,
    })
  })

  it('does not rename when the name is unchanged', () => {
    loadTreasuryStreet({ ...COMPOSER_STREET, name: 'Old name' })

    expect(dispatchedTypes()).not.toContain('street/saveStreetName')
  })
})

describe('installTreasuryBridge', () => {
  it('exposes loadStreet on the window bridge', () => {
    vi.clearAllMocks()
    mockState()
    installTreasuryBridge()

    expect(typeof window.__TREASURY_STREETMIX__?.loadStreet).toBe('function')
    expect(window.__TREASURY_STREETMIX__?.loadStreet(COMPOSER_STREET)).toBe(
      true
    )
  })
})
