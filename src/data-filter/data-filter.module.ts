import { DUMMY_PIECE, MAX_RARITY, TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID } from '../data-provider/data-provider.module'
import ArmorPiece from '../data-provider/models/equipment/ArmorPiece'
import ArmorType from '../data-provider/models/equipment/ArmorType'
import EquipmentCategory from '../data-provider/models/equipment/EquipmentCategory'
import EquipmentMin from '../data-provider/models/equipment/EquipmentMin'
import EquipmentSkills from '../data-provider/models/equipment/EquipmentSkills'
import Rarity from '../data-provider/models/equipment/Rarity'
import SkilledItem from '../data-provider/models/equipment/SkilledItem'
import SkillActivation from '../data-provider/models/skills/SkillActivation'

const filterType = (piece: ArmorPiece, type: ArmorType) => {
  return piece.type === ArmorType.ALL || piece.type === type
}

const filterExclusions = (piece: ArmorPiece, exclusionNames: string[]) => {
  return !exclusionNames.includes(piece.name)
}

const filterRarity = (item: SkilledItem, rarity: Rarity) => {
  return item.rarity <= rarity
}

const filterHasSkill = (item: SkilledItem, desiredSkills: SkillActivation[]) => {
  return desiredSkills.some((act) => {
    const s = item.skills.get(act.requiredSkill)
    return s !== undefined && s !== 0
  })
}

const applyRarityFilter = (items: SkilledItem[], rarity: Rarity) => {
  if (rarity === MAX_RARITY) return items
  return items.filter(x => filterRarity(x, rarity))
}

const applyArmorFilter = (
  pieces: ArmorPiece[],
  rarity: Rarity,
  type: ArmorType,
  category: EquipmentCategory,
  pin: EquipmentMin | undefined,
  exclusions: EquipmentMin[],
  skills: SkillActivation[],
) => {
  if (pin) return [pieces.find(x => x.name === pin.name)!];

  const excludedNames = exclusions.map(e => e.name);
  const filtered = pieces
    .filter(p => p.rarity <= rarity)
    .filter(p => filterType(p, type))
    .filter(p => !excludedNames.includes(p.name))
    .sort((a, b) => b.defense.base - a.defense.base);

  const targetSkillIds = new Set(skills.map(s => s.requiredSkill));

  const specialSkillIds = new Set([TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID]);

  const skillMatched = filtered.filter(p =>
    Array.from(p.skills.keys()).some(id => targetSkillIds.has(id) || specialSkillIds.has(id))
  );

  if (skillMatched.length === 0) {
    return [{ ...DUMMY_PIECE, type, category }];
  }
  return skillMatched;
};

export {
  filterType,
  filterRarity,
  filterHasSkill,
  applyRarityFilter,
  applyArmorFilter,
}
