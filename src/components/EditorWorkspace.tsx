import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import {
  copyRichArticle,
  serializeArticleForClipboard,
  type CopyFunction,
} from '../lib/clipboard'
import { renderMarkdown } from '../lib/markdown'
import { renderMermaidDiagrams } from '../lib/mermaid'
import { downloadAllArtifacts, type DownloadAllFunction } from '../lib/download'
import {
  captureTablePng,
  replaceTablesWithImages,
  type CaptureFunction,
  type TableArtifact,
} from '../lib/tableCapture'
import { TABLE_THEMES, type TableThemeId } from '../lib/themes'
import {
  applyTableColumnLayout,
  adjustColumnPercentage,
  getTableDefinitions,
  type TableColumnWidths,
} from '../lib/tableLayout'

export const SAMPLE_MARKDOWN = `# 2026 医药创新观察

当研发项目进入关键节点时，一张清晰的表格往往比长段文字更容易帮助读者抓住重点。正文仍然保持为可复制、可编辑的文字。

## 本周项目进展

| 项目 | 技术方向 | 当前阶段 | 下一节点 |
| --- | --- | --- | --- |
| Alpha-01 | 双抗 | 临床 II 期 | 2026 Q4 数据读出 |
| Beta-07 | ADC | 临床 I 期 | 剂量扩展 |
| Gamma-12 | 小分子 | 临床前 | IND 申报 |

### 为什么转换成图片

- 表格边框不会在公众号编辑器中丢失
- 手机端字体、间距与颜色保持一致
- 点击图片后仍可放大查看细节

| 方案 | 版式稳定 | 可复制正文 | 适合手机阅读 |
| --- | :---: | :---: | :---: |
| 原生表格 | 一般 | 是 | 一般 |
| 表格图片 | 好 | 正文可复制 | 好 |

> 工具只处理表格，标题、段落、列表和引用仍然保持原来的内容结构。`

interface EditorWorkspaceProps {
  capture?: CaptureFunction
  copy?: CopyFunction
  downloadAll?: DownloadAllFunction
}

type TableLayoutMode = 'auto' | 'manual'

function downloadArtifact(artifact: TableArtifact) {
  const link = document.createElement('a')
  link.href = artifact.dataUrl
  link.download = artifact.filename
  link.click()
}

async function readLocalFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

export function EditorWorkspace({
  capture = captureTablePng,
  copy = copyRichArticle,
  downloadAll = downloadAllArtifacts,
}: EditorWorkspaceProps) {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)
  const [filename, setFilename] = useState('示例文章.md')
  const [convertedHtml, setConvertedHtml] = useState<string | null>(null)
  const [artifacts, setArtifacts] = useState<TableArtifact[]>([])
  const [status, setStatus] = useState('已识别 2 个表格，等待转换')
  const [isConverting, setIsConverting] = useState(false)
  const [isRenderingMermaid, setIsRenderingMermaid] = useState(false)
  const [theme, setTheme] = useState<TableThemeId>('editorial')
  const [tableFontSize, setTableFontSize] = useState(14)
  const [cellWidth, setCellWidth] = useState(10)
  const [tableLayout, setTableLayout] = useState<TableLayoutMode>('auto')
  const [manualColumnWidths, setManualColumnWidths] = useState<TableColumnWidths>([])
  const [activeTableIndex, setActiveTableIndex] = useState(0)
  const previewRef = useRef<HTMLElement>(null)

  const tableStyle = {
    '--table-font-size': `${tableFontSize}px`,
    '--table-cell-min-width': `${cellWidth}%`,
  } as CSSProperties

  const sourceHtml = useMemo(() => renderMarkdown(markdown), [markdown])
  const tableDefinitions = useMemo(
    () => getTableDefinitions(sourceHtml, tableFontSize, cellWidth),
    [cellWidth, sourceHtml, tableFontSize],
  )
  const renderedHtml = useMemo(
    () => applyTableColumnLayout(
      convertedHtml ?? sourceHtml,
      tableDefinitions,
      tableLayout,
      manualColumnWidths,
    ),
    [convertedHtml, manualColumnWidths, sourceHtml, tableDefinitions, tableLayout],
  )
  useEffect(() => {
    const preview = previewRef.current
    if (!preview || preview.dataset.renderedSource === renderedHtml) return
    preview.innerHTML = renderedHtml
    preview.dataset.renderedSource = renderedHtml
  }, [renderedHtml])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) return

    const pendingCount = preview.querySelectorAll('div.mermaid-diagram--pending').length
    if (pendingCount === 0) {
      setIsRenderingMermaid(false)
      return
    }

    let active = true
    setIsRenderingMermaid(true)
    setStatus(`正在渲染 ${pendingCount} 个 Mermaid 图表…`)

    void renderMermaidDiagrams(preview).then((renderedCount) => {
      if (!active) return
      setIsRenderingMermaid(false)
      setStatus(
        renderedCount === pendingCount
          ? `已渲染 ${renderedCount} 个 Mermaid 图表，请生成表格图片`
          : `有 ${pendingCount - renderedCount} 个 Mermaid 图表渲染失败`,
      )
    })

    return () => {
      active = false
    }
  }, [renderedHtml])

  const updateMarkdown = (value: string) => {
    setMarkdown(value)
    setConvertedHtml(null)
    setArtifacts([])
    setManualColumnWidths([])
    setActiveTableIndex(0)
    const tableCount = (value.match(/^\s*\|.+\|\s*$/gm) ?? []).length
    setStatus(tableCount > 1 ? '内容已更新，等待转换' : '未识别到 Markdown 表格')
  }

  const importMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await readLocalFile(file)
    setFilename(file.name)
    updateMarkdown(text)
    setStatus(`已导入 ${file.name}`)
    event.target.value = ''
  }

  const generateImages = async () => {
    const preview = previewRef.current
    if (!preview || isConverting) return
    const tableCount = preview.querySelectorAll('[data-table-capture]').length
    if (tableCount === 0 && artifacts.length === 0) {
      setStatus('当前文章没有需要转换的表格')
      return
    }

    setIsConverting(true)
    setStatus('正在生成高清表格图片…')
    const workingCopy = preview.cloneNode(true) as HTMLElement
    workingCopy.classList.add('capture-staging')
    // Fixed-position staging is clipped at the viewport boundary by Chromium's
    // foreignObject renderer, leaving the lower rows blank in long table PNGs.
    workingCopy.style.setProperty('position', 'absolute', 'important')
    // 540 CSS pixels at 2× yields the 1080 px source image commonly used in WeChat articles.
    workingCopy.style.width = `${Math.max(preview.clientWidth, 540)}px`
    document.body.appendChild(workingCopy)

    try {
      const generated = tableCount
        ? await replaceTablesWithImages(workingCopy, capture)
        : artifacts
      const finalHtml = workingCopy.innerHTML
      setConvertedHtml(finalHtml)
      setArtifacts(generated)
      setStatus(`已生成 ${generated.length} 张完整表格图片`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '转换失败，请重试')
    } finally {
      workingCopy.remove()
      setIsConverting(false)
    }
  }

  const copyToWechat = async () => {
    const preview = previewRef.current
    if (!preview || artifacts.length === 0) {
      setStatus('请先生成表格图片')
      return
    }

    try {
      await copy(
        serializeArticleForClipboard(preview),
        preview.innerText || preview.textContent || '',
      )
      setStatus('已复制，可粘贴至微信公众号')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '复制失败，请重试')
    }
  }

  const downloadAllImages = async () => {
    try {
      await downloadAll(artifacts)
      setStatus(`已下载包含 ${artifacts.length} 张图片的压缩包`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '下载失败，请重试')
    }
  }

  const updateTheme = (nextTheme: TableThemeId) => {
    setTheme(nextTheme)
    setConvertedHtml(null)
    setArtifacts([])
    const selected = TABLE_THEMES.find((item) => item.id === nextTheme)
    setStatus(`已切换为${selected?.name ?? '新'}主题，请生成表格图片`)
  }

  const updateTableSetting = (message: string) => {
    setConvertedHtml(null)
    setArtifacts([])
    setStatus(`${message}，请重新生成表格图片`)
  }

  const updateTableLayout = (nextLayout: TableLayoutMode) => {
    if (nextLayout === 'manual') {
      setManualColumnWidths((current) =>
        tableDefinitions.map((definition, tableIndex) =>
          current[tableIndex]?.length === definition.autoWidths.length
            ? current[tableIndex]
            : [...definition.autoWidths],
        ),
      )
    }
    setTableLayout(nextLayout)
    updateTableSetting('列宽模式已调整')
  }

  const updateManualColumnWidth = (
    tableIndex: number,
    columnIndex: number,
    width: number,
  ) => {
    setManualColumnWidths((current) => {
      const next = current.map((widths) => [...widths])
      next[tableIndex] = next[tableIndex] ?? [...tableDefinitions[tableIndex].autoWidths]
      next[tableIndex] = adjustColumnPercentage(next[tableIndex], columnIndex, width)
      return next
    })
    updateTableSetting('列宽已手动调整')
  }

  const resetActiveTableWidths = () => {
    setManualColumnWidths((current) => {
      const next = current.map((widths) => [...widths])
      next[activeTableIndex] = [...tableDefinitions[activeTableIndex].autoWidths]
      return next
    })
    updateTableSetting('当前表格已按内容重新计算')
  }

  const resetPreview = () => {
    setConvertedHtml(null)
    setArtifacts([])
    setStatus('已恢复可编辑表格')
  }

  return (
    <main className="workspace">
      <section className="editor-panel" aria-labelledby="editor-title">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">原稿</span>
            <h2 id="editor-title">Markdown 编辑区</h2>
          </div>
          <label className="file-button">
            <span>导入 .md</span>
            <input
              id="markdown-file"
              name="markdown-file"
              aria-label="导入 Markdown 文件"
              accept=".md,.markdown,text/markdown,text/plain"
              type="file"
              onChange={importMarkdown}
            />
          </label>
        </div>

        <div className="file-strip">
          <span className="file-dot" aria-hidden="true" />
          <span>{filename}</span>
          <span className="file-meta">本地处理 · 不上传</span>
        </div>

        <textarea
          id="markdown-content"
          name="markdown-content"
          aria-label="Markdown 内容"
          className="markdown-editor"
          value={markdown}
          spellCheck={false}
          onChange={(event) => updateMarkdown(event.target.value)}
        />

        <p className="privacy-note">
          文件只在当前浏览器中解析。表格以 2× 清晰度生成，正文不会变成图片。
        </p>
      </section>

      <section className="preview-panel" aria-labelledby="preview-title">
        <div className="panel-heading preview-heading">
          <div>
            <span className="eyebrow">成稿</span>
            <h2 id="preview-title">公众号预览</h2>
          </div>
          <div className="preview-tools">
            <button className="text-button" type="button" onClick={resetPreview}>
              恢复表格
            </button>
          </div>
        </div>

        <section className="theme-picker" role="radiogroup" aria-label="表格主题">
          <span className="theme-picker-title">表格主题</span>
          <div className="theme-options">
            {TABLE_THEMES.map((item) => (
              <label className="theme-chip" data-theme-chip={item.id} key={item.id}>
                <input
                  type="radio"
                  name="table-theme"
                  value={item.id}
                  aria-label={item.name}
                  checked={theme === item.id}
                  onChange={() => updateTheme(item.id)}
                />
                <span className="theme-chip-swatch" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <strong>{item.name}</strong>
              </label>
            ))}
          </div>
        </section>

        <section className="table-control-bar" aria-label="表格排版设置">
          <div className="control-intro">
            <strong>表格排版</strong>
            <span>预览与 PNG 同步</span>
          </div>
          <label className="range-control">
            <span>
              字体大小
              <output htmlFor="table-font-size">{tableFontSize} px</output>
            </span>
            <input
              id="table-font-size"
              name="table-font-size"
              aria-label="表格字体大小"
              type="range"
              min="12"
              max="20"
              step="1"
              value={tableFontSize}
              onChange={(event) => {
                setTableFontSize(Number(event.target.value))
                updateTableSetting('字体大小已调整')
              }}
            />
          </label>
          <label className={tableLayout === 'manual' ? 'range-control is-disabled' : 'range-control'}>
            <span>
              最小列占比
              <output htmlFor="table-cell-width">{cellWidth}%</output>
            </span>
            <input
              id="table-cell-width"
              name="table-cell-width"
              aria-label="最小列占比"
              type="range"
              min="5"
              max="20"
              step="1"
              value={cellWidth}
              disabled={tableLayout === 'manual'}
              onChange={(event) => {
                setCellWidth(Number(event.target.value))
                updateTableSetting('单元格宽度已调整')
              }}
            />
          </label>
          <label className="layout-select">
            <span>列宽模式</span>
            <select
              id="table-layout"
              name="table-layout"
              aria-label="列宽模式"
              value={tableLayout}
              onChange={(event) => updateTableLayout(event.target.value as TableLayoutMode)}
            >
              <option value="auto">自适应内容</option>
              <option value="manual">逐列手动</option>
            </select>
          </label>
        </section>

        {tableLayout === 'manual' && tableDefinitions.length > 0 && (
          <section className="column-width-editor" aria-label="逐列宽度设置">
            <div className="column-editor-heading">
              <div>
                <strong>逐列微调</strong>
                <span>拖动后直接查看表格比例</span>
              </div>
              <button type="button" onClick={resetActiveTableWidths}>按内容重算</button>
            </div>
            {tableDefinitions.length > 1 && (
              <div className="table-tabs" role="tablist" aria-label="选择要调节的表格">
                {tableDefinitions.map((definition, tableIndex) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTableIndex === tableIndex}
                    className={activeTableIndex === tableIndex ? 'is-active' : ''}
                    key={`${definition.headers.join('-')}-${tableIndex}`}
                    onClick={() => setActiveTableIndex(tableIndex)}
                  >
                    表格 {tableIndex + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="column-width-list">
              {tableDefinitions[activeTableIndex].headers.map((header, columnIndex) => {
                const width = manualColumnWidths[activeTableIndex]?.[columnIndex]
                  ?? tableDefinitions[activeTableIndex].autoWidths[columnIndex]
                const label = `表格 ${activeTableIndex + 1} · ${header}列宽`
                return (
                  <label className="column-width-control" key={`${header}-${columnIndex}`}>
                    <span title={header}>{header}</span>
                    <input
                      aria-label={label}
                      type="range"
                      min="5"
                      max={100 - 5 * (tableDefinitions[activeTableIndex].headers.length - 1)}
                      step="0.5"
                      value={width}
                      onChange={(event) => updateManualColumnWidth(
                        activeTableIndex,
                        columnIndex,
                        Number(event.target.value),
                      )}
                    />
                    <output aria-label={`${label} ${width}`}>{width}%</output>
                  </label>
                )
              })}
            </div>
          </section>
        )}

        <div className={artifacts.length > 0 ? 'phone-stage phone-stage--complete' : 'phone-stage'}>
          <div className="phone-shell">
            <div className="phone-bar" aria-hidden="true">
              <span>公众号文章</span>
              <span>•••</span>
            </div>
            <article
              ref={previewRef}
              aria-label="公众号文章预览"
              className="wechat-article"
              data-table-theme={theme}
              data-table-layout={tableLayout}
              style={tableStyle}
            />
          </div>
        </div>

        <div className="action-dock">
          <div className="status-line" aria-live="polite">
            <span className={isConverting ? 'status-pulse is-active' : 'status-pulse'} />
            {status}
          </div>
          <div className="action-buttons">
            {artifacts.length > 0 && (
              <button
                className="secondary-button"
                type="button"
                disabled={isConverting}
                onClick={generateImages}
              >
                重新生成图片
              </button>
            )}
            <button
              className="primary-button"
              type="button"
              disabled={isConverting || isRenderingMermaid}
              onClick={generateImages}
            >
              {isConverting
                ? '正在生成…'
                : artifacts.length > 0
                  ? '重新生成图片'
                  : '生成高清表格图片'}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={isConverting || isRenderingMermaid || artifacts.length === 0}
              onClick={copyToWechat}
              title={artifacts.length === 0 ? '请先生成表格图片' : '复制整篇富文本至微信公众号'}
            >
              复制至微信公众号
            </button>
          </div>
        </div>

        {artifacts.length > 0 && (
          <div className="download-area">
            <div className="download-heading">
              <div>
                <strong>已生成 {artifacts.length} 张图片</strong>
                <span>长表格已自动分页并重复表头</span>
              </div>
              <button type="button" onClick={downloadAllImages}>一键下载全部图片</button>
            </div>
            <div className="download-list" aria-label="生成的表格图片">
              {artifacts.map((artifact, index) => (
                <button
                  key={artifact.filename}
                  type="button"
                  onClick={() => downloadArtifact(artifact)}
                >
                  <span>表格 {String(index + 1).padStart(2, '0')}</span>
                  <strong>下载 PNG</strong>
                  <span className="sr-only">下载表格 {String(index + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
