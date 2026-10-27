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
  // Use the browser's font metrics for mixed Chinese/Latin text. The fallback
  // also keeps layout available in non-canvas environments.
  const context = typeof CanvasRenderingContext2D !== 'undefined'
    ? document.createElement('canvas').getContext('2d')
    : null
  const fontFamily = typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim()
    : ''
  const contentWeights = Array.from({ length: columnCount }, (_, columnIndex) => {
    const contentWidth = Math.max(
      0,
      ...rows.map((row, rowIndex) => {
        if (context) context.font = `${rowIndex === 0 ? 700 : columnIndex === 0 ? 650 : 400} ${fontSize}px ${fontFamily || 'sans-serif'}`
        return Math.max(0, ...(row[columnIndex] ?? '').split(/\r?\n/).map((line) =>
          context?.measureText(normalizeCellText(line)).width ?? getTextUnits(line) * fontSize,
        ))
      }),
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
  const percentages = weights.map(() => 0)
  let pending = weights.map((_, index) => index)
  let remaining = TOTAL_WIDTH_PERCENT
  while (pending.length > 0) {
    const totalWeight = pending.reduce((total, index) => total + weights[index], 0)
    const share = (index: number) => totalWeight > 0
      ? remaining * weights[index] / totalWeight
      : remaining / pending.length
    const tooNarrow = pending.filter((index) => share(index) < minimum)
    if (tooNarrow.length === 0) {
      pending.forEach((index) => { percentages[index] = roundPercentage(share(index)) })
      break
    }
    tooNarrow.forEach((index) => { percentages[index] = roundPercentage(minimum) })
    remaining -= minimum * tooNarrow.length
    pending = pending.filter((index) => !tooNarrow.includes(index))
  }
  const difference = roundPercentage(
    TOTAL_WIDTH_PERCENT - percentages.reduce((total, percentage) => total + percentage, 0),
  )
  const widestIndex = percentages.indexOf(Math.max(...percentages))
  percentages[widestIndex] = roundPercentage(percentages[widestIndex] + difference)
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
    Array.from(row.cells).map((cell) => {
      const copy = cell.cloneNode(true) as HTMLElement
      copy.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      return (copy.textContent ?? '').split(/\r?\n/).map(normalizeCellText).join('\n')
    }),
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
    const headers = rows[0]?.map((header, index) => normalizeCellText(header) || `第 ${index + 1} 列`) ?? []
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
