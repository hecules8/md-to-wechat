import { useState, type ChangeEvent } from 'react'
import { buildIllustrationBrief, readIllustrationFile, SCIENTIFIC_FIGURE_TASKS, type ScientificFigureTask, type ArticleIllustration, type IllustrationAnchor } from '../lib/illustrations'

interface IllustrationPanelProps {
  markdown: string
  anchors: IllustrationAnchor[]
  illustrations: ArticleIllustration[]
  disabled: boolean
  onChange: (update: (current: ArticleIllustration[]) => ArticleIllustration[]) => void
  onExport: () => void
}

export function IllustrationPanel({ markdown, anchors, illustrations, disabled, onChange, onExport }: IllustrationPanelProps) {
  const [isReading, setIsReading] = useState(false)
  const [message, setMessage] = useState('')
  const [showBrief, setShowBrief] = useState(false)
  const [figureTask, setFigureTask] = useState<ScientificFigureTask>('auto')
  const busy = disabled || isReading

  const importFiles = async (event: ChangeEvent<HTMLInputElement>, replaceId?: string) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setIsReading(true)
    const results = await Promise.allSettled(files.map(readIllustrationFile))
    const imported = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
    const failures = results.flatMap(result => result.status === 'rejected' ? [String(result.reason instanceof Error ? result.reason.message : result.reason)] : [])
    if (replaceId && imported[0]) {
      onChange(current => current.map(item => item.id === replaceId ? { ...item, ...imported[0] } : item))
    } else if (imported.length > 0) {
      onChange(current => [...current, ...imported.map(item => ({ ...item, id: crypto.randomUUID(), caption: '', anchorId: null }))])
    }
    setMessage([imported.length ? replaceId ? '图片已替换，位置与图注已保留。' : `已导入 ${imported.length} 张配图，请选择插入位置。` : '', ...failures].filter(Boolean).join(' '))
    setIsReading(false)
  }

  const updateImage = (id: string, patch: Partial<ArticleIllustration>) => {
    onChange(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
    setMessage('anchorId' in patch ? patch.anchorId ? '配图已放入所选位置，可在公众号预览中查看。' : '配图已移出正文，仍保留在图片库中。' : '图注已更新。')
  }

  const copyBrief = async () => {
    const brief = buildIllustrationBrief(markdown, figureTask)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(brief)
      setMessage('配图说明已复制。粘贴到 ChatGPT，确认方案并生成图片后，再回到这里导入。')
    } catch {
      setShowBrief(true)
      setMessage('无法直接复制，请选中下方说明手动复制。')
    }
  }

  return (
    <section className="illustration-panel" aria-labelledby="illustration-title">
      <div className="illustration-heading">
        <div><span className="eyebrow">图文搭配</span><h2 id="illustration-title">文章配图</h2></div>
        <span className="local-badge">本地导入</span>
      </div>
      <p className="illustration-intro">把难懂内容画清楚：临床数据用期刊统计图，竞品管线用阶段矩阵，机制机理用精细医学插画。按内容匹配视觉表达。</p>
      <label className="scientific-figure-select"><span>图解任务</span>
        <select aria-label="图解任务" value={figureTask} disabled={busy} onChange={event => { setFigureTask(event.target.value as ScientificFigureTask); setMessage('图解任务已更新，请重新复制说明。') }}>
          {SCIENTIFIC_FIGURE_TASKS.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
      <p className="illustration-note">数据对比图用数据绘图，管线图用矩阵排版，机制图用科学插画。复制说明后在 ChatGPT 中完成。</p>
      <div className="illustration-steps" aria-label="配图流程"><span>01 复制说明去绘图</span><span>02 导入图片</span><span>03 选择段落</span></div>
      <div className="illustration-actions">
        <button type="button" disabled={busy || !markdown.trim()} onClick={copyBrief}>复制 ChatGPT 配图说明</button>
        <label className={`file-button illustration-import${busy ? ' is-disabled' : ''}`}>
          {isReading ? '正在读取…' : '导入配图'}
          <input type="file" aria-label="导入文章配图" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={event => { void importFiles(event) }} />
        </label>
      </div>
      <details open={showBrief} onToggle={event => setShowBrief(event.currentTarget.open)}>
        <summary>查看科学图解说明</summary>
        {showBrief && <textarea aria-label="ChatGPT 配图说明" readOnly value={buildIllustrationBrief(markdown, figureTask)} rows={9} />}
      </details>
      <p className="illustration-note">PNG / JPG / WebP，单张不超过 10 MB。图片仅保存在当前页面；刷新前请下载图文 HTML。</p>
      {illustrations.length === 0 ? <div className="illustration-empty">导入后，可将配图放在文章开头或指定段落之后。</div> : (
        <div className="illustration-list">
          {illustrations.map((item, index) => {
            const missing = !!item.anchorId && item.anchorId !== 'start' && !anchors.some(anchor => anchor.id === item.anchorId)
            return (
              <div className="illustration-card" key={item.id}>
                <img className="illustration-thumbnail" src={item.dataUrl} alt={`配图 ${index + 1} 缩略图`} />
                <div className="illustration-card-fields">
                  <strong className="illustration-filename" title={item.filename}>{item.filename}</strong>
                  <label><span>插入位置</span><select aria-label={`配图 ${index + 1} 插入位置`} value={missing ? 'missing' : item.anchorId ?? ''} disabled={busy} onChange={event => updateImage(item.id, { anchorId: event.target.value || null })}>
                    <option value="">暂不插入</option><option value="start">文章开头</option>
                    {missing && <option value="missing" disabled>原位置已变化</option>}
                    {anchors.map(anchor => <option value={anchor.id} key={anchor.id}>{anchor.label} 之后</option>)}
                  </select></label>
                  {missing && <p className="illustration-warning">原插入位置已变化，请重新选择。</p>}
                  <label><span>图注（选填）</span><input aria-label={`图注 ${index + 1}`} maxLength={240} value={item.caption} placeholder="简短说明图片与正文的关系" disabled={busy} onChange={event => updateImage(item.id, { caption: event.target.value })} /></label>
                  <div className="illustration-card-actions">
                    <label className="file-button">替换图片<input type="file" aria-label={`替换配图 ${index + 1}`} accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { void importFiles(event, item.id) }} /></label>
                    <button type="button" aria-label={`移除配图 ${index + 1}`} disabled={busy} onClick={() => { onChange(current => current.filter(image => image.id !== item.id)); setMessage('配图已移除。') }}>移除</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="illustration-export"><button type="button" disabled={busy || !markdown.trim()} onClick={onExport}>下载图文 HTML</button><span>包含当前预览与图片，可离线查看</span></div>
      {message && <p className="illustration-message" role="status">{message}</p>}
    </section>
  )
}
