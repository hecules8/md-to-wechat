import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false,
})

/** Render Markdown as safe article HTML and identify tables as isolated capture targets. */
export function renderMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown) as string
  let tableIndex = 0

  const withCaptureTargets = rendered
    .replace(/<table>/g, () => {
      tableIndex += 1
      return `<figure class="table-capture table-capture--pending" data-table-capture="${tableIndex}"><table>`
    })
    .replace(/<\/table>/g, '</table></figure>')

  return DOMPurify.sanitize(withCaptureTargets, {
    USE_PROFILES: { html: true },
  })
}
