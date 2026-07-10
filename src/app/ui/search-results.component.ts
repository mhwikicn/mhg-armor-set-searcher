import ArmorSet from '../../searcher/models/ArmorSet'
import SearchConstraints from '../../searcher/models/SearchConstraints'
import StaticSkillData from '../../data-provider/models/skills/StaticSkillData'
import UserEquipmentSettings from '../../data-provider/models/user/UserEquipmentSettings'
import { htmlToElement } from '../../helper/html.helper'
import SkillActivation from '../../data-provider/models/skills/SkillActivation'
import SkillActivationMap from '../../data-provider/models/skills/SkillActivationMap'
import { addExclusion, addPin, removeExlusion, removePin } from './eq-settings.component'
import EquipmentCategory from '../../data-provider/models/equipment/EquipmentCategory'

const WIKI_BASE_URL = 'https://mhwiki.axibug.com/mhg/bugu/';
const SKILL_WIKI_BASE_URL = 'https://mhwiki.axibug.com/mhg/Skill/skname.html';

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

const createEquipmentLink = (name: string, id: string | undefined, part: string): string => {
  if (!id || !part) return name;
  const href = `${WIKI_BASE_URL}${part}.html#${id}`;
  return `<a href="${href}" target="equip" style="color: var(--color-text); text-decoration: underline;">${name}</a>`;
};

let currentSets: ArmorSet[] = [];
let currentSortOrder: 'asc' | 'desc' = 'desc';
let currentSearchParams: SearchConstraints | null = null;
let currentSkillData: StaticSkillData | null = null;

export function * moreSkillsIterator (skillActivations: SkillActivationMap) {
  const rContainer = clearAndGetResultsContainer()
  const countDiv = document.createElement('div')
  rContainer.appendChild(countDiv)

  const totalActCount = Array.from(skillActivations.values())
    .reduce((sum, c) => sum + c.length, 0)

  for (let i = 0; i < totalActCount; i++) {
    countDiv.innerHTML = `检查可能的 ${i} 个技能 ...`
    yield i
  }
}

const onSetClick = (tbNode: Node, viewGetter: () => Node) => {
  const children = tbNode.childNodes
  const finalNode = children[children.length - 1] as HTMLTableRowElement

  if (finalNode.classList.contains('result-set-details')) {
    finalNode.classList.toggle('hidden')
    return
  }

  tbNode.appendChild(viewGetter())
}

const PINS_OR_EXCL_ACTIVE_BANNER = htmlToElement(`
  <div class="results-banner banner">
    由于设置了固定或排除项目，可能会限制搜索结果。移除固定或排除项目后可以得到一些配装结果。
  <div>
`)

const getExpandedView = (set: ArmorSet, skillData: StaticSkillData, searchParams: SearchConstraints) => {
  const header = htmlToElement(`
    <tr>
      <th>技能系统</th>
      <th style="text-align: right; width: 6%">头</th>
      <th style="text-align: right; width: 6%">胴</th>
      <th style="text-align: right; width: 6%">腕</th>
      <th style="text-align: right; width: 6%">腰</th>
      <th style="text-align: right; width: 6%">脚</th>
      <th style="text-align: right; width: 6%">合计</th>
      <th>激活技能</th>
    </tr>
  `);

  const skillRows = Array.from(set.evaluation.skills.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([sId, sVal]) => {
      const r = document.createElement('tr');
      r.appendChild(htmlToElement(`<td>${skillData.skillName.get(sId) || ''}</td>`));
      const pieces = set.getPieces();
      for (let i = 0; i < pieces.length; i++) {
        const effective = set.pieceEffectiveSkills[i];
        const points = effective ? effective.get(sId) || '' : '';
        r.append(htmlToElement(`<td style="text-align: right;">${points}</td>`));
      }
      r.append(htmlToElement(`<td style="text-align: right;">${sVal}</td>`));
      const possibleAct = set.evaluation.activations.find(a => a.requiredSkill === sId);
      if (possibleAct) {
        const hexId = possibleAct.id.toString(16).padStart(4, '0').toUpperCase();
        const link = `${SKILL_WIKI_BASE_URL}#${hexId}`;
        const skillHtml = `<a href="${link}" target="skill" style="color: inherit; text-decoration: underline;">${possibleAct.name}</a>`;
        r.append(htmlToElement(`<td ${!possibleAct.isPositive ? 'class="neg-skill"' : ''}>${skillHtml}</td>`));
      } else {
        r.append(htmlToElement('<td></td>'));
      }
      return r;
    });

  const skillTable = htmlToElement('<table class="result-set-skill-table"></table>');
  skillTable.appendChild(header);
  skillRows.forEach(x => skillTable.appendChild(x));

  const pieceTable = htmlToElement('<table class="result-set-piece-table"></table>');
  pieceTable.appendChild(htmlToElement('<tr><th>防御</th><th>防具</th><th>固定</th><th>排除</th></tr>'));

  for (const piece of set.getPieces()) {
    const row = document.createElement('tr');
    row.appendChild(htmlToElement(`<td style="width:20%;">${piece.defense.base}</td>`));
    const partPath = getPartPath(piece.category);
    const linkHtml = createEquipmentLink(piece.name, piece.id, partPath);
    row.appendChild(htmlToElement(`<td style="width:50%;">${linkHtml}</td>`));

    const pinTd = piece.isGeneric
      ? htmlToElement('<td style="user-select: none; width:15%;"></td>')
      : htmlToElement('<td style="user-select: none; width:15%; cursor: pointer;">✓</td>') as HTMLElement;
    const exclTd = htmlToElement('<td style="user-select: none; width:15%; cursor: pointer;">X</td>') as HTMLElement;

    if (!piece.isGeneric) {
      pinTd.addEventListener('click', (e) => {
        e.stopPropagation();
        if (UserEquipmentSettings.Instance.hasPin(piece)) {
          removePin(piece.category);
          pinTd.classList.remove('pin-highlighted');
        } else {
          addPin(piece);
          pinTd.classList.add('pin-highlighted');
        }
      });
    }

    exclTd.addEventListener('click', (e) => {
      e.stopPropagation();
      if (UserEquipmentSettings.Instance.hasExclusion(piece)) {
        removeExlusion(piece);
        exclTd.classList.remove('excl-highlighted');
      } else {
        addExclusion(piece);
        exclTd.classList.add('excl-highlighted');
      }
    });

    if (UserEquipmentSettings.Instance.hasPin(piece)) pinTd.classList.add('pin-highlighted');
    if (UserEquipmentSettings.Instance.hasExclusion(piece)) exclTd.classList.add('excl-highlighted');

    row.appendChild(pinTd);
    row.appendChild(exclTd);
    pieceTable.appendChild(row);
  }

  const tr = htmlToElement('<tr class="result-set-details"></tr>');
  const td = htmlToElement('<td colspan="6"></td>');
  const container = htmlToElement('<div class="result-set-details-container"></div>');
  container.appendChild(pieceTable);
  container.appendChild(skillTable);
  td.appendChild(container);
  tr.appendChild(td);
  return tr;
};

const getSetElement = (set: ArmorSet, skillData: StaticSkillData, searchParams: SearchConstraints) => {
  // get bonus and negative skills
  const requiredActivations = searchParams.skillActivations
  const unrelatedActivations = set.evaluation!.activations.filter((act) => {
    return !act.isPositive || // negative skill
      !requiredActivations.find(req => req.requiredSkill === act.requiredSkill) || // skill is not in required
      requiredActivations.find(req => req.requiredSkill === act.requiredSkill && act.requiredPoints > req.requiredPoints) // skill is upgrade of smth required
  })
  const unrelatedHtmlStrings = unrelatedActivations
    .sort((a, b) => b.requiredPoints - a.requiredPoints)
    .map((x) => {
      return `<span class="result-set-unrelated-skill ${!x.isPositive ? 'neg-skill' : ''}">${x.name}</span>`
    })

  // get basic display components
  const tb = htmlToElement('<tbody class="result-set"></tbody>')
  const row1 = htmlToElement(`
    <tr class="result-set-row result-set-row1">
      <td style="width: 20%">${set.head.name}</td>
      <td style="width: 20%">${set.chest.name}</td>
      <td style="width: 20%">${set.arms.name}</td>
      <td style="width: 20%">${set.waist.name}</td>
      <td style="width: 20%">${set.legs.name}</td>
    </tr>`)
  const row2 = htmlToElement(`
    <tr class="result-set-row result-set-row2">
      <td colspan="6">
        <div style="display: flex; flex-wrap: wrap; gap: 0.2em 1.5em; justify-content: flex-start; align-items: center;">
          <div style="display: flex; align-items: center; gap: 0.1em;">
            <span class="def">防御</span>
            <span style="display: inline-block; min-width: 3.5ch; text-align: right;">${set.evaluation.defense.base}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.1em;">
            <span class="fir">火</span>
            <span style="display: inline-block; min-width: 2.5ch; text-align: right;">${set.evaluation.resistance[0]}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.1em;">
            <span class="wat">水</span>
            <span style="display: inline-block; min-width: 2.5ch; text-align: right;">${set.evaluation.resistance[1]}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.1em;">
            <span class="thn">雷</span>
            <span style="display: inline-block; min-width: 2.5ch; text-align: right;">${set.evaluation.resistance[2]}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.1em;">
            <span class="drg">龍</span>
            <span style="display: inline-block; min-width: 2.5ch; text-align: right;">${set.evaluation.resistance[3]}</span>
          </div>
        </div>
        <span class="result-set-unrelated">${unrelatedHtmlStrings.join('')}</span>
      </td>
    </tr>
  `)

  // append basic display components
  const getter = () => { return getExpandedView(set, skillData, searchParams) }
  for (const row of [row1, row2]) {
    tb.appendChild(row)
    row.addEventListener('click', () => onSetClick(tb, getter))
  }

  return tb
}

const onMoreSkillsActClick = (d: HTMLDivElement) => {
  const id = parseInt(d.getAttribute('data-id')!)

  for (const ele of Array.from(document.getElementsByClassName('search-picker-activation'))) {
    const thisId = parseInt(ele.getAttribute('data-id')!)
    if (id === thisId) {
      (ele as HTMLDivElement).click()
      break
    }
  }
}

const clearAndGetResultsContainer = () => {
  const resultContainer = document.getElementById('search-results')!
  for (const c of Array.from(resultContainer.children)) c.remove()
  return resultContainer
}

export const renderMoreSkills = (activations: SkillActivation[], pinsOrExclActive: boolean) => {
  const resultContainer = clearAndGetResultsContainer()

  if (activations.length === 0) {
    resultContainer.appendChild(htmlToElement(`
      <div class="results-banner banner">
        无法添加更多技能
      <div>
    `))

    if (pinsOrExclActive) resultContainer.appendChild(PINS_OR_EXCL_ACTIVE_BANNER)

    return
  }

  for (const act of activations) {
    const d = htmlToElement(`<div class="results-more-skills-act" data-id="${act.id}"></div>`) as HTMLDivElement
    d.appendChild(htmlToElement(`<span class="results-more-skills-act-content">${act.name}</span>`))
    d.addEventListener('click', () => { onMoreSkillsActClick(d) })
    resultContainer.appendChild(d)
  }
}

export const renderResults = (sets: ArmorSet[], skillData: StaticSkillData, searchParams: SearchConstraints, pinsOrExclActive: boolean) => {

  currentSets = sets;
  currentSearchParams = searchParams;
  currentSkillData = skillData;

  const resultContainer = clearAndGetResultsContainer();

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.flexDirection = 'column';
  headerRow.style.alignItems = 'flex-start';
  headerRow.style.marginBottom = '0.5em';

  const title = htmlToElement(`
    <div class="results-title">满足 ${searchParams.skillActivations.map(x => x.name).join(', ')} 的结果 (前 ${sets.length} 个匹配)</div>
  `);
  headerRow.appendChild(title);

  const sortRow = document.createElement('div');
  sortRow.style.display = 'flex';
  sortRow.style.alignItems = 'center';
  sortRow.style.marginTop = '0.2em';

  const sortBtn = document.createElement('button');
  sortBtn.textContent = `防御力 ${currentSortOrder === 'asc' ? '▲' : '▼'}`;
  sortBtn.style.cursor = 'pointer';
  sortBtn.style.padding = '0.2em 0.6em';
  sortBtn.style.border = '1px solid var(--color-border)';
  sortBtn.style.borderRadius = '3px';
  sortBtn.style.backgroundColor = 'var(--color-background)';
  sortBtn.style.fontSize = '1em';

  sortBtn.addEventListener('click', () => {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    sortBtn.textContent = `防御力 ${currentSortOrder === 'asc' ? '▲' : '▼'}`;
    renderTable(resultContainer);
  });

  sortRow.appendChild(sortBtn);
  headerRow.appendChild(sortRow);
  resultContainer.appendChild(headerRow);

  if (sets.length === 0) {
    resultContainer.appendChild(htmlToElement(`
      <div class="results-banner banner">
        未找到符合条件的匹配
      </div>
    `));
    if (pinsOrExclActive) resultContainer.appendChild(PINS_OR_EXCL_ACTIVE_BANNER);
    return;
  }

  const table = htmlToElement('<table class="results-table" id="results-table"></table>');
  const header = htmlToElement('<tr><th>头</th><th>胴</th><th>腕</th><th>腰</th><th>脚</th></tr>');
  table.appendChild(header);
  resultContainer.appendChild(table);

  const renderTable = (container: HTMLElement) => {
    const tableElem = container.querySelector('#results-table') as HTMLTableElement;
    if (!tableElem) return;

    while (tableElem.children.length > 1) {
      tableElem.removeChild(tableElem.lastChild!);
    }
    const sorted = [...currentSets].sort((a, b) => {
      const aDef = a.evaluation.defense.base;
      const bDef = b.evaluation.defense.base;
      return currentSortOrder === 'asc' ? aDef - bDef : bDef - aDef;
    });
    sorted.forEach(set => {
      const tbody = getSetElement(set, currentSkillData!, currentSearchParams!);
      tableElem.appendChild(tbody);
    });
  };

  renderTable(resultContainer);
};
