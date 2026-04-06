import { describe, expect, it } from 'vitest'
import {
  CurrencyMismatchError,
  DivisionByZeroError,
  InvalidAmountError,
  Money,
  UnknownCurrencyError,
  money,
} from '../src/index.js'

// ─── Construction ─────────────────────────────────────────────────────────────

describe('money() factory', () => {
  it('creates from a decimal string', () => {
    const m = money('19.99', 'USD')
    expect(m.decimalValue).toBe('19.99')
    expect(m.currency).toBe('USD')
    expect(m.minorUnits).toBe(1999n)
  })

  it('creates from a whole number string', () => {
    expect(money('20', 'USD').minorUnits).toBe(2000n)
  })

  it('creates from a JS number', () => {
    expect(money(19.99, 'USD').minorUnits).toBe(1999n)
  })

  it('creates from a bigint (already in minor units)', () => {
    expect(money(1999n, 'USD').minorUnits).toBe(1999n)
  })

  it('handles zero-decimal currencies (JPY)', () => {
    const jpy = money('1500', 'JPY')
    expect(jpy.minorUnits).toBe(1500n)
    expect(jpy.decimalValue).toBe('1500')
  })

  it('handles three-decimal currencies (KWD)', () => {
    const kwd = money('1.500', 'KWD')
    expect(kwd.minorUnits).toBe(1500n)
    expect(kwd.decimalValue).toBe('1.500')
  })

  it('handles negative amounts', () => {
    const m = money('-19.99', 'USD')
    expect(m.minorUnits).toBe(-1999n)
    expect(m.isNegative()).toBe(true)
  })

  it('throws on unknown currency', () => {
    // @ts-expect-error intentional invalid currency
    expect(() => money('10', 'XYZ')).toThrow(UnknownCurrencyError)
  })

  it('throws on invalid amount string', () => {
    expect(() => money('abc', 'USD')).toThrow(InvalidAmountError)
    expect(() => money('1.2.3', 'USD')).toThrow(InvalidAmountError)
    expect(() => money('', 'USD')).toThrow(InvalidAmountError)
  })
})

describe('Money.fromMinorUnits()', () => {
  it('creates from minor units', () => {
    const m = Money.fromMinorUnits(1999n, 'USD')
    expect(m.decimalValue).toBe('19.99')
    expect(m.minorUnits).toBe(1999n)
  })

  it('creates negative from minor units', () => {
    expect(Money.fromMinorUnits(-500n, 'USD').decimalValue).toBe('-5.00')
  })
})

// ─── Arithmetic ───────────────────────────────────────────────────────────────

describe('add()', () => {
  it('adds two same-currency values', () => {
    const result = money('19.99', 'USD').add(money('1.60', 'USD'))
    expect(result.decimalValue).toBe('21.59')
  })

  it('returns a new immutable instance', () => {
    const a = money('10.00', 'USD')
    const b = money('5.00', 'USD')
    const c = a.add(b)
    expect(a.decimalValue).toBe('10.00')
    expect(b.decimalValue).toBe('5.00')
    expect(c.decimalValue).toBe('15.00')
  })

  it('throws on currency mismatch', () => {
    // @ts-expect-error intentional mismatch
    expect(() => money('10', 'USD').add(money('5', 'EUR'))).toThrow(CurrencyMismatchError)
  })
})

describe('subtract()', () => {
  it('subtracts two same-currency values', () => {
    expect(money('10.00', 'USD').subtract(money('3.50', 'USD')).decimalValue).toBe('6.50')
  })

  it('allows negative result', () => {
    expect(money('3.00', 'USD').subtract(money('5.00', 'USD')).decimalValue).toBe('-2.00')
  })
})

describe('multiply()', () => {
  it('multiplies by an integer', () => {
    expect(money('10.00', 'USD').multiply(3).decimalValue).toBe('30.00')
  })

  it('multiplies by a decimal and rounds half-up', () => {
    expect(money('10.00', 'USD').multiply(1.1).decimalValue).toBe('11.00')
    // $1.00 × 1.005 = $1.005 → rounds half-up to $1.01
    expect(money('1.00', 'USD').multiply(1.005).decimalValue).toBe('1.01')
  })

  it('multiplies by a string factor', () => {
    expect(money('19.99', 'USD').multiply('1.1').decimalValue).toBe('21.99')
  })

  it('multiplies by zero', () => {
    expect(money('19.99', 'USD').multiply(0).decimalValue).toBe('0.00')
  })

  it('multiplies by a negative factor', () => {
    expect(money('10.00', 'USD').multiply(-1).decimalValue).toBe('-10.00')
  })

  it('handles classic float trap: 0.1 + 0.2', () => {
    // Floating point: 0.1 + 0.2 = 0.30000000000000004
    const result = money('0.10', 'USD').add(money('0.20', 'USD'))
    expect(result.decimalValue).toBe('0.30')
  })
})

describe('divide()', () => {
  it('divides evenly', () => {
    expect(money('9.00', 'USD').divide(3).decimalValue).toBe('3.00')
  })

  it('rounds half-up on remainder', () => {
    expect(money('10.00', 'USD').divide(3).decimalValue).toBe('3.33')
  })

  it('divides by a decimal', () => {
    expect(money('10.00', 'USD').divide(2.5).decimalValue).toBe('4.00')
  })

  it('throws on division by zero', () => {
    expect(() => money('10.00', 'USD').divide(0)).toThrow(DivisionByZeroError)
  })
})

describe('allocate()', () => {
  it('allocates evenly, distributing remainder to first buckets', () => {
    const parts = money('10.00', 'USD').allocate([1, 1, 1])
    expect(parts.map((p) => p.decimalValue)).toEqual(['3.34', '3.33', '3.33'])
  })

  it('sum of parts always equals original', () => {
    const original = money('10.01', 'USD')
    const parts = original.allocate([1, 1, 1])
    const sum = parts.reduce((acc, p) => acc.add(p), money('0', 'USD'))
    expect(sum.equals(original)).toBe(true)
  })

  it('allocates with non-equal ratios', () => {
    const parts = money('100.00', 'USD').allocate([70, 20, 10])
    expect(parts.map((p) => p.decimalValue)).toEqual(['70.00', '20.00', '10.00'])
  })

  it('throws on empty ratios', () => {
    expect(() => money('10.00', 'USD').allocate([])).toThrow(InvalidAmountError)
  })

  it('throws when ratios sum to zero', () => {
    expect(() => money('10.00', 'USD').allocate([0, 0])).toThrow(InvalidAmountError)
  })
})

// ─── Comparison ───────────────────────────────────────────────────────────────

describe('comparison', () => {
  it('equals()', () => {
    expect(money('10.00', 'USD').equals(money('10.00', 'USD'))).toBe(true)
    expect(money('10.00', 'USD').equals(money('10.01', 'USD'))).toBe(false)
  })

  it('greaterThan()', () => {
    expect(money('10.01', 'USD').greaterThan(money('10.00', 'USD'))).toBe(true)
    expect(money('10.00', 'USD').greaterThan(money('10.00', 'USD'))).toBe(false)
  })

  it('lessThan()', () => {
    expect(money('9.99', 'USD').lessThan(money('10.00', 'USD'))).toBe(true)
  })

  it('greaterThanOrEqual()', () => {
    expect(money('10.00', 'USD').greaterThanOrEqual(money('10.00', 'USD'))).toBe(true)
    expect(money('10.01', 'USD').greaterThanOrEqual(money('10.00', 'USD'))).toBe(true)
  })

  it('lessThanOrEqual()', () => {
    expect(money('10.00', 'USD').lessThanOrEqual(money('10.00', 'USD'))).toBe(true)
    expect(money('9.99', 'USD').lessThanOrEqual(money('10.00', 'USD'))).toBe(true)
  })

  it('isZero()', () => {
    expect(money('0.00', 'USD').isZero()).toBe(true)
    expect(money('0.01', 'USD').isZero()).toBe(false)
  })

  it('isPositive() / isNegative()', () => {
    expect(money('1.00', 'USD').isPositive()).toBe(true)
    expect(money('-1.00', 'USD').isNegative()).toBe(true)
    expect(money('0.00', 'USD').isPositive()).toBe(false)
    expect(money('0.00', 'USD').isNegative()).toBe(false)
  })
})

// ─── Utility ──────────────────────────────────────────────────────────────────

describe('abs() / negate()', () => {
  it('abs() returns positive value', () => {
    expect(money('-19.99', 'USD').abs().decimalValue).toBe('19.99')
    expect(money('19.99', 'USD').abs().decimalValue).toBe('19.99')
  })

  it('negate() flips sign', () => {
    expect(money('19.99', 'USD').negate().decimalValue).toBe('-19.99')
    expect(money('-19.99', 'USD').negate().decimalValue).toBe('19.99')
  })
})

// ─── Formatting ───────────────────────────────────────────────────────────────

describe('format()', () => {
  it('formats USD in en-US locale', () => {
    expect(money('19.99', 'USD').format('en-US')).toBe('$19.99')
  })

  it('formats JPY as whole number', () => {
    expect(money('1500', 'JPY').format('ja-JP')).toMatch(/1,500|1500/)
  })
})

describe('toJSON()', () => {
  it('serialises safely', () => {
    const m = money('19.99', 'USD')
    const json = m.toJSON()
    expect(json.amount).toBe('19.99')
    expect(json.currency).toBe('USD')
    expect(json.minorUnits).toBe('1999')
  })

  it('round-trips through JSON.stringify', () => {
    const m = money('19.99', 'USD')
    const parsed = JSON.parse(JSON.stringify(m)) as ReturnType<typeof m.toJSON>
    expect(parsed.amount).toBe('19.99')
    expect(parsed.minorUnits).toBe('1999')
  })
})

describe('toString()', () => {
  it('returns decimal value and currency code', () => {
    expect(money('19.99', 'USD').toString()).toBe('19.99 USD')
  })
})
