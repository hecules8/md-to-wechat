import type { Options } from 'html-to-image/lib/types'

export type TableWidthClass = 'narrow' | 'standard' | 'wide'

export function getTableWidthClass(columnCount: number): TableWidthClass {
  if (columnCount <= 3) return 'narrow'
  if (columnCount <= 5) return 'standard'
  return 'wide'
}

export function getTableCaptureOptions(columnCount: number): Options {
  return {
    pixelRatio: columnCount >= 10 ? 1.5 : 2,
    backgroundColor: '#fffdf8',
    cacheBust: true,
    skipAutoScale: false,
  }
}

export function getTableFilename(
  tableIndex: number,
  pageIndex = 0,
  totalPages = 1,
): string {
  const tableNumber = String(tableIndex + 1).padStart(2, '0')
  if (totalPages === 1) return `公众号表格-${tableNumber}.png`
  return `公众号表格-${tableNumber}-第${String(pageIndex + 1).padStart(2, '0')}页.png`
}
