import EquipmentCategory from './EquipmentCategory'
import EquipmentMin from './EquipmentMin'
import Rarity from './Rarity'

export default interface Equipment extends EquipmentMin {
  name: string;
  category: EquipmentCategory;
  rarity: Rarity;
  id?: string;
}
