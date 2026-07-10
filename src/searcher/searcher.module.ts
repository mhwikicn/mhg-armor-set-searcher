import { DUMMY_PIECE, TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID } from '../data-provider/data-provider.module';
import ArmorPiece from '../data-provider/models/equipment/ArmorPiece';
import ArmorType from '../data-provider/models/equipment/ArmorType';
import EquipmentCategory from '../data-provider/models/equipment/EquipmentCategory';
import EquipmentSkills from '../data-provider/models/equipment/EquipmentSkills';
import StaticSkillData from '../data-provider/models/skills/StaticSkillData';
import ArmorEvaluation from '../scorer/models/ArmorEvaluation';
import ArmorSet from './models/ArmorSet';
import SearchConstraints from './models/SearchConstraints';
import ScoredSkilledEquipment from '../scorer/models/ScoredSkilledEquipment';
import { applyArmorFilter } from '../data-filter/data-filter.module';
import { getScoreFromSkillMap } from '../scorer/scorer.module';
import UserEquipmentSettings from '../data-provider/models/user/UserEquipmentSettings';

const getInitialArmorEval = (type: ArmorType) => {
  const categories = [EquipmentCategory.HEAD, EquipmentCategory.CHEST, EquipmentCategory.ARMS, EquipmentCategory.WAIST, EquipmentCategory.LEGS];
  const pieces: ScoredSkilledEquipment[] = categories.map(cat => ({
    ...DUMMY_PIECE,
    type,
    category: cat,
    score: 0,
  }));
  return new ArmorEvaluation(pieces);
};

const findSets = (
  armorPieces: ArmorPiece[][],
  constraints: SearchConstraints,
  skillData: StaticSkillData,
  collector?: (set: ArmorSet) => void,
): ArmorSet[] | SkillActivation[] => {
  const wantedSkills = new EquipmentSkills(
    constraints.skillActivations
      .filter(act => act.isPositive)
      .map(act => [act.requiredSkill, act.requiredPoints])
  );

  const totalRequiredScore = wantedSkills.size > 0
    ? Array.from(wantedSkills.values()).reduce((a, b) => a + b, 0)
    : 0;

  const specialSkillIds = new Set([TORSO_UP_ID, TORSO_PLUS_ID, TORSO_PLUS2_ID]);

  const scoredSlots = armorPieces.map((list, idx) => {
    const scored = list.map(piece => ({
      ...piece,
      score: getScoreFromSkillMap(piece.skills, wantedSkills),
    }));

    const maxScore = scored.reduce((max, p) => Math.max(max, p.score), 0);
    const boosted = scored.map(p => {
      const hasSpecial = Array.from(p.skills.keys()).some(id => specialSkillIds.has(id));
      if (hasSpecial) {
        return { ...p, score: maxScore + 100 };
      }
      return p;
    });

    boosted.sort((a, b) => b.score - a.score);

    if (!boosted.some(p => p.isGeneric)) {
      boosted.push({ ...DUMMY_PIECE, category: idx, score: 0 });
      boosted.sort((a, b) => b.score - a.score);
    }
    return boosted;
  });
  const maxRemaining = scoredSlots.map(slot => slot.length > 0 ? slot[0].score : 0);
  const validSets: ArmorSet[] = [];
  const initialEval = getInitialArmorEval(constraints.armorType);

  const skillSet = new Set<SkillActivation>();

  const generate = (index: number, currentEval: ArmorEvaluation, currentScore: number) => {
    if (wantedSkills.size > 0 &&
        currentScore + maxRemaining.slice(index).reduce((a, b) => a + b, 0) < totalRequiredScore) {
      return;
    }
    if (index === 5) {
      const set = new ArmorSet(currentEval, skillData.skillActivation);
      const allActivated = constraints.skillActivations.every(selected => {
        const points = set.evaluation.skills.get(selected.requiredSkill) || 0;
        return selected.isPositive ? points >= selected.requiredPoints : points <= selected.requiredPoints;
      });
      if (allActivated) {
        if (collector) {
          const selectedIds = new Set(constraints.skillActivations.map(a => a.id));
          for (const act of set.evaluation.activations) {
            if (!selectedIds.has(act.id) && act.isPositive) {
              skillSet.add(act);
            }
          }
          collector(set);
        } else {
          validSets.push(set);
        }
      }
      return;
    }

    for (const piece of scoredSlots[index]) {
      if (!collector && validSets.length >= constraints.limit) {
        return;
      }
      const newEval = currentEval.copy();
      newEval.addPiece(piece);
      generate(index + 1, newEval, currentScore + piece.score);
    }
  };

  generate(0, initialEval, 0);

  if (collector) {
    return Array.from(skillSet);
  }

  const activationMap = skillData.skillActivation;
  const getOverflowCount = (set: ArmorSet): number => {
    let overflow = 0;
    for (const selected of constraints.skillActivations) {
      if (!selected.isPositive) continue;
      const acts = activationMap.get(selected.requiredSkill) || [];
      const posActs = acts.filter(a => a.isPositive).sort((a, b) => a.requiredPoints - b.requiredPoints);
      const idx = posActs.findIndex(a => a.id === selected.id);
      if (idx === -1 || idx + 1 >= posActs.length) continue;
      const nextLevel = posActs[idx + 1];
      const currentPoints = set.evaluation.skills.get(selected.requiredSkill) || 0;
      if (currentPoints >= nextLevel.requiredPoints) overflow += 1;
    }
    return overflow;
  };

  validSets.sort((a, b) => {
    const overflowA = getOverflowCount(a);
    const overflowB = getOverflowCount(b);
    if (overflowA !== overflowB) return overflowA - overflowB;
    const negA = a.evaluation.activations.filter(act => !act.isPositive).length;
    const negB = b.evaluation.activations.filter(act => !act.isPositive).length;
    if (negA !== negB) return negA - negB;
    return b.evaluation.defense.base - a.evaluation.defense.base;
  });

  return validSets.slice(0, constraints.limit);
};

const search = (
  armorPieces: ArmorPiece[][],
  constraints: SearchConstraints,
  skillData: StaticSkillData,
  collectSkills?: boolean,
): ArmorSet[] | SkillActivation[] => {
  const filtered = armorPieces.map((list, idx) =>
    applyArmorFilter(
      list,
      constraints.armorRarity,
      constraints.armorType,
      idx,
      constraints.pins[idx],
      constraints.exclusions[idx],
      constraints.skillActivations,
    )
  );

  const allNegative = constraints.skillActivations.every(act => !act.isPositive);
  let finalFiltered = filtered;
  if (allNegative) {
    const MAX_CANDIDATES = 50;
    finalFiltered = filtered.map(list => {
      const real = list.filter(p => !p.isGeneric);
      return real.sort((a, b) => b.defense.base - a.defense.base).slice(0, MAX_CANDIDATES);
    });
  }

  return findSets(finalFiltered, constraints, skillData, collectSkills ? (set) => {} : undefined);
};

export { search };