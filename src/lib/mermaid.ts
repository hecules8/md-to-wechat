import { toPng } from 'html-to-image'
import mermaid from 'mermaid'

let initialized = false

export type MermaidCaptureFunction = (
  node: HTMLElement,
  options?: Parameters<typeof toPng>[1],
) => Promise<string>

const captureMermaidPng: MermaidCaptureFunction = (node, options) => toPng(node, options)

function ensureMermaidInitialized() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    flowchart: { htmlLabels: false },
  })
  initialized = true
}

function getSvgDimensions(svg: SVGSVGElement): { width: number; height: number } {
  const viewBox = svg.getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  const width = viewBox?.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : 720
  const height = viewBox?.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : 480
  return {
    width: Math.max(1, Math.ceil(width)),
    height: Math.max(1, Math.ceil(height)),
  }
}

export async function renderMermaidDiagrams(
  root: HTMLElement,
  capture: MermaidCaptureFunction = captureMermaidPng,
): Promise<number> {
  const targets = Array.from(root.querySelectorAll<HTMLDivElement>('div.mermaid-diagram--pending'))
  if (targets.length === 0) return 0

  ensureMermaidInitialized()
  let renderedCount = 0

  for (const target of targets) {
    const source = target.textContent?.trim()
    if (!source) continue

    const staging = document.createElement('div')
    const renderTarget = document.createElement('div')
    try {
      staging.className = 'mermaid-capture-staging'
      renderTarget.className = 'mermaid'
      renderTarget.textContent = source
      staging.append(renderTarget)
      document.body.append(staging)
      await mermaid.run({ nodes: [renderTarget] })

      const svg = renderTarget.querySelector('svg')
      if (!(svg instanceof SVGSVGElement)) throw new Error('Mermaid 未生成图形')
      const { width, height } = getSvgDimensions(svg)
      svg.setAttribute('width', String(width))
      svg.setAttribute('height', String(height))
      svg.style.maxWidth = 'none'
      renderTarget.style.width = `${width}px`
      renderTarget.style.height = `${height}px`

      const pngUrl = await capture(renderTarget, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        width,
        height,
      })
      if (!pngUrl.startsWith('data:image/png')) throw new Error('Mermaid 图片无法转换为 PNG')

      const image = document.createElement('img')
      image.className = 'mermaid-diagram-image'
      image.dataset.generatedMermaid = 'true'
      image.alt = 'Mermaid 图表'
      image.src = pngUrl
      target.replaceWith(image)
      renderedCount += 1
    } catch (error) {
      target.classList.remove('mermaid-diagram--pending')
      target.classList.add('mermaid-diagram--error')
      const message = error instanceof Error ? error.message : '请检查语法'
      target.textContent = `Mermaid 图表渲染失败：${message}`
    } finally {
      staging.remove()
    }
  }

  return renderedCount
}
