import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorWorkspace } from '../components/EditorWorkspace'

describe('EditorWorkspace', () => {
  it('keeps the WeChat copy action visible before images are generated', () => {
    render(<EditorWorkspace />)

    expect(screen.getByRole('button', { name: '复制至微信公众号' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '生成高清表格图片' })).toBeEnabled()
  })

  it('generates images first, then copies to WeChat and downloads every image separately', async () => {
    const user = userEvent.setup()
    const copy = vi.fn().mockResolvedValue(undefined)
    const downloadAll = vi.fn().mockResolvedValue(undefined)
    let stagingWidth = ''
    let stagingPosition = ''
    const capture = vi
      .fn()
      .mockImplementationOnce(async (node: HTMLElement) => {
        const stagingArticle = node.closest('article')
        stagingWidth = stagingArticle?.style.width ?? ''
        stagingPosition = stagingArticle?.style.position ?? ''
        return 'data:image/png;base64,first'
      })
      .mockResolvedValueOnce('data:image/png;base64,second')

    render(<EditorWorkspace capture={capture} copy={copy} downloadAll={downloadAll} />)

    const preview = screen.getByLabelText('公众号文章预览')
    Object.defineProperty(preview, 'clientWidth', { configurable: true, value: 360 })
    expect(preview.querySelectorAll('table')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: '生成高清表格图片' }))

    await waitFor(() => expect(preview.querySelectorAll('img[data-generated-table]')).toHaveLength(2))
    expect(copy).not.toHaveBeenCalled()
    expect(preview.querySelectorAll('table')).toHaveLength(0)
    expect(preview.closest('.phone-stage')).toHaveClass('phone-stage--complete')
    expect(stagingWidth).toBe('540px')
    expect(stagingPosition).toBe('absolute')
    expect(screen.getByText('已生成 2 张完整表格图片')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制至微信公众号' }))
    await waitFor(() => expect(copy).toHaveBeenCalledOnce())
    expect(screen.getByText('已复制，可粘贴至微信公众号')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '一键下载全部图片' }))
    expect(downloadAll).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ filename: '公众号表格-01.png' }),
      expect.objectContaining({ filename: '公众号表格-02.png' }),
    ]))
    expect(screen.getAllByRole('button', { name: /下载表格/ })).toHaveLength(2)
  })

  it('applies the selected table theme to preview and image capture', async () => {
    const user = userEvent.setup()
    let capturedTheme = ''
    const capture = vi.fn(async (node: HTMLElement) => {
      capturedTheme = node.closest('article')?.dataset.tableTheme ?? ''
      return 'data:image/png;base64,themed'
    })
    render(<EditorWorkspace capture={capture} />)

    expect(screen.queryByRole('combobox', { name: '表格主题' })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '表格主题' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: '墨绿编辑' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '科技蓝' }))

    expect(screen.getByLabelText('公众号文章预览')).toHaveAttribute('data-table-theme', 'ocean')
    expect(screen.getByRole('radio', { name: '科技蓝' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: '生成高清表格图片' }))
    await waitFor(() => expect(capture).toHaveBeenCalled())
    expect(capturedTheme).toBe('ocean')
  })

  it('applies adjustable type size and cell width to preview and image capture', async () => {
    const user = userEvent.setup()
    let capturedFontSize = ''
    let capturedCellWidth = ''
    let capturedLayout = ''
    let capturedFirstColumnWidth = ''
    const capture = vi.fn(async (node: HTMLElement) => {
      const article = node.closest('article')
      capturedFontSize = article?.style.getPropertyValue('--table-font-size') ?? ''
      capturedCellWidth = article?.style.getPropertyValue('--table-cell-min-width') ?? ''
      capturedLayout = article?.dataset.tableLayout ?? ''
      capturedFirstColumnWidth ||= node.querySelector('col')?.style.width ?? ''
      return 'data:image/png;base64,adjusted'
    })
    render(<EditorWorkspace capture={capture} />)

    fireEvent.change(screen.getByRole('slider', { name: '表格字体大小' }), {
      target: { value: '18' },
    })
    fireEvent.change(screen.getByRole('slider', { name: '最小列占比' }), {
      target: { value: '12' },
    })
    await user.selectOptions(screen.getByRole('combobox', { name: '列宽模式' }), 'manual')
    fireEvent.change(screen.getByRole('slider', { name: '表格 1 · 项目列宽' }), {
      target: { value: '40' },
    })

    const preview = screen.getByLabelText('公众号文章预览')
    expect(preview).toHaveStyle({ '--table-font-size': '18px' })
    expect(preview).toHaveStyle({ '--table-cell-min-width': '12%' })
    expect(preview).toHaveAttribute('data-table-layout', 'manual')
    expect(screen.getByText('18 px')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: '最小列占比' }).closest('label')).toHaveTextContent('12%')
    expect(preview.querySelector('table')?.style.width).toBe('100%')
    expect(preview.querySelector('col')?.style.width).toBe('40%')
    const previewPercentages = Array.from(preview.querySelectorAll('table')[0].querySelectorAll('col'))
      .map((col) => Number.parseFloat(col.style.width))
    expect(previewPercentages.reduce((total, width) => total + width, 0)).toBeCloseTo(100)

    await user.click(screen.getByRole('button', { name: '生成高清表格图片' }))
    await waitFor(() => expect(capture).toHaveBeenCalled())
    expect(capturedFontSize).toBe('18px')
    expect(capturedCellWidth).toBe('12%')
    expect(capturedLayout).toBe('manual')
    expect(capturedFirstColumnWidth).toBe('40%')
  })

  it('imports a local md file and keeps its surrounding text in the preview', async () => {
    const user = userEvent.setup()
    render(<EditorWorkspace />)
    const input = screen.getByLabelText('导入 Markdown 文件')
    const file = new File(
      ['# 导入成功\n\n导入正文\n\n| 名称 | 状态 |\n| --- | --- |\n| Beta | 已完成 |'],
      'weekly.md',
      { type: 'text/markdown' },
    )

    await user.upload(input, file)

    await waitFor(() =>
      expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Markdown 内容' }).value).toContain('导入正文'),
    )
    expect(screen.getByLabelText('公众号文章预览')).toHaveTextContent('Beta')
    expect(screen.getByText('weekly.md')).toBeInTheDocument()
  })
})
