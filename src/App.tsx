import { EditorWorkspace } from './components/EditorWorkspace'

export default function App() {
  return (
    <div className="app-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="MD to Wechat 首页">
          <span className="brand-mark" aria-hidden="true">格</span>
          <small>MD → WECHAT</small>
        </a>
        <a className="source-link" href="https://github.com/doocs/md" target="_blank" rel="noreferrer">
          开源参考
        </a>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <span className="kicker">公众号排版小工具</span>
          <h1 id="page-title">MD to Wechat</h1>
        </div>
        <p>
          导入 Markdown，实时检查版式。一键把表格转换为适合手机阅读的高清 PNG，
          标题、段落和列表仍可在公众号中继续编辑。
        </p>
      </section>

      <EditorWorkspace />

      <footer>
        <span>本地优先 · 无需登录</span>
        <span>参考 doocs/md · 基于 html-to-image</span>
      </footer>
    </div>
  )
}
