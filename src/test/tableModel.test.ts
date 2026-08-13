import { describe, expect, it } from 'vitest'
import {
  getTableCaptureOptions,
  getTableFilename,
  getTableWidthClass,
} from '../lib/tableModel'

describe('table image rules', () => {
  it('uses readable width classes instead of shrinking every table', () => {
    expect(getTableWidthClass(2)).toBe('narrow')
    expect(getTableWidthClass(4)).toBe('standard')
    expect(getTableWidthClass(7)).toBe('wide')
  })

  it('exports a solid high-resolution PNG', () => {
    expect(getTableCaptureOptions(4)).toMatchObject({
      pixelRatio: 2,
      backgroundColor: '#fffdf8',
      cacheBust: true,
    })
  })

  it('creates stable numbered download names', () => {
    expect(getTableFilename(0)).toBe('公众号表格-01.png')
    expect(getTableFilename(11)).toBe('公众号表格-12.png')
    expect(getTableFilename(0, 1, 3)).toBe('公众号表格-01-第02页.png')
  })
})
