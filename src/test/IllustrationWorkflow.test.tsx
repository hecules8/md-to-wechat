import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorWorkspace } from '../components/EditorWorkspace'

const png = () => new File(['local-image'], 'minimal.png', { type: 'image/png' })

describe('semi-automatic illustration workflow', () => {
  it('imports, places, captions, moves, replaces and removes a local picture without editing the Markdown', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)
    const source = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Markdown 内容' }).value
    await user.upload(screen.getByLabelText('导入文章配图'), png())
    const select = await screen.findByRole('combobox', { name: '配图 1 插入位置' })
    const preview = screen.getByLabelText('公众号文章预览')
    expect(preview.querySelector('img[data-generated-table]')).toBeNull()
    expect(preview.querySelector('img.article-illustration-image')).toBeNull()
    const paragraphPosition = screen.getByRole('option', { name: /2\. 段落/ }).getAttribute('value')!
    await user.selectOptions(select, paragraphPosition)
    expect(preview.querySelector('p')?.nextElementSibling?.tagName).toBe('FIGURE')
    fireEvent.change(screen.getByLabelText('图注 1'), { target: { value: '研发路径示意' } })
    expect(preview.querySelector('figcaption')).toHaveTextContent('研发路径示意')
    await user.selectOptions(select, 'start')
    expect(preview.firstElementChild?.className).toBe('article-illustration')
    await user.upload(screen.getByLabelText('替换配图 1'), new File(['replacement'], 'new.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByText('new.png')).toBeInTheDocument())
    expect(preview.querySelector('figcaption')).toHaveTextContent('研发路径示意')
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Markdown 内容' }).value).toBe(source)
    await user.click(screen.getByRole('button', { name: '移除配图 1' }))
    expect(preview.querySelector('.article-illustration')).toBeNull()
  })

  it('keeps pictures through table generation, restoration and theme changes', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace capture={vi.fn().mockResolvedValue('data:image/png;base64,dGFibGU=')} />)
    await user.upload(screen.getByLabelText('导入文章配图'), png())
    await user.selectOptions(await screen.findByRole('combobox', { name: '配图 1 插入位置' }), 'start')
    const preview = screen.getByLabelText('公众号文章预览')
    await user.click(screen.getByRole('button', { name: '生成高清表格图片' }))
    await waitFor(() => expect(preview.querySelectorAll('img[data-generated-table]')).toHaveLength(2))
    expect(preview.querySelectorAll('.article-illustration-image')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '恢复表格' }))
    expect(preview.querySelectorAll('.article-illustration-image')).toHaveLength(1)
    await user.click(screen.getByRole('radio', { name: '冰川蓝' }))
    expect(preview.querySelectorAll('.article-illustration-image')).toHaveLength(1)
  })

  it('retains imported files and asks for a new position when the attached paragraph changes', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)
    await user.upload(screen.getByLabelText('导入文章配图'), png())
    const select = await screen.findByRole('combobox', { name: '配图 1 插入位置' })
    await user.selectOptions(select, screen.getByRole('option', { name: /2\. 段落/ }).getAttribute('value')!)
    fireEvent.change(screen.getByLabelText('Markdown 内容'), { target: { value: '# 新标题\n\n完全不同的段落。' } })
    expect(screen.getByText('原插入位置已变化，请重新选择。')).toBeInTheDocument()
    expect(screen.getByText('minimal.png')).toBeInTheDocument()
    expect(screen.getByLabelText('公众号文章预览').querySelector('.article-illustration')).toBeNull()
    await user.selectOptions(select, 'start')
    expect(screen.queryByText('原插入位置已变化，请重新选择。')).not.toBeInTheDocument()
  })

  it('copies an illustrated article without tables directly, including its embedded picture and caption', async () => {
    const user = userEvent.setup()
    const copy = vi.fn().mockResolvedValue(undefined)
    render(<EditorWorkspace copy={copy} />)
    fireEvent.change(screen.getByLabelText('Markdown 内容'), { target: { value: '# 图文文章\n\n正文内容。' } })
    await user.upload(screen.getByLabelText('导入文章配图'), png())
    await user.selectOptions(await screen.findByRole('combobox', { name: '配图 1 插入位置' }), 'start')
    fireEvent.change(screen.getByLabelText('图注 1'), { target: { value: '概念示意' } })
    await user.click(screen.getByRole('button', { name: '复制至微信公众号' }))
    expect(copy).toHaveBeenCalledOnce()
    const [html, plainText] = copy.mock.calls[0]
    expect(html).toContain('data:image/png;base64,')
    expect(html).toContain('概念示意')
    expect(html).toContain('width: 100%')
    expect(plainText).toContain('正文内容')
  })

  it('copies a restrained ChatGPT brief containing the current article', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)
    await user.click(screen.getByRole('button', { name: '复制 ChatGPT 配图说明' }))
    const text = await navigator.clipboard.readText()
    expect(text).toContain('2026 医药创新观察')
    expect(text).toContain('科学配图')
    expect(text).toContain('不要编造')
  })

  it('includes the chosen visualization task in the copied brief', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)
    await user.selectOptions(screen.getByRole('combobox', { name: '图解任务' }), 'clinical')
    await user.click(screen.getByRole('button', { name: '复制 ChatGPT 配图说明' }))
    expect(await navigator.clipboard.readText()).toContain('当前图解任务：临床数据对比')
  })

  it('keeps copy disabled if any table fails to convert', async () => {
    const user = userEvent.setup()
    const capture = vi.fn()
      .mockResolvedValueOnce('data:image/png;base64,dGFibGU=')
      .mockRejectedValueOnce(new Error('failed'))
    render(<EditorWorkspace capture={capture} />)
    await user.click(screen.getByRole('button', { name: '生成高清表格图片' }))
    await waitFor(() => expect(screen.getByLabelText('公众号文章预览').querySelectorAll('table')).toHaveLength(1))
    expect(screen.getByRole('button', { name: '复制至微信公众号' })).toBeDisabled()
  })

  it('exports the current illustrated article as a self-contained HTML file', async () => {
    const user = userEvent.setup()
    const createUrl = vi.fn().mockReturnValue('blob:local-draft')
    const oldCreate = URL.createObjectURL
    const oldRevoke = URL.revokeObjectURL
    URL.createObjectURL = createUrl
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      render(<EditorWorkspace />)
      await user.upload(screen.getByLabelText('导入文章配图'), png())
      await user.selectOptions(await screen.findByRole('combobox', { name: '配图 1 插入位置' }), 'start')
      await user.click(screen.getByRole('button', { name: '下载图文 HTML' }))
      expect(click).toHaveBeenCalledOnce()
      const blob = createUrl.mock.calls[0][0] as Blob
      const html = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(blob)
      })
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('data:image/png;base64,')
      expect(html).toContain('2026 医药创新观察')
    } finally {
      click.mockRestore()
      URL.createObjectURL = oldCreate
      URL.revokeObjectURL = oldRevoke
    }
  })
})
