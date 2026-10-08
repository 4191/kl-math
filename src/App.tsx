import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowDownToLine, ChevronDown, FileText, Leaf, Printer, RefreshCw, Settings2, Sparkles } from 'lucide-react'
import { generateQuestions, getLayout, operations, supportsChaining } from './generator'
import type { GenerationConfig, Operation } from './generator'

const initial: GenerationConfig = { range: 100, count: 40, operation: 'addsub', terms: 2 }
const defaultHeader = { title: '每日口算练习', caption: 'MATH PRACTICE', slogan: '每天练一点，进步看得见', nameLabel: '姓名' }
const defaultFooter = '小算纸 · 让练习，刚刚好'

function SettingsGroup({ id, step, title, summary, open, onToggle, children }: { id: string; step: string; title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className={`settings-group ${open ? 'is-open' : ''}`}>
    <h3><button id={`${id}-toggle`} className="group-toggle" aria-expanded={open} aria-controls={`${id}-content`} onClick={onToggle}><span className="step">{step}</span><span className="group-heading"><span>{title}</span><small title={summary}>{summary}</small></span><ChevronDown size={16} /></button></h3>
    <div id={`${id}-content`} role="region" aria-labelledby={`${id}-toggle`} hidden={!open} className="group-content">{children}</div>
  </section>
}

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
  const [activeGroup, setActiveGroup] = useState('content')
  const [range, setRange] = useState('100')
  const [count, setCount] = useState('40')
  const [countMode, setCountMode] = useState<'count' | 'pages'>('count')
  const [pageCount, setPageCount] = useState('1')
  const [activePages, setActivePages] = useState<number | null>(null)
  const [operation, setOperation] = useState<Operation>('addsub')
  const [terms, setTerms] = useState(2)
  const [columns, setColumns] = useState(3)
  const [fontSize, setFontSize] = useState(24)
  const [rowGap, setRowGap] = useState(3)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showHeader, setShowHeader] = useState(false)
  const [showFooter, setShowFooter] = useState(false)
  const [showNumbers, setShowNumbers] = useState(false)
  const [headerText, setHeaderText] = useState(defaultHeader)
  const [descriptionText, setDescriptionText] = useState<string | null>(null)
  const [instructionText, setInstructionText] = useState<string | null>(null)
  const [footerText, setFooterText] = useState(defaultFooter)
  const [activeConfig, setActiveConfig] = useState(initial)
  const [questions, setQuestions] = useState(() => generateQuestions(initial))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('已为你准备好一份练习，开始吧。')
  const [zoom, setZoom] = useState(1)
  const preview = useRef<HTMLDivElement>(null)
  const layout = getLayout(fontSize, columns, showHeader, rowGap)
  const pages = Array.from({ length: Math.ceil(questions.length / layout.perPage) }, (_, index) => questions.slice(index * layout.perPage, (index + 1) * layout.perPage))
  const activeLabel = operations.find(op => op.id === activeConfig.operation)!.label
  const sheetDescription = descriptionText ?? `${activeConfig.range} 以内${activeLabel}练习`
  const sheetInstruction = instructionText ?? (showAnswer ? '参考答案' : '认真计算，细心检查。')
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
      <section className="intro no-print"><div><h1>每天一张，进步一点。</h1><p>选题、排版、打印，准备好今天的练习。</p></div><span className="intro-note"><Leaf size={14} /> 为纸笔学习，留一点空间</span></section>
      <div className="editor-layout">
        <aside className="settings no-print">
          <div className="panel-title"><Settings2 size={18} /><h2>练习设置</h2><span>自由定制</span></div>
          <div className="settings-scroll">
          <SettingsGroup id="content" open={activeGroup === 'content'} onToggle={() => setActiveGroup(current => current === 'content' ? '' : 'content')} step="01" title="题目内容" summary={`${range || "—"} 以内 · ${operations.find(op => op.id === operation)!.label} · ${countMode === "pages" ? `铺满 ${pageCount || "—"} 页` : `${count || "—"} 题`}`}>
            <label className="field-label" htmlFor="range">数字范围 <span>数字与结果均不超过此值</span></label>
            <div className="range-presets">{[20, 50, 100, 1000].map(value => <button key={value} className={Number(range) === value ? 'chip selected' : 'chip'} onClick={() => setRange(String(value))}>{value} 以内</button>)}</div>
            <div className="input-unit"><input id="range" type="number" min="10" max="10000" value={range} onChange={e => setRange(e.target.value)} /><span>以内</span></div>
            <label className="field-label operation-label" htmlFor="operation">运算类型</label>
            <select id="operation" value={operation} aria-describedby="operation-description" onChange={e => setOperation(e.target.value as Operation)}>{operations.map(op => <option key={op.id} value={op.id}>{op.label}（{op.symbol}）</option>)}</select>
            <p id="operation-description" className="setting-hint">{operations.find(op => op.id === operation)!.description}</p>
            {supportsChaining(operation) && <><label className="field-label" htmlFor="terms">连算项数<span>按算式中的数字个数</span></label><select id="terms" value={terms} onChange={e => setTerms(Number(e.target.value))}>{[2, 3, 4, 5].map(value => <option key={value} value={value}>{value} 连（{value} 个数，{value - 1} 次运算）</option>)}</select><p className="setting-hint">{operation === 'add' ? '各项相加' : operation === 'sub' ? '依次相减' : '加减随机组合'}，中间结果与答案均在范围内。</p></>}
            <div className="field-label quantity-label"><span>题目数量</span><span>按题数或页数生成</span></div>
            <div className="segments count-mode"><button aria-pressed={countMode === 'count'} className={countMode === 'count' ? 'active' : ''} onClick={() => setCountMode('count')}>按题数</button><button aria-pressed={countMode === 'pages'} className={countMode === 'pages' ? 'active' : ''} onClick={() => setCountMode('pages')}>铺满指定页数</button></div>
            {countMode === 'count' ? <><label htmlFor="count" className="field-label">题目数量<span>最多 500 题</span></label><div className="input-unit"><input id="count" type="number" min="1" max="500" value={count} onChange={e => setCount(e.target.value)} /><span>题</span></div><div className="quick-counts">快速选择 { [20, 40, 60, 100].map(value => <button key={value} onClick={() => setCount(String(value))} className={Number(count) === value ? 'active' : ''}>{value}</button>)}</div></> : <><label htmlFor="page-count" className="field-label">铺满页数<span>最多 10 页</span></label><div className="input-unit"><input id="page-count" type="number" min="1" max="10" value={pageCount} onChange={e => setPageCount(e.target.value)} /><span>页</span></div><p className="setting-hint">当前每页 {layout.perPage} 题{Number.isInteger(Number(pageCount)) && Number(pageCount) >= 1 && Number(pageCount) <= 10 ? `，共 ${requestedCount} 题` : ''}。生成后随排版自动调整题数。</p></>}
          </SettingsGroup>
          <SettingsGroup id="layout" open={activeGroup === 'layout'} onToggle={() => setActiveGroup(current => current === 'layout' ? '' : 'layout')} step="02" title="纸张排版" summary={`${columns} 列 · ${fontSize} px · 行距 ${rowGap} mm`}>
            <div className="field-label"><span>每行列数</span><span>{columns} 列</span></div>
            <div className="segments">{[1, 2, 3, 4, 5].map(value => <button aria-pressed={columns === value} key={value} onClick={() => setColumns(value)} className={columns === value ? 'active' : ''}>{value} 列</button>)}</div>
            <div className="inline-field"><label htmlFor="font-size">题目字号</label><select id="font-size" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}>{Array.from({ length: 53 }, (_, i) => i + 12).map(value => <option key={value} value={value}>{value} px</option>)}</select></div>
            <label className="field-label" htmlFor="row-gap">行间距 <span>{rowGap} mm</span></label>
            <input id="row-gap" className="font-range" type="range" min="3" max="16" step="0.5" value={rowGap} onChange={e => setRowGap(Number(e.target.value))} />
            <div className="range-labels"><span>紧凑 3 mm</span><span>宽松 16 mm</span></div>
            <p className="setting-hint">当前每页 {layout.perPage} 题，铺满模式自动同步题数。</p>
            {[{ id: 'numbers', label: '显示序号', hint: '为题目添加连续编号', value: showNumbers, set: setShowNumbers }, { id: 'answers', label: '显示答案', hint: '适合核对与讲解', value: showAnswer, set: setShowAnswer }].map(item => <div className="answer-setting" key={item.id}><div><label htmlFor={item.id}>{item.label}</label><p>{item.hint}</p></div><button id={item.id} role="switch" aria-checked={item.value} aria-label={item.label} className={`toggle ${item.value ? 'on' : ''}`} onClick={() => item.set(!item.value)}><span /></button></div>)}
          </SettingsGroup>
          <SettingsGroup id="text" open={activeGroup === 'text'} onToggle={() => setActiveGroup(current => current === 'text' ? '' : 'text')} step="03" title="页眉页脚" summary={`页眉${showHeader ? '已开启' : '已关闭'} · 页脚${showFooter ? '已开启' : '已关闭'}`}>
            <div className="answer-setting"><div><label htmlFor="header">显示页眉</label><p>自定义标题、姓名与练习说明</p></div><button id="header" role="switch" aria-checked={showHeader} aria-label="显示页眉" className={`toggle ${showHeader ? 'on' : ''}`} onClick={() => setShowHeader(!showHeader)}><span /></button></div>
            {showHeader && <div className="text-editor">
              <div className="text-editor-heading"><span>编辑页眉</span><button className="text-button" onClick={() => { setHeaderText(defaultHeader); setDescriptionText(null); setInstructionText(null) }}>恢复默认页眉</button></div>
              {([{ key: 'title', label: '练习标题', max: 24 }, { key: 'caption', label: '页眉左侧文字', max: 24 }, { key: 'slogan', label: '页眉右侧文字', max: 24 }, { key: 'nameLabel', label: '姓名栏名称', max: 12 }] as const).map(field => <div key={field.key}><label className="field-label" htmlFor={`header-${field.key}`}>{field.label}</label><input id={`header-${field.key}`} maxLength={field.max} value={headerText[field.key]} onChange={e => setHeaderText({ ...headerText, [field.key]: e.target.value })} /></div>)}
              <label className="field-label" htmlFor="header-description">练习说明</label><input id="header-description" maxLength={32} value={sheetDescription} onChange={e => setDescriptionText(e.target.value)} />
              <label className="field-label" htmlFor="header-instruction">练习提示</label><input id="header-instruction" maxLength={32} value={sheetInstruction} onChange={e => setInstructionText(e.target.value)} />
              <p className="setting-hint">清空可隐藏该项。默认说明与提示随题型、答案设置更新，编辑后使用你的文字。</p>
            </div>}
            <div className="answer-setting"><div><label htmlFor="footer">显示页脚</label><p>自定义文案；页码始终保留</p></div><button id="footer" role="switch" aria-checked={showFooter} aria-label="显示页脚" className={`toggle ${showFooter ? 'on' : ''}`} onClick={() => setShowFooter(!showFooter)}><span /></button></div>
            {showFooter && <div className="text-editor">
              <div className="text-editor-heading"><span>编辑页脚</span><button className="text-button" onClick={() => setFooterText(defaultFooter)}>恢复默认页脚</button></div>
              <label className="field-label" htmlFor="footer-text">页脚文案</label><input id="footer-text" maxLength={80} value={footerText} onChange={e => setFooterText(e.target.value)} />
              <p className="setting-hint">最多 80 字，清空可隐藏文案。页码和练习记录仍自动保留。</p>
            </div>}
          </SettingsGroup>
          </div>
          <div className="generate-area">{error && <p role="alert" className="error">{error}</p>}<div className="action-buttons"><button className="button button-primary generate" onClick={generate}><RefreshCw size={16} />生成新题目</button><button className="button button-outline panel-print" onClick={() => window.print()}><Printer size={16} />打印</button></div><p className={pending ? "pending-note" : ""}>{pending ? "题目设置有修改，点击生成应用" : "排版实时生效 · Ctrl + P 可打印"}</p></div>
        </aside>

        <section className="preview-section" aria-label="练习纸预览">
          <div className="preview-toolbar no-print"><div><span className="preview-icon"><FileText size={18} /></span><h2>练习纸预览</h2><span className="paper-badge">A4</span></div><button className="text-button" onClick={() => window.print()}><ArrowDownToLine size={15} />打印 / 存为 PDF</button></div>
          <div className="preview-meta no-print"><span>{activeConfig.range} 以内 · {activeLabel}{supportsChaining(activeConfig.operation) ? ` · ${activeConfig.terms} 连` : ''} · {questions.length} 题{activePages !== null ? ' · 铺满' : ''}</span><span>共 {pages.length} 页 <ChevronDown size={12} /></span></div>
          <div className="preview-canvas" ref={preview}>
            {pages.map((page, pageIndex) => <div className="sheet-holder" key={pageIndex} style={{ width: `${210 * 96 / 25.4 * zoom}px`, height: `${297 * 96 / 25.4 * zoom}px` }}>
              <article className="sheet" style={{ '--preview-zoom': zoom } as CSSProperties}>
                {showHeader && <><div className="sheet-heading"><div className="sheet-kicker"><span>{headerText.caption}</span><span>{headerText.slogan}</span></div><h2>{headerText.title || '\u00a0'}</h2><div className="student-details">{headerText.nameLabel.trim() && <span>{headerText.nameLabel}：<i /></span>}</div></div><div className="sheet-description"><span>{sheetDescription}</span><span>{sheetInstruction}</span></div></>}
                <div className="questions" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${layout.rowHeight}mm` }}>{page.map((question, index) => <div className="question" key={`${pageIndex}-${index}`}>{showNumbers && <span className="question-number">{String(pageIndex * layout.perPage + index + 1).padStart(2, '0')}.</span>}<Equation {...question} showAnswer={showAnswer} fontSize={fontSize} /></div>)}</div>
                <footer className={`sheet-footer ${showFooter ? '' : 'minimal-footer'}`}>
                  <span className="record-page">第 {pageIndex + 1} / {pages.length} 页</span>
                  {showFooter && footerText.trim() && <span className="sheet-brand">{footerText}</span>}
                  <div className="practice-record" aria-label="本页练习记录">
                    <span>日期：<i className="record-date" /></span>
                    <span>用时：<i /> 分钟</span>
                    <span>订正：<i /> / <strong>{page.length}</strong> 题</span>
                    <span>修正用时：<i /> 分钟</span>
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
