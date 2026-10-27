export type TableThemeId = 'editorial' | 'ocean' | 'cyan' | 'lavender' | 'amber' | 'vermilion' | 'monochrome'

export interface TableTheme {
  id: TableThemeId
  name: string
  description: string
}

export const TABLE_THEMES: TableTheme[] = [
  { id: 'editorial', name: '翡翠绿', description: '纯色浅绿，适合医药与商业内容' },
  { id: 'ocean', name: '冰川蓝', description: '纯色冰蓝，适合数据与研究文章' },
  { id: 'cyan', name: '晴空青', description: '清透青色，适合技术与进展汇总' },
  { id: 'lavender', name: '雾光紫', description: '柔和紫色，适合创新与专题分析' },
  { id: 'monochrome', name: '月光银', description: '中性银灰，适合正式报告与长表' },
  { id: 'amber', name: '香槟金', description: '纯色浅金，适合商业与市场观察' },
  { id: 'vermilion', name: '玫瑰粉', description: '纯色淡粉，适合温和暖色内容' },
]
