import test from 'node:test'
import assert from 'node:assert/strict'
import { generateQuestions, getLayout, operations } from './generator.ts'

for (const operation of operations) {
  test(`${operation.label}: count, range, integer result and arithmetic`, () => {
    for (const range of [10, 20, 100, 1000, 10000]) {
      const questions = generateQuestions({ range, operation: operation.id, count: 500 })
      assert.equal(questions.length, 500)
      for (const { expression, answer } of questions) {
        const numbers = expression.match(/\d+/g)!.map(Number)
        assert(numbers.every(n => n >= 0 && n <= range))
        assert(Number.isInteger(answer) && answer >= 0 && answer <= range)
        const arithmetic = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
        assert.match(arithmetic, /^[\d\s()+*/-]+$/)
        assert.equal(Function(`return (${arithmetic})`)(), answer)
        if (operation.id === 'table') {
          if (expression.includes('×')) assert(numbers.every(n => n >= 1 && n <= 9))
          else { assert(numbers[1] >= 1 && numbers[1] <= 9); assert(answer >= 1 && answer <= 9) }
        }
      }
    }
  })
}

test('invalid settings are rejected', () => {
  for (const range of [0, 9, 10001, NaN, 20.5]) assert.throws(() => generateQuestions({ range, count: 40, operation: 'add' }))
  for (const count of [0, -1, 2001, NaN, 1.5]) assert.throws(() => generateQuestions({ range: 100, count, operation: 'sub' }))
  for (const terms of [1, 6, NaN, 2.5]) assert.throws(() => generateQuestions({ range: 100, count: 40, operation: 'add', terms }))
})

test('page rows fit the reserved A4 question area at every setting', () => {
  for (let size = 12; size <= 64; size++) {
    for (let columns = 1; columns <= 5; columns++) {
      for (const header of [false, true]) {
        for (let gap = 3; gap <= 16; gap += 0.5) {
        const layout = getLayout(size, columns, header, gap)
        assert(layout.rows * layout.rowHeight <= layout.availableHeight)
        assert.equal(layout.perPage, layout.rows * columns)
        assert(layout.perPage > 0)
        assert(layout.rowHeight >= size * 0.264583 * 1.3 + gap)
        assert(layout.perPage * 10 <= 2000)
        // Leave 4 mm before the single-line record, which starts at 284 mm.
        assert(10 + (header ? 45 : 0) + layout.rows * layout.rowHeight <= 280)
        }
      }
    }
  }
})

test('2–5 term chains respect operator choices and every intermediate result', () => {
  for (const operation of ['add', 'sub', 'addsub'] as const) {
    for (const terms of [2, 3, 4, 5]) {
      for (const range of [10, 100, 10000]) {
        const questions = generateQuestions({ range, count: 100, operation, terms })
        for (const q of questions) {
          const tokens = q.expression.split(' ')
          assert.equal(tokens.length, terms * 2 - 1)
          let result = Number(tokens[0])
          for (let i = 1; i < tokens.length; i += 2) {
            if (operation !== 'addsub') assert.equal(tokens[i], operation === 'add' ? '+' : '−')
            const operand = Number(tokens[i + 1])
            assert(operand > 0 && operand <= range)
            result += tokens[i] === '+' ? operand : -operand
            assert(result >= 0 && result <= range)
          }
          assert.equal(result, q.answer)
        }
      }
    }
  }
})

test('fill mode can generate ten dense pages and gains space without header', () => {
  const dense = getLayout(12, 5)
  assert(dense.perPage > getLayout(12, 5, true).perPage)
  assert(getLayout(24, 3).perPage > 45)
  assert(getLayout(24, 3, false, 3).perPage > getLayout(24, 3, false, 16).perPage)
  const questions = generateQuestions({ range: 100, count: dense.perPage * 10, operation: 'addsub', terms: 5 })
  assert.equal(questions.length, dense.perPage * 10)
})
