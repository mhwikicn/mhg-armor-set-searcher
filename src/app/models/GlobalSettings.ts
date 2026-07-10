import ArmorType from '../../data-provider/models/equipment/ArmorType'
import Rarity from '../../data-provider/models/equipment/Rarity'

export default interface GlobalSettings {
  armorType: ArmorType
  armorRarity: Rarity
  limit: number
  enableNegativeSkills?: boolean
}
