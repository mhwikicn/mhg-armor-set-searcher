import { getArms, getChest, getHead, getLegs, getSkillActivationMap, getSkillCategories, getSkillNameMap, getWaist } from '../../data-provider/data-provider.module'
import StaticSkillData from '../../data-provider/models/skills/StaticSkillData'
import { renderEqSettings } from '../ui/eq-settings.component'
import { initiateNavbar } from '../ui/navbar.component'
import { renderSkillPicker } from '../ui/picker.component'
import { attachControlListeners } from '../ui/search-controls.component'

const main = async () => {
  // initiate static components
  initiateNavbar()

  // load remaining data
  const armor = [
    await getHead(),
    await getChest(),
    await getArms(),
    await getWaist(),
    await getLegs(),
  ]

  // load skill data and render skill picker with it
  const skillData: StaticSkillData = {
    skillName: await getSkillNameMap(),
    skillActivation: await getSkillActivationMap(),
    skillCategories: await getSkillCategories(),
  }

  // render ui
  renderSkillPicker(skillData.skillActivation, skillData.skillCategories)
  renderEqSettings(armor, skillData.skillName);

  // initialize search controls
  attachControlListeners({ armor }, skillData)
  const syncSelect = (topId: string, bottomId: string) => {
    const top = document.getElementById(topId) as HTMLSelectElement;
    const bottom = document.getElementById(bottomId) as HTMLSelectElement;
    if (top && bottom) {
      top.addEventListener('change', () => { bottom.value = top.value; });
      bottom.addEventListener('change', () => { top.value = bottom.value; });
    }
  };
  const syncInput = (topId: string, bottomId: string) => {
    const top = document.getElementById(topId) as HTMLInputElement;
    const bottom = document.getElementById(bottomId) as HTMLInputElement;
    if (top && bottom) {
      top.addEventListener('input', () => { bottom.value = top.value; });
      bottom.addEventListener('input', () => { top.value = bottom.value; });
    }
  };
  const syncCheckbox = (topId: string, bottomId: string) => {
    const top = document.getElementById(topId) as HTMLInputElement;
    const bottom = document.getElementById(bottomId) as HTMLInputElement;
    if (top && bottom) {
      top.addEventListener('change', () => { bottom.checked = top.checked; });
      bottom.addEventListener('change', () => { top.checked = bottom.checked; });
    }
  };
  
  syncSelect('armor-type', 'armor-type-bottom');
  syncSelect('rarity', 'rarity-bottom');
  syncInput('search-limit', 'search-limit-bottom');
  syncCheckbox('enable-negative-skills', 'enable-negative-skills-bottom');

  const armorType = document.getElementById('armor-type') as HTMLSelectElement;
  const armorTypeBottom = document.getElementById('armor-type-bottom') as HTMLSelectElement;
  if (armorType && armorTypeBottom) armorTypeBottom.value = armorType.value;
  const backToTopBtn = document.getElementById('back-to-top') as HTMLButtonElement;
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

main()
