import { describe, expect, it } from 'vitest'
import { getIllustrationAnchors, insertIllustrations, readIllustrationFile, buildIllustrationBrief } from '../lib/illustrations'

describe('local article illustrations', () => {
  const html = '<h1>标题</h1><p>第一段</p><p>第二段</p>'
  const image = { id: 'one', filename: '示意图.png', dataUrl: 'data:image/png;base64,aGVsbG8=', caption: '图注 <script>', anchorId: 'start' }

  it('keeps anchors stable when other blocks are added and distinguishes repeated paragraphs', () => {
    const original = getIllustrationAnchors(html)
    const changed = getIllustrationAnchors('<p>新增段落</p>' + html)
    expect(original[1].id).toBe(changed[2].id)
    expect(getIllustrationAnchors('<p>重复</p><p>重复</p>')[0].id)
      .not.toBe(getIllustrationAnchors('<p>重复</p><p>重复</p>')[1].id)
  })

  it('inserts after the selected block, escapes captions, and omits unresolved positions', () => {
    const anchors = getIllustrationAnchors(html)
    const output = document.createElement('div')
    output.innerHTML = insertIllustrations(html, [
      { ...image, anchorId: anchors[1].id },
      { ...image, id: 'missing', anchorId: 'deleted-block' },
    ])
    expect(output.querySelectorAll('img')).toHaveLength(1)
    expect(output.querySelector('p')?.nextElementSibling?.querySelector('img')?.src).toBe(image.dataUrl)
    expect(output.querySelector('figcaption')?.textContent).toBe(image.caption)
    expect(output.querySelector('script')).toBeNull()
    expect(output.querySelector('figure')?.nextElementSibling?.textContent).toBe('第二段')
  })

  it('preserves import order for multiple images at the same position and does not inject remote image URLs', () => {
    const output = document.createElement('div')
    output.innerHTML = insertIllustrations(html, [image, { ...image, id: 'two' }, { ...image, id: 'remote', dataUrl: 'https://example.com/tracker.png' }])
    expect(Array.from(output.querySelectorAll('figure')).map(node => node.dataset.illustration)).toEqual(['one', 'two'])
    expect(output.firstElementChild?.tagName).toBe('FIGURE')
  })

  it('reads supported local images and rejects unsupported or oversized files', async () => {
    const result = await readIllustrationFile(new File(['hello'], 'a.png', { type: 'image/png' }))
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/)
    await expect(readIllustrationFile(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG')
    await expect(readIllustrationFile(new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' }))).rejects.toThrow('10 MB')
  })

  it('builds a portable ChatGPT brief with the original text and restrained style requirements', () => {
    const brief = buildIllustrationBrief('原文内容')
    expect(brief).toContain('原文内容')
    expect(brief).toContain('科学配图')
    expect(brief).toContain('不要编造')
    expect(brief).toContain('插入')
  })

  it('requires useful article-grounded information before choosing the visual style', () => {
    const brief = buildIllustrationBrief('【事实】方案 A 已披露结果。【推断】其他用途仍待验证。')
    for (const requirement of ['核心问题', '原文依据', '证据状态', '新增理解', '必要标签']) {
      expect(brief).toContain(requirement)
    }
    expect(brief).toContain('【事实】方案 A 已披露结果。【推断】其他用途仍待验证。')
    expect(brief).not.toContain('图内尽量不放文字')
    expect(brief).not.toContain('大面积留白')
    expect(brief).toContain('不要编造')
  })

  it('uses scientific figure conventions and keeps generated schematics separate from real experimental results', () => {
    const brief = buildIllustrationBrief('科学原文')
    for (const requirement of ['Nature', 'Cell', 'Science', 'NEJM', 'Figure legend', '多面板', '激活', '抑制', '置信区间', '显微图像']) {
      expect(brief).toContain(requirement)
    }
    expect(brief).toContain('不要生成或伪造')
    expect(brief).not.toContain('视觉极简')
  })

  it('supports explicit mechanism and clinical figure directions', () => {
    expect(buildIllustrationBrief('机制原文', 'mechanism')).toContain('当前图解任务：机制与作用过程')
    expect(buildIllustrationBrief('临床原文', 'clinical')).toContain('当前图解任务：临床数据对比')
  })

  it('routes clinical comparisons to data plotting and preserves comparison boundaries', () => {
    const brief = buildIllustrationBrief('试验 A：ORR 40%；试验 B：ORR 50%。', 'clinical')
    for (const requirement of ['数据分析', '跨试验', '不能据此判定优劣', '随访', '分母']) expect(brief).toContain(requirement)
    expect(brief).toContain('试验 A：ORR 40%；试验 B：ORR 50%。')
  })

  it('supports a competitor pipeline matrix with asset, indication and development-stage fields', () => {
    const brief = buildIllustrationBrief('公司甲的药物 A 用于适应症 X，处于 II 期。', 'pipeline')
    for (const requirement of ['当前图解任务：竞品管线与竞争格局', '公司', '项目', '适应症', '研发阶段', '披露日期']) expect(brief).toContain(requirement)
    expect(brief).toContain('未披露')
  })

  it('adapts the visual language to each content type while retaining the approved medical illustration approach', () => {
    const mechanism = buildIllustrationBrief('机制原文', 'mechanism')
    expect(mechanism).toContain('视觉表达：精细医学插画')
    expect(mechanism).toContain('轻度立体')
    expect(mechanism).toContain('仅借鉴参考图的插画质感和信息组织')
    expect(buildIllustrationBrief('数据原文', 'clinical')).toContain('视觉表达：期刊统计图')
    expect(buildIllustrationBrief('管线原文', 'pipeline')).toContain('视觉表达：竞争格局矩阵')
  })
})
