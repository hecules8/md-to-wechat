import { describe, expect, it } from 'vitest'
import { serializeArticleForClipboard } from '../lib/clipboard'

describe('serializeArticleForClipboard', () => {
  it.each([
    ['start', 'left'],
    ['end', 'right'],
  ])('normalizes text-align %s to %s for WeChat', (input, expected) => {
    const article = document.createElement('article')
    const paragraph = document.createElement('p')
    paragraph.style.textAlign = input
    paragraph.textContent = '正文'
    article.append(paragraph)
    document.body.append(article)

    const html = serializeArticleForClipboard(article)
    const output = document.createElement('div')
    output.innerHTML = html

    expect(output.querySelector('p')).toHaveStyle({ textAlign: expected })
    expect(html).not.toContain(`text-align: ${input}`)

    article.remove()
  })

  it('replaces preformatted blocks with wrapping WeChat-safe containers', () => {
    const article = document.createElement('article')
    article.innerHTML = '<pre><code>const message = "一段很长的代码内容";\nconsole.log(message);</code></pre>'
    document.body.append(article)

    const html = serializeArticleForClipboard(article)
    const output = document.createElement('div')
    output.innerHTML = html
    const codeBlock = output.querySelector('article > div')

    expect(output.querySelector('pre')).toBeNull()
    expect(codeBlock).toHaveTextContent('const message = "一段很长的代码内容"; console.log(message);')
    expect(codeBlock).toHaveStyle({
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    })

    article.remove()
  })
})
