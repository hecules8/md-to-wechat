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

export type CopyFunction = (html: string, plainText: string) => Promise<void>

export function serializeArticleForClipboard(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement
  const sources = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  const targets = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]

  sources.forEach((source, index) => {
    const target = targets[index]
    if (!target) return
    const computed = window.getComputedStyle(source)
    INLINE_STYLE_PROPERTIES.forEach((property) => {
      const value = computed.getPropertyValue(property)
      if (value) target.style.setProperty(property, value)
    })
  })

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
