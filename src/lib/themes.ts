export type TableThemeId = 'editorial' | 'ocean' | 'vermilion' | 'monochrome'

export interface TableTheme {
  id: TableThemeId
  name: string
  description: string
}

export const TABLE_THEMES: TableTheme[] = [
  { id: 'editorial', name: '墨绿编辑', description: '沉稳、适合医药与商业内容' },
  { id: 'ocean', name: '科技蓝', description: '清爽、适合数据与研究文章' },
  { id: 'vermilion', name: '雅致红', description: '温暖、适合观点与人文内容' },
  { id: 'monochrome', name: '黑白报告', description: '克制、适合正式报告与长表' },
]
