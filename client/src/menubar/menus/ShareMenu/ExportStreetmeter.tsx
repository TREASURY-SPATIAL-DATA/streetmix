import Icon from '~/src/ui/Icon.js'
import { MenuItem } from '../MenuItem.js'
import { BetaTag } from '../BetaTag.js'
import { getSharingUrl } from './helpers.ts'

export function ExportStreetmeter() {
  return (
    <MenuItem href={`https://streetmeter.net/#${getSharingUrl()}`}>
      <Icon name="chart" className="menu-item-icon" />
      Open in Streetmeter <BetaTag />
    </MenuItem>
  )
}
