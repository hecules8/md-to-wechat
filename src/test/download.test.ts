import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { createArtifactsZip } from '../lib/download'

describe('createArtifactsZip', () => {
  it('puts every generated PNG into one zip archive', async () => {
    const archive = await createArtifactsZip([
      { filename: '表格-01.png', dataUrl: 'data:image/png;base64,Zmlyc3Q=', alt: '第一张' },
      { filename: '表格-02.png', dataUrl: 'data:image/png;base64,c2Vjb25k', alt: '第二张' },
    ])
    const zip = await JSZip.loadAsync(archive)

    expect(Object.keys(zip.files)).toEqual(['表格-01.png', '表格-02.png'])
    expect(await zip.file('表格-01.png')?.async('string')).toBe('first')
    expect(await zip.file('表格-02.png')?.async('string')).toBe('second')
  })
})
