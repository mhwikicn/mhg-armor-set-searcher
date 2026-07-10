import { TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID } from '../../data-provider/data-provider.module';
import EquipmentCategory from '../../data-provider/models/equipment/EquipmentCategory';
import EquipmentSkills from '../../data-provider/models/equipment/EquipmentSkills';
import ScoredSkilledEquipment from './ScoredSkilledEquipment';

export default class ArmorEvaluation {
  equipment: ScoredSkilledEquipment[];
  skills: EquipmentSkills = new EquipmentSkills();

  constructor(equipment: ScoredSkilledEquipment[], skills?: EquipmentSkills) {
    this.equipment = equipment;
    if (skills) this.skills = skills;
  }

  copy() {
    return new ArmorEvaluation(
      this.equipment.map(x => ({ ...x })),
      new EquipmentSkills(this.skills)
    );
  }

  addPiece(piece: ScoredSkilledEquipment) {
    const finalSkills = new EquipmentSkills(piece.skills);

    if (piece.category !== EquipmentCategory.CHEST) {
      const chestPiece = this.equipment[EquipmentCategory.CHEST];
      if (chestPiece) {
        const chestSkills = chestPiece.skills;
        if (chestSkills.size > 0) {
          if (piece.skills.has(TORSO_PLUS_ID)) {
            for (const [sId] of chestSkills) {
              finalSkills.add(sId, 1);
            }
          }
          if (piece.skills.has(TORSO_PLUS2_ID)) {
            for (const [sId] of chestSkills) {
              finalSkills.add(sId, 2);
            }
          }
          if (piece.skills.has(TORSO_UP_ID)) {
            for (const [sId, sVal] of chestSkills) {
              finalSkills.add(sId, sVal);
            }
          }
        }
      }
    }

    this.equipment[piece.category] = piece;
    this.skills.addSkills(finalSkills);
  }
}