const INLINE_STYLE_PROPERTIES = [
  'background-color',
  'border',
  'border-collapse',
  'border-radius',
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'vertical-align',
  'width',
] as const

const WECHAT_TEXT_ALIGN_VALUES: Record<string, string> = {
  start: 'left',
  end: 'right',
}

const RESPONSIVE_IMAGE_SELECTOR = '.article-table-image, .mermaid-diagram-image, .article-illustration-image'

function replacePreformattedBlocksForWechat(root: HTMLElement): void {
  root.querySelectorAll('pre').forEach((preformatted) => {
    const container = document.createElement('div')
    Array.from(preformatted.attributes).forEach(({ name, value }) => {
      container.setAttribute(name, value)
    })
    container.innerHTML = preformatted.innerHTML
    container.style.whiteSpace = 'pre-wrap'
    container.style.overflowWrap = 'anywhere'
    container.style.wordBreak = 'break-word'
    preformatted.replaceWith(container)
  })
}

export type CopyFunction = (html: string, plainText: string) => Promise<void>

export function serializeArticleForClipboard(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-rendered-source')
  const sources = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  const targets = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]

  sources.forEach((source, index) => {
    const target = targets[index]
    if (!target) return
    const computed = window.getComputedStyle(source)
    INLINE_STYLE_PROPERTIES.forEach((property) => {
      const value = computed.getPropertyValue(property)
      if (property === 'width') {
        target.style.removeProperty('width')
        if (source.matches(RESPONSIVE_IMAGE_SELECTOR)) {
          target.style.width = '100%'
          target.style.maxWidth = '100%'
        }
        return
      }
      const clipboardValue = property === 'text-align'
        ? WECHAT_TEXT_ALIGN_VALUES[value] ?? value
        : value
      if (clipboardValue) target.style.setProperty(property, clipboardValue)
    })
  })

  replacePreformattedBlocksForWechat(clone)

  return clone.outerHTML
}

export const copyRichArticle: CopyFunction = async (html, plainText) => {
  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    })
    await navigator.clipboard.write([item])
    return
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(plainText)
    return
  }

  throw new Error('当前浏览器不支持剪贴板写入')
}
