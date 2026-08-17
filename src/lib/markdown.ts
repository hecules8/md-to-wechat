import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false,
})

function decodeMarkedCode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Render Markdown as safe article HTML and identify tables as isolated capture targets. */
export function renderMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown) as string
  const withMermaidTargets = rendered.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_, source: string) => `<div class="mermaid-diagram mermaid-diagram--pending">${escapeAttribute(decodeMarkedCode(source))}</div>`,
  )
  let tableIndex = 0

  const withCaptureTargets = withMermaidTargets
    .replace(/<table>/g, () => {
      tableIndex += 1
      return `<figure class="table-capture table-capture--pending" data-table-capture="${tableIndex}"><table>`
    })
    .replace(/<\/table>/g, '</table></figure>')

  return DOMPurify.sanitize(withCaptureTargets, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['data-mermaid-source', 'data-table-capture'],
  })
}
