import { TORSO_UP_ID } from '../data-provider/data-provider.module'
import EquipmentSkills from '../data-provider/models/equipment/EquipmentSkills'
import ScoredSkilledEquipment from './models/ScoredSkilledEquipment'

/** get score of a skill map relative to wanted skills */
const getScoreFromSkillMap = (m: EquipmentSkills, w: EquipmentSkills): number => {
  let score = 0
  for (const [sId] of w) {
    score += m.get(sId) || 0
  }

  return score
}

/** apply score to a list of decos */
/**
 * checks if deco permutation is the same or better than comparison in respect to wanted skills
 * returns 0 if better/different, returns 1 if same, returns 2 if worse
 */


/** returns a mapping of slot level to the amount of score it is worth */
/** prune a list of deco permutations of all duplicates and downgrades */
export {
  getScoreFromSkillMap,
}
