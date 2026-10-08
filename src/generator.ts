export const operations = [
  { id: 'addsub', label: '加减法', symbol: '+ −', description: '加法与减法随机组合' },
  { id: 'add', label: '纯加法', symbol: '+', description: '专注加法练习' },
  { id: 'sub', label: '纯减法', symbol: '−', description: '结果不出现负数' },
  { id: 'mul', label: '乘法', symbol: '×', description: '积不超过所选范围' },
  { id: 'div', label: '除法', symbol: '÷', description: '整除，无余数' },
  { id: 'table', label: '简单乘除法', symbol: '× ÷', description: '九九乘法表内的乘除法' },
  { id: 'mixed', label: '混合运算', symbol: '( )', description: '三项运算，含括号与优先级' },
] as const

export type Operation = typeof operations[number]['id']
export type Question = { expression: string; answer: number }
export type GenerationConfig = { range: number; count: number; operation: Operation; terms?: number }
export const supportsChaining = (operation: Operation) => ['addsub', 'add', 'sub'].includes(operation)
const integer = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

function multiplication(range: number, table = false) {
  let a = integer(table ? 1 : 2, table ? Math.min(9, range) : Math.floor(range / 2))
  let b = integer(table ? 1 : 2, Math.min(table ? 9 : range, Math.floor(range / a)))
  if (Math.random() < 0.5) [a, b] = [b, a]
  return { a, b, product: a * b }
}

function makeQuestion(range: number, operation: Operation, terms: number): Question {
  if (supportsChaining(operation)) {
    // Allocate a bounded total across all terms so long pure chains do not
    // collapse into trailing zeros; mixed chains choose each operator separately.
    if (operation === 'add' || operation === 'sub') {
      const total = integer(terms, range)
      const cuts = new Set<number>()
      while (cuts.size < terms - 1) cuts.add(integer(1, total - 1))
      const edges = [0, ...[...cuts].sort((a, b) => a - b), total]
      const parts = edges.slice(1).map((edge, index) => edge - edges[index])
      return operation === 'add'
        ? { expression: parts.join(' + '), answer: total }
        : { expression: [total, ...parts.slice(1)].join(' − '), answer: parts[0] }
    }
    let answer = integer(0, range)
    let expression = String(answer)
    for (let index = 1; index < terms; index++) {
      const add = answer === 0 || (answer < range && Math.random() < 0.5)
      const value = integer(1, add ? range - answer : answer)
      expression += ` ${add ? '+' : '−'} ${value}`
      answer += add ? value : -value
    }
    return { expression, answer }
  }
  if (operation === 'mul' || operation === 'div' || operation === 'table') {
    const { a, b, product } = multiplication(range, operation === 'table')
    const division = operation === 'div' || (operation === 'table' && Math.random() < 0.5)
    return division
      ? { expression: `${product} ÷ ${a}`, answer: b }
      : { expression: `${a} × ${b}`, answer: product }
  }
  // Construct valid equations directly, avoiding eval, fractions and negative intermediates.
  const { a, b, product } = multiplication(range, true)
  switch (integer(0, 5)) {
    case 0: {
      const c = integer(0, range - product)
      return { expression: `${a} × ${b} + ${c}`, answer: product + c }
    }
    case 1: {
      const c = integer(0, product)
      return { expression: `${a} × ${b} − ${c}`, answer: product - c }
    }
    case 2: {
      const c = integer(0, range - b)
      return { expression: `${product} ÷ ${a} + ${c}`, answer: b + c }
    }
    case 3: {
      const c = integer(0, a)
      return { expression: `(${a - c} + ${c}) × ${b}`, answer: product }
    }
    case 4: {
      const c = integer(0, range - product)
      return { expression: `(${product + c} − ${c}) ÷ ${a}`, answer: b }
    }
    default: {
      const c = integer(0, range - product)
      return { expression: `${product + c} − ${a} × ${b}`, answer: c }
    }
  }
}

export function generateQuestions(config: GenerationConfig): Question[] {
  if (!Number.isInteger(config.range) || config.range < 10 || config.range > 10000) throw new Error('范围需为 10–10000 的整数')
  if (!Number.isInteger(config.count) || config.count < 1 || config.count > 2000) throw new Error('生成题数需为 1–2000 的整数')
  if (!operations.some(op => op.id === config.operation)) throw new Error('请选择有效题型')
  const terms = config.terms ?? 2
  if (!Number.isInteger(terms) || terms < 2 || terms > 5) throw new Error('连算项数需为 2–5 的整数')
  const result: Question[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (result.length < config.count) {
    const question = makeQuestion(config.range, config.operation, terms)
    attempts++
    // Tiny ranges have finite combinations; permit repeats after a bounded attempt budget.
    if (!seen.has(question.expression) || attempts > config.count * 40) {
      result.push(question)
      seen.add(question.expression)
    }
  }
  return result
}

export function getLayout(fontSize: number, columns: number, showHeader = false, rowGap = 3) {
  // End questions by 280 mm, before the single-line record at 284 mm.
  const availableHeight = showHeader ? 225 : 270
  const rowHeight = fontSize * 0.264583 * 1.3 + rowGap
  const rows = Math.floor(availableHeight / rowHeight)
  return { rowHeight, rows, availableHeight, perPage: rows * columns }
}
