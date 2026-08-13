import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from '../App'

describe('App header and hero copy', () => {
  it('uses the requested product title and removes the old header copy', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'MD to Wechat' })).toBeInTheDocument()
    expect(screen.queryByText('表格成像')).not.toBeInTheDocument()
    expect(screen.queryByText('保留文字，只把难处理的表格变清晰。')).not.toBeInTheDocument()
  })
})
