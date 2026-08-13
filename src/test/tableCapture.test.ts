import { describe, expect, it, vi } from 'vitest'
import { replaceTablesWithImages } from '../lib/tableCapture'

describe('replaceTablesWithImages', () => {
  it('replaces only table targets and preserves readable alt text', async () => {
    const root = document.createElement('article')
    root.innerHTML = `
      <p>表格前的正文</p>
      <figure data-table-capture="1"><table><thead><tr><th>项目</th><th>阶段</th></tr></thead><tbody><tr><td>Alpha</td><td>III 期</td></tr></tbody></table></figure>
      <p>表格后的正文</p>
    `
    const table = root.querySelector('table') as HTMLTableElement
    Object.defineProperties(table, {
      clientWidth: { configurable: true, value: 520 },
      scrollWidth: { configurable: true, value: 520 },
      clientHeight: { configurable: true, value: 340 },
      scrollHeight: { configurable: true, value: 340 },
    })
    const capture = vi.fn().mockResolvedValue('data:image/png;base64,table')

    const artifacts = await replaceTablesWithImages(root, capture)

    expect(capture).toHaveBeenCalledOnce()
    expect(capture.mock.calls[0][0]).toBeInstanceOf(HTMLTableElement)
    expect(capture.mock.calls[0][1]).toMatchObject({
      width: 520,
      height: 340,
      canvasWidth: 520,
      canvasHeight: 340,
    })
    expect(root.querySelector('table')).not.toBeInTheDocument()
    expect(root.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,table')
    expect(root.querySelector('img')).toHaveAttribute('alt', '表格：项目，阶段；Alpha，III 期')
    expect(root).toHaveTextContent('表格前的正文')
    expect(root).toHaveTextContent('表格后的正文')
    expect(artifacts[0].filename).toBe('公众号表格-01.png')
  })

  it('leaves a failed table editable and reports the error', async () => {
    const root = document.createElement('article')
    root.innerHTML = '<figure data-table-capture="1"><table><tr><td>内容</td></tr></table></figure>'

    const artifacts = await replaceTablesWithImages(root, async () => {
      throw new Error('capture failed')
    })

    expect(root.querySelector('table')).not.toBeNull()
    expect(root.querySelector('[data-capture-error]')).toHaveAttribute('data-capture-error', 'true')
    expect(artifacts).toHaveLength(0)
  })

  it('paginates long tables with repeated headers and explicit full canvas heights', async () => {
    const root = document.createElement('article')
    const rows = Array.from(
      { length: 25 },
      (_, index) => `<tr><td>项目-${index + 1}</td><td>第 ${index + 1} 行</td></tr>`,
    ).join('')
    root.innerHTML = `
      <figure data-table-capture="1">
        <table>
          <thead><tr><th>项目</th><th>说明</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </figure>
    `
    document.body.appendChild(root)
    const pageRows: number[] = []
    const captureHeights: number[] = []
    const capture = vi.fn(async (node: HTMLElement, options) => {
      pageRows.push(node.querySelectorAll('tbody tr').length)
      captureHeights.push(options?.height ?? 0)
      expect(node.querySelector('thead')).toHaveTextContent('项目说明')
      expect(options?.canvasHeight).toBe(options?.height)
      return `data:image/png;base64,page-${pageRows.length}`
    })

    const artifacts = await replaceTablesWithImages(root, capture)

    expect(pageRows).toEqual([12, 12, 1])
    expect(captureHeights.every((height) => height > 0)).toBe(true)
    expect(root.querySelectorAll('img[data-generated-table]')).toHaveLength(3)
    expect(artifacts.map((artifact) => artifact.filename)).toEqual([
      '公众号表格-01-第01页.png',
      '公众号表格-01-第02页.png',
      '公众号表格-01-第03页.png',
    ])
    expect(root.querySelectorAll('img')[2]).toHaveAttribute('alt', expect.stringContaining('第 25 行'))
    root.remove()
  })
})
