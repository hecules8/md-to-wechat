import { describe, expect, it } from 'vitest'
import {
  adjustColumnPercentage,
  calculateAutoColumnWidths,
  setTableColumnWidths,
} from '../lib/tableLayout'

describe('table column layout', () => {
  const rows = [
    ['项目', '技术方向', '当前阶段', '下一节点'],
    ['Alpha-01', '双抗', '临床 II 期', '2026 Q4 数据读出'],
    ['Beta-07', 'ADC', '临床 I 期', '剂量扩展'],
  ]

  it('gives content-heavy columns more space without keeping every column equal', () => {
    const widths = calculateAutoColumnWidths(rows, 14, 12)

    expect(widths).toHaveLength(4)
    expect(widths.reduce((total, width) => total + width, 0)).toBeCloseTo(100)
    expect(widths[1]).toBeLessThan(widths[0])
    expect(widths[3]).toBeGreaterThan(widths[0])
    expect(new Set(widths).size).toBeGreaterThan(2)
    expect(calculateAutoColumnWidths(rows, 18, 12).reduce((total, width) => total + width, 0)).toBeCloseTo(100)
  })

  it('keeps the whole table at 100% while writing per-column percentages', () => {
    const table = document.createElement('table')
    table.innerHTML = '<thead><tr><th>项目</th><th>下一节点</th></tr></thead>'

    setTableColumnWidths(table, [35, 65])

    expect(table.dataset.columnWidths).toBe('35,65')
    expect(table.style.width).toBe('100%')
    expect(Array.from(table.querySelectorAll('col')).map((col) => col.style.width)).toEqual([
      '35%',
      '65%',
    ])
  })

  it('rebalances the other columns when one percentage is adjusted', () => {
    const adjusted = adjustColumnPercentage([20, 30, 50], 0, 40, 10)

    expect(adjusted[0]).toBe(40)
    expect(adjusted.reduce((total, width) => total + width, 0)).toBeCloseTo(100)
    expect(adjusted[1]).toBeLessThan(30)
    expect(adjusted[2]).toBeLessThan(50)
  })
})
