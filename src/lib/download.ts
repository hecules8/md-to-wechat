import JSZip from 'jszip'
import type { TableArtifact } from './tableCapture'

export type DownloadAllFunction = (artifacts: TableArtifact[]) => Promise<void>

export async function createArtifactsZip(artifacts: TableArtifact[]): Promise<Uint8Array> {
  const zip = new JSZip()

  artifacts.forEach((artifact) => {
    const base64 = artifact.dataUrl.split(',', 2)[1]
    if (!base64) throw new Error(`无法读取图片：${artifact.filename}`)
    zip.file(artifact.filename, base64, { base64: true })
  })

  return zip.generateAsync({ type: 'uint8array' })
}

export const downloadAllArtifacts: DownloadAllFunction = async (artifacts) => {
  if (artifacts.length === 0) return
  const archive = await createArtifactsZip(artifacts)
  const buffer = archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength,
  ) as ArrayBuffer
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '公众号表格图片.zip'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
