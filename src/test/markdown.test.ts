import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../lib/markdown'

describe('renderMarkdown', () => {
  it('preserves article content and annotates only GFM tables for capture', () => {
    const markdown = `# 药物研发周报

正文中的 **重点信息** 保持为可编辑文字。

| 项目 | 阶段 |
| --- | --- |
| Alpha | III 期 |

表格后的结论也应保留。`

    const html = renderMarkdown(markdown)
    const container = document.createElement('div')
    container.innerHTML = html

    expect(container.querySelector('h1')).toHaveTextContent('药物研发周报')
    expect(container.querySelector('strong')).toHaveTextContent('重点信息')
    expect(container).toHaveTextContent('表格后的结论也应保留')
    expect(container.querySelectorAll('[data-table-capture]')).toHaveLength(1)
    expect(container.querySelector('[data-table-capture] table')).toHaveTextContent('Alpha')
  })

  it('removes unsafe script content', () => {
    const html = renderMarkdown('正文<script>alert("x")</script>')

    expect(html).not.toContain('<script')
    expect(html).toContain('正文')
  })

  it('marks Mermaid code blocks for image rendering', () => {
    const html = renderMarkdown('```mermaid\ngraph TD\n  A[开始] --> B[结束]\n```')

    expect(html).toContain('mermaid-diagram--pending')
    expect(html).toContain('graph TD')
    expect(html).not.toContain('<pre')
  })
})
