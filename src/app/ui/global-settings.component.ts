import Rarity from '../../data-provider/models/equipment/Rarity'
import GlobalSettings from '../models/GlobalSettings'

export const getGlobalSettings = (): GlobalSettings => {
  const armorSelect = document.getElementById('armor-type') as HTMLSelectElement
  const armorRarity = document.getElementById('rarity') as HTMLSelectElement
  const limit = document.getElementById('search-limit') as HTMLInputElement
  const enableNegativeSkillsCheckbox = document.getElementById('enable-negative-skills') as HTMLInputElement

  return {
    armorType: parseInt(armorSelect.value),
    armorRarity: parseInt(armorRarity.value) as Rarity,
    limit: parseInt(limit.value),
    enableNegativeSkills: enableNegativeSkillsCheckbox ? enableNegativeSkillsCheckbox.checked : false,
  }
}
