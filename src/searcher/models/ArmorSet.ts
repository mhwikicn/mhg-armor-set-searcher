import Defense from '../../data-provider/models/equipment/Defense';
import EquipmentSkills from '../../data-provider/models/equipment/EquipmentSkills';
import Resistance from '../../data-provider/models/equipment/Resistance';
import Evaluation from './Evaluation';
import ArmorPiece from '../../data-provider/models/equipment/ArmorPiece';
import SkillActivationMap from '../../data-provider/models/skills/SkillActivationMap';
import SkillActivation from '../../data-provider/models/skills/SkillActivation';
import ArmorEvaluation from '../../scorer/models/ArmorEvaluation';
import EquipmentCategory from '../../data-provider/models/equipment/EquipmentCategory';
import { TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID } from '../../data-provider/data-provider.module';

export default class ArmorSet {
  readonly head: ArmorPiece;
  readonly chest: ArmorPiece;
  readonly arms: ArmorPiece;
  readonly waist: ArmorPiece;
  readonly legs: ArmorPiece;
  evaluation: Evaluation;
  public pieceEffectiveSkills: EquipmentSkills[] = [];

  constructor(armorEval: ArmorEvaluation, skillActivations: SkillActivationMap) {
    this.head = armorEval.equipment[EquipmentCategory.HEAD] as ArmorPiece;
    this.chest = armorEval.equipment[EquipmentCategory.CHEST] as ArmorPiece;
    this.arms = armorEval.equipment[EquipmentCategory.ARMS] as ArmorPiece;
    this.waist = armorEval.equipment[EquipmentCategory.WAIST] as ArmorPiece;
    this.legs = armorEval.equipment[EquipmentCategory.LEGS] as ArmorPiece;
    const chestPiece = armorEval.equipment[EquipmentCategory.CHEST];
    const categories = [
      EquipmentCategory.HEAD,
      EquipmentCategory.CHEST,
      EquipmentCategory.ARMS,
      EquipmentCategory.WAIST,
      EquipmentCategory.LEGS,
    ];
    this.pieceEffectiveSkills = categories.map((cat) => {
      const piece = armorEval.equipment[cat];
      const finalSkills = new EquipmentSkills(piece.skills);

      if (cat !== EquipmentCategory.CHEST && chestPiece) {
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
      return finalSkills;
    });
    this.evaluation = this.evaluate(armorEval, skillActivations);
  }

  getPieces(): ArmorPiece[] {
    return [this.head, this.chest, this.arms, this.waist, this.legs];
  }

  evaluate(armorEval: ArmorEvaluation, activations: SkillActivationMap): Evaluation {
  let totalDefense: Defense = { base: 0 };
  let totalResistance: Resistance = [0, 0, 0, 0];
  for (const piece of this.getPieces()) {
    totalDefense.base += piece.defense.base;
    totalResistance = piece.resistance.map((res, i) => res + totalResistance[i]);
  }

  const specialSkillIds = [TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID];
  const filteredSkills = new EquipmentSkills();
  for (const [sId, sVal] of armorEval.skills) {
    if (!specialSkillIds.includes(sId)) {
      filteredSkills.set(sId, sVal);
    }
  }

  const activated: SkillActivation[] = [];
  for (const [sId, sVal] of filteredSkills) {
    if (Math.abs(sVal) < 10) continue;
    const acts = activations.get(sId);
    if (!acts) continue;
    const posActs = acts.filter(a => a.isPositive && sVal >= a.requiredPoints);
    const negActs = acts.filter(a => !a.isPositive && sVal <= a.requiredPoints);
    let bestAct: SkillActivation | undefined;
    if (posActs.length > 0) {
      bestAct = posActs.reduce((a, b) => a.requiredPoints > b.requiredPoints ? a : b);
    } else if (negActs.length > 0) {
      bestAct = negActs.reduce((a, b) => a.requiredPoints < b.requiredPoints ? a : b);
    }
    if (bestAct) activated.push(bestAct);
  }

  return {
    defense: totalDefense,
    resistance: totalResistance,
    activations: activated,
    skills: filteredSkills,
    torsoUp: 0,
  };
}
}