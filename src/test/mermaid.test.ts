import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    run: vi.fn(async ({ nodes }: { nodes: HTMLElement[] }) => {
      nodes[0].innerHTML = '<svg viewBox="0 0 120 60"><text x="10" y="30">流程图</text></svg>'
    }),
  },
}))

import { renderMermaidDiagrams } from '../lib/mermaid'

describe('renderMermaidDiagrams', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('captures the rendered Mermaid DOM directly as a PNG image', async () => {
    const root = document.createElement('article')
    root.innerHTML = '<div class="mermaid-diagram--pending">graph TD\nA-->B</div>'
    document.body.append(root)
    let capturedInsideStaging = false
    const capture = vi.fn(async (node: HTMLElement) => {
      capturedInsideStaging = node.parentElement?.classList.contains('mermaid-capture-staging') ?? false
      return 'data:image/png;base64,diagram'
    })

    const count = await renderMermaidDiagrams(root, capture)

    expect(capture).toHaveBeenCalledOnce()
    const capturedNode = capture.mock.calls[0][0]
    expect(capturedNode.classList.contains('mermaid-capture-staging')).toBe(false)
    expect(capturedInsideStaging).toBe(true)
    expect(count).toBe(1)
    expect(root.querySelector('img')?.src).toBe('data:image/png;base64,diagram')
  })
})
