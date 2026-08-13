export interface TableDefinition {
  headers: string[]
  rows: string[][]
  autoWidths: number[]
}

export type TableColumnWidths = number[][]

const HORIZONTAL_CELL_PADDING = 28
const TOTAL_WIDTH_PERCENT = 100

function normalizeCellText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function getTextUnits(text: string): number {
  return Array.from(normalizeCellText(text)).reduce((units, character) => {
    if (/\s/.test(character)) return units + 0.34
    if (character.charCodeAt(0) <= 0xff) return units + 0.58
    return units + 1
  }, 0)
}

export function calculateAutoColumnWidths(
  rows: string[][],
  fontSize: number,
  minimumPercentage: number,
): number[] {
  const columnCount = Math.max(0, ...rows.map((row) => row.length))
  const contentWeights = Array.from({ length: columnCount }, (_, columnIndex) => {
    const contentWidth = Math.max(
      0,
      ...rows.map((row) => getTextUnits(row[columnIndex] ?? '') * fontSize),
    )
    return Math.max(1, contentWidth + HORIZONTAL_CELL_PADDING)
  })
  return normalizePercentages(contentWeights, minimumPercentage)
}

function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10
}

function normalizePercentages(weights: number[], requestedMinimum: number): number[] {
  if (weights.length === 0) return []
  const minimum = Math.min(requestedMinimum, TOTAL_WIDTH_PERCENT / weights.length)
  const distributable = TOTAL_WIDTH_PERCENT - minimum * weights.length
  const totalWeight = weights.reduce((total, weight) => total + Math.max(0, weight), 0)
  const percentages = weights.map((weight) =>
    roundPercentage(minimum + distributable * (Math.max(0, weight) / (totalWeight || 1))),
  )
  const difference = roundPercentage(
    TOTAL_WIDTH_PERCENT - percentages.reduce((total, percentage) => total + percentage, 0),
  )
  percentages[percentages.length - 1] = roundPercentage(percentages[percentages.length - 1] + difference)
  return percentages
}

export function adjustColumnPercentage(
  current: number[],
  columnIndex: number,
  requestedPercentage: number,
  minimumPercentage = 5,
): number[] {
  if (current.length <= 1) return [TOTAL_WIDTH_PERCENT]
  const maximum = TOTAL_WIDTH_PERCENT - minimumPercentage * (current.length - 1)
  const target = Math.min(maximum, Math.max(minimumPercentage, requestedPercentage))
  const remainingTotal = TOTAL_WIDTH_PERCENT - target
  const otherIndexes = current.map((_, index) => index).filter((index) => index !== columnIndex)
  const flexWeights = otherIndexes.map((index) => Math.max(0, current[index] - minimumPercentage))
  const totalFlex = flexWeights.reduce((total, weight) => total + weight, 0)
  const result = [...current]
  result[columnIndex] = roundPercentage(target)
  otherIndexes.forEach((index, position) => {
    const share = totalFlex > 0
      ? flexWeights[position] / totalFlex
      : 1 / otherIndexes.length
    result[index] = roundPercentage(
      minimumPercentage + (remainingTotal - minimumPercentage * otherIndexes.length) * share,
    )
  })
  const difference = roundPercentage(
    TOTAL_WIDTH_PERCENT - result.reduce((total, percentage) => total + percentage, 0),
  )
  const correctionIndex = otherIndexes[otherIndexes.length - 1]
  result[correctionIndex] = roundPercentage(result[correctionIndex] + difference)
  return result
}

export function setTableColumnWidths(table: HTMLTableElement, widths: number[]): void {
  table.querySelector(':scope > colgroup')?.remove()
  const colgroup = document.createElement('colgroup')
  widths.forEach((width) => {
    const col = document.createElement('col')
    col.style.width = `${width}%`
    colgroup.appendChild(col)
  })
  table.prepend(colgroup)
  table.dataset.columnWidths = widths.join(',')
  table.style.width = '100%'
}

function getTableRows(table: HTMLTableElement): string[][] {
  return Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => normalizeCellText(cell.textContent)),
  )
}

export function getTableDefinitions(
  html: string,
  fontSize: number,
  minimumWidth: number,
): TableDefinition[] {
  const template = document.createElement('template')
  template.innerHTML = html
  return Array.from(template.content.querySelectorAll('table')).map((table) => {
    const rows = getTableRows(table)
    const headers = rows[0]?.map((header, index) => header || `第 ${index + 1} 列`) ?? []
    return {
      headers,
      rows,
      autoWidths: calculateAutoColumnWidths(rows, fontSize, minimumWidth),
    }
  })
}

export function applyTableColumnLayout(
  html: string,
  definitions: TableDefinition[],
  mode: 'auto' | 'manual',
  manualWidths: TableColumnWidths,
): string {
  const template = document.createElement('template')
  template.innerHTML = html
  Array.from(template.content.querySelectorAll<HTMLTableElement>('table')).forEach(
    (table, tableIndex) => {
      const automatic = definitions[tableIndex]?.autoWidths ?? []
      const manual = manualWidths[tableIndex]
      const widths = mode === 'manual' && manual?.length === automatic.length
        ? manual
        : automatic
      if (widths.length > 0) setTableColumnWidths(table, widths)
    },
  )
  return template.innerHTML
}
