import ArmorSet from '../../searcher/models/ArmorSet'
import SearchConstraints from '../../searcher/models/SearchConstraints'
import StaticEquipmentData from '../../data-provider/models/equipment/StaticEquipmentData'
import StaticSkillData from '../../data-provider/models/skills/StaticSkillData'
import { search } from '../../searcher/searcher.module'
import { getGlobalSettings } from './global-settings.component'
import { moreSkillsIterator, renderMoreSkills, renderResults } from './search-results.component'
import SkillActivation from '../../data-provider/models/skills/SkillActivation'
import UserEquipmentSettings from '../../data-provider/models/user/UserEquipmentSettings'
import EquipmentMin from '../../data-provider/models/equipment/EquipmentMin'
import { getSkillActivations, resetSkillActivations, updateNegativeSkillsVisibility } from './picker.component';
import GlobalSettings from '../models/GlobalSettings';


const checkFixedEquipmentRarity = (equData: StaticEquipmentData, globalSettings: GlobalSettings): boolean => {
  const pins = UserEquipmentSettings.Instance.pins;
  const maxRarity = globalSettings.armorRarity;
  const categoryNames = ['头', '胴', '腕', '腰', '脚'];
  const violations: string[] = [];
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    if (!pin) continue;
    const found = equData.armor[i].find(p => p.name === pin.name);
    if (found && found.rarity > maxRarity) {
      violations.push(`固定的${categoryNames[i]}装备“${pin.name}”`);
    }
  }
  if (violations.length > 0) {
    alert(`以下固定装备不满足设置的稀有度条件：\n${violations.join('\n')}`);
    return false;
  }
  return true;
};

const pinsOrExclusionsActive = (pins: (EquipmentMin | undefined)[], exclusions: EquipmentMin[][]): boolean => {
  const hasPins = pins.some(p => p !== undefined);
  const hasExclusions = exclusions.some(eL => eL.length > 0);
  return hasPins || hasExclusions;
};

const arrangeSearchData = (providedSkillActivations?: SkillActivation[]) => {
  // build params
  const globalSettings = getGlobalSettings()
  let skillActivations = providedSkillActivations !== undefined ? providedSkillActivations : getSkillActivations();
  if (!globalSettings.enableNegativeSkills) {
    skillActivations = skillActivations.filter(s => s.isPositive)
  }
  // return if no skill selected
  if (skillActivations.length === 0) {
    return
  }

  // sanitize activation input to only include highest version of each skill
  const sanitizedSkillActivations = skillActivations
    .filter((thisAct, i) => {
      return skillActivations.every((compareAct, j) => {
        if (i === j) return true
        if (thisAct.requiredSkill !== compareAct.requiredSkill) return true
        if (thisAct.requiredPoints > 0) {
          return thisAct.requiredPoints >= compareAct.requiredPoints;
        } else {
          return thisAct.requiredPoints <= compareAct.requiredPoints;
        }
      })
    })

  // create search params
  const searchParams: SearchConstraints = {
    armorType: globalSettings.armorType,
    armorRarity: globalSettings.armorRarity,
    limit: Math.min(Math.max(globalSettings.limit, 1), 1000),
    skillActivations: sanitizedSkillActivations,
    pins: UserEquipmentSettings.Instance.pins,
    exclusions: UserEquipmentSettings.Instance.exclusions,
  }

  return searchParams
}

const performSearchWithBannerCheck = (equData: StaticEquipmentData, skillData: StaticSkillData, searchParams: SearchConstraints) => {
  let result = search(equData.armor, searchParams, skillData);
  let shouldShowBanner = false;
  if (result.length === 0) {
    const relaxedParams = { ...searchParams, limit: 1, pins: searchParams.pins.map(() => undefined), exclusions: searchParams.exclusions.map(() => []) };
    const relaxedResult = search(equData.armor, relaxedParams, skillData);
    if (relaxedResult.length > 0) shouldShowBanner = true;
  }
  return { result, shouldShowBanner };
};

const searchLogic = (equData: StaticEquipmentData, skillData: StaticSkillData) => {

  const resultContainer = document.getElementById('search-results')!;
  resultContainer.innerHTML = '<div class="loading-spinner"></div>';

  setTimeout(() => {
    let skillActivations = getSkillActivations();
    const globalSettings = getGlobalSettings();
    if (!globalSettings.enableNegativeSkills) {
      skillActivations = skillActivations.filter(s => s.isPositive);
    }
    if (skillActivations.length === 0) {
      alert('请至少选择1个技能');
      resultContainer.innerHTML = '';
      return;
    }
    if (checkConflictingSkills(skillActivations, skillData.skillName)) {
      resultContainer.innerHTML = '';
      return;
    }
    if (!checkFixedEquipmentRarity(equData, globalSettings)) {
      resultContainer.innerHTML = '';
      return;
    }
    const searchParams = arrangeSearchData(skillActivations);
    if (!searchParams) {
      alert('请至少选择1个技能');
      resultContainer.innerHTML = '';
      return;
    }
    const { result, shouldShowBanner } = performSearchWithBannerCheck(equData, skillData, searchParams);
    renderResults(result, skillData, searchParams, shouldShowBanner);
  }, 50);
};

const moreSkillsLogic = (equData: StaticEquipmentData, skillData: StaticSkillData) => {
  const resultContainer = document.getElementById('search-results')!;
  resultContainer.innerHTML = '<div class="loading-spinner"></div>';

  setTimeout(() => {
    let skillActivations = getSkillActivations();
    const globalSettings = getGlobalSettings();
    if (!globalSettings.enableNegativeSkills) {
      skillActivations = skillActivations.filter(s => s.isPositive);
    }
    if (skillActivations.length === 0) {
      alert('请至少选择1个技能');
      resultContainer.innerHTML = '';
      return;
    }
    if (checkConflictingSkills(skillActivations, skillData.skillName)) {
      resultContainer.innerHTML = '';
      return;
    }
    if (!checkFixedEquipmentRarity(equData, globalSettings)) {
      resultContainer.innerHTML = '';
      return;
    }
    const searchParams = arrangeSearchData(skillActivations);
    if (!searchParams) {
      alert('请至少选择1个技能');
      resultContainer.innerHTML = '';
      return;
    }

    const { result, shouldShowBanner } = performSearchWithBannerCheck(equData, skillData, searchParams);

    if (result.length === 0) {
      renderMoreSkills([], shouldShowBanner);
      return;
    }

    const additionalSkills = search(
      equData.armor,
      searchParams,
      skillData,
      true
    ) as SkillActivation[];

    renderMoreSkills(additionalSkills, shouldShowBanner);
  }, 50);
};

const resetLogic = () => {
  resetSkillActivations()
}

const checkConflictingSkills = (skillActivations: SkillActivation[], skillNameMap: Map<number, string>): boolean => {
  const skillMap = new Map<number, { hasPositive: boolean; hasNegative: boolean; positiveName?: string; negativeName?: string }>();
  for (const act of skillActivations) {
    if (!skillMap.has(act.requiredSkill)) {
      skillMap.set(act.requiredSkill, { hasPositive: false, hasNegative: false });
    }
    const entry = skillMap.get(act.requiredSkill)!;
    if (act.isPositive) {
      entry.hasPositive = true;
      entry.positiveName = act.name;
    } else {
      entry.hasNegative = true;
      entry.negativeName = act.name;
    }
  }
  for (const [skillId, flags] of skillMap) {
    if (flags.hasPositive && flags.hasNegative) {
      const skillName = skillNameMap.get(skillId) || `技能ID ${skillId}`;
      alert(`所选技能矛盾：技能“${skillName}”同时选择了“${flags.positiveName}”和“${flags.negativeName}”，请检查。`);
      return true;
    }
  }
  return false;
};

/** attach handlers for control buttons */
export const attachControlListeners = (equData: StaticEquipmentData, skillData: StaticSkillData) => {
  const searchBtn = document.getElementById('search-btn') as HTMLButtonElement
  const moreSkillsBtn = document.getElementById('more-btn') as HTMLButtonElement
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement

  searchBtn.addEventListener('click', () => {
    searchLogic(equData, skillData)
  })
  moreSkillsBtn.addEventListener('click', () => {
    moreSkillsLogic(equData, skillData)
  })
  resetBtn.addEventListener('click', () => {
    resetLogic()
  })
  const negativeCheckbox = document.getElementById('enable-negative-skills') as HTMLInputElement;
  if (negativeCheckbox) {
    updateNegativeSkillsVisibility(negativeCheckbox.checked);

    negativeCheckbox.addEventListener('change', () => {
      const show = negativeCheckbox.checked;
      updateNegativeSkillsVisibility(show);
    });
  }
  const negativeCheckboxBottom = document.getElementById('enable-negative-skills-bottom') as HTMLInputElement;
  if (negativeCheckboxBottom) {
    negativeCheckboxBottom.addEventListener('change', () => {
      const show = negativeCheckboxBottom.checked;
      updateNegativeSkillsVisibility(show);
    });
  }
}
