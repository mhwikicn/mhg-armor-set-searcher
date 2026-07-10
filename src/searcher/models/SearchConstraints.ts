import ArmorType from '../../data-provider/models/equipment/ArmorType'
import EquipmentMin from '../../data-provider/models/equipment/EquipmentMin'
import Rarity from '../../data-provider/models/equipment/Rarity'
import SkillActivation from '../../data-provider/models/skills/SkillActivation'

export default interface SearchConstraints {
    armorType: ArmorType;
    armorRarity: Rarity,
    skillActivations: SkillActivation[];
    limit: number;
    pins: (EquipmentMin | undefined)[];
    exclusions: EquipmentMin[][];
}
