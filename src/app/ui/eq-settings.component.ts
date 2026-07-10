import EquipmentCategory from '../../data-provider/models/equipment/EquipmentCategory';
import UserEquipmentSettings from '../../data-provider/models/user/UserEquipmentSettings';
import { htmlToElement } from '../../helper/html.helper';
import EquipmentMin from '../../data-provider/models/equipment/EquipmentMin';
import EquipmentSkills from '../../data-provider/models/equipment/EquipmentSkills';

const WIKI_BASE_URL = 'https://mhwiki.axibug.com/mhg/bugu/';

const getPartPath = (category: EquipmentCategory): string => {
  switch (category) {
    case EquipmentCategory.HEAD: return 'head';
    case EquipmentCategory.CHEST: return 'armor';
    case EquipmentCategory.ARMS: return 'arm';
    case EquipmentCategory.WAIST: return 'waist';
    case EquipmentCategory.LEGS: return 'foot';
    default: return '';
  }
};

const getWikiUrl = (name: string, id: string | undefined, part: string): string | null => {
  if (!id || !part) return null;
  return `${WIKI_BASE_URL}${part}.html#${id}`;
};

const STORAGE_KEY = 'g-eq-settings';

const saveToStorage = () => {
  window.localStorage.setItem(STORAGE_KEY, UserEquipmentSettings.Instance.serialize());
};

const RARITY_MAP: Record<number, string> = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
};
const getFromStorage = () => window.localStorage.getItem(STORAGE_KEY);

let skillNameMap: Map<number, string> | null = null;

const getSkillsDisplayHTML = (skills: EquipmentSkills): string => {
  if (!skillNameMap || skills.size === 0) return '';
  const lines: string[] = [];
  for (const [sId, val] of skills) {
    const name = skillNameMap.get(sId) || `技能${sId}`;
    lines.push(`${name}：${val}`);
  }
  return lines.join('<br>');
};

const createExclusionElement = (name: string, onRemove: () => void) => {
  const root = document.createElement('div');
  root.style.textAlign = 'left';
  root.setAttribute('data-name', name);
  root.classList.add('eq-exclusion-ele');

  const remove = document.createElement('span');
  remove.textContent = 'X';
  remove.style.marginRight = '0.6em';
  remove.style.marginLeft = '0.1em';
  remove.style.cursor = 'pointer';
  remove.addEventListener('click', () => {
    onRemove();
    saveToStorage();
  });

  const content = document.createElement('span');
  content.textContent = name;

  root.appendChild(remove);
  root.appendChild(content);
  return root;
};

const getExclusionElement = (x: EquipmentMin) => {
  return createExclusionElement(x.name, () => removeExlusion(x));
};

const getPinPicker = (cat: EquipmentCategory, eq: EquipmentMin[]) => {
  const root = document.createElement('div');
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.alignItems = 'center';
  root.style.gap = '0.3em';
  root.style.textAlign = 'center';

  const skillDisplay = document.createElement('div');
  skillDisplay.id = `eq-${cat}-skill-display`;
  skillDisplay.style.width = '100%';
  skillDisplay.style.textAlign = 'left';
  skillDisplay.style.fontSize = '0.85em';
  skillDisplay.style.color = '#555';
  skillDisplay.style.minHeight = '1.2em';
  skillDisplay.style.padding = '0.2em 0';
  skillDisplay.style.borderBottom = '1px dashed #ccc';
  root.appendChild(skillDisplay);

  const detailBtn = document.createElement('span');
  detailBtn.textContent = '详情';
  detailBtn.style.cursor = 'pointer';
  detailBtn.style.border = '1px solid var(--color-border)';
  detailBtn.style.borderRadius = '3px';
  detailBtn.style.padding = '0 0.6em';
  detailBtn.style.fontSize = '0.9em';
  detailBtn.style.backgroundColor = 'var(--color-background)';
  detailBtn.addEventListener('click', () => {
    const selectedName = content.value;
    if (selectedName === '无') return;
    const selectedEq = eq.find(e => e.name === selectedName);
    if (selectedEq && selectedEq.id) {
      const part = getPartPath(cat);
      const url = getWikiUrl(selectedName, selectedEq.id, part);
      if (url) window.open(url, 'equip');
    }
  });

  const rarityDisplay = document.createElement('div');
  rarityDisplay.id = `eq-${cat}-rarity-display`;
  rarityDisplay.style.width = '100%';
  rarityDisplay.style.textAlign = 'left';
  rarityDisplay.style.fontSize = '0.85em';
  rarityDisplay.style.color = '#222';
  rarityDisplay.style.minHeight = '1.2em';
  rarityDisplay.style.padding = '0.2em 0';
  rarityDisplay.style.borderBottom = '1px dashed #ccc';
  root.appendChild(rarityDisplay);

  const selectContainer = document.createElement('div');
  selectContainer.style.display = 'flex';
  selectContainer.style.alignItems = 'center';
  selectContainer.style.gap = '0.5em';
  selectContainer.style.width = '100%';
  selectContainer.style.justifyContent = 'center';

  const content = document.createElement('select');
  content.setAttribute('id', `eq-${cat}-pin-picker`);
  content.style.width = '80%';
  content.style.textAlign = 'center';

  const sortedEq = [...eq].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'accent' })
  );
  const options = [{ name: '无', category: cat }, ...sortedEq];

  for (const x of options) {
    content.appendChild(htmlToElement(`<option value="${x.name}">${x.name}</option>`));
  }

  selectContainer.appendChild(content);
  root.appendChild(selectContainer);

  const updateSkillDisplay = (selectedName: string) => {
    const selectedEq = eq.find(e => e.name === selectedName);
    if (selectedEq && 'skills' in selectedEq) {
      const skills = (selectedEq as any).skills as EquipmentSkills;
      skillDisplay.innerHTML = getSkillsDisplayHTML(skills);
      const rarity = (selectedEq as any).rarity;
      const hrText = RARITY_MAP[rarity] || `稀有度${rarity}`;
      rarityDisplay.innerHTML = `稀有度：${hrText}`;
    } else {
      skillDisplay.innerHTML = '';
      rarityDisplay.innerHTML = '';
    }
  };

  content.addEventListener('change', (event) => {
    const selectedName = content.value;
    updateSkillDisplay(selectedName);
    if (event.isTrusted) {
      addPin({ name: selectedName, category: cat });
    }
  });

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '1.0em';
  buttonContainer.style.justifyContent = 'center';

  const remove = htmlToElement('<span>取消固定</span>') as HTMLSpanElement;
  remove.style.cursor = 'pointer';
  remove.style.border = '1px solid var(--color-border)';
  remove.style.borderRadius = '3px';
  remove.style.padding = '0 0.6em';
  remove.style.fontSize = '0.9em';
  remove.addEventListener('click', () => removePin(cat));

  const excludeBtn = htmlToElement('<span>添加到排除</span>') as HTMLSpanElement;
  excludeBtn.style.cursor = 'pointer';
  excludeBtn.style.color = 'var(--color-negative-skill)';
  excludeBtn.style.border = '1px solid var(--color-negative-skill)';
  excludeBtn.style.borderRadius = '3px';
  excludeBtn.style.padding = '0 0.6em';
  excludeBtn.style.fontSize = '0.9em';
  excludeBtn.style.backgroundColor = 'rgba(206, 8, 8, 0.05)';
  excludeBtn.addEventListener('click', () => {
    const selectedName = content.value;
    if (selectedName === '无') return;
    const selectedEq = eq.find(e => e.name === selectedName);
    if (!selectedEq) return;
    addExclusion(selectedEq);
    content.value = '无';
    removePin(cat);
  });

  buttonContainer.appendChild(remove);
  buttonContainer.appendChild(excludeBtn);

  root.appendChild(buttonContainer);

  const currentPin = UserEquipmentSettings.Instance.pins[cat];
  if (currentPin) {
    content.value = currentPin.name;
    updateSkillDisplay(currentPin.name);
  } else {
  }
  return root;
};

const renderColumns = (armor: EquipmentMin[][], skillNameMapParam: Map<number, string>) => {
  skillNameMap = skillNameMapParam;
  const parent = document.getElementById('eq-container');
  if (!parent) return;
  parent.innerHTML = '';

  const categories = [
    [EquipmentCategory.HEAD, '头', armor[0]],
    [EquipmentCategory.CHEST, '胴', armor[1]],
    [EquipmentCategory.ARMS, '腕', armor[2]],
    [EquipmentCategory.WAIST, '腰', armor[3]],
    [EquipmentCategory.LEGS, '脚', armor[4]],
  ];
  for (const [cat, name, eq] of categories) {
    const root = htmlToElement(`<div class="eq-column" data-eq-column-type="${cat}"></div>`);

    const pinHeader = htmlToElement(`<div class="eq-column-item eq-column-header">${name} 固定选择</div>`);
    const pinContent = htmlToElement('<div class="eq-column-item eq-column-content eq-column-pin"></div>');
    pinContent.appendChild(getPinPicker(cat as EquipmentCategory, eq as EquipmentMin[]));

    const exclusionHeader = htmlToElement(`<div class="eq-column-item eq-column-header">排除的${name}装备</div>`);
    const exclusionContent = htmlToElement(`<div id="eq-${cat}-exclusion" class="eq-column-item eq-column-content eq-column-exclusion"></div>`);

    root.appendChild(pinHeader);
    root.appendChild(pinContent);
    root.appendChild(exclusionHeader);
    root.appendChild(exclusionContent);
    parent.appendChild(root);
  }

};

const _addExclusion = (x: EquipmentMin) => {
  const parent = document.getElementById(`eq-${x.category}-exclusion`);
  if (parent) parent.appendChild(getExclusionElement(x));
};

export const removeExlusion = (x: EquipmentMin) => {
  const ele = Array.from(document.getElementsByClassName('eq-exclusion-ele')).find(
    (a) => (a as HTMLElement).getAttribute('data-name') === x.name
  ) as HTMLElement;
  if (!ele) return;
  ele.remove();
  UserEquipmentSettings.Instance.removeExclusion(x);
  saveToStorage();
};

export const removePin = (cat: EquipmentCategory) => {
  const ele = document.getElementById(`eq-${cat}-pin-picker`) as HTMLSelectElement;
  if (ele) ele.selectedIndex = 0;
  UserEquipmentSettings.Instance.removePin(cat);
  saveToStorage();
  const skillDisplay = document.getElementById(`eq-${cat}-skill-display`);
  if (skillDisplay) skillDisplay.innerHTML = '';
  const rarityDisplay = document.getElementById(`eq-${cat}-rarity-display`);
  if (rarityDisplay) rarityDisplay.innerHTML = '';
};

export const addExclusion = (x: EquipmentMin) => {
  if (UserEquipmentSettings.Instance.hasExclusion(x)) return;
  UserEquipmentSettings.Instance.addExclusion(x);
  _addExclusion(x);
  saveToStorage();
};

export const addPin = (x: EquipmentMin) => {
  if (x.name === '无') {
    UserEquipmentSettings.Instance.removePin(x.category);
    saveToStorage();
    const display = document.getElementById(`eq-${x.category}-skill-display`);
    if (display) display.innerHTML = '';
    return;
  }
  UserEquipmentSettings.Instance.addPin(x);
  saveToStorage();
  const select = document.getElementById(`eq-${x.category}-pin-picker`) as HTMLSelectElement;
  if (select) {
    select.value = x.name;
    select.dispatchEvent(new Event('change'));
  }
};

export const renderEqSettings = (armor: EquipmentMin[][], skillNameMapParam: Map<number, string>) => {
  renderColumns(armor, skillNameMapParam);
  const raw = getFromStorage();
  if (raw) UserEquipmentSettings.Instance.deserialize(raw);

  for (const exclusionList of UserEquipmentSettings.Instance.exclusions) {
    for (const x of exclusionList) {
      _addExclusion(x);
    }
  }

  UserEquipmentSettings.Instance.pins.forEach((x, i) => {
    if (x) addPin(x);
    else removePin(i);
  });
};