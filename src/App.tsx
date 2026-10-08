import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowDownToLine, ArrowRight, Check, ChevronDown, FileText, Leaf, Printer, RefreshCw, Settings2, Sparkles } from 'lucide-react'
import { generateQuestions, getLayout, operations, supportsChaining } from './generator'
import type { GenerationConfig, Operation } from './generator'

const initial: GenerationConfig = { range: 100, count: 40, operation: 'addsub', terms: 2 }

function Equation({ expression, answer, showAnswer, fontSize }: { expression: string; answer: number; showAnswer: boolean; fontSize: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const measure = () => {
      if (outer.current && inner.current) setScale(Math.min(1, outer.current.clientWidth / inner.current.scrollWidth))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (outer.current) observer.observe(outer.current)
    return () => observer.disconnect()
  }, [expression, answer, showAnswer, fontSize])
  return <div ref={outer} className="equation" style={{ fontSize }}><span ref={inner} style={{ transform: `scale(${scale})` }}>{expression} = <span className={showAnswer ? 'answer' : 'answer-space'}>{showAnswer ? answer : '\u00a0'}</span></span></div>
}

export default function App() {
  const [range, setRange] = useState('100')
  const [count, setCount] = useState('40')
  const [countMode, setCountMode] = useState<'count' | 'pages'>('count')
  const [pageCount, setPageCount] = useState('1')
  const [activePages, setActivePages] = useState<number | null>(null)
  const [operation, setOperation] = useState<Operation>('addsub')
  const [terms, setTerms] = useState(2)
  const [columns, setColumns] = useState(3)
  const [fontSize, setFontSize] = useState(24)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showHeader, setShowHeader] = useState(false)
  const [showFooter, setShowFooter] = useState(false)
  const [showNumbers, setShowNumbers] = useState(false)
  const [title, setTitle] = useState('每日口算练习')
  const [activeConfig, setActiveConfig] = useState(initial)
  const [questions, setQuestions] = useState(() => generateQuestions(initial))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('已为你准备好一份练习，开始吧。')
  const [zoom, setZoom] = useState(1)
  const preview = useRef<HTMLDivElement>(null)
  const layout = getLayout(fontSize, columns, showHeader)
  const pages = Array.from({ length: Math.ceil(questions.length / layout.perPage) }, (_, index) => questions.slice(index * layout.perPage, (index + 1) * layout.perPage))
  const activeLabel = operations.find(op => op.id === activeConfig.operation)!.label
  const requestedCount = countMode === 'pages' ? Number(pageCount) * layout.perPage : Number(count)
  const pending = Number(range) !== activeConfig.range || requestedCount !== activeConfig.count || (countMode === 'pages' ? Number(pageCount) !== activePages : activePages !== null) || operation !== activeConfig.operation || (supportsChaining(operation) && terms !== activeConfig.terms)
  const repeats = questions.length - new Set(questions.map(q => q.expression)).size

  useEffect(() => {
    if (activePages !== null && activeConfig.count !== activePages * layout.perPage) {
      const config = { ...activeConfig, count: activePages * layout.perPage }
      setQuestions(generateQuestions(config))
      setActiveConfig(config)
      setNotice(`排版已更新，已重新生成 ${config.count} 题，铺满 ${activePages} 页。`)
    }
  }, [activePages, layout.perPage, activeConfig])

  useEffect(() => {
    const observer = new ResizeObserver(entries => setZoom(Math.min(1, entries[0].contentRect.width / (210 * 96 / 25.4))))
    if (preview.current) observer.observe(preview.current)
    return () => observer.disconnect()
  }, [])

  function generate() {
    const config = { range: Number(range), count: requestedCount, operation, terms }
    try {
      if (countMode === 'pages' && (!Number.isInteger(Number(pageCount)) || Number(pageCount) < 1 || Number(pageCount) > 10)) throw new Error('铺满页数需为 1–10 的整数')
      if (countMode === 'count' && (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 500)) throw new Error('题数需为 1–500 的整数')
      const next = generateQuestions(config)
      setQuestions(next)
      setActiveConfig(config)
      setActivePages(countMode === 'pages' ? Number(pageCount) : null)
      setError('')
      setNotice(`已生成 ${config.count} 道新题，练习纸已更新。`)
    } catch (e) { setError((e as Error).message) }
  }

  return <>
    <header className="app-header no-print">
      <a href="./" className="brand"><span className="brand-mark scholar-mark"><img src="/icons/math-scholar-192.png" alt="" width="48" height="48" /></span><span>小算纸<span className="brand-sub">让练习，刚刚好</span></span></a>
      <div className="header-note"><span className="status-dot" />无需登录 · 免费生成</div>
      <button className="button button-outline header-print" onClick={() => window.print()}><Printer size={16} />打印练习</button>
    </header>

    <main className="workspace">
      <section className="intro no-print"><div><div className="eyebrow"><Leaf size={14} /> LITTLE PRACTICE, EVERY DAY</div><h1>把每天的小进步，写在纸上。</h1><p>选好题目，自由排版。一张专属的数学练习纸，就准备好了。</p></div><div className="intro-doodle" aria-hidden="true"><span>1 + 2</span><span>= 3 ✧</span></div></section>
      <div className="editor-layout">
        <aside className="settings no-print">
          <div className="panel-title"><Settings2 size={18} /><h2>练习设置</h2><span>自由定制</span></div>
          <section className="setting-section">
            <div className="section-heading"><span className="step">01</span><h3>题目内容</h3></div>
            <label className="field-label" htmlFor="range">数字范围 <span>数字与结果均不超过此值</span></label>
            <div className="range-presets">{[20, 50, 100, 1000].map(value => <button key={value} className={Number(range) === value ? 'chip selected' : 'chip'} onClick={() => setRange(String(value))}>{value} 以内</button>)}</div>
            <div className="input-unit"><input id="range" type="number" min="10" max="10000" value={range} onChange={e => setRange(e.target.value)} /><span>以内</span></div>
            <label className="field-label operation-label">运算类型</label>
            <div className="operation-grid">{operations.map(op => <button title={op.description} aria-pressed={operation === op.id} key={op.id} onClick={() => setOperation(op.id)} className={`operation ${operation === op.id ? 'selected' : ''} ${op.id === 'mixed' ? 'wide' : ''}`}><span className="operation-symbol">{op.symbol}</span>{op.label}{operation === op.id && <Check size={13} />}</button>)}</div>
            {supportsChaining(operation) && <><label className="field-label" htmlFor="terms">连算项数<span>按算式中的数字个数</span></label><select id="terms" value={terms} onChange={e => setTerms(Number(e.target.value))}>{[2, 3, 4, 5].map(value => <option key={value} value={value}>{value} 连（{value} 个数，{value - 1} 次运算）</option>)}</select><p className="setting-hint">{operation === 'add' ? '各项相加' : operation === 'sub' ? '依次相减' : '加减随机组合'}，中间结果与答案均在范围内。</p></>}
            <div className="field-label quantity-label"><span>题目数量</span><span>按题数或页数生成</span></div>
            <div className="segments count-mode"><button aria-pressed={countMode === 'count'} className={countMode === 'count' ? 'active' : ''} onClick={() => setCountMode('count')}>按题数</button><button aria-pressed={countMode === 'pages'} className={countMode === 'pages' ? 'active' : ''} onClick={() => setCountMode('pages')}>铺满指定页数</button></div>
            {countMode === 'count' ? <><label htmlFor="count" className="field-label">题目数量<span>最多 500 题</span></label><div className="input-unit"><input id="count" type="number" min="1" max="500" value={count} onChange={e => setCount(e.target.value)} /><span>题</span></div><div className="quick-counts">快速选择 { [20, 40, 60, 100].map(value => <button key={value} onClick={() => setCount(String(value))} className={Number(count) === value ? 'active' : ''}>{value}</button>)}</div></> : <><label htmlFor="page-count" className="field-label">铺满页数<span>最多 10 页</span></label><div className="input-unit"><input id="page-count" type="number" min="1" max="10" value={pageCount} onChange={e => setPageCount(e.target.value)} /><span>页</span></div><p className="setting-hint">当前每页 {layout.perPage} 题{Number.isInteger(Number(pageCount)) && Number(pageCount) >= 1 && Number(pageCount) <= 10 ? `，共 ${requestedCount} 题` : ''}。生成后随排版自动调整题数。</p></>}
          </section>
          <section className="setting-section layout-section">
            <div className="section-heading"><span className="step">02</span><h3>纸张排版</h3><span className="live-tag">实时预览</span></div>
            {showHeader && <><label className="field-label" htmlFor="sheet-title">练习标题</label><input id="sheet-title" maxLength={24} value={title} onChange={e => setTitle(e.target.value)} /></>}
            <div className="field-label"><span>每行列数</span><span>{columns} 列</span></div>
            <div className="segments">{[1, 2, 3, 4, 5].map(value => <button aria-pressed={columns === value} key={value} onClick={() => setColumns(value)} className={columns === value ? 'active' : ''}>{value} 列</button>)}</div>
            <label className="field-label" htmlFor="font-size">题目字号 <span>{fontSize} px</span></label>
            <input id="font-size" className="font-range" type="range" min="12" max="64" step="1" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
            <div className="range-labels"><span>12 px</span><span>逐级调节</span><span>64 px</span></div>
            <div className="font-presets">{[12, 16, 20, 24, 28, 32, 40, 48, 56, 64].map(value => <button key={value} aria-label={`字号 ${value} px`} aria-pressed={fontSize === value} className={`chip ${fontSize === value ? 'selected' : ''}`} onClick={() => setFontSize(value)}>{value}</button>)}</div>
            {[{ id: 'header', label: '显示页眉', hint: '标题、姓名与练习说明', value: showHeader, set: setShowHeader }, { id: 'footer', label: '显示页脚', hint: '品牌文案；页码始终保留', value: showFooter, set: setShowFooter }, { id: 'numbers', label: '显示序号', hint: '为题目添加连续编号', value: showNumbers, set: setShowNumbers }].map(item => <div className="answer-setting" key={item.id}><div><label htmlFor={item.id}>{item.label}</label><p>{item.hint}</p></div><button id={item.id} role="switch" aria-checked={item.value} aria-label={item.label} className={`toggle ${item.value ? 'on' : ''}`} onClick={() => item.set(!item.value)}><span /></button></div>)}
            <div className="answer-setting"><div><label htmlFor="answers">显示答案</label><p>适合核对与讲解</p></div><button id="answers" role="switch" aria-checked={showAnswer} aria-label="显示答案" className={`toggle ${showAnswer ? 'on' : ''}`} onClick={() => setShowAnswer(!showAnswer)}><span /></button></div>
          </section>
          <div className="generate-area">{error && <p role="alert" className="error">{error}</p>}<button className="button button-primary generate" onClick={generate}><RefreshCw size={17} />生成新题目<ArrowRight size={17} /></button><p>非负整数 · 除法整除 · 优先避免重复</p></div>
        </aside>

        <section className="preview-section" aria-label="练习纸预览">
          <div className="preview-toolbar no-print"><div><span className="preview-icon"><FileText size={18} /></span><h2>练习纸预览</h2><span className="paper-badge">A4</span></div><button className="text-button" onClick={() => window.print()}><ArrowDownToLine size={15} />打印 / 存为 PDF</button></div>
          <div className="preview-meta no-print"><span>{activeConfig.range} 以内 · {activeLabel}{supportsChaining(activeConfig.operation) ? ` · ${activeConfig.terms} 连` : ''} · {questions.length} 题{activePages !== null ? ' · 铺满' : ''}</span><span>共 {pages.length} 页 <ChevronDown size={12} /></span></div>
          <div className="preview-canvas" ref={preview}>
            {pages.map((page, pageIndex) => <div className="sheet-holder" key={pageIndex} style={{ width: `${210 * 96 / 25.4 * zoom}px`, height: `${297 * 96 / 25.4 * zoom}px` }}>
              <article className="sheet" style={{ '--preview-zoom': zoom } as CSSProperties}>
                {showHeader && <><div className="sheet-heading"><div className="sheet-kicker">MATH PRACTICE <span>每天练一点，进步看得见</span></div><h2>{title.trim() || '每日口算练习'}</h2><div className="student-details"><span>姓名：<i /></span></div></div><div className="sheet-description"><span>{activeConfig.range} 以内{activeLabel}练习</span><span>{showAnswer ? '参考答案' : '认真计算，细心检查。'}</span></div></>}
                <div className="questions" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${layout.rowHeight}mm` }}>{page.map((question, index) => <div className="question" key={`${pageIndex}-${index}`}>{showNumbers && <span className="question-number">{String(pageIndex * layout.perPage + index + 1).padStart(2, '0')}.</span>}<Equation {...question} showAnswer={showAnswer} fontSize={fontSize} /></div>)}</div>
                <footer className={`sheet-footer ${showFooter ? '' : 'minimal-footer'}`}>
                  {showFooter && <span className="sheet-brand">小算纸 <span className="footer-dot">·</span> 让练习，刚刚好</span>}
                  <div className="practice-record" aria-label="本页练习记录">
                    <div className="record-row"><span>日期：<i className="record-date" /></span><span>用时：<i /> 分钟</span></div>
                    <div className="record-row"><span>错误个数 / 总个数：<i /> / <strong>{page.length}</strong> 题</span><span>修正用时：<i /> 分钟</span></div>
                    <div className="record-page">第 {pageIndex + 1} / {pages.length} 页</div>
                  </div>
                </footer>
              </article>
            </div>)}
          </div>
          <div className="preview-help no-print"><Printer size={16} /><p>按 <kbd>Ctrl</kbd> + <kbd>P</kbd> 即可打印；选择 A4、100% 缩放，并关闭浏览器页眉页脚。<span>纸张按实际比例预览，过长算式会自动缩小以适应列宽。</span></p></div>
          <div className="notice no-print" role="status" aria-live="polite"><Sparkles size={14} />{pending ? '题目设置已修改，点击「生成新题目」应用。' : notice}{repeats > 0 && ` 当前组合有限，包含 ${repeats} 道重复题。`}</div>
        </section>
      </div>
      <footer className="app-footer no-print"><span>小算纸 · 把专注留给每一次练习</span><span>为纸笔学习，留一点空间。</span></footer>
    </main>
  </>
}
