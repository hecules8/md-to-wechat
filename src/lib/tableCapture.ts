import { toPng } from 'html-to-image'
import {
  getTableCaptureOptions,
  getTableFilename,
  getTableWidthClass,
} from './tableModel'

export interface TableArtifact {
  dataUrl: string
  filename: string
  alt: string
}

export type CaptureFunction = (
  node: HTMLElement,
  options: Parameters<typeof toPng>[1],
) => Promise<string>

export const captureTablePng: CaptureFunction = (node, options) => toPng(node, options)

const MAX_BODY_ROWS_PER_IMAGE = 12

function getColumnCount(table: HTMLTableElement): number {
  return table.rows[0]?.cells.length ?? 0
}

function getAccessibleTableText(table: HTMLTableElement): string {
  const rows = Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('，'),
    )
    .filter(Boolean)

  return `表格：${rows.join('；')}`
}

function createCapturePages(target: HTMLElement, table: HTMLTableElement): HTMLElement[] {
  const body = table.tBodies[0]
  const rows = body ? Array.from(body.rows) : []
  if (rows.length <= MAX_BODY_ROWS_PER_IMAGE) return [target]

  const pages: HTMLElement[] = []
  for (let start = 0; start < rows.length; start += MAX_BODY_ROWS_PER_IMAGE) {
    const page = target.cloneNode(true) as HTMLElement
    const pageBody = page.querySelector('tbody')
    if (!pageBody) return [target]
    pageBody.replaceChildren(
      ...rows
        .slice(start, start + MAX_BODY_ROWS_PER_IMAGE)
        .map((row) => row.cloneNode(true)),
    )
    page.dataset.tablePage = String(pages.length + 1)
    page.removeAttribute('data-table-capture')
    target.parentNode?.insertBefore(page, target)
    pages.push(page)
  }
  return pages
}

function getCaptureDimensions(target: HTMLElement): { width: number; height: number } {
  const bounds = target.getBoundingClientRect()
  return {
    width: Math.max(1, Math.ceil(Math.max(target.clientWidth, target.scrollWidth, bounds.width))),
    height: Math.max(1, Math.ceil(Math.max(target.clientHeight, target.scrollHeight, bounds.height))),
  }
}

function createArticleImage(artifact: TableArtifact, generatedIndex: number): HTMLImageElement {
  const image = document.createElement('img')
  image.src = artifact.dataUrl
  image.alt = artifact.alt
  image.className = 'article-table-image'
  image.dataset.generatedTable = String(generatedIndex + 1)
  return image
}

export async function replaceTablesWithImages(
  root: HTMLElement,
  capture: CaptureFunction = captureTablePng,
): Promise<TableArtifact[]> {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-table-capture]'))
  const artifacts: TableArtifact[] = []

  for (const [index, target] of targets.entries()) {
    const table = target.querySelector('table')
    if (!(table instanceof HTMLTableElement)) continue

    const columnCount = getColumnCount(table)
    const widthClass = getTableWidthClass(columnCount)
    target.classList.remove('table-capture--pending')
    target.classList.add(`table-capture--${widthClass}`)
    const pages = createCapturePages(target, table)
    const tableArtifacts: TableArtifact[] = []

    try {
      const options = getTableCaptureOptions(columnCount)
      for (const [pageIndex, page] of pages.entries()) {
        const pageTable = page.querySelector('table')
        if (!(pageTable instanceof HTMLTableElement)) continue
        // Capture the table itself. Capturing the surrounding figure also
        // rasterizes its padding, rounded border and decorative background.
        const { width, height } = getCaptureDimensions(pageTable)
        const dataUrl = await capture(pageTable, {
          ...options,
          width,
          height,
          canvasWidth: width,
          canvasHeight: height,
        })
        tableArtifacts.push({
          dataUrl,
          alt: getAccessibleTableText(pageTable),
          filename: getTableFilename(index, pageIndex, pages.length),
        })
      }

      pages.filter((page) => page !== target).forEach((page) => page.remove())
      const images = tableArtifacts.map((artifact, pageIndex) =>
        createArticleImage(artifact, artifacts.length + pageIndex),
      )
      if (images.length === 1) {
        target.replaceWith(images[0])
      } else {
        const group = document.createElement('div')
        group.className = 'article-table-image-group'
        group.dataset.generatedTableGroup = String(index + 1)
        group.append(...images)
        target.replaceWith(group)
      }
      artifacts.push(...tableArtifacts)
    } catch {
      pages.filter((page) => page !== target).forEach((page) => page.remove())
      target.dataset.captureError = 'true'
      target.classList.add('table-capture--error')
    }
  }

  return artifacts
}
