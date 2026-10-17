// loadStreet against the real store: the swap is redrawn data, carries width
// bookkeeping, and is exactly one undo step (the rename does not swallow it).
import { vi } from 'vitest'

import store from '~/src/store'
import { segmentsChanged } from '~/src/store/actions/street.js'
import { handleRedo, handleUndo } from '~/src/store/actions/history.js'
import { everythingLoaded } from '~/src/store/slices/app.js'
import { updateStreetData } from '~/src/store/slices/street.js'
import { setLastStreet } from '~/src/streets/data_model.js'
import { initStreetDataChangedListener } from '~/src/streets/street.js'
import { SETTINGS_UNITS_METRIC } from '~/src/users/constants.js'
import { loadTreasuryStreet } from './treasuryBridge.js'

vi.mock('~/src/streets/xhr.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/src/streets/xhr.js')>()),
  scheduleSavingStreetToServer: vi.fn(),
  updateLastStreetInfo: vi.fn(),
}))

vi.mock('~/src/streets/owner.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/src/streets/owner.js')>()),
  isOwnedByCurrentUser: () => true,
}))

vi.mock('~/src/streets/image.js', () => ({
  getStreetImage: vi.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const streetTypes = () =>
  store.getState().street.segments.map((s) => `${s.type}:${s.variantString}`)

describe('loadTreasuryStreet (real store)', () => {
  beforeAll(async () => {
    initStreetDataChangedListener()
    store.dispatch(
      updateStreetData({
        schemaVersion: 34,
        units: SETTINGS_UNITS_METRIC,
        name: 'Old name',
        width: 10,
        editCount: 0,
        segments: [
          {
            id: 'old-1',
            type: 'sidewalk',
            variantString: 'normal',
            variant: { 'sidewalk-density': 'normal' },
            width: 10,
            elevation: 0.15,
            slope: { on: false, values: [] },
            warnings: [false],
          },
        ],
      })
    )
    await store.dispatch(segmentsChanged())
    await flush()
    setLastStreet()
    store.dispatch(everythingLoaded())
  })

  it('replaces segments, width and name, then undoes and redoes as one step', async () => {
    const before = store.getState().history.stack.length

    const loaded = loadTreasuryStreet({
      schemaVersion: 34,
      name: 'Main St',
      width: 12.4,
      segments: [
        {
          type: 'sidewalk',
          variantString: 'normal',
          width: 3,
          elevation: 0.15,
        },
        { type: 'drive-lane', variantString: 'inbound|car', width: 3.2 },
        {
          type: 'bus-lane',
          variantString: 'outbound|colored|typical',
          width: 3.2,
        },
        {
          type: 'sidewalk',
          variantString: 'normal',
          width: 3,
          elevation: 0.15,
        },
      ],
    })
    expect(loaded).toBe(true)
    await flush()

    const { street, history } = store.getState()
    expect(streetTypes()).toEqual([
      'sidewalk:normal',
      'drive-lane:inbound|car',
      'bus-lane:outbound|colored|typical',
      'sidewalk:normal',
    ])
    expect(street.width).toBe(12.4)
    expect(street.name).toBe('Main St')
    expect(street.occupiedWidth).toBeCloseTo(12.4)
    expect(street.remainingWidth).toBeCloseTo(0)
    // One undo entry for the swap (the rename alone records none).
    expect(history.stack.length).toBe(before + 1)

    await store.dispatch(handleUndo())
    expect(streetTypes()).toEqual(['sidewalk:normal'])
    expect(store.getState().street.width).toBe(10)

    await store.dispatch(handleRedo())
    expect(streetTypes()).toHaveLength(4)
    expect(store.getState().street.width).toBe(12.4)
  })
})
